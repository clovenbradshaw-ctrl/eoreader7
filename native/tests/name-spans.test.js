import test from "node:test";
import assert from "node:assert/strict";
import { nameSpans, nameNesting, PATRONYMIC_RU } from "../adapters/text/name-spans.js";

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

test("the patronymic class (2026-09-28): declared per language, never on by default; never a head; compared in its place", () => {
  const ru = { patronymic: PATRONYMIC_RU };
  assert.deepEqual(nameSpans("Count Cyril Vladímirovich Bezúkhov", ru).map((x) => x.relation), ["title", "given", "patronymic", "head"]);
  assert.deepEqual(nameSpans("Katerina Ivanovna", ru).map((x) => [x.text, x.relation]), [["Katerina", "head"], ["Ivanovna", "patronymic"]], "with no family name the given is the head, the patronymic subordinate");
  assert.deepEqual(nameSpans("Katerina Ivanovna").map((x) => x.relation), ["given", "head"], "undeclared, byte-identical to before");
  assert.equal(nameSpans("Aldrich", ru)[0].relation, "head", "an English family name in -ich is not long enough for the class");
  // T5 again, now read as two heads under one father: still none
  assert.equal(nameNesting("Katerina Ivanovna", "Alyona Ivanovna", ru).level, "none");
  // given + patronymic is a first-name reference narrowed to one father
  const n = nameNesting("Cyril Vladímirovich", "Count Cyril Vladímirovich Bezúkhov", ru);
  assert.equal(n.level, "given"); assert.equal(n.patronymicAgrees, true);
  assert.equal(nameNesting("Cyril Ivanovich", "Count Cyril Vladímirovich Bezúkhov", ru).level, "none", "the same given under two fathers is two beings");
  assert.equal(nameNesting("Cyril Bezúkhov", "Count Cyril Vladímirovich Bezúkhov", ru).level, "prefix", "a dropped patronymic is a dropped middle part — not decidable from the names");
  assert.equal(nameNesting("Pierre Bezúkhov", "Count Cyril Vladímirovich Bezúkhov", ru).level, "none");
});
