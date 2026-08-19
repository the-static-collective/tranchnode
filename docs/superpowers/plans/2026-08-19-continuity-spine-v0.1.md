# Continuity Spine v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic, machine-readable Continuity Spine evaluator that proves one real TranchNode transformation can preserve invariants, transfer responsibility through an overlap stage, require witness before shedding, and keep a proposed future from impersonating constituted reality.

**Architecture:** Add one pure `src/continuity-spine.ts` module with a strict v0.1 manifest validator and transition evaluator. The manifest describes origin, present, proposal-only attractor, explicit stage order, invariants, stages, and transfers; the evaluator compares one source/destination stage pair, derives what would be shed from the stage delta, checks active invariant carrier requirements, and admits a transfer only when every declared witness id is supplied. One pinned JSON fixture models the landed Intent Stroke v0.1 → v0.2 transition from PR #54; tests exercise the real overlap/transfer shape and fail-closed negative variants without network, filesystem mutation, clocks, randomness, or execution authority.

**Tech Stack:** TypeScript 5.8, Node.js built-in test runner, JSON fixture files, existing `npm run check` (`tsc --noEmit && node --test --import tsx test/**/*.test.ts`).

**Spec:** `docs/superpowers/specs/2026-08-19-continuity-spine-v0.1-design.md`

## Global Constraints

- Manifest schema is exactly `tranchnode/continuity-spine/v0.1`.
- Future/attractor state is proposal authority only and must never acquire observed, witnessed, historical, or constituted status merely by being desired.
- Stage ordering is explicit; every stage id appears exactly once and the evaluator refuses backward transitions.
- The overlap stage is constitutive: v0.1 remains carried while v0.2 takes on the new caller-boundary responsibility.
- Responsibility transfers before any dependent scaffold may be shed.
- Transfer completion requires supplied witness evidence; the manifest cannot self-witness.
- Active invariants must survive every stage boundary through which they apply.
- v0.1 behavior remains compatible in the Intent Stroke specimen.
- Canonical addressing remains inside TranchNode in the Intent Stroke specimen.
- Canonical decoder semantics remain unchanged in the Intent Stroke specimen.
- Decoder authority remains exactly `none` in the Intent Stroke specimen.
- Exact decoder collisions remain unresolved in the Intent Stroke specimen.
- Raw pointer transport does not grant traversal or caller authority.
- `PROJECT_STATUS.json` remains a projection of what is proven now and is not modified into a roadmap.
- No autonomous planning, task generation, CI/CD orchestration, automatic deletion, multi-repository mutation, generalized temporal logic, scheduling, shortest-path optimization, future prediction, ontology expansion, or external API call belongs in v0.1.
- Evaluator input objects are not mutated.
- Repeated evaluation of identical input produces structurally identical output.

## File Structure

- Create `src/continuity-spine.ts` — public v0.1 types, strict validator, transition evaluator, and stable error/reason codes.
- Create `fixtures/continuity-spine/intent-stroke-v01-to-v02.json` — pinned real calibration manifest for PR #54.
- Create `test/continuity-spine.test.ts` — validator, evaluator, negative calibration, determinism, and immutability tests.
- Do not modify `src/intent-stroke.ts`, `scripts/intent-stroke-stdio.ts`, `PROJECT_STATUS.json`, `ONTOLOGY.md`, or existing benchmark/evaluator modules for convenience.

---

### Task 1: Lock the v0.1 manifest contract and fail-closed validator

**Files:**
- Create: `src/continuity-spine.ts`
- Create: `test/continuity-spine.test.ts`

**Interfaces:**
- Consumes: no runtime dependency beyond ordinary TypeScript/JavaScript values.
- Produces: `ContinuitySpineError`, `ContinuitySpineManifestV01`, `ContinuityStage`, `ContinuityInvariant`, `ContinuityTransfer`, `validateContinuitySpineManifest(value: unknown): ContinuitySpineManifestV01`.

Use these public shapes as the implementation target:

```ts
export type StageStatus = "historical" | "constituted" | "proposal";

export interface ContinuityStateRef {
  id: string;
  status: "historical" | "constituted";
  sourceRef: string;
  observedCommit?: string;
}

export interface ContinuityAttractorRef {
  id: string;
  status: "proposal";
  purpose: string;
  desiredCapabilities: string[];
  nonClaims: string[];
}

export interface ContinuityInvariant {
  id: string;
  description: string;
  sourceRef: string;
  appliesThrough: "all" | string[];
  requiredCarries: string[];
}

export interface ContinuityStage {
  id: string;
  status: StageStatus;
  carries: string[];
  dependsOn: string[];
  scaffolds: string[];
  entryConditions: string[];
  exitConditions: string[];
}

export interface ContinuityTransfer {
  id: string;
  responsibilityId: string;
  fromCarrier: string;
  toCarrier: string;
  sourceStageId: string;
  destinationStageId: string;
  requiredWitnessIds: string[];
  permitsShedding: string[];
}

export interface ContinuitySpineManifestV01 {
  schema: "tranchnode/continuity-spine/v0.1";
  id: string;
  project: string;
  origin: ContinuityStateRef;
  present: ContinuityStateRef;
  attractor: ContinuityAttractorRef;
  stageOrder: string[];
  invariants: ContinuityInvariant[];
  stages: ContinuityStage[];
  transfers: ContinuityTransfer[];
}
```

`requiredCarries` is the minimal executable interpretation of the approved spec's invariant law: an invariant remains declarative/provenance-bearing, while the evaluator can mechanically detect that a destination stage dropped a carrier token the invariant says must survive. It does not make the manifest evidence that the invariant is true.

- [ ] **Step 1: Write the validator RED tests.** Start `test/continuity-spine.test.ts` with:

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  ContinuitySpineError,
  validateContinuitySpineManifest,
  type ContinuitySpineManifestV01,
} from "../src/continuity-spine.js";

const FIXTURE_PATH = "fixtures/continuity-spine/intent-stroke-v01-to-v02.json";

async function rawFixture(): Promise<any> {
  return JSON.parse(await readFile(FIXTURE_PATH, "utf8"));
}

test("continuity spine rejects unsupported schema versions", () => {
  assert.throws(
    () => validateContinuitySpineManifest({ schema: "tranchnode/continuity-spine/v9" }),
    (error: unknown) => error instanceof ContinuitySpineError
      && error.code === "UNSUPPORTED_SCHEMA_VERSION",
  );
});

test("continuity spine rejects an attractor that impersonates constituted reality", async () => {
  const candidate = await rawFixture();
  candidate.attractor.status = "constituted";
  assert.throws(
    () => validateContinuitySpineManifest(candidate),
    (error: unknown) => error instanceof ContinuitySpineError
      && error.code === "ATTRACTOR_MUST_BE_PROPOSAL",
  );
});

test("continuity spine rejects duplicate and incomplete stage order", async () => {
  const duplicate = await rawFixture();
  duplicate.stageOrder = [duplicate.stageOrder[0], duplicate.stageOrder[0]];
  assert.throws(
    () => validateContinuitySpineManifest(duplicate),
    (error: unknown) => error instanceof ContinuitySpineError
      && error.code === "INVALID_STAGE_ORDER",
  );

  const omitted = await rawFixture();
  omitted.stageOrder = omitted.stageOrder.slice(0, -1);
  assert.throws(
    () => validateContinuitySpineManifest(omitted),
    (error: unknown) => error instanceof ContinuitySpineError
      && error.code === "INVALID_STAGE_ORDER",
  );
});
```

- [ ] **Step 2: Run the focused test and preserve RED evidence.**

Run:

```bash
node --test --import tsx test/continuity-spine.test.ts
```

Expected: FAIL because `../src/continuity-spine.js` does not exist yet (the fixture may also be absent until Task 3; for this RED run, keep the unsupported-schema test first so the missing module is the primary failure).

- [ ] **Step 3: Implement strict scalar/array/reference validation in `src/continuity-spine.ts`.** Define:

```ts
export class ContinuitySpineError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "ContinuitySpineError";
  }
}
```

Add private helpers for `isRecord`, non-empty strings, unique string arrays, and duplicate id detection. `validateContinuitySpineManifest` must:

1. reject any schema other than `tranchnode/continuity-spine/v0.1` with `UNSUPPORTED_SCHEMA_VERSION`;
2. require non-empty `id`, `project`, `origin.id/sourceRef`, `present.id/sourceRef`, and attractor fields;
3. require `origin.status` and `present.status` to be only `historical | constituted`;
4. require `attractor.status === "proposal"`, otherwise `ATTRACTOR_MUST_BE_PROPOSAL`;
5. require unique ids inside stages, invariants, and transfers;
6. require `stageOrder` to contain every stage id exactly once and no unknown id, otherwise `INVALID_STAGE_ORDER`;
7. require every invariant `appliesThrough` stage id to exist;
8. require every transfer source/destination stage to exist and source order index `<` destination order index;
9. require every string-list field to contain only unique non-empty strings;
10. return a fresh normalized object (clone arrays/records) rather than the caller's object.

Use stable codes: `INVALID_MANIFEST`, `DUPLICATE_ID`, `BROKEN_STAGE_REFERENCE`, `INVALID_STAGE_ORDER`, `ATTRACTOR_MUST_BE_PROPOSAL`, `UNSUPPORTED_SCHEMA_VERSION`.

- [ ] **Step 4: Add pure in-memory valid-manifest coverage so Task 1 does not depend on the Task 3 fixture.** Add a `minimalManifest()` test helper with two stages, one invariant, and one transfer, then assert `validateContinuitySpineManifest(minimalManifest())` deep-equals but is not object-identical to the input.

- [ ] **Step 5: Run the focused validator tests.**

```bash
node --test --import tsx test/continuity-spine.test.ts
```

Expected: validator-only tests PASS; fixture-dependent tests remain skipped or are not added until Task 3.

- [ ] **Step 6: Run the type checker.**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 7: Commit the contract/validator slice.**

```bash
git add src/continuity-spine.ts test/continuity-spine.test.ts
git commit -m "feat: define Continuity Spine v0.1 manifest"
```

---

### Task 2: Implement the pure stage-transition evaluator

**Files:**
- Modify: `src/continuity-spine.ts`
- Modify: `test/continuity-spine.test.ts`

**Interfaces:**
- Consumes: validated `ContinuitySpineManifestV01`, source/destination stage ids, and supplied witness ids.
- Produces: `evaluateStageTransition(input: TransitionEvaluationInput): TransitionEvaluation`.

Add these public types:

```ts
export type TransitionDecision = "admissible" | "blocked" | "invalid";

export type TransitionFindingClass =
  | "proposal_only"
  | "blocked_invariant_loss"
  | "blocked_untransferred_responsibility"
  | "blocked_unwitnessed_transfer"
  | "blocked_premature_shedding"
  | "invalid_manifest";

export interface TransitionFinding {
  class: TransitionFindingClass;
  subjectId: string;
  reason: string;
}

export interface TransitionEvaluationInput {
  spine: ContinuitySpineManifestV01;
  fromStageId: string;
  toStageId: string;
  suppliedWitnesses: string[];
}

export interface TransitionEvaluation {
  schema: "tranchnode/continuity-spine-evaluation/v0.1";
  spineId: string;
  fromStageId: string;
  toStageId: string;
  decision: TransitionDecision;
  shed: string[];
  completedTransferIds: string[];
  findings: TransitionFinding[];
}
```

- [ ] **Step 1: Write RED tests for the governing laws.** Use `minimalManifest()` and add:

```ts
test("proposal destination can be structurally admissible without becoming constituted", () => {
  const spine = minimalManifest();
  spine.stages[1].status = "proposal";
  const result = evaluateStageTransition({
    spine,
    fromStageId: "stage-a",
    toStageId: "stage-b",
    suppliedWitnesses: ["witness:transfer"],
  });
  assert.equal(result.decision, "admissible");
  assert.ok(result.findings.some((finding) => finding.class === "proposal_only"));
});

test("missing transfer witness blocks a shed permitted by that transfer", () => {
  const result = evaluateStageTransition({
    spine: minimalManifest(),
    fromStageId: "stage-a",
    toStageId: "stage-b",
    suppliedWitnesses: [],
  });
  assert.equal(result.decision, "blocked");
  assert.ok(result.findings.some((finding) => finding.class === "blocked_unwitnessed_transfer"));
  assert.ok(result.findings.some((finding) => finding.class === "blocked_premature_shedding"));
});

test("active invariant loss blocks the transition", () => {
  const spine = minimalManifest();
  spine.stages[1].carries = spine.stages[1].carries.filter((id) => id !== "decoder-authority:none");
  const result = evaluateStageTransition({
    spine,
    fromStageId: "stage-a",
    toStageId: "stage-b",
    suppliedWitnesses: ["witness:transfer"],
  });
  assert.equal(result.decision, "blocked");
  assert.ok(result.findings.some((finding) => finding.class === "blocked_invariant_loss"));
});

test("backward transition is invalid rather than merely blocked", () => {
  const result = evaluateStageTransition({
    spine: minimalManifest(),
    fromStageId: "stage-b",
    toStageId: "stage-a",
    suppliedWitnesses: [],
  });
  assert.equal(result.decision, "invalid");
  assert.ok(result.findings.some((finding) => finding.class === "invalid_manifest"));
});
```

- [ ] **Step 2: Run focused tests and preserve RED evidence.**

```bash
node --test --import tsx test/continuity-spine.test.ts
```

Expected: FAIL because `evaluateStageTransition` is not implemented/exported.

- [ ] **Step 3: Implement stage delta derivation.** In `evaluateStageTransition`, validate/normalize `input.spine` first, resolve source/destination indexes from `stageOrder`, and return `decision: "invalid"` with `invalid_manifest` finding when either stage is unknown or source index is not strictly before destination index.

Derive shedding deterministically:

```ts
const sourceMaterial = new Set([
  ...from.carries,
  ...from.dependsOn,
  ...from.scaffolds,
]);
const destinationMaterial = new Set([
  ...to.carries,
  ...to.dependsOn,
  ...to.scaffolds,
]);
const shed = [...sourceMaterial]
  .filter((id) => !destinationMaterial.has(id))
  .sort();
```

- [ ] **Step 4: Implement active invariant checks.** An invariant applies to the destination when `appliesThrough === "all"` or its list contains `to.id`. Every `requiredCarries` token must exist in `to.carries`. Emit one stable `blocked_invariant_loss` finding per missing `(invariant, requiredCarry)` pair with reason `ACTIVE_INVARIANT_CARRIER_MISSING`.

- [ ] **Step 5: Implement transfer/witness evaluation.** A transfer is relevant when `sourceStageId === from.id && destinationStageId === to.id`. It is complete only when every `requiredWitnessIds` entry is present in a deduplicated supplied-witness set. Sort completed transfer ids.

For each relevant incomplete transfer, emit `blocked_unwitnessed_transfer` with reason `REQUIRED_TRANSFER_WITNESS_MISSING`.

If the supplied witness list contains an id not referenced by any transfer in the manifest, fail closed with `decision: "invalid"` and `invalid_manifest` / `UNKNOWN_SUPPLIED_WITNESS` rather than accepting unverifiable evidence labels.

- [ ] **Step 6: Implement transfer-before-shedding and untransferred-responsibility checks.**

For every `shed` id:

1. find relevant transfers whose `permitsShedding` contains that id;
2. if none exist and the id came from `from.carries`, emit `blocked_untransferred_responsibility` / `RESPONSIBILITY_DROPPED_WITHOUT_TRANSFER`;
3. if one or more exist but none are complete, emit `blocked_premature_shedding` / `SHED_BEFORE_TRANSFER_WITNESS`;
4. if at least one permitting transfer is complete, the shed is permitted for v0.1.

A scaffold/dependency with no permitting transfer also emits `blocked_premature_shedding` / `SHED_WITHOUT_TRANSFER_PERMISSION`; it is never silently treated as disposable.

- [ ] **Step 7: Implement decision precedence and stable output ordering.**

- any structural/request invalidity => `invalid`;
- otherwise any finding whose class starts with `blocked_` => `blocked`;
- otherwise => `admissible`;
- `proposal_only` is informational and must not change an otherwise admissible decision;
- sort findings by `class`, then `subjectId`, then `reason`;
- sort `shed` and `completedTransferIds` lexicographically.

- [ ] **Step 8: Run focused tests until green.**

```bash
node --test --import tsx test/continuity-spine.test.ts
```

Expected: PASS for all in-memory validator/evaluator tests.

- [ ] **Step 9: Run `npm run check`.**

```bash
npm run check
```

Expected: the entire existing TranchNode suite plus Continuity Spine tests PASS.

- [ ] **Step 10: Commit the evaluator slice.**

```bash
git add src/continuity-spine.ts test/continuity-spine.test.ts
git commit -m "feat: evaluate staged continuity transitions"
```

---

### Task 3: Pin the real Intent Stroke v0.1 → v0.2 overlap specimen

**Files:**
- Create: `fixtures/continuity-spine/intent-stroke-v01-to-v02.json`
- Modify: `test/continuity-spine.test.ts`

**Interfaces:**
- Consumes: landed PR #54 facts already present on `main`.
- Produces: one project-owned calibration manifest proving overlap, responsibility transfer, witness-gated shedding, and preserved v0.1 compatibility.

- [ ] **Step 1: Create the fixture with the exact real transition anchors.** Use this structure and exact commit/PR identities:

```json
{
  "schema": "tranchnode/continuity-spine/v0.1",
  "id": "intent-stroke-v01-to-v02",
  "project": "TranchNode",
  "origin": {
    "id": "intent-stroke-stdio-v0.1",
    "status": "historical",
    "sourceRef": "pull-request:50",
    "observedCommit": "a3dc7fa5155df93641f4f116eac1464b10342849"
  },
  "present": {
    "id": "intent-stroke-stdio-v0.2-overlap",
    "status": "constituted",
    "sourceRef": "pull-request:54",
    "observedCommit": "bf886c0b4938a1444a79afb7a7b384e91b5d5197"
  },
  "attractor": {
    "id": "raw-point-callers-need-no-canonical-layout-ref",
    "status": "proposal",
    "purpose": "Let v0.2 callers supply raw points plus declared layout while TranchNode owns canonical layout binding.",
    "desiredCapabilities": ["caller-may-omit-fieldLayoutRef"],
    "nonClaims": ["future state is not constituted by declaration", "raw pointer transport grants no traversal authority"]
  },
  "stageOrder": ["v0.1-caller-bound", "v0.1-v0.2-overlap"],
  "invariants": [
    {
      "id": "v0.1-compatibility",
      "description": "The v0.1 stdio request remains supported during the overlap.",
      "sourceRef": "pull-request:54",
      "appliesThrough": "all",
      "requiredCarries": ["interface:intent-stroke-stdio-v0.1"]
    },
    {
      "id": "decoder-authority-none",
      "description": "Intent Stroke decoding remains non-authoritative.",
      "sourceRef": "pull-request:54",
      "appliesThrough": "all",
      "requiredCarries": ["decoder-authority:none"]
    },
    {
      "id": "collision-remains-unresolved",
      "description": "Equal-cost decoder collisions are preserved rather than silently selected.",
      "sourceRef": "pull-request:54",
      "appliesThrough": "all",
      "requiredCarries": ["collision-policy:unresolved"]
    },
    {
      "id": "raw-transport-no-traversal-authority",
      "description": "Raw point transport does not grant traversal or caller authority.",
      "sourceRef": "pull-request:54",
      "appliesThrough": "all",
      "requiredCarries": ["transport-authority:none"]
    },
    {
      "id": "canonical-addressing-inside-tranchnode",
      "description": "Canonical layout addressing for v0.2 is performed inside TranchNode.",
      "sourceRef": "pull-request:54",
      "appliesThrough": ["v0.1-v0.2-overlap"],
      "requiredCarries": ["layout-binding:tranchnode"]
    }
  ],
  "stages": [
    {
      "id": "v0.1-caller-bound",
      "status": "historical",
      "carries": ["interface:intent-stroke-stdio-v0.1", "decoder-authority:none", "collision-policy:unresolved", "transport-authority:none", "responsibility:canonical-layout-binding"],
      "dependsOn": ["dependency:caller-constructs-fieldLayoutRef"],
      "scaffolds": ["dependency:caller-constructs-fieldLayoutRef"],
      "entryConditions": [],
      "exitConditions": ["transfer:canonical-layout-binding-to-tranchnode"]
    },
    {
      "id": "v0.1-v0.2-overlap",
      "status": "constituted",
      "carries": ["interface:intent-stroke-stdio-v0.1", "interface:intent-stroke-stdio-v0.2", "decoder-authority:none", "collision-policy:unresolved", "transport-authority:none", "responsibility:canonical-layout-binding", "layout-binding:tranchnode"],
      "dependsOn": [],
      "scaffolds": [],
      "entryConditions": ["witness:pr54-green", "witness:pr54-boundary-review"],
      "exitConditions": []
    }
  ],
  "transfers": [
    {
      "id": "transfer:canonical-layout-binding-to-tranchnode",
      "responsibilityId": "responsibility:canonical-layout-binding",
      "fromCarrier": "v0.2-caller-boundary",
      "toCarrier": "tranchnode",
      "sourceStageId": "v0.1-caller-bound",
      "destinationStageId": "v0.1-v0.2-overlap",
      "requiredWitnessIds": ["witness:pr54-green", "witness:pr54-boundary-review"],
      "permitsShedding": ["dependency:caller-constructs-fieldLayoutRef"]
    }
  ]
}
```

- [ ] **Step 2: Add the positive calibration test.**

```ts
test("Intent Stroke v0.1 -> v0.2 proves overlap, witnessed transfer, and lawful shedding", async () => {
  const spine = validateContinuitySpineManifest(await rawFixture());
  const result = evaluateStageTransition({
    spine,
    fromStageId: "v0.1-caller-bound",
    toStageId: "v0.1-v0.2-overlap",
    suppliedWitnesses: ["witness:pr54-green", "witness:pr54-boundary-review"],
  });

  assert.equal(result.decision, "admissible");
  assert.deepEqual(result.shed, ["dependency:caller-constructs-fieldLayoutRef"]);
  assert.deepEqual(result.completedTransferIds, ["transfer:canonical-layout-binding-to-tranchnode"]);
  assert.equal(result.findings.some((finding) => finding.class.startsWith("blocked_")), false);
});
```

- [ ] **Step 3: Add the four required negative calibration tests.**

1. same transition with no supplied witnesses => `blocked_unwitnessed_transfer` and `blocked_premature_shedding`;
2. remove `decoder-authority:none` from destination carries => `blocked_invariant_loss`;
3. set attractor status to `constituted` before validation => `ATTRACTOR_MUST_BE_PROPOSAL` (surfaced as invalid manifest at evaluator boundary if tested through evaluation);
4. remove `interface:intent-stroke-stdio-v0.1` from destination carries => `blocked_invariant_loss`.

- [ ] **Step 4: Add the untransferred responsibility refusal.** Clone the fixture, remove `responsibility:canonical-layout-binding` from destination carries, and remove/alter the transfer so no relevant transfer covers that responsibility. Assert `blocked_untransferred_responsibility` with reason `RESPONSIBILITY_DROPPED_WITHOUT_TRANSFER`.

- [ ] **Step 5: Run focused tests.**

```bash
node --test --import tsx test/continuity-spine.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run full repository verification.**

```bash
npm run check
```

Expected: PASS with all prior tests unchanged plus the new Continuity Spine suite.

- [ ] **Step 7: Commit the real specimen.**

```bash
git add fixtures/continuity-spine/intent-stroke-v01-to-v02.json test/continuity-spine.test.ts
git commit -m "test: pin Continuity Spine Intent Stroke specimen"
```

---

### Task 4: Prove determinism, immutability, and scope boundaries before PR completion

**Files:**
- Modify: `test/continuity-spine.test.ts`
- Review only: `src/continuity-spine.ts`
- Review only: `PROJECT_STATUS.json`
- Review only: `ONTOLOGY.md`

**Interfaces:**
- Consumes: final v0.1 evaluator and fixture.
- Produces: exact-head verification evidence suitable for PR review/Riqor completion.

- [ ] **Step 1: Add input non-mutation coverage.** Deep-clone the fixture before evaluation, run `evaluateStageTransition`, then `assert.deepEqual(originalInput, afterInput)` for both the spine and supplied witness array.

- [ ] **Step 2: Add repeated-evaluation stability coverage.** Evaluate the exact same normalized fixture twice and assert `assert.deepEqual(first, second)`.

- [ ] **Step 3: Add supplied witness permutation stability.** Evaluate once with `["witness:pr54-green", "witness:pr54-boundary-review"]` and once reversed; assert deep equality.

- [ ] **Step 4: Add unknown witness fail-closed coverage.** Supply `witness:not-declared`; assert `decision === "invalid"` and an `invalid_manifest` finding with reason `UNKNOWN_SUPPLIED_WITNESS`.

- [ ] **Step 5: Run focused test, then full check.**

```bash
node --test --import tsx test/continuity-spine.test.ts
npm run check
```

Expected: both PASS.

- [ ] **Step 6: Review the final diff for forbidden widening.** Confirm all of the following are true:

```text
PROJECT_STATUS.json unchanged
ONTOLOGY.md unchanged
src/intent-stroke.ts unchanged
scripts/intent-stroke-stdio.ts unchanged
no network/API code
no file mutation code
no scheduler/orchestrator
no automatic deletion
no future-state promotion
no cross-repository schema propagation
```

- [ ] **Step 7: Commit the verification hardening.**

```bash
git add test/continuity-spine.test.ts
git commit -m "test: harden Continuity Spine determinism boundaries"
```

- [ ] **Step 8: Capture exact-head completion evidence.** Record the final branch SHA and `npm run check` result in the implementation PR body. Review the PR on that exact head for authority creep, stage-order loopholes, silent witness acceptance, and any way an attractor can become evidence through the evaluator.

## Plan Self-Review

- Spec coverage: origin/present/attractor distinction, proposal-only future, explicit stage ordering, invariant survival, overlap, transfer, witness gating, lawful shedding, premature-shed refusal, untransferred responsibility refusal, compatibility preservation, deterministic output, immutability, and non-goals all map to concrete tasks above.
- Placeholder scan: no TBD/TODO/"implement later" steps remain.
- Type consistency: manifest, stage, invariant, transfer, evaluator input/output, finding classes, and reason codes are defined once and used consistently across Tasks 1–4.
- Scope check: one local TranchNode fixture and one pure evaluator only; cross-project adoption and live `PROJECT_STATUS` integration remain deferred.
