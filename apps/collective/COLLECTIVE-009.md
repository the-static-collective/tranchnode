# COLLECTIVE-009 — Discovery Dividend and the Strategy Pivot

**Research prototype, not deployed.** This work is stacked on the draft COLLECTIVE-008, -007, -006, -005, -004 and -003 branches. The speculative nodes and projected answers in this system are *never accepted observational records*. No autonomous peer contacts or fact adoption occur.

## Question

Can several active MOTIF What-If investigations prefer a *gateway question* whose answer may not directly resolve anything but can open a valuable follow-up? Can a newly admitted unexpected answer force a fresh decision without misrepresenting learned probabilities as truth?

## Concrete implementation

- `adaptive-strategy.mjs` takes a frozen COLLECTIVE-008 planner receipt, pinned COLLECTIVE-007 inquiry snapshots, and an unchanged observed-assertion graph. It selects among the first **eight** eligible candidate relations, requiring that their starting endpoint be reachable in at least one current thread. Already asserted relations are ineligible for another ordinary first ask.
- It enumerates **supports**, **denies**, and **unknown/no usable answer** as *counterfactual outcomes*. A probability forecast of support and a separate probability of obtaining an answer are assumptions. No branch result enters the user's evidence ledger.
- A transparent utility proxy combines `12 × threads with conditional supported paths + apertureWeight × number of newly reachable candidate question doors`, less explicit per-question inquiry cost. The score values *potential future investigations*, not discovered facts or real-world benefit.
- A horizon-2 expectimax decision tree chooses a first question, then its *best second question conditional on the first answer*. An equally informed, horizon-1 myopic option is exposed to tests as a control. Both are deterministic classical planning algorithms, not a novel AI reasoning paradigm.
- Explicit model assumptions: fallback support chance 50%, answerability 85%, cost 1 model unit, opportunity weight 1. Operator controls these inputs. **They are not measured probabilities, calibrated truth estimates or dollars.** Zero benefit after estimated costs leads to ABSTAIN, not forced action.
- A weak, Laplace-shrunk, 30-day-decayed *propensity for signed source testimony* may replace the fallback support chance when at least **two distinct historical signing keys** have previously contributed. A single key is capped at one contribution, many claims from that key cannot multiply weight, and mixed positive/negative answer histories from that key are conservatively excluded from this particular coarse estimate. Keys do not establish actual independent humans or claim truth, and this crude prior is vulnerable to Sybil and selection bias. No claim of **probability calibration** is made.
- A full policy is bounded by 24 open threads, 1500 locally projected sources, eight candidates and 24–30,000 auditable route probes. Exhaustion refuses the entire incomplete plan instead of publishing a partially advantaged choice.
- Plans are content-digested and stored in a distinct `adaptive_plans` IndexedDB object store (migration v5). Canonical hashes use fixed six-decimal strings for fractional strategy parameters, preserving compatibility with the project's safe-integer JSON subset. A receipt contains its source research plan ID, evidence head, thread revisions, conditional branches and the explicitly zero external-authority counters.
- New admitted source evidence invalidates a saved policy. The operator must rerun investigations and the preceding Aperture planner before clicking the adaptive planner. `strategyChange` reports **PIVOT_AFTER_EVIDENCE** only when two separately pinned plans made *different* first-question recommendations after the evidence head changed. A pivot is not evidence the new answer is true or that the strategy change was causally beneficial.
- An explicit UI section shows both the chosen first question and follow-up recommendations for each simulated support, denial or unknown response. **PREPARE** fills existing network fields but does not communicate. Network consent remains independently required.

## Reproduction

Node 22+ with WebCrypto:

    node --test test/collective009-policy.test.mjs test/collective009-receipts.test.mjs
    node test/collective009-benchmark.mjs collective009-benchmark.json
    node --check apps/collective/adaptive-strategy.mjs
    node --check apps/collective/adaptive-ui.mjs
    node --check apps/collective/adaptive-worker.mjs

All previous suites in the existing stack remain necessary. The new GitHub workflow runs the cumulative tests and archives the machine-readable synthetic comparator.

## Frozen synthetic benchmark (36 author-designed cases/regime)

Each policy has the **same candidate edges, same prior probabilities, same experimental costs, same answer budget (up to 2 questions), and same hidden answers**. Both re-evaluate after the first answer with the updated synthetic assertion graph. The myopic comparator has horizon one, the adaptive planner horizon two. Every generated world is a trivial three-edge graph with one source edge. This is *not independently authored material* or a blinded field trial.

| Regime | Two-step supported paths after 2 | Myopic supported paths after 2 | Contacts two-step vs myopic |
|---|---:|---:|---:|
| Gateway is real: B→C and C→Z supported, B→Z denied | 36/36 | 0/36 | 72 vs 36 |
| Gateway fails: B→C denied, B→Z supported | 36/36 | 36/36 | **72 vs 36** |
| Unexpected second denial: B→C supported, C→Z denied, B→Z supported | **0/36** | **36/36** | **72 vs 36** |

The planner can successfully explore a *delayed opportunity*, but also wastes inquiries or loses completely if its forecast assumptions are wrong. The benchmark does not establish an overall superior policy, historical novelty, intelligence emergence, or real-world cost-effectiveness. It is intentionally a **positive and negative falsification battery**.

## Necessary next validation

1. Deploy the HTTPS/WSS PWA and confirm a physical Android-to-Android conversation with explicit approval and withheld evidence; previous browser attempts were blocked by the runner and there is no completed phone field test.
2. Calibrate forecasts on a held-out corpus with **chronological** splits and a proper scoring rule (e.g. Brier/log loss). Data must represent actual independently resolved question outcomes, not the number of agreeing signed claims.
3. Add explicit costs, abstention, optional weak-peer discovery, fair compute-matched classical dynamic-programming baselines, anti-Sybil attribution and cryptographic identity rotation.
4. Integrate the canonical TranchNode kernel and real MOTIF affordance machinery. This version is a documented graph-heuristic approximation.

**Epistemic rule:** Many interesting what-ifs do not add up to evidence. A conditional path plus a signing key is still not a verified world fact.
