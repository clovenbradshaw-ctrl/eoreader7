// the-fold · grammar-lens — Dionysius Thrax's parts of speech laid over
// hypergraph.js's edges as a giver-named READING, never folded into the
// edge itself and never a fact this repo derives.
//
// THE FINDING. Every edge hypergraph.js/relations.js produces names its
// connector span "verb" — but extractRelations only ever checks "does this
// token sit between two argument-shaped spans," never "is this token
// grammatically a verb." Read against real material, the connector slot
// holds real non-verbs: eval/results/asserted-crosslingual.md's own raw
// triples include "that" —this→ "means war" (a pronoun), "if you" —still→
// "try" (an adverb), "CHAPTER XII" —book→ "ONE" (a noun) — three real,
// disclosed cases from this repo's own committed eval output, not invented
// for this file. CLAUDE.md's own build-log/UX-pass sections draw the
// connector as "subject —verb→ object" throughout the app; that label was
// never earned by anything that checked.
//
// WHAT THIS FILE ADDS, AND WHAT IT DOES NOT TOUCH. This is purely additive:
// it reads an edge hypergraph.js already produced and returns a SEPARATE
// classification alongside it — `edge.verb`/`edge.subject`/`edge.object`
// are never renamed, and nothing here changes what relationFindings/
// relationsClean/the record already say. The classification itself is
// eoreader6.1's own new organ, `perceiver/text/wordclass.js`
// (classifyWord/dominantClass, Universal Dependencies UD_English-EWT
// behind it, CC BY-SA 4.0) — injected the cast.js way, exactly like
// verbForms/createLemmatizer already are in hypergraph.js. Nothing here
// re-implements a closed class or invents a threshold; `minShare` is
// declared by the caller, the same standing wordclass.js's own
// dominantClass already holds.
//
// SLOT VS CLASS, KEPT SEPARATE (Halliday's Systemic Functional Grammar:
// function vs. class — a function can be realised by any class). This file
// answers CLASS ONLY for the connector span. It does not ask whether the
// connector-SLOT itself was correctly identified — that is extractRelations'
// own job, unchanged. A connector whose class reads "preposition" is not a
// wrong extraction; it is an honest disclosure that Thrax's category and
// the slot extractRelations found do not agree for this edge.

/**
 * @param {object} organs
 * @param {function} organs.classifyWord perceiver/text/wordclass.js's own
 *   export, injected — this file has no import of eoreader6.1 itself.
 * @param {function} organs.dominantClass ditto.
 * @param {object} organs.posPrior a POSPrior@1-shaped object
 *   (scripts/build-pos-prior.mjs's output) — injected, never assumed
 *   present on disk; omitted, every classification comes back `found:
 *   false` rather than throwing, the same optional-organ degrade
 *   verbForms/createLemmatizer already hold in hypergraph.js.
 */
export function makeGrammarLens({ classifyWord, dominantClass, posPrior = null }) {
  return function classifyConnector(edge, { minShare = 0.9 } = {}) {
    const c = classifyWord(edge?.verb ?? "", { posPrior });
    const dominant = dominantClass(c, { minShare });
    return {
      surface: edge?.verb ?? null,
      found: c.found,
      candidates: c.candidates,
      thraxClass: dominant?.thraxClass ?? null,
      settled: dominant != null,
    };
  };
}

/**
 * The disclosed diagnostic this repo did not have before: which edges'
 * connector spans do NOT read as a verb under the Thrax lens, at the
 * caller's declared confidence — a slot/class mismatch rate, never a
 * verdict against the edge itself (relationFindings/relationsClean are
 * untouched by this file entirely).
 *
 * @param {Array<object>} edges hypergraph.js edges (report.edges).
 * @param {ReturnType<typeof makeGrammarLens>} classifyConnector
 * @param {{minShare?: number}} [options]
 * @returns {Array<{edge: object, classification: object}>} edges whose
 *   connector's dominant Thrax class is anything OTHER than "verb" —
 *   `settled: false` connectors (out of vocabulary, or genuinely
 *   ambiguous at this minShare) are excluded, since an unsettled reading
 *   is a disclosed gap, not a mismatch finding.
 */
export function mismatchedConnectors(edges, classifyConnector, { minShare = 0.9 } = {}) {
  const out = [];
  for (const edge of edges ?? []) {
    const classification = classifyConnector(edge, { minShare });
    if (classification.settled && classification.thraxClass !== "verb") {
      out.push({ edge, classification });
    }
  }
  return out;
}
