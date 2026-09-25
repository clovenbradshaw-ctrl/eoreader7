// tests/narrative-time.test.js — Partee walked over a reading's own tensed
// arrangements: every past tense in a linear narrative binds to the ground
// the previous sentence advanced to; present and undeclared are counted,
// never resolved; the walk refuses a typer with no giver.

import { test } from "node:test";
import assert from "node:assert/strict";
import { narrativeTime, TENSES } from "../kernel/narrative-time.js";

const tenseOf = (label) => (label.endsWith("ed") ? "past" : label === "is" ? "present" : "undeclared");
const GIVER = "test typer — -ed is past, is is present, all else undeclared";
const arr = (id, at, label, sentence) => ({ id, at: [at, at + 5], label, sentence });

test("a forward narrative: one time and one ground per past sentence, every past tense bound, superseding kept", () => {
  const r = narrativeTime([
    arr("o1", 0, "walked", 1), arr("o2", 10, "looked", 1),
    arr("o3", 30, "opened", 2),
    arr("o4", 60, "is", 3),
    arr("o5", 80, "went", 4),
    arr("o6", 100, "closed", 5),
  ], { tenseOf, giver: GIVER });
  assert.deepEqual(r.times.map((t) => t.id), ["t1", "t2", "t3"]);
  assert.deepEqual(r.grounds.map((g) => g.supersedes?.id ?? null), [null, "g1", "g2"]);
  assert.equal(r.counts.past, 4);
  assert.equal(r.counts.bound, 4);
  assert.equal(r.counts.no_candidate, 0);
  assert.equal(r.counts.present, 1);
  assert.equal(r.counts.undeclared, 1);
  // the second past in sentence 1 resolves to the SAME ground, not a new one
  assert.equal(r.resolutions[1].groundId, "g1");
  assert.equal(r.resolutions[2].groundId, "g2");
  assert.equal(r.giver, GIVER);
});

test("reversed order gives the same counts — measured, not hidden: Partee's walk is indifferent to event order without a reach-back tense", () => {
  const seq = [arr("o1", 0, "walked", 1), arr("o2", 30, "opened", 2), arr("o3", 60, "closed", 3)];
  const fwd = narrativeTime(seq, { tenseOf, giver: GIVER });
  const rev = narrativeTime([...seq].reverse().map((a, i) => ({ ...a, at: [i * 30, i * 30 + 5] })), { tenseOf, giver: GIVER });
  assert.deepEqual(fwd.counts, rev.counts);
});

test("no past tense at all: no times, no grounds, nothing resolved", () => {
  const r = narrativeTime([arr("o1", 0, "is", 1), arr("o2", 10, "run", 2)], { tenseOf, giver: GIVER });
  assert.equal(r.times.length, 0);
  assert.equal(r.resolutions.length, 0);
  assert.deepEqual(r.counts, { past: 0, present: 1, undeclared: 1, bound: 0, no_candidate: 0, adjudicated: 0 });
});

test("refusals: a typer without a giver, a typer outside the declared tenses", () => {
  assert.throws(() => narrativeTime([], { tenseOf }), /giver/);
  assert.throws(() => narrativeTime([arr("o1", 0, "x", 1)], { tenseOf: () => "future", giver: GIVER }), /declared tenses/);
  assert.deepEqual([...TENSES], ["past", "present", "undeclared"]);
});
