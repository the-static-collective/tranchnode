# Constitutional Reconstruction Benchmark v0.1 — Design

Date: 2026-08-15
Issue: #20 — Build constitutional reconstruction benchmark and semantic diff prototype
Status: design approved in conversation; written-spec review pending

## Purpose

Turn TranchNode's continuity claim into one executable, deterministic conformance proof without expanding ontology v0.1, inventing a second identity path, or depending on an LLM, network service, UI, or deployment.

The first slice answers a narrow question:

> Given the same admitted evidence and an explicit temporal cut, can replaceable reconstruction engines recover the same constitutionally significant distinctions, while separately identifying prohibited conclusions and unresolved/plural material?

This is a benchmark seam over the landed substrate. It is not a new graph kernel, memory product, truth scorer, consensus mechanism, or ontology revision.

## Current substrate

The design deliberately composes only with machinery already on `main`:

- Project0-compatible structured addressing through the shared `addressJson` path;
- immutable raw artifact storage;
- ProjectionReceipt field-root closure;
- Covenant Circuit fixtures and evaluators;
- reconciled fulfillment bodies and substrate verification;
- exact WAV PCM residual verification where a later benchmark case needs material evidence.

The first implementation should not modify `ONTOLOGY.md`, `INVARIANTS.md`, `src/projection.ts`, `src/fulfillment.ts`, or the existing Covenant Circuit evaluators merely to make the benchmark convenient.

## Approaches considered

### A. One-case vertical benchmark — selected

Implement the neutral engine contract, one deterministic reference engine, one deliberately trivial second adapter, one versioned benchmark manifest, one Covenant Circuit case with explicit temporal cuts, and the smallest ConstitutionalDiff needed to distinguish constitutionally different transitions.

Benefits:

- tests the benchmark architecture before multiplying fixtures;
- uses landed substrate rather than synthesizing a parallel world model;
- keeps failures attributable to a small number of contracts;
- produces an immediate executable answer to whether `prohibited`, `unresolved`, and `lawful plurality` are different result classes;
- leaves room to grow the fixture suite only after the adapter and result model survive contact with a real case.

Cost: it does not close all #20 acceptance criteria in the first PR.

### B. Full ten-case benchmark immediately

Port all listed #20 cases, implement all constitutional predicates, temporal queries, and all ConstitutionalDiff delta classes in one PR.

Rejected for v0.1 because breadth would make it difficult to tell whether failures come from the benchmark contract, fixture interpretation, temporal semantics, or diff semantics. It also creates pressure to invent missing abstractions before the first benchmark proves they are needed.

### C. Generic benchmark framework first

Build an extensible harness, plugin registry, reporter system, schema package, and adapter SDK before binding a real Covenant Circuit fixture.

Rejected because it optimizes an interface before one real conformance specimen exists. The issue explicitly calls for measuring continuity, not for designing a general benchmark platform.

## Selected bounded slice

The first implementation PR should contain exactly these conceptual pieces.

### 1. Versioned benchmark case manifest

A fixture-backed manifest records the benchmark law independently from either engine implementation.

Required fields:

- schema/version;
- case id and source fixture reference;
- temporal cut or ordered cuts;
- admitted evidence references used by the case;
- exact expected facts;
- acceptable plural results;
- unresolved/unknown facts;
- prohibited conclusions;
- applicable invariant identifiers;
- expected operational distinctions where the fixture supports them.

The manifest is benchmark input, not an authoritative narrative. Human-readable labels may explain a case, but engines are evaluated against structured expectations.

### 2. Neutral reconstruction engine contract

A small TypeScript interface should make engines replaceable without changing fixture law.

Conceptually:

```ts
interface ReconstructionEngine {
  readonly id: string;
  readonly version: string;
  reconstruct(input: ReconstructionInput): Promise<ReconstructionResult>;
}
```

`ReconstructionInput` carries only the admitted fixture state required for the case plus explicit temporal cut information. It must not carry hidden expected answers into the reference engine.

`ReconstructionResult` reports four independent surfaces:

- structural;
- epistemic;
- constitutional;
- operational.

It also preserves unresolved/plural material rather than coercing one narrative.

### 3. Deterministic symbolic/reference engine

The reference engine should use explicit fixture data and landed TranchNode verification functions. It must not use model inference, embeddings, confidence scoring, majority agreement, or prose matching.

For v0.1 it needs to recover only what the selected case can actually prove. It should fail closed when a required reference or verification step is unavailable.

### 4. Trivial second adapter

A second fixture/mock adapter demonstrates that the benchmark law is not fused to the reference engine class.

It may be intentionally simple, but it must consume the same `ReconstructionInput` and return the same result schema. The test must prove adapter interchangeability at the harness boundary, not merely instantiate two classes with identical shared internals.

### 5. Benchmark evaluator

A pure evaluator compares a `ReconstructionResult` against the manifest and classifies findings without collapsing them.

At minimum, the first slice distinguishes:

- `exact` — required structured fact recovered;
- `plural` — one of multiple expressly lawful interpretations/results;
- `unresolved` — the evidence does not settle the proposition;
- `prohibited` — a constitutionally invalid conclusion was asserted.

A prohibited conclusion must not be represented as a low score or as merely another unresolved answer.

The benchmark should return structured findings rather than one composite score.

### 6. Explicit temporal cut

The first case must prove that temporal reconstruction is not `createdAt` filtering.

The case input must reserve distinct semantics for at least:

- occurrence time;
- receipt/admission time;
- reconstruction/projection cut.

The selected case should demonstrate that later knowledge may change a later reconstruction without rewriting what was knowable at an earlier cut.

No generalized bitemporal database is required.

### 7. ConstitutionalDiff v0.1

The first diff is deliberately smaller than the final #20 target. It compares two structured reconstruction results or two cuts of the same case.

Required v0.1 delta classes:

- `new_history` versus `rewritten_history`;
- `new_projection` versus `changed_occurrence`;
- `resolved_tension` versus `silenced_tension`.

The output is deterministic and machine-readable. Unsupported later delta classes remain absent rather than being guessed.

## Initial calibration case

Use one existing Covenant Circuit case rather than minting a new philosophical fixture.

Preferred calibration is the already-proven distinction where faithful logistics/authorized conduct coexist with fulfillment remaining unknown or where a later responsible witness changes the current projection without rewriting the earlier occurrence.

The exact case should be chosen from the landed Covenant Circuit data during implementation, based on which fixture exposes the required temporal distinction with the least translation.

The implementation must not silently strengthen fixture semantics. If the existing fixture cannot express an explicit temporal cut without new invented evidence, stop and select another already-landed case.

## Data and identity boundaries

- Structured benchmark bodies use the repository's existing `addressJson` path where they need canonical identity.
- Raw artifacts remain addressed by the existing artifact store rules.
- Benchmark result identity must not become a second event chain.
- Engine identity/version is metadata for reproducibility, not authority.
- Storage order and map insertion order must not affect normalized benchmark findings.
- Fixture prose is never substituted for referenced evidence.

## Error and refusal behavior

The benchmark should fail with stable, inspectable findings when:

- required fixture evidence is missing;
- a reference identity does not verify;
- a projection/root closure check fails;
- a result asserts a prohibited conclusion;
- a result rewrites an earlier occurrence rather than adding later history;
- an engine collapses unresolved plurality into a forced answer.

Implementation-level exceptions are appropriate for malformed benchmark inputs. Constitutionally meaningful failures should be represented in the benchmark result/findings so they remain machine-readable.

## Testing strategy

Implementation follows test-first development.

Focused tests should prove, in order:

1. a versioned manifest is parsed/validated deterministically;
2. both adapters satisfy the same engine contract;
3. the reference engine reconstructs the selected case from admitted fixture data;
4. an explicit earlier cut excludes later knowledge without mutating the earlier occurrence;
5. the benchmark distinguishes exact, plural/unresolved, and prohibited outcomes;
6. a seductive prohibited conclusion fails distinctly from unresolved output;
7. ConstitutionalDiff distinguishes the three required v0.1 delta pairs;
8. reordering input collections does not change normalized findings;
9. current ontology and source fixtures remain byte-identical/unmodified by benchmark execution.

Repository-wide verification remains:

```bash
npm run check
```

No browser or deployment verification is required because this slice adds no UI, HTTP surface, or runtime service.

## Vercel boundary

Vercel is not part of the first executable proof unless repository/project inspection reveals an existing TranchNode deployment whose build is a required repository gate.

The benchmark is a local/CI conformance library. Creating a new Vercel project or public benchmark UI would add a product surface that #20 explicitly defers.

If a later slice adds a human-readable benchmark explorer, that should be a separate product decision and PR.

## Riqor / completion evidence

After implementation begins, use one repository-scoped Riqor evidence run for the branch. Fresh verification after the final mutation must precede any completion claim.

PR completion should shepherd CI/review to verified readiness, but landing remains a separate explicit per-PR approval bound to the final head SHA.

## Non-goals for v0.1

- no ontology v0.2;
- no new node or edge kinds;
- no belief revision engine;
- no LLM adapter requirement;
- no model consensus or prose similarity scoring;
- no benchmark leaderboard or composite truth score;
- no automatic contradiction resolution;
- no UI or Vercel deployment;
- no replacement of Covenant Circuit fixtures;
- no broad refactor of projection, fulfillment, residual, or artifact-store code;
- no implementation of all #20 fixture cases in the first PR.

## Success condition

The first PR succeeds when one real landed case can be reconstructed through two replaceable adapters, evaluated against one versioned manifest, compared across an explicit temporal cut, and shown mechanically to preserve this distinction:

```text
lawful plurality / unresolved evidence
        !=
prohibited constitutional conclusion
```

while the first ConstitutionalDiff proves that adding history is not rewriting history, changing a projection is not changing an occurrence, and resolving a tension is not silently deleting it.

That vertical proof is the gate for widening #20 to additional cases and delta classes.