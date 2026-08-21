# Four-Surface Capability Covenant v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one inert, addressed TranchNode proof that keeps Eye/observation, Mouth/testimony, Hand/external action admission, and Hair/carried continuity evidence mechanically distinct without granting any new execution authority.

**Architecture:** Create one focused `surface-capability.ts` module with exact v0.1 schemas, descriptor-safe normalization, existing `addressJson(...)` addressing, and a pure claim-coherence evaluator. The evaluator only says whether a declared claim is internally coherent with its subject profile; every output remains `authority: "none"`, and project-local execution systems continue to own actual Hand authorization.

**Tech Stack:** TypeScript 5.8, Node.js test runner through `tsx`, existing TranchNode `Addressed<T>` / `addressJson(...)` helpers.

**Spec:** `docs/superpowers/specs/2026-08-20-four-surface-capability-covenant-v0.1-design.md`

## Global Constraints

- Source issue is #65.
- Profile schema is exactly `tranchnode/surface-capability-profile/v0.1`.
- Claim schema is exactly `tranchnode/surface-claim/v0.1`.
- Decision schema is exactly `tranchnode/surface-claim-decision/v0.1`.
- Surface literals are exactly `eye | mouth | hand | hair`.
- Canonical surface order is exactly `eye`, `mouth`, `hand`, `hair`.
- Freshness literals are exactly `fresh_observation | carried_history | not_applicable`.
- Every profile, claim, and decision has exact `authority: "none"`.
- A profile declaration never grants project-local execution authority.
- `externalAdmissionRef` is opaque evidence; this module never validates or spends it.
- No ontology node kind changes.
- Reuse `Addressed<T>` and `addressJson(...)`; do not add another identity grammar.
- No dependency additions.
- No network, UI, database, scheduler, or remote-execution work.
- Root verification gate is `npm run check`.

---

## File Structure

```text
src/surface-capability.ts
  Exact v0.1 types, normalization, addressing, claim evaluator.

test/surface-capability.test.ts
  Contract, refusal, hostile-input, address-distinction, and non-mutation proofs.
```

No additional files are required for v0.1 unless implementation shows the single module becoming materially less reviewable than neighboring TranchNode modules.

---

### Task 1: Freeze the profile contract and addressed normalization

**Files:**
- Create: `src/surface-capability.ts`
- Create: `test/surface-capability.test.ts`

**Interfaces:**
- Consumes: `Addressed<T>` and `addressJson(...)` from `src/residual.ts`.
- Produces: schema constants, `ConstitutionalSurface`, `SurfaceCapabilityProfileV01`, `normalizeSurfaceCapabilityProfile(...)`, `addressSurfaceCapabilityProfile(...)`.

- [ ] **Step 1: Write the failing profile tests**

Create `test/surface-capability.test.ts` with:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import {
  PROFILE_SCHEMA,
  addressSurfaceCapabilityProfile,
  normalizeSurfaceCapabilityProfile,
} from "../src/surface-capability.js";

const researchBody = {
  schema: "tranchnode/surface-capability-profile/v0.1",
  subjectRef: "subject:researcher",
  surfaces: ["hair", "eye", "mouth"],
  authority: "none",
} as const;

test("freezes the profile schema and canonical surface order", () => {
  assert.equal(PROFILE_SCHEMA, "tranchnode/surface-capability-profile/v0.1");
  assert.deepEqual(
    normalizeSurfaceCapabilityProfile(researchBody).surfaces,
    ["eye", "mouth", "hair"],
  );
});

test("partial bodies are lawful and address deterministically", () => {
  const a = addressSurfaceCapabilityProfile(researchBody);
  const b = addressSurfaceCapabilityProfile({ ...researchBody, surfaces: ["mouth", "eye", "hair"] });
  assert.deepEqual(a.value, b.value);
  assert.equal(a.address, b.address);
});
```

Add refusal tests for:

- empty `subjectRef`;
- empty surface array;
- duplicate surfaces;
- unknown surface;
- wrong schema;
- authority other than `none`;
- unknown top-level key;
- accessor-backed fields / non-plain hostile wrappers.

- [ ] **Step 2: Run focused test and verify RED**

Run:

```bash
npm test -- --test-name-pattern="profile|partial bodies"
```

Expected: FAIL because `src/surface-capability.ts` does not exist.

- [ ] **Step 3: Implement exact profile types and descriptor-safe normalization**

Start `src/surface-capability.ts` with:

```ts
import type { Addressed } from "./residual.js";
import { addressJson } from "./residual.js";

export const PROFILE_SCHEMA = "tranchnode/surface-capability-profile/v0.1" as const;
export const CLAIM_SCHEMA = "tranchnode/surface-claim/v0.1" as const;
export const DECISION_SCHEMA = "tranchnode/surface-claim-decision/v0.1" as const;

export const SURFACES = ["eye", "mouth", "hand", "hair"] as const;
export type ConstitutionalSurface = (typeof SURFACES)[number];

export interface SurfaceCapabilityProfileV01 {
  schema: typeof PROFILE_SCHEMA;
  subjectRef: string;
  surfaces: ConstitutionalSurface[];
  authority: "none";
}
```

Follow the repository's existing hostile-input posture: inspect own property descriptors, reject accessors/unknown keys, clone arrays, and never mutate caller data.

- [ ] **Step 4: Implement canonical surface ordering and addressing**

Normalize `surfaces` by the fixed `SURFACES` order rather than lexical order, then return a fresh object.

Implement:

```ts
export function addressSurfaceCapabilityProfile(
  input: unknown,
): Addressed<SurfaceCapabilityProfileV01> {
  return addressJson(normalizeSurfaceCapabilityProfile(input));
}
```

Do not alter `addressJson(...)`.

- [ ] **Step 5: Re-run focused profile tests**

Run:

```bash
node --test --import tsx test/surface-capability.test.ts
```

Expected: profile tests PASS.

- [ ] **Step 6: Commit Task 1**

```bash
git add -- src/surface-capability.ts test/surface-capability.test.ts
git commit -m "feat: add surface capability profile v0.1"
```

---

### Task 2: Add inert surface claims and exact coherence rules

**Files:**
- Modify: `src/surface-capability.ts`
- Modify: `test/surface-capability.test.ts`

**Interfaces:**
- Consumes: normalized profile contract from Task 1.
- Produces: `SurfaceClaimV01`, `normalizeSurfaceClaim(...)`, `addressSurfaceClaim(...)`, `SurfaceClaimDecisionV01`, `evaluateSurfaceClaim(...)`.

- [ ] **Step 1: Add failing claim tests for the four surfaces**

Add the exact coherent specimens:

```ts
const eyeClaim = {
  schema: "tranchnode/surface-claim/v0.1",
  subjectRef: "subject:researcher",
  surface: "eye",
  payloadRef: "fact:X",
  evidenceRefs: ["source:fresh-X"],
  freshness: "fresh_observation",
  continuityRefs: [],
  authority: "none",
};

const hairClaim = {
  schema: "tranchnode/surface-claim/v0.1",
  subjectRef: "subject:researcher",
  surface: "hair",
  payloadRef: "fact:X",
  evidenceRefs: ["source:prior-X"],
  freshness: "carried_history",
  continuityRefs: ["lineage:prior-X"],
  authority: "none",
};
```

Add a separate Hand profile and coherent Hand claim containing both:

```text
externalAdmissionRef = "admission:fixture-1"
continuityRefs = ["receipt:fixture-1"]
```

- [ ] **Step 2: Add the RED refusal matrix**

Require these exact reason codes:

```text
SURFACE_NOT_DECLARED
FRESHNESS_MISMATCH
HAND_MISSING_EXTERNAL_ADMISSION
HAND_MISSING_CONTINUITY
NON_HAND_CLAIMS_ADMISSION
SUBJECT_MISMATCH
```

Cases:

1. research profile has no Hand → Hand claim refuses `SURFACE_NOT_DECLARED`;
2. Mouth claim carries `externalAdmissionRef` → `NON_HAND_CLAIMS_ADMISSION`;
3. Hand claim omits `externalAdmissionRef` → `HAND_MISSING_EXTERNAL_ADMISSION`;
4. Hand claim has no continuity refs → `HAND_MISSING_CONTINUITY`;
5. Hair claim says `fresh_observation` → `FRESHNESS_MISMATCH`;
6. Eye claim says `carried_history` → `FRESHNESS_MISMATCH`;
7. profile/claim subject mismatch → `SUBJECT_MISMATCH`.

Expected: FAIL because claim APIs do not yet exist.

- [ ] **Step 3: Implement exact claim types and normalization**

Add:

```ts
export type SurfaceFreshness =
  | "fresh_observation"
  | "carried_history"
  | "not_applicable";

export interface SurfaceClaimV01 {
  schema: typeof CLAIM_SCHEMA;
  subjectRef: string;
  surface: ConstitutionalSurface;
  payloadRef: string;
  evidenceRefs: string[];
  freshness: SurfaceFreshness;
  externalAdmissionRef?: string;
  continuityRefs: string[];
  authority: "none";
}
```

Normalize evidence/continuity refs as unique lexicographically sorted non-empty strings. Preserve omission of optional `externalAdmissionRef` rather than serializing it as `undefined`.

- [ ] **Step 4: Implement `evaluateSurfaceClaim(...)` as a descriptive refusal/coherence function**

Return only:

```ts
decision: "coherent" | "refused"
authority: "none"
```

Apply checks in deterministic order:

1. normalize profile;
2. normalize claim;
3. subject match;
4. surface declared;
5. surface-specific freshness/admission/continuity rules.

A coherent Hand claim **must not** be described as authorized, executable, admitted, or allowed. `coherent` is the only success word.

- [ ] **Step 5: Run focused tests**

```bash
node --test --import tsx test/surface-capability.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

```bash
git add -- src/surface-capability.ts test/surface-capability.test.ts
git commit -m "feat: enforce four-surface claim boundaries"
```

---

### Task 3: Prove Hair cannot impersonate Eye and Hand cannot disappear without lineage

**Files:**
- Modify: `test/surface-capability.test.ts`

**Interfaces:**
- Consumes: Task 2 addressing/evaluator.
- Produces: the founding distinction fixtures; no new production API expected.

- [ ] **Step 1: Add the identical-payload Eye/Hair identity test**

Require:

```ts
const eye = addressSurfaceClaim(eyeClaim);
const hair = addressSurfaceClaim(hairClaim);

assert.equal(eye.value.payloadRef, hair.value.payloadRef);
assert.notEqual(eye.address, hair.address);
assert.equal(eye.value.freshness, "fresh_observation");
assert.equal(hair.value.freshness, "carried_history");
```

This proves that textual sameness does not erase evidence class.

- [ ] **Step 2: Add the Hand → Hair accountability test**

Construct two Hand claims with the same payload and admission but different receipt/continuity refs. Require distinct claim addresses.

Then prove empty continuity refuses with `HAND_MISSING_CONTINUITY`.

The test must not claim either external admission is valid; it only proves continuity remains identity-bearing.

- [ ] **Step 3: Add non-mutation tests**

Deep-clone all profile/claim fixtures before normalization/evaluation and assert exact deep equality afterward.

- [ ] **Step 4: Run focused tests and commit**

```bash
node --test --import tsx test/surface-capability.test.ts
git add -- test/surface-capability.test.ts
git commit -m "test: prove fresh witness and carried history stay distinct"
```

---

### Task 4: Cross-check against landed TranchNode evidence and run the repository gate

**Files:**
- Modify only if needed to correct the new module/tests. Do not alter existing continuity semantics to make the metaphor fit.

**Interfaces:**
- Consumes: existing `ContinuityBoundaryWitnessV01` semantics.
- Produces: verified local compatibility; no runtime coupling.

- [ ] **Step 1: Read the existing Boundary Witness contract as a pressure specimen**

Verify from `src/continuity-boundary-witness.ts` and its tests that it remains:

```text
authority = none
occurrenceClaim = transition-witness-only
```

Treat that as a Hair-like explanatory mapping only. Do not import the new module into Boundary Witness and do not add a surface field to it.

- [ ] **Step 2: Run all tests and type checks**

```bash
npm run check
```

Expected: PASS.

- [ ] **Step 3: Inspect final diff for scope leaks**

The implementation diff must contain only the new module/test plus task-local fixes. Reject any accidental ontology, Continuity Spine, Boundary Witness, dependency, network, or UI change.

- [ ] **Step 4: Commit any final task-local corrections**

If `npm run check` required a correction:

```bash
git add -- src/surface-capability.ts test/surface-capability.test.ts
git commit -m "fix: close four-surface proof gaps"
```

Do not create an empty commit.

---

## Spec self-review result

- Every spec invariant maps to a test or normalization rule above.
- No ontology promotion is required.
- No permission or warrant validation is introduced.
- `coherent` is explicitly separated from `authorized`.
- Hair/Eye freshness distinction is identity-bearing.
- Hand continuity is required without pretending TranchNode owns external admission.
- Partial surface profiles remain lawful.

## Execution stop

The implementation is complete when `npm run check` passes and the new proof can truthfully say:

```text
SEE is not DO.
SAY is not DO.
DO leaves attributable CARRY.
CARRY is not fresh SEE.
```

without granting any new action authority.
