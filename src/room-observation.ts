import { lstat as filesystemLstat } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  ROOM_REENTRY_KEYS,
  type ValidatedRoomDeclaration,
  type WitnessObservation,
  type WitnessReference,
} from "./room-contract.js";

export type Lstat = (path: string) => Promise<unknown>;

export function collectWitnessReferences(
  declaration: ValidatedRoomDeclaration,
): WitnessReference[] {
  const references: WitnessReference[] = [];

  for (const key of ROOM_REENTRY_KEYS) {
    const path = declaration.reentry?.[key];
    if (path !== undefined) {
      references.push({ claimRef: `reentry:${key}`, path });
    }
  }

  for (const surface of declaration.executableSurface) {
    for (const path of surface.witnesses) {
      references.push({ claimRef: `proof:${surface.id}`, path });
    }
  }

  for (const dependency of declaration.dependsOn ?? []) {
    for (const path of dependency.witnesses) {
      references.push({
        claimRef: `relationship:${dependency.repository}:${dependency.relation}`,
        path,
      });
    }
  }

  for (const touchpoint of declaration.touchpoints ?? []) {
    for (const path of touchpoint.witnesses) {
      references.push({ claimRef: `navigation:${touchpoint.id}`, path });
    }
  }

  return references;
}

export async function observeWitnessReferences(
  repositoryRoot: string,
  references: readonly WitnessReference[],
  lstat: Lstat = filesystemLstat,
): Promise<WitnessObservation[]> {
  const root = resolve(repositoryRoot);
  const results: WitnessObservation[] = [];

  for (const reference of references) {
    const path = reference.path.endsWith("/") ? reference.path.slice(0, -1) : reference.path;
    const components = path.split("/");
    let current = root;
    let result: WitnessObservation | undefined;

    for (const [index, component] of components.entries()) {
      current = join(current, component);
      try {
        const entry = await lstat(current);
        const finalComponent = index === components.length - 1;
        if (!finalComponent && isSymbolicLink(entry)) {
          result = {
            ...reference,
            reachability: "unresolved",
            reason: "observer-insufficient",
          };
          break;
        }
      } catch (error: unknown) {
        const code = errorCode(error);
        result = code === "ENOENT" || code === "ENOTDIR"
          ? { ...reference, reachability: "unreachable", reason: "path-entry-not-found" }
          : { ...reference, reachability: "unresolved", reason: "observer-insufficient" };
        break;
      }
    }

    results.push(result ?? {
      ...reference,
      reachability: "reachable",
      reason: "path-entry-found",
    });
  }

  return results;
}

function isSymbolicLink(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as { isSymbolicLink?: unknown };
  return typeof candidate.isSymbolicLink === "function"
    && (candidate.isSymbolicLink as () => boolean)();
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}
