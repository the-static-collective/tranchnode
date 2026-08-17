import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { Hash } from "../src/residual.js";
import {
  IntentStrokeError,
  addressIntentStroke,
  addressIntentStrokeFieldLayout,
  decodeIntentStroke,
  verifyIntentStrokeDecoding,
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
    perturbed: IntentStrokePoint[];
    reversed: IntentStrokePoint[];
  };
}

const fixture = JSON.parse(
  await readFile(new URL("../fixtures/intent-stroke-v0.1.json", import.meta.url), "utf8"),
) as Fixture;

function expectCode(fn: () => unknown, code: IntentStrokeError["code"]): void {
  assert.throws(
    fn,
    (error: unknown) => error instanceof IntentStrokeError && error.code === code,
  );
}

function makeStroke(points: IntentStrokePoint[], fieldLayoutRef?: Hash): IntentStroke {
  const layoutRef = fieldLayoutRef ?? addressIntentStrokeFieldLayout(fixture.layout).hash;
  return {
    schema: "tranchnode/intent-stroke/v0.1",
    fieldLayoutRef: layoutRef,
    points,
  };
}

function decode(
  points: IntentStrokePoint[],
  templates: TraversalTemplate[] = fixture.templates,
) {
  const layout = addressIntentStrokeFieldLayout(fixture.layout);
  const stroke = addressIntentStroke(makeStroke(points, layout.hash));
  return decodeIntentStroke({
    stroke,
    layout,
    templates,
    decoder: fixture.decoder,
  });
}

test("raw stroke and field layout have stable independent identities", () => {
  const firstLayout = addressIntentStrokeFieldLayout(fixture.layout);
  const secondLayout = addressIntentStrokeFieldLayout(fixture.layout);
  assert.equal(firstLayout.hash, secondLayout.hash);

  const firstStroke = addressIntentStroke(makeStroke(fixture.strokes.intended, firstLayout.hash));
  const secondStroke = addressIntentStroke(makeStroke(fixture.strokes.intended, firstLayout.hash));
  assert.equal(firstStroke.hash, secondStroke.hash);
  assert.notEqual(firstStroke.hash, firstLayout.hash);
});

test("approximate stroke ranks the intended declared traversal first", () => {
  const decoding = decode(fixture.strokes.intended);
  assert.equal(decoding.authority, "none");
  assert.equal(decoding.candidates[0]?.templateId, "field-to-tranchnode-via-portal");
  assert.equal(decoding.ambiguity.kind, "none");
  assert.deepEqual(decoding.ambiguity.leadingTemplateIds, ["field-to-tranchnode-via-portal"]);
  verifyIntentStrokeDecoding(decoding);
});

test("candidate input order does not alter normalized decoding", () => {
  const first = decode(fixture.strokes.intended, fixture.templates);
  const second = decode(fixture.strokes.intended, [...fixture.templates].reverse());
  assert.deepEqual(first, second);
});

test("bounded perturbation preserves the same leading traversal", () => {
  const decoding = decode(fixture.strokes.perturbed);
  assert.equal(decoding.candidates[0]?.templateId, "field-to-tranchnode-via-portal");
});

test("stroke direction materially affects ranking", () => {
  const forward = decode(fixture.strokes.intended);
  const reversed = decode(fixture.strokes.reversed);
  assert.equal(forward.candidates[0]?.templateId, "field-to-tranchnode-via-portal");
  assert.equal(reversed.candidates[0]?.templateId, "tranchnode-to-field-via-portal");
  assert.notEqual(forward.candidates[0]?.templateId, reversed.candidates[0]?.templateId);
});

test("exact equal-cost leaders remain an explicit unresolved collision", () => {
  const decoding = decode(fixture.strokes.intended, fixture.collisionTemplates);
  assert.equal(decoding.ambiguity.kind, "collision");
  assert.deepEqual(decoding.ambiguity.leadingTemplateIds, ["portal-route-a", "portal-route-b"]);
  assert.equal(decoding.candidates[0]?.totalCost, decoding.candidates[1]?.totalCost);
});

test("validation fails closed with stable reason codes", () => {
  expectCode(
    () => addressIntentStrokeFieldLayout({
      ...fixture.layout,
      anchors: [fixture.layout.anchors[0]!, fixture.layout.anchors[0]!],
    }),
    "DUPLICATE_ANCHOR_ID",
  );

  expectCode(
    () => addressIntentStrokeFieldLayout({
      ...fixture.layout,
      anchors: [{ id: "bad", x: -1, y: 0 }, ...fixture.layout.anchors.slice(1)],
    }),
    "INVALID_COORDINATE",
  );

  const layout = addressIntentStrokeFieldLayout(fixture.layout);
  expectCode(
    () => addressIntentStroke(makeStroke([
      { sequence: 1, x: 100, y: 100 },
      { sequence: 1, x: 200, y: 150 },
    ], layout.hash)),
    "INVALID_POINT_SEQUENCE",
  );

  const fakeRef = (`sha256:${"0".repeat(64)}`) as Hash;
  const mismatchedStroke = addressIntentStroke(makeStroke(fixture.strokes.intended, fakeRef));
  expectCode(
    () => decodeIntentStroke({
      stroke: mismatchedStroke,
      layout,
      templates: fixture.templates,
      decoder: fixture.decoder,
    }),
    "LAYOUT_REF_MISMATCH",
  );

  const stroke = addressIntentStroke(makeStroke(fixture.strokes.intended, layout.hash));
  expectCode(
    () => decodeIntentStroke({
      stroke,
      layout,
      templates: [{ id: "missing", anchorIds: ["field-traversal", "does-not-exist"] }],
      decoder: fixture.decoder,
    }),
    "MISSING_ANCHOR",
  );

  expectCode(
    () => decodeIntentStroke({
      stroke,
      layout,
      templates: [fixture.templates[0]!, { ...fixture.templates[1]!, id: fixture.templates[0]!.id }],
      decoder: fixture.decoder,
    }),
    "DUPLICATE_TEMPLATE_ID",
  );

  expectCode(
    () => decodeIntentStroke({
      stroke,
      layout,
      templates: fixture.templates,
      decoder: { ...fixture.decoder, interpolationStepsPerSegment: 0 },
    }),
    "INVALID_DECODER_CONFIG",
  );
});

test("tampered decoding fingerprint is rejected", () => {
  const decoding = decode(fixture.strokes.intended);
  const tampered = {
    ...decoding,
    fingerprint: (`sha256:${"f".repeat(64)}`) as Hash,
  };
  expectCode(() => verifyIntentStrokeDecoding(tampered), "FINGERPRINT_MISMATCH");
});
