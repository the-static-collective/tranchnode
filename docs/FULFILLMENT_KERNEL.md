# Fulfillment kernel reconciliation

Issue #9 is the Layer 5 compatibility pass over the now-landed substrate. Fulfillment remains Need-centered domain law; it does not own identity, material storage, projection closure, or WAV residual extraction.

## Canonical boundary

Canonical fulfillment bodies do **not** store their own hash. They are addressed externally through the repository's shared `addressJson` path, which carries the Project0-compatible JCS and SHA-256 rules. Draft fixtures may be incomplete; canonical fixtures must be complete canonical bodies, but neither may embed self-referential identity.

## Substrate composition

`verifyFulfillmentAgainstSubstrate` composes the existing floor rather than reproducing it:

1. address the Need body through shared canonical identity and require `needSnapshotHash` to match it;
2. read every material artifact reference through the immutable artifact store, which verifies bytes against the requested address;
3. when a fulfillment references a projection receipt, verify the projection's ancestry and field-root closure and require every material field root to exist in the store;
4. when a fulfillment references exact WAV residual evidence, verify the named residual bindings through the real PCM extraction path;
5. only after those checks, externally address the fulfillment receipt itself.

The fulfillment layer never redefines source identity, artifact identity, projection ancestry, field-root admission, sample coordinates, PCM parsing, or residual hashing.

## Domain law retained

- Need remains the center of the workflow.
- A fulfillment receipt records a scoped reported crossing; it does not declare moral completion.
- Witness is observation, not objective certification.
- Unknown provenance remains unknown and cannot acquire joins, offers, or external provenance by implication.
- Disclosure policy is explicit and remains distinct from generic claims of consent.
- Need status, remaining scope, and `stillCalling` are derived projections and never canonical Need fields.
- The child may remain telos without becoming telemetry.

## Fixture discipline

- `fixtures/drafts/fulfillment/` contains incomplete working bodies.
- `fixtures/canonical/fulfillment/` contains complete canonical bodies suitable for external addressing.
- Canonical fixtures must never contain `canonicalHash` or any equivalent self-identity field.
- Tests exercise the canonical fixture against shared identity, immutable material storage, field-root closure, and real WAV PCM residual verification.

## Non-goals

This slice does not expand TranchNode's philosophy, add a second canonicalizer, create a fulfillment-local artifact store, reinterpret projection semantics, or introduce new residual formats. Those would violate the separation #9 exists to restore.
