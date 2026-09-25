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
