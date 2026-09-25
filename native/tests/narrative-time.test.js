// tests/narrative-time.test.js — Partee walked over a reading's own tensed
// arrangements, on the universal tense inventory: every Past in a linear
// narrative binds to the ground the previous sentence advanced to; Pqp
// reaches back to the ground that one superseded, or lands a typed gap;
// Pres, Fut and undeclared are counted, never resolved; the walk refuses a
// typer with no giver.

import { test } from "node:test";
import assert from "node:assert/strict";
import { narrativeTime, TENSES } from "../kernel/narrative-time.js";
import { UD_FEATURES } from "../kernel/universal-grammar.js";

const TENSE = { walked: "Past", looked: "Past", opened: "Past", closed: "Past", went: "Past", "had gone": "Pqp", "had seen": "Pqp", is: "Pres", "will go": "Fut", run: "undeclared", ibat: "Imp" };
const tenseOf = (a) => TENSE[a.label] ?? "undeclared";
const GIVER = "test typer — a fixed table, one UD value per label";
const arr = (id, at, label, sentence) => ({ id, at: [at, at + 5], label, sentence });

test("the inventory is universal-grammar.js's, plus undeclared", () => {
  assert.deepEqual([...TENSES], [...UD_FEATURES.Tense, "undeclared"]);
});

test("a forward narrative: one time and one ground per past sentence, every past bound, superseding kept; Imp advances as Past does", () => {
  const r = narrativeTime([
    arr("o1", 0, "walked", 1), arr("o2", 10, "looked", 1),
    arr("o3", 30, "opened", 2),
    arr("o4", 60, "is", 3),
    arr("o5", 80, "run", 4),
    arr("o6", 100, "ibat", 5),
  ], { tenseOf, giver: GIVER });
  assert.deepEqual(r.times.map((t) => t.id), ["t1", "t2", "t3"]);
  assert.deepEqual(r.grounds.map((g) => g.supersedes?.id ?? null), [null, "g1", "g2"]);
  assert.equal(r.counts.Past, 3);
  assert.equal(r.counts.Imp, 1);
  assert.equal(r.counts.bound, 4);
  assert.equal(r.counts.Pres, 1);
  assert.equal(r.counts.undeclared, 1);
  assert.equal(r.resolutions[1].groundId, "g1", "the second past in sentence 1 resolves to the SAME ground");
  assert.equal(r.resolutions[2].groundId, "g2");
  assert.equal(r.giver, GIVER);
});

test("Pqp reaches back to the ground the live one superseded, and does not advance the ground", () => {
  const r = narrativeTime([
    arr("o1", 0, "walked", 1),
    arr("o2", 30, "opened", 2),
    arr("o3", 40, "had seen", 2),
    arr("o4", 60, "closed", 3),
  ], { tenseOf, giver: GIVER });
  const reach = r.resolutions.find((x) => x.arrangement === "o3");
  assert.equal(reach.verdict, "bound");
  assert.equal(reach.basis, "prior-ground");
  assert.equal(reach.groundId, "g1", "reaches the ground g2 superseded");
  assert.equal(reach.reach, true);
  assert.deepEqual(r.grounds.map((g) => g.id), ["g1", "g2", "g3"], "the pluperfect established no ground of its own");
  assert.equal(r.counts.reachBound, 1);
  assert.equal(r.counts.Pqp, 1);
});

test("Pqp before any prior ground is a typed gap — no_prior_ground after one ground, no_candidate before any", () => {
  const r = narrativeTime([
    arr("o0", 0, "had gone", 1),
    arr("o1", 10, "walked", 2),
    arr("o2", 30, "had seen", 3),
    arr("o3", 50, "opened", 4),
    arr("o4", 70, "had gone", 5),
  ], { tenseOf, giver: GIVER });
  const by = Object.fromEntries(r.resolutions.map((x) => [x.arrangement, x.verdict]));
  assert.equal(by.o0, "no_candidate");
  assert.equal(by.o2, "no_prior_ground");
  assert.equal(by.o4, "bound");
  assert.equal(r.counts.no_prior_ground, 1);
  assert.equal(r.counts.no_candidate, 1);
  assert.equal(r.counts.reachBound, 1);
});

test("the reach-back is the first order-sensitive move: reversing a narrative changes where a Pqp lands", () => {
  const seq = [arr("o1", 0, "walked", 1), arr("o2", 30, "had gone", 2), arr("o3", 60, "opened", 3), arr("o4", 90, "closed", 4)];
  const fwd = narrativeTime(seq, { tenseOf, giver: GIVER });
  const rev = narrativeTime([...seq].reverse().map((a, i) => ({ ...a, at: [i * 30, i * 30 + 5] })), { tenseOf, giver: GIVER });
  // forward: o2's Pqp has only g1 live, which superseded nothing → no_prior_ground
  assert.equal(fwd.counts.no_prior_ground, 1);
  assert.equal(fwd.counts.reachBound, 0);
  // reversed: o4, o3 have advanced g1→g2 before o2 arrives → reaches g1
  assert.equal(rev.counts.no_prior_ground, 0);
  assert.equal(rev.counts.reachBound, 1);
  // the plain past counts are still identical — the first version's finding stands
  assert.equal(fwd.counts.bound, rev.counts.bound);
});

test("refusals: a typer without a giver, a typer outside the declared tenses", () => {
  assert.throws(() => narrativeTime([], { tenseOf }), /giver/);
  assert.throws(() => narrativeTime([arr("o1", 0, "x", 1)], { tenseOf: () => "Aorist", giver: GIVER }), /declared tenses/);
});
