import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  addressIntentStroke,
  addressIntentStrokeFieldLayout,
  type IntentStroke,
  type IntentStrokeFieldLayout,
} from "../src/intent-stroke.js";

function makeRequest() {
  const layout: IntentStrokeFieldLayout = {
    schema: "tranchnode/intent-stroke-layout/v0.1",
    anchors: [
      { id: "garden", x: 0, y: 0 },
      { id: "corpus", x: 100, y: 0 },
      { id: "upper-room", x: 0, y: 100 },
    ],
  };
  const addressedLayout = addressIntentStrokeFieldLayout(layout);
  const stroke: IntentStroke = {
    schema: "tranchnode/intent-stroke/v0.1",
    fieldLayoutRef: addressedLayout.hash,
    points: [
      { sequence: 0, x: 0, y: 0 },
      { sequence: 1, x: 100, y: 0 },
    ],
  };
  const addressedStroke = addressIntentStroke(stroke);
  return {
    schema: "tranchnode.intent-stroke-process/v0.1",
    operation: "decode",
    stroke: addressedStroke.value,
    layout: addressedLayout.value,
    templates: [
      { id: "garden-to-corpus", anchorIds: ["garden", "corpus"] },
      { id: "garden-to-upper-room", anchorIds: ["garden", "upper-room"] },
    ],
    decoder: {
      id: "boot-house-v0.1",
      version: "0.1",
      interpolationStepsPerSegment: 4,
      endpointPenaltyMultiplier: 1,
    },
  };
}

test("stdio adapter returns the native non-authoritative decoding", () => {
  const child = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/intent-stroke-stdio.ts"],
    { input: JSON.stringify(makeRequest()), encoding: "utf8" },
  );

  assert.equal(child.status, 0, child.stderr);
  const body = JSON.parse(child.stdout);
  assert.equal(body.schema, "tranchnode.intent-stroke-process-result/v0.1");
  assert.equal(body.status, "ok");
  assert.equal(body.decoding.authority, "none");
  assert.equal(body.decoding.candidates[0].templateId, "garden-to-corpus");
});

test("stdio adapter fails closed on an unsupported process schema", () => {
  const child = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/intent-stroke-stdio.ts"],
    {
      input: JSON.stringify({ ...makeRequest(), schema: "tranchnode.intent-stroke-process/v9" }),
      encoding: "utf8",
    },
  );

  assert.notEqual(child.status, 0);
  const body = JSON.parse(child.stdout);
  assert.equal(body.status, "error");
  assert.equal(body.code, "UNSUPPORTED_PROCESS_SCHEMA");
});
