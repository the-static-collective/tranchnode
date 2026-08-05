# Attention, Testimony, and Recognition

## Status

Conceptual architecture slice. This document refines the relationship among Band Runtime, TranchNode, and Project0 without changing the canonical ontology or event contracts by itself.

## Core thesis

The grammar is not vocabulary. It is topology.

A living system requires two irreducible domains:

- **Field** — potential, possibility, novelty, unresolved difference;
- **Structure** — actualized form, history, constraint, continuity.

**Attention is not a third domain.** It is the vortex through which Field and Structure pass into one another's forms.

Attention is being *at tension*: stretching toward what is while remaining open to what could become. It holds existing structure and unrealized potential together long enough for a faithful transformation to occur.

```text
Field
  ↓
[ Attention / Vortex ]
  ↓
Structure
```

The reverse passage also occurs:

```text
Structure
  ↓
[ Attention / Vortex ]
  ↓
Field'
```

History re-patterns what can be noticed next. Potential deforms what can become durable next.

## Vortex invariant

> **Nothing crosses without being altered.**

A crossing is not lossless transport. It is relationship occurring.

Every passage through attention leaves residue on both sides:

- Field-side residue: possibilities depleted, primed, foreclosed, or newly generated;
- Structure-side residue: attractors strengthened, constraints altered, relationships deepened, or forms softened.

A system that claims a crossing while preserving no residue has copied data; it has not carried relationship.

This distinction explains the separation of responsibilities:

- **Band Runtime** protects the integrity of encounter: the attentional passage, its causal placement, and its residue-bearing receipts.
- **TranchNode** protects the integrity of stewardship: how sovereign nodes carry residue into testimony and living memory.
- **Project0** protects the admissibility, identity, authority, and lineage laws under which either claim may be made.

## Encounter, residue, memory

These must not be collapsed.

### Encounter — irreversible

An encounter is the historical crossing.

It is append-only and unprunable. Relationship, once it has occurred, cannot be made not to have occurred.

### Residue — living

Residue is what the encounter changes.

Residue is not identical to the event record. It may accumulate, weaken, heal, scar over, or be replenished by later returns.

### Living memory — sovereign

Living memory is what a node chooses to keep active as a future attractor.

Pruning belongs here.

The governing distinction is:

> **A prunable projection of an unprunable encounter.**

Pruning memory is not rewriting history. It is stewardship over what remains active.

## Stewardship and testimony

Residue happens to a node. Stewardship is what the node does about it.

A sovereign node may choose to:

- carry;
- release;
- hold unresolved;
- revise through later declaration;
- refuse to transmit;
- preserve foreignness without forced synthesis.

**Testimony is the moment stewardship becomes communicable.**

> **Testimony is a sovereign declaration of how an encounter is being carried.**

Testimony is not the encounter, residue, or memory itself. It is a bounded, attributable projection that carries proof of the encounters from which it was formed.

That proof establishes lineage, not universal correctness.

A testimony may be sincere, historically grounded, partial, mistaken, contested, or later transformed without permitting the encounter history to be rewritten.

### Testimony authority

The invariant for this layer is:

```ts
authority: "self_only"
```

A node may testify to:

- what it witnessed;
- how it was changed;
- what it continues to carry;
- what it releases;
- what remains unresolved.

It may not testify with final authority over another node's interior, interpretation, or memory.

Contestation is therefore counter-testimony with its own lineage, not deletion or remote correction.

## Witness, testimony, recognition

These are distinct protections.

### Witness

Witness faces the original crossing.

> **Witness says: this occurred, and I attest from an accountable position.**

Witness is vertical: Field passes through Attention into Structure. It claims original co-presence or accountable attestation to the encounter or its accepted evidence.

Witness protects the reality of encounter.

### Testimony

Testimony faces forward from stewardship.

> **Testimony says: this is how I carry what occurred.**

Testimony protects sovereignty of interpretation and carrying.

### Recognition

Recognition faces another node's testimony.

> **Recognition says: I can place your carrying as bounded, attributable, and lineage-bearing without annexing it into mine.**

Recognition is lateral. Another node's structured testimony becomes Field for the receiving node. The receiving node must still pass it through its own attention.

```text
Node A Structure
      ↓
   Testimony
      ↓
Node B Field
      ↓
[ Node B Attention ]
      ↓
Node B Structure'
```

Recognition therefore produces local residue even when adoption is zero.

Recognition is not:

- original witness;
- agreement;
- adoption;
- consensus;
- costless acknowledgment.

Its minimal social function is:

> **Mutual intelligibility without compelled agreement.**

## Recognition defaults

Recognition should remain lightweight, graded, local, and optionally citable.

Not every recognition must become testimony. Otherwise the network produces an infinite hall of receipts about receipts.

Not every recognition may disappear without trace. Otherwise influence becomes unplaceable and lineage-free.

The default is:

> **silence with residue**

Recognition is an encounter for the recognizer and may later generate testimony, but elevation is a stewardship decision rather than an ontological requirement.

A candidate non-canonical shape is:

```ts
interface Recognition {
  id: RecognitionId;
  recognizer: SovereignNodeId;
  testimonyRef: TestimonyId;

  intelligibility:
    | "received"
    | "lineage_understood"
    | "partially_understood"
    | "not_yet_intelligible";

  adoption:
    | "none"
    | "none_yet"
    | "partial"
    | "carried_as_unresolved"
    | "carried";

  semanticEffect: "local_only";
  causalCut: CausalCut;
  residueObserved?: BoundedStatement[];
  citable: boolean;
}
```

The discriminants are load-bearing:

- intelligibility is graded rather than binary;
- adoption is explicitly separable from understanding;
- semantic effect is local only;
- causal placement remains auditable;
- citation is optional and does not imply adoption.

## Interpretation and the partial zone

Recognition establishes that another testimony can be placed. It does not establish that the claim has been fully understood.

The system must preserve a first-class partial state:

> **I understand your lineage while remaining uncertain whether I understand your carrying.**

A receiving node may hold a bounded interpretation of another bounded testimony. That interpretation must remain attributable, provisional, contestable, and incapable of overwriting the original testimony.

This partial zone is where culture is most severely tested.

A network that cannot hold partial intelligibility without immediate repair permits only merge or ignore.

Foreignness is not an error state. It is a lawful condition in which:

- lineage is placeable;
- testimony is recognized;
- interpretation remains incomplete;
- attention may continue without compelled convergence.

## Transmission between sovereign nodes

TranchNode does not synchronize by replicating state.

It transmits a lineage-bearing invitation to encounter:

```text
Encounter proof
+
Sovereign testimony
+
Projection policy
```

The receiving node distinguishes:

- what occurred under durable evidence;
- how the sender carries it;
- how the receiver chooses to integrate, release, or hold it.

There is no direct Structure-to-Structure write. Testimony always becomes Field for the receiver.

Synchronization therefore means translation, not replication.

The purpose is not to make nodes identical. It is to preserve enough shared lineage for intentionally differing memories to remain mutually intelligible.

## Cultural memory

A distributed database seeks consensus on state.

A network of sovereign stewards seeks coherence while allowing nodes to remember differently.

Culture is not the average of testimonies. It is the living pattern formed by testimonies carried together, including:

- testimonies repeatedly received;
- testimonies recognized or contested;
- patterns actively carried;
- patterns deliberately released;
- unresolved differences preserved without forced synthesis.

> **Encounter is what happened.**
>
> **Testimony is how a sovereign witness carries what happened.**
>
> **Culture is the living pattern formed by testimonies carried together.**

The shape of the larger network is the shape of an intentionally shaped cultural memory.

## Full continuity cycle

```text
Field
  ↓
Attention
  ↓
Encounter
  ↓
Residue
  ↓
Stewardship
  ↓
Testimony
  ↓
Recognition by another sovereign node
  ↓
Local residue
  ↓
Carry / release / hold unresolved
  ↓
Living Memory
  ↓
Field'
```

Living Memory re-patterns what Attention can notice next. The whole cycle is therefore a larger vortex rather than a linear pipeline.

## Failure tests

The grammar predicts specific decay when a role is starved or collapsed.

### Recognition collapsed into adoption

Understanding becomes merger. Plurality thins into premature convergence.

### Recognition reduced to costless acknowledgment

Relation leaves no residue. The network becomes sterile tolerance: infinitely visible, culturally inert.

### Witness removed

Testimony floats free of encounter and becomes ungrounded opinion or myth.

### Testimony removed

Witness remains isolated fact with no sovereign declaration of carrying.

### Recognition removed

Testimony becomes monologue and sovereign nodes become mutually unintelligible islands.

### Residue conflated with memory

The system either hoards an unbounded causal graph or treats pruning as denial of history.

### Direct Structure-to-Structure replication

The receiver's attentional vortex is bypassed. State is annexed rather than encountered.

## Architectural invariants

1. Every transition between Field and Structure passes through an attentional vortex.
2. Every actual crossing leaves residue; `residue = 0` indicates copying or failed encounter.
3. Encounters are append-only and unprunable.
4. Residue is dynamic and is not identical to either event history or living memory.
5. Living memory is a sovereign, prunable projection of unprunable encounters.
6. Testimony is bounded, attributable, lineage-bearing, self-authoritative only, and contestable.
7. Recognition does not imply witness, agreement, adoption, or remote mutation.
8. Recognition has `semanticEffect: "local_only"` and preserves causal placement.
9. Recognition may generate later testimony, but only through stewardship.
10. No testimony writes directly into another node's structure; it becomes Field for a new encounter.
11. Interpretation remains provisional and foreignness remains available.
12. Synchronization preserves mutual intelligibility, not identity of state.
13. The system preserves lineage, exposes interpretation, and protects freedom of stewardship.

## TranchNode thesis

> **TranchNode preserves the right of every sovereign node to form, revise, transmit, recognize, contest, and inherit testimony without rewriting encounter history or surrendering memory to consensus.**

## Implementation boundary

This slice does not yet require adding `testimony`, `recognition`, or `interpretation` as canonical node kinds.

The immediate implementation task is to test whether existing Project0 and TranchNode primitives can express these roles through explicit profiles and receipts without semantic aliasing. Canonical ontology changes should occur only after fixture-backed failures demonstrate that the current kinds are insufficient.
