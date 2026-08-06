# TranchNode v0.1 to Project0 Canonical Addressing Compatibility Map

## Direct Imports Available
- None natively as an npm package. `@project0/identity` is not published to the public npm registry. We must inline/port the Project0 canonical validation logic (specifically `validateForCanonicalization` from Project0 PR #28) into TranchNode directly.

## Thin Mappings Required
- `validateForCanonicalization`: The Project0 strict pre-canonicalization validation function must be ported to TranchNode and executed before passing objects to the underlying `json-canonicalize` library.
- `computeSemanticAddress`: Added to map Project0 domain prefixes (`Project0-Node-v1|`, etc.) into the hashing pipeline and format the output as a Base58 textual address.
- `parseSemanticAddress`: Added to correctly decode and validate textual addresses.

## Obsolete or Competing Helpers
- The existing `addressJson` helper in `src/residual.ts` currently allows the serialization of values that Project0 explicitly rejects, such as unsafe integers and undefined. It also fails to apply the necessary domain prefixes and Base58 string formatting. It is now deprecated, and `computeSemanticAddress` is the active Project0 identity path.

## Semantic Conflicts & Resolution
- **Unsafe Integers:** TranchNode previously serialized unsafe integers (e.g., `> Number.MAX_SAFE_INTEGER`) with silent precision loss. Project0 PR #28 explicitly rejects unsafe integers. Resolution: We will adopt Project0's behavior and throw `UNSAFE_INTEGER` for such values.
- **`undefined` Values:** TranchNode implicitly permitted or silently dropped `undefined`. Project0 explicitly throws `UNDEFINED_VALUE`. Resolution: Adopt Project0's rejection rule.
- **NaN / Infinity:** Project0 rejects these with `NON_FINITE_NUMBER`. Resolution: Adopt Project0's behavior.
- **Advanced Types:** BigInts, Symbols, and Functions are rejected by Project0 as `UNSUPPORTED_TYPE`. Resolution: Adopt Project0's behavior.
- **Structural Integrity:** Project0 strictly rejects cyclic objects, sparse arrays, custom prototypes, accessor properties, and non-enumerable properties to prevent adversarial hashing. Resolution: Implement all these structural guards in TranchNode's `addressJson` pipeline.
- **Timestamps:** Project0 mandates strict RFC 3339 UTC strings (`TIMESTAMP_REGEX`) for fields like `createdAt`. Resolution: `validateTimestamp` is fully implemented and mapped within the test pipeline. Note that `computeSemanticAddress` itself does not automatically validate or parse arbitrary schema fields to determine if they are timestamps. The caller/schema-validator must invoke `validateTimestamp` appropriately before canonicalization.

## Fully Mapped Identity Path
TranchNode fully implements and supports the exact Project0 domain-separated preimage and textual-address formation rules. No unresolved incompatibilities remain regarding structural hashing or address assignment.
