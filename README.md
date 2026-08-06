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

The repository currently includes a TypeScript implementation of residual extraction and validation in [`src/residual.ts`](./src/residual.ts), with characterization and residual tests under [`test/`](./test/).

The executable surface is intentionally narrower than the full architecture. The documents define the governing contracts; code is added in bounded slices that make those contracts mechanically testable.

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
- [`RESIDUAL_V0_1.md`](./RESIDUAL_V0_1.md) — current residual contract.

Additional focused documents and fixtures live under [`docs/`](./docs/) and [`fixtures/`](./fixtures/).

## Development

Requires a current Node.js runtime with npm.

```bash
npm install
npm test
npm run check
```

- `npm test` runs the Node test suite through `tsx`.
- `npm run check` runs TypeScript validation and the full test suite.

## Design posture

TranchNode is not a chat-history database, a vector store promoted into a truth system, or a model-owned memory layer.

Applications are replaceable interfaces. Retrieval proposes relevant material. Models interpret and propose. Durable lineage, authorization, evidence class, and accepted state remain properties of the substrate.

## Status

TranchNode is under active development. The repository contains both adopted architectural law and bounded executable proofs. Historical proposals should be read through their inheritance and supersession links rather than assumed to be live integration choices.
