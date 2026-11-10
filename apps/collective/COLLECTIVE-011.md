# COLLECTIVE-011 — THE PRESUMED DELTA

## Research question

A recorded assertion may have been accurate *then*, yet the world can change without producing a new ledger event. Can a locally controlled TranchNode-inspired reasoning interface represent an age-dependent **possibility of change** while never silently converting an assertion to false or promoting an unsupported guess to fact?

## Implemented

- `temporal.mjs`: monotone integrated hazard `H(t)=ln(2)[t/L + (a/2)(t/L)^2]`, where `t` is days since the anchor, `L` is a model scaling period and `a>=0` is optional accelerating volatility. The modeled chance of **at least one relevant change** is `1-exp(-H(t))`. With `a=0`, `L` is a conventional exponential half-life. With `a>0`, `L` is a scale parameter **not exactly a half-life**.
- Operator chooses among illustrative `invariant`, `slow`, `ordinary`, `fast`, `rapid` rates for each immutable local claim or imported source. **None are learned from field data**. Rate choice is an assumption recorded in a separate, hash-checked, append-only research log. Mathematical invariants may be marked time-invariant, but the truth of a formula is not established by that annotation.
- Locally authored claim: the assertion creation timestamp is a *weak time orientation*, not independently confirmed truth. Imported signed statement: receipt timestamp **is not a verification timestamp**. Such sources have an *unknown* age anchor until a user declares a separate check.
- A recheck requires a user-supplied reason and reference. Only `unchanged` rechecks update the check-age anchor. `changed` results get an explicit `RECHECK_REPORTED_CHANGE` warning and still do not change the source graph; `inconclusive` results do not reset freshness.
- No source nodes are edited or automatically made false. No local query, hypothetical assumption, or network question is sent automatically. A recalculated projection can flag additional rechecks **without a change in ledger hashes**.
- `temporal-ui.mjs`: mobile panel for reviewing modeled age, classifying volatility, manually recording reference-linked checks, and exporting sensitive research-only forecasts. Presentation can update on a one-minute local timer while visible; no background server access.
- `store.mjs`: IndexedDB version 7, append-only `temporal_annotations`, hashed records with scope validation. This is a locally auditable projection, not remote identity authentication, not a tamper-proof distributed log.
- `adaptive-ui.mjs`: informational temporal caution on otherwise current two-step strategy: `CURRENT_SNAPSHOT` describes the *ledger*, not necessarily the present world. This does not silently change answer priors or transmit anything.

## Falsifiers

    node --test test/collective011-temporal.test.mjs
    node test/collective011-benchmark.mjs

Tests include monotonicity, acceleration, non-decaying declared invariants, future-clock rejection, imported timestamps not implying rechecks, classification not resetting the anchor, changed/unknown rechecks, hash and scope tamper, and time-dependent review on an unchanged source ledger.

The benchmark is **entirely synthetic**, using an author-defined generator. When the generator uses the model's rates the model may look better than a constant model; that's not independent validation. An unanticipated stable world or abrupt rate increase can make the model **miscalibrated**. No real-world speed of change is inferred from that test.

## What it does NOT establish

- Time does **not** make a correct claim false by itself, and a world state may change and later return to its earlier value. The model only concerns *at least one* relevant state change under hypothetical hazard assumptions.
- A user's declaration or reference does not certify independent verification.
- A stable mathematical identity and a particular person's current location need entirely different temporal treatment.
- Age-dependent uncertainty is not automatically equivalent to lower truth probability or calibration of a peer's response rate.
- This prototype is not physically field-validated, has no cross-device live deployment, and cannot independently browse or verify worldly changes. The branch is stacked on unmerged draft COLLECTIVE-003 through 010.

## Next tests

Collect genuine reference-verified dated change histories, fit separate hazards by question domain and context, use time-to-event survival analysis with censored outcomes, detect abrupt change points, and compare held-out Brier/log-loss with static and exponential baselines. Preserve group independence and anti-echo checks. For now rates remain editable assumptions and results remain labeled modeled—not verified.
