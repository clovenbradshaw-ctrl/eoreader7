import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { undecided, collapse, standingOf, contestRule, COLLAPSE_VERDICTS } from "../kernel/undecided.js";
import { adjudicate } from "../kernel/contest.js";
import { createForWhom } from "../kernel/for-whom.js";

const fw = createForWhom({ id: "reader-a", giver: "test", question: "who holds the slot" });
const fw2 = createForWhom({ id: "reader-b", giver: "test", question: "who holds the slot, strictly" });
const rec = () => undecided({ question: "occupant", slot: "before:transition", giver: "test", cursor: 7, candidates: [
  { value: "x", via: "cast", features: { distance: 4, commaBetween: true } },
  { value: "y", via: "pronoun", features: { distance: 1, commaBetween: false } },
] });

test("the record is frozen, content-addressed and open; the same reading is the same id", () => {
  const a = rec(), b = rec();
  assert.equal(a.id, b.id); assert.equal(a.standing, "open"); assert.ok(Object.isFrozen(a) && Object.isFrozen(a.candidates[0]));
  assert.throws(() => undecided({ question: "q", slot: "s", candidates: [] }), /giver/);
});

test("a collapse is a separate appended record: it names the for-whom, the cursor and the rule, and never mutates the undecided one", () => {
  const r = rec();
  const nearest = { name: "nearest", giver: "test", decide: (cs) => ({ chosen: cs.reduce((b, c) => (c.features.distance < b.features.distance ? c : b)).index }) };
  const c = collapse(r, { forWhom: fw, rule: nearest, cursor: 9 });
  assert.equal(c.verdict, COLLAPSE_VERDICTS.CHOSEN); assert.equal(c.chosen.value, "y"); assert.equal(c.of, r.id); assert.equal(c.forWhom, "reader-a"); assert.equal(c.rule.name, "nearest");
  assert.equal(r.standing, "open");
  assert.throws(() => collapse(r, { rule: nearest }), /for-whom/);
  assert.throws(() => collapse(r, { forWhom: fw, rule: { name: "x", decide: () => ({}) } }), /giver/);
});

test("two for-whoms collapse the same record differently and both stand; standingOf reads per for-whom", () => {
  const r = rec();
  const noComma = { name: "no-comma", giver: "test", decide: (cs) => { const ok = cs.filter((c) => !c.features.commaBetween); return ok.length === 1 ? { chosen: ok[0].index } : { contested: ok.map((c) => c.index) }; } };
  const strict = { name: "cast-only", giver: "test", decide: (cs) => { const ok = cs.filter((c) => c.via === "cast" && !c.features.commaBetween); return ok.length ? { chosen: ok[0].index } : { reason: "no admissible candidate" }; } };
  const c1 = collapse(r, { forWhom: fw, rule: noComma }), c2 = collapse(r, { forWhom: fw2, rule: strict });
  assert.equal(c1.verdict, "chosen"); assert.equal(c2.verdict, "none"); assert.equal(c2.reason, "no admissible candidate");
  assert.equal(standingOf(r, [c1, c2], fw).standing, "chosen"); assert.equal(standingOf(r, [c1, c2], fw2).standing, "none"); assert.equal(standingOf(r, [], fw).standing, "open");
});

test("contestRule reuses contest.js: a clear lead is chosen, a near tie is contested, nothing above the floor is none", () => {
  const r = undecided({ question: "q", slot: "s", giver: "test", candidates: [{ value: "a", features: { act: 0.9 } }, { value: "b", features: { act: 0.2 } }, { value: "c", features: { act: 0.85 } }] });
  const rule = (extra) => contestRule({ score: (c) => c.features.act, minActivation: 0.1, minMargin: 0.2, contestedMargin: 0.3, adjudicate, giver: "contest.js", ...extra });
  const lead = collapse(undecided({ question: "q", slot: "s", giver: "test", candidates: [{ value: "a", features: { act: 0.9 } }, { value: "b", features: { act: 0.2 } }] }), { forWhom: fw, rule: rule() });
  assert.equal(lead.verdict, "chosen"); assert.equal(lead.chosen.value, "a");
  const tie = collapse(r, { forWhom: fw, rule: rule() });
  assert.equal(tie.verdict, "contested"); assert.ok(tie.contested.length >= 2);
  const none = collapse(undecided({ question: "q", slot: "s", giver: "test", candidates: [{ value: "a", features: { act: 0.01 } }] }), { forWhom: fw, rule: rule() });
  assert.equal(none.verdict, "none");
});

test("the kernel names no medium", () => {
  const src = readFileSync(new URL("../kernel/undecided.js", import.meta.url), "utf8").replace(/\/\/.*$/gm, "");
  for (const w of ["sentence", "pronoun", "surface", "token", "word", "text"]) assert.ok(!new RegExp(`\\b${w}\\b`, "i").test(src), `names ${w}`);
});

test("persistence: an undecided record and two collapses land on the fold, survive reconstruct, and read back per for-whom", async () => {
  const { undecidedOperation, collapseOperation, openSlots } = await import("../kernel/undecided.js");
  const { eoOperation, deltaFold, applyDelta, receivedGround, reconstruct } = await import("../kernel/fold.js");
  const r = rec();
  const nearest = { name: "nearest", giver: "test", decide: (cs) => ({ chosen: cs.reduce((b, c) => (c.features.distance < b.features.distance ? c : b)).index }) };
  const strict = { name: "cast-only", giver: "test", decide: (cs) => { const ok = cs.filter((c) => c.via === "cast" && !c.features.commaBetween); return ok.length ? { chosen: ok[0].index } : { reason: "none admissible" }; } };
  const c1 = collapse(r, { forWhom: fw, rule: nearest, cursor: 9 });
  const c2 = collapse(r, { forWhom: fw2, rule: strict, cursor: 9 });
  const open = undecidedOperation(r, { eoOperation, witness: "w:1" });
  assert.equal(open.operator, "SIG"); assert.equal(open.terrain, "Void");
  const d1 = deltaFold([open], { id: "d1" });
  const d2 = deltaFold([collapseOperation(c1, { eoOperation, witness: "w:2" }), collapseOperation(c2, { eoOperation, witness: "w:3" })], { id: "d2" });
  assert.equal(d2.operations[0].operator, "EVA");
  let fold = applyDelta(receivedGround(), d1);
  const afterOpen = openSlots(fold, fw);
  assert.equal(afterOpen.length, 1); assert.equal(afterOpen[0].standing, "open");
  fold = applyDelta(fold, d2);
  assert.equal(openSlots(fold, fw)[0].standing, "chosen"); assert.equal(openSlots(fold, fw)[0].collapse.chosen.value, "y");
  assert.equal(openSlots(fold, fw2)[0].standing, "none");
  // replay from the log alone
  const replayed = reconstruct([d1, d2]);
  assert.equal(openSlots(replayed, fw)[0].standing, "chosen"); assert.equal(openSlots(replayed, fw2)[0].standing, "none");
  assert.equal(openSlots(replayed, fw)[0].record.standing, "open", "the undecided record itself is never rewritten by a collapse");
});
