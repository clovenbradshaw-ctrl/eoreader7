// swarm-gate.test.mjs — the swarm's admission wiring, falsified. These tests
// FAIL on the pre-2026-09-16 wiring and PASS on the wired gate (swarm-gate.mjs
// + wilson.mjs): the gate admits on IMPROVEMENT-over-champion, never on the
// correction delta; selection is per-terrain; the Differentiate face (SEG)
// produces legal terrain-specialists; and every cell carries a stance.
import test from "node:test";
import assert from "node:assert/strict";
import { bornAcceptance } from "./elenchus-bar.mjs";
import { createSwarmGate, stanceOf, specialistsOf } from "./swarm-gate.mjs";

// The measured record the old wiring stands on: best = earned-only at 0.561,
// noun-phrase-subjects measured 0.574 (+0.013 over the best) and was REFUSED
// because its correction delta was negative. 416 births, 0 kept.
const BEST_F = 0.561;
const WINNER_F = 0.574;
const IMPROVEMENT = WINNER_F - BEST_F; // +0.013 — beats the best
const NEGATIVE_CORRECTION_DELTA = -0.365; // the reread's delta in the swarm log

test("THE FAILING TEST: the old wiring refused a candidate that beat the best because it gated on the negative correction delta", () => {
  // The old call site passed the correction delta (f2-f1) into bornAcceptance.
  // A negative correction delta carries no mass — refused, even though the
  // candidate beat the best by +0.013. This test FAILS on the old wiring.
  const oldWiringRefused = !bornAcceptance({ delta: NEGATIVE_CORRECTION_DELTA, populationDeltas: [IMPROVEMENT] });
  assert.equal(oldWiringRefused, true, "the old gauge refused: a negative correction delta is not an improvement");
  assert.ok(IMPROVEMENT > 0, "precondition: the winner genuinely beat the best");
  // The corrected wiring admits the same winner: the improvement IS the born mass.
  const gate = createSwarmGate({ bar: Number.EPSILON });
  gate.recordImprovement(IMPROVEMENT);
  assert.equal(gate.admits(IMPROVEMENT), true, "the improvement-gated gate admits what the correction-gated gate refused");
});

test("a reroll (zero or negative improvement) is still refused — the gate is not loose", () => {
  const gate = createSwarmGate({ bar: Number.EPSILON });
  gate.recordImprovement(IMPROVEMENT);
  assert.equal(gate.admits(0), false);
  assert.equal(gate.admits(-0.01), false);
  assert.equal(gate.admits(NaN), false);
});

test("an improvement must clear the measured bar AND carry born mass over the colony's own improvements", () => {
  const gate = createSwarmGate({ bar: 0.01 }); // a measured nonzero reproducibility floor
  gate.recordImprovement(IMPROVEMENT);          // +0.013 clears the 0.01 bar
  assert.equal(gate.admits(IMPROVEMENT), true);
  const gate2 = createSwarmGate({ bar: 0.02 }); // +0.013 does NOT clear this bar
  gate2.recordImprovement(IMPROVEMENT);
  assert.equal(gate2.admits(IMPROVEMENT), false);
});

test("selection is per-terrain: a specialist is measured against ITS terrain's champion, not the global best", () => {
  const gate = createSwarmGate({ bar: Number.EPSILON });
  // The seed champions Link with a strong generalist (0.80).
  gate.record(["received", "reduced"], (ids) => ids.map(() => "Link"), 0.80);
  // A SEG specialist on Field is measured against Field's champion (none yet)
  // → any positive Field read is an improvement, even though 0.70 < 0.80.
  gate.recordImprovement(0.70);
  const improvement = 0.70 - gate.championFor(["deep"], (ids) => ids.map(() => "Field"), 0);
  assert.equal(improvement, 0.70);
  assert.equal(gate.admits(improvement), true, "a Field specialist is admitted on Field's ground, not the global best");
  // Now that Field has a champion, the same read is NOT an improvement there.
  gate.record(["deep"], (ids) => ids.map(() => "Field"), 0.75);
  const again = 0.70 - gate.championFor(["deep"], (ids) => ids.map(() => "Field"), 0);
  assert.ok(again < 0);
  assert.equal(gate.admits(again), false);
});

test("SEG·Figure splits the best into legal terrain-specialists that differ from the generalist", () => {
  const terrain = { received: "Network", reduced: "Link", nps: "Link", deep: "Field" };
  const depsOf = (id) => (id === "reduced" ? new Set(["received"]) : new Set());
  const legal = (ids) => !ids.includes("reduced") || ids.includes("received");
  const best = ["received", "reduced", "deep"];
  const specs = specialistsOf(best, { terrainOfOrgan: (id) => terrain[id], depsOf, legal });
  assert.ok(specs.length >= 2, "the generalist splits into at least two specialists");
  for (const s of specs) {
    assert.ok(legal(s.ids), `${s.t} specialist ${s.ids.join("+")} must be legal (DAG deps honored)`);
    assert.notEqual(s.ids.join(","), best.join(","), "a specialist is never identical to the generalist");
    assert.ok(s.ids.every((id) => terrain[id] === s.t || depsOf(id).has(id) || id === "received"),
      `${s.t} specialist carries only that terrain's organs plus declared deps`);
  }
  const byTerrain = Object.fromEntries(specs.map((s) => [s.t, s.ids.join("+")]));
  assert.equal(byTerrain.Link, "reduced+received", "the Link specialist keeps reduced AND its declared dep received");
  assert.equal(byTerrain.Field, "deep", "the Field specialist is just deep");
});

test("the stance face is wired: every cell carries its qualitative HOW", () => {
  assert.equal(stanceOf("SEG", "Figure"), "Dissecting");
  assert.equal(stanceOf("CON", "Figure"), "Binding");
  assert.equal(stanceOf("EVA", "Ground"), "Tending");
  assert.equal(stanceOf("REC", "Pattern"), "Composing");
  assert.equal(stanceOf("NUL", "Ground"), "Clearing");
});