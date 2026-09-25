// kernel/narrative-time.js — Partee's organ, walked over a reading's own
// tensed arrangements. Medium-general, kernel-level: the caller supplies
// the arrangements in ledger order and a GIVER-NAMED tense typer; this
// file supplies nothing but the walk.
//
// WHY THIS EXISTS. temporal-reference.js (Partee: tense is anaphora) has
// sat on eval/the-fold/results/unwired-organs.json since it was written —
// the transplant run (eval/lavar/transplant-arm.mjs, 2026-09-25) found the
// reader arrow-blind partly because no time was ever individuated as a
// referent in a real read. This is the smallest wiring that closes that:
// Partee's own account of narrative progression, where each event
// sentence in the past both refers to the current reference ground AND
// advances it (Partee 1984 after Kamp/Hinrichs), applied to the ledger's
// propositions in the order the ledger holds them.
//
// THE WALK.
//   past, first in the read     establish a time (INS·Figure) at the
//                               arrangement's own address; advance the
//                               ground to it (REC·Ground, from null)
//   past, in a NEW sentence     establish the next time; advance the
//                               ground, superseding the last (kept, never
//                               erased — temporal-reference.js's own rule)
//   past, same sentence         resolve against the live ground (CON·Ground)
//   present                     the narrator's now — not anaphoric to the
//                               story's ground; counted, never resolved
//   undeclared                  the typer could not say; counted, disclosed
// Every past arrangement is resolved through resolveAnaphoricTense, so a
// bound/no_candidate verdict is the organ's, not this file's.
//
// WHAT THIS CANNOT SEE, SAID PLAINLY. A linear narrative resolves every
// past tense to the ground the previous sentence advanced to, forward or
// reversed — Partee's mechanism is indifferent to the ORDER of events
// unless a tense reaches back past the current ground (pluperfect, "had
// gone"). English's pluperfect is an auxiliary construction the reader's
// arrangements do not currently type, so this walk carries no "before
// the ground" move yet; it individuates times and binds tenses, and the
// transplant harness measures honestly that this alone does not register
// a reversed order. That measurement is the reason to type the pluperfect
// next, not a reason to fake one here.
import { establishTime, advanceReferenceGround, resolveAnaphoricTense } from "./temporal-reference.js";

export const TENSES = Object.freeze(["past", "present", "undeclared"]);

/**
 * narrativeTime(arrangements, { tenseOf, giver })
 *   arrangements  [{ id, at: [start, end], label, sentence }] in ledger order;
 *                 `sentence` is any value equal within one sentence
 *   tenseOf       label -> "past" | "present" | "undeclared" — the caller's
 *                 typer, whose giver is named beside it
 * Returns frozen { times, grounds, resolutions, counts, giver } — every
 * object inside is temporal-reference.js's own, untouched.
 */
export function narrativeTime(arrangements, { tenseOf, giver } = {}) {
  if (typeof tenseOf !== "function") throw new TypeError("narrativeTime: tenseOf is the caller's declared typer");
  if (!giver) throw new TypeError("narrativeTime: the tense typer must name its giver");
  const times = [], grounds = [], resolutions = [];
  const counts = { past: 0, present: 0, undeclared: 0, bound: 0, no_candidate: 0, adjudicated: 0 };
  let current = null, lastSentence = null, n = 0;
  for (const a of arrangements ?? []) {
    const tense = tenseOf(a.label);
    if (!TENSES.includes(tense)) throw new TypeError(`narrativeTime: tenseOf returned "${tense}" — declared tenses are ${TENSES.join(", ")}`);
    counts[tense] += 1;
    if (tense !== "past") continue;
    const at = a.at[0];
    if (current === null || a.sentence !== lastSentence) {
      n += 1;
      const t = establishTime({ id: `t${n}`, at, key: a.sentence ?? at });
      const g = advanceReferenceGround({ id: `g${n}`, at, timeId: t.id, from: current });
      times.push(Object.freeze({ ...t, arrangement: a.id }));
      grounds.push(g);
      current = g;
      lastSentence = a.sentence;
    }
    const r = resolveAnaphoricTense(at, grounds);
    resolutions.push(Object.freeze({ ...r, arrangement: a.id, at }));
    const kind = r.verdict === "bound" ? "bound" : r.verdict === "no_candidate" ? "no_candidate" : "adjudicated";
    counts[kind] += 1;
  }
  return Object.freeze({ times: Object.freeze(times), grounds: Object.freeze(grounds), resolutions: Object.freeze(resolutions), counts: Object.freeze(counts), giver });
}
