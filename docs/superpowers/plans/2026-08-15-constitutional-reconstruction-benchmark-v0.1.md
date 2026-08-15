# Constitutional Reconstruction Benchmark v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one deterministic constitutional reconstruction benchmark vertical over the landed Covenant Circuit fixture, proving that unresolved evidence is distinct from a prohibited conclusion and that later testimony changes projection without rewriting occurrence.

**Architecture:** Add one versioned JSON benchmark manifest plus one focused TypeScript module. The module validates the manifest, exposes a neutral `ReconstructionEngine`, implements a deterministic symbolic engine and a fixture-driven adapter, evaluates structured findings, and computes a deliberately narrow constitutional diff. Existing ontology, projection, fulfillment, artifact-store, and Covenant Circuit source files remain untouched.

**Tech Stack:** TypeScript 5.8, Node.js 22 `node:test`, `tsx`, existing RFC 8785/JCS `addressJson` identity path.

## Global Constraints

- Do not modify `ONTOLOGY.md` or `INVARIANTS.md`.
- Do not add or redefine ontology node/edge kinds.
- Do not add a second canonicalizer, hash path, event chain, model provider, network dependency, UI, or Vercel surface.
- Structured benchmark identity uses existing `addressJson`; source fixture provenance is separately pinned by its existing Git blob SHA.
- The source Covenant Circuit evaluator remains unchanged.
- Cut A must remain `authorization=valid`, `fidelity=faithful`, `fulfillment=scope_uncertain` despite 10,000 diagnostic references.
- Cut B may become `fulfillment=scoped_complete` only after an eligible `consumed` disposition witness is admitted.
- The original provision occurrence body/address must be identical at Cut A and Cut B.
- `graph density => scoped_complete` is a prohibited conclusion, not an unresolved or low-confidence result.
- Input order must not affect normalized reconstruction output.
- Repository gate is `npm run check`.

---

### Task 1: Freeze the benchmark manifest and public contracts

**Files:**
- Create: `fixtures/reconstruction-benchmark/constitutional-reconstruction-v0.1.json`
- Create: `test/reconstruction-benchmark.test.ts`
- Create after RED is observed: `src/reconstruction-benchmark.ts`

**Interfaces:**
- Produces `BenchmarkManifest`, `BenchmarkEvidence`, `TemporalCut`, `ReconstructionInput`, `ReconstructionResult`, `ReconstructionEngine`, `validateBenchmarkManifest`.
- Later tasks consume these exact names.

- [ ] **Step 1: Create the versioned manifest**

Use this exact fixture projection:

```json
{
  "schemaVersion": "constitutional-reconstruction-benchmark/v0.1",
  "id": "covenant-circuit.graph-density-witness.v0.1",
  "source": {
    "path": "fixtures/covenant-circuit/02-complete-circuit/evaluate.py",
    "gitBlobSha": "e5b7a762350a00e792c57e5e63612d820964827f",
    "sourceCases": ["graph_density_without_witness", "authorized_consumed"]
  },
  "invariantIds": [
    "no-unsupported-elevation",
    "no-silent-overwrite",
    "later-knowledge-does-not-rewrite-earlier-knowledge"
  ],
  "evidence": [
    {
      "kind": "provision_occurrence",
      "id": "provision.meal.child-c.window-w",
      "occurredAt": "2026-08-05T11:30:00Z",
      "admittedAt": "2026-08-05T11:35:00Z",
      "authorization": "valid",
      "purposeCompatibility": "compatible",
      "fidelity": "faithful",
      "diagnosticReferenceCount": 10000
    },
    {
      "kind": "disposition_witness",
      "id": "witness.receiving-caregiver.consumed",
      "subjectOccurrenceId": "provision.meal.child-c.window-w",
      "witnessedAt": "2026-08-05T12:10:00Z",
      "admittedAt": "2026-08-05T12:15:00Z",
      "eligible": true,
      "role": "receiving_caregiver",
      "disposition": "consumed"
    }
  ],
  "cuts": [
    {
      "id": "cut-a-before-witness",
      "projectionAt": "2026-08-05T12:00:00Z",
      "expected": {
        "exact": [
          {"path": "operational.authorization", "value": "valid"},
          {"path": "operational.fidelity", "value": "faithful"},
          {"path": "operational.fulfillment", "value": "scope_uncertain"}
        ],
        "plural": [],
        "unresolved": ["fulfillment"],
        "prohibited": [
          {
            "path": "operational.fulfillment",
            "value": "scoped_complete",
            "reason": "GRAPH_DENSITY_IS_NOT_FULFILLMENT_EVIDENCE"
          }
        ]
      }
    },
    {
      "id": "cut-b-after-witness",
      "projectionAt": "2026-08-05T12:20:00Z",
      "expected": {
        "exact": [
          {"path": "operational.authorization", "value": "valid"},
          {"path": "operational.fidelity", "value": "faithful"},
          {"path": "operational.fulfillment", "value": "scoped_complete"}
        ],
        "plural": [],
        "unresolved": [],
        "prohibited": []
      }
    }
  ]
}
```

- [ ] **Step 2: Write failing contract/manifest tests before production code**

`test/reconstruction-benchmark.test.ts` must initially import the not-yet-existing module and assert at least:

```ts
const manifest = validateBenchmarkManifest(JSON.parse(await readFile(MANIFEST_PATH, "utf8")));
assert.equal(manifest.schemaVersion, "constitutional-reconstruction-benchmark/v0.1");
assert.equal(manifest.source.gitBlobSha, "e5b7a762350a00e792c57e5e63612d820964827f");
assert.deepEqual(manifest.source.sourceCases, ["graph_density_without_witness", "authorized_consumed"]);
assert.equal(addressJson(manifest).hash, addressJson(JSON.parse(JSON.stringify(manifest))).hash);
```

Also compute the Git blob SHA of the current Python fixture in test-only code:

```ts
function gitBlobSha(bytes: Uint8Array): string {
  const header = Buffer.from(`blob ${bytes.byteLength}\0`, "utf8");
  return createHash("sha1").update(header).update(bytes).digest("hex");
}
```

and require it to equal `manifest.source.gitBlobSha`.

Malformed-manifest tests must reject a wrong schema version, duplicate cut ids, and a witness whose `subjectOccurrenceId` does not name a provision occurrence in the evidence set.

- [ ] **Step 3: Verify RED through the PR workflow**

Create/open the draft PR after the test+manifest commit. Expected `check` failure: TypeScript cannot resolve `../src/reconstruction-benchmark.js` (or named exports are missing). This is the required observable RED state because the current host cannot execute npm locally.

- [ ] **Step 4: Implement only the manifest/contracts needed to make Task 1 green**

Create `src/reconstruction-benchmark.ts` with these public types:

```ts
export type AuthorizationStatus = "valid" | "invalid" | "indeterminate";
export type FidelityStatus = "faithful" | "drifted" | "breached" | "indeterminate";
export type PurposeCompatibilityStatus = "compatible" | "incompatible" | "indeterminate";
export type FulfillmentStatus = "attempted" | "partial" | "scoped_complete" | "scope_uncertain";
export type FactPath =
  | "operational.authorization"
  | "operational.purposeCompatibility"
  | "operational.fidelity"
  | "operational.fulfillment";

export interface TemporalCut { id: string; projectionAt: string }

export type BenchmarkEvidence =
  | {
      kind: "provision_occurrence";
      id: string;
      occurredAt: string;
      admittedAt: string;
      authorization: AuthorizationStatus;
      purposeCompatibility: PurposeCompatibilityStatus;
      fidelity: FidelityStatus;
      diagnosticReferenceCount: number;
    }
  | {
      kind: "disposition_witness";
      id: string;
      subjectOccurrenceId: string;
      witnessedAt: string;
      admittedAt: string;
      eligible: boolean;
      role: string;
      disposition: "consumed" | "declined" | "outcome_unknown";
    };
```

Define manifest expectation types matching the JSON exactly. `validateBenchmarkManifest(value: unknown): BenchmarkManifest` must fail closed with `BenchmarkError` codes:

```ts
"INVALID_MANIFEST" | "UNSUPPORTED_MANIFEST_VERSION" | "DUPLICATE_CUT_ID" | "BROKEN_EVIDENCE_REFERENCE"
```

Validation must not mutate the input and must return a plain canonicalizable object.

- [ ] **Step 5: Verify Task 1 GREEN**

Push production code and observe the PR check. Task 1 is green only when `npm run check` passes with the contract/manifest tests.

---

### Task 2: Reconstruct both temporal cuts and evaluate constitutional answer classes

**Files:**
- Modify: `src/reconstruction-benchmark.ts`
- Modify: `test/reconstruction-benchmark.test.ts`

**Interfaces:**
- Consumes Task 1 types.
- Produces `ReferenceReconstructionEngine`, `FixtureReconstructionEngine`, `evaluateBenchmarkResult`, `normalizeReconstructionResult`.

- [ ] **Step 1: Write failing engine/evaluator tests**

Tests must establish these outputs from the same manifest evidence:

```ts
const cutA = await reference.reconstruct({ manifest, cut: manifest.cuts[0] });
assert.deepEqual(cutA.operational, {
  authorization: "valid",
  purposeCompatibility: "compatible",
  fidelity: "faithful",
  fulfillment: "scope_uncertain"
});
assert.deepEqual(cutA.epistemic.unresolved, ["fulfillment"]);

const cutB = await reference.reconstruct({ manifest, cut: manifest.cuts[1] });
assert.equal(cutB.operational.fulfillment, "scoped_complete");
assert.deepEqual(cutB.epistemic.unresolved, []);
assert.equal(cutA.constitutional.occurrenceAddress, cutB.constitutional.occurrenceAddress);
assert.notEqual(cutA.constitutional.projectionAddress, cutB.constitutional.projectionAddress);
```

Preserve `const before = addressJson(cutA).hash`, reconstruct Cut B, and assert `addressJson(cutA).hash === before` afterward.

Create a deliberately bad result by changing only Cut A fulfillment to `scoped_complete`. `evaluateBenchmarkResult` must produce a failed finding whose `class` is exactly `"prohibited"` and whose reason is `GRAPH_DENSITY_IS_NOT_FULFILLMENT_EVIDENCE`; it must not report that failure as `"unresolved"`.

Build a `FixtureReconstructionEngine` from explicit test fixture results and prove that both it and the reference engine satisfy the same `ReconstructionEngine` call site.

Reverse the manifest evidence array and prove `normalizeReconstructionResult` is byte-equivalent under `addressJson`.

- [ ] **Step 2: Verify RED**

Push the tests only. Expected check failure: missing engine/evaluator exports or failed assertions because Task 1 contains contracts only.

- [ ] **Step 3: Implement the deterministic reference engine**

Public contract:

```ts
export interface ReconstructionEngine {
  readonly id: string;
  readonly version: string;
  reconstruct(input: ReconstructionInput): Promise<ReconstructionResult>;
}
```

`ReferenceReconstructionEngine` behavior:

1. Parse `cut.projectionAt` as an instant; fail malformed input.
2. Sort evidence by `id` before any derivation.
3. Admit only evidence with `admittedAt <= projectionAt`.
4. Require exactly one admitted `provision_occurrence`; otherwise fail closed.
5. Address the provision body with existing `addressJson` and use that hash as `occurrenceAddress`.
6. Find eligible admitted disposition witnesses whose `subjectOccurrenceId` equals the provision id.
7. If the latest eligible witness says `consumed`, fulfillment is `scoped_complete`; if `declined`, `attempted`; otherwise `scope_uncertain`.
8. Never use `diagnosticReferenceCount` to alter fulfillment.
9. Copy authorization, purpose compatibility, and fidelity only from the provision evidence body.
10. Emit deterministic sorted `history` records for all admitted evidence, each carrying `id`, `kind`, and existing `addressJson(evidence).hash`.
11. Emit `epistemic.unresolved=["fulfillment"]` only for `scope_uncertain`.
12. Compute `projectionAddress` through `addressJson` over a projection body containing `cutId`, `occurrenceAddress`, admitted history addresses, operational result, unresolved subjects, and tension state. Engine id/version metadata must not participate in occurrence identity.

- [ ] **Step 4: Implement the second adapter**

`FixtureReconstructionEngine` accepts an `id`, `version`, and `ReadonlyMap<string, ReconstructionResult>` in its constructor. `reconstruct` returns the result for `input.cut.id` with the adapter's engine metadata substituted and with arrays copied so callers cannot mutate the stored fixture result.

This adapter is intentionally fixture-driven; it proves harness interchangeability rather than duplicating reference-engine reasoning.

- [ ] **Step 5: Implement structured evaluation**

`evaluateBenchmarkResult(result, cutExpectation)` returns:

```ts
export interface BenchmarkFinding {
  class: "exact" | "plural" | "unresolved" | "prohibited";
  key: string;
  ok: boolean;
  actual?: string;
  expected?: readonly string[];
  reason?: string;
}
export interface BenchmarkEvaluation {
  pass: boolean;
  findings: BenchmarkFinding[];
}
```

Rules:

- exact: `ok` only when the fact path equals the declared value;
- plural: `ok` when actual is one of declared accepted values;
- unresolved: `ok` when the named subject is present in `result.epistemic.unresolved`;
- prohibited: `ok=false` only if the prohibited path/value is asserted; otherwise `ok=true`.

Sort findings deterministically by `class`, then `key`, then `actual ?? ""`.

- [ ] **Step 6: Verify Task 2 GREEN**

Observe the PR `check` workflow passing after implementation. Do not proceed to diff implementation while the temporal/evaluator slice is red.

---

### Task 3: Add ConstitutionalDiff v0.1 and complete branch verification

**Files:**
- Modify: `src/reconstruction-benchmark.ts`
- Modify: `test/reconstruction-benchmark.test.ts`
- Update: `docs/superpowers/specs/2026-08-15-constitutional-reconstruction-benchmark-v0.1-design.md` status line only after tests are green.

**Interfaces:**
- Produces `TensionState`, `ConstitutionalDiff`, `diffConstitutionalState`.

- [ ] **Step 1: Write failing diff tests**

On Cut A → Cut B assert:

```ts
assert.deepEqual(diffConstitutionalState(cutA, cutB), {
  historyDelta: "new_history",
  addedHistoryIds: ["witness.receiving-caregiver.consumed"],
  rewrittenHistoryIds: [],
  occurrenceDelta: "unchanged",
  projectionDelta: "new_projection",
  tensionDelta: "unchanged"
});
```

Then create a mutated copy of the provision occurrence under the same history id and prove `historyDelta === "rewritten_history"` and `occurrenceDelta === "changed_occurrence"`.

For tension semantics use minimal structured result copies:

```ts
before.constitutional.tensions = [{ id: "tension.care-plan", status: "open", resolutionEvidenceIds: [] }];
afterResolved.constitutional.tensions = [{ id: "tension.care-plan", status: "resolved", resolutionEvidenceIds: ["witness.resolution"] }];
afterSilenced.constitutional.tensions = [];
```

Require `resolved_tension` for the first transition and `silenced_tension` for the second.

- [ ] **Step 2: Verify RED**

Push the diff tests before implementation. Expected `check` failure: missing `diffConstitutionalState` or mismatch against unimplemented delta behavior.

- [ ] **Step 3: Implement deterministic ConstitutionalDiff**

Types:

```ts
export interface TensionState {
  id: string;
  status: "open" | "resolved";
  resolutionEvidenceIds: string[];
}

export interface ConstitutionalDiff {
  historyDelta: "unchanged" | "new_history" | "rewritten_history";
  addedHistoryIds: string[];
  rewrittenHistoryIds: string[];
  occurrenceDelta: "unchanged" | "changed_occurrence";
  projectionDelta: "unchanged" | "new_projection" | "not_comparable_after_occurrence_change";
  tensionDelta: "unchanged" | "resolved_tension" | "silenced_tension";
}
```

Rules:

- same history id + different address => rewritten history;
- only added ids with all existing ids unchanged => new history;
- occurrence address change => `changed_occurrence`;
- projection address change with unchanged occurrence => `new_projection`;
- projection change after occurrence mutation => `not_comparable_after_occurrence_change`;
- open tension retained as resolved only counts `resolved_tension` when at least one resolution evidence id is present;
- an open tension disappearing entirely is `silenced_tension`;
- all id arrays are lexicographically sorted.

- [ ] **Step 4: Full branch verification**

Required evidence after the final mutation:

1. PR `check` workflow reports success for the current head.
2. `npm run check` is the command executed by that workflow.
3. Inspect changed filenames and confirm `ONTOLOGY.md`, `INVARIANTS.md`, `src/projection.ts`, `src/fulfillment.ts`, and `fixtures/covenant-circuit/02-complete-circuit/evaluate.py` are absent from the diff.
4. Inspect PR patch for accidental second identity/hash logic, network calls, model dependencies, or product UI.

The current host has no local GitHub route and no installed `riqor` binary. Record that environment fact in the PR validation section rather than inventing a Riqor trace. The connected repository's fresh Actions result is the completion evidence available in this session.

- [ ] **Step 5: Update design status and PR body**

Change only the design status from `written-spec review pending` to `implemented in PR <number>; executable vertical under review`.

PR body must state that this PR is the **first bounded vertical of #20**, not full closure. Use `Refs #20`, not `Closes #20`, because the issue's full ten-case/delta acceptance remains broader than this PR.

- [ ] **Step 6: Review and completion handoff**

Run the repository/PR review pass. Address only correctness, determinism, test, or scope findings. Leave broader benchmark expansion as #20 follow-up rather than widening this branch.

PR Completion may take the exact final head to ready state, but landing requires fresh explicit approval for that head.