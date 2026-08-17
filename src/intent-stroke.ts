import type { Addressed, Hash } from "./residual.js";
import { addressJson } from "./residual.js";

const MAX_COORDINATE = 1_000_000;
const MAX_STROKE_POINTS = 512;
const MAX_ANCHORS = 256;
const MAX_TEMPLATES = 64;
const MAX_TEMPLATE_ANCHORS = 32;
const MAX_INTERPOLATION_STEPS = 32;
const MAX_ENDPOINT_PENALTY_MULTIPLIER = 1_000;

export type IntentStrokeErrorCode =
  | "UNSUPPORTED_SCHEMA_VERSION"
  | "INVALID_STROKE"
  | "INVALID_COORDINATE"
  | "INVALID_POINT_SEQUENCE"
  | "INVALID_LAYOUT"
  | "DUPLICATE_ANCHOR_ID"
  | "STROKE_IDENTITY_MISMATCH"
  | "LAYOUT_IDENTITY_MISMATCH"
  | "LAYOUT_REF_MISMATCH"
  | "INVALID_TEMPLATE"
  | "DUPLICATE_TEMPLATE_ID"
  | "MISSING_ANCHOR"
  | "INVALID_DECODER_CONFIG"
  | "ARITHMETIC_OVERFLOW"
  | "FINGERPRINT_MISMATCH";

export class IntentStrokeError extends Error {
  constructor(
    public readonly code: IntentStrokeErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "IntentStrokeError";
  }
}

export interface IntentStrokePoint {
  sequence: number;
  x: number;
  y: number;
}

export interface IntentStroke {
  schema: "tranchnode/intent-stroke/v0.1";
  fieldLayoutRef: Hash;
  points: IntentStrokePoint[];
}

export interface IntentStrokeAnchor {
  id: string;
  x: number;
  y: number;
}

export interface IntentStrokeFieldLayout {
  schema: "tranchnode/intent-stroke-layout/v0.1";
  anchors: IntentStrokeAnchor[];
}

export interface TraversalTemplate {
  id: string;
  anchorIds: string[];
}

export interface IntentStrokeDecoderIdentity {
  id: string;
  version: string;
  interpolationStepsPerSegment: number;
  endpointPenaltyMultiplier: number;
}

export interface IntentStrokeCandidate {
  templateId: string;
  anchorIds: string[];
  pathCost: number;
  endpointCost: number;
  totalCost: number;
}

export interface IntentStrokeDecoding {
  schema: "tranchnode/intent-stroke-decoding/v0.1";
  authority: "none";
  strokeHash: Hash;
  fieldLayoutRef: Hash;
  decoder: IntentStrokeDecoderIdentity;
  candidates: IntentStrokeCandidate[];
  ambiguity: {
    kind: "none" | "collision";
    leadingTemplateIds: string[];
  };
  fingerprint: Hash;
}

export interface IntentStrokeDecodeRequest {
  stroke: Addressed<IntentStroke>;
  layout: Addressed<IntentStrokeFieldLayout>;
  templates: TraversalTemplate[];
  decoder: IntentStrokeDecoderIdentity;
}

interface GridPoint {
  x: number;
  y: number;
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function isNonEmptyText(value: string): boolean {
  return value.trim().length > 0;
}

function isCoordinate(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 && value <= MAX_COORDINATE;
}

function checkedAdd(left: number, right: number): number {
  const result = left + right;
  if (!Number.isSafeInteger(result)) {
    throw new IntentStrokeError(
      "ARITHMETIC_OVERFLOW",
      "intent stroke arithmetic exceeded the safe integer range",
    );
  }
  return result;
}

function checkedMultiply(left: number, right: number): number {
  const result = left * right;
  if (!Number.isSafeInteger(result)) {
    throw new IntentStrokeError(
      "ARITHMETIC_OVERFLOW",
      "intent stroke arithmetic exceeded the safe integer range",
    );
  }
  return result;
}

function validatePoint(point: IntentStrokePoint): void {
  if (!isCoordinate(point.x) || !isCoordinate(point.y)) {
    throw new IntentStrokeError(
      "INVALID_COORDINATE",
      `stroke coordinate must be an integer from 0 through ${MAX_COORDINATE}`,
    );
  }
  if (!Number.isSafeInteger(point.sequence) || point.sequence < 0) {
    throw new IntentStrokeError(
      "INVALID_POINT_SEQUENCE",
      "stroke point sequence must be a non-negative safe integer",
    );
  }
}

function validateStroke(stroke: IntentStroke): void {
  if (stroke.schema !== "tranchnode/intent-stroke/v0.1") {
    throw new IntentStrokeError(
      "UNSUPPORTED_SCHEMA_VERSION",
      `unsupported stroke schema ${String(stroke.schema)}`,
    );
  }
  if (stroke.points.length < 2 || stroke.points.length > MAX_STROKE_POINTS) {
    throw new IntentStrokeError(
      "INVALID_STROKE",
      `stroke must contain from 2 through ${MAX_STROKE_POINTS} points`,
    );
  }

  let previousSequence = -1;
  for (const point of stroke.points) {
    validatePoint(point);
    if (point.sequence <= previousSequence) {
      throw new IntentStrokeError(
        "INVALID_POINT_SEQUENCE",
        "stroke point sequence must increase strictly",
      );
    }
    previousSequence = point.sequence;
  }
}

function validateLayout(layout: IntentStrokeFieldLayout): Map<string, IntentStrokeAnchor> {
  if (layout.schema !== "tranchnode/intent-stroke-layout/v0.1") {
    throw new IntentStrokeError(
      "UNSUPPORTED_SCHEMA_VERSION",
      `unsupported layout schema ${String(layout.schema)}`,
    );
  }
  if (layout.anchors.length < 2 || layout.anchors.length > MAX_ANCHORS) {
    throw new IntentStrokeError(
      "INVALID_LAYOUT",
      `layout must contain from 2 through ${MAX_ANCHORS} anchors`,
    );
  }

  const anchors = new Map<string, IntentStrokeAnchor>();
  for (const anchor of layout.anchors) {
    if (!isNonEmptyText(anchor.id)) {
      throw new IntentStrokeError("INVALID_LAYOUT", "anchor id must be non-empty");
    }
    if (!isCoordinate(anchor.x) || !isCoordinate(anchor.y)) {
      throw new IntentStrokeError(
        "INVALID_COORDINATE",
        `anchor coordinate must be an integer from 0 through ${MAX_COORDINATE}`,
      );
    }
    if (anchors.has(anchor.id)) {
      throw new IntentStrokeError(
        "DUPLICATE_ANCHOR_ID",
        `layout repeats anchor id ${anchor.id}`,
      );
    }
    anchors.set(anchor.id, anchor);
  }
  return anchors;
}

function validateDecoder(decoder: IntentStrokeDecoderIdentity): void {
  if (!isNonEmptyText(decoder.id) || !isNonEmptyText(decoder.version)) {
    throw new IntentStrokeError(
      "INVALID_DECODER_CONFIG",
      "decoder id and version must be non-empty",
    );
  }
  if (
    !Number.isSafeInteger(decoder.interpolationStepsPerSegment)
    || decoder.interpolationStepsPerSegment < 1
    || decoder.interpolationStepsPerSegment > MAX_INTERPOLATION_STEPS
  ) {
    throw new IntentStrokeError(
      "INVALID_DECODER_CONFIG",
      `interpolationStepsPerSegment must be an integer from 1 through ${MAX_INTERPOLATION_STEPS}`,
    );
  }
  if (
    !Number.isSafeInteger(decoder.endpointPenaltyMultiplier)
    || decoder.endpointPenaltyMultiplier < 0
    || decoder.endpointPenaltyMultiplier > MAX_ENDPOINT_PENALTY_MULTIPLIER
  ) {
    throw new IntentStrokeError(
      "INVALID_DECODER_CONFIG",
      `endpointPenaltyMultiplier must be an integer from 0 through ${MAX_ENDPOINT_PENALTY_MULTIPLIER}`,
    );
  }
}

function validateTemplates(
  templates: TraversalTemplate[],
  anchors: ReadonlyMap<string, IntentStrokeAnchor>,
): TraversalTemplate[] {
  if (templates.length < 1 || templates.length > MAX_TEMPLATES) {
    throw new IntentStrokeError(
      "INVALID_TEMPLATE",
      `decoder requires from 1 through ${MAX_TEMPLATES} traversal templates`,
    );
  }

  const ids = new Set<string>();
  const normalized: TraversalTemplate[] = [];
  for (const template of templates) {
    if (!isNonEmptyText(template.id)) {
      throw new IntentStrokeError("INVALID_TEMPLATE", "template id must be non-empty");
    }
    if (ids.has(template.id)) {
      throw new IntentStrokeError(
        "DUPLICATE_TEMPLATE_ID",
        `decoder repeats template id ${template.id}`,
      );
    }
    ids.add(template.id);

    if (template.anchorIds.length < 2 || template.anchorIds.length > MAX_TEMPLATE_ANCHORS) {
      throw new IntentStrokeError(
        "INVALID_TEMPLATE",
        `template ${template.id} must contain from 2 through ${MAX_TEMPLATE_ANCHORS} anchors`,
      );
    }

    for (const anchorId of template.anchorIds) {
      if (!isNonEmptyText(anchorId)) {
        throw new IntentStrokeError(
          "INVALID_TEMPLATE",
          `template ${template.id} contains an empty anchor id`,
        );
      }
      if (!anchors.has(anchorId)) {
        throw new IntentStrokeError(
          "MISSING_ANCHOR",
          `template ${template.id} references missing anchor ${anchorId}`,
        );
      }
    }

    normalized.push({
      id: template.id,
      anchorIds: [...template.anchorIds],
    });
  }
  return normalized;
}

function assertAddressIdentity<T>(
  addressed: Addressed<T>,
  mismatchCode: "STROKE_IDENTITY_MISMATCH" | "LAYOUT_IDENTITY_MISMATCH",
): void {
  const recomputed = addressJson(addressed.value).hash;
  if (recomputed !== addressed.hash) {
    throw new IntentStrokeError(
      mismatchCode,
      `body hashes to ${recomputed}, not declared identity ${addressed.hash}`,
    );
  }
}

function interpolateCoordinate(start: number, end: number, step: number, steps: number): number {
  const weighted = checkedAdd(
    checkedMultiply(start, steps - step),
    checkedMultiply(end, step),
  );
  return Math.floor(checkedAdd(weighted, Math.floor(steps / 2)) / steps);
}

function expandTemplate(
  template: TraversalTemplate,
  anchors: ReadonlyMap<string, IntentStrokeAnchor>,
  steps: number,
): GridPoint[] {
  const expanded: GridPoint[] = [];

  for (let index = 0; index < template.anchorIds.length - 1; index += 1) {
    const startId = template.anchorIds[index];
    const endId = template.anchorIds[index + 1];
    if (startId === undefined || endId === undefined) {
      throw new IntentStrokeError("INVALID_TEMPLATE", `template ${template.id} is malformed`);
    }
    const start = anchors.get(startId);
    const end = anchors.get(endId);
    if (!start || !end) {
      throw new IntentStrokeError(
        "MISSING_ANCHOR",
        `template ${template.id} references a missing anchor`,
      );
    }

    if (index === 0) expanded.push({ x: start.x, y: start.y });
    for (let step = 1; step <= steps; step += 1) {
      expanded.push({
        x: interpolateCoordinate(start.x, end.x, step, steps),
        y: interpolateCoordinate(start.y, end.y, step, steps),
      });
    }
  }

  return expanded;
}

function manhattan(left: GridPoint, right: GridPoint): number {
  return checkedAdd(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}

function dynamicTimeWarping(stroke: readonly GridPoint[], template: readonly GridPoint[]): number {
  let previous = new Array<number>(template.length + 1).fill(Number.MAX_SAFE_INTEGER);
  previous[0] = 0;

  for (const strokePoint of stroke) {
    const current = new Array<number>(template.length + 1).fill(Number.MAX_SAFE_INTEGER);
    for (let column = 1; column <= template.length; column += 1) {
      const templatePoint = template[column - 1];
      if (!templatePoint) {
        throw new IntentStrokeError("INVALID_TEMPLATE", "expanded template is malformed");
      }
      const priorSameColumn = previous[column] ?? Number.MAX_SAFE_INTEGER;
      const priorCurrentRow = current[column - 1] ?? Number.MAX_SAFE_INTEGER;
      const priorDiagonal = previous[column - 1] ?? Number.MAX_SAFE_INTEGER;
      const prior = Math.min(priorSameColumn, priorCurrentRow, priorDiagonal);
      current[column] = checkedAdd(prior, manhattan(strokePoint, templatePoint));
    }
    previous = current;
  }

  const result = previous[template.length];
  if (result === undefined || !Number.isSafeInteger(result)) {
    throw new IntentStrokeError("ARITHMETIC_OVERFLOW", "unable to compute a safe path cost");
  }
  return result;
}

function scoreTemplate(
  stroke: IntentStroke,
  template: TraversalTemplate,
  anchors: ReadonlyMap<string, IntentStrokeAnchor>,
  decoder: IntentStrokeDecoderIdentity,
): IntentStrokeCandidate {
  const expanded = expandTemplate(template, anchors, decoder.interpolationStepsPerSegment);
  const strokePoints: GridPoint[] = stroke.points.map((point) => ({ x: point.x, y: point.y }));
  const firstStroke = strokePoints[0];
  const lastStroke = strokePoints[strokePoints.length - 1];
  const firstTemplate = expanded[0];
  const lastTemplate = expanded[expanded.length - 1];
  if (!firstStroke || !lastStroke || !firstTemplate || !lastTemplate) {
    throw new IntentStrokeError("INVALID_STROKE", "stroke or template has no endpoints");
  }

  const pathCost = dynamicTimeWarping(strokePoints, expanded);
  const endpointDistance = checkedAdd(
    manhattan(firstStroke, firstTemplate),
    manhattan(lastStroke, lastTemplate),
  );
  const endpointCost = checkedMultiply(endpointDistance, decoder.endpointPenaltyMultiplier);
  const totalCost = checkedAdd(pathCost, endpointCost);

  return {
    templateId: template.id,
    anchorIds: [...template.anchorIds],
    pathCost,
    endpointCost,
    totalCost,
  };
}

export function addressIntentStroke(stroke: IntentStroke): Addressed<IntentStroke> {
  validateStroke(stroke);
  return addressJson(stroke);
}

export function addressIntentStrokeFieldLayout(
  layout: IntentStrokeFieldLayout,
): Addressed<IntentStrokeFieldLayout> {
  validateLayout(layout);
  return addressJson(layout);
}

export function decodeIntentStroke(request: IntentStrokeDecodeRequest): IntentStrokeDecoding {
  validateStroke(request.stroke.value);
  const anchors = validateLayout(request.layout.value);
  validateDecoder(request.decoder);
  assertAddressIdentity(request.stroke, "STROKE_IDENTITY_MISMATCH");
  assertAddressIdentity(request.layout, "LAYOUT_IDENTITY_MISMATCH");

  if (request.stroke.value.fieldLayoutRef !== request.layout.hash) {
    throw new IntentStrokeError(
      "LAYOUT_REF_MISMATCH",
      `stroke declares layout ${request.stroke.value.fieldLayoutRef}, received ${request.layout.hash}`,
    );
  }

  const templates = validateTemplates(request.templates, anchors);
  const candidates = templates.map((template) =>
    scoreTemplate(request.stroke.value, template, anchors, request.decoder));
  candidates.sort((left, right) =>
    left.totalCost - right.totalCost || compareText(left.templateId, right.templateId));

  const leadingCost = candidates[0]?.totalCost;
  if (leadingCost === undefined) {
    throw new IntentStrokeError("INVALID_TEMPLATE", "decoder has no candidates");
  }
  const leadingTemplateIds = candidates
    .filter((candidate) => candidate.totalCost === leadingCost)
    .map((candidate) => candidate.templateId)
    .sort(compareText);

  const body: Omit<IntentStrokeDecoding, "fingerprint"> = {
    schema: "tranchnode/intent-stroke-decoding/v0.1",
    authority: "none",
    strokeHash: request.stroke.hash,
    fieldLayoutRef: request.layout.hash,
    decoder: {
      id: request.decoder.id,
      version: request.decoder.version,
      interpolationStepsPerSegment: request.decoder.interpolationStepsPerSegment,
      endpointPenaltyMultiplier: request.decoder.endpointPenaltyMultiplier,
    },
    candidates,
    ambiguity: {
      kind: leadingTemplateIds.length > 1 ? "collision" : "none",
      leadingTemplateIds,
    },
  };

  return {
    ...body,
    fingerprint: addressJson(body).hash,
  };
}

export function verifyIntentStrokeDecoding(decoding: IntentStrokeDecoding): void {
  const { fingerprint, ...body } = decoding;
  const expected = addressJson(body).hash;
  if (expected !== fingerprint) {
    throw new IntentStrokeError(
      "FINGERPRINT_MISMATCH",
      `expected ${expected}, received ${fingerprint}`,
    );
  }
}
