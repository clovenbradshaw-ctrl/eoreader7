// native/tests/reading-surface.test.js — the FORM-TIER (schema/image/fold):
// a bound sentence reports what the READING supplied over the BYTES it
// certified. The addresses certify the image; the `supplied` rows name the
// form the reading supplied there (the hypothetical's ground/consequence, the
// sequence) with the material's own image that invoked it. When no form
// overlaps the bound span, `supplied` is absent — the reading supplied no
// rule beyond the ends themselves (a silence, never a fabricated rule).
import { test } from "node:test";
import assert from "node:assert/strict";
import { groundOf } from "../the-fold/ground-ladder.js";
import { sentenceSurface, SURFACE_SCHEMA } from "../the-fold/reading-surface.js";

const SENT = "Napoleon crossed the river, so that the war began.";

test("a bound claim whose span overlaps a form's span reports the supplied form + its image", () => {
  const claims = [{ sentence: SENT, end1: "Napoleon", label: "crossed", end2: "the river", verdict: "bound", spans: [{ ref: "src.txt", start: 0, end: 50 }] }];
  const forms = [{ form: "hypothetical", side: "consequent", image: "so that", language: "en", ref: "src.txt", span: { start: 20, end: 50 } }];
  const g = groundOf(SENT, { claims, forms });
  assert.equal(g.tier, "bound");
  assert.equal(g.supplied.length, 1, "the form the reading supplied is disclosed");
  assert.equal(g.supplied[0].form, "hypothetical");
  assert.equal(g.supplied[0].side, "consequent");
  assert.equal(g.supplied[0].image, "so that", "the material's own image is named");
  assert.equal(g.supplied[0].language, "en");
});

test("no form overlapping the bound span means supplied is absent — never a fabricated rule", () => {
  const claims = [{ sentence: SENT, end1: "Napoleon", label: "crossed", end2: "the river", verdict: "bound", spans: [{ ref: "src.txt", start: 0, end: 10 }] }];
  const forms = [{ form: "hypothetical", side: "consequent", image: "so that", language: "en", ref: "src.txt", span: { start: 40, end: 50 } }];
  const g = groundOf(SENT, { claims, forms });
  assert.equal(g.tier, "bound");
  assert.deepEqual(g.supplied, [], "no overlap, no supplied rule");
});

test("a form from a DIFFERENT passage is never credited to this bound sentence", () => {
  const claims = [{ sentence: SENT, end1: "Napoleon", label: "crossed", end2: "the river", verdict: "bound", spans: [{ ref: "other.txt", start: 0, end: 50 }] }];
  const forms = [{ form: "hypothetical", side: "consequent", image: "so that", language: "en", ref: "src.txt", span: { start: 0, end: 50 } }];
  const g = groundOf(SENT, { claims, forms });
  assert.deepEqual(g.supplied, [], "a foreign passage's form is never the rule here");
});

test("the reading surface carries the supplied forms per sentence and the schema is @2", () => {
  const surface = sentenceSurface(SENT, {
    claims: [{ sentence: SENT, end1: "Napoleon", label: "crossed", end2: "the river", verdict: "bound", spans: [{ ref: "src.txt", start: 0, end: 50 }] }],
    forms: [{ form: "hypothetical", side: "consequent", image: "so that", language: "en", ref: "src.txt", span: { start: 20, end: 50 } }],
    resolveName: () => new Set(),
    splitSentences: (t) => [t],
  });
  assert.equal(surface.schema, "EOReadingSurface@2");
  assert.equal(SURFACE_SCHEMA, "EOReadingSurface@2");
  const row = surface.rows.find((r) => r.tier === "bound");
  assert.ok(row, "the sentence is bound");
  assert.equal(row.supplied.length, 1, "the row carries the supplied form");
  assert.equal(row.supplied[0].image, "so that");
});