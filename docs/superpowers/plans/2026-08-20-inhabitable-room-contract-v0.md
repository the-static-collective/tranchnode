# Inhabitable Room Contract v0 — Phase 2 Implementation Plan

> **For implementation workers:** REQUIRED SUB-SKILL: use `superpowers:executing-plans` or the equivalent ordinary-depth execution workflow. Complete tasks in order. Tasks 1–6 are routine once this plan is accepted. Task 7 requires two genuinely isolated fresh contexts for the treatment and control; do not reuse an implementation worker's loaded context.

**Goal:** Evolve TranchNode PR #67 into the smallest falsifiable Room Protocol v0 specimen: one repository-owned declaration, one bounded path observer, deterministic human and machine projections, an unresolved-discrepancy specimen, and a controlled fresh-context comparison.

**Architecture:** Preserve `PROJECT_STATUS.json` as the only hand-authored projection input. Apply a TranchNode-local Room eligibility check after backward-compatible project-status validation. Observe only declared repository-relative path entries. Build one normalized `RoomProtocolProjection` and serialize it to both `ROOM.md` and `room.json`. Treat all source fields as testimony; give the projection no authority, permission, or constitutional effect.

**Tech stack:** TypeScript 5.8, Node.js 22 built-ins (`node:fs/promises`, `node:path`, `node:crypto`), `node:test`, `tsx`, existing GitHub Actions.

**Design:** `docs/superpowers/specs/2026-08-20-inhabitable-room-contract-v0-design.md`

## Phase boundary

The Phase 1 commit changes only this plan, the design reconciliation, and PR metadata. Do not modify executable files until Phase 2 is explicitly started.

During Phase 2:

- keep the PR draft;
- preserve PR #67 ancestry rather than rebuilding it;
- use test-first increments;
- do not modify Project0;
- do not deploy, index repositories, build a graph, or add a service;
- do not ask CI, the observer, or a model to decide truth, adoption, authority, permission, or reciprocity.

## Phase 2 completion evidence

The implementation phase is complete only when:

1. the source declaration, `ROOM.md`, and `room.json` are mutually consistent;
2. the adversarial fixture visibly preserves an unreachable witness as unresolved discrepancy;
3. the full repository check passes on the final head;
4. the experiment artifacts pin the exact state and preserve raw treatment/control evidence;
5. the PR body and derived documentation describe draft/adopted and directional/reciprocal state accurately.

---

### Task 1: Separate base validation from Room-candidate eligibility

**Files**

- Modify: `src/room-contract.ts`
- Modify: `test/room-contract.test.ts`
- Modify: `PROJECT_STATUS.json`

**Keep**

- `validateProjectStatus(value: unknown): ProjectStatus`
- legacy `static-collective.project-status.v1` compatibility
- existing `kind`, `evidence`, `reentry`, and non-Room behavior

**Add or change interfaces**

```ts
export type RoomTouchpointPosture =
  | "inspect"
  | "invoke-under-local-rules"
  | "proposal-only"
  | "human-held"
  | "closed";

export interface WitnessedDeclaration {
  witnesses?: string[];
}

export interface ExecutableSurface extends WitnessedDeclaration {
  id: string;
  status: string;
  interface?: string;
  scope?: string;
  evidence?: unknown;
}

export interface RoomDependency extends WitnessedDeclaration {
  repository: string;
  relation: string;
  evidence?: unknown;
}

export interface RoomTouchpoint extends WitnessedDeclaration {
  id: string;
  kind: RoomTouchpointKind;
  posture: RoomTouchpointPosture;
  interface?: string;
  evidence?: unknown;
}

export interface ValidatedRoomDeclaration extends ProjectStatus {
  executableSurface: Array<ExecutableSurface & { witnesses: [string, ...string[]] }>;
  dependsOn?: Array<RoomDependency & { witnesses: [string, ...string[]] }>;
  touchpoints?: Array<RoomTouchpoint & { witnesses: [string, ...string[]] }>;
}

export function validateRoomDeclaration(
  status: ProjectStatus,
): ValidatedRoomDeclaration;
```

`witnesses` stays optional in the base `ProjectStatus` type so legacy v1 documents remain valid. `validateRoomDeclaration` makes it non-empty for every item that TranchNode projects under questions 2, 3, and 5.

**Steps**

- [ ] Add a test proving an existing legacy v1 value without Room fields still passes `validateProjectStatus`.
- [ ] Add a failing test proving the same value is not automatically a Room candidate.
- [ ] Add failing tests for missing and empty `witnesses` on executable, dependency, and touchpoint items.
- [ ] Add table-driven failing tests for witness paths `/absolute`, `../escape`, `a/../b`, `a\\b`, `a//b`, `.`, an empty string, and a NUL-containing string.
- [ ] Add passing tests for `README.md`, `docs/`, and `test/room-contract.test.ts`.
- [ ] Add a failing test proving draft-only `access: "safe-read-execute"` is not accepted as a Room touchpoint.
- [ ] Add passing tests for all five `posture` values.
- [ ] Run `npm test -- --test-name-pattern='room'` (or the repository's supported targeted `node --test` invocation) and record the expected RED failures.
- [ ] Implement the path grammar and `validateRoomDeclaration` without filesystem access.
- [ ] Change `PROJECT_STATUS.json` touchpoints from `access` to `posture` using this exact mapping:

  | Old draft value | New declaration value |
  |---|---|
  | `safe-read` | `inspect` |
  | `safe-read-execute` | `invoke-under-local-rules` |
  | `proposal-only` | `proposal-only` |
  | `human-only` | `human-held` |
  | `closed` | `closed` |

- [ ] Add the witness arrays specified in the design's “Minimum witness assignment” table and make no other status claims.
- [ ] Run the targeted tests and confirm GREEN.
- [ ] Run `npm run typecheck` if available; otherwise run the TypeScript command already used by `npm run check`.

**Commit**

```text
feat(room): require local witness paths for the candidate
```

---

### Task 2: Implement the bounded path-entry observer

**Files**

- Create: `src/room-observation.ts`
- Create: `test/room-observation.test.ts`
- Modify: `src/room-contract.ts` only for shared exported types

**Interfaces**

```ts
export type Reachability = "reachable" | "unreachable" | "unresolved";

export type ObservationReason =
  | "path-entry-found"
  | "path-entry-not-found"
  | "observer-insufficient";

export interface WitnessReference {
  claimRef: string;
  path: string;
}

export interface WitnessObservation extends WitnessReference {
  reachability: Reachability;
  reason: ObservationReason;
}

export type Lstat = (path: string) => Promise<unknown>;

export function collectWitnessReferences(
  declaration: ValidatedRoomDeclaration,
): WitnessReference[];

export async function observeWitnessReferences(
  repositoryRoot: string,
  references: readonly WitnessReference[],
  lstat?: Lstat,
): Promise<WitnessObservation[]>;
```

Use stable claim references:

```text
reentry:<key>
proof:<executableSurface.id>
relationship:<repository>:<relation>
navigation:<touchpoint.id>
```

**Procedure law**

- Resolve the already validated relative path lexically beneath `repositoryRoot`.
- Walk components with `lstat`. If an intermediate component is a symlink, stop with `unresolved` / `observer-insufficient`. A final symlink entry may be `reachable`, but its target is never followed.
- Do not call `stat`, `realpath`, `readFile`, Git, a shell, a network API, or a package command.
- Success -> `reachable` / `path-entry-found`.
- `ENOENT` or `ENOTDIR` -> `unreachable` / `path-entry-not-found`.
- Every other error -> `unresolved` / `observer-insufficient`.
- Never throw merely because a witness is absent or unreadable.
- Preserve a stable order based on declaration order, then witness order.

**Steps**

- [ ] Write a failing collection test proving that re-entry, proof, relationship, and navigation paths all receive stable refs and no path is inferred from `interface` or opaque `evidence`.
- [ ] Write a failing observer test with an injected successful `lstat` and assert only `reachable`.
- [ ] Write failing table tests for injected `ENOENT` and `ENOTDIR` and assert only `unreachable`.
- [ ] Write failing table tests for injected `EACCES`, `EIO`, and an error without a code and assert only `unresolved`.
- [ ] Write a failing spy test proving component probes are bounded to the declared relative paths and no content-reader or command dependency exists.
- [ ] Write a filesystem test with a final symlink and prove `lstat` locates the link entry without dereferencing the target.
- [ ] Write a filesystem test with an intermediate symlink and prove observation stops as unresolved before traversing through it.
- [ ] Implement only the procedure above.
- [ ] Run `node --test --import tsx test/room-observation.test.ts` and confirm GREEN.
- [ ] Inspect imports in `src/room-observation.ts`; they must be limited to Node path/fs types and local Room modules.

**Commit**

```text
feat(room): observe declared witness reachability
```

---

### Task 3: Normalize declaration and observation into one projection

**Files**

- Modify: `src/room-contract.ts`
- Modify: `test/room-contract.test.ts`

**Interfaces**

```ts
export interface WitnessDiscrepancy {
  kind: "declared-witness-unreachable";
  claimRef: string;
  path: string;
  declared: "witness-path";
  observed: "unreachable";
  disposition: "unresolved";
}

export interface RoomProtocolProjection {
  schema: "static-collective.room-protocol.v0";
  kind: "repository-entry-projection";
  source: {
    path: "PROJECT_STATUS.json";
    sha256: string;
    declaredAsOf: string;
    declaredObservedMainCommit: string;
  };
  limits: {
    projectionGrantsAuthority: false;
    actualAuthorityDetermination: "unavailable";
    projectionDeterminesConstitution: false;
    navigationGrantsPermission: false;
    observationFreshness: "not-established";
  };
  declaration: {
    identity: {
      project: string;
      repository: string;
      phase: string;
      declaredAuthorityLocus: string;
    };
    proofClaims: Array<{
      id: string;
      declaredStatus: string;
      interface?: string;
      scope?: string;
      evidence?: unknown;
      witnesses: string[];
    }>;
    relationshipClaims: Array<{
      repository: string;
      relation: string;
      direction: "outbound-declaration";
      reciprocityDetermination: "not-made";
      evidence?: unknown;
      witnesses: string[];
    }>;
    humanHeld: {
      availability: "declared" | "unavailable";
      claims: string[];
    };
    navigationPointers: Array<{
      id: string;
      kind: RoomTouchpointKind;
      declaredPosture: RoomTouchpointPosture;
      interface?: string;
      evidence?: unknown;
      witnesses: string[];
    }>;
    reentry: RoomReentry;
    nonClaims: string[];
  };
  observation: {
    procedure: "repository-path-lstat/v0";
    scope: "declared-repository-paths-only";
    results: WitnessObservation[];
  };
  discrepancies: WitnessDiscrepancy[];
}

export function createRoomProtocolProjection(
  declaration: ValidatedRoomDeclaration,
  observations: readonly WitnessObservation[],
  sourceSha256: string,
): RoomProtocolProjection;

export function renderRoomMarkdown(
  projection: RoomProtocolProjection,
): string;

export function renderRoomJson(
  projection: RoomProtocolProjection,
): string;
```

**Steps**

- [ ] Rewrite the existing renderer tests to pass a normalized projection rather than raw status.
- [ ] Add a failing test proving source values named `canonicalAuthority`, `observedMainCommit`, and `landed` appear only as `declaredAuthorityLocus`, `declaredObservedMainCommit`, and `declaredStatus` in the machine view.
- [ ] Add a failing test asserting all five `limits` values exactly.
- [ ] Add a failing test proving missing `humanHeld` becomes `{ availability: "unavailable", claims: [] }` and Markdown says absence is not permission.
- [ ] Add a failing test proving present `humanHeld` becomes declared claims while actual authority remains unavailable.
- [ ] Add a failing test proving a Project0 dependency is outbound and reciprocity is `not-made`.
- [ ] Add a failing test proving each `unreachable` observation creates exactly one unresolved discrepancy and `reachable`/`unresolved` observations create none.
- [ ] Add a failing immutability test proving projection construction does not modify the validated declaration or observations.
- [ ] Add a failing determinism test proving repeated projection, Markdown, and JSON generation is byte-identical.
- [ ] Implement the normalized object and both pure renderers.
- [ ] Keep the five inherited Markdown question headings, but label answers as declaration, show the bounded observation beside each witness, and render the projection limits before any invocation pointer.
- [ ] End JSON with one newline and use two-space stable property order from the explicitly constructed object; do not serialize arbitrary object-key order from the source.
- [ ] Run `node --test --import tsx test/room-contract.test.ts` and confirm GREEN.

**Commit**

```text
feat(room): derive dual projections from one bounded view
```

---

### Task 4: Make repository adapters generate and verify both artifacts

**Files**

- Modify: `scripts/room-render.ts`
- Modify: `scripts/room-check.ts`
- Modify: `test/room-scripts.test.ts`
- Modify: `test/room-repository.test.ts`
- Modify only if necessary: `package.json`
- Regenerate: `ROOM.md`
- Create: `room.json`

**Repository adapter**

The two scripts must call the same helper sequence:

```ts
const sourceBytes = await readFile(statusPath);
const status = validateProjectStatus(JSON.parse(sourceBytes.toString("utf8")));
const declaration = validateRoomDeclaration(status);
const references = collectWitnessReferences(declaration);
const observations = await observeWitnessReferences(repositoryRoot, references);
const sourceSha256 = createHash("sha256").update(sourceBytes).digest("hex");
const projection = createRoomProtocolProjection(
  declaration,
  observations,
  sourceSha256,
);
```

`room:render` writes both artifacts. `room:check` computes both in memory and fails only when validation/projection fails or committed bytes differ.

**Steps**

- [ ] Add a failing script test proving `room:render` writes `ROOM.md` and `room.json` from the same source hash and observations.
- [ ] Add a failing script test proving `room:check` reports a missing or stale artifact with its path.
- [ ] Add a failing script test proving a malformed witness path fails before observation.
- [ ] Add a passing script test proving a well-formed missing witness produces an unreachable discrepancy and does not make `room:check` fail once expected outputs are committed.
- [ ] Add a passing repository test proving `PROJECT_STATUS.json` satisfies Room-candidate validation.
- [ ] Implement the shared helper sequence without adding another source file unless avoiding duplicated semantics requires it. If a helper is necessary, add only `buildRoomProtocolProjectionFromRepository(root)` to `src/room-observation.ts`.
- [ ] Preserve the existing `room:check` and `room:render` command names.
- [ ] Keep the normal `check` script wired as it is; add no workflow, service, or publishing job.
- [ ] Run `npm run room:render`.
- [ ] Inspect the generated diff for declared/factual labels, unavailable authority, non-authorizing navigation, directional Project0 relation, source hash, observation scope, and discrepancies.
- [ ] Run `npm run room:check` twice to prove idempotence.

**Commit**

```text
feat(room): generate and verify markdown and json views
```

---

### Task 5: Add the controlled unresolved-discrepancy specimen

**Files**

- Create: `fixtures/room-protocol-v0/unreachable-witness/PROJECT_STATUS.json`
- Create: `fixtures/room-protocol-v0/unreachable-witness/ROOM.md`
- Create: `fixtures/room-protocol-v0/unreachable-witness/room.json`
- Modify: `test/room-contract.test.ts`
- Modify: `test/room-observation.test.ts`

**Fixture law**

Use a valid declaration with a proof claim such as:

```json
{
  "id": "deliberately-absent-v0",
  "status": "landed",
  "witnesses": ["fixtures/room-protocol-v0/unreachable-witness/absent.ts"]
}
```

Do not create `absent.ts`. The source's `landed` value remains a declaration. The generated views must show the witness as unreachable and the discrepancy as unresolved without rewriting either side.

**Steps**

- [ ] Add the source fixture first and write a failing test for its exact normalized discrepancy.
- [ ] Add a test proving the fixture remains a valid Room declaration despite the absent path.
- [ ] Add a test proving the source fixture bytes do not change during generation.
- [ ] Add assertions that Markdown never says the proof claim is false and JSON never adds `truth`, `confidence`, `adopted`, `authorized`, `permitted`, `canonical`, or `constituted` conclusions.
- [ ] Generate and commit the two fixture projections.
- [ ] Add the symlink, missing-human-gate, non-reciprocity, opaque-draft-evidence, and observer-error adversarial cases as in-memory tests; do not add a fixture taxonomy for each case.
- [ ] Run the Room tests and confirm GREEN.

**Commit**

```text
test(room): preserve an unreachable witness as unresolved
```

---

### Task 6: Establish the final invariant suite and regression boundary

**Files**

- Modify only as failures require: `test/room-contract.test.ts`
- Modify only as failures require: `test/room-observation.test.ts`
- Modify only as failures require: `test/room-repository.test.ts`
- Modify only as failures require: `test/room-scripts.test.ts`

**Steps**

- [ ] Run the four Room-focused test files together.
- [ ] Run `npm run room:check`.
- [ ] Run the full `npm run check`.
- [ ] Confirm existing non-Room tests are unchanged and green.
- [ ] Search generated/source code for the risky terms `safe-read`, `safe-read-execute`, `canonical authority`, `reciprocal road`, and any factual use of `landed`; keep inherited source keys only where the output relabels them as declarations.
- [ ] Search production observation code for `exec`, `spawn`, `fetch`, `http`, `git`, `readFile`, `realpath`, `stat(`, and package-runner imports. Investigate every hit; final-path observation must use only `lstat`.
- [ ] Review the diff against every CI-fail and CI-green row in the design.
- [ ] Record exact command output and final commit SHA in the experiment manifest in Task 7, not in generated projections.

**Expected commands**

```bash
node --test --import tsx \
  test/room-contract.test.ts \
  test/room-observation.test.ts \
  test/room-repository.test.ts \
  test/room-scripts.test.ts
npm run room:check
npm run check
```

If the repository's Node test runner does not accept the combined form, use its existing supported command and record the exact alternative. Do not change tooling merely to match this text.

**Commit**

```text
test(room): lock constitutional projection invariants
```

---

### Task 7: Run the fresh-context treatment and control

**Files**

- Create: `docs/experiments/room-protocol-v0/manifest.json`
- Create: `docs/experiments/room-protocol-v0/treatment.md`
- Create: `docs/experiments/room-protocol-v0/control.md`
- Create: `docs/experiments/room-protocol-v0/assessment.md`

**Isolation requirement**

Use two fresh contexts that have not received repository implementation history. The treatment receives only the exact task plus `room.json`. The control receives the exact task plus the repository identifier. Neither receives this design, plan, PR conversation, the other arm's output, or an implementation worker's memory.

**Exact task prompt**

```text
Assess whether a new caller can invoke TranchNode's declared Intent Stroke stdio v0.2 surface non-interactively, identify one assumption you are not entitled to make, identify the minimum additional evidence needed, and propose one malformed-input regression test without editing the repository.

Before reading additional evidence, state:
1. one lawful next action;
2. one assumption you are not entitled to make; and
3. the minimum additional evidence you need.

Do not execute commands or mutate any repository or external state.
```

**Manifest minimum fields**

```json
{
  "schema": "static-collective.room-protocol-experiment.v0",
  "repository": "the-static-collective/tranchnode",
  "pullRequest": 67,
  "baseSha": "<exact base at execution>",
  "headSha": "<exact head at execution>",
  "branch": "feature/inhabitable-room-contract-v0",
  "pullRequestState": {"draft": true, "merged": false},
  "executedAt": "<ISO-8601>",
  "declarationSha256": "<sha256>",
  "roomJsonSha256": "<sha256>",
  "observationProcedure": "repository-path-lstat/v0",
  "taskPrompt": "<exact prompt>",
  "arms": {
    "treatment": {"initialContext": ["room.json"]},
    "control": {"initialContext": ["repository identifier"]}
  },
  "modelPolicy": "<same model/reasoning/tool policy for both arms>",
  "mutationPolicy": "read-only",
  "evaluation": {
    "resultValues": ["supported", "failed", "inconclusive"]
  }
}
```

**Steps**

- [ ] Generate and hash the final `PROJECT_STATUS.json` and `room.json`.
- [ ] Capture the exact PR/base/head/draft/merge state before either arm starts.
- [ ] Run the treatment in a fresh context and preserve its unedited response plus ordered reads/tool calls.
- [ ] Run the control in another fresh context with the same model policy and preserve its unedited response plus ordered reads/tool calls.
- [ ] Evaluate both arms against the code/tests they inspected; do not let eloquence substitute for evidence.
- [ ] Count distinct repository sources, broad directory/tree loads, and recursive context branches. Record qualitative archaeology even if token counts are unavailable.
- [ ] Record false assumptions, authority/constitution errors, unnecessary reads, missing necessary evidence, and whether the proposed regression test is viable.
- [ ] Classify the hypothesis as `supported`, `failed`, or `inconclusive` under the design's criteria.
- [ ] State the smallest justified next move. A failed or inconclusive result is valid and must not be rewritten as success.

**Commit**

```text
docs(room): record the v0 traversal experiment
```

---

### Task 8: Reconcile PR metadata and derived documentation

**Files / systems**

- Update: TranchNode PR #67 body
- Update through review flow: relevant GitBook Room Protocol implementation note
- Do not modify: Project0 PR #58 unless separately authorized by Project0's own process

**Steps**

- [ ] Replace implementation promises in PR #67 with final evidence: exact artifacts, tests, check run, experiment result, and unresolved fog.
- [ ] Describe the Project0 relation as TranchNode's outbound declaration; explicitly state that Project0 PR #58 is a draft and does not constitute reciprocity.
- [ ] Keep the PR draft until repository reviewers decide it is ready.
- [ ] Open a GitBook change request that links the repository evidence and clearly labels PR/adoption state. Do not use GitBook to claim the PR is constituted.
- [ ] If a spreadsheet is useful for later multi-run comparison, create it only as a derivative measurement view after this N=1 record exists. Do not make it a v0 deliverable or source of truth.
- [ ] Do not deploy Cloudflare, create a graph, or add another repository.

**Commit / metadata change**

```text
docs(room): reconcile candidate status and experiment evidence
```

---

## Ordinary-depth safety checklist

These tasks are intentionally mechanical after Phase 1:

- add and validate witness arrays;
- rename draft touchpoint fields/values;
- implement the three-state `lstat` adapter;
- normalize labels and fixed limits;
- serialize deterministic Markdown/JSON;
- compare generated files in `room:check`;
- add fixture files and table-driven tests;
- run existing checks and update snapshots;
- capture experiment manifests/transcripts;
- correct PR/GitBook wording to match evidence.

Escalate back to architectural review instead of improvising if implementation appears to require any of the following:

- following or interpreting witness contents automatically;
- executing a declared command;
- deciding whether `main` is constituted;
- validating a human authority claim;
- querying Project0 for reciprocity;
- adding a new reachability state;
- adding a claim taxonomy, score, registry, graph, service, or remote observer;
- making CI red because a declaration disagrees with observation;
- maintaining Markdown and JSON from separate semantic sources.

## Final Phase 2 review question

After the specimen and experiment exist, answer from evidence:

> Did this create an inhabitable boundary protocol, or only a better status document?

Do not expand Room Protocol unless the treatment demonstrates reduced archaeology without additional epistemic or authority failure.
