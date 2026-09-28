// eval/capacity-map/lib/stats.mjs — the small statistics the F3-F5 drivers share.
// Nothing here is a new statistic: the generator is binding.js's own LCG family
// ("PRNG — LCG, same family as the rest of this repo"), the shuffle is binding.js's own
// exported one, and Fisher's exact test is the textbook hypergeometric tail.
export { shuffle } from "../../../legacy-ported/packages/engine/emergence/binding.js";

/** The repo's LCG (binding.js): seeded, deterministic, replayable. */
export const lcg = (seed) => {
  let state = seed | 0;
  return () => { state = (state * 1664525 + 1013904223) | 0; return (state >>> 0) / 4294967296; };
};

const logFact = [0];
const lf = (n) => { for (let i = logFact.length; i <= n; i++) logFact[i] = logFact[i - 1] + Math.log(i); return logFact[n]; };
const logChoose = (n, k) => (k < 0 || k > n ? -Infinity : lf(n) - lf(k) - lf(n - k));

/**
 * One-sided Fisher exact on [[a, b], [c, d]]: P(X >= a) under the hypergeometric with the
 * table's own margins. "Greater" = the first cell is over-represented.
 */
export function fisherGreater(a, b, c, d) {
  const n = a + b + c + d;
  const r1 = a + b;
  const c1 = a + c;
  const top = Math.min(r1, c1);
  let p = 0;
  for (let x = a; x <= top; x++) p += Math.exp(logChoose(r1, x) + logChoose(n - r1, c1 - x) - logChoose(n, c1));
  return Math.min(1, p);
}

export const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN);
export const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)))];
