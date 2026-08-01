# TranchNode × Autodisco First-Listen Radio

Status: **preserving integration slice**

Branch: `radio-honeycomb-integration`

Related implementation surface: `the-static-collective/The-AutodiscoV.20.-question-marks-`

Related station canon: `the-static-collective/the-autodisco/canon/FIRST-LISTEN-RADIO.md`

## Governing phrase

> The station remembers. The DJs arrive. The callers carry continuity.

## Purpose

This slice preserves the intended division of labor between TranchNode and Autodisco 20.

TranchNode is the honeycomb substrate: it stores songs, motifs, tensions, witnesses, listener experiences, broadcast traversals, interpretations, and lineage.

Autodisco 20 is the first likely broadcast surface: it turns a bounded traversal through that substrate into an audible station experience.

The radio is not a flat playlist with generated chatter. It is a frequency learning how to become a station by traversing an unfolding ledger and receiving continuity from participants with different memory rights.

## Epistemic roles

### 1. The station

The station may access scheduling state, catalog eligibility, broadcast history, and the current traversal plan.

It coordinates the broadcast but does not silently collapse all roles into one omniscient narrator.

### 2. First-listen DJs

Ordinary DJs receive only a bounded listening window and their character contract.

They may know:

- the current song or short sequence;
- approved lyrics, transcript, metadata, and audio observations;
- local transition context;
- station identity;
- their own role and speaking constraints.

They must not receive hidden catalog history, prior broadcasts, motif retrieval, or listener history.

Their first responses must be sealed before they see another DJ's interpretation.

### 3. Honeycomb callers

Callers are the principal carriers of experienced continuity.

A caller may be:

- a real human listener;
- a consented human voice message;
- a generated persona querying authorized TranchNode lineage;
- an archival excerpt clearly marked as archival;
- a scheduled message released when a ledger condition is met.

Unlike ordinary DJs, a honeycomb caller may access selected historical relationships. That access must be explicit, scoped, attributable, and receipted.

A caller does not become omniscient merely because it can query the honeycomb.

### 4. The Archivist

The Archivist is a declared exceptional station role with deeper catalog access. It should speak rarely and cite retrievable lineage rather than offering unsupported resemblance.

### 5. Human steward

A human steward may approve, reject, edit, schedule, or canonize material. Generated interpretation remains interpretation unless a separate authorized process changes its status.

## Broadcast as graph traversal

A playlist is a temporary path through eligible nodes and relations.

Tracks may be selected because they:

- answer or deepen an unresolved tension;
- transform a recurring object;
- share lineage or source material;
- contradict a previous interpretation;
- complete or reopen an arc;
- become newly relevant through a recent witness or listener experience.

Each transition should be inspectable as a receipt rather than hidden inside model intuition.

```ts
export type BroadcastTraversalReceipt = {
  id: string;
  broadcastId: string;
  position: number;
  fromNodeId?: string;
  toNodeId: string;
  relationIds: string[];
  selectionReason: string;
  unresolvedTensionIds: string[];
  allowedContextNodeIds: string[];
  policyVersion: string;
  createdAt: string;
};
```

## Caller continuity contract

A caller response should bind to a specific query and returned evidence set.

```ts
export type HoneycombCallerReceipt = {
  id: string;
  broadcastId: string;
  callerRoleId: string;
  queryText: string;
  queryScope: {
    nodeKinds?: string[];
    relationKinds?: string[];
    maxDepth?: number;
    timeRange?: { from?: string; to?: string };
  };
  evidenceNodeIds: string[];
  evidenceRelationIds: string[];
  generatedText: string;
  disposition: "interpretation" | "archival_excerpt" | "human_witness";
  voiceArtifactHash?: string;
  createdAt: string;
};
```

A generated caller must not claim human experience. A real listener contribution must retain consent, attribution preference, and disclosure boundaries.

## First-listen pair contract

Two DJs may hear the same bounded packet independently.

```ts
export type FirstListenPairReceipt = {
  id: string;
  broadcastId: string;
  listeningPacketHash: string;
  djA: { roleId: string; response: string; responseHash: string };
  djB: { roleId: string; response: string; responseHash: string };
  responsesSealedBeforeExchange: true;
  exchangeText?: string;
  selectedAudioHashes?: string[];
};
```

The pair receipt proves that interpretive plurality existed before conversational influence.

## Ledger write-back

The broadcast may create new nodes or receipts for:

- `broadcast`;
- `playlist_traversal`;
- `broadcast_transition`;
- `dj_observation`;
- `caller_contribution`;
- `listener_response`;
- `motif_recurrence_candidate`;
- `emergent_arc_candidate`;
- `rendered_interstitial`.

Candidate interpretations must not silently rewrite source metadata or become canonical relations.

## Integration boundary

### TranchNode owns

- durable nodes, relations, provenance, and disclosure bounds;
- traversal receipts;
- role-scoped context assembly;
- evidence retrieval for callers and Archivist;
- write-back of broadcast observations;
- distinction between witness, archive, derivation, and interpretation.

### Autodisco 20 owns

- listener-facing radio experience;
- playlist and interstitial timing;
- DJ and caller presentation;
- voice rendering and audio mixing;
- now-playing state;
- broadcast scheduling;
- public stream and replay surfaces.

### Shared contract

Autodisco 20 requests a bounded broadcast packet from TranchNode and returns attributable broadcast receipts.

Neither side should infer the other's internal state from unstructured chat text.

## Minimum vertical slice

1. Select six to twelve song nodes.
2. Produce one inspectable TranchNode traversal.
3. Generate two isolated first-listen responses at selected transitions.
4. Generate one honeycomb caller response from scoped historical evidence.
5. Render the three roles with artist-authorized voices.
6. Assemble a thirty- to sixty-minute prerecorded transmission in Autodisco 20.
7. Write traversal, response, caller, selection, and audio hashes back to TranchNode.
8. Expose the evidence path without forcing ordinary listeners to inspect it.

## Acceptance invariants

- A reviewer can prove what context each DJ received.
- A reviewer can prove that paired first responses were sealed before exchange.
- Every honeycomb caller claim can be traced to supplied evidence or marked as interpretation.
- Generated callers never masquerade as real human callers.
- Listener contributions retain consent and disclosure controls.
- Station memory does not leak into ordinary first-listen sessions.
- The public broadcast remains understandable without knowledge of TranchNode.
- Autodisco 20 can be replaced without losing the ledger or broadcast lineage.

## Narrative truth

The station grows organs as it discovers functions:

- DJs emerge when the frequency needs fresh perception.
- callers emerge when it needs experienced continuity;
- the Archivist emerges when it recognizes a past;
- TranchNode remains the honeycomb in which those relationships persist.

The frequency is not pretending to learn radio. Its technical capabilities and its story should unfold together.
