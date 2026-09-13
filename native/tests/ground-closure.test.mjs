// ground-closure.test.mjs — the witness, tested against real measured
// numbers (reading-shape.mjs's holograph-health fields; the null-arm's own
// reported floor) plus structural cases. The bar is always derived from the
// null, never asserted as a fixed threshold.
import test from "node:test";
import assert from "node:assert/strict";
import { closureOf, witnessAnswer, driftOf } from "../kernel/ground-closure.js";

// REAL measured floor, null-arm on word-shuffled AIW ch1 (2026-09-12):
// "1 self-referent folds" is the only deposit the null reports; 62 typed
// absences is its passage. openness = 62/63 ≈ 0.984.
const NULL_SHAPE = { selfReferentFolds: 1, contests: 0, movesHolograph: 0, typedAbsences: 62 };

// REAL measured AIW ch1 read (reading-shape.mjs 2026-09-13):
// selfReferentFolds 0, movesHolograph 0, contests 0, typedAbsences 18.
const AIW_CH1 = { selfReferentFolds: 0, contests: 0, movesHolograph: 0, typedAbsences: 18 };

test("the witness: a real healthy reading is OPEN against the null bar", () => {
  const r = closureOf({ shape: AIW_CH1, nullShape: NULL_SHAPE });
  assert.equal(r.verdict, "open");
  assert.equal(r.openness, 1); // passage 18, deposits 0
  assert.equal(witnessAnswer(r).action, "release");
});

test("the witness: a reading that folds into itself more than noise is CLOSING", () => {
  // deposits (3 self-folds) against the null's own 1-fold floor: openness
  // 3/4 = 0.75, below the null's 0.984.
  const r = closureOf({ shape: { selfReferentFolds: 3, contests: 0, movesHolograph: 0, typedAbsences: 1 }, nullShape: NULL_SHAPE });
  assert.equal(r.verdict, "closing");
  assert.equal(witnessAnswer(r).action, "re-ground");
});

test("the witness: passage zero with deposits is CLOSED — the field reads only itself", () => {
  const r = closureOf({ shape: { selfReferentFolds: 2, contests: 0, movesHolograph: 0, typedAbsences: 0 }, nullShape: NULL_SHAPE });
  assert.equal(r.verdict, "closed");
  assert.equal(r.openness, 0);
  assert.equal(witnessAnswer(r).action, "re-ground");
});

test("the witness: a reading at the null's own openness is OPEN — no worse than honest noise", () => {
  const r = closureOf({ shape: { selfReferentFolds: 1, contests: 0, movesHolograph: 0, typedAbsences: 62 }, nullShape: NULL_SHAPE });
  assert.equal(r.verdict, "open"); // 62/63 === the null's own 62/63
  assert.equal(witnessAnswer(r).action, "release");
});

test("the witness: no field activity is NO_GROUND — withhold, never a verdict", () => {
  const r = closureOf({ shape: {}, nullShape: NULL_SHAPE });
  assert.equal(r.verdict, "no_ground");
  assert.equal(witnessAnswer(r).action, "withhold");
});

test("the witness: untyped contests are deposits, typed absences are passage", () => {
  // One unresolved contest is a deposit; ten typed absences are passage.
  const r = closureOf({ shape: { selfReferentFolds: 0, contests: 1, movesHolograph: 0, typedAbsences: 10 }, nullShape: NULL_SHAPE });
  assert.equal(r.deposits, 1);
  assert.equal(r.passage, 10);
  assert.equal(r.openness, 10 / 11);
  // 0.909 below the null's 0.984 -> closing.
  assert.equal(r.verdict, "closing");
});

test("the witness: a null with no activity offers no bar — no_ground with the bar named unavailable", () => {
  const r = closureOf({ shape: AIW_CH1, nullShape: { selfReferentFolds: 0, typedAbsences: 0 } });
  assert.equal(r.verdict, "no_ground");
  assert.equal(r.bar, "unavailable");
});

test("drift: a declining openness series is attention having drifted", () => {
  const d = driftOf([
    { seq: 1, openness: 0.98 },
    { seq: 2, openness: 0.9 },
    { seq: 3, openness: 0.75 },
  ]);
  assert.equal(d.drifting, true);
});

test("drift: a holding series is no drift — never manufactured from two points", () => {
  const d = driftOf([
    { seq: 1, openness: 0.8 },
    { seq: 2, openness: 0.85 },
  ]);
  assert.equal(d.drifting, false);
});

test("drift: one reading cannot support a drift claim", () => {
  const d = driftOf([{ seq: 1, openness: 0.5 }]);
  assert.equal(d.drifting, null);
});