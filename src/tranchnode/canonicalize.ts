import { CANONICALIZATION_VERSION } from "./ontology/fulfillment.ts";
import type { ContentHash } from "./ontology/fulfillment.ts";

export const CANONICALIZATION_VERSION_CURRENT = CANONICALIZATION_VERSION;

function assertFiniteNumber(n: unknown): void {
  if (typeof n !== "number" || !Number.isFinite(n)) throw new Error(`non-finite number forbidden in canonical payload: ${n}`);
}
function normalizeString(s: string): string { return s.normalize("NFC"); }
function canonicalizeValue(value: unknown): unknown {
  if (value === undefined) throw new Error("undefined forbidden in canonical payload - omit key instead");
  if (value === null) return null;
  if (typeof value === "number") { assertFiniteNumber(value); return value; }
  if (typeof value === "string") return normalizeString(value);
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(canonicalizeValue);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).filter((k) => k !== "canonicalHash").sort()) {
      if (obj[key] === undefined) throw new Error(`undefined value for key ${key} - must be omitted`);
      out[key] = canonicalizeValue(obj[key]);
    }
    return out;
  }
  throw new Error(`unsupported type in canonical payload: ${typeof value}`);
}
export function canonicalize<T>(payload: T) {
  const envelope = { canonicalizationVersion: CANONICALIZATION_VERSION_CURRENT, payload: canonicalizeValue(payload) };
  return { bytes: JSON.stringify(envelope), envelope };
}
export async function hashCanonical(bytes: string): Promise<ContentHash> {
  const { createHash } = await import("node:crypto");
  return `sha256:${createHash("sha256").update(bytes, "utf8").digest("hex")}`;
}
export async function canonicalizeAndHash<T>(payload: T): Promise<{ bytes: string; hash: ContentHash }> {
  const { bytes } = canonicalize(payload);
  return { bytes, hash: await hashCanonical(bytes) };
}
