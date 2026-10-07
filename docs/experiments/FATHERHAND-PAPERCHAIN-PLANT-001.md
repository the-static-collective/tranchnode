# FATHERHAND-PAPERCHAIN-PLANT-001

**Status:** bounded cross-project capacity witness  
**Owner:** TranchNode / Fatherhand  
**Consumer:** reLATTE PAPERCHAIN GERMINATION-002

## Purpose

This slice answers one narrow question before a Paperchain seed may be planted:

> Does the terminal hand hold the exact delegated capacity, exact seed/crossing scope, and exact germination purpose required for this PLANT act?

It does **not** activate the act.

```text
FATHERHAND
  grant chain
      ↓
exact capacity + scope + purpose validation
      ↓
Paperchain PLANT capacity witness
      ↓
reLATTE may inspect/bind the witness

CAPACITY != CONSENT
VALIDATION != ACTIVATION
FATHERHAND RECEIPT != RELATTE ADMISSION
```

## Fixed required act

The adapter does not allow the caller to choose a looser capability or purpose.

```text
capability = paperchain.plant
purpose    = purpose:paperchain:germination
scope      = [seed_id, held_seed_crossing_id]
```

The scope is exact-set material under the current Fatherhand validator. A terminal grant missing either exact ref fails.

## Execute

```bash
npm run fatherhand-paperchain-plant -- \
  fixtures/fatherhand-grant-chain/paperchain-plant-valid.json
```

or pipe the same request schema on stdin:

```bash
cat request.json | npm run fatherhand-paperchain-plant
```

The emitted document uses:

```text
tranchnode/fatherhand-paperchain-plant-witness/v0.1
```

and contains the underlying deterministic Fatherhand authority-validation receipt.

## Consumer boundary

reLATTE must not reimplement the grant-chain evaluator.

A consumer may:

- require the witness schema;
- require `capacityState = valid`;
- bind the exact seed ID and held crossing ID;
- require the exact capability and purpose above;
- bind the raw witness bytes by digest into its own crossing;
- preserve Fatherhand ID, terminal grant ID, and evaluator version as foreign evidence.

A consumer must not infer:

- human identity from the Fatherhand IDs;
- cryptographic authenticity from this witness;
- activation from validation;
- local admission from capacity;
- universal jurisdiction from a root capacity basis.

The current FATHERHAND-001 validator explicitly does not yet provide cryptographic grant seals/signatures. Therefore this bridge is deterministic capacity evidence, not a signed delegation protocol.

## Cross-project composition

```text
HELD PAPERCHAIN SEED
        │
        ├───────────────┐
        │               │
        ▼               ▼
literal PLANT      Fatherhand witness
(local choice)     (bounded capacity)
        │               │
        └───────┬───────┘
                ▼
        fresh reLATTE
        PLANT crossing
                ▼
        receiver-local ADMIT
                ▼
             CHILD
```

Neither gate substitutes for the other.

## Laws

```text
CAPACITY != CONSENT
CONSENT != CAPACITY
VALIDATION != ACTIVATION
FATHERHAND RECEIPT != RELATTE ADMISSION
NO HAND MAY GIVE WHAT IT DID NOT RECEIVE
NO HAND MAY ENLARGE WHAT IT RECEIVED
NO HAND MAY CONCEAL THE HAND ABOVE IT
```
