// native/adapters/text/stem-identity.js — identity by consequence, made
// morphological, shared across every case-marked or heavily-inflected
// language adapter. Extracted 2026-09-17 from greek.mjs, where the SAME
// longest-common-prefix comparison had already drifted into two separate
// places (greekBeings' own grouping loop, and beingRefOf's independent
// walk) — one implementation, not two that could disagree, per this
// project's own repeated postmortem (P22's Array.find, P24's runtime-type
// ternary, P39's deleted landCell: a new cross-cutting identity is a
// reason to widen an existing carrier, not to build a second one).
//
// WHAT THIS IS NOT. Not a lemmatizer, not a dictionary, not a referent
// index (cast.js's makeReferentIndex, which resolves NAMED surfaces
// against a discourse model, is the general-purpose organ for that job on
// analytic languages). This is narrower and cheaper: a recurring word HEAD
// is treated as the same being when its diacritic-stripped form shares a
// long enough prefix with another occurrence's — correct for languages
// whose inflection is almost entirely a SUFFIX change on a stable stem
// (Greek's case endings, Latin's declensions), and wrong for a language
// whose inflection changes the stem itself (ablaut, infixing, reduplication)
// — a caller in that situation needs a different mechanism, not a looser
// version of this one.
//
// A caller must declare its own `lang` (an ISO 639-3-style short code) when
// minting a referent id — an unaddressed, language-less ref would be a
// fold (P2: end1 == label is never a real relation) one level up, in
// whatever ledger consumes it.

/** stripDiacritics — NFD + drop combining marks. An inflected language's
 * accent commonly MOVES between forms (Greek θά-να-τος → θα-νά-του; a
 * macron-marked Latin edition's ā/ē likewise varies by case): a raw-letter
 * stem comparison would see the shifted mark as a different word. The stem
 * is the unaccented skeleton, script-agnostic by construction (̀-ͯ
 * is the whole Unicode combining-diacritical-marks block, not one script's
 * marks). */
export const stripDiacritics = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");

/** sameStem(a, b, {minLcp, minRatio}) — the one comparison: a shared prefix
 * of at least minLcp characters, covering at least minRatio of the longer
 * form. Declared floors (5 / 0.5), not re-derived per call site — the exact
 * numbers greek.mjs already measured and shipped with. */
export function sameStem(a, b, { minLcp = 5, minRatio = 0.5 } = {}) {
  const x = stripDiacritics(a);
  const y = stripDiacritics(b);
  const len = Math.min(x.length, y.length);
  let lcp = 0;
  while (lcp < len && x[lcp] === y[lcp]) lcp += 1;
  return lcp >= minLcp && lcp / Math.max(x.length, y.length) >= minRatio;
}

/**
 * groupByStem(candidates, {minOccurrences, minLcp, minRatio}) — fold a list
 * of candidate occurrences into recurring beings by stem agreement. Each
 * candidate is `{headLower, at, ...anything the caller wants carried}` —
 * this module never reads or requires any field beyond `headLower`/`at`,
 * so a language layer's own extra fields (Greek's `art`; a future Latin
 * layer's `case`) ride through in `members` untouched. A group below
 * `minOccurrences` is dropped — a being recurs, by definition; the
 * structural floor this project's own binding.js/corroboration organs
 * already hold elsewhere (>= 2), never re-derived per language.
 */
export function groupByStem(candidates, { minOccurrences = 2, minLcp, minRatio } = {}) {
  const stemOpts = { minLcp, minRatio };
  const groups = [];
  for (const c of candidates) {
    const existing = groups.find((g) => sameStem(g.stem, c.headLower, stemOpts));
    if (existing) existing.members.push(c);
    else groups.push({ stem: c.headLower, members: [c] });
  }
  return groups
    .filter((g) => g.members.length >= minOccurrences)
    .map((g) => ({ stem: g.stem, occurrences: g.members.length, members: g.members, at: g.members[0].at }))
    .sort((a, b) => b.occurrences - a.occurrences);
}

/**
 * refOf(headLower, stems, { lang, minLcp, minRatio }) — bind an occurrence
 * (a clause's subject/object head) to an already-discovered being by the
 * SAME sameStem comparison groupByStem itself used to discover it — a
 * discovery pass and a binding pass can never disagree about what counts
 * as the same stem, because both call this one function. `stems` is
 * either the array groupByStem returns, or any iterable of stem strings
 * (a Map's keys, for a caller already holding stem -> being lookups).
 * Returns `ref:<lang>:auto:<stem>` or null.
 */
export function refOf(headLower, stems, { lang, minLcp, minRatio } = {}) {
  if (!lang) throw new TypeError("stem-identity.refOf: lang is required — an unaddressed referent id is a fold, never minted silently");
  const stemOpts = { minLcp, minRatio };
  for (const entry of stems) {
    const stem = typeof entry === "string" ? entry : entry.stem;
    if (sameStem(stem, headLower, stemOpts)) return `ref:${lang}:auto:${stem}`;
  }
  return null;
}
