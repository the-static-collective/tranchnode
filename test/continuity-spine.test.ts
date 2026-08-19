import assert from "node:assert/strict";
import test from "node:test";
import {
  ContinuitySpineError,
  validateContinuitySpineManifest,
  type ContinuitySpineManifestV01,
} from "../src/continuity-spine.js";

function minimalManifest(): ContinuitySpineManifestV01 {
  return {
    schema: "tranchnode/continuity-spine/v0.1",
    id: "minimal-spine",
    project: "TranchNode",
    origin: {
      id: "origin",
      status: "historical",
      sourceRef: "commit:origin",
    },
    present: {
      id: "present",
      status: "constituted",
      sourceRef: "commit:present",
    },
    attractor: {
      id: "attractor",
      status: "proposal",
      purpose: "Prove staged continuity.",
      desiredCapabilities: ["capability:b"],
      nonClaims: ["future state is not constituted by declaration"],
    },
    stageOrder: ["stage-a", "stage-b"],
    invariants: [
      {
        id: "decoder-authority-none",
        description: "Decoder remains non-authoritative.",
        sourceRef: "test:fixture",
        appliesThrough: "all",
        requiredCarries: ["decoder-authority:none"],
      },
    ],
    stages: [
      {
        id: "stage-a",
        status: "historical",
        carries: ["decoder-authority:none", "responsibility:layout-binding"],
        dependsOn: ["dependency:caller-layout-ref"],
        scaffolds: ["dependency:caller-layout-ref"],
        entryConditions: [],
        exitConditions: ["transfer:layout-binding"],
      },
      {
        id: "stage-b",
        status: "constituted",
        carries: ["decoder-authority:none", "responsibility:layout-binding"],
        dependsOn: [],
        scaffolds: [],
        entryConditions: ["witness:transfer"],
        exitConditions: [],
      },
    ],
    transfers: [
      {
        id: "transfer:layout-binding",
        responsibilityId: "responsibility:layout-binding",
        fromCarrier: "caller",
        toCarrier: "tranchnode",
        sourceStageId: "stage-a",
        destinationStageId: "stage-b",
        requiredWitnessIds: ["witness:transfer"],
        permitsShedding: ["dependency:caller-layout-ref"],
      },
    ],
  };
}

test("continuity spine rejects unsupported schema versions", () => {
  assert.throws(
    () => validateContinuitySpineManifest({ schema: "tranchnode/continuity-spine/v9" }),
    (error: unknown) => error instanceof ContinuitySpineError
      && error.code === "UNSUPPORTED_SCHEMA_VERSION",
  );
});

test("continuity spine rejects an attractor that impersonates constituted reality", () => {
  const candidate = minimalManifest() as any;
  candidate.attractor.status = "constituted";
  assert.throws(
    () => validateContinuitySpineManifest(candidate),
    (error: unknown) => error instanceof ContinuitySpineError
      && error.code === "ATTRACTOR_MUST_BE_PROPOSAL",
  );
});

test("continuity spine rejects duplicate and incomplete stage order", () => {
  const duplicate = minimalManifest() as any;
  duplicate.stageOrder = ["stage-a", "stage-a"];
  assert.throws(
    () => validateContinuitySpineManifest(duplicate),
    (error: unknown) => error instanceof ContinuitySpineError
      && error.code === "INVALID_STAGE_ORDER",
  );

  const omitted = minimalManifest() as any;
  omitted.stageOrder = ["stage-a"];
  assert.throws(
    () => validateContinuitySpineManifest(omitted),
    (error: unknown) => error instanceof ContinuitySpineError
      && error.code === "INVALID_STAGE_ORDER",
  );
});

test("continuity spine validator returns a fresh normalized manifest", () => {
  const input = minimalManifest();
  const validated = validateContinuitySpineManifest(input);

  assert.deepEqual(validated, input);
  assert.notEqual(validated, input);
  assert.notEqual(validated.stages, input.stages);
  assert.notEqual(validated.stages[0], input.stages[0]);
});
