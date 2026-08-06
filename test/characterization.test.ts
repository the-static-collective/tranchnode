import test from "node:test";
import assert from "node:assert/strict";
import { computeSemanticAddress, addressJson } from "../src/residual.js";
import { createHash } from "node:crypto";

test("characterization: numeric boundaries and unsafe integers", () => {
  const safe = computeSemanticAddress("Node", { n: Number.MAX_SAFE_INTEGER });

  assert.throws(() => {
    computeSemanticAddress("Node", { n: 9007199254740992 }); // MAX_SAFE_INTEGER + 1
  }, /UNSAFE_INTEGER/);

  assert.throws(() => {
    computeSemanticAddress("Node", { n: Number.MIN_SAFE_INTEGER - 1 });
  }, /UNSAFE_INTEGER/);
});

test("characterization: rejects explicitly prohibited values", () => {
  assert.throws(() => computeSemanticAddress("Node", undefined), /UNDEFINED_VALUE/);
  assert.throws(() => computeSemanticAddress("Node", { a: undefined }), /UNDEFINED_VALUE/);
  assert.throws(() => computeSemanticAddress("Node", { a: NaN }), /NON_FINITE_NUMBER/);
  assert.throws(() => computeSemanticAddress("Node", { a: Infinity }), /NON_FINITE_NUMBER/);
  assert.throws(() => computeSemanticAddress("Node", { a: -Infinity }), /NON_FINITE_NUMBER/);
  assert.throws(() => computeSemanticAddress("Node", { a: BigInt(1) }), /UNSUPPORTED_TYPE/);
  assert.throws(() => computeSemanticAddress("Node", { a: Symbol('test') }), /UNSUPPORTED_TYPE/);
  assert.throws(() => computeSemanticAddress("Node", { a: () => {} }), /UNSUPPORTED_TYPE/);
});

test("characterization: rejects structurally invalid objects", () => {
  class CustomClass { a = 1; }
  assert.throws(() => computeSemanticAddress("Node", new CustomClass()), /CUSTOM_PROTOTYPE/);

  const objWithSymbolKey = {};
  Object.defineProperty(objWithSymbolKey, Symbol('test'), { value: 1, enumerable: true });
  assert.throws(() => computeSemanticAddress("Node", objWithSymbolKey), /SYMBOL_KEYED_PROPERTY/);

  const objWithAccessor = {};
  Object.defineProperty(objWithAccessor, 'a', { get: () => 1, enumerable: true });
  assert.throws(() => computeSemanticAddress("Node", objWithAccessor), /ACCESSOR_PROPERTY/);

  const objWithNonEnumerable = {};
  Object.defineProperty(objWithNonEnumerable, 'a', { value: 1, enumerable: false });
  assert.throws(() => computeSemanticAddress("Node", objWithNonEnumerable), /NON_ENUMERABLE_PROPERTY/);

  const cyclicObj: any = {};
  cyclicObj.a = cyclicObj;
  assert.throws(() => computeSemanticAddress("Node", cyclicObj), /CYCLIC_VALUE/);

  const sparseArray = [1];
  sparseArray[2] = 3;
  assert.throws(() => computeSemanticAddress("Node", sparseArray), /SPARSE_ARRAY/);
});

test("characterization: lone surrogate string validation", () => {
  assert.throws(() => computeSemanticAddress("Node", { a: "\uD800" }), /LONE_SURROGATE/);
  assert.throws(() => computeSemanticAddress("Node", { a: "\uDFFF" }), /LONE_SURROGATE/);
  assert.throws(() => computeSemanticAddress("Node", { a: "test\uD800test" }), /LONE_SURROGATE/);
  assert.doesNotThrow(() => computeSemanticAddress("Node", { a: "\uD800\uDC00" })); // Valid surrogate pair
});

test("characterization: canonical-address compatibility", () => {
  const obj1 = computeSemanticAddress("Node", { a: 1, b: 2 });
  const obj2 = computeSemanticAddress("Node", { b: 2, a: 1 });
  assert.equal(obj1.digestHex, obj2.digestHex, "Keys should be sorted alphanumerically per RFC 8785");
});

test("characterization: timestamp rules", () => {
  // TranchNode ontology says RFC 3339 string. We'll just verify string serialization.
  const t = computeSemanticAddress("Node", { createdAt: "2026-08-01T13:26:55Z" });
  assert.match(t.digestHex, /^[0-9a-f]{64}$/);
});

test("characterization: raw artifacts versus semantic addresses", () => {
    // Artifact hashes use raw bytes, envelope hashes use canonical JSON
    const rawBytes = Buffer.from("raw bytes");
    const rawHash = createHash("sha256").update(rawBytes).digest("hex");
    const semantic = computeSemanticAddress("Node", { content: "raw bytes" });

    assert.equal(rawHash !== semantic.digestHex, true, "Raw hash and semantic hash must differ");
});

test("characterization: fallback legacy support", () => {
    // AddressJSON should continue to work for non-project0 fixtures calling it natively
    const result = addressJson({ a: 1 });
    assert.match(result.hash, /^sha256:[0-9a-f]{64}$/);
});
