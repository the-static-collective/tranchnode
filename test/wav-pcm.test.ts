import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import { FilesystemArtifactStore } from "../src/artifact-store.js";
import {
  addressFieldRootAdmission,
  addressProjectionReceipt,
  verifyProjectionWithMaterialRoots,
  type ProjectionGraph,
} from "../src/projection.js";
import { addressJson, sha256, type ResidualBinding, type SampleLocator } from "../src/residual.js";
import {
  WavPcmError,
  extractPcmResidualFromStore,
  extractPcmSamples,
  parsePcmWav,
  verifyExactPcmResidual,
} from "../src/wav-pcm.js";

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

function wav16(
  samples: number[],
  options: { sampleRateHz?: number; channels?: 1 | 2; metadata?: Buffer } = {},
): Buffer {
  const sampleRateHz = options.sampleRateHz ?? 48_000;
  const channels = options.channels ?? 1;
  assert.equal(samples.length % channels, 0, "samples must contain complete interleaved frames");

  const fmt = Buffer.alloc(16);
  fmt.writeUInt16LE(1, 0);
  fmt.writeUInt16LE(channels, 2);
  fmt.writeUInt32LE(sampleRateHz, 4);
  fmt.writeUInt32LE(sampleRateHz * channels * 2, 8);
  fmt.writeUInt16LE(channels * 2, 12);
  fmt.writeUInt16LE(16, 14);

  const chunks = [chunk("fmt ", fmt)];
  if (options.metadata) chunks.push(chunk("JUNK", options.metadata));
  chunks.push(chunk("data", pcm16(samples)));
  const waveBody = Buffer.concat([Buffer.from("WAVE", "ascii"), ...chunks]);
  const out = Buffer.alloc(8 + waveBody.byteLength);
  out.write("RIFF", 0, 4, "ascii");
  out.writeUInt32LE(waveBody.byteLength, 4);
  waveBody.copy(out, 8);
  return out;
}

async function storeFor(t: TestContext): Promise<FilesystemArtifactStore> {
  const root = await mkdtemp(join(tmpdir(), "tranchnode-wav-pcm-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return new FilesystemArtifactStore(root);
}

function locator(
  sourceArtifact: SampleLocator["sourceArtifact"],
  overrides: Partial<SampleLocator> = {},
): SampleLocator {
  return {
    locatorVersion: "sample-v1",
    sourceArtifact,
    sampleRateHz: 48_000,
    channels: 1,
    sampleFormat: "s16le",
    startSample: 1,
    endSampleExclusive: 3,
    ...overrides,
  };
}

function binding(source: SampleLocator, payload: Uint8Array): ResidualBinding {
  return {
    id: "declared-source-slice",
    source,
    extractedPayloadHash: sha256(payload),
    preservationBasis: "historical",
    preservationMode: "exact_samples",
  };
}

test("parses mono/stereo 16-bit PCM and documents frame-interleaved extraction", () => {
  const mono = wav16([10, 20, 30, 40]);
  assert.deepEqual(parsePcmWav(mono), {
    sampleRateHz: 48_000,
    channels: 1,
    sampleFormat: "s16le",
    frameCount: 4,
    dataOffset: 44,
    dataByteLength: 8,
  });

  const stereo = wav16([1, 2, 3, 4, 5, 6], { channels: 2 });
  const extracted = extractPcmSamples(
    stereo,
    locator(sha256(stereo), { channels: 2, startSample: 1, endSampleExclusive: 3 }),
  );
  assert.deepEqual([...extracted.payload], [...pcm16([3, 4, 5, 6])]);
  assert.equal(extracted.frameCount, 2);
});

test("declared source slice verifies through the immutable artifact store", async (t) => {
  const store = await storeFor(t);
  const source = wav16([100, -100, 200, -200]);
  const stored = await store.put(source);
  const sourceLocator = locator(stored.address);
  const expected = pcm16([-100, 200]);

  const verified = await verifyExactPcmResidual(store, binding(sourceLocator, expected));
  assert.equal(verified.payloadHash, sha256(expected));
  assert.deepEqual(verified.payload, expected);
});

test("resampled or locator-incompatible WAVs fail closed", async (t) => {
  const store = await storeFor(t);
  const resampled = wav16([100, -100, 200, -200], { sampleRateHz: 44_100 });
  const stored = await store.put(resampled);

  await assert.rejects(
    () => extractPcmResidualFromStore(store, locator(stored.address)),
    (error: unknown) => error instanceof WavPcmError && error.code === "LOCATOR_MISMATCH",
  );

  assert.throws(
    () => extractPcmSamples(wav16([1, 2, 3, 4], { channels: 2 }), locator(sha256(Buffer.alloc(0)))),
    (error: unknown) => error instanceof WavPcmError && error.code === "LOCATOR_MISMATCH",
  );

  assert.throws(
    () => extractPcmSamples(wav16([1, 2, 3, 4]), locator(sha256(Buffer.alloc(0)), { sampleFormat: "s24le" })),
    (error: unknown) => error instanceof WavPcmError && error.code === "LOCATOR_MISMATCH",
  );
});

test("off-by-one coordinates do not satisfy an exact residual commitment", async (t) => {
  const store = await storeFor(t);
  const source = wav16([10, 20, 30, 40, 50]);
  const stored = await store.put(source);
  const expected = pcm16([20, 30]);
  const exact = binding(locator(stored.address), expected);

  await verifyExactPcmResidual(store, exact);
  await assert.rejects(
    () => verifyExactPcmResidual(store, { ...exact, source: { ...exact.source, startSample: 0 } }),
    (error: unknown) => error instanceof WavPcmError && error.code === "RESIDUAL_HASH_MISMATCH",
  );
  await assert.rejects(
    () => verifyExactPcmResidual(store, { ...exact, source: { ...exact.source, endSampleExclusive: 4 } }),
    (error: unknown) => error instanceof WavPcmError && error.code === "RESIDUAL_HASH_MISMATCH",
  );
});

test("truncated data chunks and malformed sample ranges fail closed", () => {
  const valid = wav16([1, 2, 3, 4]);
  const truncated = valid.subarray(0, valid.byteLength - 1);
  assert.throws(
    () => parsePcmWav(truncated),
    (error: unknown) => error instanceof WavPcmError && error.code === "TRUNCATED_WAV",
  );

  assert.throws(
    () => extractPcmSamples(valid, locator(sha256(valid), { startSample: 3, endSampleExclusive: 5 })),
    (error: unknown) => error instanceof WavPcmError && error.code === "INVALID_SAMPLE_RANGE",
  );
});

test("container metadata changes full identity without changing exact PCM identity", async (t) => {
  const store = await storeFor(t);
  const plain = wav16([7, 8, 9, 10]);
  const annotated = wav16([7, 8, 9, 10], { metadata: Buffer.from("same-pcm,different-container") });
  const plainStored = await store.put(plain);
  const annotatedStored = await store.put(annotated);
  assert.notEqual(plainStored.address, annotatedStored.address);

  const plainPcm = await extractPcmResidualFromStore(store, locator(plainStored.address));
  const annotatedPcm = await extractPcmResidualFromStore(store, locator(annotatedStored.address));
  assert.equal(plainPcm.payloadHash, annotatedPcm.payloadHash);
});

test("a residual citation can retain #7 field-root closure to the stored WAV", async (t) => {
  const store = await storeFor(t);
  const source = wav16([11, 22, 33, 44]);
  const stored = await store.put(source);
  const sourceLocator = locator(stored.address);
  const residual = binding(sourceLocator, pcm16([22, 33]));
  await verifyExactPcmResidual(store, residual);

  const admission = addressFieldRootAdmission({
    kind: "field_root_admission",
    fieldRoot: stored.address,
    admittedBy: { id: "wav-pcm-fixture", version: "1" },
    purposeHash: sha256(Buffer.from("verify material residual")),
    creationOrder: 0,
  });
  const projection = addressProjectionReceipt({
    kind: "projection_receipt",
    projectionKind: "observation",
    fieldRoots: [stored.address],
    parentProjectionHashes: [],
    rootAdmissionReceiptHashes: [admission.hash],
    projector: { id: "wav-pcm-fixture", version: "1" },
    questionPurposeHash: sha256(Buffer.from("what is materially present")),
    contextHashes: [],
    outputNodeHashes: [],
    residualHashes: [addressJson(residual).hash],
    uncertainty: "none for exact PCM bytes",
    creationOrder: 1,
  });
  const graph: ProjectionGraph = {
    projections: new Map([[projection.hash, projection]]),
    admissions: new Map([[admission.hash, admission]]),
  };

  assert.deepEqual([...await verifyProjectionWithMaterialRoots(projection, graph, store)], [stored.address]);
});
