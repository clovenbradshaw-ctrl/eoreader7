import test from "node:test";
import assert from "node:assert/strict";
import { readOccupancyTestimony, testimonyRecord } from "../adapters/text/occupancy-testimony.js";
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
