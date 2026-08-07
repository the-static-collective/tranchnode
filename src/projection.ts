import type { Addressed, Hash } from "./residual.js";
import { addressJson } from "./residual.js";

export type ProjectionKind = "observation" | "tension" | "proposal";

export interface ProjectorIdentity {
  id: string;
  version: string;
}

export interface FieldRootAdmissionReceipt {
  kind: "field_root_admission";
  fieldRoot: Hash;
  admittedBy: ProjectorIdentity;
  purposeHash: Hash;
  creationOrder: number;
}

export interface ProjectionReceipt {
  kind: "projection_receipt";
  projectionKind: ProjectionKind;
  fieldRoots: Hash[];
  parentProjectionHashes: Hash[];
  rootAdmissionReceiptHashes: Hash[];
  projector: ProjectorIdentity;
  questionPurposeHash: Hash;
  contextHashes: Hash[];
  outputNodeHashes: Hash[];
  residualHashes: Hash[];
  uncertainty: string;
  creationOrder: number;
}

export interface ProjectionGraph {
  projections: ReadonlyMap<Hash, Addressed<ProjectionReceipt>>;
  admissions: ReadonlyMap<Hash, Addressed<FieldRootAdmissionReceipt>>;
}

export interface MaterialRootStore {
  get(address: Hash | string): Promise<Uint8Array>;
}

export class ProjectionError extends Error {
  constructor(
    public readonly code:
      | "RECEIPT_IDENTITY_MISMATCH"
      | "MISSING_PARENT_PROJECTION"
      | "MISSING_ROOT_ADMISSION"
      | "ROOT_ADMISSION_IDENTITY_MISMATCH"
      | "INVALID_ROOT_ADMISSION_ORDER"
      | "INVALID_PARENT_ORDER"
      | "FIELD_ROOT_CLOSURE_MISMATCH"
      | "CYCLIC_PROJECTION_ANCESTRY",
    message: string,
  ) {
    super(message);
    this.name = "ProjectionError";
  }
}

export function addressProjectionReceipt(receipt: ProjectionReceipt): Addressed<ProjectionReceipt> {
  return addressJson(receipt);
}

export function addressFieldRootAdmission(
  receipt: FieldRootAdmissionReceipt,
): Addressed<FieldRootAdmissionReceipt> {
  return addressJson(receipt);
}

export function verifyProjectionClosure(
  target: Addressed<ProjectionReceipt>,
  graph: ProjectionGraph,
): ReadonlySet<Hash> {
  const visiting = new Set<Hash>();
  const verified = new Map<Hash, ReadonlySet<Hash>>();

  const walk = (addressed: Addressed<ProjectionReceipt>): ReadonlySet<Hash> => {
    assertProjectionIdentity(addressed);

    const cached = verified.get(addressed.hash);
    if (cached) return cached;
    if (visiting.has(addressed.hash)) {
      throw new ProjectionError(
        "CYCLIC_PROJECTION_ANCESTRY",
        `Projection ancestry contains a cycle at ${addressed.hash}`,
      );
    }

    visiting.add(addressed.hash);
    try {
      const expectedRoots = new Set<Hash>();

      for (const parentHash of addressed.value.parentProjectionHashes) {
        const parent = graph.projections.get(parentHash);
        if (!parent) {
          throw new ProjectionError(
            "MISSING_PARENT_PROJECTION",
            `Projection ${addressed.hash} references missing parent ${parentHash}`,
          );
        }
        if (parent.value.creationOrder >= addressed.value.creationOrder) {
          throw new ProjectionError(
            "INVALID_PARENT_ORDER",
            `Parent ${parentHash} must precede child ${addressed.hash}`,
          );
        }
        for (const root of walk(parent)) expectedRoots.add(root);
      }

      for (const admissionHash of addressed.value.rootAdmissionReceiptHashes) {
        const admission = graph.admissions.get(admissionHash);
        if (!admission) {
          throw new ProjectionError(
            "MISSING_ROOT_ADMISSION",
            `Projection ${addressed.hash} references missing root admission ${admissionHash}`,
          );
        }
        assertAdmissionIdentity(admission);
        if (admission.value.creationOrder > addressed.value.creationOrder) {
          throw new ProjectionError(
            "INVALID_ROOT_ADMISSION_ORDER",
            `Root admission ${admissionHash} occurs after projection ${addressed.hash}`,
          );
        }
        expectedRoots.add(admission.value.fieldRoot);
      }

      const declaredRoots = new Set(addressed.value.fieldRoots);
      if (!sameSet(expectedRoots, declaredRoots)) {
        const missing = [...expectedRoots].filter((root) => !declaredRoots.has(root));
        const invented = [...declaredRoots].filter((root) => !expectedRoots.has(root));
        throw new ProjectionError(
          "FIELD_ROOT_CLOSURE_MISMATCH",
          `Projection ${addressed.hash} violates field-root closure; missing=[${missing.join(",")}], invented=[${invented.join(",")}]`,
        );
      }

      const closure = new Set(declaredRoots);
      verified.set(addressed.hash, closure);
      return closure;
    } finally {
      visiting.delete(addressed.hash);
    }
  };

  return walk(target);
}

export async function verifyProjectionWithMaterialRoots(
  target: Addressed<ProjectionReceipt>,
  graph: ProjectionGraph,
  store: MaterialRootStore,
): Promise<ReadonlySet<Hash>> {
  const closure = verifyProjectionClosure(target, graph);
  await Promise.all([...closure].map((root) => store.get(root)));
  return closure;
}

function assertProjectionIdentity(addressed: Addressed<ProjectionReceipt>): void {
  if (addressJson(addressed.value).hash !== addressed.hash) {
    throw new ProjectionError(
      "RECEIPT_IDENTITY_MISMATCH",
      `Projection receipt body does not hash to declared identity ${addressed.hash}`,
    );
  }
}

function assertAdmissionIdentity(addressed: Addressed<FieldRootAdmissionReceipt>): void {
  if (addressJson(addressed.value).hash !== addressed.hash) {
    throw new ProjectionError(
      "ROOT_ADMISSION_IDENTITY_MISMATCH",
      `Root admission body does not hash to declared identity ${addressed.hash}`,
    );
  }
}

function sameSet<T>(left: ReadonlySet<T>, right: ReadonlySet<T>): boolean {
  if (left.size !== right.size) return false;
  for (const item of left) {
    if (!right.has(item)) return false;
  }
  return true;
}
