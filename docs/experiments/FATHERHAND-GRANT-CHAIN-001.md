# FATHERHAND-GRANT-CHAIN-001

Status: **bounded deterministic authority-module experiment**

This slice implements the one Fatherhand organ preserved as residue after PLANZ HEART-001 refused restoration of the historical Fatherhand body.

It does **not** restore Fatherhand as a parallel governance system.

## Question

Can TranchNode evaluate one explicit chain of delegated capacity without allowing a downstream hand to:

1. give what it did not receive;
2. enlarge what it received;
3. conceal the hand above it;
4. revive extinguished capacity;
5. transform purpose while preserving only form?

## Executable profile

The validator consumes:
- explicit grant records;
- one terminal grant;
- one exact required act capability;
- bounded exact-set scope refs;
- one governing purpose id;
- one caller-supplied evaluation instant.

The chain is followed by `parentGrantId`, not by display text.

Immediate ancestry also requires exact `parentSeal` linkage.

## Laws enforced

```text
CHILD CAPABILITY ⊆ PARENT DELEGABLE CAPABILITY
CHILD SCOPE      ⊆ PARENT DELEGABLE SCOPE

CHILD GRANTOR = PARENT GRANTEE
CHILD PARENT SEAL = PARENT SEAL

NONTRANSFERABLE PARENT → NO CHILD
REVOKED / EXPIRED SOURCE → NO LIVE CHAIN
EXTINGUISHED CAPABILITY → NO REVIVAL

CHILD PURPOSE
→ must expose exact parent purpose
→ may only be identical / narrow / operationalize / preserve
```

A terminal authorization additionally requires the exact requested:
- capability;
- scope;
- governing purpose.

## Root boundary

The root grant must declare a `RootCapacityBasis` and a basis reference.

If the basis is `indeterminate`, the validator returns `indeterminate` rather than laundering a structurally tidy chain into originating authority.

Even a non-indeterminate basis does not prove universal jurisdiction or rightful ownership.

## Deliberate non-claims

This slice does **not** implement:
- canonical grant-body hashing;
- cryptographic signature verification;
- production key management;
- universal scope algebra;
- purpose compatibility graphs;
- cross-scope bridges;
- renewal or revocation acts;
- ontology promotion.

`parentSeal` is checked only as explicit supplied linkage.

This preserves the current TranchNode boundary that canonical addressing and signature-chain verification require a separately adopted repository-wide law.

## Relationship to current Covenant Circuit

This organ supplies only the missing **Authorization** evaluator seam.

It does not replace:
- PurposeActivationReceipt;
- human / semantic / contextual witnesses;
- StewardshipCommission;
- consequence witnesses;
- authorization / fidelity / fulfillment reckoning.

```text
GRANT-CHAIN VALIDITY
!=
PURPOSE COMPATIBILITY
!=
ACTIVATION
!=
FIDELITY
!=
FULFILLMENT
```

## Golden fixture

`fixtures/fatherhand-grant-chain/valid-three-hand.json`

proves a three-hand narrowing chain:

```text
A
→ B
→ C
```

where C may exercise one exact capability over one exact narrowed scope under one explicitly descended purpose.

Adversarial tests cover:
- capability enlargement;
- scope enlargement;
- hidden/substituted parent;
- extinguished-capability revival;
- nontransferable parent;
- expired ancestry;
- purpose replacement;
- terminal act overreach;
- indeterminate root basis;
- deterministic replay and input immutability.

> **Capacity may descend. It may not grow merely because it traveled.**
