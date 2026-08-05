# Irreducible Residual Test v0.1

## Acceptance claim

The Irreducible Residual Test identifies declared historically material source features, verifies their treatment in a reconstruction, and prevents an altered output from entering the historical-reproduction path without explicit disclosure.

## Constitutional rules

1. Values are stored in addressed envelopes. Callers never supply the hash inside the value being hashed.
2. JSON values are addressed using RFC 8785 JCS canonical serialization.
3. Original media artifacts are hashed from their raw bytes. Format metadata is not substituted for the source bytes.
4. Exact residuals bind to an immutable parent artifact and a format-specific locator.
5. `preserved_exactly` is verifier-derived from matching extracted payload hashes.
6. Historical status is categorical, not a similarity score.
7. `violated` is inadmissible under every claim.
8. Disclosed transformation or omission is lawful only outside the historical-reproduction path.

## v0.1 scope

The test fixture uses byte-backed stand-ins for manually declared audio slices. A production WAV extractor and immutable artifact-store adapter are deliberately deferred. The verifier boundary and acceptance behavior are executable now; media parsing is the next mechanical layer.

## Commands

```sh
npm install
npm run check
```
