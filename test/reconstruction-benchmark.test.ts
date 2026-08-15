import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  BenchmarkError,
  FixtureReconstructionEngine,
  ReferenceReconstructionEngine,
  diffConstitutionalState,
  evaluateBenchmarkResult,
  normalizeReconstructionResult,
  validateBenchmarkManifest,
  type BenchmarkCut,
  type BenchmarkManifest,
  type ReconstructionEngine,
  type ReconstructionInput,
  type ReconstructionResult,
} from "../src/reconstruction-benchmark.js";
import { addressJson } from "../src/residual.js";

const MANIFEST_PATH = "fixtures/reconstruction-benchmark/constitutional-reconstruction-v0.1.json";
const SOURCE_PATH = "fixtures/covenant-circuit/02-complete-circuit/evaluate.py";

async function rawManifest(): Promise<any> {
  return JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
}

async function manifestFixture(): Promise<BenchmarkManifest> {
  return validateBenchmarkManifest(await rawManifest());
}

function cutById(manifest: BenchmarkManifest, id: string): BenchmarkCut {
  const cut = manifest.cuts.find((candidate) => candidate.id === id);
  assert.ok(cut, `missing benchmark cut ${id}`);
  return cut;
}

function gitBlobSha(bytes: Uint8Array): string {
  const header = Buffer.from(`blob ${bytes.byteLength}\0`, "utf8");
  return createHash("sha1").update(header).update(bytes).digest("hex");
}

async function reconstructWith(
  engine: ReconstructionEngine,
  input: ReconstructionInput,
): Promise<ReconstructionResult> {
  return engine.reconstruct(input);
}

test("benchmark manifest is versioned, canonicalizable, and pins exact Covenant Circuit fixture bytes", async () => {
  const manifest = await manifestFixture();

  assert.equal(manifest.schemaVersion, "constitutional-reconstruction-benchmark/v0.1");
  assert.equal(manifest.id, "covenant-circuit.graph-density-witness.v0.1");
  assert.equal(manifest.source.path, SOURCE_PATH);
  assert.equal(manifest.source.gitBlobSha, "e5b7a762350a00e792c57e5e63612d820964827f");
  assert.deepEqual(
    manifest.source.sourceCases,
    ["graph_density_without_witness", "authorized_consumed"],
  );

  const sourceBytes = await readFile(SOURCE_PATH);
  assert.equal(gitBlobSha(sourceBytes), manifest.source.gitBlobSha);
  assert.equal(
    addressJson(manifest).hash,
    addressJson(JSON.parse(JSON.stringify(manifest))).hash,
  );
});

test("benchmark manifest rejects unsupported schema versions", async () => {
  const candidate = await rawManifest();
  candidate.schemaVersion = "constitutional-reconstruction-benchmark/v9";

  assert.throws(
    () => validateBenchmarkManifest(candidate),
    (error: unknown) => error instanceof BenchmarkError
      && error.code === "UNSUPPORTED_MANIFEST_VERSION",
  );
});

test("benchmark manifest rejects duplicate temporal cut ids", async () => {
  const candidate = await rawManifest();
  candidate.cuts[1].id = candidate.cuts[0].id;

  assert.throws(
    () => validateBenchmarkManifest(candidate),
    (error: unknown) => error instanceof BenchmarkError
      && error.code === "DUPLICATE_CUT_ID",
  );
});

test("benchmark manifest rejects witness references to unknown provision occurrences", async () => {
  const candidate = await rawManifest();
  candidate.evidence[1].subjectOccurrenceId = "provision.missing";

  assert.throws(
    () => validateBenchmarkManifest(candidate),
    (error: unknown) => error instanceof BenchmarkError
      && error.code === "BROKEN_EVIDENCE_REFERENCE",
  );
});

test("reference engine keeps graph density unresolved before responsible witness", async () => {
  const manifest = await manifestFixture();
  const cut = cutById(manifest, "cut-a-before-witness");
  const result = await new ReferenceReconstructionEngine().reconstruct({ manifest, cut });

  assert.deepEqual(result.operational, {
    authorization: "valid",
    purposeCompatibility: "compatible",
    fidelity: "faithful",
    fulfillment: "scope_uncertain",
  });
  assert.deepEqual(result.epistemic.unresolved, ["fulfillment"]);
  assert.deepEqual(result.structural.admittedEvidenceIds, ["provision.meal.child-c.window-w"]);
  assert.equal(result.constitutional.history.length, 1);
  assert.deepEqual(result.constitutional.violations, []);

  const evaluation = evaluateBenchmarkResult(result, cut.expected);
  assert.equal(evaluation.pass, true);
  assert.equal(evaluation.findings.every((finding) => finding.ok), true);
});

test("later eligible disposition witness changes projection without rewriting occurrence or earlier cut", async () => {
  const manifest = await manifestFixture();
  const reference = new ReferenceReconstructionEngine();
  const cutAConfig = cutById(manifest, "cut-a-before-witness");
  const cutBConfig = cutById(manifest, "cut-b-after-witness");

  const cutA = await reference.reconstruct({ manifest, cut: cutAConfig });
  const cutABefore = addressJson(cutA).hash;
  const cutB = await reference.reconstruct({ manifest, cut: cutBConfig });

  assert.equal(cutB.operational.fulfillment, "scoped_complete");
  assert.deepEqual(cutB.epistemic.unresolved, []);
  assert.deepEqual(
    cutB.structural.admittedEvidenceIds,
    ["provision.meal.child-c.window-w", "witness.receiving-caregiver.consumed"],
  );
  assert.equal(cutA.constitutional.occurrenceAddress, cutB.constitutional.occurrenceAddress);
  assert.notEqual(cutA.constitutional.projectionAddress, cutB.constitutional.projectionAddress);
  assert.equal(addressJson(cutA).hash, cutABefore);
  assert.equal(evaluateBenchmarkResult(cutB, cutBConfig.expected).pass, true);
});

test("graph-density completion is prohibited distinctly from unresolved fulfillment", async () => {
  const manifest = await manifestFixture();
  const cut = cutById(manifest, "cut-a-before-witness");
  const lawful = await new ReferenceReconstructionEngine().reconstruct({ manifest, cut });
  const unlawful: ReconstructionResult = {
    ...lawful,
    operational: {
      ...lawful.operational,
      fulfillment: "scoped_complete",
    },
  };

  const evaluation = evaluateBenchmarkResult(unlawful, cut.expected);
  const prohibited = evaluation.findings.find(
    (finding) => finding.class === "prohibited" && finding.ok === false,
  );
  const unresolved = evaluation.findings.find(
    (finding) => finding.class === "unresolved" && finding.key === "fulfillment",
  );

  assert.equal(evaluation.pass, false);
  assert.ok(prohibited);
  assert.equal(prohibited.reason, "GRAPH_DENSITY_IS_NOT_FULFILLMENT_EVIDENCE");
  assert.equal(prohibited.actual, "scoped_complete");
  assert.ok(unresolved);
  assert.equal(unresolved.ok, true);
});

test("fixture adapter is replaceable behind the same ReconstructionEngine contract", async () => {
  const manifest = await manifestFixture();
  const cut = cutById(manifest, "cut-a-before-witness");
  const reference = new ReferenceReconstructionEngine();
  const referenceResult = await reconstructWith(reference, { manifest, cut });
  const fixture = new FixtureReconstructionEngine(
    "fixture-adapter",
    "0.1-test",
    new Map([[cut.id, referenceResult]]),
  );

  const fixtureResult = await reconstructWith(fixture, { manifest, cut });

  assert.deepEqual(fixtureResult.operational, referenceResult.operational);
  assert.deepEqual(fixtureResult.constitutional, referenceResult.constitutional);
  assert.deepEqual(fixtureResult.epistemic, referenceResult.epistemic);
  assert.deepEqual(fixtureResult.engine, { id: "fixture-adapter", version: "0.1-test" });
  assert.notDeepEqual(fixtureResult.engine, referenceResult.engine);
});

test("fixture adapter refuses a tampered temporal cut instead of returning a cached answer", async () => {
  const manifest = await manifestFixture();
  const cut = cutById(manifest, "cut-a-before-witness");
  const referenceResult = await new ReferenceReconstructionEngine().reconstruct({ manifest, cut });
  const fixture = new FixtureReconstructionEngine(
    "fixture-adapter",
    "0.1-test",
    new Map([[cut.id, referenceResult]]),
  );
  const tamperedCut: BenchmarkCut = {
    ...cut,
    projectionAt: "2026-08-05T12:19:59Z",
  };

  await assert.rejects(
    () => fixture.reconstruct({ manifest, cut: tamperedCut }),
    (error: unknown) => error instanceof BenchmarkError
      && error.code === "INVALID_RECONSTRUCTION_INPUT",
  );
});

test("reconstruction result is deterministic across manifest evidence insertion order", async () => {
  const manifest = await manifestFixture();
  const reference = new ReferenceReconstructionEngine();
  const cutA = cutById(manifest, "cut-a-before-witness");
  const original = await reference.reconstruct({ manifest, cut: cutA });

  const reorderedRaw = await rawManifest();
  reorderedRaw.evidence.reverse();
  const reorderedManifest = validateBenchmarkManifest(reorderedRaw);
  const reordered = await reference.reconstruct({
    manifest: reorderedManifest,
    cut: cutById(reorderedManifest, "cut-a-before-witness"),
  });

  assert.equal(
    addressJson(normalizeReconstructionResult(original)).hash,
    addressJson(normalizeReconstructionResult(reordered)).hash,
  );
});

test("constitutional diff classifies later witness as new history and a new projection", async () => {
  const manifest = await manifestFixture();
  const reference = new ReferenceReconstructionEngine();
  const cutA = await reference.reconstruct({
    manifest,
    cut: cutById(manifest, "cut-a-before-witness"),
  });
  const cutB = await reference.reconstruct({
    manifest,
    cut: cutById(manifest, "cut-b-after-witness"),
  });

  assert.deepEqual(diffConstitutionalState(cutA, cutB), {
    historyDelta: "new_history",
    addedHistoryIds: ["witness.receiving-caregiver.consumed"],
    rewrittenHistoryIds: [],
    occurrenceDelta: "unchanged",
    projectionDelta: "new_projection",
    tensionDelta: "unchanged",
  });
});

test("constitutional diff exposes rewritten history and changed occurrence", async () => {
  const manifest = await manifestFixture();
  const cutA = await new ReferenceReconstructionEngine().reconstruct({
    manifest,
    cut: cutById(manifest, "cut-a-before-witness"),
  });
  const changedOccurrenceAddress = addressJson({ rewrittenOccurrence: true }).hash;
  const rewritten: ReconstructionResult = {
    ...cutA,
    constitutional: {
      ...cutA.constitutional,
      occurrenceAddress: changedOccurrenceAddress,
      projectionAddress: addressJson({ rewrittenProjection: true }).hash,
      history: cutA.constitutional.history.map((item) =>
        item.id === "provision.meal.child-c.window-w"
          ? { ...item, address: changedOccurrenceAddress }
          : { ...item }),
    },
  };

  const diff = diffConstitutionalState(cutA, rewritten);
  assert.equal(diff.historyDelta, "rewritten_history");
  assert.deepEqual(diff.rewrittenHistoryIds, ["provision.meal.child-c.window-w"]);
  assert.deepEqual(diff.addedHistoryIds, []);
  assert.equal(diff.occurrenceDelta, "changed_occurrence");
  assert.equal(diff.projectionDelta, "not_comparable_after_occurrence_change");
});

test("constitutional diff distinguishes resolved tension from silenced tension", async () => {
  const manifest = await manifestFixture();
  const base = await new ReferenceReconstructionEngine().reconstruct({
    manifest,
    cut: cutById(manifest, "cut-a-before-witness"),
  });
  const before: ReconstructionResult = {
    ...base,
    constitutional: {
      ...base.constitutional,
      tensions: [
        { id: "tension.care-plan", status: "open", resolutionEvidenceIds: [] },
      ],
    },
  };
  const resolved: ReconstructionResult = {
    ...before,
    constitutional: {
      ...before.constitutional,
      tensions: [
        {
          id: "tension.care-plan",
          status: "resolved",
          resolutionEvidenceIds: ["witness.resolution"],
        },
      ],
    },
  };
  const silenced: ReconstructionResult = {
    ...before,
    constitutional: {
      ...before.constitutional,
      tensions: [],
    },
  };

  assert.equal(diffConstitutionalState(before, resolved).tensionDelta, "resolved_tension");
  assert.equal(diffConstitutionalState(before, silenced).tensionDelta, "silenced_tension");
});
