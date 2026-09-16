# STATIC-NODE-001 — Research Boundary and Proof Receipt

Date: 2026-09-16
Status: executable experimental candidate / non-canonical / authority none

STATIC-NODE-001 is the first bounded executable proof of the Static Node generational loop:

```text
PARENT -> isolated CHILD -> BUILD -> VERIFY -> RECEIPT -> optional WORKMARK -> HOLD
```

It proves that one clean parent checkout can create an isolated Git child worktree from its exact `HEAD`, run one explicitly declared build and verification pair inside the child, preserve ancestry and delta evidence, emit a Workmark only for a verified child, and stop without promotion.

## Founding laws

- `PARENT != CHILD`
- `CHILD != COPY`
- `BUILD SUCCESS != VERIFICATION SUCCESS`
- `VERIFICATION SUCCESS != PROMOTION`
- `WORKMARK != COMMIT`
- `WORKMARK != CURRENCY`
- `WORKMARK != HUMAN WORTH`
- `WORKMARK != AUTHORITY`
- `GREEN CHILD != PROMOTED CHILD`
- `PARENT -> CHILD -> RECEIPT -> HOLD`

The detailed contract lives at `docs/superpowers/specs/2026-09-16-static-node-001-design.md`; the execution plan lives at `docs/superpowers/plans/2026-09-16-static-node-001.md`.

## Executable surface

Pure kernel:

```text
src/static-node.ts
```

Local opt-in process seam:

```text
npm run static-node:001 -- \
  --repo /absolute/path/to/clean/repo \
  --task-id example-001 \
  --build "<explicit operator command>" \
  --verify "<explicit operator command>" \
  --output /absolute/path/outside/parent/and/child
```

The runner executes operator-supplied shell commands. It is a local developer tool, **not a sandbox**. It does not accept tasks or commands from repository content, model output, issue bodies, network responses, or receipts.

Every completed attempt emits `attempt.json`. Only `verified_child` emits `workmark.json`. Every attempt receipt fixes:

```json
{
  "disposition": "HOLD",
  "promotionAuthorized": false
}
```

The process contains no merge, rebase, cherry-pick, push, tag, release, deploy, restart, scheduler, daemon, autonomous task-selection, or promotion interface.

## TDD / proof receipt

### Kernel RED -> GREEN

- RED `bd0c700021eb1326acfe95f2cc07be8a035b5cb2`: test-only kernel contract; `check` run #128 failed at `npm run check` with the production module absent.
- GREEN `d096974dfe1edb475bdda40a27dcb9762cecd0e2`: pure receipt/Workmark kernel; `check` run #129 passed the full repository proof.

The kernel freezes deterministic receipt identity, fixed HOLD/non-promotion fields, Workmark-only-on-verified-child, failure receipts, and ancestry/delta sensitivity.

### Real child RED -> GREEN

- RED `10a8866ac3bbc12b3f41abd5a7c2ba0353600884`: temporary-repository integration test required a real isolated child worktree; `check` run #130 failed with the runner absent.
- GREEN carrier `48470368d22d0dc21cc2fdd403a34e18918fcceb`: runner + package surface; `check` run #132 passed the full repository proof, including the real temporary Git parent/child specimen.

The successful specimen proves that BUILD and VERIFY execute in the child while parent `HEAD` and parent file bytes remain unchanged.

### Hostile boundary RED -> GREEN

- RED `a99b7daef1bdcc7a0a40652d6fcb079b524cb8c2`: failure/refusal suite exposed that receipt output inside the parent could dirty the parent after the child run; `check` run #133 failed.
- GREEN `d8c9afeea61f95089e44bb1a9e16c2116c8f4e5a`: receipt output is now refused inside either parent or child; `check` run #134 passed the full suite.

The same hostile suite freezes:

- dirty parent refuses before child creation;
- build failure emits an attempt receipt, skips VERIFY, and emits no Workmark;
- verification failure emits an attempt receipt and emits no Workmark;
- parent `HEAD` remains unchanged across completed attempts;
- promotion-like CLI verbs are refused as unknown options;
- success and failure remain `HOLD`, never promotion.

## Authority boundary

No scheduler, daemon, autonomous task selection, agent loop, merge path, deployment path, restart path, economic policy, reputation score, Dogram dependency, or promotion authority is created by this research slice.

The Workmark is attributable birth evidence only. Later systems may measure, challenge, supersede, reuse, or economically interpret contribution history, but none of those meanings are present in the mark itself.

The future always-on Static workstation may consume this primitive. STATIC-NODE-001 does not decide the workstation host architecture or promotion policy.

## Working seals

> **THE RUNNING NODE MAY BUILD ITS SUCCESSOR, BUT MAY NOT DECLARE ITS SUCCESSOR.**

> **THE PARENT MAY BUILD THE CHILD WITHOUT BECOMING THE CHILD.**

> **WORK MINES THE MARKER. TIME MAY ASSAY IT LATER.**

> **GREEN CHILD != PROMOTED CHILD.**
