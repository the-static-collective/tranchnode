import { randomBytes } from "node:crypto";
import { mkdir, realpath, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  createStaticNodeAttemptReceipt,
  createStaticNodeWorkmark,
  type StaticNodeAttemptInput,
} from "../src/static-node.js";
import { sha256 } from "../src/residual.js";

interface CliOptions {
  repo: string;
  taskId: string;
  build: string;
  verify: string;
  output: string;
}

interface CommandResult {
  exitCode: number;
  startedAt: string;
  finishedAt: string;
}

function die(message: string): never {
  throw new Error(message);
}

function parseArgs(argv: string[]): CliOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      die("Usage: static-node:001 --repo ABS --task-id ID --build CMD --verify CMD --output ABS");
    }
    if (!["--repo", "--task-id", "--build", "--verify", "--output"].includes(key)) {
      die(`Unknown option: ${key}`);
    }
    if (values.has(key)) die(`Duplicate option: ${key}`);
    values.set(key, value);
  }

  const repo = values.get("--repo");
  const taskId = values.get("--task-id");
  const build = values.get("--build");
  const verify = values.get("--verify");
  const output = values.get("--output");
  if (!repo || !taskId || !build || !verify || !output) {
    die("Usage: static-node:001 --repo ABS --task-id ID --build CMD --verify CMD --output ABS");
  }
  if (!isAbsolute(repo) || !isAbsolute(output)) {
    die("STATIC-NODE-001 requires absolute --repo and --output paths");
  }
  return { repo, taskId, build, verify, output };
}

function gitBuffer(cwd: string, args: string[], allowFailure = false): { status: number; stdout: Buffer; stderr: Buffer } {
  const result = spawnSync("git", args, { cwd, encoding: "buffer" });
  const status = result.status ?? 1;
  const stdout = Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.from("");
  const stderr = Buffer.isBuffer(result.stderr) ? result.stderr : Buffer.from("");
  if (!allowFailure && status !== 0) {
    die(`git ${args.join(" ")} failed: ${stderr.toString("utf8").trim()}`);
  }
  return { status, stdout, stderr };
}

function gitText(cwd: string, ...args: string[]): string {
  return gitBuffer(cwd, args).stdout.toString("utf8").trim();
}

function runDeclared(command: string, cwd: string): CommandResult {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, {
    cwd,
    shell: true,
    stdio: "inherit",
  });
  const finishedAt = new Date().toISOString();
  return {
    exitCode: result.status ?? 1,
    startedAt,
    finishedAt,
  };
}

function safeTaskComponent(taskId: string): string {
  const safe = taskId.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!safe) die("Task id cannot produce an empty branch component");
  return safe;
}

function pathInside(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function parseStatus(statusText: string): { trackedPaths: string[]; untrackedPaths: string[] } {
  const tracked = new Set<string>();
  const untracked = new Set<string>();
  for (const line of statusText.split(/\r?\n/)) {
    if (!line) continue;
    const path = line.slice(3).trim();
    if (!path) continue;
    if (line.startsWith("?? ")) untracked.add(path);
    else tracked.add(path);
  }
  return {
    trackedPaths: [...tracked].sort(),
    untrackedPaths: [...untracked].sort(),
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const repo = await realpath(options.repo);
  const output = resolve(options.output);

  const topLevel = await realpath(gitText(repo, "rev-parse", "--show-toplevel"));
  if (topLevel !== repo) die("--repo must name the Git worktree root");

  const parentSha = gitText(repo, "rev-parse", "HEAD");
  const parentStatus = gitText(repo, "status", "--porcelain=v1", "--untracked-files=all");
  if (parentStatus.length !== 0) die("STATIC-NODE-001 refuses a dirty parent checkout");

  const branchProbe = gitBuffer(repo, ["symbolic-ref", "--quiet", "--short", "HEAD"], true);
  const parentBranch = branchProbe.status === 0
    ? branchProbe.stdout.toString("utf8").trim()
    : undefined;

  const shortSha = parentSha.slice(0, 7);
  const nonce = randomBytes(4).toString("hex");
  const taskComponent = safeTaskComponent(options.taskId);
  const childBranch = `static-node/001/${taskComponent}/${shortSha}/${nonce}`;
  const childRoot = resolve(dirname(repo), ".static-node-worktrees");
  const childPath = resolve(childRoot, `${taskComponent}-${shortSha}-${nonce}`);

  if (pathInside(childPath, output)) {
    die("Receipt output path must be outside the child worktree");
  }
  const existing = gitBuffer(repo, ["show-ref", "--verify", "--quiet", `refs/heads/${childBranch}`], true);
  if (existing.status === 0) die("Generated child branch already exists");

  await mkdir(childRoot, { recursive: true });
  gitText(repo, "worktree", "add", "-b", childBranch, childPath, parentSha);

  const build = runDeclared(options.build, childPath);
  let verification: StaticNodeAttemptInput["verification"];
  let result: StaticNodeAttemptInput["result"];

  if (build.exitCode !== 0) {
    verification = {
      command: options.verify,
      status: "not_run",
    };
    result = "build_failed";
  } else {
    const verify = runDeclared(options.verify, childPath);
    if (verify.exitCode === 0) {
      verification = {
        command: options.verify,
        status: "passed",
        exitCode: verify.exitCode,
        startedAt: verify.startedAt,
        finishedAt: verify.finishedAt,
      };
      result = "verified_child";
    } else {
      verification = {
        command: options.verify,
        status: "failed",
        exitCode: verify.exitCode,
        startedAt: verify.startedAt,
        finishedAt: verify.finishedAt,
      };
      result = "verification_failed";
    }
  }

  const statusText = gitText(childPath, "status", "--porcelain=v1", "--untracked-files=all");
  const deltaPaths = parseStatus(statusText);
  const patchBytes = gitBuffer(childPath, ["diff", "--binary", "--no-ext-diff", "HEAD"]).stdout;
  const gitVersion = gitText(repo, "--version");

  const receipt = createStaticNodeAttemptReceipt({
    taskId: options.taskId,
    parent: {
      repositoryPath: repo,
      parentSha,
      ...(parentBranch ? { branchName: parentBranch } : {}),
    },
    child: {
      branchName: childBranch,
      worktreePath: childPath,
    },
    build: {
      command: options.build,
      exitCode: build.exitCode,
      startedAt: build.startedAt,
      finishedAt: build.finishedAt,
    },
    verification,
    delta: {
      ...deltaPaths,
      patchSha256: sha256(patchBytes),
    },
    environment: {
      platform: process.platform,
      nodeVersion: process.version,
      gitVersion,
    },
    result,
  });

  const workmark = createStaticNodeWorkmark(receipt);
  await mkdir(output, { recursive: true });
  await writeFile(joinOutput(output, "attempt.json"), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  if (workmark) {
    await writeFile(joinOutput(output, "workmark.json"), `${JSON.stringify(workmark, null, 2)}\n`, "utf8");
  }

  process.exitCode = result === "verified_child" ? 0 : 1;
}

function joinOutput(output: string, name: string): string {
  return resolve(output, name);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
