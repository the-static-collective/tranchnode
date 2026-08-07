import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import { FilesystemArtifactStore } from "../src/artifact-store.js";
import {
  addressFulfillment,
  addressNeed,
  FulfillmentError,
  validateFulfillmentSemantics,
  verifyFulfillmentCrossing,
  type FulfillmentRecorded,
} from "../src/fulfillment.js";
import {
  addressFieldRootAdmission,
  addressProjectionReceipt,
  type ProjectionGraph,
} from "../src/projection.js";
import {
  addressJson,
  sha256,
  type ResidualBinding,
  type SampleLocator,
} from "../src/residual.js";

function pcm16(samples: number[]): Buffer {
  const bytes = Buffer.alloc(samples.length * 2);
  samples.forEach((sample, index) => bytes.writeInt16LE(sample, index * 2));
  return bytes;
}

function chunk(id: string, payload: Uint8Array): Buffer {
  const pad = payload.byteLength & 1;
  const out = Buffer.alloc(8 + payload.byteLength + pad);
  out.write(id, 0, 4, "ascii");
  out.writeUInt32LE(payload.byteLength, 4);
  Buffer.from(payload).copy(out, 8);
  return out;
}

function wav16(samples: number[], sampleRateHz = 48_000): Buffer {
  const fmt = Buffer.alloc(16);
  fmt.writeUInt16LE(1, 0);
  fmt.writeUInt16LE(1, 2);
  fmt.writeUInt32LE(sampleRateHz, 4);
  fmt.writeUInt32LE(sampleRateHz * 2, 8);
  fmt.writeUInt16LE(2, 12);
  fmt.writeUInt16LE(16, 14);

  const waveBody = Buffer.concat([
    Buffer.from("WAVE", "ascii"),
    chunk("fmt ", fmt),
    chunk("data", pcm16(samples)),
  ]);
  const out = Buffer.alloc(8 + waveBody.byteLength);
  out.write("RIFF", 0, 4, "ascii");
  out.writeUInt32LE(waveBody.byteLength, 4);
  waveBody.copy(out, 8);
  return out;
}

async function storeFor(t: TestContext): Promise<FilesystemArtifactStore> {
  const root = await mkdtemp(join(tmpdir(), "tranchnode-fulfillment-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return new FilesystemArtifactStore(root);
}

function locator(sourceArtifact: SampleLocator["sourceArtifact"]): SampleLocator {
  return {
    locatorVersion: "sample-v1",
    sourceArtifact,
    sampleRateHz: 48_000,
    channels: 1,
    sampleFormat: "s16le",
    startSample: 1,
    endSampleExclusive: 3,
  };
}

test("fulfillment crossing derives a new receipt while exact source and root closure remain intact", async (t) => {
  const store = await storeFor(t);
  const source = wav16([100, -100, 200, -200]);
  const stored = await store.put(source);
  const sourceBefore = await store.get(stored.address);

  const residualBinding: ResidualBinding = {
    id: "meal-table-audio-evidence",
    source: locator(stored.address),
    extractedPayloadHash: sha256(pcm16([-100, 200])),
    preservationBasis: "testimonial",
    preservationMode: "exact_samples",
  };
  const residual = addressJson(residualBinding);

  const admission = addressFieldRootAdmission({
    kind: "field_root_admission",
    fieldRoot: stored.address,
    admittedBy: { id: "fulfillment-fixture", version: "1" },
    purposeHash: sha256(Buffer.from("admit exact fulfillment evidence")),
    creationOrder: 0,
  });
  const projection = addressProjectionReceipt({
    kind: "projection_receipt",
    projectionKind: "observation",
    fieldRoots: [stored.address],
    parentProjectionHashes: [],
    rootAdmissionReceiptHashes: [admission.hash],
    projector: { id: "fulfillment-fixture", version: "1" },
    questionPurposeHash: sha256(Buffer.from("what material response was observed")),
    contextHashes: [],
    outputNodeHashes: [],
    residualHashes: [residual.hash],
    uncertainty: "receipt records scoped observation, not objective or moral completion",
    creationOrder: 1,
  });
  const graph: ProjectionGraph = {
    projections: new Map([[projection.hash, projection]]),
    admissions: new Map([[admission.hash, admission]]),
  };

  const need = addressNeed({
    kind: "need_declared",
    summary: "Provide two meals at the morning table",
    requestedQuantity: { value: 2, unit: "meal" },
  });
  const fulfillment = addressFulfillment({
    kind: "fulfillment_recorded",
    needHash: need.hash,
    evidenceProjectionHash: projection.hash,
    residualHashes: [residual.hash],
    origin: "unknown",
    outcome: "partial",
    fulfillment: {
      kind: "meal",
      summary: "One meal was reported present at the table",
      quantity: { value: 1, unit: "meal" },
    },
    occurredAt: "2026-08-07T12:00:00Z",
    recordedAt: "2026-08-07T12:01:00Z",
    recordedBy: "fixture-witness",
    uncertainty: "origin remains unknown; material evidence is exact only for the cited PCM residual",
  });

  const verified = await verifyFulfillmentCrossing({
    need,
    fulfillment,
    evidenceProjection: projection,
    projectionGraph: graph,
    store,
    residuals: new Map([[residual.hash, residual]]),
  });

  const sourceAfter = await store.get(stored.address);
  assert.deepEqual(sourceAfter, sourceBefore);
  assert.equal(sha256(sourceAfter), stored.address);
  assert.notEqual(fulfillment.hash, need.hash);
  assert.notEqual(fulfillment.hash, projection.hash);
  assert.deepEqual([...verified.fieldRoots], [stored.address]);
  assert.deepEqual(verified.verifiedResidualHashes, [residual.hash]);
});

test("unknown fulfillment origin cannot silently acquire invented provenance", () => {
  const bad: FulfillmentRecorded = {
    kind: "fulfillment_recorded",
    needHash: sha256(Buffer.from("need")),
    evidenceProjectionHash: sha256(Buffer.from("projection")),
    residualHashes: [],
    origin: "unknown",
    externalProvenance: { sourceRef: "someone-said-so" },
    outcome: "scope_uncertain",
    fulfillment: { kind: "meal", summary: "Reported response" },
    occurredAt: "2026-08-07T12:00:00Z",
    recordedAt: "2026-08-07T12:01:00Z",
    recordedBy: "fixture-witness",
    uncertainty: "origin unavailable",
  };

  assert.throws(
    () => validateFulfillmentSemantics(bad),
    (error: unknown) =>
      error instanceof FulfillmentError && error.code === "ORIGIN_PROVENANCE_MISMATCH",
  );
});

test("fulfillment cannot cite residual evidence absent from its observation projection", async (t) => {
  const store = await storeFor(t);
  const source = wav16([1, 2, 3, 4]);
  const stored = await store.put(source);
  const residualBinding: ResidualBinding = {
    id: "unprojected-residual",
    source: locator(stored.address),
    extractedPayloadHash: sha256(pcm16([2, 3])),
    preservationBasis: "testimonial",
    preservationMode: "exact_samples",
  };
  const residual = addressJson(residualBinding);
  const admission = addressFieldRootAdmission({
    kind: "field_root_admission",
    fieldRoot: stored.address,
    admittedBy: { id: "fulfillment-fixture", version: "1" },
    purposeHash: sha256(Buffer.from("admit source")),
    creationOrder: 0,
  });
  const projection = addressProjectionReceipt({
    kind: "projection_receipt",
    projectionKind: "observation",
    fieldRoots: [stored.address],
    parentProjectionHashes: [],
    rootAdmissionReceiptHashes: [admission.hash],
    projector: { id: "fulfillment-fixture", version: "1" },
    questionPurposeHash: sha256(Buffer.from("observe response")),
    contextHashes: [],
    outputNodeHashes: [],
    residualHashes: [],
    uncertainty: "fixture",
    creationOrder: 1,
  });
  const graph: ProjectionGraph = {
    projections: new Map([[projection.hash, projection]]),
    admissions: new Map([[admission.hash, admission]]),
  };
  const need = addressNeed({ kind: "need_declared", summary: "Need" });
  const fulfillment = addressFulfillment({
    kind: "fulfillment_recorded",
    needHash: need.hash,
    evidenceProjectionHash: projection.hash,
    residualHashes: [residual.hash],
    origin: "unknown",
    outcome: "scope_uncertain",
    fulfillment: { kind: "meal", summary: "Reported response" },
    occurredAt: "2026-08-07T12:00:00Z",
    recordedAt: "2026-08-07T12:01:00Z",
    recordedBy: "fixture-witness",
    uncertainty: "fixture",
  });

  await assert.rejects(
    () =>
      verifyFulfillmentCrossing({
        need,
        fulfillment,
        evidenceProjection: projection,
        projectionGraph: graph,
        store,
        residuals: new Map([[residual.hash, residual]]),
      }),
    (error: unknown) =>
      error instanceof FulfillmentError && error.code === "RESIDUAL_NOT_IN_PROJECTION",
  );
});
