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
// SIGNIFICANCE (2026-09-26, later revision): the prior claim here -- "no
// significance-measurement module exists anywhere in this repo" -- was
// WRONG, found and corrected the same session. Real modules exist:
// kernel/bayes-surprise.js (Bayesian surprisal of a slot/value admission
// against a holograph's accumulated prior) and kernel/consequential-
// surprise.js (partitions that surprise into load-bearing vs. local, against
// a real cascade-reach null -- exactly this vision's own "measured against a
// real null, never asserted" language). Both have real production callers
// (the-fold/expertise.js, form-prior.js, paradigm.js, learn-pass.js;
// kernel/settling.js, contextuality.js; organs/archon-compendium.js,
// capacities.js; docs/surprise-organs.js).
//
// Wired here: bayes-surprise.js's predict(holo, slot, value) only -- checked
// this revision that admit() MUTATES the holograph (holo.admitted++,
// holo.slots updated) while predict() is read-only, so predict is the one
// that keeps foldAt's own PURE contract intact. The caller supplies a
// holograph (bayes-surprise.js's own createHolograph output); foldAt derives
// slot/value pairs from the claims at this cursor's `here` (each claim's
// rel, polarity, and each role filler, using gfp-claim.js's own real field
// names) and reports the summed surprisal in bits -- a real number, not
// fabricated, but never committed back into the holograph (foldAt only asks
// "how surprising would this be", never "and now count it").
//
// NOT wired: consequential-surprise.js's load-bearing/local partition. It
// additionally needs a dependents `index` and a caller-declared `seedsOf`
// function (checked this revision via docs/surprise-organs.js's own real
// usage) relating a slot/value to the ids reachable through cascade.js's
// reach semantics -- no existing caller's seedsOf generalizes to holon-
// addressed claims, and designing one is original work this revision does
// not attempt. Named as the next sub-step, not guessed at.
//
// SIBLINGS (2026-09-26, later revision): named after live-testing foldAt
// against claimsFromFeat's own real output (arrange.js) found ancestors and
// descendants BOTH empty for every real, point-level cursor tried -- real
// claims from real material are true siblings of each other under a shared
// part, not ancestor/descendant, and foldAt had no category for that until
// now. `siblings` is purely structural (same parent holon, one level up,
// via gfp-claim.js's own segmentsOf/holon -- no new addressing concept), so
// it needed no external contract to verify against the way atmosphere or
// significance did.
import { holon, contains, ancestry, segmentsOf } from "../kernel/gfp-claim.js";
import { interpretiveAtmosphereFactorField } from "../kernel/atmosphere-math.js";
import { predict } from "../kernel/bayes-surprise.js";

export const FOLD_AT_SCHEMA = "EOFoldAt@1";

/** GFP claim -> bayes-surprise.js slot/value facts. Each claim contributes
 *  its relation, polarity, and each of its role fillers as its own slot,
 *  keyed by the claim's own position so two claims at the same cursor never
 *  collide on the same slot name. */
function slotsFromClaims(claims) {
  const slots = [];
  claims.forEach((c, i) => {
    if (!c || typeof c.rel !== "string") return;
    slots.push([`${i}:rel`, c.rel]);
    if (c.polarity) slots.push([`${i}:polarity`, c.polarity]);
    for (const [role, value] of Object.entries(c.roles ?? {})) slots.push([`${i}:role:${role}`, value]);
  });
  return slots;
}

/** The parent of a holon: itself with its last segment dropped. "/" (no
 *  segments) has no parent -- returns null, not "/" (the root is not its
 *  own parent). */
function parentOf(h) {
  const segs = segmentsOf(h);
  if (!segs.length) return null;
  return holon(segs.slice(0, -1).join("/"));
}

/**
 * foldAt(address, claims, { obligations, sequence, holo }) -> {
 *   schema, address,
 *   here: claims whose ground is exactly this address,
 *   ancestors: claims whose ground CONTAINS this address, ordered outermost-first,
 *   descendants: claims whose ground is CONTAINED BY this address,
 *   siblings: claims that share this address's own parent (one level up),
 *     excluding anything already counted in here/ancestors/descendants,
 *   atmosphere: real interpretiveAtmosphereFactorField result when
 *     `obligations` is supplied and non-empty, else a typed gap,
 *   significance: real bayes-surprise.js predict() result over the `here`
 *     claims' slot/value facts when `holo` is supplied, else a typed gap,
 *   paradigm: a typed gap, not a fabricated value,
 * }
 *
 * PURE: no I/O, no model, no default corpus, and no mutation of anything
 * the caller passes in (predict() is read-only; a supplied holo is never
 * admitted into). The caller supplies `claims` and, optionally,
 * `obligations`/`holo` -- this never reads a session's own state or a file
 * on its own.
 */
export function foldAt(address, claims = [], { obligations = [], sequence = null, holo = null } = {}) {
  const here = holon(address);
  const hereParent = parentOf(here);
  const atHere = [], ancestorsOf = [], descendantsOf = [], siblingsOf = [];

  for (const claim of claims) {
    if (!claim || typeof claim.ground !== "string") continue;
    const g = holon(claim.ground);
    if (g === here) { atHere.push(claim); continue; }
    if (contains(g, here)) { ancestorsOf.push(claim); continue; }
    if (contains(here, g)) { descendantsOf.push(claim); continue; }
    if (hereParent !== null && parentOf(g) === hereParent) { siblingsOf.push(claim); continue; }
    // no relation to this cursor at all: not part of this cursor's fold
  }

  // outermost ("/") first, closest-to-here last -- the same order a reader
  // would want context in: broad frame first, narrowing toward the point.
  const ancestryChain = ancestry(here);
  ancestorsOf.sort((a, b) => ancestryChain.indexOf(holon(a.ground)) - ancestryChain.indexOf(holon(b.ground)));

  const atmosphere = obligations.length
    ? { wired: true, field: interpretiveAtmosphereFactorField(obligations, { sequence }), basis: "kernel/atmosphere-math.js's interpretiveAtmosphereFactorField, called with the caller's own supplied obligations -- the same call shape verified this revision against two real production callers (kernel/emergent-terrain.js, kernel/theory-of-mind.js)." }
    : { wired: true, field: null, reason: "no obligations were supplied for this cursor -- the wiring is real, there is simply nothing to compute an atmosphere from here." };

  let significance;
  if (holo) {
    const slots = slotsFromClaims(atHere);
    const perSlot = slots.map(([slot, value]) => ({ slot, value, ...predict(holo, slot, value) }));
    const totalBits = perSlot.reduce((s, x) => s + x.bits, 0);
    significance = {
      wired: true,
      totalBits,
      perSlot,
      basis: `kernel/bayes-surprise.js's predict(), read-only, over ${slots.length} slot(s) derived from the ${atHere.length} claim(s) at this cursor -- the prior's surprisal if these facts were admitted, never actually admitted into the supplied holograph.`,
    };
  } else {
    significance = { wired: false, reason: "kernel/bayes-surprise.js's predict() is real and usable (a holograph from createHolograph() was not supplied to this call) -- the heavier, load-bearing kernel/consequential-surprise.js layer additionally needs a dependents index and a seedsOf function this revision did not design for holon-addressed claims; see this file's own header." };
  }

  return {
    schema: FOLD_AT_SCHEMA,
    address: here,
    here: atHere,
    ancestors: ancestorsOf,
    descendants: descendantsOf,
    siblings: siblingsOf,
    atmosphere,
    paradigm: { wired: false, reason: "the-fold/paradigm.js's evaluateParadigm is real but has ZERO real production callers anywhere in this repo (only its own test file calls it; every real caller of paradigm.js instead calls learnParadigm/learnParadigmEmergent, which BUILD a paradigm, never evaluate one) -- there is no live contract to verify a candidate-shape against, so wiring this now would be a guess, not a verification. Left unwired until a real caller of evaluateParadigm exists to check against." },
    significance,
  };
}
