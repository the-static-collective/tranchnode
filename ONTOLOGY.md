# TranchNode Ontology v0.1

This document freezes the smallest graph language needed to evaluate one claim without flattening its history.

The ontology describes durable meaning. Authorization, storage, transport, embeddings, user interfaces, and model providers are replaceable implementations around it.

## Core Types

```ts
type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

type NodeKind =
  | "source"
  | "observation"
  | "claim"
  | "inference"
  | "proposal"
  | "tension"
  | "witness"
  | "harvest";

type EdgeKind =
  | "derived_from"
  | "supports"
  | "contradicts"
  | "qualifies"
  | "depends_on"
  | "supersedes"
  | "responds_to"
  | "witnesses"
  | "harvests";

type EpistemicState =
  | "asserted"
  | "inferred"
  | "disputed"
  | "witnessed"
  | "superseded";

interface TranchNode {
  id: string;
  kind: NodeKind;
  content: JsonValue;
  scopeId: string;
  authorId: string;
  createdAt: string;
  sourceModel?: string;
  epistemicState: EpistemicState;
}

interface TranchEdge {
  id: string;
  kind: EdgeKind;
  fromId: string;
  toId: string;
  scopeId: string;
  authorId: string;
  createdAt: string;
  sourceModel?: string;
}
```

Nodes and edges are immutable assertions. Their acceptance, dispute, or supersession is recorded in events; none is edited in place.

`content` must be canonical JSON. It may contain text, structured data, or a reference to an external artifact, but it may not contain executable behavior or provider-specific runtime objects.

`createdAt` records asserted wall-clock time. It never determines durable order. `sourceModel` records model provenance when a model originated a proposal; it grants no authority.

## Node Meanings

| Kind | Meaning |
| --- | --- |
| `source` | An addressable primary artifact or verbatim excerpt. |
| `observation` | A reported perception, measurement, or directly inspected state. |
| `claim` | A truth-apt assertion that can receive support or contradiction. |
| `inference` | A conclusion derived from other nodes rather than directly observed. |
| `proposal` | A possible action, interpretation, structure, or change not yet adopted. |
| `tension` | An unresolved contradiction, question, need, or incompatible constraint. |
| `witness` | An accountable attestation that another node, event, or state was encountered or accepted. |
| `harvest` | A current usable form assembled from prior material without erasing the route or remaining tensions. |

Kind is not rank. In particular, a confident inference does not become an observation, and a witness does not replace the source it witnesses.

## Edge Direction and Meaning

Every edge is written as `fromId --kind--> toId`.

| Kind | `fromId` | `toId` | Meaning |
| --- | --- | --- | --- |
| `derived_from` | Derived node | Antecedent or source | The first node was produced from the second. |
| `supports` | Evidence or argument | Supported node | The first node provides positive support for the second. |
| `contradicts` | Contesting node | Contested node | The first node asserts opposition to the second. Opposition is discoverable from either endpoint, but authored direction is preserved. |
| `qualifies` | Qualifier | Qualified node | The first node narrows, conditions, or limits the second. |
| `depends_on` | Dependent node | Prerequisite | The first node cannot stand or be acted on without the second. Dependence is not itself proof. |
| `supersedes` | Replacement | Prior node | The first node replaces the second as the applicable form while retaining it in lineage. |
| `responds_to` | Response | Earlier node | The first node intentionally answers or reacts to the second. |
| `witnesses` | Witness node | Witnessed node | The first node attests to encountering or accepting the second. |
| `harvests` | Harvest node | Included node | The first node gathers the second into a current usable form. Inclusion does not imply agreement or resolution. |

`supports`, `witnesses`, recency, and semantic similarity are distinct. None may be silently substituted for another.

## Structural Validity

The kernel rejects an operation unless all of the following hold:

1. IDs are non-empty and globally unique within the durable store.
2. A repeated ID is accepted only when its canonical bytes are identical; otherwise it is an identity conflict.
3. Every referenced node or edge already exists in an earlier accepted event in the same scope.
4. An edge is not a self-edge.
5. An edge and both endpoint nodes have the same `scopeId`.
6. `witnesses` originates at a `witness` node.
7. `harvests` originates at a `harvest` node.
8. `derived_from`, `depends_on`, and `supersedes` each remain acyclic in their own directed subgraphs.
9. A `supersedes`, `responds_to`, `witnesses`, or `harvests` edge points from a node accepted later than its target.
10. A `derived_from` edge may be asserted later, but its derived node may not predate its antecedent in accepted-event order.
11. Timestamps are valid RFC 3339 strings, but event sequence remains authoritative when timestamps disagree.
12. Accepted JSON is finite and canonicalizable: no `undefined`, non-finite number, executable value, or cyclic object.

Distinct authors may assert distinct edges with the same kind and endpoints. Those edges remain separately addressable and do not multiply source coverage.

## Accepted Events

Only accepted events change the durable projection.

```ts
type AcceptedOperation =
  | { type: "create_node"; node: TranchNode }
  | { type: "create_edge"; edge: TranchEdge }
  | { type: "dispute_edge"; edgeId: string; tensionId: string }
  | {
      type: "supersede_edge";
      edgeId: string;
      replacementEdgeId: string;
      reasonNodeId: string;
    };

interface AcceptedEvent {
  id: string;
  scopeId: string;
  sequence: number;
  previousEventId: string | null;
  actorId: string;
  acceptedAt: string;
  operation: AcceptedOperation;
}
```

For each scope:

- `sequence` starts at `1`, is contiguous, and is the sole replay order.
- `previousEventId` is `null` at sequence `1`; afterward it names the immediately preceding accepted event.
- `(scopeId, sequence)` is unique.
- `id` is the SHA-256 digest of the RFC 8785 canonical JSON encoding of the event body excluding `id`.
- Event bytes are immutable after acceptance.
- Replay applies events in ascending sequence. File order, insertion order, timestamps, database row order, and model output order are irrelevant.

A model may originate a candidate operation. That candidate is not durable merely because it exists or scores highly. It becomes durable only when the kernel validates it under the scope's acceptance policy and emits an `AcceptedEvent`. `actorId` names the principal accountable for that acceptance; `sourceModel` preserves the proposal's model origin.

Changing node content, kind, declared epistemic state, or meaning requires a new node plus explicit lineage. There is no update-node operation in v0.1.

## Edge Dispute and Supersession

Edges are assertions and therefore may themselves be wrong.

- `dispute_edge` must name an existing edge and an existing `tension` node in the same scope.
- An edge with an unresolved accepted dispute is **disputed**. It remains visible but cannot establish an affirmative evidence path.
- `supersede_edge` must name an existing edge, a later replacement edge, and a reason node in the same scope.
- A superseded edge remains visible in lineage but is inactive for current evaluation.
- Supersession is not deletion. If a supersession was mistaken, the correction creates a new edge and a new accepted event; the old record is not rewritten.

A tension remains unresolved until a later accepted node explicitly supersedes it. A `harvests` edge alone never resolves a tension. If the proposed successor is itself disputed or superseded, the original tension remains unresolved.

## Scope Boundary

`scopeId` is both a meaning boundary and an authorization boundary.

- Reads, retrieval, graph traversal, event replay, and writes are filtered by the same scope policy.
- A caller who cannot read a scope cannot learn its node IDs, edge IDs, counts, embeddings, nearest-neighbor scores, or existence through traversal.
- v0.1 forbids cross-scope edges and implicit traversal.
- Material deliberately admitted from another scope becomes a new `source` node in the destination scope with an explicit provenance reference in its content.
- A future cross-scope bridge must be a new, explicit ontology version with authorization semantics. It may not be smuggled into one of the nine existing edge kinds.

## Effective Snapshot

An evaluation runs against one immutable snapshot identified by:

```ts
interface EvaluationSnapshot {
  scopeId: string;
  throughSequence: number;
  policyVersion: string;
}
```

At that snapshot:

- all events through `throughSequence` are replayed;
- nodes and edges never disappear;
- a superseded edge is historical, not active;
- a disputed edge is visible but unavailable as affirmative support;
- a superseded node remains addressable;
- inaccessible entities are absent, not redacted placeholders.

The current effective epistemic state of a node is derived in this order:

1. `superseded` when the node declares that state or has an active incoming `supersedes` edge;
2. `disputed` when the node declares that state or participates in an active contradiction that has not itself been superseded;
3. `witnessed` when the node declares that state or has an active incoming `witnesses` edge from a non-disputed witness;
4. `inferred` when the node declares that state or has kind `inference`;
5. otherwise `asserted`.

Later states do not rewrite the node's declared state. `evaluateClaim` returns the effective state for the chosen snapshot.

## Deterministic Claim Evaluation

```ts
type PathPolarity = "supporting" | "contradicting";

interface EvidencePath {
  polarity: PathPolarity;
  nodeIds: string[];
  edgeIds: string[];
}

interface ClaimEvaluation {
  claim: TranchNode;
  supportingPaths: EvidencePath[];
  contradictingPaths: EvidencePath[];
  dependencies: TranchNode[];
  unresolvedTensions: TranchNode[];
  currentHarvests: TranchNode[];
  epistemicState: EpistemicState;
  sourceCoverage: number;
}
```

An evidence path begins at the evaluated claim, ends at a `source` node, never repeats a node or edge, and has exactly one more node ID than edge IDs.

Traversal begins with supporting polarity:

| Encountered relation from the current node | Traversal | Polarity |
| --- | --- | --- |
| outgoing `derived_from` | to its antecedent | preserve |
| incoming `supports` | to its supporter | preserve |
| either side of `contradicts` | to the opposite endpoint | toggle |
| incoming `qualifies` | to its qualifier | preserve, while retaining the qualifying edge in the path |
| outgoing `depends_on` | to its prerequisite | preserve |
| incoming `witnesses` | to its witness | preserve |

`responds_to`, `supersedes`, and `harvests` provide chronology, currentness, and context; they do not by themselves establish evidence polarity.

Disputed or superseded edges are not traversed as evidence. Their reason or tension nodes remain eligible for `unresolvedTensions`.

Traversal is deterministic:

1. Build adjacency from the accepted snapshot.
2. Sort candidate steps by edge kind, edge ID, traversal direction, then destination node ID.
3. Perform breadth-first traversal over `(nodeId, polarity)` states.
4. Never repeat a node or edge within a path.
5. For each `(sourceId, polarity)`, retain the path with the fewest edges.
6. Break equal-length ties lexicographically by edge-ID sequence, then node-ID sequence.
7. Sort returned paths by terminal source ID, polarity, edge-ID sequence, then node-ID sequence.

`dependencies` is the transitive closure of active outgoing `depends_on` edges from the claim, deduplicated and sorted by node ID.

`unresolvedTensions` contains every unresolved tension reached in the evidence or dependency closure, every tension attached to a disputed traversable edge, and every tension directly connected to the claim by `contradicts`, `qualifies`, `depends_on`, or `responds_to`. Results are deduplicated and sorted by node ID.

`currentHarvests` contains active harvest nodes that include the claim or any node in its evaluation closure and that have no active successor harvest. Zero harvests means no current form. More than one means the record has competing current forms; the evaluator must return all of them and surface that plurality as a tension rather than choosing by recency.

`sourceCoverage` is:

```text
evidence-bearing nodes with at least one valid path to a source
----------------------------------------------------------------
evidence-bearing nodes in the evaluated claim subgraph
```

Evidence-bearing nodes are observations, claims, and inferences reached during evidence and dependency traversal. Duplicate routes to one source do not inflate coverage. If the denominator is zero, coverage is `0`. Otherwise the result is clamped to `[0, 1]`.

Given the same accepted events, snapshot, policy version, and claim ID, normalized `ClaimEvaluation` output must be byte-equivalent across insertion orders, storage engines, applications, and model providers.

## v0.1 Boundary

This ontology does not define:

- embeddings or ranking;
- a chatbot or synthesis prompt;
- autonomous acceptance policy;
- cross-scope federation;
- deletion, forgetting, or retention policy;
- application-specific Garden, BananaGram, NanaSpork, or Full Measure objects;
- a universal truth score.

Those systems may use this substrate. They may not quietly change its meanings.
