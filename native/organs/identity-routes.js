// native/organs/identity-routes.js — the routes by which two written forms are licensed to be ONE referent, each one a declared
// prior for a declared language and never a default.
//
// WHY A MODULE. cast.js::makeReferentIndex already takes the seams a route needs (`nameFold`, `surfaceFold`, `nameVariant`). What it
// must not do is decide, for a material, what its language marks: a mark that means "the same thing, inflected" in one script is an
// elision, a quotation or nothing in another. So a route is built HERE, from a language the caller declares, and handed to the index
// as a function; the index never learns which language it is folding for.
//
// Handles: Chomsky and Sullivan (organs/archon-compendium.js; solon.js lists the first as live).
//   Chomsky — the arrangement is universal, the language's own marks are DECLARED. An enclitic on the last word of a name phrase
//   ("Elizabeth Hart's") is a fact about English; `language` is therefore required, and a missing or unregistered language is a typed
//   gap with the identity fold, never a silent attempt in English (the same terms pronouns.js::PRONOUN_PRIORS holds for pronouns, S39).
//   Sullivan — the connection between a written sign and the thing is earned per language and re-measured per corpus, not assumed to
//   transfer. The prior names what measured it (`measured`), and eval/the-fold/possessive-audit.mjs re-runs that measurement on any
//   corpus the caller points it at; a registry entry without a measurement behind it would be a default wearing a declaration.
//
// WHAT THE ENGINE ALREADY DOES, AND WHERE THIS STANDS. surfaces.js strips the apostrophe clitic from every token of a CANDIDATE at
// discovery ("Locke's" and "Locke" are one name written twice), so the cast is built with that identity. The query side was not: a
// name asked about as "Anna's" was compared to an established "Anna" as written, and the reverse, so a person the material names only
// with the mark was unreachable by the bare name (eval/recipients, E6) and a possessive in a question reached nothing (measured on
// real prose, eval/the-fold/results/possessive-audit-RESULTS.md holds the counts).
// The same law CLAUDE.md records for retrieval applies here: every organ that compares text to text shares the fold, or a found
// passage fails the very check that should confirm it.
//
// LAST TOKEN ONLY. The mark's scope is the end of a phrase (a phrasal clitic: "the King of England's hat"), so the fold reads the
// position, which `nameFold` cannot: surfaces.js::tokensOf hands `nameFold` one token at a time. Folding every token was the first
// cut (the E6 harness did), and measured on real prose it joined a title with a possessive inside it to the thing it names — "Dante"
// reached "Dante's Blindness", "Mantua" reached "Mantua's Foundation", "Virgil" reached "Virgil's Departure". The last-token fold
// does not make those joins (pinned in identity-routes.test.mjs against the every-token fold as a control built to fail).
//
// KNOWN RESIDUE, stated rather than hidden: a business or place named with the mark as part of its name ("Macy's", "Denny's",
// "St. John's") folds to the bare name, and the bare name may be a person. The position rule cannot tell the two apart; only the
// material can, and this route does not read the material. It is an identity fold, which widens what resolves, never one that
// removes a distinction an established surface already drew.
//
// PURE. No engine import: the per-token strip is handed in (the cast.js pattern), so the page loads this from the organs seam and a
// test loads it by path against the real engine module.

/** Typed reasons this route can decline. */
export const ENCLITIC_REFUSALS = Object.freeze({
  UNDECLARED_LANGUAGE: "language_undeclared",
  NO_PRIOR_FOR_LANGUAGE: "no_enclitic_prior_for_language",
  NO_STRIP_ORGAN: "no_strip_organ",
});

const ENGLISH = Object.freeze({
  language: "eng",
  scope: "last token of a name",
  reads: "an apostrophe glyph (' or ’) with an optional s, at the end of the token",
  doesNotKnow: "what a possessive is; in a script without the clitic it simply never matches",
  giver: "adapters/text/surfaces.js, 'THE APOSTROPHE CLITIC': measured on Process and Reality (Locke 68 + Locke's 45, Hume 66 + Hume's 40, Descartes 48 + Descartes' 27)",
  measured: "eval/the-fold/results/possessive-audit-RESULTS.md",
});

/**
 * The languages this route has a prior for. A second language is a new entry with its own giver and its own measurement, not a
 * branch in the fold; "en" is the two-letter spelling pronouns.js keys its own registry by, "eng" the ISO 639-3 code app.js declares.
 */
export const ENCLITIC_PRIORS = Object.freeze({ eng: ENGLISH, en: ENGLISH });

const priorFor = (language) => ENCLITIC_PRIORS[String(language ?? "").toLowerCase()] ?? null;

/**
 * The fewest letters a stripped last token may keep. A single letter is never a name: what "X's" is, with a one-letter X, is the
 * plural-of-a-letter idiom ("mind your P's and Q's") or a numeral ("Charles I's"). Measured on real prose in the audit, the idiom is
 * the one false join the last-token fold makes: "Seven P's" stripped to "Seven P", whose only token cast.js::resolve counts
 * ("P" is under its own two-letter cut), is "Seven" — and "Seven" reached "The Seven Virtues" and "Righteous Kings". A stem of one
 * letter is therefore left as written, which is what the index did before this route: declining can only fall back to the old
 * behaviour, never below it. A numeral is the exception a caller may license (`isNumeral`, the engine's own
 * surfaces.js::isRomanNumeral): it indexes a name rather than being one, so "Charles I's" still reaches "Charles I".
 * Two-letter stems stay: "Li's", "Wu's" and "Xi's" are names, and cast.js counts the rest of the name either way.
 */
export const MIN_STRIPPED_TOKEN = 2;

/**
 * lastTokenFold(strip, { isNumeral }) → (name) => string. Applies the per-token `strip` to the LAST whitespace-delimited token of
 * `name` and to nothing else; a token that strips to nothing is dropped, and one that would strip to fewer than MIN_STRIPPED_TOKEN
 * letters is left as written unless `isNumeral` says the stem is a numeral. The building block, exported so a test can set it
 * against the every-token fold it replaces.
 */
export const lastTokenFold = (strip, { isNumeral = null } = {}) => (name) => {
  const toks = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!toks.length) return "";
  const raw = toks[toks.length - 1];
  const last = strip(raw);
  if (!last) { toks.pop(); return toks.join(" "); }
  const letters = [...last].filter((ch) => /\p{L}|\p{N}/u.test(ch)).length;
  if (letters >= MIN_STRIPPED_TOKEN || (typeof isNumeral === "function" && isNumeral(last))) toks[toks.length - 1] = last;
  return toks.join(" ");
};

/**
 * terminalEncliticFold({ language, stripEnclitic }) → { fold, prior, gap }
 *
 * `fold` is what cast.js::makeReferentIndex takes as `surfaceFold`, or null when this route is not licensed for the language —
 * null is the index's own byte-identical default, so a declined route changes nothing. `gap` is the typed reason, present exactly
 * when `fold` is null. `stripEnclitic` is the engine's per-token strip (surfaces.js::stripPossessive), injected; `isNumeral` the
 * engine's surfaces.js::isRomanNumeral, optionally (see MIN_STRIPPED_TOKEN).
 */
export function terminalEncliticFold({ language = null, stripEnclitic = null, isNumeral = null } = {}) {
  if (language === null || language === undefined || String(language).trim() === "") {
    return { fold: null, prior: null, gap: { type: ENCLITIC_REFUSALS.UNDECLARED_LANGUAGE, detail: "no language was declared for this material — the enclitic fold is a fact about a language and is never applied by default" } };
  }
  const prior = priorFor(language);
  if (!prior) {
    return { fold: null, prior: null, gap: { type: ENCLITIC_REFUSALS.NO_PRIOR_FOR_LANGUAGE, language: String(language), detail: `no enclitic prior is declared for language "${language}" — nothing was folded, which is not the same fact as nothing needing folding` } };
  }
  if (typeof stripEnclitic !== "function") {
    return { fold: null, prior, gap: { type: ENCLITIC_REFUSALS.NO_STRIP_ORGAN, language: prior.language, detail: "the engine's per-token strip was not handed in" } };
  }
  return { fold: lastTokenFold(stripEnclitic, { isNumeral }), prior, gap: null };
}
