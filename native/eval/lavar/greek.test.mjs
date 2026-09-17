// greek.test.mjs — the Greek pro-drop seam and verb gate, falsified.
// The positional reader cannot hear a pro-drop clause (Ancient Greek
// grammaticalizes its subject in the verb) and earns garbage "verbs" on free
// word order; the seam recovers the clause and the gate refuses the garbage.
import test from "node:test";
import assert from "node:assert/strict";
import { prodropClauses, confirmedVerbSet, confirmGreekVerbs, nominalClass } from "./greek.mjs";

const grcPrior = {
  forms: {
    "καὶ": { CCONJ: 9237, ADV: 1070 },
    "τὸ": { DET: 2183 },
    "θέλω": { VERB: 36 },
    "γίνεται": { VERB: 8 },
    "ἄφες": { VERB: 2 },
    "χωρίον": { NOUN: 30 },
    "παιδίον": { NOUN: 25 },
    "τοὺς": { DET: 100 },
    "ἐπιλογισμούς": { NOUN: 4 },
    "source": { X: 5 },
    "γὰρ": { SCONJ: 40 },
    "οὕτως": { ADV: 60 },
  },
};

test("the verb gate refuses the garbage the positional slot-measure earned", () => {
  const verbs = new Set(["καὶ", "τὸ", "source", "θέλω", "γίνεται", "ἄφες"]);
  confirmGreekVerbs(verbs, grcPrior, 0.5);
  assert.deepEqual([...verbs].sort(), ["ἄφες", "γίνεται", "θέλω"].sort(),
    "articles, conjunctions and English keys are refused; prior-confirmed verbs survive");
});

test("confirmedVerbSet is mechanical: (VERB+AUX)/total above the share floor", () => {
  const c = confirmedVerbSet(grcPrior, 0.5);
  for (const f of ["θέλω", "γίνεται", "ἄφες"]) assert.ok(c.has(f), `${f} is VERB-dominant`);
  for (const f of ["καὶ", "τὸ", "source"]) assert.ok(!c.has(f), `${f} is not a verb`);
});

test("prodropClauses recovers a subject-less clause: verb + its case-marked object", () => {
  const verbs = new Set(["ἄφες"]);
  const clauses = prodropClauses("ἄφες τοὺς τοιούτους ἐπιλογισμούς.", verbs, grcPrior);
  assert.equal(clauses.length, 1);
  assert.equal(clauses[0].verb, "ἄφες");
  assert.equal(clauses[0].object, "τοὺς τοιούτους ἐπιλογισμούς");
  assert.ok(clauses[0].at[0] < clauses[0].at[1], "the object has a byte address");
});

test("prodropClauses stops the object run at a non-nominal token, never across punctuation", () => {
  const verbs = new Set(["ἄφες"]);
  // "καὶ" is a conjunction (non-nominal) → the run ends before it.
  const a = prodropClauses("ἄφες τοὺς ἐπιλογισμούς καὶ τὸ παιδίον", verbs, grcPrior);
  assert.equal(a[0].object, "τοὺς ἐπιλογισμούς");
  // punctuation ends the run and the clause.
  const b = prodropClauses("ἄφες τοὺς ἐπιλογισμούς. τὸ παιδίον", verbs, grcPrior);
  assert.equal(b[0].object, "τοὺς ἐπιλογισμούς");
});

test("prodropClauses returns a verb-only clause when there is no nominal object", () => {
  const verbs = new Set(["γίνεται"]);
  const clauses = prodropClauses("γίνεται γὰρ οὕτως.", verbs, grcPrior);
  assert.equal(clauses.length, 1);
  assert.equal(clauses[0].verb, "γίνεται");
  assert.equal(clauses[0].object, null, "an intransitive clause is still a complete clause — recorded, not refused");
});

test("prodropClauses emits nothing when no earned verb is present", () => {
  const verbs = new Set(["γίνεται"]);
  assert.deepEqual(prodropClauses("τὸ χωρίον ἐστὶν μέγα", verbs, grcPrior), []);
});

test("nominalClass reads the prior's dominant class mechanically", () => {
  assert.equal(nominalClass("χωρίον", grcPrior), "NOUN");
  assert.equal(nominalClass("γίνεται", grcPrior), "VERB");
  assert.equal(nominalClass("unattested-form", grcPrior), null);
});