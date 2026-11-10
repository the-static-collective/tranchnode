# COLLECTIVE-006 — The What-If Forest & Learning Receipt

**Research grade. Stacked on COLLECTIVE-005 / COLLECTIVE-004 / COLLECTIVE-003, all currently draft.** Not a deployed multi-device application, not the canonical TranchNode event kernel, and not autonomous inquiry orchestration.

## Questions

Can one local node preserve several independent, optionally forked lines of inquiry while asking different "what if?" questions without allowing a hypothetical premise to contaminate the observed history?

Can the existing consented peer router learn from **actual locally admitted evidence relevant to a question** without interpreting a declined inquiry as ignorance or a cryptographic signature as worldly truth?

## Implemented boundaries

- **Separate hypothetical event ledger**: scenario event history is stored in an IndexedDB object store distinct from observations. Every branch carries an immutable research event chain. Branch creation pins the source ledger head. A child fork points to a specific parent revision and inherits only the assumptions visible at that exact revision; subsequent parent/child edits never leak across branches.
- **Parallel, bounded branches**: up to 24 threads, 16 active assumptions each, 128 events per thread. Each may be held, resumed, archived, forked, or compared alongside all others. Active assumptions are `proposal`-class hypothetical overlays created **only during evaluation**; the recorded graph remains unchanged. Retracting an assumption appends a research event rather than deleting its history.
- **Counterfactual comparison**: each scenario displays both what recorded assertions alone support and what would follow *conditional on* its assumptions. Contradictions return HOLD. Each result separates actual evidence node IDs from hypothetical premise IDs and explicitly states `verifiedWorldTruth=false` and `automaticPromotion=false`.
- **Optional peer inquiry**: the human may copy a particular thread's question into the existing consented router; nothing is sent until the human separately chooses a peer and clicks Ask. The thread ID is bound to the outgoing request and its response, but **private hypothetical assumptions are never transmitted**.
- **Local usefulness receipts**: selected inquiry receipts record `sent`, `received`, `declined`, or **`admitted`**. Only an actual, verified, explicitly accepted response may receive a relevance label; it is positive when the local, *observed* graph now supports the requested path or expands the reachable frontier, and never when contradiction requires HOLD. Declines, silence, and nonadmitted packets are neutral about peer competence.
- **Conservative router update**: for the exact question `from→to`, a bounded, Laplace-shrunken ±4 adjustment weights relevant vs irrelevant *admitted* outcomes. Original prior-source heuristics remain visible. A router is an **ordering suggestion**, never proof of a peer's knowledge, a permanent trust score, or an action grant. The operator can still choose any approved peer, preview the next candidate, or manually ask everyone.
- **No external operations**: no background peer asking, no private inventory search, no automatic source acceptance, no autonomous execution or social ranking.

## Reproduction (Node.js 22+, standard library)

    node --test test/collective006-threads.test.mjs test/collective006-feedback.test.mjs
    node --test test/collective005-routing.test.mjs
    node test/collective006-benchmark.mjs
    node --check apps/collective/app.mjs
    node --check apps/collective/thread-ui.mjs

GitHub Actions also checks the previous suites and archives the machine-readable benchmark. The static PWA's service worker now includes the three new modules. Browser/mobile deployment and IndexedDB end-to-end usability remain to be field-verified.

## Frozen synthetic feedback-control comparison

A script creates 120 **independently labeled synthetic problems per regime**, with six peer identifiers each. It exposes exactly the same admitted source hints and the same user-admitted feedback to an old history-only router, a router using outcome receipts, and an uninformed cyclic-order baseline. An oracle knowing the helpful peer is shown only as a lower bound. These are deterministic **author-controlled outcomes**, not a real autonomous learning study.

| Regime | Old router first / 120 | Feedback first / 120 | Cyclic baseline first / 120 | Mean contacts old → feedback |
|---|---:|---:|---:|---:|
| Warm (helpful historical source) | 120 | 120 | 20 | 1 → 1 |
| Cold (no prior source hint) | 20 | 120 | 20 | 3.5 → 1 |
| Misleading historical affinity | **0** | **120** | 20 | 4.167 → 1 |
| **Concept drift** (previously helpful is now unhelpful) | 20 | **0** | 20 | 3.5 → **4.167** |

The last row is a falsifier: the learned policy can harm performance as the field changes. The benchmark is intentionally built to show success/failure regimes, not calibrated real-world performance or superiority to classical, equally informed ranking algorithms.

## Known limitations and next experiment

This app currently works with `from→to` relationships and ordinary graph reachability, not arbitrary open-ended natural-language hypotheses. Multiple threads are maintained as distinct persisted investigations but are **not running general AI models simultaneously**, and peer questions still contain only endpoint labels, not whole thought traces.

Signing keys authenticate bundles, not a person or the truth of a claim. The research-event hashes are **local** and do not resist an adversary who controls the full store. Research branch export may expose question text and hypothetical assumptions, so treat exports as public whenever shared.

COLLECTIVE-007 should introduce independent evaluation workers for heavier counterfactuals, frozen benchmark tasks, counterexample generation, model-free information gain under strict budgets, time-aware source quality, per-thread evidence receipts, explicit consent to transmit a carefully redacted hypothetical subquestion, and browser/mobile field testing. Avoid a feedback loop that simply amplifies familiar or compliant peers.
