// eval/the-fold/curve-rank-nagao-diagnostic.mjs — does the Nagao score
// actually carry signal for the Elkies-Klagsbrun family, or was
// curve-rank-ek.mjs's own null result (top-random = -0.13, p=0.95 at
// sample=200000/k=60/height=24) evidence the low is broken here rather than
// just weak?
//
// THE RIGHT WAY TO ASK THIS. Eyeballing raw score numbers in a terminal is
// not this repo's own discipline (the constitution's own II.23: a statistic
// earns its use by a control BUILT TO FAIL, named as one, never trusted from
// a run that only reports successes). So this driver states the null
// properly: a set of curves whose rank is ALREADY KNOWN — pinned or bounded
// by lib/pari-oracle.mjs, not guessed — are POSITIVE CONTROLS. If the score
// is real signal, these known-elevated-rank specimens should sit in the
// EXTREME TAIL of a generic population's score distribution. If they don't,
// the score itself (or this family's applicability of it) is the problem,
// not merely the search's sample size.
//
//   node native/eval/the-fold/curve-rank-nagao-diagnostic.mjs
//        [--population 5000] [--height 24] [--primes 500] [--seed 90210]

import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { elkiesKlagsbrunFibration } from "../../adapters/math/construction.js";
import { nagao } from "../../adapters/math/local.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (flag, dflt) => { const i = process.argv.indexOf(flag); return i > 0 ? Number(process.argv[i + 1]) : dflt; };

const POPULATION = arg("--population", 5000);
const HEIGHT = arg("--height", 24); // same declared height as curve-rank-ek.mjs's own null run, so this is comparable to that finding, not a fresh choice
const PRIMES = arg("--primes", 500);
const SEED = arg("--seed", 90210);

const mulberry = (seed) => () => { let t = (seed += 0x6d2b79f5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };

function sampleT(n, rng, height, u) {
  const seen = new Set(), out = [];
  const bound = 2 ** height;
  let tries = 0;
  while (out.length < n && tries < n * 20) {
    tries += 1;
    const a = Math.floor(rng() * (2 * bound + 1)) - bound;
    const b = Math.floor(rng() * bound) + 1;
    if (a === 0) continue;
    const g = gcd(a, b);
    const key = `${a / g}/${b / g}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const c = elkiesKlagsbrunFibration(u, key);
    if (c) out.push({ key, coeffs: c.coeffs });
  }
  return out;
}

// POSITIVE CONTROLS — every one an oracle-decided rank from THIS session's
// own record (curve-rank-ek.mjs's search results, or the paper's own worked
// examples independently reproduced against the primary source), never a
// guess. Declared before the population is scored, so the diagnostic cannot
// be tuned to whatever the population happens to show.
const CONTROLS = [
  { label: "paper's own, u=2/5 t=11860/97527 (known rank in [17,19])", u: "2/5", t: "11860/97527", rankLo: 17, rankHi: 19 },
  { label: "PINNED u=11/5 t=-26876/131019, rank=19 exact", u: "11/5", t: "-26876/131019", rankLo: 19, rankHi: 19 },
  { label: "u=11/5 t=-721141/2026305 (known rank in [12,20])", u: "11/5", t: "-721141/2026305", rankLo: 12, rankHi: 20 },
  { label: "PINNED u=2/5 t=88207/80649, rank=11 exact (this session's best find)", u: "2/5", t: "88207/80649", rankLo: 11, rankHi: 11 },
  { label: "PINNED u=2/5 t=5216389/10468763, rank=10 exact", u: "2/5", t: "5216389/10468763", rankLo: 10, rankHi: 10 },
];

function percentileRank(score, populationScores) {
  // What fraction of the population is AT LEAST AS EXTREME (more negative)
  // as this score — the direction the header comment declares as
  // higher-rank-heuristic. 0 = most extreme in the whole population.
  const moreExtreme = populationScores.filter((s) => s <= score).length;
  return moreExtreme / populationScores.length;
}

async function main() {
  const rng = mulberry(SEED);
  console.log(`declared: population=${POPULATION}/u  height=2^${HEIGHT}  primes<=${PRIMES}  seed=${SEED}\n`);

  const byU = {};
  for (const u of ["2/5", "11/5"]) {
    const t0 = Date.now();
    const sample = sampleT(POPULATION, rng, HEIGHT, u);
    const scores = sample.map((s) => nagao(s.coeffs, { upTo: PRIMES }).score);
    byU[u] = scores.slice().sort((a, b) => a - b); // ascending = most negative first
    console.log(`u=${u}: generic population of ${scores.length}, mean score ${(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)}, min ${Math.min(...scores).toFixed(1)}, max ${Math.max(...scores).toFixed(1)}  (${Date.now() - t0}ms)`);
  }
  console.log("");

  const rows = [];
  for (const ctrl of CONTROLS) {
    const c = elkiesKlagsbrunFibration(ctrl.u, ctrl.t);
    const n = nagao(c.coeffs, { upTo: PRIMES });
    const pct = percentileRank(n.score, byU[ctrl.u]);
    rows.push({ ...ctrl, score: n.score, percentile: pct });
    console.log(`${ctrl.label}`);
    console.log(`  score=${n.score.toFixed(1)}  →  percentile ${(pct * 100).toFixed(2)}% of its generic population (0% = most extreme direction, 50% = indistinguishable from typical)`);
  }

  // WHAT THIS DRIVER CAN AND CANNOT CONCLUDE, STATED SEPARATELY. This tests
  // only ONE direction: does a curve of KNOWN high rank have an extreme
  // score? A noisy proxy statistic can satisfy that ("high rank -> extreme
  // score") while FAILING the direction curve-rank-ek.mjs's own top-K
  // selector actually needs ("extreme score -> high rank") — a score can be
  // real, necessary signal without being a reliable predictor, if most
  // extreme-score curves at a given selectivity are false positives (generic
  // rank curves whose point counts ran high by chance). Reporting a single
  // "the score works" verdict from this test alone would overclaim; the two
  // findings are stated apart.
  const percentiles = rows.map((r) => r.percentile);
  const meanPct = percentiles.reduce((a, b) => a + b, 0) / percentiles.length;
  console.log(`\nmean percentile across all ${rows.length} known-elevated-rank controls: ${(meanPct * 100).toFixed(2)}%`);
  console.log(meanPct < 0.25
    ? "NECESSARY-CONDITION CHECK: PASSES — known higher-rank specimens sit in the tail of the generic population, so the score is not simply broken or uninformative."
    : "NECESSARY-CONDITION CHECK: FAILS — known higher-rank specimens do NOT sit consistently in the tail; suspect the score mechanism itself, not just sample size.");
  console.log("This does NOT by itself explain curve-rank-ek.mjs's own null selector result (top-random=-0.13, p=0.95 at sample=200000/k=60/height=24) — that tested the OTHER direction (does selecting the most extreme scores surface high rank), which a noisy-but-real proxy can still fail at high selectivity. Open next step: test whether the selector holds at MODERATE selectivity (top 1-5%, not top 0.03%) before concluding the score is useless for this family, and/or test averaging a candidate's score against nearby-t neighbors to reduce per-point noise.");

  const out = path.join(HERE, "results", "curve-rank-nagao-diagnostic.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ declared: { population: POPULATION, height: HEIGHT, primes: PRIMES, seed: SEED }, controls: rows, meanPercentile: meanPct }, null, 2));
  console.log(`\n→ ${out}`);
}

main();
