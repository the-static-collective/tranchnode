# TranchNode v0.1 vs Project0 Compatibility Map

## Baseline Command and Output
```sh
npm install
npm run check
```
```
> tsc --noEmit && node --test --import tsx test/**/*.test.ts
TAP version 13
# Subtest: characterization: numeric boundaries and unsafe integers
ok 1 - characterization: numeric boundaries and unsafe integers
# Subtest: characterization: canonical-address compatibility
ok 2 - characterization: canonical-address compatibility
# Subtest: characterization: timestamp rules
ok 3 - characterization: timestamp rules
# Subtest: characterization: raw artifacts versus semantic addresses
ok 4 - characterization: raw artifacts versus semantic addresses
# Subtest: JCS addressing excludes caller-supplied envelope hashes
ok 5 - JCS addressing excludes caller-supplied envelope hashes
# Subtest: exactly preserved residuals admit historical reproduction
ok 6 - exactly preserved residuals admit historical reproduction
# Subtest: disclosed omissions remain creative but cannot enter historical path
ok 7 - disclosed omissions remain creative but cannot enter historical path
# Subtest: adversarial smoothing is VIOLATED and inadmissible under every claim
ok 8 - adversarial smoothing is VIOLATED and inadmissible under every claim
1..8
# pass 8
```

## Inventory

- **Public Types:** JsonValue, NodeKind, EdgeKind, EpistemicState, TranchNode, TranchEdge, AcceptedOperation, AcceptedEvent, EvaluationSnapshot, EvidencePath, ClaimEvaluation, Hash, Claim, HistoricalStatus, Outcome, Addressed, ArtifactRef, SampleLocator, ResidualBinding, FieldNode, ResidualEvidence, ReconstructionReceipt, VerifiedResidual, Verification.
- **Serialized Forms:** Canonical JSON (RFC 8785 JCS). `undefined`, non-finite number, executable value, or cyclic objects are rejected.
- **Addressing / Hashing:** SHA-256 digests in `"sha256:{hex}"` format.
  - JSON objects are addressed via the SHA-256 of their canonical JCS UTF-8 bytes.
  - Callers cannot supply hashes inside the value being hashed.
  - Raw original media artifacts are hashed from their raw bytes, unmediated by their semantic envelope.
- **Receipt Structures:** ReconstructionReceipt holds `fieldHash`, output ArtifactRef, Claim, evidence rules, and perceptual scores. Explicit distinction between "preserved_exactly", "preserved_by_reference", "transformed_with_disclosure", "omitted_with_disclosure", and "violated".
- **Graph Invariants:**
  - Append-only lineage. Lineage is tracked as explicitly appended events.
  - Events have contiguous sequence inside scope.
  - deterministic replay based on contiguous seq numbers inside scope.
  - Edges and endpoint nodes must share a `scopeId`. No cross-scope edges (implicit traversal).
  - Determinstic traversal without cycle, never repeating nodes/edges, shortest evidence path priority with lexicographical tie-breakers.

## Compatibility Matrix

| Project0 Mapping Request | Classification | Notes |
| --- | --- | --- |
| Node kinds (source, observation, claim, inference, proposal, tension, witness, harvest) | Lossless | TranchNode v0.1 exactly matches these 8 kinds. |
| Edge kinds (derived_from, supports, contradicts, qualifies, depends_on, supersedes, responds_to, witnesses, harvests) | Lossless | TranchNode v0.1 exactly matches these 9 edge kinds. |
| Rejection representation (`rejection` node kind) | Unavailable | Missing from TranchNode v0.1 ontology. Do not alias (e.g. to tension). |
| Cross-scope edges | Blocked pending Project0 Issue #5 | v0.1 forbids cross-scope edges and implicit traversal. Cannot smuggle in existing edges. |
| Bridge receipts | Blocked pending Project0 Issue #5 | Requires explicit ontology version with cross-scope authorization semantics. |
| Basis/reason fields | Lossless | Nodes mapped via `content` to contain basis details. supersession events explicitly take `reasonNodeId`. |
| Attribution versus authority | Lossless | `authorId` vs `actorId` vs `sourceModel`. Model origination grants no authority. Authority resides in policy checks. |
| Append-only lineage | Lossless | Changes via explicitly validated operations `create_node`, `create_edge`, `dispute_edge`, `supersede_edge`. No in-place modification. |
| Canonical-address compatibility | Lossless | JCS RFC 8785 strict sort format used. |
| Numeric boundaries and unsafe integers | Lossy with declared information loss | Node JS/JCS truncates precision over `MAX_SAFE_INTEGER` boundaries unless serialized as string. |
| Timestamp rules | Lossless | `createdAt` stored as RFC 3339 strings but do not determine graph sorting (sequence dictates). |
| Raw artifacts versus semantic addresses | Lossless | Kept strictly distinct. Raw media are bytes; JSON objects are hashed by structural representation. |
| Receipt identity and domain separation | Lossless | Receipt `fieldHash` distinct from structural body properties. Caller does not set the enclosing address. |

## Lossless Mappings: Proposed Fixtures

### Node / Edge Creation
```json
{
  "type": "create_node",
  "node": {
    "id": "node_1",
    "kind": "claim",
    "content": { "text": "The door was locked." },
    "scopeId": "scope_alpha",
    "authorId": "user_a",
    "createdAt": "2026-08-01T13:26:55Z",
    "epistemicState": "asserted"
  }
}
```

### Append-only Supersession Lineage
```json
{
  "type": "supersede_edge",
  "edgeId": "edge_old",
  "replacementEdgeId": "edge_new",
  "reasonNodeId": "node_reason_1"
}
```

### Raw vs Semantic Addresses & Deterministic Addressing
```json
{
  "kind": "reconstruction_receipt",
  "fieldHash": "sha256:...",
  "outputArtifact": {
      "hash": "sha256:...",
      "mediaType": "audio/wav",
      "byteLength": 1024
  },
  "claim": "historical_reproduction",
  "decoder": { "id": "test_decoder", "version": "1.0" },
  "perceptualScores": { "phenomenal": 0.9, "semantic": 0.8, "structural": 0.95 },
  "evidence": []
}
```

## Explicit Incompatibilities and Unresolved Tensions
- **Rejection Nodes:** Project0 adds `rejection` as a node type; TranchNode v0.1 lacks this type, preventing lossless graph representations of rejection without introducing custom conventions not backed by the core kernel validation checks.
- **Cross-Scope Relations:** Any multi-context references (cross-scope) requested by Project0 are impossible in TranchNode v0.1 and cannot be creatively bypassed.
- **Numbers:** Extreme precision (unsafe integer) numbers risk silent transformation during canonical serialization.
