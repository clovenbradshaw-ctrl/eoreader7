// name-forms-eval.test.js — the instruments the name-form audit measures with (eval/lavar/lib/name-forms-eval.mjs).
//
// A score is only as good as the code that computes it, and these functions sit between a treebank and every table of sullivan-names-RESULTS.md.
// Each case builds a few rows or types whose right answer is known by construction, and — where a wall is the point — the control that breaks it.
import test from "node:test";
import assert from "node:assert/strict";
import { goldTypes, explainRows, scoreWith, scoreAt, fitnessOf, finalSScore, typedRoutePredict, typedRouteScore, shuffledTables, compileCheck, errorsAt, pairedOutcomes } from "../eval/lavar/lib/name-forms-eval.mjs";
import { tallyForms, compile, PRESERVING } from "../adapters/text/name-forms.js";

const row = (word, suffix = "", klass = null, prefix = "", prefixKlass = null) => ({ word, suffix, klass: suffix ? klass : null, prefix, prefixKlass: prefix ? prefixKlass : null, other: false });
const many = (n, make) => Array.from({ length: n }, (_, i) => make(i));
const OP = { minShare: 0.8, minCount: 3, minStem: 1, maxK: 3, classes: PRESERVING };

test("goldTypes: a type is a distinct folded written form; the gold stem is the form minus a PRESERVING exponent, and a plural's gold is to leave it alone", () => {
  const { types, dropped, tokens } = goldTypes([
    row("Anna's", "'s", "clitic"), row("ANNA'S", "'S", "clitic"), row("Anna’s", "’s", "clitic"),
    row("Smiths", "s", "number"), row("Thomas"), row("Thomas"), { word: "Mc.Donalds", other: true },
  ]);
  assert.equal(tokens, 6, "the unreadable row is not a token");
  const by = Object.fromEntries(types.map((t) => [t.folded, t]));
  assert.deepEqual(Object.keys(by).sort(), ["anna's", "smiths", "thomas"], "case and the apostrophe glyph fold before types are counted");
  assert.deepEqual([by["anna's"].goldStem, by["anna's"].count], ["anna", 3]);
  assert.equal(by.smiths.goldStem, "smiths", "a plural keeps its s: a group is not its member");
  assert.equal(by.thomas.goldStem, "thomas");
  assert.deepEqual(dropped, { ambiguous: 0, unreadable: 0 });
});

test("goldTypes drops, and counts, a type whose tokens split evenly between two golds, and one whose exponent does not stand where the annotation says", () => {
  const split = goldTypes([row("Annas", "s", "case"), row("Annas")]);
  assert.deepEqual([split.types.length, split.dropped.ambiguous], [0, 1], "one token each way: no majority, so no gold");
  const majority = goldTypes([row("Annas", "s", "case"), row("Annas", "s", "case"), row("Annas")]);
  assert.deepEqual(majority.types.map((t) => t.goldStem), ["anna"], "two against one: the majority is the gold");
  const unreadable = goldTypes([row("Anna", "s", "case")]);
  assert.deepEqual([unreadable.types.length, unreadable.dropped.unreadable], [0, 1], "an exponent the word does not end with cannot be cut");
});

test("scoreWith: agreement, coverage and their harmonic mean, with false strips and wrong strips kept apart, and a null where nothing is defined", () => {
  const types = [
    { folded: "annas", goldStem: "anna" }, { folded: "thomas", goldStem: "thomas" }, { folded: "jones'", goldStem: "jones" }, { folded: "carlos", goldStem: "carlo" },
  ];
  // strips a final s everywhere and does nothing to an apostrophe; carlos → "carlo" is right, annas → "anna" is right, thomas → "thoma" is a false strip
  const r = scoreWith(types, (w) => (w.endsWith("s") ? w.slice(0, -1) : w));
  assert.deepEqual([r.issued, r.correct, r.gold, r.falseStrips, r.wrongStrips], [3, 2, 3, 1, 0]);
  assert.ok(Math.abs(r.A - 2 / 3) < 1e-12 && Math.abs(r.C - 2 / 3) < 1e-12 && Math.abs(r.H - 2 / 3) < 1e-12);
  const wrong = scoreWith([{ folded: "annas", goldStem: "anna" }], () => "ann");
  assert.deepEqual([wrong.wrongStrips, wrong.falseStrips, wrong.correct], [1, 0, 0], "changed, but not to the gold, where the gold changes it: a wrong strip, not a false one");
  const silent = scoreWith(types, (w) => w);
  assert.deepEqual([silent.A, silent.C, silent.H], [null, 0, 0], "nothing issued: agreement is not 0, it is undefined; the harmonic mean of a prior that recovers nothing is 0");
  const nothingToDo = scoreWith([{ folded: "thomas", goldStem: "thomas" }], (w) => w);
  assert.deepEqual([nothingToDo.C, nothingToDo.H], [null, null], "no gold change to recover: coverage and H are undefined, never 0 standing in for not measured");
});

test("fitnessOf turns an undefined H into 0 for the colony, and scoreAt reads the tables at an operating point", () => {
  const rows = [...many(40, () => row("Anna's", "'s", "clitic")), ...many(30, () => row("Thomas"))];
  const tables = tallyForms(rows, { maxK: 3 });
  const types = goldTypes(rows).types;
  const at = scoreAt(types, tables, OP);
  assert.equal(at.H, 1);
  assert.equal(fitnessOf(types, tables)({ ...OP }).f, 1);
  const strict = fitnessOf(types, tables)({ ...OP, minCount: 50 });
  assert.equal(strict.f, 0, "a point at which nothing speaks scores nothing");
  assert.equal(fitnessOf(goldTypes([row("Thomas")]).types, tables)({ ...OP }).f, 0, "no gold change in the split: the fitness is 0, not an error");
});

test("pairedOutcomes: where two routes agree and differ on the SAME types, and the exact two-sided probability of the split among those that differ", () => {
  const types = many(20, (i) => ({ folded: `w${i}`, goldStem: `w${i}` }));
  const right = (wrong) => (w) => (wrong.includes(w) ? "x" : w);
  let q = pairedOutcomes(types, right([]), right(["w0"]));
  assert.deepEqual([q.both, q.neither, q.aOnly, q.bOnly, q.p], [19, 0, 1, 0, 1], "a 1/0 split among one disagreement is no evidence");
  q = pairedOutcomes(types, right([]), right(types.slice(0, 8).map((t) => t.folded)));
  assert.deepEqual([q.aOnly, q.bOnly], [8, 0]);
  assert.ok(Math.abs(q.p - 2 / 256) < 1e-12, "eight to none: 2 × (1/2)^8");
  q = pairedOutcomes(types, right(types.slice(0, 5).map((t) => t.folded)), right(types.slice(5, 10).map((t) => t.folded)));
  assert.deepEqual([q.aOnly, q.bOnly, q.both], [5, 5, 10]);
  assert.equal(q.p, 1, "an even split cannot exceed probability one");
  q = pairedOutcomes(types, right(["w0"]), right(["w0"]));
  assert.deepEqual([q.neither, q.p], [1, 1], "no disagreement at all: nothing to test");
});

test("the controls: strip-a-final-s has no language in it; the typed route is the engine's apostrophe strip on the last word, with its own floor", () => {
  const types = [{ folded: "annas", goldStem: "anna" }, { folded: "thomas", goldStem: "thomas" }, { folded: "is", goldStem: "is" }, { folded: "anna's", goldStem: "anna" }];
  const f = finalSScore(types);
  assert.deepEqual([f.issued, f.falseStrips], [3, 1], "a word of two letters or fewer is left alone");
  const typed = typedRoutePredict();
  assert.equal(typed("anna's"), "anna");
  assert.equal(typed("elizabeth hart's"), "elizabeth hart");
  assert.equal(typed("annas"), "annas");
  assert.equal(typed("jones'"), "jones");
  assert.equal(typed("seven p's"), "seven p's", "the idiom: a one-letter stem is left as written");
  assert.equal(typedRouteScore(types).A, 1);
});

test("shuffledTables: the word-to-label pairing is destroyed and the label marginals are kept; the same seed is the same shuffle", () => {
  const rows = [...many(40, () => row("Anna's", "'s", "clitic")), ...many(60, () => row("Thomas")), ...many(30, () => row("Bob's", "'s", "clitic")), ...many(30, () => row("James"))];
  const real = tallyForms(rows, { maxK: 3 }), a = shuffledTables(rows, { maxK: 3, seed: 7 }), b = shuffledTables(rows, { maxK: 3, seed: 7 }), c = shuffledTables(rows, { maxK: 3, seed: 8 });
  const dump = (t) => JSON.stringify([...t.suffix].sort().map(([k, v]) => [k, [...v].sort()]));
  assert.equal(dump(a), dump(b), "deterministic in its seed");
  assert.notEqual(dump(a), dump(c), "and not the same shuffle under another seed");
  const marginal = (t) => { const m = new Map(); for (const [k, d] of t.suffix) if (k.length === 1) for (const [l, n] of d) m.set(l, (m.get(l) ?? 0) + n); return [...m].sort(); };
  assert.equal(JSON.stringify(marginal(a)), JSON.stringify(marginal(real)), "label totals are unchanged by the shuffle: the same labels, paired with other words");
  const strong = (t) => compile(t, OP).suffix.filter((r) => r.kind === "strip");
  assert.ok(strong(real).length >= 1, "the real pairing teaches a rule");
  assert.equal(strong(a).length, 0, "the shuffled pairing teaches none");
});

test("explainRows: how much of a language's name inflection the suffix-and-prefix account explains, and how much it cannot", () => {
  const e = explainRows([row("Anna's", "'s", "clitic"), row("Annas", "s", "case"), row("Smiths", "s", "number"), row("l'Allemagne", "", null, "l'", "clitic"), row("d'Alsace", "", null, "d'", "case"), row("Thomas"), { word: "Helsingissä", other: true }]);
  assert.deepEqual(e, { nameWords: 7, preservingSuffix: 2, preservingPrefix: 2, number: 1, other: 1 });
});

test("compileCheck: the stored rules answer every type as the full table does", () => {
  const rows = [...many(40, () => row("Anna's", "'s", "clitic")), ...many(30, () => row("Thomas")), ...many(30, () => row("Merkels", "s", "case")), ...many(10, () => row("Jesus"))];
  const types = goldTypes(rows).types, tables = tallyForms(rows, { maxK: 3 });
  const ok = compileCheck(types, tables, OP);
  assert.deepEqual([ok.equivalent, ok.differing, ok.types], [true, 0, types.length]);
  assert.ok(ok.rules.suffix.length > 0);
});

test("errorsAt: the most frequent items of each kind of error, so a reader sees WHAT is wrong and not only how often", () => {
  const types = [
    { folded: "james", word: "James", goldStem: "james", count: 2 }, { folded: "thomas", word: "Thomas", goldStem: "thomas", count: 9 },
    { folded: "annas", word: "Annas", goldStem: "anna", count: 4 }, { folded: "bobs", word: "Bobs", goldStem: "bob", count: 3 }, { folded: "carlos", word: "Carlos", goldStem: "carlo", count: 1 },
  ];
  // strips an s from thomas and james (false strips), turns annas into "ann" (a wrong strip), leaves bobs alone (a miss), carlos right
  const e = errorsAt(types, (w) => ({ thomas: "thoma", james: "jame", annas: "ann", bobs: "bobs", carlos: "carlo" })[w]);
  assert.deepEqual(e.falseStrips.map((x) => x.word), ["Thomas", "James"], "most frequent first");
  assert.deepEqual(e.wrongStrips.map((x) => [x.word, x.predicted, x.gold]), [["Annas", "ann", "anna"]]);
  assert.deepEqual(e.misses.map((x) => x.word), ["Bobs"]);
  assert.equal(errorsAt(types, (w) => w, 1).misses.length, 1, "a limit is honoured");
});
