// The live alternatives indexed by first token (2026-09-07): the same attacks,
// in the same order, from a candidate set that is looked up, not walked.
import test from "node:test";
import assert from "node:assert/strict";
import { textIdentityEvidence } from "../adapters/text/identity-evidence.js";
import { identityAlternative } from "../kernel/identity.js";

const alt = (l, r, standing = "live_hypothesis") => identityAlternative({ left: l, right: r, standing });
const ALTS = Object.freeze([alt("the hooded courier", "Rowan"), alt("the count", "Pierre"), alt("Prince Andrew", "Bolkonski"), alt("the old prince", "Nicholas", "distinct"), alt("Anna", "Pavlovna")]);

test("separated co-presentation of both sides of a LIVE alternative attacks it; a distinct one is never a candidate; adjacency (apposition) is not an attack", () => {
  // identityAlternative sorts its two forms, so left/right below are the sorted, normalised ones.
  const out = textIdentityEvidence("Rowan spoke first, and much later the hooded courier answered; Pierre sat down, and only after a long silence did the count reply; the old prince met Nicholas at the door.", { alternatives: ALTS, witness: "w:1" });
  assert.deepEqual(out.attacks.map((a) => [a.left, a.right]), [["rowan", "the hooded courier"], ["pierre", "the count"]], "attacks come in the alternatives' own order; the distinct alternative is skipped");
  const near = textIdentityEvidence("the hooded courier Rowan came in.", { alternatives: ALTS, witness: "w:2" });
  assert.deepEqual(near.attacks, [], "adjacent: not separated");
});

test("an alternative whose sides both begin with tokens absent from the sentence is not a candidate — and one side present is enough to be checked", () => {
  const none = textIdentityEvidence("Nothing here names anyone at all.", { alternatives: ALTS, witness: "w:3" });
  assert.deepEqual(none.attacks, []);
  const half = textIdentityEvidence("Pierre came alone, and later Pierre left.", { alternatives: ALTS, witness: "w:4" });
  assert.deepEqual(half.attacks, [], "one side present, the other absent: checked, and no attack");
});

test("the index is keyed on the alternatives ARRAY: the same content in a new array is rebuilt, and the answer is identical", () => {
  const text = "Anna entered; long after the speeches Pavlovna rose and left the room.";
  const a = textIdentityEvidence(text, { alternatives: ALTS, witness: "w" });
  const b = textIdentityEvidence(text, { alternatives: Object.freeze([...ALTS]), witness: "w" });
  assert.deepEqual(a, b);
  assert.equal(a.attacks.length, 1);
});
