// native/organs/pythia.js — THE ORACLE. Handle: Pythia, the Delphic oracle.
//
// STRUCTURAL ELEMENT, NOT A VOICE. What the historical record actually gives
// a codebase to build from is not what she said but the SHAPE OF THE
// PROCESS: an oracle's raw utterance and its INTERPRETATION are two
// separate, sequential acts, never one — and Croesus's own war against
// Persia (Herodotus, Histories 1.53, 1.91) is the disclosed cautionary case:
// told "if you attack, you will destroy a great empire," he acted on the
// utterance directly, skipped a real interpretation step, and destroyed his
// own. That is the structural finding this organ encodes, not a phrase to
// quote: a stochastic result (repeated trials over an uncertain claim) may
// never be read as a verdict directly. It must pass through a SEPARATE,
// explicitly-parameterized interpretation step, and that step must be able
// to return AMBIGUOUS — refuse to force a binary call — exactly where the
// raw rate sits too close to the caller's own declared threshold to decide.
//
// WHERE THIS FITS THE HIVE. `wilson.js` composes three REQUIRED castes
// (ethos/logos/pathos). Pythia is not a fourth required caste — she answers
// a narrower, optional question none of the three ask: given MANY
// independent trials of the same claim (an ant re-run several times, a
// specialist re-measured across several held-out samples), what does the
// SPREAD across those trials actually warrant concluding, with the
// uncertainty stated rather than collapsed into one confident number. This
// is the "pathos we're figuring out" question for an ant: not one felt
// shape from one run, but what a run's own VARIANCE across repetitions is
// entitled to claim.

export const PYTHIA = Object.freeze({
  handle: "Pythia",
  organ: "pythia",
  structure: "utterance, then a SEPARATE, declared interpretation — never read a raw rate as a verdict",
  law: "an oracle that is always confident is not an oracle, it is a guess wearing authority; ambiguity must be a real, reachable outcome",
});

/**
 * pythiaSpeak({ trials }) → PythiaUtterance@1
 *
 * `trials` — an array of boolean-ish outcomes from independent runs of the
 *   SAME claim (e.g. did this ant's specialist beat its terrain champion,
 *   run N times with re-seeded material). Never a single run — a lone trial
 *   has no spread to speak from, and this function refuses it rather than
 *   silently reporting a rate of 0 or 1 as though it meant something.
 *
 * The utterance is RAW: a count, a rate, nothing more. It carries no
 * favorable/unfavorable/ambiguous verdict — that would be reading her own
 * words for her, the exact move this organ exists to forbid.
 */
export function pythiaSpeak({ trials } = {}) {
  if (!Array.isArray(trials) || trials.length < 2) {
    throw new TypeError("pythia: at least two independent trials are required — a single trial has no spread to speak from");
  }
  const total = trials.length;
  const agree = trials.filter(Boolean).length;
  return Object.freeze({
    schema: "PythiaUtterance@1",
    total,
    agree,
    rate: agree / total,
    interpreted: false,
  });
}

/**
 * pythiaInterpret(utterance, { threshold, ambiguityBand }) → PythiaVerdict@1
 *
 * The priest's step, separated from the oracle's. `threshold` is REQUIRED
 * and never defaulted (this codebase's own standing rule: P4, a threshold
 * is declared by the caller, never hand-picked here as though it were a
 * universal constant). `ambiguityBand` is likewise required — the width
 * around `threshold` inside which the utterance is honestly AMBIGUOUS
 * rather than forced toward whichever side the bare rate happens to sit on.
 *
 * Returns one of three verdicts: "favorable" (rate clears threshold beyond
 * the band), "unfavorable" (rate falls short beyond the band), or
 * "ambiguous" (rate sits inside the band — a real, first-class outcome,
 * never smoothed away).
 */
export function pythiaInterpret(utterance, { threshold, ambiguityBand } = {}) {
  if (!utterance || utterance.schema !== "PythiaUtterance@1") {
    throw new TypeError("pythia: interpretation requires a real utterance from pythiaSpeak, never a hand-written rate");
  }
  if (typeof threshold !== "number" || threshold < 0 || threshold > 1) {
    throw new TypeError("pythia: threshold is declared by the caller, never defaulted — a rate means nothing without a stated bar to read it against");
  }
  if (typeof ambiguityBand !== "number" || ambiguityBand < 0 || ambiguityBand > 1) {
    throw new TypeError("pythia: ambiguityBand is declared by the caller, never defaulted — without it every close call is silently forced to one side");
  }
  const { rate } = utterance;
  const lo = threshold - ambiguityBand;
  const hi = threshold + ambiguityBand;
  const verdict = rate > hi ? "favorable" : rate < lo ? "unfavorable" : "ambiguous";
  return Object.freeze({
    schema: "PythiaVerdict@1",
    utterance,
    threshold,
    ambiguityBand,
    verdict,
    at: Date.now(),
  });
}

// ── THE BEARING WALL: a downstream caller validates the interpretation ──────
// Mirrors ethos.js/logos.js/pathos.js's own walls: refuses a hand-written
// object shaped like a verdict, and — the structural point this whole organ
// exists for — refuses a RAW UTTERANCE presented as though it were already
// a verdict. A caller reading `utterance.rate` directly and branching on it
// is exactly the un-interpreted reading this wall exists to make impossible
// downstream: `requireOracle` will not accept anything without a real
// `PythiaVerdict@1` schema tag, however confident the raw rate looked.
export function requireOracle(verdict) {
  if (!verdict || verdict.schema !== "PythiaVerdict@1") {
    throw new Error(
      "pythia: no valid oracle verdict — a raw utterance is not a verdict, and a hand-written one is not " +
      "an interpretation. The rate must pass through pythiaInterpret with a declared threshold and band.",
    );
  }
  if (!["favorable", "unfavorable", "ambiguous"].includes(verdict.verdict)) {
    throw new Error("pythia: the verdict is not one of the three honest outcomes — a forged verdict string is refused");
  }
  return verdict;
}
