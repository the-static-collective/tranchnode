import type { FulfillmentRecorded } from "./ontology/fulfillment.ts";

function requireCond(cond: boolean, msg: string): void { if (!cond) throw new Error(msg); }
function forbidCond(cond: boolean, msg: string): void { if (cond) throw new Error(msg); }

export function validateFulfillmentReceipt(r: FulfillmentRecorded): void {
  requireCond(!!r.needId, "needId required");
  requireCond(!!r.needSnapshotHash, "needSnapshotHash required");
  requireCond(!!r.outcome, "outcome required");
  requireCond(!!r.origin, "origin required");
  requireCond(!!r.fulfillment?.kind, "fulfillment.kind required");
  requireCond(!!r.fulfillment?.summary, "fulfillment.summary required");
  requireCond(!!r.disclosurePolicy, "disclosurePolicy required");

  const hasJoin = !!r.joinId;
  const hasOfferIds = !!r.offerIds?.length;
  const hasOfferId = !!r.offerId;
  const hasExternal = !!r.externalProvenance;

  switch (r.origin) {
    case "joined_offer":
      requireCond(hasJoin, "joined_offer origin requires joinId");
      forbidCond(hasExternal, "joined_offer must not have externalProvenance");
      break;
    case "direct_response":
      forbidCond(hasJoin, "direct_response must not have joinId");
      forbidCond(hasOfferIds, "direct_response must not have offerIds");
      forbidCond(hasOfferId, "direct_response should not claim offerId - it answered need directly");
      forbidCond(hasExternal, "direct_response must not have externalProvenance");
      break;
    case "external":
      requireCond(hasExternal, "external origin requires externalProvenance");
      requireCond(!!r.externalProvenance?.sourceRef, "externalProvenance.sourceRef required");
      forbidCond(hasJoin, "external must not have joinId - link later via PROVENANCE_LINK_RECORDED");
      break;
    case "unknown":
      forbidCond(hasJoin, "unknown origin must not have joinId");
      forbidCond(hasOfferIds, "unknown origin must not have offerIds");
      forbidCond(hasOfferId, "unknown origin must not have offerId");
      forbidCond(hasExternal, "unknown origin must not have externalProvenance");
      break;
  }
}

export function validateNeedDeclared(n: Record<string, unknown>): void {
  if ("status" in n) throw new Error("NeedDeclared must not contain status - status belongs in NeedProjection or lifecycle events");
  if ("stillCalling" in n) throw new Error("NeedDeclared must not contain stillCalling - derived only");
  if ("subjectConsent" in n) throw new Error("subjectConsent is forbidden - use disclosurePolicy.permittedFields and basis");
}
