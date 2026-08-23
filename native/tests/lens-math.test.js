import test from "node:test";
import assert from "node:assert/strict";
import { interpretiveLensGeometry, deriveOrientation, receivedGround } from "../kernel/index.js";

test("unweighted Lens alternatives use Hartley uncertainty and refuse fake Bayesian precision", () => {
  const lens = Object.freeze({
    schema: "EOObligation@1",
    id: "obligation:lens:identity",
    grounds: Object.freeze(["edge:a"]),
    alternatives: Object.freeze(["ref:a", "ref:b", "ref:c", "ref:d"]),
    consequences: Object.freeze([{ kind: "identity", ref: "edge:a" }]),
  });
  const geometry = interpretiveLensGeometry(lens);
  assert.equal(geometry.model, "unweighted_possibility_space");
  assert.equal(geometry.possibilityCount, 4);
  assert.equal(geometry.hartleyUncertaintyBits, 2);
  assert.equal(geometry.weighted, false);
  assert.equal(geometry.shannonEntropyBits, null);
  assert.equal(geometry.bayesianUpdateAvailable, false);
});

test("giver-weighted alternatives may expose Shannon entropy but still cannot invent a Bayesian update", () => {
  const geometry = interpretiveLensGeometry(Object.freeze({
    id: "lens:weighted",
    alternatives: Object.freeze(["ref:a", "ref:b"]),
    alternativeWeights: Object.freeze({ "ref:a": 3, "ref:b": 1 }),
    weightGiver: "fixture/calibrated-model",
  }));
  assert.equal(geometry.weighted, true);
  assert.equal(geometry.weightGiver, "fixture/calibrated-model");
  assert.ok(geometry.shannonEntropyBits > 0 && geometry.shannonEntropyBits < 1);
  assert.equal(geometry.bayesianUpdateAvailable, false);
});

test("orientation exposes Lens geometry as context, never as witness", () => {
  const lens = Object.freeze({
    schema: "EOObligation@1",
    id: "obligation:lens:orientation",
    status: "open",
    grounds: Object.freeze(["edge:a"]),
    alternatives: Object.freeze(["ref:a", "ref:b"]),
    consequences: Object.freeze([{ kind: "identity", ref: "edge:a" }]),
    distinction: Object.freeze({ materiality: Object.freeze({ makesDifference: true }) }),
    producerTerrain: "Lens",
  });
  const fold = receivedGround({ obligations: [lens], graphEntries: [lens] });
  const orientation = deriveOrientation(fold, {
    terrainState: Object.freeze({
      Void: Object.freeze([]), Entity: Object.freeze([]), Kind: Object.freeze([]), Field: Object.freeze([]), Link: Object.freeze([]), Network: Object.freeze([]), Atmosphere: Object.freeze([]), Lens: Object.freeze([lens]), Paradigm: Object.freeze([]),
    }),
    emergentTerrainState: Object.freeze({
      Void: Object.freeze([]), Entity: Object.freeze([]), Kind: Object.freeze([]), Field: Object.freeze([]), Link: Object.freeze([]), Network: Object.freeze([]), Atmosphere: Object.freeze([]), Lens: Object.freeze([]), Paradigm: Object.freeze([]),
    }),
  });
  assert.equal(orientation.lensGeometry.length, 1);
  assert.equal(orientation.lensGeometry[0].hartleyUncertaintyBits, 1);
  assert.equal(orientation.lensGeometry[0].witnessed, false);
});
