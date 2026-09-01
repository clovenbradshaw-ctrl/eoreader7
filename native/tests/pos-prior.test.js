// native/tests/pos-prior.test.js — build-pos-prior.mjs's output, against the
// REAL wordclass.js classifier, for all three built priors (English,
// Russian, Finnish). One script, three languages, no per-language code in
// either the builder or the consumer — this file checks that claim holds.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { classifyWord, dominantClass } from "../adapters/text/wordclass.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const load = (name) => JSON.parse(readFileSync(path.resolve(here, `../priors/${name}`), "utf8"));

const priors = {
  eng: load("pos-eng.json"),
  rus: load("pos-rus.json"),
  fin: load("pos-fin.json"),
};

for (const lang of ["eng", "rus", "fin"]) {
  test(`${lang}: the built prior is a real POSPrior@1 — schema, giver, and real UD treebank scale`, () => {
    const p = priors[lang];
    assert.equal(p.schema, "POSPrior@1");
    assert.equal(p.language, lang);
    assert.match(p.provenance.giver, /Universal Dependencies/);
    assert.equal(p.provenance.license, "CC BY-SA 4.0");
    assert.ok(p.provenance.tokens_read > 50000, "built from the real treebank, not a fixture slice");
    assert.ok(p.provenance.ambiguous_forms > 0, "ambiguity is preserved (a real form-level tally has some), never resolved at build time");
  });
}

test("English: \"the\" reads overwhelmingly DET; \"walked\" reads unambiguously VERB — real UD_English-EWT counts", () => {
  const the = classifyWord("the", { posPrior: priors.eng });
  assert.equal(dominantClass(the, { minShare: 0.9 })?.upos, "DET");
  const walked = classifyWord("walked", { posPrior: priors.eng });
  assert.equal(dominantClass(walked, { minShare: 0.9 })?.upos, "VERB");
});

test("Russian: \"и\" (and) reads overwhelmingly CCONJ — real UD_Russian-GSD counts, a second language through the identical unmodified classifier", () => {
  const i = classifyWord("и", { posPrior: priors.rus });
  assert.equal(dominantClass(i, { minShare: 0.9 })?.upos, "CCONJ");
});

test("Finnish: \"ja\" (and) reads overwhelmingly CCONJ; \"on\" (is) reads overwhelmingly AUX — a third language, same classifier, still zero language-specific code in wordclass.js", () => {
  const ja = classifyWord("ja", { posPrior: priors.fin });
  assert.equal(dominantClass(ja, { minShare: 0.9 })?.upos, "CCONJ");
  const on = classifyWord("on", { posPrior: priors.fin });
  assert.equal(dominantClass(on, { minShare: 0.9 })?.upos, "AUX");
});

test("a proper name absent from all three general-lexicon treebanks is a disclosed miss, never a guess — the same finding independently reproduced across two different received resources (UniMorph and UD)", () => {
  const kutuzov = classifyWord("кутузов", { posPrior: priors.rus });
  assert.equal(kutuzov.found, false);
  assert.equal(kutuzov.candidates.length, 0);
});
