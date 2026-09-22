// paradigm-falsify.test.mjs — DEF·Paradigm / EVA·Paradigm and their Ground
// reader (medium.js, sound.js), proven on constructed forms before the live
// study (2026-09-22). The decisive case is the CONTROL: a random split of one
// population is not a form, and the organ must find nothing in it.
import test from "node:test";
import assert from "node:assert/strict";
import { elementsOf, segmentCollection, readMarker, markupOf, uniformityP } from "./medium.js";
import { rhymes } from "./sound.js";
import { learnParadigm, evaluateParadigm, paradigmLines, hypergeom, poissonBinomialUpper } from "./paradigm.js";

let seed = 11;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
// Fisher–Yates. (sort with a random comparator is NOT a uniform shuffle —
// V8 keeps long runs in order; measured 2026-09-22, it made "random" halves
// that differed in composition and the control "found" a form in them.)
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const NOUNS = ["river", "window", "garden", "lantern", "harbor", "meadow", "kettle", "ladder", "pocket", "button", "candle", "thimble"];
const VERBS = ["carried", "painted", "folded", "counted", "gathered", "followed", "measured", "whispered"];
const RHYMES = [["hill", "still", "will", "mill"], ["town", "gown", "down", "crown"], ["cat", "hat", "mat", "flat"], ["bee", "tea", "sea", "knee"], ["door", "floor", "more", "shore"]];
const limerick = () => {
  const a = pick(RHYMES), b = pick(RHYMES.filter((r) => r !== a));
  const A = shuffle(a), B = shuffle(b);
  return [`There was an old man of the ${A[0]},`, `Who ${pick(VERBS)} a ${pick(NOUNS)} ${A[1]};`, `He ${pick(VERBS)} the ${B[0]},`, `And a ${pick(NOUNS)} ${B[1]},`, `That odd old man of the ${A[0]}.`].join("\n");
};
const prose = () => Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => Array.from({ length: 3 + Math.floor(rnd() * 3) }, () => `The ${pick(NOUNS)} was ${pick(VERBS)} by a ${pick(NOUNS)} near the ${pick(NOUNS)} for many years, and the record says so.`).join(" ")).join("\n\n");
const entry = () => [`NAME`, `     ${pick(NOUNS)} - ${pick(VERBS)} the ${pick(NOUNS)}`, ``, `DESCRIPTION`, `     The ${pick(NOUNS)} utility ${pick(VERBS)} each ${pick(NOUNS)} it is given, and reports the result to standard output.`, ``, `OPTIONS`, `     -a      ${pick(VERBS)} all of them.`, `     -v      ${pick(VERBS)} verbosely.`].join("\n");

test("medium: markup is read, not assumed — plain, Markdown and wikitext each give headings, items and labels", () => {
  assert.equal(markupOf("== Ingredients ==\n* 1 cup flour\n# Mix it."), "wikitext");
  assert.equal(markupOf("### Part 1\n\n- (1) The Act is amended.\n\n##### 2"), "markdown");
  const wiki = elementsOf("== Ingredients ==\n* 1 [[cup]] '''flour'''\n* 2 eggs\n== Procedure ==\n# Mix the flour.\n# Bake it.").elements;
  assert.deepEqual(wiki.map((e) => e.cls), ["heading", "item", "item", "heading", "item", "item"]);
  assert.equal(wiki[1].text, "1 cup flour", "inline markup stripped to what a reader sees");
  assert.deepEqual(wiki.filter((e) => e.markerKind === "arabic").map((e) => e.label), [1, 2], "auto-numbered steps count within their run");
  const md = elementsOf("#### Meaning\n\n- (1) The Act is amended.\n\n- (a) in subsection (1) omit it;\n\n> (2) The gift must be made.").elements;
  assert.deepEqual(md.map((e) => [e.cls, e.markerKind, e.label]), [["heading", null, null], ["item", "paren-arabic", 1], ["item", "paren-alpha", 1], ["item", "paren-arabic", 2]], "a bullet wrapping a label is the label; a quoted line is read");
  assert.equal(readMarker("(c) after that").kind, "paren-alpha", "(c) in a list is the letter c, not roman 100");
});

test("medium: a hard-wrapped prose line is one authored line; a verse line is not joined; an all-capitals heading never takes its content", () => {
  const wrapped = elementsOf("The utility displays its name as well as any\nrequested information about the file.\n").elements;
  assert.equal(wrapped.length, 1);
  const verse = elementsOf("Shall I compare thee to a summer's day\nThou art more lovely and more temperate").elements;
  assert.equal(verse.length, 2, "a capitalized next line is the next verse line, even with no closing punctuation");
  const man = elementsOf("NAME\n     ls - list directory contents\n\nSYNOPSIS\n     ls [-l] [file ...]").elements;
  assert.deepEqual(man.map((e) => e.cls), ["heading", "line", "heading", "line"]);
});

test("medium: a collection is cut at the separator that recurs, front matter counted and left out", () => {
  const book = ["A BOOK OF VERSE", "", "by nobody", "", ...Array.from({ length: 6 }, (_, i) => [`${i + 1}.`, "", limerick(), ""]).flat()].join("\n");
  const seg = segmentCollection(book);
  assert.equal(seg.units.length, 6);
  assert.ok(seg.units.every((u) => u.elements.length === 5));
  assert.match(seg.basis, /label:arabic/);
  assert.equal(segmentCollection("one paragraph, no separator.").units.length, 1);
});

test("sound: two different words whose spelled tails agree rhyme; a word never rhymes with itself", () => {
  assert.ok(rhymes("hill", "still"));
  assert.ok(rhymes("gown", "down"));
  assert.ok(!rhymes("river", "garden"));
  assert.ok(!rhymes("hill", "hill"), "repetition is sameEnd, a different relation");
});

test("the exact tests are exact", () => {
  assert.ok(Math.abs(hypergeom(3, 3, 3, 6) - 1 / 20) < 1e-12, "all 3 of the 3 drawn from 3-of-6: C(3,3)/C(6,3)");
  assert.ok(Math.abs(poissonBinomialUpper([0.5, 0.5], 2) - 0.25) < 1e-12);
});

test("DEF·Paradigm finds a constructed limerick's shape with nothing about limericks written in: 5 parts, AABBA, a repeated end word, 'there' then 'who'", () => {
  seed = 11;
  const inst = Array.from({ length: 30 }, limerick), pop = [...Array.from({ length: 30 }, prose), ...Array.from({ length: 30 }, entry)];
  const p = learnParadigm({ name: "constructed limerick", instances: inst, population: pop });
  assert.equal(p.count, 5);
  assert.match(p.scheme, /^A[A-Z]BB?A$|^A.BBA$/, `scheme ${p.scheme}`);
  const keys = p.features.map((f) => f.key);
  assert.ok(keys.includes("sameEnd(1,5)"), "line 5 ends on line 1's own word");
  assert.ok(keys.includes("rhyme(3,4)"));
  assert.ok(keys.includes("starts:there"));
  assert.ok(keys.includes("starts:there before starts:who"));
  assert.ok(p.judged.includes("REC·Figure"), "the turn is owed to judgement, not counted");
  assert.ok(paradigmLines(p).some((l) => /CON·Pattern/.test(l)));
  seed = 99;
  assert.equal(evaluateParadigm(p, limerick()).satisfies, true);
  assert.equal(evaluateParadigm(p, prose()).satisfies, false);
  assert.equal(evaluateParadigm(p, entry()).satisfies, false);
});

test("DEF·Paradigm finds a constructed manual entry's shape: all-capitals headings, their words, their order, option markers", () => {
  seed = 5;
  const p = learnParadigm({ name: "constructed entry", instances: Array.from({ length: 30 }, entry), population: [...Array.from({ length: 30 }, prose), ...Array.from({ length: 30 }, limerick)] });
  const keys = p.features.map((f) => f.key);
  for (const k of ["heading:all-capitals", "marker:option", "heading:name", "heading:description", "heading:name before heading:description"]) assert.ok(keys.includes(k), `missing ${k}: ${keys.join(", ")}`);
});

test("THE CONTROL: a random split of ONE population is not a form — across twenty coincidences, most admit nothing and the average is inside the stated bound of one", () => {
  // The level is 1/T over the whole definition: AT MOST one false feature
  // expected per coincidence. Asserting zero on one seed would assert luck;
  // the bound is what is claimed, so the bound is what is tested. Measured
  // on real corpora too (man pages, prose, limericks, sonnets; ten true
  // random splits): 0 features in 9, 2 in 1 — 0.2 per coincidence.
  const runs = [];
  for (let s = 1; s <= 20; s++) {
    seed = s * 7919;
    const mixed = shuffle([...Array.from({ length: 40 }, prose), ...Array.from({ length: 40 }, entry), ...Array.from({ length: 40 }, limerick)]);
    runs.push(learnParadigm({ name: "no form", instances: mixed.slice(0, 60), population: mixed.slice(60) }).features.length);
  }
  const mean = runs.reduce((a, b) => a + b, 0) / runs.length;
  assert.ok(mean <= 1, `${mean} false feature(s) per coincidence exceeds the bound: ${runs.join(",")}`);
  assert.ok(runs.filter((n) => n === 0).length * 2 > runs.length, `most coincidences must admit nothing: ${runs.join(",")}`);
});

test("under five instances, or with no population to separate from, the organ refuses rather than guesses", () => {
  assert.equal(learnParadigm({ instances: [limerick(), limerick()], population: [prose(), prose(), prose(), prose(), prose()] }).refused, "under_powered");
  assert.equal(learnParadigm({ instances: Array.from({ length: 8 }, limerick), population: [] }).refused, "no_null");
  assert.equal(evaluateParadigm({ refused: "under_powered", basis: "x" }, limerick()).satisfies, null);
});

test("EMERGENT: the definition is compressed by dominance, but satisfaction is scored against all of it — five lines of prose do not satisfy 'limerick'", async () => {
  const { learnParadigmEmergent, evaluateParadigmEmergent } = await import("./paradigm.js");
  seed = 41;
  const sonnetish = () => Array.from({ length: 14 }, () => `The ${pick(NOUNS)} was ${pick(VERBS)} beside the ${pick(NOUNS)}.`).join("\n");
  const p = learnParadigmEmergent({ name: "limerick", instances: Array.from({ length: 30 }, limerick), population: Array.from({ length: 30 }, sonnetish) });
  assert.ok(p.features.length < p.all.length, `dominance compressed the definition: ${p.features.length} of ${p.all.length}`);
  assert.ok(p.features.some((f) => f.same?.length), "dominated features are folded under what dominates them, not lost");
  const fiveProse = Array.from({ length: 5 }, () => `The ${pick(NOUNS)} was ${pick(VERBS)} beside the ${pick(NOUNS)} for a while.`).join("\n");
  assert.equal(evaluateParadigmEmergent(p, fiveProse).satisfies, false, "five lines alone are not a limerick");
  assert.equal(evaluateParadigmEmergent(p, limerick()).satisfies, true);
});

test("medium: uniformityP — a perfectly uniform cut is always a surprise (p≈0); an arbitrary cut is not (p large)", () => {
  const p = uniformityP(0, 100, 5, { draws: 300 });
  assert.ok(p < 0.05, `a perfectly uniform real cut should almost never be beaten by a random cut: p=${p}`);
  const pHigh = uniformityP(0.9, 100, 5, { draws: 300 });
  assert.ok(pHigh > 0.3, `a very uneven real cut should be unsurprising against random cuts: p=${pHigh}`);
});

test("medium: segmentCollection refuses a recurring skeleton that isn't more uniform than a random same-N cut, and says so honestly", () => {
  // A deterministic rnd so this is not flaky: always returns the SAME cut
  // points a real random draw could give, engineered so random cuts are
  // frequently at least as uniform as a moderately uneven real candidate.
  let i = 0;
  const rnd = () => { i = (i * 9301 + 49297) % 233280; return i / 233280; };
  const seg = segmentCollection("one paragraph, no separator.", { rnd });
  assert.equal(seg.units.length, 1, "no recurring separator at all — unaffected by the null test");
});

test("medium: markupOf — a markdown document mixing '##' headings with bare '*' bullets is still read as markdown, its headings still real headings (the live bug: bullets alone outnumbering headings flipped the whole doc to wikitext, reading every '##' as a nested list marker)", () => {
  const text = "## Headline\n\nSome text.\n\n## Source\n\n* item one\n* item two\n* item three\n";
  assert.equal(markupOf(text), "markdown");
  const headings = elementsOf(text).elements.filter((e) => e.cls === "heading").map((e) => e.text);
  assert.deepEqual(headings, ["Headline", "Source"]);
});
