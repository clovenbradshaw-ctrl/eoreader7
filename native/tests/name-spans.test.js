import test from "node:test";
import assert from "node:assert/strict";
import { nameSpans, nameNesting, PATRONYMIC_RU, namePartsFrom } from "../adapters/text/name-spans.js";
import { readFileSync, existsSync } from "node:fs";

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
  assert.equal(nameSpans("John Aldrich", ru).map((x) => x.relation).join(","), "given,head", "an English family name in -ich is never read as a patronymic");
  // T5 again, now read as two heads under one father: still none
  assert.equal(nameNesting("Katerina Ivanovna", "Alyona Ivanovna", ru).level, "none");
  // given + patronymic is a first-name reference narrowed to one father
  const n = nameNesting("Cyril Vladímirovich", "Count Cyril Vladímirovich Bezúkhov", ru);
  assert.equal(n.level, "given"); assert.equal(n.patronymicAgrees, true);
  assert.equal(nameNesting("Cyril Ivanovich", "Count Cyril Vladímirovich Bezúkhov", ru).level, "none", "the same given under two fathers is two beings");
  assert.equal(nameNesting("Cyril Bezúkhov", "Count Cyril Vladímirovich Bezúkhov", ru).level, "prefix", "a dropped patronymic is a dropped middle part — not decidable from the names");
  assert.equal(nameNesting("Pierre Bezúkhov", "Count Cyril Vladímirovich Bezúkhov", ru).level, "none");
});

test("the parts of a name are a reading prior: en + mul + ru composed from live_priors reads exactly what the code-side defaults read, and an undeclared prior is refused", () => {
  const dir = "/home/user/live_priors/derived-priors/name-priors";
  const load = (f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
  if (!existsSync(`${dir}/name-parts-ru.json`)) { console.log("live_priors not beside this checkout — the composition is checked against an in-test prior only"); }
  // the fallback carries the file's own suffix list, so CI without the sibling repo checks the same composition
  const ru = existsSync(`${dir}/name-parts-ru.json`) ? load("name-parts-ru.json") : { schema: "NamePartsPrior@1", language: "ru", provenance: { giver: "test" }, patronymic: { suffixes: ["ovich", "evich", "yich", "ovna", "evna", "ichna", "inichna"], minLength: 6 } };
  const en = existsSync(`${dir}/name-parts-en.json`) ? load("name-parts-en.json") : { schema: "NamePartsPrior@1", language: "en", provenance: { giver: "test" }, titles: ["count", "prince"] };
  const mul = existsSync(`${dir}/name-parts-mul.json`) ? load("name-parts-mul.json") : { schema: "NamePartsPrior@1", language: "mul", provenance: { giver: "test" }, particles: ["van"] };
  const parts = namePartsFrom(en, mul, ru);
  assert.deepEqual(parts.languages, ["en", "mul", "ru"]); assert.equal(parts.givers.length, 3);
  assert.deepEqual(nameSpans("Count Cyril Vladímirovich Bezúkhov", parts).map((x) => x.relation), ["title", "given", "patronymic", "head"]);
  assert.deepEqual(nameSpans("Ludwig van Beethoven", parts).map((x) => x.relation), ["given", "particle", "head"]);
  assert.equal(parts.patronymic("aldrich"), false, "the bare -ich is not in the class: an English family name is never a patronymic");
  assert.deepEqual(nameSpans("John Aldrich", parts).map((x) => x.relation), ["given", "head"]);
  assert.equal(parts.patronymic("ilyich"), true, "-yich is kept"); assert.equal(parts.patronymic("kuzmich"), false, "the disclosed loss");
  for (const n of ["Vladímirovich", "Ivanovna", "Aldrich", "Bezúkhov", "Petrovich", "Ilyich", "Kuzmich"]) assert.equal(parts.patronymic(n.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()), PATRONYMIC_RU(n.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()), n);
  assert.equal(nameNesting("Cyril Vladímirovich", "Count Cyril Vladímirovich Bezúkhov", parts).patronymicAgrees, true);
  assert.throws(() => namePartsFrom({ language: "xx" }), /NamePartsPrior@1/);
  assert.equal(namePartsFrom(en).patronymic, null, "a composition with no patronymic prior types no patronymic");
});
