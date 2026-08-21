import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createRoomProtocolProjection, validateProjectStatus, validateRoomDeclaration } from "../src/room-contract.js";
import { collectWitnessReferences, observeWitnessReferences } from "../src/room-observation.js";

function declarationFixture() {
  return validateRoomDeclaration(validateProjectStatus({
    schema: "static-collective.project-status.v1",
    asOf: "2026-08-21",
    repository: "the-static-collective/tranchnode",
    defaultBranch: "main",
    project: "TranchNode",
    state: "candidate",
    phase: "observer fixture",
    canonicalAuthority: "project-owned repository",
    observedMainCommit: "0123456789abcdef0123456789abcdef01234567",
    executableSurface: [
      {
        id: "proof-a",
        status: "landed",
        interface: "not/a/witness",
        evidence: "also/not/a/witness",
        witnesses: ["proof/a.ts", "proof/b.ts"],
      },
    ],
    dependsOn: [
      {
        repository: "the-static-collective/project0",
        relation: "compatibility-obligation",
        evidence: "opaque/evidence.md",
        witnesses: ["COMPATIBILITY.md"],
      },
    ],
    touchpoints: [
      { id: "status", kind: "read", posture: "inspect", interface: "ignored/path", witnesses: ["PROJECT_STATUS.json"] },
    ],
    reentry: { readme: "README.md", docs: "docs/" },
    nonClaims: [],
  }));
}

test("collector emits stable refs from declarations only", () => {
  assert.deepEqual(collectWitnessReferences(declarationFixture()), [
    { claimRef: "reentry:readme", path: "README.md" },
    { claimRef: "reentry:docs", path: "docs/" },
    { claimRef: "proof:proof-a", path: "proof/a.ts" },
    { claimRef: "proof:proof-a", path: "proof/b.ts" },
    { claimRef: "relationship:the-static-collective/project0:compatibility-obligation", path: "COMPATIBILITY.md" },
    { claimRef: "navigation:status", path: "PROJECT_STATUS.json" },
  ]);
});

test("observer walks only declared path components and returns reachable", async () => {
  const root = resolve("repository-root");
  const probes: string[] = [];
  const observations = await observeWitnessReferences(
    root,
    [{ claimRef: "proof:a", path: "a/b.ts" }],
    async (path) => {
      probes.push(path);
      return { isSymbolicLink: () => false };
    },
  );
  assert.deepEqual(probes, [join(root, "a"), join(root, "a", "b.ts")]);
  assert.deepEqual(observations, [
    { claimRef: "proof:a", path: "a/b.ts", reachability: "reachable", reason: "path-entry-found" },
  ]);
});

test("ENOENT and ENOTDIR are unreachable, not exceptions", async () => {
  for (const code of ["ENOENT", "ENOTDIR"]) {
    const observations = await observeWitnessReferences(".", [{ claimRef: "proof:a", path: "missing.ts" }], async () => {
      throw Object.assign(new Error(code), { code });
    });
    assert.equal(observations[0]?.reachability, "unreachable");
    assert.equal(observations[0]?.reason, "path-entry-not-found");
  }
});

test("permission, I/O, and uncoded observer errors remain unresolved", async () => {
  for (const error of [Object.assign(new Error("denied"), { code: "EACCES" }), Object.assign(new Error("io"), { code: "EIO" }), new Error("opaque")]) {
    const observations = await observeWitnessReferences(".", [{ claimRef: "proof:a", path: "uncertain.ts" }], async () => {
      throw error;
    });
    assert.equal(observations[0]?.reachability, "unresolved");
    assert.equal(observations[0]?.reason, "observer-insufficient");
  }
});

test("a final symlink entry is reachable without following its target", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tranchnode-room-final-link-"));
  try {
    await writeFile(join(directory, "target.txt"), "target");
    await symlink(join(directory, "target.txt"), join(directory, "link.txt"));
    const observations = await observeWitnessReferences(directory, [{ claimRef: "proof:link", path: "link.txt" }]);
    assert.equal(observations[0]?.reachability, "reachable");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("an intermediate symlink stops observation as unresolved", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tranchnode-room-intermediate-link-"));
  try {
    const target = join(directory, "target");
    await mkdir(target);
    await writeFile(join(target, "child.txt"), "child");
    await symlink(target, join(directory, "link"), "dir");
    const observations = await observeWitnessReferences(directory, [{ claimRef: "proof:link", path: "link/child.txt" }]);
    assert.equal(observations[0]?.reachability, "unresolved");
    assert.equal(observations[0]?.reason, "observer-insufficient");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("adversarial fixture preserves a valid absent witness as one unresolved discrepancy", async () => {
  const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
  const fixturePath = new URL("../fixtures/room-protocol-v0/unreachable-witness/PROJECT_STATUS.json", import.meta.url);
  const fixture = validateRoomDeclaration(validateProjectStatus(JSON.parse(await readFile(fixturePath, "utf8"))));
  const observations = await observeWitnessReferences(repositoryRoot, collectWitnessReferences(fixture));
  const projection = createRoomProtocolProjection(fixture, observations, "fixture-hash");
  assert.deepEqual(projection.discrepancies, [
    {
      kind: "declared-witness-unreachable",
      claimRef: "proof:deliberately-absent-v0",
      path: "fixtures/room-protocol-v0/unreachable-witness/absent.ts",
      declared: "witness-path",
      observed: "unreachable",
      disposition: "unresolved",
    },
  ]);
});
