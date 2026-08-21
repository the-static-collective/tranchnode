# Inhabitable Room Contract v0 — Constitutional Reconciliation

**Status:** Phase 1 design handoff for TranchNode PR [#67](https://github.com/the-static-collective/tranchnode/pull/67). No executable change in this phase.

**Decision date:** 2026-08-21

## Decision

Continue PR #67 as ancestry. Do not replace its five-question declaration, structural validator, deterministic `ROOM.md`, directional Project0 claim, CI hook, or explicit rendering of missing values.

The smallest lawful evolution is four additions/corrections:

1. add explicit repository-relative witness paths to claims that the entry surface presents as presently inspectable;
2. add one deliberately narrow path-reachability observer whose only conclusions are `reachable`, `unreachable`, and `unresolved`;
3. generate `ROOM.md` and a new `room.json` from one normalized projection that keeps declaration, observation, discrepancy, authority, constitution, and navigation separate;
4. replace permission-shaped touchpoint language and reciprocal-road language with declared, directional navigation language.

No graph, remote neighbor synchronizer, adopted-main detector, command runner, ontology, Cloudflare surface, or automatic reconciliation is justified for v0.

## Inspected ancestry and constituted context

The reconciliation inspected the actual PR, its changed files and tests, the current default branch, the neighboring Project0 change, TranchNode's constitutional vocabulary, and the relevant GitBook doctrine.

| Item | Inspected state on 2026-08-21 | Consequence |
|---|---|---|
| TranchNode PR #67 | Draft, open, green; head `52bac82801e109196a55a971be9ef9770ac6c0c7`; base `91f7f96805d4e868e35b8d0c75dc5f0671cb494a` | The implementation is candidate ancestry, not adopted TranchNode state. |
| TranchNode `main` | `91f7f96805d4e868e35b8d0c75dc5f0671cb494a` | Existing executable claims may cite this declared anchor, but the Room observer will not infer currentness or adoption from it. |
| Project0 PR #58 | Draft, open, unmerged; head `011d8d4...` | It is not constituted reciprocity and is not a dependency of this experiment. |
| TranchNode issue #25 | Defines sovereign `Room`, `Door`, and `Threshold` concepts with human-ratified topology/admission semantics | Room Protocol types and prose must identify themselves as an entry projection and must not instantiate or redefine those sovereign concepts. |
| Four-Surface Capability Covenant on TranchNode `main` | Separates EYE observation, MOUTH testimony, HAND admitted consequence, and HAIR lineage; no organ inherits authority | The declaration is testimony; the path observer is observation; neither may claim authority or admitted consequence. |
| GitBook Front Room / Field Traversal / Continuity Witness / Constituted Reality doctrine | Orientation is not retrieval; a door is not an instruction; reachability is observer-relative and non-authorizing; bytes are not constituted state; portable evidence carries no portable authority | The projection must preserve fog and direct traversal without conferring permission, truth, reciprocity, or constitution. |

The current GitBook implementation note and PR body describe reciprocal roads more strongly than the inspected state permits. They are derived descriptions, not constituting evidence. PR metadata should be corrected during this handoff. GitBook should be corrected through its own review flow after the executable specimen and experiment record exist; it must not be used to bootstrap constitution.

## Core design answer

> What minimum additional machinery lets PR #67 test whether a dual-readable entry surface reduces archaeology without manufacturing confidence or authority?

A single local witness-path convention, a bounded `lstat`-style observer, a shared normalized projection, one generated JSON view, one adversarial fixture, and one controlled fresh-context experiment.

Everything else is outside the hypothesis. In particular, v0 does not need to establish whether a claim is true, whether a commit is adopted, whether a test passed, whether a neighbor agrees, or who may authorize a change. It needs to make the declaration inspectable, expose the observer's narrow result, retain disagreement, and refuse all broader implications.

## Namespace boundary

“Room Protocol” in this branch names a repository entry projection. It is not TranchNode's sovereign `Room`. The implementation must not introduce protocol types named `Door` or `Threshold`, and generated copy must not claim that a relationship is a TranchNode Door, road, threshold, admission, or ratified topology change.

Use these terms in the implementation:

- `RoomProtocolProjection` for the generated entry view;
- `witnesses` for repository-relative evidence pointers;
- `navigationPointers` for projected touchpoints;
- `declaredPosture` for the source's navigation posture;
- `relationshipClaims` for directional declarations.

The five inherited question headings remain because they are the experiment's fixed interface. Their answers must make their testimony status explicit.

## Constitutional invariants

### 1. Declaration

Every value read from `PROJECT_STATUS.json`, including fields named `canonicalAuthority`, `observedMainCommit`, `status`, and `evidence`, is declaration testimony.

- `canonicalAuthority` projects as `declaredAuthorityLocus`.
- `observedMainCommit` projects as `declaredObservedMainCommit`.
- an executable surface with `status: "landed"` projects as a declared status, not an observed fact;
- `evidence` remains attributable source testimony and is not interpreted by the observer.

No field name inherited from `static-collective.project-status.v1` may upgrade testimony into fact.

### 2. Observation

Observation is limited to the explicit procedure `repository-path-lstat/v0`:

1. accept only a validated repository-relative POSIX path;
2. resolve it lexically beneath the supplied repository root without reading file contents;
3. walk path components with `lstat`, stop as `unresolved` if an intermediate component is a symlink, and do not follow a final symlink;
4. return one of the three reachability states with a stable reason code;
5. perform no Git, GitHub, network, package-manager, test, command, artifact, receipt, or documentation-body inspection.

The observer reports evidence about path-location only. It does not report truth.

### 3. Reachability

`reachable` means only that the observer located the declared path entry using `repository-path-lstat/v0`.

`unreachable` means only that the observer completed that procedure and received an absence result such as `ENOENT` or `ENOTDIR`.

`unresolved` means the observer lacked a basis for either narrower result, including permission errors, I/O errors, or an injected observer failure.

None of these states determines whether the associated claim is true, adopted, sufficient, current, authorized, permitted, canonical, reciprocal, or constituted. An unreachable witness does not make a declaration false.

### 4. Constitution

Room Protocol v0 does not determine constitution.

- The draft PR is not treated as adopted state.
- Repository bytes and generated projections are not treated as constituted merely because they exist.
- The observer does not compare the checkout to `main`, interpret branch protection, or decide that a commit is adopted.
- `observedMainCommit` remains a declared anchor.

The machine projection must contain `projectionDeterminesConstitution: false`.

### 5. Authority

Room Protocol v0 grants no authority and does not determine actual authority.

- A declared authority locus is testimony.
- A declared human-held boundary is testimony about a boundary, not transfer of the boundary.
- If `humanHeld` is absent, the projection renders authority information as `unavailable`; it must not render an empty list, “none,” or implicit permission.
- If `humanHeld` is present, its strings remain declarations and do not prove who can authorize an action.

The machine projection must contain `projectionGrantsAuthority: false` and `actualAuthorityDetermination: "unavailable"`.

### 6. Navigation

Navigation identifies a next inspection target. It never permits inspection, execution, mutation, adoption, or crossing of a human gate.

- Rename the draft-only `touchpoints[].access` field to `touchpoints[].posture`.
- Replace `safe-read`, `safe-read-execute`, `proposal-only`, `human-only`, and `closed` with `inspect`, `invoke-under-local-rules`, `proposal-only`, `human-held`, and `closed`.
- Project this value as `declaredPosture`, never `access`.
- `invoke-under-local-rules` says only that an invocation interface is declared; the destination's own admission and authorization rules still govern it.

The machine projection must contain `navigationGrantsPermission: false`.

### 7. Relationship direction

`dependsOn` is a TranchNode-owned outbound declaration. The projection must not query Project0, synthesize an inbound edge, use the word “reciprocal,” or call the declaration a ratified road.

Each projected relationship carries `direction: "outbound-declaration"` and `reciprocityDetermination: "not-made"`.

Project0 PR #58 may be recorded in the Phase 1 evidence log as neighboring draft state. It is not a witness that makes the TranchNode claim true or reciprocal.

## What remains untouched

- `PROJECT_STATUS.json` remains the single hand-authored source used to generate the entry projections.
- `static-collective.project-status.v1` remains valid when optional Room fields are absent.
- The five question headings remain unchanged.
- Existing `evidence` values remain intact as opaque, attributable declaration data.
- Existing explicit `nonClaims` remain intact.
- The relationship remains one TranchNode declaration about Project0.
- Validation stays local and dependency-free.
- Renderers stay deterministic and repository scripts stay thin.
- Existing non-Room source, fixtures, tests, commands, and CI topology remain untouched.
- No Project0 repository change is required by this PR.

## Source evolution

### Witness paths

Add `witnesses: string[]` to each declaration item under questions 2, 3, and 5:

- every `executableSurface[]` item;
- every `dependsOn[]` item;
- every `touchpoints[]` item.

Room-candidate validation requires at least one witness for each such item. The base `validateProjectStatus` function remains backward compatible; a second `validateRoomDeclaration` step applies the local Room-candidate rule only to TranchNode's specimen.

A witness is structurally valid when it is a non-empty normalized repository-relative POSIX path with no absolute prefix, backslash, NUL, empty component, `.` component, or `..` component. Existence is not a validation requirement.

This distinction is load-bearing:

- malformed or missing required witness syntax is a declaration error;
- a well-formed witness path that is absent is an observation result.

Question 1 uses the existing `reentry` paths as navigation landmarks and observes them by the same procedure. Question 4 does not use file existence to validate human authority; absence remains unavailable authority.

### Minimum witness assignment for the current specimen

| Declaration ref | Required local witnesses |
|---|---|
| `proof:residual-v0.1` | `src/residual.ts`, `test/residual.test.ts` |
| `proof:intent-stroke-decoder-v0.1` | `src/intent-stroke.ts`, `test/intent-stroke.test.ts` |
| `proof:intent-stroke-stdio-v0.1` | `scripts/intent-stroke-stdio.ts`, `test/intent-stroke-stdio.test.ts` |
| `proof:intent-stroke-stdio-v0.2-raw-points` | `scripts/intent-stroke-stdio.ts`, `test/intent-stroke-stdio.test.ts` |
| `proof:continuity-spine-v0.1` | `src/continuity-spine.ts`, `test/continuity-spine.test.ts` |
| `relationship:the-static-collective/project0:compatibility-obligation` | `COMPATIBILITY.md` |
| `navigation:project-status` | `PROJECT_STATUS.json` |
| `navigation:compatibility-map` | `COMPATIBILITY.md` |
| `navigation:intent-stroke-stdio` | `scripts/intent-stroke-stdio.ts` |
| `navigation:decoded-traversal` | `src/intent-stroke.ts` |
| `navigation:direct-structure-write` | `ATTENTION_TESTIMONY_RECOGNITION.md` |

These paths witness only the availability of a deliberate next inspection target. The observer does not read them or prove the associated claim.

## Normalized projection

Both generated artifacts are serialized from one `RoomProtocolProjection` value. Neither renderer independently interprets `PROJECT_STATUS.json`.

The minimum machine shape is:

```ts
type Reachability = "reachable" | "unreachable" | "unresolved";

interface WitnessObservation {
  claimRef: string;
  path: string;
  reachability: Reachability;
  reason:
    | "path-entry-found"
    | "path-entry-not-found"
    | "observer-insufficient";
}

interface WitnessDiscrepancy {
  kind: "declared-witness-unreachable";
  claimRef: string;
  path: string;
  declared: "witness-path";
  observed: "unreachable";
  disposition: "unresolved";
}

interface RoomProtocolProjection {
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
    identity: unknown;
    proofClaims: unknown[];
    relationshipClaims: unknown[];
    humanHeld: {
      availability: "declared" | "unavailable";
      claims: string[];
    };
    navigationPointers: unknown[];
    nonClaims: string[];
  };
  observation: {
    procedure: "repository-path-lstat/v0";
    scope: "declared-repository-paths-only";
    results: WitnessObservation[];
  };
  discrepancies: WitnessDiscrepancy[];
}
```

The `unknown` placeholders above mean “reuse the existing local item fields with testimony labels,” not “add an unvalidated universal schema.” The implementation plan provides the concrete local interfaces.

`room.json` is a generated machine projection, not a second declaration or registry. `ROOM.md` is generated from the same value. Both identify their source and limits.

No wall-clock timestamp or self-referential Git commit is embedded in the generated files. That keeps generation deterministic. Freshness is explicitly `not-established`; the experiment manifest separately pins the exact commit, tree context, execution time, and artifact hashes.

## Discrepancy law

Only one discrepancy kind is required in v0: a well-formed declared witness path observed as `unreachable`.

For that case:

- preserve the declaration unchanged;
- preserve the observation unchanged;
- append a `declared-witness-unreachable` record;
- set its disposition to `unresolved`;
- keep generation and CI green once the projections match the deterministic result.

An `unresolved` reachability observation is fog, not a contradiction, and remains visible in `observation.results`. A `reachable` witness is not evidence that the declaration itself is true. No projection performs reconciliation.

## CI boundary

### CI must fail

- `PROJECT_STATUS.json` is missing or invalid JSON;
- base project-status structural validation fails;
- the TranchNode Room candidate cannot answer the five inherited questions from its local fields;
- a required `witnesses` array is absent or empty;
- a witness or re-entry path is syntactically unsafe or escapes the repository-relative grammar;
- duplicate claim or touchpoint identifiers prevent stable references;
- an unknown touchpoint kind or posture is declared;
- the normalized projection cannot be constructed;
- committed `ROOM.md` or `room.json` differs from deterministic generation.

### CI must remain green

- a valid witness path is observed as `unreachable`;
- reachability is `unresolved`;
- declaration and witness observation disagree;
- `humanHeld` is absent and actual authority is unavailable;
- `observedMainCommit` cannot be shown current by this observer;
- Project0 has no adopted Room declaration or no reciprocal claim;
- external `evidence` is stale, draft, unavailable, or uninterpreted;
- actual constitution, truth, sufficiency, permission, or authority cannot be established;
- a declared posture is `human-held` or `closed`.

Projection drift may make CI red until the generated artifacts are refreshed. The reachability state itself is never the reason for failure.

## Adversarial specimen

Create one controlled fixture under `fixtures/room-protocol-v0/unreachable-witness/` with:

- a structurally valid five-question declaration;
- one proof claim whose witness path is valid but absent;
- generated `ROOM.md` and `room.json` showing the declaration, `unreachable` observation, and unresolved discrepancy;
- no automatic rewrite, invented replacement witness, or CI failure.

The fixture must also make these attacks explicit in tests:

1. an existing path yields `reachable` but does not change a claim into fact;
2. an absent path yields `unreachable` but does not change a claim into falsehood;
3. an injected `EACCES`/I/O failure yields `unresolved`, not `unreachable`;
4. `../outside` is a structural error, not an observation;
5. a reachable final symlink entry is not dereferenced and grants no knowledge of its target, while an intermediate symlink makes the observation unresolved;
6. missing `humanHeld` yields unavailable authority and no implicit permission;
7. `invoke-under-local-rules` still yields `navigationGrantsPermission: false`;
8. a Project0 claim remains outbound and `reciprocityDetermination: "not-made"`;
9. a draft or stale commit in opaque `evidence` is not upgraded by path reachability;
10. changing a declaration does not silently erase an existing discrepancy.

## Fresh-context experiment

The experiment is part of v0; the protocol is not accepted merely because its files render.

### Bounded task

Use the same prompt in two fresh contexts:

> Assess whether a new caller can invoke TranchNode's declared Intent Stroke stdio v0.2 surface non-interactively, identify one assumption you are not entitled to make, identify the minimum additional evidence needed, and propose one malformed-input regression test without editing the repository.

### Treatment

Give the fresh intelligence only `room.json` and the task. Permit deliberate traversal through paths named in that projection. Record every additional source it requests or reads.

Before traversal, require it to identify:

1. one lawful next action;
2. one assumption it is not entitled to make;
3. the minimum additional evidence required.

### Control

Give a separate fresh intelligence the repository identifier and the identical task, but no Room artifact. Give both arms the same model family, reasoning budget, tools, time boundary, and mutation prohibition. Do not leak treatment context into the control.

### Evaluation

Record distinct repository sources read, recursive/broad loads, false assumptions, authority or constitution mistakes, unnecessary archaeology, omitted necessary evidence, and whether the final bounded proposal is supported by the inspected code/tests.

The treatment is directionally successful only if it reaches a supported result with strictly less archaeology, avoids at least one control archaeology branch, and introduces no additional critical omission or authority error. It fails seriously if it treats navigation as permission, reachability as truth/adoption, the Project0 declaration as reciprocal, or the declared command as authorization to execute. It is inconclusive if the task is too easy, the control is equally efficient, or the Room omits evidence needed for a correct answer.

This is an N=1 falsification-oriented specimen, not a statistical claim.

## Reproducibility record

Preserve these repository-owned artifacts:

- `docs/experiments/room-protocol-v0/manifest.json`: repository, PR, base SHA, head SHA at execution, branch, PR draft/merge state, execution time, declaration blob/content SHA-256, `room.json` SHA-256, observer procedure, exact prompts, model/tool policy, and evaluator rubric;
- `docs/experiments/room-protocol-v0/treatment.md`: unedited treatment response plus ordered source/tool-read log;
- `docs/experiments/room-protocol-v0/control.md`: unedited control response plus ordered source/tool-read log;
- `docs/experiments/room-protocol-v0/assessment.md`: comparison, false assumptions, omissions, authority failures, result (`supported`, `failed`, or `inconclusive`), unresolved fog, and smallest justified next move.

The repository record is primary. A spreadsheet or Drive document may later project the measurements for comparison, but it is not required for v0 and cannot replace the repository evidence.

## Required tests

1. Base compatibility: a legacy `static-collective.project-status.v1` document without Room fields still validates.
2. Candidate completeness: the TranchNode Room candidate requires non-empty path witnesses for every question 2, 3, and 5 item.
3. Vocabulary: old permission-shaped touchpoint access values are rejected by Room-candidate validation; new postures project as declarations.
4. Path grammar: normalized relative paths pass; absolute, traversal, backslash, empty-component, and NUL paths fail.
5. Observer trichotomy: found, absent, and insufficient results map only to `reachable`, `unreachable`, and `unresolved`.
6. Observer scope: no contents, Git, network, tests, commands, or final symlink target are inspected.
7. Projection identity: Markdown and JSON derive from the same normalized object and are deterministic.
8. Semantic labels: `canonicalAuthority`, `observedMainCommit`, and `landed` remain visibly declared.
9. Authority: missing `humanHeld` renders unavailable; every projection says it grants no authority or permission and determines no constitution.
10. Discrepancy: unreachable creates an unresolved discrepancy without validation failure or source mutation.
11. Fog: observer failure stays unresolved and visible.
12. Neighbor asymmetry: exactly one outbound Project0 claim appears; reciprocity is not made or inferred.
13. Drift: `room:check` fails for stale/missing generated artifacts and passes after deterministic regeneration, including the adversarial unreachable state.
14. Repository regression: the existing full `npm run check` remains green and non-Room behavior is unchanged.

## Explicit non-goals

- no organization-wide Room schema;
- no `.static/world.yaml` migration merely for aesthetic consistency;
- no Project0 implementation or reciprocal requirement;
- no remote repository reachability;
- no adopted-main or branch-protection detector;
- no test runner or command execution inside observation;
- no truth, confidence, readiness, health, or authority score;
- no automatic discrepancy repair;
- no graph, registry, index, RAG, or mesh;
- no Cloudflare or public porch;
- no generated UI or aesthetic expansion;
- no GitBook or spreadsheet as canonical state;
- no claim that this draft PR is constituted.

## Architectural contradiction found

There is no fatal contradiction, but there is one non-negotiable status boundary: PR #67 and Project0 PR #58 are drafts. Therefore the experiment may evaluate a candidate Room Protocol against constituted TranchNode evidence, but it cannot call the Room implementation itself adopted or call the Project0 relation reciprocal. Only the repository's actual constituting process can change that.

The existing implementation becomes unsafe only if it keeps presenting `canonicalAuthority`, `landed`, `safe-read-execute`, or the Project0 draft as factual, permissive, current, or reciprocal. The changes above remove that risk without discarding the work.

## Smallest justified next move

Implement the witness-path rule, bounded observer, normalized dual projection, adversarial fixture, and controlled experiment on PR #67. Keep the PR draft until the generated artifacts, tests, and experiment record exist. Then ask the human-held repository process whether to adopt it.

Do not build the neighborhood.
