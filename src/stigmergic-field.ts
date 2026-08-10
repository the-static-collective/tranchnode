import {
  checkedFieldAdd,
  decayedMagnitude,
} from "./stigmergic-field-arithmetic.js";
import type { Addressed, Hash } from "./residual.js";
import { addressJson } from "./residual.js";

export type FieldChannel =
  | "attention"
  | "receptivity"
  | "saturation"
  | "inhibition"
  | "tension"
  | "return";

export type StigmergicFieldErrorCode =
  | "UNSUPPORTED_SCHEMA_VERSION"
  | "INVALID_SEQUENCE"
  | "INVALID_MAGNITUDE"
  | "INVALID_DECAY_WINDOW"
  | "MISSING_SOURCE_EVENT"
  | "SOURCE_EVENT_ID_CONFLICT"
  | "SOURCE_SEQUENCE_MISMATCH"
  | "SCOPE_MISMATCH"
  | "TRACE_FROM_FUTURE"
  | "TRACE_IDENTITY_MISMATCH"
  | "ARITHMETIC_OVERFLOW"
  | "INVALID_ADAPTER_IDENTITY"
  | "INVALID_POLICY_VERSION"
  | "INVALID_SUBJECT_REF"
  | "FINGERPRINT_MISMATCH";

export class StigmergicFieldError extends Error {
  constructor(
    public readonly code: StigmergicFieldErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "StigmergicFieldError";
  }
}

export interface FieldSourceEvent {
  eventId: string;
  scopeId: string;
  sequence: number;
}

export interface FieldTrace {
  sourceEventId: string;
  sourceSequence: number;
  scopeId: string;
  subjectRef: string;
  channel: FieldChannel;
  magnitude: number;
  decayWindowEvents: number;
}

export interface FieldContribution {
  traceHash: Hash;
  sourceEventId: string;
  sourceSequence: number;
  effectiveMagnitude: number;
}

export interface FieldCell {
  subjectRef: string;
  channel: FieldChannel;
  totalEffectiveMagnitude: number;
  contributions: FieldContribution[];
}

export interface StigmergicProjectionRequest {
  schemaVersion: "stigmergic-field/v0.1";
  scopeId: string;
  throughSequence: number;
  policyVersion: string;
  adapter: { id: string; version: string };
  sourceEvents: FieldSourceEvent[];
  traces: Addressed<FieldTrace>[];
}

export interface StigmergicFieldProjection {
  schemaVersion: "stigmergic-field/v0.1";
  scopeId: string;
  throughSequence: number;
  policyVersion: string;
  adapter: { id: string; version: string };
  authority: "none";
  cells: FieldCell[];
  fingerprint: Hash;
}

interface MutableFieldCell {
  subjectRef: string;
  channel: FieldChannel;
  totalEffectiveMagnitude: number;
  contributions: FieldContribution[];
}

function isPositiveSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function validateTrace(trace: FieldTrace): void {
  if (trace.sourceEventId.length === 0) {
    throw new StigmergicFieldError(
      "MISSING_SOURCE_EVENT",
      "sourceEventId must be non-empty",
    );
  }
  if (trace.scopeId.length === 0) {
    throw new StigmergicFieldError(
      "SCOPE_MISMATCH",
      "trace scopeId must be non-empty",
    );
  }
  if (!isPositiveSafeInteger(trace.sourceSequence)) {
    throw new StigmergicFieldError(
      "INVALID_SEQUENCE",
      "sourceSequence must be a positive safe integer",
    );
  }
  if (!Number.isInteger(trace.magnitude) || trace.magnitude < 0 || trace.magnitude > 1000) {
    throw new StigmergicFieldError(
      "INVALID_MAGNITUDE",
      "magnitude must be an integer from 0 through 1000",
    );
  }
  if (
    !Number.isInteger(trace.decayWindowEvents)
    || trace.decayWindowEvents < 1
    || trace.decayWindowEvents > 10000
  ) {
    throw new StigmergicFieldError(
      "INVALID_DECAY_WINDOW",
      "decayWindowEvents must be an integer from 1 through 10000",
    );
  }
  if (trace.subjectRef.length === 0) {
    throw new StigmergicFieldError(
      "INVALID_SUBJECT_REF",
      "subjectRef must be non-empty",
    );
  }
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function mapArithmeticError(error: unknown): never {
  if (error instanceof Error && error.message === "TRACE_FROM_FUTURE") {
    throw new StigmergicFieldError(
      "TRACE_FROM_FUTURE",
      "trace source sequence is after the requested causal cut",
    );
  }
  if (error instanceof Error && error.message === "ARITHMETIC_OVERFLOW") {
    throw new StigmergicFieldError(
      "ARITHMETIC_OVERFLOW",
      "field arithmetic exceeded the safe integer range",
    );
  }
  throw error;
}

export function addressFieldTrace(trace: FieldTrace): Addressed<FieldTrace> {
  validateTrace(trace);
  return addressJson(trace);
}

export function deriveStigmergicField(
  request: StigmergicProjectionRequest,
): StigmergicFieldProjection {
  if (request.schemaVersion !== "stigmergic-field/v0.1") {
    throw new StigmergicFieldError(
      "UNSUPPORTED_SCHEMA_VERSION",
      `unsupported schema version ${String(request.schemaVersion)}`,
    );
  }
  if (request.scopeId.length === 0) {
    throw new StigmergicFieldError(
      "SCOPE_MISMATCH",
      "request scopeId must be non-empty",
    );
  }
  if (!isPositiveSafeInteger(request.throughSequence)) {
    throw new StigmergicFieldError(
      "INVALID_SEQUENCE",
      "throughSequence must be a positive safe integer",
    );
  }
  if (request.policyVersion.length === 0) {
    throw new StigmergicFieldError(
      "INVALID_POLICY_VERSION",
      "policyVersion must be non-empty",
    );
  }
  if (request.adapter.id.length === 0 || request.adapter.version.length === 0) {
    throw new StigmergicFieldError(
      "INVALID_ADAPTER_IDENTITY",
      "adapter id and version must be non-empty",
    );
  }

  const sourceEvents = new Map<string, FieldSourceEvent>();
  for (const source of request.sourceEvents) {
    if (source.eventId.length === 0) {
      throw new StigmergicFieldError(
        "MISSING_SOURCE_EVENT",
        "source event id must be non-empty",
      );
    }
    if (!isPositiveSafeInteger(source.sequence)) {
      throw new StigmergicFieldError(
        "INVALID_SEQUENCE",
        `source ${source.eventId} must have a positive safe sequence`,
      );
    }

    const existing = sourceEvents.get(source.eventId);
    if (existing) {
      if (existing.scopeId !== source.scopeId || existing.sequence !== source.sequence) {
        throw new StigmergicFieldError(
          "SOURCE_EVENT_ID_CONFLICT",
          `source event id ${source.eventId} is bound to conflicting envelopes`,
        );
      }
      continue;
    }

    if (source.scopeId !== request.scopeId) {
      throw new StigmergicFieldError(
        "SCOPE_MISMATCH",
        `source ${source.eventId} is outside request scope ${request.scopeId}`,
      );
    }
    sourceEvents.set(source.eventId, source);
  }

  const uniqueTraces = new Map<Hash, Addressed<FieldTrace>>();
  for (const addressedTrace of request.traces) {
    validateTrace(addressedTrace.value);
    const recomputed = addressJson(addressedTrace.value).hash;
    if (recomputed !== addressedTrace.hash) {
      throw new StigmergicFieldError(
        "TRACE_IDENTITY_MISMATCH",
        `trace body hashes to ${recomputed}, not ${addressedTrace.hash}`,
      );
    }

    const trace = addressedTrace.value;
    const source = sourceEvents.get(trace.sourceEventId);
    if (!source) {
      throw new StigmergicFieldError(
        "MISSING_SOURCE_EVENT",
        `trace ${addressedTrace.hash} references missing source ${trace.sourceEventId}`,
      );
    }
    if (trace.scopeId !== request.scopeId || source.scopeId !== trace.scopeId) {
      throw new StigmergicFieldError(
        "SCOPE_MISMATCH",
        `trace ${addressedTrace.hash} is outside request scope ${request.scopeId}`,
      );
    }
    if (source.sequence !== trace.sourceSequence) {
      throw new StigmergicFieldError(
        "SOURCE_SEQUENCE_MISMATCH",
        `trace ${addressedTrace.hash} declares sequence ${trace.sourceSequence} for source ${source.sequence}`,
      );
    }
    if (trace.sourceSequence > request.throughSequence) {
      throw new StigmergicFieldError(
        "TRACE_FROM_FUTURE",
        `trace ${addressedTrace.hash} is after causal cut ${request.throughSequence}`,
      );
    }

    uniqueTraces.set(addressedTrace.hash, addressedTrace);
  }

  const cells = new Map<string, MutableFieldCell>();
  for (const addressedTrace of uniqueTraces.values()) {
    const trace = addressedTrace.value;
    let effectiveMagnitude: number;
    try {
      effectiveMagnitude = decayedMagnitude(
        trace.magnitude,
        trace.decayWindowEvents,
        trace.sourceSequence,
        request.throughSequence,
      );
    } catch (error) {
      mapArithmeticError(error);
    }

    if (effectiveMagnitude === 0) continue;

    const key = `${trace.subjectRef}\u0000${trace.channel}`;
    let cell = cells.get(key);
    if (!cell) {
      cell = {
        subjectRef: trace.subjectRef,
        channel: trace.channel,
        totalEffectiveMagnitude: 0,
        contributions: [],
      };
      cells.set(key, cell);
    }

    try {
      cell.totalEffectiveMagnitude = checkedFieldAdd(
        cell.totalEffectiveMagnitude,
        effectiveMagnitude,
      );
    } catch (error) {
      mapArithmeticError(error);
    }

    cell.contributions.push({
      traceHash: addressedTrace.hash,
      sourceEventId: trace.sourceEventId,
      sourceSequence: trace.sourceSequence,
      effectiveMagnitude,
    });
  }

  const orderedCells: FieldCell[] = [...cells.values()].map((cell) => {
    cell.contributions.sort((left, right) =>
      left.sourceSequence - right.sourceSequence
      || compareText(left.sourceEventId, right.sourceEventId)
      || compareText(left.traceHash, right.traceHash));

    return {
      subjectRef: cell.subjectRef,
      channel: cell.channel,
      totalEffectiveMagnitude: cell.totalEffectiveMagnitude,
      contributions: cell.contributions,
    };
  });

  orderedCells.sort((left, right) =>
    compareText(left.subjectRef, right.subjectRef)
    || compareText(left.channel, right.channel));

  const body: Omit<StigmergicFieldProjection, "fingerprint"> = {
    schemaVersion: "stigmergic-field/v0.1",
    scopeId: request.scopeId,
    throughSequence: request.throughSequence,
    policyVersion: request.policyVersion,
    adapter: {
      id: request.adapter.id,
      version: request.adapter.version,
    },
    authority: "none",
    cells: orderedCells,
  };

  return {
    ...body,
    fingerprint: addressJson(body).hash,
  };
}

export function verifyStigmergicFieldProjection(
  projection: StigmergicFieldProjection,
): void {
  const { fingerprint, ...body } = projection;
  const expected = addressJson(body).hash;
  if (expected !== fingerprint) {
    throw new StigmergicFieldError(
      "FINGERPRINT_MISMATCH",
      `expected ${expected}, received ${fingerprint}`,
    );
  }
}
