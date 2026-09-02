// fold-gate.js — kind-standing's first live caller (Tier 4 #10): the fold
// gate the cast never had.
//
// THE DEFECT THIS CLOSES (named in NEXT-PASSES since P79 landed): "the
// live cast still folds Castle Dracula into Count Dracula; foldPermitted
// exists and nothing calls it." The engine's referent discovery merges on
// shared name-tokens — correct for Anna/Anna Pávlovna, wrong for
// Castle/Count Dracula, and P79 built the measured gate (company-kind
// membership under the population null) that can tell them apart. It has
// sat unconsulted because no seam handed it (a) a proposed merge, (b) the
// sentences, and (c) a DECLARED kind to test membership against. This is
// that seam, and nothing more: the gate's statistics stay kind-standing's,
// the merge bookkeeping stays the engine's, and the KIND stays the
// caller's own declaration (foldPermitted's contract — membership needs
// declared members; deriving the kind from nothing is P79's own refuted
// basin null).
//
// REVIEW, NOT PREVENTION, by design: the engine's discoverReferents runs
// unmodified and reports every merge it made (`merges: {kept, folded,
// witness}`); this module re-examines each REPORTED merge against the
// declared kind and returns the vetoed ones with their evidence. A caller
// (cast display, the crown, a referent query) treats a vetoed merge's two
// halves as distinct. Undoing the merge inside the engine's own event
// stream is deliberately NOT attempted here — rewriting another organ's
// referent ids from outside is how two bookkeepings drift; the veto is a
// STANDING a consumer consults, the same posture kind-standing's own
// header takes ("a gate must treat unknown as no standing, never as
// different kind").
//
// PURE; organs injected (contextVectors/foldPermitted from kind-standing,
// splitSentences from the engine) — the cast.js posture.

import { contextVectors, foldPermitted } from "../eoreader7/native/organs/index.js";

export const REFUSALS = Object.freeze({
  undeclared: "the kind is DECLARED — members with a named giver, alpha valued (P4/P79); a gate that derives its own kind from nothing re-runs the refuted basin null",
});

/**
 * reviewMerges(passages, merges, { splitSentences, kind, alpha })
 *
 * `kind` — { members: [surface...], giver: string } — the declared kind
 *   membership is tested against (P79's own contract: the population is
 *   the null, so members must be DECLARED, never induced here).
 *
 * Returns { permitted, vetoed, unknown } — every merge lands in exactly
 * one, each carrying kind-standing's own verdicts as evidence. `unknown`
 * (either side has no profile) PERMITS per foldPermitted's own rule — a
 * thin profile is a fact about the reader, not the referents — but is
 * reported apart so a consumer can see how much the gate actually
 * measured.
 */
export function reviewMerges(passages, merges, { splitSentences, kind, alpha, population = [] } = {}) {
  if (typeof splitSentences !== "function") throw new TypeError("reviewMerges: reviewMerges: splitSentences is injected — required");
  if (!kind || !Array.isArray(kind.members) || !kind.members.length || !kind.giver || !Number.isFinite(alpha))
    throw new TypeError("reviewMerges: " + REFUSALS.undeclared);
  // `population` — the material's OWN other referents (the cast's faces),
  // because kind-standing's null IS the population: "is X a member of kind
  // K" is answered by whether X sits closer to K's members than the rest
  // of the material does (P79, verbatim — nothing redealt). A pair alone
  // has no rest-of-material, which the first live run refused honestly as
  // `no_population`; the caller hands the cast in, and the cast is
  // MEASURED from the material, not declared, so this costs no giver.

  const text = (passages ?? []).map((p) => p?.text ?? "").join("\n\n");
  const sentences = splitSentences(text).map((s) => ({ text: s.text ?? s }));
  const permitted = [], vetoed = [], unknown = [];
  for (const m of merges ?? []) {
    const a = String(m.witness ?? m.kept ?? "");
    const b = String(m.folded ?? "");
    if (!a || !b) { unknown.push({ merge: m, reason: "merge record carries no surfaces" }); continue; }
    // vectors are built over the two surfaces PLUS the declared members —
    // the members ARE the population the null needs (P79: nothing redealt)
    const vecs = contextVectors(sentences, [...new Set([a, b, ...kind.members, ...population])]);
    const verdict = foldPermitted(a, b, kind.members, vecs, { alpha });
    const entry = { merge: m, a, b, verdict, kind: kind.giver };
    if (verdict.reason === "no_standing") unknown.push(entry);
    else if (verdict.permitted) permitted.push(entry);
    else vetoed.push(entry);
  }
  return { permitted, vetoed, unknown, kind: { giver: kind.giver, members: kind.members.length }, alpha };
}
