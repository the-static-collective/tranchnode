import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  createRoomProtocolProjection,
  renderRoomJson,
  renderRoomMarkdown,
  validateProjectStatus,
  validateRoomDeclaration,
} from "../src/room-contract.js";
import { collectWitnessReferences, observeWitnessReferences } from "../src/room-observation.js";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

test("committed Room projections exactly match the repository-owned declaration and bounded observation", async () => {
  const sourceBytes = await readFile(new URL("../PROJECT_STATUS.json", import.meta.url));
  const status = validateProjectStatus(JSON.parse(sourceBytes.toString("utf8")));
  const declaration = validateRoomDeclaration(status);
  const observations = await observeWitnessReferences(repositoryRoot, collectWitnessReferences(declaration));
  const sourceSha256 = createHash("sha256").update(sourceBytes).digest("hex");
  const projection = createRoomProtocolProjection(declaration, observations, sourceSha256);

  assert.equal(await readFile(new URL("../ROOM.md", import.meta.url), "utf8"), renderRoomMarkdown(projection));
  assert.equal(await readFile(new URL("../room.json", import.meta.url), "utf8"), renderRoomJson(projection));
});

test("repository PROJECT_STATUS.json satisfies Room-candidate validation", async () => {
  const source = await readFile(new URL("../PROJECT_STATUS.json", import.meta.url), "utf8");
  const declaration = validateRoomDeclaration(validateProjectStatus(JSON.parse(source)));
  assert.equal(declaration.repository, "the-static-collective/tranchnode");
  assert.ok(declaration.executableSurface.every((surface) => surface.witnesses.length > 0));
});
