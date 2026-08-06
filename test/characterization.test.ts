import test from "node:test";
import assert from "node:assert/strict";
import { addressJson } from "../src/residual.js";
import { createHash } from "node:crypto";

test("characterization: numeric boundaries and unsafe integers", () => {
  const safe = addressJson({ n: Number.MAX_SAFE_INTEGER });

  assert.throws(() => {
    addressJson({ n: 9007199254740992 }); // MAX_SAFE_INTEGER + 1
  }, /UNSAFE_INTEGER/);

  assert.throws(() => {
    addressJson({ n: Number.MIN_SAFE_INTEGER - 1 });
  }, /UNSAFE_INTEGER/);
});

test("characterization: rejects explicitly prohibited values", () => {
  assert.throws(() => addressJson(undefined), /UNDEFINED_VALUE/);
  assert.throws(() => addressJson({ a: undefined }), /UNDEFINED_VALUE/);
  assert.throws(() => addressJson({ a: NaN }), /NON_FINITE_NUMBER/);
  assert.throws(() => addressJson({ a: Infinity }), /NON_FINITE_NUMBER/);
  assert.throws(() => addressJson({ a: -Infinity }), /NON_FINITE_NUMBER/);
  assert.throws(() => addressJson({ a: BigInt(1) }), /UNSUPPORTED_TYPE/);
  assert.throws(() => addressJson({ a: Symbol('test') }), /UNSUPPORTED_TYPE/);
  assert.throws(() => addressJson({ a: () => {} }), /UNSUPPORTED_TYPE/);
});

test("characterization: rejects structurally invalid objects", () => {
  class CustomClass { a = 1; }
  assert.throws(() => addressJson(new CustomClass()), /CUSTOM_PROTOTYPE/);

  const objWithSymbolKey = {};
  Object.defineProperty(objWithSymbolKey, Symbol('test'), { value: 1, enumerable: true });
  assert.throws(() => addressJson(objWithSymbolKey), /SYMBOL_KEYED_PROPERTY/);

  const objWithAccessor = {};
  Object.defineProperty(objWithAccessor, 'a', { get: () => 1, enumerable: true });
  assert.throws(() => addressJson(objWithAccessor), /ACCESSOR_PROPERTY/);

  const objWithNonEnumerable = {};
  Object.defineProperty(objWithNonEnumerable, 'a', { value: 1, enumerable: false });
  assert.throws(() => addressJson(objWithNonEnumerable), /NON_ENUMERABLE_PROPERTY/);

  const cyclicObj: any = {};
  cyclicObj.a = cyclicObj;
  assert.throws(() => addressJson(cyclicObj), /CYCLIC_VALUE/);

  const sparseArray = [1];
  sparseArray[2] = 3;
  assert.throws(() => addressJson(sparseArray), /SPARSE_ARRAY/);
});

test("characterization: lone surrogate string validation", () => {
  assert.throws(() => addressJson({ a: "\uD800" }), /LONE_SURROGATE/);
  assert.throws(() => addressJson({ a: "\uDFFF" }), /LONE_SURROGATE/);
  assert.throws(() => addressJson({ a: "test\uD800test" }), /LONE_SURROGATE/);
  assert.doesNotThrow(() => addressJson({ a: "\uD800\uDC00" })); // Valid surrogate pair
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
