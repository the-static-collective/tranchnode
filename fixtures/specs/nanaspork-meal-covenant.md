# NanaSpork Meal Covenant Circuit Fixture

## Status

Canonical **design fixture** for the Fatherhand and Covenant Circuit specification.

This is not yet a canonical serialized fixture and contains no final artifact hashes. It must not be moved into a canonical runtime-fixture path until serialization, identifiers, receipt envelopes, evaluator versions, and the repository's single canonical hasher are adopted.

This fixture does not expand TranchNode ontology v0.1. Its grants, purposes, commissions, dispositions, and receipts remain authority/governance-module artifacts unless a later ontology contract explicitly promotes them.

## Question under test

Can NanaSpork govern a meal-support thread toward the child's actual nourishment without:

- confusing food delivery with fulfillment;
- granting dominion over the child's body;
- coercing consumption;
- manufacturing evidence;
- treating a beneficial outcome as proof of authorization or fidelity;
- treating an unsuccessful outcome as proof of breach;
- allowing answerability to vanish after delegation?

## Originating need

```text
NeedDeclared:
  id: need.meal.child-c.window-w
  scope: child-c + meal-window-w
  statement: Child C requires a safe, suitable meal during window W.
```

The child identifier is pseudonymous and scope-bound. A production fixture must not contain the child's name, image, address, diagnosis, or other unnecessary identifying information.

## Root capacity basis

The caregiver's originating capacity basis is `custodial` and/or `entrusted`, bounded by the child's welfare, applicable consent, and the care relationship.

It is not ownership of the child and does not include transferable dominion over the child's body.

> A caregiver may authorize coordination for a child's nourishment. That does not authorize compelled consumption, surveillance, publication, diagnosis, or unrelated control.

If the caregiver's standing, identity, custodial basis, or relevant care authority is unresolved, the declaration cannot become provisionally active merely because providing food appears benevolent.

## Governing purpose

Purpose identifier: `purpose.satisfy-meal-need`

Exact declaration:

> Satisfy the declared meal need of Child C during window W by making a safe, suitable meal materially available and supporting its voluntary consumption. Do not close the need as fulfilled unless consumption is responsibly confirmed. Preserve only the minimum evidence necessary to distinguish fulfillment, partial fulfillment, refusal, substitution, and uncertainty.

This is intentionally not named `DeliverFood` or `ProveChildAte`.

- Delivery completes a logistical act.
- Voluntary sufficient consumption is the desired consequence.
- Responsible confirmation supports a fulfillment judgment.
- None of those facts alone proves authorization, compatibility, or faithful stewardship.

## Protected commitments

1. Bodily autonomy and the child's right to decline.
2. Dignity and freedom from pressure, punishment, or evidentiary performance.
3. Privacy and data minimization.
4. Food safety and suitability for known dietary constraints.
5. Honest reporting, including `outcome_unknown`.
6. Scope limitation to the declared meal window and child.
7. No medical inference or care-plan alteration without separate authority.
8. No publication or secondary use of meal-thread evidence.

## Fatherhand grant boundary

Permitted candidate capabilities:

```text
declare_meal_need
declare_subordinate_meal_purpose
purchase_meal
prepare_meal
transport_meal
offer_meal
confirm_meal_disposition
report_meal_disposition
request_safe_substitution
```

Explicitly absent or prohibited:

```text
compel_consumption
punish_refusal
photograph_child_by_default
record_child_by_default
publish_meal_evidence
infer_medical_condition
alter_care_plan
redirect_food_outside_scope
close_need_without_supported_disposition
```

A subordinate provider may receive purchase, preparation, transport, offer, and bounded reporting capabilities. The provider does not thereby receive `amend_build_intent`, `supersede_build_intent`, `revoke_build_intent`, or authority to change the child's care plan.

## Purpose witnesses

Activation requires the policy's heterogeneous witness set in addition to valid Fatherhand authority.

### Human intentional witness

Attests that the exact purpose, scope, constraints, and protected commitments were understood and intentionally adopted.

Where independent witness is required, the declarant cannot satisfy this role by self-witness.

### AI semantic witness

May attest that the declaration is coherent, operationally legible, and does not silently equate delivery, consumption, evidence, authorization, fidelity, or fulfillment.

It must surface ambiguity and may return `coherent_with_tensions` or `indeterminate`. It does not decide that the purpose is good, authorized, or fulfilled.

### Hive contextual witness

Binds the declaration to the exact graph state: originating need, active care commitments, known dietary constraints, authority path references, accepted plan references, unresolved tensions, and construction-context hash.

It does not vote on the child's need or infer purpose from graph density.

## Stewardship commission

```ts
const mealCommission = {
  id: "commission.meal.child-c.window-w",
  stewardId: "steward.provider-p",
  terminalGrantId: "grant.provider-p.meal-window-w",
  governingPurposeId: "purpose.satisfy-meal-need",
  originatingNeedId: "need.meal.child-c.window-w",

  beneficiaryRefs: ["beneficiary.child-c"],
  affectedScopes: ["scope.child-c.meal-window-w"],

  duties: [
    "prepare_or_obtain_safe_suitable_meal",
    "make_meal_materially_available",
    "support_voluntary_consumption",
    "report_disposition_honestly",
    "preserve_minimum_necessary_evidence"
  ],

  protectedCommitments: [
    "commitment.bodily-autonomy",
    "commitment.dignity",
    "commitment.privacy-minimization",
    "commitment.food-safety",
    "commitment.honest-reporting"
  ],

  prohibitedConsequences: [
    "coercion",
    "unnecessary-surveillance",
    "publication",
    "medical-inference",
    "out-of-scope-disclosure"
  ],

  reviewConditions: [
    "meal_declined",
    "outcome_unknown",
    "dietary_conflict",
    "safe_substitution_needed",
    "protected_commitment_challenged"
  ],

  surrenderConditions: [
    "authority_revoked",
    "authority_expired",
    "safe_fulfillment_impossible_within_scope",
    "caregiver_or_child_requests_stop_where_applicable"
  ]
};
```

Answerability follows the delegated capacity. A delivery subcontractor cannot erase the provider's answerability, and the provider cannot erase the caregiver's answerability for the authority and purpose the caregiver originated.

## Meal disposition

Disposition records the observed or responsibly reported material outcome. It is not itself a fulfillment judgment.

```ts
type MealDisposition =
  | "consumed"
  | "partially_consumed"
  | "declined"
  | "substituted"
  | "not_made_available"
  | "outcome_unknown";
```

The ordinary minimum evidence for `consumed`, `partially_consumed`, or `substituted` is a scoped human attestation from an authorized receiving caregiver or other policy-recognized witness.

The receipt must say what was reported. It must not inflate that into omniscient observation.

Photography, video, calorie ledgers, AI visual analysis, continuous monitoring, and publication are forbidden by default. They require a separately justified purpose, authority path, compatibility judgment, consent/privacy analysis, and policy—if permitted at all.

## Fulfillment

```ts
type FulfillmentResult =
  | "attempted"
  | "partial"
  | "scoped_complete"
  | "scope_uncertain";
```

The fulfillment scope is one declared meal need during window W. It is not a general judgment about nutrition, parenting, health, compliance, or the child.

## Expected scenarios

| Case | Authorization | Fidelity | Disposition | Fulfillment | Required response |
| --- | --- | --- | --- | --- | --- |
| Safe suitable meal offered; receiving caregiver attests sufficient voluntary consumption | valid | faithful | consumed | scoped_complete | close declared meal need |
| Safe suitable replacement is authorized, offered, and attested consumed | valid | faithful | substituted | scoped_complete | close with substitution preserved |
| Suitable meal offered; some consumed, need not confirmed satisfied | valid | faithful | partially_consumed | partial | continue, substitute, or declare follow-up need |
| Suitable meal offered; child declines without coercion | valid | faithful | declined | attempted | review or declare follow-up need; do not fabricate breach |
| Meal delivered; no responsible consumption report exists | valid | faithful or indeterminate | outcome_unknown | scope_uncertain | keep return path open; review |
| Food reaches the location but violates known dietary constraints | valid or indeterminate | breached | not_made_available or outcome_unknown | attempted or scope_uncertain | repair, substitute, review |
| Child consumes, but provider demanded an unnecessary photograph | valid | breached | consumed | scoped_complete | preserve fulfillment and privacy breach independently; repair/review |
| Child consumes through an act outside the grant's scope | invalid | breached or indeterminate | consumed | scoped_complete | preserve beneficial outcome and invalid authorization independently |
| Provider delivers faithfully but a downstream hand suppresses the disposition report | valid | drifted or breached | outcome_unknown | scope_uncertain | standing claim; restore return path; review |
| Graph density suggests the meal “probably happened,” but no disposition witness exists | valid | indeterminate | outcome_unknown | scope_uncertain | graph frequency cannot close the need |

## Standing

At minimum, policy should recognize standing for:

- the child, expressed directly or through an appropriate representative;
- the authorized caregiver;
- the receiving caregiver;
- the commissioned provider;
- a protected-commitment holder materially affected by the act;
- a party whose data, labor, food, or scope was used outside the commission.

Standing permits a challenge that must be heard. It does not confer authority to amend purpose, determine fault, or impose a remedy.

Example standing claims:

```text
The food was not suitable for the declared dietary constraints.
The child was pressured to create proof.
The meal was delivered but the return report was suppressed.
The thread was closed on delivery without consumption confirmation.
The evidence was used outside the meal scope.
The governing purpose no longer matches the active care commitment.
```

## Expected receipt separation

For every scenario, Jules must specify and preserve distinct artifacts:

1. `AuthorityValidationReceipt`
2. `PurposeCompatibilityReceipt`
3. `PurposeActivationReceipt`
4. human/AI/hive witness receipts
5. consequence/disposition witness receipt
6. `StewardshipReckoningReceipt`
7. any standing claim
8. any separately authorized response act

No artifact may grant capability merely because another artifact cites it.

## Adversarial assertions

1. Delivery alone cannot yield `scoped_complete`.
2. Responsible confirmation may support `scoped_complete`; it does not prove omniscient consumption.
3. The child's refusal cannot be recoded as provider breach without separate evidence.
4. Beneficial consumption cannot erase invalid authority, coercion, privacy breach, or displaced commitment.
5. A faithful authorized attempt cannot be recoded as fulfillment when outcome is unknown.
6. A witness receipt containing a permission or capability field fails schema validation.
7. Graph density, repeated references, or majority inference cannot produce a consumption disposition.
8. `ensure_child_ate` cannot be interpreted as `compel_consumption`.
9. A downstream delegation cannot omit duties, protected commitments, or the return-report requirement applicable to the delegated act.
10. Closing the need severs no surviving standing claim, repair duty, or audit trail.
11. A meal-purpose amendment cannot expand into diagnosis, punishment, publication, or general care-plan governance.
12. Missing or conflicted custodial basis produces `not_activated` or `indeterminate`, never `provisionally_active` on benevolence alone.
13. Minimal evidence is the default; stronger evidence requirements must be separately authorized and purpose-compatible.
14. The child is never required to become evidence machinery for the system.
15. Fulfillment, authorization, and fidelity remain independently reportable in every case.

## Jules work order

Before production code:

1. Reconcile this fixture with `FATHERHAND.md`, `ONTOLOGY.md`, `INVARIANTS.md`, Floor 1.0, and the adopted fulfillment vocabulary.
2. Produce exact schema candidates and failure codes without adding a `purpose`, `grant`, `standing`, `commission`, or `receipt` node kind to ontology v0.1.
3. Bind every fixture input to explicit scope, graph snapshot, activation-policy version, evaluator version, and authority-module identity.
4. Preserve unknown and indeterminate outcomes; do not insert favorable defaults.
5. Define the minimum-evidence policy without adding surveillance.
6. Prove through fixtures that authorization, fidelity, disposition, and fulfillment cannot substitute for one another.
7. Prove that no delegation can sever the consequence-return and challenge paths.
8. Stop and record a tension if current receipt, hashing, scope, or fulfillment contracts cannot represent the fixture losslessly.
9. Only after canonical serialization is adopted, mint hashed executable fixtures and move them to the repository's canonical fixture path.

## Compressed fixture law

> The purpose aims at the child actually eating. The steward owes the faithful, privacy-preserving acts within the steward's control. Fulfillment records what responsibly became known. None may impersonate the others.

> Delivery satisfies the logistical act. Consumption satisfies the meal purpose. Stewardship answers for how capacity crossed between them.
