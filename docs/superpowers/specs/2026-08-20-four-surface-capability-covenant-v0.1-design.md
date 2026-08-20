# Four-Surface Capability Covenant v0.1 — Design

Date: 2026-08-20
Source issue: #65 — Four-Surface Capability Covenant v0.1 — Eye / Mouth / Hand / Hair
Status: approved architectural slice; executable proof not yet landed

## Purpose

Add one small TranchNode-local proof for a cross-system distinction that has independently appeared in witness, testimony, execution, freshness, and continuity work:

```text
EYE   = SEE   = observation / witness / recognition
MOUTH = SAY   = testimony / projection / proposal
HAND  = DO    = admitted consequence / mutation
HAIR  = CARRY = lineage / residue / inheritance / continuity still attached
```

The covenant is a human-legible **capability boundary**, not a new ontology.

Its founding law is:

> **No organ inherits the authority of another merely because they inhabit the same body.**

The first proof must therefore answer a narrower question than “what can this agent do?”:

> Given a declared participating subject and a bounded claim about one surface, can TranchNode classify the claim without allowing perception, speech, action, and carried history to alias one another?

## Why TranchNode

TranchNode already owns several stronger local distinctions:

- retrieval proposes candidates rather than truth;
- witness, testimony, and recognition are distinct;
- direct Structure-to-Structure writes are forbidden;
- proposal futures do not become constituted state by desire or confidence;
- encounter history and living memory are distinct;
- Continuity Spine separates staged transformation from silent overwrite;
- Boundary Witness describes what crossed without authorizing the crossing.

The Four-Surface Covenant should compress those distinctions for human and application interfaces without replacing them.

## Non-ontology rule

Do **not** add `eye`, `mouth`, `hand`, or `hair` as canonical TranchNode node kinds.

In v0.1 they are profile/claim classifications over existing evidence and authority semantics. If future fixtures cannot be represented without ontology change, that failure must be demonstrated before promotion.

## Four boundary invariants

### 1. Eye is not Hand

```text
EYE != HAND
```

Observation, retrieval, recognition, measurement, or witness does not grant mutation authority.

The system may truthfully record “this subject saw X” while still being incapable of performing an act against X.

### 2. Mouth is not Hand

```text
MOUTH != HAND
```

Testimony, interpretation, proposal, recommendation, or declaration does not constitute the proposed act.

Self-authoritative testimony remains `self_only`; confidence does not widen its scope.

### 3. Hand leaves Hair

```text
HAND -> HAIR
```

A materially meaningful admitted consequence is incomplete as an accountable story when it leaves no attributable continuity at all.

For this proof, TranchNode does **not** decide whether an external act was lawfully authorized. It only refuses to classify a claimed Hand consequence as complete when the claimant supplies no consequence/lineage reference.

This is a witnessing requirement, not a warrant grant.

### 4. Hair is not Eye

```text
HAIR != EYE
```

Inherited, remembered, replayed, or lineage-carried material must not silently acquire `fresh_observation` status.

Two claims may carry identical payload text and remain materially different because one says “I just witnessed this” while the other says “I carry this from prior lineage.”

## Selected v0.1 shape

Create one pure module:

`src/surface-capability.ts`

It exports a small profile and claim vocabulary.

```ts
export type ConstitutionalSurface = "eye" | "mouth" | "hand" | "hair";

export interface SurfaceCapabilityProfileV01 {
  schema: "tranchnode/surface-capability-profile/v0.1";
  subjectRef: string;
  surfaces: ConstitutionalSurface[];
  authority: "none";
}

export type SurfaceFreshness =
  | "fresh_observation"
  | "carried_history"
  | "not_applicable";

export interface SurfaceClaimV01 {
  schema: "tranchnode/surface-claim/v0.1";
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

Both profile and claim are inert evidence. `authority: "none"` is exact and load-bearing.

A declared `hand` surface says only that the subject participates at an execution boundary. It is not a permission grant.

## Addressed normalization

Reuse the repository's existing `addressJson(...)` path. Do not add a serializer or hash grammar.

Profiles normalize as follows:

- `subjectRef` must be a non-empty string;
- `surfaces` must be non-empty, unique, and sorted in canonical order `eye`, `mouth`, `hand`, `hair`;
- `authority` must equal `none`;
- unknown fields fail closed;
- input objects and arrays are never mutated.

Claims normalize as follows:

- exact schema and `authority: "none"`;
- subject and payload refs are non-empty;
- surface must be one exact surface literal;
- evidence and continuity arrays are unique lexicographically sorted strings;
- unknown fields fail closed;
- `externalAdmissionRef`, when present, is a non-empty string;
- input remains unchanged.

Addressed outputs use:

```ts
Addressed<SurfaceCapabilityProfileV01>
Addressed<SurfaceClaimV01>
```

## Claim-coherence evaluator

Add a pure function:

```ts
export function evaluateSurfaceClaim(
  profile: SurfaceCapabilityProfileV01,
  claim: SurfaceClaimV01,
): SurfaceClaimDecisionV01
```

The returned decision is descriptive only:

```ts
interface SurfaceClaimDecisionV01 {
  schema: "tranchnode/surface-claim-decision/v0.1";
  subjectRef: string;
  surface: ConstitutionalSurface;
  decision: "coherent" | "refused";
  reason:
    | "SURFACE_CLAIM_COHERENT"
    | "SURFACE_NOT_DECLARED"
    | "FRESHNESS_MISMATCH"
    | "HAND_MISSING_EXTERNAL_ADMISSION"
    | "HAND_MISSING_CONTINUITY"
    | "NON_HAND_CLAIMS_ADMISSION"
    | "SUBJECT_MISMATCH";
  authority: "none";
}
```

Again, `coherent` does not mean “authorized to execute.” It means only that the claim does not violate the covenant's local classification rules.

## Exact surface coherence rules

### Eye

Required:

```text
freshness = fresh_observation
externalAdmissionRef absent
```

`continuityRefs` may exist when the observation cites lineage, but they do not change freshness.

### Mouth

Required:

```text
freshness = not_applicable
externalAdmissionRef absent
```

Mouth may cite evidence and continuity but cannot carry an execution admission.

### Hand

Required:

```text
freshness = not_applicable
externalAdmissionRef present
continuityRefs.length >= 1
```

The external admission is opaque to this module. Its existence is evidence that authority is owned elsewhere rather than silently inferred here.

### Hair

Required:

```text
freshness = carried_history
externalAdmissionRef absent
continuityRefs.length >= 1
```

Hair may carry the same `payloadRef` as a prior Eye claim but cannot claim fresh observation.

## Partial bodies are lawful

Profiles need not declare all four surfaces.

Examples:

```text
research witness: Eye + Mouth + Hair
executor seam:     Hand + Hair
recognizer:        Eye + Hair
projection-only:   Mouth
```

The profile is therefore not a completeness score. Missing Hand may be a deliberate safety property.

## First fixtures

### Fixture A — Eye cannot become Hand by co-location

Profile:

```text
surfaces = [eye, mouth, hair]
```

A Hand claim by that subject refuses with `SURFACE_NOT_DECLARED` even when the claim cites the same evidence as a coherent Eye claim.

### Fixture B — Mouth cannot smuggle execution admission

A Mouth claim carrying `externalAdmissionRef` refuses with `NON_HAND_CLAIMS_ADMISSION`.

### Fixture C — Hand consequence must leave attributable continuity

A Hand claim with an external admission but empty `continuityRefs` refuses with `HAND_MISSING_CONTINUITY`.

### Fixture D — Hair cannot impersonate fresh witness

A Hair claim marked `fresh_observation` refuses with `FRESHNESS_MISMATCH`.

### Fixture E — identical payload, distinct claim class

An Eye and Hair claim may share the same `payloadRef` but normalize/address differently because surface and freshness remain identity-bearing.

### Fixture F — existing TranchNode specimen mapping

Map the landed Continuity Boundary Witness as Hair-like evidence only at the explanatory layer:

```text
Surface: hair
Why: it preserves attributable continuity over an already-admitted transition
Authority: none
Freshness: carried_history
```

Do not change the Boundary Witness type or semantics to make this mapping work.

## Relationship to freshness

This design does not define a wall-clock freshness policy.

`fresh_observation` is an evidence-class claim, not “timestamp newer than N minutes.” A current timestamp cannot convert replayed Hair into Eye.

Project-specific freshness witnesses may later supply evidence to an Eye claim, but this covenant does not own their clocks.

## Relationship to Project0 / execution systems

`externalAdmissionRef` is intentionally opaque.

TranchNode does not validate a Project0 warrant, GitHub merge permission, renderer acceptance, email-send authorization, or any other project's local execution law here.

The module merely refuses the dangerous compression:

> “I can see/say this, therefore I may do it.”

Actual Hand authority remains project-owned.

## Cross-system interpretation

This vocabulary is expected to travel as explanatory grammar:

```text
Haunted Toaster
Eye   analysis/listening
Mouth candidate proposal
Hand  accepted render execution
Hair  score/timeline/receipt lineage

GitBook
Eye   traversal
Mouth illumination/projection
Hand  accepted source change
Hair  provenance/supersession
```

Those mappings are not imported into TranchNode runtime semantics.

## TDD requirements

Tests must prove at minimum:

1. exact profile normalization and deterministic address;
2. partial profiles are lawful;
3. undeclared Hand refuses;
4. Mouth cannot carry execution admission;
5. Hand without external admission refuses;
6. Hand without continuity refs refuses;
7. Hair with fresh-observation freshness refuses;
8. identical payload under Eye and Hair remains address-distinct;
9. input objects/arrays are unchanged;
10. hostile/unknown representation fails closed;
11. every returned decision carries `authority: "none"`;
12. root `npm run check` remains green.

## Non-goals

- no new ontology kind;
- no permission grant or capability token;
- no warrant validation;
- no remote execution;
- no generic agent framework;
- no timestamp-based freshness engine;
- no direct mutation of Continuity Spine or Boundary Witness semantics;
- no cross-project runtime dependency;
- no UI requirement;
- no claim that the human-body metaphor is universally correct.

## Stop condition

Stop v0.1 when TranchNode can represent and refuse the four boundary confusions without acquiring new authority:

```text
SEE is not DO
SAY is not DO
DO leaves CARRY
CARRY is not fresh SEE
```

If the proof can be expressed entirely by the small inert profile/claim evaluator above, do not promote the metaphor further into ontology.

## Working compression

> **What may it see? What may it say? What may it do? What must it carry afterward?**
