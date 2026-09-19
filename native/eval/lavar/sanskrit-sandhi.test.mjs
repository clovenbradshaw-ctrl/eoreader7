// sanskrit-sandhi.test.mjs — the sandhi instrument, falsified (2026-09-18).
// Rules propose, the prior disposes: every accept needs all parts attested
// in the fixture prior; unattested parts die quietly. Fixture tallies are
// unit-scope (hand-declared, same class as sanskrit.test.mjs fixtures).
import test from "node:test";
import assert from "node:assert/strict";
import { splitSurface } from "./sanskrit-sandhi.mjs";

const P = { forms: {
  tvā: { PRON: 65 }, agne: { NOUN: 40 }, agniḥ: { NOUN: 12 },
  dive: { NOUN: 8 }, devaḥ: { NOUN: 30 }, devas: { NOUN: 2 },
  tava: { PRON: 25 }, etat: { PRON: 18 }, nadi: { NOUN: 6 }, atra: { ADV: 9 },
  te: { PRON: 20 }, api: { PART: 12 }, sā: { PRON: 14 }, asti: { VERB: 30 },
} };

const has = (splits, parts, rule) => splits.some((s) => s.rule === rule && s.parts.join("+") === parts.join("+"));

test("dīrgha: tvāgne inverts to tvā+agne (and only attested pairs)", () => {
  const s = splitSurface("tvāgne", P);
  assert.ok(has(s, ["tvā", "agne"], "dīrgha"), `tvā+agne accepted: ${JSON.stringify(s)}`);
  assert.ok(!s.some((x) => x.parts.some((p) => !P.forms[p.toLowerCase()])), "every accepted part attested");
});

test("avagraha: 'gne restores agne; U'V splits", () => {
  assert.deepEqual(splitSurface("'gne", P), [{ parts: ["agne"], rule: "avagraha" }]);
  const s = splitSurface("te'pi", P);
  assert.ok(s.some((x) => x.parts.join("+") === "te+api"), "te + api");
});

test("hyphen: dive-dive splits mechanically with attested parts", () => {
  assert.deepEqual(splitSurface("dive-dive", P), [{ parts: ["dive", "dive"], rule: "hyphen" }]);
  assert.deepEqual(splitSurface("dive-xyz", P), [], "unattested part kills the split");
});

test("ru-o: devo restores devaḥ (single part — the treebank writes visarga)", () => {
  assert.deepEqual(splitSurface("devo", P), [{ parts: ["devaḥ"], rule: "ru-o" }]);
});

test("yaṇ: nadyatra inverts to nadi+atra", () => {
  const s = splitSurface("nadyatra", P);
  assert.ok(has(s, ["nadi", "atra"], "yaṇ"), `nadi+atra accepted: ${JSON.stringify(s)}`);
});

test("vṛddhi: tavaitat inverts to tava+etat", () => {
  const s = splitSurface("tavait at".replace(" ", ""), P);
  assert.ok(has(s, ["tava", "etat"], "vṛddhi"), `tava+etat accepted: ${JSON.stringify(s)}`);
});

test("guṇa: surface e/o invert to a+i / a+u", () => {
  const q = { forms: { ...P.forms, vara: { NOUN: 5 }, iti: { PART: 7 }, devo2: { NOUN: 1 } } };
  const s = splitSurface("vareti", { forms: { vara: { NOUN: 5 }, iti: { PART: 7 } } });
  assert.ok(has(s, ["vara", "iti"], "guṇa"), `vara+iti accepted: ${JSON.stringify(s)}`);
});

test("unattested surfaces yield gaps, never guesses", () => {
  assert.deepEqual(splitSurface("tavet", P), [], "tavet: no rule yields attested parts — stays a gap (honest)");
  assert.deepEqual(splitSurface("xyzabc", P), [], "unknown surface: no split");
  assert.deepEqual(splitSurface("agne", P), [], "already a wordform: no self-split offered");
});
