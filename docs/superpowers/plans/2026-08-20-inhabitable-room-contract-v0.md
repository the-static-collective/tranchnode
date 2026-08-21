# Inhabitable Room Contract v0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make TranchNode Room 001 structurally valid, deterministically renderable, and visibly connected to Project0 only through explicitly declared repository-owned data.

**Architecture:** Extend `PROJECT_STATUS.json` in place. A focused `src/room-contract.ts` owns structural validation and deterministic Markdown rendering; repository scripts are thin filesystem adapters. `ROOM.md` and any later Cloudflare surface are projections only.

**Tech Stack:** TypeScript 5.8, Node.js 22, `node:test`, `tsx`, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-20-inhabitable-room-contract-v0-design.md`

## Global Constraints

- `static-collective.project-status.v1` remains backward compatible when inhabitation fields are absent.
- No inferred dependency or touchpoint edges.
- Unknown/missing data stays unknown or not declared.
- Human-only and closed touchpoints remain visibly non-automatable.
- Cloudflare remains a replaceable projection adapter, not repository authority.
- No database, KV, Durable Object, R2, graph database, or paid feature in v0.

---

### Task 1: Validator contract

**Files:**
- Create: `test/room-contract.test.ts`
- Create: `src/room-contract.ts`

**Interfaces:**
- Produces `validateProjectStatus(value: unknown): ProjectStatus`.
- Produces exported `ProjectStatus`, `RoomDependency`, `RoomTouchpoint`, and `RoomReentry` types.

- [ ] Write failing tests covering legacy v1 acceptance, valid inhabitation fields, malformed repo ids, unknown kind/access values, duplicate touchpoint ids, invalid re-entry paths, and absent optional fields.
- [ ] Push tests alone and confirm PR CI fails because `../src/room-contract.js` does not exist.
- [ ] Implement the minimum validator with explicit enum sets and repository-relative path checks.
- [ ] Confirm PR CI becomes green for validator tests and existing tests.

### Task 2: Deterministic room renderer

**Files:**
- Modify: `test/room-contract.test.ts`
- Modify: `src/room-contract.ts`

**Interfaces:**
- Consumes validated `ProjectStatus`.
- Produces `renderRoomMarkdown(status: ProjectStatus): string`.

- [ ] Add failing tests proving deterministic output, all five portable questions, source commit/status path, visible human-only/closed states, no undeclared edges, and explicit unknown/not-declared output.
- [ ] Confirm RED in PR CI.
- [ ] Implement pure deterministic Markdown rendering from declared data only.
- [ ] Confirm GREEN in PR CI.

### Task 3: Repository adapters and Room 001 declaration

**Files:**
- Create: `scripts/room-check.ts`
- Create: `scripts/room-render.ts`
- Modify: `package.json`
- Modify: `PROJECT_STATUS.json`
- Create: `ROOM.md`

**Interfaces:**
- `npm run room:check` loads and structurally validates `PROJECT_STATUS.json`.
- `npm run room:render` deterministically writes `ROOM.md` from validated status.

- [ ] Add script-level failing tests or CI checks before adapters where practical; production adapters stay thin and delegate all behavior to tested pure functions.
- [ ] Add `room:check` and `room:render`; include room validation in normal `check`.
- [ ] Extend TranchNode status only with claims supported by landed repository evidence.
- [ ] Generate `ROOM.md` and verify it declares itself a projection.
- [ ] Confirm full `npm run check` is green in PR CI.

### Task 4: First neighboring room specimen

**Files / repository:**
- Project0: extend `PROJECT_STATUS.json` on a dedicated feature branch only if repository evidence supports a declaration.
- TranchNode: add/adjust only the directional dependency actually supported by evidence.

**Interfaces:**
- A road exists only when a room declares it.
- Cross-repo topology preserves direction and asymmetry.

- [ ] Inspect landed TranchNode and Project0 evidence for one concrete relationship.
- [ ] Create the minimum Project0 declaration needed for a truthful first neighboring room; do not force reciprocity.
- [ ] Open a separate draft Project0 PR.
- [ ] Verify the pair represents exactly the declared edge(s), with no inferred relationship.

### Task 5: Public porch readiness

**Files:**
- No Cloudflare state required for completion of repository contract.

- [ ] Re-check whether callable Cloudflare account tools are exposed.
- [ ] If callable, deploy only a stateless free-tier Worker projection using generated room JSON/Markdown; do not add storage.
- [ ] If not callable, leave a precise deployment boundary and do not manufacture account-level success.

### Verification

- [ ] Review the PR diff against the design spec.
- [ ] Confirm `npm run check` green on current head.
- [ ] Confirm no relationship is inferred by code.
- [ ] Confirm all projection output identifies repository-owned source truth.
- [ ] Keep PR draft until implementation and review are complete.
