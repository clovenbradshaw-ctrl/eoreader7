// node --test grammar-lens.test.mjs
//
// grammar-lens.js held to hypergraph.test.mjs's own standard: proven
// against the REAL engine organs for the true-positive side, and against
// REAL, already-disclosed defect edges — copied verbatim from this repo's
// own committed eval/results/asserted-crosslingual.md — for the mismatch
// side. Every POS_PRIOR count below is copied verbatim from a real run of
// eoreader6.1's scripts/build-pos-prior.mjs against the real UD_English-EWT
// training file, the same way wordclass.test.mjs's own fixture is sourced.

import { test } from "node:test";
import assert from "node:assert/strict";

import { makeGrammarLens, mismatchedConnectors } from "./grammar-lens.js";
import { makeRelationReader } from "./hypergraph.js";

const POS_PRIOR = {
  schema: "POSPrior@1",
  forms: {
    // The crosslingual eval's own disclosed junk triples (eval/results/
    // asserted-crosslingual.md): "that" —this→ "means war", "if you"
    // —still→ "try", "CHAPTER XII" —book→ "ONE" — every count below is the
    // real treebank's.
    this: { DET: 711, PRON: 431, ADV: 5, NOUN: 1 },
    still: { ADV: 141 },
    book: { NOUN: 22, VERB: 9, PROPN: 2 },
    // True-positive control: a real verb from hypergraph.test.mjs's own
    // fixture text ("Pierre Bezukhov spoke of the wedding..."), cleanly
    // unambiguous in the treebank.
    spoke: { VERB: 14 },
    // A genuine verb use that is nonetheless close in the treebank (VERB 4
    // vs ADJ 3, "a married man") — kept as an honest disclosure that a
    // strict floor has a real cost, not smoothed over.
    married: { VERB: 4, ADJ: 3 },
  },
};

const organs = async () => {
  const { splitSentences } = await import("../eoreader6.1/packages/engine/perceiver/text/spans.js");
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(
    "../eoreader6.1/packages/engine/perceiver/text/surfaces.js"
  );
  const { discoverRelationVocab, extractRelations } = await import(
    "../eoreader6.1/packages/engine/perceiver/text/relations.js"
  );
  const { tokenize } = await import("../eoreader6.1/packages/engine/perceiver/text/material.js");
  const { classifyWord, dominantClass } = await import("../eoreader6.1/packages/engine/perceiver/text/wordclass.js");
  return {
    splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
    discoverRelationVocab, extractRelations, tokenize, classifyWord, dominantClass,
  };
};

// Ordinary majority (>50%) — a plain, defensible floor for this
// demonstration, chosen before any example below was checked against it,
// not walked to whatever value makes these particular words settle
// (eoreader6.1's own CLAUDE.md rule against tuning a parameter on a
// golden's score, applied to this file's own fixture).
const MIN_SHARE = 0.5;

test("minShare is declared by the caller, never a silent default — the fixed bug, pinned as a regression", async () => {
  // Found live: classifyConnector used to read `{ minShare = 0.9 }`,
  // contradicting this file's own header AND dominantClass's own thrown
  // error ("minShare is declared — how dominant a candidate must be is
  // never a default"). Proven live too: 0.9 let BOTH of a real golden
  // test's own garbled connectors through unflagged ("vice": noun 62.5% /
  // propn 25% / adverb 12.5%, verb 0%; "as": preposition 42% /
  // conjunction 37% / adverb 20%, verb 0.1% — neither non-verb class hit
  // a 90% supermajority even though verb's own share was ~0 in both).
  const { classifyWord, dominantClass } = await organs();
  const lens = makeGrammarLens({ classifyWord, dominantClass, posPrior: POS_PRIOR });
  // "married" is FOUND in POS_PRIOR (used two tests below) — this must
  // throw for the same reason dominantClass itself throws, not silently
  // settle on an unexamined number.
  assert.throws(() => lens({ subject: "they", verb: "married", object: "young" }), /minShare is declared/);
});

test("the crosslingual eval's own disclosed junk triples: none of 'this', 'still', 'book' read as a verb under the Thrax lens", async () => {
  const { classifyWord, dominantClass } = await organs();
  const lens = makeGrammarLens({ classifyWord, dominantClass, posPrior: POS_PRIOR });

  const defectEdges = [
    { subject: "that", verb: "this", object: "means war" },
    { subject: "if you", verb: "still", object: "try" },
    { subject: "CHAPTER XII", verb: "book", object: "ONE" },
  ];
  const found = mismatchedConnectors(defectEdges, lens, { minShare: MIN_SHARE });
  assert.equal(found.length, 3, "every disclosed junk triple must be caught");
  assert.equal(found.find((f) => f.edge.verb === "still").classification.thraxClass, "adverb");
  assert.equal(found.find((f) => f.edge.verb === "book").classification.thraxClass, "noun");
  assert.notEqual(found.find((f) => f.edge.verb === "this").classification.thraxClass, "verb");
});

test("a genuine verb edge, read straight, is never flagged as a mismatch", async () => {
  const { classifyWord, dominantClass } = await organs();
  const lens = makeGrammarLens({ classifyWord, dominantClass, posPrior: POS_PRIOR });
  const goodEdges = [{ subject: "Pierre Bezukhov", verb: "spoke", object: "of the wedding" }];
  assert.equal(mismatchedConnectors(goodEdges, lens, { minShare: MIN_SHARE }).length, 0);
});

test("disclosed cost of a strict floor: a genuine verb use ('married') can still fail to settle at a high declared minShare", async () => {
  const { classifyWord, dominantClass } = await organs();
  const lens = makeGrammarLens({ classifyWord, dominantClass, posPrior: POS_PRIOR });
  const edge = { subject: "Pierre", verb: "married", object: "Helene" };
  const loose = lens(edge, { minShare: 0.5 });
  assert.equal(loose.thraxClass, "verb", "at an ordinary majority, the real verb reading wins");
  const strict = lens(edge, { minShare: 0.9 });
  assert.equal(strict.settled, false, "at a strict floor, VERB 4/7 vs ADJ 3/7 honestly does not clear it");
});

test("an unfound word (out of the prior's vocabulary) is a disclosed gap, never a mismatch or a guess", async () => {
  const { classifyWord, dominantClass } = await organs();
  const lens = makeGrammarLens({ classifyWord, dominantClass, posPrior: POS_PRIOR });
  const edges = [{ subject: "x", verb: "zzznotaword", object: "y" }];
  assert.equal(mismatchedConnectors(edges, lens, { minShare: MIN_SHARE }).length, 0, "unsettled is excluded from the mismatch list, not silently counted against the edge");
  assert.equal(lens(edges[0]).found, false);
});

// ── the giver, forwarded (Per-Source Testimony spec, BUILD-3) ───────────────
// wordclass.js already exports POS_PRIOR_META/THRAX_META, named, for this
// exact purpose — checked and found silently dropped between there and a
// reader of this file's own classification. Fixed by accepting both as two
// more optional injected organs.

test("givers is null when posPriorMeta/thraxMeta are never injected — a disclosed absence, byte-identical to before this fix", async () => {
  const { classifyWord, dominantClass } = await organs();
  const lens = makeGrammarLens({ classifyWord, dominantClass, posPrior: POS_PRIOR });
  const classification = lens({ subject: "Pierre", verb: "spoke", object: "softly" }, { minShare: MIN_SHARE });
  assert.equal(classification.givers, null);
});

test("givers forwards wordclass.js's own named POS_PRIOR_META and THRAX_META when injected — the giver a reader of edge.connectorClass can now actually see", async () => {
  const { classifyWord, dominantClass } = await organs();
  const { POS_PRIOR_META, THRAX_META } = await import("../eoreader6.1/packages/engine/perceiver/text/wordclass.js");
  const lens = makeGrammarLens({ classifyWord, dominantClass, posPrior: POS_PRIOR, posPriorMeta: POS_PRIOR_META, thraxMeta: THRAX_META });
  const classification = lens({ subject: "Pierre", verb: "spoke", object: "softly" }, { minShare: MIN_SHARE });
  assert.equal(classification.givers.measured, POS_PRIOR_META);
  assert.equal(classification.givers.declared, THRAX_META);
  assert.match(classification.givers.measured.giver, /Universal Dependencies UD_English-EWT/);
  assert.match(classification.givers.declared.giver, /Dionysius Thrax/);
  // Disclosed even for a word the prior never settles — the giver describes
  // the EVIDENCE POOL this lens reasons from, not a per-word verdict, so an
  // unsettled classification still names where its (in)ability to settle
  // comes from.
  const unfound = lens({ subject: "x", verb: "zzznotaword", object: "y" }, { minShare: MIN_SHARE });
  assert.equal(unfound.found, false);
  assert.equal(unfound.givers.measured, POS_PRIOR_META);
});

// ── end to end against the REAL extraction pipeline, not just hand-built edges ──
test("end to end: a real edge extracted by the real engine from real material reads as a genuine verb", async () => {
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
      text: "Pierre Bezukhov married Helene before the spring, people said again.",
    },
  ];
  const FILLER =
    "The house stood at the end of the road, and the road ran down to the river. " +
    "In the morning the light came over the water, and the birds rose from the reeds. " +
    "It was quiet in the garden, and the gate hung open on its hinge. " +
    "The old man walked to the market in the town, and the town was full of voices. " +
    "By the evening the lamps were lit in the windows, and the smoke stood over the roofs.";
  const POOL = [...PASSAGES, ...FILLER.split(". ").map((s, i) => ({ ref: `filler.txt#${i}`, text: s + "." }))];

  const { classifyWord, dominantClass, ...engineOrgans } = await organs();
  const reader = makeRelationReader(engineOrgans)(PASSAGES, { pool: POOL });
  const report = reader.read(PASSAGES[0].text);
  assert.ok(report.edges.length > 0, "the material must yield at least one real edge");

  const spokeEdge = report.edges.find((e) => e.verb === "spoke");
  assert.ok(spokeEdge, `expected a real 'spoke' edge, got: ${JSON.stringify(report.edges.map((e) => e.verb))}`);

  const lens = makeGrammarLens({ classifyWord, dominantClass, posPrior: POS_PRIOR });
  const classification = lens(spokeEdge, { minShare: MIN_SHARE });
  assert.equal(classification.thraxClass, "verb", "a real edge from the real pipeline, read through the real lens");
});
