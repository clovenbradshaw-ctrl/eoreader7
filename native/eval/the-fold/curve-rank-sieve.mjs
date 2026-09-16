// eval/the-fold/curve-rank-sieve.mjs — loops on loops: the high sets the
// probability of the low, the low sets the possibility for the high.
//
// THREE LEVELS, EACH A CELL, EACH MEASURED RATHER THAN TRUSTED.
//
//   PATTERN (high) · INS·Kind · Composing — families (adapters/math/
//     construction.js). A family is one formula holding infinitely many
//     curves; its members inherit its rank as a floor. Two families run
//     side by side so the floor each one sets is MEASURED, not assumed:
//       three-root        — five points forced by a linear solve
//       eight-on-a-cubic  — eight points by Mestre's square root, seven
//                           independent by construction
//
//   GROUND (low) · NUL·Void · Clearing — local counts mod p
//     (adapters/math/local.js). Cheap, uncertain, and exactly where rank is
//     heuristically visible. Used ONLY to order which members get the
//     expensive judgment.
//
//   FIGURE · EVA·Lens · Binding — the descent (lib/pari-oracle.mjs) decides
//     each selected member. Nothing reaches the report on the low's say-so.
//
// THE NULL ON THE LOW (feedback: null the free stage before spending calls).
// A score that orders candidates is only worth its compute if the ones it
// ranks first actually come out higher. So every family spends the SAME
// oracle budget twice: on the top-K by score, and on K drawn at random from
// the same sample. The random arm is also the unbiased read of the family's
// floor. The comparison is a seeded permutation test — a p-value reported,
// no cutoff applied to it here.
//
// THE OUTER LOOP · REC·Paradigm · Composing — across families, the measured
// floors decide where the next budget goes. The decision is printed with the
// numbers that made it; nothing re-zeros silently.
//
// WHAT IT DOES NOT CLAIM. Rank 10 curves have been known for decades; this
// family is the classical first rung of the ladder that ends at the records.
// The run says how far up that rung reaches and whether the local score is
// worth spending — nothing about rank 31.
//
//   node native/eval/the-fold/curve-rank-sieve.mjs [--sample 400] [--k 15]
//        [--range 14] [--primes 500] [--seed 20260916] [--jobs 4]

import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { lintInferences } from "../../organs/reasoning-lint.js";
import * as pari from "./lib/pari-oracle.mjs";
import { THREE_ROOT_FAMILY, instantiate, eightOnACubic, canonicalRoots } from "../../adapters/math/construction.js";
import { nagao } from "../../adapters/math/local.js";
import { rankClaim, curveName } from "../../adapters/math/material.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (flag, dflt) => { const i = process.argv.indexOf(flag); return i > 0 ? Number(process.argv[i + 1]) : dflt; };

const SAMPLE = arg("--sample", 400);
const K = arg("--k", 15);
const RANGE = arg("--range", 14);
const PRIMES = arg("--primes", 500);
const SEED = arg("--seed", 20260916);
const JOBS = arg("--jobs", 4);
const TIMEOUT_MS = arg("--timeout", 300) * 1000;
const PERMUTATIONS = 4000;
// --family restricts the whole run's oracle budget to one family, so a
// budget increase is not silently halved between the two — the floors were
// already measured apart (curve-rank-sieve.json); this only decides where
// to SPEND, never re-measures which is stronger.
const FAMILY_ARG = (() => { const i = process.argv.indexOf("--family"); return i > 0 ? process.argv[i + 1] : null; })();

const mulberry = (seed) => () => { let t = (seed += 0x6d2b79f5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffle = (xs, rng) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN);
const median = (xs) => { if (!xs.length) return NaN; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const tally = (xs) => xs.reduce((d, x) => ((d[x] = (d[x] ?? 0) + 1), d), {});

// ── the high: two families, sampled without repeats ───────────────────────

function sampleEight(n, rng) {
  const seen = new Set(), out = [];
  let tries = 0;
  while (out.length < n && tries < n * 50) {
    tries += 1;
    const pool = shuffle(Array.from({ length: 2 * RANGE + 1 }, (_, i) => i - RANGE), rng).slice(0, 8);
    const canon = canonicalRoots(pool);
    const key = canon.join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    const c = eightOnACubic(canon);
    if (c) out.push({ key, candidate: c });
  }
  return { out, repeats: tries - out.length };
}

function sampleThreeRoot(n, rng) {
  const seen = new Set(), out = [];
  const baseX = new Set(THREE_ROOT_FAMILY.base.map(([x]) => x));
  const coords = [];
  for (let x = -RANGE; x <= RANGE; x += 1) if (!baseX.has(x)) for (let y = 0; y <= RANGE; y += 1) coords.push([x, y]);
  let tries = 0;
  while (out.length < n && tries < n * 50) {
    tries += 1;
    const [p, q] = shuffle(coords, rng).slice(0, 2);
    if (p[0] === q[0]) continue;
    const c = instantiate(THREE_ROOT_FAMILY, [p, q]);
    if (!c) continue;
    const key = c.coeffs.join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ key, candidate: c });
  }
  return { out, repeats: tries - out.length };
}

// ── a bounded pool, so the oracle budget is spent in parallel ─────────────

async function pool(items, jobs, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(jobs, items.length) }, async () => {
    while (next < items.length) { const i = next; next += 1; results[i] = await fn(items[i], i); }
  }));
  return results;
}

/** Permutation test: how often does a random split beat the observed gap? */
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

async function runFamily(name, sampler, rng) {
  const t0 = Date.now();
  const { out: sample, repeats } = sampler(SAMPLE, rng);
  const tSample = Date.now() - t0;

  // GROUND — the low, over the whole sample.
  const t1 = Date.now();
  for (const s of sample) s.local = nagao(s.candidate.coeffs, { upTo: PRIMES });
  const tLocal = Date.now() - t1;

  // The two selections of equal size: the low's ranking, and chance.
  const top = [...sample].sort((a, b) => a.local.score - b.local.score).slice(0, K);
  const rand = shuffle(sample, rng).slice(0, K);
  const toJudge = [...new Map([...top, ...rand].map((s) => [s.key, s])).values()];

  // FIGURE — the descent decides each selected member.
  const t2 = Date.now();
  // Higher rank takes the descent longer, so a short timeout would censor
  // exactly the candidates the low ranked highest — the budget is generous
  // and every timeout is still reported, never dropped.
  const verdicts = await pool(toJudge, JOBS, (s) => pari.rankCandidate(s.candidate, { timeoutMs: TIMEOUT_MS }));
  const tJudge = Date.now() - t2;
  const byKey = new Map(toJudge.map((s, i) => [s.key, { ...s, verdict: verdicts[i] }]));

  const ranks = (arm) => arm.map((s) => byKey.get(s.key).verdict).filter((v) => v.exact !== null).map((v) => v.exact);
  const lows = (arm) => arm.map((s) => byKey.get(s.key).verdict).filter((v) => v.exact === null && v.lo !== null).map((v) => v.lo);
  const topRanks = ranks(top), randRanks = ranks(rand);
  const undecided = (arm) => arm.map((s) => byKey.get(s.key).verdict).filter((v) => v.lo === null).map((v) => v.detail);
  const judged = [...byKey.values()];
  const best = judged.filter((s) => s.verdict.lo !== null).sort((a, b) => b.verdict.lo - a.verdict.lo)[0] ?? null;

  return {
    name, sampleSize: sample.length, repeatsSkipped: repeats, oracleCalls: toJudge.length,
    ms: { sample: tSample, local: tLocal, judge: tJudge },
    random: { ranks: randRanks, unpinnedLowerBounds: lows(rand), undecided: undecided(rand), median: median(randRanks), mean: mean(randRanks), tally: tally(randRanks) },
    top: { ranks: topRanks, unpinnedLowerBounds: lows(top), undecided: undecided(top), median: median(topRanks), mean: mean(topRanks), tally: tally(topRanks) },
    selector: topRanks.length && randRanks.length ? permutationP(topRanks, randRanks, rng) : null,
    best,
    judged,
  };
}

async function main() {
  const avail = await pari.available();
  if (!avail.ok) { console.error("pari/gp is not reachable — the oracle is the point, so this run refuses rather than guessing."); process.exit(1); }
  console.log(`oracle: ${avail.version}`);
  console.log(`declared: sample=${SAMPLE}/family  k=${K}  range=±${RANGE}  primes<=${PRIMES}  seed=${SEED}  jobs=${JOBS}\n`);

  const rng = mulberry(SEED);
  const families = [];
  const ALL_SAMPLERS = [["three-root", sampleThreeRoot], ["eight-on-a-cubic", sampleEight]];
  const runners = FAMILY_ARG ? ALL_SAMPLERS.filter(([name]) => name === FAMILY_ARG) : ALL_SAMPLERS;
  if (FAMILY_ARG && !runners.length) { console.error(`--family ${FAMILY_ARG} is not one of: ${ALL_SAMPLERS.map(([n]) => n).join(", ")}`); process.exit(1); }
  for (const [name, sampler] of runners) {
    const f = await runFamily(name, sampler, rng);
    families.push(f);
    console.log(`${name}`);
    console.log(`  sampled ${f.sampleSize} distinct (${f.repeatsSkipped} repeats/isomorphs skipped before any oracle call)`);
    console.log(`  low: local scores for all ${f.sampleSize} in ${f.ms.local}ms · high: ${f.oracleCalls} descents in ${(f.ms.judge / 1000).toFixed(0)}s`);
    console.log(`  RANDOM k=${K} (the family's floor, unbiased): median ${f.random.median}, mean ${f.random.mean.toFixed(2)}  ${JSON.stringify(f.random.tally)}${f.random.unpinnedLowerBounds.length ? `  unpinned lower bounds ${JSON.stringify(f.random.unpinnedLowerBounds)}` : ""}`);
    console.log(`  TOP-SCORE k=${K} (the low's pick):            median ${f.top.median}, mean ${f.top.mean.toFixed(2)}  ${JSON.stringify(f.top.tally)}${f.top.unpinnedLowerBounds.length ? `  unpinned lower bounds ${JSON.stringify(f.top.unpinnedLowerBounds)}` : ""}`);
    for (const [arm, label] of [[f.random, "random"], [f.top, "top-score"]]) if (arm.undecided.length) console.log(`  ${label}: ${arm.undecided.length} undecided — ${arm.undecided[0]}`);
    // Selectivity alongside p: a null here means "no signal at THIS top-K
    // fraction", not "no signal" — see curve-rank-ek.mjs's own note.
    if (f.selector) console.log(`  does the low help? top − random = ${f.selector.observed.toFixed(2)} ranks, permutation p = ${f.selector.p.toFixed(4)} (${PERMUTATIONS} shuffles, selectivity: top ${K} of ${f.sampleSize} = ${((K / f.sampleSize) * 100).toFixed(3)}%)`);
    if (f.best) console.log(`  best: rank ${f.best.verdict.exact ?? `>=${f.best.verdict.lo}`}  ${curveName(f.best.candidate)}${f.best.candidate.roots ? `  roots ${f.best.candidate.roots.join(",")}` : ""}`);
    console.log("");
  }

  // REC·Paradigm — the outer loop's decision, from measured floors only.
  // Skipped when the caller already spent the whole budget on one family
  // by declaring --family: there is nothing left to compare.
  const ranked = [...families].sort((a, b) => b.random.mean - a.random.mean);
  if (ranked.length > 1) console.log(`outer loop (REC·Paradigm): next budget goes to "${ranked[0].name}" — measured floor mean ${ranked[0].random.mean.toFixed(2)} vs "${ranked[1].name}" ${ranked[1].random.mean.toFixed(2)}, both from random draws of k=${K}`);
  else console.log(`outer loop (REC·Paradigm): whole budget declared for "${ranked[0].name}" (--family) — no comparison to make this run`);

  // The checking ladder: every pinned rank, re-decided through reasoning-lint.
  const pinned = families.flatMap((f) => f.judged.filter((s) => s.verdict.exact !== null));
  const claims = pinned.map((s) => rankClaim(s.candidate, s.verdict.exact));
  // SPENT IN PARALLEL, never sequential (lib/pari-oracle.mjs::parallelVerify).
  // Measured live 2026-09-16: reading the same {verify: pari.verify} straight
  // into lintInferences re-checks hundreds of pinned claims one gp round trip
  // at a time, and the checking ladder alone outlasts the parallel search it is
  // meant to be checking.
  const pv = pari.parallelVerify(claims, { jobs: JOBS });
  const lint = await lintInferences(claims, { verify: pv.verify, strictness: "standard" });
  console.log(`\nchecking ladder: ${claims.length} pinned ranks re-verified — ok=${lint.ok} ${JSON.stringify(lint.counts)}`);
  for (const f of lint.findings.filter((x) => x.severity === "error").slice(0, 5)) console.log(`  [${f.level}·${f.severity}] ${f.kind}: ${f.detail}`);

  const out = path.join(HERE, "results", "curve-rank-sieve.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({
    declared: { sample: SAMPLE, k: K, range: RANGE, primes: PRIMES, seed: SEED, permutations: PERMUTATIONS, oracle: avail.version },
    families: families.map((f) => ({
      name: f.name, sampleSize: f.sampleSize, repeatsSkipped: f.repeatsSkipped, oracleCalls: f.oracleCalls, ms: f.ms,
      random: f.random, top: f.top, selector: f.selector,
      best: f.best && { coeffs: f.best.candidate.coeffs, roots: f.best.candidate.roots ?? null, forced: f.best.candidate.forced, lo: f.best.verdict.lo, hi: f.best.verdict.hi, exact: f.best.verdict.exact },
      judged: f.judged.map((s) => ({ key: s.key, score: s.local.score, lo: s.verdict.lo, hi: s.verdict.hi, exact: s.verdict.exact, verdict: s.verdict.verdict })),
    })),
    outerLoop: { nextBudget: ranked[0].name, single: Boolean(FAMILY_ARG), floors: Object.fromEntries(families.map((f) => [f.name, f.random.mean])) },
    ladder: { checked: claims.length, ok: lint.ok, counts: lint.counts },
  }, null, 2));
  console.log(`\n→ ${out}`);
}

main();
