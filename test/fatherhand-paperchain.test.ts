import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  makeFatherhandPaperchainPlantWitness,
  PAPERCHAIN_PLANT_CAPABILITY,
  PAPERCHAIN_PLANT_PURPOSE,
  type FatherhandPaperchainPlantRequestV01,
} from "../src/fatherhand-paperchain.js";

function fixture(): FatherhandPaperchainPlantRequestV01 {
  return JSON.parse(
    readFileSync(
      new URL("../fixtures/fatherhand-grant-chain/paperchain-plant-valid.json", import.meta.url),
      "utf8",
    ),
  ) as FatherhandPaperchainPlantRequestV01;
}

test("Paperchain witness validates exact PLANT capability, held seed scope, and germination purpose", () => {
  const input = fixture();
  const witness = makeFatherhandPaperchainPlantWitness(input);
  assert.equal(witness.capacityState, "valid");
  assert.equal(witness.validation.result, "valid");
  assert.equal(witness.requiredAct.capability, PAPERCHAIN_PLANT_CAPABILITY);
  assert.equal(witness.requiredAct.purposeId, PAPERCHAIN_PLANT_PURPOSE);
  assert.deepEqual(witness.requiredAct.scopeRefs, [input.seedId, input.heldCrossingId].sort());
  assert.deepEqual(witness.validation.required, {
    capability: PAPERCHAIN_PLANT_CAPABILITY,
    scopeRefs: [input.seedId, input.heldCrossingId].sort(),
    purposeId: PAPERCHAIN_PLANT_PURPOSE,
  });
  assert.equal(witness.validation.failures.length, 0);
  assert.equal(witness.nonClaims.includes("CAPACITY != CONSENT"), true);
  assert.equal(witness.nonClaims.includes("VALIDATION != ACTIVATION"), true);
});

test("Paperchain binding cannot outrun the Fatherhand grant scope", () => {
  const input = fixture();
  input.seedId = "paperchain-seed:" + "9".repeat(64);
  const witness = makeFatherhandPaperchainPlantWitness(input);
  assert.equal(witness.capacityState, "invalid");
  assert.equal(
    witness.validation.failures.some((failure) => failure.code === "required_scope_missing"),
    true,
  );
});

test("Paperchain PLANT cannot be inferred from a different terminal capability", () => {
  const input = fixture();
  input.grants[2]!.capabilities = ["paperchain.inspect"];
  input.grants[2]!.retainedCapabilities = ["paperchain.inspect"];
  const witness = makeFatherhandPaperchainPlantWitness(input);
  assert.equal(witness.capacityState, "invalid");
  assert.equal(
    witness.validation.failures.some((failure) => failure.code === "required_capability_missing"),
    true,
  );
});

test("Paperchain Fatherhand CLI emits the same deterministic validation witness", () => {
  const fixtureUrl = new URL(
    "../fixtures/fatherhand-grant-chain/paperchain-plant-valid.json",
    import.meta.url,
  );
  const scriptUrl = new URL("../scripts/fatherhand-paperchain-plant-001.ts", import.meta.url);
  const run = spawnSync(
    process.execPath,
    ["--import", "tsx", fileURLToPath(scriptUrl), fileURLToPath(fixtureUrl)],
    { encoding: "utf8" },
  );
  assert.equal(run.status, 0, run.stderr);
  const output = JSON.parse(run.stdout);
  assert.deepEqual(output, makeFatherhandPaperchainPlantWitness(fixture()));
});
