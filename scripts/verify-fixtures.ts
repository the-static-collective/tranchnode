import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { canonicalizeAndHash } from "../src/tranchnode/canonicalize.ts";

async function discover(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await discover(path));
    else if (entry.isFile() && entry.name.endsWith(".json")) out.push(path);
  }
  return out;
}

const explicit = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const paths = explicit.length ? explicit : await discover("fixtures/canonical");
let failed = false;
for (const path of paths) {
  const record = JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
  const stored = record.canonicalHash;
  if (typeof stored !== "string" || !/^sha256:[0-9a-f]{64}$/.test(stored)) {
    console.error(`${path}: missing, malformed, or placeholder canonicalHash`);
    failed = true;
    continue;
  }
  const first = await canonicalizeAndHash(record);
  const second = await canonicalizeAndHash(record);
  if (first.hash !== second.hash || first.hash !== stored) {
    console.error(`${path}: expected ${stored}; computed ${first.hash}; repeat ${second.hash}`);
    failed = true;
  } else {
    console.log(`${path}: verified ${stored}`);
  }
}
if (failed) process.exitCode = 1;
