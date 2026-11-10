# COLLECTIVE-003 — An installable TranchNode field node

**Status: experimental / opt-in / source-controlled PWA.** This is a usable browser app, not an Android APK and not yet an autonomous peer-discovery network.

## Purpose

Each browser profile or device maintains its own non-exportable P-256 private signing key, source statements, incoming evidence, and locally replayable append-only event ledger. A participant may select individual self-authored graph assertions and export a signed JSON testimony bundle. A different installed copy may verify and explicitly accept that bundle as a locally scoped source without acquiring the author's authority.

This extends COLLECTIVE-002 (separate loopback OS processes) to a human-facing, offline-capable, installable interface. It does not claim that WebCrypto keys are real-person identities, that signed statements are facts, or that a human operates every node.

## The real boundaries

- **Application:** Static, offline-first PWA in apps/collective. No external dependencies or telemetry. WebCrypto and IndexedDB require HTTPS or localhost.
- **Local witness memory:** kernel.mjs creates immutable canonicalizable claim/source nodes and accepted create_node events with deterministic replay, sequence and previous-event hash checks. Supported subset only.
- **Transport:** Manually export, send, and import JSON bundles. Outbound sharing is selected by the human and grants readability to anyone holding the file. There is no peer authentication beyond public-key possession, no receiver-specific encryption, no automatic mesh transport, no revocation.
- **Import:** Public-key ECDSA P-256 signature verification. Imported cards become new local source nodes with the signed original envelope and original scope reference; no cross-scope edges or inherited witness status.
- **Reasoning:** Bounded, classical breadth-first graph reachability from asserted connections. Each path carries evidence IDs. Unknown isn't false; contradictory testimony produces HOLD. This does not invoke an LLM, run general MOTIF cartridges, or show superior intelligence over centralized BFS.
- **Evidence output:** An exportable answer packet contains the question, status, local ledger head, supporting immutable nodes, and scope limitations. It is a derivation receipt, not a mathematical proof of external-world truth.

## Testing

Run from the repository root, with Node.js 22+:

    node --test test/collective-app.test.mjs
    node --check apps/collective/kernel.mjs
    node --check apps/collective/app.mjs
    node --check apps/collective/store.mjs
    node --check apps/collective/sw.js

The tests exercise signing keys, private scopes, explicit source selection, cryptographic tamper rejection, multiple-node exchange, no-transitive-sharing, duplicate protection, contradictory testimony, unknown-when-withheld, and replay failures. npm run check remains the canonical baseline for the existing repository.

## Installation

Serve the apps/collective directory on HTTPS. For local development:

    cd apps/collective
    python3 -m http.server 8000

Open http://localhost:8000/ in Chromium on the same computer. On a phone, localhost refers to the phone, not your development computer: use a real HTTPS origin for mobile installation.

After publishing to HTTPS, on Android Chrome use the menu → Install app (or Add to Home screen, if offered). The app caches its shell for offline use; file exchange still requires sending the JSON file between devices.

The repository's workflow collective-pages.yml can deploy from main after the administrator enables GitHub Pages with GitHub Actions as its source. Including a workflow does not establish a live URL.

## Demonstration

1. On device A, record A → B. On B, record B → C.
2. On A, ask for A → C: UNKNOWN.
3. On B, select only B → C and choose Export selected testimony.
4. Transfer the signed JSON file to device A.
5. On A, choose the file, Verify and preview, inspect the signing-key fingerprint, and Admit sources.
6. Ask for A → C: a conditional path appears, with evidence IDs. A still cannot infer that a signing key belongs to a particular person or that the edges exist in reality.

For three nodes, add C → D on C and share its statement to A.

## Privacy and limitations

- Do not enter sensitive or confidential data in this research build. It has not been independently security audited.
- Clearing browser site data permanently loses the private key and local event log. There is no backup or recovery.
- The private key is non-exportable through WebCrypto, but same-origin JavaScript can request signatures. Hosted code updates are part of the trust boundary.
- Signing verifies key possession only; compare fingerprints over a separately trusted channel to associate them with people.
- Bundles are not encrypted or cryptographically revocable; anyone receiving one can read, copy, or forward it.
- Event hashes detect accidental and simple tampering, not a local attacker who can rewrite all unsigned events.
- The canonical TranchNode kernel and edge ontology have more validation requirements. This app implements a deliberately bounded create_node subset, not the full canonical kernel.
- Restricted safe-integer JSON canonicalization here is not a general RFC 8785 implementation. It cannot replace Project0/TranchNode canonical addressing.
- Every inference is conditional on recorded assertions. No independently verified world truth or general emergent intelligence is claimed.

## Next: COLLECTIVE-004

Integrate the full validated TranchNode event kernel and MOTIF COLLECTIVE-001 proof-carrying answer weave; add explicit identity pinning, key rotation, encrypted recipient-scoped sharing, revocation semantics, optional relay/WebRTC exchange, multi-device offline reconciliation, hostile input tests, and equal-information/equal-compute controls before claiming improved collective reasoning.
