import type {
  MaterialRootStore,
  ProjectionGraph,
  ProjectionReceipt,
} from "./projection.js";
import { verifyProjectionWithMaterialRoots } from "./projection.js";
import type { Addressed, Hash, ResidualBinding } from "./residual.js";
import { addressJson } from "./residual.js";
import { verifyExactPcmResidual } from "./wav-pcm.js";

export type FulfillmentOutcome =
  | "attempted"
  | "partial"
  | "scoped_complete"
  | "scope_uncertain";

export type FulfillmentOrigin =
  | "joined_offer"
  | "direct_response"
  | "external"
  | "unknown";

export interface Quantity {
  value: number;
  unit: string;
}

export interface NeedDeclared {
  kind: "need_declared";
  summary: string;
  requestedQuantity?: Quantity;
}

export interface ExternalProvenance {
  sourceRef: string;
  sourceHash?: Hash;
}

export interface FulfillmentRecorded {
  kind: "fulfillment_recorded";
  needHash: Hash;
  evidenceProjectionHash: Hash;
  residualHashes: Hash[];
  origin: FulfillmentOrigin;
  joinHash?: Hash;
  offerHash?: Hash;
  externalProvenance?: ExternalProvenance;
  outcome: FulfillmentOutcome;
  fulfillment: {
    kind: string;
    summary: string;
    quantity?: Quantity;
  };
  occurredAt: string;
  recordedAt: string;
  recordedBy: string;
  uncertainty: string;
}

export interface FulfillmentVerification {
  fieldRoots: ReadonlySet<Hash>;
  verifiedResidualHashes: readonly Hash[];
}

export class FulfillmentError extends Error {
  constructor(
    public readonly code:
      | "NEED_IDENTITY_MISMATCH"
      | "FULFILLMENT_IDENTITY_MISMATCH"
      | "NEED_REFERENCE_MISMATCH"
      | "EVIDENCE_PROJECTION_REFERENCE_MISMATCH"
      | "EVIDENCE_NOT_OBSERVATION"
      | "ORIGIN_PROVENANCE_MISMATCH"
      | "MISSING_RESIDUAL"
      | "RESIDUAL_IDENTITY_MISMATCH"
      | "RESIDUAL_NOT_IN_PROJECTION",
    message: string,
  ) {
    super(message);
    this.name = "FulfillmentError";
  }
}

export function addressNeed(need: NeedDeclared): Addressed<NeedDeclared> {
  return addressJson(need);
}

export function addressFulfillment(
  fulfillment: FulfillmentRecorded,
): Addressed<FulfillmentRecorded> {
  validateFulfillmentSemantics(fulfillment);
  return addressJson(fulfillment);
}

export function validateFulfillmentSemantics(fulfillment: FulfillmentRecorded): void {
  const hasJoin = fulfillment.joinHash !== undefined;
  const hasOffer = fulfillment.offerHash !== undefined;
  const hasExternal = fulfillment.externalProvenance !== undefined;

  switch (fulfillment.origin) {
    case "joined_offer":
      if (!hasJoin || !hasOffer || hasExternal) {
        throw new FulfillmentError(
          "ORIGIN_PROVENANCE_MISMATCH",
          "joined_offer requires joinHash and offerHash and forbids external provenance",
        );
      }
      break;
    case "direct_response":
      if (hasJoin || hasOffer || hasExternal) {
        throw new FulfillmentError(
          "ORIGIN_PROVENANCE_MISMATCH",
          "direct_response must not claim join, offer, or external provenance",
        );
      }
      break;
    case "external":
      if (
        !hasExternal ||
        !fulfillment.externalProvenance?.sourceRef ||
        hasJoin ||
        hasOffer
      ) {
        throw new FulfillmentError(
          "ORIGIN_PROVENANCE_MISMATCH",
          "external origin requires a sourceRef and must not claim join or offer lineage",
        );
      }
      break;
    case "unknown":
      if (hasJoin || hasOffer || hasExternal) {
        throw new FulfillmentError(
          "ORIGIN_PROVENANCE_MISMATCH",
          "unknown origin must remain unknown; provenance may not be silently invented",
        );
      }
      break;
  }
}

export async function verifyFulfillmentCrossing(input: {
  need: Addressed<NeedDeclared>;
  fulfillment: Addressed<FulfillmentRecorded>;
  evidenceProjection: Addressed<ProjectionReceipt>;
  projectionGraph: ProjectionGraph;
  store: MaterialRootStore;
  residuals: ReadonlyMap<Hash, Addressed<ResidualBinding>>;
}): Promise<FulfillmentVerification> {
  assertAddressIdentity(input.need, "NEED_IDENTITY_MISMATCH");
  assertAddressIdentity(input.fulfillment, "FULFILLMENT_IDENTITY_MISMATCH");
  validateFulfillmentSemantics(input.fulfillment.value);

  if (input.fulfillment.value.needHash !== input.need.hash) {
    throw new FulfillmentError(
      "NEED_REFERENCE_MISMATCH",
      `Fulfillment references ${input.fulfillment.value.needHash}, not need ${input.need.hash}`,
    );
  }
  if (input.fulfillment.value.evidenceProjectionHash !== input.evidenceProjection.hash) {
    throw new FulfillmentError(
      "EVIDENCE_PROJECTION_REFERENCE_MISMATCH",
      "Fulfillment does not reference the supplied evidence projection",
    );
  }
  if (input.evidenceProjection.value.projectionKind !== "observation") {
    throw new FulfillmentError(
      "EVIDENCE_NOT_OBSERVATION",
      "Fulfillment evidence must be an observation projection; proposal or tension is not witness evidence",
    );
  }

  const fieldRoots = await verifyProjectionWithMaterialRoots(
    input.evidenceProjection,
    input.projectionGraph,
    input.store,
  );

  const verifiedResidualHashes: Hash[] = [];
  for (const residualHash of input.fulfillment.value.residualHashes) {
    if (!input.evidenceProjection.value.residualHashes.includes(residualHash)) {
      throw new FulfillmentError(
        "RESIDUAL_NOT_IN_PROJECTION",
        `Fulfillment cites residual ${residualHash} that the evidence projection does not cite`,
      );
    }
    const residual = input.residuals.get(residualHash);
    if (!residual) {
      throw new FulfillmentError(
        "MISSING_RESIDUAL",
        `Fulfillment cites unavailable residual ${residualHash}`,
      );
    }
    if (addressJson(residual.value).hash !== residual.hash || residual.hash !== residualHash) {
      throw new FulfillmentError(
        "RESIDUAL_IDENTITY_MISMATCH",
        `Residual body does not match declared identity ${residualHash}`,
      );
    }
    await verifyExactPcmResidual(input.store, residual.value);
    verifiedResidualHashes.push(residualHash);
  }

  return { fieldRoots, verifiedResidualHashes };
}

function assertAddressIdentity<T>(
  addressed: Addressed<T>,
  code: "NEED_IDENTITY_MISMATCH" | "FULFILLMENT_IDENTITY_MISMATCH",
): void {
  if (addressJson(addressed.value).hash !== addressed.hash) {
    throw new FulfillmentError(code, `Addressed body does not match ${addressed.hash}`);
  }
}
