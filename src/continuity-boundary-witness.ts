import type { Addressed } from "./residual.js";
import { addressJson } from "./residual.js";
import type { ContinuitySpineManifestV01, ContinuityStage } from "./continuity-spine.js";
import {
  evaluateStageTransition,
  validateContinuitySpineManifest,
} from "./continuity-spine.js";

const WITNESS_SCHEMA = "tranchnode/continuity-boundary-witness/v0.1" as const;

export interface ContinuityBoundaryWitnessInput {
  spine: ContinuitySpineManifestV01;
  fromStageId: string;
  toStageId: string;
  suppliedWitnesses: string[];
  unresolvedRefs: string[];
}

export interface ContinuityBoundaryWitnessV01 {
  schema: typeof WITNESS_SCHEMA;
  spineId: string;
  fromStageId: string;
  toStageId: string;
  originRef: string;
  presentRef: string;
  preserved: string[];
  differentiated: string[];
  lost: string[];
  unresolved: string[];
  completedTransferIds: string[];
  transitionWitnessRefs: string[];
  authority: "none";
  occurrenceClaim: "transition-witness-only";
}

export type ContinuityBoundaryWitnessErrorCode =
  | "TRANSITION_NOT_ADMISSIBLE"
  | "PROPOSAL_DESTINATION_NOT_WITNESSABLE"
  | "INVALID_UNRESOLVED_REFS"
  | "UNRESOLVED_REF_NOT_PRESENT";

export class ContinuityBoundaryWitnessError extends Error {
  constructor(
    public readonly code: ContinuityBoundaryWitnessErrorCode,
    public readonly detail?: string,
  ) {
    super(detail === undefined ? code : `${code}: ${detail}`);
    this.name = "ContinuityBoundaryWitnessError";
  }
}

function stageMaterial(stage: ContinuityStage): Set<string> {
  return new Set([
    ...stage.carries,
    ...stage.dependsOn,
    ...stage.scaffolds,
  ]);
}

function normalizedUniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new ContinuityBoundaryWitnessError("INVALID_UNRESOLVED_REFS");
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const result: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (
      descriptor === undefined
      || !("value" in descriptor)
      || descriptor.get !== undefined
      || descriptor.set !== undefined
    ) {
      throw new ContinuityBoundaryWitnessError("INVALID_UNRESOLVED_REFS");
    }

    const item = descriptor.value;
    if (typeof item !== "string" || item.trim().length === 0 || result.includes(item)) {
      throw new ContinuityBoundaryWitnessError("INVALID_UNRESOLVED_REFS");
    }
    result.push(item);
  }
  return result.sort();
}

export function deriveContinuityBoundaryWitness(
  input: ContinuityBoundaryWitnessInput,
): Addressed<ContinuityBoundaryWitnessV01> {
  const spine = validateContinuitySpineManifest(input.spine);
  const evaluation = evaluateStageTransition({
    spine,
    fromStageId: input.fromStageId,
    toStageId: input.toStageId,
    suppliedWitnesses: input.suppliedWitnesses,
  });

  if (evaluation.decision !== "admissible") {
    throw new ContinuityBoundaryWitnessError(
      "TRANSITION_NOT_ADMISSIBLE",
      evaluation.findings.map((finding) => finding.reason).join(",") || evaluation.decision,
    );
  }

  const from = spine.stages.find((stage) => stage.id === input.fromStageId);
  const to = spine.stages.find((stage) => stage.id === input.toStageId);
  if (from === undefined || to === undefined) {
    throw new ContinuityBoundaryWitnessError("TRANSITION_NOT_ADMISSIBLE", "UNKNOWN_STAGE");
  }
  if (to.status === "proposal") {
    throw new ContinuityBoundaryWitnessError("PROPOSAL_DESTINATION_NOT_WITNESSABLE");
  }

  const source = stageMaterial(from);
  const destination = stageMaterial(to);
  const unresolved = normalizedUniqueStrings(input.unresolvedRefs);
  for (const ref of unresolved) {
    if (!destination.has(ref)) {
      throw new ContinuityBoundaryWitnessError("UNRESOLVED_REF_NOT_PRESENT", ref);
    }
  }
  const unresolvedSet = new Set(unresolved);

  const preserved = [...source]
    .filter((ref) => destination.has(ref) && !unresolvedSet.has(ref))
    .sort();
  const differentiated = [...destination]
    .filter((ref) => !source.has(ref) && !unresolvedSet.has(ref))
    .sort();

  const value: ContinuityBoundaryWitnessV01 = {
    schema: WITNESS_SCHEMA,
    spineId: spine.id,
    fromStageId: from.id,
    toStageId: to.id,
    originRef: spine.origin.sourceRef,
    presentRef: spine.present.sourceRef,
    preserved,
    differentiated,
    lost: [...evaluation.shed].sort(),
    unresolved,
    completedTransferIds: [...evaluation.completedTransferIds].sort(),
    transitionWitnessRefs: [...new Set(input.suppliedWitnesses)].sort(),
    authority: "none",
    occurrenceClaim: "transition-witness-only",
  };

  return addressJson(value);
}
