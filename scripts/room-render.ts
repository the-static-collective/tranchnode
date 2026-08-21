import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  createRoomProtocolProjection,
  renderRoomJson,
  renderRoomMarkdown,
  validateProjectStatus,
  validateRoomDeclaration,
} from "../src/room-contract.js";
import { collectWitnessReferences, observeWitnessReferences } from "../src/room-observation.js";

try {
  const repositoryRoot = process.cwd();
  const statusPath = join(repositoryRoot, "PROJECT_STATUS.json");
  const sourceBytes = await readFile(statusPath);
  const status = validateProjectStatus(JSON.parse(sourceBytes.toString("utf8")));
  const declaration = validateRoomDeclaration(status);
  const references = collectWitnessReferences(declaration);
  const observations = await observeWitnessReferences(repositoryRoot, references);
  const sourceSha256 = createHash("sha256").update(sourceBytes).digest("hex");
  const projection = createRoomProtocolProjection(declaration, observations, sourceSha256);

  await writeFile(join(repositoryRoot, "ROOM.md"), renderRoomMarkdown(projection), "utf8");
  await writeFile(join(repositoryRoot, "room.json"), renderRoomJson(projection), "utf8");
  process.stdout.write("ROOM.md and room.json written from PROJECT_STATUS.json\n");
} catch (error: unknown) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
