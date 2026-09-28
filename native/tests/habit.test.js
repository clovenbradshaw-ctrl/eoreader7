import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHabits, learnHabit, recallHabit, applyHabit, concedeHabit, habitsFor, habitCensus, habitsFromEntries, HABIT_RUNG } from "../kernel/habit.js";
import { becauseContained } from "../organs/testimony.js";

const holds = (decider, material) => becauseContained(decider, material);
const SECTION = "The old count had died the week before, and the will named Pierre alone. Pierre received the whole estate.";
const KEY = "pierre|received|the whole estate";

test("a judgment learned as a habit answers the next instance mechanically, only while its decider is in the material at hand", () => {
  let log = createHabits();
  log = learnHabit(log, { shape: "partial:not_yet_read", key: KEY, verdict: "holds", decider: "the will named Pierre alone", giver: "gemma2:2b@judge-v1", forWhom: "turn:3", cursor: 3 });
  const h = recallHabit(log, KEY);
  assert.equal(h.verdict, "holds"); assert.equal(h.giver, "gemma2:2b@judge-v1"); assert.equal(h.conceded, null);
  const applied = applyHabit(h, SECTION, { holds });
  assert.deepEqual([applied.verdict, applied.rung, applied.decider], ["holds", HABIT_RUNG, "the will named Pierre alone"]);
  assert.equal(applyHabit(h, "Anatole left for Moscow the same night.", { holds }), null, "a decider absent from the material is not applicable — never a refusal");
  assert.equal(recallHabit(log, "someone|else|entirely"), null, "a habit never generalizes past its key");
  assert.throws(() => applyHabit(h, SECTION, {}), /holds\(decider, material\)/);
});

test("a habit is conceded by REC naming its trigger; a conceded habit answers nothing; a later judgment learns anew; the past stays whole", () => {
  let log = createHabits();
  log = learnHabit(log, { key: KEY, verdict: "holds", decider: "the will named Pierre alone", giver: "j@1" });
  const r = concedeHabit(log, KEY, { trigger: "the relation tier read the claim `contradicted` at wp.txt#62-140", giver: "answer-record" });
  log = r.log;
  assert.equal(r.conceded.verdict, "holds"); assert.equal(recallHabit(log, KEY), null);
  assert.equal(habitsFor(log, KEY)[0].conceded.trigger, r.conceded.trigger);
  assert.deepEqual(habitCensus(log), { learned: 1, live: 0, conceded: 1 });
  assert.equal(concedeHabit(log, KEY, { trigger: "again" }).conceded, null, "nothing live to concede");
  log = learnHabit(log, { key: KEY, verdict: "refused", decider: "the estate went to Anatole", giver: "j@2" });
  assert.equal(recallHabit(log, KEY).verdict, "refused");
  assert.equal(habitsFor(log, KEY).length, 2, "the conceded habit is still on the log");
  assert.deepEqual(log.entries.map((e) => e.operator), ["INS", "REC", "INS"]);
  assert.throws(() => concedeHabit(log, KEY, {}), /trigger/);
});

test("every field a habit needs is declared; the ledger rebuilds from its own entries through append", () => {
  const log = createHabits();
  assert.throws(() => learnHabit(log, { key: KEY, verdict: "holds", giver: "j" }), /decider/);
  assert.throws(() => learnHabit(log, { key: KEY, verdict: "holds", decider: "x", }), /giver/);
  assert.throws(() => learnHabit(log, { verdict: "holds", decider: "x", giver: "j" }), /key/);
  let l = learnHabit(log, { key: KEY, verdict: "holds", decider: "the will named Pierre alone", giver: "j" });
  l = concedeHabit(l, KEY, { trigger: "t" }).log;
  l = learnHabit(l, { key: "other", verdict: "undetermined", decider: "x y z", giver: "j" });
  const rebuilt = habitsFromEntries(JSON.parse(JSON.stringify(l.entries)));
  assert.deepEqual(habitCensus(rebuilt), habitCensus(l));
  assert.equal(recallHabit(rebuilt, KEY), null); assert.equal(recallHabit(rebuilt, "other").verdict, "undetermined");
});

test("medium-blind: the kernel's own body names no medium", () => {
  const src = readFileSync(new URL("../kernel/habit.js", import.meta.url), "utf8").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const w of ["sentence", "pronoun", "surface", "token", "word", "text"]) assert.ok(!new RegExp(`\\b${w}\\b`, "i").test(src), `kernel body names ${w}`);
});
