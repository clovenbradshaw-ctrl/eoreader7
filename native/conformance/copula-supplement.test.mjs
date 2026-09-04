// copula-supplement.test.mjs — S58. A hole in a received prior is closed by a
// SECOND NAMED GIVER, never by inference, and the two givers' reaches are
// never summed into one number.
//
// The measurement behind this (eval/the-fold/results/ends-only-proposer-RESULTS.md):
// UniMorph English carries zero rows for the lemma `be` across 652,477 rows,
// while every other top-frequency irregular carries five verb rows apiece. So
// `sameAct` — the organ that decides whether two labels denote the same act —
// was blind to the most common verb in English, silently reading every copular
// restatement as a different act, on 29% of encyclopedic label heads and 50%
// of a novel's.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createLemmatizer, morphologyFromPrior } from "../adapters/text/morphology.js";
import { COPULA_PARADIGM, COPULA_PARADIGM_META } from "../adapters/text/priors.js";

const PRIOR = new URL("../eval/the-fold/fixtures/unimorph-morphology-prior.json", import.meta.url);
const prior = morphologyFromPrior(JSON.parse(readFileSync(PRIOR, "utf8")));
const bare = () => createLemmatizer(prior.forms, { language: prior.language });
const supplemented = () => createLemmatizer(prior.forms, { language: prior.language, supplement: COPULA_PARADIGM });

test("the received prior's own hole is real, and this test fails the day it is filled", () => {
  // If UniMorph ever ships `be`, this fails — and that is the correct
  // outcome: the supplement would then be redundant and should be retired
  // rather than left duplicating a giver that now carries it.
  const b = bare();
  for (const form of ["is", "was", "are", "were", "be", "been", "am"])
    assert.equal(b.sameAct(form, "be"), form === "be", `the prior alone should not fold "${form}" with "be"`);
});

test("the supplement closes it, and only it", () => {
  const s = supplemented();
  for (const [a, b] of [["is", "was"], ["was", "were"], ["is", "be"], ["is", "are"], ["been", "am"]])
    assert.equal(s.sameAct(a, b), true, `"${a}" and "${b}" are one act`);
  // A widening that widened past its scope would be worse than the hole.
  for (const [a, b] of [["is", "seems"], ["was", "had"], ["be", "become"], ["are", "exist"]])
    assert.equal(s.sameAct(a, b), false, `"${a}" and "${b}" are NOT one act`);
});

test("the prior's own reach is unchanged — the supplement adds, never replaces", () => {
  const b = bare(), s = supplemented();
  for (const [x, y] of [["withdraws", "withdrew"], ["went", "go"], ["saw", "see"]])
    assert.equal(s.sameAct(x, y), b.sameAct(x, y), `"${x}"/"${y}" must not change`);
});

test("the two givers' reaches are reported apart and never summed", () => {
  const s = supplemented();
  assert.equal(s.size, bare().size, "`size` counts the PRIOR's entries, so a supplement can never inflate it");
  assert.equal(s.supplemented, Object.keys(COPULA_PARADIGM).length, "`supplemented` counts what the second giver added");
  assert.equal(bare().supplemented, 0, "no supplement, nothing supplemented");
});

test("omitting the supplement is byte-identical to before it existed", () => {
  // Every existing caller passes no supplement. This is the regression that
  // says so, rather than trusting the default.
  const b = bare();
  assert.equal(b.supplemented, 0);
  assert.equal(b.gap, null);
  assert.equal(b.sameAct("is", "was"), false);
});

test("the supplement names its giver and its scope", () => {
  assert.equal(COPULA_PARADIGM_META.giver, "lang/en");
  assert.ok(COPULA_PARADIGM_META.scope, "a received class declares what it does NOT carry");
  assert.match(COPULA_PARADIGM_META.scope, /tense is not carried/);
});

test("BECOMING copula-tense-aware: folding is/was says the same ACT, never the same claim", { todo: true }, () => {
  // The disclosed hazard, written as its referent rather than as prose: a
  // consumer that binds a present-tense claim to past-tense material has
  // widened what it hears. `sameAct` cannot express that distinction — it
  // answers act identity, and tense is a different question that no organ
  // here asks yet. This is inhabited the day a consumer can bind on act
  // while keeping tense apart; until then the supplement stays opt-in and
  // this test names what is missing.
  const s = supplemented();
  assert.equal(s.sameAct("is", "was"), true, "same act");
  assert.ok(s.tenseOf, "no organ carries tense yet");
});
