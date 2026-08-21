import { readFile } from "node:fs/promises";
import { validateProjectStatus } from "../src/room-contract.js";

try {
  const input = await readFile("PROJECT_STATUS.json", "utf8");
  const status = validateProjectStatus(JSON.parse(input));
  process.stdout.write(`room declaration valid: ${status.repository}\n`);
} catch (error: unknown) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
