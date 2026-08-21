# Inhabitable Room Contract v0 — Design

## Purpose

Make a repository legible enough that a human or agent can enter it, understand what it is, know what it currently proves, see what it depends on, preserve what remains human-held, and discover where another project may safely touch it — without requiring global ingestion or creating a new authority layer.

The first specimen is TranchNode. Project0 is the first neighboring room.

## Core law

> The public world may project constituted repository truth, but may not manufacture it.

The project-owned repository remains canonical authority for its own room declaration. Renderers, indexes, Workers, GitBook pages, and other projections are derivative views. If a projection disappears, becomes stale, or fails, the constituted repository truth remains intact.

## Existing substrate

TranchNode and Project0 already publish `PROJECT_STATUS.json` using `static-collective.project-status.v1`. That file already carries repository identity, observed main commit, landed executable surfaces, and explicit non-claims.

v0 therefore extends that existing object with optional inhabitation fields instead of introducing a competing `.static/world.yaml` or `ROOM.json` source of truth.

Backward compatibility is mandatory: existing v1 documents without inhabitation fields remain valid.

## The five portable questions

Every inhabitable project should eventually be able to answer:

1. What are you?
2. What do you currently prove?
3. What do you depend on?
4. What remains human-held?
5. Where may another project safely touch you?

The questions are portable. The answers stay local to each repository.

## v0 data model

`PROJECT_STATUS.json` keeps its existing fields and may add the following optional fields.

### `dependsOn`

An array of declared neighboring project relationships.

Each item contains:

- `repository`: canonical `owner/repo` identifier.
- `relation`: short project-owned relation identifier.
- optional `evidence`: a local path, commit, pull request, or other attributable witness.

A relationship exists in the room graph only because a project declares it. Renderers must not infer dependency edges from imports, prose similarity, naming, or model judgment.

### `humanHeld`

An array of concise labels naming decisions, gates, or authority that automation must not silently absorb.

Examples include adoption, promotion, release approval, or an explicit human judgment boundary.

These labels are descriptive constraints. They do not themselves implement authorization.

### `touchpoints`

An array of declared surfaces where another project, human, or agent may interact.

Each item contains:

- `id`: stable local identifier.
- `kind`: one of `read`, `executable`, `artifact`, `receipt`, `gate`, or `other`.
- `access`: one of `safe-read`, `safe-read-execute`, `proposal-only`, `human-only`, or `closed`.
- optional `interface`: command, path, protocol, or other concrete entry point.
- optional `evidence`: attributable witness for the declaration.

A touchpoint declaration is a navigation statement, not ambient authority. `safe-read-execute` means the declared interface may be invoked under its own local rules; it never transfers source authority or bypasses destination admission.

### `reentry`

An object of stable local landmarks for bounded traversal.

v0 permits:

- `readme`
- `status`
- `docs`
- `receipts`
- `artifacts`

Values are repository-relative paths. Missing landmarks remain unknown rather than being guessed.

## TranchNode Room 001

TranchNode is the first room because it already has explicit non-claims, executable boundaries, receipts/projection doctrine, and strong project-owned status metadata.

The first declaration should be grounded only in landed repository evidence.

Expected categories:

- identity: existing `project`, `repository`, `phase`, and `canonicalAuthority` fields;
- currently proves: existing landed `executableSurface` entries;
- depends on: Project0 only where a concrete local witness supports that relationship;
- human-held: authority promotion/adoption boundaries only where current doctrine supports them;
- touchpoints: landed executable/read surfaces plus explicit human-only gates;
- re-entry: `README.md`, `PROJECT_STATUS.json`, and applicable docs/receipt paths.

No field should be populated merely because the relation feels architecturally plausible.

## Project0 as first neighboring room

Project0 receives the minimum reciprocal declaration necessary to make one real cross-repository traversal visible.

The relationship does not need to be symmetric. Each repository owns its own statement. If TranchNode declares a dependency and Project0 does not declare a reciprocal relation, the graph remains directional.

This asymmetry is useful evidence rather than an error.

## Validator

Add a small TypeScript validator for `static-collective.project-status.v1` inhabitation fields.

Requirements:

- parse valid JSON;
- preserve compatibility with existing v1 status files lacking the new fields;
- reject malformed `dependsOn`, `humanHeld`, `touchpoints`, and `reentry` values;
- reject unknown `kind` and `access` enum values;
- reject duplicate touchpoint ids;
- reject malformed repository identifiers;
- never validate whether a declared relationship is philosophically true; structural validation is not authority validation.

Expose the check as `npm run room:check`.

## Human projection

Add a deterministic renderer that turns a valid room declaration into `ROOM.md`.

`ROOM.md` should answer the five portable questions in ordinary language and expose declared neighboring rooms and touchpoints.

The renderer must:

- use only declared status data;
- never infer missing relationships;
- preserve human-only/closed states visibly;
- identify the source `PROJECT_STATUS.json` and observed commit;
- render deterministically for identical input.

Expose generation as `npm run room:render`.

Generated output is a projection and must say so.

## Machine projection

The validated `PROJECT_STATUS.json` remains the canonical machine-readable room declaration for v0.

A later public service may expose normalized JSON at a route such as `/rooms/tranchnode.json`, but that endpoint must remain a projection of repository-owned status rather than a second mutable registry.

## World projection

Once two validated rooms exist, a world renderer may assemble their explicitly declared relationships into a topology.

v0 world rules:

- only declared edges appear;
- direction is preserved;
- unknown remains unknown;
- human-only gates remain visibly human-only;
- stale or unavailable source data is marked stale/unavailable rather than silently replaced;
- a projection cannot create, promote, or authorize a repository relationship.

## Cloudflare porch

Cloudflare is an optional public projection layer after the repo contract works locally and in CI.

The first deployment should require no database, KV, Durable Object, or R2 bucket unless implementation evidence demonstrates a concrete need.

A minimal Worker may serve generated room/world artifacts such as:

- `/world`
- `/rooms/tranchnode`
- `/rooms/tranchnode.json`
- `/rooms/project0`
- `/rooms/project0.json`

The Worker must be rebuildable from repository-owned declarations. Cloudflare state is not constitutional state.

R2 may be introduced later for concrete artifact indexes, downloadable metadata, or durable receipt objects when those use cases exist.

## Failure semantics

Failures must preserve uncertainty rather than manufacture continuity.

- invalid status declaration -> validation failure;
- unavailable neighboring repository -> neighbor unavailable/unknown;
- stale projection -> stale marker with known source commit;
- missing optional field -> unknown/not declared;
- human-only touchpoint -> no automated traversal;
- closed touchpoint -> no traversal;
- renderer failure -> source declaration remains authoritative.

## Testing strategy

### Validator tests

Prove:

- legacy v1 status remains valid;
- valid inhabitation fields pass;
- malformed repo ids fail;
- unknown touchpoint kinds/access values fail;
- duplicate touchpoint ids fail;
- invalid re-entry paths fail;
- absence of optional fields is valid.

### Renderer tests

Prove:

- deterministic output;
- all five questions appear;
- human-only and closed surfaces stay visible;
- no undeclared edge is invented;
- source commit/status path are present;
- missing data renders as not declared/unknown rather than guessed.

### Cross-repo specimen

Use TranchNode plus Project0 declarations to prove one directional or reciprocal edge exactly as declared by the repositories.

## CI

The normal TranchNode `check` path should eventually include room validation so a malformed room declaration cannot land unnoticed.

Generation may either be checked for a clean diff or generated during CI, but v0 should avoid complicated publishing automation until the local contract is stable.

## Non-goals for v0

- no universal command center;
- no ambient agent authority;
- no automatic inference of repo relationships;
- no mutable central registry;
- no graph database;
- no RAG ingestion requirement;
- no automatic human-gate crossing;
- no dependency on paid Cloudflare features;
- no requirement that every Collective repository adopt the contract immediately.

## Success criteria

v0 succeeds when:

1. TranchNode has a structurally valid inhabitable declaration grounded in landed evidence.
2. A human-readable `ROOM.md` can be deterministically generated from it.
3. Project0 can participate as the first neighboring room without surrendering local authority.
4. A renderer shows exactly the declared relationship and no inferred relationship.
5. A human or agent can enter through the room surface and identify the project's current proof, dependency, human-held gates, and safe touchpoints without reading the entire repository.
6. The same declarations can later be projected through a free-tier Cloudflare Worker without Cloudflare becoming canonical authority.

## Constitutional compression

A room is not the world.

A room is enough durable relation to permit bounded re-entry.

A road exists because a room declares it.

A projection may reveal the constituted world; it may not constitute the world by itself.
