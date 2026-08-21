import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { renderRoomMarkdown, validateProjectStatus } from "../src/room-contract.js";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const tsxImport = import.meta.resolve("tsx");

function statusFixture() {
  return {
    schema: "static-collective.project-status.v1",
    asOf: "2026-08-20",
    repository: "the-static-collective/tranchnode",
    defaultBranch: "main",
    project: "TranchNode",
    state: "active",
    phase: "Room adapter specimen",
    canonicalAuthority: "project-owned repository",
    observedMainCommit: "0123456789abcdef0123456789abcdef01234567",
    executableSurface: [{ id: "room-contract-v0", status: "landed", interface: "TypeScript library/tests" }],
    nonClaims: ["projection is not authority"],
    humanHeld: ["adoption remains a stewardship decision"],
    touchpoints: [{ id: "status", kind: "read", access: "safe-read", interface: "PROJECT_STATUS.json" }],
    reentry: { readme: "README.md", status: "PROJECT_STATUS.json" },
  };
}

async function runScript(name: string, cwd: string) {
  const script = join(repositoryRoot, "scripts", name);
  const child = spawn(process.execPath, ["--import", tsxImport, script], {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => { stdout += chunk; });
  child.stderr.on("data", (chunk: string) => { stderr += chunk; });

  const code = await new Promise<number | null>((resolve) => child.on("close", resolve));
  return { code, stdout, stderr };
}

test("room-check validates PROJECT_STATUS.json in the current repository", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tranchnode-room-check-"));
  try {
    await writeFile(join(directory, "PROJECT_STATUS.json"), `${JSON.stringify(statusFixture(), null, 2)}\n`);
    const result = await runScript("room-check.ts", directory);
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /room declaration valid/i);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("room-check refuses a structurally invalid declaration", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tranchnode-room-check-invalid-"));
  try {
    await writeFile(
      join(directory, "PROJECT_STATUS.json"),
      `${JSON.stringify({ ...statusFixture(), dependsOn: [{ repository: "not-a-repo", relation: "neighbor" }] }, null, 2)}\n`,
    );
    const result = await runScript("room-check.ts", directory);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /dependsOn\[0\]\.repository/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("room-render writes exactly the deterministic projection to ROOM.md", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tranchnode-room-render-"));
  try {
    const fixture = statusFixture();
    await writeFile(join(directory, "PROJECT_STATUS.json"), `${JSON.stringify(fixture, null, 2)}\n`);

    const result = await runScript("room-render.ts", directory);
    assert.equal(result.code, 0, result.stderr);

    const actual = await readFile(join(directory, "ROOM.md"), "utf8");
    const expected = renderRoomMarkdown(validateProjectStatus(fixture));
    assert.equal(actual, expected);
    assert.match(result.stdout, /ROOM\.md written/i);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
