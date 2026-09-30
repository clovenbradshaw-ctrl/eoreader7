// parmenides.test.mjs — Parmenides, the archon of being: same vs other.
// Pure; the equivalence organs are injected. The value layer uses the real
// CLDR-backed resolver (Intl), so the omnilingual claims are tested against
// real generated month maps, not fixtures.

import { test } from "node:test";
import assert from "node:assert/strict";
import { makeParmenides, VERDICTS, FORMS } from "./parmenides.js";
import { makeParmenidesForms } from "./parmenides-forms.js";

const fold = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").toLowerCase().trim();
const sameAct = (s) => ({ "withdraws": "withdraw", "withdrew": "withdraw", "burn": "burn", "burns": "burn" })[fold(s)] ?? null;
const referentIndex = {
  resolve: (s) => {
    const m = { "bezukhov": "r:pierre", "bezúkhov": "r:pierre", "natasha": "r:natasha", "natasha rostova": "r:natasha" };
    return m[fold(s)] ?? null;
  },
};

const values = makeParmenidesForms();
const parmenides = makeParmenides({ fold, sameAct, referentIndex, values });

test("surface identity: a diacritic-folded name is the same form (Rostopchín ≡ Rostopchin)", () => {
  const r = parmenides.same("Rostopchín", "Rostopchin");
  assert.equal(r.verdict, VERDICTS.SAME);
  assert.equal(r.via, FORMS.SURFACE);
});

test("act identity: a verb and its inflection participate in one lemma (withdraws ≡ withdrew)", () => {
  const r = parmenides.same("withdraws", "withdrew");
  assert.equal(r.verdict, VERDICTS.SAME);
  assert.equal(r.via, FORMS.ACT);
});

test("value identity: a numeric English date and its canonical form are one form", () => {
  const r = parmenides.same("August 26, 1812", "26 August 1812");
  assert.equal(r.verdict, VERDICTS.SAME);
  assert.equal(r.via, FORMS.VALUE);
});

test("value identity is OMNILINGUAL: a Russian surface and an English surface are one form", () => {
  const ru = parmenides.same("26 августа 1812 года", "August 26, 1812");
  assert.equal(ru.verdict, VERDICTS.SAME, "Russian numeric surface participates in the same generated form as English");
  assert.equal(ru.via, FORMS.VALUE);
});

test("value identity: two different dates are OTHER, not a fuzzy near-miss", () => {
  const r = parmenides.same("September 2, 1812", "August 26, 1812");
  assert.equal(r.verdict, VERDICTS.OTHER);
  assert.equal(r.via, FORMS.VALUE);
});

test("being identity: a name and its accented variant are one being, through the referent index (P11)", () => {
  const r = parmenides.same("Bezukhov", "Bezúkhov");
  assert.equal(r.verdict, VERDICTS.SAME);
  assert.equal(r.via, FORMS.BEING);
});

test("a sameness no admitted form supports is REFUSED, never SAME (II.7: appearance is not identity)", () => {
  // "quixote" and "kixote" look alike to a string metric; no form layer admits them.
  const bare = makeParmenides({ fold: null, sameAct: null, referentIndex: null, values: null });
  const r = bare.same("quixote", "kixote");
  assert.equal(r.verdict, VERDICTS.REFUSED);
});

test("word-numbered days are the disclosed lexical residue: a typed gap, never a guess", () => {
  const r = values.resolve("the twenty-sixth of August");
  assert.ok(r.gap, "word-numbered day is a typed gap");
  assert.equal(r.gap, "day_not_numeric_or_out_of_range");
});

test("the value resolver is omnilingual for month names — it finds the month in ANY generated map without language detection", () => {
  for (const [surface, want] of [["26 августа 1812", "1812-08-26"], ["26. August 1812", "1812-08-26"], ["1812年8月26日", null]]) {
    const r = values.resolve(surface, { year: 1812 });
    if (want) assert.equal(r.value, want, surface);
    else assert.ok(r.gap, "no year context given, ja surface has no latin year");
  }
});

test("KIND identity (P79): the same surface instantiating different kinds is OTHER, never SAME", () => {
  const kindOf = (s) => ({ mars: "planet", "mars (god)": "deity", venus: "planet" })[fold(s)] ?? null;
  const r = parmenides.sameKind("mars", "mars (god)", kindOf);
  assert.equal(r.verdict, VERDICTS.OTHER);
  assert.deepEqual(r.kind, ["planet", "deity"]);
  const same = parmenides.sameKind("mars", "venus", kindOf);
  assert.equal(same.verdict, VERDICTS.SAME);
  assert.equal(same.kind, "planet");
});