import assert from "node:assert/strict";
import test from "node:test";
import { addressJson, sha256, verifyReconstruction, type FieldNode, type ReconstructionReceipt } from "../src/residual.js";

const sourceBytes = Buffer.from("[breath] I never said the door was locked— No. Wait. I did. [metallic click]");
const sourceHash = sha256(sourceBytes);
const artifact = { hash: sourceHash, mediaType: "audio/wav", byteLength: sourceBytes.length };

const slices = {
  breath: Buffer.from("[breath]"),
  correction: Buffer.from("No. Wait. I did."),
  click: Buffer.from("[metallic click]")
};

const field = addressJson<FieldNode>({
  kind: "field",
  fieldClass: "MATERIAL",
  sources: [artifact],
  authorityBoundary: { purpose: "irreducible-residual-test", disclosureRequired: true },
  residuals: Object.entries(slices).map(([id, bytes], index) => ({
    id,
    source: {
      artifactHash: sourceHash,
      sampleRate: 48_000,
      channels: 1,
      sampleFormat: "s16le",
      startSample: index * 100,
      endSampleExclusive: index * 100 + bytes.length
    },
    extractedPayloadHash: sha256(bytes),
    preservationBasis: id === "correction" ? "testimonial" : "historical",
    preservationMode: "exact_samples"
  }))
});

function receipt(claim: ReconstructionReceipt["claim"], evidence: ReconstructionReceipt["evidence"]): ReconstructionReceipt {
  return {
    kind: "reconstruction_receipt",
    fieldHash: field.hash,
    outputArtifact: { hash: sha256(Buffer.from("reconstruction")), mediaType: "audio/wav", byteLength: 14 },
    claim,
    decoder: { id: "fixture", version: "0.1" },
    perceptualScores: { phenomenal: 0.88, semantic: 0.72, structural: 0.91 },
    evidence
  };
}

test("JCS addressing excludes any caller-supplied envelope hash", () => {
  assert.match(field.hash, /^sha256:[0-9a-f]{64}$/);
  assert.equal("fieldHash" in field.value, false);
});

test("exactly preserved residuals admit historical reproduction", () => {
  const evidence = field.value.residuals.map((r) => ({
    residualId: r.id,
    outputLocator: r.source,
    extractedOutputHash: r.extractedPayloadHash
  }));
  const result = verifyReconstruction(field, receipt("historical_reproduction", evidence));
  assert.equal(result.admissible, true);
  assert.equal(result.historicalStatus, "exact");
});

test("disclosed omissions remain creative but cannot enter historical path", () => {
  const evidence = field.value.residuals.map((r) => ({ residualId: r.id, omissionReason: "Smoothed creative alternate" }));
  const creative = verifyReconstruction(field, receipt("creative_realization", evidence));
  const historical = verifyReconstruction(field, receipt("historical_reproduction", evidence));
  assert.equal(creative.admissible, true);
  assert.equal(creative.historicalStatus, "altered_disclosed");
  assert.equal(historical.admissible, false);
});

test("missing or contradictory evidence is a violation under every claim", () => {
  const result = verifyReconstruction(field, receipt("semantic_reconstruction", [
    { residualId: "breath", omissionReason: "Removed" },
    { residualId: "correction", extractedOutputHash: sha256(Buffer.from("I said the door was locked.")) }
  ]));
  assert.equal(result.admissible, false);
  assert.equal(result.historicalStatus, "violated");
  assert.ok(result.residualResults.some((r) => r.residualId === "correction" && r.outcome === "violated"));
  assert.ok(result.residualResults.some((r) => r.residualId === "click" && r.outcome === "violated"));
});
