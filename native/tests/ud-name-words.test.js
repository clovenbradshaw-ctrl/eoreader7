// ud-name-words.test.js — the gold the name-form audit is scored against, read from a treebank's own annotation (eval/lavar/lib/ud-name-words.mjs).
//
// The gold is where a score comes from, so a defect here is a defect in every number of sullivan-names-RESULTS.md that nothing downstream can see.
// Each case is a few lines of CoNLL-U in the shape of one real treebank's convention (English UD splits "Elena's" into two tokens, German UD keeps
// "Annas" as one token with its lemma, French UD splits the elided article off, Finnish UD's lemma does not begin the form).
import test from "node:test";
import assert from "node:assert/strict";
import { parseConllu } from "../kernel/eot-rich.js";
import { nameWords, rawWords, alignUnits, surfaceUnits, EXPONENT_UPOS } from "../eval/lavar/lib/ud-name-words.mjs";

/** conllu(text, ...rows) — one sentence; each row is [id, form, lemma, upos, feats?, misc?]. */
const conllu = (text, ...rows) => `# text = ${text}\n${rows.map(([id, form, lemma, upos, feats = "_", misc = "_"]) => [id, form, lemma, upos, "_", feats, "0", "dep", "_", misc].join("\t")).join("\n")}\n\n`;
const sentence = (text, ...rows) => parseConllu(conllu(text, ...rows))[0];
const pick = (r) => ({ word: r.word, stem: r.stem, suffix: r.suffix, prefix: r.prefix, klass: r.klass, prefixKlass: r.prefixKlass, via: r.via, other: r.other });

test("English: a possessive is a glued clitic token, its exponent is the written run after the stem, and its class is a clitic", () => {
  const s = sentence("Elena's dog barked.", [1, "Elena", "Elena", "PROPN", "_", "SpaceAfter=No"], [2, "'s", "'s", "PART"], [3, "dog", "dog", "NOUN"], [4, "barked", "bark", "VERB", "_", "SpaceAfter=No"], [5, ".", ".", "PUNCT"]);
  assert.deepEqual(nameWords(s).map(pick), [{ word: "Elena's", stem: "Elena", suffix: "'s", prefix: "", klass: "clitic", prefixKlass: null, via: "glued", other: false }]);
});

test("a multi-word-token range whose members spell its surface is read the same as two tokens (the written surface is what a reader meets)", () => {
  const text = "# text = Elena's dog\n1-2\tElena's\t_\t_\t_\t_\t_\t_\t_\t_\n1\tElena\tElena\tPROPN\t_\t_\t0\tdep\t_\t_\n2\t's\t's\tPART\t_\t_\t1\tdep\t_\t_\n3\tdog\tdog\tNOUN\t_\t_\t0\tdep\t_\t_\n\n";
  const s = parseConllu(text)[0];
  assert.equal(surfaceUnits(s)[0].range, true);
  assert.deepEqual(alignUnits(s).slice(0, 2).map((u) => [u.form, u.start, u.end]), [["Elena", 0, 5], ["'s", 5, 7]], "split into its members, each with a span of its own");
  assert.deepEqual(nameWords(s).map(pick), [{ word: "Elena's", stem: "Elena", suffix: "'s", prefix: "", klass: "clitic", prefixKlass: null, via: "glued", other: false }]);
});

test("German: a fused name token's exponent is its form minus its lemma, a case ending when the number is not plural", () => {
  const s = sentence("Annas Hund bellte.", [1, "Annas", "Anna", "PROPN", "Case=Gen"], [2, "Hund", "Hund", "NOUN"], [3, "bellte", "bellen", "VERB", "_", "SpaceAfter=No"], [4, ".", ".", "PUNCT"]);
  assert.deepEqual(nameWords(s).map(pick), [{ word: "Annas", stem: "Annas", suffix: "s", prefix: "", klass: "case", prefixKlass: null, via: "fused", other: false }]);
});

test("a plural of a name is a group: its exponent is read and its class is NOT one that keeps the referent", () => {
  const s = sentence("Die Smiths kamen.", [1, "Die", "der", "DET"], [2, "Smiths", "Smith", "PROPN", "Number=Plur"], [3, "kamen", "kommen", "VERB", "_", "SpaceAfter=No"], [4, ".", ".", "PUNCT"]);
  const [r] = nameWords(s);
  assert.deepEqual([r.suffix, r.klass], ["s", "number"]);
});

test("French: an elided article glued to the name is a prefix exponent, and a clitic", () => {
  const s = sentence("Il aime l'Allemagne.", [1, "Il", "il", "PRON"], [2, "aime", "aimer", "VERB"], [3, "l'", "le", "DET", "_", "SpaceAfter=No"], [4, "Allemagne", "Allemagne", "PROPN", "_", "SpaceAfter=No"], [5, ".", ".", "PUNCT"]);
  assert.deepEqual(nameWords(s).map(pick), [{ word: "l'Allemagne", stem: "Allemagne", suffix: "", prefix: "l'", klass: null, prefixKlass: "clitic", via: "glued", other: false }]);
});

test("Finnish: a lemma that does not begin the form is inflection a suffix cannot explain — counted as `other`, never forced into a label", () => {
  const s = sentence("Helsingissä sataa.", [1, "Helsingissä", "Helsinki", "PROPN", "Case=Ine"], [2, "sataa", "sataa", "VERB", "_", "SpaceAfter=No"], [3, ".", ".", "PUNCT"]);
  const [r] = nameWords(s);
  assert.deepEqual([r.other, r.via, r.suffix], [true, "fused", ""]);
});

test("what is glued to a name is an exponent only if the treebank classes it as a function word: a number is part of what was written, and the word is not read", () => {
  const s = sentence("EB1774 arrived.", [1, "EB", "EB", "PROPN", "_", "SpaceAfter=No"], [2, "1774", "1774", "NUM"], [3, "arrived", "arrive", "VERB", "_", "SpaceAfter=No"], [4, ".", ".", "PUNCT"]);
  const [r] = nameWords(s);
  assert.equal(r.other, true);
  assert.equal(r.suffix, "");
  assert.equal(EXPONENT_UPOS.has("NUM"), false);
  for (const u of ["PART", "AUX", "ADP", "DET", "PRON", "CCONJ", "SCONJ"]) assert.ok(EXPONENT_UPOS.has(u), u);
});

test("punctuation ends a written word: a glued comma or quotation mark is not part of the name", () => {
  const s = sentence("\"Elena\", he said.", [1, "\"", "\"", "PUNCT", "_", "SpaceAfter=No"], [2, "Elena", "Elena", "PROPN", "_", "SpaceAfter=No"], [3, "\"", "\"", "PUNCT", "_", "SpaceAfter=No"], [4, ",", ",", "PUNCT"], [5, "he", "he", "PRON"], [6, "said", "say", "VERB", "_", "SpaceAfter=No"], [7, ".", ".", "PUNCT"]);
  assert.deepEqual(rawWords(s).map((w) => w.text), ["Elena", "he", "said"]);
  assert.deepEqual(nameWords(s).map((r) => [r.word, r.suffix, r.prefix]), [["Elena", "", ""]]);
});

test("a sentence whose tokens will not align to its own text is skipped and COUNTED by the caller, never guessed at", () => {
  const s = sentence("Something else entirely.", [1, "Elena", "Elena", "PROPN"], [2, "'s", "'s", "PART"]);
  assert.equal(alignUnits(s), null);
  assert.equal(rawWords(s), null);
  assert.equal(nameWords(s), null);
  assert.equal(nameWords({ text: "", tokens: [] }), null, "no text, nothing to align to");
});

test("a bare name with no mark is a row with no exponent — the label ∅ the tally counts", () => {
  const s = sentence("Anna barked.", [1, "Anna", "Anna", "PROPN"], [2, "barked", "bark", "VERB", "_", "SpaceAfter=No"], [3, ".", ".", "PUNCT"]);
  assert.deepEqual(nameWords(s).map(pick), [{ word: "Anna", stem: "Anna", suffix: "", prefix: "", klass: null, prefixKlass: null, via: "bare", other: false }]);
});
