// eval/the-fold/curve-rank-neighborhood.mjs — LOCAL search around a known
// find, complementing curve-rank-sieve.mjs's GLOBAL random sampling.
//
// WHAT THIS IS, AND WHY IT IS A DIFFERENT LEVER. The sieve samples root-sets
// uniformly at random from a wide pool and ranks them by Nagao score — a
// GLOBAL search with no notion that one good root-set says anything about
// its neighbors. But the eight-on-a-cubic construction is continuous in a
// combinatorial sense: perturbing one root by a small integer gives a
// RELATED curve, not an unrelated one. If the record run's own best find
// (roots [0,2,7,11,12,15,26,28], rank 11 exact) sits in a genuinely good
// region of the space rather than being an isolated fluke, its NEIGHBORS
// should score better than the pool average — and if they do not, that is
// itself the honest finding, not a reason to keep looking by eye.
//
// THE NEIGHBORHOOD, DECLARED. Every root moved to r+d for d in
// [-RADIUS..RADIUS], d != 0, one root moved at a time (the rest held fixed)
// — 8 roots x 2*RADIUS moves, deduplicated against isomorphism
// (canonicalRoots) and against the base point itself. A caller wanting a
// wider neighborhood raises RADIUS; nothing here is discovered by trying
// several and keeping the one that worked.
//
// SAME LADDER AS THE SIEVE: Nagao (free) orders the neighborhood, the real
// PARI descent judges the top-K plus a same-size RANDOM K from the same
// neighborhood — so "does locality help" is measured against the same kind
// of null the sieve already uses, not assumed from the base point's own rank.
//
//   node native/eval/the-fold/curve-rank-neighborhood.mjs [--radius 6] [--k 20] [--jobs 2]

import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { lintInferences } from "../../organs/reasoning-lint.js";
import * as pari from "./lib/pari-oracle.mjs";
import { eightOnACubic, canonicalRoots } from "../../adapters/math/construction.js";
import { nagao } from "../../adapters/math/local.js";
import { rankClaim, curveName } from "../../adapters/math/material.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (flag, dflt) => { const i = process.argv.indexOf(flag); return i > 0 ? Number(process.argv[i + 1]) : dflt; };

const RADIUS = arg("--radius", 6);
const K = arg("--k", 20);
const PRIMES = arg("--primes", 500);
const JOBS = arg("--jobs", 2);
const TIMEOUT_MS = arg("--timeout", 240) * 1000;
const SEED = arg("--seed", 20260916);

// The record run's own best find — read from its own saved result, never
// hand-copied, so this driver cannot silently drift from what was actually
// judged.
const prior = JSON.parse(fs.readFileSync(path.join(HERE, "results", "curve-rank-sieve.json"), "utf8"));
const cubic = prior.families.find((f) => f.name === "eight-on-a-cubic");
const BASE = (cubic?.best?.roots ?? []).map(Number);
if (BASE.length !== 8) { console.error("no eight-on-a-cubic best roots found in results/curve-rank-sieve.json — nothing to search around"); process.exit(1); }

const mulberry = (seed) => () => { let t = (seed += 0x6d2b79f5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffle = (xs, rng) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN);
const median = (xs) => { if (!xs.length) return NaN; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const tally = (xs) => xs.reduce((d, x) => ((d[x] = (d[x] ?? 0) + 1), d), {});

async function pool(items, jobs, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(jobs, items.length) }, async () => {
    while (next < items.length) { const i = next; next += 1; results[i] = await fn(items[i], i); }
  }));
  return results;
}

function permutationP(top, rand, rng, permutations = 4000) {
  const observed = mean(top) - mean(rand);
  const pooled = [...top, ...rand];
  let atLeast = 0;
  for (let i = 0; i < permutations; i += 1) {
    const s = shuffle(pooled, rng);
    if (mean(s.slice(0, top.length)) - mean(s.slice(top.length)) >= observed) atLeast += 1;
  }
  return { observed, p: (atLeast + 1) / (permutations + 1) };
}

// ── the neighborhood: one root moved at a time, RADIUS in either direction ─
function neighbors(base) {
  const baseCanon = canonicalRoots(base).join(",");
  const seen = new Set([baseCanon]);
  const out = [];
  for (let i = 0; i < base.length; i += 1) {
    for (let d = -RADIUS; d <= RADIUS; d += 1) {
      if (d === 0) continue;
      const moved = [...base];
      moved[i] = base[i] + d;
      if (new Set(moved).size < 8) continue; // a moved root landed on another — not 8 distinct roots
      const canon = canonicalRoots(moved);
      const key = canon.join(",");
      if (seen.has(key)) continue;
      seen.add(key);
      const c = eightOnACubic(canon);
      if (c) out.push({ key, candidate: c, movedIndex: i, delta: d });
    }
  }
  return out;
}

async function main() {
  const avail = await pari.available();
  if (!avail.ok) { console.error("pari/gp is not reachable"); process.exit(1); }
  console.log(`oracle: ${avail.version}`);
  console.log(`base (the sieve's own rank-11 find): roots ${BASE.join(",")}`);
  console.log(`declared: radius=±${RADIUS}  k=${K}  primes<=${PRIMES}  seed=${SEED}  jobs=${JOBS}\n`);

  const pool_ = neighbors(BASE);
  console.log(`neighborhood: ${pool_.length} distinct, valid neighbors within radius ${RADIUS} of the base (8 roots x ${2 * RADIUS} moves, deduplicated by isomorphism)`);

  const t0 = Date.now();
  for (const s of pool_) s.local = nagao(s.candidate.coeffs, { upTo: PRIMES });
  console.log(`low: local scores for all ${pool_.length} in ${Date.now() - t0}ms`);

  const rng = mulberry(SEED);
  const top = [...pool_].sort((a, b) => a.local.score - b.local.score).slice(0, K);
  const rand = shuffle(pool_, rng).slice(0, K);
  const baseCandidate = eightOnACubic(canonicalRoots(BASE));
  const toJudge = [...new Map([...top, ...rand, { key: "base", candidate: baseCandidate }].map((s) => [s.key, s])).values()];

  const t1 = Date.now();
  const verdicts = await pool(toJudge, JOBS, (s) => pari.rankCandidate(s.candidate, { timeoutMs: TIMEOUT_MS }));
  console.log(`high: ${toJudge.length} descents in ${((Date.now() - t1) / 1000).toFixed(0)}s\n`);
  const byKey = new Map(toJudge.map((s, i) => [s.key, { ...s, verdict: verdicts[i] }]));

  const baseV = byKey.get("base").verdict;
  console.log(`base re-verified: rank ${baseV.exact ?? `[${baseV.lo},${baseV.hi}]`} (${baseV.detail})\n`);

  const ranks = (arm) => arm.map((s) => byKey.get(s.key).verdict).filter((v) => v.exact !== null).map((v) => v.exact);
  const undecided = (arm) => arm.map((s) => byKey.get(s.key).verdict).filter((v) => v.lo === null).map((v) => v.detail);
  const topRanks = ranks(top), randRanks = ranks(rand);

  console.log(`RANDOM k=${K} (the neighborhood's own floor, unbiased): median ${median(randRanks)}, mean ${mean(randRanks).toFixed(2)}  ${JSON.stringify(tally(randRanks))}`);
  console.log(`TOP-SCORE k=${K} (the low's pick):                     median ${median(topRanks)}, mean ${mean(topRanks).toFixed(2)}  ${JSON.stringify(tally(topRanks))}`);
  for (const [arm, label] of [[rand, "random"], [top, "top-score"]]) { const u = undecided(arm); if (u.length) console.log(`  ${label}: ${u.length} undecided — ${u[0]}`); }
  if (topRanks.length && randRanks.length) {
    const sel = permutationP(topRanks, randRanks, rng);
    console.log(`does the low help HERE too? top - random = ${sel.observed.toFixed(2)} ranks, permutation p = ${sel.p.toFixed(4)}`);
  }

  const judged = [...byKey.values()];
  const best = judged.filter((s) => s.verdict.lo !== null).sort((a, b) => b.verdict.lo - a.verdict.lo)[0];
  const beatsBase = best && best.key !== "base" && (best.verdict.exact ?? best.verdict.lo) > (baseV.exact ?? baseV.lo);
  console.log(`\nbest in the neighborhood: rank ${best.verdict.exact ?? `>=${best.verdict.lo}`}  ${curveName(best.candidate)}${best.key !== "base" ? ` (moved root #${best.movedIndex} by ${best.delta > 0 ? "+" : ""}${best.delta})` : " (the base itself)"}`);
  console.log(beatsBase ? `>>> A NEIGHBOR BEATS THE BASE — local search found real signal beyond the original point.` : `no neighbor beat the base within this radius/budget — the base looks locally isolated, not a foothold on a rising slope, at this scale.`);

  const pinned = judged.filter((s) => s.verdict.exact !== null);
  const claims = pinned.map((s) => rankClaim(s.candidate, s.verdict.exact));
  const lint = await lintInferences(claims, { verify: pari.verify, strictness: "standard" });
  console.log(`\nchecking ladder: ${claims.length} pinned ranks re-verified — ok=${lint.ok} ${JSON.stringify(lint.counts)}`);

  const out = path.join(HERE, "results", "curve-rank-neighborhood.json");
  fs.writeFileSync(out, JSON.stringify({
    declared: { radius: RADIUS, k: K, primes: PRIMES, seed: SEED, oracle: avail.version, base: BASE },
    neighborhoodSize: pool_.length,
    baseVerdict: baseV,
    random: { ranks: randRanks, median: median(randRanks), mean: mean(randRanks) },
    top: { ranks: topRanks, median: median(topRanks), mean: mean(topRanks) },
    best: best && { coeffs: best.candidate.coeffs, roots: best.candidate.roots ?? null, lo: best.verdict.lo, hi: best.verdict.hi, exact: best.verdict.exact, movedIndex: best.movedIndex ?? null, delta: best.delta ?? null },
    beatsBase,
    judged: judged.map((s) => ({ key: s.key, score: s.local?.score ?? null, lo: s.verdict.lo, hi: s.verdict.hi, exact: s.verdict.exact })),
    ladder: { checked: claims.length, ok: lint.ok, counts: lint.counts },
  }, null, 2));
  console.log(`\n→ ${out}`);
}

main();
