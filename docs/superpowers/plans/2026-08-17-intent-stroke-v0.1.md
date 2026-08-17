# Intent Stroke / Swype NAV v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove that an approximate pointer stroke through a declared 2D conceptual layout can deterministically rank bounded traversal templates while preserving raw evidence, ambiguity, and non-authority.

**Architecture:** Add one pure TranchNode projection module beside the existing projection primitives. Raw strokes and layouts are independently addressed with the existing `addressJson` floor; the decoder expands declared anchor routes into integer template samples, compares them with integer-only dynamic time warping plus endpoint cost, ranks every declared candidate deterministically, and fingerprints the non-authoritative decoding body. A JSON fixture supplies the first falsifiable specimen.

**Tech Stack:** TypeScript, Node.js built-in test runner, existing TranchNode canonical addressing.

## Global Constraints

- Schema names are exactly `tranchnode/intent-stroke/v0.1`, `tranchnode/intent-stroke-layout/v0.1`, and `tranchnode/intent-stroke-decoding/v0.1`.
- Decoding output carries `authority: "none"`.
- Geometry and scoring are integer-only; no learned model or probabilistic confidence score.
- Exact equal-cost leaders remain an explicit collision.
- Candidate order must not affect normalized output.
- Raw stroke and layout identities use the existing TranchNode / Project0 canonical-addressing implementation.
- No Project0 ontology change, UI, topology mutation, admission, adoption, permission, Door, or Threshold.

---

### Task 1: Characterize the public contract with failing tests

**Files:**
- Create: `test/intent-stroke.test.ts`
- Create: `fixtures/intent-stroke-v0.1.json`
- Create: `src/intent-stroke.ts`

**Interfaces:**
- Consumes: `Addressed`, `Hash`, and `addressJson` from `src/residual.ts`.
- Produces: `addressIntentStroke(...)`, `addressIntentStrokeFieldLayout(...)`, `decodeIntentStroke(...)`, `verifyIntentStrokeDecoding(...)` and their public v0.1 types.

- [ ] **Step 1: Write failing tests** for canonical stroke/layout identity, deterministic ranking under input permutation, bounded perturbation, directional sensitivity, exact collision preservation, and stable validation reason codes.
- [ ] **Step 2: Run `node --test --import tsx test/intent-stroke.test.ts`** and verify failure is caused by the missing module/API.
- [ ] **Step 3: Commit the red characterization** if the execution surface supports intermediate commits; otherwise preserve the failing test evidence before implementation.

### Task 2: Implement the minimum deterministic decoder

**Files:**
- Create: `src/intent-stroke.ts`
- Modify: `test/intent-stroke.test.ts`

**Interfaces:**
- `addressIntentStroke(stroke: IntentStroke): Addressed<IntentStroke>` validates and addresses raw stroke evidence.
- `addressIntentStrokeFieldLayout(layout: IntentStrokeFieldLayout): Addressed<IntentStrokeFieldLayout>` validates and addresses a fixed conceptual layout.
- `decodeIntentStroke(request: IntentStrokeDecodeRequest): IntentStrokeDecoding` returns every declared template ordered by integer total cost and stable template id.
- `verifyIntentStrokeDecoding(decoding: IntentStrokeDecoding): void` recomputes the fingerprint over the decoding body.

- [ ] **Step 1: Validate bounded integer coordinates, strictly increasing stroke sequence, non-empty unique ids, layout/stroke identity, candidate references, and decoder configuration.**
- [ ] **Step 2: Expand each declared anchor route with deterministic integer interpolation.**
- [ ] **Step 3: Compute dynamic-time-warping path cost using Manhattan distance and checked safe-integer addition.**
- [ ] **Step 4: Add checked endpoint cost, sort by `totalCost` then `templateId`, and mark every equal-cost leader in `ambiguity.leadingTemplateIds`.**
- [ ] **Step 5: Fingerprint the body with `addressJson`; keep `authority: "none"`.**
- [ ] **Step 6: Run the focused test until green.**

### Task 3: Freeze the first specimen and verify the repository

**Files:**
- Create: `fixtures/intent-stroke-v0.1.json`
- Modify: `test/intent-stroke.test.ts`

**Interfaces:**
- Fixture contains a fixed layout, three ordinary traversal templates, an intended approximate stroke, a perturbed stroke, a reversed stroke, and a deliberate collision pair.

- [ ] **Step 1: Load the fixture as raw bytes and execute every specimen through the public decoder.**
- [ ] **Step 2: Assert intended/perturbed leading traversal, reversed directional result, collision preservation, and fingerprint verification.**
- [ ] **Step 3: Run `npm test`.**
- [ ] **Step 4: Run `npm run check`.**
- [ ] **Step 5: Review the final diff for ontology or authority creep before publishing the PR.**
