// eval/capacity-map/lib/direction.mjs — F4's reliability pipeline, as declared in
// native/docs/THE-CAPACITY-MAP.md section 5 (F4). No number here is new; each is the
// document's, and the driver prints them.
//
// The statistic under test is the ENGINE's own: transferEntropy (binding.js) on binary arrival
// indicator series, asymmetry d = TE(a->b) - TE(b->a) per half of the reading. What this file
// adds is only the splitting and the controls:
//   - halves are INTERLEAVED BLOCKS of B units (alternate blocks to alternate halves), or two
//     contiguous halves for the robustness arm;
//   - the order-destroying control permutes units WITHIN each block, the same permutation for
//     every being, so per-half rates and within-unit co-occurrence are preserved and only
//     temporal adjacency is destroyed.
// agreement(pair) = 1 iff sign(d) is the same in both halves; a pair whose asymmetry is exactly
// zero in either half is a TIE and is excluded (and counted). "Exactly zero" is floating-point
// zero (|d| < 1e-12), not a tuned cut.
import { transferEntropy } from "../../../legacy-ported/packages/engine/emergence/binding.js";
import { lcg, shuffle } from "./stats.mjs";

const EPS = 1e-12; // floating-point zero for a difference of two entropies — not a threshold on effect size
const STREAM = 7919; // distinct replicate streams from one seed; any prime does

/** The split of N units into two halves by blocks of B (contiguous = two blocks). */
export function scheme(N, B, { contiguous = false } = {}) {
  const size = contiguous ? Math.ceil(N / 2) : B;
  const nBlocks = Math.ceil(N / size);
  const lens = [0, 0];
  for (let b = 0; b < nBlocks; b++) lens[b & 1] += Math.min(size, N - b * size);
  return { N, B: size, nBlocks, lens, contiguous };
}

/** newPos[t]: where unit t lands after permuting within its block (identity for the real order). */
function permutation(sch, rnd) {
  const { N, B, nBlocks } = sch;
  const newPos = new Int32Array(N);
  if (!rnd) { for (let t = 0; t < N; t++) newPos[t] = t; return newPos; }
  for (let b = 0; b < nBlocks; b++) {
    const s = b * B;
    const e = Math.min(N, s + B);
    const pos = [];
    for (let t = s; t < e; t++) pos.push(t);
    shuffle(pos, rnd);
    for (let t = s; t < e; t++) newPos[t] = pos[t - s];
  }
  return newPos;
}

/** Index of absolute position p within its half (blocks of one half are laid end to end). */
const inHalf = (sch, p) => {
  const b = Math.floor(p / sch.B);
  return [b & 1, (b >> 1) * sch.B + (p - b * sch.B)];
};

/**
 * computeReliability({ beings, pairs, N, B, contiguous, R, seed }) ->
 *   Map(key -> { ind: Int8Array(R+1), L })
 * ind[0] is the REAL order, ind[1..R] the order-destroyed replicates. ind[r] is 1 (the two
 * halves agree in sign), 0 (they disagree) or -1 (a tie in either half).
 * L counts lag events on the whole reading in its real order — the volume stratifier.
 * `pairs` is [[idA, idB], ...]; a being's arrivals are sorted unit indices.
 */
export function computeReliability({ beings, pairs, N, B, contiguous = false, R, seed }) {
  const sch = scheme(N, B, { contiguous });
  const byId = new Map(beings.map((b) => [b.id, b]));
  const arrSets = new Map(beings.map((b) => [b.id, new Set(b.arrivals)]));
  const out = new Map();
  for (const [a, b] of pairs) {
    const A = byId.get(a).arrivals;
    const SB = arrSets.get(b);
    const SA = arrSets.get(a);
    let L = 0;
    for (const t of A) if (SB.has(t + 1)) L++;
    for (const t of byId.get(b).arrivals) if (SA.has(t + 1)) L++;
    out.set(`${a}\u0000${b}`, { ind: new Int8Array(R + 1).fill(-1), L });
  }
  const used = new Set();
  for (const [a, b] of pairs) { used.add(a); used.add(b); }

  for (let r = 0; r <= R; r++) {
    const newPos = permutation(sch, r === 0 ? null : lcg(seed + r * STREAM));
    const half = new Map();
    for (const id of used) {
      const h = [new Uint8Array(sch.lens[0]), new Uint8Array(sch.lens[1])];
      for (const t of byId.get(id).arrivals) {
        const [hh, idx] = inHalf(sch, newPos[t]);
        h[hh][idx] = 1;
      }
      half.set(id, h);
    }
    for (const [a, b] of pairs) {
      const ha = half.get(a);
      const hb = half.get(b);
      const signs = [0, 1].map((h) => {
        const d = transferEntropy(ha[h], hb[h]) - transferEntropy(hb[h], ha[h]);
        return Math.abs(d) < EPS ? 0 : d > 0 ? 1 : -1;
      });
      const rec = out.get(`${a}\u0000${b}`);
      rec.ind[r] = signs[0] === 0 || signs[1] === 0 ? -1 : signs[0] === signs[1] ? 1 : 0;
    }
  }
  return out;
}

// ── group statistics ────────────────────────────────────────────────────────

/** Agreement of a group at each replicate (ties excluded), the real one first. */
function agreements(inds, R) {
  const sum = new Float64Array(R + 1);
  const n = new Int32Array(R + 1);
  for (const ind of inds) for (let r = 0; r <= R; r++) if (ind[r] >= 0) { sum[r] += ind[r]; n[r]++; }
  return { A: Array.from(sum, (s, r) => (n[r] ? s / n[r] : NaN)), n: Array.from(n) };
}

/**
 * groupStat(inds, R) — the group's real agreement, its order-destroyed mean, the excess
 * E = A_real - mean(A_shuffled), and p_E = (1 + #{r : A_r >= A_real}) / (1 + R): the real order
 * ranked among R order-destroyed replicates (p resolution 1/(1+R)).
 */
export function groupStat(inds, R) {
  const { A, n } = agreements(inds, R);
  const shuf = A.slice(1).filter(Number.isFinite);
  const meanShuf = shuf.length ? shuf.reduce((s, x) => s + x, 0) / shuf.length : NaN;
  const sd = shuf.length > 1 ? Math.sqrt(shuf.reduce((s, x) => s + (x - meanShuf) ** 2, 0) / (shuf.length - 1)) : NaN;
  const ge = shuf.filter((x) => x >= A[0]).length;
  return {
    n: n[0], ties: inds.length - n[0],
    A_real: A[0], A_shuf_mean: meanShuf, A_shuf_sd: sd,
    E: A[0] - meanShuf, p_E: (1 + ge) / (1 + R),
  };
}

const excessOnly = (inds, R) => {
  const { A, n } = agreements(inds, R);
  const shuf = A.slice(1).filter(Number.isFinite);
  return { E: A[0] - (shuf.reduce((s, x) => s + x, 0) / (shuf.length || 1)), n: n[0] };
};

/**
 * stratifiedContrast(recs, R, perms, seed) — recs: [{ ind, group: "S"|"N", stratum }].
 * Delta = sum_k w_k (E_S,k - E_N,k) / sum_k w_k, with w_k = nS nN / (nS + nN) (the precision
 * weight of a difference of two means), strata missing either group dropped and counted. The
 * null permutes the S/N label WITHIN each stratum, so volume cannot masquerade as standing.
 * pGreater = (1 + #{Delta_perm >= Delta}) / (1 + perms); pLess the mirror.
 */
export function stratifiedContrast(recs, R, perms, seed) {
  const strata = [...new Set(recs.map((r) => r.stratum))];
  const byStratum = new Map(strata.map((k) => [k, recs.filter((r) => r.stratum === k)]));
  const delta = (labelsOf) => {
    let num = 0, den = 0, dropped = 0;
    for (const k of strata) {
      const rs = byStratum.get(k);
      const lab = labelsOf(k);
      const S = rs.filter((_, i) => lab[i] === "S").map((r) => r.ind);
      const N = rs.filter((_, i) => lab[i] === "N").map((r) => r.ind);
      if (!S.length || !N.length) { dropped++; continue; }
      const es = excessOnly(S, R);
      const en = excessOnly(N, R);
      if (!es.n || !en.n || !Number.isFinite(es.E) || !Number.isFinite(en.E)) { dropped++; continue; }
      const w = (es.n * en.n) / (es.n + en.n);
      num += w * (es.E - en.E);
      den += w;
    }
    return { delta: den ? num / den : NaN, dropped };
  };
  const observed = delta((k) => byStratum.get(k).map((r) => r.group));
  const rnd = lcg(seed);
  let ge = 0, le = 0, valid = 0;
  for (let p = 0; p < perms; p++) {
    const permuted = new Map(strata.map((k) => {
      const labs = byStratum.get(k).map((r) => r.group);
      shuffle(labs, rnd);
      return [k, labs];
    }));
    const d = delta((k) => permuted.get(k)).delta;
    if (!Number.isFinite(d)) continue;
    valid++;
    if (d >= observed.delta) ge++;
    if (d <= observed.delta) le++;
  }
  return {
    delta: observed.delta, strataUsed: strata.length - observed.dropped, strataDropped: observed.dropped,
    pGreater: (1 + ge) / (1 + valid), pLess: (1 + le) / (1 + valid), perms: valid,
  };
}

/** Terciles of L pooled over all records: stratum 0, 1 or 2. */
export function terciles(ls) {
  const sorted = [...ls].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length / 3)];
  const hi = sorted[Math.floor((2 * sorted.length) / 3)];
  return (L) => (L < lo ? 0 : L < hi ? 1 : 2);
}

/**
 * decide({ S, N, contrast, minGroup }) — the frozen decision list, in the document's order.
 * The first matching label wins; `inverse` is also flagged when its own condition holds.
 */
export function decide({ S, N, contrast, minGroup }) {
  if (S.n < minGroup || N.n < minGroup) return { label: "UNDERPOWERED", why: `a group has fewer than ${minGroup} non-tied pairs (S ${S.n}, N ${N.n})` };
  const sigS = S.p_E < 0.05 && S.E > 0;
  const sigN = N.p_E < 0.05 && N.E > 0;
  const inverse = contrast.delta < 0 && contrast.pLess < 0.05;
  const flags = { sigS, sigN, inverse };
  if (contrast.pGreater < 0.05 && contrast.delta > 0 && !sigN) return { label: "SUPPORTED", flags };
  if (sigN && contrast.pGreater >= 0.05) return { label: "FALSIFIED-INDEPENDENT", flags };
  if (inverse) return { label: "FALSIFIED-INVERSE", flags };
  if (!sigS && !sigN) return { label: "NO-SIGNAL", flags };
  return { label: "MIXED", flags };
}
