// paradigm-plurality-falsify.test.mjs — detectParadigmPlurality (paradigm.js),
// proven on constructed forms (2026-09-22). The named gap: a single form NAME
// may span more than one genuinely distinct sub-paradigm; this organ asks
// whether a set of instances, all filed under one name, clusters into more
// than one real kind under the engine's own affinity-basin induction and its
// random-subset binding-energy null (kernel/entity-kind-induction.js) — the
// SAME induction kinds.js already trusts elsewhere, reused here rather than
// reinvented. THE CONTROL is decisive: one real shape split at random must
// not be found plural.
import test from "node:test";
import assert from "node:assert/strict";
import { detectParadigmPlurality } from "./paradigm.js";

let seed = 11;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

const NOUNS = ["river", "window", "garden", "lantern", "harbor", "meadow", "kettle", "ladder", "pocket", "button", "candle", "thimble"];
const VERBS = ["carried", "painted", "folded", "counted", "gathered", "followed", "measured", "whispered"];
const RHYMES = [["hill", "still", "will", "mill"], ["town", "gown", "down", "crown"], ["cat", "hat", "mat", "flat"], ["bee", "tea", "sea", "knee"], ["door", "floor", "more", "shore"]];

// A constructed limerick — five lines, AABBA, fixed shape.
const limerick = () => {
  const a = pick(RHYMES), b = pick(RHYMES.filter((r) => r !== a));
  const A = shuffle(a), B = shuffle(b);
  return [`There was an old man of the ${A[0]},`, `Who ${pick(VERBS)} a ${pick(NOUNS)} ${A[1]};`, `He ${pick(VERBS)} the ${B[0]},`, `And a ${pick(NOUNS)} ${B[1]},`, `That odd old man of the ${A[0]}.`].join("\n");
};
// A constructed man-page entry — all-capitals headings, option markers, a
// completely different skeleton from the limerick's.
const entry = () => [`NAME`, `     ${pick(NOUNS)} - ${pick(VERBS)} the ${pick(NOUNS)}`, ``, `DESCRIPTION`, `     The ${pick(NOUNS)} utility ${pick(VERBS)} each ${pick(NOUNS)} it is given, and reports the result to standard output.`, ``, `OPTIONS`, `     -a      ${pick(VERBS)} all of them.`, `     -v      ${pick(VERBS)} verbosely.`].join("\n");

test("under five instances, detectParadigmPlurality refuses rather than guesses", () => {
  seed = 1;
  const r = detectParadigmPlurality([limerick(), limerick(), limerick()], { name: "x" });
  assert.equal(r.plural, false);
  assert.equal(r.refused, "under_powered");
});

test("POSITIVE: instances that are genuinely two different shapes, mixed under one name, are found plural", () => {
  seed = 3;
  const instances = shuffle([
    ...Array.from({ length: 20 }, (_, i) => ({ id: `lim-${i}`, text: limerick() })),
    ...Array.from({ length: 20 }, (_, i) => ({ id: `man-${i}`, text: entry() })),
  ]);
  const r = detectParadigmPlurality(instances, { name: "mixed form" });
  assert.equal(r.plural, true, r.basis);
  assert.ok(r.clusters.length >= 2, `expected at least two clusters, got ${r.clusters.length}`);
  // The two constructed shapes should not be blended into one cluster: each
  // cluster should be overwhelmingly one kind (limericks or entries), not an
  // even mix — the real distinguishing feature (part count / marks) is what
  // separated them.
  for (const c of r.clusters) {
    const limCount = c.members.filter((m) => m.startsWith("lim-")).length;
    const manCount = c.members.filter((m) => m.startsWith("man-")).length;
    const dominant = Math.max(limCount, manCount);
    assert.ok(dominant / c.members.length >= 0.8, `cluster mixed limericks and entries nearly evenly: ${limCount} lim, ${manCount} man`);
  }
  assert.ok(r.clusters.some((c) => c.distinguishingFacts.length > 0), "a real cluster names what distinguishes it");
});

test("THE CONTROL: a random split of ONE constructed shape is not plural", () => {
  // Across several seeds — a single seed proves nothing about the bound the
  // organ claims (the induction's own null is itself probabilistic).
  const results = [];
  for (let s = 1; s <= 8; s++) {
    seed = s * 7919;
    const instances = Array.from({ length: 40 }, (_, i) => ({ id: `lim-${i}`, text: limerick() }));
    results.push(detectParadigmPlurality(instances, { name: "one shape only" }).plural);
  }
  const falsePositives = results.filter(Boolean).length;
  assert.ok(falsePositives === 0, `one real shape was found plural in ${falsePositives}/${results.length} runs: ${results.join(",")}`);
});

test("THE CONTROL: a random split of ONE mixed-but-uniform population (shuffled halves of the same pool) is not plural", () => {
  // A different flavor of null: instances that vary (different nouns/verbs/
  // rhyme sets each draw) but are all the SAME shape — variation alone must
  // not be mistaken for a genuine sub-paradigm split.
  seed = 97;
  const instances = Array.from({ length: 30 }, (_, i) => ({ id: `e-${i}`, text: entry() }));
  const r = detectParadigmPlurality(instances, { name: "entries only" });
  assert.equal(r.plural, false, r.basis);
});
