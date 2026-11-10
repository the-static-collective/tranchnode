# COLLECTIVE-015 — THE WEAK-SIGNAL APERTURE

**Status:** research prototype, based on COLLECTIVE-014, itself an unmerged draft. No autonomous browsing, mobile field validation, actual market-data connection, verified ground-truth regime transitions, or established causal inference.

## Hypothesis

Can several individually weak, user-reported, dated changes jointly warn of a **later reported change to a target relationship**, before a target-only forecasting method recognizes it? Can this be evaluated without information leakage, silent imputation of missing observations, automatic conclusion promotion, or claiming independent corroboration from possibly related sources?

## Implementation

- `early-warning.mjs` consumes at most 4096 existing temporal-check records and **one target + two to four other recorded relationships**. The existing `checkBuckets()` normalizes calendar time, excludes repeated exact references per relation, and leaves missing bins **unknown**, not `unchanged`.
- Uses only indicator and target reports available **by decision bin `t`**. The target is scored at `t + leadBins`, with a 1–4 calendar-bin training embargo. Predicts an observed `changed` fraction in a **future checked bin conditional on checking**, not when a real-world state actually changed.
- Source feature vector: recent reported-change level, relative recent-vs-history rate, positive anomaly, *pairwise conjunction* of simultaneously elevated indicator levels, and target's previous checked level. Requires recent coverage: two observed bins within the last four, one within the last two, and at least three older bins per source.
- Deterministic batch logistic regression with fixed ridge penalty, fixed training epochs and bounds; **no proof of calibrated probability**. At least 20 earlier resolved examples are required. Never trains on the evaluated future label. Missing indicators cause an abstention instead of treating no checks as absence of changes.
- **Classical controls**: target-only exponentially weighted moving average (EWMA), Beta(1,1)-smoothed expanding target-only rate, and a separate, explicit target-only CUSUM alarm diagnostic (not itself a probability). The multi-source model is *not preferred* when its recent chronological Brier score is worse than target-only EWMA.
- A user-visible `EARLY-WARNING APERTURE` panel lets the operator select target/indicators/horizon, inspect a recent-holdout comparison, export a signed-*locally-hashed* research receipt, and **prepare** an explicitly manual target recheck. Nothing is transmitted or entered as accepted worldly evidence.
- IndexedDB version **11** adds append-only `early_warnings` receipts with existing scope and integrity checks; source and temporal ledger heads are pinned. The service worker caches both new local JS modules.
- Independent identity **is not verified** merely because source reference strings differ. Exact overlap across indicator check references produces an explicit warning; different strings may still derive from one origin. Choosing many possible indicators until one appears predictive creates multiple-comparison bias, uncorrected in this experiment.

## Reproduction

```sh
node --test test/*.test.mjs
node test/collective015-benchmark.mjs
node --check apps/collective/early-warning.mjs
node --check apps/collective/early-warning-ui.mjs
```

## Frozen synthetic falsifier

The benchmark is authored, synthetic, and deterministic: **72 series** (18 seeds × four regimes × 100 checked bins). It compares future reported changed-check predictions with two equally informed, target-only statistical baselines. Hyperparameters are not tuned against future labels; the final 25 eligible checked target bins are scored after each chronological fitting step.

| Constructed environment | Combined Brier | Target-only EWMA | Constant target-only | Combined vs EWMA |
|---|---:|---:|---:|---|
| Two temporally overlapping precursor generators | 0.19053 | **0.17639** | 0.18277 | Worse |
| Stable independent changed-report rate | 0.14733 | 0.16733 | **0.14456** | Better than EWMA, worse than constant |
| Previously predictive sources reverse in final third | 0.32014 | **0.24151** | 0.33537 | **Much worse** |
| One indicator adds modest noise | 0.17299 | 0.19450 | **0.16930** | Better than EWMA, worse than constant |

**Important negative result:** The multi-source strategy did **not** beat the EWMA in the constructed conjunction case. It was severely misled by an abrupt inverse relationship in another case. There were **zero alerts** at the explicit high threshold, so the benchmark does not establish useful early warning or measured advance warning time. Real-world data will be far harder. Do not imply that the engine successfully anticipates transitions from this result.

This is not a probability the entire world is changing, a transition-onset timestamp, a causal link, independent-source corroboration, or a recommended use for safety-critical decisions.

## Next falsifiable experiment

Use separately documented, consented, **independently checked** historical change logs that include real timestamps and a priori target/indicator relationships. Preregister indicator selection and alert thresholds, compare lead time, false alarms per calendar week, cost per check, source-group deduplication, and strictly locked forward test sets against CUSUM, EWMA, persistence, and simple base-rate checks. Test whether hypothetical cross-thread 'shared precursor' links add value beyond conventional signal processing. Also validate actual on-device IndexedDB/UI behavior; JavaScript unit tests alone cannot do that.
