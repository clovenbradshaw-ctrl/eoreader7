// node --test hypergraph.test.mjs
//
// Conformance for the relation tier, against the ENGINE'S REAL ORGANS —
// what counts as a surface, a referent, a verb, a triple must be the
// engine's own answer, or the material's graph and the answer's reading
// drift apart and every verdict is a comparison of two different readings.

import { test } from "node:test";
import assert from "node:assert/strict";

import { makeRelationReader, relationFindings, relationsClean, MIN_SURFACES_PER_VERB, queryEdges, queryFillers } from "./hypergraph.js";
import { corroborateAtoms } from "./grounding.js";
import { readFileSync } from "node:fs";

// WHICH ENGINE PROVIDER THIS SUITE EXERCISES (2026-09-01, Pass 7).
//
// These tests were written against the FROZEN legacy provider and pin it by
// path. `app.js` — the only production caller of makeRelationReader — has
// imported `/engine-v7/adapters/text/*` since P69 crossed the ratchet, so
// the suite has been verifying a configuration the app does not run.
// Measured when the difference was first looked at: 54/58 under legacy,
// 52/58 under native (the same 4, plus lemma-widening and
// morphologyLanguage). That gap was invisible while this file could not
// load at all, which is exactly what Pass 7 existed to surface.
//
// So the provider is now a declared switch rather than a hard-coded path.
// LEGACY remains the default so this suite's own baseline does not move
// silently; `ENGINE=native node --test hypergraph.test.mjs` runs the
// PRODUCTION configuration, and the delta between them is a measurement
// anyone can take instead of a surprise.
// In THIS repo the frozen provider is a submodule that may be uninitialised;
// when it is absent the switch resolves to native (the production
// configuration, P69) rather than to a file that cannot load — `ENGINE=legacy`
// still pins the frozen provider wherever it exists.
import { existsSync } from "node:fs";
const LEGACY_PRESENT = existsSync(new URL("../../legacy-eoreader6.1/packages/engine/perceiver/text/spans.js", import.meta.url));
const PROVIDER = process.env.ENGINE === "native" || (process.env.ENGINE !== "legacy" && !LEGACY_PRESENT)
  ? "../adapters/text/"
  : "../../legacy-eoreader6.1/packages/engine/perceiver/text/";

const organs = async () => {
  const { splitSentences } = await import(PROVIDER + "spans.js");
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(PROVIDER + "surfaces.js");
  const { discoverRelationVocab, extractRelations } = await import(PROVIDER + "relations.js");
  const { tokenize, buildFrequencyTable, functionWordSet } = await import(PROVIDER + "material.js");
  return {
    splitSentences,
    extractSurfaces,
    discoverReferents,
    namesCorefer,
    diaNorm,
    discoverRelationVocab,
    extractRelations,
    tokenize,
    buildFrequencyTable,
    functionWordSet,
  };
};

// The material used throughout: three passages from two sources, with
// enough recurrence for the engine's own gates to establish the cast, a
// stated edge, a negated edge, and a second passage restating the first
// edge so corroboration has something to count.
const PASSAGES = [
  {
    ref: "wp.txt#0-400",
    text:
      "Pierre Bezukhov married Helene that winter in Petersburg. " +
      "Pierre Bezukhov trusted Dolokhov entirely, and Dolokhov repaid nothing. " +
      "Later Pierre Bezukhov spoke of the wedding to anyone who listened.",
  },
  {
    ref: "wp.txt#400-800",
    text:
      "Pierre Bezukhov married Helene before the spring, people said again. " +
      "Dolokhov mocked Pierre Bezukhov at cards, and Helene watched in silence.",
  },
  {
    ref: "letters.txt#0-300",
    text:
      "Pierre Bezukhov never loved Helene, Marya wrote plainly in her letter. " +
      // "loved" must be MEASURABLE as a verb for the negated edge to be
      // readable at all: the vocabulary candidate slot after "Pierre
      // Bezukhov" holds "never", so the verb enters the vocabulary only
      // through an affirmative use elsewhere — exactly how a real corpus
      // supplies it.
      "Old Marya loved the garden at the estate. " +
      "Marya admired Pierre Bezukhov all the same, and Helene knew it.",
  },
];

// The pool stands in for the live corpus the passages were retrieved from:
// the closed class is measured HERE, not from the turn's few passages —
// material.js's threshold is a share of all tokens, and on an excerpt the
// measure degenerates (every word crosses it). Ordinary prose, long enough
// that the genuinely closed words recur and the content words stay rare.
const FILLER =
  "The house stood at the end of the road, and the road ran down to the river. " +
  "In the morning the light came over the water, and the birds rose from the reeds. " +
  "It was quiet in the garden, and the gate hung open on its hinge. " +
  "The old man walked to the market in the town, and the town was full of voices. " +
  "By the evening the lamps were lit in the windows, and the smoke stood over the roofs. " +
  "The children ran along the wall by the church, and the bell rang the hour. " +
  "A cart came up the road from the fields, and the horse was tired of the load. " +
  "The rain fell on the square for a day and a night, and the river rose under the bridge. " +
  "In the winter the snow lay on the hills, and the paths were lost until the thaw. " +
  "The letters were kept in a drawer of the desk, and the desk stood by the window.";

const POOL = [
  ...PASSAGES,
  ...FILLER.split(". ").map((s, i) => ({ ref: `filler.txt#${i * 100}-${i * 100 + 99}`, text: s + "." })),
];

// ── cardinality: the mirror of P32's slot competition (added 2026-08-19,
// user direction after a live conversation) ─────────────────────────────
// P32 counts distinct SUBJECTS filling one verb+object slot; this counts
// distinct OBJECTS one subject+verb binds — the Russellian uniqueness
// clause: "the F is G" presupposes not just that an F exists (Strawson's
// clause, the presupposition-failure gate already covers) but that there
// is EXACTLY ONE F. "Who was HIS vice president?" presupposes a single
// filler; Lincoln had two. The answer isn't wrong — the question's own
// presupposition was never checked.

const LINCOLN_PASSAGES = [
  {
    ref: "lincoln.txt#0-200",
    text: "Lincoln appointed Hamlin. Lincoln appointed Johnson. Lincoln nominated Seward. Hamlin visited Lincoln often. Johnson visited Lincoln rarely.",
  },
];
const LINCOLN_POOL = [
  ...LINCOLN_PASSAGES,
  ...FILLER.split(". ").map((s, i) => ({ ref: `filler4.txt#${i * 100}-${i * 100 + 99}`, text: s + "." })),
];

test("a subject+verb binding two distinct objects surfaces both as `fillers` on a bound claim", async () => {
  const reader = makeRelationReader(await organs())(LINCOLN_PASSAGES, { pool: LINCOLN_POOL });
  // The claim matches ONE of the two real fillers exactly — bound, but the
  // material shows a second, equally real filler this question's own
  // singular phrasing never asked about.
  const report = reader.read("Lincoln appointed Hamlin.");
  const claim = report.claims.find((c) => c.label === "appointed" && /Hamlin/i.test(c.end2));
  assert.ok(claim, JSON.stringify(report.claims, null, 2));
  assert.equal(claim.verdict, "bound");
  assert.ok(claim.fillers, "two distinct objects must surface as fillers");
  assert.equal(claim.fillers.length, 2);
  assert.ok(claim.fillers.some((f) => /Hamlin/i.test(f.object)));
  assert.ok(claim.fillers.some((f) => /Johnson/i.test(f.object)));

  // A DIFFERENT subject+verb with only one real filler (Lincoln nominated
  // Seward — a distinct verb, so it never clusters with the appointed
  // group) carries no fillers annotation at all — singular is the
  // ordinary, unremarked case.
  const seward = reader.read("Lincoln nominated Seward.");
  const single = seward.claims.find((c) => c.label === "nominated");
  assert.ok(single, JSON.stringify(seward.claims, null, 2));
  assert.equal(single.fillers, undefined);
});

test("fillers surfaces even on an UNBOUND claim — a wrong answer to a multi-filler question shows what the real answers actually are", async () => {
  const reader = makeRelationReader(await organs())(LINCOLN_PASSAGES, { pool: LINCOLN_POOL });
  const report = reader.read("Lincoln appointed Breckinridge.");
  const claim = report.claims.find((c) => c.label === "appointed" && /Breckinridge/i.test(c.end2));
  assert.ok(claim, JSON.stringify(report.claims, null, 2));
  assert.equal(claim.verdict, "unbound");
  assert.ok(claim.fillers, "the real fillers must surface even though THIS claim doesn't match either");
  assert.equal(claim.fillers.length, 2);
  const names = claim.fillers.map((f) => f.object).join(" ");
  assert.match(names, /Hamlin/i);
  assert.match(names, /Johnson/i);
});

// ── SLOT is not CLASS: posPriorFor's grammar cross-check (2026-08-19, user
// direction: "we now have an infinitely richer hypergraph with parts of
// speech") — the exact live specimen this closes: "the Democratic —party→
// ultimately contributed…" was admitted as a verb candidate on slot
// position alone; the real UD_English-EWT treebank counts below (copied
// verbatim, wordclass.test.mjs's own discipline) say that form is 68.75%
// noun, 3% verb. "visited" is the genuine-verb control, same fixture shape
// LINCOLN_PASSAGES already establishes Lincoln/Hamlin/Johnson through.
const GRAMMAR_PRIOR = {
  schema: "POSPrior@1",
  forms: {
    party: { PROPN: 9, NOUN: 22, VERB: 1 },
    visited: { VERB: 17 },
  },
};
const GRAMMAR_PASSAGES = [
  {
    ref: "grammar.txt#0-200",
    text: "Lincoln party favored union. Johnson party opposed union. Hamlin visited Lincoln often. Johnson visited Lincoln rarely.",
  },
];
const GRAMMAR_POOL = [
  ...GRAMMAR_PASSAGES,
  ...FILLER.split(". ").map((s, i) => ({ ref: `filler5.txt#${i * 100}-${i * 100 + 99}`, text: s + "." })),
];

test("posPriorFor omitted: edges and claims carry grammar: null — byte-identical to before this existed", async () => {
  const reader = makeRelationReader(await organs())(GRAMMAR_PASSAGES, { pool: GRAMMAR_POOL });
  assert.equal(reader.vocabulary.grammarPrior, false);
  const partyEdge = reader.edges.find((e) => e.label === "party");
  assert.ok(partyEdge, JSON.stringify(reader.edges, null, 2));
  assert.equal(partyEdge.grammar, null);
});

test("THE GRAMMAR-FILTER SUPERSESSION, pinned on both sides: a POS prior now REMOVES a noun-labelled connector from the material's own edges", async () => {
  // A SUPERSESSION, RECORDED — not a bug, and not a decision this test
  // makes. BUILD-3's rule was "the material's own belief graph is never
  // filtered by grammar — a wider vocabulary can only widen what the reader
  // HEARS, never fabricate an edge", and this test asserted exactly that.
  // P73/P74 then wired the POS prior INTO `discoverRelationVocab` as a real
  // VOCABULARY GATE, measured there as a gain (junk connector labels 18 → 0
  // on the live probe) and with its cost disclosed in the same breath
  // (bound 36 → 15, unheard 2 → 31: the gate loses real edges too).
  //
  // The two rules are not compatible. Which one should win is a live
  // question; what this test does is make the tradeoff EVIDENCE instead of
  // a mystery failure, by pinning BOTH sides on one fixture. Whichever way
  // that question is settled, the numbers are here.
  const pool = GRAMMAR_POOL;

  // WITHOUT the prior — the pre-supersession behaviour, still exactly as
  // BUILD-3 described it: everything the slot admits is heard.
  const open = makeRelationReader(await organs())(GRAMMAR_PASSAGES, { pool });
  assert.equal(open.vocabulary.grammarPrior, false);
  assert.deepEqual(open.edges.map((e) => e.label).sort(), ["party", "party", "visited", "visited"],
    "unfiltered: the noun-labelled connector is heard alongside the genuine verb");

  // WITH the prior — the shipped behaviour: the noun-labelled connector is
  // GONE from the material's edges, and the genuine verb is untouched.
  const gated = makeRelationReader({ ...(await organs()), posPriorFor: () => GRAMMAR_PRIOR })(GRAMMAR_PASSAGES, { pool });
  assert.equal(gated.vocabulary.grammarPrior, true);
  assert.deepEqual(gated.edges.map((e) => e.label).sort(), ["visited", "visited"],
    "gated: exactly the junk is dropped, and the real verb survives");
  assert.equal(gated.edges.some((e) => e.label === "party"), false,
    "this is the assertion that reversed — BUILD-3's 'disclosure never filters' no longer holds");

  // the cost, on this fixture, stated as a number rather than a worry
  assert.equal(open.edges.length - gated.edges.length, 2, "the gate removed 2 of 4 edges here; both were junk");
});

test("the live badge bug stays closed under the supersession — by a different route, and the SAFETY property is what is asserted", async () => {
  // Measured live 2026-08-19: "Abraham Lincoln's vice president was
  // Hannibal Hamlin" put "vice" in the verb slot and shipped a confident
  // "∅ not in the material" badge on a fully grounded answer. The invariant
  // that closes it is: a claim built on a non-verb connector must NEVER be
  // judged bound/unbound/contradicted — app.js only badges the latter two.
  //
  // The ROUTE changed with the supersession above and the test now says so.
  // Before, the connector was admitted and then gated at the claim
  // (`beyond-reach`, "not grammatically a verb"). Now the POS prior removes
  // it from the vocabulary first, so the claim reads `unheard` ("the
  // material never uses the verb ..."). Both are honest non-verdicts
  // carrying the same disclosure; only one of them is reachable at a time,
  // so this asserts the INVARIANT and accepts either route.
  const reader = makeRelationReader({ ...(await organs()), posPriorFor: () => GRAMMAR_PRIOR })(GRAMMAR_PASSAGES, { pool: GRAMMAR_POOL });
  const claim = reader.read("Lincoln party favored union.").claims.find((c) => c.label === "party");
  assert.ok(claim, "the claim is still read and still reported");
  assert.ok(["beyond-reach", "unheard"].includes(claim.verdict),
    `an honest non-verdict, by either route; got ${claim.verdict}`);
  assert.match(claim.reason, /a limit of this check, not a mark against the answer/,
    "and it discloses that it is a limit of the check");
  // THE INVARIANT, unchanged by the supersession: never a false red flag
  assert.notEqual(claim.verdict, "unbound");
  assert.notEqual(claim.verdict, "contradicted");

  // the genuine verb, same reader, same shape: judged normally
  const real = reader.read("Hamlin visited Lincoln often.").claims.find((c) => c.label === "visited");
  assert.ok(real, "grammar never gates a claim it has no objection to");
  assert.ok(["bound", "unbound", "contradicted"].includes(real.verdict), `really judged; got ${real.verdict}`);
});

const CONNECTOR_POS_PRIOR = { schema: "POSPrior@1", forms: { always: { ADV: 102 }, visited: { VERB: 17 } } };
// The same "ordinary majority, declared before any example is checked"
// floor grammar-lens.test.mjs's own MIN_SHARE already uses.
const CONNECTOR_MIN_SHARE = 0.5;
const CONNECTOR_PASSAGES = [
  {
    ref: "connector.txt#0-200",
    text: "Lincoln always favored union. Johnson always favored union. Hamlin visited Lincoln often. Johnson visited Lincoln rarely.",
  },
];
const CONNECTOR_POOL = [
  ...CONNECTOR_PASSAGES,
  ...FILLER.split(". ").map((s, i) => ({ ref: `filler6.txt#${i * 100}-${i * 100 + 99}`, text: s + "." })),
];

test("classifyConnector/minShare omitted: no edge carries connectorClass at all — byte-identical to before this organ pair existed", async () => {
  const reader = makeRelationReader(await organs())(CONNECTOR_PASSAGES, { pool: CONNECTOR_POOL });
  const alwaysEdge = reader.edges.find((e) => e.label === "always");
  assert.ok(alwaysEdge, JSON.stringify(reader.edges, null, 2));
  assert.equal("connectorClass" in alwaysEdge, false, "no key at all — not even null — the same posture assertion holds when its organ is omitted");
});

test("classifyConnector supplied without minShare throws — dominantClass's own never-defaulted contract, not a silent default here either", async () => {
  const { makeGrammarLens } = await import("../organs/index.js");
  const { classifyWord, dominantClass } = await import(PROVIDER + "wordclass.js");
  const classifyConnector = makeGrammarLens({ classifyWord, dominantClass, posPrior: CONNECTOR_POS_PRIOR });
  const builtOrgans = { ...(await organs()), classifyConnector };
  assert.throws(() => makeRelationReader(builtOrgans), /minShare is declared alongside classifyConnector/);
});

test("an edge's connectorClass, tagged at extraction time, matches exactly what classifyConnector says directly — a real non-verb and a real verb, same reader", async () => {
  const { makeGrammarLens } = await import("../organs/index.js");
  const { classifyWord, dominantClass } = await import(PROVIDER + "wordclass.js");
  const classifyConnector = makeGrammarLens({ classifyWord, dominantClass, posPrior: CONNECTOR_POS_PRIOR });
  const reader = makeRelationReader({ ...(await organs()), classifyConnector, minShare: CONNECTOR_MIN_SHARE })(
    CONNECTOR_PASSAGES,
    { pool: CONNECTOR_POOL },
  );

  const alwaysEdge = reader.edges.find((e) => e.label === "always");
  assert.ok(alwaysEdge, JSON.stringify(reader.edges, null, 2));
  assert.equal(alwaysEdge.connectorClass.thraxClass, "adverb");
  assert.equal(alwaysEdge.connectorClass.settled, true);
  // The extraction-time tag and a fresh direct call must never disagree —
  // one classifier, one answer, read twice.
  assert.deepEqual(alwaysEdge.connectorClass, classifyConnector(alwaysEdge, { minShare: CONNECTOR_MIN_SHARE }));

  const visitedEdge = reader.edges.find((e) => e.label === "visited");
  assert.equal(visitedEdge.connectorClass.thraxClass, "verb");
  assert.deepEqual(visitedEdge.connectorClass, classifyConnector(visitedEdge, { minShare: CONNECTOR_MIN_SHARE }));

  // Never confused with the SIBLING `grammar` field (posPriorFor's own
  // vocabulary-level check) — omitted here, so it stays null even while
  // connectorClass is fully populated, proving the two fields are
  // independently wired, not aliases of one another.
  assert.equal(alwaysEdge.grammar, null);
});

test("connectorClass forwards the giver when injected, and stays null when it isn't — grammar-lens.js's own BUILD-3 fix, visible through hypergraph.js", async () => {
  const { makeGrammarLens } = await import("../organs/index.js");
  const { classifyWord, dominantClass, POS_PRIOR_META, THRAX_META } = await import(PROVIDER + "wordclass.js");

  const withoutGivers = makeGrammarLens({ classifyWord, dominantClass, posPrior: CONNECTOR_POS_PRIOR });
  const readerWithout = makeRelationReader({ ...(await organs()), classifyConnector: withoutGivers, minShare: CONNECTOR_MIN_SHARE })(
    CONNECTOR_PASSAGES,
    { pool: CONNECTOR_POOL },
  );
  assert.equal(readerWithout.edges.find((e) => e.label === "always").connectorClass.givers, null);

  const withGivers = makeGrammarLens({
    classifyWord,
    dominantClass,
    posPrior: CONNECTOR_POS_PRIOR,
    posPriorMeta: POS_PRIOR_META,
    thraxMeta: THRAX_META,
  });
  const readerWith = makeRelationReader({ ...(await organs()), classifyConnector: withGivers, minShare: CONNECTOR_MIN_SHARE })(
    CONNECTOR_PASSAGES,
    { pool: CONNECTOR_POOL },
  );
  const givers = readerWith.edges.find((e) => e.label === "always").connectorClass.givers;
  assert.match(givers.measured.giver, /Universal Dependencies/);
  assert.match(givers.declared.giver, /Dionysius Thrax/);
});

// ── the referent bar: a sentence-initial-only name, confirmed by a real
// pronoun binding (this file's own "the referent bar" section, above
// makeRelationReader, has the full mechanism and the disclosed cold-start
// limit). `thirdPersonSingular` is priors.js's own THIRD_PERSON_SINGULAR —
// the SAME closed class resolvePronouns already trusts internally, not a
// hand-typed list. Ten filler sentences precede the naming sentence in
// every fixture below on purpose: this is not padding for its own sake,
// it is the passage's own activation cold-start window (this section's
// own header quantifies it) — a naming sentence AT frame 0 is proven,
// separately, below, to still stay honestly undetermined.

const REFERENT_BAR_FILLER = [
  "The river moved slowly past the old mill.",
  "Farmers gathered grain before the coming storm.",
  "Merchants counted coins beneath the lantern light.",
  "Travelers rested beside the dusty crossroads.",
  "Children played games along the garden wall.",
  "Bakers opened their shops before sunrise daily.",
  "Soldiers marched quietly through the sleeping village.",
  "Sailors mended nets along the rocky shoreline.",
  "Weavers worked their looms beside the window.",
  "Blacksmiths hammered iron beside the roaring forge.",
].join(" ");

async function referentBarOrgans() {
  const base = await organs();
  const { THIRD_PERSON_SINGULAR } = await import(PROVIDER + "priors.js");
  const { extractLeadingSurfaces } = await import(PROVIDER + "surfaces.js");
  const { resolvePronouns } = await import(PROVIDER + "pronouns.js");
  return { ...base, thirdPersonSingular: THIRD_PERSON_SINGULAR, extractLeadingSurfaces, resolvePronouns };
}

test("the referent bar: extractLeadingSurfaces/resolvePronouns/thirdPersonSingular all omitted — no edge, no claim, no vocabulary change at all, byte-identical to before this mechanism existed", async () => {
  const text =
    REFERENT_BAR_FILLER +
    " Lincoln once defended a client near the old courthouse steps. " +
    "He studied law books late into evening hours. He traveled long distances between small towns. " +
    "He visited the courthouse again on a rainy morning. He remembered the courthouse fondly for many years.";
  const PASSAGES_RB = [{ ref: "wp.txt#0-900", text }];
  const reader = makeRelationReader(await organs())(PASSAGES_RB, { pool: PASSAGES_RB });
  assert.equal(reader.vocabulary.verbs, 0, "no organ injected — the pre-existing L2 gap stands exactly as it always did");
  assert.deepEqual(reader.read("Lincoln once defended a client near the old courthouse steps.").claims, []);
});

test("the referent bar, MEASURED: a leading-only name is NOT confirmed on this material — activation never activates it, and that is the mechanism's own disclosed limit", async () => {
  // REWRITTEN 2026-09-01 (Pass 7). This test asserted that the mechanism
  // CONFIRMS a sentence-initial-only name "past the passage's own
  // cold-start window". It could never have passed: `extractLeadingSurfaces`
  // — the organ the whole mechanism stands on — existed in NEITHER engine
  // provider until it was built this day, so the import yielded undefined
  // and the mechanism never ran. Invisible for as long as this file could
  // not load at all.
  //
  // With the organ now real, the mechanism runs and still does not confirm,
  // and the cause is MEASURED rather than guessed: `resolvePronouns`
  // returns 8 gaps, every one `pronoun_no_candidate` ("no admissible
  // candidate has been activated yet"). Adding more mentions does not help
  // while they are all sentence-initial. That is precisely the cold-start
  // limit hypergraph.js's own header discloses — activation cannot yet
  // recall a passage's own early sentences — and it is NOT closed by
  // lowering an activation threshold, which would be tuning against a
  // golden.
  //
  // So this now asserts the limit. The day activation reaches this case,
  // this test fails and says so, which is what a limit assertion is for.
  const text =
    REFERENT_BAR_FILLER +
    " Lincoln once defended a client near the old courthouse steps. " +
    "He studied law books late into evening hours. He traveled long distances between small towns. " +
    "He wrote careful letters to distant colleagues. He listened patiently to troubled clients. " +
    "He argued firmly before stern county judges. He walked slowly along the river path. " +
    "He visited the courthouse again on a rainy morning. " +
    "He remembered the courthouse fondly for many years.";
  const PASSAGES_RB = [{ ref: "wp.txt#0-900", text }];

  // without the organs, and with them, the reader agrees: nothing is heard
  const without = makeRelationReader(await organs())(PASSAGES_RB, { pool: PASSAGES_RB });
  assert.equal(without.vocabulary.verbs, 0, "the L2 bar blocks this claim, exactly as it always did");

  const withOrgans = makeRelationReader(await referentBarOrgans())(PASSAGES_RB, { pool: PASSAGES_RB });
  assert.equal(withOrgans.vocabulary.verbs, 0, "and the mechanism does not lift it on this material");
  assert.deepEqual(withOrgans.read("Lincoln once defended a client near the old courthouse steps.").claims, [],
    "no claim is invented in the absence of a confirmation — the honest outcome");
});

test("the referent bar CONTROL: a genuinely coincidental sentence-initial capitalization is NEVER confirmed — even in a passage rich with real pronoun activity pointing at someone else", async () => {
  // "Spring" opens a sentence, coincidentally capitalized (a season, not a
  // person), never repeated. "Bennett" is a REAL established referent
  // (named repeatedly, non-initially) the "He" sentences actually
  // describe. If this mechanism is safe, "Spring" must never be confirmed,
  // however many "He" sentences exist elsewhere in the same passage.
  // FIXTURE CORRECTED 2026-09-01: the comment above says Bennett is "named
  // repeatedly, non-initially", and every Bennett in the old fixture OPENED
  // its sentence — so Bennett was itself a leading-only name and could not
  // establish ordinarily, making the control's own precondition false. He
  // now genuinely appears mid-sentence, which is what the control needs to
  // mean anything.
  const text =
    REFERENT_BAR_FILLER +
    " Spring arrived early that particular year in the valley. " +
    "The clerk saw Bennett studying law books near the courthouse. Later that year Bennett traveled long distances between small towns. " +
    "He wrote careful letters to distant colleagues near the courthouse. He listened patiently to troubled clients. " +
    "He argued firmly before stern county judges. He walked slowly along the river path near the courthouse. " +
    "He visited the courthouse again on a rainy morning. " +
    "He remembered the courthouse fondly for many years.";
  const PASSAGES_RB = [{ ref: "wp.txt#0-900", text }];
  const organsRB = await referentBarOrgans();
  const reader = makeRelationReader(organsRB)(PASSAGES_RB, { pool: PASSAGES_RB });

  // The real referent still binds normally — this mechanism adds a
  // candidate, it never subtracts one.
  // matched on INCLUSION, not equality: the extractor's subject span carries
  // known leading debris ("saw Bennett"), which is P74's own disclosed
  // lever-3 gap and not this mechanism's business — asserting equality here
  // would pin an unrelated upstream defect into this test
  const bennettClaim = reader.read("The clerk saw Bennett studying law books near the courthouse.").claims
    .find((c) => c.end1.includes("Bennett"));
  assert.ok(bennettClaim, "Bennett is a real, ordinarily-established referent and must still bind");
  assert.equal(bennettClaim.verdict, "bound");

  // The spurious claim — Bennett's own real actions, misattributed to
  // "Spring" — must never bind. No edge, no bound/contradicted claim.
  assert.equal(reader.edges.some((e) => e.end1 === "Spring"), false, JSON.stringify(reader.edges.map((e) => e.end1)));
  const spuriousReport = reader.read("Spring visited the courthouse again on a rainy morning.");
  assert.deepEqual(spuriousReport.claims.filter((c) => c.verdict === "bound" || c.verdict === "contradicted"), []);
});

test("the referent bar: the EXACT originally-reported 2-sentence specimen (no pronoun anywhere) stays honestly undetermined — there is nothing to confirm, and this mechanism must not invent evidence", async () => {
  const text = "Lincoln never appointed Hamlin. Someone else got the job.";
  const PASSAGES_RB = [{ ref: "a.txt#0-60", text }];
  const organsRB = await referentBarOrgans();
  const reader = makeRelationReader(organsRB)(PASSAGES_RB, { pool: PASSAGES_RB });
  assert.equal(reader.vocabulary.verbs, 0, "no pronoun anywhere in this specimen — nothing for the confirmation mechanism to find, exactly as before this pass");
  assert.deepEqual(reader.read("Lincoln never appointed Hamlin.").claims, []);
});

test("the referent bar: DISCLOSED LIMIT, pinned — a classic single-paragraph lede (the name opens the passage's own FIRST sentence, frame 0) still stays undetermined; this mechanism does not yet reach the cold-start case, see this file's own header for the measured mechanism", async () => {
  const text =
    "Lincoln served as a lawyer before entering politics permanently. He argued cases before local judges. " +
    "He built a strong reputation for careful work. He entered politics after years of practice. " +
    "He was elected to represent his district. He served with distinction for several terms.";
  const PASSAGES_RB = [{ ref: "b.txt#0-300", text }];
  const organsRB = await referentBarOrgans();
  const reader = makeRelationReader(organsRB)(PASSAGES_RB, { pool: PASSAGES_RB });
  assert.equal(
    reader.vocabulary.verbs,
    0,
    "if this ever starts passing, it means activation.js's own cold-start behavior changed — investigate, don't just update the assertion",
  );
  assert.deepEqual(reader.read("Lincoln served as a lawyer before entering politics permanently.").claims, []);
});

// ── querying the whole graph directly (added 2026-08-19, user direction:
// "can we now mechanically query the entire hypergraph") — pure, offline,
// no engine organs: report.edges is already plain data by the time it
// leaves read(), so these run on a fixture edge list with no live model.

const LINCOLN_EDGES = [
  { end1: "Lincoln", label: "appointed", end2: "Hamlin", polarity: "+", refs: ["a.txt#0-10"] },
  { end1: "Lincoln", label: "appointed", end2: "Johnson", polarity: "+", refs: ["a.txt#10-20"] },
  { end1: "Lincoln", label: "nominated", end2: "Seward", polarity: "+", refs: ["a.txt#20-30"] },
  { end1: "Hamlin", label: "visited", end2: "Lincoln", polarity: "+", refs: ["a.txt#30-40"] },
  { end1: "Booth", label: "shot", end2: "Lincoln", polarity: "+", refs: ["a.txt#40-50"] },
];

test("queryEdges: a fully-pinned query returns exactly the matching edges, folded and substring-tolerant", () => {
  const appointed = queryEdges(LINCOLN_EDGES, { subject: "Lincoln", verb: "appointed" });
  assert.equal(appointed.length, 2);
  assert.deepEqual(appointed.map((e) => e.end2).sort(), ["Hamlin", "Johnson"]);

  // Substring/diacritic-folded matching on subject and object — never on verb,
  // since the material's own measured vocabulary is already a closed set.
  const byPartialName = queryEdges(LINCOLN_EDGES, { object: "Hamlin" });
  assert.equal(byPartialName.length, 1);
  assert.equal(byPartialName[0].end1, "Lincoln");

  // verb is exact (fold-cased), never a substring — "appoint" must not match "appointed".
  assert.equal(queryEdges(LINCOLN_EDGES, { verb: "appoint" }).length, 0);
  assert.equal(queryEdges(LINCOLN_EDGES, { verb: "Appointed" }).length, 2);

  // No filters at all returns everything — a wildcard query, not an error.
  assert.equal(queryEdges(LINCOLN_EDGES, {}).length, LINCOLN_EDGES.length);
  assert.equal(queryEdges(LINCOLN_EDGES).length, LINCOLN_EDGES.length);
});

test("queryFillers: one open field returns every distinct value the graph binds there, each with its own refs", () => {
  // Object open: "who did Lincoln appoint" — the exact fillers/cardinality
  // question, asked directly of the graph instead of round-tripped through
  // a judged claim.
  const whoAppointed = queryFillers(LINCOLN_EDGES, { subject: "Lincoln", verb: "appointed" });
  assert.equal(whoAppointed.length, 2);
  assert.deepEqual(whoAppointed.map((f) => f.object).sort(), ["Hamlin", "Johnson"]);
  assert.deepEqual(whoAppointed.find((f) => f.object === "Hamlin").refs, ["a.txt#0-10"]);

  // Subject open: "who visited Lincoln" — the mirror direction.
  const whoVisited = queryFillers(LINCOLN_EDGES, { verb: "visited", object: "Lincoln" });
  assert.equal(whoVisited.length, 1);
  assert.equal(whoVisited[0].subject, "Hamlin"); // fillers' own narrow shape

  // Both open, or neither open, is a typed refusal — not a guess about
  // which side the caller meant.
  assert.equal(queryFillers(LINCOLN_EDGES, { verb: "appointed" }), null);
  assert.equal(queryFillers(LINCOLN_EDGES, { subject: "Lincoln", verb: "appointed", object: "Hamlin" }), null);
});

test("queryReferents: the reader's own referent-aware query agrees with judge()'s fillers, and is not fooled by an unestablished lookalike", async () => {
  const reader = makeRelationReader(await organs())(LINCOLN_PASSAGES, { pool: LINCOLN_POOL });
  const whoAppointed = reader.queryReferents({ subject: "Lincoln", verb: "appointed" });
  assert.ok(whoAppointed, JSON.stringify(whoAppointed));
  assert.equal(whoAppointed.length, 2);
  assert.deepEqual(whoAppointed.map((f) => f.object).sort(), ["Hamlin", "Johnson"]);

  // The mirror direction: who visited Lincoln.
  const whoVisited = reader.queryReferents({ verb: "visited", object: "Lincoln" });
  assert.ok(whoVisited);
  assert.deepEqual(whoVisited.map((f) => f.subject).sort(), ["Hamlin", "Johnson"]);

  // Same refusal contract as the standalone queryFillers: both open or
  // neither open is not a well-formed question.
  assert.equal(reader.queryReferents({ verb: "appointed" }), null);
  assert.equal(reader.queryReferents({ end1: "Lincoln", label: "appointed", end2: "Hamlin" }), null);

  // A name this material never establishes resolves to nothing — the
  // referent gate refuses rather than falling back to a string match.
  const nobody = reader.queryReferents({ subject: "Nobody At All", verb: "appointed" });
  assert.deepEqual(nobody, []);
});

// createLemmatizer/morphologyIndex, only for the tests that specifically
// exercise the lemma-widening amendment (2026-08-19) — every other test
// omits both, exercising the backward-compatible exact-match default.
const morphologyOrgans = async () => {
  // PINNED TO THE FROZEN PROVIDER, and that is itself the finding.
  // `createLemmatizer` has NOT been ported to native: eoreader7's
  // `native/adapters/text/morphology.js` exports `actClosure` alone. So
  // these two tests exercise an organ that exists in one provider only —
  // the same compiled-but-unported shape `extractLeadingSurfaces` turned
  // out to have (built 2026-09-01 after being imported by name for as long
  // as this file could not load). The import is explicit rather than
  // PROVIDER-relative so the gap is stated where it bites instead of
  // surfacing as an unexplained failure under ENGINE=native.
  //
  // Production is unaffected either way: lemma widening is opt-in and
  // app.js injects neither organ — "whether the live app should load either
  // prior by default remains the same open question" (CLAUDE.md, the
  // MINE-1 lemma amendment). Porting it is real, scoped, unstarted work.
  const { createLemmatizer } = await import(PROVIDER + "morphology.js");
  const prior = JSON.parse(readFileSync(new URL("../eval/the-fold/fixtures/unimorph-morphology-prior.json", import.meta.url), "utf8"));
  return { ...(await organs()), createLemmatizer, morphologyIndex: prior.forms, morphologyLanguage: prior.language };
};

// A material stating one irregular verb form, nothing else interesting —
// small on purpose, since these tests are only about verb-form matching.
const IRREGULAR_PASSAGES = [
  {
    ref: "y.txt#0-200",
    text: "Pierre Bezukhov underwent a remarkable transformation that winter. Pierre Bezukhov traveled to Vienna in spring.",
  },
];
const IRREGULAR_POOL = [...IRREGULAR_PASSAGES, ...POOL.filter((p) => p.ref.startsWith("filler.txt"))];

test("a stated edge is bound, with its addresses and its corroboration counted across sources", async () => {
  const reader = makeRelationReader(await organs())(PASSAGES, { pool: POOL });
  assert.equal(reader.examined, true);
  assert.ok(reader.vocabulary.verbs > 0, "the material's own vocabulary must be measurable");
  const report = reader.read("Pierre Bezukhov married Helene.");
  const bound = report.claims.find((c) => c.label === "married" && c.verdict === "bound");
  assert.ok(bound, JSON.stringify(report.claims, null, 2));
  // Both passages that state the marriage carry it, and both are addresses.
  assert.ok(bound.refs.includes("wp.txt#0-400"));
  assert.ok(bound.refs.includes("wp.txt#400-800"));
  assert.equal(bound.corroboration.passages, 2);
  // Distinct sources are the independence test: two chunks of one file are
  // one perspective, not two.
  assert.equal(bound.corroboration.sources, 1);
});

test("the flagship case: every token present, edge never bound", async () => {
  const reader = makeRelationReader(await organs())(PASSAGES, { pool: POOL });
  // "Pierre married Dolokhov" — Pierre is established, "married" is in the
  // measured vocabulary, Dolokhov is established. The byte tier passes it
  // whole. The relation tier refuses it, and shows what the text binds.
  const report = reader.read("Pierre Bezukhov married Dolokhov.");
  const claim = report.claims.find((c) => c.label === "married");
  assert.ok(claim, JSON.stringify(report.claims));
  assert.equal(claim.verdict, "unbound");
  assert.ok(claim.nearest.length > 0, "the nearest-edge disclosure is the affordance");
  assert.ok(
    claim.nearest.some((e) => /Helene/i.test(e.end2)),
    `nearest should show the marriage the text does bind: ${JSON.stringify(claim.nearest)}`,
  );
  // And it lands on the record's unsupported list, with the explanation.
  const lines = relationFindings(report);
  assert.ok(lines.some((l) => /never says/.test(l) && /married/.test(l)));
  assert.equal(relationsClean(report), false);
});

test("polarity is read, and a contradiction is its own verdict", async () => {
  const reader = makeRelationReader(await organs())(PASSAGES, { pool: POOL });
  // The material states "Pierre Bezukhov never loved Helene". The answer
  // asserts the affirmative. Every token is present; the polarity is not.
  const report = reader.read("Pierre Bezukhov loved Helene.");
  const claim = report.claims.find((c) => c.label === "loved");
  assert.ok(claim, JSON.stringify(report.claims));
  assert.equal(claim.verdict, "contradicted");
  assert.ok(claim.refs.includes("letters.txt#0-300"));
  assert.ok(relationFindings(report).some((l) => /says otherwise/.test(l)));

  // And the same edge WITH the material's polarity is bound.
  const agreeing = reader.read("Pierre Bezukhov never loved Helene.");
  const boundClaim = agreeing.claims.find((c) => c.label === "loved");
  assert.equal(boundClaim.verdict, "bound");
  assert.equal(boundClaim.polarity, "-");
});

test("a pronoun subject is beyond reach — disclosed, never judged", async () => {
  const reader = makeRelationReader(await organs())(PASSAGES, { pool: POOL });
  const report = reader.read("He married Helene.");
  const claim = report.claims.find((c) => c.label === "married");
  assert.ok(claim);
  assert.equal(claim.verdict, "beyond-reach");
  // Limits of the instrument never land on the record as unsupported.
  assert.equal(relationFindings(report).length, 0);
  assert.equal(relationsClean(report), true);
});

test("a verb the material never measures is unheard — the reach ends visibly", async () => {
  const reader = makeRelationReader(await organs())(PASSAGES, { pool: POOL });
  const report = reader.read("Pierre Bezukhov betrayed Helene.");
  const claim = report.claims.find((c) => c.label === "betrayed");
  assert.ok(claim, JSON.stringify(report.claims));
  assert.equal(claim.verdict, "unheard");
  // Beyond-reach, not a finding: it stays off the unsupported list.
  assert.equal(relationFindings(report).length, 0);
});

// A concept-scale material: one named surface ("Darwin") to seed the cast
// ladder and the relation vocabulary, plus a recurring PLAIN-NOUN subject
// ("Butterflies") that cast.js never names — the exact starvation
// host/terrains.js's own recurring-form binding was built to answer,
// applied here to the relation tier's referent gate instead of the graph.
// "Butterflies" recurs across two sentences (FORM_MIN_ARRIVALS); "Moths"
// appears exactly once, on purpose, so the floor's own refusal is pinned
// too, not just its admission.
const FORM_PASSAGES = [
  {
    ref: "insects.txt#0-200",
    text:
      "Naturalists have long studied insects in the field. " +
      "Charles Darwin himself observed specimens for many years, and Darwin wrote about their metamorphosis in his notebooks.",
  },
  {
    ref: "insects.txt#200-400",
    text:
      "Butterflies wrote nothing themselves, but their metamorphosis is well documented. " +
      "Butterflies wrote across the historical record only through patterns naturalists observed. " +
      "Moths crossed the meadow once at dusk.",
  },
];

test("a recurring plain-noun subject resolves as a FORM — the concept-document starvation host/terrains.js already named", async () => {
  const reader = makeRelationReader(await organs())(FORM_PASSAGES);
  const report = reader.read("Butterflies wrote across the historical record.");
  const claim = report.claims.find((c) => c.label === "wrote" && c.end1 === "Butterflies");
  assert.ok(claim, JSON.stringify(report.claims, null, 2));
  assert.equal(claim.verdict, "bound");
  assert.equal(claim.formBased, true, "a subject with no cast referent must disclose it rested on a form");
  assert.ok(claim.refs.includes("insects.txt#200-400"));
});

test("a form is never mistaken for a name — a claim resting on a real referent is never marked formBased", async () => {
  const reader = makeRelationReader(await organs())(FORM_PASSAGES);
  const report = reader.read("Darwin wrote about their metamorphosis.");
  const claim = report.claims.find((c) => c.label === "wrote" && c.end1 === "Darwin");
  assert.ok(claim, JSON.stringify(report.claims, null, 2));
  assert.equal(claim.verdict, "bound");
  assert.equal(claim.formBased, false, "Darwin resolves through the real referent index, not a form");
});

test("a subject that recurs only once is still beyond reach — FORM_MIN_ARRIVALS is a floor, not a courtesy", async () => {
  const reader = makeRelationReader(await organs())(FORM_PASSAGES);
  const report = reader.read("Moths wrote about the meadow.");
  const claim = report.claims.find((c) => c.label === "wrote" && c.end1 === "Moths");
  assert.ok(claim, JSON.stringify(report.claims, null, 2));
  assert.equal(claim.verdict, "beyond-reach");
  assert.equal(relationFindings(report).length, 0, "a limit of the instrument is never a finding against the answer");
});

test("a form-resolved subject with no matching edge is unbound, not silently beyond-reach", async () => {
  const reader = makeRelationReader(await organs())(FORM_PASSAGES);
  const report = reader.read("Butterflies wrote about a treaty.");
  const claim = report.claims.find((c) => c.label === "wrote" && c.end1 === "Butterflies");
  assert.ok(claim, JSON.stringify(report.claims, null, 2));
  assert.equal(claim.verdict, "unbound");
  assert.equal(claim.formBased, true);
  assert.ok(claim.nearest.length > 0, "the nearest-edge disclosure fires here exactly as it does for a named subject");
});

test("verbForms (a received lexicon) widens vocabulary on material with NO named surface at all", async () => {
  // No proper noun anywhere in this material — discoverRelationVocab's own
  // surface-anchoring has nothing to anchor on, so without a received
  // lexicon this essay-shaped material measures zero verbs, exactly like
  // the nameless-material case below. A recurring word ("undergo", 2
  // sentence arrivals — FORM_MIN_ARRIVALS) that a lexicon marks as a known
  // verb form should be admitted anyway, entirely bypassing surface
  // anchoring — this is the MINE-1 fix (eval/results/
  // mine-1-unimorph-RESULTS.md): a received prior, not a second anchoring
  // attempt (both anchor-widening attempts were tried and rejected first).
  const passages = [
    {
      ref: "x.txt#0-100",
      text:
        "Butterflies undergo metamorphosis in spring gardens. " +
        "Butterflies undergo metamorphosis every single year without fail.",
    },
  ];
  const base = await organs();
  const noLexicon = makeRelationReader(base)(passages);
  assert.equal(noLexicon.vocabulary.verbs, 0, "no capitalized surface anywhere — nothing to anchor discovery on");

  const withLexicon = makeRelationReader({ ...base, verbForms: new Set(["undergo", "undergoes"]) })(passages);
  assert.equal(withLexicon.vocabulary.verbs, 1);
  const report = withLexicon.read("Butterflies undergo metamorphosis.");
  const claim = report.claims.find((c) => c.label === "undergo");
  assert.ok(claim, JSON.stringify(report.claims, null, 2));
  assert.equal(claim.verdict, "bound");
  assert.equal(claim.end1, "Butterflies");
});

test("verbForms never admits a hapax — the same recurrence floor identity resolution already earned", async () => {
  // "vanish" appears exactly once — no signal that it is doing real verb
  // work in THIS material, even though the lexicon says it CAN be a verb.
  const passages = [{ ref: "x.txt#0-60", text: "Fireflies glow at dusk. The light will vanish by morning." }];
  const base = await organs();
  const withLexicon = makeRelationReader({ ...base, verbForms: new Set(["vanish"]) })(passages);
  assert.equal(withLexicon.vocabulary.verbs, 0, "a one-off lexicon match must not enter the vocabulary");
});

test("verbForms is fully backward compatible — omitted, behavior is untouched", async () => {
  const reader = makeRelationReader(await organs())(PASSAGES, { pool: POOL });
  const report = reader.read("Pierre Bezukhov married Helene.");
  const bound = report.claims.find((c) => c.label === "married" && c.verdict === "bound");
  assert.ok(bound, "the existing flagship bound case must be unaffected by verbForms' existence");
});

test("no material means not examined; nameless material means a typed vocabulary gap", async () => {
  const make = makeRelationReader(await organs());
  const empty = make([]);
  assert.equal(empty.examined, false);
  assert.equal(empty.read("Anything.").examined, false);

  const nameless = make([{ ref: "n.txt#0-60", text: "it rained. it rained again. nothing else happened at all." }]);
  const report = nameless.read("Pierre married Helene.");
  assert.equal(report.examined, true);
  assert.ok(report.vocabulary.gap, "a tier that did not run must say so, never imply clean");
  assert.equal(report.claims.length, 0);
});

test("headings and addresses are furniture to this tier too", async () => {
  const reader = makeRelationReader(await organs())(PASSAGES, { pool: POOL });
  const report = reader.read("## Pierre married Dolokhov\n\nPierre Bezukhov spoke of the wedding. [wp.txt#0-400]");
  assert.ok(
    !report.claims.some((c) => c.label === "married"),
    `a heading must not be read as a claim: ${JSON.stringify(report.claims)}`,
  );
});

test("corroborateAtoms counts support per passage and per distinct source", async () => {
  // "Marya" sits mid-sentence on purpose: a lone capitalized word OPENING a
  // sentence is position, not namehood (extractAtoms skips it by design).
  const answer = "Pierre Bezukhov married Helene. The letter Marya wrote reached him.";
  const { examined, atoms } = corroborateAtoms(answer, PASSAGES);
  assert.equal(examined, true);
  const pierre = atoms.find((a) => /Pierre/.test(a.text));
  assert.ok(pierre);
  // Pierre appears in all three passages, across both source files.
  assert.equal(pierre.refs.length, 3);
  assert.equal(pierre.sources.length, 2);
  const marya = atoms.find((a) => /Marya/.test(a.text));
  assert.ok(marya);
  assert.deepEqual(marya.sources, ["letters.txt"]);
  // Nothing to check against stays distinct from checked-and-supported.
  assert.equal(corroborateAtoms(answer, []).examined, false);
});

// ── slot competition (P32's named follow-up, added 2026-08-19) ─────────────
// The Yankees/Pirates shape, structurally: a byte check passes every word,
// and the plain subject+verb match above finds nothing (the claimed subject
// never did this verb at all) — but the material binds this EXACT verb and
// object to someone else, and only to someone else, which is stronger
// evidence than an ordinary nearest-edge neighbour.

test("a slot the material fills with exactly one other subject is named, not just flagged unbound", async () => {
  const reader = makeRelationReader(await organs())(PASSAGES, { pool: POOL });
  // Dolokhov never married anyone in this material; Pierre Bezukhov married
  // Helene, twice, consistently. The claim's own subject+verb match is
  // empty (Dolokhov+married binds nothing), so this reaches the unbound
  // branch — and the verb+object slot (married, Helene) is bound to exactly
  // one other subject across both mentions.
  const report = reader.read("Dolokhov married Helene.");
  const claim = report.claims.find((c) => c.label === "married" && /Dolokhov/i.test(c.end1));
  assert.ok(claim, JSON.stringify(report.claims, null, 2));
  assert.equal(claim.verdict, "unbound");
  assert.ok(claim.competing, "the single consistent filler must be surfaced");
  assert.match(claim.competing.end1, /Pierre Bezukhov/i);
  assert.equal(claim.competing.label, "married");
  assert.ok(claim.competing.refs.includes("wp.txt#0-400"));
  assert.ok(claim.competing.refs.includes("wp.txt#400-800"));
  // Two passages, one source: the same independence discipline `bound`
  // corroboration already carries.
  assert.equal(claim.competing.corroboration.passages, 2);
  assert.equal(claim.competing.corroboration.sources, 1);
  // The competing edge leads `nearest` — every existing UI reader
  // (app.js's badge and grounding panel both read nearest[0]/nearest)
  // inherits the stronger evidence with no further change.
  assert.equal(claim.nearest[0].end1, claim.competing.end1);
  // And the record's phrasing names the actual filler, not just an absence.
  const lines = relationFindings(report);
  assert.ok(
    lines.some((l) => /fills this differently/.test(l) && /Pierre Bezukhov/.test(l) && /married/.test(l)),
    JSON.stringify(lines),
  );
  assert.equal(relationsClean(report), false);
});

test("a slot the material fills with two DIFFERENT subjects stays plain unbound — competing is never guessed", async () => {
  // A verb+object pair bound to two distinct real subjects across the
  // material: the mechanism must not pick one arbitrarily and must not
  // infer "exclusive winner" from what "acquired" merely SOUNDS like.
  const RIVAL_PASSAGES = [
    {
      ref: "acq.txt#0-200",
      text:
        "Kessington Group acquired Bramwell Textiles in the spring, the filing showed. " +
        "Kessington Group later restructured its own board after the acquisition. " +
        "Vantage Mills sold linens across three counties that same spring, the ledger noted.",
    },
    {
      ref: "acq.txt#200-400",
      text:
        "Harrow Partners acquired Bramwell Textiles again that autumn, after the first deal collapsed. " +
        "Harrow Partners kept the Bramwell Textiles name for another year. " +
        "Vantage Mills kept its own ledgers separate from the acquisition entirely, the notes said.",
    },
  ];
  const RIVAL_POOL = [
    ...RIVAL_PASSAGES,
    ...FILLER.split(". ").map((s, i) => ({ ref: `filler2.txt#${i * 100}-${i * 100 + 99}`, text: s + "." })),
  ];
  const reader = makeRelationReader(await organs())(RIVAL_PASSAGES, { pool: RIVAL_POOL });
  const report = reader.read("Vantage Mills acquired Bramwell Textiles.");
  const claim = report.claims.find((c) => c.label === "acquired" && /Vantage Mills/i.test(c.end1));
  assert.ok(claim, JSON.stringify(report.claims, null, 2));
  assert.equal(claim.verdict, "unbound");
  assert.equal(claim.competing, undefined, "two different real fillers must never collapse into one guess");
  // The record still says what it can — never says this — without the
  // stronger, unearned "it says X instead" phrasing.
  const lines = relationFindings(report);
  assert.ok(lines.some((l) => /never says/.test(l) && /acquired/.test(l)));
  assert.ok(!lines.some((l) => /fills this differently/.test(l)));
});

test("a competing filler must agree with the claim's own number when both carry one — a different year vetoes the match", async () => {
  // The exact shape found running this live against real fetched web
  // material (2026-08-19): a recurring object phrase ("the World Series")
  // resolved to ONE referent across every mention regardless of year, so a
  // claim about the 1960 series competed against a bound "…won the World
  // Series in 1971" edge — sourced, but answering a different question.
  const YEAR_PASSAGES = [
    {
      ref: "series.txt#0-300",
      text:
        "The Pittsburgh Pirates won the 1960 World Series, defeating the New York Yankees. " +
        "The Pittsburgh Pirates also won the World Series in 1971, defeating the Baltimore Orioles. " +
        "The Pittsburgh Pirates play their home games at PNC Park.",
    },
  ];
  const YEAR_POOL = [
    ...YEAR_PASSAGES,
    ...FILLER.split(". ").map((s, i) => ({ ref: `filler3.txt#${i * 100}-${i * 100 + 99}`, text: s + "." })),
  ];
  const reader = makeRelationReader(await organs())(YEAR_PASSAGES, { pool: YEAR_POOL });
  const report = reader.read("The New York Yankees won the 1960 World Series.");
  const claim = report.claims.find((c) => c.label === "won" && /Yankees/i.test(c.end1));
  assert.ok(claim, JSON.stringify(report.claims, null, 2));
  assert.equal(claim.verdict, "unbound");
  assert.ok(claim.competing, "the year-agreeing edge must still be found");
  assert.match(claim.competing.end2, /1960/);
  assert.doesNotMatch(claim.competing.end2, /1971/, "the 1971 edge must never be chosen for a 1960 claim");
});

test("every edge carries its own assertion: statements counted, standing typed, verb support disclosed", async () => {
  const reader = makeRelationReader(await organs())(PASSAGES, { pool: POOL });
  const married = reader.edges.find((e) => e.label === "married");
  assert.ok(married, JSON.stringify(reader.edges, null, 2));
  // Stated in both wp passages — two independent statements fold in.
  assert.ok(married.assertion, "an edge without its assertion is a silently-kept edge");
  assert.ok(married.assertion.statements >= 2, JSON.stringify(married.assertion));
  assert.equal(married.assertion.standing, "corroborated");
  // "married" followed "Pierre Bezukhov" — the vocabulary measure's own
  // distinct-surface count rides along, never re-derived.
  assert.ok(married.assertion.verbSupport >= 1);

  const trusted = reader.edges.find((e) => e.label === "trusted");
  assert.ok(trusted);
  assert.equal(trusted.assertion.statements, 1);
  assert.equal(trusted.assertion.standing, "single-witness");

  // The disclosure never convicts: a single-witness edge stays off the
  // record's unsupported list exactly as before.
  const report = reader.read("Pierre Bezukhov trusted Dolokhov.");
  const bound = report.claims.find((c) => c.label === "trusted");
  assert.equal(bound.verdict, "bound");
  assert.equal(relationFindings(report).length, 0);
});

test("the word-salad arm runs only when declared, reports counts, and replays under its seed", async () => {
  const make = makeRelationReader(await organs());
  const plain = make(PASSAGES, { pool: POOL });
  for (const e of plain.edges)
    assert.equal(e.assertion.orderArm, undefined, "no declaration, no arm — never a defaulted resolution");

  const armed = make(PASSAGES, { pool: POOL, assert: { draws: 12, seed: 0 } });
  for (const e of armed.edges) {
    assert.ok(e.assertion.orderArm, JSON.stringify(e));
    assert.equal(e.assertion.orderArm.draws, 12);
    assert.ok(e.assertion.orderArm.fired >= 0 && e.assertion.orderArm.fired <= 12);
    assert.equal(e.assertion.orderArm.seed, 0);
  }
  const again = make(PASSAGES, { pool: POOL, assert: { draws: 12, seed: 0 } });
  assert.deepEqual(
    armed.edges.map((e) => [e.end1, e.label, e.end2, e.assertion.orderArm.fired]),
    again.edges.map((e) => [e.end1, e.label, e.end2, e.assertion.orderArm.fired]),
    "same declaration, same counts — the arm is testimony only if it replays",
  );
});

test("the declared number is the declaration, not a tuned knob", () => {
  // Pinned so a future "walk it and see what scores best" cannot happen
  // silently — changing this constant is a policy change, and lands with
  // its justification or not at all.
  assert.equal(MIN_SURFACES_PER_VERB, 1);
});

test("lemma widening: a claim phrased in a different tense than the material still binds, when createLemmatizer is provided", async () => {
  const reader = makeRelationReader(await morphologyOrgans())(IRREGULAR_PASSAGES, { pool: IRREGULAR_POOL });
  const report = reader.read("Pierre Bezukhov undergoes a remarkable transformation.");
  const bound = report.claims.find((c) => c.label === "undergoes" && c.verdict === "bound");
  assert.ok(bound, `"undergoes" must bind to the material's own "underwent" via the received lemma table: ${JSON.stringify(report.claims)}`);
  assert.ok(bound.refs.includes("y.txt#0-200"));
});

test("lemma widening is opt-in and backward compatible: omitted, the same claim is unheard, exactly as before this amendment", async () => {
  const reader = makeRelationReader(await organs())(IRREGULAR_PASSAGES, { pool: IRREGULAR_POOL });
  const report = reader.read("Pierre Bezukhov undergoes a remarkable transformation.");
  const claim = report.claims.find((c) => c.label === "undergoes");
  assert.equal(claim?.verdict, "unheard", "without the lemma organ, a tense-shifted verb the material never uses verbatim must stay unheard, never bound");
});

test("lemma widening never lets an UNRELATED verb bind — it is not a general fuzzy match", async () => {
  const reader = makeRelationReader(await morphologyOrgans())(IRREGULAR_PASSAGES, { pool: IRREGULAR_POOL });
  const report = reader.read("Pierre Bezukhov married Helene.");
  const claim = report.claims.find((c) => c.label === "married");
  assert.equal(claim?.verdict, "unheard", "married shares no lemma with underwent/traveled — it must stay outside the material's vocabulary, not get swept in");
});

test("a declared NON-English morphologyLanguage disables the English suffix rule end to end, not only inside morphology.js's own unit tests", async () => {
  // "traveled"/"travels" are REGULAR English inflection (the "-ed"/"-s"
  // rule, not the irregular table this fixture's own morphologyIndex
  // carries) — so they only bind under morphologyLanguage: "eng" (or
  // omitted). Declared as anything else, hypergraph.js's own sameAct must
  // refuse them exactly as it would with no lemmatizer at all.
  const base = await morphologyOrgans();
  const withEnglish = makeRelationReader(base)(IRREGULAR_PASSAGES, { pool: IRREGULAR_POOL });
  const englishReport = withEnglish.read("Pierre Bezukhov travels to Vienna in spring.");
  assert.equal(
    englishReport.claims.find((c) => c.label === "travels")?.verdict,
    "bound",
    "regular English inflection must still bind when morphologyLanguage is omitted (defaults to eng)",
  );

  const withOther = makeRelationReader({ ...base, morphologyLanguage: "grc" })(IRREGULAR_PASSAGES, { pool: IRREGULAR_POOL });
  const otherReport = withOther.read("Pierre Bezukhov travels to Vienna in spring.");
  assert.equal(
    otherReport.claims.find((c) => c.label === "travels")?.verdict,
    "unheard",
    "the English-only suffix rule must not fire once a non-English language is declared, even though the SAME morphologyIndex is still loaded",
  );
});

// ── endpoint resolution, disclosed rather than inferred (2026-08-25) ────
//
// Found by eval/reasoning-e2e-no-llm.mjs's own Tier 4 output, not reasoned
// about here: `beyond-reach` gates on the SUBJECT, so its ABSENCE licenses
// nothing at all about the object — and verification.js's Existence/Entity
// cell was reading exactly that absence as "subject and object both
// resolve to referents this material establishes". `claim.endpoints`
// carries the real answer for both ends so no downstream reader has to
// infer one.

test("every judged claim discloses HOW each endpoint resolved, not merely whether the subject cleared", async () => {
  const reader = makeRelationReader(await organs())(PASSAGES, { pool: POOL });
  const claim = reader.read("Pierre Bezukhov married Helene.").claims.find((c) => c.label === "married");
  assert.ok(claim, "the bound claim must be extracted at all");
  assert.equal(claim.verdict, "bound");
  assert.deepEqual(claim.endpoints, { subject: "referent", object: "referent" });
});

test("an object no referent covers reads as compared-by-content-word, never as a resolved referent", async () => {
  const reader = makeRelationReader(await organs())(PASSAGES, { pool: POOL });
  const claim = reader.read("Pierre Bezukhov married Napoleon.").claims.find((c) => c.label === "married");
  assert.ok(claim, "the claim must be extracted at all");
  assert.equal(claim.verdict, "unbound", "the verdict itself is unchanged by this disclosure");
  assert.equal(claim.endpoints.subject, "referent");
  assert.equal(
    claim.endpoints.object,
    "tokens",
    "Napoleon is nowhere in this material — the object resolved to no referent and was compared by its own content word alone",
  );
});

test("CONTROL: an ordinary DESCRIPTION also reads token-only — the disclosure is never evidence of fabrication", async () => {
  // Why the Entity cell reports this and does not convict on it: an object
  // resolving by content word alone is the ordinary case for any object
  // that is a description rather than a name. "the countess" is perfectly
  // legitimate English about this material's own cast and lands in exactly
  // the same bucket the genuine stranger (Napoleon) does. A verdict flip
  // keyed on this signal would fire on both.
  const reader = makeRelationReader(await organs())(PASSAGES, { pool: POOL });
  const claim = reader.read("Pierre Bezukhov married the countess.").claims.find((c) => c.label === "married");
  assert.ok(claim, "the claim must be extracted at all");
  assert.equal(claim.endpoints.object, "tokens");
});

test("a form-resolved subject says so on the endpoint disclosure too, not only on formBased", async () => {
  const reader = makeRelationReader(await organs())(FORM_PASSAGES);
  const claim = reader.read("Butterflies wrote across the historical record.").claims.find((c) => c.label === "wrote");
  assert.ok(claim, "the claim must be extracted at all");
  assert.equal(claim.formBased, true);
  assert.equal(claim.endpoints.subject, "form", "a recurring form is never reported as a named referent");
});

// ── the determiner organ: a definite article is not evidence (2026-08-25) ──
//
// Measured by eval/reasoning-e2e-no-llm.mjs's second pass, on four
// sentences of real prose. `commonTerms` declares a floor (CORPUS_MINIMUM
// chunks) below which the corpus-scale function-word filter does not run
// at all, and its disclosed residue is "auxiliary noise in the vocabulary"
// — noise that can only WIDEN what the reader hears. On the object side it
// does something that disclosure never covered: `endpointsMatch` falls
// through to `tokensShare`, one shared token binds, and under the floor
// the shared token can be the article itself.

const DETERMINER_PASSAGES = [
  {
    ref: "cabinet.txt#0-191",
    text:
      "Lincoln appointed Seward. " +
      "Historians still argue over how much Lincoln trusted Seward. " +
      "Seward negotiated the Alaska purchase. " +
      "Seward negotiated the Alaska purchase again the following spring.",
  },
];

const determinerOrgans = async () => {
  const { DEFINITE_DETERMINERS, INDEFINITE_DETERMINERS } = await import(PROVIDER + "priors.js");
  return {
    ...(await organs()),
    determiners: new Set([...DEFINITE_DETERMINERS, ...INDEFINITE_DETERMINERS]),
  };
};

test("under the corpus floor, a shared DEFINITE ARTICLE alone binds an object the material never states", async () => {
  // The defect, pinned as it actually behaves without the organ — so that
  // if the underlying matcher ever changes, this test says so out loud
  // instead of the fix silently becoming a no-op.
  const reader = makeRelationReader(await organs())(DETERMINER_PASSAGES, { pool: DETERMINER_PASSAGES });
  const withArticle = reader.read("Seward negotiated the Suez canal.").claims.find((c) => c.label === "negotiated");
  const without = reader.read("Seward negotiated Suez canal.").claims.find((c) => c.label === "negotiated");
  assert.equal(withArticle.verdict, "bound", "the article is doing the binding — this is the defect, not the fix");
  assert.equal(without.verdict, "unbound", "the SAME claim without its article correctly finds nothing");
});

test("a received determiner class closes it — and the material's own real edge still binds", async () => {
  const reader = makeRelationReader(await determinerOrgans())(DETERMINER_PASSAGES, { pool: DETERMINER_PASSAGES });
  const fabricated = reader.read("Seward negotiated the Suez canal.").claims.find((c) => c.label === "negotiated");
  assert.equal(fabricated.verdict, "unbound", "an article shared with the material is no longer a binding");
  const real = reader.read("Seward negotiated the Alaska purchase.").claims.find((c) => c.label === "negotiated");
  assert.equal(real.verdict, "bound", "the claim the material really does state is untouched");
  assert.deepEqual(real.endpoints, { subject: "referent", object: "referent" });
});

test("the determiner organ is opt-in: omitted, this reader is byte-identical to every caller before it", async () => {
  const plain = makeRelationReader(await organs())(PASSAGES, { pool: POOL });
  const withOrgan = makeRelationReader(await determinerOrgans())(PASSAGES, { pool: POOL });
  const face = (r) => r.edges.map((e) => `${e.end1} —${e.label}[${e.polarity}]→ ${e.end2}`).sort();
  assert.deepEqual(
    face(plain.read("Pierre Bezukhov married Helene.")),
    face(withOrgan.read("Pierre Bezukhov married Helene.")),
    "the material's own edge set never depends on this organ",
  );
  assert.equal(plain.read("Pierre Bezukhov married Helene.").claims[0].verdict, "bound");
  assert.equal(withOrgan.read("Pierre Bezukhov married Helene.").claims[0].verdict, "bound");
});

// ── polarity that was never measured is never a verdict (2026-08-25) ────
//
// `extractRelations`'s own polarity gate is `negationBeforeVerbFor` — the
// negation word must sit BEFORE the verb. When it does not, the extractor
// does not fail loudly: it reads a different clause, the negation ends up
// leading the OBJECT span, and the triple's polarity stays "+". The result
// is not a missed contradiction but an inverted one wearing a real
// address, measured live and pinned below.

const NEGATION_PASSAGES = [
  {
    ref: "cabinet.txt#0-260",
    text:
      "Lincoln appointed Seward. " +
      "Historians still argue over how much Lincoln trusted Seward. " +
      "Seward negotiated the Alaska purchase. " +
      "Seward negotiated the Alaska purchase again the following spring.",
  },
  {
    ref: "cabinet.txt#520-620",
    text: "Lincoln did not dismiss Seward, whatever the newspapers printed about Lincoln that year.",
  },
];

const negationOrgans = async () => {
  const { NEGATION_WORDS } = await import(PROVIDER + "priors.js");
  return { ...(await organs()), negationWords: NEGATION_WORDS };
};

test("the defect: a positive claim binds against a negation-carrying edge, citing the passage that says the opposite", async () => {
  // Pinned as it actually behaves WITHOUT the organ, so the fix cannot
  // silently become a no-op if the underlying matcher ever changes.
  const reader = makeRelationReader(await organs())(NEGATION_PASSAGES, { pool: NEGATION_PASSAGES });
  const claim = reader.read("Lincoln did dismiss Seward.").claims.find((c) => c.end1 === "Lincoln");
  assert.ok(claim, "the claim must be extracted at all");
  assert.equal(claim.verdict, "bound", "this is the defect: the material says he did NOT");
  assert.ok(claim.refs.includes("cabinet.txt#520-620"), "and it cites the very passage that contradicts it");
});

test("a received negation class closes it — the inverted claim becomes beyond-reach, never a verdict", async () => {
  const reader = makeRelationReader(await negationOrgans())(NEGATION_PASSAGES, { pool: NEGATION_PASSAGES });
  const claim = reader.read("Lincoln did dismiss Seward.").claims.find((c) => c.end1 === "Lincoln");
  assert.ok(claim, "the claim must still be extracted");
  assert.equal(claim.verdict, "beyond-reach", "polarity was never measured on either side");
  assert.match(claim.reason, /polarity was never measured/);
});

test("the claim side too: a negation the extractor put inside the object is withheld, not judged", async () => {
  const reader = makeRelationReader(await negationOrgans())(NEGATION_PASSAGES, { pool: NEGATION_PASSAGES });
  for (const text of ["Seward negotiated not the Alaska purchase.", "Seward did not negotiate the Alaska purchase."]) {
    const claim = reader.read(text).claims.find((c) => c.end1 === "Seward");
    assert.ok(claim, `${text} must extract a claim`);
    assert.equal(claim.verdict, "beyond-reach", `${text} must not be judged`);
    assert.match(claim.reason, /never measured/);
  }
});

test("CONTROL: a negation the extractor DOES read correctly still contradicts — the gate never swallows a real verdict", async () => {
  const reader = makeRelationReader(await negationOrgans())(NEGATION_PASSAGES, { pool: NEGATION_PASSAGES });
  for (const text of ["Seward never negotiated the Alaska purchase.", "Seward hardly negotiated the Alaska purchase."]) {
    // Matched on the VERB, not the subject: when the extractor reads the
    // negation correctly it leaves the negation word ON the subject span
    // ("Seward never"), which is exactly the shape that proves it was read.
    const claim = reader.read(text).claims.find((c) => c.label === "negotiated");
    assert.ok(claim, `${text} must extract a claim`);
    assert.equal(claim.polarity, "-", `${text} must be read as negated at all`);
    assert.equal(claim.verdict, "contradicted", `${text} is read correctly and must stay a real verdict`);
  }
  const positive = reader.read("Seward negotiated the Alaska purchase.").claims.find((c) => c.label === "negotiated");
  assert.equal(positive.verdict, "bound", "an ordinary positive claim is untouched");
});

test("a clean edge beside an unmeasured one still binds on its own merits — every, never some", async () => {
  // The material states the same subject+verb twice: once with the
  // negation inside the object span (unmeasurable) and once plainly. The
  // plain one must still be allowed to decide a matching claim.
  const mixed = [
    {
      ref: "mixed.txt#0-200",
      text:
        "Lincoln did not dismiss Seward that winter. " +
        "Lincoln did dismiss Cameron in January, the papers agreed. " +
        "Everyone at the table watched Lincoln closely, and Seward said nothing.",
    },
  ];
  const reader = makeRelationReader(await negationOrgans())(mixed, { pool: mixed });
  const claim = reader.read("Lincoln did dismiss Cameron.").claims.find((c) => c.end1 === "Lincoln");
  assert.ok(claim, "the claim must be extracted at all");
  assert.equal(claim.verdict, "bound", "the plainly-stated edge is not blocked by its unmeasurable neighbour");
});

test("the negation organ is opt-in: omitted, this reader is byte-identical to every caller before it", async () => {
  const plain = makeRelationReader(await organs())(PASSAGES, { pool: POOL });
  const withOrgan = makeRelationReader(await negationOrgans())(PASSAGES, { pool: POOL });
  for (const text of ["Pierre Bezukhov married Helene.", "Pierre Bezukhov never loved Helene."]) {
    assert.equal(
      plain.read(text).claims[0]?.verdict,
      withOrgan.read(text).claims[0]?.verdict,
      `${text} must read identically with and without the organ`,
    );
  }
});

test("queryReferents discloses HOW each open end resolved — the noise gate a caller needs", async () => {
  // Measured live 2026-08-26 over 3,841 edges from four real pages: asking
  // "who was vice president of the United States" with the subject open
  // returned 16 candidates — Andrew Johnson and Abraham Lincoln alongside
  // "Though he", "Congress", "000", "why it" and "impeachment trial" — and
  // a caller had no way to tell them apart. resolutionOf already drew the
  // line internally and its answer was being discarded with `end`.
  //
  // Disclosed, never filtered here: which resolutions a caller may stand on
  // is the caller's declaration, not this organ's assumption.
  const reader = makeRelationReader(await organs())(LINCOLN_PASSAGES, { pool: LINCOLN_POOL });
  const subs = reader.queryReferents({ subject: "Lincoln", verb: "appointed" }) ?? [];
  assert.ok(subs.length, "the query returned nothing to classify");
  for (const s of subs) {
    assert.ok(
      ["referent", "form", "tokens", "none"].includes(s.resolution),
      `every cluster carries a resolution; got ${JSON.stringify(s.resolution)} for ${JSON.stringify(s.subject)}`,
    );
  }
  // The real people resolve to beings this material established — which is
  // what lets a caller cut the fragments without cutting the answer.
  const named = subs.filter((x) => x.resolution === "referent").map((x) => String(x.object ?? x.subject).toLowerCase());
  assert.ok(named.some((n) => n.includes("hamlin")), `Hamlin should resolve as a referent, got ${JSON.stringify(subs)}`);
  assert.ok(named.some((n) => n.includes("johnson")), `Johnson should resolve as a referent, got ${JSON.stringify(subs)}`);
});

// ── the Station-3->4 wire: earned faces on public edges (2026-09-01) ────
// "What Is Being Born" §VI named this the single highest-leverage unbuilt
// wire; it went dark TWICE in its first hour (fragment-referent ambiguity
// inside faceOf; edgeFace's projection stripping the fields) and both
// darknesses were found only by re-running the measurement. These tests are
// the lit-assertion (eo-constitution III.5): the wire stays measured, not
// merely present.
test("a named mid-sentence subject carries its earned face on the PUBLIC edge — fragments nest into the fullest name", async () => {
  const passages = [{
    ref: "wp",
    text: "That evening Pierre Bezukhov arrived at the salon early. " +
      "Later Pierre Bezukhov greeted the old countess warmly. " +
      "Everyone in the room admired Pierre Bezukhov. " +
      "Afterwards Pierre thanked the hostess and departed quietly. " +
      "By midnight Pierre carried the candle upstairs.",
  }];
  const reader = makeRelationReader(await organs())(passages, { pool: passages });
  const faced = reader.edges.filter((e) => e.end1Face);
  assert.ok(faced.length >= 1, `no edge carries end1Face — the wire is dark again: ${JSON.stringify(reader.edges.map((e) => e.end1))}`);
  for (const e of faced) {
    assert.match(e.end1Face, /Pierre/, `face should be Pierre's fullest name, got ${e.end1Face}`);
  }
  // fragments nest: at least one faced edge whose subject is the FULL name
  // must carry the full name as its face, not a fragment
  const full = faced.find((e) => /Bezukhov/.test(e.end1));
  if (full) assert.match(full.end1Face, /Bezukhov/, "the fullest name wins the face");
});

test("a subject naming TWO unrelated beings carries NO face — disclosed ambiguity, never a coin flip", async () => {
  const passages = [{
    ref: "wp2",
    text: "That morning Anna Scherer opened the salon doors. " +
      "Later Anna Scherer welcomed the guests herself. " +
      "Meanwhile Prince Vasili watched the door with interest. " +
      "Soon Prince Vasili approached the famous hostess. " +
      "Then Anna Scherer and Prince Vasili discussed the war gravely.",
  }];
  const reader = makeRelationReader(await organs())(passages, { pool: passages });
  const both = reader.edges.filter((e) => /Scherer/.test(e.end1) && /Vasili/.test(e.end1));
  for (const e of both) {
    assert.equal("end1Face" in e, false, `two-being subject must carry no face key at all, got ${e.end1Face}`);
  }
});
