import test from "node:test";
import assert from "node:assert/strict";
import { validateFulfillmentReceipt, validateNeedDeclared } from "../src/tranchnode/validateFulfillment.ts";

const base: any = {
  needId: "need_001",
  needSnapshotHash: "sha256:abc",
  outcome: "partial",
  fulfillment: { kind: "meal", summary: "test" },
  occurredAt: "2026-07-31",
  recordedAt: "2026-07-31T20:00:00Z",
  recordedBy: "actor_1",
  visibility: "circle",
  disclosurePolicy: {
    audience: "circle",
    permittedFields: { summary: true, quantity: true, coarseTime: true, coarsePlace: false, exactPlace: false, participantIdentity: false, artifacts: false },
    basis: "aggregate_only"
  }
};

test("canonical Need excludes derived fields", () => {
  assert.throws(() => validateNeedDeclared({ id: "n1", status: "open" }), /status/);
  assert.throws(() => validateNeedDeclared({ id: "n1", subjectConsent: "not_required" }), /subjectConsent/);
});

test("joined_offer requires joinId", () => {
  assert.throws(() => validateFulfillmentReceipt({ ...base, origin: "joined_offer" }), /joinId/);
  assert.doesNotThrow(() => validateFulfillmentReceipt({ ...base, origin: "joined_offer", joinId: "join_1" }));
});

test("direct_response excludes Offer provenance", () => {
  assert.throws(() => validateFulfillmentReceipt({ ...base, origin: "direct_response", offerId: "offer_1" }), /offerId/);
  assert.doesNotThrow(() => validateFulfillmentReceipt({ ...base, origin: "direct_response" }));
});

test("unknown origin excludes invented provenance", () => {
  assert.throws(() => validateFulfillmentReceipt({ ...base, origin: "unknown", joinId: "join_1" }), /joinId/);
});
