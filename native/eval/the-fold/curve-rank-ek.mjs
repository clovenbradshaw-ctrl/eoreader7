// eval/the-fold/curve-rank-ek.mjs — the same Nagao-low/oracle-high ladder as
// curve-rank-sieve.mjs, pointed at a PUBLISHED high-generic-rank fibration
// instead of a construction this repo performs itself.
//
// WHY A DIFFERENT FAMILY. Every family in construction.js up to this file
// sets its floor by FORCING points — a linear system, or Mestre's octic
// trick (7 independent by construction). adapters/math/construction.js's
// `elkiesKlagsbrunFibration(u, t)` is different in kind: a fibration
// E_u/Q(t) that Elkies & Klagsbrun proved has Mordell-Weil group Z/2Z x Z^9
// over Q(t) for every u with 5-u^2 a perfect square — GENERIC RANK 9,
// established by a real proof, not by this repo's own point-forcing. By
// Silverman specialization (the same theorem this repo's own local.js
// header already names) almost every t inherits that 9 for free; searching
// for t giving even higher SPECIALIZED rank is exactly this file's job,
// with the SAME method the paper itself used (Mestre-Nagao scoring, then a
// real descent to judge) — the paper's own section 9 reports 17
// specializations of rank 19 and one of rank 20 at u=2/5 and u=11/5.
//
// WHAT THIS DOES NOT CLAIM. This is a small, honest re-run of a published
// method on a modest budget, not a new search of the paper's own scale
// (they sieved 2^44 values of t with vectorized bit tricks; this samples a
// few thousand t=a/b pairs and pays a real PARI call for each one judged).
// Reaching their own rank 19-20 here would mean landing, by chance, on
// specializations they already publish — a real possibility worth checking
// honestly, not a discovery. Anything genuinely NEW would need a search at
// a scale this file does not attempt.
//
//   node native/eval/the-fold/curve-rank-ek.mjs [--u 2/5] [--sample 3000]
//        [--k 40] [--height 20] [--primes 500] [--jobs 6]

import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { lintInferences } from "../../organs/reasoning-lint.js";
import * as pari from "./lib/pari-oracle.mjs";
import { elkiesKlagsbrunFibration } from "../../adapters/math/construction.js";
import { nagao } from "../../adapters/math/local.js";
import { rankClaim, curveName } from "../../adapters/math/material.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (flag, dflt) => { const i = process.argv.indexOf(flag); return i > 0 ? Number(process.argv[i + 1]) : dflt; };
const argStr = (flag, dflt) => { const i = process.argv.indexOf(flag); return i > 0 ? process.argv[i + 1] : dflt; };

const U = argStr("--u", "2/5");
const SAMPLE = arg("--sample", 3000);
const K = arg("--k", 40);
const HEIGHT = arg("--height", 20); // t = a/b, |a|,|b| <= 2^HEIGHT — the paper searched to 2^21..2^28; kept far smaller here (real oracle cost per candidate, not a sieve)
const PRIMES = arg("--primes", 500);
const SEED = arg("--seed", 20260916);
const JOBS = arg("--jobs", 6);
const TIMEOUT_MS = arg("--timeout", 240) * 1000;
const PERMUTATIONS = 4000;

const mulberry = (seed) => () => { let t = (seed += 0x6d2b79f5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffle = (xs, rng) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN);
const median = (xs) => { if (!xs.length) return NaN; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const tally = (xs) => xs.reduce((d, x) => ((d[x] = (d[x] ?? 0) + 1), d), {});
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };

/** t = a/b, a random integer in [-2^HEIGHT, 2^HEIGHT], b a random positive integer in [1, 2^HEIGHT], reduced. Excludes b=0 and a=0 (t=0 degenerates a factor of B to a constant, still checked like any other candidate by the singular-curve verdict downstream, but skipped here to spend budget on genuinely varying candidates). */
function sampleT(n, rng, height) {
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
    const c = elkiesKlagsbrunFibration(U, key);
    if (c) out.push({ key, candidate: c });
  }
  return { out, repeats: tries - out.length };
}

async function pool(items, jobs, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(jobs, items.length) }, async () => {
    while (next < items.length) { const i = next; next += 1; results[i] = await fn(items[i], i); }
  }));
  return results;
}

function permutationP(top, rand, rng) {
  const observed = mean(top) - mean(rand);
  const pooled = [...top, ...rand];
  let atLeast = 0;
  for (let i = 0; i < PERMUTATIONS; i += 1) {
    const s = shuffle(pooled, rng);
    if (mean(s.slice(0, top.length)) - mean(s.slice(top.length)) >= observed) atLeast += 1;
  }
  return { observed, p: (atLeast + 1) / (PERMUTATIONS + 1) };
}

async function main() {
  const avail = await pari.available();
  if (!avail.ok) { console.error("pari/gp is not reachable"); process.exit(1); }
  console.log(`oracle: ${avail.version}`);
  console.log(`family: elkies-klagsbrun fibration, u=${U} (Elkies & Klagsbrun, ANTS 2020, section 9 — Z/2Z x Z^9 over Q(t))`);
  console.log(`declared: sample=${SAMPLE}  k=${K}  height=2^${HEIGHT}  primes<=${PRIMES}  seed=${SEED}  jobs=${JOBS}\n`);

  const rng = mulberry(SEED);
  const t0 = Date.now();
  const { out: sample, repeats } = sampleT(SAMPLE, rng, HEIGHT);
  console.log(`sampled ${sample.length} distinct t (${repeats} repeats/invalid skipped) in ${Date.now() - t0}ms`);

  const t1 = Date.now();
  for (const s of sample) s.local = nagao(s.candidate.coeffs, { upTo: PRIMES });
  console.log(`low: local scores for all ${sample.length} in ${Date.now() - t1}ms`);

  const top = [...sample].sort((a, b) => a.local.score - b.local.score).slice(0, K);
  const rand = shuffle(sample, rng).slice(0, K);
  const toJudge = [...new Map([...top, ...rand].map((s) => [s.key, s])).values()];

  const t2 = Date.now();
  // Since construction.js's elkiesKlagsbrunFibration now pairs each of
  // Appendix A's 9 generator x-coordinates with an exact-rational y, the
  // descent gets the real points instead of starting from scratch — measured
  // on the paper's own rank-19 worked example, this alone moved the bound
  // from unpinned [9,19] to [17,19] in under a second (curve-rank-sieve.mjs's
  // own eight-on-a-cubic family already does this; this family had not).
  const verdicts = await pool(toJudge, JOBS, (s) => pari.rankCandidate(s.candidate, { timeoutMs: TIMEOUT_MS }));
  console.log(`high: ${toJudge.length} descents in ${((Date.now() - t2) / 1000).toFixed(0)}s\n`);
  const byKey = new Map(toJudge.map((s, i) => [s.key, { ...s, verdict: verdicts[i] }]));

  // A rank here is best reported as the PROVEN LOWER BOUND (lo), never the
  // pin alone — this family's own generic rank is 9, and the earlier
  // verification run (u=2/5, t=11860/97527, the paper's own rank-19
  // specimen) came back UNPINNED at [9,19]: 2-descent bounds a Selmer
  // group, and does not always land lo=hi even on a curve whose true rank
  // is known by other means. Reporting `lo` alone would still be honest and
  // is what a record claim needs; `exact` is kept separately so a genuine
  // pin is never confused with an unpinned bound.
  const reportRank = (v) => v.lo;
  const ranks = (arm) => arm.map((s) => byKey.get(s.key).verdict).filter((v) => v.lo !== null).map(reportRank);
  const topRanks = ranks(top), randRanks = ranks(rand);
  const judged = [...byKey.values()];
  const best = judged.filter((s) => s.verdict.lo !== null).sort((a, b) => b.verdict.lo - a.verdict.lo)[0] ?? null;

  console.log(`RANDOM k=${K} (unbiased floor over sampled t):  median ${median(randRanks)}, mean ${mean(randRanks).toFixed(2)}  ${JSON.stringify(tally(randRanks))}`);
  console.log(`TOP-SCORE k=${K} (the low's pick):              median ${median(topRanks)}, mean ${mean(topRanks).toFixed(2)}  ${JSON.stringify(tally(topRanks))}`);
  if (topRanks.length && randRanks.length) {
    const sel = permutationP(topRanks, randRanks, rng);
    // A null result here means "no signal AT THIS SELECTIVITY", never "no
    // signal, period" — measured live 2026-09-16: this family showed nothing
    // at top-K/sample ~1.6%, then a real search needed pushing selectivity
    // toward the paper's own ~0.001% before drawing any conclusion.
    console.log(`does the low help on this family too? top - random = ${sel.observed.toFixed(2)}, permutation p = ${sel.p.toFixed(4)}  (selectivity: top ${K} of ${sample.length} = ${((K / sample.length) * 100).toFixed(3)}%)`);
  }
  if (best) console.log(`\nbest: rank >= ${best.verdict.lo}${best.verdict.exact !== null ? ` (PINNED exact = ${best.verdict.exact})` : " (unpinned — descent bound, not a proven exact value)"}  ${curveName(best.candidate)}  u=${U} t=${best.key}`);

  // The checking ladder, over whatever this run actually pinned. A best
  // reported only as `lo` does not enter this ladder — reasoning-lint's
  // verify() checks EXACT-rank claims; an unpinned lower bound is a
  // different claim shape (rankClaim's own `atLeast` form, not exercised by
  // this driver, which reports lo/hi directly rather than composing a
  // second claim type here).
  const pinned = judged.filter((s) => s.verdict.exact !== null);
  const claims = pinned.map((s) => rankClaim(s.candidate, s.verdict.exact));
  // SPENT IN PARALLEL, never sequential (lib/pari-oracle.mjs::parallelVerify) —
  // see curve-rank-sieve.mjs's own header note on why this matters at scale.
  const pv = claims.length ? pari.parallelVerify(claims, { jobs: JOBS }) : null;
  const lint = claims.length ? await lintInferences(claims, { verify: pv.verify, strictness: "standard" }) : { ok: true, counts: {} };
  console.log(`\nchecking ladder: ${claims.length} PINNED ranks re-verified — ok=${lint.ok} ${JSON.stringify(lint.counts)} (${judged.length - claims.length} more judged but unpinned, not entered here)`);

  const out = path.join(HERE, "results", "curve-rank-ek.json");
  fs.writeFileSync(out, JSON.stringify({
    declared: { u: U, sample: SAMPLE, k: K, height: HEIGHT, primes: PRIMES, seed: SEED, permutations: PERMUTATIONS, oracle: avail.version },
    sampleSize: sample.length, repeatsSkipped: repeats,
    random: { ranks: randRanks, median: median(randRanks), mean: mean(randRanks), tally: tally(randRanks) },
    top: { ranks: topRanks, median: median(topRanks), mean: mean(topRanks), tally: tally(topRanks) },
    best: best && { coeffs: best.candidate.coeffs, u: U, t: best.key, lo: best.verdict.lo, hi: best.verdict.hi, exact: best.verdict.exact },
    judged: judged.map((s) => ({ key: s.key, score: s.local.score, lo: s.verdict.lo, hi: s.verdict.hi, exact: s.verdict.exact, verdict: s.verdict.verdict })),
    ladder: { checked: claims.length, ok: lint.ok, counts: lint.counts },
  }, null, 2));
  console.log(`\n→ ${out}`);
}

main();
