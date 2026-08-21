import assert from "node:assert/strict";
import test from "node:test";
import { validateProjectStatus } from "../src/room-contract.js";

function legacyStatus() {
  return {
    schema: "static-collective.project-status.v1",
    asOf: "2026-08-20",
    repository: "the-static-collective/tranchnode",
    defaultBranch: "main",
    project: "TranchNode",
    state: "active",
    phase: "Room contract specimen",
    canonicalAuthority: "project-owned repository",
    observedMainCommit: "0123456789abcdef0123456789abcdef01234567",
    executableSurface: [],
    nonClaims: ["projection is not authority"],
  };
}

test("legacy v1 status remains valid without inhabitation fields", () => {
  const status = validateProjectStatus(legacyStatus());
  assert.equal(status.project, "TranchNode");
  assert.equal(status.dependsOn, undefined);
  assert.equal(status.humanHeld, undefined);
  assert.equal(status.touchpoints, undefined);
  assert.equal(status.reentry, undefined);
});

test("valid inhabitation fields are accepted", () => {
  const status = validateProjectStatus({
    ...legacyStatus(),
    dependsOn: [
      {
        repository: "the-static-collective/project0",
        relation: "consumes-canonical-addressing",
        evidence: "README.md",
      },
    ],
    humanHeld: ["authority promotion", "adoption"],
    touchpoints: [
      {
        id: "status",
        kind: "read",
        access: "safe-read",
        interface: "PROJECT_STATUS.json",
      },
      {
        id: "intent-stroke-stdio",
        kind: "executable",
        access: "safe-read-execute",
        interface: "npm run intent-stroke:stdio",
      },
      {
        id: "promotion",
        kind: "gate",
        access: "human-only",
      },
    ],
    reentry: {
      readme: "README.md",
      status: "PROJECT_STATUS.json",
      docs: "docs/",
      receipts: "docs/receipts/",
    },
  });

  assert.equal(status.dependsOn?.[0]?.repository, "the-static-collective/project0");
  assert.equal(status.touchpoints?.[2]?.access, "human-only");
  assert.equal(status.reentry?.status, "PROJECT_STATUS.json");
});

test("malformed dependency repository identifiers are rejected", () => {
  assert.throws(
    () =>
      validateProjectStatus({
        ...legacyStatus(),
        dependsOn: [{ repository: "not-a-repository", relation: "neighbor" }],
      }),
    /dependsOn\[0\]\.repository/,
  );
});

test("unknown touchpoint kinds are rejected", () => {
  assert.throws(
    () =>
      validateProjectStatus({
        ...legacyStatus(),
        touchpoints: [{ id: "mystery", kind: "portal", access: "safe-read" }],
      }),
    /touchpoints\[0\]\.kind/,
  );
});

test("unknown touchpoint access values are rejected", () => {
  assert.throws(
    () =>
      validateProjectStatus({
        ...legacyStatus(),
        touchpoints: [{ id: "mystery", kind: "read", access: "ambient-authority" }],
      }),
    /touchpoints\[0\]\.access/,
  );
});

test("duplicate touchpoint ids are rejected", () => {
  assert.throws(
    () =>
      validateProjectStatus({
        ...legacyStatus(),
        touchpoints: [
          { id: "status", kind: "read", access: "safe-read" },
          { id: "status", kind: "receipt", access: "safe-read" },
        ],
      }),
    /duplicate touchpoint id: status/,
  );
});

test("re-entry landmarks must be repository-relative paths", () => {
  for (const path of ["../outside.md", "/etc/passwd", "docs/../../outside.md"]) {
    assert.throws(
      () =>
        validateProjectStatus({
          ...legacyStatus(),
          reentry: { readme: path },
        }),
      /reentry\.readme/,
    );
  }
});
