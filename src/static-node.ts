import { addressJson, type Hash } from "./residual.js";

const ATTEMPT_SCHEMA = "tranchnode/static-node-attempt/v0.1" as const;
const WORKMARK_SCHEMA = "tranchnode/workmark/v0.1" as const;
const SHA256 = /^sha256:[0-9a-f]{64}$/;

export type StaticNodeResult =
  | "build_failed"
  | "verification_failed"
  | "verified_child";

export type VerificationStatus = "not_run" | "failed" | "passed";

export interface StaticNodeParentRef {
  repositoryPath: string;
  parentSha: string;
  branchName?: string;
}

export interface StaticNodeChildRef {
  branchName: string;
  worktreePath: string;
}

export interface StaticNodeBuildEvidence {
  command: string;
  exitCode: number;
  startedAt: string;
  finishedAt: string;
}

export interface StaticNodeVerificationEvidence {
  command: string;
  status: VerificationStatus;
  exitCode?: number;
  startedAt?: string;
  finishedAt?: string;
}

export interface StaticNodeDeltaEvidence {
  trackedPaths: string[];
  untrackedPaths: string[];
  patchSha256: Hash;
}

export interface StaticNodeEnvironmentEvidence {
  platform: string;
  nodeVersion: string;
  gitVersion: string;
}

export interface StaticNodeAttemptInput {
  taskId: string;
  parent: StaticNodeParentRef;
  child: StaticNodeChildRef;
  build: StaticNodeBuildEvidence;
  verification: StaticNodeVerificationEvidence;
  delta: StaticNodeDeltaEvidence;
  environment: StaticNodeEnvironmentEvidence;
  result: StaticNodeResult;
}

export interface StaticNodeAttemptReceipt {
  schema: typeof ATTEMPT_SCHEMA;
  taskId: string;
  parent: StaticNodeParentRef;
  child: StaticNodeChildRef;
  build: StaticNodeBuildEvidence;
  verification: StaticNodeVerificationEvidence;
  delta: StaticNodeDeltaEvidence;
  environment: StaticNodeEnvironmentEvidence;
  result: StaticNodeResult;
  disposition: "HOLD";
  promotionAuthorized: false;
  receiptSha256: Hash;
}

export interface StaticNodeWorkmark {
  schema: typeof WORKMARK_SCHEMA;
  workmarkId: Hash;
  taskId: string;
  parentSha: string;
  childBranch: string;
  attemptReceiptSha256: Hash;
  deltaSha256: Hash;
  verificationCommand: string;
  verificationStatus: "passed";
  bornAt: string;
  authority: "none";
  economicMeaning: "none";
  promotionAuthorized: false;
}

function fail(): never {
  throw new Error("INVALID_STATIC_NODE_ATTEMPT");
}

function requiredString(value: string): string {
  if (typeof value !== "string" || value.trim().length === 0) fail();
  return value;
}

function requiredExitCode(value: number): number {
  if (!Number.isInteger(value)) fail();
  return value;
}

function normalizePaths(paths: string[]): string[] {
  if (!Array.isArray(paths)) fail();
  const normalized = paths.map(requiredString);
  return [...new Set(normalized)].sort();
}

function normalizeParent(parent: StaticNodeParentRef): StaticNodeParentRef {
  const normalized = {
    repositoryPath: requiredString(parent.repositoryPath),
    parentSha: requiredString(parent.parentSha),
  };
  return parent.branchName === undefined
    ? normalized
    : { ...normalized, branchName: requiredString(parent.branchName) };
}

function normalizeBuild(build: StaticNodeBuildEvidence): StaticNodeBuildEvidence {
  return {
    command: requiredString(build.command),
    exitCode: requiredExitCode(build.exitCode),
    startedAt: requiredString(build.startedAt),
    finishedAt: requiredString(build.finishedAt),
  };
}

function normalizeVerification(
  verification: StaticNodeVerificationEvidence,
): StaticNodeVerificationEvidence {
  const base = {
    command: requiredString(verification.command),
    status: verification.status,
  };

  if (verification.status === "not_run") {
    if (
      verification.exitCode !== undefined
      || verification.startedAt !== undefined
      || verification.finishedAt !== undefined
    ) fail();
    return base;
  }

  if (verification.status !== "failed" && verification.status !== "passed") fail();
  if (
    verification.exitCode === undefined
    || verification.startedAt === undefined
    || verification.finishedAt === undefined
  ) fail();

  return {
    ...base,
    status: verification.status,
    exitCode: requiredExitCode(verification.exitCode),
    startedAt: requiredString(verification.startedAt),
    finishedAt: requiredString(verification.finishedAt),
  };
}

function validateResult(
  result: StaticNodeResult,
  build: StaticNodeBuildEvidence,
  verification: StaticNodeVerificationEvidence,
): void {
  if (result === "build_failed") {
    if (build.exitCode === 0 || verification.status !== "not_run") fail();
    return;
  }

  if (result === "verification_failed") {
    if (
      build.exitCode !== 0
      || verification.status !== "failed"
      || verification.exitCode === undefined
      || verification.exitCode === 0
    ) fail();
    return;
  }

  if (result === "verified_child") {
    if (
      build.exitCode !== 0
      || verification.status !== "passed"
      || verification.exitCode !== 0
    ) fail();
    return;
  }

  fail();
}

export function createStaticNodeAttemptReceipt(
  input: StaticNodeAttemptInput,
): StaticNodeAttemptReceipt {
  const parent = normalizeParent(input.parent);
  const child = {
    branchName: requiredString(input.child.branchName),
    worktreePath: requiredString(input.child.worktreePath),
  };
  const build = normalizeBuild(input.build);
  const verification = normalizeVerification(input.verification);
  validateResult(input.result, build, verification);

  if (!SHA256.test(input.delta.patchSha256)) fail();

  const body = {
    schema: ATTEMPT_SCHEMA,
    taskId: requiredString(input.taskId),
    parent,
    child,
    build,
    verification,
    delta: {
      trackedPaths: normalizePaths(input.delta.trackedPaths),
      untrackedPaths: normalizePaths(input.delta.untrackedPaths),
      patchSha256: input.delta.patchSha256,
    },
    environment: {
      platform: requiredString(input.environment.platform),
      nodeVersion: requiredString(input.environment.nodeVersion),
      gitVersion: requiredString(input.environment.gitVersion),
    },
    result: input.result,
    disposition: "HOLD" as const,
    promotionAuthorized: false as const,
  };

  const receiptSha256 = addressJson(body).hash;
  return { ...body, receiptSha256 };
}

export function createStaticNodeWorkmark(
  receipt: StaticNodeAttemptReceipt,
): StaticNodeWorkmark | null {
  if (receipt.result !== "verified_child") return null;
  if (
    receipt.verification.status !== "passed"
    || receipt.verification.exitCode !== 0
    || receipt.verification.finishedAt === undefined
    || receipt.disposition !== "HOLD"
    || receipt.promotionAuthorized !== false
  ) fail();

  const birthBody = {
    schema: WORKMARK_SCHEMA,
    taskId: receipt.taskId,
    parentSha: receipt.parent.parentSha,
    childBranch: receipt.child.branchName,
    attemptReceiptSha256: receipt.receiptSha256,
    deltaSha256: receipt.delta.patchSha256,
    verificationCommand: receipt.verification.command,
    verificationStatus: "passed" as const,
    bornAt: receipt.verification.finishedAt,
    authority: "none" as const,
    economicMeaning: "none" as const,
    promotionAuthorized: false as const,
  };

  return {
    ...birthBody,
    workmarkId: addressJson(birthBody).hash,
  };
}
