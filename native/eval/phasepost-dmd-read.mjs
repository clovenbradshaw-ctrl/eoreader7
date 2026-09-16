// native/eval/phasepost-dmd-read.mjs — the falsification run: does the
// phasepost/DMD adapter (S117) find anything on REAL, book-scale material,
// or does the "too little material" disclosure in its own test file hold
// even here? Real extraction (hypergraph.js's makeRelationReader), real
// classification (phasepost.js, real ActPrior@1 + real UniMorph
// lemmatizer), real decomposition (contextual-dmd.js, unmodified) — over
// the same real Frankenstein text this project's own salience-dmd.mjs
// already measured, so a reader can compare the two directly.
//
// Usage: node native/eval/phasepost-dmd-read.mjs <book.txt> [maxSentences]

import fs from "node:fs";
import { stripContainer, splitSentences } from "../adapters/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "../adapters/text/surfaces.js";
import { discoverRelationVocab, extractRelations } from "../adapters/text/relations.js";
import * as P from "../adapters/text/priors.js";
import { makeRelationReader } from "../organs/hypergraph.js";
import { makePhasepost } from "../adapters/text/phasepost.js";
import { cellOf } from "../kernel/cube.js";
import { createLemmatizer } from "../../legacy-eoreader6.1/packages/engine/perceiver/text/morphology.js";
import { phasepostModes } from "../adapters/text/phasepost-dmd.js";

const path = process.argv[2];
if (!path) throw new TypeError("usage: node native/eval/phasepost-dmd-read.mjs <book.txt> [maxSentences]");
const maxSentences = process.argv[3] ? Number(process.argv[3]) : Infinity;

const t0 = Date.now();
const stripped = stripContainer(fs.readFileSync(path, "utf8"));
let sentences = splitSentences(stripped.text);
const totalSentences = sentences.length;
if (Number.isFinite(maxSentences)) sentences = sentences.slice(0, maxSentences);
console.error(`[phasepost-dmd-read] ${totalSentences} sentences total, reading ${sentences.length} (declared budget: ${Number.isFinite(maxSentences) ? maxSentences : "all"})`);

const relationsFor = makeRelationReader({
  splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
  discoverRelationVocab, extractRelations,
  determiners: new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS]),
  negationWords: P.NEGATION_WORDS,
});

// One passage per sentence, in reading order — the finest causal unit
// available, and the one this reader's own extractor already expects
// (extractRelations reads per-sentence internally regardless; passing
// them pre-split keeps this driver's own reading order explicit and
// verifiable rather than trusting a re-split downstream).
const passages = sentences.map((s, i) => ({ ref: `s${i}`, text: s.text }));
const t1 = Date.now();
const report = relationsFor(passages);
const t2 = Date.now();
console.error(`[phasepost-dmd-read] extraction: ${report.edges.length} edges from ${passages.length} sentences in ${t2 - t1}ms`);

const actPrior = JSON.parse(fs.readFileSync(new URL("../../../live_priors/derived-priors/act-priors/act-prior-en.json", import.meta.url), "utf8"));
const morphPrior = JSON.parse(fs.readFileSync(new URL("../eval/the-fold/fixtures/unimorph-morphology-prior.json", import.meta.url), "utf8"));
const lemmasOf = createLemmatizer(morphPrior.forms, { language: morphPrior.language }).lemmasOf;
const pp = makePhasepost({ actPrior, cellOf, definiteDeterminers: P.DEFINITE_DETERMINERS, indefiniteDeterminers: P.INDEFINITE_DETERMINERS, lemmasOf });

const t3 = Date.now();
// report.edges, VERBATIM — real production shape, no field renamed (S117's
// own fix: phasepost.js reads end1/label/end2 natively).
const out = phasepostModes(report.edges, { classify: pp.classify });
const t4 = Date.now();

const standingCounts = {};
for (const x of out.excluded) standingCounts[x.standing] = (standingCounts[x.standing] ?? 0) + 1;

console.error(`[phasepost-dmd-read] classify+decompose: ${t4 - t3}ms`);
console.log(JSON.stringify({
  book: path,
  totalSentences,
  sentencesRead: sentences.length,
  edgesExtracted: report.edges.length,
  counted: out.counted,
  excludedCount: out.excludedCount,
  excludedByStanding: standingCounts,
  window: out.window,
  windowBasis: out.windowBasis,
  triedDepths: out.triedDepths,
  usedObservations: out.usedObservations,
  dims: out.dims,
  basis: out.basis,
  rank: out.rank,
  gap: out.gap ?? null,
  eigenvalues: out.eigenvalues?.map((e) => ({ magnitude: +e.magnitude.toFixed(6), frequency: +e.frequency.toFixed(6), growth: +e.growth.toFixed(6), oscillatory: Math.abs(e.im) > 1e-9 })),
  timingMs: { split: t1 - t0, extract: t2 - t1, classifyDecompose: t4 - t3, total: t4 - t0 },
}, null, 2));
