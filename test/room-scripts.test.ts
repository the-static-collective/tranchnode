import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const tsxImport = import.meta.resolve("tsx");

function statusFixture(overrides: Record<string, unknown> = {}) {
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
    executableSurface: [
      { id: "room-contract-v0", status: "landed", witnesses: ["proof.ts"] },
    ],
    nonClaims: ["projection is not authority"],
    humanHeld: ["adoption remains a stewardship decision"],
    touchpoints: [
      { id: "status", kind: "read", posture: "inspect", interface: "PROJECT_STATUS.json", witnesses: ["PROJECT_STATUS.json"] },
    ],
    reentry: { status: "PROJECT_STATUS.json" },
    ...overrides,
  };
}

async function writeStatus(directory: string, status: unknown): Promise<Buffer> {
  const bytes = Buffer.from(`${JSON.stringify(status, null, 2)}\n`, "utf8");
  await writeFile(join(directory, "PROJECT_STATUS.json"), bytes);
  return bytes;
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

test("room-render writes ROOM.md and room.json from one source hash and observation set", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tranchnode-room-render-"));
  try {
    const sourceBytes = await writeStatus(directory, statusFixture());
    await writeFile(join(directory, "proof.ts"), "proof");
    const result = await runScript("room-render.ts", directory);
    assert.equal(result.code, 0, result.stderr);

    const markdown = await readFile(join(directory, "ROOM.md"), "utf8");
    const projection = JSON.parse(await readFile(join(directory, "room.json"), "utf8"));
    const expectedHash = createHash("sha256").update(sourceBytes).digest("hex");
    assert.equal(projection.source.sha256, expectedHash);
    assert.match(markdown, new RegExp(expectedHash));
    assert.deepEqual(projection.observation.results, [
      { claimRef: "reentry:status", path: "PROJECT_STATUS.json", reachability: "reachable", reason: "path-entry-found" },
      { claimRef: "proof:room-contract-v0", path: "proof.ts", reachability: "reachable", reason: "path-entry-found" },
      { claimRef: "navigation:status", path: "PROJECT_STATUS.json", reachability: "reachable", reason: "path-entry-found" },
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("room-check reports a stale artifact path", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tranchnode-room-stale-"));
  try {
    await writeStatus(directory, statusFixture());
    await writeFile(join(directory, "proof.ts"), "proof");
    assert.equal((await runScript("room-render.ts", directory)).code, 0);
    await writeFile(join(directory, "ROOM.md"), "stale\n");
    const result = await runScript("room-check.ts", directory);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /ROOM\.md.*stale/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("malformed witness syntax fails before projection", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tranchnode-room-invalid-witness-"));
  try {
    await writeStatus(directory, statusFixture({
      executableSurface: [{ id: "room-contract-v0", status: "landed", witnesses: ["../escape.ts"] }],
    }));
    const result = await runScript("room-check.ts", directory);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /repository-relative/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("a well-formed missing witness yields unresolved discrepancy while room-check stays green", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tranchnode-room-missing-witness-"));
  try {
    await writeStatus(directory, statusFixture({
      executableSurface: [{ id: "room-contract-v0", status: "landed", witnesses: ["missing.ts"] }],
    }));
    const rendered = await runScript("room-render.ts", directory);
    assert.equal(rendered.code, 0, rendered.stderr);
    const projection = JSON.parse(await readFile(join(directory, "room.json"), "utf8"));
    assert.equal(projection.discrepancies.length, 1);
    assert.equal(projection.discrepancies[0]?.disposition, "unresolved");

    const checked = await runScript("room-check.ts", directory);
    assert.equal(checked.code, 0, checked.stderr);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
