// the-fold/claim-dependencies.js -- the missing piece for wiring kernel/
// consequential-surprise.js's load-bearing/local partition into holon-
// addressed GFP claims. consequentialSurprise needs a dependents `index`
// (kernel/cascade.js's dependentsIndex) and a caller-declared `seedsOf`
// mapping a slot/value to seed ids reachable through it -- checked earlier
// this session via docs/surprise-organs.js's own real usage, and named as a
// gap because no existing seedsOf generalizes to claims. This builds one,
// on its own, tested standalone -- not yet wired into fold-at.js or the CLI,
// which is the disclosed next step, not attempted here.
//
// THE DEPENDENCY RELATION: claim B depends on claim A when they share a role
// filler (the same ARG0 or ARG1 value) -- a real, mechanical proxy for
// coreference/shared-entity connection, the same kind of connection this
// whole project already treats as meaningful (referents.js's own resolved
// beings, takesUp's own referent-overlap check in finish.js). Not invented
// for this file: it is the same "do these two statements share a subject"
// test used elsewhere, applied here to claims instead of raw text.
import { dependentsIndex } from "../kernel/cascade.js";

/** Every role filler a claim carries, as values (not keyed by role -- ARG0
 *  and ARG1 both count as "this claim mentions X"). */
function fillersOf(claim) {
  return Object.values(claim?.roles ?? {}).filter(Boolean);
}

/**
 * claimDependencyIndex(claims, idOf) -> Map(fillerValue -> Set(claim ids))
 *
 * The dependents index kernel/consequential-surprise.js's own `index`
 * parameter expects: for each role-filler VALUE (the "dependency"), which
 * claim ids mention it. `idOf` defaults to claim.id, falling back to the
 * claim's own ground when no id was declared (gfpClaim's id is optional).
 */
export function claimDependencyIndex(claims, idOf = (c) => c.id ?? c.ground) {
  return dependentsIndex(claims, fillersOf, idOf);
}

/**
 * seedsOfClaimFiller(slot, value) -> the value itself, as a one-element seed
 * list, when the slot is a role slot (this file's own naming convention,
 * "N:role:ARGn", matches fold-at.js's slotsFromClaims exactly -- checked by
 * reading its source before writing this). A non-role slot (rel, polarity)
 * has no filler-sharing meaning and seeds nothing -- cascade() only ever
 * walks from a real shared entity, never a relation label or a polarity
 * sign, which are not "things other claims can mention."
 */
export function seedsOfClaimFiller(slot, value) {
  return /:role:/.test(String(slot)) ? [value] : [];
}
