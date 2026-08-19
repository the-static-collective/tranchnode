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

function stageOrderStrings(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ContinuitySpineError("INVALID_STAGE_ORDER");
  }
  const result = value.map(requiredString);
  if (new Set(result).size !== result.length) {
    throw new ContinuitySpineError("INVALID_STAGE_ORDER");
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
  const stageOrder = stageOrderStrings(record.stageOrder);

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

function sortFindings(findings: TransitionFinding[]): TransitionFinding[] {
  return [...findings].sort((left, right) =>
    left.class.localeCompare(right.class)
    || left.subjectId.localeCompare(right.subjectId)
    || left.reason.localeCompare(right.reason)
  );
}

function invalidEvaluation(
  spineId: string,
  fromStageId: string,
  toStageId: string,
  subjectId: string,
  reason: string,
): TransitionEvaluation {
  return {
    schema: EVALUATION_SCHEMA,
    spineId,
    fromStageId,
    toStageId,
    decision: "invalid",
    shed: [],
    completedTransferIds: [],
    findings: [{ class: "invalid_manifest", subjectId, reason }],
  };
}

function bestEffortSpineId(value: unknown): string {
  if (isRecord(value) && typeof value.id === "string" && value.id.length > 0) {
    return value.id;
  }
  return "unknown-spine";
}

export function evaluateStageTransition(input: TransitionEvaluationInput): TransitionEvaluation {
  const rawSpine: unknown = input.spine;
  let spine: ContinuitySpineManifestV01;
  try {
    spine = validateContinuitySpineManifest(rawSpine);
  } catch (error: unknown) {
    const reason = error instanceof ContinuitySpineError ? error.code : "INVALID_MANIFEST";
    return invalidEvaluation(
      bestEffortSpineId(rawSpine),
      input.fromStageId,
      input.toStageId,
      bestEffortSpineId(rawSpine),
      reason,
    );
  }

  if (!Array.isArray(input.suppliedWitnesses)) {
    return invalidEvaluation(
      spine.id,
      input.fromStageId,
      input.toStageId,
      spine.id,
      "INVALID_SUPPLIED_WITNESSES",
    );
  }

  const suppliedWitnesses: string[] = [];
  for (const witness of input.suppliedWitnesses) {
    if (typeof witness !== "string" || witness.trim().length === 0) {
      return invalidEvaluation(
        spine.id,
        input.fromStageId,
        input.toStageId,
        spine.id,
        "INVALID_SUPPLIED_WITNESSES",
      );
    }
    if (!suppliedWitnesses.includes(witness)) suppliedWitnesses.push(witness);
  }
  suppliedWitnesses.sort();

  const knownWitnesses = new Set(
    spine.transfers.flatMap((transfer) => transfer.requiredWitnessIds),
  );
  const unknownWitness = suppliedWitnesses.find((witness) => !knownWitnesses.has(witness));
  if (unknownWitness !== undefined) {
    return invalidEvaluation(
      spine.id,
      input.fromStageId,
      input.toStageId,
      unknownWitness,
      "UNKNOWN_SUPPLIED_WITNESS",
    );
  }

  const fromIndex = spine.stageOrder.indexOf(input.fromStageId);
  const toIndex = spine.stageOrder.indexOf(input.toStageId);
  if (fromIndex < 0 || toIndex < 0) {
    const unknownStage = fromIndex < 0 ? input.fromStageId : input.toStageId;
    return invalidEvaluation(
      spine.id,
      input.fromStageId,
      input.toStageId,
      unknownStage,
      "UNKNOWN_STAGE",
    );
  }
  if (fromIndex >= toIndex) {
    return invalidEvaluation(
      spine.id,
      input.fromStageId,
      input.toStageId,
      `${input.fromStageId}->${input.toStageId}`,
      "INVALID_TRANSITION_ORDER",
    );
  }

  const from = spine.stages.find((stage) => stage.id === input.fromStageId);
  const to = spine.stages.find((stage) => stage.id === input.toStageId);
  if (from === undefined || to === undefined) {
    return invalidEvaluation(
      spine.id,
      input.fromStageId,
      input.toStageId,
      `${input.fromStageId}->${input.toStageId}`,
      "UNKNOWN_STAGE",
    );
  }

  const sourceMaterial = new Set([
    ...from.carries,
    ...from.dependsOn,
    ...from.scaffolds,
  ]);
  const destinationMaterial = new Set([
    ...to.carries,
    ...to.dependsOn,
    ...to.scaffolds,
  ]);
  const shed = [...sourceMaterial]
    .filter((id) => !destinationMaterial.has(id))
    .sort();

  const findings: TransitionFinding[] = [];
  if (to.status === "proposal") {
    findings.push({
      class: "proposal_only",
      subjectId: to.id,
      reason: "DESTINATION_REMAINS_PROPOSAL",
    });
  }

  for (const invariant of spine.invariants) {
    const applies = invariant.appliesThrough === "all"
      || invariant.appliesThrough.includes(to.id);
    if (!applies) continue;

    for (const requiredCarry of invariant.requiredCarries) {
      if (!to.carries.includes(requiredCarry)) {
        findings.push({
          class: "blocked_invariant_loss",
          subjectId: invariant.id,
          reason: "ACTIVE_INVARIANT_CARRIER_MISSING",
        });
      }
    }
  }

  const suppliedWitnessSet = new Set(suppliedWitnesses);
  const relevantTransfers = spine.transfers.filter(
    (transfer) => transfer.sourceStageId === from.id
      && transfer.destinationStageId === to.id,
  );
  const completedTransfers = relevantTransfers.filter((transfer) =>
    transfer.requiredWitnessIds.every((witness) => suppliedWitnessSet.has(witness))
  );
  const completedTransferIds = completedTransfers.map((transfer) => transfer.id).sort();
  const completedTransferIdSet = new Set(completedTransferIds);

  for (const transfer of relevantTransfers) {
    if (!completedTransferIdSet.has(transfer.id)) {
      findings.push({
        class: "blocked_unwitnessed_transfer",
        subjectId: transfer.id,
        reason: "REQUIRED_TRANSFER_WITNESS_MISSING",
      });
    }
  }

  for (const shedId of shed) {
    const permittingTransfers = relevantTransfers.filter(
      (transfer) => transfer.permitsShedding.includes(shedId),
    );
    const hasCompletedPermission = permittingTransfers.some(
      (transfer) => completedTransferIdSet.has(transfer.id),
    );

    if (hasCompletedPermission) continue;

    if (permittingTransfers.length > 0) {
      findings.push({
        class: "blocked_premature_shedding",
        subjectId: shedId,
        reason: "SHED_BEFORE_TRANSFER_WITNESS",
      });
      continue;
    }

    if (from.carries.includes(shedId)) {
      findings.push({
        class: "blocked_untransferred_responsibility",
        subjectId: shedId,
        reason: "RESPONSIBILITY_DROPPED_WITHOUT_TRANSFER",
      });
    } else {
      findings.push({
        class: "blocked_premature_shedding",
        subjectId: shedId,
        reason: "SHED_WITHOUT_TRANSFER_PERMISSION",
      });
    }
  }

  const normalizedFindings = sortFindings(findings);
  const blocked = normalizedFindings.some((finding) => finding.class.startsWith("blocked_"));

  return {
    schema: EVALUATION_SCHEMA,
    spineId: spine.id,
    fromStageId: from.id,
    toStageId: to.id,
    decision: blocked ? "blocked" : "admissible",
    shed,
    completedTransferIds,
    findings: normalizedFindings,
  };
}
