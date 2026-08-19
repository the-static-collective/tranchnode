import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  ContinuitySpineError,
  evaluateStageTransition,
  validateContinuitySpineManifest,
  type ContinuitySpineManifestV01,
} from "../src/continuity-spine.js";

const FIXTURE_PATH = "fixtures/continuity-spine/intent-stroke-v01-to-v02.json";

async function rawFixture(): Promise<any> {
  return JSON.parse(await readFile(FIXTURE_PATH, "utf8"));
}

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

test("witnessed transfer permits the declared scaffold to be shed", () => {
  const result = evaluateStageTransition({
    spine: minimalManifest(),
    fromStageId: "stage-a",
    toStageId: "stage-b",
    suppliedWitnesses: ["witness:transfer"],
  });

  assert.equal(result.decision, "admissible");
  assert.deepEqual(result.shed, ["dependency:caller-layout-ref"]);
  assert.deepEqual(result.completedTransferIds, ["transfer:layout-binding"]);
  assert.deepEqual(result.findings, []);
});

test("proposal destination can be structurally admissible without becoming constituted", () => {
  const spine = minimalManifest();
  const destination = spine.stages[1];
  assert.ok(destination);
  destination.status = "proposal";
  const result = evaluateStageTransition({
    spine,
    fromStageId: "stage-a",
    toStageId: "stage-b",
    suppliedWitnesses: ["witness:transfer"],
  });

  assert.equal(result.decision, "admissible");
  assert.ok(result.findings.some((finding) => finding.class === "proposal_only"));
});

test("missing transfer witness blocks a shed permitted by that transfer", () => {
  const result = evaluateStageTransition({
    spine: minimalManifest(),
    fromStageId: "stage-a",
    toStageId: "stage-b",
    suppliedWitnesses: [],
  });

  assert.equal(result.decision, "blocked");
  assert.ok(result.findings.some((finding) => finding.class === "blocked_unwitnessed_transfer"));
  assert.ok(result.findings.some((finding) => finding.class === "blocked_premature_shedding"));
});

test("active invariant loss blocks the transition", () => {
  const spine = minimalManifest();
  const destination = spine.stages[1];
  assert.ok(destination);
  destination.carries = destination.carries.filter(
    (id) => id !== "decoder-authority:none",
  );
  const result = evaluateStageTransition({
    spine,
    fromStageId: "stage-a",
    toStageId: "stage-b",
    suppliedWitnesses: ["witness:transfer"],
  });

  assert.equal(result.decision, "blocked");
  assert.ok(result.findings.some((finding) => finding.class === "blocked_invariant_loss"));
});

test("backward transition is invalid rather than merely blocked", () => {
  const result = evaluateStageTransition({
    spine: minimalManifest(),
    fromStageId: "stage-b",
    toStageId: "stage-a",
    suppliedWitnesses: [],
  });

  assert.equal(result.decision, "invalid");
  assert.ok(result.findings.some((finding) => finding.class === "invalid_manifest"));
});

test("Intent Stroke v0.1 -> v0.2 proves overlap, witnessed transfer, and lawful shedding", async () => {
  const spine = validateContinuitySpineManifest(await rawFixture());
  const result = evaluateStageTransition({
    spine,
    fromStageId: "v0.1-caller-bound",
    toStageId: "v0.1-v0.2-overlap",
    suppliedWitnesses: ["witness:pr54-green", "witness:pr54-boundary-review"],
  });

  assert.equal(result.decision, "admissible");
  assert.deepEqual(result.shed, ["dependency:caller-constructs-fieldLayoutRef"]);
  assert.deepEqual(
    result.completedTransferIds,
    ["transfer:canonical-layout-binding-to-tranchnode"],
  );
  assert.equal(
    result.findings.some((finding) => finding.class.startsWith("blocked_")),
    false,
  );
});

test("Intent Stroke transfer witness is required before caller layout binding may be shed", async () => {
  const spine = validateContinuitySpineManifest(await rawFixture());
  const result = evaluateStageTransition({
    spine,
    fromStageId: "v0.1-caller-bound",
    toStageId: "v0.1-v0.2-overlap",
    suppliedWitnesses: [],
  });

  assert.equal(result.decision, "blocked");
  assert.ok(result.findings.some((finding) => finding.class === "blocked_unwitnessed_transfer"));
  assert.ok(result.findings.some((finding) => finding.class === "blocked_premature_shedding"));
});

test("Intent Stroke destination cannot drop decoder non-authority", async () => {
  const candidate = await rawFixture();
  const destination = candidate.stages.find(
    (stage: any) => stage.id === "v0.1-v0.2-overlap",
  );
  assert.ok(destination);
  destination.carries = destination.carries.filter(
    (id: string) => id !== "decoder-authority:none",
  );
  const result = evaluateStageTransition({
    spine: candidate,
    fromStageId: "v0.1-caller-bound",
    toStageId: "v0.1-v0.2-overlap",
    suppliedWitnesses: ["witness:pr54-green", "witness:pr54-boundary-review"],
  });

  assert.equal(result.decision, "blocked");
  assert.ok(result.findings.some((finding) => finding.class === "blocked_invariant_loss"));
});

test("Intent Stroke attractor cannot become constituted merely because it is desired", async () => {
  const candidate = await rawFixture();
  candidate.attractor.status = "constituted";

  assert.throws(
    () => validateContinuitySpineManifest(candidate),
    (error: unknown) => error instanceof ContinuitySpineError
      && error.code === "ATTRACTOR_MUST_BE_PROPOSAL",
  );
});

test("Intent Stroke overlap must preserve the v0.1 compatibility obligation", async () => {
  const candidate = await rawFixture();
  const destination = candidate.stages.find(
    (stage: any) => stage.id === "v0.1-v0.2-overlap",
  );
  assert.ok(destination);
  destination.carries = destination.carries.filter(
    (id: string) => id !== "interface:intent-stroke-stdio-v0.1",
  );
  const result = evaluateStageTransition({
    spine: candidate,
    fromStageId: "v0.1-caller-bound",
    toStageId: "v0.1-v0.2-overlap",
    suppliedWitnesses: ["witness:pr54-green", "witness:pr54-boundary-review"],
  });

  assert.equal(result.decision, "blocked");
  assert.ok(result.findings.some((finding) => finding.class === "blocked_invariant_loss"));
});

test("Intent Stroke refuses to drop responsibility when no transfer carries it forward", async () => {
  const candidate = await rawFixture();
  const destination = candidate.stages.find(
    (stage: any) => stage.id === "v0.1-v0.2-overlap",
  );
  assert.ok(destination);
  destination.carries = destination.carries.filter(
    (id: string) => id !== "responsibility:canonical-layout-binding",
  );
  candidate.transfers = [];

  const result = evaluateStageTransition({
    spine: candidate,
    fromStageId: "v0.1-caller-bound",
    toStageId: "v0.1-v0.2-overlap",
    suppliedWitnesses: [],
  });

  assert.equal(result.decision, "blocked");
  assert.ok(
    result.findings.some(
      (finding) => finding.class === "blocked_untransferred_responsibility"
        && finding.reason === "RESPONSIBILITY_DROPPED_WITHOUT_TRANSFER",
    ),
  );
});

test("transition evaluation does not mutate manifest or supplied witnesses", async () => {
  const spine = await rawFixture();
  const witnesses = ["witness:pr54-green", "witness:pr54-boundary-review"];
  const spineBefore = structuredClone(spine);
  const witnessesBefore = [...witnesses];

  evaluateStageTransition({
    spine,
    fromStageId: "v0.1-caller-bound",
    toStageId: "v0.1-v0.2-overlap",
    suppliedWitnesses: witnesses,
  });

  assert.deepEqual(spine, spineBefore);
  assert.deepEqual(witnesses, witnessesBefore);
});

test("repeated transition evaluation is structurally stable", async () => {
  const spine = validateContinuitySpineManifest(await rawFixture());
  const input = {
    spine,
    fromStageId: "v0.1-caller-bound",
    toStageId: "v0.1-v0.2-overlap",
    suppliedWitnesses: ["witness:pr54-green", "witness:pr54-boundary-review"],
  };

  assert.deepEqual(evaluateStageTransition(input), evaluateStageTransition(input));
});

test("supplied witness order cannot alter transition evaluation", async () => {
  const spine = validateContinuitySpineManifest(await rawFixture());
  const forward = evaluateStageTransition({
    spine,
    fromStageId: "v0.1-caller-bound",
    toStageId: "v0.1-v0.2-overlap",
    suppliedWitnesses: ["witness:pr54-green", "witness:pr54-boundary-review"],
  });
  const reversed = evaluateStageTransition({
    spine,
    fromStageId: "v0.1-caller-bound",
    toStageId: "v0.1-v0.2-overlap",
    suppliedWitnesses: ["witness:pr54-boundary-review", "witness:pr54-green"],
  });

  assert.deepEqual(forward, reversed);
});

test("unknown supplied witness fails closed", async () => {
  const spine = validateContinuitySpineManifest(await rawFixture());
  const result = evaluateStageTransition({
    spine,
    fromStageId: "v0.1-caller-bound",
    toStageId: "v0.1-v0.2-overlap",
    suppliedWitnesses: ["witness:pr54-green", "witness:not-declared"],
  });

  assert.equal(result.decision, "invalid");
  assert.ok(
    result.findings.some(
      (finding) => finding.class === "invalid_manifest"
        && finding.subjectId === "witness:not-declared"
        && finding.reason === "UNKNOWN_SUPPLIED_WITNESS",
    ),
  );
});
