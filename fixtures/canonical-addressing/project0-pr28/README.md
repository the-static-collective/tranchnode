# Project0 Canonical Addressing Fixtures

These fixtures were extracted from Project0 PR #28 to ensure TranchNode adheres to the Project0 identity and hashing rules.

- **Source Repository:** `the-static-collective/project0`
- **PR:** #28
- **Commit SHA:** `c686909197263b95a8d71809fc257368c55b9b92`

## Files (Copied Verbatim)

The following files were copied verbatim:
- `cyclic_value.json`
- `exponent_boundaries.json`
- `invalid_timestamp_precision.json`
- `invalid_timestamp_type.json`
- `invalid_timestamp_tz.json`
- `lone_surrogate.json`
- `malformed_textual_hash_bad_b58.json`
- `malformed_textual_hash_bad_length.json`
- `malformed_textual_hash_wrong_prefix.json`
- `nan_and_infinities.json`
- `recursive_undefined.json`
- `sparse_array.json`
- `unsupported_map.json`
- `valid_timestamp.json`

## Note on Usage in TranchNode

TranchNode runs these fixtures through `src/residual.ts`'s `validateForCanonicalization`. The testing harnesses map Project0's expected errors to the expected assertions. Some Project0 node structures inside the fixtures may not exactly match TranchNode ontology, but they are used strictly to test the canonicalization bounds (e.g. numeric boundaries, sparse arrays, undefined types) rather than full node schema verification.
