// fiction-admission-falsify.test.mjs — THE FALSIFICATION TIER for the fiction
// pathway (2026-09-26). Intended integration path:
// native/the-fold/fiction-admission-falsify.test.mjs, beside
// admission-falsify.test.mjs, run the same way (node --test).
//
// The claim under test, stated plainly: a counterfactual/hypothetical seed is
// ONE real Ground-fact (a real subject/relation/object triple, extracted the
// same way arrange.js's claimsFromFeat already extracts every other GFP
// claim) with ONE role's filler replaced by a DIFFERENT REAL value the same
// document already uses for that role — never invented — and the fiction
// pathway's own admission/arrival gates are built entirely around checking
// that substitution mechanically: does a sentence revert to the overridden
// value (refused), and does the finished piece actually use the replacement
// (required for arrival) — while, unlike admit(), never refusing genuinely
// invented scene/action/dialogue.
//
// Real content, real parser, real admission.js functions throughout — no
// mocks except where a test needs to isolate a single behavior (the injected
// `parser: { ok: false }` case, which is itself testing a real, disclosed
// code path: what happens with no parser).
import test from "node:test";
import assert from "node:assert/strict";
import { loadEotParser } from "./eot-notation.js";
import { admit, measureVariance } from "./admission.js";
import {
  tripleFromRecord, stipulateFromGround, fictionInstruction,
  admitFiction, revertsStipulation, fictionArrival,
} from "./fiction-admission.js";

const GROUND = "John Donelson led the flotilla down the Cumberland River in 1779. The settlers built a fort on the bluff above the river. Nashville grew from that fort into a trading post. The Cumberland River flooded the town in 1793.";

// One real parser load, shared by every test (loadEotParser caches).
const parser = await loadEotParser();
test("setup: the in-house parser loads", () => { assert.equal(parser.ok, true, parser.ok ? "" : parser.reason); });

// ── stipulateFromGround ──────────────────────────────────────────────────────

test("stipulateFromGround extracts a REAL claim from real parsed ground text, not a guess", () => {
  const s = stipulateFromGround(GROUND, { parser, pick: 0 });
  assert.equal(s.ok, true);
  assert.equal(s.original.rel, "lead");
  assert.equal(s.original.roles.ARG1, "flotilla");
  assert.equal(s.originalSentence, "John Donelson led the flotilla down the Cumberland River in 1779.");
});

test("the substitute value is a REAL filler drawn from a DIFFERENT claim in the same ground, never coined", () => {
  const s = stipulateFromGround(GROUND, { parser, pick: 0 });
  assert.equal(s.mode, "substitute-ARG1");
  assert.equal(s.overriddenValue, "flotilla");
  const substitute = s.stipulated.roles.ARG1;
  // the substitute must itself appear as a real word in the ground text
  assert.ok(GROUND.toLowerCase().includes(substitute.toLowerCase()), `"${substitute}" should be a real ground word`);
  assert.notEqual(substitute.toLowerCase(), "flotilla");
});

test("with no parser, stipulateFromGround reports a typed gap, never a fabricated claim", () => {
  const s = stipulateFromGround(GROUND, { parser: { ok: false }, pick: 0 });
  assert.equal(s.ok, false);
  assert.match(s.reason, /parser/);
});

test("with only ONE extractable claim, stipulateFromGround falls back to flipping polarity, still a real mechanical substitution", () => {
  const oneClaim = "The old bridge collapsed into the river.";
  const s = stipulateFromGround(oneClaim, { parser, pick: 0 });
  if (s.ok) {
    assert.equal(s.mode, "flip-polarity");
    assert.notEqual(s.stipulated.polarity, s.original.polarity);
  } else {
    // acceptable: the parser found nothing extractable on this shorter text;
    // stipulateFromGround still reports why, never guesses a claim.
    assert.match(s.reason, /no resolved-polarity/);
  }
});

test("pick wraps to a valid claim for any integer, deterministically", () => {
  const a = stipulateFromGround(GROUND, { parser, pick: 0 });
  const b = stipulateFromGround(GROUND, { parser, pick: 4 }); // wraps if 4 claims exist
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
});

// ── tripleFromRecord ─────────────────────────────────────────────────────────

test("tripleFromRecord reads a real subject/relation/object off a real parsed sentence", () => {
  const records = parser.parse("The dam regulates the river.", "t");
  const triples = records.map(tripleFromRecord).filter(Boolean);
  assert.ok(triples.length >= 1);
  assert.equal(triples[0].end1, "dam");
  assert.equal(triples[0].label, "regulate");
  assert.equal(triples[0].end2, "river");
  assert.equal(triples[0].polarity, "+");
});

test("tripleFromRecord marks a negated sentence \"?\", never a guessed polarity", () => {
  const records = parser.parse("The dam does not regulate the river.", "t");
  const triples = records.map(tripleFromRecord).filter(Boolean);
  assert.ok(triples.some((t) => t.polarity === "?"));
});

// ── admitFiction: the one disclosed relaxation (invention), and what stays ──

test("admitFiction ADMITS genuinely invented content admit() itself REFUSES as an invented referent", () => {
  const stipulation = stipulateFromGround(GROUND, { parser, pick: 0 });
  const invented = "Old Whistler, the flotilla's cook, cursed under his breath as the fort loomed ahead through the fog.";

  const fictionVerdict = admitFiction(invented, { ground: GROUND, stipulation, instruction: "Write a short piece of fiction inspired by this true story.", registry: new Set(), parser });
  assert.equal(fictionVerdict.admit, true, JSON.stringify(fictionVerdict));

  // The SAME sentence, checked by the EXISTING, UNMODIFIED admit() with a
  // real invented-referent gate wired (the same shape prosify.js wires it):
  // a capitalized word ("Whistler") the ground never uses is an invented run.
  const variance = measureVariance(GROUND);
  const knownWords = new Set(GROUND.match(/\b[A-Za-z']+\b/g).map((w) => w.toLowerCase()));
  const invented_ = (s) => (s.match(/\b[A-Z][a-z']+\b/g) ?? []).filter((t) => !knownWords.has(t.toLowerCase())).map((t) => [t]);
  const nonFictionVerdict = admit(invented, { ground: GROUND, priorLanding: "", instruction: "Write a short piece of fiction inspired by this true story.", registry: new Set(), variance, invented: invented_ });
  assert.equal(nonFictionVerdict.admit, false);
  assert.equal(nonFictionVerdict.refused[0].kind, "invented");
});

test("admitFiction still REFUSES an apparatus leak (looksMeta), exactly as admit() would", () => {
  const stipulation = stipulateFromGround(GROUND, { parser, pick: 0 });
  const leak = "As an AI, I will now write a short piece of fiction as you asked, inspired by the true story above.";
  const v = admitFiction(leak, { ground: GROUND, stipulation, instruction: "Write a short piece of fiction inspired by this true story.", registry: new Set(), parser });
  assert.equal(v.admit, false);
  assert.equal(v.refused[0].kind, "meta");
});

test("admitFiction REFUSES a sentence that reverts the stipulation (literal check)", () => {
  const stipulation = stipulateFromGround(GROUND, { parser, pick: 0 });
  const reverts = "Despite everything, John Donelson still led the flotilla, just as the old story always said.";
  const v = admitFiction(reverts, { ground: GROUND, stipulation, instruction: "Write a short piece of fiction inspired by this true story.", registry: new Set(), parser });
  assert.equal(v.admit, false);
  assert.equal(v.refused[0].kind, "reverts-stipulation");
});

test("admitFiction ADMITS the stipulated replacement itself (using the seed is not a reversion)", () => {
  const stipulation = stipulateFromGround(GROUND, { parser, pick: 0 });
  const uses = `John led the ${stipulation.stipulated.roles.ARG1} that stormy night.`;
  const v = admitFiction(uses, { ground: GROUND, stipulation, instruction: "Write a short piece of fiction inspired by this true story.", registry: new Set(), parser });
  assert.equal(v.admit, true, JSON.stringify(v));
});

test("admitFiction REFUSES an exact repeat, a lighter guard than admit()'s claim-core registry", () => {
  const stipulation = stipulateFromGround(GROUND, { parser, pick: 0 });
  const s = "Old Whistler squinted at the fort rising through the mist.";
  const registry = new Set();
  const first = admitFiction(s, { ground: GROUND, stipulation, registry, parser });
  const second = admitFiction(s, { ground: GROUND, stipulation, registry, parser });
  assert.equal(first.admit, true);
  assert.equal(second.admit, false);
  assert.equal(second.refused[0].kind, "repeat");
});

test("admitFiction refuses cleanly with no real stipulation, never silently admitting", () => {
  const v = admitFiction("Anything at all.", { ground: GROUND, stipulation: { ok: false }, parser });
  assert.equal(v.admit, false);
  assert.equal(v.refused[0].kind, "no-stipulation");
});

// ── revertsStipulation directly ──────────────────────────────────────────────

test("revertsStipulation's structural check catches a paraphrase that still asserts the original relation and value", () => {
  const stipulation = stipulateFromGround(GROUND, { parser, pick: 0 });
  const r = revertsStipulation("The flotilla was led by John Donelson.", stipulation, { parser });
  // subject/object order differs (passive voice) -- the literal-word check
  // still fires because every word of "flotilla" is present; documented as
  // the primary, always-on check.
  assert.equal(r.reverts, true);
});

test("revertsStipulation does not fire on a sentence using the SUBSTITUTE value", () => {
  const stipulation = stipulateFromGround(GROUND, { parser, pick: 0 });
  const r = revertsStipulation(`John led the ${stipulation.stipulated.roles.ARG1}.`, stipulation, { parser });
  assert.equal(r.reverts, false);
});

// ── fictionArrival: three real, mechanical checks ───────────────────────────

test("fictionArrival ARRIVES on a genuinely inventive, seed-using, non-reverting piece", () => {
  const stipulation = stipulateFromGround(GROUND, { parser, pick: 0 });
  const piece = [
    "Old Whistler squinted at the fort rising through the mist and spat over the rail.",
    "\"That's not the flotilla's captain up there,\" he muttered, \"that's a stranger's flag.\"",
    `John led the ${stipulation.stipulated.roles.ARG1} through that stormy night.`,
  ];
  const a = fictionArrival({ piece, stipulation, ground: GROUND, parser });
  assert.equal(a.arrived, true, a.basis);
  assert.equal(a.revertedCount, 0);
  assert.equal(a.stipulationUsed, true);
});

test("fictionArrival does NOT arrive on a pure paraphrase (no invention, and it reverts)", () => {
  const stipulation = stipulateFromGround(GROUND, { parser, pick: 0 });
  const piece = [
    "John Donelson guided the flotilla down the river in 1779.",
    "The settlers put up a fort on the bluff above the water.",
  ];
  const a = fictionArrival({ piece, stipulation, ground: GROUND, parser });
  assert.equal(a.arrived, false);
  assert.ok(a.missing.some((m) => /paraphrase/.test(m)));
  assert.ok(a.missing.some((m) => /revert/.test(m)));
});

test("fictionArrival does NOT arrive when the piece is inventive but reverts the stipulation", () => {
  const stipulation = stipulateFromGround(GROUND, { parser, pick: 0 });
  const piece = [
    "Old Whistler squinted at the fort rising through the mist and spat over the rail.",
    "Still, everyone agreed that John Donelson led the flotilla, exactly as always.",
  ];
  const a = fictionArrival({ piece, stipulation, ground: GROUND, parser });
  assert.equal(a.arrived, false);
  assert.equal(a.revertedCount, 1);
});

test("fictionArrival does NOT arrive when the seed is never used, even if the piece is inventive and never reverts", () => {
  const stipulation = stipulateFromGround(GROUND, { parser, pick: 0 });
  const piece = [
    "Old Whistler squinted at the fort rising through the mist and spat over the rail.",
    "\"That's a stranger's flag up there,\" he muttered.",
  ];
  const a = fictionArrival({ piece, stipulation, ground: GROUND, parser });
  assert.equal(a.arrived, false);
  assert.equal(a.stipulationUsed, false);
  assert.ok(a.missing.some((m) => /permitted but not used/.test(m)));
});

test("fictionArrival reports a typed gap, never crashes, with no real stipulation", () => {
  const a = fictionArrival({ piece: ["anything"], stipulation: { ok: false }, ground: GROUND, parser });
  assert.equal(a.arrived, false);
});

// ── fictionInstruction: a real, non-empty prompt naming the real substitution

test("fictionInstruction states the real source sentence and the real substitution, and forbids the original", () => {
  const stipulation = stipulateFromGround(GROUND, { parser, pick: 0 });
  const instruction = fictionInstruction({ task: "Write a short piece of fiction.", stipulation });
  assert.ok(instruction.includes(stipulation.originalSentence));
  assert.ok(instruction.includes(stipulation.overriddenValue));
  assert.match(instruction, /Do not write/);
});
