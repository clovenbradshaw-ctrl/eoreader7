// lib/swarm-search.mjs — Wilson's colony over a DISCRETE operating-point space, and the exhaustive sweep that is its control.
// Handle: Wilson (eval/lavar/wilson.mjs is the swarm; swarm-gate.mjs is the gate it breeds through; elenchus-bar.mjs the bar).
//
// WHAT IS SHARED, AND WHAT IS NOT. wilson.mjs breeds organ SETS by union and by toggling one organ; sanskrit-swarm.mjs says why that does not
// carry to scalar floors ("union over {sh0.5, ct10} tokens would refuse every cross-floor child as DAG-illegal, which is theater") and sweeps
// a grid instead. This is the same contract with the colony kept: the SEEDS champion their terrain by fiat; each generation a RANDOM unseen
// point is tried (REC·Ground, "always explore"), the best three admitted points are BRED (CON·Figure: a child takes each coordinate from one
// parent) and MUTATED (one coordinate one step up or down); every candidate is measured, its improvement over its terrain's champion is
// recorded in the colony's own distribution BEFORE it is judged, and the gate (swarm-gate.mjs: improvement >= the measured bar AND born mass
// over the colony's own observed improvements) keeps or refuses it. A point tried once is never measured again ("retried"). The colony stops
// after `dryLimit` consecutive generations that admit nothing — nothing is tuned to make it run longer.
//
// THE BAR IS MEASURED, NOT SET. After the seeds the best seed is measured RERUN_NULL.draws more times (the contract in elenchus-bar.mjs:
// draws 5, seed 42); a deterministic fitness measures the same value each time, the rerun floor is 0 and the bar collapses to epsilon, so any
// real positive improvement is audible. A fitness that varies between runs would raise the bar to what it varies by, and the gate would
// honour that. Nothing here chooses a number.
//
// THE CONTROL IS THE POINT. `exhaustive` measures every point of the space with the same fitness. The colony is judged against it in the
// record the caller writes — how many points the colony measured to reach its champion, and what the best point of the whole space scores — so
// a gate that stalls a climb (it squares EVERY observed improvement, negative ones included, so a small real gain beside large losses can fail
// the born-mass test) shows up as a gap between the two numbers rather than as a plausible-looking champion. The gate is not tuned to close it.
//
// PURE. A fitness is injected; this file reads nothing and keeps no state between calls. Randomness is a seeded generator (mulberry32).
import { createSwarmGate, stanceOf } from "../swarm-gate.mjs";
import { elenchusBar, RERUN_NULL } from "../elenchus-bar.mjs";

/** The colony's declared knobs. None is searched; each is stated so a record can print it. */
export const COLONY = Object.freeze({ maxGens: 40, dryLimit: 2, breeders: 3, randomPerGen: 1, recordLosses: true, seed: RERUN_NULL.seed });

/** mulberry32 — a tiny seeded generator; the same seed gives the same colony. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The number of points in a space: [{ key, values: [...] }, ...]. */
export const spaceSize = (space) => space.reduce((n, d) => n * d.values.length, 1);

/** A point's identity: its coordinates in dimension order. */
export const keyOf = (space, cfg) => space.map((d) => String(cfg[d.key])).join("|");

/** Every point of the space, in a fixed order (the last dimension varies fastest). */
export function allConfigs(space) {
  let out = [{}];
  for (const d of space) out = out.flatMap((c) => d.values.map((v) => ({ ...c, [d.key]: v })));
  return out;
}

const indexIn = (d, v) => d.values.findIndex((x) => x === v);

/** One step up and one step down along each coordinate. */
export function neighbours(space, cfg) {
  const out = [];
  for (const d of space) {
    const i = indexIn(d, cfg[d.key]);
    for (const j of [i - 1, i + 1]) if (j >= 0 && j < d.values.length) out.push({ ...cfg, [d.key]: d.values[j] });
  }
  return out;
}

/** Every child that takes each coordinate from one of the two parents, other than the parents themselves. */
export function children(space, a, b) {
  const out = [];
  const n = space.length;
  for (let mask = 1; mask < (1 << n) - 1; mask += 1) {
    const c = {};
    space.forEach((d, i) => { c[d.key] = mask & (1 << i) ? a[d.key] : b[d.key]; });
    out.push(c);
  }
  const ka = keyOf(space, a), kb = keyOf(space, b);
  const seen = new Set([ka, kb]);
  return out.filter((c) => { const k = keyOf(space, c); if (seen.has(k)) return false; seen.add(k); return true; });
}

const scoreOf = (r) => (typeof r === "number" ? r : r.f);

/**
 * exhaustive(space, fitness) → { best, all, evaluations, plateau } — every point measured. `fitness(cfg)` returns a number or `{ f, ... }`.
 * `best` is the highest f, ties broken by enumeration order (declared; `plateau` counts the points that tie it, so a flat top is visible).
 */
export function exhaustive(space, fitness) {
  const all = [];
  for (const cfg of allConfigs(space)) { const r = fitness(cfg); all.push({ cfg, f: scoreOf(r), detail: r }); }
  let best = all[0];
  for (const x of all) if (x.f > best.f) best = x;
  const plateau = all.filter((x) => Math.abs(x.f - best.f) <= 1e-12).length;
  return { best, all, evaluations: all.length, plateau };
}

/**
 * colony({ space, fitness, seeds, terrain, knobs }) → { best, census, genealogy, bar, births, admitted, generations, evaluations, dry, knobs }
 *
 *   space    [{ key, values }] — each dimension's ordered values (a step moves one place along `values`).
 *   fitness  (cfg) => number | { f, ... } — deterministic; measured on the split the caller owns (DEV), never the one it reports on.
 *   seeds    [cfg] — the points the colony starts from; each champions `terrain` by fiat, as wilson.mjs seeds its population.
 *   terrain  the one terrain the colony works (a string); `championFor` is per terrain, and a single-terrain space is disclosed, not hidden.
 *
 * The genealogy is append-only: one row per birth { gen, op, parents, cfg, f, improvement, fate: "kept" | "refused" | "retried", stance }.
 */
export function colony({ space, fitness, seeds, terrain = "Entity", knobs = {} }) {
  const K = { ...COLONY, ...knobs };
  const rng = mulberry32(K.seed);
  const terrainOf = () => [terrain];
  const seen = new Map(); // key → { cfg, f, detail }
  const genealogy = [];
  const measure = (cfg) => { const k = keyOf(space, cfg); let m = seen.get(k); if (!m) { const r = fitness(cfg); m = { cfg, f: scoreOf(r), detail: r }; seen.set(k, m); } return m; };

  let pop = [];
  let best = null;
  const seedGate = createSwarmGate({ bar: Number.EPSILON });
  for (const cfg of seeds) {
    const m = measure(cfg);
    seedGate.record([keyOf(space, cfg)], terrainOf, m.f);
    pop.push({ cfg, f: m.f });
    genealogy.push({ gen: 0, op: "seed", parents: [], cfg, f: m.f, improvement: null, fate: "kept", stance: stanceOf("INS", "Figure") });
    if (!best || m.f > best.f) best = { cfg, f: m.f, detail: m.detail };
  }
  // The measured bar: the best seed re-read RERUN_NULL.draws times.
  const reruns = Array.from({ length: RERUN_NULL.draws }, () => scoreOf(fitness(best.cfg)));
  const bar = elenchusBar(reruns);
  const gate = createSwarmGate({ bar });
  for (const p of pop) gate.record([keyOf(space, p.cfg)], terrainOf, p.f);
  gate.recordImprovement(0); // the colony's improvement distribution starts observed, never empty (sanskrit-swarm.mjs does the same)

  const birth = (gen, op, parents, cfg, stance) => {
    const k = keyOf(space, cfg);
    if (seen.has(k)) { genealogy.push({ gen, op, parents, cfg, f: seen.get(k).f, improvement: null, fate: "retried", stance }); return false; }
    const m = measure(cfg);
    const improvement = m.f - gate.championFor([k], terrainOf, best.f);
    if (K.recordLosses || improvement > 0) gate.recordImprovement(improvement);
    const admitted = gate.admits(improvement);
    genealogy.push({ gen, op, parents, cfg, f: m.f, improvement, fate: admitted ? "kept" : "refused", stance });
    if (admitted) {
      gate.record([k], terrainOf, m.f);
      pop.push({ cfg, f: m.f });
      if (m.f > best.f) best = { cfg, f: m.f, detail: m.detail };
    }
    return admitted;
  };

  let dry = 0, gen = 0;
  for (gen = 1; gen <= K.maxGens && dry < K.dryLimit; gen += 1) {
    let kept = 0;
    // REC·Ground — a random unseen point, always.
    for (let r = 0; r < K.randomPerGen; r += 1) {
      const pool = allConfigs(space).filter((c) => !seen.has(keyOf(space, c)));
      if (!pool.length) break;
      const cfg = pool[Math.floor(rng() * pool.length)];
      if (birth(gen, "random", [], cfg, stanceOf("REC", "Ground"))) kept += 1;
    }
    const breeders = [...pop].sort((a, b) => b.f - a.f).slice(0, K.breeders);
    // SIG/INS·Figure — mutate: one coordinate, one step.
    for (const p of breeders) for (const cfg of neighbours(space, p.cfg)) if (birth(gen, "mutate", [keyOf(space, p.cfg)], cfg, stanceOf("INS", "Figure"))) kept += 1;
    // CON·Figure — breed: each pair of breeders' crossovers.
    for (let i = 0; i < breeders.length; i += 1) for (let j = i + 1; j < breeders.length; j += 1) {
      for (const cfg of children(space, breeders[i].cfg, breeders[j].cfg)) if (birth(gen, "breed", [keyOf(space, breeders[i].cfg), keyOf(space, breeders[j].cfg)], cfg, stanceOf("CON", "Figure"))) kept += 1;
    }
    dry = kept === 0 ? dry + 1 : 0;
  }
  const fresh = genealogy.filter((g) => g.fate !== "retried" && g.op !== "seed");
  return {
    best, census: [...seen.values()], genealogy, bar, knobs: K,
    births: fresh.length, admitted: fresh.filter((g) => g.fate === "kept").length, generations: gen - 1,
    evaluations: seen.size, dry: dry >= K.dryLimit,
  };
}

/**
 * spreadSeeds(space) → three points: every dimension at its lowest value, at its middle, at its highest. A deterministic spread of the corners
 * and the centre, so no seed is chosen by looking at a score.
 */
export function spreadSeeds(space) {
  const pick = (f) => Object.fromEntries(space.map((d) => [d.key, d.values[f(d.values.length)]]));
  return [pick(() => 0), pick((n) => Math.floor((n - 1) / 2)), pick((n) => n - 1)];
}

/** plateauOf(points, tol) → the points whose f ties the best (within tol). `points` are { cfg, f }. */
export function plateauOf(points, tol = 1e-12) {
  if (!points.length) return [];
  const top = Math.max(...points.map((p) => p.f));
  return points.filter((p) => Math.abs(p.f - top) <= tol);
}

/**
 * leastClaim(points, { claimsOf, higher, lower }) → the point of a plateau that claims least. When the held-out split cannot tell two
 * operating points apart, the one that speaks less is the one that cannot be wrong where the other is silent (the withhold-before-convict
 * rule the grounding ladder holds): fewest claims first (`claimsOf(cfg)`, a count the caller defines — here, the strip rules a point compiles
 * to), then the higher value of each key in `higher` (a floor: higher speaks less), then the lower value of each key in `lower` (a breadth:
 * lower is less machinery), then enumeration order. Declared, not searched; the caller prints the plateau it chose from.
 */
export function leastClaim(points, { claimsOf, higher = [], lower = [] }) {
  const scored = points.map((p, i) => ({ p, i, claims: claimsOf(p.cfg) }));
  scored.sort((a, b) => {
    if (a.claims !== b.claims) return a.claims - b.claims;
    for (const k of higher) if (a.p.cfg[k] !== b.p.cfg[k]) return b.p.cfg[k] - a.p.cfg[k];
    for (const k of lower) if (a.p.cfg[k] !== b.p.cfg[k]) return a.p.cfg[k] - b.p.cfg[k];
    return a.i - b.i;
  });
  return scored.length ? { ...scored[0].p, claims: scored[0].claims } : null;
}
