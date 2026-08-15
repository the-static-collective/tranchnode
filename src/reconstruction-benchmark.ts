import type { Hash } from "./residual.js";

const MANIFEST_VERSION = "constitutional-reconstruction-benchmark/v0.1" as const;

export type AuthorizationStatus = "valid" | "invalid" | "indeterminate";
export type FidelityStatus = "faithful" | "drifted" | "breached" | "indeterminate";
export type PurposeCompatibilityStatus = "compatible" | "incompatible" | "indeterminate";
export type FulfillmentStatus = "attempted" | "partial" | "scoped_complete" | "scope_uncertain";
export type FactPath =
  | "operational.authorization"
  | "operational.purposeCompatibility"
  | "operational.fidelity"
  | "operational.fulfillment";

export interface TemporalCut {
  id: string;
  projectionAt: string;
}

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

export interface ExactExpectation {
  path: FactPath;
  value: string;
}

export interface PluralExpectation {
  path: FactPath;
  values: string[];
}

export interface ProhibitedExpectation {
  path: FactPath;
  value: string;
  reason: string;
}

export interface CutExpectation {
  exact: ExactExpectation[];
  plural: PluralExpectation[];
  unresolved: string[];
  prohibited: ProhibitedExpectation[];
}

export interface BenchmarkCut extends TemporalCut {
  expected: CutExpectation;
}

export interface BenchmarkManifest {
  schemaVersion: typeof MANIFEST_VERSION;
  id: string;
  source: {
    path: string;
    gitBlobSha: string;
    sourceCases: string[];
  };
  invariantIds: string[];
  evidence: BenchmarkEvidence[];
  cuts: BenchmarkCut[];
}

export interface ReconstructionInput {
  manifest: BenchmarkManifest;
  cut: BenchmarkCut;
}

export interface HistoryRecord {
  id: string;
  kind: BenchmarkEvidence["kind"];
  address: Hash;
}

export interface TensionState {
  id: string;
  status: "open" | "resolved";
  resolutionEvidenceIds: string[];
}

export interface ReconstructionResult {
  engine: {
    id: string;
    version: string;
  };
  cutId: string;
  structural: {
    occurrenceIds: string[];
    admittedEvidenceIds: string[];
    missingReferences: string[];
  };
  epistemic: {
    known: string[];
    unresolved: string[];
    plurality: string[];
  };
  constitutional: {
    occurrenceAddress: Hash;
    projectionAddress: Hash;
    history: HistoryRecord[];
    tensions: TensionState[];
    violations: string[];
  };
  operational: {
    authorization: AuthorizationStatus;
    purposeCompatibility: PurposeCompatibilityStatus;
    fidelity: FidelityStatus;
    fulfillment: FulfillmentStatus;
  };
}

export interface ReconstructionEngine {
  readonly id: string;
  readonly version: string;
  reconstruct(input: ReconstructionInput): Promise<ReconstructionResult>;
}

export class BenchmarkError extends Error {
  constructor(
    public readonly code:
      | "INVALID_MANIFEST"
      | "UNSUPPORTED_MANIFEST_VERSION"
      | "DUPLICATE_CUT_ID"
      | "BROKEN_EVIDENCE_REFERENCE",
    message: string,
  ) {
    super(message);
    this.name = "BenchmarkError";
  }
}

export function validateBenchmarkManifest(value: unknown): BenchmarkManifest {
  const root = requireRecord(value, "benchmark manifest");
  const schemaVersion = requireString(root.schemaVersion, "schemaVersion");
  if (schemaVersion !== MANIFEST_VERSION) {
    throw new BenchmarkError(
      "UNSUPPORTED_MANIFEST_VERSION",
      `Unsupported reconstruction benchmark schema ${schemaVersion}`,
    );
  }

  const sourceRecord = requireRecord(root.source, "source");
  const source = {
    path: requireString(sourceRecord.path, "source.path"),
    gitBlobSha: requireGitBlobSha(sourceRecord.gitBlobSha),
    sourceCases: requireStringArray(sourceRecord.sourceCases, "source.sourceCases"),
  };
  if (source.sourceCases.length === 0) {
    throw invalid("source.sourceCases must not be empty");
  }

  const evidence = requireArray(root.evidence, "evidence").map(parseEvidence);
  const evidenceIds = new Set<string>();
  for (const item of evidence) {
    if (evidenceIds.has(item.id)) throw invalid(`Duplicate evidence id ${item.id}`);
    evidenceIds.add(item.id);
  }

  const provisionIds = new Set(
    evidence
      .filter((item): item is Extract<BenchmarkEvidence, { kind: "provision_occurrence" }> =>
        item.kind === "provision_occurrence")
      .map((item) => item.id),
  );
  for (const item of evidence) {
    if (item.kind === "disposition_witness" && !provisionIds.has(item.subjectOccurrenceId)) {
      throw new BenchmarkError(
        "BROKEN_EVIDENCE_REFERENCE",
        `Witness ${item.id} references unknown provision occurrence ${item.subjectOccurrenceId}`,
      );
    }
  }

  const cuts = requireArray(root.cuts, "cuts").map(parseCut);
  if (cuts.length === 0) throw invalid("cuts must not be empty");
  const cutIds = new Set<string>();
  for (const cut of cuts) {
    if (cutIds.has(cut.id)) {
      throw new BenchmarkError("DUPLICATE_CUT_ID", `Duplicate temporal cut id ${cut.id}`);
    }
    cutIds.add(cut.id);
  }

  return {
    schemaVersion: MANIFEST_VERSION,
    id: requireString(root.id, "id"),
    source,
    invariantIds: requireStringArray(root.invariantIds, "invariantIds"),
    evidence,
    cuts,
  };
}

function parseEvidence(value: unknown, index: number): BenchmarkEvidence {
  const record = requireRecord(value, `evidence[${index}]`);
  const kind = requireString(record.kind, `evidence[${index}].kind`);
  const id = requireString(record.id, `evidence[${index}].id`);
  const admittedAt = requireIsoTime(record.admittedAt, `evidence[${index}].admittedAt`);

  if (kind === "provision_occurrence") {
    return {
      kind,
      id,
      occurredAt: requireIsoTime(record.occurredAt, `evidence[${index}].occurredAt`),
      admittedAt,
      authorization: requireEnum(
        record.authorization,
        ["valid", "invalid", "indeterminate"] as const,
        `evidence[${index}].authorization`,
      ),
      purposeCompatibility: requireEnum(
        record.purposeCompatibility,
        ["compatible", "incompatible", "indeterminate"] as const,
        `evidence[${index}].purposeCompatibility`,
      ),
      fidelity: requireEnum(
        record.fidelity,
        ["faithful", "drifted", "breached", "indeterminate"] as const,
        `evidence[${index}].fidelity`,
      ),
      diagnosticReferenceCount: requireNonNegativeSafeInteger(
        record.diagnosticReferenceCount,
        `evidence[${index}].diagnosticReferenceCount`,
      ),
    };
  }

  if (kind === "disposition_witness") {
    return {
      kind,
      id,
      subjectOccurrenceId: requireString(
        record.subjectOccurrenceId,
        `evidence[${index}].subjectOccurrenceId`,
      ),
      witnessedAt: requireIsoTime(record.witnessedAt, `evidence[${index}].witnessedAt`),
      admittedAt,
      eligible: requireBoolean(record.eligible, `evidence[${index}].eligible`),
      role: requireString(record.role, `evidence[${index}].role`),
      disposition: requireEnum(
        record.disposition,
        ["consumed", "declined", "outcome_unknown"] as const,
        `evidence[${index}].disposition`,
      ),
    };
  }

  throw invalid(`Unsupported evidence kind ${kind}`);
}

function parseCut(value: unknown, index: number): BenchmarkCut {
  const record = requireRecord(value, `cuts[${index}]`);
  const expectedRecord = requireRecord(record.expected, `cuts[${index}].expected`);
  return {
    id: requireString(record.id, `cuts[${index}].id`),
    projectionAt: requireIsoTime(record.projectionAt, `cuts[${index}].projectionAt`),
    expected: {
      exact: requireArray(expectedRecord.exact, `cuts[${index}].expected.exact`).map(
        (item, itemIndex) => parseExactExpectation(item, `cuts[${index}].expected.exact[${itemIndex}]`),
      ),
      plural: requireArray(expectedRecord.plural, `cuts[${index}].expected.plural`).map(
        (item, itemIndex) => parsePluralExpectation(item, `cuts[${index}].expected.plural[${itemIndex}]`),
      ),
      unresolved: requireStringArray(
        expectedRecord.unresolved,
        `cuts[${index}].expected.unresolved`,
      ),
      prohibited: requireArray(
        expectedRecord.prohibited,
        `cuts[${index}].expected.prohibited`,
      ).map((item, itemIndex) =>
        parseProhibitedExpectation(item, `cuts[${index}].expected.prohibited[${itemIndex}]`)),
    },
  };
}

function parseExactExpectation(value: unknown, label: string): ExactExpectation {
  const record = requireRecord(value, label);
  return {
    path: requireFactPath(record.path, `${label}.path`),
    value: requireString(record.value, `${label}.value`),
  };
}

function parsePluralExpectation(value: unknown, label: string): PluralExpectation {
  const record = requireRecord(value, label);
  return {
    path: requireFactPath(record.path, `${label}.path`),
    values: requireStringArray(record.values, `${label}.values`),
  };
}

function parseProhibitedExpectation(value: unknown, label: string): ProhibitedExpectation {
  const record = requireRecord(value, label);
  return {
    path: requireFactPath(record.path, `${label}.path`),
    value: requireString(record.value, `${label}.value`),
    reason: requireString(record.reason, `${label}.reason`),
  };
}

function requireFactPath(value: unknown, label: string): FactPath {
  return requireEnum(
    value,
    [
      "operational.authorization",
      "operational.purposeCompatibility",
      "operational.fidelity",
      "operational.fulfillment",
    ] as const,
    label,
  );
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw invalid(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw invalid(`${label} must be an array`);
  return value;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw invalid(`${label} must be a non-empty string`);
  }
  return value;
}

function requireStringArray(value: unknown, label: string): string[] {
  return requireArray(value, label).map((item, index) => requireString(item, `${label}[${index}]`));
}

function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw invalid(`${label} must be boolean`);
  return value;
}

function requireNonNegativeSafeInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw invalid(`${label} must be a non-negative safe integer`);
  }
  return value;
}

function requireIsoTime(value: unknown, label: string): string {
  const text = requireString(value, label);
  if (!text.endsWith("Z") || Number.isNaN(Date.parse(text))) {
    throw invalid(`${label} must be an RFC 3339 UTC timestamp`);
  }
  return text;
}

function requireGitBlobSha(value: unknown): string {
  const text = requireString(value, "source.gitBlobSha");
  if (!/^[0-9a-f]{40}$/.test(text)) throw invalid("source.gitBlobSha must be 40 lowercase hex characters");
  return text;
}

function requireEnum<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  label: string,
): T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw invalid(`${label} must be one of ${allowed.join(", ")}`);
  }
  return value as T[number];
}

function invalid(message: string): BenchmarkError {
  return new BenchmarkError("INVALID_MANIFEST", message);
}
