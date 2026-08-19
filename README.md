# TranchNode

TranchNode is a model-independent substrate for preserving meaningful continuity across humans, agents, applications, and time.

It stores meaning-bearing objects together with their lineage, keeps inference distinct from observation, and treats retrieval as discovery rather than authority. Models may interpret and propose operations; they do not silently rewrite shared memory.

## Core laws

- **No silent overwrite.** Meaningful change creates lineage.
- **No unsupported elevation.** Confidence does not convert inference into observation.
- **No source erasure.** Derived objects retain paths to source material.
- **No contradiction destruction.** Disagreement remains visible until explicitly resolved.
- **No model sovereignty.** Models propose; the kernel validates.
- **No authority by similarity.** Embeddings find candidates, not truth.
- **No scope leakage.** Retrieval and traversal obey authorization boundaries.
- **Deterministic replay.** Accepted events reconstruct durable state.
- **Replaceable intelligence.** Model providers remain interchangeable above the shared meaning layer.
- **Harvest preserves tension.** A current form may settle action without pretending every question is solved.

See [`INVARIANTS.md`](./INVARIANTS.md) for the authoritative invariant set.

## Current executable surface

The executable surface is now broader than residual extraction alone.

It includes:

- TypeScript residual extraction and validation;
- **Intent Stroke v0.1** traversal decoding with deterministic candidate/ambiguity evidence;
- a bounded stdio process adapter for Intent Stroke;
- **Intent Stroke stdio v0.2**, which accepts raw pointer points and binds them to the donor-owned canonical field layout before decoding;
- **Continuity Spine v0.1**, a pure staged-transformation evaluator that keeps future attractors proposal-only, requires invariant-preserving overlap and witnessed responsibility transfer, and permits shedding only after the receiving carrier demonstrably bears the dependency.

The process seam deliberately carries observation, not crossing authority. A decoded gesture may expose a candidate route; it does not authorize the destination or silently choose a crossing.

Continuity Spine likewise describes and refuses transitions; it does not execute them. Its first pinned specimen treats the Intent Stroke v0.1 → v0.2 change as a staged handoff rather than rewriting the older carrier out of history.

Run the complete repository proof:

```bash
npm install
npm run check
```

Run the bounded Intent Stroke process seam:

```bash
npm run intent-stroke:stdio
```

Machine-readable snapshot: [`PROJECT_STATUS.json`](PROJECT_STATUS.json).

## Architecture map

Start here:

- [`VISION.md`](./VISION.md) — concise project purpose.
- [`INVARIANTS.md`](./INVARIANTS.md) — laws the substrate must preserve.
- [`ONTOLOGY.md`](./ONTOLOGY.md) — meaning-bearing objects and relationships.
- [`CONTINUITY.md`](./CONTINUITY.md) — continuity across revisions, contexts, and time.
- [`ATTENTION_TESTIMONY_RECOGNITION.md`](./ATTENTION_TESTIMONY_RECOGNITION.md) — boundaries between receiving, being affected, adopting, carrying, and transmitting testimony.
- [`EVALUATION.md`](./EVALUATION.md) — evaluation semantics and evidence boundaries.
- [`PROJECTION_COVENANT.md`](./PROJECTION_COVENANT.md) — projection rules and limits.
- [`COMPATIBILITY.md`](./COMPATIBILITY.md) — implementation compatibility floor.
- [`PROJECT_LEGO_FLOOR_1_0.md`](./PROJECT_LEGO_FLOOR_1_0.md) — composable project floor.
- [`RESIDUAL_V0_1.md`](./RESIDUAL_V0_1.md) — residual contract.
- [`docs/`](./docs/) and [`fixtures/`](./fixtures/) — focused executable designs, plans, and proof material.

## Design posture

TranchNode is not a chat-history database, a vector store promoted into a truth system, or a model-owned memory layer.

Applications are replaceable interfaces. Retrieval proposes relevant material. Models interpret and propose. Durable lineage, authorization, evidence class, and accepted state remain properties of the substrate.

## Status

TranchNode is under active development. The repository contains both adopted architectural law and bounded executable proofs. Its process-facing proof turns raw human traversal input into deterministic, inspectable candidate evidence while leaving destination authority outside the decoder; its Continuity Spine proof now separately demonstrates staged transformation without promoting desired futures into present fact.

Historical proposals should be read through their inheritance and supersession links rather than assumed to be live integration choices.
