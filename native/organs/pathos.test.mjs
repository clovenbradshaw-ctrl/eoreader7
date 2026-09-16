// node --test pathos.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";

import { pathosOf, strainOf, reGroundCondition, reGround, landReGround } from "./pathos.js";

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

// ── ADVERSARIAL: strainOf trusts its input's TYPE, unlike its sibling gates ──
//
// Every other gate in this codebase that decides strict/veto/refuse validates
// the SHAPE of what it's handed (fold-gate.js throws on a non-finite alpha,
// experiencer.js throws on a non-string `who`). strainOf (line 43) does not:
// it reads `cycles > 0` and `state.unlicensed` with raw JS truthiness/coercion,
// and `.length` off whatever `contested`/`contradictions`/`expired` happen to
// be — so a caller who passes the WRONG TYPE for a field (a typo, a stringly-
// typed flag, a boolean where a count was meant) gets a real "strict"/"standard"
// verdict instead of a rejection, silently over-firing the hamartia-gate on
// malformed state rather than refusing to grade it.
test("ADVERSARIAL: strainOf over-fires to 'strict' on a boolean `cycles` — no cycle was ever counted, only a flag coerced to 1", () => {
  assert.equal(strainOf({ cycles: true }), "strict",
    "a boolean true for `cycles` (perhaps a caller's stray flag, not an actual cycle count) coerces to 1 and fires strict exactly as a real cycle would");
});

test("ADVERSARIAL: strainOf over-fires to 'strict' on a STRING `cycles` via numeric coercion, and silently reads a numeric string of '0' as clean", () => {
  assert.equal(strainOf({ cycles: "5" }), "strict", "'5' > 0 coerces true — a stringly-typed count fires exactly as a number would");
  assert.equal(strainOf({ cycles: "0" }), "report", "and a string '0' reads as clean — the gate never notices the type was wrong either way");
});

test("ADVERSARIAL: strainOf over-fires to 'strict' on unlicensed:\"false\" — the STRING \"false\" is truthy in JS", () => {
  // A caller who serializes state through JSON or a form and gets the string
  // "false" instead of the boolean false (an extremely ordinary mistake) will
  // have every reading silently escalated to "strict" (a directed cycle /
  // unlicensed turn) when nothing of the kind occurred.
  assert.equal(strainOf({ unlicensed: "false" }), "strict",
    'the string "false" is truthy, so `state.unlicensed` fires strict on the literal text meaning "no"');
  assert.equal(strainOf({ unlicensed: false }), "report", "the real boolean false correctly reads clean");
});

test("ADVERSARIAL: strainOf over-fires to 'standard' on a non-array, non-empty STRING for contested/contradictions/expired", () => {
  // `.length` is read off whatever value is handed in, not validated to be an
  // array of actual contested items — any truthy string (even one meaning
  // nothing was contested, e.g. a caller-side placeholder like "no") has a
  // nonzero `.length` and fires "standard".
  assert.equal(strainOf({ contested: "no" }), "standard",
    'a placeholder string "no" (length 2, truthy) is read as 2 contested items and fires standard');
  assert.equal(strainOf({ contradictions: "none" }), "standard", "same for contradictions");
  assert.equal(strainOf({ expired: "n/a" }), "standard", "same for expired");
});

// ── ADVERSARIAL: rhythm's flatline verdict fires from insufficient data, ──
// not from genuine repetitiveness — the same "absence is not evidence"
// discipline kind-standing.js/fold-gate.js hold explicitly is absent here.
test("ADVERSARIAL: a single dramatic sentence is unconditionally 'flatline' — n=1 has zero variance by construction, not because the piece is boring", () => {
  // pacing.js computes variance ACROSS sentences; with exactly one sentence
  // there is nothing to vary against, so variance is always 0 and flatline
  // is always true — regardless of how varied, tense, or eventful that one
  // sentence's own content is. reGroundCondition then declares "stale"
  // (Murch's boredom) for a text that was never actually read as boring,
  // only under-sampled.
  const dramatic = pathosOf({ text: "Everything he had built collapsed into ash in a single, unbearable instant.", experiencer: EXP });
  assert.equal(dramatic.rhythm.flatline, true,
    "a single eventful sentence reads flatline purely from sentence-count, not from its content");
  assert.equal(reGroundCondition(dramatic).kind, "stale",
    "and the re-ground condition over-fires 'stale' (ground untended) on a text that was never actually paced, only too short to measure pacing on");
});

// ── rhythm: Murch's pacing, the cut at the grain of the blink ────────────
test("rhythm: a flatline piece is Murch's boredom — no blink, no cut", () => {
  const flat = pathosOf({ text: "One two three. Four five six. Seven eight nine. Ten eleven twelve.", experiencer: EXP });
  assert.equal(flat.rhythm.flatline, true);
  assert.equal(flat.rhythm.blinks, 0);
  assert.equal(flat.rhythm.ratio, 0);
});

test("rhythm: a piece that alternates swell and rest cuts where the thought turns", () => {
  const varied = pathosOf({ text: "A b c d e f g h i j. X. A b c d e f g h i j. Y. A b c d e f g h i j. Z.", experiencer: EXP });
  assert.equal(varied.rhythm.flatline, false);
  assert.ok(varied.rhythm.blinks >= 3, `expected blinks, got ${varied.rhythm.blinks}`);
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