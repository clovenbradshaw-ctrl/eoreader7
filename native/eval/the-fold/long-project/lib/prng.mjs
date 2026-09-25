// lib/prng.mjs — a small seeded PRNG, no dependency, for generate-corpus.mjs's
// distractor selection and attendee picks. Deterministic: the same seed
// always produces the same corpus (house style — long-stream.mjs, the
// frontier-token-recall battery — every run here is seeded and reproducible).
//
// mulberry32 (Tommy Ettinger's public-domain generator): 32-bit state, one
// multiply-heavy mix per call, well past any statistical need for picking
// distractor paragraphs out of a hand-written pool of ~35.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** An integer in [0, n). */
export function randInt(rng, n) { return Math.floor(rng() * n); }

/** Fisher-Yates, seeded, does not mutate the input. */
export function shuffled(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** k distinct elements of arr, seeded, order preserved from a shuffle. */
export function sample(rng, arr, k) { return shuffled(rng, arr).slice(0, Math.min(k, arr.length)); }
