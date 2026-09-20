import assert from "node:assert/strict";
import test from "node:test";
import { addressJson } from "../src/residual.js";
import { proposeStoryshipElfContinuity } from "../src/storyship-elf-continuity.js";

const body = {
  schema: "storyship/elf-continuity-evidence/v0",
  ark_id: "sha256:" + "a".repeat(64),
  origin_occurrence_id: "b".repeat(32),
  origin_receipt_sha256: "sha256:" + "c".repeat(64),
  declared_parent_receipt_sha256: null,
  artifact_sha256: "sha256:" + "d".repeat(64),
  arrival_id: "sha256:" + "e".repeat(64),
  arrival_occurrence_id: "11111111-1111-4111-8111-111111111111",
  local_material: "verified",
  cold_boot: "not_observed",
  original_elf_execution: "not_verified",
  successor_elf: "not_observed",
  external_witness: "none",
  destination_status: "materialized_unadmitted",
  authority: "none",
};
function evidence() { return { ...body, evidence_id: addressJson(body).hash }; }

test("creates an addressed proposal rather than admitting source assertions", () => {
  const first = proposeStoryshipElfContinuity(evidence());
  assert.deepEqual(first, proposeStoryshipElfContinuity(evidence()));
  assert.match(first.hash, /^sha256:[0-9a-f]{64}$/);
  assert.equal(first.value.authority, "none");
  assert.equal(first.value.adoption, "not_attempted");
  assert.equal(first.value.coldBoot, "not_observed");
  assert.equal(first.value.successorOccurrence, "not_observed");
  assert.equal(first.value.localMaterial, "storyship-reported-verified");
  assert.equal(first.value.externalMaterialVerification, "not_performed");
});
test("refuses corrupted digest, forged boot, claimed successor or transferred authority", () => {
  for (const changed of [
    { artifact_sha256: "sha256:" + "f".repeat(64) },
    { cold_boot: "verified" },
    { successor_elf: "verified" },
    { authority: "root" },
    { destination_status: "admitted" },
    { evidence_id: "sha256:" + "0".repeat(64) },
    { executable_warrant: "yes" },
  ]) {
    assert.throws(() => proposeStoryshipElfContinuity({...evidence(), ...changed}));
  }
});
test("input is not mutated or promoted to a TranchNode occurrence", () => {
  const source = evidence();
  const copy = JSON.stringify(source);
  const result = proposeStoryshipElfContinuity(source);
  assert.equal(JSON.stringify(source), copy);
  assert.equal(result.value.schema, "tranchnode/storyship-elf-continuity-proposal/v0");
  assert.equal(result.value.proposedNextStage, "independently_verify_new_elf");
});
