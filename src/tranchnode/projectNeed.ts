import type { FulfillmentRecorded, NeedDeclared, NeedProjection, ISO8601 } from "./ontology/fulfillment.ts";

export function deriveProjectionConfidence(need: NeedDeclared, fulfillments: readonly FulfillmentRecorded[]): "known" | "partial" | "unknown" {
  if (!need.requestedQuantity) return "unknown";
  const applicable = fulfillments.filter((r) => r.outcome !== "attempted");
  if (applicable.some((r) => !r.fulfillment.quantity || r.fulfillment.quantity.unit !== need.requestedQuantity!.unit || r.outcome === "scope_uncertain")) return "partial";
  return "known";
}

export function projectNeed(
  need: NeedDeclared,
  fulfillments: readonly FulfillmentRecorded[],
  lifecycle: readonly { type: string; recordedAt: ISO8601 }[] = [],
  now: ISO8601 = new Date().toISOString(),
): NeedProjection {
  const requested = need.requestedQuantity;
  let fulfilledValue = 0;
  let unit = requested?.unit;
  for (const fulfillment of fulfillments) {
    if (fulfillment.outcome === "attempted") continue;
    if (fulfillment.fulfillment.quantity?.unit === requested?.unit) {
      fulfilledValue += fulfillment.fulfillment.quantity.value;
      unit = fulfillment.fulfillment.quantity.unit;
    }
  }
  const fulfilledQuantity = requested ? { value: fulfilledValue, unit: unit! } : undefined;
  const remainingQuantity = requested && fulfilledQuantity ? { value: Math.max(0, requested.value - fulfilledQuantity.value), unit: requested.unit } : undefined;
  let status: NeedProjection["status"] = "open";
  const lastLifecycle = lifecycle.at(-1);
  if (lastLifecycle?.type === "NEED_PAUSED") status = "paused";
  else if (lastLifecycle?.type === "NEED_WITHDRAWN") status = "withdrawn";
  else if (remainingQuantity?.value === 0) status = "scope_answered";
  else if (fulfilledValue > 0) status = "partially_answered";
  return {
    needId: need.id,
    requestedQuantity: requested,
    fulfilledQuantity,
    remainingQuantity,
    fulfillmentCount: fulfillments.length,
    status,
    stillCalling: status === "open" || status === "partially_answered",
    confidence: deriveProjectionConfidence(need, fulfillments),
    lastFulfillmentId: fulfillments.at(-1)?.id,
    derivedAt: now,
  };
}
