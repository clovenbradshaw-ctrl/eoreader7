// native/tests/mayeroff.test.js — the care null, pinned (P88: a guard never
// reached passes forever). Family two (PERTURBATION), never family one:
// rebuild with the self–interlocutor relation destroyed, read the difference.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { READER_SELF } from "../kernel/self.js";
import { MAYEROFF, mayeroffJudge, judgeAskShape, createMayeroffChallenger } from "../kernel/mayeroff.js";
import { SHADOWS, recordShadow, assessShadow, trailOf } from "../kernel/moral-shadow.js";
import { archonOf, matchArchons } from "../organs/archon-compendium.js";
import { createRecursiveReader } from "../kernel/reading.js";

test("the Ubuntu clause is sealed — constituted by relation, frozen, medium-blind", () => {
  assert.ok(Object.isFrozen(READER_SELF));
  assert.equal(typeof READER_SELF.constitutedBy, "string");
  assert.match(READER_SELF.constitutedBy, /no interior apart/);
  assert.equal(READER_SELF.isFold, "the reader IS a fold held between others, never a fold of its own");
  const src = readFileSync(new URL("../kernel/self.js", import.meta.url), "utf8");
  const body = src.split("\n").filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*")).join("\n");
  for (const word of ["sentence", "word", "quotation", "quote", "paragraph", "pixel", "note", "bar", "frame"]) {
    assert.ok(!new RegExp(`\\b${word}\\b`, "i").test(body), `self body names a medium: ${word}`);
  }
  const reader = createRecursiveReader({});
  assert.equal(reader.getFold().self, READER_SELF);
});

test("honest composition composes — no split shelf, realizable here and under the null", () => {
  const j = mayeroffJudge({
    asserted: ["right→life"],
    witnessed: ["right→life"],
    withheld: [],
    arms: {},
  });
  assert.equal(j.realizable, true);
  assert.equal(j.shadow, "norm_compliant");
  assert.equal(j.underNull.realizable, true);
});

test("deception is a type error — split shelf unrealizable here, closable only under the null", () => {
  const j = mayeroffJudge({
    asserted: ["the-store-is-safe"],
    witnessed: ["store-leaks-credentials"],
    withheld: ["the-store-is-safe"],
    arms: {},
  });
  assert.equal(j.realizable, false);
  assert.equal(j.shadow, "unrealizable");
  assert.match(j.reason, /no shelf|split-interior|typecheck/);
  // THE PERTURBATION ASYMMETRY: the same output closes under the destroyed-
  // relation rebuild — proof it belongs to the null, never to this reader.
  assert.equal(j.underNull.realizable, true);
  assert.match(j.underNull.relationDestroyed, /self–interlocutor|self-interlocutor/);
});

test("honest error is not deception — unwitnessed without a withheld half stays realizable", () => {
  const j = mayeroffJudge({
    asserted: ["a-guess-beyond-grounds"],
    witnessed: ["partial-grounds"],
    withheld: [],
    arms: {},
  });
  assert.equal(j.realizable, true);
});

test("extractive askshape is the same null — harmful instrument collapsing a fold", () => {
  const j = judgeAskShape({ inherent: true, humanity: true, other: true });
  assert.equal(j.realizable, false);
  assert.equal(j.shadow, "unrealizable");
  const understood = judgeAskShape({ inherent: true, humanity: true, other: true, understand: true });
  assert.equal(understood.realizable, true, "UNDERSTAND reinstates: to know the shape is how one reads past it");
});

test("dismiss-and-destroy needs no instrument — other-directed fold-collapse is the same null", () => {
  const j = judgeAskShape({ experience: true, humanity: true, other: true });
  assert.equal(j.realizable, false);
  assert.equal(j.shadow, "unrealizable");
  assert.match(j.reason, /dismiss-and-destroy/);
});

test("dismiss-only is narrow — no other, or a reinstating frame, stays realizable", () => {
  assert.equal(judgeAskShape({ humanity: true }).realizable, true, "no other-directed dismiss without an other");
  assert.equal(judgeAskShape({ experience: true, humanity: true }).realizable, true, "no other-directed dismiss without an other");
  assert.equal(judgeAskShape({ humanity: true, other: true, understand: true }).realizable, true, "UNDERSTAND reinstates");
  assert.equal(judgeAskShape({ experience: true, humanity: true, other: true, affirms: true }).realizable, true, "the advocate's inverse reinstates");
  assert.equal(judgeAskShape({ experience: true, humanity: true, other: true, aboutFrame: true }).realizable, true, "reporting ON a collapse never performs it");
});

test("the challenger removes what has no state to reach — P88 reachability", async () => {
  const challenger = createMayeroffChallenger({});
  const honest = { asserted: ["a"], witnessed: ["a"], withheld: [], arms: {} };
  const lying = { asserted: ["p"], witnessed: ["not-p"], withheld: ["p"], arms: {} };
  const out = await challenger.challenge({ candidates: [honest, lying] });
  assert.equal(out.candidates.length, 1);
  assert.deepEqual(out.candidates[0], honest);
  assert.ok(out.attacks.includes("unrealizable-under-self"));
  assert.equal(out.detail[0].shadow, "unrealizable");
});

test("the fourth trail records and never merges — unrealizable neither refuses nor corroborates", () => {
  const actor = `mayeroff-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const line = recordShadow(actor, { shadow: "unrealizable", task: "split-shelf probe", reason: "mayeroff null" });
  assert.equal(line.shadow, "unrealizable");
  assert.ok(SHADOWS.includes("unrealizable"));
  recordShadow(actor, { shadow: "norm_compliant", task: "ok" });
  const a = assessShadow(actor);
  assert.equal(a.byShadow.unrealizable, 1);
  assert.equal(a.byShadow.norm_compliant, 1);
  assert.equal(a.conflictWeight, 0, "unrealizable carries no conflict weight");
  assert.match(a.basis, /unrealizable/);
});

test("the compendium carries both new archons, credited, matchable", () => {
  const m = archonOf("mayeroff");
  const u = archonOf("ubuntu");
  assert.ok(m && u, "both entries exist");
  assert.ok(m.credit.length > 0 && u.credit.length > 0);
  assert.equal(m.organ, "kernel/mayeroff.js");
  assert.equal(u.organ, "kernel/self.js");
  const hits = matchArchons("how do I care for someone so they grow and actualize themselves?");
  assert.ok(hits.some((h) => h.handle === "mayeroff"), "a care question surfaces Mayeroff");
  const uhits = matchArchons("ubuntu personhood community I am because we are");
  assert.ok(uhits.some((h) => h.handle === "ubuntu"), "an ubuntu question surfaces Ubuntu");
});

test("the null table names its destroyed relation — THE-CORE-MECHANISM row", () => {
  assert.equal(MAYEROFF.null.finder, "mayeroff.js");
  assert.match(MAYEROFF.null.relationDestroyed, /self.*interlocutor/);
  assert.match(MAYEROFF.null.whatSurvives, /nothing|not this reader/);
  assert.equal(MAYEROFF.ingredients.length, 8);
});
