# Continuity Spine v0.1 — Design

Date: 2026-08-19
Issue: #56 — Continuity Spine v0.1 — design transformation as staged continuity across time
Status: design proposed; awaiting human review before implementation planning

## Purpose

Extend TranchNode from describing and reconstructing constituted state into describing **lawful transformation across time** without turning future intention into present evidence, destroying continuity during transition, or preserving obsolete scaffolding forever.

TranchNode already treats continuity as preservation of sufficient relational constraints for lawful re-emergence. The Continuity Spine adds the next question:

> Given what a project was, what it is now, and what it is trying to become, what must be grown, transferred, witnessed, retained, or shed so that the next state is genuinely descended from the current one rather than merely replacing it?

The first slice is deliberately smaller than an orchestrator, roadmap engine, project manager, or autonomous planner. It is a machine-readable **transformation witness and refusal boundary**.

## Core distinction

A normal snapshot describes one state:

```text
S(t)
```

A roadmap describes intended work:

```text
S(now) -> S(target)
```

The Continuity Spine instead carries a bounded relationship among origin, present, attractor, invariants, transitional overlap, transfers, witnesses, and shedding:

```text
P = { origin, present, attractor, stages, invariants, transfers, witnesses }
```

The attractor is **proposal authority only**. It may constrain design choices in the present, but it does not become evidence that the future exists, that a transition is admissible, or that a dependency has already been transferred.

This preserves the existing TranchNode distinction between proposals and constituted reality.

## Governing law

> **Build the next load path before weakening the old one. Shed the old load path only after its required function has crossed and the transfer has been witnessed.**

The canonical transformation shape is:

```text
A
  -> grow B
A + B
  -> transfer responsibility / dependency
A* + B
  -> witness transfer
B
  -> shed obsolete scaffold
```

The overlap state `A + B` is constitutive. It is where continuity is preserved while responsibility changes carriers.

A system that deletes A before B can carry its obligations has not transformed; it has broken continuity.

A system that keeps A forever after B has lawfully inherited its obligations may preserve history while still accumulating dead weight. Continuity therefore requires both **retention until transfer** and **permission to shed after transfer**.

## Relationship to existing TranchNode continuity

This design does not replace `CONTINUITY.md`.

The existing continuity tuple remains:

```text
C = (O, Gamma, E, R)
```

where observations and relational constraints permit lawful reconstruction in a declared environment.

The Continuity Spine adds a prospective/transformational layer over successive constituted cuts:

```text
C0 -> C1 -> C2 -> ...
```

Each transition must preserve declared invariants and maintain an attributable path between stages. A later stage may materially differ from an earlier stage while remaining in the same lineage.

The new primitive therefore concerns **continuity of dependency and responsibility through change**, not sameness of implementation.

## Relationship to Lawful Reachability

Lawful Reachability asks what belongs to the present constituted world given accountable causal history.

The Continuity Spine must not bypass that boundary.

A spine may contain:

- a reference to an origin or prior constituted cut;
- a reference to the current constituted cut;
- one proposed future attractor;
- candidate transitions between stages.

But only the present/prior references may claim constituted status. Future stages remain proposed until independent admitted events and witnesses make them part of history.

Working rule:

> **The future may constrain proposals backward; it may not grant evidence backward.**

This is design constraint, not backward physical causation.

## Relationship to BEE

BEE says a proven invariant may cross a project boundary while donor authority stays behind and the recipient proves the invariant locally.

The Continuity Spine is related but orthogonal.

- BEE concerns **cross-project transfer of invariants**.
- Continuity Spine concerns **cross-stage transfer of dependency and responsibility through time**.

A later cross-repository slice may use both. v0.1 stays inside TranchNode.

## Approaches considered

### A. Stage ledger + pure evaluator — selected

Represent the transformation as a versioned manifest and implement a pure evaluator that answers whether a proposed stage transition is admissible, blocked, or invalid while separately preserving the fact that a destination is still proposal-only.

Benefits:

- machine-readable without becoming an orchestrator;
- fail-closed and deterministic;
- naturally separates current evidence from future proposal;
- testable against one real TranchNode transition;
- preserves existing ontology and authority boundaries;
- leaves execution, deletion, scheduling, and cross-project coordination outside the slice.

Cost: the first version will describe and evaluate transformation but will not perform it.

### B. Extend `PROJECT_STATUS.json` into a roadmap

Put target stages, future dependencies, and shedding conditions directly into the current machine-readable project status.

Rejected because `PROJECT_STATUS.json` is a projection of **what is currently proven on main**. Mixing proposed future state into that surface would collapse constituted present and attractor proposal into one authority-bearing document.

The current status file may be referenced by a Continuity Spine manifest; it should not become the spine itself.

### C. Generic workflow/orchestration graph

Build a scheduler that executes migrations, moves dependencies, deletes obsolete surfaces, and coordinates projects automatically.

Rejected for v0.1 because it grants execution semantics before the continuity/refusal law has been proven. It would also widen the slice into CI/CD, project management, and cross-repository mutation.

## Selected v0.1 data model

The first implementation should introduce one versioned manifest type. Names are intentionally concrete enough to test but not yet promoted into global ontology.

Conceptually:

```ts
interface ContinuitySpineManifestV01 {
  schema: "tranchnode/continuity-spine/v0.1";
  id: string;
  project: string;

  origin: StateRef;
  present: StateRef;
  attractor: AttractorRef;

  stageOrder: string[];
  invariants: Invariant[];
  stages: Stage[];
  transfers: Transfer[];
}
```

`stageOrder` is explicit in v0.1. Every stage id must appear exactly once. The evaluator rejects duplicate ids, unknown ids, and any transition whose source does not precede its destination.

### StateRef

A state reference identifies a bounded, attributable historical or current anchor.

Required fields:

- id;
- status: `historical | constituted`;
- source reference;
- optional observed commit / receipt identity where applicable.

A StateRef does not copy the full world state into the spine.

### AttractorRef

The attractor describes a proposed future condition.

Required fields:

- id;
- status fixed to `proposal`;
- human-readable purpose;
- desired capabilities or structural properties;
- explicit non-claims.

An attractor cannot carry `constituted`, `observed`, `witnessed`, or equivalent status in v0.1.

### Invariant

An invariant names something that must survive every applicable stage boundary.

Required fields:

- id;
- description;
- source/provenance reference;
- appliesThrough: stage ids or `all`.

Examples include compatibility, non-authority, deterministic identity, exact residual preservation, or a transport bound.

The spine does not itself prove an invariant true. It records the requirement and its provenance.

### Stage

A stage describes a temporary body the project may inhabit.

Required fields:

- id;
- status: `historical | constituted | proposal`;
- carries: capability/responsibility ids;
- dependsOn: dependency ids;
- scaffolds: temporary carrier/dependency ids;
- entry conditions;
- exit conditions.

A stage is not a task list. It describes what must be true of the system while that stage exists.

### Transfer

A transfer describes responsibility crossing from one carrier/stage to another.

Required fields:

- id;
- responsibility/capability id;
- from carrier;
- to carrier;
- source stage;
- destination stage;
- required witness ids;
- permitsShedding: scaffold/dependency ids.

A transfer remains incomplete until its required witness set is satisfied by supplied evidence.

### Witness reference

v0.1 should use references to existing evidence rather than invent a new global witness object.

A witness reference identifies the evidence required to establish that a transfer occurred. It may point to tests, commit/PR evidence, receipts, or other project-native proof.

The evaluator accepts supplied witness facts separately from the manifest so the manifest cannot simply declare its own transition complete.

## Evaluator surface

Implement one pure function conceptually shaped as:

```ts
evaluateStageTransition({
  spine,
  fromStageId,
  toStageId,
  suppliedWitnesses,
}): TransitionEvaluation
```

The evaluator must not mutate files, branches, project status, or external systems.

`TransitionEvaluation` has one primary decision and zero or more structured findings:

```text
decision = admissible | blocked | invalid
findings = [...]
```

A transition to a proposed stage may therefore be `decision: admissible` while also carrying a `proposal_only` finding. `admissible` means the transition satisfies the manifest's structural continuity law; it does **not** promote the destination into constituted history.

Required v0.1 finding classes:

- `proposal_only` — destination is prospective and not yet historically constituted; informational and compatible with an admissible decision;
- `blocked_invariant_loss` — transition would violate an applicable invariant;
- `blocked_untransferred_responsibility` — a required capability/dependency is still carried only by the old stage;
- `blocked_unwitnessed_transfer` — the manifest proposes a transfer but supplied evidence does not establish it;
- `blocked_premature_shedding` — a scaffold/dependency is requested to disappear before every responsibility that depends on it has lawfully crossed;
- `invalid_manifest` — structural contradictions, unknown references, impossible stage ordering, or an attractor claiming constituted/evidence status.

The evaluator should fail closed. Unknown witness ids, missing transfer targets, or ambiguous carrier references do not default to success.

## First executable specimen — Intent Stroke v0.1 -> v0.2

Use the real transition landed in PR #54 as the first calibration specimen.

This transition already contains the shape the Continuity Spine is meant to expose.

### Before

The v0.1 stdio caller supplied an already bound `stroke` carrying a `fieldLayoutRef` plus the layout itself.

Responsibility for arriving at the canonical bound stroke therefore existed outside the new raw-point wrapper boundary.

### Overlap

PR #54 added v0.2 without deleting v0.1.

During the overlap:

- v0.1 continued to work unchanged;
- v0.2 accepted raw points plus declared layout;
- TranchNode addressed the layout internally;
- TranchNode constructed the canonical v0.1 stroke;
- the same canonical decoder remained authoritative for decoding behavior;
- `authority: "none"` remained unchanged;
- collisions remained unresolved rather than silently selected.

This is the `A + B` stage.

### Transfer

The responsibility transferred is:

```text
bind raw pointer points to the canonical addressed layout before decoding
```

For v0.2 callers, that responsibility moved from the caller boundary into TranchNode.

The transfer is witnessed by the landed tests and PR #54 exact-head evidence.

### Shedding

After that transfer, a v0.2 caller may shed the requirement to know or construct `fieldLayoutRef` itself.

This is important: **the thing shed is a dependency/responsibility, not necessarily the entire old interface.**

The v0.1 interface remains because backward compatibility is independently preserved. The Continuity Spine must therefore allow one responsibility to be shed while another historical surface remains intentionally carried.

### Required invariants for the specimen

At minimum:

- v0.1 behavior remains compatible;
- canonical addressing remains inside TranchNode;
- canonical decoder semantics remain unchanged;
- decoder authority remains `none`;
- collisions remain unresolved;
- raw pointer transport does not grant traversal or caller authority.

### Negative calibration

The fixture should include at least these blocked variants:

1. mark the raw-point caller dependency as shed without supplying the v0.2 transfer witness -> `blocked_unwitnessed_transfer`;
2. propose a destination stage that changes decoder authority from `none` -> `blocked_invariant_loss`;
3. encode the attractor as `constituted` merely because it is desired -> `invalid_manifest`;
4. remove the v0.1 compatibility obligation while compatibility is still declared as an active invariant -> `blocked_invariant_loss`.

## Canonical storage for v0.1

The implementation should keep the first manifest and fixture inside TranchNode. Suggested paths are subject to the implementation plan, but the conceptual ownership is:

```text
src/continuity-spine.ts
fixtures/continuity-spine/intent-stroke-v01-to-v02.json
test/continuity-spine.test.ts
```

The design does **not** require a new top-level `CONTINUITY_SPINE.json` for the live project yet. A runtime/project-self manifest should wait until the fixture and evaluator prove the shape.

## Why not mutate `PROJECT_STATUS.json` yet

`PROJECT_STATUS.json` is currently a dated statement of proven executable surfaces on main.

The spine may later reference that status as the `present` anchor, but the first implementation must not make the status file carry speculative future stages.

This preserves a clean distinction:

```text
PROJECT_STATUS = what is proven now
Continuity Spine = how proven now may lawfully become something else
```

## Error handling and refusal law

The evaluator is a refusal surface before it is a recommendation surface.

It must reject or block when:

- a stage references unknown transfers/invariants;
- stage ids are duplicated, omitted from `stageOrder`, or ordered inconsistently with the requested transition;
- a proposed attractor claims evidence status;
- requested shedding outruns transfer;
- a transfer claims completion without supplied witness evidence;
- an invariant disappears without an explicit stage boundary where it stops applying;
- a historical/current source ref is absent or malformed.

No fuzzy matching, confidence score, or LLM inference is needed.

## Testing strategy

The implementation should follow TDD and prove behavior through deterministic Node tests under the existing `npm run check` surface.

Minimum tests:

1. valid manifest parses/evaluates deterministically;
2. historical -> overlap -> transferred stage produces the expected structured findings;
3. missing witness blocks shedding;
4. active invariant loss blocks transition;
5. attractor cannot impersonate constituted state;
6. v0.2 caller may shed caller-side layout-binding responsibility only after transfer witness;
7. v0.1 compatibility remains independently preserved;
8. unknown refs fail closed;
9. stage order rejects duplicates and backwards transitions;
10. input objects are not mutated;
11. repeated evaluation is byte/structure stable for identical input.

No network, GitHub API, GitBook API, filesystem mutation, LLM, wall clock, random value, or environment-dependent behavior belongs in v0.1 tests.

## Acceptance criteria

v0.1 is successful when TranchNode can deterministically answer, for the pinned real specimen:

- what stage the transformation is describing;
- which invariants must survive;
- what responsibility is being transferred;
- what evidence is required before that transfer counts;
- what dependency/responsibility may be shed afterward;
- why a premature shed is refused;
- why a proposed future cannot masquerade as constituted reality.

The result must remain machine-readable and must not execute the transition itself.

## Non-goals

v0.1 explicitly does not provide:

- autonomous planning;
- task generation;
- CI/CD orchestration;
- automatic branch, file, dependency, or infrastructure deletion;
- multi-repository mutation;
- generalized temporal logic;
- project scheduling;
- optimization of the shortest transformation path;
- prediction of the correct future;
- a replacement for Git history;
- a replacement for `PROJECT_STATUS.json`;
- ontology expansion solely for naming convenience.

## Cross-ecosystem projection boundary

The useful invariant may later cross into other projects through BEE:

> A recipient project may name what it is carrying temporarily, what future state it proposes, what must cross before shedding, and what witness would prove the crossing.

But TranchNode v0.1 must prove this locally first.

GitBook may carry a bounded Frontier/Pattern projection of the concept, clearly marked as project-backed and non-authoritative. Other repositories should not adopt a shared schema until at least one materially different second project reproduces the invariant in its own native form.

## Design compression

The whole v0.1 can be compressed to four laws:

1. **Future constrains proposal, never evidence.**
2. **Overlap before replacement.**
3. **Transfer before shedding.**
4. **Witness before claiming transfer complete.**

Or, operationally:

```text
inherit -> grow -> overlap -> transfer -> witness -> shed -> continue
```

## Residual frontier

If the first specimen survives implementation, later work may explore:

- a live project-owned spine referencing `PROJECT_STATUS.json` as its present cut;
- counterfactual stage branches without promotion into history;
- prospective reachability: which next stages are structurally admissible from the current constituted cut;
- cross-project BEE pollen carrying the transformation invariant without schema authority;
- temporal visualization of a project as a sequence of temporary bodies around one continuity spine;
- stage garbage collection where obsolete scaffolds become safely removable only after witnessed transfer;
- explicit refusal topology for transformations that remain imaginable but unreachable without violating invariants.

These remain unimplemented and unpromoted in v0.1.

## Governing question

> **What can this project safely stop carrying now, and what must become capable of carrying it first?**
