// greek.test.mjs — the Greek pro-drop seam and verb gate, falsified.
// The positional reader cannot hear a pro-drop clause (Ancient Greek
// grammaticalizes its subject in the verb) and earns garbage "verbs" on free
// word order; the seam recovers the clause and the gate refuses the garbage.
import test from "node:test";
import assert from "node:assert/strict";
import { prodropClauses, confirmedVerbSet, confirmGreekVerbs, nominalClass, greekBeings, personOf, personLabel, caseOf, greekClauses, beingRefOf, paradigmOf, verbGloss, glossLanguages, correlatives } from "./greek.mjs";

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

test("greekBeings discovers a being from an article-cased noun that recurs", () => {
  const text = "ὁ κυβερνήτης ἦλθεν. τῷ κυβερνήτῃ εἶπε. ὁ κυβερνήτης ἀπῆλθεν.";
  const prior = { forms: { κυβερνήτης: { NOUN: 10 }, κυβερνήτῃ: { NOUN: 4 } } };
  const beings = greekBeings(text, prior, { minOccurrences: 2 });
  assert.equal(beings.length, 1);
  assert.equal(beings[0].stem, "κυβερνήτης");
  assert.deepEqual(beings[0].surfaces, ["ὁ κυβερνήτης", "τῷ κυβερνήτῃ"], "cased variants of one stem are one being");
  assert.equal(beings[0].occurrences, 3);
});

test("greekBeings groups cased variants by stem — identity by consequence, made morphological", () => {
  const text = "ἡ πατρίς ἐστι. τῇ πατρίδι δίδομεν.";
  const prior = { forms: { πατρίς: { NOUN: 5 }, πατρίδι: { NOUN: 3 } } };
  const beings = greekBeings(text, prior, { minOccurrences: 2 });
  assert.equal(beings.length, 1);
  assert.deepEqual(beings[0].surfaces, ["ἡ πατρίς", "τῇ πατρίδι"]);
});

test("greekBeings refuses a single occurrence — a being recurs", () => {
  const text = "ὁ κυβερνήτης ἦλθεν.";
  const prior = { forms: { κυβερνήτης: { NOUN: 10 } } };
  assert.equal(greekBeings(text, prior, { minOccurrences: 2 }).length, 0);
});

test("greekBeings skips non-nominal heads — a verb under the article is not a being", () => {
  const text = "τὸ γίνεται οὕτως.";
  const prior = { forms: { γίνεται: { VERB: 8 } } };
  assert.equal(greekBeings(text, prior).length, 0);
});

// A GreekCasePrior@1-shaped fixture (built by the one-master builder from
// UD_Ancient_Greek-PROIEL): verb personal endings tagged with Person|Number
// and their CUBE CELL (the universal grammar's projection).
const grcCasePrior = {
  schema: "GreekCasePrior@1", language: "grc",
  verbPersonalEndings: {
    εις: { total: 256, ranked: [{ key: "2|Sing", count: 256, share: 1, cell: { op: "SIG", grain: "Figure", terrain: "Entity", stance: "Binding" } }] },
    μαι: { total: 308, ranked: [{ key: "1|Sing", count: 308, share: 1, cell: { op: "SIG", grain: "Ground", terrain: "Void", stance: "Clearing" } }] },
    ετο: { total: 716, ranked: [{ key: "3|Sing", count: 716, share: 1, cell: { op: "INS", grain: "Figure", terrain: "Entity", stance: "Making" } }] },
    ξει: { total: 100, ranked: [{ key: "3|Sing", count: 40, share: 0.4, cell: { op: "INS", grain: "Figure", terrain: "Entity", stance: "Making" } }] },
  },
};

test("personOf recovers the grammatical person from the verb ending, with its cube cell", () => {
  const p = personOf("θέλεις", grcCasePrior);
  assert.deepEqual({ person: p.person, number: p.number, share: p.share }, { person: 2, number: "Sing", share: 1 });
  assert.equal(p.cell.op, "SIG");
  assert.equal(p.cell.terrain, "Entity", "the addressee 'you' is the attended figure — SIG·Figure (Entity)");
  const i = personOf("γίγνομαι", grcCasePrior);
  assert.equal(i.person, 1);
  assert.equal(i.cell.terrain, "Void", "the speaker is the unstated ground of the utterance — SIG·Ground (Void)");
});

test("personOf refuses below the reader's confidence floor — settled means refusable, never guessed", () => {
  assert.equal(personOf("ποιήξει", grcCasePrior, { minShare: 0.5 }), null, "a 0.4 share does not clear the floor");
  assert.equal(personOf("θέλεις", grcCasePrior, { minCount: 1000 }), null, "a low count does not clear the floor");
  assert.equal(personOf("ἀγνώστος", grcCasePrior), null, "an unattested ending returns a gap, never a guess");
});

test("personLabel glosses the Greek grammatical persons", () => {
  assert.equal(personLabel(2, "Sing"), "you");
  assert.equal(personLabel(1, "Sing"), "I");
  assert.equal(personLabel(3, "Plur"), "they");
});

test("the paradigm gloss is a projection, renderable in any language with declared terms", () => {
  const paradigm = { person: 2, number: "Sing", tense: "Pres", voice: "Act", mood: "Ind", personCell: { op: "SIG", grain: "Figure" }, tenseCell: { op: "EVA", grain: "Figure" }, voiceCell: { op: "EVA", grain: "Figure" }, moodCell: { op: "EVA", grain: "Ground" }, share: 1, ending: "εις" };
  assert.equal(verbGloss(paradigm, "eng"), "2nd person singular, present indicative active — you");
  assert.equal(verbGloss(paradigm, "ell"), "2ο πρόσωπο ενικού, ενεστώτας οριστική ενεργητική — εσύ");
  assert.equal(verbGloss(paradigm, "fra"), "2e personne singulier, présent indicatif actif — tu");
  assert.equal(verbGloss(paradigm, "spa"), "2da persona singular, presente indicativo activa — tú");
  assert.deepEqual(glossLanguages(), ["eng", "ell", "fra", "spa"]);
});

test("paradigmOf settles the full verbal paradigm from the verb's ending, each axis to its cube cell", () => {
  const prior = { ...grcCasePrior, verbVoiceByEnding: { εις: { total: 256, ranked: [{ key: "Act", count: 256, share: 1, cell: { op: "EVA", grain: "Figure", terrain: "Lens", stance: "Binding" } }] } }, verbMoodByEnding: { εις: { total: 256, ranked: [{ key: "Ind", count: 256, share: 1, cell: { op: "EVA", grain: "Ground", terrain: "Atmosphere", stance: "Tending" } }] } }, verbTenseByEnding: { εις: { total: 256, ranked: [{ key: "Pres", count: 256, share: 1, cell: { op: "EVA", grain: "Figure", terrain: "Lens", stance: "Binding" } }] } } };
  const p = paradigmOf("θέλεις", prior);
  assert.equal(p.person, 2);
  assert.equal(p.tense, "Pres");
  assert.equal(p.voice, "Act");
  assert.equal(p.mood, "Ind");
  assert.equal(p.voiceCell.terrain, "Lens", "active voice is the direct lens — EVA·Figure");
  assert.equal(p.moodCell.terrain, "Atmosphere", "indicative is the settled atmosphere — EVA·Ground");
  assert.equal(verbGloss(p, "ell"), "2ο πρόσωπο ενικού, ενεστώτας οριστική ενεργητική — εσύ");
});

// A GreekCasePrior@1-shaped nominalEndings fixture for the case reader.
const grcCasePriorFull = {
  ...grcCasePrior,
  nominalEndings: {
    ος: { total: 500, ranked: [{ key: "Nom|Sing", count: 400, share: 0.8, cell: { op: "SEG", grain: "Figure", terrain: "Link", stance: "Dissecting" } }] },
    ου: { total: 300, ranked: [{ key: "Gen|Sing", count: 240, share: 0.8, cell: { op: "CON", grain: "Pattern", terrain: "Network", stance: "Tracing" } }] },
    ον: { total: 400, ranked: [{ key: "Acc|Sing", count: 340, share: 0.85, cell: { op: "CON", grain: "Figure", terrain: "Link", stance: "Binding" } }] },
    ης: { total: 200, ranked: [{ key: "Nom|Sing", count: 180, share: 0.9, cell: { op: "SEG", grain: "Figure", terrain: "Link", stance: "Dissecting" } }] },
    α: { total: 300, ranked: [{ key: "Acc|Sing", count: 210, share: 0.7, cell: { op: "CON", grain: "Figure", terrain: "Link", stance: "Binding" } }] },
  },
};

test("caseOf settles Case|Number from the word ending, with its cube cell", () => {
  const n = caseOf("κυβερνήτης", grcCasePriorFull);
  assert.equal(n.case, "Nom");
  assert.equal(n.cell.op, "SEG", "the nominative subject is the differentiated figure — SEG·Figure");
  const a = caseOf("τὸν", grcCasePriorFull);
  assert.equal(a.case, "Acc");
  assert.equal(a.cell.terrain, "Link");
  assert.equal(caseOf("ἀγνώστος", grcCasePriorFull, { minCount: 100000 }), null, "below the floor, a gap — never a guess");
});

test("greekClauses reads a clause by CASE: nominative subject, accusative object", () => {
  const verbs = new Set(["βλέπει"]);
  const pos = { forms: { κυβερνήτης: { NOUN: 10 }, λόγον: { NOUN: 5 }, βλέπει: { VERB: 8 } } };
  const clauses = greekClauses("ὁ κυβερνήτης βλέπει τὸν λόγον.", verbs, pos, grcCasePriorFull, {});
  assert.equal(clauses.length, 1);
  assert.equal(clauses[0].verb, "βλέπει");
  assert.equal(clauses[0].subject.head, "κυβερνήτης");
  assert.equal(clauses[0].object.head, "λόγον");
  assert.equal(clauses[0].subject.case, "Nom");
  assert.equal(clauses[0].object.case, "Acc");
});

test("greekClauses recovers the copula-thesis shape: subject | is | predicate", () => {
  const verbs = new Set(["ἐστίν"]);
  const pos = { forms: { θάνατος: { NOUN: 10 }, φόβος: { NOUN: 8 }, ἐστίν: { VERB: 20 } } };
  // no accusative after the copula → a nominative predicate becomes the complement
  const clauses = greekClauses("ὁ θάνατος ἐστίν φόβος.", verbs, pos, grcCasePriorFull, {});
  assert.equal(clauses.length, 1);
  assert.equal(clauses[0].subject.head, "θάνατος");
  assert.equal(clauses[0].object.head, "φόβος", "the predicate nominative fills the complement slot");
});

test("beingRefOf binds a clause end to a tier-1 being by stem recurrence", () => {
  const beingsByStem = new Map([["θάνατος", { stem: "θάνατος" }]]);
  assert.equal(beingRefOf("θάνατος", beingsByStem), "ref:grc:auto:θάνατος");
  assert.equal(beingRefOf("θανάτου", beingsByStem), "ref:grc:auto:θάνατος", "the genitive variant binds to the same being");
  assert.equal(beingRefOf("γυνὴ", beingsByStem), null);
});

test("greekClauses leaves the subject null for a pro-drop clause — the seam's fallback", () => {
  const verbs = new Set(["γίνεται"]);
  const clauses = greekClauses("γίνεται γὰρ οὕτως.", verbs, { forms: {} }, grcCasePriorFull, {});
  assert.equal(clauses.length, 1);
  assert.equal(clauses[0].subject, null);
  assert.equal(clauses[0].verb, "γίνεται");
});

test("correlatives names the argument's two halves — the masters-level architecture", () => {
  const pairs = correlatives("τὰ μὲν ἐστιν ἐφ' ἡμῖν, τὰ δὲ οὐκ ἐφ' ἡμῖν.");
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].leftHasMen, true);
  assert.ok(pairs[0].left.includes("τὰ μὲν"), "the LEFT is the μέν-side");
  assert.ok(pairs[0].right.startsWith("οὐκ"), "the RIGHT is the δέ-side: not up to us");
  assert.equal(correlatives("οὐδὲν γὰρ").length, 0, "no δέ, no correlative");
  assert.equal(correlatives("τὸ δὲ").length, 0, "a δέ without both halves is not a correlative");
});