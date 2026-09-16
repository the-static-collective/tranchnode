import assert from "node:assert/strict";
import test from "node:test";
import {
  createStaticNodeAttemptReceipt,
  createStaticNodeWorkmark,
  type StaticNodeAttemptInput,
} from "../src/static-node.js";

function verifiedInput(): StaticNodeAttemptInput {
  return {
    taskId: "example-001",
    parent: {
      repositoryPath: "/tmp/static-parent",
      parentSha: "1111111111111111111111111111111111111111",
      branchName: "main",
    },
    child: {
      branchName: "static-node/001/example-001/1111111/abc123",
      worktreePath: "/tmp/static-parent-child",
    },
    build: {
      command: "node build.mjs",
      exitCode: 0,
      startedAt: "2026-09-16T20:00:00.000Z",
      finishedAt: "2026-09-16T20:00:01.000Z",
    },
    verification: {
      command: "node verify.mjs",
      status: "passed",
      exitCode: 0,
      startedAt: "2026-09-16T20:00:01.000Z",
      finishedAt: "2026-09-16T20:00:02.000Z",
    },
    delta: {
      trackedPaths: ["artifact.txt"],
      untrackedPaths: [],
      patchSha256: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    },
    environment: {
      platform: "linux",
      nodeVersion: "v24.0.0",
      gitVersion: "git version 2.50.0",
    },
    result: "verified_child",
  };
}

test("verified child deterministically ends at HOLD and mints one non-authoritative Workmark", () => {
  const first = createStaticNodeAttemptReceipt(verifiedInput());
  const second = createStaticNodeAttemptReceipt(verifiedInput());

  assert.equal(first.schema, "tranchnode/static-node-attempt/v0.1");
  assert.equal(first.disposition, "HOLD");
  assert.equal(first.promotionAuthorized, false);
  assert.equal(first.receiptSha256, second.receiptSha256);

  const workmark = createStaticNodeWorkmark(first);
  assert.ok(workmark);
  assert.equal(workmark.schema, "tranchnode/workmark/v0.1");
  assert.equal(workmark.authority, "none");
  assert.equal(workmark.economicMeaning, "none");
  assert.equal(workmark.promotionAuthorized, false);
  assert.equal(workmark.attemptReceiptSha256, first.receiptSha256);
});

test("build failure is receipted, skips verification, and mints no Workmark", () => {
  const input = verifiedInput();
  input.build.exitCode = 7;
  input.verification = {
    command: "node verify.mjs",
    status: "not_run",
  };
  input.result = "build_failed";

  const receipt = createStaticNodeAttemptReceipt(input);
  assert.equal(receipt.result, "build_failed");
  assert.equal(receipt.verification.status, "not_run");
  assert.equal(createStaticNodeWorkmark(receipt), null);
});

test("verification failure is receipted and mints no Workmark", () => {
  const input = verifiedInput();
  input.verification = {
    command: "node verify.mjs",
    status: "failed",
    exitCode: 9,
    startedAt: "2026-09-16T20:00:01.000Z",
    finishedAt: "2026-09-16T20:00:02.000Z",
  };
  input.result = "verification_failed";

  const receipt = createStaticNodeAttemptReceipt(input);
  assert.equal(receipt.result, "verification_failed");
  assert.equal(createStaticNodeWorkmark(receipt), null);
});

test("Workmark identity changes when parent ancestry changes", () => {
  const first = createStaticNodeAttemptReceipt(verifiedInput());
  const changed = verifiedInput();
  changed.parent.parentSha = "2222222222222222222222222222222222222222";
  const second = createStaticNodeAttemptReceipt(changed);

  assert.notEqual(
    createStaticNodeWorkmark(first)?.workmarkId,
    createStaticNodeWorkmark(second)?.workmarkId,
  );
});

test("Workmark identity changes when the child delta changes", () => {
  const first = createStaticNodeAttemptReceipt(verifiedInput());
  const changed = verifiedInput();
  changed.delta.patchSha256 = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const second = createStaticNodeAttemptReceipt(changed);

  assert.notEqual(
    createStaticNodeWorkmark(first)?.workmarkId,
    createStaticNodeWorkmark(second)?.workmarkId,
  );
});

test("kernel rejects a claimed verified child whose verification did not pass", () => {
  const input = verifiedInput();
  input.verification.status = "failed";
  input.verification.exitCode = 3;

  assert.throws(
    () => createStaticNodeAttemptReceipt(input),
    /INVALID_STATIC_NODE_ATTEMPT/,
  );
});
