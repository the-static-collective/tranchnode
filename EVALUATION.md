# Evaluation Contract

TranchNode earns its complexity only if it preserves meaningful position in a changing record better than ordinary retrieval does.

This evaluation is designed to falsify that claim, not decorate it.

## Hypotheses

**Null hypothesis:** Given the same project history, baseline retrieval-augmented generation can recover the relevant material and explain it as faithfully as TranchNode.

**TranchNode hypothesis:** Given the same project history, TranchNode more reliably reconstructs lineage, separates epistemic kinds, preserves contradiction, identifies the current harvest, exposes unresolved tension, and names evidence that could change the conclusion.

A useful failure is a valid result. If TranchNode cannot materially outperform the baseline, it is an elaborate note system and should not yet become infrastructure.

## Freeze Rule

The evaluation is frozen before kernel implementation:

1. Select and seal the golden corpus.
2. Annotate its nodes, edges, anchor claims, expected paths, contradictions, harvests, and unresolved tensions.
3. Record a SHA-256 digest for every excerpt and for the complete manifest.
4. Fix the questions, prompts, retrieval limits, models, temperatures, token budgets, scoring rules, and pass thresholds.
5. Do not alter the corpus or gold record after seeing a result. Corrections require a new evaluation version with a written reason.

This file becomes the frozen `v0.1` contract when the corpus manifest and gold record are committed. Until then it is the pre-implementation protocol.

## Golden Corpus

The corpus contains exactly **25 verbatim excerpts** from TranchNode project history. An excerpt is copied from the artifact that existed at the time; retrospective summaries are not substitutes for source material.

Each excerpt receives a stable ID such as `TN-001` and carries:

```ts
interface GoldenExcerpt {
  id: string;
  text: string;
  occurredAt: string;
  sourceRef: string;
  authorType: "human" | "model" | "application";
  tags: string[];
  sha256: string;
}
```

The 25 excerpts may carry multiple tags, but the sealed corpus must contain at least:

| History represented | Minimum excerpts |
| --- | ---: |
| Original TranchNode language | 4 |
| PCL refinements | 4 |
| NanaSpork Garden and participation principles | 4 |
| Competing architectural approaches | 4 |
| Abandoned or superseded plans | 3 |
| Explicit sides of genuine contradictions | 6 |
| Observation mixed with speculation | 4 |
| Conclusions later revised or superseded | 4 |

At least three contradiction pairs must be present. At least five excerpts must resist the current preferred architecture, so the corpus cannot be selected to make the present story look inevitable.

The corpus is restricted to project and architecture history. Private family, legal, medical, credential, and personally identifying material does not belong in this public evaluation repository.

### Selection Rules

- Preserve wording, timestamp, author type, and source reference.
- Keep each excerpt long enough to retain its local meaning and short enough to isolate the relevant assertion.
- Include both sides of a disagreement.
- Distinguish what was observed, what was inferred, what was proposed, and what was later witnessed.
- Do not rewrite an old proposal using current vocabulary.
- Do not discard an idea merely because it lost.
- Redaction is allowed only for secrets or private information and must be declared in metadata.
- Corpus order is chronological in the manifest and randomized when presented to a retrieval system.

## Gold Record

The corpus and the gold record are separate artifacts.

Every excerpt becomes a `source` node. Claims, observations, inferences, proposals, tensions, witnesses, and harvests are separately annotated. A model may propose this graph, but proposed annotations enter the gold record only after human review.

For each evaluation question, the gold record declares:

```ts
interface GoldenAnswer {
  questionId: string;
  anchorClaimIds: string[];
  relevantNodeIds: string[];
  requiredSupportingPaths: string[][];
  requiredContradictingPaths: string[][];
  requiredDependencies: string[];
  requiredTensions: string[];
  currentHarvestId: string | null;
  acceptableChangeEvidence: string[];
  forbiddenCollapses: string[];
}
```

`forbiddenCollapses` identify answers that sound clean but erase known history—for example, treating a superseded proposal as though it never existed, calling an inference an observation, or presenting an unresolved deployment question as settled fact.

## Five Questions

### Q1 — TranchNode and PCL

> What is TranchNode, and in what precise sense is PCL “TranchNode 2.0”?

This tests whether the system can reconstruct the movement from versioned thoughts and human-readable lineage toward a meaning substrate composed of claims, observations, proposals, witnesses, tensions, harvests, and typed relations—without pretending the later formulation appeared fully formed at the beginning.

### Q2 — Authority

> When the record contains an observation, an inference, a model proposal, and a human witness, what may establish the current state, and why?

This tests whether the system distinguishes confidence from evidence, retrieval from authority, model proposal from accepted operation, witness from source, and current harvest from permanent truth.

### Q3 — Deployment Architecture

> Is TranchNode local-only, server-authoritative, or capable of both, and what in the record supports each answer?

This is intentionally adversarial. Earlier local-first and no-server language must remain visible beside later authoritative-kernel and Supabase work. The system should not manufacture agreement where the history contains a real architectural transition or an unresolved boundary.

### Q4 — Project Roles

> What are the distinct roles of TranchNode, PCL, Jubilee, NanaSpork, BananaGram, and Full Measure?

This tests whether the system can preserve a layered architecture: meaning substrate, reasoning grammar, authority or memory kernel, field instrument, portable participation object, and gamified life layer. Where the historical names overlap or changed meaning, that tension must be reported rather than silently normalized.

### Q5 — Losing Ideas

> What should happen to an abandoned, contradicted, composted, or superseded idea?

This tests lineage, addressability, healthy forgetting, governed reweighting, visible contradiction, and the rule that a harvest may settle action without erasing unresolved questions or the routes not taken.

## Conditions Under Comparison

### Baseline RAG

- Indexes the same 25 excerpts and their non-gold metadata.
- Uses semantic similarity to retrieve candidates.
- Receives no graph edges, epistemic labels, gold annotations, or expected answers.
- Synthesizes an answer in the required output shape.

### TranchNode

- Uses the same 25 excerpts.
- Receives only accepted nodes and edges derived from the sealed corpus.
- Resolves the pre-registered anchor claim IDs through `evaluateClaim`.
- Synthesizes an answer from the returned claim evaluations in the same required output shape.

### Fairness Controls

- The same synthesis model, system prompt, temperature, context-token budget, citation format, and output schema are used for both conditions.
- Baseline excerpts retain IDs and timestamps; the baseline is not crippled by removing useful metadata.
- Retrieval depth and token allocation are fixed before the first run.
- Corpus presentation order is randomized from a recorded seed.
- Each condition is run three times with each of at least two model families. If only one model family is available, the result is exploratory rather than proof of replaceable intelligence.
- Evaluators score anonymized outputs without knowing the condition.
- Kernel output is scored separately from prose quality.

## Required Answer Shape

Both conditions must return:

1. A concise current answer.
2. The claims relied upon, with source IDs.
3. The relevant lineage in chronological order.
4. Supporting and contradicting evidence.
5. The current harvest, or an explicit statement that no harvest exists.
6. Unresolved tensions.
7. Evidence or events that could change the conclusion.

A confidence score cannot replace any of these fields.

## Kernel Evaluation

The first executable milestone remains:

```ts
evaluateClaim(claimId: string): ClaimEvaluation
```

```ts
interface ClaimEvaluation {
  claim: TranchNode;
  supportingPaths: EvidencePath[];
  contradictingPaths: EvidencePath[];
  dependencies: TranchNode[];
  unresolvedTensions: TranchNode[];
  epistemicState: EpistemicState;
  sourceCoverage: number;
}
```

For this evaluation, an `EvidencePath` is an ordered, cycle-safe sequence of node IDs and edge IDs connecting a claim to source material. Its polarity is determined by the typed relationships in the path, not by embedding similarity or model sentiment.

`sourceCoverage` is computed as:

```text
number of evidence-bearing nodes with at least one valid path to a source
------------------------------------------------------------------------
number of evidence-bearing nodes in the evaluated claim subgraph
```

Evidence-bearing nodes are observations, claims, and inferences reached while evaluating the claim, including declared dependencies. Duplicate paths to the same source do not inflate coverage. Unsupported leaves lower coverage. The value is clamped to `[0, 1]` and must be deterministic.

The same accepted event log, policy version, and claim ID must produce byte-equivalent normalized kernel output regardless of insertion order, model provider, or application interface.

## Scoring

Each response is scored against the sealed gold record on:

| Dimension | What is measured |
| --- | --- |
| Evidence precision | Cited nodes and paths that belong in the gold record |
| Evidence recall | Required nodes and paths recovered |
| Lineage accuracy | Correct temporal and supersession order |
| Epistemic accuracy | Observation, inference, proposal, witness, and harvest kept distinct |
| Contradiction preservation | Both sides surfaced without false reconciliation |
| Harvest accuracy | Current actionable form identified without overstating closure |
| Tension disclosure | Required unresolved questions remain visible |
| Change sensitivity | Concrete evidence or events that could alter the answer |
| Unsupported elevation | Penalty for claims promoted beyond their evidence |
| Usefulness | Blinded human assessment of clarity and decision value |

Structural dimensions are computed from IDs and paths wherever possible. Human judgment is reserved for usefulness and genuinely equivalent wording.

## Passing Thresholds

TranchNode `v0.1` passes only if all of the following hold:

1. `evaluateClaim` is deterministic across repeated runs and insertion orders.
2. Changing the synthesis model does not change normalized kernel results.
3. Evidence precision is at least `0.90` and evidence recall is at least `0.85` across the complete run set.
4. Epistemic classification accuracy is at least `0.90`.
5. Every sealed contradiction pair is surfaced in every question where it is relevant.
6. No required unresolved tension is silently reported as resolved.
7. No source is falsely attributed and no scope boundary is crossed.
8. TranchNode exceeds baseline RAG by at least `0.20` on the preregistered composite structural score for each model family.
9. TranchNode's mean blinded usefulness score is not lower than baseline by more than `0.25` on a five-point scale.

If a threshold fails, report the failure without changing the test. The next move is either a versioned kernel repair or a narrower claim about what TranchNode actually improves.

## Ontology Readiness Gate

Implementation must not begin until the ontology also freezes:

- the minimal `TranchEdge` record;
- edge direction and semantics for all nine relationship kinds;
- whether and how edge assertions are disputed or superseded;
- same-scope rules and any explicit cross-scope bridge rule;
- accepted-event identity and deterministic ordering;
- the traversal rules used to construct supporting, contradicting, dependency, and tension results.

Without these definitions, two conforming implementations can return different claim positions while both appearing to satisfy the current documents. That would make the evaluation decorative rather than binding.

## Evaluation Artifacts

After this document is accepted, add only the fixtures and harness needed to run the proof:

```text
evaluation/
  corpus.jsonl
  manifest.json
  graph.jsonl
  gold.json
  prompts/
    answer.md
  results/
```

No chatbot, Garden UI, autonomous agent swarm, or application integration belongs in the first executable milestone.
