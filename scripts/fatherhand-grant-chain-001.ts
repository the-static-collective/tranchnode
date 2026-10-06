import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  validateFatherhandChain,
  type FatherhandActRequirementV01,
  type FatherhandGrantV01,
} from "../src/fatherhand-grant.js";

interface Fixture {
  grants: FatherhandGrantV01[];
  terminalGrantId: string;
  required: FatherhandActRequirementV01;
  evaluatedAt: string;
}

export function replayFatherhandGrantChain(input: Fixture) {
  return validateFatherhandChain(input);
}

function runCli(): void {
  const fixture = JSON.parse(
    readFileSync(new URL("../fixtures/fatherhand-grant-chain/valid-three-hand.json", import.meta.url), "utf8")
  ) as Fixture;
  const receipt = replayFatherhandGrantChain(fixture);
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  runCli();
}
