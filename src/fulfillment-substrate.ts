import type { Addressed, Hash, ResidualBinding } from "./residual.js";
import { addressJson } from "./residual.js";
import type { MaterialRootStore, ProjectionGraph, ProjectionReceipt } from "./projection.js";
import { verifyProjectionWithMaterialRoots } from "./projection.js";
import type { ArtifactReader } from "./wav-pcm.js";
import { verifyExactPcmResidual } from "./wav-pcm.js";
import type { FulfillmentRecorded, NeedDeclared } from "./fulfillment.js";
import { validateFulfillmentReceipt, validateNeedDeclared } from "./fulfillment.js";

export interface FulfillmentStore extends MaterialRootStore, ArtifactReader {}

export interface FulfillmentProjectionEvidence {
  target: Addressed<ProjectionReceipt>;
  graph: ProjectionGraph;
}

export interface FulfillmentEvidence {
  projection?: FulfillmentProjectionEvidence;
  residualBindings?: ResidualBinding[];
}

export interface FulfillmentVerification {
  need: Addressed<NeedDeclared>;
  fulfillment: Addressed<FulfillmentRecorded>;
  materialArtifactHashes: readonly Hash[];
  fieldRoots: readonly Hash[];
  residualIds: readonly string[];
}

export class FulfillmentKernelError extends Error {
  constructor(
    public readonly code:
      | "NEED_ID_MISMATCH"
      | "NEED_SNAPSHOT_MISMATCH"
      | "PROJECTION_EVIDENCE_MISSING"
      | "PROJECTION_REFERENCE_MISMATCH"
      | "EVIDENCE_NOT_OBSERVATION"
      | "RESIDUAL_EVIDENCE_MISSING"
      | "RESIDUAL_REFERENCE_MISMATCH"
      | "RESIDUAL_NOT_IN_PROJECTION"
      | "DUPLICATE_RESIDUAL_ID",
    message: string,
  ) {
    super(message);
    this.name = "FulfillmentKernelError";
  }
}

/**
 * Reconciles fulfillment-specific claims against the shared substrate.
 *
 * This function does not redefine identity, storage, projection closure, or
 * residual extraction. It composes those already-landed mechanics and returns
 * the externally addressed canonical fulfillment body after verification.
 */
export async function verifyFulfillmentAgainstSubstrate(
  need: NeedDeclared,
  receipt: FulfillmentRecorded,
  evidence: FulfillmentEvidence,
  store: FulfillmentStore,
): Promise<FulfillmentVerification> {
  validateNeedDeclared(need as unknown as Record<string, unknown>);
  validateFulfillmentReceipt(receipt);

  if (receipt.needId !== need.id) {
    throw new FulfillmentKernelError(
      "NEED_ID_MISMATCH",
      `Fulfillment ${receipt.id} names need ${receipt.needId}, not ${need.id}`,
    );
  }

  const addressedNeed = addressJson(need);
  if (receipt.needSnapshotHash !== addressedNeed.hash) {
    throw new FulfillmentKernelError(
      "NEED_SNAPSHOT_MISMATCH",
      `Fulfillment ${receipt.id} references ${receipt.needSnapshotHash}, expected ${addressedNeed.hash}`,
    );
  }

  const materialArtifactHashes = receipt.materialArtifactHashes ?? [];
  await Promise.all(materialArtifactHashes.map((hash) => store.get(hash)));

  let fieldRoots: readonly Hash[] = [];
  if (receipt.projectionReceiptHash) {
    if (!evidence.projection) {
      throw new FulfillmentKernelError(
        "PROJECTION_EVIDENCE_MISSING",
        `Fulfillment ${receipt.id} references projection ${receipt.projectionReceiptHash} without its verification graph`,
      );
    }
    if (evidence.projection.target.hash !== receipt.projectionReceiptHash) {
      throw new FulfillmentKernelError(
        "PROJECTION_REFERENCE_MISMATCH",
        `Fulfillment ${receipt.id} references ${receipt.projectionReceiptHash}, evidence supplied ${evidence.projection.target.hash}`,
      );
    }
    if (evidence.projection.target.value.projectionKind !== "observation") {
      throw new FulfillmentKernelError(
        "EVIDENCE_NOT_OBSERVATION",
        `Fulfillment ${receipt.id} evidence must be an observation projection, not ${evidence.projection.target.value.projectionKind}`,
      );
    }
    fieldRoots = [...await verifyProjectionWithMaterialRoots(
      evidence.projection.target,
      evidence.projection.graph,
      store,
    )];
  } else if (evidence.projection) {
    throw new FulfillmentKernelError(
      "PROJECTION_REFERENCE_MISMATCH",
      `Projection evidence supplied for fulfillment ${receipt.id}, but the canonical receipt does not reference it`,
    );
  }

  const referencedResidualIds = receipt.residualIds ?? [];
  assertUniqueResidualIds(referencedResidualIds);
  const suppliedResiduals = evidence.residualBindings ?? [];
  assertUniqueResidualIds(suppliedResiduals.map((binding) => binding.id));

  if (referencedResidualIds.length > 0 && suppliedResiduals.length === 0) {
    throw new FulfillmentKernelError(
      "RESIDUAL_EVIDENCE_MISSING",
      `Fulfillment ${receipt.id} references residual evidence without supplying bindings`,
    );
  }

  const suppliedById = new Map(suppliedResiduals.map((binding) => [binding.id, binding]));
  if (
    suppliedResiduals.length !== referencedResidualIds.length ||
    referencedResidualIds.some((id) => !suppliedById.has(id))
  ) {
    throw new FulfillmentKernelError(
      "RESIDUAL_REFERENCE_MISMATCH",
      `Fulfillment ${receipt.id} residual references do not match supplied residual bindings`,
    );
  }

  for (const id of referencedResidualIds) {
    const binding = suppliedById.get(id);
    if (!binding) {
      throw new FulfillmentKernelError(
        "RESIDUAL_REFERENCE_MISMATCH",
        `Residual ${id} was referenced but not supplied`,
      );
    }

    if (
      evidence.projection
      && !evidence.projection.target.value.residualHashes.includes(addressJson(binding).hash)
    ) {
      throw new FulfillmentKernelError(
        "RESIDUAL_NOT_IN_PROJECTION",
        `Residual ${id} is exact material evidence but is not cited by observation projection ${evidence.projection.target.hash}`,
      );
    }

    await verifyExactPcmResidual(store, binding);
  }

  return {
    need: addressedNeed,
    fulfillment: addressJson(receipt),
    materialArtifactHashes,
    fieldRoots,
    residualIds: referencedResidualIds,
  };
}

function assertUniqueResidualIds(ids: readonly string[]): void {
  if (new Set(ids).size !== ids.length) {
    throw new FulfillmentKernelError("DUPLICATE_RESIDUAL_ID", "Residual ids must be unique");
  }
}
