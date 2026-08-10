# Stigmergic Field v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement TranchNode's deterministic, attributable, authority-free Stigmergic Field v0.1 and freeze a content-addressed conformance fixture that downstream Band Runtime can consume without duplicating field math.

**Architecture:** Add a projection module beside the existing projection core, not an ontology extension. Domain adapters provide scope-local accepted-event envelopes and content-addressed traces; TranchNode validates source binding, applies integer event-distance decay, aggregates in canonical order, and fingerprints the exact projection body with existing `addressJson()` semantics.

**Tech Stack:** TypeScript 5.8, Node.js `node:test`, `node:assert/strict`, existing `addressJson()` / SHA-256 primitives from `src/residual.ts`.

## Global Constraints

- Schema is exactly `stigmergic-field/v0.1`.
- Every projection has `authority: "none"`.
- No node kind, edge kind, epistemic state, accepted operation, or Project0 contract changes.
- Decay uses scope-local event sequence only. Wall-clock time is absent from the generic envelope.
- `magnitude` is an integer `0..1000`; `decayWindowEvents` is an integer `1..10000`.
- Source and causal-cut sequences are positive safe integers.
- A trace must bind to an existing same-scope source envelope with exactly matching sequence.
- A request containing a trace whose source is after its `throughSequence` is invalid.
- Effective magnitude is `floor(magnitude * (decayWindowEvents - age) / decayWindowEvents)` for `age < decayWindowEvents`; otherwise the contribution is inactive.
- Cells sort by `subjectRef`, then channel. Contributions sort by source sequence, source event id, then trace hash.
- Aggregate arithmetic is checked and rejects unsafe integer overflow.
- The fingerprint is `addressJson(bodyWithoutFingerprint).hash`.
- Fingerprint equality proves only identical declared projection bytes.
- No new dependency.

---

## File Structure

- Create `src/stigmergic-field.ts` — contract types, trace addressing, validation, derivation, sorting, projection identity verification.
- Create `src/stigmergic-field-arithmetic.ts` — small internal checked-integer and decay helpers so overflow behavior can be unit-tested without pathological allocations.
- Create `test/stigmergic-field.test.ts` — contract, validation, deterministic replay, scope, decay, identity, ordering, and fixture tests.
- Create `fixtures/stigmergic-field-v0.1.json` — canonical linked-vertical source/trace pool plus per-cut requests and expected projections.
- Do not widen `ProjectionKind` in `src/projection.ts`.

## Frozen Interfaces

```ts
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
export function deriveStigmergicField(request: StigmergicProjectionRequest): StigmergicFieldProjection;
export function verifyStigmergicFieldProjection(projection: StigmergicFieldProjection): void;
```

---

### Task 1: Freeze validation, trace identity, and checked arithmetic

**Files:**
- Create: `src/stigmergic-field.ts`
- Create: `src/stigmergic-field-arithmetic.ts`
- Create: `test/stigmergic-field.test.ts`

**Interfaces:**
- Consumes: `addressJson`, `Addressed`, and `Hash` from `src/residual.ts`.
- Produces: frozen field types, `StigmergicFieldError`, `addressFieldTrace`, `checkedFieldAdd`, and `decayedMagnitude`.

- [ ] **Step 1: Write failing tests for trace validation and arithmetic**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  StigmergicFieldError,
  addressFieldTrace,
} from "../src/stigmergic-field.js";
import {
  checkedFieldAdd,
  decayedMagnitude,
} from "../src/stigmergic-field-arithmetic.js";

const scopeId = "session-linked-vertical";

function trace(overrides = {}) {
  return {
    sourceEventId: "event-5-propose-x",
    sourceSequence: 5,
    scopeId,
    subjectRef: "direction-x",
    channel: "attention" as const,
    magnitude: 500,
    decayWindowEvents: 6,
    ...overrides,
  };
}

test("trace identity is canonical", () => {
  assert.equal(addressFieldTrace(trace()).hash, addressFieldTrace(trace()).hash);
});

test("trace validation rejects invalid bounded values", () => {
  const cases = [
    [trace({ magnitude: -1 }), "INVALID_MAGNITUDE"],
    [trace({ magnitude: 1001 }), "INVALID_MAGNITUDE"],
    [trace({ magnitude: 1.5 }), "INVALID_MAGNITUDE"],
    [trace({ decayWindowEvents: 0 }), "INVALID_DECAY_WINDOW"],
    [trace({ decayWindowEvents: 10001 }), "INVALID_DECAY_WINDOW"],
    [trace({ sourceSequence: 0 }), "INVALID_SEQUENCE"],
    [trace({ subjectRef: "" }), "INVALID_SUBJECT_REF"],
  ] as const;
  for (const [value, code] of cases) {
    assert.throws(
      () => addressFieldTrace(value),
      (error: unknown) => error instanceof StigmergicFieldError && error.code === code,
    );
  }
});

test("checked field addition rejects unsafe result", () => {
  assert.throws(
    () => checkedFieldAdd(Number.MAX_SAFE_INTEGER, 1),
    /ARITHMETIC_OVERFLOW/,
  );
});

test("integer decay is exact at active and expiry boundaries", () => {
  assert.equal(decayedMagnitude(500, 6, 5, 10), 83);
  assert.equal(decayedMagnitude(500, 6, 5, 11), 0);
  assert.throws(() => decayedMagnitude(500, 6, 5, 4), /TRACE_FROM_FUTURE/);
});
```

- [ ] **Step 2: Verify the tests fail because the modules do not exist**

Run:

```bash
node --test --import tsx test/stigmergic-field.test.ts
```

Expected: FAIL on missing modules/exports.

- [ ] **Step 3: Implement arithmetic helpers**

Create `src/stigmergic-field-arithmetic.ts`:

```ts
export function checkedFieldAdd(left: number, right: number): number {
  if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right)) {
    throw new Error("ARITHMETIC_OVERFLOW");
  }
  const value = left + right;
  if (!Number.isSafeInteger(value)) throw new Error("ARITHMETIC_OVERFLOW");
  return value;
}

export function decayedMagnitude(
  magnitude: number,
  decayWindowEvents: number,
  sourceSequence: number,
  throughSequence: number,
): number {
  const age = throughSequence - sourceSequence;
  if (age < 0) throw new Error("TRACE_FROM_FUTURE");
  if (age >= decayWindowEvents) return 0;
  const remaining = decayWindowEvents - age;
  const product = magnitude * remaining;
  if (!Number.isSafeInteger(product)) throw new Error("ARITHMETIC_OVERFLOW");
  return Math.floor(product / decayWindowEvents);
}
```

This file is internal implementation support; do not re-export it from a package barrel.

- [ ] **Step 4: Implement types, error codes, validation, and trace addressing**

In `src/stigmergic-field.ts`, define all frozen interfaces and a `StigmergicFieldError` whose code union includes:

```ts
"UNSUPPORTED_SCHEMA_VERSION"
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
| "FINGERPRINT_MISMATCH"
```

`addressFieldTrace()` must validate first, then return `addressJson(trace)`.

- [ ] **Step 5: Run focused tests and typecheck**

```bash
node --test --import tsx test/stigmergic-field.test.ts
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/stigmergic-field.ts src/stigmergic-field-arithmetic.ts test/stigmergic-field.test.ts
git commit -m "feat: define stigmergic field contract"
```

---

### Task 2: Derive deterministic field projections and verify identity

**Files:**
- Modify: `src/stigmergic-field.ts`
- Modify: `test/stigmergic-field.test.ts`

**Interfaces:**
- Consumes: Task 1 trace/address/arithmetic helpers.
- Produces: `deriveStigmergicField()` and `verifyStigmergicFieldProjection()`.

- [ ] **Step 1: Add failing derivation tests**

Add helpers:

```ts
const adapter = { id: "band-runtime/stigmergic-adapter", version: "0.1" };
const policyVersion = "band-runtime-field-policy/v0.1";

function source(eventId: string, sequence: number, scope = scopeId) {
  return { eventId, scopeId: scope, sequence };
}

function request(sourceEvents, traces, overrides = {}) {
  return {
    schemaVersion: "stigmergic-field/v0.1" as const,
    scopeId,
    throughSequence: 11,
    policyVersion,
    adapter,
    sourceEvents,
    traces,
    ...overrides,
  };
}
```

Add tests for:

```ts
test("input permutation produces byte-identical projection", () => {
  const sources = [source("e7", 7), source("e11", 11)];
  const traces = [
    addressFieldTrace({ ...trace(), sourceEventId: "e7", sourceSequence: 7, subjectRef: "direction-y", channel: "receptivity", magnitude: 400, decayWindowEvents: 5 }),
    addressFieldTrace({ ...trace(), sourceEventId: "e11", sourceSequence: 11, channel: "inhibition", magnitude: 700, decayWindowEvents: 5 }),
  ];
  assert.deepEqual(
    deriveStigmergicField(request(sources, traces)),
    deriveStigmergicField(request([...sources].reverse(), [...traces].reverse())),
  );
});

test("inhibition remains beside positive history instead of deleting it", () => {
  const projection = deriveStigmergicField(request(
    [source("e10", 10), source("e11", 11)],
    [
      addressFieldTrace({ ...trace(), sourceEventId: "e10", sourceSequence: 10 }),
      addressFieldTrace({ ...trace(), sourceEventId: "e11", sourceSequence: 11, channel: "inhibition", magnitude: 700, decayWindowEvents: 5 }),
    ],
  ));
  assert.deepEqual(projection.cells.map((cell) => cell.channel), ["attention", "inhibition"]);
});

test("missing, mismatched, cross-scope, future, and mutated traces are rejected", () => {
  const addressed = addressFieldTrace({ ...trace(), sourceEventId: "e5", sourceSequence: 5 });
  assert.throws(() => deriveStigmergicField(request([], [addressed])), /MISSING_SOURCE_EVENT/);
  assert.throws(() => deriveStigmergicField(request([source("e5", 6)], [addressed])), /SOURCE_SEQUENCE_MISMATCH/);
  assert.throws(() => deriveStigmergicField(request([source("e5", 5, "other")], [addressed])), /SCOPE_MISMATCH/);
  assert.throws(() => deriveStigmergicField(request([source("e5", 5)], [addressed], { throughSequence: 4 })), /TRACE_FROM_FUTURE/);
  assert.throws(() => deriveStigmergicField(request([source("e5", 5)], [{ ...addressed, value: { ...addressed.value, magnitude: 499 } }])), /TRACE_IDENTITY_MISMATCH/);
});

test("fingerprint binds adapter, policy, cells, and authority literal", () => {
  const addressed = addressFieldTrace({ ...trace(), sourceEventId: "e10", sourceSequence: 10 });
  const base = deriveStigmergicField(request([source("e10", 10)], [addressed]));
  const adapterChanged = deriveStigmergicField(request([source("e10", 10)], [addressed], { adapter: { ...adapter, version: "0.2" } }));
  const policyChanged = deriveStigmergicField(request([source("e10", 10)], [addressed], { policyVersion: "band-runtime-field-policy/v0.2" }));
  assert.equal(base.authority, "none");
  assert.notEqual(base.fingerprint, adapterChanged.fingerprint);
  assert.notEqual(base.fingerprint, policyChanged.fingerprint);
});
```

- [ ] **Step 2: Verify new tests fail**

```bash
node --test --import tsx test/stigmergic-field.test.ts
```

Expected: FAIL on missing derivation/verifier behavior.

- [ ] **Step 3: Implement deterministic derivation**

Implementation order inside `deriveStigmergicField()`:

1. Validate exact schema, positive-safe `throughSequence`, non-empty scope/policy/adapter id/version.
2. Build a source map. Same `eventId` + identical scope/sequence is idempotent; conflicting duplicate is `SOURCE_EVENT_ID_CONFLICT`.
3. Require every source envelope in the request to use the request scope.
4. Re-address every trace body and reject stale/mutated trace hashes.
5. Resolve source event; require same scope and exact sequence.
6. Reject any trace after the causal cut.
7. Deduplicate identical addressed traces by hash.
8. Call `decayedMagnitude()`. Convert helper errors into `StigmergicFieldError` with the same code.
9. Omit zero contributions.
10. Group by exact `(subjectRef, channel)` and sum using `checkedFieldAdd()`.
11. Sort contributions by `sourceSequence`, `sourceEventId`, `traceHash`.
12. Sort cells by `subjectRef`, then channel.
13. Build body with `authority: "none"` and compute `addressJson(body).hash`.

Never use source-array order, trace-array order, timestamps, map insertion order, randomness, or model output order as meaning.

- [ ] **Step 4: Implement projection identity verification**

```ts
export function verifyStigmergicFieldProjection(projection: StigmergicFieldProjection): void {
  const { fingerprint, ...body } = projection;
  const expected = addressJson(body).hash;
  if (expected !== fingerprint) {
    throw new StigmergicFieldError("FINGERPRINT_MISMATCH", `expected ${expected}, received ${fingerprint}`);
  }
}
```

Add a test that mutates one cell magnitude while retaining the old fingerprint and expects `FINGERPRINT_MISMATCH`.

- [ ] **Step 5: Add explicit canonical ordering/attribution test**

Create traces in deliberately scrambled order across `direction-z`, `direction-a`, multiple channels, and multiple sources. Assert the returned cell order and contributor order exactly match the frozen ordering rules and that every aggregate retains each source event id/hash.

- [ ] **Step 6: Run focused tests and typecheck**

```bash
node --test --import tsx test/stigmergic-field.test.ts
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/stigmergic-field.ts test/stigmergic-field.test.ts
git commit -m "feat: derive deterministic stigmergic projections"
```

---

### Task 3: Freeze the canonical per-cut conformance fixture

**Files:**
- Create: `fixtures/stigmergic-field-v0.1.json`
- Modify: `test/stigmergic-field.test.ts`

**Interfaces:**
- Consumes: Task 2 engine.
- Produces: one exact linked-vertical fixture with global source/trace pools and per-cut membership so future evidence never enters an earlier request.

- [ ] **Step 1: Add a failing fixture replay test**

The fixture shape is:

```ts
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
  traces: Addressed<FieldTrace>[];
  projectionCases: FixtureCase[];
}
```

Test algorithm for each case:

```ts
const sourceMap = new Map(fixture.sourceEvents.map((event) => [event.eventId, event]));
const traceMap = new Map(fixture.traces.map((trace) => [trace.hash, trace]));

for (const specimen of fixture.projectionCases) {
  const actual = deriveStigmergicField({
    schemaVersion: fixture.schemaVersion,
    scopeId: fixture.scopeId,
    throughSequence: specimen.throughSequence,
    policyVersion: fixture.policyVersion,
    adapter: fixture.adapter,
    sourceEvents: specimen.sourceEventIds.map((id) => sourceMap.get(id)!),
    traces: specimen.traceHashes.map((hash) => traceMap.get(hash)!),
  });
  assert.deepEqual(actual, specimen.expectedProjection);
  verifyStigmergicFieldProjection(actual);
}
```

The test must also assert every requested source id/hash resolves; never use non-null assertions without a preceding explicit existence assertion in the final test.

- [ ] **Step 2: Verify fixture test fails with `ENOENT`**

```bash
node --test --import tsx test/stigmergic-field.test.ts
```

Expected: FAIL because the fixture file is absent.

- [ ] **Step 3: Generate the exact fixture from these source envelopes**

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
const traceBodies: FieldTrace[] = [
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
];
```

Constants:

```ts
const scopeId = "session-linked-vertical";
const policyVersion = "band-runtime-field-policy/v0.1";
const adapter = { id: "band-runtime/stigmergic-adapter", version: "0.1" };
const cuts = [10, 11, 12, 14];
```

Create `traces = traceBodies.map(addressFieldTrace)`.

For each cut, define request membership strictly by sequence:

```ts
const caseSources = sourceEvents.filter((event) => event.sequence <= throughSequence);
const caseTraces = traces.filter((trace) => trace.value.sourceSequence <= throughSequence);
```

Then store:

```ts
{
  throughSequence,
  sourceEventIds: caseSources.map((event) => event.eventId),
  traceHashes: caseTraces.map((trace) => trace.hash),
  expectedProjection: deriveStigmergicField({
    schemaVersion: "stigmergic-field/v0.1",
    scopeId,
    throughSequence,
    policyVersion,
    adapter,
    sourceEvents: caseSources,
    traces: caseTraces,
  }),
}
```

Write JSON with two-space indentation and a trailing newline. The generator is one-off and is not committed.

- [ ] **Step 4: Add the explicit future-evidence rejection test**

Separately prove that taking the cut-10 request and adding the addressed inhibition trace from event 11 throws `TRACE_FROM_FUTURE`. This guards the exact fixture bug that motivated per-cut membership.

- [ ] **Step 5: Run fixture replay and full TranchNode checks**

```bash
node --test --import tsx test/stigmergic-field.test.ts
npm run check
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add fixtures/stigmergic-field-v0.1.json test/stigmergic-field.test.ts
git commit -m "test: freeze stigmergic field v0.1 fixture"
```

---

### Task 4: Final contract audit and downstream handoff

**Files:**
- Review: `src/stigmergic-field.ts`
- Review: `src/stigmergic-field-arithmetic.ts`
- Review: `test/stigmergic-field.test.ts`
- Review: `fixtures/stigmergic-field-v0.1.json`
- Review against: `docs/superpowers/specs/2026-08-10-stigmergic-field-v0.1-design.md`

**Interfaces:**
- Consumes: Tasks 1-3.
- Produces: verified implementation and exact fixture raw-byte SHA-256 for Band Runtime.

- [ ] **Step 1: Verify forbidden shortcuts are absent**

```bash
grep -R "Date.now\|Math.random\|timestamp\|scheduler\|assignment" src/stigmergic-field.ts src/stigmergic-field-arithmetic.ts fixtures/stigmergic-field-v0.1.json || true
```

Expected: no matches that affect field semantics.

- [ ] **Step 2: Verify ontology files are untouched**

```bash
git diff main...HEAD --name-only
```

Implementation changes must not include `ONTOLOGY.md`, `INVARIANTS.md`, or Project0 files.

- [ ] **Step 3: Run clean verification**

```bash
npm ci
npm run check
```

Expected: PASS.

- [ ] **Step 4: Compute the exact fixture raw-byte content address**

```bash
node --import tsx -e 'import { readFileSync } from "node:fs"; import { sha256 } from "./src/residual.ts"; console.log(sha256(readFileSync("fixtures/stigmergic-field-v0.1.json")))'
```

Expected: one `sha256:` value with 64 hexadecimal digest characters. Record the exact emitted value in the implementation PR body and downstream Band Runtime execution notes.

- [ ] **Step 5: Commit only if the audit changed something**

If an audit correction was necessary, rerun `npm run check` and commit the focused correction. Otherwise make no empty commit.
