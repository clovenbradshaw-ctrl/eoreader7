// name-forms.test.js — Sullivan's third sense: which marks on a written name leave its referent where it was (adapters/text/name-forms.js).
//
// The sense holds no language. Every behaviour below is a property of counting what a name's endings come with, so each case builds its tallies
// from rows and asserts what the count says — and, where the wall is the point, builds the control that would break it.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SCHEMA, NONE, PRESERVING, GAPS, foldWord, tallyForms, speak, decide, foldedStem, compile, ruleMap, stripWord,
  nameFormsFromPrior, nameFoldFromPrior, nameFormRoute,
} from "../adapters/text/name-forms.js";

const row = (word, suffix = "", klass = null, prefix = "", prefixKlass = null) => ({ word, suffix, klass: suffix ? klass : null, prefix, prefixKlass: prefix ? prefixKlass : null, other: false });
const many = (n, make) => Array.from({ length: n }, (_, i) => make(i));
const OP = { minShare: 0.8, minCount: 3, minStem: 1, maxK: 3, classes: PRESERVING };

// An English-shaped corpus: possessives with the apostrophe, plural possessives, names that end in s, plurals of names.
const english = () => [
  ...many(30, () => row("Anna's", "'s", "clitic")), ...many(12, () => row("Bob's", "'s", "clitic")),
  ...many(6, () => row("Jones'", "'", "clitic")),
  ...many(40, () => row("Thomas")), ...many(25, () => row("James")), ...many(20, () => row("Texas")), ...many(15, () => row("Anna")),
  ...many(9, () => row("Iraqis", "s", "number")), ...many(7, () => row("Marines", "s", "number")),
];

test("tallyForms counts what each ending and beginning comes with; a word's own length bounds its keys; an unreadable row is not a row", () => {
  const t = tallyForms([...english(), { word: "Mc.Donalds", other: true }], { maxK: 3 });
  assert.equal(t.words, english().length, "the `other` row is not counted");
  assert.deepEqual([...t.suffix.get("'s")], [["'s|clitic", 42]]);
  assert.deepEqual(Object.fromEntries(t.suffix.get("s")), { "'s|clitic": 42, [NONE]: 85, "s|number": 16 }, "the bare ending s: 42 possessives, 85 names that end in s (Thomas 40, James 25, Texas 20), 16 plurals");
  assert.deepEqual(Object.fromEntries(t.prefix.get("a")), { [NONE]: 45 }, "the beginning a: Anna's 30 and Anna 15, none with a mark in front");
  // a one-letter word has no word-internal key (a key must be shorter than the word), a two-letter word only k=1
  const small = tallyForms([row("Li"), row("A")], { maxK: 3 });
  assert.ok(small.suffix.has("i") && !small.suffix.has("li"), "a key is strictly shorter than its word");
  assert.equal(small.suffix.has("a"), false);
});

test("the tally folds the apostrophe glyphs and case before counting, as the asking does", () => {
  const t = tallyForms([row("Anna’s", "’s", "clitic"), row("ANNA'S", "'S", "clitic"), row("Anna's", "'s", "clitic")], { maxK: 2 });
  assert.deepEqual([...t.suffix.get("'s")], [["'s|clitic", 3]], "U+2019, an upper-case S and U+0027 are one ending with one label");
  assert.equal(foldWord("Bush’s"), "bush's");
});

test("speak: a distribution speaks only above the caller's floors; a leave-alone and an out-of-class strip are both 'none'", () => {
  const t = tallyForms(english(), { maxK: 3 });
  assert.equal(speak(t.suffix.get("'s"), { ...OP, minCount: 50 }), null, "42 observations do not clear a floor of 50");
  const strip = speak(t.suffix.get("'s"), OP);
  assert.deepEqual([strip.kind, strip.exponent, strip.klass], ["strip", "'s", "clitic"]);
  assert.equal(speak(t.suffix.get("as"), OP).kind, "none", "Thomas, James and Texas end in -as with nothing to remove");
  // a plural of a name is a group: its exponent is learned and then NOT acted on, because its class does not keep the referent
  const plural = tallyForms(many(20, () => row("Iraqis", "s", "number")), { maxK: 3 });
  const v = speak(plural.suffix.get("qis"), OP);
  assert.deepEqual([v.kind, v.why, v.klass], ["none", "class", "number"]);
  // minShare: a 60/40 split does not speak at 0.8 and does at 0.5
  const split = tallyForms([...many(6, () => row("Merkels", "s", "case")), ...many(4, () => row("Merkels"))], { maxK: 2 });
  assert.equal(speak(split.suffix.get("ls"), OP), null);
  assert.equal(speak(split.suffix.get("ls"), { ...OP, minShare: 0.5 }).kind, "strip");
});

test("decide: the LONGEST ending that speaks answers, and an ending that says leave-alone outranks a shorter one that says strip", () => {
  // German-shaped: -s is a genitive on most names ending in l, and a part of the name in -as / -es / -us
  const rows = [
    ...many(20, () => row("Merkels", "s", "case")), ...many(15, () => row("Kohls", "s", "case")),
    ...many(25, () => row("Thomas")), ...many(25, () => row("Hans")), ...many(10, () => row("Jesus")),
  ];
  const t = tallyForms(rows, { maxK: 3 });
  const op = { ...OP, minShare: 0.6 };
  const bare = speak(t.suffix.get("s"), op);
  assert.deepEqual([bare.kind, bare.n], ["none", 95], "the bare ending s speaks at 0.6 — 60 of 95 leave the s alone — and says leave alone");
  assert.equal(speak(t.suffix.get("s"), { ...op, minShare: 0.7 }), null, "…and does not speak at 0.7");
  const merkels = decide(t.suffix, "Merkels", "suffix", op);
  assert.deepEqual([merkels.stem, merkels.exponent, merkels.ending], ["merkel", "s", "els"], "a longer ending (-els: every one of its 20 words carries the genitive) outranks the bare ending that says leave alone");
  const thomas = decide(t.suffix, "Thomas", "suffix", op);
  assert.deepEqual([thomas.stem, thomas.exponent], ["thomas", ""], "leave alone: the name's own final letter");
  const stranger = decide(t.suffix, "Zzzz", "suffix", op);
  assert.equal(stranger.silent, true, "no ending speaks: SILENCE, not a guess");
  assert.equal(stranger.stem, "zzzz");

  // the other direction, the one the header names: the bare ending says STRIP (90 of 100), a longer ending says leave alone, and the longer wins.
  // Skipping a leave-alone and falling through to the shorter strip is the mutation this fixture exists to kill.
  const strong = tallyForms([...many(60, () => row("Merkels", "s", "case")), ...many(30, () => row("Kohls", "s", "case")), ...many(10, () => row("Thomas"))], { maxK: 3 });
  assert.equal(speak(strong.suffix.get("s"), OP).kind, "strip", "the bare ending s strips: 90 of 100 carry the genitive");
  const keeps = decide(strong.suffix, "Thomas", "suffix", OP);
  assert.deepEqual([keeps.stem, keeps.exponent, keeps.ending], ["thomas", "", "mas"], "the longer ending that says leave alone outranks the bare ending that says strip");
  assert.deepEqual(decide(strong.suffix, "Merkels", "suffix", OP).stem, "merkel", "and a word no leave-alone reaches still takes the strip");
  assert.deepEqual(decide(strong.suffix, "Zeus", "suffix", OP).stem, "zeu", "an unseen word under the bare ending takes the bare ending's verdict: the table speaks where it has evidence and the evidence is the ending alone");
});

test("the stem floor: a stem below minStem is left whole, and the floor is the caller's number", () => {
  const t = tallyForms(many(20, () => row("Li's", "'s", "clitic")).concat(many(20, () => row("Wu's", "'s", "clitic"))), { maxK: 2 });
  assert.equal(foldedStem("Li's", t, { ...OP, minStem: 3 }), "li's");
  assert.equal(foldedStem("Li's", t, { ...OP, minStem: 2 }), "li");
  assert.equal(foldedStem("Li's", t, { ...OP, minStem: 1 }), "li");
});

test("the beginning of a name is learned the same way: an elided article comes off the front", () => {
  const rows = [...many(30, () => row("l'Allemagne", "", null, "l'", "clitic")), ...many(20, () => row("d'Alsace", "", null, "d'", "clitic")), ...many(40, () => row("Allemagne")), ...many(15, () => row("Dalmatie")), ...many(15, () => row("Lyon"))];
  const t = tallyForms(rows, { maxK: 3 });
  assert.equal(foldedStem("l'Allemagne", t, OP), "allemagne");
  assert.equal(foldedStem("d'Alsace", t, OP), "alsace");
  assert.equal(foldedStem("Dalmatie", t, OP), "dalmatie", "'d' alone is not the elision: the apostrophe is part of the evidence");
  assert.equal(foldedStem("Lyon", t, OP), "lyon");
});

test("compile: the stored rule lists answer every word exactly as the full tables do, at every operating point, including one tallied wider than it reads", () => {
  const rows = [...english(), ...many(20, () => row("Merkels", "s", "case")), ...many(15, () => row("Kohls", "s", "case")), ...many(20, () => row("l'Allemagne", "", null, "l'", "clitic"))];
  const t = tallyForms(rows, { maxK: 4 });
  const words = ["Anna's", "Jones'", "Thomas", "Iraqis", "Merkels", "Kohls", "Kohl", "l'Allemagne", "Allemagne", "Li's", "Hans", "Zzz", "x's"];
  for (const minShare of [0.5, 0.8, 0.95]) for (const minCount of [2, 5, 20]) for (const maxK of [1, 2, 3, 4]) for (const minStem of [1, 2]) {
    const op = { minShare, minCount, minStem, maxK, classes: PRESERVING };
    const rules = compile(t, op);
    const compiled = { suffix: ruleMap(rules.suffix), prefix: ruleMap(rules.prefix) };
    for (const w of words) assert.equal(foldedStem(w, compiled, op), foldedStem(w, t, op), `${w} at ${JSON.stringify({ minShare, minCount, maxK, minStem })}`);
    for (const r of [...rules.suffix, ...rules.prefix]) assert.ok(Array.from(r.ending).length <= maxK, `a rule longer than maxK (${r.ending}) is not a rule`);
  }
});

test("compile keeps only rules that change an answer: a rule that repeats its parent is dropped, a leave-alone with nothing to override is dropped", () => {
  const t = tallyForms(english(), { maxK: 4 });
  const rules = compile(t, OP);
  const endings = rules.suffix.map((r) => r.ending);
  assert.ok(endings.includes("'s") && !endings.includes("na's"), "the longer ending that says the same thing as `'s` adds nothing");
  assert.ok(rules.suffix.every((r) => r.kind === "strip" || endings.some((e) => e.length < r.ending.length && r.ending.endsWith(e))), "every leave-alone overrides a shorter strip");
});

test("stripWord cuts the ORIGINAL characters: case and apostrophe style survive, and a length-changing lower-casing cannot cut the wrong place", () => {
  const prior = nameFormsFromPrior(priorFrom(tallyForms(english(), { maxK: 3 }), OP));
  assert.equal(stripWord("ANNA’S", prior).stem, "ANNA");
  assert.equal(stripWord("Bush’s", prior).stem, "Bush");
  assert.equal(stripWord("Jones’", prior).stem, "Jones");
  // U+0130 lower-cases to two code points; the cut is made on the original's own tail, so the stem is still the original's
  assert.equal(stripWord("İstanbul’s", prior).stem, "İstanbul");
  assert.equal(stripWord("Thomas", prior).stem, "Thomas");
  assert.equal(stripWord("Iraqis", prior).stem, "Iraqis", "a plural is a group and is not stripped");
  // never to nothing
  assert.equal(stripWord("’s", prior).stem, "’s");
});

test("the stem floor is the consumer's: a numeral below it is licensed by the caller's own test, and only by it", () => {
  const prior = nameFormsFromPrior(priorFrom(tallyForms(english(), { maxK: 3 }), { ...OP, minStem: 1 }));
  const isNumeral = (t) => /^[IVX]+$/.test(t);
  assert.equal(stripWord("P's", prior, { minStem: 2 }).stem, "P's", "a one-letter stem stays as written (the idiom 'P's and Q's')");
  assert.equal(stripWord("I's", prior, { minStem: 2, isNumeral }).stem, "I", "…unless the caller says the stem is a numeral that indexes the name");
  assert.equal(stripWord("Li's", prior, { minStem: 2 }).stem, "Li");
});

test("nameFoldFromPrior reads the LAST word's end and the FIRST word's beginning; nothing inside a name is touched, and whitespace is kept", () => {
  const rows = [...english(), ...many(30, () => row("l'Allemagne", "", null, "l'", "clitic")), ...many(30, () => row("Allemagne"))];
  const fold = nameFoldFromPrior(nameFormsFromPrior(priorFrom(tallyForms(rows, { maxK: 3 }), OP)));
  assert.equal(fold("Elizabeth Hart's"), "Elizabeth Hart");
  assert.equal(fold("Dante's Inferno"), "Dante's Inferno", "a mark inside a name is part of how that name is written: folding it joined Dante to Dante's Inferno");
  assert.equal(fold("l'Allemagne"), "Allemagne");
  assert.equal(fold("Le Pen's"), "Le Pen");
  assert.equal(fold("the  King of England's"), "the  King of England", "double spaces are kept exactly");
  assert.equal(fold("  "), "  ");
  assert.equal(fold(""), "");
});

test("a prior is refused unless it names its giver, period, region, register, script, license and source with their basis, its language, and its measured operating point", () => {
  const good = priorFrom(tallyForms(english(), { maxK: 3 }), OP);
  assert.doesNotThrow(() => nameFormsFromPrior(good));
  assert.throws(() => nameFormsFromPrior({ ...good, schema: "Other@1" }), /unknown schema/);
  for (const k of ["giver", "period", "region", "register", "script", "license", "source"]) {
    const bad = { ...good, provenance: { ...good.provenance, [k]: undefined } };
    assert.throws(() => nameFormsFromPrior(bad), new RegExp(`name its ${k}`), `without a ${k}`);
  }
  assert.throws(() => nameFormsFromPrior({ ...good, provenance: { ...good.provenance, giver: { value: "someone", basis: "because I said so" } } }), /basis/);
  assert.throws(() => nameFormsFromPrior({ ...good, language: { name: "English" } }), /language/);
  assert.throws(() => nameFormsFromPrior({ ...good, operatingPoint: { minShare: 0.8 } }), /operating point/);
  assert.throws(() => nameFormsFromPrior({ ...good, operatingPoint: { ...good.operatingPoint, heldOut: { dev: {} } } }), /held-out/);
});

test("nameFormRoute: no prior, another language's prior and a refused prior are each a typed gap with no fold; the route accepts the language's own codes", () => {
  const good = priorFrom(tallyForms(english(), { maxK: 3 }), OP);
  assert.equal(nameFormRoute({ language: "eng", prior: null }).gap.type, GAPS.NO_PRIOR);
  assert.equal(nameFormRoute({ language: "deu", prior: good }).gap.type, GAPS.OTHER_LANGUAGE);
  assert.equal(nameFormRoute({ language: "eng", prior: { ...good, schema: "x" } }).gap.type, GAPS.BAD_PRIOR);
  for (const l of ["eng", "en", "ENG"]) { const r = nameFormRoute({ language: l, prior: good }); assert.equal(r.gap, null, l); assert.equal(typeof r.fold, "function"); }
  const declined = nameFormRoute({ language: "deu", prior: good });
  assert.equal(declined.fold, null, "a declined route is no fold at all — the index's own byte-identical default");
});

test("CONTROL BUILT TO FAIL — the same rows with their labels shuffled across words teach nothing: no rule speaks, and nothing is stripped", () => {
  const rows = english();
  const labels = rows.map((r) => ({ suffix: r.suffix, klass: r.klass }));
  // a deterministic permutation that pairs words with other words' labels (a stride coprime to the length)
  const stride = 37;
  const shuffled = rows.map((r, i) => ({ ...r, ...labels[(i * stride + 11) % rows.length] }));
  const real = compile(tallyForms(rows, { maxK: 3 }), OP);
  const fake = compile(tallyForms(shuffled, { maxK: 3 }), OP);
  assert.ok(real.suffix.some((r) => r.kind === "strip"), "the real labels teach a strip rule");
  assert.equal(fake.suffix.filter((r) => r.kind === "strip").length, 0, "shuffled labels teach none: an ending's label is then the corpus's marginal, which is mostly 'nothing to remove'");
});

test("the shipped English and French priors load, name their giver and their source file's hash, and fold the way the audit measured", () => {
  const load = (iso) => JSON.parse(readFileSync(new URL(`../priors/name-forms-${iso}.json`, import.meta.url), "utf8"));
  const eng = nameFormRoute({ language: "eng", prior: load("eng") });
  const fra = nameFormRoute({ language: "fr", prior: load("fra") });
  assert.equal(eng.gap, null);
  assert.equal(fra.gap, null);
  assert.match(eng.prior.provenance.source.value, /sha256 [0-9a-f]{64}/, "the prior names the exact bytes it learned from");
  assert.equal(eng.prior.provenance.license.value, "CC BY-SA 4.0");
  assert.ok(eng.prior.operatingPoint.heldOut.test.A >= 0.9 && eng.prior.operatingPoint.heldOut.test.issued >= 30, "it carries the held-out score that licensed it");
  for (const [n, want] of [["Anna's", "Anna"], ["Anna’s", "Anna"], ["Jones'", "Jones"], ["Thomas", "Thomas"], ["Bush’s", "Bush"], ["Elizabeth Hart's", "Elizabeth Hart"], ["Dante's Inferno", "Dante's Inferno"], ["Iraqis", "Iraqis"], ["O'Brien", "O'Brien"]]) assert.equal(eng.fold(n), want, n);
  for (const [n, want] of [["l'Allemagne", "Allemagne"], ["d'Alsace", "Alsace"], ["qu'Anna", "Anna"], ["Allemagne", "Allemagne"], ["de Gaulle", "de Gaulle"], ["la Seine", "la Seine"]]) assert.equal(fra.fold(n), want, n);
  assert.equal(fra.fold("Anna's"), "Anna's", "a language's prior does not fold another's marks: the English clitic is not French");
});

/** A NameFormPrior@1 around some tallies — what the driver writes, with the provenance a test can name. */
function priorFrom(tables, op) {
  const rules = compile(tables, op);
  const d = (value, basis = "declared from the treebank's documentation") => ({ value, basis });
  return {
    schema: SCHEMA, language: { iso: "eng", bcp47: "en", name: "English", stage: "test" },
    provenance: { giver: d("a test corpus"), period: d("none"), region: d("none"), register: d("none"), script: d("Latin", "measured from the file"), license: d("test"), source: d("built in the test", "measured from the file") },
    operatingPoint: { ...op, heldOut: { dev: { H: 1 }, test: { H: 1 } } },
    explains: null, suffixRules: rules.suffix, prefixRules: rules.prefix,
  };
}
