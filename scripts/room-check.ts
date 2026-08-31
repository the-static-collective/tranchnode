import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
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

  await assertArtifact(join(repositoryRoot, "ROOM.md"), renderRoomMarkdown(projection));
  await assertArtifact(join(repositoryRoot, "room.json"), renderRoomJson(projection));
  process.stdout.write(`room projections current: ${status.repository}\n`);
} catch (error: unknown) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}

async function assertArtifact(path: string, expected: string): Promise<void> {
  let actual: string;
  try {
    actual = await readFile(path, "utf8");
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "ENOENT") {
      throw new Error(`${path} is missing; run npm run room:render`);
    }
    throw error;
  }
  if (actual !== expected) {
    throw new Error(`${path} is stale; run npm run room:render`);
  }
}
