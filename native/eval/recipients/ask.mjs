// native/eval/recipients/ask.mjs — asking, as what a typed gap does when someone is there to answer. Model-free.
//
// The direction (user, 2026-09-30): "not convinced the best route isn't to just ask follow up question"; chosen, when asked which route
// was meant: the SYSTEM asks the asker — when the hand cannot resolve who a request affects, a mechanical trigger returns a clarifying
// question instead of options.
//
// WHAT THIS IS AND IS NOT. The E6 battery hands a writer the sentences the people a request names stand in, found by referent identity.
// It is silent about a person it cannot resolve: nothing is handed, nothing is said, and the writer guesses. A question is the ordinary
// move for an underdetermined task, it is not a flag and not a refusal, and the repo already treats a gap it can name as a question it can
// ask (`void-loop.js::whatWouldSettle`). This module is the smallest honest version of that for E6's records:
//   THE TRIGGER is mechanical, from the repo's own organs, and asks nothing of a model: the request shows evidence of at least one name
//   (`dialogue.js::referentsOf` — the names `ground-ladder.js::namesIn` finds, not a sentence-initial capital alone, L2) and the referent
//   index resolves NONE of them. That is a typed gap, `no_party_resolved`, carrying the names the request showed and how many resolved.
//   THE QUESTION is a template over the gap. It is generic on purpose: the names `referentsOf` reports include runs like "Cyd and Dee" and
//   "Friday", and a question that quoted them would ask about days of the week. No model writes it.
//   THE ANSWER is scripted (`TOLD`): what a knowing asker would say, in the request's own forms of the names. It is appended to the record
//   and the record is read again; the question is whether the hand then reaches the people.
//
// WHAT THE TRIGGER CANNOT SEE — measured here, not assumed (see the test, and the register):
//   * a PARTIAL hand: some named parties resolve and another does not (the request names "Ana and Zoe", the record knows Ana). A strict
//     "none resolve" gate is silent. Loosening it to "any name unresolved" fires on "Friday" and "Monday": a capitalised word is not a
//     person, and the repo holds no animacy prior. Coverage of this needs a received kind prior, not a looser rule.
//   * MISRESOLUTION: one person under two referents ("Liz" and "Elizabeth Hart", "Fern" and "Fern's" when the possessive fold is off).
//     When both forms appear in the record nothing is unresolved, so there is nothing to ask about; only an identity route fixes that.
//   * a GROUP named by a description ("the design team"): no name, so no gap the gate can name.
// So asking and identity routes are complements, not alternatives: a question is for what is UNRESOLVED; a route is for what is
// MISRESOLVED. And the question is only as good as the asker's knowledge and willingness to answer.
//
// WHAT THE ANSWER BUYS — measured, and not what was first expected. The four records where the exact-name index resolves nobody are
// the ones the trigger fires on. With the scripted answer appended and the record read again, the hand reaches all three people on the
// venue records and TWO of three on the slot records (Dana's constraint, stated twice in the pool, is not handed). The cause is the
// shared cut, not the question: the answer doubles the lines per person, six exceed the declared five, no depth below the set reproduces
// its reach, and the ceiling cut ranks a line that shares a day with another referent first. The route has one line per person and
// nothing to cut. The first assertion written for this — that the post-answer hand equals the routed hand — failed on the slot records;
// the scripted answers were authored before any run and were not reworded. No live model run of this move is planned: with the people
// reached, the writer's side is E6's `holo2`; the part that is new here is only whether the question is asked and whether the hand follows.

import { referentsOf } from "../../the-fold/dialogue.js";

/** A typed gap, or null. `read` is `holograph.read(record)` — `{ index, … }`; the request is the task's own. */
export function gapOf(task, read) {
  const r = referentsOf(task.request, read.index);
  if (!r.names.length) return null;                 // no name shown: nothing the gate can name (a group, a control)
  if (r.resolved.length) return null;               // at least one party is known: a strict gate is silent (the partial hand is invisible)
  return { type: "no_party_resolved", names: r.names, resolved: r.resolved.length };
}

/** The question a gap asks. A template; nothing from the record and no name from the request is quoted. */
export const QUESTION = "Before I choose: who will this affect, and is there anything they can't have or can't do?";
export function questionFor(gap) {
  if (!gap) return null;
  if (gap.type === "no_party_resolved") return QUESTION;
  throw new TypeError(`ask.mjs: no question is written for a gap of type ${gap.type}`);
}

/**
 * What a knowing asker says, in the request's own forms of the names, for the tasks whose record states a recipient's situation only under
 * another form of the name. Authored with the tasks, before any run; one line per recipient.
 */
const TOLD_VENUE = Object.freeze(["Fern uses a wheelchair and needs a step-free entrance.", "Gabe is sensitive to noise and needs a quiet space.", "Hugo can walk no more than ten minutes from the station."]);
const TOLD_SLOT = Object.freeze(["Dana cannot start before ten on any day.", "Emil is unavailable all day Wednesday.", "Fritz has a clinic appointment every Thursday morning."]);
// The plain twins have the same record and the same people.
export const TOLD = Object.freeze({ "venue-poss": TOLD_VENUE, "venue-poss-q": TOLD_VENUE, "slot-poss": TOLD_SLOT, "slot-poss-q": TOLD_SLOT });

/** The record after the asker has answered: the answer is appended, as lines, and nothing else is changed. */
export const recordAfterAnswer = (task, told = TOLD[task.id] ?? []) => [...task.record, ...told];

/**
 * askThenHand(task, holograph) → { gap, question, told, hand } — the whole move for one task: look for the gap; if there is one, ask, take
 * the scripted answer, read the record again and hand. No gap: no question, and the hand is the silent one.
 */
export function askThenHand(task, holograph, told = TOLD[task.id] ?? []) {
  const read = holograph.read(task.record);
  const gap = gapOf(task, read);
  if (!gap) return { gap: null, question: null, told: [], hand: holograph.hand(task) };
  return { gap, question: questionFor(gap), told, hand: holograph.hand({ ...task, record: recordAfterAnswer(task, told) }) };
}
