# Fatherhand Authority and Purpose Witnessing

## Status

Design note for TranchNode. This document defines the authority seam, purpose declaration lifecycle, witness roles, provisional activation boundary, Covenant Circuit, and the minimum invariants required before implementation.

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
  evaluatorVersion: string;}
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

## The Covenant Circuit

Fatherhand and purpose describe how capacity travels toward an act. They are incomplete without the return path by which the exercise of capacity is witnessed, challenged, and reconciled to the need or originating charge that called it forth.

```text
Need or originating charge
  -> Fatherhand grant
  -> witnessed governing purpose
  -> stewardship commission
  -> authorized act
  -> observed consequence
  -> reckoning
  -> renew, repair, narrow, suspend, revoke, or close
```

> Capacity descends. Witness persists. Consequence returns. Stewardship answers.

### Stewardship

Authority asks whether a hand may act. Purpose asks toward what declared construction. Stewardship records what answerability attaches when capacity is joined to a governing purpose.

```ts
interface StewardshipCommission {
  id: string;
  stewardId: string;
  terminalGrantId: string;
  governingPurposeId: string;
  originatingNeedId?: string;
  originatingChargeId?: string;

  beneficiaryRefs: string[];
  affectedScopes: unknown[];
  duties: string[];
  protectedCommitments: string[];
  prohibitedConsequences: string[];

  reviewConditions: string[];
  expiresAt?: string;
  surrenderConditions: string[];
}
```

Every hand that receives capacity also receives answerability for its exercise. Capacity may narrow downstream; answerability for the capacity actually exercised may not disappear downstream.

A purpose need not arise from deprivation, but it must disclose the need, charge, beneficiary, commitment, or other rightful claim it purports to serve. A coherent purpose with no disclosed call to govern remains incomplete.

### Standing

Standing is the capacity to introduce a challenge that the governance system must hear. It is not authority to govern, amend purpose, or decide the challenge.

> Authority permits action. Standing permits challenge.

A beneficiary, affected party, protected-commitment holder, receiving steward, or other party named by policy may have standing to claim that:

- an act affected them;
- a protected commitment was displaced;
- a consequence escaped its declared envelope;
- a purpose no longer serves its originating need or charge;
- capacity was exercised outside the witnessed construction.

Witness artifacts may support standing claims. They do not decide them, and graph frequency cannot vote a challenge into truth.

### Independent reckoning judgments

Reckoning keeps three judgments independent:

| Judgment | Question |
| --- | --- |
| Authorization | Was the hand lawfully permitted to act? |
| Fidelity | Did the act remain aligned with purpose, duties, and protected commitments? |
| Fulfillment | What occurred relative to the originating need or charge? |

No result launders another:

- beneficial consequence does not authorize an unauthorized act;
- failed outcome does not retroactively invalidate a properly authorized act;
- purpose alignment does not erase harmful consequence;
- successful fulfillment does not prove faithful stewardship;
- faithful stewardship does not fabricate fulfillment.

```ts
interface StewardshipReckoningReceipt {
  commissionId: string;
  actId: string;

  authorityReceiptId: string;
  purposeCompatibilityReceiptId: string;
  consequenceWitnessIds: string[];

  authorizationResult: "valid" | "invalid" | "indeterminate";
  fidelityResult: "faithful" | "drifted" | "breached" | "indeterminate";
  fulfillmentResult:
    | "attempted"
    | "partial"
    | "scoped_complete"
    | "scope_uncertain";

  benefitsObserved: string[];
  harmsObserved: string[];
  displacedCommitments: string[];
  standingClaimIds: string[];

  requiredResponse:
    | "none"
    | "review"
    | "repair"
    | "narrow"
    | "suspend"
    | "revoke"
    | "renew";
}
```

The reckoning receipt witnesses the traversal and evidence. It does not itself punish, renew, revoke, or close. Those responses require their own authorized acts.

### Root capacity basis

Fatherhand identifies the originating hand for a chain. It does not prove universal ownership or rightful jurisdiction over everything that hand purports to grant.

```ts
type RootCapacityBasis =
  | "inherent"
  | "created"
  | "entrusted"
  | "consented"
  | "custodial"
  | "contracted"
  | "necessity"
  | "indeterminate";
```

> No Fatherhand may originate transferable capacity over what was never within its rightful hand.

Overlapping root claims produce jurisdictional tension. They require consent, covenant, precedence, partition, or an honest `indeterminate`; cryptographic perfection cannot settle rightful basis by itself.

### Circuit laws

- No hand may inherit authority while severing the return path by which its exercise is witnessed, challenged, and reconciled to its governing purpose and originating need or charge.
- No witness artifact may be used as a grant, sanction, or substitute for the response act it recommends.
- No renewal may widen capacity, scope, or purpose without fresh originating authority.
- No favorable fulfillment result may erase unauthorized action, fidelity breach, displaced commitment, harm, or standing claim.
- No adverse fulfillment result may by itself prove breach.
- No child or other beneficiary may be converted into evidence machinery merely because fulfillment matters.

The first canonical design fixture for this circuit is `fixtures/specs/nanaspork-meal-covenant.md`. It is deliberately a fixture specification, not a hashed canonical runtime artifact. Jules must turn it into explicit inputs and expected receipts only after the repository's canonical serialization and hashing discipline is adopted.

## Integration boundary with Floor 1.0 and ontology v0.1

This proposal is a constitutional authority candidate, not permission to expand the frozen semantic ontology by implication.

The current ontology v0.1 owns eight node kinds and nine edge kinds. Fatherhand grants, purpose declarations, construction contexts, policies, and evaluation receipts do not become new universal `NodeKind` or `EdgeKind` values merely because this document gives them typed shapes. Until an explicit ontology-version decision is adopted, they belong in an authority/governance module whose durable artifacts may be referenced by canonical nodes without changing the meanings of `source`, `witness`, `proposal`, `tension`, or `harvest`.

| Fatherhand concept | Current v0.1 relationship | Forbidden shortcut |
| --- | --- | --- |
| Grant or revocation record | Authority-module artifact with immutable lineage | Treating `actorId` as proof of authority |
| Human witness receipt | Accountable attestation; may project as a `witness` node | Treating witness as permission or verification |
| AI semantic receipt | Model-attributed bounded analysis | Elevating model coherence to truth or acceptance |
| Hive state receipt | Snapshot-bound contextual evidence | Inferring governing intent from graph density |
| Purpose declaration | Authorized governance act; may project as `proposal` until activated | Adding a free-floating `purpose` node kind on this branch |
| Activation receipt | Versioned evaluation artifact | Treating the receipt as the act that grants or activates |
| Purpose relations | Contextual authority-module relations | Smuggling them into an existing edge kind by semantic alias |

Any future substrate promotion must name the new ontology version, exact direction and endpoint law, admission predicates, traversal behavior, dispute and supersession behavior, scope semantics, compatibility mapping, and adversarial fixtures. Unknown or lossless-unavailable relations must be rejected or preserved externally; they must not be coerced into a nearby v0.1 edge.

### Accepted-event and scope seam

The v0.1 `AcceptedEvent.actorId` identifies the principal accountable for acceptance. It does not prove a Fatherhand chain. An implementation may require a valid authority receipt before emitting an accepted event, but replay must continue to derive durable order from `sequence`, not from signatures, timestamps, display seals, model output, or graph frequency.

`scopeId` remains both a meaning and authorization boundary. Fatherhand validation must not create an implicit cross-scope edge or leak the existence of inaccessible grants, purposes, receipts, identities, counts, or tensions. Cross-scope authority requires an explicit bridge design and receipt envelope under a later adopted contract.

### Receipt and hashing seam

All durable Fatherhand artifacts must use the repository's eventual single canonical addressing discipline. The grant seal binds `parentSeal` and canonical `grantBody`; it does not replace the artifact's canonical address. Receipt identity, signature validity, provenance closure, authority validity, purpose compatibility, activation, admissibility, fulfillment, and epistemic truth remain distinct judgments.

## Jules handoff

Jules should treat this PR as a bounded specification and adversarial-review assignment, not as authority to invent ontology.

### First assignment

1. Compare this document against `ONTOLOGY.md`, `INVARIANTS.md`, the Project Lego Floor 1.0 integration PR, and any adopted canonical receipt/hash implementation.
2. Produce a contradiction and compatibility report before writing production code.
3. Turn the minimum tests below into fixture specifications with explicit inputs, snapshot/policy versions, expected receipts, and expected failure codes.
4. Propose the smallest module boundary that keeps Fatherhand governance outside the frozen v0.1 node/edge unions.
5. Identify every place where an implementation could accidentally collapse:
   - provenance into authority;
   - witness into permission;
   - signature validity into authority;
   - `actorId` into a grant;
   - graph frequency into purpose;
   - provisional activation into ordinary activation;
   - receipt production into the governed act itself.
6. Stop at any ontology, edge-law, cross-scope, or canonical-hashing conflict. Record it as a tension with alternatives; do not resolve it by choosing the most convenient representation.

### Implementation order after review

1. Pure schemas and validators with no storage side effects.
2. Canonical grant-body hashing and signature-chain verification using the repository's one adopted hasher.
3. Pure `isAuthorized` traversal with revocation, expiry, consumption, delegation, scope, and purpose checks.
4. Heterogeneous witness schemas that are structurally incapable of granting capability.
5. Purpose-compatibility evaluation against an authorized, snapshot-bound construction context.
6. Activation-policy evaluation and provisional-envelope validation.
7. Append-only receipt persistence and deterministic replay integration.
8. Only then, adapters into semantic projections or application surfaces.

Do not modify `NodeKind`, `EdgeKind`, evidence traversal, or cross-scope behavior in the implementation PR unless a separately reviewed ontology contract explicitly authorizes that change.

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