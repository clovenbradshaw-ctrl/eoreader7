// node --test pathos.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";

import { pathosOf, strainOf, reGroundCondition, reGround, landReGround } from "./pathos.js";
import { pacingGrade } from "./pacing.js";

const EXP = { who: "reader:eoreader7-cli", read: "specimen.txt" };

// ── the law: pathos without a declared for-whom is refused (anti-kitsch) ──
test("pathosOf throws when the experiencer is missing — a feeling for no one is refused, never defaulted", () => {
  assert.throws(() => pathosOf({ text: "one two three. four five six. seven eight nine." }), /experiencer is declared/);
  assert.throws(() => pathosOf({ text: "one two three.", experiencer: { read: "x" } }), /experiencer\.who is required/);
  assert.throws(() => pathosOf({ text: "one two three.", experiencer: { who: "reader" } }), /experiencer\.read is required/);
});

test("pathosOf throws when the material is missing — the text that was undergone is never a placeholder", () => {
  assert.throws(() => pathosOf({ experiencer: EXP }), /pathos requires the text/);
  assert.throws(() => pathosOf({ text: "   ", experiencer: EXP }), /pathos requires the text/);
});

// ── strain: the hamartia-gate, three rungs ────────────────────────────────
test("strainOf: report when the record is clean, standard when contested, strict on a cycle", () => {
  assert.equal(strainOf({}), "report");
  assert.equal(strainOf({ contested: ["c"] }), "standard");
  assert.equal(strainOf({ contradictions: ["x"] }), "standard");
  assert.equal(strainOf({ expired: ["e"] }), "standard");
  assert.equal(strainOf({ cycles: 1 }), "strict");
  assert.equal(strainOf({ unlicensed: true }), "strict");
});

// ── rhythm: Murch's pacing, the cut at the grain of the blink ────────────
test("rhythm: a flatline piece is Murch's boredom — no blink, no cut", () => {
  const flat = pathosOf({ text: "One two three. Four five six. Seven eight nine. Ten eleven twelve.", experiencer: EXP });
  assert.equal(flat.rhythm.flatline, true);
  assert.equal(flat.rhythm.blinks, 0);
  assert.equal(flat.rhythm.ratio, 0);
});

test("rhythm: a piece that alternates swell and rest cuts where the thought turns", () => {
  // Landings are three words: pacingGrade never counts a blink shorter than that.
  const varied = pathosOf({ text: "A b c d e f g h i j. X y z. A b c d e f g h i j. U v w. A b c d e f g h i j. R s t.", experiencer: EXP });
  assert.equal(varied.rhythm.flatline, false);
  assert.ok(varied.rhythm.blinks >= 3, `expected blinks, got ${varied.rhythm.blinks}`);
});

// Regression (2026-09-14): the-fold reads a one-sentence recent answer through this organ;
// one length has zero variance by construction, so it was graded flat and the model was
// told its answers "have been flat" after a single answer. One sentence is not a rhythm.
test("rhythm: a single sentence is never a flatline — too little to grade, the ground holds", () => {
  const one = pathosOf({ text: "Paris is the capital of France.", experiencer: EXP });
  assert.equal(one.rhythm.n, 1);
  assert.equal(one.rhythm.flatline, false);
  assert.equal(reGroundCondition(one).kind, "ground_holds");
  // The floor is exactly one: two equal sentences are still a flatline.
  const two = pathosOf({ text: "Paris is the capital of France. Rome is the capital of Italy.", experiencer: EXP });
  assert.equal(two.rhythm.flatline, true);
});

// Regression (2026-09-14): pathosOf read ratio/mean/blinks/dense/n under names pacingGrade
// never returned, so every read reported zeros. The rhythm block must mirror the grade.
test("rhythm: every field mirrors pacingGrade on the same text — a short landing is counted", () => {
  const text = "The regiment marched through the long valley for three days without any word from the capital. They stopped to rest. The scouts rode ahead across the river and found the bridge burned and the far bank empty of anyone at all. The camp was silent.";
  const grade = pacingGrade(text);
  const read = pathosOf({ text, experiencer: EXP });
  assert.ok(grade.blinkPoints.length > 0, "the specimen must carry a blink, or this test proves nothing");
  assert.equal(read.rhythm.blinks, grade.blinkPoints.length);
  assert.equal(read.rhythm.n, grade.sentences);
  assert.equal(read.rhythm.mean, grade.meanLength);
  assert.equal(read.rhythm.ratio, grade.varianceRatio);
  assert.equal(read.rhythm.dense, grade.denseSentences.length);
  assert.equal(read.rhythm.flatline, grade.flatline);
});

// ── curve: measured from the fold, or a typed gap, never invented ─────────
test("curve: without a fold it is an unmeasured gap, not a verdict", () => {
  const read = pathosOf({ text: "A b c d e f g h i j. X.", experiencer: EXP });
  assert.equal(read.curve.measured, false);
  assert.equal(read.curve.unmeasured, "no fold supplied — surprise/tension/release are a gap, not a verdict");
});

test("curve: with a fold and delta it is measured — surprise, tension, release from the reading's own machinery", () => {
  const fold = {
    obligations: [
      { id: "o1", status: "open", grounds: ["g"], openedAt: 1, persistence: 3, consequences: ["c"] },
    ],
    sequence: 4,
  };
  const delta = { operations: [{ operator: "SYN", mode: "Interpretation", domain: "Paradigm", grain: "Pattern", inputs: ["a"], outputs: ["b"] }] };
  const read = pathosOf({ text: "A b c d e f g h i j. X.", experiencer: EXP, fold, delta });
  assert.equal(read.curve.measured, true);
  assert.equal(read.curve.surprise.operations, 1);
  assert.equal(read.curve.tension.obligations, 1);
  assert.equal(read.curve.tension.persistenceMax, 4); // dynamics' own formula: max(declared 3, sequence 4 - openedAt 1 + 1)
});

// ── re-ground condition: the felt shape decides whether the ground holds ──
test("reGroundCondition: ground_holds when nothing failed", () => {
  const read = pathosOf({ text: "A b c d e f g h i j. X.", experiencer: EXP });
  assert.equal(reGroundCondition(read).kind, "ground_holds");
});

test("reGroundCondition: stale when the piece paces flat — Murch's boredom, the ground untended", () => {
  const read = pathosOf({ text: "One two three. Four five six. Seven eight nine. Ten eleven twelve.", experiencer: EXP });
  assert.equal(reGroundCondition(read).kind, "stale");
});

test("reGroundCondition: contested at strict — the ground's own premises are in a knot", () => {
  const read = pathosOf({ text: "A b c d e f g h i j. X.", experiencer: EXP, state: { cycles: 1 } });
  assert.equal(read.strain, "strict");
  assert.equal(reGroundCondition(read).kind, "contested");
});

test("reGroundCondition: collapse — a consequential surprise burst with no release", () => {
  const fold = { obligations: [], sequence: 2 };
  const delta = { operations: [{ operator: "SYN", mode: "Interpretation", domain: "Paradigm", grain: "Pattern", inputs: ["a"], outputs: ["b"] }] };
  const read = pathosOf({ text: "A b c d e f g h i j. X.", experiencer: EXP, fold, delta });
  assert.equal(reGroundCondition(read).kind, "collapse");
});

test("reGroundCondition: an unmeasured curve never declares collapse — absence-as-conviction is refused", () => {
  const read = pathosOf({ text: "A b c d e f g h i j. X.", experiencer: EXP });
  assert.equal(read.curve.measured, false);
  assert.equal(reGroundCondition(read).kind, "ground_holds");
});

// ── the re-ground: a recorded concession, never an idle one ──────────────
test("reGround: produces a REC·Ground act that concedes the old ground and opens the new one", () => {
  const read = pathosOf({ text: "One two three. Four five six. Seven eight nine. Ten eleven twelve.", experiencer: EXP });
  const act = reGround({ read, giver: "reader:eoreader7-cli" });
  assert.equal(act.schema, "EOPathosReGround@1");
  assert.equal(act.op, "REC");
  assert.equal(act.grain, "Ground");
  assert.equal(act.cause.kind, "stale");
  assert.equal(act.witness, "reader:eoreader7-cli");
  assert.equal(act.conceded.strain, "report");
  assert.equal(act.opened.register, "Ground");
  assert.equal(act.record.kept, true);
});

test("reGround: refuses to concede a ground that holds — a concession is a recorded act, never an idle one", () => {
  const read = pathosOf({ text: "A b c d e f g h i j. X.", experiencer: EXP });
  assert.throws(() => reGround({ read, giver: "reader:eoreader7-cli" }), /no re-ground/);
});

test("reGround: requires a giver — a recorded act names its actor", () => {
  const read = pathosOf({ text: "One two three. Four five six. Seven eight nine. Ten eleven twelve.", experiencer: EXP });
  assert.throws(() => reGround({ read }), /reGround requires a giver/);
});

// ── landing: the concession is on the record, and reads back (P88) ───────
test("landReGround: appends, stamps the address, and the act reads back from the log", () => {
  const read = pathosOf({ text: "One two three. Four five six. Seven eight nine. Ten eleven twelve.", experiencer: EXP });
  const act = reGround({ read, giver: "reader:eoreader7-cli" });
  const landedLog = landReGround([], act);
  assert.equal(landedLog.length, 1);
  assert.equal(landedLog[0].record.at, 0);
  assert.equal(landedLog[0].cause.kind, "stale");
  const second = landReGround(landedLog, act);
  assert.equal(second.length, 2);
  assert.equal(second[1].record.at, 1);
});

test("landReGround: a re-ground that does not land is refused — it must never float", () => {
  const read = pathosOf({ text: "One two three. Four five six. Seven eight nine. Ten eleven twelve.", experiencer: EXP });
  const act = reGround({ read, giver: "reader:eoreader7-cli" });
  assert.throws(() => landReGround("not-an-array", act), /task log array/);
  assert.throws(() => landReGround([], { schema: "Nope" }), /EOPathosReGround@1/);
});