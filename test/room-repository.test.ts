import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { renderRoomMarkdown, validateProjectStatus } from "../src/room-contract.js";

test("committed Room 001 projection exactly matches repository-owned status", async () => {
  const statusInput = await readFile(new URL("../PROJECT_STATUS.json", import.meta.url), "utf8");
  const status = validateProjectStatus(JSON.parse(statusInput));
  const room = await readFile(new URL("../ROOM.md", import.meta.url), "utf8");

  assert.equal(room, renderRoomMarkdown(status));
});
