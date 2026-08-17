import {
  IntentStrokeError,
  addressIntentStroke,
  addressIntentStrokeFieldLayout,
  decodeIntentStroke,
  type IntentStroke,
  type IntentStrokeDecoderIdentity,
  type IntentStrokeFieldLayout,
  type IntentStrokePoint,
  type TraversalTemplate,
} from "../src/intent-stroke.js";

const REQUEST_SCHEMA_V01 = "tranchnode/intent-stroke-stdio/v0.1";
const REQUEST_SCHEMA_V02 = "tranchnode/intent-stroke-stdio/v0.2";
const RESPONSE_SCHEMA_V01 = "tranchnode/intent-stroke-stdio-response/v0.1";
const RESPONSE_SCHEMA_V02 = "tranchnode/intent-stroke-stdio-response/v0.2";
const MAX_INPUT_BYTES = 1_048_576;

type AdapterRequestV01 = {
  schema: typeof REQUEST_SCHEMA_V01;
  stroke: IntentStroke;
  layout: IntentStrokeFieldLayout;
  templates: TraversalTemplate[];
  decoder: IntentStrokeDecoderIdentity;
};

type AdapterRequestV02 = {
  schema: typeof REQUEST_SCHEMA_V02;
  points: IntentStrokePoint[];
  layout: IntentStrokeFieldLayout;
  templates: TraversalTemplate[];
  decoder: IntentStrokeDecoderIdentity;
};

type ResponseSchema = typeof RESPONSE_SCHEMA_V01 | typeof RESPONSE_SCHEMA_V02;

type AdapterResponse =
  | {
      schema: ResponseSchema;
      ok: true;
      decoding: ReturnType<typeof decodeIntentStroke>;
    }
  | {
      schema: ResponseSchema;
      ok: false;
      error: { code: string };
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function responseSchemaFor(value: unknown): ResponseSchema {
  return isRecord(value) && value.schema === REQUEST_SCHEMA_V02
    ? RESPONSE_SCHEMA_V02
    : RESPONSE_SCHEMA_V01;
}

function fail(code: string, schema: ResponseSchema = RESPONSE_SCHEMA_V01): never {
  const response: AdapterResponse = {
    schema,
    ok: false,
    error: { code },
  };
  process.stdout.write(`${JSON.stringify(response)}\n`);
  process.exit(1);
}

async function readStdin(): Promise<string> {
  let input = "";
  let inputBytes = 0;
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) {
    inputBytes += Buffer.byteLength(chunk, "utf8");
    if (inputBytes > MAX_INPUT_BYTES) fail("INPUT_TOO_LARGE");
    input += chunk;
  }
  return input;
}

async function main(): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readStdin());
  } catch {
    fail("MALFORMED_JSON");
  }

  if (
    !isRecord(parsed) ||
    (parsed.schema !== REQUEST_SCHEMA_V01 && parsed.schema !== REQUEST_SCHEMA_V02)
  ) {
    fail("UNSUPPORTED_SCHEMA_VERSION");
  }

  const responseSchema = responseSchemaFor(parsed);

  try {
    const layout = addressIntentStrokeFieldLayout(
      (parsed as AdapterRequestV01 | AdapterRequestV02).layout,
    );

    const rawStroke: IntentStroke = parsed.schema === REQUEST_SCHEMA_V02
      ? {
          schema: "tranchnode/intent-stroke/v0.1",
          fieldLayoutRef: layout.hash,
          points: (parsed as AdapterRequestV02).points,
        }
      : (parsed as AdapterRequestV01).stroke;

    const stroke = addressIntentStroke(rawStroke);
    const request = parsed as AdapterRequestV01 | AdapterRequestV02;
    const decoding = decodeIntentStroke({
      stroke,
      layout,
      templates: request.templates,
      decoder: request.decoder,
    });

    const response: AdapterResponse = {
      schema: responseSchema,
      ok: true,
      decoding,
    };
    process.stdout.write(`${JSON.stringify(response)}\n`);
  } catch (error: unknown) {
    if (error instanceof IntentStrokeError) fail(error.code, responseSchema);
    fail("INVALID_REQUEST", responseSchema);
  }
}

await main();
