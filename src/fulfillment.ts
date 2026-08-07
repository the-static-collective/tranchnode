import type { Hash } from "./residual.js";

export type EntityId = string;
export type ISO8601 = string;

export type Quantity = { value: number; unit: string };
export type Visibility = "private" | "participants" | "circle" | "public";
export type FulfillmentKind =
  | "meal"
  | "grocery"
  | "childcare"
  | "tutoring"
  | "repair"
  | "transport"
  | "oral_history"
  | "planting"
  | "other";
export type FulfillmentOutcome = "attempted" | "partial" | "scoped_complete" | "scope_uncertain";
export type FulfillmentOrigin = "joined_offer" | "direct_response" | "external" | "unknown";

export interface DisclosurePolicy {
  audience: Visibility;
  permittedFields: {
    summary: boolean;
    quantity: boolean;
    coarseTime: boolean;
    coarsePlace: boolean;
    exactPlace: boolean;
    participantIdentity: boolean;
    artifacts: boolean;
  };
  basis:
    | "participant_authorized"
    | "recorder_only"
    | "aggregate_only"
    | "public_event"
    | "withheld";
}

export interface ExternalProvenance {
  system?: string;
  sourceRef: string;
  sourceHash?: Hash;
}

/**
 * Canonical fulfillment bodies deliberately do not contain their own identity.
 * Address them through the shared Project0-compatible addressJson path.
 */
export interface NeedDeclared {
  id: EntityId;
  type: "NEED_DECLARED";
  version: 1;
  createdAt: ISO8601;
  createdBy: EntityId;
  visibility: Visibility;
  summary: string;
  kind: FulfillmentKind;
  requestedQuantity?: Quantity;
  disclosurePolicy: DisclosurePolicy;
}

export interface FulfillmentRecorded {
  id: EntityId;
  type: "FULFILLMENT_RECORDED";
  version: 1;
  needId: EntityId;
  needSnapshotHash: Hash;
  offerId?: EntityId;
  offerIds?: EntityId[];
  joinId?: EntityId;
  origin: FulfillmentOrigin;
  externalProvenance?: ExternalProvenance;
  outcome: FulfillmentOutcome;
  occurredAt: ISO8601;
  recordedAt: ISO8601;
  recordedBy: EntityId;
  fulfillment: {
    kind: FulfillmentKind;
    summary: string;
    quantity?: Quantity;
  };
  visibility: Visibility;
  disclosurePolicy: DisclosurePolicy;
  materialArtifactHashes?: Hash[];
  projectionReceiptHash?: Hash;
  residualIds?: string[];
}

export interface WitnessRecorded {
  id: EntityId;
  type: "WITNESS_RECORDED";
  version: 1;
  subjectId: EntityId;
  mode: "self_attested" | "participant" | "third_party" | "artifact";
  statement?: string;
  artifactHashes?: Hash[];
  witnessedAt?: ISO8601;
  recordedAt: ISO8601;
  recordedBy: EntityId;
  visibility: Visibility;
  disclosurePolicy?: DisclosurePolicy;
}

export interface NeedProjection {
  needId: EntityId;
  requestedQuantity?: Quantity;
  fulfilledQuantity?: Quantity;
  remainingQuantity?: Quantity;
  fulfillmentCount: number;
  status: "open" | "paused" | "partially_answered" | "scope_answered" | "withdrawn" | "unknown";
  stillCalling: boolean;
  confidence: "known" | "partial" | "unknown";
  lastFulfillmentId?: EntityId;
  derivedAt: ISO8601;
}

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function forbidCondition(condition: boolean, message: string): void {
  if (condition) throw new Error(message);
}

export function validateNeedDeclared(need: Record<string, unknown>): void {
  if ("status" in need) {
    throw new Error("NeedDeclared must not contain status; status is derived projection state");
  }
  if ("stillCalling" in need) {
    throw new Error("NeedDeclared must not contain stillCalling; it is derived projection state");
  }
  if ("canonicalHash" in need) {
    throw new Error("NeedDeclared must not contain canonicalHash; identity is external to the hashed body");
  }
  if ("subjectConsent" in need) {
    throw new Error("subjectConsent is not fulfillment authority; use disclosurePolicy explicitly");
  }
}

export function validateFulfillmentReceipt(receipt: FulfillmentRecorded): void {
  requireCondition(Boolean(receipt.needId), "needId required");
  requireCondition(Boolean(receipt.needSnapshotHash), "needSnapshotHash required");
  requireCondition(Boolean(receipt.origin), "origin required");
  requireCondition(Boolean(receipt.outcome), "outcome required");
  requireCondition(Boolean(receipt.fulfillment.kind), "fulfillment.kind required");
  requireCondition(Boolean(receipt.fulfillment.summary), "fulfillment.summary required");
  requireCondition(Boolean(receipt.disclosurePolicy), "disclosurePolicy required");

  const hasJoin = Boolean(receipt.joinId);
  const hasOfferIds = Boolean(receipt.offerIds?.length);
  const hasOfferId = Boolean(receipt.offerId);
  const hasExternal = Boolean(receipt.externalProvenance);

  switch (receipt.origin) {
    case "joined_offer":
      requireCondition(hasJoin, "joined_offer origin requires joinId");
      forbidCondition(hasExternal, "joined_offer must not invent externalProvenance");
      break;
    case "direct_response":
      forbidCondition(hasJoin, "direct_response must not have joinId");
      forbidCondition(hasOfferIds, "direct_response must not have offerIds");
      forbidCondition(hasOfferId, "direct_response must not claim offerId");
      forbidCondition(hasExternal, "direct_response must not have externalProvenance");
      break;
    case "external":
      requireCondition(hasExternal, "external origin requires externalProvenance");
      requireCondition(Boolean(receipt.externalProvenance?.sourceRef), "externalProvenance.sourceRef required");
      forbidCondition(hasJoin, "external origin must not claim joinId");
      break;
    case "unknown":
      forbidCondition(hasJoin, "unknown origin must not have joinId");
      forbidCondition(hasOfferIds, "unknown origin must not have offerIds");
      forbidCondition(hasOfferId, "unknown origin must not have offerId");
      forbidCondition(hasExternal, "unknown origin must not invent externalProvenance");
      break;
  }
}

export function deriveProjectionConfidence(
  need: NeedDeclared,
  fulfillments: readonly FulfillmentRecorded[],
): NeedProjection["confidence"] {
  if (!need.requestedQuantity) return "unknown";
  const applicable = fulfillments.filter((receipt) => receipt.outcome !== "attempted");
  if (
    applicable.some(
      (receipt) =>
        !receipt.fulfillment.quantity ||
        receipt.fulfillment.quantity.unit !== need.requestedQuantity?.unit ||
        receipt.outcome === "scope_uncertain",
    )
  ) {
    return "partial";
  }
  return "known";
}

export function projectNeed(
  need: NeedDeclared,
  fulfillments: readonly FulfillmentRecorded[],
  lifecycle: readonly { type: "NEED_PAUSED" | "NEED_WITHDRAWN"; recordedAt: ISO8601 }[] = [],
  now: ISO8601,
): NeedProjection {
  const requested = need.requestedQuantity;
  let fulfilledValue = 0;

  for (const receipt of fulfillments) {
    if (receipt.outcome === "attempted") continue;
    if (requested && receipt.fulfillment.quantity?.unit === requested.unit) {
      fulfilledValue += receipt.fulfillment.quantity.value;
    }
  }

  const fulfilledQuantity = requested ? { value: fulfilledValue, unit: requested.unit } : undefined;
  const remainingQuantity = requested
    ? { value: Math.max(0, requested.value - fulfilledValue), unit: requested.unit }
    : undefined;

  let status: NeedProjection["status"] = "open";
  const lastLifecycle = lifecycle.at(-1);
  if (lastLifecycle?.type === "NEED_PAUSED") status = "paused";
  else if (lastLifecycle?.type === "NEED_WITHDRAWN") status = "withdrawn";
  else if (remainingQuantity?.value === 0) status = "scope_answered";
  else if (fulfilledValue > 0) status = "partially_answered";

  const projection: NeedProjection = {
    needId: need.id,
    fulfillmentCount: fulfillments.length,
    status,
    stillCalling: status === "open" || status === "partially_answered",
    confidence: deriveProjectionConfidence(need, fulfillments),
    derivedAt: now,
  };
  if (requested) projection.requestedQuantity = requested;
  if (fulfilledQuantity) projection.fulfilledQuantity = fulfilledQuantity;
  if (remainingQuantity) projection.remainingQuantity = remainingQuantity;
  const lastFulfillmentId = fulfillments.at(-1)?.id;
  if (lastFulfillmentId) projection.lastFulfillmentId = lastFulfillmentId;
  return projection;
}
