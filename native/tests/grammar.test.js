import test from "node:test";
import assert from "node:assert/strict";
import { grammarFor, grammarAt, levelOfHolon, HOLON_LEVELS, registeredLanguages } from "../adapters/text/grammar.js";
import { HONORIFIC_TITLES, SUBORDINATING_CONJUNCTIONS } from "../adapters/text/priors.js";
import { OCCUPANCY_TRANSITIONS_EN } from "../adapters/text/occupancy-testimony.js";

test("English comes online at each holonic level it has a grammar for, each organ the one that already exists with its giver", () => {
  assert.deepEqual(registeredLanguages(), ["en"]);
  const name = grammarAt("en", "name"); assert.equal(name.titles, HONORIFIC_TITLES); assert.equal(name.titlesGiver, "lang/en"); assert.equal(typeof name.spans, "function"); assert.equal(typeof name.nesting, "function");
  const clause = grammarAt("en-US", "clause"); assert.equal(clause.subordinators, SUBORDINATING_CONJUNCTIONS); assert.equal(clause.transitions, OCCUPANCY_TRANSITIONS_EN); assert.equal(typeof clause.spans, "function");
  assert.equal(typeof grammarAt("en", "sentence").split, "function");
  assert.ok(grammarAt("en", "phrase").prepositions.has("among"));
});

test("a language with no grammar is a typed gap, never an English attempt; a level with no grammar says why", () => {
  assert.equal(grammarFor("ru").gap.reason, "no_grammar_for_language"); assert.deepEqual(grammarFor("ru").gap.registered, ["en"]);
  assert.equal(grammarFor(null).gap.reason, "no_language_declared");
  assert.equal(grammarAt("ru", "clause").gap.reason, "no_grammar_for_language");
  assert.equal(grammarAt("en", "paragraph").gap.reason, "no_grammar_at_level"); assert.match(grammarAt("en", "paragraph").gap.detail, /convention of the script/);
  assert.equal(grammarAt("en", "verse").gap.reason, "unknown_level");
});

test("a holon address says which level it is read at", () => {
  assert.equal(levelOfHolon("/"), "document"); assert.equal(levelOfHolon("/p3"), "paragraph"); assert.equal(levelOfHolon("/p3/s12"), "sentence"); assert.equal(levelOfHolon("/p3/s12/c2"), "clause"); assert.equal(levelOfHolon("/sec2/p1"), "paragraph"); assert.equal(levelOfHolon("/x9"), null);
  assert.deepEqual(HOLON_LEVELS.slice(0, 4), ["name", "phrase", "clause", "sentence"]);
});
