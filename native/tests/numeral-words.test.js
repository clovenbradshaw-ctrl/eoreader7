import test from "node:test";
import assert from "node:assert/strict";
import { wordsToNumber, sameNumeral, ONES_WORDS, TEEN_WORDS, TENS_WORDS, SCALE_WORDS, CARDINAL_CONNECTORS } from "../adapters/text/numeral-words.js";

test("wordsToNumber reads a whole cardinal phrase; a bare non-number word is null, not zero", () => {
  assert.equal(wordsToNumber("fifty-nine"), 59);
  assert.equal(wordsToNumber("nineteen"), 19);
  assert.equal(wordsToNumber("two hundred thirty"), 230);
  assert.equal(wordsToNumber("the"), null);
});

test("the connector word may sit between two cardinal words without changing the value", () => {
  assert.equal(wordsToNumber("two hundred and thirty"), 230);
});

test("a single stray word refuses the whole phrase — never a partial read", () => {
  assert.equal(wordsToNumber("about fifty-nine"), null, "an unrelated word beside a real numeral is still not a pure numeral phrase");
  assert.equal(wordsToNumber("fifty-nine dollars"), null);
  assert.equal(wordsToNumber(""), null);
  assert.equal(wordsToNumber(null), null);
  assert.equal(wordsToNumber(undefined), null);
});

test("zero reads as 0, distinguishable from an unmatched phrase", () => {
  assert.equal(wordsToNumber("zero"), 0);
});

test("hundred multiplies the open group; thousand and above close it and start a new one", () => {
  assert.equal(wordsToNumber("one hundred"), 100);
  assert.equal(wordsToNumber("nine hundred ninety nine"), 999);
  assert.equal(wordsToNumber("one thousand"), 1000);
  assert.equal(wordsToNumber("one hundred thousand"), 100_000);
  assert.equal(wordsToNumber("two thousand twenty six"), 2026);
});

test("ordinals are not this organ's — a copula complement states an age or a quantity, never an ordinal", () => {
  assert.equal(wordsToNumber("fifty-ninth"), null);
  assert.equal(wordsToNumber("nineteenth"), null);
});

test("sameNumeral folds a raw digit token against its own cardinal-word phrase, both directions", () => {
  assert.equal(sameNumeral("59", "fifty-nine"), true);
  assert.equal(sameNumeral("fifty-nine", "59"), true);
  assert.equal(sameNumeral("60", "fifty-nine"), false);
});

test("sameNumeral folds two digit tokens by numeric value, not by spelling", () => {
  assert.equal(sameNumeral("059", "59"), true);
  assert.equal(sameNumeral("59", "59"), true);
  assert.equal(sameNumeral("59", "60"), false);
});

test("sameNumeral is false, never a guess, when either side is not a number in either form", () => {
  assert.equal(sameNumeral("Renfield", "59"), false);
  assert.equal(sameNumeral("59", "the"), false);
  assert.equal(sameNumeral("", "59"), false);
  assert.equal(sameNumeral("fifty-nine", "sixty"), false);
});

test("the closed classes each name their giver", () => {
  for (const cls of [ONES_WORDS, TEEN_WORDS, TENS_WORDS, SCALE_WORDS]) assert.ok(Object.keys(cls).length > 0);
  assert.ok(CARDINAL_CONNECTORS.has("and"));
});
