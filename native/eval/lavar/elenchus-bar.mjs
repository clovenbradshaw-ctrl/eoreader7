// elenchus-bar.mjs — the swarm's acceptance bar, MEASURED not set.
// (2026-09-13) Replaces the hand-set `+0.005` elenchus threshold.
//
// THE DEFECT THIS CLOSES, MEASURED. `shapeOf` is a pure function of ledger
// bytes (reading-shape.mjs:19). On Alice ch1, 21 different genotypes
// produced the identical 16-digit shape (0.583042748288777) — so the
// shape's reproducibility floor on this material is ~0 — while the bar
// that refuses every candidate is 0.005, FIVE ORDERS OF MAGNITUDE above
// the signal it is supposed to hear. A swarm that refuses everything the
// signal sits on is not deaf because the landscape is flat; it is deaf
// because its receiver threshold is 5,000x the signal. Its genealogy is
// the proof: 302 births, 0 kept.
//
// THE FIX IS THE RERUN-NULL. The same variant read RERUN_DRAWS times
// (declared draws; the read is deterministic, so the seed is declared and
// kept, the null-arm's own discipline: "a null drawn once is a null drawn
// zero times") — the max |Δ| between any two reruns IS the false-positive
// floor for "this variant differs from itself." A deterministic read
// measures 0, and the bar collapses to epsilon: any real positive delta
// recruits. The measurement decides; nothing is tuned.
//
// THE ELENCHUS ACCEPTS BY BORN MASS. A candidate's improvement carries
// born mass p = Δ²/ΣΔ² over the population's observed improvements, and
// must clear the null's alpha-quantile of the population's own masses —
// the same "the null is the caller's own distribution" shape anchoring.js
// and pronouns.js already hold. A reroll (Δ within the rerun floor)
// carries zero mass and is refused; a real improvement carries coherent
// mass and recruits.

/** The declared rerun-null contract: how many times the same variant is
 * re-read, and the alpha whose quantile admits. Givers: null-arm.mjs's
 * own seed discipline and the repo's standing 0.05. */
export const RERUN_NULL = Object.freeze({ draws: 5, seed: 42, alpha: 0.05 });

/** rerunFloor(shapes) — the max |Δ| across reruns of one variant: the
 * reproducibility floor of the shape on this material. Pure. */
export function rerunFloor(shapes = []) {
  let floor = 0;
  for (let i = 0; i < shapes.length; i += 1) {
    for (let j = i + 1; j < shapes.length; j += 1) {
      floor = Math.max(floor, Math.abs(shapes[i] - shapes[j]));
    }
  }
  return floor;
}

/** elenchusBar(shapes) — the acceptance bar: the measured rerun floor,
 * never below epsilon (so a zero floor still lets any positive delta
 * through, and a measured nonzero floor is honored). Derived, never set. */
export function elenchusBar(shapes = []) {
  if (!shapes.length) return 0;
  return Math.max(rerunFloor(shapes), Number.EPSILON);
}

/** bornAcceptance({delta, populationDeltas}) — does this improvement
 * carry coherent born mass over the population's own improvement
 * distribution? `delta` is the candidate's improvement over the current
 * best; `populationDeltas` are the improvements the colony has observed
 * (the fitness series' own deltas). The candidate's Δ² must clear the
 * alpha-quantile of the population's Δ² — a reroll never does. */
export function bornAcceptance({ delta = 0, populationDeltas = [], alpha = RERUN_NULL.alpha } = {}) {
  if (!Number.isFinite(delta) || delta <= 0) return false;
  const masses = populationDeltas.filter((d) => Number.isFinite(d)).map((d) => d * d);
  if (!masses.length) return false;
  const sorted = [...masses].sort((a, b) => a - b);
  const q = sorted[Math.max(0, Math.ceil((1 - alpha) * sorted.length) - 1)];
  return delta * delta >= q;
}