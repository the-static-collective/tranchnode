import { addressJson, type Hash } from "./residual.js";

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

export interface ConstitutionalDiff {
  historyDelta: "unchanged" | "new_history" | "rewritten_history";
  addedHistoryIds: string[];
  rewrittenHistoryIds: string[];
  occurrenceDelta: "unchanged" | "changed_occurrence";
  projectionDelta: "unchanged" | "new_projection" | "not_comparable_after_occurrence_change";
  tensionDelta: "unchanged" | "resolved_tension" | "silenced_tension";
}

export class BenchmarkError extends Error {
  constructor(
    public readonly code:
      | "INVALID_MANIFEST"
      | "UNSUPPORTED_MANIFEST_VERSION"
      | "DUPLICATE_CUT_ID"
      | "BROKEN_EVIDENCE_REFERENCE"
      | "INVALID_RECONSTRUCTION_INPUT",
    message: string,
  ) {
    super(message);
    this.name = "BenchmarkError";
  }
}

export class ReferenceReconstructionEngine implements ReconstructionEngine {
  readonly id = "tranchnode-reference";
  readonly version = "0.1.0";

  async reconstruct(input: ReconstructionInput): Promise<ReconstructionResult> {
    const manifest = validateBenchmarkManifest(input.manifest);
    const cut = requireDeclaredCut(manifest, input.cut);
    const cutInstant = parseInstant(cut.projectionAt, `cut ${cut.id} projectionAt`);

    const admitted = [...manifest.evidence]
      .filter((item) => parseInstant(item.admittedAt, `${item.id}.admittedAt`) <= cutInstant)
      .sort(compareEvidence);

    const provisions = admitted.filter(
      (item): item is Extract<BenchmarkEvidence, { kind: "provision_occurrence" }> =>
        item.kind === "provision_occurrence"
        && parseInstant(item.occurredAt, `${item.id}.occurredAt`) <= cutInstant,
    );
    if (provisions.length !== 1) {
      throw reconstructionError(
        `Cut ${cut.id} requires exactly one admitted provision occurrence, found ${provisions.length}`,
      );
    }
    const provision = provisions[0];
    if (!provision) throw reconstructionError(`Cut ${cut.id} has no provision occurrence`);

    const witness = admitted
      .filter(
        (item): item is Extract<BenchmarkEvidence, { kind: "disposition_witness" }> =>
          item.kind === "disposition_witness"
          && item.eligible
          && item.subjectOccurrenceId === provision.id,
      )
      .sort(compareWitnessRecency)
      .at(-1);

    const fulfillment = fulfillmentFromWitness(witness);
    const operational: ReconstructionResult["operational"] = {
      authorization: provision.authorization,
      purposeCompatibility: provision.purposeCompatibility,
      fidelity: provision.fidelity,
      fulfillment,
    };
    const unresolved = fulfillment === "scope_uncertain" ? ["fulfillment"] : [];
    const known = ["authorization", "fidelity", "purposeCompatibility"];
    if (fulfillment !== "scope_uncertain") known.push("fulfillment");
    known.sort();

    const history: HistoryRecord[] = admitted.map((item) => ({
      id: item.id,
      kind: item.kind,
      address: addressJson(item).hash,
    }));
    const occurrenceAddress = addressJson(provision).hash;
    const tensions: TensionState[] = [];
    const projectionAddress = addressJson({
      kind: "constitutional_reconstruction_projection_v0.1",
      cutId: cut.id,
      occurrenceAddress,
      admittedHistoryAddresses: history.map((item) => item.address),
      operational,
      unresolved,
      tensions,
    }).hash;

    return normalizeReconstructionResult({
      engine: { id: this.id, version: this.version },
      cutId: cut.id,
      structural: {
        occurrenceIds: [provision.id],
        admittedEvidenceIds: history.map((item) => item.id),
        missingReferences: [],
      },
      epistemic: {
        known,
        unresolved,
        plurality: [],
      },
      constitutional: {
        occurrenceAddress,
        projectionAddress,
        history,
        tensions,
        violations: [],
      },
      operational,
    });
  }
}

export class FixtureReconstructionEngine implements ReconstructionEngine {
  constructor(
    public readonly id: string,
    public readonly version: string,
    private readonly results: ReadonlyMap<string, ReconstructionResult>,
  ) {}

  async reconstruct(input: ReconstructionInput): Promise<ReconstructionResult> {
    const manifest = validateBenchmarkManifest(input.manifest);
    const cut = requireDeclaredCut(manifest, input.cut);
    const stored = this.results.get(cut.id);
    if (!stored) {
      throw reconstructionError(`Fixture adapter ${this.id} has no result for cut ${cut.id}`);
    }
    if (stored.cutId !== cut.id) {
      throw reconstructionError(
        `Fixture adapter ${this.id} result cut ${stored.cutId} does not match declared cut ${cut.id}`,
      );
    }
    return normalizeReconstructionResult({
      ...stored,
      engine: { id: this.id, version: this.version },
    });
  }
}

export function evaluateBenchmarkResult(
  result: ReconstructionResult,
  expected: CutExpectation,
): BenchmarkEvaluation {
  const findings: BenchmarkFinding[] = [];

  for (const expectation of expected.exact) {
    const actual = readFact(result, expectation.path);
    findings.push({
      class: "exact",
      key: expectation.path,
      ok: actual === expectation.value,
      actual,
      expected: [expectation.value],
    });
  }

  for (const expectation of expected.plural) {
    const actual = readFact(result, expectation.path);
    findings.push({
      class: "plural",
      key: expectation.path,
      ok: expectation.values.includes(actual),
      actual,
      expected: [...expectation.values].sort(),
    });
  }

  for (const subject of expected.unresolved) {
    const unresolved = result.epistemic.unresolved.includes(subject);
    findings.push({
      class: "unresolved",
      key: subject,
      ok: unresolved,
      actual: unresolved ? "unresolved" : "resolved",
      expected: ["unresolved"],
    });
  }

  for (const expectation of expected.prohibited) {
    const actual = readFact(result, expectation.path);
    findings.push({
      class: "prohibited",
      key: expectation.path,
      ok: actual !== expectation.value,
      actual,
      expected: [`not:${expectation.value}`],
      reason: expectation.reason,
    });
  }

  findings.sort(compareFinding);
  return {
    pass: findings.every((finding) => finding.ok),
    findings,
  };
}

export function normalizeReconstructionResult(result: ReconstructionResult): ReconstructionResult {
  return {
    engine: { ...result.engine },
    cutId: result.cutId,
    structural: {
      occurrenceIds: [...result.structural.occurrenceIds].sort(),
      admittedEvidenceIds: [...result.structural.admittedEvidenceIds].sort(),
      missingReferences: [...result.structural.missingReferences].sort(),
    },
    epistemic: {
      known: [...result.epistemic.known].sort(),
      unresolved: [...result.epistemic.unresolved].sort(),
      plurality: [...result.epistemic.plurality].sort(),
    },
    constitutional: {
      occurrenceAddress: result.constitutional.occurrenceAddress,
      projectionAddress: result.constitutional.projectionAddress,
      history: result.constitutional.history
        .map((item) => ({ ...item }))
        .sort((left, right) => left.id.localeCompare(right.id) || left.address.localeCompare(right.address)),
      tensions: result.constitutional.tensions
        .map((item) => ({
          id: item.id,
          status: item.status,
          resolutionEvidenceIds: [...item.resolutionEvidenceIds].sort(),
        }))
        .sort((left, right) => left.id.localeCompare(right.id)),
      violations: [...result.constitutional.violations].sort(),
    },
    operational: { ...result.operational },
  };
}

export function diffConstitutionalState(
  before: ReconstructionResult,
  after: ReconstructionResult,
): ConstitutionalDiff {
  const beforeHistory = new Map(before.constitutional.history.map((item) => [item.id, item.address]));
  const afterHistory = new Map(after.constitutional.history.map((item) => [item.id, item.address]));
  const addedHistoryIds = [...afterHistory.keys()]
    .filter((id) => !beforeHistory.has(id))
    .sort();
  const rewrittenHistoryIds = [...beforeHistory.keys()]
    .filter((id) => !afterHistory.has(id) || afterHistory.get(id) !== beforeHistory.get(id))
    .sort();

  const historyDelta: ConstitutionalDiff["historyDelta"] = rewrittenHistoryIds.length > 0
    ? "rewritten_history"
    : addedHistoryIds.length > 0
      ? "new_history"
      : "unchanged";
  const occurrenceDelta: ConstitutionalDiff["occurrenceDelta"] =
    before.constitutional.occurrenceAddress === after.constitutional.occurrenceAddress
      ? "unchanged"
      : "changed_occurrence";
  const projectionDelta: ConstitutionalDiff["projectionDelta"] = occurrenceDelta === "changed_occurrence"
    ? "not_comparable_after_occurrence_change"
    : before.constitutional.projectionAddress === after.constitutional.projectionAddress
      ? "unchanged"
      : "new_projection";

  return {
    historyDelta,
    addedHistoryIds,
    rewrittenHistoryIds,
    occurrenceDelta,
    projectionDelta,
    tensionDelta: diffTensions(before.constitutional.tensions, after.constitutional.tensions),
  };
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
  if (source.sourceCases.length === 0) throw invalid("source.sourceCases must not be empty");

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

function requireDeclaredCut(manifest: BenchmarkManifest, requested: BenchmarkCut): BenchmarkCut {
  const cut = manifest.cuts.find((candidate) => candidate.id === requested.id);
  if (!cut || cut.projectionAt !== requested.projectionAt) {
    throw reconstructionError(
      `Temporal cut ${requested.id} is not declared by benchmark ${manifest.id}`,
    );
  }
  return cut;
}

function diffTensions(
  before: readonly TensionState[],
  after: readonly TensionState[],
): ConstitutionalDiff["tensionDelta"] {
  const afterById = new Map(after.map((item) => [item.id, item]));
  let resolved = false;
  for (const tension of before) {
    if (tension.status !== "open") continue;
    const next = afterById.get(tension.id);
    if (!next) return "silenced_tension";
    if (next.status === "resolved") {
      if (next.resolutionEvidenceIds.length === 0) return "silenced_tension";
      resolved = true;
    }
  }
  return resolved ? "resolved_tension" : "unchanged";
}

function fulfillmentFromWitness(
  witness: Extract<BenchmarkEvidence, { kind: "disposition_witness" }> | undefined,
): FulfillmentStatus {
  if (!witness || witness.disposition === "outcome_unknown") return "scope_uncertain";
  return witness.disposition === "consumed" ? "scoped_complete" : "attempted";
}

function compareEvidence(left: BenchmarkEvidence, right: BenchmarkEvidence): number {
  return left.id.localeCompare(right.id);
}

function compareWitnessRecency(
  left: Extract<BenchmarkEvidence, { kind: "disposition_witness" }>,
  right: Extract<BenchmarkEvidence, { kind: "disposition_witness" }>,
): number {
  return parseInstant(left.admittedAt, `${left.id}.admittedAt`)
    - parseInstant(right.admittedAt, `${right.id}.admittedAt`)
    || left.id.localeCompare(right.id);
}

function compareFinding(left: BenchmarkFinding, right: BenchmarkFinding): number {
  return left.class.localeCompare(right.class)
    || left.key.localeCompare(right.key)
    || (left.actual ?? "").localeCompare(right.actual ?? "");
}

function readFact(result: ReconstructionResult, path: FactPath): string {
  switch (path) {
    case "operational.authorization": return result.operational.authorization;
    case "operational.purposeCompatibility": return result.operational.purposeCompatibility;
    case "operational.fidelity": return result.operational.fidelity;
    case "operational.fulfillment": return result.operational.fulfillment;
  }
}

function parseInstant(value: string, label: string): number {
  const instant = Date.parse(value);
  if (!value.endsWith("Z") || Number.isNaN(instant)) {
    throw reconstructionError(`${label} must be an RFC 3339 UTC timestamp`);
  }
  return instant;
}

function reconstructionError(message: string): BenchmarkError {
  return new BenchmarkError("INVALID_RECONSTRUCTION_INPUT", message);
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
  if (!/^[0-9a-f]{40}$/.test(text)) {
    throw invalid("source.gitBlobSha must be 40 lowercase hex characters");
  }
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
