// sanskrit.test.mjs — the Sanskrit pro-drop seam and verb gate, falsified.
// Mirrors greek.test.mjs's shape; every fixture is Sanskrit-real (IAST,
// verb-final, eight cases, Dual). The L8 regression test pins the lesson:
// normForm preserves ā/ś/ṣ — a strip would merge paradigms.
import test from "node:test";
import assert from "node:assert/strict";
import {
  prodropClauses, confirmedVerbSet, confirmSanskritVerbs, nominalClass,
  sanskritBeings, personOf, personLabel, caseOf, sanskritClauses, beingRefOf,
  paradigmOf, verbGloss, glossLanguages, correlatives, normForm,
} from "./sanskrit.mjs";

const sanPrior = {
  forms: {
    "ca": { CCONJ: 120, ADV: 3 },
    "iti": { PART: 627 },
    "paśyati": { VERB: 41 },
    "gacchati": { VERB: 36 },
    "āha": { VERB: 22 },
    "rājā": { NOUN: 30 },
    "putram": { NOUN: 25 },
    "agninā": { NOUN: 12 },
    "eva": { ADV: 60 },
    "source": { X: 5 },
  },
};

test("L8: normForm lowercases but never strips — ā/ś/ṣ survive", () => {
  assert.equal(normForm("Yogāḥ"), "yogāḥ");
  assert.equal(normForm("Śāstram"), "śāstram");
  assert.equal(normForm("Kṛṣṇa"), "kṛṣṇa");
  assert.notEqual(normForm("yogāḥ"), "yogah", "stripping ā→a would merge declensions (the music run's d5→d bug)");
});

test("the verb gate refuses the garbage the positional slot-measure earned", () => {
  const verbs = new Set(["ca", "iti", "source", "paśyati", "gacchati"]);
  confirmSanskritVerbs(verbs, sanPrior, 0.5);
  assert.deepEqual([...verbs].sort(), ["paśyati", "gacchati"].sort(),
    "conjunctions, quotatives and English keys are refused; prior-confirmed verbs survive");
});

test("confirmedVerbSet is mechanical: (VERB+AUX)/total above the share floor", () => {
  const c = confirmedVerbSet(sanPrior, 0.5);
  for (const f of ["paśyati", "gacchati", "āha"]) assert.ok(c.has(f), `${f} is VERB-dominant`);
  for (const f of ["ca", "iti", "source"]) assert.ok(!c.has(f), `${f} is not a verb`);
});

test("prodropClauses seeks the run BEFORE the verb first (SOV)", () => {
  const verbs = new Set(["paśyati"]);
  const clauses = prodropClauses("rājā putram paśyati.", verbs, sanPrior);
  assert.equal(clauses.length, 1);
  assert.equal(clauses[0].verb, "paśyati");
  assert.equal(clauses[0].object, "rājā putram", "the preverbal nominal run is the object field");
});

test("prodropClauses falls back after the verb when nothing precedes (verse order is free)", () => {
  const verbs = new Set(["paśyati"]);
  const a = prodropClauses("paśyati putram", verbs, sanPrior);
  assert.equal(a[0].object, "putram");
});

test("prodropClauses returns a verb-only clause when there is no nominal run", () => {
  const verbs = new Set(["gacchati"]);
  const clauses = prodropClauses("gacchati eva.", verbs, sanPrior);
  assert.equal(clauses.length, 1);
  assert.equal(clauses[0].object, null, "an intransitive clause is still complete — recorded, not refused");
});

test("nominalClass reads the prior's dominant class mechanically", () => {
  assert.equal(nominalClass("rājā", sanPrior), "NOUN");
  assert.equal(nominalClass("paśyati", sanPrior), "VERB");
  assert.equal(nominalClass("iti", sanPrior), "PART");
  assert.equal(nominalClass("unattested-form", sanPrior), null);
});

test("sanskritBeings discovers a being from bare recurring stems — no article needed", () => {
  const text = "agnir dīpyate. agninā juhoti. agnir yajate.";
  const prior = { forms: { agnir: { NOUN: 10 }, agninā: { NOUN: 4 }, dīpyate: { VERB: 3 }, juhoti: { VERB: 2 }, yajate: { VERB: 2 } } };
  const beings = sanskritBeings(text, prior, { minOccurrences: 2 });
  assert.equal(beings.length, 1);
  assert.deepEqual(beings[0].surfaces, ["agnir", "agninā"], "cased variants of one short stem are one being (LCP>=4, Vedic-tuned)");
  assert.equal(beings[0].occurrences, 3);
});

test("sanskritBeings leaves sandhi-opaque variants split — disclosed, not hidden", () => {
  const prior = { forms: { agnir: { NOUN: 10 }, agnaye: { NOUN: 4 } } };
  const beings = sanskritBeings("agnir dīpyate. agnaye juhoti.", prior, { minOccurrences: 2 });
  assert.equal(beings.length, 0, "agnir/agnaye share 3 chars — the split is the disclosed sandhi residual");
});

test("sanskritBeings refuses a single occurrence and skips the quotative", () => {
  const prior = { forms: { agnir: { NOUN: 10 }, iti: { PART: 5 } } };
  assert.equal(sanskritBeings("agnir iti.", prior, { minOccurrences: 2 }).length, 0);
  assert.equal(sanskritBeings("agnir āgacchati.", prior, { minOccurrences: 2 }).length, 0);
});

// A SanskritCasePrior@1-shaped fixture: 3-char verb endings, 2-char nominals.
const sanCasePrior = {
  schema: "SanskritCasePrior@1", language: "san",
  verbPersonalEndings: {
    ati: { total: 2995, ranked: [{ key: "3|Sing", count: 2935, share: 2935 / 2995, cell: { op: "INS", grain: "Figure", terrain: "Entity", stance: "Making" } }] },
    nti: { total: 1241, ranked: [{ key: "3|Plur", count: 1204, share: 1204 / 1241, cell: { op: "INS", grain: "Figure", terrain: "Entity", stance: "Making" } }] },
    āva: { total: 60, ranked: [{ key: "1|Dual", count: 55, share: 55 / 60, cell: { op: "SIG", grain: "Ground", terrain: "Void", stance: "Clearing" } }] },
    ata: { total: 580, ranked: [{ key: "3|Sing", count: 300, share: 300 / 580, cell: null }] },
  },
  verbVoiceByEnding: {
    ate: { total: 320, ranked: [{ key: "Pass", count: 320, share: 1, cell: { op: "EVA", grain: "Figure", terrain: "Lens", stance: "Binding" } }] },
  },
  verbMoodByEnding: {
    ati: { total: 2995, ranked: [{ key: "Ind", count: 2965, share: 2965 / 2995, cell: { op: "EVA", grain: "Ground", terrain: "Atmosphere", stance: "Tending" } }] },
    yāt: { total: 862, ranked: [{ key: "Opt", count: 845, share: 845 / 862, cell: { op: "EVA", grain: "Ground", terrain: "Atmosphere", stance: "Tending" } }] },
  },
  verbTenseByEnding: {
    ati: { total: 2995, ranked: [{ key: "Pres", count: 2905, share: 2905 / 2995, cell: { op: "EVA", grain: "Figure", terrain: "Lens", stance: "Binding" } }] },
  },
  nominalEndings: {
    "jā": { total: 500, ranked: [{ key: "Nom|Sing", count: 420, share: 0.84, cell: { op: "SEG", grain: "Figure", terrain: "Link", stance: "Dissecting" } }] },
    am: { total: 400, ranked: [{ key: "Acc|Sing", count: 340, share: 0.85, cell: { op: "CON", grain: "Figure", terrain: "Link", stance: "Binding" } }] },
    "aḥ": { total: 900, ranked: [{ key: "Nom|Sing", count: 513, share: 0.57, cell: { op: "SEG", grain: "Figure", terrain: "Link", stance: "Dissecting" } }, { key: "Gen|Sing", count: 200, share: 0.22, cell: null }] },
    "āḥ": { total: 900, ranked: [{ key: "Nom|Plur", count: 594, share: 0.66, cell: { op: "SEG", grain: "Figure", terrain: "Link", stance: "Dissecting" } }] },
    ah: { total: 100, ranked: [{ key: "Gen|Plur", count: 60, share: 0.6, cell: null }] },
    "nā": { total: 300, ranked: [{ key: "Ins|Sing", count: 291, share: 0.97, cell: { op: "CON", grain: "Ground", terrain: "Field", stance: "Tending" } }] },
    "oḥ": { total: 200, ranked: [{ key: "Gen|Dual", count: 120, share: 0.6, cell: null }] },
  },
};

test("caseOf keys on the UNSTRIPPED ending: -āḥ and -ah are different paradigms", () => {
  const visarga = caseOf("devāḥ", sanCasePrior);
  assert.equal(visarga.case, "Nom", "devāḥ reads Nom|Plur off -āḥ");
  const plain = caseOf("devah", sanCasePrior);
  assert.equal(plain.case, "Gen", "a stripped key would have merged these — the seam refuses to strip");
});

test("personOf recovers person+number from the verb ending, Dual first-class", () => {
  const p = personOf("paśyati", sanCasePrior);
  assert.deepEqual({ person: p.person, number: p.number }, { person: 3, number: "Sing" });
  const d = personOf("gacchāva", sanCasePrior);
  assert.deepEqual({ person: d.person, number: d.number }, { person: 1, number: "Dual" });
  assert.equal(personOf("bharata", sanCasePrior, { minShare: 0.6 }), null, "a 0.517 share does not clear 0.6");
  assert.equal(personOf("ajñāta", sanCasePrior), null, "an unattested ending returns a gap, never a guess");
});

test("personLabel glosses persons in English and Sanskrit, Dual never collapsed", () => {
  assert.equal(personLabel(3, "Sing"), "he/she/it");
  assert.equal(personLabel(1, "Dual"), "we two");
  assert.equal(personLabel(1, "Dual", "san"), "āvām");
  assert.equal(personLabel(3, "Plur", "san"), "te");
  assert.deepEqual(glossLanguages(), ["eng", "san"]);
});

test("the paradigm gloss is a projection, renderable in Sanskrit terms", () => {
  const paradigm = { person: 3, number: "Sing", tense: "Pres", voice: null, mood: "Ind", share: 0.97, ending: "ati" };
  assert.equal(verbGloss(paradigm, "eng"), "3rd person singular, present indicative — he/she/it");
  assert.equal(verbGloss(paradigm, "san"), "3 puruṣa ekavacana, laṭ nirdiṣṭa — saḥ");
});

test("paradigmOf tolerates the sparse voice axis: a missing voice is a gap, not a refusal", () => {
  const p = paradigmOf("paśyati", sanCasePrior);
  assert.equal(p.person, 3);
  assert.equal(p.tense, "Pres");
  assert.equal(p.mood, "Ind");
  assert.equal(p.voice, null, "voice is sparse in Vedic (32 endings) — gap, and the paradigm still returns");
  const pass = paradigmOf("dīpyate", { ...sanCasePrior, verbPersonalEndings: { ...sanCasePrior.verbPersonalEndings, ate: { total: 1273, ranked: [{ key: "3|Sing", count: 1120, share: 0.88, cell: null }] } }, verbTenseByEnding: { ...sanCasePrior.verbTenseByEnding, ate: { total: 1273, ranked: [{ key: "Pres", count: 1260, share: 0.99, cell: null }] } }, verbMoodByEnding: { ...sanCasePrior.verbMoodByEnding, ate: { total: 1273, ranked: [{ key: "Ind", count: 1260, share: 0.99, cell: null }] } } });
  assert.equal(pass.voice, "Pass", "-ate carries passive at 1.00");
});

test("sanskritClauses reads SOV by CASE: preverbal nominative subject, accusative object", () => {
  const verbs = new Set(["paśyati"]);
  const pos = { forms: { rājā: { NOUN: 10 }, putram: { NOUN: 5 }, paśyati: { VERB: 8 } } };
  const clauses = sanskritClauses("rājā putram paśyati.", verbs, pos, sanCasePrior, {});
  assert.equal(clauses.length, 1);
  assert.equal(clauses[0].verb, "paśyati");
  assert.equal(clauses[0].subject.head, "rājā");
  assert.equal(clauses[0].object.head, "putram");
});

test("sanskritClauses still reads verse order: postverbal nominals fill the slots", () => {
  const verbs = new Set(["paśyati"]);
  const pos = { forms: { paśyati: { VERB: 8 }, putram: { NOUN: 5 }, rājā: { NOUN: 10 } } };
  const clauses = sanskritClauses("paśyati putram rājā.", verbs, pos, sanCasePrior, {});
  assert.equal(clauses.length, 1);
  assert.equal(clauses[0].subject.head, "rājā");
  assert.equal(clauses[0].object.head, "putram");
});

test("sanskritClauses closes the segment at iti — quoted speech does not leak", () => {
  const verbs = new Set(["āha", "gacchati"]);
  const pos = { forms: { gacchati: { VERB: 8 }, āha: { VERB: 9 }, rājā: { NOUN: 10 }, putram: { NOUN: 5 } } };
  const clauses = sanskritClauses("gacchati iti āha rājā.", verbs, pos, sanCasePrior, {});
  assert.equal(clauses.length, 2);
  assert.equal(clauses[0].verb, "gacchati");
  assert.equal(clauses[1].verb, "āha");
  assert.equal(clauses[1].subject.head, "rājā", "the matrix subject binds to the matrix verb, not the quote");
});

test("sanskritClauses falls back to the instrumental oblique when no accusative exists", () => {
  const verbs = new Set(["gacchati"]);
  const pos = { forms: { rājā: { NOUN: 10 }, agninā: { NOUN: 6 }, gacchati: { VERB: 8 } } };
  const nominalPrior = { ...sanCasePrior, nominalEndings: { ...sanCasePrior.nominalEndings } };
  const clauses = sanskritClauses("rājā agninā gacchati.", verbs, pos, nominalPrior, {});
  assert.equal(clauses[0].subject.head, "rājā");
  assert.equal(clauses[0].object.head, "agninā", "the instrumental means fills the object slot");
});

test("sanskritClauses leaves the subject null for a pro-drop clause", () => {
  const verbs = new Set(["gacchati"]);
  const clauses = sanskritClauses("gacchati.", verbs, { forms: {} }, sanCasePrior, {});
  assert.equal(clauses.length, 1);
  assert.equal(clauses[0].subject, null);
});

test("beingRefOf binds a clause end to a tier-1 being by stem recurrence", () => {
  const beingsByStem = new Map([["yajñam", { stem: "yajñam" }]]);
  assert.equal(beingRefOf("yajñasya", beingsByStem), "ref:san:auto:yajñam");
  assert.equal(beingRefOf("putram", beingsByStem), null);
});

test("correlatives names the yad/tad halves — the argument architecture", () => {
  const pairs = correlatives("yad uktam tad satyam.");
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].leftHasYad, true);
  assert.ok(pairs[0].left.includes("yad"), "the LEFT is the yad-side");
  assert.ok(pairs[0].right.startsWith("satyam"), "the RIGHT is the tad-side");
  assert.equal(correlatives("gacchati eva").length, 0, "no tad, no correlative");
});
