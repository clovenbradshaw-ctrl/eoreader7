// nominal-beings.js — the omnilingual being tier, ported to English.
//
// THE GAP THIS CLOSES. `surfaces.js::extractSurfaces` finds a candidate
// referent by ONE signal: whether a token's capitalized share is
// significantly above a fair-coin null. `CAP_TOKEN = /^[\p{Lu}].../u`
// (surfaces.js) is the SOLE admission gate — `\p{Lu}` (Unicode uppercase
// letter) never matches Hebrew, Arabic, or CJK (no case distinction at
// all: zero candidates, categorically, before any significance test
// runs), and a lowercase English name ("loom", "cinder" — this repo's own
// long-project corpus, native/eval/the-fold/long-project/lib/people.mjs)
// never enters the pool either. Measured this session: a scratchpad
// "company/before=^" test failed its own scrambled-order control (P79's
// own null), and a "stands without a determiner" heuristic found the
// lowercase services but its precision fell 90%→63%→24% as the corpus
// grew — a positional heuristic, not a received one, and it degrades.
//
// SEARCH FIRST. `eval/lavar/sanskrit.mjs::sanskritBeings` already solves
// exactly this admission problem for Sanskrit, which has no article and
// no case (in the capitalization sense) at all: a being is a recurring
// NOMINAL-typed stem, typed by a RECEIVED POS prior (never a positional
// heuristic, never capitalization), grouped by shared prefix so
// inflected surface variants ("loom", "loom's") fold to one being. This
// file is that same mechanism, English's POS prior in place of Sanskrit's
// (already built, priors-data/pos-prior-eng.json — no treebank pull
// needed), and `heard-surfaces.js`'s own already-established NAMING_CLASSES
// = {NOUN, PROPN} in place of Sanskrit's broader clause-reading NOMINAL
// set (which also admits ADJ/PRON/DET/NUM — right for bounding a clause's
// subject/object phrase, wrong for "is this recurring word a being").
//
// WHAT IT DOES NOT DO. Like `sanskritBeings`, this is a CANDIDATE
// generator, not a merge/coreference decision — `discoverReferents`'
// question ("is this the same referent as that one") is not asked here;
// the stem-prefix grouping is this tier's OWN coarse identity (proven on
// Sanskrit's real inflection, reused rather than a new heuristic — never
// claimed as referent-fold's finer, address-containment identity). And
// it needs a received POS prior: absent one, `discoverNominalBeings`
// returns [] rather than guessing (the same "absent a prior, nothing is
// admitted" posture `heard-surfaces.js::heardSurfaces` already holds).
//
// PURE. The prior and its floor are the caller's; nothing here reads a
// file or knows a language's name.

import { classifyWord, dominantClass } from "./wordclass.js";
import { GRAMMAR_MIN_SHARE } from "./grain-typing.js";

// A being NAMES something; NOUN/PROPN only — heard-surfaces.js's own
// NAMING_CLASSES, reused rather than re-derived, and narrower than
// sanskritBeings' clause-bounding NOMINAL set on purpose (see header).
export const NAMING_CLASSES = Object.freeze(new Set(["NOUN", "PROPN"]));

// Letters, marks (combining diacritics) and digits, apostrophe-tolerant —
// the same class sanskritBeings' own TOKEN regex uses, so a script this
// tier has never been tested on fails by returning nothing, not by
// mis-tokenizing it.
const TOKEN = /[\p{L}\p{M}\p{N}''’]+/gu;

const tokenize = (text) => {
  const out = [];
  for (const m of String(text ?? "").matchAll(TOKEN)) {
    out.push({ w: m[0].toLowerCase(), raw: m[0], start: m.index, end: m.index + m[0].length });
  }
  return out;
};

/**
 * nominalClass(form, prior, {minShare}) — the received prior's dominant
 * class for a form, gated at the caller's declared share (never a bare
 * plurality vote — `dominantClass`'s own refusal: a close call like
 * "that" (SCONJ 994 vs PRON 851) is not settled by count alone). Returns
 * null for an unattested form or one that never clears the floor —
 * absence is a gap, never a guess.
 */
export function nominalClass(form, prior, { minShare = GRAMMAR_MIN_SHARE } = {}) {
  const d = dominantClass(classifyWord(form, { posPrior: prior }), { minShare });
  return d?.upos ?? null;
}

/**
 * discoverNominalBeings(text, prior, {minOccurrences, minStem, minShare}) —
 * THE BEING TIER. A being is a recurring NOUN/PROPN-typed stem: a token
 * whose received-prior dominant class is NAMING_CLASSES, recurring
 * `>= minOccurrences` times, grouped by shared prefix (`>= minStem`
 * characters, and `>= half` the longer surface's length — sanskritBeings'
 * own proven grouping, reused whole so "loom" and "loom's" fold to one
 * being without a language-specific stemmer). No capitalization, no
 * article, no sentence position — the prior's own class is the only
 * admission signal.
 *
 * Returns `[{stem, surfaces, occurrences, at}]`, most-occurring first —
 * deliberately the shape `sanskritBeings`/`greekBeings` already return,
 * so a downstream consumer (a referent index's admission gate) can
 * accept whichever language's tier fired without knowing which one did.
 */
export function discoverNominalBeings(text, prior, { minOccurrences = 2, minStem = 4, minShare = GRAMMAR_MIN_SHARE } = {}) {
  if (!prior?.forms) return [];
  const toks = tokenize(text);
  const heads = [];
  for (const t of toks) {
    const cls = nominalClass(t.w, prior, { minShare });
    if (!cls || !NAMING_CLASSES.has(cls)) continue;
    heads.push({ head: t.raw, headLower: t.w, at: [t.start, t.end] });
  }
  const stems = new Map();
  const assign = (ph) => {
    const b = ph.headLower;
    for (const [stem, grp] of stems) {
      const len = Math.min(stem.length, b.length);
      let lcp = 0;
      while (lcp < len && stem[lcp] === b[lcp]) lcp += 1;
      if (lcp >= minStem && lcp / Math.max(stem.length, b.length) >= 0.5) { grp.push(ph); return; }
    }
    stems.set(b, [ph]);
  };
  for (const h of heads) assign(h);
  const out = [];
  for (const [stem, grp] of stems) {
    if (grp.length < minOccurrences) continue;
    out.push({ stem, surfaces: [...new Set(grp.map((g) => g.head))], occurrences: grp.length, at: grp[0].at });
  }
  return out.sort((a, b) => b.occurrences - a.occurrences);
}

/**
 * beingRefOf(headLower, beingsByStem) — bind an occurrence to a tier-1
 * being by the same stem-prefix rule discoverNominalBeings groups with.
 * sanskritBeings'/greekBeings' own beingRefOf, one instrument reused
 * rather than a second copy of the rule.
 */
export function beingRefOf(headLower, beingsByStem) {
  const b = String(headLower ?? "").toLowerCase();
  for (const [stem] of beingsByStem) {
    const len = Math.min(stem.length, b.length);
    let lcp = 0;
    while (lcp < len && stem[lcp] === b[lcp]) lcp += 1;
    if (lcp >= 4 && lcp / Math.max(stem.length, b.length) >= 0.5) return stem;
  }
  return null;
}
