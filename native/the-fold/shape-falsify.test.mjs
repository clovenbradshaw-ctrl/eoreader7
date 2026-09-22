// shape-falsify.test.mjs — STAGE 4 (SHAPE-MATCH) PROVEN ON FIXTURES, WITH
// THE LIVE MEASUREMENTS OF 2026-09-22 AS THE CASES (results/nine-stages-
// 2026-09-22/shape-live.json): four hosts said a sonnet is fourteen lines;
// five hosts, a haiku three lines and seventeen syllables (and five, a
// part); eleven hosts said nothing about a white paper that a majority
// shared — and the stage said so instead of defaulting.
import test from "node:test";
import assert from "node:assert/strict";
import { shapeClaims, learnShape, matchShape, surfForShape, shapeLines, instanceShapes } from "./shape.js";
import { declareVoidSpec } from "./void-spec.js";

test("shapeClaims reads count-and-unit claims in digits, words and compounds, and nothing else", () => {
  const c = shapeClaims("A sonnet is a fourteen-line poem; the octave has 8 lines, then a sestet of six lines, about 2,500 words in all? No: ten syllables a line.");
  assert.deepEqual(c.map((x) => [x.n, x.unit]), [[14, "line"], [8, "line"], [6, "line"], [2500, "word"], [10, "syllable"]]);
  assert.deepEqual(shapeClaims("Nothing counted here, just prose about lines and words."), []);
});

const src = (host, text, headings = []) => ({ host, text, headings, status: "fetched", chars: text.length });

test("a shape is what MORE HOSTS THAN NOT state — the live sonnet case: 14 lines on every host, the octave's 8 on half, is 14 and only 14", () => {
  const shape = learnShape([
    src("a", "A sonnet has fourteen lines. Its octave is eight lines and its sestet six lines."),
    src("b", "The sonnet: 14 lines, three quatrains and a couplet."),
    src("c", "Fourteen lines of iambic pentameter; the first 8 lines set a problem."),
    src("d", "A 14-line poem in ten syllables per line."),
  ], { formWord: "sonnet" });
  assert.equal(shape.hosts, 4);
  assert.deepEqual(shape.units.line.top, { n: 14, hosts: ["a", "b", "c", "d"], support: 4 });
  assert.equal(shape.units.line.agreed.length, 1, "8 lines on 2 of 4 hosts is not more than not");
  assert.equal(shape.units.syllable.top, null, "ten syllables on 1 of 4 hosts is a candidate, not a shape");
  assert.deepEqual(shape.agreedUnits, [{ unit: "line", n: 14, support: 4, by: "stated" }]);
  assert.equal(shape.learned, true);
  assert.match(shape.basis, /14 lines \(4\/4\)/);
});

test("the live haiku case: a whole and its part both agreed — top is the larger, the part still stands", () => {
  const shape = learnShape([
    src("a", "A haiku is three lines of seventeen syllables: five syllables, then seven, then five."),
    src("b", "Three lines. 17 syllables. 5-7-5."),
    src("c", "5 syllables, 7 syllables, 5 syllables over three lines."),
    src("d", "A haiku: three lines, 17 syllables."),
    src("e", "Some say a haiku needs 5 syllables to open."),
  ], { formWord: "haiku" });
  assert.equal(shape.units.line.top.n, 3);
  assert.equal(shape.units.syllable.top.n, 17, "the whole is at least its parts");
  assert.deepEqual(shape.units.syllable.agreed.map((c) => c.n), [17, 5], "five is agreed too — a part");
  assert.ok(!shape.units.syllable.agreed.some((c) => c.n === 7), "seven on 2 of 5 is not");
});

test("named parts: heading words a majority of hosts use, the form-word itself excluded", () => {
  const shape = learnShape([
    src("a", "prose", ["What is a white paper", "Abstract", "Problem statement", "Conclusion"]),
    src("b", "prose", ["White paper structure", "Introduction", "The problem", "Solution", "Conclusion"]),
    src("c", "prose", ["How to write a white paper", "Conclusion and references"]),
  ], { formWord: "paper" });
  // conclusion 3/3, white 3/3, problem 2/3 — two of three IS more than not
  // (the first draft of this assertion said otherwise; the arithmetic won).
  assert.deepEqual(shape.parts.map((p) => p.word), ["conclusion", "white", "problem"]);
  assert.ok(!shape.parts.some((p) => p.word === "solution"), "solution on 1/3 is not");
  assert.equal(shape.learned, true, "a form with no counted extent may still have named parts");
  assert.equal(shape.agreedUnits.length, 0);
});

test("the form's NAME is what a majority of page titles call it — the garbled ask resolves from the sources, and those words are not parts", () => {
  const withTitle = (host, title, headings) => ({ ...src(host, "prose", headings), pageTitle: title });
  const shape = learnShape([
    withTitle("a", "What Is a White Paper? Definition", ["White paper purpose", "Audience"]),
    withTitle("b", "How to write a white paper", ["Purpose of a white paper", "The problem"]),
    withTitle("c", "White Paper — Wikipedia", ["White papers in government", "Purpose"]),
  ], { formWord: "whiteppr" });
  assert.deepEqual(shape.name.map((n) => n.word), ["paper", "white"]);
  assert.deepEqual(shape.parts.map((p) => p.word), ["purpose"], "white/paper are the name, not parts; audience and problem are on 1/3");
  assert.match(shape.basis, /call it "paper white"|call it "white paper"/);
});

test("INSTANCES: a verse block the pages themselves hold is measured, not reported — its line count counts by the same majority; lists and label rows are not verse", () => {
  const poem = Array.from({ length: 14 }, (_, i) => `Line ${i + 1} of the poem, with its meter and its rhyme.`).join("\n");
  const list = "- first item here\n- second item here\n- third item here";
  const labels = "Q1 Q2 Q3 C\nA B";
  assert.deepEqual(instanceShapes(`Prose paragraph.\n\n${poem}\n\n${list}\n\n${labels}\n\nMore prose.`).map((b) => b.lines), [14]);
  const shape = learnShape([
    src("a", `About the form.\n\n${poem}`),
    src("b", `Another page.\n\n${poem}\n\n${list}`),
    src("c", "A page that says nothing and holds no instance."),
  ], { formWord: "sonnet" });
  assert.equal(shape.instances.blocks, 2);
  assert.deepEqual(shape.instances.top, { n: 14, hosts: ["a", "b"], support: 2 });
  assert.deepEqual(shape.agreedUnits, [{ unit: "line", n: 14, support: 2, by: "instances" }], "no stated claim: the instances alone give the line count");
  assert.match(shape.basis, /14 lines \(2\/3, measured on the pages' own verse blocks\)/);
  // A stated claim outranks the instances for the same unit, and both are shown.
  const both = learnShape([src("a", `A sonnet has fourteen lines.\n\n${poem}`), src("b", `14 lines.\n\n${poem}`), src("c", "Fourteen lines, they say.")]);
  assert.equal(both.agreedUnits.find((a) => a.unit === "line").by, "stated");
  assert.match(both.basis, /the pages' own verse blocks: 14 lines \(2\/3\)/);
  assert.ok(shapeLines(both).some((l) => /^instances\s+14 lines \(2\/3 ✓\)/.test(l)));
});

test("nothing agreed is an honest gap, not a default — the live white-paper case", () => {
  const shape = learnShape([
    src("a", "Aim for 12 pages. Or 50 pages."),
    src("b", "Most run 2 pages; some 12 pages."),
    src("c", "No length is fixed."),
    src("d", "A 5,000 word document."),
    src("e", "Keep it to 9 pages."),
  ], { formWord: "whiteppr" });
  assert.equal(shape.learned, false);
  assert.equal(shape.units.page.top, null, "12 pages on 2 of 5 hosts is not more than not");
  assert.match(shape.basis, /not learned/);
  assert.equal(learnShape([]).basis, "no fetched source: nothing to learn a shape from");
});

test("matchShape: the agreed units this engine can measure are measured exactly; the rest are stated unmeasured and neither pass nor fail", () => {
  const shape = learnShape([
    src("a", "fourteen lines, ten syllables each"), src("b", "14 lines, 10 syllables"), src("c", "14 lines"),
  ]);
  const fourteen = Array.from({ length: 14 }, (_, i) => `line ${i + 1}`).join("\n");
  const ok = matchShape(shape, fourteen);
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.checks.map((c) => [c.unit, c.got, c.ok]), [["line", 14, true], ["syllable", null, undefined]]);
  const no = matchShape(shape, fourteen + "\nline 15");
  assert.equal(no.ok, false, "fifteen lines is not fourteen — NO, back to SURF");
  const only = matchShape(learnShape([src("a", "ten syllables"), src("b", "10 syllables")]), "anything");
  assert.equal(only.ok, null, "a shape with only unmeasurable units is unmeasured, not ok");
  assert.equal(matchShape(learnShape([]), "x").ok, null);
});

test("surfForShape: NO loops back to SURF once with structure queries, then stops — bounded by rounds, not by success", async () => {
  const calls = [];
  const web = {
    search: async (q) => { calls.push(q); return { results: [{ url: `https://${calls.length}.example/${encodeURIComponent(q)}`, title: q }] }; },
    fetch: async () => ({ text: "No count here.", chars: 14, headings: [] }),
  };
  const spec = declareVoidSpec({ task: "write a manifesto" });
  const r = await surfForShape({ spec, web, rounds: 2 });
  assert.equal(r.rounds, 2);
  assert.ok(calls.some((q) => /manifesto structure/.test(q)), "round two asks for the structure directly");
  assert.equal(r.shape.learned, false, "still nothing agreed: the gap stays honest after the last round");
  assert.equal(r.surfed.queries.length, 4);
  // A web that answers on round one never spends round two.
  const one = [];
  const web1 = { search: async (q) => { one.push(q); return { results: [{ url: `https://a${one.length}.example/`, title: "" }, { url: `https://b${one.length}.example/`, title: "" }] }; }, fetch: async () => ({ text: "A manifesto is one page.", chars: 24, headings: [] }) };
  const r1 = await surfForShape({ spec, web: web1, rounds: 2 });
  assert.equal(r1.rounds, 1);
  assert.equal(r1.shape.units.page.top.n, 1);
  assert.ok(shapeLines(r1.shape).length >= 1);
});
