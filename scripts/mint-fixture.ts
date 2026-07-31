import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { canonicalizeAndHash } from "../src/tranchnode/canonicalize.ts";

const input = process.argv[2];
if (!input) throw new Error("usage: npm run mint:fixture -- <draft.json> [output.json]");
const draft = JSON.parse(await readFile(input, "utf8")) as Record<string, unknown>;
delete draft.canonicalHash;
const { hash } = await canonicalizeAndHash(draft);
const output = process.argv[3] ?? join("fixtures/canonical", basename(input).replace(/\.draft\.json$/, ".json"));
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify({ ...draft, canonicalHash: hash }, null, 2) + "\n");
console.log(`${output}: ${hash}`);
