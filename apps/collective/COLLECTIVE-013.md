# COLLECTIVE-013 — Temporal trajectories

Research-only extension to COLLECTIVE-012. It scans repeated dated operator-declared changed/unchanged checks on two distinct recorded relations. Targets must have subsequent conclusive checks within a user-selected horizon; missing checks are **censored**, not negatives. A target report can be counted only once. Exact duplicate declared source references are rejected as obvious echoes, but independent provenance is not verified.

Training/holdout separation is chronological. A Beta(1,1)-smoothed difference in changed-report rates is evaluated using held-out Brier score vs an equal-data constant-rate baseline. Model failure under shift and common-cause false discovery are explicit failure modes.

Reports are not event times. This software does **not** infer exact change onset, causal direction, or intervention effects. No physical-world fact is promoted, no peer contacted automatically, and the parent PWA/Android live field operation is not yet confirmed. Hash-checked research records persist in local IndexedDB. Use non-sensitive test data.

Reproduce: `node --test test/collective013-trajectories.test.mjs`. Synthetic demonstrations are author-created, not real-world validation.