import {
  IntentStrokeError,
  addressIntentStroke,
  addressIntentStrokeFieldLayout,
  decodeIntentStroke,
  type IntentStroke,
  type IntentStrokeDecoderIdentity,
  type IntentStrokeFieldLayout,
  type TraversalTemplate,
} from "../src/intent-stroke.js";

interface IntentStrokeProcessRequest {
  schema: "tranchnode.intent-stroke-process/v0.1";
  operation: "decode";
  stroke: IntentStroke;
  layout: IntentStrokeFieldLayout;
  templates: TraversalTemplate[];
  decoder: IntentStrokeDecoderIdentity;
}

interface ProcessErrorResult {
  schema: "tranchnode.intent-stroke-process-result/v0.1";
  status: "error";
  code: string;
  message: string;
}

function fail(code: string, message: string): never {
  const result: ProcessErrorResult = {
    schema: "tranchnode.intent-stroke-process-result/v0.1",
    status: "error",
    code,
    message,
  };
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = 1;
  throw new Error("__PROCESS_RESULT_WRITTEN__");
}

function parseRequest(input: string): IntentStrokeProcessRequest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    fail("INVALID_JSON", "stdin must contain one JSON request");
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    fail("INVALID_PROCESS_REQUEST", "process request must be a JSON object");
  }

  const record = parsed as Record<string, unknown>;
  if (record.schema !== "tranchnode.intent-stroke-process/v0.1") {
    fail("UNSUPPORTED_PROCESS_SCHEMA", `unsupported process schema ${String(record.schema)}`);
  }
  if (record.operation !== "decode") {
    fail("UNSUPPORTED_PROCESS_OPERATION", `unsupported process operation ${String(record.operation)}`);
  }

  return parsed as IntentStrokeProcessRequest;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  const request = parseRequest(await readStdin());
  const layout = addressIntentStrokeFieldLayout(request.layout);
  const stroke = addressIntentStroke(request.stroke);
  const decoding = decodeIntentStroke({
    stroke,
    layout,
    templates: request.templates,
    decoder: request.decoder,
  });

  process.stdout.write(`${JSON.stringify({
    schema: "tranchnode.intent-stroke-process-result/v0.1",
    status: "ok",
    decoding,
  })}\n`);
}

main().catch((error: unknown) => {
  if (error instanceof Error && error.message === "__PROCESS_RESULT_WRITTEN__") {
    return;
  }

  const code = error instanceof IntentStrokeError ? error.code : "PROCESS_FAILURE";
  const message = error instanceof Error ? error.message : String(error);
  process.stdout.write(`${JSON.stringify({
    schema: "tranchnode.intent-stroke-process-result/v0.1",
    status: "error",
    code,
    message,
  })}\n`);
  process.exitCode = 1;
});
