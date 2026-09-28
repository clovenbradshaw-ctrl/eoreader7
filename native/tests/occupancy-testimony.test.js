import test from "node:test";
import assert from "node:assert/strict";
import { readOccupancyTestimony, testimonyRecord, namedOccupants } from "../adapters/text/occupancy-testimony.js";
import { PATRONYMIC_RU } from "../adapters/text/name-spans.js";
import { NEGATION_WORDS, DEFINITE_DETERMINERS, INDEFINITE_DETERMINERS, AUXILIARY_VERBS } from "../adapters/text/priors.js";
import { COPULA_FORMS } from "../adapters/text/phasepost.js";
import { declareSequence, readSequence } from "../kernel/sequence.js";
import { hyperedge } from "../kernel/hypergraph.js";

const MODALS = new Set([...AUXILIARY_VERBS].filter((w) => !COPULA_FORMS.has(w) && !["have", "has", "had", "do", "does", "did"].includes(w)));
const OPTS = { source: "t", determiners: { definite: DEFINITE_DETERMINERS, indefinite: INDEFINITE_DETERMINERS }, modals: MODALS, negation: NEGATION_WORDS };
const read = (texts) => readOccupancyTestimony(texts.map((text, at) => ({ text, at })), OPTS);

test("every number and class is declared", () => {
  assert.throws(() => readOccupancyTestimony([], { source: "t" }), /declared/);
});

test("a definite or titled complement is a position; an indefinite one is a kind; anything else a state", () => {
  const r = read(["Pierre became Count Bezukhov.", "Lincoln became a lawyer.", "Mary became engaged to Nicholas.", "Kutuzov was appointed commander-in-chief of the army."]);
  assert.deepEqual(r.candidates.map((c) => [c.occupant, c.locus]), [["Pierre", "Count Bezukhov"]]);
  assert.deepEqual(r.refused.map((x) => x.reason).sort(), ["kind_membership", "state_not_position", "state_not_position"]);
});

test("across domains: a meeting's chair, a ward's attending, a court's chief justice", () => {
  const r = read(["Dana Okafor was elected Chair of the Finance Committee in 2021.", "Dr Mensah was appointed the attending physician on Ward 4.", "Roberts succeeded Rehnquist as Chief Justice of the United States in 2005."]);
  assert.deepEqual(r.candidates.map((c) => [c.occupant, c.locus, c.predecessor, c.year]), [
    ["Dana Okafor", "Chair of the Finance Committee", null, "2021"],
    ["Dr Mensah", "attending physician on Ward 4", null, null],
    ["Roberts", "Chief Justice of the United States", "Rehnquist", "2005"],
  ]);
});

test("irrealis is not testimony: a wish, a rule or a denial holds nothing", () => {
  const r = read(["Pierre would become Count Bezukhov.", "Anna never became the Chair.", "The Secretary of State may appoint a Commissioner."]);
  assert.equal(r.candidates.length, 0, JSON.stringify(r.candidates));
  assert.ok(r.refused.filter((x) => x.reason === "irrealis").length >= 2);
});

test("an occupant that is itself a description names a position, not a participant", () => {
  const r = read(["The President became Commander-in-Chief."]);
  assert.equal(r.candidates.length, 0);
  assert.equal(r.refused[0].reason, "occupant_is_description");
});

test("testimony feeds kernel/sequence.js: one locus, two standings, a succession pointer", () => {
  const r = read(["Rehnquist became Chief Justice of the United States.", "Roberts succeeded Rehnquist as Chief Justice of the United States."]);
  const d = declareSequence({ relation: "holds-after", locus: "locus", occupant: "occupant", position: "key", predecessor: "predecessor", giver: "the material's own testimony (occupancy-testimony.js)" });
  const out = readSequence(r.candidates.map(testimonyRecord), d, { hyperedge });
  assert.equal(new Set(out.positions.map((p) => p.locus)).size, 1);
  assert.ok(out.edges.length >= 1, JSON.stringify(out.disclosures ?? out));
});

test("the occupant is a mention the pipeline made: a surface, a bound pronoun; no mention before the transition refuses", () => {
  const texts = ["In 1805 Pierre became Count Bezukhov.", "He was appointed the steward of the Estate.", "Several became Count Bezukhov.", "Roberts succeeded Rehnquist as Chief Justice of the United States."];
  const M = { Pierre: "ref:pierre", Roberts: "ref:roberts", Rehnquist: "ref:rehnquist" };
  const mentions = (s) => {
    const out = [];
    for (const [surf, referent] of Object.entries(M)) { const i = s.text.indexOf(surf); if (i >= 0) out.push({ start: i, end: i + surf.length, referent, via: "cast" }); }
    if (s.at === 1) out.push({ start: 0, end: 2, referent: "ref:pierre", via: "pronoun" });
    return out;
  };
  const r = readOccupancyTestimony(texts.map((text, at) => ({ text, at })), { ...OPTS, mentions });
  assert.equal(r.arm, "mentions");
  assert.deepEqual(r.candidates.map((c) => [c.occupant, c.occupantVia, c.locus, c.predecessor]), [
    ["ref:pierre", "cast", "Count Bezukhov", null],
    ["ref:pierre", "pronoun", "steward of the Estate", null],
    ["ref:roberts", "cast", "Chief Justice of the United States", "ref:rehnquist"],
  ]);
  assert.deepEqual(r.refused.map((x) => x.reason), ["occupant_not_a_referent"]);
  // the ablation arm takes "Several" for a name — the difference the arm exists to measure
  const abl = read(texts);
  assert.ok(abl.candidates.some((c) => c.occupant === "Several"));
});

test("between mention and transition: an unbound pronoun or a comma refuses — the mention before is not the subject", async () => {
  const { SUBJECT_PRONOUNS } = await import("../adapters/text/priors.js");
  const texts = ["After a long career at German universities, he was appointed Archbishop of Munich.", "In December 2015, Merkel was named Person of the Year.", "Ratzinger was appointed Archbishop of Munich.", "Pierre, on unexpectedly becoming Count Bezukhov, felt beset.", "In 2015, the chancellor was named Person of the Year.", "In December 2016, Merkel was named Person of the Decade."];
  const M = { German: "ref:german", December: "ref:december", Ratzinger: "ref:ratzinger", Pierre: "ref:pierre" };
  const mentions = (s) => Object.entries(M).flatMap(([surf, referent]) => { const i = s.text.indexOf(surf); return i >= 0 ? [{ start: i, end: i + surf.length, referent, via: "cast" }] : []; });
  const r = readOccupancyTestimony(texts.map((text, at) => ({ text, at })), { ...OPTS, mentions, pronouns: SUBJECT_PRONOUNS });
  // the comma before "Merkel" refuses (Merkel is no mention in this fixture: a capitalised run the
  // reading never reached); the comma after "Pierre" does not (nothing subject-shaped follows it);
  // a determiner-led phrase after the comma refuses; and once Merkel IS a mention it wins outright
  assert.deepEqual(r.candidates.map((c) => [c.occupant, c.locus]), [["ref:ratzinger", "Archbishop of Munich"], ["ref:pierre", "Count Bezukhov"]]);
  assert.deepEqual(r.refused.map((x) => x.reason), ["pronoun_unbound", "occupant_not_a_referent", "occupant_not_a_referent", "occupant_not_a_referent"]);
  const M2 = { ...M, Merkel: "ref:merkel" };
  const mentions2 = (s) => Object.entries(M2).flatMap(([surf, referent]) => { const i = s.text.indexOf(surf); return i >= 0 ? [{ start: i, end: i + surf.length, referent, via: "cast" }] : []; });
  const r2 = readOccupancyTestimony([{ text: texts[5], at: 0 }], { ...OPTS, mentions: mentions2, pronouns: SUBJECT_PRONOUNS });
  assert.deepEqual(r2.candidates.map((c) => [c.occupant, c.locus]), [["ref:merkel", "Person of the Decade"]]);
});

test("the slot is undecided until a for-whom collapses it: every candidate kept, two rules, two verdicts, both on record", async () => {
  const { SUBJECT_PRONOUNS } = await import("../adapters/text/priors.js");
  const { collapse, standingOf } = await import("../kernel/undecided.js");
  const text = "He took office on September 26, becoming the first person since Stone to serve twice.";
  const mentions = () => [{ start: text.indexOf("September"), end: text.indexOf("September") + 9, referent: "ref:september", via: "cast" }];
  const r = readOccupancyTestimony([{ text, at: 0 }], { ...OPTS, mentions, pronouns: SUBJECT_PRONOUNS });
  assert.equal(r.events.length, 1);
  const { undecided: u, collapse: c } = r.events[0];
  // the record holds the established mention AND the clause-initial unbound pronoun
  assert.deepEqual(u.candidates.map((x) => x.via).sort(), ["cast", "pronoun-unbound"]);
  assert.equal(u.candidates.find((x) => x.via === "pronoun-unbound").features.clauseInitial, true);
  // the default for-whom refuses to credit September: contested, reason named
  assert.equal(c.verdict, "contested"); assert.equal(c.reason, "pronoun_unbound"); assert.equal(r.candidates.length, 0);
  assert.equal(r.refused[0].undecided, u.id);
  // a looser for-whom collapses the SAME record to September, and both collapses stand
  const loose = { name: "nearest-any", giver: "test", decide: (cs) => ({ chosen: cs.filter((x) => x.features.established).at(-1).index }) };
  const c2 = collapse(u, { forWhom: { id: "reader:loose" }, rule: loose, cursor: 0 });
  assert.equal(c2.verdict, "chosen"); assert.equal(c2.chosen.value, "ref:september");
  assert.equal(standingOf(u, [c, c2], { id: "reader:loose" }).standing, "chosen");
  assert.equal(standingOf(u, [c, c2], { id: "occupancy-reader:nearest-established" }).standing, "contested");
  assert.equal(u.standing, "open");
});

test("what a locus IS is undecided: the cast's merge says being, the testimony says position; two for-whoms, two collapses, both on record", async () => {
  const { locusStandings, LOCUS_BY_PATTERN } = await import("../adapters/text/occupancy-testimony.js");
  const { collapse, standingOf } = await import("../kernel/undecided.js");
  const rows = [
    { locus: "Count Bezukhov", occupant: "ref:cyril", predecessor: null, at: 3, address: "wp#s3" },
    { locus: "Count Bezukhov", occupant: "ref:pierre", predecessor: null, at: 6425, address: "wp#s6425" },
    { locus: "the first human to walk", occupant: "ref:armstrong", predecessor: null, at: 9, address: "a#s9" },
  ];
  const merges = [{ surface: "Pierre Bezukhov", into: "Count Bezukhov", basis: "name-variant coreference" }];
  const [bez, walk] = locusStandings(rows, { merges });
  assert.equal(bez.collapse.verdict, "chosen"); assert.equal(bez.collapse.chosen.value, "position"); assert.equal(bez.collapse.reason, "two_occupants");
  assert.equal(bez.undecided.candidates.find((c) => c.value === "being").features.merges, 1);
  assert.equal(walk.collapse.verdict, "contested"); assert.equal(walk.collapse.reason, "held_once");
  // a cast-trusting for-whom collapses the same Bezukhov record to `being`; the reader's collapse stands beside it
  const trustCast = { name: "trust-the-cast", giver: "test", decide: (cs) => { const b = cs.find((c) => c.value === "being"); return b.features.merges ? { chosen: b.index } : {}; } };
  const c2 = collapse(bez.undecided, { forWhom: { id: "reader:trust-cast" }, rule: trustCast, cursor: 6425 });
  assert.equal(c2.chosen.value, "being");
  assert.equal(standingOf(bez.undecided, [bez.collapse, c2], { id: "reader:trust-cast" }).collapse.chosen.value, "being");
  assert.equal(standingOf(bez.undecided, [bez.collapse, c2], { id: "occupancy-reader:nearest-established" }).collapse.chosen.value, "position");
  assert.equal(LOCUS_BY_PATTERN.params.minOccupants, 2);
});

test("BEING_KIND: a candidate that keeps a preposition's company is refused by name; a subject is kept; unmeasured company is contested", async () => {
  const { BEING_KIND } = await import("../adapters/text/occupancy-testimony.js");
  const { SUBJECT_PRONOUNS } = await import("../adapters/text/priors.js");
  const texts = ["In 1806 March was appointed Grand Duke of Berg.", "In 1806 Murat was appointed Grand Duke of Berg.", "In 1806 Nadella was appointed Grand Duke of Berg."];
  const F = { March: { prepShare: 0.8, verbShare: 0 }, Murat: { prepShare: 0.08, verbShare: 0.55 }, Nadella: {} };
  const mentions = (s) => Object.keys(F).flatMap((surf) => { const i = s.text.indexOf(surf); return i >= 0 ? [{ start: i, end: i + surf.length, referent: `ref:${surf.toLowerCase()}`, via: "cast", features: F[surf] }] : []; });
  const r = readOccupancyTestimony(texts.map((text, at) => ({ text, at })), { ...OPTS, mentions, pronouns: SUBJECT_PRONOUNS, forWhom: { id: "reader:being-kind" }, occupantRule: BEING_KIND });
  assert.deepEqual(r.candidates.map((c) => c.occupant), ["ref:murat"]);
  assert.deepEqual(r.refused.map((x) => x.reason), ["not_being_kind", "company_unmeasured"]);
  assert.equal(r.events[0].collapse.forWhom, "reader:being-kind");
});

test("nounBetween: a settled noun between the candidate and the transition is the subject; the candidate is its modifier — refused by name, only when a prior is injected", async () => {
  const { SUBJECT_PRONOUNS } = await import("../adapters/text/priors.js");
  const posPrior = { forms: { towns: { NOUN: 12 }, ten: { NUM: 9 }, have: { AUX: 30 }, been: { AUX: 20 } } };
  const text = "No less than ten Russian towns have been named Kutuzovo since then.";
  const mentions = () => [{ start: text.indexOf("Russian"), end: text.indexOf("Russian") + 7, referent: "ref:russian", via: "cast" }];
  const withPrior = readOccupancyTestimony([{ text, at: 0 }], { ...OPTS, mentions, pronouns: SUBJECT_PRONOUNS, posPrior });
  assert.equal(withPrior.candidates.length, 0); assert.equal(withPrior.refused[0].reason, "subject_unestablished");
  assert.equal(withPrior.events[0].undecided.candidates[0].features.nounBetween, true);
  const without = readOccupancyTestimony([{ text, at: 0 }], { ...OPTS, mentions, pronouns: SUBJECT_PRONOUNS });
  assert.equal(without.events[0].undecided.candidates[0].features.nounBetween, null);
  assert.equal(without.candidates.length, 1, "absent a prior the feature is unknown and the default rule does not refuse on it");
});

test("every standing carries its transition verb and, with a phasepost injected, its act on the cube — an overlay, never a gate", () => {
  const seen = [];
  const phasepost = (edge) => { seen.push(edge); return { op: edge.label === "became" ? "INS" : "SIG", grain: "Figure", via: "stub" }; };
  const r = readOccupancyTestimony([{ text: "Pierre became Count Bezukhov.", at: 0 }, { text: "Roberts succeeded Rehnquist as Chief Justice of the United States.", at: 1 }].map((x) => x), { ...OPTS, phasepost });
  assert.deepEqual(r.candidates.map((c) => [c.verb, c.act.op]), [["became", "INS"], ["succeeded", "SIG"]]);
  assert.deepEqual(seen[0], { end1: "Pierre", label: "became", end2: "Count Bezukhov" });
  const bare = read(["Pierre became Count Bezukhov."]);
  assert.equal(bare.candidates[0].act, null); assert.equal(bare.candidates[0].verb, "became");
});

// ── all states are transitions; NUL is the transition of non-transition (2026-09-28) ──
import { positionsByPattern } from "../adapters/text/occupancy-testimony.js";
import { cellOf } from "../kernel/cube.js";

test("a copula clause holds a locus as a NUL·Ground standing; an entry clause is never re-read as a state", () => {
  const r = readOccupancyTestimony([{ text: "Merkel was Leader of the Opposition from 2002 to 2005.", at: 0 }, { text: "Murat was appointed Grand Duke of Berg.", at: 1 }, { text: "Pierre became Count Bezukhov.", at: 2 }], { ...OPTS, cellOf });
  assert.deepEqual(r.candidates.map((c) => [c.occupant, c.locus, c.pattern, c.act?.op ?? null, c.act?.grain ?? null, c.predecessor]), [
    ["Merkel", "Leader of the Opposition", "state", "NUL", "Ground", null],
    ["Murat", "Grand Duke of Berg", "passive", null, null, null],
    ["Pierre", "Count Bezukhov", "become", null, null, null],
  ]);
  assert.deepEqual(r.candidates[0].act.cell, cellOf("NUL", "Ground")); assert.equal(r.candidates[0].act.standing, "declared"); assert.equal(r.candidates[0].year, "2002");
});

test("the state family keeps every wall: a kind is refused, an unbound pronoun is refused, irrealis holds nothing", () => {
  const r = readOccupancyTestimony(["Johnson was a War Democrat.", "It was Natasha.", "Anna was never the Chair.", "Kutuzov is very ill."].map((text, at) => ({ text, at })), { ...OPTS, pronouns: new Set(["it", "he", "she", "they"]) });
  assert.equal(r.candidates.length, 0, JSON.stringify(r.candidates));
  assert.deepEqual(r.refused.map((x) => x.reason).sort(), ["irrealis", "kind_membership", "pronoun_unbound", "state_not_position"]);
});

test("a held locus and an entered locus are one position: the state standing supplies the occupant no becoming names", () => {
  const r = read(["Count Cyril was Count Bezukhov until his death.", "Pierre became Count Bezukhov."]);
  const { positions } = positionsByPattern(r.candidates);
  assert.equal(positions.length, 1); assert.deepEqual(positions[0].occupants.sort(), ["Count Cyril", "Pierre"]); assert.equal(positions[0].evidence, "two_occupants");
});

test("only the complement's head is asked against the cast: an adjunct place name never becomes the locus", () => {
  const known = new Map([["moscow", "Moscow"], ["count bezukhov", "Count Bezukhov"], ["berg", "Berg"]]);
  const resolveLocus = (sentence, span) => { const surf = sentence.text.slice(span.start, span.end).toLowerCase(); for (const [k, v] of known) if (surf.includes(k)) return { referent: v, id: `ref:${k}`, via: "cast" }; return null; };
  const r = readOccupancyTestimony(["Iogel's were the most enjoyable balls in Moscow.", "Pierre became Count Bezukhov.", "Murat was appointed Grand Duke of Berg."].map((text, at) => ({ text, at, offset: 0 })), { ...OPTS, resolveLocus });
  assert.deepEqual(r.candidates.map((c) => [c.occupant, c.locus, c.locusId, c.locusVia]), [
    ["Iogel's", "most enjoyable balls in Moscow", null, "surface"],
    ["Pierre", "Count Bezukhov", "ref:count bezukhov", "cast"],
    ["Murat", "Grand Duke of Berg", null, "surface"],
  ]);
});

test("the cast is asked only about a head phrase that reads as a name: a name inside a phrase is not the locus", () => {
  const known = new Map([["napoleon", "Napoleon"], ["count bezukhov", "Count Bezukhov"], ["austrian", "Austrian"]]);
  const resolveLocus = (sentence, span) => { const surf = sentence.text.slice(span.start, span.end).toLowerCase(); for (const [k, v] of known) if (surf.includes(k)) return { referent: v, id: `ref:${k}`, via: "cast" }; return null; };
  const r = readOccupancyTestimony(["The letter taken by Balashev was the last Napoleon sent to Alexander.", "The consequence of Borodino was Napoleon's senseless flight from Moscow.", "Weyrother was the Austrian general who had succeeded Schmidt.", "Pierre became Count Bezukhov."].map((text, at) => ({ text, at, offset: 0 })), { ...OPTS, resolveLocus });
  assert.deepEqual(r.candidates.map((c) => [c.occupant, c.locusId, c.locusVia]), [
    ["Balashev", null, "surface"], ["Borodino", null, "surface"], ["Weyrother", null, "surface"], ["Pierre", "ref:count bezukhov", "cast"],
  ]);
});

test("a soft line break inside a clause is a space: the complement reads across it and offsets still name the bytes", () => {
  const resolveLocus = (sentence, span) => (/austrian/i.test(sentence.text.slice(span.start, span.end)) ? { referent: "Austrian", id: "ref:austrian", via: "cast" } : null);
  const r = readOccupancyTestimony([{ text: "Weyrother was the Austrian\ngeneral who had succeeded Schmidt.", at: 0, offset: 0 }, { text: "Pierre became the\nlatter.", at: 1, offset: 0 }, { text: "Pierre became Count\nBezukhov.", at: 2, offset: 0 }], { ...OPTS, resolveLocus });
  // "the latter" types as a definite complement under the standing rule (a locus surface, for positionsByPattern to weigh) — what the fix closes is a locus named "the"
  assert.deepEqual(r.candidates.map((c) => [c.occupant, c.locus, c.locusVia]), [["Weyrother", "Austrian general", "surface"], ["Pierre", "latter", "surface"], ["Pierre", "Count Bezukhov", "surface"]]);
  assert.equal(r.refused.length, 0);
});

test("a copula clause whose pre-verbal material opens with a preposition is inverted: refused by name, the post-verbal subject carried", () => {
  const r = read(["With Pfuel was Wolzogen, who expressed his thoughts.", "Among the Russian prisoners rescued by Denisov and Dolokhov was Pierre Bezukhov.", "Behind Kutuzov was Bennigsen and the suite.", "Weyrother was the Austrian general.", "In 1815, Murat was 25 years old.", "In 1774 Kutuzov was ordered to storm Alushta.", "In the village there were Russian troops."]);
  assert.deepEqual(r.refused.filter((x) => x.reason === "inverted_subject").map((x) => x.subject), ["Wolzogen", "Pierre Bezukhov", "Bennigsen"], "a fronted ADJUNCT with a comma, or a non-name complement, is not an inversion (v12: 859 false firings)");
  assert.deepEqual(r.candidates.map((c) => c.occupant), ["Weyrother"]);
});

test("a title-less name as a copula complement is an identity claim, not a locus: carried as merge evidence, never a position", () => {
  const known = new Map([["sonya", "Sonya"], ["count bezukhov", "Count Bezukhov"]]);
  const resolveLocus = (sentence, span) => { const surf = sentence.text.slice(span.start, span.end).toLowerCase(); for (const [k, v] of known) if (surf.includes(k)) return { referent: v, id: `ref:${k}`, via: "cast" }; return null; };
  // the pipeline's own mentions (the mentions arm): "Circassian" is an established referent, as it is in the War and Peace cast
  const mentionsBy = { 0: [{ start: 5, end: 15, referent: "ref:circassian", via: "cast", established: true }], 1: [{ start: 0, end: 6, referent: "ref:pierre", via: "cast", established: true }], 2: [{ start: 0, end: 7, referent: "ref:natasha", via: "cast", established: true }] };
  const r = readOccupancyTestimony(["That Circassian was Sonya.", "Pierre was Count Bezukhov.", "Natasha was Sonya's cousin."].map((text, at) => ({ text, at, offset: 0 })), { ...OPTS, resolveLocus, mentions: (s) => mentionsBy[s.at] });
  assert.deepEqual(r.candidates.map((c) => [c.occupant, c.locus, c.identity?.into ?? null]), [["ref:circassian", "Sonya", "ref:sonya"], ["ref:pierre", "Count Bezukhov", null], ["ref:natasha", "Sonya's cousin", null]]);
  const { positions, descriptions } = positionsByPattern(r.candidates);
  assert.ok(!descriptions.some((d) => d.locus === "sonya") && !positions.some((p) => p.locus === "sonya"), "an identity row is no locus at all");
});

// ── the grammar comes online for a declared language (adapters/text/grammar.js, injected) ──
import { grammarFor } from "../adapters/text/grammar.js";

test("a declared language with no grammar stands the English organs down and says so; English declared is byte-identical to no language", () => {
  const texts = ["Merkel was Leader of the Opposition.", "With Pfuel was Wolzogen.", "Murat was appointed Grand Duke of Berg."].map((text, at) => ({ text, at }));
  const ru = readOccupancyTestimony(texts, { ...OPTS, language: "ru", grammarFor });
  assert.equal(ru.grammar.gap.reason, "no_grammar_for_language");
  assert.deepEqual(ru.candidates.map((c) => [c.occupant, c.pattern]), [["Murat", "passive"]], "the copula family is an English organ; the entry family the caller handed in still runs");
  assert.ok(!ru.refused.some((x) => x.reason === "inverted_subject"), "the fronted-phrase reading is English too");
  const en = readOccupancyTestimony(texts, { ...OPTS, language: "en", grammarFor }), bare = readOccupancyTestimony(texts, OPTS);
  assert.deepEqual(en.grammar, { language: "en", giver: "lang/en" });
  assert.deepEqual(en.candidates.map((c) => [c.occupant, c.locus, c.pattern, c.act?.op ?? null]), bare.candidates.map((c) => [c.occupant, c.locus, c.pattern, c.act?.op ?? null]));
  assert.deepEqual(en.refused.map((x) => x.reason), bare.refused.map((x) => x.reason));
  assert.equal(readOccupancyTestimony(texts, { ...OPTS, language: "en" }).grammar.gap.reason, "no_grammar_lookup", "a language declared with nothing to look it up in is a gap, not a guess");
});

test("locus-side being-kind (2026-09-28): a complement whose head the prior settles with no nominal share names no position; an ambiguous word and an unseen word pass; only with a prior", () => {
  const posPrior = { forms: { latter: { ADJ: 7 }, general: { ADJ: 32, NOUN: 6, PROPN: 10 }, count: { NOUN: 4, VERB: 7 }, verified: { VERB: 9 }, pope: { NOUN: 5 }, wished: { VERB: 4 }, man: { NOUN: 40 } } };
  // v14's own loss: the head noun ends where a relative clause (or a reduced one) begins — "pope", "man", never the clause's last verb
  const texts = ["Pierre became the latter.", "Kutúzov became the general.", "Pierre became Count Bezúkhov.", "Nicholas became the Chairman.", "Benedict became the longest-lived pope whose age can be verified.", "Andrew became the man he would himself have wished to be."];
  const r = readOccupancyTestimony(texts.map((text, at) => ({ text, at })), { ...OPTS, posPrior });
  assert.deepEqual(r.refused.filter((x) => x.reason === "locus_not_nominal").map((x) => [x.at, x.word, x.classes]), [[0, "latter", ["ADJ"]]]);
  assert.deepEqual(r.candidates.map((c) => c.locus), ["general", "Count Bezúkhov", "Chairman", "longest-lived pope whose age can be verified", "man he would himself have wished to be"]);
  const without = readOccupancyTestimony(texts.map((text, at) => ({ text, at })), OPTS);
  assert.equal(without.candidates.length, 6, "absent a prior nothing is refused on it");
});

test("naming as testimony (Cyril): a name carrying a locus's title and head with givens no known occupant wears is a SIGNED occupant — never a predicated one, never handed to positionsByPattern", () => {
  const texts = ["Pierre became Count Bezúkhov.", "Count Cyril Vladímirovich Bezúkhov lay dying in Moscow.", "Count Pierre Bezúkhov received the whole estate.", "Prince Andrew was in Moscow."];
  const r = readOccupancyTestimony(texts.map((text, at) => ({ text, at })), OPTS);
  assert.deepEqual(r.candidates.map((c) => [c.occupant, c.locus]), [["Pierre", "Count Bezúkhov"]]);
  const named = namedOccupants(texts.map((text, at) => ({ text, at })), r.candidates, { source: "t", nameOpts: { patronymic: PATRONYMIC_RU } });
  assert.deepEqual(named.map((n) => [n.occupantSurface, n.locus, n.pattern, n.act.op, n.act.grain, n.at]), [["Count Cyril Vladímirovich Bezúkhov", "Count Bezúkhov", "naming", "SIG", "Ground", 1]]);
  assert.equal(named[0].evidence, "named_by_title");
  // "Count Pierre Bezúkhov" is Pierre named again (given-level nesting with the known face "Pierre"), never a second being
  assert.ok(!named.some((n) => n.at === 2));
  // with the cast: the naming resolves to the mention's referent
  const mentions = (s) => (s.at === 1 ? [{ start: 0, end: "Count Cyril Vladímirovich Bezúkhov".length, referent: "ref:cyril", via: "cast" }] : []);
  const withCast = namedOccupants(texts.map((text, at) => ({ text, at })), r.candidates, { source: "t", mentions, nameOpts: { patronymic: PATRONYMIC_RU } });
  assert.equal(withCast[0].occupant, "ref:cyril"); assert.equal(withCast[0].occupantVia, "naming+cast");
  assert.throws(() => namedOccupants([], [], {}), /declared/);
});
