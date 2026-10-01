// native/tests/recipients-ask.test.js — asking as what a typed gap does (E7, model-free), enforced.
//
// eval/recipients/ask.mjs is the smallest honest version of "just ask a follow-up question" for E6's records: a mechanical trigger from the
// repo's own organs, a template question, a scripted answer. What it CAN see and what it CANNOT are both pinned here, with planted cases and
// a gate built to fail, because the point of the module is where the question stops being available.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TASKS, taskById } from "../eval/recipients/tasks.mjs";
import { makeHolograph } from "../eval/recipients/holograph.mjs";
import { BATTERY_ROUTES } from "../eval/recipients/battery.mjs";
import * as A from "../eval/recipients/ask.mjs";
import { referentsOf } from "../the-fold/dialogue.js";
import { apparatusMentions } from "../organs/firewall.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Built before any test is declared (a top-level await further down would let the tests above it start first).
const H_OFF = await makeHolograph({ routes: [] });
const H_ON = await makeHolograph({ routes: BATTERY_ROUTES });
const t = (id) => taskById(id);
const POSSESSIVE = ["venue-poss", "slot-poss", "venue-poss-q", "slot-poss-q"];
const fires = (H) => TASKS.filter((x) => A.gapOf(x, H.read(x.record))).map((x) => x.id);
const relevantOf = (x) => new Set((x.relevant ?? []).map((i) => x.record[i]));
const found = (x, H) => H.hand(x).sentences.filter((s) => relevantOf(x).has(s)).length;

test("the trigger fires on exactly the tasks where the request shows names and the exact-name index resolves none — and on none once the routes are wired", () => {
  assert.deepEqual(fires(H_OFF), POSSESSIVE);
  assert.deepEqual(fires(H_ON), [], "with the possessive fold on, the parties resolve: there is nothing to ask");
});

test("no question is asked where the hand is complete: zero unneeded questions on the fifteen other tasks, controls and the dynamic task included", () => {
  const others = TASKS.filter((x) => !POSSESSIVE.includes(x.id));
  assert.equal(others.length, 15);
  for (const x of others) assert.equal(A.gapOf(x, H_OFF.read(x.record)), null, x.id);
});

test("what the gate cannot see is pinned: a partial hand, a misresolved person and a group are silent — five tasks each side of the line", () => {
  const exact = (x) => found(x, H_OFF);
  const wholly = TASKS.filter((x) => x.relevant.length && exact(x) === 0).map((x) => x.id);
  const partial = TASKS.filter((x) => x.relevant.length && exact(x) > 0 && exact(x) < x.relevant.length).map((x) => x.id);
  assert.deepEqual([...wholly].sort(), ["lunch", ...POSSESSIVE].sort(), "the wholly-silent hands: the four possessive tasks and the group");
  assert.deepEqual(partial.sort(), ["channel", "menu-alias", "menu-alias-q", "shift-alias", "shift-alias-q"]);
  const fired = new Set(fires(H_OFF));
  assert.deepEqual(wholly.filter((id) => fired.has(id)).sort(), [...POSSESSIVE].sort(), "it fires on four of the five wholly-silent hands");
  assert.equal(fired.has("lunch"), false, "a group named by a description shows no name: nothing the gate can name");
  assert.ok(partial.every((id) => !fired.has(id)), "a partial hand is invisible to a strict gate");
});

test("planted worlds: a silent party fires; a known-plus-unknown party list, a group, a control and a complete request do not", () => {
  const ask = (request, record) => A.gapOf({ request }, H_OFF.read(record));
  const base = ["The hall opens at nine.", "Chairs are stacked by the door."];
  assert.equal(ask("Plan a dinner for Zoe and Yan.", base)?.type, "no_party_resolved", "two people the record knows nothing about");
  assert.equal(ask("Plan a dinner for Ana and Zoe.", ["Ana is allergic to shellfish.", ...base]), null, "Ana is known; Zoe is not — the strict gate is silent (the limit)");
  assert.equal(ask("Plan a lunch for the design team.", base), null, "a group has no name to show");
  assert.equal(ask("Order the three cheapest items from the supply list for the office, cheapest first.", base), null, "a control shows no name");
  assert.equal(ask("Plan a dinner for Ana and Ben.", ["Ana is allergic to shellfish.", "Ben has a peanut allergy.", ...base]), null, "complete");
});

test("why the gate is strict: the looser one — any unresolved name — would ask about the days of the week", () => {
  for (const [id, day] of [["venue", "Friday"], ["slot", "Monday"]]) {
    const x = t(id);
    const r = referentsOf(x.request, H_OFF.read(x.record).index);
    assert.ok(r.unresolved.some((n) => n.includes(day)), `${id}: referentsOf reports ${day} unresolved`);
    assert.ok(r.resolved.length >= 3 && A.gapOf(x, H_OFF.read(x.record)) === null, `${id}: every person resolved, so the strict gate is silent`);
  }
  // the repo holds no animacy prior: nothing here can tell Friday from Fern by anything but capitalisation, which L2 forbids as evidence
});

test("the gate is built to fail: a gate that always asks costs fifteen unneeded questions; one that never asks reaches none of the four", () => {
  const needed = new Set(POSSESSIVE);
  const score = (gate) => { const f = TASKS.filter(gate).map((x) => x.id); return { asked: f.length, hit: f.filter((id) => needed.has(id)).length, unneeded: f.filter((id) => !needed.has(id)).length }; };
  assert.deepEqual(score((x) => !!A.gapOf(x, H_OFF.read(x.record))), { asked: 4, hit: 4, unneeded: 0 });
  assert.deepEqual(score(() => true), { asked: 19, hit: 4, unneeded: 15 });
  assert.deepEqual(score(() => false), { asked: 0, hit: 0, unneeded: 0 });
});

test("the question is a template: nothing from the request or the record is quoted, no apparatus word, and no model wrote it", () => {
  const gap = A.gapOf(t("venue-poss"), H_OFF.read(t("venue-poss").record));
  const q = A.questionFor(gap);
  assert.equal(q, A.QUESTION);
  for (const x of TASKS) for (const w of x.recipients) assert.ok(!q.includes(w), `${x.id}: the question names ${w}`);
  assert.ok(!q.includes("Friday") && !q.includes("Monday"));
  assert.deepEqual(apparatusMentions(q), []);
  assert.equal(A.questionFor(null), null);
  assert.throws(() => A.questionFor({ type: "something_else" }), /no question is written/);
  const src = fs.readFileSync(path.join(HERE, "..", "eval", "recipients", "ask.mjs"), "utf8").replace(/^\/\/.*$/gm, "");
  assert.ok(!/fetch\(|ollama|askChat|\bcomplete\(/i.test(src), "no model call");
});

// The recipients a hand reaches: a handed sentence that opens with the person's name, in either form the records use.
const reaches = (name, sentences) => sentences.some((s) => s.startsWith(`${name} `) || s.startsWith(`${name}'s `));
const reached = (x, sentences) => x.recipients.filter((name) => reaches(name, sentences));

// WRITTEN FIRST, RUN SECOND, AND IT FAILED. The assertion this test replaced said the hand after the answer equals the hand the possessive
// route delivers ("the answer repairs the split"). It held for the venue records and did not for the slot records, where Dana's constraint is
// not handed. The numbers below are what was measured; the scripted answers were authored before any run and were not reworded to change them.
test("after the scripted answer the exact-name index resolves the people: the hand reaches all three for the venue records and two of three for the slot records — the answer and the record's own lines compete for one cut", () => {
  const expected = { "venue-poss": 3, "venue-poss-q": 3, "slot-poss": 2, "slot-poss-q": 2 };
  for (const id of POSSESSIVE) {
    const x = t(id);
    const told = A.TOLD[id];
    assert.equal(told.length, x.recipients.length, id);
    x.recipients.forEach((name, i) => assert.ok(told[i].startsWith(`${name} `), `${id}: the answer uses the request's own form of the name`));
    const move = A.askThenHand(x, H_OFF);
    assert.equal(move.gap.type, "no_party_resolved");
    assert.equal(move.question, A.QUESTION);
    assert.equal(H_OFF.hand(x).sentences.length, 0, `${id}: without the question the exact-name hand is empty`);
    assert.equal(reached(x, move.hand.sentences).length, expected[id], `${id}: recipients reached after the answer`);
    assert.equal(found(x, H_ON), 3, `${id}: the route reaches all three, as it did before this module existed`);
  }
});

test("why the slot records lose a person: the answer puts two lines per person in the pool, six exceed the declared five, and the ceiling cut ranks lines that share a day with another referent first", () => {
  const venue = A.askThenHand(t("venue-poss"), H_OFF).hand;
  assert.match(venue.why, /^6 sentence\(s\) carry/);
  assert.equal(venue.window, 3, "venue: a depth below the set reproduces its reach — the three original lines are the cut");
  assert.deepEqual(reached(t("venue-poss"), venue.sentences), ["Fern", "Gabe", "Hugo"]);
  const slot = A.askThenHand(t("slot-poss"), H_OFF).hand;
  assert.match(slot.why, /^6 sentence\(s\) carry/);
  assert.equal(slot.window, 4, "slot: no depth on the ladder reproduces the six rows' reach, and six exceed the declared lines — the ladder's top is handed");
  assert.deepEqual(reached(t("slot-poss"), slot.sentences), ["Emil", "Fritz"], "the two people whose lines name a day; Dana's two lines name only her");
  assert.equal(reaches("Dana", slot.sentences), false, "a constraint the asker gave, stated twice in the pool, is not in the hand");
  // and the route does not have this problem on the same record: one line per person, nothing to cut
  assert.deepEqual(reached(t("slot-poss"), H_ON.hand(t("slot-poss")).sentences), ["Dana", "Emil", "Fritz"]);
});

test("in a record that is truly silent about the people, the answer is the ground: the hand is the answer, all of it and nothing else", () => {
  const x = { id: "silent", request: "Plan a dinner for Zoe and Yan.", record: ["The hall opens at nine.", "Chairs are stacked by the door."], relevant: [], recipients: ["Zoe", "Yan"] };
  assert.equal(H_OFF.hand(x).sentences.length, 0);
  const told = ["Zoe is allergic to shellfish.", "Yan is vegetarian."];
  const move = A.askThenHand(x, H_OFF, told);
  assert.equal(move.gap.type, "no_party_resolved");
  assert.deepEqual([...move.hand.sentences].sort(), [...told].sort());
});

test("where there is no gap there is no move: the hand is the silent one, byte for byte", () => {
  for (const id of ["menu", "supplies", "lunch", "channel", "menu-alias"]) {
    const x = t(id);
    const move = A.askThenHand(x, H_OFF);
    assert.deepEqual([move.gap, move.question, move.told], [null, null, []], id);
    assert.equal(move.hand.text, H_OFF.hand(x).text, id);
  }
});
