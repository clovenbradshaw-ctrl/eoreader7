import { test } from "node:test";
import assert from "node:assert/strict";

import {
  MATCH_SCHEMA, MIN_NEAR_MISS_LEN, SHAPE_KINDS,
  exactMatch, patternMatch, nearMissMatch, shapeMatch, resolveTarget,
} from "../organs/target-resolve.js";

import { discoverCompanyKinds } from "../organs/kind-standing.js";
import { arrowOf } from "../kernel/arrow.js";

// ---- exactMatch: literal identity only ----
test("exactMatch is literal identity, coerced to string, nothing looser", () => {
  assert.equal(exactMatch("ohs", "ohs"), true);
  assert.equal(exactMatch("ohs", "OHS"), false, "case is not folded here — that is a different modality's job");
  assert.equal(exactMatch(42, "42"), true, "coerced to string, so a numeric id still matches its string form");
});

// ---- patternMatch: real RegExp, typed refusal on an invalid pattern ----
test("patternMatch runs a real RegExp and refuses typed on an invalid pattern", () => {
  assert.equal(patternMatch("ohs-budget-line-14", "^ohs-budget-line-\\d+$"), true);
  assert.equal(patternMatch("not-a-budget-line", "^ohs-budget-line-\\d+$"), false);
  const bad = patternMatch("x", "(unclosed");
  assert.equal(bad.refused, "invalid_pattern");
});

// ---- nearMissMatch: real surfaces.js comparator, real documented floor ----
test("nearMissMatch delegates to surfaces.js's own near-miss check and refuses below the length floor", () => {
  assert.equal(nearMissMatch("Johnson", "Jonson"), true, "a dropped letter — surfaces.js's own worked example");
  assert.equal(nearMissMatch("Johnson", "Smith"), false, "not within one edit — a real non-match, not a refusal");
  const short = nearMissMatch("cat", "cot");
  assert.equal(short.refused, "below_length_floor");
  assert.equal(short.floor, MIN_NEAR_MISS_LEN);
});

// ---- shapeMatch: named dispatch, typed refusals, then a REAL injected organ each ----
test("shapeMatch refuses an unknown kind and a missing door before ever touching a real organ", () => {
  const unknown = shapeMatch("vibes", [], {});
  assert.equal(unknown.refused, "unknown_shape_kind");
  const missing = shapeMatch("company", [], {});
  assert.equal(missing.refused, "door_not_injected");
});

test("shapeMatch(\"company\") dispatches to the real discoverCompanyKinds and returns its real result", () => {
  const sentences = [
    { text: "the cat sat" }, { text: "the dog sat" }, { text: "the bird sat" }, { text: "the fish sat" },
  ];
  const vocabulary = ["cat", "dog", "bird", "fish"];
  const result = shapeMatch(
    "company",
    [sentences, vocabulary, { minMentions: 1, minShare: 0.5, minMembers: 2 }],
    { discoverCompanyKinds },
  );
  assert.ok(Array.isArray(result) && result.length >= 1, "the real organ found the real cohesive kind");
  // Confirm it is genuinely the same organ, not a re-implementation — same
  // call, same result, checked directly against the imported function.
  const direct = discoverCompanyKinds(sentences, vocabulary, { minMentions: 1, minShare: 0.5, minMembers: 2 });
  assert.deepEqual(result, direct);
});

test("shapeMatch(\"order\") dispatches to the real arrowOf and returns its real verdict", () => {
  // A clearly asymmetric sequence: "a a a a a a b" reads differently reversed.
  const events = ["a", "a", "a", "a", "a", "a", "b"];
  const result = shapeMatch("order", [events, { k: 2, draws: 16, seed: 3 }], { arrowOf });
  assert.ok(result.verdict === "irreversible" || result.verdict === "reversible", "a real verdict came back from arrow.js itself");
  const direct = arrowOf(events, { k: 2, draws: 16, seed: 3 });
  assert.deepEqual(result, direct);
});

// ---- resolveTarget: the ordering itself — the one genuinely new thing here ----
test("resolveTarget tries exact first and refuses a tie rather than guessing", () => {
  const one = resolveTarget("ohs", ["ohs", "dhs", "hhs"]);
  assert.equal(one.schema, MATCH_SCHEMA);
  assert.equal(one.modality, "exact");
  assert.equal(one.match, "ohs");

  const tie = resolveTarget("ohs", ["ohs", "ohs", "hhs"]);
  assert.equal(tie.refused, "tie");
  assert.equal(tie.modality, "exact");
});

test("resolveTarget falls through to pattern when exact finds nothing", () => {
  const r = resolveTarget("budget-line", ["ohs-budget-line-14", "unrelated-record"], {
    pattern: { source: "budget-line", flags: "" },
  });
  assert.equal(r.modality, "pattern");
  assert.equal(r.match, "ohs-budget-line-14");
});

test("resolveTarget dispatches to shape when declared, ahead of near-miss", () => {
  const sentences = [
    { text: "the cat sat" }, { text: "the dog sat" }, { text: "the bird sat" }, { text: "the fish sat" },
  ];
  const vocabulary = ["cat", "dog", "bird", "fish"];
  const r = resolveTarget("cat", ["nothing-exact-here"], {
    shape: {
      kind: "company",
      args: [sentences, vocabulary, { minMentions: 1, minShare: 0.5, minMembers: 2 }],
      doors: { discoverCompanyKinds },
    },
  });
  assert.equal(r.modality, "shape:company");
  assert.ok(Array.isArray(r.result));
});

test("resolveTarget only reaches near-miss last, as a fallback, and still refuses a tie there", () => {
  const nearOnly = resolveTarget("Johnson", ["Jonson", "Smith"]);
  assert.equal(nearOnly.modality, "near-miss");
  assert.equal(nearOnly.match, "Jonson");

  const nearTie = resolveTarget("Johnson", ["Jonson", "Johnsen"]);
  assert.equal(nearTie.refused, "tie");
  assert.equal(nearTie.modality, "near-miss");
});

test("resolveTarget refuses no_match honestly when nothing survives any modality", () => {
  const r = resolveTarget("zzz-nothing-like-this-zzz", ["ohs", "dhs", "hhs"]);
  assert.equal(r.refused, "no_match");
});

test("resolveTarget can be asked to skip near-miss entirely (allowNearMiss: false)", () => {
  const r = resolveTarget("Johnson", ["Jonson"], { allowNearMiss: false });
  assert.equal(r.refused, "no_match", "near-miss would have matched, but the caller declared it off");
});
