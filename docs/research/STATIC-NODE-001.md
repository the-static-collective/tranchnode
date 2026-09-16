# STATIC-NODE-001 — Research Boundary

Date: 2026-09-16
Status: experimental / non-canonical

STATIC-NODE-001 is the first bounded proof of the Static Node generational loop:

```text
PARENT -> CHILD -> RECEIPT -> HOLD
```

It exists to test whether one running parent checkout can create an isolated child worktree, run one explicitly declared build and verification pair, preserve exact ancestry and delta evidence, emit a Workmark only for a verified child, and stop without promotion.

Founding laws:

- `PARENT != CHILD`
- `CHILD != COPY`
- `BUILD SUCCESS != VERIFICATION SUCCESS`
- `VERIFICATION SUCCESS != PROMOTION`
- `WORKMARK != CURRENCY`
- `WORKMARK != HUMAN WORTH`
- `WORKMARK != AUTHORITY`
- `GREEN CHILD != PROMOTED CHILD`

The detailed executable contract lives at `docs/superpowers/specs/2026-09-16-static-node-001-design.md`.

No scheduler, daemon, autonomous task selection, agent loop, merge path, deployment path, restart path, economic policy, reputation score, Dogram dependency, or promotion authority is created by this research slice.

Working seal:

> **THE RUNNING NODE MAY BUILD ITS SUCCESSOR, BUT MAY NOT DECLARE ITS SUCCESSOR.**
