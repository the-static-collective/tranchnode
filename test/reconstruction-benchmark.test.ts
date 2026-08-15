import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  BenchmarkError,
  validateBenchmarkManifest,
} from "../src/reconstruction-benchmark.js";
import { addressJson } from "../src/residual.js";

const MANIFEST_PATH = "fixtures/reconstruction-benchmark/constitutional-reconstruction-v0.1.json";
const SOURCE_PATH = "fixtures/covenant-circuit/02-complete-circuit/evaluate.py";

async function rawManifest(): Promise<any> {
  return JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
}

function gitBlobSha(bytes: Uint8Array): string {
  const header = Buffer.from(`blob ${bytes.byteLength}\0`, "utf8");
  return createHash("sha1").update(header).update(bytes).digest("hex");
}

test("benchmark manifest is versioned, canonicalizable, and pins exact Covenant Circuit fixture bytes", async () => {
  const manifest = validateBenchmarkManifest(await rawManifest());

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
