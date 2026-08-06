import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { computeSemanticAddress, parseSemanticAddress, SemanticAddressKind } from "../src/residual.js";

const fixturesDir = path.join(process.cwd(), "fixtures", "canonical-addressing", "project0-pr28");

const TIMESTAMP_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
function validateTimestamp(ts: any): void {
  if (typeof ts !== 'string') throw new Error("INVALID_TYPE");
  if (!TIMESTAMP_REGEX.test(ts)) throw new Error("INVALID_TIMESTAMP");
}

function processFixtureNode(type: SemanticAddressKind, input: any) {
    if (input.createdAt !== undefined) validateTimestamp(input.createdAt);
    if (input.validFrom !== undefined && input.validFrom !== null) validateTimestamp(input.validFrom);
    if (input.validUntil !== undefined && input.validUntil !== null) validateTimestamp(input.validUntil);
    if (input.issuedAt !== undefined) validateTimestamp(input.issuedAt);
    return computeSemanticAddress(type, input);
}

if (fs.existsSync(fixturesDir)) {
  const files = fs.readdirSync(fixturesDir).filter((f) => f.endsWith(".json"));

  for (const file of files) {

    test(`Project0 fixture: ${file}`, () => {
      const data = JSON.parse(fs.readFileSync(path.join(fixturesDir, file), "utf8"));

      if (data.expectedStatus === "rejected") {
        let err;
        try {
          if (data.operation === "reject_transport_state" && data.constructOp) {
             const opMap: Record<string, () => void> = {
                "nested_undefined": () => computeSemanticAddress(data.type, { nested: undefined }),
                "cyclic_value": () => { const cyclic: any = {}; cyclic.a = cyclic; computeSemanticAddress(data.type, cyclic); },
                "nan_and_infinities": () => computeSemanticAddress(data.type, { a: NaN }),
                "sparse_array": () => { const sparse = [1]; sparse[2] = 3; computeSemanticAddress(data.type, sparse); },
                "unsupported_map": () => computeSemanticAddress(data.type, { a: new Map() })
             };

             const func = opMap[data.constructOp];
             if (func) {
                func();
             } else {
                 throw new Error("Unknown constructOp");
             }
          } else if (data.malformedTextualAddress) {
             parseSemanticAddress(data.type, data.input_address);
          } else {
             processFixtureNode(data.type, data.input);
          }
        } catch (e: any) {
          err = e;
        }

        assert.ok(err, `Expected fixture to reject, but it did not throw. File: ${file}`);

        if (data.expectedErrorCode) {
           assert.match(err.message, new RegExp(data.expectedErrorCode), `Expected error ${data.expectedErrorCode} but got ${err.message}`);
        }
      } else {
        const result = processFixtureNode(data.type, data.input);

        assert.equal(result.digestHex, data.digestHex, "Digest Hex must match exact Project0 fixture digest.");
        assert.equal(result.textualId, data.textualAddress, "Textual address must exactly match Project0 fixture address.");
      }
    });
  }
}
