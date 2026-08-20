# Continuity Boundary Witness v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one deterministic, addressed, read-only TranchNode witness that characterizes an already-admissible Continuity Spine transition as preserved / differentiated / lost / unresolved without granting authority or changing transition semantics.

**Architecture:** Keep `Continuity Spine v0.1` authoritative for transition evaluation. A new pure module calls the existing evaluator, refuses blocked/invalid/proposal-destination cases, derives boundary classes from exact stage material plus explicit unresolved refs, and addresses the inert result with the existing `addressJson(...)` path. No Project0 runtime dependency is introduced.

**Tech Stack:** TypeScript, Node 22, `node:test`, existing `tsx` test harness, existing TranchNode canonical addressing.

**Spec:** `docs/superpowers/specs/2026-08-20-continuity-boundary-witness-v0-design.md`

## Global Constraints

- Reuse `evaluateStageTransition(...)` and `validateContinuitySpineManifest(...)`; do not duplicate transition law.
- Reuse `addressJson(...)`; do not introduce another canonicalizer or identity grammar.
- Destination `status: "proposal"` is never publishable as an occurred boundary witness.
- `lost` is exactly the admitted evaluator `shed` set; callers cannot supply it.
- `unresolved` is explicit validated input; never infer semantics from names or prose.
- Witness output carries `authority: "none"` and `occurrenceClaim: "transition-witness-only"`.
- Do not modify `src/continuity-spine.ts`, ontology files, package dependencies, network/UI/runtime surfaces, or Project0.

---

### Task 1: Pin the boundary-witness contract RED

**Files:**
- Create: `test/continuity-boundary-witness.test.ts`

**Interfaces:**
- Consumes: existing `ContinuitySpineManifestV01` fixture and evaluator behavior.
- Produces: the exact expected public API `deriveContinuityBoundaryWitness(...)` and `ContinuityBoundaryWitnessError` for Task 2.

- [ ] **Step 1: Add the failing contract test**

Create `test/continuity-boundary-witness.test.ts` with the complete test suite below. The production module intentionally does not exist yet.

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { ContinuitySpineManifestV01 } from "../src/continuity-spine.js";
import {
  ContinuityBoundaryWitnessError,
  deriveContinuityBoundaryWitness,
} from "../src/continuity-boundary-witness.js";

const fixture = JSON.parse(
  readFileSync(
    new URL("../fixtures/continuity-spine/intent-stroke-v01-to-v02.json", import.meta.url),
    "utf8",
  ),
) as ContinuitySpineManifestV01;

const suppliedWitnesses = [
  "witness:pr54-green",
  "witness:pr54-boundary-review",
];

function derive(overrides: Partial<Parameters<typeof deriveContinuityBoundaryWitness>[0]> = {}) {
  return deriveContinuityBoundaryWitness({
    spine: fixture,
    fromStageId: "v0.1-caller-bound",
    toStageId: "v0.1-v0.2-overlap",
    suppliedWitnesses,
    unresolvedRefs: ["collision-policy:unresolved"],
    ...overrides,
  });
}

test("real Intent Stroke boundary preserves local continuity distinctions", () => {
  const addressed = derive();

  assert.match(addressed.hash, /^sha256:[0-9a-f]{64}$/);
  assert.deepEqual(addressed.value, {
    schema: "tranchnode/continuity-boundary-witness/v0.1",
    spineId: "intent-stroke-v01-to-v02",
    fromStageId: "v0.1-caller-bound",
    toStageId: "v0.1-v0.2-overlap",
    originRef: "pull-request:50",
    presentRef: "pull-request:54",
    preserved: [
      "decoder-authority:none",
      "interface:intent-stroke-stdio-v0.1",
      "responsibility:canonical-layout-binding",
      "transport-authority:none",
    ],
    differentiated: [
      "interface:intent-stroke-stdio-v0.2",
      "layout-binding:tranchnode",
    ],
    lost: ["dependency:caller-constructs-fieldLayoutRef"],
    unresolved: ["collision-policy:unresolved"],
    completedTransferIds: ["transfer:canonical-layout-binding-to-tranchnode"],
    transitionWitnessRefs: [
      "witness:pr54-boundary-review",
      "witness:pr54-green",
    ],
    authority: "none",
    occurrenceClaim: "transition-witness-only",
  });
});

test("witness identity is deterministic across caller ordering", () => {
  const first = derive();
  const second = derive({
    suppliedWitnesses: [...suppliedWitnesses].reverse(),
    unresolvedRefs: ["collision-policy:unresolved"],
  });
  assert.deepEqual(second, first);
});

test("missing transfer witness refuses publication", () => {
  assert.throws(
    () => derive({ suppliedWitnesses: ["witness:pr54-green"] }),
    (error: unknown) => error instanceof ContinuityBoundaryWitnessError
      && error.code === "TRANSITION_NOT_ADMISSIBLE",
  );
});

test("proposal destination cannot be published as occurred boundary witness", () => {
  const proposalFixture: ContinuitySpineManifestV01 = {
    ...fixture,
    stages: fixture.stages.map((stage) => stage.id === "v0.1-v0.2-overlap"
      ? { ...stage, status: "proposal" }
      : stage),
  };

  assert.throws(
    () => derive({ spine: proposalFixture }),
    (error: unknown) => error instanceof ContinuityBoundaryWitnessError
      && error.code === "PROPOSAL_DESTINATION_NOT_WITNESSABLE",
  );
});

test("fabricated unresolved ref fails closed", () => {
  assert.throws(
    () => derive({ unresolvedRefs: ["not-present"] }),
    (error: unknown) => error instanceof ContinuityBoundaryWitnessError
      && error.code === "UNRESOLVED_REF_NOT_PRESENT",
  );
});

test("invalid unresolved inputs fail closed without string inference", () => {
  assert.throws(
    () => derive({ unresolvedRefs: ["collision-policy:unresolved", "collision-policy:unresolved"] }),
    (error: unknown) => error instanceof ContinuityBoundaryWitnessError
      && error.code === "INVALID_UNRESOLVED_REFS",
  );
});

test("derivation does not mutate the source fixture", () => {
  const before = JSON.stringify(fixture);
  derive();
  assert.equal(JSON.stringify(fixture), before);
});
```

- [ ] **Step 2: Open a draft PR so GitHub Actions executes the branch**

Create a draft PR from `agent/continuity-boundary-witness-v0` to `main`, referencing #29 and stating that this is a bounded partial proof rather than completion of the full boundary/bloom issue.

- [ ] **Step 3: Record the RED witness**

Expected `check` result:

```text
TS2307 / ERR_MODULE_NOT_FOUND: ../src/continuity-boundary-witness.js
```

Established tests should reach the new missing-module boundary normally.

- [ ] **Step 4: Commit state is already represented by the contents-API test commit**

Do not add production code before the RED Actions run is observed.

---

### Task 2: Implement the pure addressed witness GREEN

**Files:**
- Create: `src/continuity-boundary-witness.ts`
- Test: `test/continuity-boundary-witness.test.ts`

**Interfaces:**
- Consumes:
  - `validateContinuitySpineManifest(value: unknown): ContinuitySpineManifestV01`
  - `evaluateStageTransition(input): TransitionEvaluation`
  - `addressJson<T>(value: T): Addressed<T>`
- Produces:
  - `ContinuityBoundaryWitnessInput`
  - `ContinuityBoundaryWitnessV01`
  - `ContinuityBoundaryWitnessError`
  - `deriveContinuityBoundaryWitness(input): Addressed<ContinuityBoundaryWitnessV01>`

- [ ] **Step 1: Implement the exact module**

Create `src/continuity-boundary-witness.ts`:

```ts
import type { Addressed } from "./residual.js";
import { addressJson } from "./residual.js";
import type { ContinuitySpineManifestV01, ContinuityStage } from "./continuity-spine.js";
import {
  evaluateStageTransition,
  validateContinuitySpineManifest,
} from "./continuity-spine.js";

const WITNESS_SCHEMA = "tranchnode/continuity-boundary-witness/v0.1" as const;

export interface ContinuityBoundaryWitnessInput {
  spine: ContinuitySpineManifestV01;
  fromStageId: string;
  toStageId: string;
  suppliedWitnesses: string[];
  unresolvedRefs: string[];
}

export interface ContinuityBoundaryWitnessV01 {
  schema: typeof WITNESS_SCHEMA;
  spineId: string;
  fromStageId: string;
  toStageId: string;
  originRef: string;
  presentRef: string;
  preserved: string[];
  differentiated: string[];
  lost: string[];
  unresolved: string[];
  completedTransferIds: string[];
  transitionWitnessRefs: string[];
  authority: "none";
  occurrenceClaim: "transition-witness-only";
}

export type ContinuityBoundaryWitnessErrorCode =
  | "TRANSITION_NOT_ADMISSIBLE"
  | "PROPOSAL_DESTINATION_NOT_WITNESSABLE"
  | "INVALID_UNRESOLVED_REFS"
  | "UNRESOLVED_REF_NOT_PRESENT";

export class ContinuityBoundaryWitnessError extends Error {
  constructor(
    public readonly code: ContinuityBoundaryWitnessErrorCode,
    public readonly detail?: string,
  ) {
    super(detail === undefined ? code : `${code}: ${detail}`);
    this.name = "ContinuityBoundaryWitnessError";
  }
}

function stageMaterial(stage: ContinuityStage): Set<string> {
  return new Set([
    ...stage.carries,
    ...stage.dependsOn,
    ...stage.scaffolds,
  ]);
}

function normalizedUniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new ContinuityBoundaryWitnessError("INVALID_UNRESOLVED_REFS");
  }
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || item.trim().length === 0 || result.includes(item)) {
      throw new ContinuityBoundaryWitnessError("INVALID_UNRESOLVED_REFS");
    }
    result.push(item);
  }
  return result.sort();
}

export function deriveContinuityBoundaryWitness(
  input: ContinuityBoundaryWitnessInput,
): Addressed<ContinuityBoundaryWitnessV01> {
  const spine = validateContinuitySpineManifest(input.spine);
  const evaluation = evaluateStageTransition({
    spine,
    fromStageId: input.fromStageId,
    toStageId: input.toStageId,
    suppliedWitnesses: input.suppliedWitnesses,
  });

  if (evaluation.decision !== "admissible") {
    throw new ContinuityBoundaryWitnessError(
      "TRANSITION_NOT_ADMISSIBLE",
      evaluation.findings.map((finding) => finding.reason).join(",") || evaluation.decision,
    );
  }

  const from = spine.stages.find((stage) => stage.id === input.fromStageId);
  const to = spine.stages.find((stage) => stage.id === input.toStageId);
  if (from === undefined || to === undefined) {
    throw new ContinuityBoundaryWitnessError("TRANSITION_NOT_ADMISSIBLE", "UNKNOWN_STAGE");
  }
  if (to.status === "proposal") {
    throw new ContinuityBoundaryWitnessError("PROPOSAL_DESTINATION_NOT_WITNESSABLE");
  }

  const source = stageMaterial(from);
  const destination = stageMaterial(to);
  const unresolved = normalizedUniqueStrings(input.unresolvedRefs);
  for (const ref of unresolved) {
    if (!destination.has(ref)) {
      throw new ContinuityBoundaryWitnessError("UNRESOLVED_REF_NOT_PRESENT", ref);
    }
  }
  const unresolvedSet = new Set(unresolved);

  const preserved = [...source]
    .filter((ref) => destination.has(ref) && !unresolvedSet.has(ref))
    .sort();
  const differentiated = [...destination]
    .filter((ref) => !source.has(ref) && !unresolvedSet.has(ref))
    .sort();

  const value: ContinuityBoundaryWitnessV01 = {
    schema: WITNESS_SCHEMA,
    spineId: spine.id,
    fromStageId: from.id,
    toStageId: to.id,
    originRef: spine.origin.sourceRef,
    presentRef: spine.present.sourceRef,
    preserved,
    differentiated,
    lost: [...evaluation.shed].sort(),
    unresolved,
    completedTransferIds: [...evaluation.completedTransferIds].sort(),
    transitionWitnessRefs: [...new Set(input.suppliedWitnesses)].sort(),
    authority: "none",
    occurrenceClaim: "transition-witness-only",
  };

  return addressJson(value);
}
```

- [ ] **Step 2: Run the focused contract through GitHub Actions**

Push/commit the module and wait for the PR `check` workflow.

Expected result: all new boundary witness tests pass.

- [ ] **Step 3: Run/observe the complete repository gate**

The workflow command is:

```bash
npm run check
```

Expected:

```text
tsc --noEmit: PASS
all node:test suites: PASS
```

- [ ] **Step 4: Review the exact diff for authority/coupling drift**

Require all of the following to remain true:

```text
src/continuity-spine.ts unchanged
package.json unchanged
ONTOLOGY.md unchanged
no Project0 import/dependency
no execution/mutation API in witness module
addressJson reused unchanged
```

---

### Task 3: Finish the bounded PR without overstating graduation

**Files:**
- Existing: `docs/superpowers/specs/2026-08-20-continuity-boundary-witness-v0-design.md`
- Existing: `docs/superpowers/plans/2026-08-20-continuity-boundary-witness-v0.md`
- Existing: `src/continuity-boundary-witness.ts`
- Existing: `test/continuity-boundary-witness.test.ts`

**Interfaces:**
- Produces one TranchNode-local proof that the later Corpus/Project0 slices may cite as evidence.
- Does not close #29 or alter ecosystem-wide Pattern status by itself.

- [ ] **Step 1: Update the PR body with exact-head evidence**

Record:

- exact head SHA;
- RED Actions run and expected missing-module failure;
- GREEN Actions run and final test count;
- exact changed-file set;
- the real Intent Stroke classification;
- boundary statement: `authority: none`, no Project0 runtime, no generic bloom/cutter.

- [ ] **Step 2: Run one bounded completion review**

Review specifically for:

- caller-controlled loss classification;
- proposal destination leakage;
- unresolved semantic inference;
- mutation of the fixture or Spine state;
- duplicate canonicalization/addressing;
- witness output accidentally gaining execution/authority meaning.

- [ ] **Step 3: Resolve only in-scope findings and rerun exact-head checks**

Any valid finding gets a focused regression before the minimum fix. Do not expand into the deferred generic #29 boundary/bloom substrate.

- [ ] **Step 4: Stop at verified ready state for landing authorization**

Do not claim the full Continuity Triangle is graduated yet. The next independent slice is Corpus OS issue #30; Project0 cross-domain pressure follows only after both local witnesses are stable.
