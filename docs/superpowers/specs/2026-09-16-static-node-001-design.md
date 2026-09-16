# STATIC-NODE-001 — Parent → Child → Receipt → HOLD

Date: 2026-09-16
Status: design approved in conversation; written spec awaiting human review before implementation planning
Authority: experimental / non-canonical

## Purpose

Prove the smallest executable form of the Static Node idea:

> **The running node may build its successor, but may not declare its successor.**

STATIC-NODE-001 is not an autonomous maintainer, self-updater, scheduler, daemon, merge bot, economic system, or agent authority layer. It is one bounded local build loop that starts from an attributable parent checkout, creates an isolated child worktree, performs one explicitly declared task in the child, verifies the result, emits exact receipts plus a contribution marker, and stops at `HOLD`.

The proof shape is:

```text
RUNNING PARENT
      |
      v
ISOLATED CHILD WORKTREE
      |
      v
DECLARED BUILD / CHANGE
      |
      v
DECLARED VERIFICATION
      |
      v
DELTA + ANCESTRY RECEIPT
      |
      v
WORKMARK
      |
      v
HOLD
```

The key negative proof is equally important:

```text
GREEN CHILD != PROMOTED CHILD
```

No success condition in v0.1 may merge, fast-forward, reset, overwrite, deploy, restart, push, tag, release, or otherwise cause the child to become the running parent.

## Why TranchNode owns the first proof

TranchNode already owns reusable continuity mechanics and the Continuity Spine distinction between present constituted state and proposed future carriers. Its governing law is already compatible with the Static Node:

> Build the next load path before weakening the old one. Shed the old load path only after its required function has crossed and the transfer has been witnessed.

STATIC-NODE-001 therefore belongs here as an experimental continuity/process specimen, not as a claim that TranchNode itself should become the eventual always-on workstation daemon.

The future workstation may consume this contract. This first proof should not decide the eventual host architecture.

## Core distinctions

The slice freezes these separations:

```text
PARENT != CHILD
CHILD != COPY
BUILD SUCCESS != VERIFICATION SUCCESS
VERIFICATION SUCCESS != PROMOTION
WORKMARK != CURRENCY
WORKMARK != HUMAN WORTH
WORKMARK != AUTHORITY
RECEIPT != VERDICT
HOLD != REJECTION
```

A child may differ from its parent and still remain attributable to it. A failed child remains useful historical evidence. A successful child earns a durable contribution-history marker, not promotion authority.

## Selected approach

### Pure receipt kernel + opt-in local runner

Use two layers.

1. **`src/static-node.ts`** owns pure types, validation, receipt construction, Workmark identity, and HOLD disposition. It performs no filesystem, process, Git, network, merge, or promotion actions.
2. **`scripts/static-node-001.ts`** is a thin explicit local process adapter. Given a repository path plus declared build and verification commands, it creates one isolated Git worktree/branch, executes only those commands inside the child, measures the resulting Git delta, constructs the kernel receipt, writes the receipt bundle to an explicit output directory, and exits. It never mutates the parent checkout after child creation and never promotes the child.

This keeps TranchNode's meaning-bearing law in a deterministic kernel while admitting one real process seam as a bounded proof.

## Alternatives considered

### Extend Continuity Spine to execute transitions

Rejected. Continuity Spine deliberately evaluates and refuses transitions; making it spawn worktrees or run commands would collapse transformation witness into execution authority.

### Build the full always-on workstation now

Rejected. Scheduling, task selection, multi-repository coordination, restart/update behavior, remote execution, agent prompting, merge policy, and resource governance are independent subsystems. They are future consumers of this proof, not prerequisites for it.

### Receipt-only simulation

Rejected as insufficient for this slice. The Daily Slice explicitly calls for `PARENT → CHILD → RECEIPT → HOLD`; STATIC-NODE-001 should prove that an actual isolated Git child can be created and evaluated without promotion.

## Input contract

The runner accepts only explicit operator-supplied inputs. No ambient task discovery occurs.

Conceptual CLI:

```text
npm run static-node:001 -- \
  --repo /absolute/path/to/repo \
  --task-id example-001 \
  --build "node scripts/make-change.mjs" \
  --verify "npm test" \
  --output /absolute/path/to/receipts
```

Required declarations:

- absolute repository path;
- task id;
- one build command string;
- one verification command string;
- output directory.

The runner derives rather than accepts:

- parent commit SHA;
- parent branch/ref where available;
- child branch name;
- child worktree path;
- child commit/worktree state;
- changed paths;
- diff digest;
- verification exit status;
- receipt identity;
- Workmark identity.

No caller-supplied Workmark id is trusted.

## Parent preconditions

The parent is eligible only when:

- the repository is a Git worktree;
- `HEAD` resolves to a commit;
- the parent checkout is clean before child creation;
- the requested receipt output path is outside the child worktree;
- the generated child branch does not already exist;
- no command requests shell interpolation from data discovered during execution.

If the parent is dirty, v0.1 refuses rather than trying to infer which uncommitted state constitutes the parent.

## Child isolation

The child must be created with Git worktree semantics from the exact parent `HEAD`.

Generated identity:

```text
static-node/001/<task-id>/<short-parent-sha>/<nonce>
```

The nonce is process-local uniqueness only and is not part of semantic ancestry. The exact parent SHA is.

The runner must execute both build and verification commands with the child worktree as current working directory.

The parent checkout path must never be used as the command working directory.

## Execution model

The first version executes exactly two declared phases:

```text
BUILD
VERIFY
```

BUILD may change the child worktree and may fail.

VERIFY runs only after BUILD exits successfully. It may read or further modify generated test artifacts, but any tracked-file change caused by verification becomes part of the measured child delta and therefore remains visible.

No retry loop, repair loop, agent prompt loop, autonomous code generation, or task chaining exists in v0.1.

## Result states

The process result is one of:

- `build_failed` — child exists, BUILD returned non-zero, no Workmark minted;
- `verification_failed` — BUILD succeeded, VERIFY returned non-zero, no Workmark minted;
- `verified_child` — BUILD and VERIFY returned zero, delta receipt complete, Workmark minted;
- `invalid` — parent/input/receipt invariants failed; no Workmark minted.

Every non-invalid completed attempt still produces an attempt receipt. Failure is evidence, not absence.

## HOLD law

Every completed attempt has:

```json
{
  "disposition": "HOLD",
  "promotionAuthorized": false
}
```

These fields are fixed in v0.1 and are not caller-configurable.

The runner must contain no merge, rebase, cherry-pick, reset of the parent, push, tag, release, checkout-parent, service-restart, or deployment code path.

The child worktree may remain on disk after the run for human inspection. Cleanup is explicit and separate; successful completion must not silently delete the evidence-bearing child.

## Receipt model

### Attempt receipt

Schema:

```text
tranchnode/static-node-attempt/v0.1
```

Required fields:

- `taskId`;
- `parent`: repository path, exact parent SHA, optional branch name;
- `child`: branch name and worktree path;
- `build`: declared command, exit code, started/finished timestamps;
- `verification`: declared command, status `not_run | failed | passed`, optional exit code;
- `delta`: changed tracked paths, untracked paths, patch SHA-256 address;
- `result`;
- `disposition: HOLD`;
- `promotionAuthorized: false`;
- `receiptHash`, derived from the exact receipt body before `receiptHash` is attached.

Environment variables are not copied wholesale into the receipt. v0.1 records only the process platform, Node version, and Git version as bounded execution-environment evidence.

Timestamps are occurrence evidence. Therefore two separate executions are allowed to have different receipt identities even when they begin from the same parent and produce the same patch. Determinism means **the same complete normalized receipt body addresses to the same hash**, not that two different executions impersonate one occurrence.

### Workmark

Schema:

```text
tranchnode/workmark/v0.1
```

A Workmark is emitted only for `verified_child`.

Required fields:

- `workmarkId`;
- `taskId`;
- `parentSha`;
- `childBranch`;
- `attemptReceiptHash`;
- `deltaHash`;
- `verificationCommand`;
- `verificationStatus: passed`;
- `bornAt` copied from the verified attempt completion time;
- `authority: none`;
- `economicMeaning: none`;
- `promotionAuthorized: false`.

`workmarkId` is derived from the normalized Workmark birth body before `workmarkId` is attached. It is not a mutable score and does not change when later history says the contribution was useful, obsolete, repaired, reverted, challenged, or superseded.

Later evidence may point *to* the Workmark. It may not rewrite the Workmark's birth record.

## Addressing boundary

STATIC-NODE-001 must reuse TranchNode's existing `addressJson()` strict validation and JCS/SHA-256 addressing implementation from `src/residual.ts` for structured receipt and Workmark identities.

It must **not** introduce another JSON canonicalizer or imply Project 0 domain-address equivalence. TranchNode's existing documented Project 0 addressing incompatibility remains unchanged.

The raw Git patch is byte evidence rather than a JSON object and is addressed with the existing `sha256(bytes)` helper.

Therefore the implementation has exactly two existing addressing routes:

```text
structured body -> addressJson(body).hash
raw patch bytes -> sha256(bytes)
```

No new addressing primitive is introduced.

## Delta measurement

The runner records both human-inspectable paths and a machine-stable patch digest.

After execution it captures:

```text
git status --porcelain=v1 --untracked-files=all
git diff --binary --no-ext-diff HEAD
```

The patch bytes are hashed exactly as returned by Git. Untracked file paths are receipted separately because they are not represented by `git diff HEAD` until added.

v0.1 does not stage or commit child changes automatically.

Therefore:

```text
WORKMARK != COMMIT
```

The Workmark proves one verified local attempt body, not that the work became repository history.

## Failure and hostile controls

Tests must freeze at least these refusals:

1. dirty parent refuses before child creation;
2. missing/invalid Git parent refuses;
3. existing generated child branch refuses rather than reusing ancestry;
4. build failure produces an attempt receipt, skips VERIFY, mints no Workmark;
5. verification failure produces an attempt receipt and mints no Workmark;
6. verification success mints exactly one Workmark;
7. the same complete normalized receipt or Workmark birth body produces the same address;
8. changed parent SHA changes Workmark identity even when patch bytes match;
9. changed delta changes Workmark identity;
10. child process commands run in the child path, never the parent path;
11. parent HEAD and working tree remain unchanged after a successful run;
12. output always says `HOLD` and `promotionAuthorized: false`;
13. no promotion verb exists in the runner interface.

## Integration-test specimen

The repository test suite should create a temporary Git repository rather than operating on the TranchNode checkout itself.

Frozen integration flow:

1. create temporary repository;
2. commit a tiny file plus tiny build/verify scripts;
3. invoke STATIC-NODE-001 against that repository;
4. BUILD changes one file only inside the child;
5. VERIFY checks the expected child content and exits zero;
6. assert the parent commit and parent file bytes are unchanged;
7. assert the child contains the delta;
8. assert receipt + Workmark exist and bind parent SHA + patch digest;
9. assert disposition is HOLD;
10. assert no merge/promotion occurred.

This specimen is the first executable proof of:

> **THE PARENT MAY BUILD THE CHILD WITHOUT BECOMING THE CHILD.**

## Package surface

Add one explicit script only:

```json
"static-node:001": "node --import tsx scripts/static-node-001.ts"
```

No background service, cron entry, systemd unit, startup hook, network listener, or automatic scheduling enters this PR.

## Security and resource boundary

The runner executes operator-supplied shell commands. It is therefore an opt-in local developer tool, not a sandbox.

v0.1 must state this plainly in CLI help and documentation. It must not accept commands from repository content, network responses, model output, issue bodies, or receipt fields.

The eventual always-on Static workstation will need a stronger capability/sandbox boundary before task selection can become autonomous. STATIC-NODE-001 does not pretend to solve that problem.

## Relationship to Dogram CONTRIBUTION-FIELD-001

The Workmark is intentionally compatible in spirit with the current Dogram contribution-history research without importing Dogram measurement or value semantics into TranchNode.

STATIC-NODE-001 emits attributable birth evidence only.

A later adapter may project Workmarks into a Dogram contribution field for measurement. That later projection must preserve:

```text
GRAPH != ECONOMY
MEASUREMENT != VALUE
VALUE != PRICE
CONTRIBUTION != HUMAN WORTH
```

No Dogram dependency is added here.

## Relationship to the future Static workstation

This proof supplies one reusable primitive:

```text
attempt(parent, declared task, declared verification)
  -> child + receipt + optional Workmark + HOLD
```

A later workstation layer may add:

- task discovery/selection;
- scheduled execution;
- multi-repository routing;
- agent workers;
- resource budgets;
- sandbox/capability policy;
- human disposition queues;
- promotion adapters;
- rollback/re-entry;
- Workmark history and Dogram projections.

None of those are implied by v0.1 success.

## Proof gates

STATIC-NODE-001 is proven only when all are true:

- pure kernel unit tests GREEN;
- hostile refusal controls GREEN;
- temporary-repository integration test GREEN;
- existing TranchNode `npm run check` GREEN;
- exact final branch head recorded;
- normalized receipt and Workmark birth bodies reproduce their exact addresses;
- verified child emits one Workmark;
- failed child emits no Workmark;
- parent exact HEAD and bytes remain unchanged;
- no promotion path exists;
- PR remains experimental until human field use confirms the receipt is useful.

## Founding seals

> **THE RUNNING NODE MAY BUILD ITS SUCCESSOR, BUT MAY NOT DECLARE ITS SUCCESSOR.**

> **THE PARENT MAY BUILD THE CHILD WITHOUT BECOMING THE CHILD.**

> **WORK MINES THE MARKER. TIME MAY ASSAY IT LATER.**

> **GREEN CHILD != PROMOTED CHILD.**

> **PARENT → CHILD → RECEIPT → HOLD.**
