import {
  validateFatherhandChain,
  type AuthorityValidationReceiptV01,
  type FatherhandGrantV01,
} from "./fatherhand-grant.js";

export const PAPERCHAIN_PLANT_CAPABILITY = "paperchain.plant";
export const PAPERCHAIN_PLANT_PURPOSE = "purpose:paperchain:germination";

export interface FatherhandPaperchainPlantRequestV01 {
  schema: "tranchnode/fatherhand-paperchain-plant-request/v0.1";
  seedId: string;
  heldCrossingId: string;
  terminalGrantId: string;
  grants: FatherhandGrantV01[];
  evaluatedAt: string;
}

export interface FatherhandPaperchainPlantWitnessV01 {
  schema: "tranchnode/fatherhand-paperchain-plant-witness/v0.1";
  seedId: string;
  heldCrossingId: string;
  requiredAct: {
    capability: typeof PAPERCHAIN_PLANT_CAPABILITY;
    scopeRefs: string[];
    purposeId: typeof PAPERCHAIN_PLANT_PURPOSE;
  };
  validation: AuthorityValidationReceiptV01;
  capacityState: "valid" | "invalid" | "indeterminate";
  nonClaims: string[];
}

function nonEmpty(value: unknown, code: string): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(code);
  return value;
}

export function paperchainPlantScopeRefs(seedId: string, heldCrossingId: string): string[] {
  return [
    `paperchain-seed:${seedId}`,
    `relatte-crossing:${heldCrossingId}`,
  ].sort((a, b) => a.localeCompare(b));
}

export function makeFatherhandPaperchainPlantWitness(
  input: FatherhandPaperchainPlantRequestV01,
): FatherhandPaperchainPlantWitnessV01 {
  if (input.schema !== "tranchnode/fatherhand-paperchain-plant-request/v0.1") {
    throw new Error("INVALID_PAPERCHAIN_PLANT_REQUEST_SCHEMA");
  }

  const seedId = nonEmpty(input.seedId, "PAPERCHAIN_SEED_ID_REQUIRED");
  const heldCrossingId = nonEmpty(input.heldCrossingId, "PAPERCHAIN_HELD_CROSSING_REQUIRED");
  const terminalGrantId = nonEmpty(input.terminalGrantId, "PAPERCHAIN_TERMINAL_GRANT_REQUIRED");
  const scopeRefs = paperchainPlantScopeRefs(seedId, heldCrossingId);

  const validation = validateFatherhandChain({
    grants: input.grants,
    terminalGrantId,
    required: {
      capability: PAPERCHAIN_PLANT_CAPABILITY,
      scopeRefs,
      purposeId: PAPERCHAIN_PLANT_PURPOSE,
    },
    evaluatedAt: input.evaluatedAt,
  });

  return {
    schema: "tranchnode/fatherhand-paperchain-plant-witness/v0.1",
    seedId,
    heldCrossingId,
    requiredAct: {
      capability: PAPERCHAIN_PLANT_CAPABILITY,
      scopeRefs,
      purposeId: PAPERCHAIN_PLANT_PURPOSE,
    },
    validation,
    capacityState: validation.result,
    nonClaims: [
      "CAPACITY != CONSENT",
      "VALIDATION != ACTIVATION",
      "FATHERHAND RECEIPT != RELATTE ADMISSION",
      "receipt is deterministic validation evidence, not a cryptographic signature",
      "root capacity basis remains bounded by the underlying Fatherhand validator non-claims",
    ],
  };
}
