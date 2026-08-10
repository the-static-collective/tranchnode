import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { Addressed, Hash } from "../src/residual.js";
import {
  StigmergicFieldError,
  addressFieldTrace,
  deriveStigmergicField,
  verifyStigmergicFieldProjection,
  type FieldSourceEvent,
  type FieldTrace,
  type StigmergicFieldProjection,
  type StigmergicProjectionRequest,
} from "../src/stigmergic-field.js";
import {
  checkedFieldAdd,
  decayedMagnitude,
} from "../src/stigmergic-field-arithmetic.js";

const scopeId = "session-linked-vertical";
const adapter = { id: "band-runtime/stigmergic-adapter", version: "0.1" };
const policyVersion = "band-runtime-field-policy/v0.1";
const fixtureRawHash = "sha256:189d21bbf5035d1a3a388431a74933eb65c6556bc349e90e24990457df5dbbff";

function makeTrace(overrides: Partial<FieldTrace> = {}): FieldTrace {
  return {
    sourceEventId: "event-5-propose-x",
    sourceSequence: 5,
    scopeId,
    subjectRef: "direction-x",
    channel: "attention",
    magnitude: 500,
    decayWindowEvents: 6,
    ...overrides,
  };
}

function source(eventId: string, sequence: number, scope: string = scopeId): FieldSourceEvent {
  return { eventId, scopeId: scope, sequence };
}

function request(
  sourceEvents: FieldSourceEvent[],
  traces: Array<ReturnType<typeof addressFieldTrace>>,
  overrides: Partial<Omit<StigmergicProjectionRequest, "sourceEvents" | "traces">> = {},
): StigmergicProjectionRequest {
  return {
    schemaVersion: "stigmergic-field/v0.1",
    scopeId,
    throughSequence: 11,
    policyVersion,
    adapter,
    sourceEvents,
    traces,
    ...overrides,
  };
}

function expectCode(fn: () => unknown, code: StigmergicFieldError["code"]): void {
  assert.throws(
    fn,
    (error: unknown) => error instanceof StigmergicFieldError && error.code === code,
  );
}

test("trace identity is canonical and stable", () => {
  const first = addressFieldTrace(makeTrace());
  const second = addressFieldTrace(makeTrace());
  assert.equal(first.hash, second.hash);
  assert.deepEqual(first.value, second.value);
});

test("trace validation rejects out-of-contract values", () => {
  const cases: Array<[Partial<FieldTrace>, StigmergicFieldError["code"]]> = [
    [{ magnitude: -1 }, "INVALID_MAGNITUDE"],
    [{ magnitude: 1001 }, "INVALID_MAGNITUDE"],
    [{ magnitude: 1.5 }, "INVALID_MAGNITUDE"],
    [{ decayWindowEvents: 0 }, "INVALID_DECAY_WINDOW"],
    [{ decayWindowEvents: 10001 }, "INVALID_DECAY_WINDOW"],
    [{ sourceSequence: 0 }, "INVALID_SEQUENCE"],
    [{ sourceSequence: Number.MAX_SAFE_INTEGER + 1 }, "INVALID_SEQUENCE"],
    [{ subjectRef: "" }, "INVALID_SUBJECT_REF"],
    [{ sourceEventId: "" }, "MISSING_SOURCE_EVENT"],
    [{ scopeId: "" }, "SCOPE_MISMATCH"],
  ];

  for (const [overrides, code] of cases) {
    expectCode(() => addressFieldTrace(makeTrace(overrides)), code);
  }
});

test("checked addition rejects unsafe aggregate", () => {
  assert.throws(
    () => checkedFieldAdd(Number.MAX_SAFE_INTEGER, 1),
    /ARITHMETIC_OVERFLOW/,
  );
});

test("event-distance decay is integer exact and expires at boundary", () => {
  assert.equal(decayedMagnitude(500, 6, 5, 10), 83);
  assert.equal(decayedMagnitude(500, 6, 5, 11), 0);
  assert.throws(() => decayedMagnitude(500, 6, 5, 4), /TRACE_FROM_FUTURE/);
});

test("input permutation does not change projection", () => {
  const events = [source("event-10", 10), source("event-11", 11)];
  const traces = [
    addressFieldTrace(makeTrace({ sourceEventId: "event-10", sourceSequence: 10 })),
    addressFieldTrace(makeTrace({
      sourceEventId: "event-11",
      sourceSequence: 11,
      channel: "inhibition",
      magnitude: 700,
    })),
  ];

  const first = deriveStigmergicField(request(events, traces));
  const second = deriveStigmergicField(request([...events].reverse(), [...traces].reverse()));
  assert.deepEqual(first, second);
});

test("aggregation preserves contributors and inhibition remains separate", () => {
  const events = [source("event-10", 10), source("event-11", 11), source("event-11b", 11)];
  const traces = [
    addressFieldTrace(makeTrace({ sourceEventId: "event-10", sourceSequence: 10, magnitude: 500 })),
    addressFieldTrace(makeTrace({ sourceEventId: "event-11", sourceSequence: 11, magnitude: 500 })),
    addressFieldTrace(makeTrace({
      sourceEventId: "event-11b",
      sourceSequence: 11,
      channel: "inhibition",
      magnitude: 700,
    })),
  ];

  const projection = deriveStigmergicField(request(events, traces));
  assert.deepEqual(projection.cells.map((cell) => cell.channel), ["attention", "inhibition"]);

  const attention = projection.cells[0];
  assert.ok(attention);
  assert.equal(attention.totalEffectiveMagnitude, 916);
  assert.equal(attention.contributions.length, 2);
  assert.deepEqual(attention.contributions.map((item) => item.sourceEventId), ["event-10", "event-11"]);

  const inhibition = projection.cells[1];
  assert.ok(inhibition);
  assert.equal(inhibition.totalEffectiveMagnitude, 700);
});

test("missing source, sequence mismatch, scope mismatch, and future trace fail closed", () => {
  const missing = addressFieldTrace(makeTrace({ sourceEventId: "missing", sourceSequence: 10 }));
  expectCode(() => deriveStigmergicField(request([], [missing])), "MISSING_SOURCE_EVENT");

  const mismatched = addressFieldTrace(makeTrace({ sourceEventId: "event-10", sourceSequence: 9 }));
  expectCode(
    () => deriveStigmergicField(request([source("event-10", 10)], [mismatched])),
    "SOURCE_SEQUENCE_MISMATCH",
  );

  expectCode(
    () => deriveStigmergicField(request([source("event-10", 10, "other-scope")], [])),
    "SCOPE_MISMATCH",
  );

  const future = addressFieldTrace(makeTrace({ sourceEventId: "event-12", sourceSequence: 12 }));
  expectCode(
    () => deriveStigmergicField(request([source("event-12", 12)], [future], { throughSequence: 11 })),
    "TRACE_FROM_FUTURE",
  );
});

test("conflicting source identities fail while identical duplicates are idempotent", () => {
  const duplicate = source("event-10", 10);
  const projection = deriveStigmergicField(request([duplicate, { ...duplicate }], []));
  assert.deepEqual(projection.cells, []);

  expectCode(
    () => deriveStigmergicField(request([source("event-10", 10), source("event-10", 11)], [])),
    "SOURCE_EVENT_ID_CONFLICT",
  );
});

test("mutated addressed trace body is rejected", () => {
  const addressed = addressFieldTrace(makeTrace({ sourceEventId: "event-10", sourceSequence: 10 }));
  const stale: Addressed<FieldTrace> = {
    hash: addressed.hash,
    value: { ...addressed.value, magnitude: 501 },
  };

  expectCode(
    () => deriveStigmergicField(request([source("event-10", 10)], [stale])),
    "TRACE_IDENTITY_MISMATCH",
  );
});

test("schema, request identity, policy, and sequence validation fail closed", () => {
  const base = request([], []);

  expectCode(
    () => deriveStigmergicField({ ...base, schemaVersion: "bad" } as unknown as StigmergicProjectionRequest),
    "UNSUPPORTED_SCHEMA_VERSION",
  );
  expectCode(
    () => deriveStigmergicField({ ...base, throughSequence: 0 }),
    "INVALID_SEQUENCE",
  );
  expectCode(
    () => deriveStigmergicField({ ...base, adapter: { id: "", version: "0.1" } }),
    "INVALID_ADAPTER_IDENTITY",
  );
  expectCode(
    () => deriveStigmergicField({ ...base, adapter: { id: "adapter", version: "" } }),
    "INVALID_ADAPTER_IDENTITY",
  );
  expectCode(
    () => deriveStigmergicField({ ...base, policyVersion: "" }),
    "INVALID_POLICY_VERSION",
  );
});

test("future source envelopes are inert unless a future trace is requested", () => {
  const current = source("event-10", 10);
  const future = source("event-12", 12);
  const trace = addressFieldTrace(makeTrace({ sourceEventId: current.eventId, sourceSequence: current.sequence }));

  const withoutFuture = deriveStigmergicField(request([current], [trace], { throughSequence: 10 }));
  const withFutureEnvelope = deriveStigmergicField(request([current, future], [trace], { throughSequence: 10 }));
  assert.deepEqual(withoutFuture, withFutureEnvelope);
});

test("omitted trace contributes nothing even when its source exists", () => {
  const projection = deriveStigmergicField(request([source("event-10", 10)], []));
  assert.deepEqual(projection.cells, []);
});

test("adapter and policy versions bind the fingerprint", () => {
  const event = source("event-11", 11);
  const trace = addressFieldTrace(makeTrace({ sourceEventId: event.eventId, sourceSequence: event.sequence }));
  const base = deriveStigmergicField(request([event], [trace]));
  const changedAdapter = deriveStigmergicField(request([event], [trace], {
    adapter: { id: adapter.id, version: "0.2" },
  }));
  const changedPolicy = deriveStigmergicField(request([event], [trace], {
    policyVersion: "band-runtime-field-policy/v0.2",
  }));

  assert.notEqual(base.fingerprint, changedAdapter.fingerprint);
  assert.notEqual(base.fingerprint, changedPolicy.fingerprint);
});

test("cells and contributors are canonically ordered", () => {
  const events = [source("z-event", 10), source("a-event", 10), source("m-event", 11)];
  const traces = [
    addressFieldTrace(makeTrace({
      sourceEventId: "z-event",
      sourceSequence: 10,
      subjectRef: "z-subject",
      channel: "attention",
    })),
    addressFieldTrace(makeTrace({
      sourceEventId: "m-event",
      sourceSequence: 11,
      subjectRef: "a-subject",
      channel: "tension",
    })),
    addressFieldTrace(makeTrace({
      sourceEventId: "a-event",
      sourceSequence: 10,
      subjectRef: "z-subject",
      channel: "attention",
    })),
  ];

  const projection = deriveStigmergicField(request(events, traces));
  assert.deepEqual(
    projection.cells.map((cell) => [cell.subjectRef, cell.channel]),
    [["a-subject", "tension"], ["z-subject", "attention"]],
  );
  assert.deepEqual(
    projection.cells[1]?.contributions.map((item) => item.sourceEventId),
    ["a-event", "z-event"],
  );
});

test("projection fingerprint detects mutation", () => {
  const event = source("event-11", 11);
  const trace = addressFieldTrace(makeTrace({ sourceEventId: event.eventId, sourceSequence: event.sequence }));
  const projection = deriveStigmergicField(request([event], [trace]));
  verifyStigmergicFieldProjection(projection);

  const firstCell = projection.cells[0];
  assert.ok(firstCell);
  const mutated: StigmergicFieldProjection = {
    ...projection,
    cells: [{ ...firstCell, totalEffectiveMagnitude: firstCell.totalEffectiveMagnitude + 1 }],
  };
  expectCode(() => verifyStigmergicFieldProjection(mutated), "FINGERPRINT_MISMATCH");
});

interface FixtureCase {
  throughSequence: number;
  sourceEventIds: string[];
  traceHashes: Hash[];
  expectedProjection: StigmergicFieldProjection;
}

interface StigmergicFixture {
  schemaVersion: "stigmergic-field/v0.1";
  scopeId: string;
  policyVersion: string;
  adapter: { id: string; version: string };
  sourceEvents: FieldSourceEvent[];
  traces: Array<Addressed<FieldTrace>>;
  projectionCases: FixtureCase[];
}

test("canonical linked-vertical fixture replays every causal cut exactly", async () => {
  const raw = await readFile(new URL("../fixtures/stigmergic-field-v0.1.json", import.meta.url));
  const actualRawHash = `sha256:${createHash("sha256").update(raw).digest("hex")}`;
  assert.equal(actualRawHash, fixtureRawHash);

  const fixture = JSON.parse(raw.toString("utf8")) as StigmergicFixture;
  const sources = new Map(fixture.sourceEvents.map((item) => [item.eventId, item]));
  const traces = new Map(fixture.traces.map((item) => [item.hash, item]));

  for (const fixtureCase of fixture.projectionCases) {
    const caseSources = fixtureCase.sourceEventIds.map((id) => {
      const item = sources.get(id);
      assert.ok(item, `fixture case ${fixtureCase.throughSequence} references missing source ${id}`);
      return item;
    });
    const caseTraces = fixtureCase.traceHashes.map((hash) => {
      const item = traces.get(hash);
      assert.ok(item, `fixture case ${fixtureCase.throughSequence} references missing trace ${hash}`);
      return item;
    });

    const projection = deriveStigmergicField({
      schemaVersion: fixture.schemaVersion,
      scopeId: fixture.scopeId,
      throughSequence: fixtureCase.throughSequence,
      policyVersion: fixture.policyVersion,
      adapter: fixture.adapter,
      sourceEvents: caseSources,
      traces: caseTraces,
    });

    assert.deepEqual(projection, fixtureCase.expectedProjection);
    verifyStigmergicFieldProjection(projection);
  }
});

test("fixture cut rejects future evidence explicitly", async () => {
  const raw = await readFile(new URL("../fixtures/stigmergic-field-v0.1.json", import.meta.url), "utf8");
  const fixture = JSON.parse(raw) as StigmergicFixture;
  const cut10 = fixture.projectionCases.find((item) => item.throughSequence === 10);
  assert.ok(cut10);
  const inhibition = fixture.traces.find((item) => item.value.sourceEventId === "event-11-reject-x");
  assert.ok(inhibition);

  const sources = fixture.sourceEvents.filter((item) => item.sequence <= 11);
  const traces = fixture.traces.filter((item) => cut10.traceHashes.includes(item.hash));
  expectCode(
    () => deriveStigmergicField({
      schemaVersion: fixture.schemaVersion,
      scopeId: fixture.scopeId,
      throughSequence: 10,
      policyVersion: fixture.policyVersion,
      adapter: fixture.adapter,
      sourceEvents: sources,
      traces: [...traces, inhibition],
    }),
    "TRACE_FROM_FUTURE",
  );
});

test("unrelated scope activity cannot alter the visible field", () => {
  const current = source("event-10", 10);
  const trace = addressFieldTrace(makeTrace({ sourceEventId: current.eventId, sourceSequence: current.sequence }));
  const visible = deriveStigmergicField(request([current], [trace], { throughSequence: 10 }));
  const replay = deriveStigmergicField(request([{ ...current }], [{ ...trace, value: { ...trace.value } }], { throughSequence: 10 }));
  assert.deepEqual(visible, replay);

  expectCode(
    () => deriveStigmergicField(request([current, source("other-event", 99, "other-scope")], [trace], { throughSequence: 10 })),
    "SCOPE_MISMATCH",
  );
});
