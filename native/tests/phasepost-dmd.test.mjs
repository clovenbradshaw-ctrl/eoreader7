// phasepost-dmd.test.mjs — the adapter that turns a stream of already-
// extracted, revisable relations into the trajectory contextual-dmd.js
// already knows how to decompose. Three tiers: the pure grouping/exclusion
// logic against a fake classifier (fast, deterministic); the REAL
// phasepost.js classifier (real ActPrior@1, real cube.js, real UniMorph
// lemmatizer) on invented-but-realistic sentences, chosen because they were
// actually run and observed to land on several distinct real cells — never
// assumed; and the full REAL pipeline (real extraction -> real
// classification, no field renaming anywhere -> real DMD) on real (if
// synthetic) prose, proving the wiring closes end to end without asserting
// specific eigenvalue numbers a 20-sentence paragraph has no business
// producing (see that test's own note).
//
// A real edge's own `{end1, label, end2}` shape (hypergraph.js's public
// output, P76) is handed to `classify` VERBATIM throughout this file —
// no adapter-side renaming to `{subject, verb, object}` anywhere. An
// earlier draft of phasepost-dmd.js added exactly that translation and
// was corrected (user: "SVO is EN focused, fix that") — the real fix
// lives in phasepost.js itself, which now reads end1/label/end2 first.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { phasepostObservations, phasepostModes, cellLabel } from "../adapters/text/phasepost-dmd.js";
import { makePhasepost } from "../adapters/text/phasepost.js";
import { cellOf } from "../kernel/cube.js";
import { DEFINITE_DETERMINERS, INDEFINITE_DETERMINERS } from "../adapters/text/priors.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ACT_PRIOR_PATH = path.join(HERE, "..", "..", "..", "live_priors", "derived-priors", "act-priors", "act-prior-en.json");
const MORPH_PRIOR_PATH = path.join(HERE, "..", "eval", "the-fold", "fixtures", "unimorph-morphology-prior.json");
const ACT_PRIOR_OK = fs.existsSync(ACT_PRIOR_PATH);
const MORPH_PRIOR_OK = fs.existsSync(MORPH_PRIOR_PATH);
const SKIP = !ACT_PRIOR_OK
  ? `live_priors is not checked out as a sibling of this repo: act-prior-en.json (looked for ${ACT_PRIOR_PATH})`
  : !MORPH_PRIOR_OK
    ? `the morphology prior is not available (looked for ${MORPH_PRIOR_PATH})`
    : undefined;

async function loadRealPhasepost() {
  const actPrior = JSON.parse(fs.readFileSync(ACT_PRIOR_PATH, "utf8"));
  const morphPrior = JSON.parse(fs.readFileSync(MORPH_PRIOR_PATH, "utf8"));
  const { createLemmatizer } = await import("../legacy-ported/packages/engine/perceiver/text/morphology.js");
  const lemmasOf = createLemmatizer(morphPrior.forms, { language: morphPrior.language }).lemmasOf;
  return makePhasepost({ actPrior, cellOf, definiteDeterminers: DEFINITE_DETERMINERS, indefiniteDeterminers: INDEFINITE_DETERMINERS, lemmasOf });
}

// ---------------------------------------------------------------------
// Tier 1 — pure grouping/exclusion logic, a fake classify() so the walls
// are tested in isolation from any real organ's own behavior.
// ---------------------------------------------------------------------

test("cellLabel: the established `${op}·${grain}` form, and a typed null for a gap or an absent cell — never a guessed label", () => {
  assert.equal(cellLabel({ op: "SIG", grain: "Figure" }), "SIG·Figure");
  assert.equal(cellLabel({ op: "CON", grain: "Pattern" }), "CON·Pattern");
  assert.equal(cellLabel(null), null);
  assert.equal(cellLabel({ gap: "unknown_spec" }), null);
  assert.equal(cellLabel({ op: "SIG", grain: null }), null);
});

test("classify is a required, injected organ — never silently re-derived", () => {
  assert.throws(() => phasepostObservations([{}], {}), /classify is injected/);
});

test("default unitOf: one edge, one snapshot, in reading order — a definite verdict is counted in its own unit's Map", () => {
  const classify = (e) => (e.tag === "a" ? { op: "SIG", grain: "Figure", cell: { op: "SIG", grain: "Figure" }, standing: "lexical" } : { op: "CON", grain: "Ground", cell: { op: "CON", grain: "Ground" }, standing: "mechanical" });
  const { observations, units, counted, excluded } = phasepostObservations([{ tag: "a" }, { tag: "b" }], { classify });
  assert.equal(counted, 2);
  assert.equal(excluded.length, 0);
  assert.deepEqual(units, [0, 1]);
  assert.deepEqual(observations, [new Map([["SIG·Figure", 1]]), new Map([["CON·Ground", 1]])]);
});

test("a contested verdict contributes to NO cell — excluded, disclosed, never split across its candidates or coin-flipped to one", () => {
  const classify = () => ({ op: null, grain: "Figure", cell: null, standing: "contested", candidates: [{ op: "SIG" }, { op: "CON" }], because: "a candidate set, not a verdict" });
  const { observations, counted, excluded } = phasepostObservations([{ a: 1 }], { classify });
  assert.equal(counted, 0);
  assert.deepEqual(observations, [new Map()]);
  assert.equal(excluded.length, 1);
  assert.equal(excluded[0].standing, "contested");
  assert.match(excluded[0].because, /candidate set/);
});

test("a gap verdict is excluded the same honest way — the unit still occupies a real position in the trajectory (an empty Map), never a hole", () => {
  const classify = () => ({ op: null, grain: null, cell: null, standing: "gap", because: "no act-bearing head found" });
  const { observations, units, counted, excluded } = phasepostObservations([{}, {}, {}], { classify });
  assert.equal(counted, 0);
  assert.equal(units.length, 3);
  assert.deepEqual(observations, [new Map(), new Map(), new Map()]);
  assert.equal(excluded.length, 3);
});

test("a custom unitOf groups several edges into one snapshot, summing counts — e.g. every edge in one sentence", () => {
  const classify = (e) => ({ op: e.op, grain: "Figure", cell: { op: e.op, grain: "Figure" }, standing: "mechanical" });
  const edges = [{ op: "SIG", sentence: 0 }, { op: "SIG", sentence: 0 }, { op: "CON", sentence: 1 }];
  const { observations, units } = phasepostObservations(edges, { classify, unitOf: (e) => e.sentence });
  assert.deepEqual(units, [0, 1]);
  assert.deepEqual(observations[0], new Map([["SIG·Figure", 2]]));
  assert.deepEqual(observations[1], new Map([["CON·Figure", 1]]));
});

test("phasepostModes composes phasepostObservations with the REAL contextual-dmd.js unmodified — too little data is an honest typed gap, never a fabricated mode", () => {
  const classify = () => ({ op: "SIG", grain: "Figure", cell: { op: "SIG", grain: "Figure" }, standing: "mechanical" });
  const out = phasepostModes([{}, {}], { classify });
  assert.equal(out.gap, "too_few_observations");
  assert.equal(out.counted, 2);
  assert.equal(out.excludedCount, 0);
});

// ---------------------------------------------------------------------
// Tier 2 — the REAL phasepost.js classifier (real ActPrior@1, real
// cube.js, real UniMorph lemmatizer), on sentences chosen because they
// were run and OBSERVED to land on six distinct real cells plus a real
// gap and a real contested verdict — not assumed, measured before this
// test was written the same way every other real-organ test in this
// project is built.
// ---------------------------------------------------------------------

test("real organs, native shape: classify() reads end1/label/end2 directly — no field renamed anywhere in this test — and a mixed reading spans several real cells", { skip: SKIP }, async () => {
  const pp = await loadRealPhasepost();
  const edges = [
    { end1: "There", label: "was", end2: "nothing left" },                 // mechanical NUL·Ground
    { end1: "A general", label: "is", end2: "a military leader" },         // copula SIG·Pattern
    { end1: "The general", label: "is", end2: "the leader" },              // copula SIG·Figure
    { end1: "Abraham Lincoln", label: "appointed", end2: "Hannibal Hamlin" }, // lexical DEF·Figure
    { end1: "The Senate", label: "confirmed", end2: "Hamlin" },            // lexical SIG·Figure
    { end1: "The soldiers", label: "fought", end2: "the enemy" },          // lexical CON·Figure
    { end1: "The general", label: "revised", end2: "the plan" },           // lexical SYN·Figure
    // These last two deliberately use the OLDER {subject,verb,object}
    // shape, side by side with end1/label/end2 above, to prove the
    // fallback still works and both shapes compose in one trajectory.
    { subject: "Lincoln", verb: "governed", object: "the nation" },            // real gap — genuinely unattested
    { subject: "Lincoln", verb: "signed", object: "the proclamation" },        // real contested (CON/SYN/SIG)
  ];
  const out = phasepostModes(edges, { classify: pp.classify });
  assert.equal(out.units.length, edges.length, "default one-edge-one-unit preserves the reading's own length");
  assert.equal(out.counted + out.excludedCount, edges.length);
  assert.equal(out.counted, 7, "seven definite verdicts (SIG·Figure fires twice, from two different edges, which is why dims below is 6 while counted is 7)");
  assert.equal(out.excludedCount, 2, "the one real gap and the one real contested verdict, disclosed, not smoothed away");
  assert.ok(out.excluded.some((x) => x.standing === "gap"));
  assert.ok(out.excluded.some((x) => x.standing === "contested"));
  const expectedCells = ["NUL·Ground", "SIG·Pattern", "SIG·Figure", "DEF·Figure", "CON·Figure", "SYN·Figure"];
  for (const c of expectedCells) assert.ok(out.basis.includes(c), `basis should include ${c}: ${JSON.stringify(out.basis)}`);
  assert.equal(out.dims, expectedCells.length);
  // Not a gap at 9 units of real, varied signal — a genuine decomposition
  // comes back, well-formed, without asserting what it says: nine acts is
  // still far too little material for a specific eigenvalue to mean
  // anything (this project's own salience-dmd-RESULTS.md needed a whole
  // novel to find a real period) — this test proves the composition is
  // correct, not that nine invented sentences have an interesting rhythm.
  assert.equal(out.gap, undefined);
  assert.ok(Array.isArray(out.eigenvalues));
  assert.ok(out.rank >= 1);
  for (const ev of out.eigenvalues) {
    assert.equal(typeof ev.magnitude, "number");
    assert.equal(typeof ev.frequency, "number");
    assert.ok(Number.isFinite(ev.magnitude) && Number.isFinite(ev.frequency));
  }
});

test("real organs: an all-contested/gap reading never fabricates a mode — empty basis, honest gap, full disclosure of what was excluded and why", { skip: SKIP }, async () => {
  const pp = await loadRealPhasepost();
  const edges = [
    { end1: "Lincoln", label: "governed", end2: "the nation" }, // gap
    { end1: "Lincoln", label: "signed", end2: "the proclamation" }, // contested
    { end1: "Congress", label: "passed", end2: "the amendment" }, // contested
  ];
  const out = phasepostModes(edges, { classify: pp.classify });
  assert.equal(out.counted, 0);
  assert.equal(out.excludedCount, 3);
  assert.equal(out.gap, "empty_basis");
  assert.deepEqual(out.observations, [new Map(), new Map(), new Map()], "the adapter's own observations array — three real, empty snapshots, never omitted or collapsed to a bare count");
  assert.equal(out.excluded.filter((x) => x.standing === "gap").length, 1);
  assert.equal(out.excluded.filter((x) => x.standing === "contested").length, 2);
});

// ---------------------------------------------------------------------
// Tier 3 — the FULL real pipeline: real extraction (hypergraph.js's own
// makeRelationReader, real edges in its own {end1,label,end2} shape) ->
// real phasepost.js, with NO field renamed anywhere -> real
// contextual-dmd.js/dmd.js. This is the gap named live in the-fold
// POLICIES.md P229's browser-verification pass, closed end to end.
// ---------------------------------------------------------------------

test("full real pipeline: real prose -> real extraction -> real phasepost classification (native end1/label/end2, no adapter-side renaming) -> real DMD, with no crash and a well-formed result at every stage", { skip: SKIP }, async () => {
  const { splitSentences } = await import("../adapters/text/spans.js");
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import("../adapters/text/surfaces.js");
  const { discoverRelationVocab, extractRelations } = await import("../adapters/text/relations.js");
  const P = await import("../adapters/text/priors.js");
  const { makeRelationReader } = await import("../organs/hypergraph.js");
  const pp = await loadRealPhasepost();

  const relationsFor = makeRelationReader({
    splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
    discoverRelationVocab, extractRelations,
    determiners: new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS]),
    negationWords: P.NEGATION_WORDS,
  });
  const text = "Abraham Lincoln appointed Hannibal Hamlin as his first vice president. The Senate confirmed Hamlin without delay. A general is a military leader. There was nothing left of the old order.";
  const report = relationsFor([{ ref: "a.txt", text }]);
  assert.ok(report.edges.length >= 2, `expected at least 2 real extracted edges, got ${report.edges.length}`);
  for (const e of report.edges) assert.ok("end1" in e && "label" in e && "end2" in e, "the reader's real public shape is end1/label/end2, never subject/verb/object");

  // report.edges, VERBATIM — no renaming, no wrapper. classify() reads
  // end1/label/end2 natively now (the fix above), so a real production
  // edge from ANY arrangement-producing reader (this English positional
  // one, or eoreader7's Latin case-marked reader) needs no translation.
  const out = phasepostModes(report.edges, { classify: pp.classify });

  assert.equal(out.units.length, report.edges.length);
  assert.equal(out.counted + out.excludedCount, report.edges.length);
  // Structural well-formedness only — never a specific eigenvalue number.
  // A handful of sentences is not enough material for a period to mean
  // anything (this project's own measured DMD runs needed a whole novel);
  // what this test proves is that the WIRING — real bytes in, a real
  // decomposition or an honest typed gap out — holds, which is exactly
  // the gap POLICIES.md P229 named as still open.
  if (out.gap) {
    assert.ok(["too_few_observations", "empty_basis"].includes(out.gap));
  } else {
    assert.ok(Array.isArray(out.basis) && out.basis.length > 0);
    assert.ok(out.basis.every((c) => /^[A-Z]{3}·(Ground|Figure|Pattern)$/.test(c)), `every basis entry must be a real cell label: ${JSON.stringify(out.basis)}`);
    assert.ok(Array.isArray(out.eigenvalues));
    assert.ok(out.rank >= 1);
  }
});
