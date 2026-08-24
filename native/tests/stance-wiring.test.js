import test from "node:test";
import assert from "node:assert/strict";
import {
  STANCES,
  receivedGround,
  eoOperation,
  deltaFold,
  applyDelta,
  deriveOrientation,
  cubeAddresses,
  interrogateCube,
  reasoningAffordances,
  novelGenerationAffordances,
  createRecursiveReader,
} from "../kernel/index.js";

const STANCE_CASES = Object.freeze([
  ["Clearing", "SEG", "Ground"],
  ["Dissecting", "SEG", "Figure"],
  ["Unraveling", "SEG", "Pattern"],
  ["Tending", "CON", "Ground"],
  ["Binding", "CON", "Figure"],
  ["Tracing", "CON", "Pattern"],
  ["Cultivating", "SYN", "Ground"],
  ["Making", "SYN", "Figure"],
  ["Composing", "SYN", "Pattern"],
]);

function foldWithEveryStance() {
  const operations = STANCE_CASES.map(([stance, op, grain]) => {
    const value = Object.freeze({ schema: "EOStanceFixture@1", id: `fixture/stance/${stance.toLowerCase()}`, label: stance });
    return eoOperation({
      op,
      grain,
      outputs: [value.id],
      consequence: { kind: "stance_projection", stance, ref: value.id },
      payload: { action: "graph-object", value },
    });
  });
  return applyDelta(receivedGround(), deltaFold(operations, { id: "delta:all-stances" }));
}

function networkFold(op) {
  const value = Object.freeze({ schema: "EONetworkFixture@1", id: "fixture/network/same-object", label: "same network" });
  return applyDelta(receivedGround(), deltaFold([
    eoOperation({ op, grain: "Pattern", outputs: [value.id], payload: { action: "graph-object", value } }),
  ], { id: `delta:network:${op.toLowerCase()}` }));
}

test("all nine stances are live recursive orientation state", () => {
  const fold = foldWithEveryStance();
  const orientation = deriveOrientation(fold);
  assert.deepEqual([...STANCES].sort(), STANCE_CASES.map(([stance]) => stance).sort());
  for (const [stance] of STANCE_CASES) {
    assert.equal(orientation.stanceCounts[stance], 1, `${stance} should have one live projected object`);
    assert.equal(orientation.stanceState[stance][0].id, `fixture/stance/${stance.toLowerCase()}`);
  }
});

test("every EO interrogation address receives stance-local context without promoting context to evidence", async () => {
  const fold = foldWithEveryStance();
  const stanceState = deriveOrientation(fold).stanceState;
  const seen = [];
  const results = await interrogateCube([], { stanceState }, {
    ask: ({ address, stanceContext }) => {
      seen.push(address.stance);
      assert.equal(stanceContext.length, 1, `${address.mode}/${address.domain}/${address.grain} lacks stance context`);
      assert.equal(stanceContext[0].label, address.stance);
      return null;
    },
  });
  assert.equal(results.length, 27);
  assert.equal(seen.length, cubeAddresses().length);
  for (const stance of STANCES) assert.equal(seen.filter((value) => value === stance).length, 3, `${stance} should appear once per domain`);
  for (const result of results) {
    assert.equal("stanceContext" in result, false);
    assert.equal("terrainContext" in result, false);
  }
});

test("terrain and stance are orthogonal: prior stance conditions but never traps reasoning", () => {
  const cases = [
    ["SEG", "Unraveling"],
    ["CON", "Tracing"],
    ["SYN", "Composing"],
  ];
  const objects = [];
  for (const [op, priorStance] of cases) {
    const orientation = deriveOrientation(networkFold(op));
    assert.equal(orientation.terrainCounts.Network, 1);
    assert.equal(orientation.stanceCounts[priorStance], 1);
    const proposals = reasoningAffordances(orientation);
    assert.equal(proposals.length, 3);
    assert.deepEqual(proposals.map((proposal) => proposal.move).sort(), ["distinguish", "generate", "relate"]);
    assert.deepEqual(proposals.map((proposal) => proposal.address.terrain), ["Network", "Network", "Network"]);
    const continuous = proposals.filter((proposal) => proposal.stanceContinuity);
    assert.equal(continuous.length, 1);
    assert.equal(continuous[0].address.stance, priorStance);
    for (const proposal of proposals) assert.equal(proposal.witnessed, false);
    objects.push(orientation.terrainState.Network[0]);
  }
  assert.deepEqual(objects[0], objects[1]);
  assert.deepEqual(objects[1], objects[2]);
});

test("novel generation remains available across prior stances and explicitly ungrounded", () => {
  const cases = [
    ["SEG", false],
    ["CON", false],
    ["SYN", true],
  ];
  for (const [op, hasComposingContinuity] of cases) {
    const proposals = novelGenerationAffordances(deriveOrientation(networkFold(op)));
    assert.equal(proposals.length, 1);
    assert.equal(proposals[0].move, "generate");
    assert.equal(proposals[0].address.terrain, "Network");
    assert.equal(proposals[0].address.stance, "Composing");
    assert.equal(proposals[0].stanceContinuity, hasComposingContinuity);
    assert.equal(proposals[0].standing, "proposal");
    assert.equal(proposals[0].witnessed, false);
    assert.equal(proposals[0].admissible, false);
    assert.equal(proposals[0].admission, "requires_grounding");
  }
});

test("reasoning budgets can explicitly disable proposal generation", () => {
  const orientation = deriveOrientation(networkFold("SYN"));
  assert.deepEqual(reasoningAffordances(orientation, { limit: 0 }), []);
  assert.deepEqual(novelGenerationAffordances(orientation, { limit: 0 }), []);
});

test("recursive reader preserves stance state incrementally", () => {
  const reader = createRecursiveReader({ seed: foldWithEveryStance() });
  const state = reader.getStanceState();
  for (const [stance] of STANCE_CASES) assert.equal(state[stance].length, 1);
});
