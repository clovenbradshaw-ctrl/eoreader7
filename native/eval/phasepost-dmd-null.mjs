// native/eval/phasepost-dmd-null.mjs — II.23's own rule applied to
// phasepost-dmd.js's first real-material run: a non-trivial eigenvalue
// means nothing until it survives a shuffle control. Destroys READING
// ORDER while holding the exact same multiset of per-unit snapshots fixed
// (same sparsity, same per-cell totals) and re-runs the REAL,
// unmodified contextualModes on each shuffle — if the real run's own
// oscillation sits inside the shuffled band, "the eigenvalues are real"
// was coherence, not correspondence to the reading's own order.
//
// Usage: node native/eval/phasepost-dmd-null.mjs <book.txt> [draws=30] [seed=0]

import fs from "node:fs";
import { stripContainer, splitSentences } from "../adapters/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "../adapters/text/surfaces.js";
import { discoverRelationVocab, extractRelations } from "../adapters/text/relations.js";
import * as P from "../adapters/text/priors.js";
import { makeRelationReader } from "../organs/hypergraph.js";
import { makePhasepost } from "../adapters/text/phasepost.js";
import { cellOf } from "../kernel/cube.js";
import { createLemmatizer } from "../../legacy-eoreader6.1/packages/engine/perceiver/text/morphology.js";
import { phasepostObservations } from "../adapters/text/phasepost-dmd.js";
import { contextualModes } from "../adapters/text/contextual-dmd.js";

const path = process.argv[2];
if (!path) throw new TypeError("usage: node native/eval/phasepost-dmd-null.mjs <book.txt> [draws] [seed]");
const DRAWS = process.argv[3] ? Number(process.argv[3]) : 30; // declared, not defaulted-and-forgotten — a real budget
const SEED = process.argv[4] ? Number(process.argv[4]) : 0;

// mulberry32 — a small, seeded, deterministic PRNG (public domain), so this
// run reproduces byte-for-byte from the same seed rather than depending on
// Math.random's own unseedable state.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffled(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const stripped = stripContainer(fs.readFileSync(path, "utf8"));
const sentences = splitSentences(stripped.text);
const passages = sentences.map((s, i) => ({ ref: `s${i}`, text: s.text }));

const relationsFor = makeRelationReader({
  splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
  discoverRelationVocab, extractRelations,
  determiners: new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS]),
  negationWords: P.NEGATION_WORDS,
});
const report = relationsFor(passages);

const actPrior = JSON.parse(fs.readFileSync(new URL("../../../live_priors/derived-priors/act-priors/act-prior-en.json", import.meta.url), "utf8"));
const morphPrior = JSON.parse(fs.readFileSync(new URL("../eval/the-fold/fixtures/unimorph-morphology-prior.json", import.meta.url), "utf8"));
const lemmasOf = createLemmatizer(morphPrior.forms, { language: morphPrior.language }).lemmasOf;
const pp = makePhasepost({ actPrior, cellOf, definiteDeterminers: P.DEFINITE_DETERMINERS, indefiniteDeterminers: P.INDEFINITE_DETERMINERS, lemmasOf });

const { observations, counted, excluded } = phasepostObservations(report.edges, { classify: pp.classify });
console.error(`[phasepost-dmd-null] ${report.edges.length} edges, ${counted} counted, ${excluded.length} excluded, ${observations.length} units`);

// The statistic under test: the largest OSCILLATORY magnitude (im != 0) —
// the specific claim being checked is "real, non-degenerate rhythmic
// structure", not bare persistence (a zero-frequency mode is decay/growth,
// not rhythm, and is a weaker, different claim this null does not aim at).
const oscillatoryTopMag = (modes) => {
  if (modes.gap) return null;
  const osc = modes.eigenvalues.filter((e) => Math.abs(e.im) > 1e-9);
  if (!osc.length) return 0;
  return Math.max(...osc.map((e) => e.magnitude));
};

const t0 = Date.now();
const real = contextualModes(observations, { dt: 1 });
const realStat = oscillatoryTopMag(real);
const t1 = Date.now();
console.error(`[phasepost-dmd-null] real run: ${t1 - t0}ms, top oscillatory magnitude = ${realStat}`);

const rng = mulberry32(SEED);
const drawStats = [];
for (let d = 0; d < DRAWS; d += 1) {
  const shuffledObs = shuffled(observations, rng);
  const modes = contextualModes(shuffledObs, { dt: 1 });
  drawStats.push(oscillatoryTopMag(modes));
}
const t2 = Date.now();

const numeric = drawStats.filter((x) => x !== null);
const atOrAbove = realStat === null ? null : numeric.filter((x) => x >= realStat).length;
const sorted = [...numeric].sort((a, b) => a - b);
const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;

console.log(JSON.stringify({
  book: path,
  edgesExtracted: report.edges.length,
  counted, excludedCount: excluded.length, units: observations.length,
  real: { window: real.window, dims: real.dims, rank: real.rank, gap: real.gap ?? null, topOscillatoryMagnitude: realStat },
  draws: DRAWS, seed: SEED,
  null: {
    topOscillatoryMagnitudes: drawStats,
    median,
    min: sorted.length ? sorted[0] : null,
    max: sorted.length ? sorted[sorted.length - 1] : null,
    gapsInNull: DRAWS - numeric.length,
  },
  realAtOrAboveInNullDraws: atOrAbove,
  realExceedsAllDraws: atOrAbove === 0,
  timingMs: { real: t1 - t0, nullDraws: t2 - t1 },
}, null, 2));
