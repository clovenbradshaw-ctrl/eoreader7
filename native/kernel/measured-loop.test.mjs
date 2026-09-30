// measured-loop.test.mjs — against the REAL streaming DMD (dmd-stream.js),
// not a mock. Each case pushes a real, hand-constructed sequence and reads
// back the measured verdict.
import test from "node:test";
import assert from "node:assert/strict";
import { makeMeasuredLoop, runMeasuredLoop, VERDICTS } from "./measured-loop.js";

test("ceiling is declared — a loop with no ceiling refuses to be made", () => {
  assert.throws(() => makeMeasuredLoop({}), TypeError);
  assert.throws(() => makeMeasuredLoop({ ceiling: 0 }), TypeError);
});

test("fewer than two rounds always continues — the measure has no history to read yet", () => {
  const loop = makeMeasuredLoop({ ceiling: 10 });
  loop.push(5);
  const v = loop.verdict();
  assert.equal(v.continue, true);
  assert.equal(v.verdict, VERDICTS.INSUFFICIENT_HISTORY);
});

test("a genuinely, consistently decaying issue count keeps going round over round", () => {
  // Note on the mechanism, not the test: the streaming DMD fits ONE linear
  // operator over the WHOLE history so far (dmd-stream.js's own design —
  // no windowing, no artificial decay constant), so its growth reading is
  // cumulative, not "what did the last round do." A clean geometric decay
  // (halving each round) is the honest case to demonstrate DECAYING with —
  // the fitted operator is the same ratio at every prefix.
  const loop = makeMeasuredLoop({ ceiling: 20 });
  for (const n of [16, 8, 4]) loop.push(n);
  let v = loop.verdict();
  assert.equal(v.continue, true);
  assert.equal(v.verdict, VERDICTS.DECAYING);
  assert.ok(v.growth < 0);
  loop.push(2);
  v = loop.verdict();
  assert.equal(v.continue, true, "still genuinely decaying at the same rate");
  assert.equal(v.verdict, VERDICTS.DECAYING);
});

test("an issue count reaching exactly zero resolves immediately, never waiting on the measure", () => {
  const loop = makeMeasuredLoop({ ceiling: 20 });
  loop.push(3);
  loop.push(0);
  const v = loop.verdict();
  assert.equal(v.continue, false);
  assert.equal(v.verdict, VERDICTS.RESOLVED);
});

test("a growing issue count is flagged diverging and stopped — a repair making things worse gets no more budget", () => {
  const loop = makeMeasuredLoop({ ceiling: 20 });
  for (const n of [2, 4, 8]) loop.push(n);
  const v = loop.verdict();
  assert.equal(v.continue, false);
  assert.equal(v.verdict, VERDICTS.DIVERGING);
  assert.ok(v.growth > 0);
});

test("a flat, never-moving count converges once the measure has enough pairs to read it, well under a generous ceiling", () => {
  const loop = makeMeasuredLoop({ ceiling: 100 });
  // dmd-stream.js's own floor: `modes()` needs >= 2 PAIRS (>= 3 pushes) —
  // fewer than that is insufficient_pairs, not a false convergence.
  loop.push(5);
  loop.push(5);
  assert.equal(loop.verdict().verdict, VERDICTS.INSUFFICIENT_HISTORY);
  loop.push(5);
  const v = loop.verdict();
  assert.equal(v.continue, false);
  assert.equal(v.verdict, VERDICTS.CONVERGED);
  assert.equal(v.growth, 0);
  assert.equal(v.rounds, 3);
});

test("the ceiling is the honest safety floor: a slowly, endlessly decaying-but-never-zero count still stops there", () => {
  const loop = makeMeasuredLoop({ ceiling: 5 });
  const seq = [10, 9, 8.5, 8.2, 8.05]; // real, monotone decay, never converges or hits zero within budget
  let v;
  for (const n of seq) { loop.push(n); v = loop.verdict(); if (!v.continue) break; }
  assert.equal(v.continue, false);
  assert.equal(v.verdict, VERDICTS.CEILING);
  assert.equal(v.rounds, 5);
});

test("runMeasuredLoop drives a real repair function to convergence and reports its own history", async () => {
  let issues = 9;
  const { state, stop, history } = await runMeasuredLoop({
    ceiling: 20,
    initialState: { issues },
    round: async (s) => ({ issues: Math.max(0, s.issues - 3) }), // a real, monotone repair
    issuesAfter: (s) => s.issues,
  });
  assert.equal(state.issues, 0);
  assert.equal(stop.verdict, VERDICTS.RESOLVED);
  assert.ok(history.length >= 2);
});

test("runMeasuredLoop stops on divergence rather than exhausting the ceiling, on a repair that genuinely worsens things", async () => {
  const { stop } = await runMeasuredLoop({
    ceiling: 50,
    initialState: { issues: 1 },
    round: async (s) => ({ issues: s.issues * 2 }), // a real, monotone runaway
    issuesAfter: (s) => s.issues,
  });
  assert.equal(stop.verdict, VERDICTS.DIVERGING);
  assert.ok(stop.rounds < 50, "caught by the measure long before the ceiling");
});
