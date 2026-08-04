import test from "node:test";
import assert from "node:assert/strict";
import { addressJson } from "../src/residual.js";
import { createHash } from "node:crypto";

test("characterization: numeric boundaries and unsafe integers", () => {
  const safe = addressJson({ n: Number.MAX_SAFE_INTEGER });
  // JCS/canonicalize in Node might just serialize it.
  const unsafe = addressJson({ n: 9007199254740992 }); // MAX_SAFE_INTEGER + 1
  assert.equal(safe.hash !== unsafe.hash, true, "Hashes should differ for different numbers");
});

test("characterization: canonical-address compatibility", () => {
  const obj1 = addressJson({ a: 1, b: 2 });
  const obj2 = addressJson({ b: 2, a: 1 });
  assert.equal(obj1.hash, obj2.hash, "Keys should be sorted alphanumerically per RFC 8785");
});

test("characterization: timestamp rules", () => {
  // TranchNode ontology says RFC 3339 string. We'll just verify string serialization.
  const t = addressJson({ createdAt: "2026-08-01T13:26:55Z" });
  assert.match(t.hash, /^sha256:[0-9a-f]{64}$/);
});

test("characterization: raw artifacts versus semantic addresses", () => {
    // Artifact hashes use raw bytes, envelope hashes use canonical JSON
    const rawBytes = Buffer.from("raw bytes");
    const rawHash = `sha256:${createHash("sha256").update(rawBytes).digest("hex")}`;
    const semantic = addressJson({ content: "raw bytes" });

    assert.equal(rawHash !== semantic.hash, true, "Raw hash and semantic hash must differ");
});
