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

test("the patronymic (2026-09-28): read by POSITION or by a STEM the reader has established — never by the ending alone; the endings are a candidate class from a declared prior", () => {
  const ru = { patronymic: PATRONYMIC_RU };
  // position: the middle of given · patronymic · family needs no established father
  assert.deepEqual(nameSpans("Count Cyril Vladímirovich Bezúkhov", ru).map((x) => x.relation), ["title", "given", "patronymic", "head"]);
  // stem: a two-token name is given + patronymic only when the ending strips to a given name the reader knows
  assert.deepEqual(nameSpans("Katerina Ivanovna", ru).map((x) => [x.text, x.relation]), [["Katerina", "given"], ["Ivanovna", "head"]], "no Ivan established: given + head, as a reader who has never met an Ivan would read it");
  assert.deepEqual(nameSpans("Katerina Ivanovna", { ...ru, givenNames: new Set(["Ivan"]) }).map((x) => [x.text, x.relation]), [["Katerina", "head"], ["Ivanovna", "patronymic"]], "Ivan established: the patronymic points at him and Katerina is the head");
  // how a person tells Aldrich from Ivanovich: not the ending — Aldrich BEGAN as a patronymic — but that no Aldr is anyone's given name here, and it sits where a family name sits
  assert.deepEqual(nameSpans("John Aldrich", { ...ru, givenNames: new Set(["John", "Ivan", "Pyotr"]) }).map((x) => x.relation), ["given", "head"]);
  assert.equal(PATRONYMIC_RU("aldrich"), false); assert.equal(PATRONYMIC_RU("aldrich", { nameIndex: 1, nameCount: 2, givenNames: new Set(["john"]) }), false);
  // a dropped final vowel in the father's name: Kuzma -> Kuzmich, Ilya -> Ilyich, Nikita -> Nikitich
  assert.equal(PATRONYMIC_RU("kuzmich", { givenNames: new Set(["Kuzma"]) }), true);
  assert.equal(PATRONYMIC_RU("ilyich", { givenNames: new Set(["Ilya"]) }), true);
  assert.equal(PATRONYMIC_RU("nikitich", { givenNames: new Set(["Nikita"]) }), true);
  assert.equal(PATRONYMIC_RU("kuzmich", { givenNames: new Set(["Pierre"]) }), false, "an ending pointing at nobody the reader knows is not a patronymic");
  assert.deepEqual(nameSpans("Katerina Ivanovna").map((x) => x.relation), ["given", "head"], "undeclared, byte-identical to before");
  // T5 again: two heads under one father, still none
  assert.equal(nameNesting("Katerina Ivanovna", "Alyona Ivanovna", { ...ru, givenNames: new Set(["Ivan"]) }).level, "none");
  const n = nameNesting("Cyril Vladímirovich", "Count Cyril Vladímirovich Bezúkhov", { ...ru, givenNames: new Set(["Vladímir"]) });
  assert.equal(n.level, "given"); assert.equal(n.patronymicAgrees, true);
  assert.equal(nameNesting("Cyril Ivanovich", "Count Cyril Vladímirovich Bezúkhov", { ...ru, givenNames: new Set(["Ivan", "Vladímir"]) }).level, "none", "the same given under two fathers is two beings");
  assert.equal(nameNesting("Cyril Bezúkhov", "Count Cyril Vladímirovich Bezúkhov", ru).level, "prefix", "a dropped patronymic is a dropped middle part — not decidable from the names");
  assert.equal(nameNesting("Pierre Bezúkhov", "Count Cyril Vladímirovich Bezúkhov", ru).level, "none");
});

test("the parts of a name are a reading prior: en + mul + ru composed from live_priors reads exactly what the code-side defaults read, and an undeclared prior is refused", () => {
  const dir = "/home/user/live_priors/derived-priors/name-priors";
  const load = (f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
  if (!existsSync(`${dir}/name-parts-ru.json`)) { console.log("live_priors not beside this checkout — the composition is checked against an in-test prior only"); }
  // the fallbacks carry the files' own lists, so CI without the sibling repo checks the same composition
  const ru = existsSync(`${dir}/name-parts-ru.json`) ? load("name-parts-ru.json") : { schema: "NamePartsPrior@1", language: "ru", provenance: { giver: "test" }, patronymic: { suffixes: ["ovich", "evich", "yich", "ich", "ovna", "evna", "ichna", "inichna"], minLength: 6 } };
  const en = existsSync(`${dir}/name-parts-en.json`) ? load("name-parts-en.json") : { schema: "NamePartsPrior@1", language: "en", provenance: { giver: "test" }, titles: ["count", "prince"] };
  const mul = existsSync(`${dir}/name-parts-mul.json`) ? load("name-parts-mul.json") : { schema: "NamePartsPrior@1", language: "mul", provenance: { giver: "test" }, particles: ["van"] };
  const parts = namePartsFrom(en, mul, ru);
  assert.deepEqual(parts.languages, ["en", "mul", "ru"]); assert.equal(parts.givers.length, 3);
  assert.deepEqual(nameSpans("Count Cyril Vladímirovich Bezúkhov", parts).map((x) => x.relation), ["title", "given", "patronymic", "head"]);
  assert.deepEqual(nameSpans("Ludwig van Beethoven", parts).map((x) => x.relation), ["given", "particle", "head"]);
  assert.deepEqual(nameSpans("John Aldrich", parts).map((x) => x.relation), ["given", "head"]);
  const fold = (n) => n.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  for (const n of ["Vladímirovich", "Ivanovna", "Aldrich", "Bezúkhov", "Petrovich", "Ilyich", "Kuzmich"]) for (const ctx of [{}, { nameIndex: 1, nameCount: 3 }, { givenNames: new Set(["Ivan", "Kuzma", "Ilya", "Pyotr"]) }]) assert.equal(parts.patronymic(fold(n), ctx), PATRONYMIC_RU(fold(n), ctx), `${n} ${JSON.stringify([...(ctx.givenNames ?? [])])}`);
  assert.equal(nameNesting("Cyril Vladímirovich", "Count Cyril Vladímirovich Bezúkhov", { ...parts, givenNames: new Set(["Vladímir"]) }).patronymicAgrees, true);
  assert.throws(() => namePartsFrom({ language: "xx" }), /NamePartsPrior@1/);
  assert.equal(namePartsFrom(en).patronymic, null, "a composition with no patronymic prior types no patronymic");
});
