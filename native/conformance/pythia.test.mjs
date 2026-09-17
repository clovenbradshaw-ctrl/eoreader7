// native/conformance/pythia.test.mjs — the oracle's own two-step wall:
// a raw rate is never a verdict, and ambiguity must be a real, reachable
// outcome, never smoothed toward whichever side the rate happens to sit on.

import { test } from "node:test";
import assert from "node:assert";

import { pythiaSpeak, pythiaInterpret, requireOracle } from "../organs/pythia.js";

test("pythiaSpeak refuses a single trial — no spread to speak from", () => {
  assert.throws(() => pythiaSpeak({ trials: [true] }), /at least two independent trials/);
  assert.throws(() => pythiaSpeak({ trials: [] }), /at least two independent trials/);
});

test("pythiaSpeak reports a raw rate, uninterpreted", () => {
  const u = pythiaSpeak({ trials: [true, true, true, false] });
  assert.equal(u.schema, "PythiaUtterance@1");
  assert.equal(u.total, 4);
  assert.equal(u.agree, 3);
  assert.equal(u.rate, 0.75);
  assert.equal(u.interpreted, false);
});

test("pythiaInterpret requires a REAL utterance — a hand-written rate is refused", () => {
  assert.throws(() => pythiaInterpret({ rate: 0.9 }, { threshold: 0.5, ambiguityBand: 0.1 }), /requires a real utterance/);
});

test("pythiaInterpret requires threshold and ambiguityBand — never defaulted", () => {
  const u = pythiaSpeak({ trials: [true, true, false] });
  assert.throws(() => pythiaInterpret(u, { ambiguityBand: 0.1 }), /threshold is declared/);
  assert.throws(() => pythiaInterpret(u, { threshold: 0.5 }), /ambiguityBand is declared/);
});

test("pythiaInterpret: a rate clearly above threshold+band is FAVORABLE", () => {
  const u = pythiaSpeak({ trials: [true, true, true, true, false] }); // rate 0.8
  const v = pythiaInterpret(u, { threshold: 0.5, ambiguityBand: 0.1 });
  assert.equal(v.verdict, "favorable");
});

test("pythiaInterpret: a rate clearly below threshold-band is UNFAVORABLE", () => {
  const u = pythiaSpeak({ trials: [true, false, false, false, false] }); // rate 0.2
  const v = pythiaInterpret(u, { threshold: 0.5, ambiguityBand: 0.1 });
  assert.equal(v.verdict, "unfavorable");
});

test("pythiaInterpret: a rate inside the band is AMBIGUOUS — a real, first-class outcome, never forced", () => {
  const u = pythiaSpeak({ trials: [true, true, true, true, true, false] }); // rate ~0.833, threshold 0.8 band 0.1
  const v = pythiaInterpret(u, { threshold: 0.8, ambiguityBand: 0.1 });
  assert.equal(v.verdict, "ambiguous");
});

test("THE CROESUS WALL: requireOracle refuses a raw, un-interpreted utterance read directly as a verdict", () => {
  const u = pythiaSpeak({ trials: [true, true, true, false] });
  assert.throws(() => requireOracle(u), /no valid oracle verdict/);
});

test("THE CROESUS WALL: requireOracle refuses a forged verdict string", () => {
  const forged = { schema: "PythiaVerdict@1", verdict: "definitely-good" };
  assert.throws(() => requireOracle(forged), /not one of the three honest outcomes/);
});

test("requireOracle accepts a real, correctly-interpreted verdict of any of the three kinds", () => {
  const u = pythiaSpeak({ trials: [true, true, true, true, false] });
  const v = pythiaInterpret(u, { threshold: 0.5, ambiguityBand: 0.1 });
  assert.strictEqual(requireOracle(v), v);
});
