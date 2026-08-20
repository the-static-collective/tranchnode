import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { ContinuitySpineManifestV01 } from "../src/continuity-spine.js";
import {
  ContinuityBoundaryWitnessError,
  deriveContinuityBoundaryWitness,
} from "../src/continuity-boundary-witness.js";

const fixture = JSON.parse(
  readFileSync(
    new URL("../fixtures/continuity-spine/intent-stroke-v01-to-v02.json", import.meta.url),
    "utf8",
  ),
) as ContinuitySpineManifestV01;

const suppliedWitnesses = [
  "witness:pr54-green",
  "witness:pr54-boundary-review",
];

function derive(overrides: Partial<Parameters<typeof deriveContinuityBoundaryWitness>[0]> = {}) {
  return deriveContinuityBoundaryWitness({
    spine: fixture,
    fromStageId: "v0.1-caller-bound",
    toStageId: "v0.1-v0.2-overlap",
    suppliedWitnesses,
    unresolvedRefs: ["collision-policy:unresolved"],
    ...overrides,
  });
}

test("real Intent Stroke boundary preserves local continuity distinctions", () => {
  const addressed = derive();

  assert.match(addressed.hash, /^sha256:[0-9a-f]{64}$/);
  assert.deepEqual(addressed.value, {
    schema: "tranchnode/continuity-boundary-witness/v0.1",
    spineId: "intent-stroke-v01-to-v02",
    fromStageId: "v0.1-caller-bound",
    toStageId: "v0.1-v0.2-overlap",
    originRef: "pull-request:50",
    presentRef: "pull-request:54",
    preserved: [
      "decoder-authority:none",
      "interface:intent-stroke-stdio-v0.1",
      "responsibility:canonical-layout-binding",
      "transport-authority:none",
    ],
    differentiated: [
      "interface:intent-stroke-stdio-v0.2",
      "layout-binding:tranchnode",
    ],
    lost: ["dependency:caller-constructs-fieldLayoutRef"],
    unresolved: ["collision-policy:unresolved"],
    completedTransferIds: ["transfer:canonical-layout-binding-to-tranchnode"],
    transitionWitnessRefs: [
      "witness:pr54-boundary-review",
      "witness:pr54-green",
    ],
    authority: "none",
    occurrenceClaim: "transition-witness-only",
  });
});

test("witness identity is deterministic across caller ordering", () => {
  const first = derive();
  const second = derive({
    suppliedWitnesses: [...suppliedWitnesses].reverse(),
    unresolvedRefs: ["collision-policy:unresolved"],
  });
  assert.deepEqual(second, first);
});

test("missing transfer witness refuses publication", () => {
  assert.throws(
    () => derive({ suppliedWitnesses: ["witness:pr54-green"] }),
    (error: unknown) => error instanceof ContinuityBoundaryWitnessError
      && error.code === "TRANSITION_NOT_ADMISSIBLE",
  );
});

test("proposal destination cannot be published as occurred boundary witness", () => {
  const proposalFixture: ContinuitySpineManifestV01 = {
    ...fixture,
    stages: fixture.stages.map((stage) => stage.id === "v0.1-v0.2-overlap"
      ? { ...stage, status: "proposal" }
      : stage),
  };

  assert.throws(
    () => derive({ spine: proposalFixture }),
    (error: unknown) => error instanceof ContinuityBoundaryWitnessError
      && error.code === "PROPOSAL_DESTINATION_NOT_WITNESSABLE",
  );
});

test("fabricated unresolved ref fails closed", () => {
  assert.throws(
    () => derive({ unresolvedRefs: ["not-present"] }),
    (error: unknown) => error instanceof ContinuityBoundaryWitnessError
      && error.code === "UNRESOLVED_REF_NOT_PRESENT",
  );
});

test("invalid unresolved inputs fail closed without string inference", () => {
  assert.throws(
    () => derive({ unresolvedRefs: ["collision-policy:unresolved", "collision-policy:unresolved"] }),
    (error: unknown) => error instanceof ContinuityBoundaryWitnessError
      && error.code === "INVALID_UNRESOLVED_REFS",
  );
});

test("derivation does not mutate the source fixture", () => {
  const before = JSON.stringify(fixture);
  derive();
  assert.equal(JSON.stringify(fixture), before);
});
