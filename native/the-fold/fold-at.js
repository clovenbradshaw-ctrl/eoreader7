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
// ATMOSPHERE (2026-09-26 revision): wired for real. kernel/emergent-terrain.js
// (atmosphereProjection) and kernel/theory-of-mind.js both call
// interpretiveAtmosphereFactorField(obligations, {sequence}) the same way --
// two real, independent production call sites agreeing on the same shape
// (an array of obligation objects: {id, grounds, alternatives, consequences,
// persistence, openedAt, constraint}), checked before writing this revision
// rather than guessed. When the caller supplies `obligations`, foldAt calls
// the real function directly (not the private atmosphereProjection wrapper,
// which also stamps terrain-specific schema/id fields foldAt has no use for)
// and returns its real field. When none are supplied, the gap says exactly
// that -- no obligations for this cursor -- not "unwired."
//
// PARADIGM: still a typed gap, but the reason changed after checking. This
// session first assumed evaluateParadigm just needed "a live caller to
// verify against" the way atmosphere did. Checked this revision: grep across
// native/the-fold/ for evaluateParadigm( found ZERO real call sites outside
// its own test file -- only learnParadigm/learnParadigmEmergent (which BUILD
// a paradigm) have real callers; nothing in this repo actually evaluates a
// candidate against one yet. There is no live contract to verify against,
// only the function's own definition and tests -- wiring foldAt to a
// candidate-shape read from those alone, with no second real caller to cross-
// check against, would still be a guess dressed as a verification. Left
// unwired, honestly, with the corrected reason.
//
// significance has no implementation ANYWHERE in this repo (checked again
// this revision) -- there is no number to fabricate, so none is returned.
import { holon, contains, ancestry } from "../kernel/gfp-claim.js";
import { interpretiveAtmosphereFactorField } from "../kernel/atmosphere-math.js";

export const FOLD_AT_SCHEMA = "EOFoldAt@1";

/**
 * foldAt(address, claims, { obligations, sequence }) -> {
 *   schema, address,
 *   here: claims whose ground is exactly this address,
 *   ancestors: claims whose ground CONTAINS this address, ordered outermost-first,
 *   descendants: claims whose ground is CONTAINED BY this address,
 *   atmosphere: real interpretiveAtmosphereFactorField result when
 *     `obligations` is supplied and non-empty, else a typed gap,
 *   paradigm, significance: typed gaps, not fabricated values,
 * }
 *
 * PURE: no I/O, no model, no default corpus. The caller supplies `claims`
 * and, optionally, `obligations` -- this never reads a session's own state
 * or a file on its own.
 */
export function foldAt(address, claims = [], { obligations = [], sequence = null } = {}) {
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

  const atmosphere = obligations.length
    ? { wired: true, field: interpretiveAtmosphereFactorField(obligations, { sequence }), basis: "kernel/atmosphere-math.js's interpretiveAtmosphereFactorField, called with the caller's own supplied obligations -- the same call shape verified this revision against two real production callers (kernel/emergent-terrain.js, kernel/theory-of-mind.js)." }
    : { wired: true, field: null, reason: "no obligations were supplied for this cursor -- the wiring is real, there is simply nothing to compute an atmosphere from here." };

  return {
    schema: FOLD_AT_SCHEMA,
    address: here,
    here: atHere,
    ancestors: ancestorsOf,
    descendants: descendantsOf,
    atmosphere,
    paradigm: { wired: false, reason: "the-fold/paradigm.js's evaluateParadigm is real but has ZERO real production callers anywhere in this repo (only its own test file calls it; every real caller of paradigm.js instead calls learnParadigm/learnParadigmEmergent, which BUILD a paradigm, never evaluate one) -- there is no live contract to verify a candidate-shape against, so wiring this now would be a guess, not a verification. Left unwired until a real caller of evaluateParadigm exists to check against." },
    significance: { wired: false, reason: "no significance-measurement module exists anywhere in this repo (checked before writing this file) -- there is no real number to return, so none is fabricated here." },
  };
}
