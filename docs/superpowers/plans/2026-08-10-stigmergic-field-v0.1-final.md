# Stigmergic Field v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a deterministic, attributable, authority-free Stigmergic Field v0.1 in TranchNode and freeze the exact conformance fixture consumed by Band Runtime.

**Architecture:** Add a projection module beside the existing projection core, not an ontology extension. Domain adapters provide scope-local accepted-event envelopes and content-addressed traces. TranchNode validates binding, applies integer event-distance decay, aggregates in canonical order, and fingerprints the exact projection body using the existing canonical JSON address function.

**Tech Stack:** TypeScript 5.8 with `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes`; Node.js `node:test`; `node:assert/strict`; existing `addressJson()` and SHA-256 primitives from `src/residual.ts`.

## Global Constraints

- Schema: `stigmergic-field/v0.1`.
- Projection authority: exactly `none`.
- No TranchNode/Project0 ontology changes.
- No wall-clock input to decay.
- `magnitude`: integer `0..1000`.
- `decayWindowEvents`: integer `1..10000`.
- All sequences: positive safe integers.
- Source sequence is scope-local and must exactly match the source envelope.
- Any trace after `throughSequence` makes the request invalid.
- Active magnitude: `floor(magnitude * (decayWindowEvents - age) / decayWindowEvents)` where `age = throughSequence - sourceSequence`.
- Inactive when `age >= decayWindowEvents`.
- Cells sort by `subjectRef`, then channel.
- Contributions sort by `sourceSequence`, then `sourceEventId`, then trace hash.
- Aggregate addition is checked for safe-integer overflow.
- Fingerprint: `addressJson(projection body without fingerprint).hash`.
- Fingerprint equality establishes projection-byte equality only.
- No new dependency.

## Files

- Create `src/stigmergic-field.ts` — public v0.1 contract, typed errors, trace addressing, derivation, verification.
- Create `src/stigmergic-field-arithmetic.ts` — checked integer addition and event-distance decay helper.
- Create `test/stigmergic-field.test.ts` — all unit/conformance tests.
- Create `fixtures/stigmergic-field-v0.1.json` — global source/trace pool plus explicit per-cut membership and expected projections.
- Leave `src/projection.ts`, `ONTOLOGY.md`, and `INVARIANTS.md` unchanged.

## Frozen Public Types

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
export function deriveStigmergicField(request: StigmergicProjectionRequest): StigmergicFieldProjection;
export function verifyStigmergicFieldProjection(projection: StigmergicFieldProjection): void;
```

---

### Task 1: Contract, trace identity, and checked arithmetic

**Files:**
- Create `src/stigmergic-field.ts`
- Create `src/stigmergic-field-arithmetic.ts`
- Create `test/stigmergic-field.test.ts`

**Interfaces:**
- Consumes `addressJson`, `Addressed`, and `Hash` from `src/residual.ts`.
- Produces all frozen types, `StigmergicFieldError`, `addressFieldTrace`, `checkedFieldAdd`, and `decayedMagnitude`.

- [ ] **Step 1: Write the failing contract/arithmetic tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  StigmergicFieldError,
  addressFieldTrace,
  type FieldTrace,
} from "../src/stigmergic-field.js";
import {
  checkedFieldAdd,
  decayedMagnitude,
} from "../src/stigmergic-field-arithmetic.js";

const scopeId = "session-linked-vertical";

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

test("trace identity is canonical and stable", () => {
  const first = addressFieldTrace(makeTrace());
  const second = addressFieldTrace(makeTrace());
  assert.equal(first.hash, second.hash);
  assert.deepEqual(first.value, second.value);
});

test("trace validation rejects out-of-contract values", () => {
  const cases: Array<[Partial<FieldTrace>, string]> = [
    [{ magnitude: -1 }, "INVALID_MAGNITUDE"],
    [{ magnitude: 1001 }, "INVALID_MAGNITUDE"],
    [{ magnitude: 1.5 }, "INVALID_MAGNITUDE"],
    [{ decayWindowEvents: 0 }, "INVALID_DECAY_WINDOW"],
    [{ decayWindowEvents: 10001 }, "INVALID_DECAY_WINDOW"],
    [{ sourceSequence: 0 }, "INVALID_SEQUENCE"],
    [{ sourceSequence: Number.MAX_SAFE_INTEGER + 1 }, "INVALID_SEQUENCE"],
    [{ subjectRef: "" }, "INVALID_SUBJECT_REF"],
  ];

  for (const [overrides, code] of cases) {
    assert.throws(
      () => addressFieldTrace(makeTrace(overrides)),
      (error: unknown) => error instanceof StigmergicFieldError && error.code === code,
    );
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
```

- [ ] **Step 2: Run and confirm failure**

```bash
node --test --import tsx test/stigmergic-field.test.ts
```

Expected: FAIL because the new modules do not exist.

- [ ] **Step 3: Implement arithmetic helper exactly**

`src/stigmergic-field-arithmetic.ts`:

```ts
export function checkedFieldAdd(left: number, right: number): number {
  if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right)) {
    throw new Error("ARITHMETIC_OVERFLOW");
  }
  const result = left + right;
  if (!Number.isSafeInteger(result)) throw new Error("ARITHMETIC_OVERFLOW");
  return result;
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

Do not export these helpers from any package barrel.

- [ ] **Step 4: Implement field types, errors, validation, and trace addressing**

Create `StigmergicFieldError` with this exact code union:

```ts
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
```

`addressFieldTrace()` validates `sourceSequence`, magnitude, window, non-empty source id/scope/subject, then returns `addressJson(trace)`.

- [ ] **Step 5: Run focused tests and strict typecheck**

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

### Task 2: Deterministic derivation, source binding, ordering, and fingerprint verification

**Files:**
- Modify `src/stigmergic-field.ts`
- Modify `test/stigmergic-field.test.ts`

**Interfaces:**
- Consumes Task 1 helpers.
- Produces `deriveStigmergicField()` and `verifyStigmergicFieldProjection()`.

- [ ] **Step 1: Add typed test helpers**

```ts
import type {
  FieldSourceEvent,
  StigmergicProjectionRequest,
} from "../src/stigmergic-field.js";

const adapter = { id: "band-runtime/stigmergic-adapter", version: "0.1" };
const policyVersion = "band-runtime-field-policy/v0.1";

function source(eventId: string, sequence: number, scope: string = scopeId): FieldSourceEvent {
  return { eventId, scopeId: scope, sequence };
}

function request(
  sourceEvents: FieldSourceEvent[],
  traces: ReturnType<typeof addressFieldTrace>[],
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
```

- [ ] **Step 2: Write failing derivation tests**

Cover all of these cases with explicit assertions:

1. reversed source/trace input arrays produce deep-equal projections and fingerprint;
2. two active contributors to one cell sum correctly and remain individually attributable;
3. inhibition and attention on one subject produce two cells rather than erasing one another;
4. missing source -> `MISSING_SOURCE_EVENT`;
5. mismatched source sequence -> `SOURCE_SEQUENCE_MISMATCH`;
6. cross-scope source/trace -> `SCOPE_MISMATCH`;
7. future trace -> `TRACE_FROM_FUTURE`;
8. mutated addressed trace body with stale hash -> `TRACE_IDENTITY_MISMATCH`;
9. unsupported schema -> `UNSUPPORTED_SCHEMA_VERSION`;
10. empty adapter id/version -> `INVALID_ADAPTER_IDENTITY`;
11. empty policy version -> `INVALID_POLICY_VERSION`;
12. omitted trace produces no cell even when its source envelope exists;
13. changing adapter version changes fingerprint;
14. changing policy version changes fingerprint;
15. canonical cell/contributor order matches the frozen sort rules.

Use `assert.throws` predicates against `StigmergicFieldError.code`, not only message regexes, for field-module errors.

- [ ] **Step 3: Run and confirm failure**

```bash
node --test --import tsx test/stigmergic-field.test.ts
```

Expected: FAIL because derivation is not implemented.

- [ ] **Step 4: Implement request validation and source map**

Inside `deriveStigmergicField()`:

- require exact schema;
- require positive-safe `throughSequence`;
- require non-empty `scopeId`, policy, adapter id/version;
- every source envelope must have non-empty id, same request scope, positive-safe sequence;
- repeated identical source envelope is idempotent;
- same event id with different scope/sequence is `SOURCE_EVENT_ID_CONFLICT`.

- [ ] **Step 5: Implement trace validation/binding and deduplication**

For every addressed trace:

- re-run trace validation;
- recompute `addressJson(trace.value).hash` and compare to declared hash;
- resolve source id;
- require same scope and exact source sequence;
- reject source sequence after causal cut;
- deduplicate identical trace hashes.

A request with source envelopes after the cut is allowed if no requested trace from those future envelopes is present. Only requested traces may influence the projection.

- [ ] **Step 6: Implement decay, aggregation, attribution, and canonical order**

Call `decayedMagnitude()` and map helper errors to typed `StigmergicFieldError` codes. Omit zero contributions. Sum with `checkedFieldAdd()`.

Sort:

```ts
contributions.sort((left, right) =>
  left.sourceSequence - right.sourceSequence
  || left.sourceEventId.localeCompare(right.sourceEventId)
  || left.traceHash.localeCompare(right.traceHash));

cells.sort((left, right) =>
  left.subjectRef.localeCompare(right.subjectRef)
  || left.channel.localeCompare(right.channel));
```

Do not use insertion order as semantics.

- [ ] **Step 7: Implement fingerprint and verifier**

Build the projection body with `authority: "none"`; compute `fingerprint = addressJson(body).hash`.

Verifier:

```ts
export function verifyStigmergicFieldProjection(
  projection: StigmergicFieldProjection,
): void {
  const { fingerprint, ...body } = projection;
  const expected = addressJson(body).hash;
  if (expected !== fingerprint) {
    throw new StigmergicFieldError(
      "FINGERPRINT_MISMATCH",
      `expected ${expected}, received ${fingerprint}`,
    );
  }
}
```

Add a test that mutates one cell total while retaining the old fingerprint and expects `FINGERPRINT_MISMATCH`.

- [ ] **Step 8: Run focused tests and strict typecheck**

```bash
node --test --import tsx test/stigmergic-field.test.ts
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/stigmergic-field.ts test/stigmergic-field.test.ts
git commit -m "feat: derive deterministic stigmergic projections"
```

---

### Task 3: Canonical linked-vertical fixture with explicit per-cut evidence membership

**Files:**
- Create `fixtures/stigmergic-field-v0.1.json`
- Modify `test/stigmergic-field.test.ts`

**Interfaces:**
- Consumes Task 2 engine.
- Produces the exact cross-repository fixture and its raw-byte content address.

**Fixture types:**

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

- [ ] **Step 1: Write the failing fixture replay test**

Load JSON with `readFile(new URL("../fixtures/stigmergic-field-v0.1.json", import.meta.url), "utf8")`.

Build source and trace maps. For each case, explicitly assert every referenced id/hash exists before constructing arrays. Call `deriveStigmergicField()` with only that case's membership and assert deep equality with `expectedProjection`; also call `verifyStigmergicFieldProjection()`.

- [ ] **Step 2: Confirm `ENOENT` failure**

```bash
node --test --import tsx test/stigmergic-field.test.ts
```

Expected: fixture test fails because the file is absent.

- [ ] **Step 3: Generate the fixture from the exact generic source sequence**

Use scope `session-linked-vertical`, policy `band-runtime-field-policy/v0.1`, adapter `{ "id": "band-runtime/stigmergic-adapter", "version": "0.1" }`.

Source ids/sequences:

```text
1  event-1-session-opened
2  event-2-participant-a
3  event-3-participant-b
4  event-4-participant-c
5  event-5-propose-x
6  event-6-propose-y
7  event-7-c-rings-y
8  event-8-b-rings-x
9  event-9-c-rings-x
10 event-10-a-rings-x
11 event-11-reject-x
12 event-12-b-rings-y
13 event-13-c-no-x
14 event-14-b-rings-y-again
```

Trace bodies:

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

Generate cases for cuts `10`, `11`, `12`, and `14`. For each cut, membership is exactly:

```ts
const caseSources = sourceEvents.filter((event) => event.sequence <= throughSequence);
const caseTraces = traces.filter((item) => item.value.sourceSequence <= throughSequence);
```

Store the case's source ids, trace hashes, and derived expected projection. Write two-space JSON with trailing newline. Do not commit the one-off generator.

- [ ] **Step 4: Add explicit future-evidence rejection test**

Take the cut-10 request, add the addressed `event-11-reject-x` inhibition trace, and assert `TRACE_FROM_FUTURE`.

- [ ] **Step 5: Add explicit scope-gap/non-leak test**

Derive the same visible request twice: once with only its same-scope source pool, once with an unrelated other-scope source envelope omitted entirely from the request. Assert identical projection. Then show that attempting to include the other-scope envelope in the same request is rejected with `SCOPE_MISMATCH`. This demonstrates that unrelated scope activity cannot alter visible sequence or fingerprint.

- [ ] **Step 6: Run full verification**

```bash
npm run check
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add fixtures/stigmergic-field-v0.1.json test/stigmergic-field.test.ts
git commit -m "test: freeze stigmergic field v0.1 fixture"
```

---

### Task 4: Final audit and downstream handoff

**Files:**
- Review `src/stigmergic-field.ts`
- Review `src/stigmergic-field-arithmetic.ts`
- Review `test/stigmergic-field.test.ts`
- Review `fixtures/stigmergic-field-v0.1.json`
- Compare with `docs/superpowers/specs/2026-08-10-stigmergic-field-v0.1-design.md`

**Interfaces:**
- Consumes Tasks 1-3.
- Produces verified implementation + exact fixture raw-byte SHA-256 for Band Runtime pinning.

- [ ] **Step 1: Search forbidden shortcuts**

```bash
grep -R "Date.now\|Math.random\|timestamp\|scheduler\|assignment" src/stigmergic-field.ts src/stigmergic-field-arithmetic.ts fixtures/stigmergic-field-v0.1.json || true
```

Expected: no semantic dependency on any match.

- [ ] **Step 2: Confirm ontology files are untouched**

```bash
git diff main...HEAD --name-only
```

Expected implementation paths are the two new source files, one test file, one fixture, and planning documentation only.

- [ ] **Step 3: Clean verification**

```bash
npm ci
npm run check
```

Expected: PASS.

- [ ] **Step 4: Compute exact fixture raw-byte SHA-256**

```bash
node --import tsx -e 'import { readFileSync } from "node:fs"; import { sha256 } from "./src/residual.ts"; console.log(sha256(readFileSync("fixtures/stigmergic-field-v0.1.json")))'
```

Record the exact emitted `sha256:` value in the TranchNode implementation PR and Band Runtime execution notes.

- [ ] **Step 5: Commit only if audit corrections were required**

If a correction was needed, rerun `npm run check` and commit one focused fix. Otherwise create no empty commit.
