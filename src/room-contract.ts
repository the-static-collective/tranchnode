export const ROOM_TOUCHPOINT_KINDS = ["read", "executable", "artifact", "receipt", "gate", "other"] as const;
export const ROOM_TOUCHPOINT_POSTURES = ["inspect", "invoke-under-local-rules", "proposal-only", "human-held", "closed"] as const;
export const ROOM_TOUCHPOINT_ACCESS = ["safe-read", "safe-read-execute", "proposal-only", "human-only", "closed"] as const;
export const ROOM_REENTRY_KEYS = ["readme", "status", "docs", "receipts", "artifacts"] as const;

export type RoomTouchpointKind = (typeof ROOM_TOUCHPOINT_KINDS)[number];
export type RoomTouchpointPosture = (typeof ROOM_TOUCHPOINT_POSTURES)[number];
export type RoomTouchpointAccess = (typeof ROOM_TOUCHPOINT_ACCESS)[number];
export type Reachability = "reachable" | "unreachable" | "unresolved";
export type ObservationReason = "path-entry-found" | "path-entry-not-found" | "observer-insufficient";

export interface WitnessedDeclaration { witnesses?: string[]; }
export interface ExecutableSurface extends WitnessedDeclaration { id: string; status: string; interface?: string; scope?: string; evidence?: unknown; }
export interface RoomDependency extends WitnessedDeclaration { repository: string; relation: string; evidence?: unknown; }
export interface ProjectStatusTouchpoint extends WitnessedDeclaration { id: string; kind: RoomTouchpointKind; posture?: RoomTouchpointPosture; access?: RoomTouchpointAccess; interface?: string; evidence?: unknown; }
export interface RoomTouchpoint extends WitnessedDeclaration { id: string; kind: RoomTouchpointKind; posture: RoomTouchpointPosture; interface?: string; evidence?: unknown; }
export interface RoomReentry { readme?: string; status?: string; docs?: string; receipts?: string; artifacts?: string; }
export interface ProjectStatus {
  schema: "static-collective.project-status.v1"; asOf: string; repository: string; defaultBranch: string; project: string; state: string;
  phase: string; canonicalAuthority: string; observedMainCommit: string; executableSurface: ExecutableSurface[]; nonClaims: string[];
  dependsOn?: RoomDependency[]; humanHeld?: string[]; touchpoints?: ProjectStatusTouchpoint[]; reentry?: RoomReentry;
}
export interface ValidatedRoomDeclaration extends ProjectStatus {
  executableSurface: Array<ExecutableSurface & { witnesses: [string, ...string[]] }>;
  dependsOn?: Array<RoomDependency & { witnesses: [string, ...string[]] }>;
  touchpoints?: Array<RoomTouchpoint & { witnesses: [string, ...string[]] }>;
}
export interface WitnessReference { claimRef: string; path: string; }
export interface WitnessObservation extends WitnessReference { reachability: Reachability; reason: ObservationReason; }
export interface WitnessDiscrepancy { kind: "declared-witness-unreachable"; claimRef: string; path: string; declared: "witness-path"; observed: "unreachable"; disposition: "unresolved"; }
export interface RoomProtocolProjection {
  schema: "static-collective.room-protocol.v0"; kind: "repository-entry-projection";
  source: { path: "PROJECT_STATUS.json"; sha256: string; declaredAsOf: string; declaredObservedMainCommit: string; };
  limits: { projectionGrantsAuthority: false; actualAuthorityDetermination: "unavailable"; projectionDeterminesConstitution: false; navigationGrantsPermission: false; observationFreshness: "not-established"; };
  declaration: {
    identity: { project: string; repository: string; phase: string; declaredAuthorityLocus: string; };
    proofClaims: Array<{ id: string; declaredStatus: string; interface?: string; scope?: string; evidence?: unknown; witnesses: string[]; }>;
    relationshipClaims: Array<{ repository: string; relation: string; direction: "outbound-declaration"; reciprocityDetermination: "not-made"; evidence?: unknown; witnesses: string[]; }>;
    humanHeld: { availability: "declared" | "unavailable"; claims: string[]; };
    navigationPointers: Array<{ id: string; kind: RoomTouchpointKind; declaredPosture: RoomTouchpointPosture; interface?: string; evidence?: unknown; witnesses: string[]; }>;
    reentry: RoomReentry; nonClaims: string[];
  };
  observation: { procedure: "repository-path-lstat/v0"; scope: "declared-repository-paths-only"; results: WitnessObservation[]; };
  discrepancies: WitnessDiscrepancy[];
}

const REPOSITORY_ID = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const KIND = new Set<string>(ROOM_TOUCHPOINT_KINDS), POSTURE = new Set<string>(ROOM_TOUCHPOINT_POSTURES), ACCESS = new Set<string>(ROOM_TOUCHPOINT_ACCESS);
const record = (v: unknown, l: string): Record<string, unknown> => { if (typeof v !== "object" || v === null || Array.isArray(v)) throw new Error(`${l} must be an object`); return v as Record<string, unknown>; };
const string = (v: unknown, l: string): string => { if (typeof v !== "string" || v.trim().length === 0) throw new Error(`${l} must be a non-empty string`); return v; };
const strings = (v: unknown, l: string): string[] => { if (!Array.isArray(v)) throw new Error(`${l} must be an array`); return v.map((x, i) => string(x, `${l}[${i}]`)); };
const repo = (v: unknown, l: string): string => { const r = string(v, l); if (!REPOSITORY_ID.test(r)) throw new Error(`${l} must be an owner/repo identifier`); return r; };
const path = (v: unknown, l: string): string => {
  const p = string(v, l), q = p.endsWith("/") ? p.slice(0, -1) : p;
  if (p !== p.trim() || p.startsWith("/") || p.includes("\\") || p.includes("\0") || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(p) || !q || q.split("/").some(s => !s || s === "." || s === "..")) throw new Error(`${l} must be a normalized repository-relative POSIX path`);
  return p;
};
const witnesses = (v: string[] | undefined, l: string): [string, ...string[]] => {
  if (!v?.length) throw new Error(`${l} must contain at least one repository-relative path`);
  return v.map((p, i) => path(p, `${l}[${i}]`)) as [string, ...string[]];
};
const stable = (v: unknown): unknown => Array.isArray(v) ? v.map(stable) : typeof v === "object" && v !== null ? Object.fromEntries(Object.keys(v as Record<string, unknown>).sort().map(k => [k, stable((v as Record<string, unknown>)[k])])) : v;

function baseWitnesses(o: Record<string, unknown>, label: string): string[] | undefined { return o.witnesses === undefined ? undefined : strings(o.witnesses, `${label}.witnesses`); }

export function validateProjectStatus(value: unknown): ProjectStatus {
  const o = record(value, "status");
  if (o.schema !== "static-collective.project-status.v1") throw new Error("status.schema must equal static-collective.project-status.v1");
  const executableSurface: ExecutableSurface[] = (() => {
    if (!Array.isArray(o.executableSurface)) throw new Error("status.executableSurface must be an array");
    return o.executableSurface.map((entry, i) => { const x = record(entry, `status.executableSurface[${i}]`), r: ExecutableSurface = { id: string(x.id, `status.executableSurface[${i}].id`), status: string(x.status, `status.executableSurface[${i}].status`) }; if (x.interface !== undefined) r.interface = string(x.interface, `status.executableSurface[${i}].interface`); if (x.scope !== undefined) r.scope = string(x.scope, `status.executableSurface[${i}].scope`); if (x.evidence !== undefined) r.evidence = x.evidence; const w = baseWitnesses(x, `status.executableSurface[${i}]`); if (w) r.witnesses = w; return r; });
  })();
  const status: ProjectStatus = { schema: o.schema, asOf: string(o.asOf, "status.asOf"), repository: repo(o.repository, "status.repository"), defaultBranch: string(o.defaultBranch, "status.defaultBranch"), project: string(o.project, "status.project"), state: string(o.state, "status.state"), phase: string(o.phase, "status.phase"), canonicalAuthority: string(o.canonicalAuthority, "status.canonicalAuthority"), observedMainCommit: string(o.observedMainCommit, "status.observedMainCommit"), executableSurface, nonClaims: strings(o.nonClaims, "status.nonClaims") };
  if (o.dependsOn !== undefined) {
    if (!Array.isArray(o.dependsOn)) throw new Error("dependsOn must be an array");
    status.dependsOn = o.dependsOn.map((entry, i) => { const x = record(entry, `dependsOn[${i}]`), r: RoomDependency = { repository: repo(x.repository, `dependsOn[${i}].repository`), relation: string(x.relation, `dependsOn[${i}].relation`) }; if (x.evidence !== undefined) r.evidence = x.evidence; const w = baseWitnesses(x, `dependsOn[${i}]`); if (w) r.witnesses = w; return r; });
  }
  if (o.humanHeld !== undefined) status.humanHeld = strings(o.humanHeld, "humanHeld");
  if (o.touchpoints !== undefined) {
    if (!Array.isArray(o.touchpoints)) throw new Error("touchpoints must be an array");
    const seen = new Set<string>();
    status.touchpoints = o.touchpoints.map((entry, i) => { const x = record(entry, `touchpoints[${i}]`), id = string(x.id, `touchpoints[${i}].id`), kind = string(x.kind, `touchpoints[${i}].kind`); if (seen.has(id)) throw new Error(`duplicate touchpoint id: ${id}`); seen.add(id); if (!KIND.has(kind)) throw new Error(`touchpoints[${i}].kind has unknown value: ${kind}`); const r: ProjectStatusTouchpoint = { id, kind: kind as RoomTouchpointKind }; if (x.posture !== undefined) { const p = string(x.posture, `touchpoints[${i}].posture`); if (!POSTURE.has(p)) throw new Error(`touchpoints[${i}].posture has unknown value: ${p}`); r.posture = p as RoomTouchpointPosture; } if (x.access !== undefined) { const a = string(x.access, `touchpoints[${i}].access`); if (!ACCESS.has(a)) throw new Error(`touchpoints[${i}].access has unknown value: ${a}`); r.access = a as RoomTouchpointAccess; } if ((r.posture === undefined) === (r.access === undefined)) throw new Error(`touchpoints[${i}] must declare exactly one of posture or legacy access`); if (x.interface !== undefined) r.interface = string(x.interface, `touchpoints[${i}].interface`); if (x.evidence !== undefined) r.evidence = x.evidence; const w = baseWitnesses(x, `touchpoints[${i}]`); if (w) r.witnesses = w; return r; });
  }
  if (o.reentry !== undefined) {
    const x = record(o.reentry, "reentry");
    for (const k of Object.keys(x)) if (!(ROOM_REENTRY_KEYS as readonly string[]).includes(k)) throw new Error(`reentry.${k} is not a supported landmark`);
    status.reentry = {}; for (const k of ROOM_REENTRY_KEYS) if (x[k] !== undefined) status.reentry[k] = path(x[k], `reentry.${k}`);
  }
  return status;
}

export function validateRoomDeclaration(status: ProjectStatus): ValidatedRoomDeclaration {
  if (!status.reentry || Object.keys(status.reentry).length === 0) throw new Error("Room declaration requires at least one reentry landmark");
  const proofIds = new Set<string>();
  const executableSurface = status.executableSurface.map((s, i) => { if (proofIds.has(s.id)) throw new Error(`duplicate proof id: ${s.id}`); proofIds.add(s.id); return { ...s, witnesses: witnesses(s.witnesses, `status.executableSurface[${i}].witnesses`) }; });
  const rels = new Set<string>();
  const dependsOn = status.dependsOn?.map((d, i) => { const ref = `${d.repository}:${d.relation}`; if (rels.has(ref)) throw new Error(`duplicate relationship claim: ${ref}`); rels.add(ref); return { ...d, witnesses: witnesses(d.witnesses, `dependsOn[${i}].witnesses`) }; });
  const touchpoints = status.touchpoints?.map((t, i) => { if (t.access !== undefined) throw new Error(`touchpoints[${i}].access is legacy permission-shaped syntax and is not valid for a Room declaration`); if (t.posture === undefined) throw new Error(`touchpoints[${i}].posture is required for a Room declaration`); return { id: t.id, kind: t.kind, posture: t.posture, ...(t.interface !== undefined ? { interface: t.interface } : {}), ...(t.evidence !== undefined ? { evidence: t.evidence } : {}), witnesses: witnesses(t.witnesses, `touchpoints[${i}].witnesses`) }; });
  return { ...status, executableSurface, ...(dependsOn ? { dependsOn } : {}), ...(touchpoints ? { touchpoints } : {}) } as ValidatedRoomDeclaration;
}

export function createRoomProtocolProjection(declaration: ValidatedRoomDeclaration, observations: readonly WitnessObservation[], sourceSha256: string): RoomProtocolProjection {
  const results = observations.map(o => ({ ...o }));
  return {
    schema: "static-collective.room-protocol.v0", kind: "repository-entry-projection",
    source: { path: "PROJECT_STATUS.json", sha256: sourceSha256, declaredAsOf: declaration.asOf, declaredObservedMainCommit: declaration.observedMainCommit },
    limits: { projectionGrantsAuthority: false, actualAuthorityDetermination: "unavailable", projectionDeterminesConstitution: false, navigationGrantsPermission: false, observationFreshness: "not-established" },
    declaration: {
      identity: { project: declaration.project, repository: declaration.repository, phase: declaration.phase, declaredAuthorityLocus: declaration.canonicalAuthority },
      proofClaims: declaration.executableSurface.map(s => ({ id: s.id, declaredStatus: s.status, ...(s.interface !== undefined ? { interface: s.interface } : {}), ...(s.scope !== undefined ? { scope: s.scope } : {}), ...(s.evidence !== undefined ? { evidence: stable(s.evidence) } : {}), witnesses: [...s.witnesses] })),
      relationshipClaims: (declaration.dependsOn ?? []).map(d => ({ repository: d.repository, relation: d.relation, direction: "outbound-declaration", reciprocityDetermination: "not-made", ...(d.evidence !== undefined ? { evidence: stable(d.evidence) } : {}), witnesses: [...d.witnesses] })),
      humanHeld: declaration.humanHeld === undefined ? { availability: "unavailable", claims: [] } : { availability: "declared", claims: [...declaration.humanHeld] },
      navigationPointers: (declaration.touchpoints ?? []).map(t => ({ id: t.id, kind: t.kind, declaredPosture: t.posture, ...(t.interface !== undefined ? { interface: t.interface } : {}), ...(t.evidence !== undefined ? { evidence: stable(t.evidence) } : {}), witnesses: [...t.witnesses] })),
      reentry: { ...(declaration.reentry ?? {}) }, nonClaims: [...declaration.nonClaims],
    },
    observation: { procedure: "repository-path-lstat/v0", scope: "declared-repository-paths-only", results },
    discrepancies: results.filter(o => o.reachability === "unreachable").map(o => ({ kind: "declared-witness-unreachable", claimRef: o.claimRef, path: o.path, declared: "witness-path", observed: "unreachable", disposition: "unresolved" })),
  };
}

const observation = (p: RoomProtocolProjection, ref: string, witness: string) => p.observation.results.find(o => o.claimRef === ref && o.path === witness);
function witnessLines(lines: string[], p: RoomProtocolProjection, ref: string, ws: readonly string[]) { for (const w of ws) { const o = observation(p, ref, w); lines.push(`  - witness: \`${w}\` — bounded observation: ${o ? `${o.reachability} (${o.reason})` : "not recorded"}`); } }

export function renderRoomMarkdown(p: RoomProtocolProjection): string {
  const l = [`# ${p.declaration.identity.project} — Room`, "", "> Repository entry projection only. Source values are declaration testimony; bounded observation reports path-entry reachability only. This projection grants no authority or permission and determines no constitution.", "", `Source: \`${p.source.path}\` — sha256: \`${p.source.sha256}\``, `Declared observed main commit: \`${p.source.declaredObservedMainCommit}\``, `Repository: \`${p.declaration.identity.repository}\``, "", "## Projection limits", "", `- projectionGrantsAuthority: ${p.limits.projectionGrantsAuthority}`, `- actualAuthorityDetermination: ${p.limits.actualAuthorityDetermination}`, `- projectionDeterminesConstitution: ${p.limits.projectionDeterminesConstitution}`, `- navigationGrantsPermission: ${p.limits.navigationGrantsPermission}`, `- observationFreshness: ${p.limits.observationFreshness}`, `- observation procedure: ${p.observation.procedure}; scope: ${p.observation.scope}`, "", "## What are you?", "", "Declaration:", `- Project: ${p.declaration.identity.project}`, `- Repository: \`${p.declaration.identity.repository}\``, `- Phase: ${p.declaration.identity.phase}`, `- Declared authority locus: ${p.declaration.identity.declaredAuthorityLocus}`, "", "## What do you currently prove?", "", "Declaration:"];
  if (!p.declaration.proofClaims.length) l.push("- No proof claims declared."); else for (const c of p.declaration.proofClaims) { l.push(`- \`${c.id}\` — declared status: ${c.declaredStatus}${c.interface ? ` — interface: \`${c.interface}\`` : ""}${c.scope ? ` — scope: ${c.scope}` : ""}`); witnessLines(l, p, `proof:${c.id}`, c.witnesses); }
  l.push("", "## What do you depend on?", "", "Declaration:"); if (!p.declaration.relationshipClaims.length) l.push("- No relationship claims declared."); else for (const c of p.declaration.relationshipClaims) { l.push(`- \`${c.repository}\` — ${c.relation} — direction: ${c.direction}; reciprocity: ${c.reciprocityDetermination}`); witnessLines(l, p, `relationship:${c.repository}:${c.relation}`, c.witnesses); }
  l.push("", "## What remains human-held?", "", "Declaration:"); if (p.declaration.humanHeld.availability === "unavailable") l.push("- Human-held authority documentation is unavailable. Absence is not permission; actual authority determination remains unavailable."); else { for (const c of p.declaration.humanHeld.claims) l.push(`- ${c}`); l.push("- These are declarations only; actual authority determination remains unavailable."); }
  l.push("", "## Where may another project safely touch you?", "", "Declaration:", "- Navigation pointers identify next inspection targets only. Navigation is not a warrant or permission."); if (!p.declaration.navigationPointers.length) l.push("- No navigation pointers declared."); else for (const c of p.declaration.navigationPointers) { l.push(`- [declared posture: ${c.declaredPosture}] \`${c.id}\` (${c.kind})${c.interface ? ` — interface: \`${c.interface}\`` : ""}`); witnessLines(l, p, `navigation:${c.id}`, c.witnesses); }
  l.push("", "## Re-entry landmarks", "", "Declaration:"); const rs = ROOM_REENTRY_KEYS.flatMap(k => p.declaration.reentry[k] === undefined ? [] : [[k, p.declaration.reentry[k]!] as const]); if (!rs.length) l.push("- No re-entry landmarks declared."); else for (const [k, w] of rs) { l.push(`- ${k}: \`${w}\``); witnessLines(l, p, `reentry:${k}`, [w]); }
  l.push("", "## Unresolved discrepancies", ""); if (!p.discrepancies.length) l.push("- None produced by the bounded observation procedure."); else for (const d of p.discrepancies) l.push(`- \`${d.claimRef}\` witness \`${d.path}\` was observed unreachable; disposition: unresolved. The declaration is preserved without a truth conclusion.`);
  l.push("", "## Non-claims", ""); if (!p.declaration.nonClaims.length) l.push("- None declared."); else for (const n of p.declaration.nonClaims) l.push(`- ${n}`); l.push(""); return l.join("\n");
}
export const renderRoomJson = (p: RoomProtocolProjection): string => `${JSON.stringify(p, null, 2)}\n`;
