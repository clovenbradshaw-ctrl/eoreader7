// the-fold/fold-at.js — the first real slice of the cursor-addressable fold
// interface (vision-end-state step 4): "at any point in that structure — any
// cursor, any referent, any moment — answer 'what is this, here' by returning
// the fold." Described three times across this project's own memory before
// this session; built zero times before this file.
//
// A "cursor" is a holon address (kernel/gfp-claim.js's own `holon()` -- "/",
// "/p3", "/p3/2"), the same addressing scheme every GFP claim's GROUND
// already uses. foldAt does the one thing nothing else in the repo did yet:
// given an address and a flat set of claims, return everything at, above,
// and below that point, using contains()/ancestry() exactly as gfp-claim.js
// defines them -- no new addressing scheme invented.
//
// WHAT THIS DOES NOT YET DO, on purpose, not by oversight: atmosphere (real,
// kernel/atmosphere-math.js's interpretiveAtmosphereFactorField) and paradigm
// (real, the-fold/paradigm.js's evaluateParadigm) both exist and both work,
// but each needs its own real input shape (an obligations sequence; a
// learned paradigm object) that this step did not verify against a live
// caller -- wiring them from an unverified guess at their contract would be
// exactly the "compose without checking" mistake this project's own
// CODING-LESSONS warns against. significance has no implementation ANYWHERE
// in this repo (confirmed by grep before writing this file) -- there is no
// number to fabricate here, so none is returned. Each is reported as a typed
// gap {wired:false, reason} rather than a fake value, the same discipline
// grain-typing.js's own grain_gap already uses: kept, never guessed.
import { holon, contains, ancestry } from "../kernel/gfp-claim.js";

export const FOLD_AT_SCHEMA = "EOFoldAt@1";

/**
 * foldAt(address, claims) -> {
 *   schema, address,
 *   here: claims whose ground is exactly this address,
 *   ancestors: claims whose ground CONTAINS this address, ordered outermost-first,
 *   descendants: claims whose ground is CONTAINED BY this address,
 *   atmosphere, paradigm, significance: typed gaps, not fabricated values,
 * }
 *
 * PURE: no I/O, no model, no default corpus. The caller supplies `claims` --
 * this never reads a session's own state or a file on its own.
 */
export function foldAt(address, claims = []) {
  const here = holon(address);
  const atHere = [], ancestorsOf = [], descendantsOf = [];

  for (const claim of claims) {
    if (!claim || typeof claim.ground !== "string") continue;
    const g = holon(claim.ground);
    if (g === here) { atHere.push(claim); continue; }
    if (contains(g, here)) { ancestorsOf.push(claim); continue; }
    if (contains(here, g)) { descendantsOf.push(claim); continue; }
    // sibling or unrelated ground: not part of this cursor's fold
  }

  // outermost ("/") first, closest-to-here last -- the same order a reader
  // would want context in: broad frame first, narrowing toward the point.
  const ancestryChain = ancestry(here);
  ancestorsOf.sort((a, b) => ancestryChain.indexOf(holon(a.ground)) - ancestryChain.indexOf(holon(b.ground)));

  return {
    schema: FOLD_AT_SCHEMA,
    address: here,
    here: atHere,
    ancestors: ancestorsOf,
    descendants: descendantsOf,
    atmosphere: { wired: false, reason: "kernel/atmosphere-math.js's interpretiveAtmosphereFactorField is real and unwired here -- it needs a real obligations sequence this step did not verify a live source for; wiring it from a guessed shape would be the exact composing-without-checking mistake this project's own lessons warn against." },
    paradigm: { wired: false, reason: "the-fold/paradigm.js's evaluateParadigm is real and unwired here -- it needs a real learned paradigm object (learnParadigm's own output) this step did not verify a live source for." },
    significance: { wired: false, reason: "no significance-measurement module exists anywhere in this repo (checked before writing this file) -- there is no real number to return, so none is fabricated here." },
  };
}
