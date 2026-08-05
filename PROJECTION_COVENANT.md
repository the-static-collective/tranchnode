# Projection Covenant

## Status

Conceptual architecture slice and fixture contract. This document does not add canonical node kinds, edge kinds, or event contracts. It introduces a bounded profile for testing whether the current TranchNode and Project0 primitives can express knowledge transmission without semantic aliasing.

## Core thesis

> A receiver may create local residue, but may not enlarge the testimony's disclosure, authority, or claimed scope.

Projection Covenant is the missing hinge between sovereign stewardship and permitted transmission.

It separates four stages that must not imply one another:

```text
received
→ affected
→ carried
→ transmissible
```

- **Received** — testimony entered a node's causal cut and its lineage can be placed.
- **Affected** — the receiver's field was re-patterned and local residue exists, including when adoption is none.
- **Carried** — the receiver sovereignly chose to keep some residue active as living memory.
- **Transmissible** — an explicit authority envelope permits some outward projection.

> Nothing received becomes inheritance merely because it produced residue.

Residue is automatic. Carrying is sovereign. Projection requires authority. Inheritance requires both.

## Stack boundary

```text
Band Runtime
  preserves encounter and emits settlement

TranchNode
  performs sovereign stewardship and emits bounded testimony
  under a projection covenant

Project0
  verifies identity, lineage, authority, admissibility,
  and permitted transmission
```

Band Runtime must not output memory. Its output boundary is an encounter settlement:

```ts
interface EncounterSettlement {
  encounterRef: EncounterId;
  causalCut: CausalCut;
  participants: SovereignNodeId[];
  residuesDeclared: ResidueReceipt[];
  unresolvedDifferences: DifferenceRef[];
  eligibleTestimonyBasis: EvidenceRef[];
}
```

Settlement records the crossing without deciding what any participant will carry or transmit.

## Non-escalation law

Every transformation of received material must preserve or reduce its disclosure, authority, and scope unless a new explicit grant enlarges them.

The law applies independently to:

- citation;
- republication;
- adoption;
- inference;
- delegation.

These operations are not aliases.

## Candidate bounded profile

The following shape is non-canonical and exists to drive fixtures:

```ts
interface ProjectionCovenant {
  id: ProjectionCovenantId;
  sourceNode: SovereignNodeId;
  testimonyRef: TestimonyId;

  disclosure:
    | "private"
    | "bounded"
    | "named_recipients"
    | "public";

  receptionGrant: {
    encounter: true;
    cite:
      | "none"
      | "existence_only"
      | "approved_metadata"
      | "approved_summary";
    contest: boolean;
    carryLocally: boolean;
    deriveTestimony: boolean;
    republishContent: boolean;
    delegate: boolean;
  };

  prohibitedEffects: readonly (
    | "remote_mutation"
    | "implied_adoption"
    | "authority_transfer"
    | "identity_merger"
    | "silent_republication"
  )[];

  authority: "self_only";

  validFrom: Instant;
  validUntil?: Instant;
  issuedAt: Instant;
  recordedAt: Instant;

  revokedBy?: CovenantRevocationId;
  revocationEffectiveAt?: Instant;
}
```

The capabilities are independent because testimony may be simultaneously citable, contestable, eligible for private carrying, and forbidden from republication.

## Citation is not retransmission

The evaluator must distinguish permission to cite from permission to expose testimony content.

A citation may disclose only what the covenant permits:

```ts
interface BoundedCitation {
  testimonyRef: TestimonyId;
  citedBy: SovereignNodeId;
  causalCut: CausalCut;

  disclosed:
    | "existence_only"
    | "public_metadata"
    | "approved_summary"
    | "full_content";

  interpretation?: BoundedStatement;

  claimsWitness: false;
  claimsAdoption: false;

  authorityBasis: ProjectionCovenantId;
}
```

A lawful receiver must be able to say:

```text
I received this.
I understood its lineage.
I carry part of it privately.
I am not authorized to expose its contents.
I am authorized to cite its existence.
```

A non-disclosing citation points toward testimony without impersonating it, exposing it, or inheriting its witness authority.

## Revocation law

Revocation governs future projection authority. It does not rewrite:

- the historical reception;
- residue already produced;
- lawful citations made while authority existed;
- testimony already emitted under a valid prior grant.

> Revocation closes future projection authority; it does not erase prior lawful reception or residue.

Evaluation must therefore preserve valid time, transaction time, and evaluation time as distinct.

## Three histories

The system must keep three histories distinct:

1. **Encounter history** — what occurred between participants.
2. **Stewardship history** — how each node chose to carry what occurred.
3. **Transmission history** — what each node was authorized to expose, cite, derive, or delegate.

None may substitute for another.

## Culture is a projection

There is no canonical global `CultureState`.

Culture is an attributable, reproducible projection under a declared recognition policy:

```ts
interface CultureProjection {
  observer: SovereignNodeId;
  causalCut: CausalCut;
  includedTestimonies: TestimonyId[];
  recognitionPolicy: RecognitionPolicyId;
  unresolvedForeignness: DifferenceRef[];
  omittedButKnownLineage: EncounterId[];
}
```

The governing law scales the Band Runtime invariant upward:

> The mix is never authority.
>
> The culture is never authority over its testimonies.

## Smallest executable fixture

```text
Node A witnesses encounter E1
→ Node A carries residue privately
→ Node A emits bounded testimony T1
→ Covenant C1 permits existence-only citation,
  contest, and local carrying
→ Covenant C1 forbids remote mutation,
  implied adoption, silent republication,
  content republication, and delegation
→ Node B receives T1 and understands its lineage
→ Node B records local residue with adoption = none
→ Node B cites T1 without exposing protected contents
→ Node C contests Node B's interpretation
```

The hard acceptance gate is:

> Node B was genuinely altered, adopted nothing, and remains able to cite the lineage without claiming Node A's witness or disclosing Node A's bounded testimony.

Expected independent judgments:

```json
{
  "encounterGrounded": true,
  "testimonyAuthorized": true,
  "reception": "valid",
  "adoption": "none",
  "citation": "authorized",
  "contentRetransmission": "unauthorized",
  "disclosure": "within_bounds",
  "semanticEffect": "local_only",
  "foreignnessPreserved": true
}
```

## Fixture matrix

An implementation slice should include:

```text
fixtures/projection-covenant/
  01-citable-without-disclosure
  02-affected-without-adoption
  03-carried-without-transmission
  04-derived-testimony-with-lineage
  05-revocation-does-not-rewrite-history
  06-citation-misrepresents-bounded-claim
  07-downstream-scope-enlargement-rejected
  08-private-testimony-silent-republication-rejected
```

## Evaluator contract

```ts
interface ProjectionEvaluation {
  reception: "valid" | "invalid" | "indeterminate";
  citation: "authorized" | "unauthorized" | "indeterminate";
  disclosure: "within_bounds" | "enlarged" | "indeterminate";
  derivation: "authorized" | "unauthorized" | "not_applicable";
  delegation: "authorized" | "unauthorized" | "not_applicable";
  witnessClaim: "preserved" | "appropriated" | "not_claimed";
  adoption: "none" | "partial" | "carried" | "indeterminate";
  semanticEffect: "local_only";
  foreignnessPreserved: boolean;
}
```

Evaluators must be pure and produce receipts without mutating the graph.

## Stop conditions

Stop and report an ontology boundary if implementation requires:

- a new universal node kind;
- a new universal edge kind;
- undeclared cross-scope semantics;
- direct structure-to-structure mutation;
- a competing canonicalization or hashing scheme;
- treating citation, republication, adoption, inference, or delegation as aliases;
- rewriting prior reception or residue after revocation.

A fixture-backed failure may justify a later ontology proposal. This document does not pre-authorize one.

## Architectural invariants

1. Received, affected, carried, and transmissible are independent stages.
2. Local residue does not imply adoption, carrying, inheritance, or transmission authority.
3. Citation authority is distinct from content retransmission authority.
4. A receiver cannot inherit the witness authority of the source testimony.
5. Downstream projection cannot enlarge disclosure, authority, or scope without a new explicit grant.
6. Projection authority is capability-specific rather than a single permissive state.
7. Revocation acts prospectively and cannot rewrite encounter, residue, or prior lawful acts.
8. Transmission preserves lineage while permitting foreignness and contestation.
9. Culture is a bounded projection, never global authority over testimony.
10. Projection Covenant remains provisional until existing primitives fail fixture-backed expression.

## Thesis

> Project0 governs what a carrying is allowed to claim; TranchNode governs what a sovereign node chooses to carry; Band Runtime preserves the encounter from which carrying became possible.

> Residue may arise without permission. Carrying requires sovereignty. Projection requires authority. Inheritance requires both.
