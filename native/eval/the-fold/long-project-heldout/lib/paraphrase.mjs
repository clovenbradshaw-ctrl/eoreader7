// lib/paraphrase.mjs — a small, hand-written, DISCLOSED substitution table
// used ONLY to reword this benchmark's zero-ground-truth distractor pool
// (lib/distractors.mjs), never the planted facts (lib/plants.mjs, which keep
// their own hand-written paraphrase pool, per the same ground-truth
// discipline long-project's own PREREGISTRATION.md documents). This is
// mechanical code, not a model: a fixed lookup table of hand-written
// alternative phrasings, applied deterministically by generate-corpus.mjs
// the same way every other seeded choice in this corpus is made (which
// session a plant lands on, which attendees appear, ...).
//
// WHY THIS EXISTS (same rationale long-project's own paraphrase.mjs
// documents, "the dedup exploit"): with a small distractor pool cycled
// through hundreds of fill slots, `sort session-*.md-bullets | uniq -c`
// could perfectly separate a corpus into "frequency 1 == planted" and
// "frequency >1 == filler" if every reused distractor rendered as the exact
// same string every time. Rewording each reused distractor breaks exact-
// string frequency as a planted/filler signal: the SAME routine event (id)
// now renders as one of several different sentences, so raw-text frequency
// no longer tracks planted-vs-distractor status. See verify-ground-truth.mjs's
// dedup-frequency check, which re-runs this exact attack after generation
// and fails the build if it still cleanly separates.
//
// Each rule matches a common verb/phrase (word-boundary, case-sensitive so
// the capitalized-at-start-of-sentence form is covered by its own rule) and
// offers 3 hand-written alternatives (index 0 is always the ORIGINAL word,
// so an item with zero matching rules is simply left unchanged). paraphrase
// (text, rng) draws an INDEPENDENT seeded choice among the 3 alternatives
// for EVERY rule that matches — a sentence with k matching rules can render
// as any of 3^k distinct strings, not just one of a fixed short list. A
// distractor with zero matching rules is given an explicit manual `variants`
// override in lib/distractors.mjs instead (disclosed there) rather than
// silently repeating verbatim — hasAnyRule() below is what lib/
// distractors.mjs's own build step uses to find those.

const RULES = [
  [/\bBumped\b/, ["Bumped", "Nudged up", "Raised"]],
  [/\bbumped\b/, ["bumped", "nudged up", "raised"]],
  [/\bFixed\b/, ["Fixed", "Resolved", "Patched"]],
  [/\bfixed\b/, ["fixed", "resolved", "patched"]],
  [/\bFound\b/, ["Found", "Noticed", "Spotted"]],
  [/\bfound\b/, ["found", "noticed", "spotted"]],
  [/\btightened\b/, ["tightened", "dialed in", "clamped down on"]],
  [/\bwalked through\b/, ["walked through", "went over", "stepped through"]],
  [/\bcleaned up\b/, ["cleaned up", "tidied up", "cleared out"]],
  [/\bDiscussed\b/, ["Discussed", "Talked through", "Went over"]],
  [/\bdiscussed\b/, ["discussed", "talked through", "went over"]],
  [/\bDeferred\b/, ["Deferred", "Tabled", "Postponed"]],
  [/\bdeferred\b/, ["deferred", "tabled", "postponed"]],
  [/\bqueued\b/, ["queued", "lined up", "put on the list"]],
  [/\bproposed\b/, ["proposed", "floated", "suggested"]],
  [/\bmerged\b/, ["merged", "landed", "shipped"]],
  [/\bcaught\b/, ["caught", "spotted", "flagged"]],
  [/\bpicked up\b/, ["picked up", "took on", "grabbed"]],
  [/\bfloated\b/, ["floated", "raised", "suggested"]],
  [/\bpatched\b/, ["patched", "fixed", "touched up"]],
  [/\brotated\b/, ["rotated", "swapped out", "replaced"]],
  [/\bupdated\b/, ["updated", "refreshed", "revised"]],
  [/\breviewed\b/, ["reviewed", "went through", "looked over"]],
  [/\bdebated\b/, ["debated", "went back and forth on", "argued over"]],
  [/\btabled\b/, ["tabled", "deferred", "postponed"]],
  [/\bnothing broke\b/, ["nothing broke", "no issues came up", "all clear afterward"]],
  [/\bclean\b/, ["clean", "tidy", "in good shape"]],
  [/\bno findings\b/, ["no findings", "nothing turned up", "came back clear"]],
  [/\bno gaps\b/, ["no gaps", "fully covered", "nothing missing"]],
  [/\bdropped\b/, ["dropped", "removed", "cut"]],
  [/\bshipped\b/, ["shipped", "landed", "merged"]],
  [/\blanded\b/, ["landed", "shipped", "merged"]],
];

/** Applies every matching rule, each independently drawing one of its 3
 *  alternatives from the given seeded rng (a mulberry32 instance — see
 *  lib/prng.mjs). Deterministic for a given rng state, never Math.random. */
export function paraphrase(text, rng, randInt) {
  let out = text;
  for (const [re, alts] of RULES) {
    if (re.test(out)) out = out.replace(re, alts[randInt(rng, alts.length)]);
  }
  return out;
}

/** True if at least one rule matches — i.e. paraphrase() can produce a genuinely different string. */
export function hasAnyRule(text) {
  return RULES.some(([re]) => re.test(text));
}

export const RULE_COUNT = RULES.length;
