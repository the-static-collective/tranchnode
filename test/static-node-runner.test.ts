import assert from "node:assert/strict";
import { access, mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
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

function runStaticNode(args: string[]) {
  return spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/static-node-001.ts", ...args],
    { cwd: process.cwd(), encoding: "utf8" },
  );
}

function standardArgs(fixture: { repo: string; output: string }): string[] {
  return [
    "--repo", fixture.repo,
    "--task-id", "fixture-001",
    "--build", "node build.mjs",
    "--verify", "node verify.mjs",
    "--output", fixture.output,
  ];
}

function worktreeCount(repo: string): number {
  return git(repo, "worktree", "list", "--porcelain")
    .split(/\r?\n/)
    .filter((line) => line.startsWith("worktree ")).length;
}

async function doesNotExist(path: string): Promise<void> {
  await assert.rejects(access(path));
}

test("STATIC-NODE-001 builds and verifies only inside an isolated child then stops at HOLD", async () => {
  const fixture = await makeFixtureRepo();
  const beforeParentBytes = await readFile(join(fixture.repo, "artifact.txt"), "utf8");

  const result = runStaticNode(standardArgs(fixture));
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

test("dirty parent refuses before child creation", async () => {
  const fixture = await makeFixtureRepo();
  await writeFile(join(fixture.repo, "artifact.txt"), "dirty parent\n", "utf8");

  const result = runStaticNode(standardArgs(fixture));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /dirty parent checkout/);
  assert.equal(worktreeCount(fixture.repo), 1);
  await doesNotExist(join(fixture.output, "attempt.json"));
});

test("build failure leaves a receipt, skips verification, and mints no Workmark", async () => {
  const fixture = await makeFixtureRepo();
  const args = standardArgs(fixture);
  args[5] = 'node -e "process.exit(7)"';
  args[7] = 'node -e "require(\\"node:fs\\").writeFileSync(\\"verify-ran\\", \\"x\\")"';

  const result = runStaticNode(args);
  assert.equal(result.status, 1);
  const receipt = JSON.parse(await readFile(join(fixture.output, "attempt.json"), "utf8"));
  assert.equal(receipt.result, "build_failed");
  assert.equal(receipt.verification.status, "not_run");
  assert.equal(receipt.disposition, "HOLD");
  await doesNotExist(join(fixture.output, "workmark.json"));
  await doesNotExist(join(receipt.child.worktreePath, "verify-ran"));
  assert.equal(git(fixture.repo, "rev-parse", "HEAD"), fixture.parentSha);
});

test("verification failure leaves a receipt and mints no Workmark", async () => {
  const fixture = await makeFixtureRepo();
  const args = standardArgs(fixture);
  args[7] = 'node -e "process.exit(9)"';

  const result = runStaticNode(args);
  assert.equal(result.status, 1);
  const receipt = JSON.parse(await readFile(join(fixture.output, "attempt.json"), "utf8"));
  assert.equal(receipt.result, "verification_failed");
  assert.equal(receipt.verification.status, "failed");
  assert.equal(receipt.disposition, "HOLD");
  await doesNotExist(join(fixture.output, "workmark.json"));
  assert.equal(git(fixture.repo, "rev-parse", "HEAD"), fixture.parentSha);
});

test("receipt output inside the parent is refused before child creation", async () => {
  const fixture = await makeFixtureRepo();
  const args = standardArgs(fixture);
  args[9] = join(fixture.repo, "receipts");

  const result = runStaticNode(args);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /outside the parent checkout/);
  assert.equal(worktreeCount(fixture.repo), 1);
  assert.equal(git(fixture.repo, "status", "--porcelain=v1", "--untracked-files=all"), "");
});

test("promotion-like CLI verbs are not part of the STATIC-NODE-001 interface", async () => {
  const fixture = await makeFixtureRepo();
  const result = runStaticNode([...standardArgs(fixture), "--promote", "yes"]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unknown option: --promote/);
  assert.equal(worktreeCount(fixture.repo), 1);
});
