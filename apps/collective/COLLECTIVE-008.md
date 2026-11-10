# COLLECTIVE-008 — The Aperture Dividend (experiment-selection research)

**State: experimental, stacked on draft COLLECTIVE-007.** This is an explicit local decision-support interface, not autonomously researching the internet, not sending questions by itself, and not a validated model of probabilities or truth. Device-to-device field deployment is still unverified. An attempted local Chromium end-to-end check was blocked by the browser environment administrator (`net::ERR_BLOCKED_BY_ADMINISTRATOR`), so browser UI behavior remains unverified despite passing module and Node tests.

## Research question

Given several *independent what-if inquiry threads* and a fixed, previously accepted evidence graph, **which candidate question, if answered, might change the greatest number of distinct thread conclusions?** Can a bounded deterministic planner expose the conditional consequences, preserve provenance, and make failure conditions visible?

## Actual implementation

- `experiment-planner.mjs` accepts only open threads with **current, ledger-head-bound** COLLECTIVE-007 inquiry receipts. Each candidate is attached to the exact thread/receipt that nominated it. Similar questions are deduplicated by ordered endpoint pair; that is **not** corroboration.
- The local worker runs two **hypothetical outcomes** per thread that nominated a candidate: `supports` and `denies`. In both cases, outcomes are isolated graph overlays; neither is written to the observed TranchNode-like event ledger.
- It calculates whether each branch's conditional `status + path` differs, the number of branches with a possible supported-path split, and a transparent ranked score: `100 × discriminated threads + 10 × path splits + number of nominating threads`. The exact score is **heuristic**, not calibrated probability, entropy estimation from data, or statistical independence across threads.
- Under an *explicitly illustrative 50/50 binary response prior*, an answer has **at most one bit of joint answer information**. The number of affected branches is **not** multiple independent bits. An inconclusive real answer is possible but is not modeled by the binary counterfactual.
- Analysis is bounded to **2–512 simulation credits** and **36 candidate questions** over at most 24 fresh threads. Every yes/no route evaluation costs one unit. A candidate is never partially evaluated; partial-budget results are labeled as such, and if none discriminates the planner **abstains**.
- A browser Web Worker executes the research when the operator clicks **CHOOSE THE NEXT EXPERIMENT**. The resulting ranked list shows the conditional statuses of relevant threads and a **PREPARE** button. Preparing fills the existing network question box but **does not contact a peer**. Existing approval/consent still governs later peer inquiries.
- A separate `experiment_plans` IndexedDB object store (schema migration version 4) retains bounded hash-checked, local-only plan receipts with source ledger head, thread revision, source research receipt IDs, candidate predictions, simulated budget, and `automaticPeerContacts: 0`. Stale results are marked and no longer offer an active prepare button.
- As in the earlier work, signing keys authenticate possession, not persons; asserted graph edges are **not independently established facts**. False premises and misleading sources can produce poor plans.

## Test and reproducibility

Node.js 22+, from repository root:

    node --test test/collective008-planner.test.mjs
    node test/collective008-benchmark.mjs
    node --test test/collective-app.test.mjs test/collective004-network.test.mjs test/collective005-routing.test.mjs test/collective006-threads.test.mjs test/collective006-feedback.test.mjs test/collective007-inquiry.test.mjs test/collective007-worker.test.mjs test/collective008-planner.test.mjs

The benchmark has **180 fixed synthetic tasks** (60 per regime), three equally informed selection policies, and a *hidden until evaluation* scripted yes/no response. The metric is **supported paths after the one selected question**, not actual entropy, discovery of new mathematics, or ground-truth precision. All task outcomes are author-designed; the result is a transparent test of the particular heuristic, **not evidence of superiority to an equally informed classical planner**.

| Synthetic regime (60 tasks each) | Planner paths | Frequency-only paths | Alphabetic paths |
|---|---:|---:|---:|
| Shared useful question | 180 | 180 | 60 |
| Common but irrelevant question | 60 | 0 | 60 |
| **Adversarial answers**: highly ranked shared question gets `denies`, singleton is useful | **0** | 0 | **60** |

The adverse case matters: **maximizing conditional relevance is not the same as maximizing actual progress.** The heuristic has no observed model of likely answers, test reliability, social costs, or the real-world consequence of a negative answer. Synthetic counterexamples are prerequisites for honest reporting, not proof the system learns automatically.

## Repeatable manual workflow

1. Record non-sensitive, locally asserted relations. Create multiple **What-If** branches and fork diverging assumptions.
2. Select **Investigate All Open Threads** to obtain current budgeted receipts.
3. Choose a planner budget and click **Choose the Next Experiment**. Inspect which branches could change under each outcome.
4. Select **Prepare Question**. No statement is sent, and no hypothetical assumption is transmitted. If desired, explicitly choose an approved peer and ask. The peer may decline.
5. If verified, newly received evidence is **separately reviewed and admitted** into local evidence. Then old plan receipts turn stale and must be recomputed. No automatic fact promotion or peer contact occurs.

## Remaining hard frontier

We still lack real-world calibrated answer likelihood, costs, independent cross-source reliability, conversational and visual hypothesis semantics, a deployed app/relay, actual phone-to-phone WebRTC field verification, the full canonical TranchNode kernel, and independent validation on held-out non-synthetic inquiry problems. The next experiment should **compare calibrated exploration/anti-echo policies and non-Greedy multi-step question selection under concept drift** while measuring evidence quality and *not* rewarding simple agreement.
