# Fatherhand Authority and Purpose Witnessing

## Status

Design note for TranchNode. This document defines the authority seam, purpose declaration lifecycle, witness roles, provisional activation boundary, and the minimum invariants required before implementation.

## Core distinction

Authority permits the declaration. Witnessing makes the declaration durable and inspectable.

The three witnesses never manufacture capacity. They preserve the exercise of capacity so it remains attributable, legible, contextual, and resistant to laundering.

## Fatherhand

Authority is not a flag on an actor. It is a presently valid capacity to act, derived through an explicit provenance path from an originating hand.

> Authority is a Fatherhand chain whose every transfer preserves identity, narrows or preserves scope, maintains purpose, exposes prior hands, and cannot restore exhausted power.

### Laws of transmission

1. No hand may give what it did not receive.
2. No hand may enlarge what it received.
3. No hand may conceal the hand above it.
4. No hand may revive what has been extinguished.
5. No hand may transform purpose while preserving only form.

### Seal and chain

A visible accreting seal such as `Y -> YA -> YAHELU` is legitimate late compression. It is evidence of the chain, not the chain itself.

Canonical linkage:

```text
seal = hash(parentSeal, grantBody)
grantorSignature = sign(grantorPrivateKey, seal)
```

Validation traverses canonical grant records. It never trusts `displayPath` as authority.

```ts
interface FatherhandGrant {
  id: string;
  parentGrantId: string | null;
  fatherhandId: string;
  grantorId: string;
  granteeId: string;

  capabilities: string[];
  scope: unknown;
  purposeId: string;

  transferable: boolean;
  delegableCapabilities: string[];
  delegableScope: unknown;

  retainedCapabilities: string[];
  consumedCapabilities: string[];

  issuedAt: string;
  expiresAt?: string;
  revocationRef?: string;

  parentSeal?: string;
  seal: string;
  grantorSignature: string;
}
```

Capabilities held and capabilities delegable are separate. Scope held and scope delegable are separate. Retention and consumption are first-class.

## Independent judgments

```text
Capability    = Does this hand possess the relevant brick and permission to place it?
Compatibility = Will this act connect to the present structure without violating local constraints?
Purpose       = Should this act connect here, given the declared larger construction?
```

Compatibility is adjacency. Purpose is trajectory.

No one result substitutes for another. An act may be capable but incompatible, compatible but purposeless, purpose-aligned but unauthorized, or validly authorized yet blocked by context integrity.

## Purpose as contextual graph

Purpose is not a universal lattice. The relation between two purposes depends on construction context.

```ts
type PurposeRelation =
  | "subserves"
  | "preserves"
  | "compatible"
  | "requires_exception"
  | "diverts"
  | "conflicts"
  | "indeterminate";
```

```ts
interface PurposeNode {
  id: string;
  statement: string;
  declaredBy: string;
  declarationActId: string;
  authorityReceiptId: string;
  appliesTo: unknown;
  validFrom: string;
  validUntil?: string;
  parentPurposeId?: string;
  status:
    | "draft"
    | "proposed"
    | "witnessed"
    | "active"
    | "provisionally_active"
    | "fulfilled"
    | "superseded"
    | "revoked";
}
```

Purpose declaration, amendment, supersession, and revocation require distinct capabilities:

```text
declare_build_intent
amend_build_intent
supersede_build_intent
revoke_build_intent
define_activation_policy
```

A delegated purpose may be `identical`, `narrows`, `operationalizes`, or `preserves`. `expands`, `reinterprets`, and `replaces` are governance actions and require fresh originating authorization.

> No hand may infer permission merely from thematic resemblance.

## Heterogeneous witness set

The witnesses answer different questions. Their receipts are different shapes and cannot substitute for one another.

### Intentional witness: human

Attests that the declaration was understood, intended, and accepted with its constraints.

The declarant and human witness are structurally distinct. Self-witness does not satisfy an independent human-witness requirement.

### Semantic witness: AI

Acts as a bounded semantic notary. It binds:

- exact declaration text;
- construction-context hash;
- model and evaluator version;
- surfaced conflicts and unresolved tensions;
- limits of the analysis.

It does not attest goodness, truth, authority, or permission.

```ts
type SemanticWitnessResult =
  | "coherent"
  | "coherent_with_tensions"
  | "indeterminate"
  | "internally_conflicting";
```

### Contextual witness: hive graph

Produces a state receipt recording the exact relational world into which the declaration was placed:

- active purposes;
- protected commitments;
- accepted plans;
- authority paths;
- unresolved tensions;
- construction-context hash.

The hive is a constitutional witness, not a voter. Graph frequency, reference density, majority relation, or emergent pattern cannot create originating capacity or governing intent.

## Declaration lifecycle

```text
draft -> proposed -> witnessed -> active | provisionally_active
```

Activation requires both gates:

1. **Authority condition:** the declarant has a valid Fatherhand grant containing the exact required capability.
2. **Witness condition:** the activation policy's required heterogeneous witness set is complete and valid.

Nothing after Fatherhand authorization invents capacity.

## Receipts

Receipts witness evaluation. They do not grant capability and must contain no field that can be interpreted as granting capability.

```ts
interface AuthorityValidationReceipt {
  actId: string;
  terminalGrantId: string;
  fatherhandId: string;
  chain: string[];
  result: "valid" | "invalid" | "indeterminate";
  failures: string[];
  evaluatedAt: string;
  evaluatorVersion: string;
}
```

```ts
interface PurposeCompatibilityReceipt {
  actId: string;
  grantPurposeId: string;
  activePurposeId: string;
  constructionContextId: string;
  relation: PurposeRelation;
  supportingPaths: string[][];
  conflicts: string[];
  unresolvedTensions: string[];
  result: "compatible" | "incompatible" | "indeterminate";
  evaluatedAt: string;
  evaluatorVersion: string;
}
```

```ts
interface PurposeActivationReceipt {
  purposeId: string;
  declarationActId: string;
  activationPolicyId: string;
  activationPolicyVersion: string;

  authorityReceiptId: string;
  humanWitnessReceiptId: string;
  semanticWitnessReceiptId: string;
  graphStateWitnessReceiptId: string;

  openTensions: string[];
  blockingTensions: string[];
  displacedCommitments: string[];

  result:
    | "active"
    | "provisionally_active"
    | "not_activated"
    | "indeterminate";

  provisionalEnvelope?: ProvisionalEnvelope;
  rationalePaths: string[][];
  evaluatedAt: string;
  expiresAt?: string;
}
```

## Provisional activation

`provisionally_active` means:

> Authorized, sufficiently witnessed, reversible governance under explicitly bounded unresolved conditions.

It is permitted only where uncertainty concerns method, incomplete evidence, or bounded context and action can be narrowed into a reversible envelope.

It is forbidden where uncertainty concerns originating authority, declarant identity, governing purpose, unresolved precedence, context integrity, or irreversible consequence.

> Method may remain unresolved. Mandate may not.

```ts
interface ProvisionalEnvelope {
  allowedCapabilities: string[];
  prohibitedCapabilities: string[];
  boundedScope: unknown;
  expiresAt: string;
  reviewTriggers: string[];
  rollbackPlanId: string;
  maximumConsequence: string;
}
```

A provisional activation requires an expiration and review trigger. It may preserve options; it may not spend the future before purpose is settled.

Conservative permitted actions include observation, copying, quarantine, preservation, simulation, evidence collection, consent requests, reversible drafts, and sandboxed execution.

Irreversible destruction, publication, ownership transfer, root-purpose alteration, exposure of protected material, nonrecoverable expenditure, and binding external commitments require full activation unless an explicit constitutional policy says otherwise.

## Activation policy governance

The activation policy is a constitutional instrument, not an ordinary purpose. Adoption and amendment require:

- a valid `define_activation_policy` Fatherhand capability;
- human intentional witness;
- AI semantic witness;
- hive contextual witness;
- an explicit predecessor relation;
- migration analysis for active purposes;
- a declared effective time.

A new policy version does not reinterpret old receipts. Each receipt remains a statement that policy version `V` evaluated graph state `G` at time `T`.

## Hard prohibitions

- Witness receipts cannot grant, enlarge, delegate, renew, or revive capability.
- The hive cannot approve, vote, or infer Fatherhand from frequency.
- A display seal cannot validate itself.
- Purpose cannot enter through a side channel around authority.
- Silent activation under unresolved ambiguity is forbidden.
- No activation result may be derived from graph frequency, majority reference, or emergent pattern alone.
- No purpose may be evaluated apart from the commitments it would displace.

## Minimum executable tests

1. A valid three-witness set without Fatherhand authority returns `not_activated`.
2. Valid Fatherhand authority with an incomplete required witness set returns `not_activated`.
3. A witness receipt containing any capability-grant field fails schema validation.
4. A child grant exceeding `delegableCapabilities` or `delegableScope` is invalid.
5. A revoked or consumed prefix invalidates every descendant at evaluation time.
6. A child validly issued before later parent revocation still fails current authorization after revocation.
7. A changed `parentSeal`, grant body, or signature breaks the chain.
8. A purpose delegation marked `expands`, `reinterprets`, or `replaces` is rejected as delegation.
9. Thematic resemblance alone cannot establish purpose compatibility.
10. A purpose-aligned but unauthorized act fails authority while retaining its purpose receipt.
11. Graph density or majority reference cannot activate a purpose.
12. `provisionally_active` without an expiration, review trigger, reversible envelope, and rollback plan fails validation.
13. Authority, identity, purpose, precedence, or context-integrity uncertainty cannot produce `provisionally_active`.
14. Implementation uncertainty may produce `provisionally_active` only inside the common safe envelope.
15. Old activation receipts remain bound to their original policy version and graph-state hash.

## Compressed law

> Fatherhand grants capacity. The human witnesses intention. The AI witnesses articulation. The hive witnesses placement.

> Authority permits the act of declaration. Witness preserves what was declared, what it meant, and where it stood in the larger pattern.
