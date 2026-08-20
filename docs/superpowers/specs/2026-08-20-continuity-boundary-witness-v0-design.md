# Continuity Boundary Witness v0.1 — Design

Date: 2026-08-20
Source issue: #29 — Define boundary tranches and lawful bloom receipts
Umbrella: Static Collective Continuity Witness — shared questions, local answers
Status: approved architectural slice for the Continuity stalk-thickening run

## Purpose

Add one small TranchNode-local witness that answers a continuity question over an **already evaluated Continuity Spine boundary**:

> Across this admitted transition, what was preserved, what differentiated, what was lost, and what remains unresolved?

This is deliberately narrower than implementing all of #29. It does not add a generic cutter, boundary admission engine, lawful bloom resolver, transduction system, or Project0 runtime dependency.

The existing `Continuity Spine v0.1` remains the transition law. The new witness is a read-only, addressed projection of a transition that the Spine has already found admissible.

## Governing law

> **Describe the boundary that actually crossed; never let the description authorize the crossing.**

A boundary continuity witness may explain a transition. It cannot make a blocked transition admissible, turn a proposal destination into constituted state, supply missing transfer witnesses, or transfer authority.

## Existing evidence reused

The first specimen is the landed Intent Stroke v0.1 → v0.2 overlap manifest:

`fixtures/continuity-spine/intent-stroke-v01-to-v02.json`

That manifest already proves:

- the v0.1 interface remains carried during overlap;
- decoder and transport authority remain none;
- equal-cost collision remains explicitly unresolved;
- canonical layout binding moves into TranchNode;
- caller-owned `fieldLayoutRef` construction may be shed only after the witnessed responsibility transfer.

The new slice must characterize that real boundary without weakening any of those stronger local semantics.

## Selected shape

Create a pure module:

`src/continuity-boundary-witness.ts`

It consumes:

```ts
interface ContinuityBoundaryWitnessInput {
  spine: ContinuitySpineManifestV01;
  fromStageId: string;
  toStageId: string;
  suppliedWitnesses: string[];
  unresolvedRefs: string[];
}
```

and returns an addressed inert witness:

```ts
interface ContinuityBoundaryWitnessV01 {
  schema: "tranchnode/continuity-boundary-witness/v0.1";
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
```

The returned value is addressed through the repository's existing `addressJson(...)` path. No new canonicalizer or identity grammar is introduced.

## Admission boundary

`deriveContinuityBoundaryWitness(...)` must fail closed unless all of these are true:

1. the Continuity Spine manifest validates under the existing validator;
2. `evaluateStageTransition(...)` returns `decision: "admissible"`;
3. the destination stage is `historical` or `constituted`, never `proposal`;
4. every supplied `unresolvedRef` is a non-empty unique string;
5. every `unresolvedRef` is materially present in the destination stage's `carries`, `dependsOn`, or `scaffolds` set.

The function does not accept caller-supplied `lost`, `preserved`, `differentiated`, or completed-transfer claims.

## Classification law

For the selected source and destination stages, define material as the union of:

```text
carries + dependsOn + scaffolds
```

Then classify deterministically:

- **preserved** — present in both source and destination, excluding refs explicitly classified unresolved;
- **differentiated** — present only in destination, excluding refs explicitly classified unresolved;
- **lost** — exactly the existing evaluator's admitted `shed` set;
- **unresolved** — only the explicit validated `unresolvedRefs` input.

All arrays are unique, lexicographically sorted, and cloned before publication.

`unresolved` is explicit rather than inferred from ref names or prose. TranchNode must not guess semantics from strings such as `"unresolved"` or from human descriptions.

## First exact specimen

For the existing Intent Stroke fixture with both required transfer witnesses supplied and:

```ts
unresolvedRefs = ["collision-policy:unresolved"]
```

the witness must classify:

### Preserved

- `decoder-authority:none`
- `interface:intent-stroke-stdio-v0.1`
- `responsibility:canonical-layout-binding`
- `transport-authority:none`

### Differentiated

- `interface:intent-stroke-stdio-v0.2`
- `layout-binding:tranchnode`

### Lost

- `dependency:caller-constructs-fieldLayoutRef`

### Unresolved

- `collision-policy:unresolved`

The completed transfer is:

- `transfer:canonical-layout-binding-to-tranchnode`

The witness itself carries `authority: "none"` and `occurrenceClaim: "transition-witness-only"`.

## Fail-closed reason codes

The module owns stable local errors:

- `TRANSITION_NOT_ADMISSIBLE`
- `PROPOSAL_DESTINATION_NOT_WITNESSABLE`
- `INVALID_UNRESOLVED_REFS`
- `UNRESOLVED_REF_NOT_PRESENT`

Existing manifest/evaluator reason details may be retained on the error for inspection, but the witness layer must not reinterpret them as success.

## TDD requirements

Tests must prove at minimum:

1. the real Intent Stroke transition produces the exact classification above;
2. repeated derivation is byte/address identical;
3. supplied witness order and unresolved input order do not affect identity;
4. omitting a required transfer witness refuses publication;
5. a proposal destination cannot be published as an occurred boundary witness;
6. a fabricated unresolved ref fails closed;
7. source fixture/input arrays remain unchanged;
8. the resulting witness is inert data and contains no execution or authority surface.

## Relationship to Project0 continuity

This PR does **not** emit a `p0.continuity/0.1` claim.

That mapping belongs in the later cross-domain pressure slice, after TranchNode and Corpus OS each have truthful local witnesses. The portable grammar should consume local evidence; it should not become the owner of TranchNode's boundary semantics.

## Relationship to #29

This is one bounded proof under #29, not completion of the full issue.

Deferred from #29:

- general boundary proposal/admission;
- protected interval policy;
- refusal receipts as a generic boundary substrate;
- lawful bloom;
- Unicode/source-form boundary fixture;
- generic descendant creation.

Those remain independent future work unless another project-owned need makes them necessary.

## Non-goals

- no new ontology kind;
- no new canonicalizer or hash grammar;
- no scheduler or orchestrator;
- no mutation or deletion;
- no authority transfer;
- no automatic future-stage constitution;
- no Project0 runtime/package dependency;
- no global Continuity service;
- no generic boundary or bloom implementation;
- no UI, network, database, or model dependency.

## Stop condition

Stop if this slice requires changing `Continuity Spine v0.1` semantics, inventing a second identity path, inferring unresolved meaning from prose/ref names, or allowing the witness to affect transition admissibility.

## Working compression

> **The Spine decides whether the crossing is admissible. The Boundary Witness remembers what crossed.**
