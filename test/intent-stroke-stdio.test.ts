import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  addressIntentStroke,
  addressIntentStrokeFieldLayout,
  type IntentStroke,
  type IntentStrokeFieldLayout,
} from "../src/intent-stroke.js";

const layout: IntentStrokeFieldLayout = {
  schema: "tranchnode/intent-stroke-layout/v0.1",
  anchors: [
    { id: "garden", x: 0, y: 0 },
    { id: "corpus", x: 100, y: 0 },
    { id: "upper-room", x: 0, y: 100 },
  ],
};

function run(request: unknown) {
  return spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/intent-stroke-stdio.ts"],
    { input: JSON.stringify(request), encoding: "utf8" },
  );
}

function makeRequest() {
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

test("stdio adapter returns the native layout address without external canonicalization", () => {
  const native = addressIntentStrokeFieldLayout(layout);
  const child = run({
    schema: "tranchnode.intent-stroke-process/v0.1",
    operation: "address-layout",
    layout,
  });

  assert.equal(child.status, 0, child.stderr);
  const body = JSON.parse(child.stdout);
  assert.equal(body.schema, "tranchnode.intent-stroke-process-result/v0.1");
  assert.equal(body.status, "ok");
  assert.equal(body.operation, "address-layout");
  assert.equal(body.addressed.hash, native.hash);
  assert.deepEqual(body.addressed.value, native.value);
});

test("stdio adapter returns the native non-authoritative decoding", () => {
  const child = run(makeRequest());

  assert.equal(child.status, 0, child.stderr);
  const body = JSON.parse(child.stdout);
  assert.equal(body.schema, "tranchnode.intent-stroke-process-result/v0.1");
  assert.equal(body.status, "ok");
  assert.equal(body.operation, "decode");
  assert.equal(body.decoding.authority, "none");
  assert.equal(body.decoding.candidates[0].templateId, "garden-to-corpus");
});

test("stdio adapter fails closed on an unsupported process schema", () => {
  const child = run({ ...makeRequest(), schema: "tranchnode.intent-stroke-process/v9" });

  assert.notEqual(child.status, 0);
  const body = JSON.parse(child.stdout);
  assert.equal(body.status, "error");
  assert.equal(body.code, "UNSUPPORTED_PROCESS_SCHEMA");
});

test("stdio adapter fails closed on an unsupported operation", () => {
  const child = run({
    schema: "tranchnode.intent-stroke-process/v0.1",
    operation: "cross-door",
    layout,
  });

  assert.notEqual(child.status, 0);
  const body = JSON.parse(child.stdout);
  assert.equal(body.status, "error");
  assert.equal(body.code, "UNSUPPORTED_PROCESS_OPERATION");
});

test("stdio adapter rejects input larger than one MiB", () => {
  const child = run({ ...makeRequest(), padding: "x".repeat(1_048_576) });

  assert.notEqual(child.status, 0);
  const body = JSON.parse(child.stdout);
  assert.equal(body.status, "error");
  assert.equal(body.code, "PROCESS_INPUT_TOO_LARGE");
});
