import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validateFatherhandChain } from "../src/fatherhand-grant.js";
import { replayFatherhandGrantChain } from "../scripts/fatherhand-grant-chain-001.js";

function fixture(): any {
  return JSON.parse(
    readFileSync(new URL("../fixtures/fatherhand-grant-chain/valid-three-hand.json", import.meta.url), "utf8")
  );
}

test("valid three-hand chain authorizes only the exact terminal capability, scope, and purpose", () => {
  const result = replayFatherhandGrantChain(fixture());
  assert.equal(result.result, "valid");
  assert.deepEqual(result.chain, ["grant:A", "grant:B", "grant:C"]);
  assert.equal(result.failures.length, 0);
});

test("no hand may give capability it did not receive for delegation", () => {
  const input = fixture();
  input.grants[2].capabilities.push("revoke_build_intent");
  const result = validateFatherhandChain(input);
  assert.equal(result.result, "invalid");
  assert.equal(result.failures.some((f) => f.code === "capability_enlargement"), true);
});

test("no hand may enlarge delegated scope", () => {
  const input = fixture();
  input.grants[2].scopeRefs.push("scope:beta");
  const result = validateFatherhandChain(input);
  assert.equal(result.result, "invalid");
  assert.equal(result.failures.some((f) => f.code === "scope_enlargement"), true);
});

test("no hand may conceal or substitute its immediate parent", () => {
  const input = fixture();
  input.grants[2].parentSeal = "seal:other";
  const result = validateFatherhandChain(input);
  assert.equal(result.result, "invalid");
  assert.equal(result.failures.some((f) => f.code === "parent_seal_mismatch"), true);
});

test("no hand may revive a capability extinguished before delegation", () => {
  const input = fixture();
  input.grants[1].extinguishments = [{
    capability: "declare_build_intent",
    effectiveAt: "2026-10-02T12:00:00Z",
    ref: "extinguishment:B:declare"
  }];
  input.grants[2].issuedAt = "2026-10-03T00:00:00Z";
  const result = validateFatherhandChain(input);
  assert.equal(result.result, "invalid");
  assert.equal(result.failures.some((f) => f.code === "extinguished_parent_capability"), true);
});

test("nontransferable or expired parents cannot create live descendants", () => {
  const nontransferable = fixture();
  nontransferable.grants[1].transferable = false;
  const a = validateFatherhandChain(nontransferable);
  assert.equal(a.failures.some((f) => f.code === "nontransferable_parent"), true);

  const expired = fixture();
  expired.grants[1].expiresAt = "2026-10-02T12:00:00Z";
  const b = validateFatherhandChain(expired);
  assert.equal(b.failures.some((f) => f.code === "expired_chain"), true);
});

test("ordinary delegation cannot transform purpose by expansion or replacement", () => {
  const input = fixture();
  input.grants[2].purpose.relation = "replaces";
  const result = validateFatherhandChain(input);
  assert.equal(result.result, "invalid");
  assert.equal(result.failures.some((f) => f.code === "purpose_transformation"), true);
});

test("required act cannot outrun terminal capability, scope, or purpose", () => {
  const input = fixture();
  input.required = {
    capability: "observe",
    scopeRefs: ["scope:beta"],
    purposeId: "purpose:other"
  };
  const result = validateFatherhandChain(input);
  assert.equal(result.result, "invalid");
  assert.equal(result.failures.some((f) => f.code === "required_capability_missing"), true);
  assert.equal(result.failures.some((f) => f.code === "required_scope_missing"), true);
  assert.equal(result.failures.some((f) => f.code === "required_purpose_mismatch"), true);
});

test("indeterminate root capacity basis preserves uncertainty instead of fabricating validity", () => {
  const input = fixture();
  input.grants[0].rootCapacityBasis = "indeterminate";
  input.grants[0].rootCapacityBasisRef = "claim:root-basis-unresolved";
  const result = validateFatherhandChain(input);
  assert.equal(result.result, "indeterminate");
  assert.equal(result.failures.length, 0);
  assert.equal(result.uncertainties.length, 1);
});

test("validator is deterministic and does not mutate supplied grants", () => {
  const input = fixture();
  const before = structuredClone(input);
  const a = validateFatherhandChain(input);
  const b = validateFatherhandChain(structuredClone(input));
  assert.deepEqual(input, before);
  assert.deepEqual(a, b);
});
