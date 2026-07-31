import test from "node:test";
import assert from "node:assert/strict";
import fixture from "../fixtures/canonical/need_breakfast_001.json" with { type: "json" };
import { canonicalizeAndHash } from "../src/tranchnode/canonicalize.ts";

test("canonical fixture is hash-complete", async () => {
  assert.match(fixture.canonicalHash, /^sha256:[0-9a-f]{64}$/);
  assert.equal((await canonicalizeAndHash(fixture)).hash, fixture.canonicalHash);
});
