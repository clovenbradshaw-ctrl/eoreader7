import test from "node:test";
import assert from "node:assert/strict";
import { nameSpans, nameNesting } from "../adapters/text/name-spans.js";

test("a name is a tree: the head is the root, titles / particles / givens subordinate to it", () => {
  const s = nameSpans("Count Cyril Vladímirovich Bezúkhov");
  assert.deepEqual(s.map((x) => [x.text, x.relation, x.parentIndex]), [["Count", "title", 3], ["Cyril", "given", 3], ["Vladímirovich", "given", 3], ["Bezúkhov", "head", null]]);
  assert.deepEqual(nameSpans("Ludwig van Beethoven").map((x) => x.relation), ["given", "particle", "head"]);
  assert.deepEqual(nameSpans("Pierre").map((x) => x.relation), ["head"]);
  assert.deepEqual(nameSpans("the Count"), [], "a title alone is a description, not a name");
});

test("full nesting: titles and particles are decoration, never identity", () => {
  assert.equal(nameNesting("Monsieur Pierre", "Pierre").level, "full");
  assert.equal(nameNesting("Count Bezúkhov", "Bezukhov").level, "full");
  assert.equal(nameNesting("Dr Mensah", "Professor Mensah").level, "full");
});

test("the walls surfaces.js learned the hard way, read off structure instead of bags of tokens", () => {
  // T5: a shared patronymic alone is not one person
  assert.equal(nameNesting("Katerina Ivanovna", "Alyona Ivanovna").level, "none");
  // P251: a dropped middle name, or a different person — not decidable from the names
  assert.equal(nameNesting("John Adams", "John Quincy Adams").level, "prefix");
  // the v6 Bezúkhov case: two beings under one family, siblings — never nested
  assert.equal(nameNesting("Pierre Bezúkhov", "Count Cyril Vladímirovich Bezúkhov").level, "none");
  // a bare head is a family reference; a bare given is a first-name reference — both ambiguous, both typed
  assert.equal(nameNesting("Bezúkhov", "Pierre Bezúkhov").level, "head");
  assert.equal(nameNesting("Pierre", "Pierre Bezúkhov").level, "given");
  assert.equal(nameNesting("Natasha", "Pierre Bezúkhov").level, "none");
});
