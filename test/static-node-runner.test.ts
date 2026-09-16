import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

function git(cwd: string, ...args: string[]): string {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
  return result.stdout.trim();
}

async function makeFixtureRepo(): Promise<{ root: string; repo: string; output: string; parentSha: string }> {
  const root = await mkdtemp(join(tmpdir(), "static-node-001-"));
  const repo = join(root, "parent");
  const output = join(root, "receipts");
  await mkdir(repo, { recursive: true });
  await mkdir(output, { recursive: true });

  git(repo, "init", "-b", "main");
  git(repo, "config", "user.name", "Static Node Test");
  git(repo, "config", "user.email", "static-node@example.invalid");

  await writeFile(join(repo, "artifact.txt"), "parent\n", "utf8");
  await writeFile(
    join(repo, "build.mjs"),
    'import { writeFileSync } from "node:fs"; writeFileSync("artifact.txt", "child\\n");\n',
    "utf8",
  );
  await writeFile(
    join(repo, "verify.mjs"),
    'import { readFileSync } from "node:fs"; if (readFileSync("artifact.txt", "utf8") !== "child\\n") process.exit(9);\n',
    "utf8",
  );
  git(repo, "add", ".");
  git(repo, "commit", "-m", "fixture parent");

  return { root, repo, output, parentSha: git(repo, "rev-parse", "HEAD") };
}

test("STATIC-NODE-001 builds and verifies only inside an isolated child then stops at HOLD", async () => {
  const fixture = await makeFixtureRepo();
  const beforeParentBytes = await readFile(join(fixture.repo, "artifact.txt"), "utf8");

  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "scripts/static-node-001.ts",
      "--repo",
      fixture.repo,
      "--task-id",
      "fixture-001",
      "--build",
      "node build.mjs",
      "--verify",
      "node verify.mjs",
      "--output",
      fixture.output,
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const receipt = JSON.parse(await readFile(join(fixture.output, "attempt.json"), "utf8"));
  const workmark = JSON.parse(await readFile(join(fixture.output, "workmark.json"), "utf8"));

  assert.equal(receipt.result, "verified_child");
  assert.equal(receipt.disposition, "HOLD");
  assert.equal(receipt.promotionAuthorized, false);
  assert.equal(receipt.parent.parentSha, fixture.parentSha);
  assert.equal(workmark.attemptReceiptSha256, receipt.receiptSha256);
  assert.equal(workmark.promotionAuthorized, false);

  assert.equal(git(fixture.repo, "rev-parse", "HEAD"), fixture.parentSha);
  assert.equal(await readFile(join(fixture.repo, "artifact.txt"), "utf8"), beforeParentBytes);
  assert.equal(await readFile(join(receipt.child.worktreePath, "artifact.txt"), "utf8"), "child\n");
  assert.notEqual(receipt.child.worktreePath, fixture.repo);
});
