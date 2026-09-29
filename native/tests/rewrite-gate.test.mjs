// native/tests/rewrite-gate.test.mjs — falsify the measured stop
// (THE-STIGMERGIC-PIPELINE §5 Phase A). Every control built to fail if
// the gate is wrong: the decay fires only on a settled trajectory, the
// oscillation fires on a cycle with its measured period, a carrying or
// growing mode never fires, and under a two-round budget the gate is
// STRUCTURALLY SILENT — the cap governs, behavior unchanged.
import test from "node:test";
import assert from "node:assert/strict";
import { createRewriteGate } from "../kernel/rewrite-gate.js";

const round = (gate, findings, nonMoves = 0) => {
  gate.push([findings, nonMoves]);
  return gate.decide();
};

test("decay: a settling trajectory fires the stop with a decaying dominant mode", () => {
  const g = createRewriteGate({ dims: 2, rank: 2 });
  assert.equal(round(g, 5, 0).fire, false, "one round — insufficient pairs");
  assert.equal(round(g, 2, 0).fire, false, "two rounds — pairs < 2, the gate is silent");
  const d = round(g, 0, 0);
  assert.equal(d.fire, true, "three rounds: the trajectory 5→2→0 has settled");
  assert.equal(d.reason, "decayed");
  assert.ok(d.magnitude < 1, `dominant magnitude must be < 1, got ${d.magnitude}`);
});

test("decay: a flat trajectory never fires — the cap governs", () => {
  const g = createRewriteGate({ dims: 2, rank: 2 });
  round(g, 3, 0); round(g, 3, 0);
  const d = round(g, 3, 0);
  assert.equal(d.fire, false, "a non-decaying mode is a carrying mode, not a settlement");
  assert.equal(d.reason, "carrying");
  assert.ok(d.magnitude >= 1 - 1e-9, `|λ| ≈ 1 for a constant trajectory, got ${d.magnitude}`);
});

test("decay: a growing trajectory never fires", () => {
  const g = createRewriteGate({ dims: 2, rank: 2 });
  round(g, 1, 0); round(g, 5, 0);
  const d = round(g, 5, 0);
  assert.equal(d.fire, false, "a material getting worse is not settled");
});

test("decay: the three-point alternating window [3,1,3] least-squares a real 0.6 — the false-decay the loop falsifier caught", () => {
  const g = createRewriteGate({ dims: 2, rank: 2 });
  round(g, 3, 0); round(g, 1, 0);
  const d = round(g, 3, 0);
  assert.equal(d.fire, false, "the latest round ROSE — a material that grew back is not settled; it may be cycling");
});

test("oscillation: a cycling trajectory fires with its measured period", () => {
  const g = createRewriteGate({ dims: 2, rank: 2 });
  round(g, 3, 0); round(g, 1, 2); round(g, 3, 0);
  const d = round(g, 1, 2);
  assert.equal(d.fire, true, "four rounds of a 3↔1 cycle is a loop, not a convergence");
  assert.equal(d.reason, "oscillating");
  assert.ok(d.period !== null && Math.abs(d.period - 2) < 0.5, `period ≈ 2 rounds, got ${d.period}`);
});

test("oscillation: a period longer than the observation is not claimed", () => {
  const g = createRewriteGate({ dims: 2, rank: 2 });
  round(g, 5, 0); round(g, 4, 1); round(g, 5, 0);
  const d = round(g, 4, 1);
  // The 5↔4 cycle has period 2 — but with only one full pair the gate's
  // own honesty bound (period ≤ pushes) must hold; the assertion is that
  // whatever it decides, the period it reports never exceeds the pushes.
  if (d.fire && d.period !== null) assert.ok(d.period <= g.pairs + 1);
});

test("horizon: under a two-round budget the gate is structurally silent — the cap governs, behavior unchanged", () => {
  const g = createRewriteGate({ dims: 2, rank: 2 });
  // Simulate MAX_REWRITE_ROUNDS = 2: rounds 0 and 1 push, round 2 never
  // exists. decide() at round 1's top sees pairs = 1 — always silent.
  round(g, 5, 0);
  const d = round(g, 2, 0);
  assert.equal(d.fire, false);
  assert.equal(d.reason, "insufficient_pairs");
  assert.equal(g.pairs, 1);
});

test("degenerate: an all-zero state is a degenerate gram, never a fire", () => {
  const g = createRewriteGate({ dims: 2, rank: 2 });
  round(g, 0, 0); round(g, 0, 0);
  const d = round(g, 0, 0);
  assert.equal(d.fire, false, "no material, no decision");
  assert.ok(["degenerate_gram", "insufficient_pairs"].includes(d.reason), d.reason);
});

test("the state dimension is declared, never defaulted silently", () => {
  assert.throws(() => createRewriteGate({ dims: 0 }), TypeError);
  assert.throws(() => createRewriteGate({ rank: 0 }), TypeError);
});

// ── THE LOOP-LEVEL CONTROL (THE-STIGMERGIC-PIPELINE §8 Phase A): the gate
// wired into the Ranke round loop must fire at the same round the material
// settles, must never fire on a carrying trajectory, and must be silent
// under the default budget. Mirrors the loop's real structure: decide at
// the top of each round (over the rounds completed), push at the end.
const simulateRanke = (budget, states) => {
  const gate = createRewriteGate({ dims: 2, rank: 2 });
  const drawRounds = [];
  let stop = null;
  for (let round = 0; round < budget; round++) {
    const state = states[round] ?? null;
    if (state && state[0] === 0) break; // the loop's own convergence break
    if (round > 0) {
      const g = gate.decide();
      if (g.fire) { stop = { round, ...g }; break; }
    }
    if (state === null) break; // the sequence ended — no more material
    drawRounds.push(round);
    gate.push(state);
  }
  return { drawRounds, stop };
};

test("loop: a settling trajectory with residual fires the measured stop — the spec's control", () => {
  const { drawRounds, stop } = simulateRanke(5, [[5, 0], [2, 0], [1, 0]]);
  assert.deepEqual(drawRounds, [0, 1, 2], "rounds 0–2 draw; the settled residual stops the loop");
  assert.equal(stop.reason, "decayed", "the stop is the measured decay, not the cap");
  assert.ok(stop.magnitude < 1);
});

test("loop: a clean convergence breaks on zero findings BEFORE the gate — the gate never fires on nothing", () => {
  const { drawRounds, stop } = simulateRanke(5, [[5, 0], [2, 0], [0, 0]]);
  assert.deepEqual(drawRounds, [0, 1], "round 2 breaks on zero findings, gate silent");
  assert.equal(stop, null);
});

test("loop: a flat trajectory runs the full budget — the cap governs when the material carries", () => {
  const { drawRounds, stop } = simulateRanke(4, [[3, 0], [3, 0], [3, 0], [3, 0]]);
  assert.deepEqual(drawRounds, [0, 1, 2, 3], "no decay, no oscillation — every round draws");
  assert.equal(stop, null);
});

test("loop: the DEFAULT budget (2 rounds) is unchanged — the gate cannot fire", () => {
  const { drawRounds, stop } = simulateRanke(2, [[5, 0], [2, 0], [1, 0]]);
  assert.deepEqual(drawRounds, [0, 1], "the cap governs exactly as before the gate existed");
  assert.equal(stop, null);
});

test("loop: an oscillating trajectory (phase dimension varying) stops and names the cycle", () => {
  const { drawRounds, stop } = simulateRanke(5, [[3, 0], [1, 2], [3, 0], [1, 2], [3, 0]]);
  assert.equal(stop.reason, "oscillating", "the loop is a cycle, not a convergence — declared, not churned");
  assert.ok(drawRounds.length < 5, `the oscillation stop saved draws (${drawRounds.length}/5)`);
});

test("loop: a PURE findings-alternation has no phase dimension — the gate stays silent, the cap governs, and it never misreports decay", () => {
  const { drawRounds, stop } = simulateRanke(5, [[3, 0], [1, 0], [3, 0], [1, 0], [3, 0]]);
  assert.equal(stop, null, "no scalar operator maps 3→1 and 1→3 — the cycle is invisible, and the gate never lies about it");
  assert.equal(drawRounds.length, 5, "the cap governs exactly");
});