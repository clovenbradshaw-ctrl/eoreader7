// native/tests/temporal-reference.test.js — tense is anaphora: a bare
// temporal deixis resolves against an already-established reference
// ground, via the real contest.js adjudicator when genuinely ambiguous.
// Checked against a non-linguistic domain before English tense.

import test from "node:test";
import assert from "node:assert/strict";
import { cellOf } from "../kernel/cube.js";
import {
  establishTime, advanceReferenceGround, candidateGrounds, resolveAnaphoricTense,
  ESTABLISH_CELL, ADVANCE_CELL, RESOLUTION_CELL, TIME_SCHEMA, GROUND_SCHEMA,
} from "../kernel/temporal-reference.js";

test("cells are read off the real cube, not restated by hand", () => {
  assert.deepEqual(ESTABLISH_CELL, cellOf("INS", "Figure"));
  assert.equal(ESTABLISH_CELL.terrain, "Entity");

  assert.deepEqual(ADVANCE_CELL, cellOf("REC", "Ground"));
  assert.equal(ADVANCE_CELL.domain, "Interpretation");
  assert.equal(ADVANCE_CELL.terrain, "Atmosphere");
  assert.equal(ADVANCE_CELL.stance, "Cultivating");

  assert.deepEqual(RESOLUTION_CELL, cellOf("CON", "Ground"));
  assert.equal(RESOLUTION_CELL.domain, "Structure");
  assert.equal(RESOLUTION_CELL.terrain, "Field");
  assert.equal(RESOLUTION_CELL.stance, "Tending");
});

test("establishTime and advanceReferenceGround require every field declared", () => {
  assert.throws(() => establishTime({ at: 0, key: "k" }), /id is required/);
  assert.throws(() => establishTime({ id: "t", key: "k" }), /at is declared/);
  assert.throws(() => establishTime({ id: "t", at: 0 }), /key is required/);
  assert.throws(() => advanceReferenceGround({ at: 0, timeId: "t" }), /id is required/);
  assert.throws(() => advanceReferenceGround({ id: "g", timeId: "t" }), /at is declared/);
  assert.throws(() => advanceReferenceGround({ id: "g", at: 0 }), /timeId is required/);
});

test("a ground keeps what it supersedes — nothing is erased, mirroring perspective.js's own REC discipline", () => {
  const t1 = establishTime({ id: "t1", at: 0, key: "morning" });
  const g1 = advanceReferenceGround({ id: "g1", at: 0, timeId: t1.id });
  assert.equal(g1.supersedes, null, "the first ground supersedes nothing");
  const t2 = establishTime({ id: "t2", at: 5, key: "afternoon" });
  const g2 = advanceReferenceGround({ id: "g2", at: 5, timeId: t2.id, from: g1 });
  assert.deepEqual(g2.supersedes, { id: "g1", timeId: "t1", at: 0 });
});

test("exactly one candidate binds deterministically — not a default, the only possible answer", () => {
  const t1 = establishTime({ id: "t1", at: 0, key: "morning" });
  const g1 = advanceReferenceGround({ id: "g1", at: 0, timeId: t1.id });
  const out = resolveAnaphoricTense(3, [g1]);
  assert.equal(out.verdict, "bound");
  assert.equal(out.basis, "sole-candidate");
  assert.equal(out.timeId, "t1");
});

test("zero candidates before this point: an honest gap, never a guess", () => {
  const out = resolveAnaphoricTense(0, []);
  assert.equal(out.verdict, "no_candidate");
});

test("a later ground never resolves an earlier tense reference — candidateGrounds never reaches forward", () => {
  const t2 = establishTime({ id: "t2", at: 10, key: "later" });
  const g2 = advanceReferenceGround({ id: "g2", at: 10, timeId: t2.id });
  assert.deepEqual(candidateGrounds(3, [g2]), []);
});

test("more than one live ground is adjudicated via the real adjudicate, never silently defaulted to most-recent", () => {
  const g1 = advanceReferenceGround({ id: "g1", at: 0, timeId: "flashback-time" });
  const g2 = advanceReferenceGround({ id: "g2", at: 2, timeId: "main-line-time" });
  // caller must declare the adjudicator's own bars — omitting them throws,
  // exactly the discipline adjudicate() itself already enforces
  assert.throws(() => resolveAnaphoricTense(3, [g1, g2], { scores: new Map([["g2", 1]]) }), /minActivation is declared/);

  const out = resolveAnaphoricTense(3, [g1, g2], {
    scores: new Map([["g1", 5], ["g2", 1]]), // the flashback is currently more active
    minActivation: 0.1, minMargin: 0.2, contestedMargin: 0.5,
  });
  assert.equal(out.timeId, "flashback-time", "adjudication can genuinely prefer the OLDER ground when the caller's own scores say so — never hardcoded to most-recent");
});

// ── omnimodal proof: identical kernel functions, a non-linguistic domain ──

test("OMNIMODAL: a sensor reading's implicit 'since' points to the last calibration event — no NL anywhere", () => {
  const cal1 = establishTime({ id: "CAL:001", at: 0, key: "calibration-point-1" });
  const ground1 = advanceReferenceGround({ id: "G:001", at: 0, timeId: cal1.id });
  const cal2 = establishTime({ id: "CAL:002", at: 50, key: "calibration-point-2" });
  const ground2 = advanceReferenceGround({ id: "G:002", at: 50, timeId: cal2.id, from: ground1 });

  // a reading at t=30 implicitly refers to the FIRST calibration (the
  // second has not happened yet at that point in the log)
  const readingAt30 = resolveAnaphoricTense(30, [ground1, ground2]);
  assert.equal(readingAt30.timeId, "CAL:001");

  // a reading at t=75 implicitly refers to the SECOND — the ground advanced
  const readingAt75 = resolveAnaphoricTense(75, [ground1, ground2]);
  assert.equal(readingAt75.timeId, "CAL:002");
});

test("ADAPTER-SHAPED: 'I turned off the stove. I picked up my bag.' — same kernel code, English keys", () => {
  // A text adapter would recognize the first past-tense clause as
  // establishing a reference time and the second as advancing it (not
  // built here); English values stand in for what such an adapter would
  // supply.
  const t1 = establishTime({ id: "t-stove-off", at: 0, key: "turned off the stove" });
  const g1 = advanceReferenceGround({ id: "g1", at: 0, timeId: t1.id });
  const t2 = establishTime({ id: "t-bag-up", at: 1, key: "picked up the bag" });
  const g2 = advanceReferenceGround({ id: "g2", at: 1, timeId: t2.id, from: g1 });

  const currentAtSecondClause = resolveAnaphoricTense(1, [g1, g2]);
  assert.equal(currentAtSecondClause.timeId, "t-bag-up", "the reference ground has advanced to the second clause's own established time");
});
