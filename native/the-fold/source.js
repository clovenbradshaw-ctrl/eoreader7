// source.js — VENDORED COPY, NOT A LINK. The one fold (`tokenize`) that the
// vendored the-fold organs here use, copied verbatim from
// eoreader7/native/organs/source.js (the upstream the-fold file is a 6-line
// re-export shim: `export * from "../eoreader7/native/organs/source.js"`).
//
// Copied, not linked, so this block is INDEPENDENT: it must keep running
// (e.g. in an eval checkout, or moved) without dragging the organs module in.
// The cost of independence is a second copy of the fold; the original
// discipline of P7.1 ("the same one, by import") applies WITHIN a repo, and
// the note below is how we intend to get back to one copy.
//
// FUTURE (do this): REMOVE resolutions.js, dialogue.js, firewall.js,
// ground-ladder.js, answer-record.js, reading-log.js and source.js from the
// upstream the-fold repo and MAKE THE FOLD DEPENDENT on these eoreader7
// copies — the dependency flips to the-fold → eoreader7. These blocks are computed by the
// reading's own organs (no model compression), so eoreader7 is their home;
// upstream the-fold is a client/UI over the engine and should import them
// from here. When that lands, this file can return to being the shared
// organs `tokenize` by import and the second copy disappears.
//
// Source this was copied from: eoreader7/native/organs/source.js (tokenize,
// foldDiacritics, isNumeral, STOPWORDS), vendored 2026-09-11.

// The engine's own stopword list (native/organs/source.js). A token in this
// list is a function word, not vocabulary for identity.
const STOPWORDS = new Set(
  ("a an and are as at be but by for from had has have he her his i in into is it its of on or " +
    "our she that the their them there these they this to was were what when where which who why " +
    "will with would you your do does did can could should about would're not no if then than so " +
    "how me my we us been being over under after before also just like more most some such only").split(" "),
);

/**
 * Diacritic folding, the same fold everywhere: a corpus that writes Bezúkhov
 * must answer a question that writes Bezukhov, in RETRIEVAL and in the CHECKS
 * alike. Widened beyond the Latin/Greek/Cyrillic combining-marks block to
 * Hebrew nikud (U+0591–U+05C7) and Arabic tashkil (U+064B–U+065F, plus
 * U+0670's superscript alef) — folding a vowel mark away can only WIDEN what
 * matches, never narrow a real distinction into a false one.
 */
function foldDiacritics(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f\u0591-\u05c7\u064b-\u065f\u0670]/g, "");
}

/** A numeral by shape: digits, or roman. The engine's own test, not a list. */
function isNumeral(t) {
  return /^\d+$/.test(t) || /^[ivxlcdm]+$/.test(t);
}

/**
 * A text reduced to its words, under the session's one fold: diacritics
 * folded, case folded, split on Unicode word/number classes (a Cyrillic or
 * CJK corpus must fold to its words and not to nothing), dots and dashes
 * kept inside a token so "12.5" and "hit-and-run" survive, and short tokens
 * dropped — except numerals, which are form rather than vocabulary. Copied
 * verbatim from the organs.
 */
export function tokenize(text) {
  return foldDiacritics(text)
    .toLowerCase()
    .split(/[^\p{L}\p{N}%.\-]+/u)
    .map((t) => t.replace(/^[.\-]+|[.\-]+$/g, ""))
    .filter((t) => (t.length > 2 || isNumeral(t)) && !STOPWORDS.has(t));
}