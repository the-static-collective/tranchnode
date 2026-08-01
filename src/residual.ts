import { createHash } from "node:crypto";
import canonicalize from "canonicalize";

export type Hash = `sha256:${string}`;
export type Claim = "creative_realization" | "semantic_reconstruction" | "historical_reproduction";
export type HistoricalStatus = "exact" | "referential" | "altered_disclosed" | "not_historical" | "violated";
export type Outcome = "preserved_exactly" | "preserved_by_reference" | "transformed_with_disclosure" | "omitted_with_disclosure" | "violated";

export interface Addressed<T> { hash: Hash; value: T }
export interface ArtifactRef { hash: Hash; mediaType: string; byteLength: number }
export interface SampleLocator { artifactHash: Hash; sampleRate: number; channels: number; sampleFormat: string; startSample: number; endSampleExclusive: number }
export interface ResidualBinding {
  id: string;
  source: SampleLocator;
  extractedPayloadHash: Hash;
  preservationBasis: "historical" | "testimonial" | "identity" | "covenantal" | "forensic";
  preservationMode: "exact_samples" | "cryptographic_commitment";
}
export interface FieldNode {
  kind: "field";
  fieldClass: "MATERIAL";
  sources: ArtifactRef[];
  residuals: ResidualBinding[];
  authorityBoundary: { purpose: string; disclosureRequired: boolean };
}
export interface ResidualEvidence {
  residualId: string;
  outputLocator?: SampleLocator;
  sourceReference?: SampleLocator;
  extractedOutputHash?: Hash;
  transformationReceiptHash?: Hash;
  omissionReason?: string;
}
export interface ReconstructionReceipt {
  kind: "reconstruction_receipt";
  fieldHash: Hash;
  outputArtifact: ArtifactRef;
  claim: Claim;
  decoder: { id: string; version: string };
  perceptualScores: { phenomenal: number; semantic: number; structural: number };
  evidence: ResidualEvidence[];
}
export interface VerifiedResidual { residualId: string; outcome: Outcome; reason: string }
export interface Verification {
  historicalStatus: HistoricalStatus;
  admissible: boolean;
  residualResults: VerifiedResidual[];
}

export function sha256(bytes: Uint8Array): Hash {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export function addressJson<T>(value: T): Addressed<T> {
  const encoded = canonicalize(value);
  if (encoded === undefined) throw new Error("Value is not JCS-serializable");
  return { hash: sha256(Buffer.from(encoded, "utf8")), value };
}

export function verifyReconstruction(field: Addressed<FieldNode>, receipt: ReconstructionReceipt): Verification {
  if (receipt.fieldHash !== field.hash) throw new Error("Receipt does not address this field");
  const evidence = new Map(receipt.evidence.map((item) => [item.residualId, item]));
  const residualResults = field.value.residuals.map((residual): VerifiedResidual => {
    const proof = evidence.get(residual.id);
    if (!proof) return { residualId: residual.id, outcome: "violated", reason: "No evidence supplied" };
    if (proof.outputLocator && proof.extractedOutputHash === residual.extractedPayloadHash) {
      return { residualId: residual.id, outcome: "preserved_exactly", reason: "Verifier-extracted output payload matches source payload" };
    }
    if (proof.sourceReference && proof.sourceReference.artifactHash === residual.source.artifactHash) {
      return { residualId: residual.id, outcome: "preserved_by_reference", reason: "Immutable source artifact and locator retained by reference" };
    }
    if (proof.transformationReceiptHash) {
      return { residualId: residual.id, outcome: "transformed_with_disclosure", reason: "Transformation is explicitly receipted" };
    }
    if (proof.omissionReason) {
      return { residualId: residual.id, outcome: "omitted_with_disclosure", reason: proof.omissionReason };
    }
    return { residualId: residual.id, outcome: "violated", reason: "Evidence absent, mismatched, or contradictory" };
  });

  const outcomes = residualResults.map((r) => r.outcome);
  const hasViolation = outcomes.includes("violated");
  const allExact = outcomes.every((o) => o === "preserved_exactly");
  const allHistorical = outcomes.every((o) => o === "preserved_exactly" || o === "preserved_by_reference");
  const disclosedAlteration = outcomes.some((o) => o === "transformed_with_disclosure" || o === "omitted_with_disclosure");

  let historicalStatus: HistoricalStatus;
  if (hasViolation) historicalStatus = "violated";
  else if (allExact) historicalStatus = "exact";
  else if (allHistorical) historicalStatus = "referential";
  else if (disclosedAlteration) historicalStatus = "altered_disclosed";
  else historicalStatus = "not_historical";

  const admissible = !hasViolation && (receipt.claim !== "historical_reproduction" || allHistorical);
  return { historicalStatus, admissible, residualResults };
}
