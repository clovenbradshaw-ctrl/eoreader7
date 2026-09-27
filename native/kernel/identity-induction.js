// native/kernel/identity-induction.js — IDENTITY INDUCTION: when two
// differently-named things are the same thing, FOR SOMEONE (2026-09-27).
// Medium-blind, kernel-level. Standing: nomination until its measurements
// (eval/identity/) say otherwise.
//
// THE DEFINITION (the user's, 2026-09-27, verbatim):
//   "Two things are the same thing relative to the relevant for whom if the
//    universe folded on them is the same, bounded by a distinction that makes
//    a difference and if the impact on the nodes around them, when
//    counterfactually changed, is greater than the same perturbations of
//    other things by chance."
//
// Read as four tests, each against a null the material itself supplies:
//
//   1  THE WORLDS MATCH      pool a's and b's occurrences and re-deal them
//                            into two groups of the same sizes, many times.
//                            If a and b were one thing, the observed
//                            similarity of their universes would sit inside
//                            that re-dealt band. Below it, the reading says
//                            they differ. (Exchangeability: "two readings of
//                            the same thing".)
//   2  ONLY WHAT MATTERS     the universe is widened hop by hop and widening
//                            stops where it no longer moves the verdict
//                            statistics beyond their own null's spread; a
//                            frame may also declare which features its
//                            question depends on (`relevant`).
//   3  THEY CARRY WEIGHT     the counterfactual: replace x by the background
//                            (an average node of its kind) and measure how far
//                            the surroundings move. That distance must exceed
//                            what a random same-size draw of background
//                            occurrences moves them. Idle things fail here, so
//                            two empty universes can never "match".
//   4  THE SAME CONSEQUENCE  the direction of that counterfactual — x's lift
//                            over the background, feature by feature — must
//                            align between a and b more than a's lift aligns
//                            with randomly drawn other nodes of the kind.
//
// Test 1 alone is a failure to find a difference, which small samples always
// "pass"; test 4 is the positive evidence. Test 3 keeps test 4 honest.
// The earlier, refuted attempt (±1-token company, where saw/wrote beat
// looked/gazed) was test 1 alone at radius 1 with no background subtracted.
//
// MEDIUM-BLIND. A node is an opaque id; an occurrence is a list of opaque
// features tagged with a hop (`{ f, hop }`). This file knows no word, no
// sentence, no verb. The caller decides what a node and a feature are — in
// text, a relation label and the ends it joins; in music, a motif and what
// sounds with it.
//
// NUMBERS ARE DECLARED (P9, P4): `draws`, `alpha`, `seed`, `minOccurrences`,
// `maxHop` have no defaults. A pair below `minOccurrences` on either side is a
// typed gap — "not enough reading yet" — never "different".
//
// WHAT A VERDICT IS. `same` is a scoped, revisable standing for this frame
// over this record, never a received identity: the grain theorem forbids a
// corpus from earning an unscoped Pattern claim, and this does not claim one.
// It is landed by the caller as a hypothesis (identity.js) and conceded when
// further reading moves either universe.

import { createSeededRng } from "./rng.js";

const need = (opts, keys) => {
  for (const k of keys) if (opts[k] === undefined || opts[k] === null) throw new TypeError(`identity-induction: '${k}' must be declared`);
};

/** Sum a list of occurrences into a count vector at radius `hop`. */
export function profileOf(occurrences, { hop, relevant = null, drop = null } = {}) {
  const v = new Map();
  for (const occ of occurrences) {
    for (const { f, hop: h } of occ) {
      if (h > hop) continue;
      if (drop && drop.has(f)) continue;
      if (relevant && !relevant(f)) continue;
      v.set(f, (v.get(f) ?? 0) + 1);
    }
  }
  return v;
}

const norm = (v) => { let s = 0; for (const x of v.values()) s += x * x; return Math.sqrt(s); };
const total = (v) => { let s = 0; for (const x of v.values()) s += x; return s; };

/** Cosine similarity of two sparse vectors (0 when either is empty). */
export function cosine(a, b) {
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return 0;
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [k, x] of small) { const y = big.get(k); if (y) dot += x * y; }
  return dot / (na * nb);
}

/** Total-variation distance between a profile and the background, as distributions. */
function departure(p, background) {
  const tp = total(p), tb = total(background);
  if (!tp || !tb) return 0;
  let d = 0;
  const keys = new Set([...p.keys(), ...background.keys()]);
  for (const k of keys) d += Math.abs((p.get(k) ?? 0) / tp - (background.get(k) ?? 0) / tb);
  return d / 2;
}

/**
 * The counterfactual's direction: smoothed log-lift of x over the background
 * on each feature x carries. `smooth` is a pseudo-count, declared.
 */
export function liftOf(p, background, { smooth, minFeatureCount = 1 }) {
  const tp = total(p), tb = total(background), V = background.size || 1;
  const out = new Map();
  for (const [k, c] of p) {
    if (c < minFeatureCount) continue;
    const px = (c + smooth) / (tp + smooth * V);
    const pb = ((background.get(k) ?? 0) + smooth) / (tb + smooth * V);
    const l = Math.log(px / pb);
    if (l > 0) out.set(k, l);
  }
  return out;
}

const quantile = (xs, q) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))))];
};

const subsample = (arr, k, rng) => {
  if (arr.length <= k) return arr;
  const d = [...arr];
  for (let j = d.length - 1; j >= d.length - k; j -= 1) { const r = Math.floor(rng() * (j + 1)); [d[j], d[r]] = [d[r], d[j]]; }
  return d.slice(d.length - k);
};

const sample = (arr, k, rng) => {
  const out = [];
  for (let i = 0; i < k; i += 1) out.push(arr[Math.floor(rng() * arr.length)]);
  return out;
};

/**
 * makeIdentityInduction(record, opts)
 *   record   Map<nodeId, occurrence[]>  — every node of ONE kind in the frame
 *            (occurrence = [{ f, hop }]). Nodes of other kinds never enter.
 *   opts     { draws, alpha, seed, minOccurrences, maxHop, smooth, resolution,
 *              minFeatureCount (a feature seen fewer times in a node is noise
 *              in its lift, not its consequence),
 *              namesNode?, relevant? }
 *     resolution  the grain of test 1: worlds are compared as samples of this
 *                 many occurrences. A difference visible only above it is
 *                 below the distinction that makes a difference for this
 *                 frame. Must be <= minOccurrences / 2 (two disjoint samples
 *                 of one node are the within-node band).
 *     namesNode   (feature) => nodeId | null. A feature that NAMES a node
 *                 (a hop-2 feature "this end also keeps label L") is masked
 *                 whenever that node is one of the pair being judged — a
 *                 universe that carries the candidate's own name decides the
 *                 question by spelling (found live: planted twins judged
 *                 "different" 20/30 because each half's features named the
 *                 other). Omit it only when no feature names a node.
 * returns { judge(a, b), frame }
 */
export function makeIdentityInduction(record, opts = {}) {
  need(opts, ["draws", "alpha", "seed", "minOccurrences", "maxHop", "smooth", "resolution", "minFeatureCount"]);
  const { draws, alpha, seed, minOccurrences, maxHop, smooth, resolution, minFeatureCount, relevant = null, namesNode = null } = opts;
  if (2 * resolution > minOccurrences) throw new RangeError("identity-induction: resolution must be <= minOccurrences / 2");
  // which features name which node — computed once
  const naming = new Map();
  if (namesNode) for (const occs of record.values()) for (const o of occs) for (const { f } of o) {
    if (naming.has(f)) continue;
    const n = namesNode(f); if (n != null) naming.set(f, n);
  }
  // SELF-NAMING IS DROPPED FOR EVERY NODE, not only the pair being judged.
  // Masking only the candidates left every OTHER node's occurrences carrying
  // their own names, so a candidate's profile lacked a kind of feature every
  // null draw had — a small, systematic departure test 3 read as weight.
  // Found live: a label-shuffle control (II.23, answer known: nothing is the
  // same) came back 13/66 "same" at hop 2 and 0/66 at hop 1.
  if (namesNode) {
    const clean = new Map();
    for (const [n, occs] of record) clean.set(n, occs.map((o) => o.filter(({ f }) => naming.get(f) !== n)));
    record = clean;
  }
  const nodes = [...record.keys()].filter((n) => (record.get(n)?.length ?? 0) >= minOccurrences);
  const allOcc = [];
  for (const n of record.keys()) for (const o of record.get(n)) allOcc.push(o);
  const maskFor = (a, b) => {
    const m = new Set();
    for (const [f, n] of naming) if (n === a || n === b) m.add(f);
    return m;
  };

  const bgCache = new Map();
  const background = (hop, drop) => {
    if (!bgCache.has(hop)) bgCache.set(hop, profileOf(allOcc, { hop, relevant }));
    const bg = bgCache.get(hop);
    if (!drop.size) return bg;
    const out = new Map(bg); for (const f of drop) out.delete(f); return out;
  };
  const P = (occ, hop, drop) => profileOf(occ, { hop, relevant, drop });

  // test 3 — the counterfactual weight of x, ranked against same-size background draws
  const weight = (x, hop, drop, rng) => {
    const occ = record.get(x);
    const bg = background(hop, drop);
    const observed = departure(P(occ, hop, drop), bg);
    const nul = [];
    for (let i = 0; i < draws; i += 1) nul.push(departure(P(sample(allOcc, occ.length, rng), hop, drop), bg));
    const ceiling = quantile(nul, 1 - alpha);
    return { observed, ceiling, carries: observed > ceiling };
  };

  const disjointPair = (occ, m, rng) => {
    const d = [...occ];
    for (let j = d.length - 1; j > d.length - 1 - 2 * m && j > 0; j -= 1) { const r = Math.floor(rng() * (j + 1)); [d[j], d[r]] = [d[r], d[j]]; }
    return [d.slice(d.length - m), d.slice(d.length - 2 * m, d.length - m)];
  };

  const statsAt = (a, b, hop, drop, rng) => {
    const A = record.get(a), B = record.get(b), m = resolution;
    // test 1 — at the declared resolution: is a b-sample as like an a-sample
    // as another a-sample (or b-sample) is?
    const within = [], cross = [];
    for (let i = 0; i < draws; i += 1) {
      const [a1, a2] = disjointPair(A, m, rng), [b1, b2] = disjointPair(B, m, rng);
      within.push(cosine(P(a1, hop, drop), P(a2, hop, drop)), cosine(P(b1, hop, drop), P(b2, hop, drop)));
      cross.push(cosine(P(a1, hop, drop), P(b1, hop, drop)));
    }
    const floor = quantile(within, alpha);
    const crossMedian = quantile(cross, 0.5);
    // test 4 — aligned consequence against random other nodes of the kind
    const bg = background(hop, drop);
    const la = liftOf(P(A, hop, drop), bg, { smooth, minFeatureCount }), lb = liftOf(P(B, hop, drop), bg, { smooth, minFeatureCount });
    const aligned = cosine(la, lb);
    const others = nodes.filter((n) => n !== a && n !== b);
    // MUTUAL: b must stand out among a's alignments with the kind, and a among b's
    const chanceA = [], chanceB = [];
    for (let i = 0; i < draws && others.length; i += 1) {
      // SIZE-MATCHED: "the same perturbation of other things" — a comparison
      // node enters at the candidate's own size, or a half-size twin is
      // measured against full-size nodes whose lifts are steadier than its own
      // (found live: planted twins failing test 4 while their decoys passed it).
      const c = record.get(others[Math.floor(rng() * others.length)]);
      const cb = liftOf(P(subsample(c, B.length, rng), hop, drop), bg, { smooth, minFeatureCount });
      const ca = liftOf(P(subsample(c, A.length, rng), hop, drop), bg, { smooth, minFeatureCount });
      chanceA.push(cosine(la, cb)); chanceB.push(cosine(lb, ca));
    }
    const ceilA = quantile(chanceA, 1 - alpha), ceilB = quantile(chanceB, 1 - alpha);
    const chanceCeiling = Math.max(ceilA, ceilB);
    const chance = [...chanceA, ...chanceB];
    const spread = quantile(chance, 0.75) - quantile(chance, 0.25);
    return {
      hop,
      worlds: { observed: crossMedian, floor, match: crossMedian >= floor },
      consequence: { observed: aligned, ceiling: chanceCeiling, spread, aligned: others.length > 0 && aligned > chanceCeiling },
    };
  };

  function judge(a, b) {
    for (const [x, name] of [[a, "a"], [b, "b"]]) {
      const n = record.get(x)?.length ?? 0;
      if (n < minOccurrences) return Object.freeze({ a, b, verdict: "gap", reason: "not_enough_reading", detail: `${name} has ${n} occurrence(s), below the declared ${minOccurrences}` });
    }
    if (a === b) return Object.freeze({ a, b, verdict: "same", reason: "identical_id" });
    const rng = createSeededRng({ seed, a, b });
    const drop = maskFor(a, b);
    // test 2 — widen until widening stops moving the consequence beyond its own null's spread
    let chosen = statsAt(a, b, 1, drop, rng); const path = [chosen];
    for (let hop = 2; hop <= maxHop; hop += 1) {
      const next = statsAt(a, b, hop, drop, rng); path.push(next);
      const moved = Math.abs(next.consequence.observed - chosen.consequence.observed);
      chosen = next;
      if (moved <= next.consequence.spread) break;
    }
    const hop = chosen.hop;
    const wa = weight(a, hop, drop, rng), wb = weight(b, hop, drop, rng);
    const tests = { worlds: chosen.worlds, weight: { a: wa, b: wb }, consequence: chosen.consequence };
    let verdict = "same", reason = null;
    if (!wa.carries || !wb.carries) { verdict = "gap"; reason = "idle"; }
    else if (!chosen.worlds.match) { verdict = "different"; reason = "worlds_differ"; }
    else if (!chosen.consequence.aligned) { verdict = "different"; reason = "consequence_not_aligned"; }
    return Object.freeze({ a, b, verdict, reason, hop, masked: drop.size, tests, path: path.map((p) => ({ hop: p.hop, worlds: p.worlds.observed, consequence: p.consequence.observed })) });
  }

  return Object.freeze({ judge, frame: Object.freeze({ draws, alpha, seed, minOccurrences, maxHop, smooth, resolution, minFeatureCount, relevant: relevant ? "declared" : null, namesNode: namesNode ? "declared" : null, nodes: nodes.length }) });
}
