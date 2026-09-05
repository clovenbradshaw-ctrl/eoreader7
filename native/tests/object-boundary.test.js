// object-boundary.test.js — the received object boundary's measurement,
// read on every suite run (the-fold P95 / S65).
//
// `results/object-boundary-RESULTS.md` (2026-09-02) recorded the cut moving
// 782 of 1,644 objects on Dracula (earned faces +15/−48; refuted at book
// scale, kept opt-in). The 2026-09-05 re-run printed three byte-identical
// arms: the `boundedObjects` opt-in was removed from the-fold's
// hypergraph.js in P80 (2214e1a) and `makeRelationReader` ignores the
// unknown option. The doc's numbers cannot be re-measured while the organ
// is gone, and this test does not pretend to: what it PINS is the
// driver's reachability check — built to fail one way (a reader that
// ignores the opt-in yields the typed `organ_unreachable` gap) and pass
// the other (a reader that applies the trim yields none, and the marginal
// pairing counts the moves) — on synthetic edges, with the REAL boundary
// set from the committed POS prior. On this checkout's real reader it
// DISCLOSES which state holds; asserting "unreachable" would freeze a
// known gap as a target, asserting the doc's numbers would be reciting.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { objectBoundaryFrom } from "../adapters/text/relations.js";
import { measureObjectBoundary, boundedCutGap } from "../eval/the-fold/lib/object-boundary.mjs";

const FIX = new URL("../eval/the-fold/fixtures/", import.meta.url).pathname;
const posPrior = JSON.parse(readFileSync(`${FIX}pos-prior-eng.json`, "utf8"));
const MIN_SHARE = 0.5; // hypergraph.js's own GRAMMAR_MIN_SHARE, cited not re-chosen

// Synthetic edges whose objects carry a received adposition after the first
// token — the shape the cut exists for — and one that does not.
const EDGES = [
  { end1: "Jonathan", label: "took", end2: "me to the Count", spans: [{ at: "t.txt#0-20" }] },
  { end1: "Mina", label: "saw", end2: "a Russian from Varna", spans: [{ at: "t.txt#21-45" }] },
  { end1: "Lucy", label: "kept", end2: "a diary", spans: [{ at: "t.txt#46-60" }], end2Face: "lucy-diary" },
];
const passages = [{ ref: "t.txt#0-60", text: "…" }];
const ignoringReader = () => () => ({ edges: EDGES.map((e) => ({ ...e })) });
const applyingReader = ({ objectBoundaryFrom: obf } = {}) => () => {
  const cut = obf ? obf(posPrior, { minShare: MIN_SHARE }) : null;
  const trim = (o) => { if (!cut) return o; const t = o.split(/\s+/); for (let i = 1; i < t.length; i += 1) if (cut.has(t[i].toLowerCase())) return t.slice(0, i).join(" "); return o; };
  return { edges: EDGES.map((e) => ({ ...e, end2: trim(e.end2) })) };
};

test("the boundary set is real and non-empty on the committed prior", () => {
  const b = objectBoundaryFrom(posPrior, { minShare: MIN_SHARE });
  assert.ok(b.size > 50, `boundary forms: ${b.size}`);
  assert.ok(b.has("to") && b.has("from"), "the received adpositions the specimens carry are in the set");
});

test("a reader that ignores the opt-in yields the typed organ_unreachable gap — the driver refuses", () => {
  const M = measureObjectBoundary({ reader: ignoringReader, passages, posPrior, objectBoundaryFrom, minShare: MIN_SHARE, seed: 7 });
  assert.equal(M.base.debris, 2, "two objects carry a boundary token after their first token");
  assert.ok(M.gap, "byte-identical arms over cuttable material must be a gap");
  assert.equal(M.gap.type, "organ_unreachable");
  assert.equal(M.gap.organ, "boundedObjects");
  assert.match(M.gap.detail, /fact about the reader/);
});

test("a reader that applies the trim yields no gap, and the marginal pairing counts exactly the moved objects", () => {
  const M = measureObjectBoundary({ reader: applyingReader, passages, posPrior, objectBoundaryFrom, minShare: MIN_SHARE, seed: 7 });
  assert.equal(M.gap, null);
  assert.equal(M.paired, 3);
  assert.deepEqual(M.moved, [["me to the Count", "me"], ["a Russian from Varna", "a Russian"]]);
  assert.equal(M.bound.debris, 0, "debris is tautologically 0 for the bounded arm — a description, not evidence (the doc's own note)");
  assert.equal(M.facedGained + M.facedLost, 0);
});

test("material with nothing to cut: identical arms are the honest reading, not a gap", () => {
  const base = { debris: 0, objs: ["a diary"], rows: [] };
  assert.equal(boundedCutGap(base, { objs: ["a diary"] }, objectBoundaryFrom(posPrior, { minShare: MIN_SHARE })), null);
  assert.equal(boundedCutGap(base, { objs: ["a diary"] }, new Set()).type, "organ_unreachable", "an empty boundary set cannot have measured anything");
});

// The real reader on the real book: disclosed, never asserted.
const FOLD = new URL("../../../the-fold/", import.meta.url).pathname;
const BOOK = process.env.BOOK ?? `${FOLD}../live_priors/01-literature-books/gutenberg/pg345_Dracula.txt`;
const realPresent = existsSync(`${FOLD}hypergraph.js`) && existsSync(BOOK) && existsSync(`${FOLD}priors-data/pos-prior-eng.json`);
test("the production reader on Dracula (first 60 passages): which state holds, disclosed", { skip: realPresent ? false : "fixture_absent: the-fold checkout or the Gutenberg Dracula (BOOK=) is not beside this repo" }, async () => {
  const { makeRelationReader } = await import(`${FOLD}hypergraph.js`);
  const { chunkSource, blankLabelRows } = await import(`${FOLD}source.js`);
  const { splitSentences } = await import("../adapters/text/spans.js");
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import("../adapters/text/surfaces.js");
  const { resolvePronouns } = await import("../adapters/text/pronouns.js");
  const { discoverRelationVocab, extractRelations } = await import("../adapters/text/relations.js");
  const { tokenize } = await import("../adapters/text/material.js");
  const P = await import("../adapters/text/priors.js");
  const shipped = JSON.parse(readFileSync(`${FOLD}priors-data/pos-prior-eng.json`, "utf8"));
  const reader = ({ objectBoundaryFrom: obf } = {}) => makeRelationReader({
    splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize,
    posPriorFor: () => shipped, determiners: new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS]), negationWords: P.NEGATION_WORDS,
    blankFurniture: (t) => blankLabelRows(t, { minRun: 4, maxCell: 60 }), resolvePronouns, nounPhraseSubjects: true,
    ...(obf ? { objectBoundaryFrom: obf, boundedObjects: true } : {}),
  });
  const slice = chunkSource("book.txt", readFileSync(BOOK, "utf8")).slice(0, 60);
  const M = measureObjectBoundary({ reader, passages: slice, posPrior: shipped, objectBoundaryFrom, minShare: MIN_SHARE, seed: 7 });
  console.log(
    `  Dracula/60: baseline ${M.base.edges} edges, ${M.base.debris} cuttable; ` +
      (M.gap ? `REFUSED (${M.gap.type}) — the opt-in does not reach the reader; the doc's 782-moved run is not re-measurable` : `cut reached the reader: moved ${M.moved.length}, faces +${M.facedGained}/−${M.facedLost} — the doc's numbers are re-measurable again; update it`),
  );
});
