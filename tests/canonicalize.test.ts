import test from "node:test";
import assert from "node:assert/strict";
import { canonicalize, canonicalizeAndHash } from "../src/tranchnode/canonicalize.ts";

test("canonicalization ignores key insertion order and canonicalHash", async () => {
  const a = { id: "1", summary: "meal", requestedQuantity: { value: 33, unit: "meal" } };
  const b = { canonicalHash: "sha256:ignored", requestedQuantity: { unit: "meal", value: 33 }, summary: "meal", id: "1" };
  assert.equal(canonicalize(a).bytes, canonicalize(b).bytes);
  assert.equal((await canonicalizeAndHash(a)).hash, (await canonicalizeAndHash(b)).hash);
});

test("canonicalization rejects undefined and non-finite numbers", () => {
  assert.throws(() => canonicalize({ x: undefined }), /undefined/);
  assert.throws(() => canonicalize({ x: Number.NaN }), /non-finite/);
});
