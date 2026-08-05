# Covenant Circuit mapping matrix

## Status

First reviewable deliverable for TranchNode issue #13.

This matrix tests whether the NanaSpork Covenant Circuit can be expressed as a domain module over ontology v0.1 without adding universal node kinds, edge kinds, cross-scope traversal, or a competing address chain.

## Pinned sources

| Source | Revision | Authority in this slice |
|---|---|---|
| TranchNode ontology v0.1 | `main@9ed9de48ebc29af16da215232452da4c7deef0e6` | frozen substrate contract |
| Continuity constitution | `63719504b3c065f10bcf0e140a1849a4b703c31c` | constitutional continuity law |
| Project Lego Floor 1.0 | `30cb0c16878e4a42a603a34f51b43ca497e9cab1` | integration and anti-drift floor |
| Project0 ontology/edge compatibility | `9bf3870dfcbe573d1a94c69bb2e2b846da3d91cd` | compatibility boundary |
| Fatherhand + NanaSpork fixture | draft PR #12 head `8f9bbc9ef35f82280a251a031300587a3ad7effc` | pinned design source; intentionally not canonical |

Git and GitHub references are provenance only. This slice does not mint construction receipts or canonical fixture hashes.

## Representation rule

Authority-module records remain domain artifacts. Where they are projected into a TranchNode graph, `content.domainType` carries the domain label and the existing node kind retains its frozen meaning. A nearby edge kind is not used when its endpoint law would misstate the authority relation.

A `source` projection means “addressable immutable authority-module artifact,” not “this source grants authority.” A `witness` projection attests encounter or acceptance only. It never grants capability.

## Matrix

| Concept / requirement | FATHERHAND.md source | NanaSpork fixture source | Floor 1.0 source | ontology v0.1 representation | Existing node kind | Existing edge kind | Domain label / payload | Loss or ambiguity | Status |
|---|---|---|---|---|---|---|---|---|---|
| Declared meal need | Covenant Circuit begins at need or originating charge | `NeedDeclared` for Child C and meal window W | Domain/application material must not enlarge substrate | A need may be asserted as an unresolved durable call | `tension` | none required | `domainType: "NeedDeclared"`, scope, statement | Authority to declare the need is external to the node kind | `representable_with_label` |
| Purpose declaration before activation | Purpose declaration and activation are separate | Exact purpose: make a safe suitable meal available and support voluntary consumption | Candidate domain forms remain proposals until admitted by their own law | Project the declaration as a candidate action/structure | `proposal` | `responds_to` may point to the need when the authored relation is literally a response | `domainType: "PurposeDeclaration"`, exact text, authority artifact refs | Activation state and purpose-governance relation remain authority-module fields | `representable_with_label` |
| Purpose activation receipt | Receipt evaluates authority and witness gates; it does not perform activation or grant capacity | Required before commissioning | Receipts remain outside substrate canon unless promoted explicitly | Store or reference the immutable evaluator artifact | `source` | `qualifies` may narrow the purpose proposal only when the receipt is explicitly authored as a qualifier | `domainType: "PurposeActivationReceipt"`, policy version, result, reason refs | No v0.1 edge means “activates”; that relation must stay in payload/module logic | `representable_with_label` |
| Heterogeneous witness receipts | Human, AI, and hive witnesses answer different questions and cannot substitute | Intentional, semantic, and contextual witnesses are required by policy | Preserve role boundaries; do not flatten different Lego families | Each accountable attestation may project independently | `witness` for actual attestations; `source` for opaque receipt artifacts | `witnesses` only from a witness node to the artifact actually encountered or accepted | `domainType` distinguishes human, semantic, contextual witness receipts | `witnesses` cannot mean permission, truth, activation, or capability | `representable_with_label` |
| Stewardship commission | Joins a valid grant and governing purpose to duties and answerability | Meal commission names duties, commitments, review and surrender conditions | Domain kernel, not universal ontology | Store/reference commission as immutable domain artifact | `source` | none required | `domainType: "StewardshipCommission"`, terminal grant, purpose, duties, commitments | No exact v0.1 edge expresses commission or delegation; do not alias `depends_on` into authority | `representable_with_label` |
| Meal provision act | Authorized act follows commission | Prepare/obtain and materially offer safe suitable meal | Application act may be witnessed without becoming substrate primitive | Reported performance may be represented as inspected state | `observation` | `responds_to` may point to the need or commission projection only when it records intentional response, not authorization | `domainType: "MealProvisionAct"`, capabilities exercised, safety/suitability, disclosures | Observation does not prove authority, fidelity, or consequence | `representable_with_label` |
| Meal disposition | Consequence must return before reckoning can claim fulfillment | `consumed`, `partially_consumed`, `declined`, `substituted`, `not_made_available`, `outcome_unknown` | Preserve uncertainty and source boundaries | Reported material outcome is a scoped observation | `observation` | a responsible `witness` node may `witnesses` the disposition observation | `domainType: "MealDisposition"`, value, witness policy, scope | A report remains a report, not omniscient knowledge | `representable_with_label` |
| Consequence witness | Witness persists and makes consequence legible; it does not grant capacity | Responsible receiving caregiver or policy-recognized witness | Witness and truth remain distinct | Accountable attestation to the disposition | `witness` | `witnesses` | `domainType: "ConsequenceWitnessReceipt"`, disposition ref, witness role | Witness sufficiency is evaluated by domain policy, not by edge existence alone | `representable_with_label` |
| Stewardship reckoning | Authorization, fidelity, and fulfillment remain independent | Every scenario must preserve distinct outputs | Evaluation is derived and must not rewrite source artifacts | A pure derived conclusion over named authority-module inputs | `inference` | `derived_from` to projected input artifacts when all are in the same scope | `domainType: "StewardshipReckoningReceipt"`, three independent axes, reasons | Canonical receipt envelope and addressing remain blocked on Project0/TranchNode issue #5 | `representable_with_label` |
| Authorization output | Was the hand lawfully permitted to act? | Beneficial consumption may coexist with invalid authority | Authority belongs above ontology v0.1 | Field in reckoning payload, derived from explicit grant-chain evidence | `inference` as part of reckoning | `derived_from` only | `authorization: valid | invalid | indeterminate` | Cannot be inferred from actor identity, signatures alone, witnesses, purpose, or outcome | `exact` |
| Fidelity output | Did the act preserve purpose, duties, and protected commitments? | Unauthorized disclosure or demanded proof may breach fidelity even when the child eats | Domain evaluation remains bounded by declared commitments | Independent field in reckoning payload | `inference` as part of reckoning | `derived_from` only | `fidelity: faithful | drifted | breached | indeterminate` | Fidelity is not authorization and does not establish consumption | `exact` |
| Fulfillment output | What responsibly became known relative to the originating need? | Delivery without disposition is uncertain; consumption may complete scope | Fulfillment cannot be manufactured by integration convenience | Independent field in reckoning payload | `inference` as part of reckoning | `derived_from` only | `fulfillment: attempted | partial | scoped_complete | scope_uncertain` | Requires policy-recognized disposition evidence for completion | `exact` |
| Child refusal without coercion | Adverse outcome does not itself prove breach | Declined meal can yield valid / faithful / attempted | Preserve plurality and non-flattening | Disposition observation plus independent reckoning | `observation` + `inference` | `witnesses`, `derived_from` | refusal remains a disposition, not a moral or authority verdict | None when the axes remain separate | `exact` |
| Child eats after unauthorized disclosure | Favorable fulfillment cannot erase unauthorized action or displaced commitment | Consumed after disclosure may be complete while authorization is invalid or fidelity breached | Contradictions remain visible rather than compressed away | Independent receipt fields preserve disagreement | `inference` | `derived_from` | authorization/fidelity/fulfillment disagree explicitly | No substrate change required | `exact` |
| Graph density without responsible witness | Hive frequency cannot create governing intent or completion | Repeated meal references cannot produce a disposition | Similarity, recency, witness, and support are distinct | Absence of an eligible witness path remains absence | none added | none added | evaluator may report evidence density as diagnostic only | v0.1 has no closed-world proof of absence; evaluator is snapshot-bound and must say `scope_uncertain` | `representable_with_label` |
| Return path cannot be omitted downstream | Answerability for exercised capacity may not disappear | Downstream hand suppressing disposition/reckoning is incomplete execution | Domain module must preserve lineage without inventing new edge law | Commission payload carries required return duties; evaluator checks their presence | `source` + `inference` | existing provenance edges only where literally true | `execution: "incomplete_execution"`, reason refs | No exact v0.1 delegation edge; enforcement remains authority-module logic | `representable_with_label` |

## Contradiction check

No row in this bounded slice requires a new universal node kind, edge kind, cross-scope semantic, or hash chain.

The mapping is sufficient for a fixture-local pure evaluator because the evaluator consumes labeled domain records and emits a noncanonical receipt. It is **not** sufficient to declare production authority storage, canonical fixture identity, signature validation, or seal-chain integration complete.

## Permitted executable slice

The next commit may add one zero-dependency representative-carrier fixture that proves:

1. `valid / faithful / scope_uncertain` when provision is faithful but no responsible disposition witness exists;
2. `invalid / breached / scoped_complete` when the child eats after an unauthorized disclosure;
3. graph density never substitutes for a disposition witness;
4. evaluator inputs remain byte-for-byte structurally unchanged.

## Deferred by existing issue boundaries

- production `authority-module/types.ts`;
- canonical grant-body hashing and signature-chain validation;
- canonical receipt envelopes and fixture minting;
- storage and replay integration;
- the complete ten-case suite;
- production NanaSpork lifecycle wiring.

Those remain blocked until the repository has one adopted addressing law and issue #13's full matrix is accepted for implementation expansion.
