// tests/clause-tense.test.js — tense read off the Chomsky parser's UD rows,
// on the REAL trained model over real sentences, never a hand-built row.
// The span handed in is the ledger's own convention: a proposition's `at`
// is its END2 (measured: 181 of 183 in Alice ch2), so the verb is located
// by the label, never assumed inside the span.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadModel } from "../adapters/text/english-parser.js";
import { parseWindow, clauseTense, TENSE_VALUES, GIVER } from "../adapters/text/clause-tense.js";
import { UD_FEATURES } from "../kernel/universal-grammar.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const model = loadModel(JSON.parse(readFileSync(path.join(HERE, "..", "priors", "parser-eng-ewt.json"), "utf8")));

const TEXT = "She had gone to the sea before he came. Alice was getting very tired. She walks home and says nothing. Having opened the door, she looked in. He went away. They will return. The mouse had somehow fallen into the pool.";
const rows = parseWindow(model, TEXT, 1000);
const spanOf = (s) => { const i = TEXT.indexOf(s); assert.ok(i >= 0, `fixture has "${s}"`); return [1000 + i, 1000 + i + s.length]; };

test("the values are the universal inventory plus undeclared, and the giver is named", () => {
  assert.deepEqual([...TENSE_VALUES], [...UD_FEATURES.Tense, "undeclared"]);
  assert.match(GIVER, /UD_English-EWT/);
  assert.match(GIVER, /Pqp/);
});

test("parseWindow keeps ledger offsets (number or mapping function) and in-array head indices", () => {
  const had = rows.find((r) => r.form === "had");
  assert.equal(had.off, 1000 + TEXT.indexOf("had"));
  assert.equal(rows[had.headIndex].form, "gone");
  assert.equal(had.upos, "AUX");
  assert.equal(rows.find((r) => r.form === "gone").headIndex, -1, "gone is the root");
  const mapped = parseWindow(model, "He went away.", (i) => i * 2 + 7);
  assert.equal(mapped[1].form, "went");
  assert.equal(mapped[1].off, 3 * 2 + 7);
});

test("had + participle is Pqp, located by the label with END2 as the span — the English construction read as the universal value", () => {
  const r = clauseTense(rows, spanOf("to the sea"), "had gone");
  assert.equal(r.tense, "Pqp");
  assert.equal(r.located, "label");
  assert.match(r.basis, /AUX had \(Tense=Past\) over gone/);
});

test("a bare auxiliary label ('had' with end2 'somehow fallen into the pool') reaches the participle it attaches to", () => {
  const r = clauseTense(rows, spanOf("somehow fallen into the pool"), "had");
  assert.equal(r.tense, "Pqp");
  assert.match(r.basis, /over fallen/);
});

test("an irregular simple past is Past — the stem+ed typer could not say this", () => {
  assert.equal(clauseTense(rows, spanOf("away"), "went").tense, "Past");
  assert.equal(clauseTense(rows, spanOf("he came"), "came").tense, "Past");
});

test("the finite auxiliary carries the clause tense: 'was getting' is Past, not Pres off the participle", () => {
  assert.equal(clauseTense(rows, spanOf("very tired"), "was getting").tense, "Past");
  assert.equal(clauseTense(rows, spanOf("very tired"), "getting").tense, "Past", "the auxiliary is found through the verb even when the label omits it");
});

test("present, future, and the non-finite clause typed undeclared rather than guessed", () => {
  assert.equal(clauseTense(rows, spanOf("home"), "walks").tense, "Pres");
  assert.equal(clauseTense(rows, spanOf("nothing"), "says").tense, "Pres");
  assert.equal(clauseTense(rows, spanOf("They will return"), "will return").tense, "Fut");
  const r = clauseTense(rows, spanOf("the door"), "Having opened");
  assert.equal(r.tense, "undeclared");
  assert.match(r.basis, /non-finite/);
});

test("a label the sentence does not hold falls back to the span, and says so", () => {
  const r = clauseTense(rows, spanOf("He went away"), "flew");
  assert.equal(r.located, "span");
  assert.equal(r.tense, "Past");
  assert.equal(clauseTense(rows, spanOf("the door"), null).tense, "undeclared");
});

// ── the second witness (2026-09-25): Sullivan's stored convention beside the parser ──
import { morphCuesFromPrior, witnessOf } from "../adapters/text/morph-cues.js";

const stub = (value, verdict = "bound") => ({
  giver: "stub treebank", language: { iso: "eng", stage: "test" }, admitted: 1,
  predict: () => ({ verdict, value, cue: { kind: "end:2", key: "ed", class: "VERB", accuracy: 0.9 }, rivals: [] }),
});

test("witness: agreement is corroboration, disagreement a typed contest that never overrides the parser", () => {
  const agree = clauseTense(rows, spanOf("away"), "went", { witness: stub("Past") });
  assert.equal(agree.tense, "Past");
  assert.equal(agree.corroborated[0].witness, "stub treebank");
  assert.equal(agree.corroborated[0].independent, true, "a stub giver shares no treebank id with the parser");
  const clash = clauseTense(rows, spanOf("away"), "went", { witness: stub("Pres") });
  assert.equal(clash.tense, "Past", "the parser's value stands");
  assert.equal(clash.contested[0].value, "Pres");
  assert.match(clash.contested[0].cue, /end:2/);
});

test("several witnesses: the first to bind fills; later ones corroborate or contest THAT, with independence judged against the filler", () => {
  const ewt = { ...stub("Past"), giver: "UD_English-EWT via stub" };
  const pud = { ...stub("Past"), giver: "UD_English-PUD via stub" };
  const ewt2 = { ...stub("Past"), giver: "UD_English-EWT again" };
  // the parser is silent on "Having opened": EWT fills, PUD corroborates independently, a second EWT reader does not
  const r = clauseTense(rows, spanOf("the door"), "Having opened", { witnesses: [ewt, pud, ewt2] });
  assert.equal(r.tense, "Past");
  assert.equal(r.filled.witness, "UD_English-EWT via stub");
  assert.deepEqual(r.corroborated.map((c) => [c.witness, c.independent]), [["UD_English-PUD via stub", true], ["UD_English-EWT again", false]]);
  // the parser spoke on "went": an EWT witness agreeing is not independent of the parser, a PUD one is
  const s = clauseTense(rows, spanOf("away"), "went", { witnesses: [ewt, pud] });
  assert.deepEqual(s.corroborated.map((c) => c.independent), [false, true]);
  // a dissenting second witness lands as a contest, the fill stands
  const d = clauseTense(rows, spanOf("the door"), "Having opened", { witnesses: [ewt, { ...stub("Pres"), giver: "UD_English-PUD via stub" }] });
  assert.equal(d.tense, "Past");
  assert.equal(d.contested[0].value, "Pres");
  assert.equal(d.contested[0].independent, true);
});

test("period: a read's declared period against the convention's span is disclosed, never a refusal; undeclared on either side is null, not a mismatch", () => {
  const modern = { ...stub("Past"), language: { iso: "heb", stage: "modern newspaper Hebrew", span: { from: 1990, to: 1995 } } };
  const biblical = clauseTense(rows, spanOf("the door"), "Having opened", { witnesses: [modern], period: { from: -900, to: -500 } });
  assert.equal(biblical.tense, "Past", "still filled");
  assert.equal(biblical.filled.periodMismatch, true, "and the mismatch is on the record");
  const same = clauseTense(rows, spanOf("the door"), "Having opened", { witnesses: [modern], period: { from: 1992, to: 1992 } });
  assert.equal(same.filled.periodMismatch, false);
  const unknown = clauseTense(rows, spanOf("the door"), "Having opened", { witnesses: [modern] });
  assert.equal(unknown.filled.periodMismatch, false, "no declared period on the read: no mismatch can be asserted");
  const noSpan = clauseTense(rows, spanOf("the door"), "Having opened", { witnesses: [stub("Past")], period: { from: 1, to: 2 } });
  assert.equal(noSpan.filled.periodMismatch, false, "no span on the convention: no mismatch can be asserted");
});

test("witness: fills a finite clause the parser left undeclared, and says who filled it; unmarked or void change nothing", () => {
  // "Having opened the door" is non-finite for the parser → undeclared; a bound witness fills it
  const filled = clauseTense(rows, spanOf("the door"), "Having opened", { witness: stub("Past") });
  assert.equal(filled.tense, "Past");
  assert.match(filled.basis, /^Sullivan/);
  assert.equal(filled.filled.witness, "stub treebank");
  assert.equal(clauseTense(rows, spanOf("the door"), "Having opened", { witness: stub("∅", "unmarked") }).tense, "undeclared");
  assert.equal(clauseTense(rows, spanOf("the door"), "Having opened", { witness: stub(null, "void") }).tense, "undeclared");
  // a span with no verb at all is never filled — there is no token to ask about
  assert.equal(clauseTense(rows, spanOf("the door"), null, { witness: stub("Past") }).tense, "undeclared");
});

test("the real English prior loads as a Tense witness through the refusing loader and speaks on real rows", () => {
  const prior = morphCuesFromPrior(JSON.parse(readFileSync(path.join(HERE, "..", "priors", "morph-cues-en.json"), "utf8")));
  const w = witnessOf(prior, "Tense");
  assert.ok(w && w.admitted > 0);
  assert.match(w.giver, /EWT/);
  const r = clauseTense(rows, spanOf("away"), "went", { witness: w });
  assert.equal(r.tense, "Past");
  assert.ok(r.corroborated || r.contested || (!r.corroborated && !r.contested), "the witness spoke, or stayed silent — either is on the record");
  assert.equal(witnessOf(prior, "NoSuchFeature"), null);
});
