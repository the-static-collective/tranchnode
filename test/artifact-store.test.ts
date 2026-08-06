import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  ArtifactStoreError,
  FilesystemArtifactStore,
  artifactAddress,
  parseArtifactAddress,
} from "../src/artifact-store.js";
import { sha256 } from "../src/residual.js";

async function withStore(run: (store: FilesystemArtifactStore, root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "tranchnode-artifacts-"));
  try {
    await run(new FilesystemArtifactStore(root), root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("put/get round trip uses the Project0-compatible raw-byte address", async () => {
  await withStore(async (store) => {
    const bytes = Buffer.from([0, 1, 2, 3, 255]);
    const result = await store.put(bytes);
    assert.equal(result.address, sha256(bytes));
    assert.equal(result.address, artifactAddress(bytes));
    assert.equal(result.created, true);
    assert.deepEqual(await store.get(result.address), bytes);
  });
});

test("duplicate writes are idempotent and concurrent identical writes converge", async () => {
  await withStore(async (store) => {
    const bytes = Buffer.from("same raw bytes", "utf8");
    const results = await Promise.all(Array.from({ length: 12 }, () => store.put(bytes)));
    assert.equal(new Set(results.map((result) => result.address)).size, 1);
    assert.equal(results.filter((result) => result.created).length, 1);
    assert.deepEqual(await store.get(results[0].address), bytes);
  });
});

test("raw-byte identity is independent of filename, media type, and metadata", async () => {
  await withStore(async (store) => {
    const bytes = Buffer.from("artifact payload", "utf8");
    const first = await store.put(bytes);
    const second = await store.put(Buffer.from(bytes));
    assert.equal(first.address, second.address);
    assert.equal(second.created, false);
  });
});

test("verified reads detect addressed-path corruption", async () => {
  await withStore(async (store) => {
    const bytes = Buffer.from("original", "utf8");
    const { address } = await store.put(bytes);
    await writeFile(store.pathFor(address), Buffer.from("tampered", "utf8"));
    await assert.rejects(
      store.get(address),
      (error: unknown) => error instanceof ArtifactStoreError && error.code === "ARTIFACT_CORRUPTION",
    );
    await assert.rejects(
      store.put(bytes),
      (error: unknown) => error instanceof ArtifactStoreError && error.code === "ARTIFACT_CORRUPTION",
    );
  });
});

test("malformed addresses and traversal attempts cannot escape the root", async () => {
  await withStore(async (store, root) => {
    for (const address of [
      "sha256:../outside",
      "sha256:ABCDEF",
      `sha256:${"0".repeat(63)}`,
      `sha512:${"0".repeat(64)}`,
    ]) {
      assert.throws(
        () => store.pathFor(address),
        (error: unknown) => error instanceof ArtifactStoreError && error.code === "INVALID_ARTIFACT_ADDRESS",
      );
    }

    const outside = await mkdtemp(join(tmpdir(), "tranchnode-outside-"));
    try {
      const bytes = Buffer.from("outside", "utf8");
      const address = artifactAddress(bytes);
      const digest = parseArtifactAddress(address);
      const shard = join(root, "objects", "sha256", digest.slice(0, 2));
      await mkdir(dirname(shard), { recursive: true });
      await symlink(outside, shard, "dir");
      const outsideObject = join(outside, digest.slice(2, 4), digest);
      await mkdir(dirname(outsideObject), { recursive: true });
      await writeFile(outsideObject, bytes);
      await assert.rejects(
        store.get(address),
        (error: unknown) => error instanceof ArtifactStoreError && error.code === "PATH_ESCAPE",
      );
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
});

test("object layout is deterministic", async () => {
  await withStore(async (store) => {
    const bytes = Buffer.from("layout", "utf8");
    const address = artifactAddress(bytes);
    const digest = parseArtifactAddress(address);
    const { address: storedAddress } = await store.put(bytes);
    assert.equal(storedAddress, address);
    const stored = await readFile(store.pathFor(address));
    assert.deepEqual(stored, bytes);
    assert.match(store.pathFor(address), new RegExp(`objects[/\\\\]sha256[/\\\\]${digest.slice(0, 2)}[/\\\\]${digest.slice(2, 4)}[/\\\\]${digest}$`));
  });
});
