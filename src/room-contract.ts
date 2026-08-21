export const ROOM_TOUCHPOINT_KINDS = [
  "read",
  "executable",
  "artifact",
  "receipt",
  "gate",
  "other",
] as const;

export const ROOM_TOUCHPOINT_ACCESS = [
  "safe-read",
  "safe-read-execute",
  "proposal-only",
  "human-only",
  "closed",
] as const;

export type RoomTouchpointKind = (typeof ROOM_TOUCHPOINT_KINDS)[number];
export type RoomTouchpointAccess = (typeof ROOM_TOUCHPOINT_ACCESS)[number];

export interface RoomDependency {
  repository: string;
  relation: string;
  evidence?: unknown;
}

export interface RoomTouchpoint {
  id: string;
  kind: RoomTouchpointKind;
  access: RoomTouchpointAccess;
  interface?: string;
  evidence?: unknown;
}

export interface RoomReentry {
  readme?: string;
  status?: string;
  docs?: string;
  receipts?: string;
  artifacts?: string;
}

export interface ExecutableSurface {
  id: string;
  status: string;
  interface?: string;
  scope?: string;
  evidence?: unknown;
}

export interface ProjectStatus {
  schema: "static-collective.project-status.v1";
  asOf: string;
  repository: string;
  defaultBranch: string;
  project: string;
  state: string;
  phase: string;
  canonicalAuthority: string;
  observedMainCommit: string;
  executableSurface: ExecutableSurface[];
  nonClaims: string[];
  dependsOn?: RoomDependency[];
  humanHeld?: string[];
  touchpoints?: RoomTouchpoint[];
  reentry?: RoomReentry;
}

const REPOSITORY_ID = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const REENTRY_KEYS = ["readme", "status", "docs", "receipts", "artifacts"] as const;
const TOUCHPOINT_KIND_SET = new Set<string>(ROOM_TOUCHPOINT_KINDS);
const TOUCHPOINT_ACCESS_SET = new Set<string>(ROOM_TOUCHPOINT_ACCESS);

export function validateProjectStatus(value: unknown): ProjectStatus {
  const object = requireRecord(value, "status");

  if (object.schema !== "static-collective.project-status.v1") {
    throw new Error("status.schema must equal static-collective.project-status.v1");
  }

  const status: ProjectStatus = {
    schema: object.schema,
    asOf: requireString(object.asOf, "status.asOf"),
    repository: requireRepositoryId(object.repository, "status.repository"),
    defaultBranch: requireString(object.defaultBranch, "status.defaultBranch"),
    project: requireString(object.project, "status.project"),
    state: requireString(object.state, "status.state"),
    phase: requireString(object.phase, "status.phase"),
    canonicalAuthority: requireString(object.canonicalAuthority, "status.canonicalAuthority"),
    observedMainCommit: requireString(object.observedMainCommit, "status.observedMainCommit"),
    executableSurface: validateExecutableSurface(object.executableSurface),
    nonClaims: requireStringArray(object.nonClaims, "status.nonClaims"),
  };

  if (object.dependsOn !== undefined) {
    status.dependsOn = validateDependencies(object.dependsOn);
  }
  if (object.humanHeld !== undefined) {
    status.humanHeld = requireStringArray(object.humanHeld, "humanHeld");
  }
  if (object.touchpoints !== undefined) {
    status.touchpoints = validateTouchpoints(object.touchpoints);
  }
  if (object.reentry !== undefined) {
    status.reentry = validateReentry(object.reentry);
  }

  return status;
}

function validateExecutableSurface(value: unknown): ExecutableSurface[] {
  if (!Array.isArray(value)) {
    throw new Error("status.executableSurface must be an array");
  }

  return value.map((entry, index) => {
    const object = requireRecord(entry, `status.executableSurface[${index}]`);
    const surface: ExecutableSurface = {
      id: requireString(object.id, `status.executableSurface[${index}].id`),
      status: requireString(object.status, `status.executableSurface[${index}].status`),
    };
    if (object.interface !== undefined) {
      surface.interface = requireString(object.interface, `status.executableSurface[${index}].interface`);
    }
    if (object.scope !== undefined) {
      surface.scope = requireString(object.scope, `status.executableSurface[${index}].scope`);
    }
    if (object.evidence !== undefined) {
      surface.evidence = object.evidence;
    }
    return surface;
  });
}

function validateDependencies(value: unknown): RoomDependency[] {
  if (!Array.isArray(value)) {
    throw new Error("dependsOn must be an array");
  }

  return value.map((entry, index) => {
    const object = requireRecord(entry, `dependsOn[${index}]`);
    const dependency: RoomDependency = {
      repository: requireRepositoryId(object.repository, `dependsOn[${index}].repository`),
      relation: requireString(object.relation, `dependsOn[${index}].relation`),
    };
    if (object.evidence !== undefined) {
      dependency.evidence = object.evidence;
    }
    return dependency;
  });
}

function validateTouchpoints(value: unknown): RoomTouchpoint[] {
  if (!Array.isArray(value)) {
    throw new Error("touchpoints must be an array");
  }

  const seen = new Set<string>();
  return value.map((entry, index) => {
    const object = requireRecord(entry, `touchpoints[${index}]`);
    const id = requireString(object.id, `touchpoints[${index}].id`);
    if (seen.has(id)) {
      throw new Error(`duplicate touchpoint id: ${id}`);
    }
    seen.add(id);

    const kind = requireString(object.kind, `touchpoints[${index}].kind`);
    if (!TOUCHPOINT_KIND_SET.has(kind)) {
      throw new Error(`touchpoints[${index}].kind has unknown value: ${kind}`);
    }

    const access = requireString(object.access, `touchpoints[${index}].access`);
    if (!TOUCHPOINT_ACCESS_SET.has(access)) {
      throw new Error(`touchpoints[${index}].access has unknown value: ${access}`);
    }

    const touchpoint: RoomTouchpoint = {
      id,
      kind: kind as RoomTouchpointKind,
      access: access as RoomTouchpointAccess,
    };
    if (object.interface !== undefined) {
      touchpoint.interface = requireString(object.interface, `touchpoints[${index}].interface`);
    }
    if (object.evidence !== undefined) {
      touchpoint.evidence = object.evidence;
    }
    return touchpoint;
  });
}

function validateReentry(value: unknown): RoomReentry {
  const object = requireRecord(value, "reentry");
  for (const key of Object.keys(object)) {
    if (!(REENTRY_KEYS as readonly string[]).includes(key)) {
      throw new Error(`reentry.${key} is not a supported landmark`);
    }
  }

  const reentry: RoomReentry = {};
  for (const key of REENTRY_KEYS) {
    const candidate = object[key];
    if (candidate !== undefined) {
      reentry[key] = requireRepositoryRelativePath(candidate, `reentry.${key}`);
    }
  }
  return reentry;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function requireStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value.map((item, index) => requireString(item, `${label}[${index}]`));
}

function requireRepositoryId(value: unknown, label: string): string {
  const repository = requireString(value, label);
  if (!REPOSITORY_ID.test(repository)) {
    throw new Error(`${label} must be an owner/repo identifier`);
  }
  return repository;
}

function requireRepositoryRelativePath(value: unknown, label: string): string {
  const path = requireString(value, label);
  if (path.startsWith("/") || path.includes("\\") || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(path)) {
    throw new Error(`${label} must be a repository-relative path`);
  }
  const segments = path.split("/");
  if (segments.some((segment) => segment === "..")) {
    throw new Error(`${label} must be a repository-relative path`);
  }
  return path;
}
