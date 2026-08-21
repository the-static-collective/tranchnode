import assert from "node:assert/strict";
import test from "node:test";
import {
  createRoomProtocolProjection,
  renderRoomJson,
  renderRoomMarkdown,
  validateProjectStatus,
  validateRoomDeclaration,
  type ProjectStatus,
  type RoomTouchpointPosture,
  type WitnessObservation,
} from "../src/room-contract.js";

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

function roomStatus(overrides: Record<string, unknown> = {}) {
  return {
    ...legacyStatus(),
    executableSurface: [
      {
        id: "continuity-spine-v0.1",
        status: "landed",
        interface: "TypeScript library/tests",
        witnesses: ["src/continuity-spine.ts"],
      },
    ],
    dependsOn: [
      {
        repository: "the-static-collective/project0",
        relation: "compatibility-obligation",
        evidence: { z: 1, a: 2 },
        witnesses: ["COMPATIBILITY.md"],
      },
    ],
    touchpoints: [
      {
        id: "status",
        kind: "read",
        posture: "inspect",
        interface: "PROJECT_STATUS.json",
        witnesses: ["PROJECT_STATUS.json"],
      },
    ],
    reentry: { readme: "README.md", status: "PROJECT_STATUS.json", docs: "docs/" },
    ...overrides,
  };
}

function roomDeclaration(overrides: Record<string, unknown> = {}) {
  return validateRoomDeclaration(validateProjectStatus(roomStatus(overrides)));
}

test("legacy v1 status remains valid without Room fields", () => {
  const status = validateProjectStatus(legacyStatus());
  assert.equal(status.project, "TranchNode");
  assert.equal(status.dependsOn, undefined);
  assert.equal(status.touchpoints, undefined);
  assert.equal(status.reentry, undefined);
});

test("legacy v1 status is not automatically a Room candidate", () => {
  assert.throws(
    () => validateRoomDeclaration(validateProjectStatus(legacyStatus())),
    /reentry landmark/,
  );
});

test("Room proof, relationship, and navigation claims require non-empty witnesses", () => {
  const missingProof = roomStatus({
    executableSurface: [{ id: "proof", status: "landed" }],
  });
  assert.throws(
    () => validateRoomDeclaration(validateProjectStatus(missingProof)),
    /executableSurface\[0\]\.witnesses/,
  );

  const missingRelationship = roomStatus({
    dependsOn: [{ repository: "the-static-collective/project0", relation: "neighbor", witnesses: [] }],
  });
  assert.throws(
    () => validateRoomDeclaration(validateProjectStatus(missingRelationship)),
    /dependsOn\[0\]\.witnesses/,
  );

  const missingNavigation = roomStatus({
    touchpoints: [{ id: "status", kind: "read", posture: "inspect", witnesses: [] }],
  });
  assert.throws(
    () => validateRoomDeclaration(validateProjectStatus(missingNavigation)),
    /touchpoints\[0\]\.witnesses/,
  );
});

test("Room witness paths reject unsafe or non-normalized syntax", () => {
  const invalid = ["/absolute", "../escape", "a/../b", "a\\b", "a//b", ".", "", "nul\0path"];
  for (const path of invalid) {
    assert.throws(
      () => roomDeclaration({
        executableSurface: [{ id: "proof", status: "landed", witnesses: [path] }],
      }),
      /repository-relative|non-empty/,
      path,
    );
  }
});

test("Room witness paths accept repository-relative file and directory forms", () => {
  for (const path of ["README.md", "docs/", "test/room-contract.test.ts"]) {
    const declaration = roomDeclaration({
      executableSurface: [{ id: "proof", status: "landed", witnesses: [path] }],
    });
    assert.deepEqual(declaration.executableSurface[0]?.witnesses, [path]);
  }
});

test("legacy access remains base-valid but is not accepted as Room navigation posture", () => {
  const status = validateProjectStatus(roomStatus({
    touchpoints: [
      {
        id: "intent-stroke",
        kind: "executable",
        access: "safe-read-execute",
        witnesses: ["scripts/intent-stroke-stdio.ts"],
      },
    ],
  }));
  assert.equal(status.touchpoints?.[0]?.access, "safe-read-execute");
  assert.throws(() => validateRoomDeclaration(status), /legacy permission-shaped syntax/);
});

test("all declared navigation posture values are Room-valid", () => {
  const postures: RoomTouchpointPosture[] = [
    "inspect",
    "invoke-under-local-rules",
    "proposal-only",
    "human-held",
    "closed",
  ];
  for (const posture of postures) {
    const declaration = roomDeclaration({
      touchpoints: [{ id: `pointer-${posture}`, kind: "gate", posture, witnesses: ["README.md"] }],
    });
    assert.equal(declaration.touchpoints?.[0]?.posture, posture);
  }
});

test("normalized projection labels inherited status fields as declarations and fixes limits", () => {
  const projection = createRoomProtocolProjection(roomDeclaration(), [], "abc123");
  assert.deepEqual(projection.limits, {
    projectionGrantsAuthority: false,
    actualAuthorityDetermination: "unavailable",
    projectionDeterminesConstitution: false,
    navigationGrantsPermission: false,
    observationFreshness: "not-established",
  });
  assert.equal(projection.source.declaredObservedMainCommit, legacyStatus().observedMainCommit);
  assert.equal(projection.declaration.identity.declaredAuthorityLocus, "project-owned repository");
  assert.equal(projection.declaration.proofClaims[0]?.declaredStatus, "landed");
  assert.equal("canonicalAuthority" in projection.declaration.identity, false);
  assert.equal("observedMainCommit" in projection.source, false);
  assert.deepEqual(projection.declaration.relationshipClaims[0]?.evidence, { a: 2, z: 1 });
});

test("missing humanHeld stays unavailable and never becomes permission", () => {
  const projection = createRoomProtocolProjection(roomDeclaration(), [], "hash");
  assert.deepEqual(projection.declaration.humanHeld, { availability: "unavailable", claims: [] });
  assert.match(renderRoomMarkdown(projection), /Absence is not permission/);
  assert.equal(projection.limits.actualAuthorityDetermination, "unavailable");
});

test("present humanHeld remains declaration while actual authority stays unavailable", () => {
  const projection = createRoomProtocolProjection(
    roomDeclaration({ humanHeld: ["promotion requires human ratification"] }),
    [],
    "hash",
  );
  assert.deepEqual(projection.declaration.humanHeld, {
    availability: "declared",
    claims: ["promotion requires human ratification"],
  });
  assert.equal(projection.limits.actualAuthorityDetermination, "unavailable");
});

test("Project0 relation is outbound declaration and reciprocity is not made", () => {
  const projection = createRoomProtocolProjection(roomDeclaration(), [], "hash");
  assert.deepEqual(
    {
      direction: projection.declaration.relationshipClaims[0]?.direction,
      reciprocity: projection.declaration.relationshipClaims[0]?.reciprocityDetermination,
    },
    { direction: "outbound-declaration", reciprocity: "not-made" },
  );
});

test("only unreachable observations become unresolved discrepancies", () => {
  const observations: WitnessObservation[] = [
    { claimRef: "proof:a", path: "a.ts", reachability: "reachable", reason: "path-entry-found" },
    { claimRef: "proof:b", path: "b.ts", reachability: "unreachable", reason: "path-entry-not-found" },
    { claimRef: "proof:c", path: "c.ts", reachability: "unresolved", reason: "observer-insufficient" },
  ];
  const projection = createRoomProtocolProjection(roomDeclaration(), observations, "hash");
  assert.deepEqual(projection.discrepancies, [
    {
      kind: "declared-witness-unreachable",
      claimRef: "proof:b",
      path: "b.ts",
      declared: "witness-path",
      observed: "unreachable",
      disposition: "unresolved",
    },
  ]);
});

test("projection construction is immutable and both renderers are deterministic", () => {
  const declaration = roomDeclaration();
  const observations: WitnessObservation[] = [
    {
      claimRef: "proof:continuity-spine-v0.1",
      path: "src/continuity-spine.ts",
      reachability: "reachable",
      reason: "path-entry-found",
    },
  ];
  const declarationBefore = structuredClone(declaration) as ProjectStatus;
  const observationsBefore = structuredClone(observations);

  const first = createRoomProtocolProjection(declaration, observations, "hash");
  const second = createRoomProtocolProjection(declaration, observations, "hash");
  assert.deepEqual(declaration, declarationBefore);
  assert.deepEqual(observations, observationsBefore);
  assert.deepEqual(first, second);
  assert.equal(renderRoomMarkdown(first), renderRoomMarkdown(second));
  assert.equal(renderRoomJson(first), renderRoomJson(second));
  assert.equal(renderRoomJson(first).endsWith("\n"), true);
});

test("generated views make no truth, adoption, authority, permission, canonicality, or constitution conclusion", () => {
  const observations: WitnessObservation[] = [
    {
      claimRef: "proof:continuity-spine-v0.1",
      path: "src/continuity-spine.ts",
      reachability: "unreachable",
      reason: "path-entry-not-found",
    },
  ];
  const projection = createRoomProtocolProjection(roomDeclaration(), observations, "hash");
  const json = JSON.parse(renderRoomJson(projection)) as Record<string, unknown>;
  const serialized = JSON.stringify(json);
  for (const key of ["truth", "confidence", "adopted", "authorized", "permitted", "canonical", "constituted"]) {
    assert.equal(serialized.includes(`\"${key}\"`), false, key);
  }
  const markdown = renderRoomMarkdown(projection);
  assert.match(markdown, /disposition: unresolved/);
  assert.doesNotMatch(markdown, /claim is false/i);
});
