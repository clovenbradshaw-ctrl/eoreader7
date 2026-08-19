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
