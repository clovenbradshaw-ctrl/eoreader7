// latency-stats.js — two arithmetic idioms shared by every module that ranks
// candidates on measured wall time, extracted rather than left duplicated
// (2026-09-28).
//
// The finding: the-fold's huginn.js (huginnPrioritize) and this repo's own
// online-mouths.js (pick()) each computed a "typical" latency for an
// unmeasured candidate, and each maintained a measured mean by exponential
// weighting on a new observation — the identical two-line idioms, byte for
// byte apart from each caller's own constant. The two callers are NOT the
// same algorithm otherwise (one is a queue-aware expected-wait product, the
// other a static-tier lexicographic sort with no in-flight concept at all),
// so only the arithmetic moves here — each caller keeps its own constant
// (fallback, alpha) and its own comparator, unshared.
//
// PURE: no imports, no state. Medium-blind, domain-blind — the two functions
// take numbers and return numbers.

/** The mean of `values`, or `fallback` when there is nothing measured yet.
 *  Each caller supplies its own fallback (huginn.js: 1, the typical wait
 *  scale so an all-unmeasured field never reads a zero wait; online-mouths.js
 *  pick(): 0, since an all-unmeasured level's own lat() falls through to
 *  meanMs anyway and 0 is that module's own declared "nothing measured"). */
export function typicalLatency(values, fallback) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : fallback;
}

/** One EWMA step: `prev` seeded outright on the first observation, else
 *  blended toward `ms` by `alpha` (each caller's own weight — huginn.js's
 *  EWMA_ALPHA is 0.4, online-mouths.js's EWMA is 0.3, heimdall's own
 *  recordTurnMs is 0.6 old / 0.4 new — givers named at each call site, not
 *  restated here). Rounds to the nearest millisecond either way. */
export function ewmaUpdate(prev, ms, alpha) {
  return prev == null ? Math.round(ms) : Math.round((1 - alpha) * prev + alpha * ms);
}
