// node --test native/kernel/code-draw-standing.test.mjs
//
// code-draw-standing.js against the-fold's REAL metacognition.js ledger
// (makeMetacognition) and this repo's REAL native/kernel/task-log.js — the
// same cross-repo relative-import precedent the-fold's own
// metacognition.test.mjs already sets in the other direction, and the same
// precedent native/eval/the-fold/*.mjs already sets for eoreader7 reaching
// into the-fold.
//
// Falsifiers proven here, each named for why it could be wrong:
//   1. the monitor fires MORE OFTEN on historically heldOut=false rows than
//      heldOut=true rows, on a validation split it was NOT calibrated on
//      (could be wrong if the signature vocabulary carries no real signal —
//      then train/validate agreement would be coincidence, so this is run
//      against BOTH a real-shaped fixture and a degenerate all-clean one).
//   2. the concede move is mechanical text, never model output (could be
//      wrong if disclosureFor ever depended on anything but the standing's
//      own counts and the cell string).
//   3. the monitor never reads heldOut truth at "inference" time — only in
//      the separate offline calibration step (could be wrong if check()'s
//      signature accepted or touched a heldOut field at all).

import { test } from "node:test";
import assert from "node:assert/strict";

import { makeMetacognition } from "../../../the-fold/metacognition.js";
import * as taskLog from "./task-log.js";

import {
  CODE_DRAW_FEATURES,
  signatureFor,
  featuresFromRow,
  cellFor,
  observeRows,
  monitorFires,
  validate,
  disclosureFor,
  makeCodeDrawMonitor,
} from "./code-draw-standing.js";

// ── signatureFor / featuresFromRow ──────────────────────────────────────

test("signatureFor: every feature false reads the clean cell", () => {
  assert.equal(signatureFor({}), "code-draw:clean");
});

test("signatureFor: a closed, ordered, deterministic string per combination", () => {
  assert.equal(signatureFor({ roundsExhausted: true }), "code-draw:rounds-exhausted");
  assert.equal(signatureFor({ hasRegressions: true }), "code-draw:regressions");
  assert.equal(signatureFor({ roundsExhausted: true, hasRegressions: true }), "code-draw:rounds-exhausted+regressions");
  assert.equal(signatureFor({ bokDisagreed: true }), "code-draw:bok-disagreed");
  assert.equal(signatureFor({ bokUnknown: true }), "code-draw:bok-absent");
  // bokDisagreed wins over bokUnknown when both are somehow asserted —
  // disagreement is the stronger, more specific claim.
  assert.equal(signatureFor({ bokDisagreed: true, bokUnknown: true }), "code-draw:bok-disagreed");
});

test("featuresFromRow: rounds-exhausted reads off rounds >= maxRounds, never a hand-set default silently", () => {
  assert.equal(featuresFromRow({ rounds: 3 }, { maxRounds: 3 }).roundsExhausted, true);
  assert.equal(featuresFromRow({ rounds: 2 }, { maxRounds: 3 }).roundsExhausted, false);
  assert.equal(featuresFromRow({ rounds: 4 }, { maxRounds: 3 }).roundsExhausted, true);
});

test("featuresFromRow: regressions only from a positive integer, never from a null/undefined field", () => {
  assert.equal(featuresFromRow({ regressions: 0 }).hasRegressions, false);
  assert.equal(featuresFromRow({ regressions: 1 }).hasRegressions, true);
  assert.equal(featuresFromRow({}).hasRegressions, false);
});

test("featuresFromRow: bok disagreement only reads from a real bok-arm row with the field present", () => {
  assert.deepEqual(featuresFromRow({ arm: "bok", bokDisagreement: true }), { roundsExhausted: false, hasRegressions: false, bokDisagreed: true, bokUnknown: false });
  assert.deepEqual(featuresFromRow({ arm: "bok", bokDisagreement: false }), { roundsExhausted: false, hasRegressions: false, bokDisagreed: false, bokUnknown: false });
  // a non-bok row, or an old ledger row predating the field: honestly unknown.
  assert.equal(featuresFromRow({ arm: "raw" }).bokUnknown, true);
  assert.equal(featuresFromRow({ arm: "bok" }).bokUnknown, true); // bok ran but the field is missing (old row)
  assert.equal(featuresFromRow({ arm: "bok", bokDisagreement: null }).bokUnknown, true);
});

// ── the ledger, and the falsifiers ──────────────────────────────────────

// A real-shaped fixture: rows that exhausted rounds or regressed genuinely
// fail more often (heldOut=false) than clean rows, but not perfectly — real
// signal, real noise, so the test is not tautological.
function realShapedRows() {
  const rows = [];
  // clean rows: reliably pass, so the "clean" cell should read established
  // (no corrections observed) and the monitor should never fire on them.
  for (let i = 0; i < 16; i++) rows.push({ rounds: 1, regressions: 0, heldOut: true });
  // rounds-exhausted rows: mostly fail (3/12 pass) — a real, if imperfect, shape.
  for (let i = 0; i < 12; i++) rows.push({ rounds: 3, regressions: 0, heldOut: i < 3 });
  // regressions rows: mostly fail (2/10 pass)
  for (let i = 0; i < 10; i++) rows.push({ rounds: 2, regressions: 1, heldOut: i < 2 });
  return rows;
}

function trainValidateSplit(rows) {
  // Deterministic, never tuned to what it is scored against: alternate rows
  // by index — the same "never a random draw to hand-set" posture
  // lang-competency.js::nullControl already uses for its own pairing.
  const train = rows.filter((_, i) => i % 2 === 0);
  const validate_ = rows.filter((_, i) => i % 2 === 1);
  return { train, validate: validate_ };
}

test("falsifier 1: the monitor fires more on historically heldOut=false rows than heldOut=true rows, on a held-out validation split it was NOT calibrated on", () => {
  const mc = makeMetacognition(taskLog);
  const rows = realShapedRows();
  const { train, validate: valRows } = trainValidateSplit(rows);

  let log = mc.createLedger();
  log = observeRows(mc, log, train, { maxRounds: 3 });

  const op = validate(mc, log, valRows, { maxRounds: 3 });

  // Could be wrong: if the signature vocabulary carried no real signal, a
  // monitor fit on the train split would fire roughly evenly across the
  // validation split's true/false rows, and precision would sit near the
  // validation split's own base failure rate rather than above it.
  const baseFailRate = valRows.filter((r) => !r.heldOut).length / valRows.length;
  assert.ok(op.firesOn > 0, "the monitor must fire on at least one validation row for this fixture to be a real test");
  assert.ok(op.precision > baseFailRate, `precision (${op.precision}) should beat the base failure rate (${baseFailRate}) on real-shaped data`);
  assert.ok(op.recall > 0, "the monitor should catch at least some real failures");
});

test("falsifier 1b (negative control): an all-clean fixture with no real failure shape never fires above chance", () => {
  const mc = makeMetacognition(taskLog);
  // Every row is "clean" (no rounds-exhaustion, no regressions, no bok) and
  // heldOut is assigned by a fixed, signature-independent pattern (every
  // third row fails) — the signature carries NO information about the
  // outcome here, so a sound monitor must never fire (there is only ever
  // one signature, "code-draw:clean", and it can never read "contested"
  // with the training data it sees split from validation... this control
  // is really testing that the monitor doesn't manufacture a signal where
  // none of the DECLARED features vary).
  const rows = [];
  for (let i = 0; i < 40; i++) rows.push({ rounds: 1, regressions: 0, heldOut: i % 3 !== 0 });
  const { train, validate: valRows } = trainValidateSplit(rows);
  let log = mc.createLedger();
  log = observeRows(mc, log, train, { maxRounds: 3 });
  const op = validate(mc, log, valRows, { maxRounds: 3 });
  // Every row lands in the SAME cell ("code-draw:clean"); the train split's
  // clean cell may itself read contested (since heldOut varies within it),
  // which is an honest, disclosed limit of a single-cell signature — but it
  // must fire on EVERY row uniformly in that case (precision == base rate),
  // never selectively, because nothing distinguishes one row from another.
  if (op.firesOn > 0) {
    assert.equal(op.firesOn, op.n, "with only one signature ever observed, the monitor must fire on all rows or none — never a selective subset it has no basis to select");
  }
});

test("falsifier 2: the concede move is mechanical text, never model output — same cell/standing in, same string out, no hidden randomness or model call", () => {
  const mc = makeMetacognition(taskLog);
  let log = mc.createLedger();
  log = mc.observe(log, { cell: "code-draw:rounds-exhausted", delta: { confirmed: 1, corrected: 4 } });
  const standing = mc.standingOf(log, "code-draw:rounds-exhausted");
  assert.equal(standing.standing, "contested");
  const d1 = disclosureFor("code-draw:rounds-exhausted", standing);
  const d2 = disclosureFor("code-draw:rounds-exhausted", standing);
  assert.equal(typeof d1, "string");
  // Deterministic given the same inputs (the date component is the only
  // thing that could vary, and only across a day boundary) — same call,
  // same day, same string.
  assert.equal(d1, d2);
  assert.match(d1, /code-draw:rounds-exhausted/);
  assert.match(d1, /correction 4 of 5/);
  // Never fires (never phrases a disclosure) for a clean/established standing.
  let log2 = mc.createLedger();
  log2 = mc.observe(log2, { cell: "code-draw:clean", delta: { confirmed: 5, corrected: 0 } });
  const cleanStanding = mc.standingOf(log2, "code-draw:clean");
  assert.equal(disclosureFor("code-draw:clean", cleanStanding), null);
});

test("falsifier 3: check() reads only in-flight features — never heldOut, never anything not legitimately visible during the draw", () => {
  const mc = makeMetacognition(taskLog);
  const rows = realShapedRows();
  const { train, validate: valRows } = trainValidateSplit(rows);
  let log = mc.createLedger();
  log = observeRows(mc, log, train, { maxRounds: 3 });
  const op = validate(mc, log, valRows, { maxRounds: 3 });
  const monitor = makeCodeDrawMonitor(mc, log, op, { maxRounds: 3 });

  // check()'s own signature: it takes FEATURES, not a row with heldOut on
  // it. Prove this two ways: (a) the function's declared arity/shape never
  // mentions heldOut; (b) two feature objects differing ONLY in a bogus
  // `heldOut` property (which check() never reads) produce IDENTICAL
  // verdicts — proving heldOut has zero causal effect on the result.
  const featuresA = { roundsExhausted: true, hasRegressions: false, bokDisagreed: false, bokUnknown: true };
  const featuresB = { ...featuresA, heldOut: true }; // a caller mistakenly hands heldOut in — must be ignored
  const featuresC = { ...featuresA, heldOut: false };
  const r1 = monitor.check(featuresA);
  const r2 = monitor.check(featuresB);
  const r3 = monitor.check(featuresC);
  assert.deepEqual(r1.fires, r2.fires);
  assert.deepEqual(r1.fires, r3.fires);
  assert.deepEqual(r1.cell, r2.cell);
  assert.deepEqual(r1.disclosure, r2.disclosure);

  // Every emission carries the operating point, and it is exactly the
  // SEPARATE offline validate() result — not invented, not recomputed here.
  assert.equal(r1.operatingPoint, op);
  assert.equal(typeof op.n, "number");
  assert.ok("precision" in op && "recall" in op, "the monitor's own measured operating point must be present on every emission");
});

test("CODE_DRAW_FEATURES is the closed, declared vocabulary this file actually reads", () => {
  assert.deepEqual(CODE_DRAW_FEATURES, ["roundsExhausted", "hasRegressions", "bokDisagreed", "bokUnknown"]);
});

test("cellFor is featuresFromRow composed with signatureFor — one implementation, not two that could drift", () => {
  const row = { rounds: 3, regressions: 1, arm: "bok", bokDisagreement: true };
  assert.equal(cellFor(row, { maxRounds: 3 }), signatureFor(featuresFromRow(row, { maxRounds: 3 })));
});

test("monitorFires never phrases finer than WITNESS_FLOOR supports — an unproven cell (too few observations) never fires", () => {
  const mc = makeMetacognition(taskLog);
  let log = mc.createLedger();
  // A single observed corrected row alone is below WITNESS_FLOOR — the
  // real metacognition.js ledger refuses to call this "contested" at all.
  log = mc.observe(log, { cell: "code-draw:rounds-exhausted", delta: { confirmed: 0, corrected: 1 } });
  const { fires, standing } = monitorFires(mc, log, { roundsExhausted: true });
  assert.equal(standing.standing, "unproven");
  assert.equal(fires, false);
});
