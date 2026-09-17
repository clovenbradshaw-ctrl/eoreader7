// native/eval/lavar/lib/archon-priors.test.mjs — the wall this module exists
// for: an archon's stored prior may carry a composition SHAPE, never the
// archon's own referents or prose, and an ant's own chemistry always wins
// over a primed archon fallback.

import { test } from "node:test";
import assert from "node:assert";

import { createHyperlexicon, giveHyperlexiconAffordance, admitHyperlexiconCandidates, pairKey } from "../../../kernel/hyperlexicon.js";
import { stripArchonReferents, compositionAffordanceWithArchon, shuffleArchonPrior, greekEntries, ARCHON_PRIOR_SCHEMA } from "./archon-priors.mjs";
import { confirmedVerbSet } from "../greek.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GRC_POS_PRIOR = JSON.parse(fs.readFileSync(path.join(HERE, "../../../priors/pos-grc.json"), "utf8"));

function realHyperlexicon() {
  let hl = createHyperlexicon();
  hl = admitHyperlexiconCandidates(hl, [
    { left: "approached", right: "began", giver: "archon:nietzsche", witnesses: ["He approached the door and began to speak"], meta: { independentSupport: 1 } },
  ]);
  hl = giveHyperlexiconAffordance(hl, {
    left: "overcame", right: "transformed", giver: "archon:nietzsche",
    witnesses: ["Zarathustra overcame his doubt and transformed the valley"],
    meta: { independentSupport: 3 },
  });
  return hl;
}

test("stripArchonReferents keeps only GIVEN rows — a mere candidate never travels as an archon's prior", () => {
  const hl = realHyperlexicon();
  const stripped = stripArchonReferents(hl);
  const rows = Object.values(stripped);
  assert.equal(rows.length, 1, "only the one GIVEN row should survive");
  assert.equal(rows[0].left, "overcame");
  assert.equal(rows[0].right, "transformed");
  assert.equal(rows[0].standing, "given");
});

test("stripArchonReferents strips witnesses — the archon's own sentences never cross into the prior", () => {
  const hl = realHyperlexicon();
  const stripped = stripArchonReferents(hl);
  const row = Object.values(stripped)[0];
  assert.deepEqual(row.witnesses, [], "witnesses (the archon's own prose) must be empty");
  // and the source shape has no field anywhere that could carry prose back in
  assert.deepEqual(Object.keys(row).sort(), ["giver", "left", "meta", "provenance", "right", "standing", "witnesses"].sort());
});

test("stripArchonReferents keeps the independentSupport count — the shape signal survives, the text does not", () => {
  const hl = realHyperlexicon();
  const stripped = stripArchonReferents(hl);
  const row = Object.values(stripped)[0];
  assert.equal(row.meta.independentSupport, 3);
});

test("compositionAffordanceWithArchon: the ant's OWN given affordance always wins over the archon prior", () => {
  let ownHl = createHyperlexicon();
  ownHl = giveHyperlexiconAffordance(ownHl, { left: "overcame", right: "transformed", giver: "this-ant's-own-read", witnesses: [] });
  const archonPrior = {
    schema: ARCHON_PRIOR_SCHEMA, archon: "nietzsche",
    composition: { [pairKey("overcame", "transformed")]: { left: "overcame", right: "transformed", standing: "given", giver: "archon:nietzsche", witnesses: [], provenance: { giver: "archon:nietzsche" }, meta: {} } },
  };
  const result = compositionAffordanceWithArchon(ownHl, archonPrior, "overcame", "transformed");
  assert.equal(result.giver, "this-ant's-own-read", "the ant's own affordance must not be shadowed by the archon");
});

test("compositionAffordanceWithArchon: falls back to the archon prior only when the ant's own hyperlexicon is unknown", () => {
  const ownHl = createHyperlexicon(); // the ant has nothing of its own on this pair
  const archonPrior = {
    schema: ARCHON_PRIOR_SCHEMA, archon: "nietzsche",
    composition: { [pairKey("overcame", "transformed")]: { left: "overcame", right: "transformed", standing: "given", giver: "archon:nietzsche", witnesses: [], provenance: { giver: "archon:nietzsche" }, meta: {} } },
  };
  const result = compositionAffordanceWithArchon(ownHl, archonPrior, "overcame", "transformed");
  assert.equal(result.standing, "given");
  assert.equal(result.giver, "archon:nietzsche");
  assert.equal(result.meta.primedByArchon, "nietzsche", "priming by an archon must be disclosed on the row, never silent");
});

test("compositionAffordanceWithArchon: with no archon prior at all, behaves exactly like plain compositionAffordance", () => {
  const ownHl = createHyperlexicon();
  const result = compositionAffordanceWithArchon(ownHl, null, "overcame", "transformed");
  assert.equal(result.standing, "unknown");
});

test("compositionAffordanceWithArchon: a pair unknown to BOTH the ant and the archon stays honestly unknown", () => {
  const ownHl = createHyperlexicon();
  const archonPrior = { schema: ARCHON_PRIOR_SCHEMA, archon: "nietzsche", composition: {} };
  const result = compositionAffordanceWithArchon(ownHl, archonPrior, "never", "seen");
  assert.equal(result.standing, "unknown");
});

test("shuffleArchonPrior requires a declared seed — never defaulted", () => {
  const prior = { schema: ARCHON_PRIOR_SCHEMA, archon: "x", giver: "archon:x", source: {}, builtFrom: {}, composition: {}, entryCount: 0 };
  assert.throws(() => shuffleArchonPrior(prior, {}), /seed is declared/);
});

test("shuffleArchonPrior: same vocabulary and count, different pairing — a real redeal, not a copy", () => {
  let hl = createHyperlexicon();
  hl = giveHyperlexiconAffordance(hl, { left: "approached", right: "began", giver: "archon:x", witnesses: [] });
  hl = giveHyperlexiconAffordance(hl, { left: "overcame", right: "transformed", giver: "archon:x", witnesses: [] });
  hl = giveHyperlexiconAffordance(hl, { left: "doubted", right: "questioned", giver: "archon:x", witnesses: [] });
  const prior = { schema: ARCHON_PRIOR_SCHEMA, archon: "x", giver: "archon:x", source: {}, builtFrom: {}, composition: stripArchonReferents(hl), entryCount: 3 };
  const shuffled1 = shuffleArchonPrior(prior, { seed: 1 });
  assert.equal(shuffled1.entryCount, 3, "same count as the real prior");
  const realLefts = new Set(Object.values(prior.composition).map((r) => r.left));
  const realRights = new Set(Object.values(prior.composition).map((r) => r.right));
  const shufLefts = new Set(Object.values(shuffled1.composition).map((r) => r.left));
  const shufRights = new Set(Object.values(shuffled1.composition).map((r) => r.right));
  assert.deepEqual(shufLefts, realLefts, "same left vocabulary, unchanged");
  assert.deepEqual(shufRights, realRights, "same right vocabulary, unchanged — only the pairing moved");
});

test("shuffleArchonPrior is deterministic — the same seed reproduces the same shuffle", () => {
  let hl = createHyperlexicon();
  for (const [l, r] of [["a", "1"], ["b", "2"], ["c", "3"], ["d", "4"], ["e", "5"]]) {
    hl = giveHyperlexiconAffordance(hl, { left: l, right: r, giver: "archon:x", witnesses: [] });
  }
  const prior = { schema: ARCHON_PRIOR_SCHEMA, archon: "x", giver: "archon:x", source: {}, builtFrom: {}, composition: stripArchonReferents(hl), entryCount: 5 };
  const run1 = shuffleArchonPrior(prior, { seed: 42 });
  const run2 = shuffleArchonPrior(prior, { seed: 42 });
  assert.deepEqual(run1.composition, run2.composition);
});

test("shuffleArchonPrior: every shuffled row is disclosed as a control, never mistaken for a real given affordance", () => {
  let hl = createHyperlexicon();
  hl = giveHyperlexiconAffordance(hl, { left: "a", right: "b", giver: "archon:x", witnesses: [] });
  const prior = { schema: ARCHON_PRIOR_SCHEMA, archon: "x", giver: "archon:x", source: {}, builtFrom: {}, composition: stripArchonReferents(hl), entryCount: 1 };
  const shuf = shuffleArchonPrior(prior, { seed: 7 });
  const row = Object.values(shuf.composition)[0];
  assert.match(row.giver, /SHUFFLED CONTROL/);
  assert.match(shuf.archon, /shuffled-control/);
});

// A minimal, HAND-VERIFIED GreekCasePrior@1 fixture (real 2nd-declension
// Greek endings — -ος nominative singular, -ον accusative singular —
// never fabricated morphology) so greekEntries can be tested without a
// network fetch or a multi-minute treebank build.
const GRC_CASE_PRIOR = {
  schema: "GreekCasePrior@1",
  nominalEndings: {
    "ος": { ranked: [{ key: "Nom|Sing", share: 1, count: 50, cell: null }] },
    "ον": { ranked: [{ key: "Acc|Sing", share: 1, count: 50, cell: null }] },
  },
};

test("greekEntries: real repeated names bridge across clauses into real composition candidates", () => {
  const verbs = confirmedVerbSet(GRC_POS_PRIOR, 0.5);
  // "The man saw the war. The war saw the man. The man saw the war." — a
  // bridge: "war" (ὁ πόλεμος / τὸν πόλεμον) is the object of the first
  // clause and (as a recurring ARTICLE+NOMINAL phrase) the subject-position
  // referent for the second, exactly the shape kernel/relation-composition.js
  // requires to compose. Every word is a real, POS-prior-attested 2nd-
  // declension form (ἄνθρωπος/ἄνθρωπον "man", πόλεμος/πόλεμον "war", both
  // confirmed NOUN in pos-grc.json; -ος nominative / -ον accusative, the
  // exact two endings GRC_CASE_PRIOR declares above) and εἶδεν is a real,
  // prior-confirmed verb form (VERB:31, share 1.0). An earlier draft of this
  // test used "Ἀχιλλεὺς" (3rd-declension, ending -εύς — never matches either
  // hand-built case ending, so its case, and so its referent, never binds)
  // and a fabricated verb form "ἔφηνεν" that is entirely absent from the
  // real pos-grc.json prior (confirmedVerbSet never confirms an unattested
  // form) — both silently produced zero clauses from two of the three
  // sentences, the actual cause of this test's original failure.
  const text = "ὁ ἄνθρωπος εἶδεν τὸν πόλεμον. ὁ πόλεμος εἶδεν τὸν ἄνθρωπον. ὁ ἄνθρωπος εἶδεν τὸν πόλεμον.";
  const edges = greekEntries(text, verbs, GRC_POS_PRIOR, GRC_CASE_PRIOR);
  assert.ok(edges.length >= 2, `expected real clause edges, got ${edges.length}`);
  for (const e of edges) {
    assert.equal(e.schema, "EOHyperedge@1");
    assert.equal(e.participants.length, 2);
    assert.equal(e.participants[0].standing, "referent");
    assert.equal(e.participants[1].standing, "referent");
  }
});

test("THE MEASURED HOMER FINDING, pinned and now NARROWED: a name that never recurs bridges to nothing, article-gated or bare", () => {
  // Reproduces the real 2026-09-17 diagnosis at the scale where it still
  // holds. The ORIGINAL finding this test pinned — "Homeric epic's sparser
  // article usage means greekBeings finds no tier-1 being at all" — was
  // real but was a diagnosis of the ARTICLE-GATED tier alone; it has since
  // been CLOSED at corpus scale (see the two tests below, and
  // greekEntries's own header) by a genuinely new bare-name tier
  // (greek.mjs::greekBeings's includeBare option, wired on unconditionally
  // in greekEntries). What THIS specific two-sentence fixture still shows,
  // honestly, is narrower: recurrence is required by EITHER tier
  // (minOccurrences), and neither "Ἀχιλῆος" nor any other nominal here
  // occurs twice within these two sentences — so nothing bridges, not
  // because the being-identity mechanism is blind to Homer, but because a
  // being that is never mentioned twice cannot be corroborated by any
  // recurrence-gated organ, the same structural floor greekBeings's other
  // tests already pin ("greekBeings refuses a single occurrence").
  const verbs = confirmedVerbSet(GRC_POS_PRIOR, 0.5);
  const text = "μῆνιν ἄειδε θεὰ Πηληϊάδεω Ἀχιλῆος. πολλὰς δὲ ψυχὰς Ἄϊδι προΐαψεν ἡρώων.";
  const edges = greekEntries(text, verbs, GRC_POS_PRIOR, GRC_CASE_PRIOR);
  assert.equal(edges.length, 0, "no referent recurs even once more in this two-sentence fixture — the recurrence floor, not the being tier, is what's tested here");
});

test("greekEntries: THE GAP CLOSED — a proper name unattested in the prior, never article-marked, still bridges via the bare tier", () => {
  // The real fix for the finding above, at fixture scale: an invented
  // 2nd-declension-shaped name ("Πάτροκλος"/"Πάτροκλον", nominative/
  // accusative, real Greek endings) used the way Homer actually uses
  // character names — bare, capitalised, never behind an article — used to
  // bridge to nothing (the original, now-superseded finding). It is
  // entirely UNATTESTED in GRC_POS_PRIOR (nominalClass returns null), the
  // exact condition bareBeingCandidates's own header names as admissible on
  // prior silence.
  const verbs = confirmedVerbSet(GRC_POS_PRIOR, 0.5);
  const text = "Πάτροκλος εἶδεν τὸν ἄνθρωπον. ὁ ἄνθρωπος εἶδεν Πάτροκλον.";
  const edges = greekEntries(text, verbs, GRC_POS_PRIOR, GRC_CASE_PRIOR);
  assert.ok(edges.length >= 1, `expected the bare-tier being to bridge at least one clause, got ${edges.length}`);
  const refs = new Set();
  for (const e of edges) for (const p of e.participants) refs.add(p.ref);
  assert.ok([...refs].some((r) => r.includes("πάτροκλος")), "the unattested, never-articled name resolved to a real referent");
});
