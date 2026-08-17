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

const REQUEST_SCHEMA = "tranchnode/intent-stroke-stdio/v0.1";
const RESPONSE_SCHEMA = "tranchnode/intent-stroke-stdio-response/v0.1";

type AdapterRequest = {
  schema: typeof REQUEST_SCHEMA;
  stroke: IntentStroke;
  layout: IntentStrokeFieldLayout;
  templates: TraversalTemplate[];
  decoder: IntentStrokeDecoderIdentity;
};

type AdapterResponse =
  | {
      schema: typeof RESPONSE_SCHEMA;
      ok: true;
      decoding: ReturnType<typeof decodeIntentStroke>;
    }
  | {
      schema: typeof RESPONSE_SCHEMA;
      ok: false;
      error: { code: string };
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(code: string): never {
  const response: AdapterResponse = {
    schema: RESPONSE_SCHEMA,
    ok: false,
    error: { code },
  };
  process.stdout.write(`${JSON.stringify(response)}\n`);
  process.exit(1);
}

async function readStdin(): Promise<string> {
  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) input += chunk;
  return input;
}

async function main(): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readStdin());
  } catch {
    fail("MALFORMED_JSON");
  }

  if (!isRecord(parsed) || parsed.schema !== REQUEST_SCHEMA) {
    fail("UNSUPPORTED_SCHEMA_VERSION");
  }

  const request = parsed as AdapterRequest;

  try {
    const layout = addressIntentStrokeFieldLayout(request.layout);
    const stroke = addressIntentStroke(request.stroke);
    const decoding = decodeIntentStroke({
      stroke,
      layout,
      templates: request.templates,
      decoder: request.decoder,
    });

    const response: AdapterResponse = {
      schema: RESPONSE_SCHEMA,
      ok: true,
      decoding,
    };
    process.stdout.write(`${JSON.stringify(response)}\n`);
  } catch (error: unknown) {
    if (error instanceof IntentStrokeError) fail(error.code);
    fail("INVALID_REQUEST");
  }
}

await main();
