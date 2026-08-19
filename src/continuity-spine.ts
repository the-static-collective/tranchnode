const MANIFEST_SCHEMA = "tranchnode/continuity-spine/v0.1" as const;
const EVALUATION_SCHEMA = "tranchnode/continuity-spine-evaluation/v0.1" as const;

export type StageStatus = "historical" | "constituted" | "proposal";

export interface ContinuityStateRef {
  id: string;
  status: "historical" | "constituted";
  sourceRef: string;
  observedCommit?: string;
}

export interface ContinuityAttractorRef {
  id: string;
  status: "proposal";
  purpose: string;
  desiredCapabilities: string[];
  nonClaims: string[];
}

export interface ContinuityInvariant {
  id: string;
  description: string;
  sourceRef: string;
  appliesThrough: "all" | string[];
  requiredCarries: string[];
}

export interface ContinuityStage {
  id: string;
  status: StageStatus;
  carries: string[];
  dependsOn: string[];
  scaffolds: string[];
  entryConditions: string[];
  exitConditions: string[];
}

export interface ContinuityTransfer {
  id: string;
  responsibilityId: string;
  fromCarrier: string;
  toCarrier: string;
  sourceStageId: string;
  destinationStageId: string;
  requiredWitnessIds: string[];
  permitsShedding: string[];
}

export interface ContinuitySpineManifestV01 {
  schema: typeof MANIFEST_SCHEMA;
  id: string;
  project: string;
  origin: ContinuityStateRef;
  present: ContinuityStateRef;
  attractor: ContinuityAttractorRef;
  stageOrder: string[];
  invariants: ContinuityInvariant[];
  stages: ContinuityStage[];
  transfers: ContinuityTransfer[];
}

export type TransitionDecision = "admissible" | "blocked" | "invalid";

export type TransitionFindingClass =
  | "proposal_only"
  | "blocked_invariant_loss"
  | "blocked_untransferred_responsibility"
  | "blocked_unwitnessed_transfer"
  | "blocked_premature_shedding"
  | "invalid_manifest";

export interface TransitionFinding {
  class: TransitionFindingClass;
  subjectId: string;
  reason: string;
}

export interface TransitionEvaluationInput {
  spine: ContinuitySpineManifestV01;
  fromStageId: string;
  toStageId: string;
  suppliedWitnesses: string[];
}

export interface TransitionEvaluation {
  schema: typeof EVALUATION_SCHEMA;
  spineId: string;
  fromStageId: string;
  toStageId: string;
  decision: TransitionDecision;
  shed: string[];
  completedTransferIds: string[];
  findings: TransitionFinding[];
}

export class ContinuitySpineError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "ContinuitySpineError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new ContinuitySpineError("INVALID_MANIFEST");
  return value;
}

function requiredString(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ContinuitySpineError("INVALID_MANIFEST");
  }
  return value;
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  return requiredString(value);
}

function uniqueStrings(value: unknown, allowEmpty = true): string[] {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new ContinuitySpineError("INVALID_MANIFEST");
  }
  const result = value.map(requiredString);
  if (new Set(result).size !== result.length) {
    throw new ContinuitySpineError("DUPLICATE_ID");
  }
  return result;
}

function assertUniqueIds(items: Array<{ id: string }>): void {
  const ids = items.map((item) => item.id);
  if (new Set(ids).size !== ids.length) {
    throw new ContinuitySpineError("DUPLICATE_ID");
  }
}

function parseStateRef(value: unknown): ContinuityStateRef {
  const record = requiredRecord(value);
  const status = requiredString(record.status);
  if (status !== "historical" && status !== "constituted") {
    throw new ContinuitySpineError("INVALID_MANIFEST");
  }
  const observedCommit = optionalString(record.observedCommit);
  return {
    id: requiredString(record.id),
    status,
    sourceRef: requiredString(record.sourceRef),
    ...(observedCommit === undefined ? {} : { observedCommit }),
  };
}

function parseAttractor(value: unknown): ContinuityAttractorRef {
  const record = requiredRecord(value);
  const status = requiredString(record.status);
  if (status !== "proposal") {
    throw new ContinuitySpineError("ATTRACTOR_MUST_BE_PROPOSAL");
  }
  return {
    id: requiredString(record.id),
    status,
    purpose: requiredString(record.purpose),
    desiredCapabilities: uniqueStrings(record.desiredCapabilities, false),
    nonClaims: uniqueStrings(record.nonClaims, false),
  };
}

function parseInvariant(value: unknown): ContinuityInvariant {
  const record = requiredRecord(value);
  const rawAppliesThrough = record.appliesThrough;
  const appliesThrough = rawAppliesThrough === "all"
    ? "all"
    : uniqueStrings(rawAppliesThrough, false);
  return {
    id: requiredString(record.id),
    description: requiredString(record.description),
    sourceRef: requiredString(record.sourceRef),
    appliesThrough,
    requiredCarries: uniqueStrings(record.requiredCarries, false),
  };
}

function parseStage(value: unknown): ContinuityStage {
  const record = requiredRecord(value);
  const status = requiredString(record.status);
  if (status !== "historical" && status !== "constituted" && status !== "proposal") {
    throw new ContinuitySpineError("INVALID_MANIFEST");
  }
  return {
    id: requiredString(record.id),
    status,
    carries: uniqueStrings(record.carries),
    dependsOn: uniqueStrings(record.dependsOn),
    scaffolds: uniqueStrings(record.scaffolds),
    entryConditions: uniqueStrings(record.entryConditions),
    exitConditions: uniqueStrings(record.exitConditions),
  };
}

function parseTransfer(value: unknown): ContinuityTransfer {
  const record = requiredRecord(value);
  return {
    id: requiredString(record.id),
    responsibilityId: requiredString(record.responsibilityId),
    fromCarrier: requiredString(record.fromCarrier),
    toCarrier: requiredString(record.toCarrier),
    sourceStageId: requiredString(record.sourceStageId),
    destinationStageId: requiredString(record.destinationStageId),
    requiredWitnessIds: uniqueStrings(record.requiredWitnessIds, false),
    permitsShedding: uniqueStrings(record.permitsShedding),
  };
}

function parseArray<T>(value: unknown, parser: (item: unknown) => T): T[] {
  if (!Array.isArray(value)) throw new ContinuitySpineError("INVALID_MANIFEST");
  return value.map(parser);
}

export function validateContinuitySpineManifest(value: unknown): ContinuitySpineManifestV01 {
  const record = requiredRecord(value);
  if (record.schema !== MANIFEST_SCHEMA) {
    throw new ContinuitySpineError("UNSUPPORTED_SCHEMA_VERSION");
  }

  const origin = parseStateRef(record.origin);
  const present = parseStateRef(record.present);
  const attractor = parseAttractor(record.attractor);
  const invariants = parseArray(record.invariants, parseInvariant);
  const stages = parseArray(record.stages, parseStage);
  const transfers = parseArray(record.transfers, parseTransfer);
  const stageOrder = uniqueStrings(record.stageOrder, false);

  assertUniqueIds(invariants);
  assertUniqueIds(stages);
  assertUniqueIds(transfers);

  const stageIds = new Set(stages.map((stage) => stage.id));
  if (
    stageOrder.length !== stages.length
    || stageOrder.some((id) => !stageIds.has(id))
    || stages.some((stage) => !stageOrder.includes(stage.id))
  ) {
    throw new ContinuitySpineError("INVALID_STAGE_ORDER");
  }

  const orderIndex = new Map(stageOrder.map((id, index) => [id, index]));

  for (const invariant of invariants) {
    if (
      invariant.appliesThrough !== "all"
      && invariant.appliesThrough.some((stageId) => !stageIds.has(stageId))
    ) {
      throw new ContinuitySpineError("BROKEN_STAGE_REFERENCE");
    }
  }

  for (const transfer of transfers) {
    const sourceIndex = orderIndex.get(transfer.sourceStageId);
    const destinationIndex = orderIndex.get(transfer.destinationStageId);
    if (sourceIndex === undefined || destinationIndex === undefined) {
      throw new ContinuitySpineError("BROKEN_STAGE_REFERENCE");
    }
    if (sourceIndex >= destinationIndex) {
      throw new ContinuitySpineError("INVALID_STAGE_ORDER");
    }
    const sourceStage = stages.find((stage) => stage.id === transfer.sourceStageId);
    const destinationStage = stages.find((stage) => stage.id === transfer.destinationStageId);
    if (
      sourceStage === undefined
      || destinationStage === undefined
      || !sourceStage.carries.includes(transfer.responsibilityId)
      || !destinationStage.carries.includes(transfer.responsibilityId)
    ) {
      throw new ContinuitySpineError("BROKEN_STAGE_REFERENCE");
    }
  }

  return {
    schema: MANIFEST_SCHEMA,
    id: requiredString(record.id),
    project: requiredString(record.project),
    origin,
    present,
    attractor,
    stageOrder: [...stageOrder],
    invariants: invariants.map((invariant) => ({
      ...invariant,
      appliesThrough: invariant.appliesThrough === "all"
        ? "all"
        : [...invariant.appliesThrough],
      requiredCarries: [...invariant.requiredCarries],
    })),
    stages: stages.map((stage) => ({
      ...stage,
      carries: [...stage.carries],
      dependsOn: [...stage.dependsOn],
      scaffolds: [...stage.scaffolds],
      entryConditions: [...stage.entryConditions],
      exitConditions: [...stage.exitConditions],
    })),
    transfers: transfers.map((transfer) => ({
      ...transfer,
      requiredWitnessIds: [...transfer.requiredWitnessIds],
      permitsShedding: [...transfer.permitsShedding],
    })),
  };
}

export function evaluateStageTransition(_input: TransitionEvaluationInput): TransitionEvaluation {
  throw new ContinuitySpineError("NOT_IMPLEMENTED");
}
