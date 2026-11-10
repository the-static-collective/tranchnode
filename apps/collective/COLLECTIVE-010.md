# COLLECTIVE-010 — The Calibration Crucible: outcomes, not echoes

**Research only. Stacked on draft COLLECTIVE-009 (and all earlier draft branches).** No deployed Android field trial, no automatic empirical source validation, and no general-intelligence claim.

## Research question

Can MOTIF's next-question strategy use a separate stream of independently *claimed* resolutions to assess forecasts through **causally ordered, held-forward proper scoring rules**, instead of treating more signed agreement as more truth? Does it reveal when a previously useful forecasting assumption becomes harmful under concept drift?

## Implementation

- `calibration.mjs`: explicit, immutable, hash-checked resolution receipts in a *separate* local IndexedDB object store (`resolution_checks`; DB version 6). Each case needs an independent-check method, a reference string, question-family tag, unique case ID, and group ID. Cases sharing a declared provenance group count **at most once**. Mixed-polarity groups are quarantined for fitting rather than settled by a vote. Source signatures and peer consensus **never** create a resolution receipt.
- **No false verification**: the application cannot check whether an entered reference truly represents an independent measurement, an externally documented finding, or a previously sealed benchmark answer. The receipt explicitly says `USER_DECLARED_NOT_AUTOMATICALLY_VERIFIED`; `worldFactCertified=false`. A reference isn't a proof. This is an *audit-ready record*, not an external truth authority.
- A bounded **Beta-shrunk, exponential-recency-weighted** model estimates (a) probability a check resolves the question and (b) probability the answer supports the candidate, conditioned on resolution. No calibrated profile is offered with fewer than **eight distinct declared case groups** in the same question family. Repeated statements from one group cannot meet that threshold.
- `scoreChronological`: evaluates each eligible case only against earlier recorded cases with timestamps strictly preceding the held-forward case. Report **Brier scores and log-loss**, always compared with explicit fixed uncalibrated baseline priors. It exposes loss under sudden concept drift. This is prequential **synthetic/outcome-labeled evaluation**, not a guarantee of calibration on real-world tasks.
- `calibration-ui.mjs`: reference-backed resolution entry, family-scoped metrics, export with provenance and warnings. No observed evidence ledger edits or automatic peer messages.
- Opt-in check in `adaptive-ui.mjs` injects family-scoped forecasts into the existing COLLECTIVE-009 two-step strategy via its existing explicit `profiles` interface. Default remains **OFF**. New resolution records mark the previous trained strategy stale. A mid-computation resolution change aborts saving the strategy, so the new evidence cannot be silently attributed to an older model.
- The full chain of accepted source claims remains separate from the chain of *asserted external outcomes*. Scenario ideas and research predictions cannot become truth automatically. No personal identity verification, cryptographic remote attestation, or actual source independence check is implemented.

## Reproduce

Node.js 22+:

```
node --test test/collective010-calibration.test.mjs
node test/collective010-benchmark.mjs collective010-benchmark.json
node --test test/collective0*.test.mjs
```

The benchmark uses four **scripted** regimes with 240, 240, 240, and 192 pseudo-outcomes respectively. Numbers are produced by deterministic code, not human field adjudication. Different test regimes are NOT proof of an AI improvement over equally informed classical inference: this model is itself a conventional weighted Bayesian estimator.

### Synthetic, held-forward Brier results (lower is better)

| Scenario | Conditional-support model | Static 0.5 prior | Answerability model | Static 0.85 prior |
| --- | ---: | ---: | ---: | ---: |
| Stable 80%-support, 80%-answer | 0.162257 | 0.250000 | 0.181571 | 0.182414 |
| Abrupt supports→denies drift | **0.256853** | **0.250000** | **0.107736** | **0.106983** |
| Mostly inconclusive checks | 0.260379 | 0.250000 | **0.156374** | 0.592759 |
| One 128-echo group vs 64 denial cases | 0.021600 | 0.250000 | 0.000459 | 0.022500 |

**Negative result:** under abrupt regime change, historical calibration performs worse than the static 0.5 support prior. In the mostly-inconclusive regime, answerability improves but conditional support does not. The 128 echoed cases count as **one declared group** and cannot drown 64 distinct denial cases.

All numbers concern **synthetic labels author-supplied by this test**, with an explicit nonzero warmup. Even excellent Brier scores here do **not** show that the app can distinguish correct external evidence from made-up reference IDs.

## Unsolved falsifiers

1. Independently examine actual field experiments and verify original references, blinded before the forecast. The operator's declaration alone is not enough.
2. Improve provenance/independence graph: a single coordinated origin may use many group IDs or signing keys. Our code trusts group labels and cannot detect collusion.
3. Benchmark against stronger equally-informed drift-aware baselines and proper cross-domain holdouts; measure calibration separately by question family, bias, coverage, selection effects and sample size.
4. Detect abrupt drift and avoid overconfident stale models; time decay alone is insufficient.
5. Validate full application on physical mobile devices, relay security, and native canonical TranchNode integration. Previous stacked pull requests remain unmerged.

**Research conclusion:** a falsifiable calibrated-outcome feedback *interface* exists; externally certified real-world calibration does not.
