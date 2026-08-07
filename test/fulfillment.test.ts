import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import { FilesystemArtifactStore } from "../src/artifact-store.js";
import {
  deriveProjectionConfidence,
  projectNeed,
  validateFulfillmentReceipt,
  validateNeedDeclared,
  type FulfillmentRecorded,
  type NeedDeclared,
} from "../src/fulfillment.js";
import { verifyFulfillmentAgainstSubstrate } from "../src/fulfillment-substrate.js";
import {
  addressFieldRootAdmission,
  addressProjectionReceipt,
  type ProjectionGraph,
} from "../src/projection.js";
import { addressJson, type ResidualBinding, type SampleLocator } from "../src/residual.js";
import { extractPcmResidualFromStore } from "../src/wav-pcm.js";

const disclosurePolicy = {
  audience: "circle" as const,
  permittedFields: {
    summary: true,
    quantity: true,
    coarseTime: true,
    coarsePlace: false,
    exactPlace: false,
    participantIdentity: false,
    artifacts: false,
  },
  basis: "aggregate_only" as const,
};

async function canonicalNeedFixture(): Promise<NeedDeclared> {
  const bytes = await readFile("fixtures/canonical/fulfillment/need_breakfast_001.json", "utf8");
  return JSON.parse(bytes) as NeedDeclared;
}

async function storeFor(t: TestContext): Promise<FilesystemArtifactStore> {
  const root = await mkdtemp(join(tmpdir(), "tranchnode-fulfillment-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return new FilesystemArtifactStore(root);
}

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

test("canonical fulfillment fixture uses shared external identity", async () => {
  const need = await canonicalNeedFixture();
  validateNeedDeclared(need as unknown as Record<string, unknown>);
  assert.equal("canonicalHash" in need, false);
  assert.match(addressJson(need).hash, /^sha256:[0-9a-f]{64}$/);
  assert.throws(
    () => validateNeedDeclared({ ...need, canonicalHash: addressJson(need).hash }),
    /identity is external/,
  );
});

test("origin law preserves unknown provenance and derived Need state", async () => {
  const need = await canonicalNeedFixture();
  const needHash = addressJson(need).hash;
  const base: FulfillmentRecorded = {
    id: "fulfillment_001",
    type: "FULFILLMENT_RECORDED",
    version: 1,
    needId: need.id,
    needSnapshotHash: needHash,
    origin: "direct_response",
    outcome: "partial",
    occurredAt: "2026-07-31T12:00:00Z",
    recordedAt: "2026-07-31T12:05:00Z",
    recordedBy: "actor_fixture",
    fulfillment: { kind: "meal", summary: "Twenty-two meals arrived.", quantity: { value: 22, unit: "meal" } },
    visibility: "circle",
    disclosurePolicy,
  };

  assert.doesNotThrow(() => validateFulfillmentReceipt(base));
  assert.throws(
    () => validateFulfillmentReceipt({ ...base, origin: "unknown", joinId: "invented_join" }),
    /unknown origin/,
  );

  const projection = projectNeed(need, [base], [], "2026-07-31T13:00:00Z");
  assert.equal(projection.fulfilledQuantity?.value, 22);
  assert.equal(projection.remainingQuantity?.value, 11);
  assert.equal(projection.status, "partially_answered");
  assert.equal(projection.stillCalling, true);
  assert.equal(deriveProjectionConfidence(need, [base]), "known");
  assert.equal("status" in need, false);
});

test("fulfillment verifies through identity, immutable storage, root closure, and real WAV residuals", async (t) => {
  const store = await storeFor(t);
  const need = await canonicalNeedFixture();
  const needHash = addressJson(need).hash;

  const wav = wav16([100, -100, 200, -200]);
  const storedWav = await store.put(wav);
  const locator: SampleLocator = {
    locatorVersion: "sample-v1",
    sourceArtifact: storedWav.address,
    sampleRateHz: 48_000,
    channels: 1,
    sampleFormat: "s16le",
    startSample: 1,
    endSampleExclusive: 3,
  };
  const extracted = await extractPcmResidualFromStore(store, locator);
  const residual: ResidualBinding = {
    id: "meal-arrival-audio",
    source: locator,
    extractedPayloadHash: extracted.payloadHash,
    preservationBasis: "testimonial",
    preservationMode: "exact_samples",
  };

  const material = await store.put(Buffer.from("fixture material receipt", "utf8"));
  const purposeHash = addressJson({ purpose: "fulfillment evidence fixture" }).hash;
  const admission = addressFieldRootAdmission({
    kind: "field_root_admission",
    fieldRoot: storedWav.address,
    admittedBy: { id: "fulfillment-kernel-test", version: "1" },
    purposeHash,
    creationOrder: 1,
  });
  const projection = addressProjectionReceipt({
    kind: "projection_receipt",
    projectionKind: "observation",
    fieldRoots: [storedWav.address],
    parentProjectionHashes: [],
    rootAdmissionReceiptHashes: [admission.hash],
    projector: { id: "fulfillment-kernel-test", version: "1" },
    questionPurposeHash: purposeHash,
    contextHashes: [],
    outputNodeHashes: [material.address],
    residualHashes: [extracted.payloadHash],
    uncertainty: "Fixture observation only; witness does not certify objective success.",
    creationOrder: 2,
  });
  const graph: ProjectionGraph = {
    projections: new Map([[projection.hash, projection]]),
    admissions: new Map([[admission.hash, admission]]),
  };

  const receipt: FulfillmentRecorded = {
    id: "fulfillment_substrate_001",
    type: "FULFILLMENT_RECORDED",
    version: 1,
    needId: need.id,
    needSnapshotHash: needHash,
    origin: "direct_response",
    outcome: "partial",
    occurredAt: "2026-07-31T12:00:00Z",
    recordedAt: "2026-07-31T12:05:00Z",
    recordedBy: "actor_fixture",
    fulfillment: { kind: "meal", summary: "Material response reported at the table.", quantity: { value: 1, unit: "meal" } },
    visibility: "circle",
    disclosurePolicy,
    materialArtifactHashes: [material.address],
    projectionReceiptHash: projection.hash,
    residualIds: [residual.id],
  };

  const verified = await verifyFulfillmentAgainstSubstrate(
    need,
    receipt,
    { projection: { target: projection, graph }, residualBindings: [residual] },
    store,
  );

  assert.equal(verified.need.hash, needHash);
  assert.equal(verified.fulfillment.hash, addressJson(receipt).hash);
  assert.deepEqual(verified.materialArtifactHashes, [material.address]);
  assert.deepEqual(verified.fieldRoots, [storedWav.address]);
  assert.deepEqual(verified.residualIds, [residual.id]);
});
