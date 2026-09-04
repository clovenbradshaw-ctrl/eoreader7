// shared-text.test.mjs — the walls on `sharedTextGroups` and on the collapse
// it feeds into `distinctSources`.
//
// The measurement behind it: of the 22 notes standing on two or more sources
// across three real Wikipedia articles, two are maintenance categories and the
// other twenty are two articles sharing 20 verbatim sentences. One text in two
// places is one witness, and counting it as two was the entire corroborated
// set of that reading.
import { test } from "node:test";
import assert from "node:assert/strict";
import { sharedTextGroups, distinctSources } from "./corroboration.js";
import { splitSentences } from "../adapters/text/spans.js";

const DECL = { minSentenceLength: 40, minShared: 2, splitSentences };
const SHARED_A = "England expects that every man will do his duty on this particular morning.";
const SHARED_B = "Davout's soldiers had forty-eight hours to march one hundred and ten kilometres.";
const OWN = (n) => `This is a sentence entirely peculiar to document number ${n} and to nothing else at all.`;

test("every number is declared — none is defaulted, and the organ is injected", () => {
  assert.throws(() => sharedTextGroups([], { minShared: 2, splitSentences }), /minSentenceLength is declared/);
  assert.throws(() => sharedTextGroups([], { minSentenceLength: 40, splitSentences }), /minShared is declared/);
  assert.throws(() => sharedTextGroups([], { minSentenceLength: 40, minShared: 2 }), /splitSentences is injected/);
});

test("two documents sharing text beyond the floor are ONE source", () => {
  const { groupOf, collapsed, overlaps } = sharedTextGroups([
    { ref: "a", text: `${OWN(1)} ${SHARED_A} ${SHARED_B}` },
    { ref: "b", text: `${OWN(2)} ${SHARED_A} ${SHARED_B}` },
  ], DECL);
  assert.equal(groupOf.get("a"), groupOf.get("b"), "one text in two places is one witness");
  assert.equal(collapsed, 1);
  assert.equal(overlaps[0].shared, 2);

  // And that is what the count is for.
  const w = ["a#0-10~r", "b#0-10~r"];
  assert.equal(distinctSources(w).size, 2, "uncollapsed, the old count");
  assert.equal(distinctSources(w, { groupOf }).size, 1, "collapsed, the honest one");
});

test("documents that share nothing stay independent — absence never convicts", () => {
  const { groupOf, collapsed } = sharedTextGroups([
    { ref: "a", text: `${OWN(1)} ${OWN(3)}` },
    { ref: "b", text: `${OWN(2)} ${OWN(4)}` },
  ], DECL);
  assert.notEqual(groupOf.get("a"), groupOf.get("b"));
  assert.equal(collapsed, 0);
  assert.equal(distinctSources(["a~r", "b~r"], { groupOf }).size, 2);
});

test("sharing BELOW the declared floor does not collapse", () => {
  const { groupOf } = sharedTextGroups([
    { ref: "a", text: `${OWN(1)} ${SHARED_A}` },
    { ref: "b", text: `${OWN(2)} ${SHARED_A}` },
  ], DECL);
  assert.notEqual(groupOf.get("a"), groupOf.get("b"), "one shared sentence is not syndication at minShared 2");
});

test("a SHORT shared sentence is not evidence — the length floor is why", () => {
  const short = "He was born in 1809.";
  assert.ok(short.length < DECL.minSentenceLength);
  const { groupOf } = sharedTextGroups([
    { ref: "a", text: `${OWN(1)} ${short} It was raining.` },
    { ref: "b", text: `${OWN(2)} ${short} It was raining.` },
  ], DECL);
  assert.notEqual(groupOf.get("a"), groupOf.get("b"), "short sentences recur between unrelated documents");
});

test("syndication is TRANSITIVE — if A shares with B and B with C, all three are one text", () => {
  const AB = "The first of two sentences that A and B both happen to carry verbatim here.";
  const BC = "The second of two sentences that B and C both happen to carry verbatim here.";
  const AB2 = "Another sentence that A and B both carry, making two between that pair.";
  const BC2 = "Another sentence that B and C both carry, making two between that pair.";
  const { groupOf, groups } = sharedTextGroups([
    { ref: "a", text: `${OWN(1)} ${AB} ${AB2}` },
    { ref: "b", text: `${OWN(2)} ${AB} ${AB2} ${BC} ${BC2}` },
    { ref: "c", text: `${OWN(3)} ${BC} ${BC2}` },
  ], DECL);
  assert.equal(groups.length, 1, "a and c share nothing directly and are still one text through b");
  assert.equal(groupOf.get("a"), groupOf.get("c"));
  assert.equal(distinctSources(["a~r", "b~r", "c~r"], { groupOf }).size, 1);
});

test("omitting the organ is byte-identical to before it existed", () => {
  // Every existing caller passes no groupOf. This is the regression that says
  // so, rather than trusting the default.
  const w = ["a#1-2~r", "b#3-4~r", "a#9-9~r"];
  assert.equal(distinctSources(w).size, 2);
  assert.equal(distinctSources(w, {}).size, 2);
  assert.equal(distinctSources(w, { groupOf: null }).size, 2);
});

test("a source not in the grouping counts as itself, never as missing", () => {
  const { groupOf } = sharedTextGroups([{ ref: "a", text: OWN(1) }], DECL);
  // "z" was never measured. It must not vanish from the count.
  assert.equal(distinctSources(["a~r", "z~r"], { groupOf }).size, 2);
});
