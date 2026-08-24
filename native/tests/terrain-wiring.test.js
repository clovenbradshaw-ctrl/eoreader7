import test from "node:test";
import assert from "node:assert/strict";
import {
  TERRAINS,
  receivedGround,
  eoOperation,
  deltaFold,
  applyDelta,
  deriveOrientation,
  cubeAddresses,
  interrogateCube,
  buildHypergraph,
  differenceMakesDifference,
  obligation,
  taskForObligation,
} from "../kernel/index.js";

const TERRAIN_CASES = Object.freeze([
  ["Void", "SIG", "Ground"],
  ["Entity", "SIG", "Figure"],
  ["Kind", "SIG", "Pattern"],
  ["Field", "CON", "Ground"],
  ["Link", "CON", "Figure"],
  ["Network", "CON", "Pattern"],
  ["Atmosphere", "EVA", "Ground"],
  ["Lens", "EVA", "Figure"],
  ["Paradigm", "EVA", "Pattern"],
]);

function foldWithEveryTerrain() {
  const operations = TERRAIN_CASES.map(([terrain, op, grain]) => {
    const value = Object.freeze({ schema: "EOTerrainFixture@1", id: `fixture/${terrain.toLowerCase()}`, label: terrain });
    return eoOperation({
      op,
      grain,
      outputs: [value.id],
      consequence: { kind: "terrain_projection", terrain, ref: value.id },
      payload: { action: "graph-object", value },
    });
  });
  return applyDelta(receivedGround(), deltaFold(operations, { id: "delta:all-terrains" }));
}

test("all nine terrains are live recursive orientation state", () => {
  const fold = foldWithEveryTerrain();
  const orientation = deriveOrientation(fold);
  assert.deepEqual([...TERRAINS].sort(), TERRAIN_CASES.map(([terrain]) => terrain).sort());
  for (const [terrain] of TERRAIN_CASES) {
    assert.equal(orientation.terrainCounts[terrain], 1, `${terrain} should have one live projected object`);
    assert.equal(orientation.terrainState[terrain][0].id, `fixture/${terrain.toLowerCase()}`);
  }
});

test("every EO interrogation address receives its own terrain-local context", async () => {
  const fold = foldWithEveryTerrain();
  const terrainState = deriveOrientation(fold).terrainState;
  const seen = [];
  const results = await interrogateCube([], { terrainState }, {
    ask: ({ address, terrainContext }) => {
      seen.push(address.terrain);
      assert.equal(terrainContext.length, 1, `${address.mode}/${address.domain}/${address.grain} lacks terrain context`);
      assert.equal(terrainContext[0].label, address.terrain);
      return null;
    },
  });
  assert.equal(results.length, 27);
  assert.equal(seen.length, cubeAddresses().length);
  for (const terrain of TERRAINS) assert.equal(seen.filter((value) => value === terrain).length, 3, `${terrain} should appear once per mode`);
});

test("every terrain can become material reading work without id-prefix conventions", () => {
  const fold = foldWithEveryTerrain();
  const graph = buildHypergraph(fold.graphEntries);
  for (const [terrain] of TERRAIN_CASES) {
    const ref = `fixture/${terrain.toLowerCase()}`;
    const consequences = [{ kind: "terrain_projection", terrain, ref }];
    const materiality = differenceMakesDifference({ distinction: { terrain, ref }, consequences, fold, graph });
    assert.equal(materiality.makesDifference, true, `${terrain} projection should be material when it points at a live Fold object`);
    const unresolved = obligation({
      id: `obligation:terrain:${terrain.toLowerCase()}`,
      distinction: { terrain, ref, materiality },
      grounds: [ref],
      alternatives: [],
      consequences,
      openedAt: fold.sequence,
    });
    const task = taskForObligation(unresolved, { sequence: fold.sequence });
    assert.equal(task?.strategy, "terrain_clarification", `${terrain} should schedule terrain clarification`);
    assert.ok(task?.targets?.includes(ref), `${terrain} task should target its live projection`);
  }
});
