import { createHash } from "node:crypto";
import canonicalizeModule from "canonicalize";
import bs58 from "bs58";

const canonicalize = canonicalizeModule.default ?? canonicalizeModule;

export type Hash = `sha256:${string}`;

export const DOMAIN_PREFIXES = {
  Node: 'Project0-Node-v1|',
  Edge: 'Project0-Edge-v1|',
  Receipt: 'Project0-Receipt-v1|',
  Request: 'Project0-Request-v1|',
} as const;

export type SemanticAddressKind = keyof typeof DOMAIN_PREFIXES;

const TIMESTAMP_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
export function validateTimestamp(ts: any): void {
  if (typeof ts !== 'string') throw new Error("INVALID_TYPE");
  if (!TIMESTAMP_REGEX.test(ts)) throw new Error("INVALID_TIMESTAMP");
}
export type Claim = "creative_realization" | "semantic_reconstruction" | "historical_reproduction";
export type HistoricalStatus = "EXACT_SOURCE_BYTES" | "EXACT_REQUIRED_RESIDUALS_REFERENCED" | "ALTERED_WITH_DISCLOSURE" | "NOT_HISTORICAL" | "VIOLATED";
export type Outcome = "preserved_exactly" | "preserved_by_reference" | "transformed_with_disclosure" | "omitted_with_disclosure" | "violated";

export interface Addressed<T> { hash: Hash; value: T }
export interface ArtifactRef { hash: Hash; mediaType: string; byteLength: number }
export interface SampleLocator {
  locatorVersion: "sample-v1";
  sourceArtifact: Hash;
  sampleRateHz: number;
  channels: number;
  sampleFormat: string;
  startSample: number;
  endSampleExclusive: number;
}
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

// Strict pre-canonicalization validation imported from Project0 PR #28
export function validateForCanonicalization(obj: any, seen = new WeakSet()): void {
  if (obj === undefined) throw new Error("UNDEFINED_VALUE");
  if (typeof obj === 'number') {
    if (Number.isNaN(obj) || !Number.isFinite(obj)) throw new Error("NON_FINITE_NUMBER");
    if (Number.isInteger(obj)) {
      if (obj > Number.MAX_SAFE_INTEGER || obj < Number.MIN_SAFE_INTEGER) {
        throw new Error("UNSAFE_INTEGER");
      }
    }
  }
  if (typeof obj === 'bigint' || typeof obj === 'symbol' || typeof obj === 'function') {
    throw new Error("UNSUPPORTED_TYPE");
  }

  if (typeof obj === 'string') {
    for (let i = 0; i < obj.length; i++) {
      const code = obj.charCodeAt(i);
      if (code >= 0xD800 && code <= 0xDFFF) {
        if (code <= 0xDBFF) { // High surrogate
          if (i === obj.length - 1) throw new Error("LONE_SURROGATE");
          const next = obj.charCodeAt(i + 1);
          if (next < 0xDC00 || next > 0xDFFF) throw new Error("LONE_SURROGATE");
          i++; // Skip low surrogate
        } else { // Low surrogate without preceding high
          throw new Error("LONE_SURROGATE");
        }
      }
    }
  }

  if (typeof obj === 'object' && obj !== null) {
    const proto = Object.getPrototypeOf(obj);
    if (proto !== Object.prototype && proto !== Array.prototype && proto !== null) {
      throw new Error("CUSTOM_PROTOTYPE");
    }

    if (Object.getOwnPropertySymbols(obj).length > 0) {
      throw new Error("SYMBOL_KEYED_PROPERTY");
    }

    const descriptors = Object.getOwnPropertyDescriptors(obj);
    const keys = Object.keys(descriptors);
    for (const key of keys) {
      const desc = descriptors[key];
      if (desc && (desc.get || desc.set)) throw new Error("ACCESSOR_PROPERTY");
      // Arrays have a non-enumerable 'length' property, so we skip checking 'length' for enumerability on Arrays
      if (desc && !desc.enumerable && !(Array.isArray(obj) && key === 'length')) {
        throw new Error("NON_ENUMERABLE_PROPERTY");
      }
    }

    if (seen.has(obj)) throw new Error("CYCLIC_VALUE");
    seen.add(obj);

    if (Array.isArray(obj)) {
      if (Object.keys(obj).length !== obj.length) throw new Error("SPARSE_ARRAY");
      for (let i = 0; i < obj.length; i++) {
        if (!Object.prototype.hasOwnProperty.call(obj, i)) throw new Error("SPARSE_ARRAY");
        validateForCanonicalization(obj[i], seen);
      }
    } else {
      for (const key of Object.keys(obj)) {
        if ((obj as any)[key] === undefined) throw new Error("UNDEFINED_VALUE");
        validateForCanonicalization((obj as any)[key], seen);
      }
    }
    seen.delete(obj);
  }
}

/**
 * @deprecated Use `computeSemanticAddress` to adopt the Project0 canonical-addressing identity floor.
 */
export function addressJson<T>(value: T): Addressed<T> {
  validateForCanonicalization(value);
  const encoded = canonicalize(value);
  if (encoded === undefined) throw new Error("Value is not JCS-serializable");
  return { hash: sha256(Buffer.from(encoded, "utf8")), value };
}

export function computeSemanticAddress(type: SemanticAddressKind, obj: any): { canonicalBytes: Buffer, textualId: string, digestHex: string } {
  validateForCanonicalization(obj);
  const jcsString = canonicalize(obj);
  if (jcsString === undefined) throw new Error("Value is not JCS-serializable");

  const prefix = DOMAIN_PREFIXES[type];
  const canonicalBytes = Buffer.concat([
    Buffer.from(prefix, 'utf8'),
    Buffer.from(jcsString, 'utf8')
  ]);

  const hashBuffer = createHash('sha256').update(canonicalBytes).digest();
  const digestHex = hashBuffer.toString('hex');
  const b58 = bs58.encode(hashBuffer);

  const prefixMap: Record<SemanticAddressKind, string> = {
    Node: 'node-',
    Edge: 'edge-',
    Receipt: 'rect-',
    Request: 'reqt-'
  };

  return { canonicalBytes, textualId: `${prefixMap[type]}${b58}`, digestHex };
}

export function parseSemanticAddress(type: SemanticAddressKind, textualId: string): Buffer {
  const prefixMap: Record<SemanticAddressKind, string> = {
    Node: 'node-',
    Edge: 'edge-',
    Receipt: 'rect-',
    Request: 'reqt-'
  };
  const prefix = prefixMap[type];
  if (!textualId.startsWith(prefix)) throw new Error(`INVALID_ADDRESS_PREFIX`);
  const encodedDigest = textualId.slice(prefix.length);
  if (encodedDigest.length === 0) throw new Error("Missing address digest");
  let digest: Uint8Array;
  try {
    digest = bs58.decode(encodedDigest);
  } catch {
    throw new Error(`INVALID_ADDRESS_ALPHABET`);
  }
  if (digest.length !== 32) throw new Error(`INVALID_ADDRESS_LENGTH`);
  return Buffer.from(digest);
}

function sameLocator(a: SampleLocator, b: SampleLocator): boolean {
  return a.locatorVersion === b.locatorVersion
    && a.sourceArtifact === b.sourceArtifact
    && a.sampleRateHz === b.sampleRateHz
    && a.channels === b.channels
    && a.sampleFormat === b.sampleFormat
    && a.startSample === b.startSample
    && a.endSampleExclusive === b.endSampleExclusive;
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
    if (proof.sourceReference && sameLocator(proof.sourceReference, residual.source)) {
      return { residualId: residual.id, outcome: "preserved_by_reference", reason: "Exact immutable source artifact and locator retained by reference" };
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
  if (hasViolation) historicalStatus = "VIOLATED";
  else if (allExact) historicalStatus = "EXACT_SOURCE_BYTES";
  else if (allHistorical) historicalStatus = "EXACT_REQUIRED_RESIDUALS_REFERENCED";
  else if (disclosedAlteration) historicalStatus = "ALTERED_WITH_DISCLOSURE";
  else historicalStatus = "NOT_HISTORICAL";

  const admissible = !hasViolation && (receipt.claim !== "historical_reproduction" || allHistorical);
  return { historicalStatus, admissible, residualResults };
}
