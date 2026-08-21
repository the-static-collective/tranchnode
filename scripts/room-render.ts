import { readFile, writeFile } from "node:fs/promises";
import { renderRoomMarkdown, validateProjectStatus } from "../src/room-contract.js";

try {
  const input = await readFile("PROJECT_STATUS.json", "utf8");
  const status = validateProjectStatus(JSON.parse(input));
  await writeFile("ROOM.md", renderRoomMarkdown(status), "utf8");
  process.stdout.write("ROOM.md written from PROJECT_STATUS.json\n");
} catch (error: unknown) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
