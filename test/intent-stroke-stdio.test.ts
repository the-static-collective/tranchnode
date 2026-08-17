import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  addressIntentStrokeFieldLayout,
  type IntentStroke,
  type IntentStrokeDecoderIdentity,
  type IntentStrokeFieldLayout,
  type IntentStrokePoint,
  type TraversalTemplate,
} from "../src/intent-stroke.js";

interface Fixture {
  layout: IntentStrokeFieldLayout;
  decoder: IntentStrokeDecoderIdentity;
  templates: TraversalTemplate[];
  collisionTemplates: TraversalTemplate[];
  strokes: {
    intended: IntentStrokePoint[];
  };
}

const fixture = JSON.parse(
  await readFile(new URL("../fixtures/intent-stroke-v0.1.json", import.meta.url), "utf8"),
) as Fixture;

function makeStroke(points: IntentStrokePoint[]): IntentStroke {
  return {
    schema: "tranchnode/intent-stroke/v0.1",
    fieldLayoutRef: addressIntentStrokeFieldLayout(fixture.layout).hash,
    points,
  };
}

async function runAdapter(input: string): Promise<{ code: number | null; stdout: string; stderr: string }> {
  const child = spawn(
    process.execPath,
    ["--import", "tsx", "scripts/intent-stroke-stdio.ts"],
    { cwd: new URL("..", import.meta.url), stdio: ["pipe", "pipe", "pipe"] },
  );
  child.stdin.end(input);

  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => { stdout += chunk; });
  child.stderr.on("data", (chunk: string) => { stderr += chunk; });

  const code = await new Promise<number | null>((resolve) => child.on("close", resolve));
  return { code, stdout, stderr };
}

function request(templates: TraversalTemplate[] = fixture.templates) {
  return {
    schema: "tranchnode/intent-stroke-stdio/v0.1",
    stroke: makeStroke(fixture.strokes.intended),
    layout: fixture.layout,
    templates,
    decoder: fixture.decoder,
  };
}

function rawPointRequest(templates: TraversalTemplate[] = fixture.templates) {
  return {
    schema: "tranchnode/intent-stroke-stdio/v0.2",
    points: fixture.strokes.intended,
    layout: fixture.layout,
    templates,
    decoder: fixture.decoder,
  };
}

test("stdio adapter returns the canonical non-authoritative decoding", async () => {
  const result = await runAdapter(`${JSON.stringify(request())}\n`);
  assert.equal(result.code, 0, result.stderr);
  const response = JSON.parse(result.stdout) as any;
  assert.equal(response.schema, "tranchnode/intent-stroke-stdio-response/v0.1");
  assert.equal(response.ok, true);
  assert.equal(response.decoding.authority, "none");
  assert.equal(response.decoding.candidates[0]?.templateId, "field-to-tranchnode-via-portal");
  assert.equal(response.decoding.ambiguity.kind, "none");
  assert.match(response.decoding.fingerprint, /^sha256:[0-9a-f]{64}$/);
});

test("v0.2 binds raw points to TranchNode's addressed layout before decoding", async () => {
  const result = await runAdapter(`${JSON.stringify(rawPointRequest())}\n`);
  assert.equal(result.code, 0, result.stderr);
  const response = JSON.parse(result.stdout) as any;
  const expectedLayoutRef = addressIntentStrokeFieldLayout(fixture.layout).hash;

  assert.equal(response.schema, "tranchnode/intent-stroke-stdio-response/v0.2");
  assert.equal(response.ok, true);
  assert.equal(response.decoding.fieldLayoutRef, expectedLayoutRef);
  assert.equal(response.decoding.authority, "none");
  assert.equal(response.decoding.candidates[0]?.templateId, "field-to-tranchnode-via-portal");
  assert.equal("fieldLayoutRef" in rawPointRequest(), false);
});

test("v0.2 preserves collisions while binding the layout internally", async () => {
  const result = await runAdapter(`${JSON.stringify(rawPointRequest(fixture.collisionTemplates))}\n`);
  assert.equal(result.code, 0, result.stderr);
  const response = JSON.parse(result.stdout) as any;
  assert.equal(response.schema, "tranchnode/intent-stroke-stdio-response/v0.2");
  assert.equal(response.decoding.ambiguity.kind, "collision");
  assert.deepEqual(response.decoding.ambiguity.leadingTemplateIds, ["portal-route-a", "portal-route-b"]);
});

test("stdio adapter preserves exact decoder collisions", async () => {
  const result = await runAdapter(`${JSON.stringify(request(fixture.collisionTemplates))}\n`);
  assert.equal(result.code, 0, result.stderr);
  const response = JSON.parse(result.stdout) as any;
  assert.equal(response.ok, true);
  assert.equal(response.decoding.ambiguity.kind, "collision");
  assert.deepEqual(response.decoding.ambiguity.leadingTemplateIds, ["portal-route-a", "portal-route-b"]);
});

test("stdio adapter reports malformed JSON as a structured adapter failure", async () => {
  const result = await runAdapter("{not-json\n");
  assert.equal(result.code, 1);
  const response = JSON.parse(result.stdout) as any;
  assert.deepEqual(response, {
    schema: "tranchnode/intent-stroke-stdio-response/v0.1",
    ok: false,
    error: { code: "MALFORMED_JSON" },
  });
});

test("stdio adapter rejects unsupported wrapper schema before decoding", async () => {
  const bad = { ...request(), schema: "tranchnode/intent-stroke-stdio/v9" };
  const result = await runAdapter(`${JSON.stringify(bad)}\n`);
  assert.equal(result.code, 1);
  const response = JSON.parse(result.stdout) as any;
  assert.deepEqual(response, {
    schema: "tranchnode/intent-stroke-stdio-response/v0.1",
    ok: false,
    error: { code: "UNSUPPORTED_SCHEMA_VERSION" },
  });
});

test("stdio adapter rejects oversized raw requests before retaining an unbounded body", async () => {
  const oversized = { ...request(), padding: "x".repeat(1_100_000) };
  const result = await runAdapter(`${JSON.stringify(oversized)}\n`);
  assert.equal(result.code, 1);
  const response = JSON.parse(result.stdout) as any;
  assert.deepEqual(response, {
    schema: "tranchnode/intent-stroke-stdio-response/v0.1",
    ok: false,
    error: { code: "INPUT_TOO_LARGE" },
  });
});

test("stdio adapter cannot manufacture crossing authority", async () => {
  const result = await runAdapter(`${JSON.stringify({ ...request(), authority: "grant" })}\n`);
  assert.equal(result.code, 0, result.stderr);
  const response = JSON.parse(result.stdout) as any;
  assert.equal(response.ok, true);
  assert.equal(response.decoding.authority, "none");
  assert.equal("authority" in response && response.authority !== undefined, false);
});
