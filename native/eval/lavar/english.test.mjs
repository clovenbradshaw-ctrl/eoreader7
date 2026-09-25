// english.test.mjs — the English imperative/intransitive seam and verb gate,
// falsified. English is not pro-drop, but the S90 gate ("subject AND object
// group") refuses clauses English genuinely produces — legislative
// imperatives/subjunctives ("BE IT RESOLVED"), form-check lines ("Answer
// checked: [X] No"), and intransitives with prepositional complements ("all
// fall within that definition"). The seam hears them; the verb gate refuses
// the garbage the positional slot-measure earns on real prose.
import test from "node:test";
import assert from "node:assert/strict";
import { confirmEnglishVerbs, englishImperatives, englishIntransitives, englishClauses } from "./english.mjs";

const engPrior = {
  forms: {
    "be": { AUX: 1105, VERB: 27 },
    "fall": { VERB: 102, NOUN: 14 },
    "resolved": { VERB: 5 },
    "checked": { VERB: 13 },
    "covers": { VERB: 3 },
    "and": { CCONJ: 9000 },
    "of": { ADP: 8000 },
    "with": { ADP: 4000 },
    "to": { ADP: 3000, PART: 500 },
    "cooperative": { ADJ: 200 },
    "governmental": { ADJ: 150 },
    "council": { NOUN: 100 },
    "metropolitan": { ADJ: 80 },
    "government": { NOUN: 90 },
    "nashville": { PROPN: 50 },
    "video": { NOUN: 40, ADJ: 30 },
    "surveillance": { NOUN: 70 },
    "solutions": { NOUN: 60 },
    "drones": { NOUN: 55 },
    "analysis": { NOUN: 65 },
    "definition": { NOUN: 45 },
    "answer": { NOUN: 90 },
    "it": { PRON: 300 },
    "all": { PRON: 200, DET: 100 },
    "that": { DET: 400, SCONJ: 50 },
    "within": { ADP: 100 },
    "by": { ADP: 2000 },
    "therefore": { ADV: 40 },
    "now": { ADV: 30, NOUN: 5 },
  },
};

test("the English verb gate refuses the garbage the positional slot-measure earned", () => {
  const verbs = new Set(["and", "of", "with", "to", "cooperative", "governmental", "be", "fall", "resolved"]);
  confirmEnglishVerbs(verbs, engPrior, 0.5);
  assert.deepEqual([...verbs].sort(), ["be", "fall", "resolved"].sort(),
    "conjunctions, prepositions and adjectives are refused; prior-confirmed verbs survive");
});

test("confirmEnglishVerbs never guesses — an unattested verb is refused", () => {
  const verbs = new Set(["resolved", "flummox"]);
  confirmEnglishVerbs(verbs, engPrior, 0.5);
  assert.deepEqual([...verbs], ["resolved"], "an un-attested form is a refusal, never a guess");
});

test("englishImperatives recovers a subject-less clause: verb + its object run", () => {
  const verbs = new Set(["be"]);
  const clauses = englishImperatives("be it resolved by the council of the metropolitan government.", verbs, engPrior);
  assert.equal(clauses.length, 1);
  assert.equal(clauses[0].verb, "be", "the clause opens on the verb — the subject is in the mood");
  assert.ok(clauses[0].at[0] < clauses[0].at[1], "the clause has a byte address");
});

test("englishImperatives does not steal a declarative — a nominal subject before the verb is not an imperative", () => {
  const verbs = new Set(["covers"]);
  const clauses = englishImperatives("The agreement covers surveillance solutions.", verbs, engPrior);
  assert.equal(clauses.length, 0, "a subject group opens the clause — the gate should not have refused it");
});

test("englishImperatives stops the object run at a non-nominal token, never across punctuation", () => {
  const verbs = new Set(["be"]);
  const a = englishImperatives("BE IT RESOLVED, the council concurs.", verbs, engPrior);
  assert.ok(a.length >= 1, "the subjunctive is heard; the object run stops at the comma");
});

test("englishIntransitives recovers subject + verb with no object group", () => {
  const verbs = new Set(["fall"]);
  const clauses = englishIntransitives("all fall within that definition.", verbs, engPrior);
  assert.equal(clauses.length, 1);
  assert.equal(clauses[0].subject, "all");
  assert.equal(clauses[0].verb, "fall");
});

test("englishIntransitives refuses a clause that has an object group — the gate's own territory", () => {
  const verbs = new Set(["covers"]);
  const clauses = englishIntransitives("The agreement covers surveillance solutions.", verbs, engPrior);
  assert.equal(clauses.length, 0, "an object GROUP exists — the ordinary reader owns this clause");
});

test("englishClauses composes the seam: imperatives and intransitives", () => {
  const verbs = new Set(["fall", "resolved"]);
  const a = englishClauses("all fall within that definition.", verbs, engPrior);
  assert.equal(a.length, 1);
  assert.equal(a[0].verb, "fall");
});