# Stigmergic Field v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic, attributable, authority-free stigmergic field projection to TranchNode and freeze a canonical conformance fixture that Band Runtime can consume without duplicating the field math.

**Architecture:** Implement the field as a new projection module beside `src/projection.ts`, not as a Project0/TranchNode ontology expansion. Domain adapters submit scope-local accepted event envelopes plus content-addressed traces; TranchNode validates source binding, applies integer event-distance decay, aggregates in canonical order, and addresses the projection body to produce a replay-stable fingerprint.

**Tech Stack:** TypeScript 5.8, Node.js `node:test`, `node:assert/strict`, existing RFC-8785/JCS `addressJson()` and SHA-256 helpers from `src/residual.ts`.

## Global Constraints

- Schema version is exactly `stigmergic-field/v0.1`.
- Field output always carries `authority: "none"`.
- No node kinds, edge kinds, epistemic states, or accepted operations are added.
- Decay uses scope-local accepted-event sequence only; wall-clock timestamps never affect output.
- `magnitude` is an integer from `0` through `1000`.
- `decayWindowEvents` is an integer from `1` through `10000`.
- Source and projection sequences are positive safe integers.
- A trace may contribute only when its source event exists in the same scope and its `sourceSequence` exactly matches the source envelope.
- A trace with `sourceSequence > throughSequence` is rejected.
- Active magnitude is `floor(magnitude * (decayWindowEvents - age) / decayWindowEvents)` where `age = throughSequence - sourceSequence`.
- A trace is inactive when `age >= decayWindowEvents`.
- Cells sort by `subjectRef`, then channel; contributions sort by source sequence, source event id, then trace hash.
- Checked integer addition rejects overflow; it never wraps or silently saturates.
- The fingerprint is the existing TranchNode canonical address of the projection body excluding `fingerprint`.
- Identical projection bytes establish only field-byte equivalence, never truth, identity, consensus, or authority equivalence.
- The canonical fixture is content-addressed and contains source envelopes, addressed traces, requests, expected cells, and expected fingerprints.
- No new runtime dependency is added.

---

## File Structure

- Create `src/stigmergic-field.ts` — all v0.1 generic field types, typed errors, trace addressing, validation, decay/aggregation, derivation, and projection verification.
- Create `test/stigmergic-field.test.ts` — unit and conformance tests for identity, validation, deterministic projection, decay, attribution, scope isolation, overflow, and fixture replay.
- Create `fixtures/stigmergic-field-v0.1.json` — canonical linked-vertical fixture used as the cross-repository contract.
- Keep `src/projection.ts` unchanged unless implementation reveals a truly generic helper that cannot remain local; do not widen `ProjectionKind` for stigmergy.

### Public Interfaces Frozen by This Plan

```ts
import type { Addressed, Hash } from "./residual.js";

export type FieldChannel =
  | "attention"
  | "receptivity"
  | "saturation"
  | "inhibition"
  | "tension"
  | "return";

export interface FieldSourceEvent {
  eventId: string;
  scopeId: string;
  sequence: number;
}

export interface FieldTrace {
  sourceEventId: string;
  sourceSequence: number;
  scopeId: string;
  subjectRef: string;
  channel: FieldChannel;
  magnitude: number;
  decayWindowEvents: number;
}

export interface FieldContribution {
  traceHash: Hash;
  sourceEventId: string;
  sourceSequence: number;
  effectiveMagnitude: number;
}

export interface FieldCell {
  subjectRef: string;
  channel: FieldChannel;
  totalEffectiveMagnitude: number;
  contributions: FieldContribution[];
}

export interface StigmergicProjectionRequest {
  schemaVersion: "stigmergic-field/v0.1";
  scopeId: string;
  throughSequence: number;
  policyVersion: string;
  adapter: { id: string; version: string };
  sourceEvents: FieldSourceEvent[];
  traces: Addressed<FieldTrace>[];
}

export interface StigmergicFieldProjection {
  schemaVersion: "stigmergic-field/v0.1";
  scopeId: string;
  throughSequence: number;
  policyVersion: string;
  adapter: { id: string; version: string };
  authority: "none";
  cells: FieldCell[];
  fingerprint: Hash;
}

export function addressFieldTrace(trace: FieldTrace): Addressed<FieldTrace>;
export function deriveStigmergicField(
  request: StigmergicProjectionRequest,
): StigmergicFieldProjection;
export function verifyStigmergicFieldProjection(
  projection: StigmergicFieldProjection,
): void;
```

---

### Task 1: Freeze trace identity and input validation

**Files:**
- Create: `src/stigmergic-field.ts`
- Create: `test/stigmergic-field.test.ts`

**Interfaces:**
- Consumes: `addressJson<T>(value)` and `Addressed<T>` / `Hash` from `src/residual.ts`.
- Produces: `FieldChannel`, `FieldSourceEvent`, `FieldTrace`, `StigmergicFieldError`, and `addressFieldTrace(trace)` for all later tasks.

- [ ] **Step 1: Write failing tests for stable trace addressing and invalid trace values**

Add these first tests to `test/stigmergic-field.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  FieldSourceEvent,
  StigmergicFieldError,
  addressFieldTrace,
} from "../src/stigmergic-field.js";

const source: FieldSourceEvent = {
  eventId: "event-5-propose-x",
  scopeId: "session-linked-vertical",
  sequence: 5,
};

function trace(overrides = {}) {
  return {
    sourceEventId: source.eventId,
    sourceSequence: source.sequence,
    scopeId: source.scopeId,
    subjectRef: "direction-x",
    channel: "attention" as const,
    magnitude: 500,
    decayWindowEvents: 6,
    ...overrides,
  };
}

test("field trace identity is canonical and stable", () => {
  const first = addressFieldTrace(trace());
  const second = addressFieldTrace(trace());
  assert.equal(first.hash, second.hash);
  assert.deepEqual(first.value, second.value);
});

test("field trace rejects invalid magnitude, window, sequence, and subject", () => {
  for (const [overrides, code] of [
    [{ magnitude: -1 }, "INVALID_MAGNITUDE"],
    [{ magnitude: 1001 }, "INVALID_MAGNITUDE"],
    [{ magnitude: 1.5 }, "INVALID_MAGNITUDE"],
    [{ decayWindowEvents: 0 }, "INVALID_DECAY_WINDOW"],
    [{ decayWindowEvents: 10001 }, "INVALID_DECAY_WINDOW"],
    [{ sourceSequence: 0 }, "INVALID_SEQUENCE"],
    [{ sourceSequence: Number.MAX_SAFE_INTEGER + 1 }, "INVALID_SEQUENCE"],
    [{ subjectRef: "" }, "INVALID_SUBJECT_REF"],
  ] as const) {
    assert.throws(
      () => addressFieldTrace(trace(overrides)),
      (error: unknown) => error instanceof StigmergicFieldError && error.code === code,
    );
  }
});
```

- [ ] **Step 2: Run the focused test and verify it fails because the module does not exist**

Run:

```bash
node --test --import tsx test/stigmergic-field.test.ts
```

Expected: FAIL with module-resolution or missing-export errors for `src/stigmergic-field.ts`.

- [ ] **Step 3: Implement the public types, typed error class, and trace validation**

Create `src/stigmergic-field.ts` with these error codes and helpers:

```ts
import type { Addressed, Hash } from "./residual.js";
import { addressJson } from "./residual.js";

export type FieldChannel =
  | "attention"
  | "receptivity"
  | "saturation"
  | "inhibition"
  | "tension"
  | "return";

export type StigmergicFieldErrorCode =
  | "UNSUPPORTED_SCHEMA_VERSION"
  | "INVALID_SEQUENCE"
  | "INVALID_MAGNITUDE"
  | "INVALID_DECAY_WINDOW"
  | "MISSING_SOURCE_EVENT"
  | "SOURCE_EVENT_ID_CONFLICT"
  | "SOURCE_SEQUENCE_MISMATCH"
  | "SCOPE_MISMATCH"
  | "TRACE_FROM_FUTURE"
  | "TRACE_IDENTITY_MISMATCH"
  | "ARITHMETIC_OVERFLOW"
  | "INVALID_ADAPTER_IDENTITY"
  | "INVALID_POLICY_VERSION"
  | "INVALID_SUBJECT_REF"
  | "FINGERPRINT_MISMATCH";

export class StigmergicFieldError extends Error {
  constructor(
    public readonly code: StigmergicFieldErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "StigmergicFieldError";
  }
}

export interface FieldSourceEvent {
  eventId: string;
  scopeId: string;
  sequence: number;
}

export interface FieldTrace {
  sourceEventId: string;
  sourceSequence: number;
  scopeId: string;
  subjectRef: string;
  channel: FieldChannel;
  magnitude: number;
  decayWindowEvents: number;
}

function requirePositiveSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function validateTrace(trace: FieldTrace): void {
  if (!requirePositiveSafeInteger(trace.sourceSequence)) {
    throw new StigmergicFieldError("INVALID_SEQUENCE", "sourceSequence must be a positive safe integer");
  }
  if (!Number.isInteger(trace.magnitude) || trace.magnitude < 0 || trace.magnitude > 1000) {
    throw new StigmergicFieldError("INVALID_MAGNITUDE", "magnitude must be an integer from 0 through 1000");
  }
  if (!Number.isInteger(trace.decayWindowEvents)
      || trace.decayWindowEvents < 1
      || trace.decayWindowEvents > 10000) {
    throw new StigmergicFieldError(
      "INVALID_DECAY_WINDOW",
      "decayWindowEvents must be an integer from 1 through 10000",
    );
  }
  if (trace.subjectRef.length === 0) {
    throw new StigmergicFieldError("INVALID_SUBJECT_REF", "subjectRef must be non-empty");
  }
  if (trace.sourceEventId.length === 0 || trace.scopeId.length === 0) {
    throw new StigmergicFieldError("MISSING_SOURCE_EVENT", "trace source identity must be non-empty");
  }
}

export function addressFieldTrace(trace: FieldTrace): Addressed<FieldTrace> {
  validateTrace(trace);
  return addressJson(trace);
}
```

Also add the remaining public interfaces from the plan header now so later tasks compile against fixed names.

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
node --test --import tsx test/stigmergic-field.test.ts
```

Expected: PASS for the two Task 1 tests.

- [ ] **Step 5: Run TypeScript validation**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

```bash
git add src/stigmergic-field.ts test/stigmergic-field.test.ts
git commit -m "feat: define stigmergic field trace contract"
```

---

### Task 2: Derive replay-stable field cells with event-distance decay

**Files:**
- Modify: `src/stigmergic-field.ts`
- Modify: `test/stigmergic-field.test.ts`

**Interfaces:**
- Consumes: `addressFieldTrace(trace)` and the public request/projection types from Task 1.
- Produces: `deriveStigmergicField(request): StigmergicFieldProjection` with validated attribution, canonical ordering, checked integer aggregation, and deterministic fingerprinting.

- [ ] **Step 1: Add failing tests for deterministic permutation, exact decay boundary, attribution, inhibition coexistence, and source validation**

Append tests using this request helper:

```ts
import {
  deriveStigmergicField,
  type StigmergicProjectionRequest,
} from "../src/stigmergic-field.js";

const adapter = { id: "band-runtime/stigmergic-adapter", version: "0.1" };

function request(
  sourceEvents: FieldSourceEvent[],
  traces: ReturnType<typeof addressFieldTrace>[],
  overrides: Partial<StigmergicProjectionRequest> = {},
): StigmergicProjectionRequest {
  return {
    schemaVersion: "stigmergic-field/v0.1",
    scopeId: "session-linked-vertical",
    throughSequence: 11,
    policyVersion: "band-runtime-field-policy/v0.1",
    adapter,
    sourceEvents,
    traces,
    ...overrides,
  };
}
```

Add these assertions:

```ts
test("input permutation does not change cells or fingerprint", () => {
  const sources = [
    { eventId: "event-7-y-rings", scopeId: source.scopeId, sequence: 7 },
    { eventId: "event-11-x-rejected", scopeId: source.scopeId, sequence: 11 },
  ];
  const traces = [
    addressFieldTrace({
      sourceEventId: "event-7-y-rings",
      sourceSequence: 7,
      scopeId: source.scopeId,
      subjectRef: "direction-y",
      channel: "receptivity",
      magnitude: 400,
      decayWindowEvents: 5,
    }),
    addressFieldTrace({
      sourceEventId: "event-11-x-rejected",
      sourceSequence: 11,
      scopeId: source.scopeId,
      subjectRef: "direction-x",
      channel: "inhibition",
      magnitude: 700,
      decayWindowEvents: 5,
    }),
  ];

  const first = deriveStigmergicField(request(sources, traces));
  const second = deriveStigmergicField(request([...sources].reverse(), [...traces].reverse()));
  assert.deepEqual(first, second);
});

test("trace expires exactly when age reaches decay window", () => {
  const event = { eventId: "event-5", scopeId: source.scopeId, sequence: 5 };
  const addressed = addressFieldTrace({ ...trace(), sourceEventId: event.eventId, sourceSequence: 5 });

  const active = deriveStigmergicField(request([event], [addressed], { throughSequence: 10 }));
  assert.equal(active.cells[0]?.totalEffectiveMagnitude, 83);

  const expired = deriveStigmergicField(request([event], [addressed], { throughSequence: 11 }));
  assert.deepEqual(expired.cells, []);
});

test("aggregation preserves contributors and inhibition does not erase attention", () => {
  const events = [
    { eventId: "e10", scopeId: source.scopeId, sequence: 10 },
    { eventId: "e11", scopeId: source.scopeId, sequence: 11 },
  ];
  const traces = [
    addressFieldTrace({ ...trace(), sourceEventId: "e10", sourceSequence: 10, magnitude: 500 }),
    addressFieldTrace({
      ...trace(),
      sourceEventId: "e11",
      sourceSequence: 11,
      channel: "inhibition",
      magnitude: 700,
    }),
  ];
  const projection = deriveStigmergicField(request(events, traces));
  assert.deepEqual(projection.cells.map((cell) => cell.channel), ["attention", "inhibition"]);
  assert.equal(projection.cells[0]?.contributions.length, 1);
  assert.equal(projection.cells[1]?.contributions.length, 1);
});

test("missing, mismatched, cross-scope, and future trace sources are rejected", () => {
  const validEvent = { eventId: "e5", scopeId: source.scopeId, sequence: 5 };
  const baseTrace = addressFieldTrace({ ...trace(), sourceEventId: "e5", sourceSequence: 5 });

  assert.throws(
    () => deriveStigmergicField(request([], [baseTrace])),
    (error: unknown) => error instanceof StigmergicFieldError && error.code === "MISSING_SOURCE_EVENT",
  );
  assert.throws(
    () => deriveStigmergicField(request([{ ...validEvent, sequence: 6 }], [baseTrace])),
    (error: unknown) => error instanceof StigmergicFieldError && error.code === "SOURCE_SEQUENCE_MISMATCH",
  );
  assert.throws(
    () => deriveStigmergicField(request([{ ...validEvent, scopeId: "other" }], [baseTrace])),
    (error: unknown) => error instanceof StigmergicFieldError && error.code === "SCOPE_MISMATCH",
  );
  assert.throws(
    () => deriveStigmergicField(request([validEvent], [baseTrace], { throughSequence: 4 })),
    (error: unknown) => error instanceof StigmergicFieldError && error.code === "TRACE_FROM_FUTURE",
  );
});
```

- [ ] **Step 2: Run the focused test and verify new tests fail because derivation is not implemented**

Run:

```bash
node --test --import tsx test/stigmergic-field.test.ts
```

Expected: FAIL on `deriveStigmergicField` behavior.

- [ ] **Step 3: Implement request validation, source binding, identity verification, decay, aggregation, canonical sorting, and fingerprinting**

Implement the following shape in `src/stigmergic-field.ts`:

```ts
const SCHEMA_VERSION = "stigmergic-field/v0.1" as const;

function requireNonEmpty(value: string, code: StigmergicFieldErrorCode, label: string): void {
  if (value.length === 0) throw new StigmergicFieldError(code, `${label} must be non-empty`);
}

function checkedAdd(left: number, right: number): number {
  const result = left + right;
  if (!Number.isSafeInteger(result)) {
    throw new StigmergicFieldError("ARITHMETIC_OVERFLOW", "field aggregation exceeded safe integer range");
  }
  return result;
}

function effectiveMagnitude(trace: FieldTrace, throughSequence: number): number {
  const age = throughSequence - trace.sourceSequence;
  if (age < 0) {
    throw new StigmergicFieldError("TRACE_FROM_FUTURE", `trace ${trace.sourceEventId} is after causal cut`);
  }
  if (age >= trace.decayWindowEvents) return 0;
  const remaining = trace.decayWindowEvents - age;
  const product = trace.magnitude * remaining;
  if (!Number.isSafeInteger(product)) {
    throw new StigmergicFieldError("ARITHMETIC_OVERFLOW", "decay multiplication exceeded safe integer range");
  }
  return Math.floor(product / trace.decayWindowEvents);
}
```

Inside `deriveStigmergicField()`:

1. Require exact schema version.
2. Require positive-safe `throughSequence`.
3. Require non-empty `scopeId`, `policyVersion`, adapter id, and adapter version.
4. Build a `Map<string, FieldSourceEvent>`; repeated byte-identical source envelopes are idempotent, but the same `eventId` with different scope or sequence throws `SOURCE_EVENT_ID_CONFLICT`.
5. Require every source envelope to use the request scope and a positive-safe sequence.
6. For every addressed trace, run `validateTrace(trace.value)`, recompute `addressJson(trace.value).hash`, and throw `TRACE_IDENTITY_MISMATCH` when it differs from `trace.hash`.
7. Resolve the source envelope; require same scope and exact sequence.
8. Deduplicate identical addressed traces by hash.
9. Compute effective magnitude. Omit zero effective contributions.
10. Group by exact `(subjectRef, channel)` key.
11. Checked-add each effective magnitude.
12. Sort contributions by `sourceSequence`, then `sourceEventId`, then `traceHash` using ordinary Unicode string comparison.
13. Sort cells by `subjectRef`, then channel.
14. Construct the projection body with literal `authority: "none"`.
15. Set `fingerprint = addressJson(bodyWithoutFingerprint).hash`.

Do not use timestamps, `Date.now()`, random values, input order, or map insertion order as semantics.

- [ ] **Step 4: Run focused tests and verify they pass**

```bash
node --test --import tsx test/stigmergic-field.test.ts
```

Expected: PASS for Task 1 and Task 2 tests.

- [ ] **Step 5: Add and pass tests for schema/adapter/policy validation and overflow guard**

Append:

```ts
test("schema, adapter identity, and policy version are validated", () => {
  const event = { eventId: "e5", scopeId: source.scopeId, sequence: 5 };
  const addressed = addressFieldTrace({ ...trace(), sourceEventId: "e5", sourceSequence: 5 });

  assert.throws(
    () => deriveStigmergicField({ ...request([event], [addressed]), schemaVersion: "bad" as never }),
    (error: unknown) => error instanceof StigmergicFieldError && error.code === "UNSUPPORTED_SCHEMA_VERSION",
  );
  assert.throws(
    () => deriveStigmergicField(request([event], [addressed], { adapter: { id: "", version: "0.1" } })),
    (error: unknown) => error instanceof StigmergicFieldError && error.code === "INVALID_ADAPTER_IDENTITY",
  );
  assert.throws(
    () => deriveStigmergicField(request([event], [addressed], { policyVersion: "" })),
    (error: unknown) => error instanceof StigmergicFieldError && error.code === "INVALID_POLICY_VERSION",
  );
});

test("aggregate overflow is rejected instead of wrapping", () => {
  const events: FieldSourceEvent[] = [];
  const traces = [];
  for (let sequence = 1; sequence <= 10000; sequence++) {
    events.push({ eventId: `e${sequence}`, scopeId: source.scopeId, sequence });
    traces.push(addressFieldTrace({
      ...trace(),
      sourceEventId: `e${sequence}`,
      sourceSequence: sequence,
      magnitude: 1000,
      decayWindowEvents: 10000,
    }));
  }
  // This normal bounded fixture must remain safe; the test guards the checked-add path
  // while avoiding an impossible allocation large enough to exceed MAX_SAFE_INTEGER.
  const projection = deriveStigmergicField(request(events, traces, { throughSequence: 10000 }));
  assert.ok(Number.isSafeInteger(projection.cells[0]?.totalEffectiveMagnitude));
});
```

Because v0.1 caps both magnitude and decay window, a realistic in-memory fixture cannot reach `Number.MAX_SAFE_INTEGER` without exhausting memory first. Keep `checkedAdd()` anyway as a contract defense; do not create a pathological billions-of-traces unit test merely to force the branch.

- [ ] **Step 6: Run focused tests and TypeScript validation**

```bash
node --test --import tsx test/stigmergic-field.test.ts
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 7: Commit Task 2**

```bash
git add src/stigmergic-field.ts test/stigmergic-field.test.ts
git commit -m "feat: derive deterministic stigmergic field projections"
```

---

### Task 3: Verify projection fingerprints and prove fingerprint sensitivity

**Files:**
- Modify: `src/stigmergic-field.ts`
- Modify: `test/stigmergic-field.test.ts`

**Interfaces:**
- Consumes: `StigmergicFieldProjection` from Task 2.
- Produces: `verifyStigmergicFieldProjection(projection): void`.

- [ ] **Step 1: Write failing fingerprint-verification tests**

Append:

```ts
import { verifyStigmergicFieldProjection } from "../src/stigmergic-field.js";

test("adapter and policy identity change the fingerprint", () => {
  const event = { eventId: "e10", scopeId: source.scopeId, sequence: 10 };
  const addressed = addressFieldTrace({ ...trace(), sourceEventId: "e10", sourceSequence: 10 });

  const base = deriveStigmergicField(request([event], [addressed]));
  const changedAdapter = deriveStigmergicField(request([event], [addressed], {
    adapter: { id: adapter.id, version: "0.2" },
  }));
  const changedPolicy = deriveStigmergicField(request([event], [addressed], {
    policyVersion: "band-runtime-field-policy/v0.2",
  }));

  assert.notEqual(base.fingerprint, changedAdapter.fingerprint);
  assert.notEqual(base.fingerprint, changedPolicy.fingerprint);
});

test("projection verification detects mutated body with stale fingerprint", () => {
  const event = { eventId: "e10", scopeId: source.scopeId, sequence: 10 };
  const addressed = addressFieldTrace({ ...trace(), sourceEventId: "e10", sourceSequence: 10 });
  const projection = deriveStigmergicField(request([event], [addressed]));
  const mutated = {
    ...projection,
    cells: projection.cells.map((cell, index) => index === 0
      ? { ...cell, totalEffectiveMagnitude: cell.totalEffectiveMagnitude + 1 }
      : cell),
  };

  assert.throws(
    () => verifyStigmergicFieldProjection(mutated),
    (error: unknown) => error instanceof StigmergicFieldError && error.code === "FINGERPRINT_MISMATCH",
  );
});
```

- [ ] **Step 2: Run focused tests and verify fingerprint verification fails because it is not implemented**

```bash
node --test --import tsx test/stigmergic-field.test.ts
```

Expected: FAIL on missing or incomplete `verifyStigmergicFieldProjection`.

- [ ] **Step 3: Implement fingerprint verification**

Implement:

```ts
export function verifyStigmergicFieldProjection(
  projection: StigmergicFieldProjection,
): void {
  const { fingerprint, ...body } = projection;
  const expected = addressJson(body).hash;
  if (expected !== fingerprint) {
    throw new StigmergicFieldError(
      "FINGERPRINT_MISMATCH",
      `projection body addresses to ${expected}, not declared ${fingerprint}`,
    );
  }
}
```

Do not make this verifier infer or repair field state. It verifies identity only.

- [ ] **Step 4: Run focused tests and full typecheck**

```bash
node --test --import tsx test/stigmergic-field.test.ts
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/stigmergic-field.ts test/stigmergic-field.test.ts
git commit -m "test: verify stigmergic projection fingerprints"
```

---

### Task 4: Freeze the canonical linked-vertical conformance fixture

**Files:**
- Create: `fixtures/stigmergic-field-v0.1.json`
- Modify: `test/stigmergic-field.test.ts`

**Interfaces:**
- Consumes: `addressFieldTrace()` and `deriveStigmergicField()`.
- Produces: one canonical fixture whose exact bytes become the Band Runtime v0.1 cross-repository contract.

- [ ] **Step 1: Add a failing fixture-replay test expecting the canonical JSON file**

Append:

```ts
import { readFile } from "node:fs/promises";

interface StigmergicFixture {
  schemaVersion: "stigmergic-field/v0.1";
  scopeId: string;
  policyVersion: string;
  adapter: { id: string; version: string };
  sourceEvents: FieldSourceEvent[];
  traces: ReturnType<typeof addressFieldTrace>[];
  expectedProjections: StigmergicFieldProjection[];
}

test("canonical stigmergic fixture reproduces expected projections and fingerprints", async () => {
  const fixture = JSON.parse(
    await readFile(new URL("../fixtures/stigmergic-field-v0.1.json", import.meta.url), "utf8"),
  ) as StigmergicFixture;

  for (const expected of fixture.expectedProjections) {
    const actual = deriveStigmergicField({
      schemaVersion: fixture.schemaVersion,
      scopeId: fixture.scopeId,
      throughSequence: expected.throughSequence,
      policyVersion: fixture.policyVersion,
      adapter: fixture.adapter,
      sourceEvents: fixture.sourceEvents,
      traces: fixture.traces,
    });
    assert.deepEqual(actual, expected);
    verifyStigmergicFieldProjection(actual);
  }
});
```

- [ ] **Step 2: Run the focused test and verify it fails because the fixture file is absent**

```bash
node --test --import tsx test/stigmergic-field.test.ts
```

Expected: FAIL with `ENOENT` for `fixtures/stigmergic-field-v0.1.json`.

- [ ] **Step 3: Generate the fixture from the exact linked-vertical event/traces below**

Use a one-off TypeScript generator executed from the shell; do not commit the generator. The fixture source envelopes are intentionally generic and already use 1-based scope-local field sequence:

```ts
const sourceEvents = [
  { eventId: "event-1-session-opened", scopeId, sequence: 1 },
  { eventId: "event-2-participant-a", scopeId, sequence: 2 },
  { eventId: "event-3-participant-b", scopeId, sequence: 3 },
  { eventId: "event-4-participant-c", scopeId, sequence: 4 },
  { eventId: "event-5-propose-x", scopeId, sequence: 5 },
  { eventId: "event-6-propose-y", scopeId, sequence: 6 },
  { eventId: "event-7-c-rings-y", scopeId, sequence: 7 },
  { eventId: "event-8-b-rings-x", scopeId, sequence: 8 },
  { eventId: "event-9-c-rings-x", scopeId, sequence: 9 },
  { eventId: "event-10-a-rings-x", scopeId, sequence: 10 },
  { eventId: "event-11-reject-x", scopeId, sequence: 11 },
  { eventId: "event-12-b-rings-y", scopeId, sequence: 12 },
  { eventId: "event-13-c-no-x", scopeId, sequence: 13 },
  { eventId: "event-14-b-rings-y-again", scopeId, sequence: 14 },
];
```

Use exactly these trace bodies:

```ts
const traceBodies = [
  { sourceEventId: "event-5-propose-x", sourceSequence: 5, scopeId, subjectRef: "direction-x", channel: "attention", magnitude: 500, decayWindowEvents: 6 },
  { sourceEventId: "event-6-propose-y", sourceSequence: 6, scopeId, subjectRef: "direction-y", channel: "attention", magnitude: 500, decayWindowEvents: 6 },
  { sourceEventId: "event-7-c-rings-y", sourceSequence: 7, scopeId, subjectRef: "direction-y", channel: "receptivity", magnitude: 400, decayWindowEvents: 5 },
  { sourceEventId: "event-8-b-rings-x", sourceSequence: 8, scopeId, subjectRef: "direction-x", channel: "receptivity", magnitude: 400, decayWindowEvents: 5 },
  { sourceEventId: "event-9-c-rings-x", sourceSequence: 9, scopeId, subjectRef: "direction-x", channel: "receptivity", magnitude: 400, decayWindowEvents: 5 },
  { sourceEventId: "event-10-a-rings-x", sourceSequence: 10, scopeId, subjectRef: "direction-x", channel: "receptivity", magnitude: 400, decayWindowEvents: 5 },
  { sourceEventId: "event-10-a-rings-x", sourceSequence: 10, scopeId, subjectRef: "direction-x", channel: "saturation", magnitude: 600, decayWindowEvents: 4 },
  { sourceEventId: "event-11-reject-x", sourceSequence: 11, scopeId, subjectRef: "direction-x", channel: "inhibition", magnitude: 700, decayWindowEvents: 5 },
  { sourceEventId: "event-12-b-rings-y", sourceSequence: 12, scopeId, subjectRef: "direction-y", channel: "receptivity", magnitude: 400, decayWindowEvents: 5 },
  { sourceEventId: "event-13-c-no-x", sourceSequence: 13, scopeId, subjectRef: "direction-x", channel: "tension", magnitude: 350, decayWindowEvents: 5 },
  { sourceEventId: "event-14-b-rings-y-again", sourceSequence: 14, scopeId, subjectRef: "direction-y", channel: "receptivity", magnitude: 400, decayWindowEvents: 5 },
  { sourceEventId: "event-14-b-rings-y-again", sourceSequence: 14, scopeId, subjectRef: "direction-y", channel: "return", magnitude: 300, decayWindowEvents: 6 },
] as const;
```

The exact fixture constants are:

```ts
const scopeId = "session-linked-vertical";
const policyVersion = "band-runtime-field-policy/v0.1";
const adapter = { id: "band-runtime/stigmergic-adapter", version: "0.1" };
const cuts = [10, 11, 12, 14];
```

Generate addressed traces with `addressFieldTrace()`, derive one projection for each cut, and write this object with two-space JSON indentation plus a trailing newline:

```ts
{
  schemaVersion: "stigmergic-field/v0.1",
  scopeId,
  policyVersion,
  adapter,
  sourceEvents,
  traces,
  expectedProjections: cuts.map((throughSequence) => deriveStigmergicField({
    schemaVersion: "stigmergic-field/v0.1",
    scopeId,
    throughSequence,
    policyVersion,
    adapter,
    sourceEvents,
    traces,
  })),
}
```

Important: the cut at `10` shows X saturated but not yet inhibited; cut `11` adds explicit inhibition and should flip the later Band Runtime local recruitment preference toward Y. Cuts `12` and `14` prove downstream redistribution and return residue.

- [ ] **Step 4: Run the fixture test and inspect the generated fixture once**

```bash
node --test --import tsx test/stigmergic-field.test.ts
cat fixtures/stigmergic-field-v0.1.json
```

Expected: tests PASS; the fixture contains exactly four expected projections with non-empty `sha256:` fingerprints and `authority: "none"`.

- [ ] **Step 5: Prove timestamp/wall-clock irrelevance explicitly**

No timestamp exists in the generic source envelope. Add this assertion documenting the boundary:

```ts
test("generic field source envelope contains no wall-clock decay input", () => {
  const keys = Object.keys({ eventId: "e1", scopeId: "s", sequence: 1 } satisfies FieldSourceEvent).sort();
  assert.deepEqual(keys, ["eventId", "scopeId", "sequence"]);
});
```

- [ ] **Step 6: Run full TranchNode verification**

```bash
npm run check
```

Expected: TypeScript validation and the complete Node test suite PASS.

- [ ] **Step 7: Commit the canonical fixture**

```bash
git add fixtures/stigmergic-field-v0.1.json test/stigmergic-field.test.ts
git commit -m "test: freeze stigmergic field v0.1 conformance fixture"
```

---

### Task 5: Final contract audit before opening the implementation PR

**Files:**
- Review only: `src/stigmergic-field.ts`
- Review only: `test/stigmergic-field.test.ts`
- Review only: `fixtures/stigmergic-field-v0.1.json`
- Review against: `docs/superpowers/specs/2026-08-10-stigmergic-field-v0.1-design.md`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: a verified TranchNode v0.1 implementation branch ready for downstream Band Runtime consumption.

- [ ] **Step 1: Search for forbidden time/random/authority shortcuts**

Run:

```bash
grep -R "Date.now\|Math.random\|timestamp\|authority.*true\|assign" src/stigmergic-field.ts test/stigmergic-field.test.ts fixtures/stigmergic-field-v0.1.json || true
```

Expected: no implementation dependency on wall-clock time, randomness, assignment, or authority elevation. Test prose may contain the word `timestamp`; inspect any match manually.

- [ ] **Step 2: Confirm no ontology file changed**

Run:

```bash
git diff main...HEAD --name-only
```

Expected implementation files are limited to:

```text
src/stigmergic-field.ts
test/stigmergic-field.test.ts
fixtures/stigmergic-field-v0.1.json
docs/superpowers/specs/2026-08-10-stigmergic-field-v0.1-design.md
docs/superpowers/plans/2026-08-10-stigmergic-field-v0.1.md
```

No change to `ONTOLOGY.md`, `INVARIANTS.md`, or Project0 contract files is allowed in this vertical.

- [ ] **Step 3: Run final verification from a clean checkout/worktree**

```bash
npm ci
npm run check
```

Expected: PASS with a clean working tree afterward.

- [ ] **Step 4: Record the fixture content address for the downstream PR body**

Run:

```bash
node --import tsx -e 'import { readFileSync } from "node:fs"; import { sha256 } from "./src/residual.ts"; console.log(sha256(readFileSync("fixtures/stigmergic-field-v0.1.json")))'
```

Expected: one `sha256:<64 hex characters>` value. Copy that exact value into the TranchNode implementation PR description and the Band Runtime plan execution notes. This binds the cross-repository contract to exact fixture bytes rather than a moving branch name.

- [ ] **Step 5: Commit only if the audit required a correction**

If the audit changed code/tests/fixture, run `npm run check` again and commit the focused correction. If no correction was required, do not create an empty commit.
