# COLLECTIVE-007 — Independent investigative workers across the What-If Forest

**Experimental stacked research branch:** COLLECTIVE-007 depends on unmerged COLLECTIVE-006 (itself stacked on 005 → 004 → 003). No public phone-to-phone installation or full TranchNode kernel integration has been verified by this slice.

## Question

Can a single local instance investigate several incompatible *hypothetical* threads concurrently, with independent, finite inference budgets, while preserving explicit epistemic boundaries, stopping conditions, evidence provenance, and user-approved external questions?

## Implemented

- **Real browser workers, not simulated personas:** three module Web Workers may evaluate separate threads concurrently, with a hard per-worker four-second timeout and a maximum concurrency of three. Workers execute a deterministic classical reachability cartridge and have no automatic peer-communication path.
- **Per-thread allocation:** each open scenario has an independently stored **total** allowance of 2–256 inference credits (default 24). An invocation uses at most 24 currently unspent credits. Each call to graph reachability spends one credit; spending is recorded in an immutable research receipt. A given thread revision against a given source-ledger head is not automatically repeated, preventing accidental budget erosion. Adding new evidence or changing an assumption permits a fresh inquiry.
- **Separate research receipts:** records are stored in an IndexedDB `inquiry_runs` store separate from both the canonical source-event log and the 006 scenario-event log. Each includes a locally hashed report, frozen thread revision, observed ledger head, spent credits, stopping reason, evidence IDs, hypothetical IDs, candidate tests, and flags `automaticFactPromotion=false`, `worldTruthCertified=false`, `automaticPeerContact=false`. Local hashes catch incomplete tampering, not a storage owner who can rewrite all artifacts.
- **Three bounded investigative methods:** **ablation**, removing each hypothetical premise to see whether an inference is sensitive to it; **bridge probing**, trying both support and denial of missing graph edges under the meter; **contradiction diagnosis**, returning explicit HOLD and preserving both sides instead of majority voting. Even a supported path generates counterexample-seeking questions when feasible.
- **Epistemic isolation:** each worker receives a frozen copy of its one scenario and only the minimal locally admitted structured relationship data, whose signed sources are reaudited before dispatch. No worker writes to source history. Hypothetical outputs are labeled as proposals and have no automatic promotion.
- **Cross-thread echoes:** compare recent **current** reports for repeated unresolved questions or different scenario outcomes. These are idea pointers only, *not corroboration or facts*. Old reports visibly become stale after the source ledger or thread revision changes.
- **Consent boundary:** each suggested test has a **Prepare Question** button that only pre-populates the existing network question fields; the user must still choose and approve a peer and explicitly send. No assumptions, private graph inventories, or research transcripts are transmitted automatically.
- **Stopping:** a worker stops when its metered budget is exhausted, no discriminating candidate is found, the thread is held/archived, a contradictory relation requires HOLD, or it has questions to hand back to the operator.

## How to run

From the root of the source checkout (Node 22+):

    node --test test/collective007-inquiry.test.mjs test/collective007-worker.test.mjs
    node --test test/collective006-threads.test.mjs test/collective006-feedback.test.mjs
    node test/collective007-benchmark.mjs

The browser application under `apps/collective/` must be served from a secure context (HTTPS or localhost). Create several What-If threads, add contrasting assumptions, then choose **Investigate All Open Threads**. Replaying a saved report never writes a fact. A result's source ledger head and thread revision are displayed as CURRENT or STALE.

## Frozen synthetic control

`test/collective007-benchmark.mjs` runs 72 deliberately authored symbolic experiments (24 simple missing-link cases, 24 conditional-hypothesis cases, 24 explicit contradiction cases). It compares a sequential, equally informed, equally budgeted classical reference to the concurrent scheduler. **Their outputs must be byte-for-byte equal**. This establishes *concurrency and reproducibility*, not better mathematical intelligence, predictive success, or real-world autonomous discovery. The bridge scenario produces up to four proposed tests per case, hypothetical cases propose validation of the two premises, and contradictory cases HOLD. All questions are human-directed research prompts and never network transmissions.

## Limits and falsifiers

- The method handles directed `from → to` assertions, not arbitrary natural-language questions, real science experiments, or self-directed internet research. No LLM inference is performed by the worker.
- Budget is an **inference-call count**, not a measurement of CPU time or token usage. The per-worker wall timer additionally bounds a runaway worker; no real-time guarantee is claimed on mobile.
- Bridge selection is a heuristic that may favor low-information or misleading questions. The `estimatedDiscrimination` field is a binary counterfactual difference **not a calibrated probability or Shannon information gain**.
- Original `route()` uses global contradiction HOLD even when a tension is not on the queried path. This remains a known conservative limitation, not a solved issue.
- The full underlying source graph must fit a 1,500-assertion snapshot for this field lab. It accepts 24 threads and at most four worker slots, running at most three in the UI. No unbounded combinatorial exploration.
- An earlier run does not become a new witnessed fact or authoritative source; multiple branches agreeing with one another is not independent corroboration.
- There has been no verified physical-phone WebRTC field trial, user study, browser install test, or proof of increased research productivity. Tests use Node workers and synthetic graph problems.

## Next falsifier

COLLECTIVE-008 could add time-aware counterexamples, active intervention design, an explicit estimated-value-of-information model with calibrated uncertainty, real physical tests and honest external baselines, editable research goals and budgets, and validated linking to the actual TranchNode kernel and broader MOTIF cartridges. Continue to require human consent for network or physical actions.
