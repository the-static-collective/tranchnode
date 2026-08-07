import { createHash, randomBytes } from "node:crypto";
import {
  constants as fsConstants,
  link,
  mkdir,
  open,
  readFile,
  realpath,
  rm,
} from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import type { Hash } from "./residual.js";

const SHA256_ADDRESS = /^sha256:([0-9a-f]{64})$/;

export class ArtifactStoreError extends Error {
  constructor(
    public readonly code:
      | "INVALID_ARTIFACT_ADDRESS"
      | "PATH_ESCAPE"
      | "ARTIFACT_CORRUPTION"
      | "ARTIFACT_NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "ArtifactStoreError";
  }
}

export interface PutResult {
  address: Hash;
  created: boolean;
  byteLength: number;
}

export function artifactAddress(bytes: Uint8Array): Hash {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export function parseArtifactAddress(address: Hash | string): string {
  const match = SHA256_ADDRESS.exec(address);
  const digest = match?.[1];
  if (!digest) {
    throw new ArtifactStoreError(
      "INVALID_ARTIFACT_ADDRESS",
      "Artifact addresses must be lowercase sha256:<64 hex characters>",
    );
  }
  return digest;
}

export class FilesystemArtifactStore {
  private readonly root: string;
  private readonly objectsRoot: string;

  constructor(root: string) {
    if (!root) {
      throw new ArtifactStoreError("PATH_ESCAPE", "Artifact store root is required");
    }
    this.root = resolve(root);
    this.objectsRoot = resolve(this.root, "objects", "sha256");
  }

  pathFor(address: Hash | string): string {
    const digest = parseArtifactAddress(address);
    const candidate = resolve(this.objectsRoot, digest.slice(0, 2), digest.slice(2, 4), digest);
    this.assertInsideRoot(candidate);
    return candidate;
  }

  async put(bytes: Uint8Array): Promise<PutResult> {
    const payload = Buffer.from(bytes);
    const address = artifactAddress(payload);
    const destination = this.pathFor(address);
    const directory = dirname(destination);
    await mkdir(directory, { recursive: true });
    await this.assertDirectoryInsideRoot(directory);

    const temporary = resolve(
      directory,
      `.${parseArtifactAddress(address)}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`,
    );
    this.assertInsideRoot(temporary);

    let file;
    try {
      file = await open(temporary, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY, 0o444);
      await file.writeFile(payload);
      await file.sync();
      await file.close();
      file = undefined;

      try {
        await link(temporary, destination);
        await this.syncDirectory(directory);
        return { address, created: true, byteLength: payload.byteLength };
      } catch (error) {
        if (!isAlreadyExists(error)) throw error;
      }
    } finally {
      if (file) await file.close().catch(() => undefined);
      await rm(temporary, { force: true }).catch(() => undefined);
    }

    const existing = await this.readVerified(address);
    if (!existing.equals(payload)) {
      throw new ArtifactStoreError(
        "ARTIFACT_CORRUPTION",
        `Existing object at ${address} does not match supplied bytes`,
      );
    }
    return { address, created: false, byteLength: payload.byteLength };
  }

  async get(address: Hash | string): Promise<Buffer> {
    return this.readVerified(address);
  }

  private async readVerified(address: Hash | string): Promise<Buffer> {
    const destination = this.pathFor(address);
    try {
      await this.assertExistingPathInsideRoot(destination);
      const bytes = await readFile(destination);
      const actual = artifactAddress(bytes);
      if (actual !== address) {
        throw new ArtifactStoreError(
          "ARTIFACT_CORRUPTION",
          `Stored bytes hash to ${actual}, not requested address ${address}`,
        );
      }
      return bytes;
    } catch (error) {
      if (isNotFound(error)) {
        throw new ArtifactStoreError("ARTIFACT_NOT_FOUND", `No artifact exists at ${address}`);
      }
      throw error;
    }
  }

  private assertInsideRoot(candidate: string): void {
    const rel = relative(this.root, candidate);
    if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) return;
    throw new ArtifactStoreError("PATH_ESCAPE", "Resolved artifact path escapes the store root");
  }

  private async assertDirectoryInsideRoot(directory: string): Promise<void> {
    this.assertInsideRoot(directory);
    const [realRoot, realDirectory] = await Promise.all([realpath(this.root), realpath(directory)]);
    const rel = relative(realRoot, realDirectory);
    if (rel.startsWith("..") || isAbsolute(rel)) {
      throw new ArtifactStoreError("PATH_ESCAPE", "Artifact directory resolves outside the store root");
    }
  }

  private async assertExistingPathInsideRoot(candidate: string): Promise<void> {
    this.assertInsideRoot(candidate);
    const [realRoot, realCandidate] = await Promise.all([realpath(this.root), realpath(candidate)]);
    const rel = relative(realRoot, realCandidate);
    if (rel.startsWith("..") || isAbsolute(rel)) {
      throw new ArtifactStoreError("PATH_ESCAPE", "Artifact path resolves outside the store root");
    }
  }

  private async syncDirectory(directory: string): Promise<void> {
    try {
      const handle = await open(directory, fsConstants.O_RDONLY);
      try {
        await handle.sync();
      } finally {
        await handle.close();
      }
    } catch (error) {
      if (!isUnsupportedDirectorySync(error)) throw error;
    }
  }
}

function isAlreadyExists(error: unknown): boolean {
  return isNodeError(error) && error.code === "EEXIST";
}

function isNotFound(error: unknown): boolean {
  return isNodeError(error) && error.code === "ENOENT";
}

function isUnsupportedDirectorySync(error: unknown): boolean {
  return isNodeError(error) && ["EINVAL", "ENOTSUP", "EISDIR", "EPERM"].includes(error.code ?? "");
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
