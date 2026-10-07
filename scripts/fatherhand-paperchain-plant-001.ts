import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  makeFatherhandPaperchainPlantWitness,
  type FatherhandPaperchainPlantRequestV01,
} from "../src/fatherhand-paperchain.js";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  const path = process.argv[2];
  const text = path ? await readFile(resolve(path), "utf8") : await readStdin();
  if (text.trim().length === 0) throw new Error("PAPERCHAIN_FATHERHAND_INPUT_REQUIRED");
  const input = JSON.parse(text) as FatherhandPaperchainPlantRequestV01;
  const witness = makeFatherhandPaperchainPlantWitness(input);
  process.stdout.write(JSON.stringify(witness, null, 2) + "\n");
}

main().catch((error) => {
  process.stderr.write(JSON.stringify({
    error: error instanceof Error ? error.message : "PAPERCHAIN_FATHERHAND_FAILED",
  }) + "\n");
  process.exitCode = 1;
});
