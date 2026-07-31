import test from "node:test";
import assert from "node:assert/strict";
import { projectNeed, deriveProjectionConfidence } from "../src/tranchnode/projectNeed.ts";

test("projection derives remaining scope without mutation", () => {
  const need: any = { id: "fixture_need_breakfast_001", requestedQuantity: { value: 33, unit: "meal" } };
  const fulfillments: any[] = [{ id: "f1", outcome: "partial", fulfillment: { quantity: { value: 22, unit: "meal" } } }];
  const original = JSON.stringify({ need, fulfillments });
  const projection = projectNeed(need, fulfillments, [], "2026-07-31T21:00:00Z");
  assert.equal(projection.fulfilledQuantity?.value, 22);
  assert.equal(projection.remainingQuantity?.value, 11);
  assert.equal(projection.stillCalling, true);
  assert.equal(projection.status, "partially_answered");
  assert.equal(projection.confidence, "known");
  assert.equal(JSON.stringify({ need, fulfillments }), original);
});

test("confidence describes computability, not witness count", () => {
  const need: any = { requestedQuantity: { value: 1, unit: "repair" } };
  const uncertain: any[] = [{ outcome: "scope_uncertain", fulfillment: {} }];
  assert.equal(deriveProjectionConfidence(need, uncertain), "partial");
});
