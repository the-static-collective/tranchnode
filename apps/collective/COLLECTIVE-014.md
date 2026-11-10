# COLLECTIVE-014 — Trajectories of Trajectories

This is a bounded research experiment **inspired by financial market forecasting methods**, applied to time-ordered manual check reports about real-world relationships. No market prices, trading access, causal conclusions, or actual world event onset estimates.

## Implemented
- UTC-aligned 1/7/14/30-day observed check bins; gaps are unknown, not unchanged. Inconclusive checks are excluded; identical literal references counted once per relation (not proof of independent sources).
- **Rate momentum and acceleration** from fixed consecutive calendar bins, and **volatility clustering** candidates (variance comparison). A tested set of 2–6-bin lags may yield **exploratory, multiple-tested periodicity**, not confirmed seasonality.
- A **predeclared, fixed fast/slow EWMA** forecasting rule: alpha 0.42 versus alpha 0.12 with a fast switch when momentum > 0.10 after at least six observed bins. Baseline: expanding Beta(1,1)-smoothed historical rate.
- Chronological expanding walk-forward scoring on the last quarter of observed bins, default one calendar-bin embargo before each forecast. Brier error per **individual conclusive report**. Abstain when fewer than 16 observed bins, or when held-out count is insufficient.
- Mobile-friendly, optional dashboard; only operator can run, export, or prepare a manual recheck. No automatic network contact or ledger modification.
- IndexedDB version 10: append-only, scoped hash-checked \`regime_scans\` research receipts; source ledger and original check history remain intact.
- Fixes COLLECTIVE-013 initialization bug: unconditional refresh of uninitialized trajectory UI.

## Local validation
Run \`node --test test/*.test.mjs\` and \`node test/collective014-benchmark.mjs\`. The full packaged local workspace passed **110 Node regression tests**, including 16 regime tests, and syntax checks.

## Constructed benchmark — NOT field or financial validation
24 fixed seeds × five synthetic regimes (140 dated weekly checks each). Dynamic EWMA vs expanding historical rate under chronological last-quarter evaluation, one-week embargo. Mean Brier (lower better):

| Regime | Adaptive | Baseline |
| --- | ---: | ---: |
| Stable | **0.200459** | **0.163508** |
| Smooth ramp | **0.206461** | 0.286471 |
| Sudden increase | **0.145826** | 0.438785 |
| Sudden decrease | **0.163589** | 0.455206 |
| Alternating reports | **0.191100** | 0.248969 |

**Failure matters:** the dynamic model is significantly **worse under stable conditions**. The generator is synthetic and its regimes are easy to recognize; results cannot establish field predictive accuracy, generalized intelligence or any advantage over a well-tuned, equally informed classical method.

## Why financial forecasting methods are useful but not interchangeable
- Regime detection, EWMA trends, volatility clustering, and volatility regime shifts provide useful descriptions of changing patterns. They do not reliably forecast real-world behavior by themselves.
- Chronological training/test separation with a deliberate \`gap\` prevents one common source of leakage: https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html
- Methods identifying volatility regimes from change points and clustering: https://doi.org/10.1080/1350486X.2021.2007146
- Sparse checking, confounding, varying observation policies, source echoes, and delayed detection can invalidate conclusions. The model forecasts **what an operator will report at the NEXT CHECK**, conditional on a check occurring—not when or whether the real-world condition actually changed.

## Next falsifiers
Verify a held-out dataset with independent time-stamped inspections; benchmark against seasonal-naive, EWMA/CUSUM/change-point and regime-switching controls at equal compute and observation budgets; account for missing-not-at-random checks and interval-censored event times; prove that alerts improve practical follow-up decisions; conduct mobile browser field validation.
