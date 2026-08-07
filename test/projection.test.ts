import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { FilesystemArtifactStore } from "../src/artifact-store.js";
import {
  ProjectionError,
  addressFieldRootAdmission,
  addressProjectionReceipt,
  verifyProjectionClosure,
  verifyProjectionWithMaterialRoots,
  type FieldRootAdmissionReceipt,
  type ProjectionGraph,
  type ProjectionReceipt,
} from "../src/projection.js";
import { sha256, type Addressed, type Hash } from "../src/residual.js";

const projector = { id: "tranchnode-test", version: "0.1.0" };
const purposeHash = hash("purpose");
const contextHash = hash("context");
const residualHash = hash("residual");
const outputHash = hash("output");

function hash(value: string): Hash {
  return sha256(Buffer.from(value));
}

function admission(fieldRoot: Hash, creationOrder: number) {
  const value: FieldRootAdmissionReceipt = {
    kind: "field_root_admission",
    fieldRoot,
    admittedBy: projector,
    purposeHash,
    creationOrder,
  };
  return addressFieldRootAdmission(value);
}

function projection(
  projectionKind: ProjectionReceipt["projectionKind"],
  fieldRoots: Hash[],
  parentProjectionHashes: Hash[],
  rootAdmissionReceiptHashes: Hash[],
  creationOrder: number,
  residualHashes: Hash[] = [residualHash],
) {
  return addressProjectionReceipt({
    kind: "projection_receipt",
    projectionKind,
    fieldRoots,
    parentProjectionHashes,
    rootAdmissionReceiptHashes,
    projector,
    questionPurposeHash: purposeHash,
    contextHashes: [contextHash],
    outputNodeHashes: [outputHash],
    residualHashes,
    uncertainty: "fixture uncertainty declared",
    creationOrder,
  });
}

function graph(
  projections: Addressed<ProjectionReceipt>[],
  admissions: ReturnType<typeof admission>[],
): ProjectionGraph {
  return {
    projections: new Map(projections.map((item) => [item.hash, item])),
    admissions: new Map(admissions.map((item) => [item.hash, item])),
  };
}

test("single-field Observation -> Tension -> Proposal retains root closure and resolves material root", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tranchnode-projection-"));
  try {
    const store = new FilesystemArtifactStore(directory);
    const material = await store.put(Buffer.from("material-field-a"));
    const rootAdmission = admission(material.address, 1);
    const observation = projection("observation", [material.address], [], [rootAdmission.hash], 2);
    const tension = projection("tension", [material.address], [observation.hash], [], 3);
    const proposal = projection("proposal", [material.address], [tension.hash], [], 4);
    const fixture = graph([observation, tension, proposal], [rootAdmission]);

    const closure = await verifyProjectionWithMaterialRoots(proposal, fixture, store);
    assert.deepEqual([...closure], [material.address]);
    assert.deepEqual(observation.value.residualHashes, [residualHash]);
    assert.deepEqual(tension.value.residualHashes, [residualHash]);
    assert.deepEqual(proposal.value.residualHashes, [residualHash]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("multi-field merge closure passes", () => {
  const rootA = hash("root-a");
  const rootB = hash("root-b");
  const admissionA = admission(rootA, 1);
  const admissionB = admission(rootB, 2);
  const observationA = projection("observation", [rootA], [], [admissionA.hash], 3);
  const observationB = projection("observation", [rootB], [], [admissionB.hash], 4);
  const merged = projection("tension", [rootA, rootB], [observationA.hash, observationB.hash], [], 5);

  assert.deepEqual(
    [...verifyProjectionClosure(merged, graph([observationA, observationB, merged], [admissionA, admissionB]))],
    [rootA, rootB],
  );
});

test("omitted parent root fails", () => {
  const root = hash("root");
  const rootAdmission = admission(root, 1);
  const parent = projection("observation", [root], [], [rootAdmission.hash], 2);
  const child = projection("tension", [], [parent.hash], [], 3);

  assert.throws(
    () => verifyProjectionClosure(child, graph([parent, child], [rootAdmission])),
    (error: unknown) => error instanceof ProjectionError && error.code === "FIELD_ROOT_CLOSURE_MISMATCH",
  );
});

test("invented root fails unless introduced through explicit admission receipt", () => {
  const invented = hash("invented-root");
  const withoutAdmission = projection("observation", [invented], [], [], 1);
  assert.throws(
    () => verifyProjectionClosure(withoutAdmission, graph([withoutAdmission], [])),
    (error: unknown) => error instanceof ProjectionError && error.code === "FIELD_ROOT_CLOSURE_MISMATCH",
  );

  const explicitAdmission = admission(invented, 1);
  const admitted = projection("observation", [invented], [], [explicitAdmission.hash], 2);
  assert.deepEqual(
    [...verifyProjectionClosure(admitted, graph([admitted], [explicitAdmission]))],
    [invented],
  );
});

test("cyclic projection ancestry fails", () => {
  const aliasForB = hash("alias-for-b");
  const a = projection("tension", [], [aliasForB], [], 2, []);
  const b = projection("tension", [], [a.hash], [], 1, []);
  const projections = new Map<Hash, Addressed<ProjectionReceipt>>([
    [a.hash, a],
    [aliasForB, b],
  ]);

  assert.throws(
    () => verifyProjectionClosure(a, { projections, admissions: new Map() }),
    (error: unknown) => error instanceof ProjectionError
      && (error.code === "CYCLIC_PROJECTION_ANCESTRY" || error.code === "INVALID_PARENT_ORDER"),
  );
});

test("parent receipt mutation changes identity and breaks dependent verification", () => {
  const root = hash("root");
  const rootAdmission = admission(root, 1);
  const parent = projection("observation", [root], [], [rootAdmission.hash], 2);
  const child = projection("tension", [root], [parent.hash], [], 3);
  const mutatedParent: Addressed<ProjectionReceipt> = {
    hash: parent.hash,
    value: { ...parent.value, uncertainty: "mutated after addressing" },
  };

  assert.throws(
    () => verifyProjectionClosure(child, {
      projections: new Map([[parent.hash, mutatedParent], [child.hash, child]]),
      admissions: new Map([[rootAdmission.hash, rootAdmission]]),
    }),
    (error: unknown) => error instanceof ProjectionError && error.code === "RECEIPT_IDENTITY_MISMATCH",
  );
});

test("proposal cannot cite only its tension while losing material root closure", () => {
  const root = hash("root");
  const rootAdmission = admission(root, 1);
  const observation = projection("observation", [root], [], [rootAdmission.hash], 2);
  const tension = projection("tension", [root], [observation.hash], [], 3);
  const proposal = projection("proposal", [], [tension.hash], [], 4);

  assert.throws(
    () => verifyProjectionClosure(proposal, graph([observation, tension, proposal], [rootAdmission])),
    (error: unknown) => error instanceof ProjectionError && error.code === "FIELD_ROOT_CLOSURE_MISMATCH",
  );
});

test("declared material roots must resolve through immutable store", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tranchnode-projection-missing-"));
  try {
    const store = new FilesystemArtifactStore(directory);
    const missingRoot = hash("not-in-store");
    const rootAdmission = admission(missingRoot, 1);
    const observation = projection("observation", [missingRoot], [], [rootAdmission.hash], 2);

    await assert.rejects(() => verifyProjectionWithMaterialRoots(
      observation,
      graph([observation], [rootAdmission]),
      store,
    ));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
