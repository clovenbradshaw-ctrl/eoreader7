// structure-rec.mjs — a REC-triggered structure detector: identify a
// document's own heading/chapter convention, escalating only as far as it
// has to.
//
// User direction, verbatim: "develop the def[erred detection of] structure
// system as needed to detect structure and identify it and have this be a
// repeated program used that gets REC'd as needed, using model call as
// needed." Named after this codebase's own existing "REC" (re-zero) idea
// (`packages/engine/loops/atmosphere.js`, documented in eoreader7's
// CLAUDE.md): a mechanism that keeps running on its CURRENT model of the
// material until a measured trigger says that model no longer explains
// what it is seeing, and only THEN re-grounds. This file is the same shape
// applied to chapter-heading detection, which until now was hand-patched
// one book at a time — S102 found Dorian Gray's missing title line and
// fixed the regex by hand; S105-adjacent work (this same session) found
// Frankenstein's Arabic "Chapter 1" and, again, fixed the regex by hand.
// Both fixes were correct, but the PROCESS — a human reads a new book,
// finds the regex doesn't match, edits it — does not scale and is not a
// program. This is the program: three tiers, each tried only if the one
// before it could not settle the question, ending in a local-model witness
// used exactly as `witness-referent.mjs` already established (a
// constrained forced choice, asked twice under a content-free
// perturbation, trusted only on agreement) — never asked to freely invent
// a convention.
//
// TIER 1 — KNOWN CONVENTIONS (mechanical, no model). `heading-
// conventions.json` is a growing, disclosed library: {word, numeralType,
// requiresPeriod} triples this project has actually confirmed against real
// books, not a hand-typed closed class of "everything English prose might
// do". Each is tried; a convention that clears >=2 matches (you cannot
// observe a REPEATING convention from one instance — this is the
// mathematical floor, not a tuned threshold) is a candidate, and the one
// with the most matches wins, on the reasoning that a genuine book-wide
// convention should recur more than an incidental coincidence.
//
// REC TRIGGER: no known convention reaches 2 matches. This is the ONE
// escalation condition in this file, and it is a count, not a guess.
//
// TIER 2 — SKELETON RECURRENCE (mechanical, no model). Candidate heading
// lines are found the cheap way: short, standing alone (a blank line
// immediately before AND after), for real — no model needed to notice
// that a line is short and isolated. Each candidate is reduced to a
// SKELETON (runs of letters -> W, digits -> #, an all-caps-Roman-looking
// token -> @) and grouped; a skeleton with >=2 members is a real
// candidate CONVENTION, proposed mechanically. If that skeleton also
// carries a numeral that increases monotonically in document order across
// its members, that is independent, strong, still-mechanical evidence
// (an incidental repeated phrase does not count upward) and the
// convention is accepted WITHOUT calling the model at all.
//
// TIER 3 — MODEL WITNESS, ONLY WHEN TIER 2's OWN EVIDENCE IS AMBIGUOUS
// (a recurring skeleton with no monotonic numeral to independently confirm
// it). The model is shown the actual candidate lines and asked ONE
// constrained question — do these mark the start of a new
// section/chapter, or are they something else (a refrain, a stage
// direction, a recurring caption)? — forced to answer from a closed set,
// asked twice with the sample lines in reversed order (the same
// content-free perturbation `witness-referent.mjs` already uses), and
// trusted only if both answers agree. A model that flips under a reorder
// is refused exactly as a referent-pick that flips is refused there.
//
// A convention accepted at tier 2 or tier 3 is APPENDED to `heading-
// conventions.json` (never overwriting an existing entry), so the NEXT
// document with the same shape is a tier-1 hit — the "repeated program"
// the user asked for, not a one-off answer forgotten the moment this
// script exits.
//
// usage: node structure-rec.mjs <path-to-document.txt>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LIB_PATH = path.join(HERE, "heading-conventions.json");
const OLLAMA = "http://localhost:11434";
const MODEL = "gemma2:2b"; // kept small on purpose — [[feedback_local_model_small]]

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function loadLibrary() {
  return JSON.parse(fs.readFileSync(LIB_PATH, "utf8"));
}
export function saveLibrary(lib) {
  fs.writeFileSync(LIB_PATH, JSON.stringify(lib, null, 2) + "\n");
}

// A spelled-out numeral's casing is not assumed to be any one convention —
// this project reads more than Gutenberg-formatted classics, and a corpus
// with a different house style (lowercase "part one", title-case "Part
// One", something inconsistent) would be silently mismatched by a fixed
// choice. Instead the casing is DISCOVERED, mechanically, from the actual
// sample line the convention was derived from (see `deriveConvention`'s
// `numeralCase`), and reproduced exactly here. This is the same "look at
// the content and let it tell you what to do" discipline `deriveConvention`
// itself already follows for word/numeral shape — applied to the one
// remaining hand-set assumption that was fixed here first (a blanket
// case-insensitive flag on every word-numeral regex) before being caught.
function wordCase(word) {
  const letters = word.replace(/[^A-Za-z]/g, "");
  if (!letters) return null;
  if (letters === letters.toUpperCase()) return "upper";
  if (letters === letters.toLowerCase()) return "lower";
  const parts = word.split("-");
  if (parts.every((p) => p.length > 0 && p[0] === p[0].toUpperCase() && p.slice(1) === p.slice(1).toLowerCase())) return "title";
  return null; // genuinely mixed (e.g. "oNe") — disclosed, not guessed at
}
function applyCase(word, kind) {
  if (kind === "upper") return word.toUpperCase();
  if (kind === "title") return word.split("-").map((p) => p[0].toUpperCase() + p.slice(1)).join("-");
  return word; // "lower", or no case could be classified — the canonical list is already lowercase
}
// Built from the same ONES/TENS lists `numeralValue` already reads, once,
// rather than hand-typed a second time — the closed word list has exactly
// one source of truth. Sorted longest-first so "TWENTY-ONE" is tried
// before "TWENTY" would otherwise win as a shorter, wrong, partial match.
// A function, not a module-level constant, because it depends on the
// convention's own discovered `numeralCase` — there is no one fixed list.
function buildWordNumeralAlternation(numeralCase) {
  const canonical = [
    ...ONES.slice(1),
    ...TENS.slice(1),
    ...TENS.slice(2).flatMap((t) => ONES.slice(1, 10).map((o) => `${t}-${o}`)),
  ].sort((a, b) => b.length - a.length);
  return canonical.map((w) => applyCase(w, numeralCase)).join("|");
}

export function buildRegex(conv) {
  // `numeralType: "none"` — a literal marker with NO numeral in it at all
  // ("INTERLUDE" repeated between acts, never "INTERLUDE ONE"). There is no
  // `<numeral>` group to capture, and the marker text IS the whole match;
  // the reader that consumes this (eot-jsonl.mjs) already assigns chapter
  // ordinals purely from the ORDER matches occur in the document, not from
  // a parsed numeral value, so nothing downstream needs one.
  if (conv.numeralType === "none") {
    const periodPattern = conv.requiresPeriod ? "\\." : "\\.?";
    const marker = escapeRe(conv.word);
    if (conv.titleOnSameLine) {
      return new RegExp(`^[ \\t]*${marker}${periodPattern}[ \\t]+(?<titleLine>\\S[^\\r\\n]*)\\r?\\n`, "gmd");
    }
    return new RegExp(`^[ \\t]*${marker}${periodPattern}[ \\t]*\\r?\\n(?<titleLine>[^\\r\\n]*)\\r?\\n`, "gmd");
  }
  const numPattern = conv.numeralType === "roman" ? "[IVXLC]+"
    : conv.numeralType === "word" ? `(?:${buildWordNumeralAlternation(conv.numeralCase)})`
    // A single letter's own character class already spans both cases
    // without needing the word-numeral list's case-discovery machinery —
    // unlike a spelled-out word, "[A-Za-z]" is not a fixed string that can
    // be wrongly cased, so there is no separate `numeralCase` to discover
    // or apply here.
    : conv.numeralType === "letter" ? "[A-Za-z]"
    : "\\d+";
  const periodPattern = conv.requiresPeriod ? "\\." : "\\.?";
  // `word: null` is a real, distinct shape — a bare numeral heading with no
  // marker word at all (found on Sherlock Holmes: "I." alone, not "CHAPTER
  // I." or "Chapter 1") — not a degenerate case of the word-first form.
  const prefix = conv.word ? `${escapeRe(conv.word)} ` : "";
  // The numeral word's casing is baked into the alternation above via the
  // convention's own discovered `numeralCase`, not into the regex flags —
  // so the marker word (`conv.word`) stays exactly as case-sensitive as it
  // always was for roman/arabic conventions. The ONE disclosed fallback:
  // a sample whose casing could not be classified at all (mixed, e.g.
  // "oNe") falls back to case-insensitive matching for that convention
  // alone, named here rather than silently applied to every convention.
  const flags = conv.numeralType === "word" && !conv.numeralCase ? "gmdi" : "gmd";
  // `titleOnSameLine` is a THIRD, independent shape — Sherlock Holmes's own
  // real convention turned out to be neither of the other two: "I. A
  // SCANDAL IN BOHEMIA", numeral and title together on one line, not a
  // title on a following line and not a bare numeral alone.
  if (conv.titleOnSameLine) {
    return new RegExp(`^[ \\t]*${prefix}(?<numeral>${numPattern})${periodPattern}[ \\t]+(?<titleLine>\\S[^\\r\\n]*)\\r?\\n`, flags);
  }
  return new RegExp(`^[ \\t]*${prefix}(?<numeral>${numPattern})${periodPattern}[ \\t]*\\r?\\n(?<titleLine>[^\\r\\n]*)\\r?\\n`, flags);
}

// Turn one sample candidate line into a convention's own {word,
// numeralType, requiresPeriod, titleOnSameLine} shape — done by PARSING
// the line into its parts, never by taking the first letter-run as "the
// word" regardless of what it actually is. That naive version was wrong
// on its very first real test: Sherlock Holmes's own "I. A SCANDAL IN
// BOHEMIA" heading has no marker word at all, and `/^[\p{L}]+/` matched
// "I" itself (a Roman numeral is made of letters) and proposed a
// convention with word:"I" — nonsense.
//
// Four STRUCTURAL shapes are recognized (marker+numeral, bare numeral,
// numeral+title, and a numeral-less literal marker), tried in an order
// that keeps a real bare numeral or word-first heading from ever being
// miscategorized as carrying a same-line title. What is NOT hand-typed
// per shape any more is WHICH NUMERAL SYSTEM a token is written in — that
// used to be three near-identical top-level branches here (a word-numeral
// branch, a roman-or-arabic branch, then a THIRD, copy-pasted branch added
// when "APPENDIX A" turned up a system none of the first two recognized),
// exactly the "a human reads a new book, edits the regex" pattern this
// file's own header exists to replace, just moved up one level. All four
// shapes below instead call `classifyNumeralToken` — the one place this
// file knows the closed set of ways a numeral is written — so a numeral
// system not yet seen (Greek letters, ordinal suffixes) is added THERE,
// once, not as a new shape here.
export function deriveConvention(sampleText) {
  const trimmed = sampleText.trim();
  const rawTokens = trimmed.match(/\S+/g) ?? [];
  if (rawTokens.length === 0) return null;
  // A token's OWN trailing period (not the line's) is what `requiresPeriod`
  // means — found to matter on "I. A SCANDAL IN BOHEMIA", where the period
  // sits after the FIRST token, not at the end of the line.
  const stripPeriod = (tok) => (tok.endsWith(".") ? [tok.slice(0, -1), true] : [tok, false]);
  const shapeFrom = (numeral, extra) => ({
    numeralType: numeral.numeralType,
    ...(numeral.numeralCase ? { numeralCase: numeral.numeralCase } : {}),
    ...extra,
  });

  // MARKER + NUMERAL — exactly one marker word, then exactly one numeral
  // token ("CHAPTER I", "Chapter 1", "PART ONE", "APPENDIX A"). Kept to
  // exactly two tokens on purpose (not "any words before the last numeral
  // token") — a longer window would also match an ordinary one-line
  // sentence that happens to END in a number word ("There were exactly
  // nine."), which the tier-2 skeleton/monotonic gates upstream are not
  // designed to filter on their own.
  if (rawTokens.length === 2) {
    const [core, hadPeriod] = stripPeriod(rawTokens[1]);
    const numeral = classifyNumeralToken(core);
    if (numeral) return shapeFrom(numeral, { word: rawTokens[0], requiresPeriod: hadPeriod, titleOnSameLine: false });
  }
  // BARE NUMERAL — the whole line is one numeral token, nothing else
  // ("I.", "5").
  if (rawTokens.length === 1) {
    const [core, hadPeriod] = stripPeriod(rawTokens[0]);
    const numeral = classifyNumeralToken(core);
    if (numeral) return shapeFrom(numeral, { word: null, requiresPeriod: hadPeriod, titleOnSameLine: false });
  }
  // NUMERAL + TITLE, sharing one line ("I. A SCANDAL IN BOHEMIA"). Tried
  // only once the two shapes above have failed, so a real bare numeral or
  // marker+numeral heading is never miscategorized as carrying a
  // same-line title.
  if (rawTokens.length > 1) {
    const [core, hadPeriod] = stripPeriod(rawTokens[0]);
    const numeral = classifyNumeralToken(core);
    if (numeral) return shapeFrom(numeral, { word: null, requiresPeriod: hadPeriod, titleOnSameLine: true });
  }
  // LAST RESORT — no token anywhere in the sample classifies as a numeral
  // under any system this file currently knows. A literal marker with NO
  // numeral in it at all ("INTERLUDE" repeated between acts). This is the
  // shape tier 3's own "confirmed structural, no numeral" case needs: a
  // convention built here carries no <numeral> capture (see buildRegex),
  // and the reader that consumes it assigns ordinals purely from the
  // ORDER its matches occur in the document — the same thing
  // eot-jsonl.mjs's chapter-building already does unconditionally
  // (`ordinal: i + 1`, never derived from a parsed numeral value), so this
  // needs no new ordinal mechanism, only a convention shape that can reach
  // the one that already exists. The CALLER is responsible for only
  // trusting this shape once an independent check (tier 3's model
  // witness, or an equivalent) has confirmed the recurring line is
  // actually structural — this function has no way to tell a real marker
  // from a recurring refrain on its own.
  const [wholeCore, wholeHadPeriod] = stripPeriod(trimmed);
  return { word: wholeCore, numeralType: "none", requiresPeriod: wholeHadPeriod, titleOnSameLine: false };
}

function tryConvention(raw, conv) {
  const re = buildRegex(conv);
  const hits = [];
  let m;
  while ((m = re.exec(raw))) hits.push({ start: m.index, numeral: m.groups.numeral, titleLine: m.groups.titleLine });
  return hits;
}

// TIER 1
export function tier1(raw, lib) {
  let best = null;
  for (const conv of lib.conventions) {
    const hits = tryConvention(raw, conv);
    if (hits.length >= 2 && (!best || hits.length > best.hits.length)) best = { conv, hits };
  }
  return best;
}

// TIER 2 — candidate lines: short, blank-bounded on both sides, and NOT
// quoted dialogue. "Short and standing alone" is not enough on its own —
// found running this against real dialogue-heavy prose (Sherlock Holmes):
// a one-line paragraph of quoted speech ("“Frequently.”", "“How often?”")
// is exactly as short and exactly as blank-bounded as a real heading, and
// there are FAR more of them — the ten largest skeleton groups in that
// text were all quoted dialogue, none a heading, and one of them (44
// members) beat every real heading group in size. A heading is not quoted;
// this is a real, near-universal typographic distinction in this
// tradition, not a hand-tuned threshold, and it is cheap to check.
const QUOTE_CHARS = /^[“"'‘]|[”"'’]$/;
// This length cutoff is a heuristic, disclosed as one rather than dressed
// up as measured: it exists only to keep candidate-scanning away from
// obvious full paragraphs (typically several hundred characters), not to
// distinguish real headings from anything else — that work is the quote
// filter and the skeleton/monotonic-numeral checks below. Found too tight
// on the first real test: "IX. THE ADVENTURE OF THE ENGINEER'S THUMB" (43
// chars) was silently dropped, breaking what should have been an 11-of-12
// group into 10. Set generously loose instead of re-tuned to fit one book.
const MAX_CANDIDATE_LINE_LENGTH = 80;
function candidateLines(raw) {
  const lines = raw.split(/\r?\n/);
  const out = [];
  let offset = 0;
  const starts = lines.map((l) => { const s = offset; offset += l.length + 1; return s; });
  for (let i = 1; i < lines.length - 1; i += 1) {
    const line = lines[i].trim();
    if (!line || line.length > MAX_CANDIDATE_LINE_LENGTH) continue;
    if (lines[i - 1].trim() !== "" || lines[i + 1].trim() !== "") continue;
    if (QUOTE_CHARS.test(line)) continue;
    out.push({ index: i, start: starts[i], text: line });
  }
  return out;
}

// Skeleton: a letter-run becomes W, a digit-run becomes #, a bare
// Roman-numeral-shaped token (I, IV, XII, ...) becomes @, and a SPELLED-OUT
// number word ("one", "twenty-one" — this file's own closed `wordToNumber`
// list, the exact same one `numeralValue` reads) becomes & — each checked
// before the general letter-run rule so none of the three just becomes W.
// Found wrong on the real test: an early version kept one "W" per WORD, so
// "VI. THE MAN WITH THE TWISTED LIP" (6 title words) and "I. A SCANDAL IN
// BOHEMIA" (4 title words) skeletonized DIFFERENTLY and landed in separate
// groups — fragmenting Sherlock Holmes's own single real convention
// ("numeral. TITLE", any length) into a dozen small buckets, several of
// which lost to unrelated quoted-dialogue groups by member count. A
// title's actual word count is never part of the convention — the same
// reason eot-jsonl.mjs's own heading regex captures a title line as
// `[^\n]*`, arbitrary content, rather than counting words in it. A run of
// consecutive word-tokens (with the punctuation/spacing between them) is
// collapsed to ONE placeholder, so "numeral. <any title>" is one skeleton
// regardless of length.
//
// The `&` step was found needed on a SECOND real test, not assumed up
// front: a synthetic "PART ONE"/"PART TWO"/... specimen built to exercise
// the spelled-out-numeral convention was, before this step existed,
// grouped into the SAME skeleton ("W") as an unrelated one-line byline
// ("by Nobody in Particular") and an unrelated one-line paragraph
// ("Nobody thought much of it at the time.") — both are, at the level of
// letter-runs alone, indistinguishable from "PART ONE". Word count is
// still never trusted as the discriminator (a real convention could be
// "PART THE FIRST" just as easily as "PART ONE") — only this project's own
// closed, disclosed number-word vocabulary is, exactly the way a Roman
// numeral or a digit already earns its own placeholder. Marking the
// numeral word gives "PART ONE" the skeleton "W&", distinct from the
// contaminating lines' own plain "W" — the SAME kind of evidence a digit
// or Roman numeral already contributes, read mechanically rather than by
// word count or by hand-listing the two contaminating lines away.
// The `%` step was found needed on a THIRD real test: "APPENDIX A" /
// "APPENDIX B" / "APPENDIX C" / "APPENDIX D" — a single LETTER used as an
// ordinal, not a Roman numeral and not a spelled-out word. Before this
// step existed, "APPENDIX A"/"B"/"D" fell all the way through to the
// generic word-collapse (a bare letter is not IVXLC-shaped for A/B/D, not
// a digit, not in the closed number-word list) and skeletonized as plain
// "W" — identically to unrelated one-line prose paragraphs, drowning the
// real 3-of-4-member convention inside an 8-member noise bucket. Worse,
// "APPENDIX C" alone WAS caught by the existing Roman-numeral step (C is
// a valid, if degenerate, Roman numeral) and skeletonized differently
// ("W@") from its own three siblings — one real convention, fragmented
// into two skeletons by an accident of which letters happen to overlap
// the Roman alphabet. This step gives ANY standalone single letter — Roman-
// shaped or not — its own placeholder, run AFTER the multi-character Roman
// check (so "II", "XII" etc. still become "@" as before, unchanged) but
// covering exactly the one-letter case that check also happens to catch.
// The result: "APPENDIX A"/"B"/"D" (not Roman-shaped) group together under
// "%"; "APPENDIX C" (Roman-shaped) is still caught by `@` first and stays
// a singleton here — which is FINE, not a lingering bug: tier 2 only needs
// a 2+-member group to DERIVE the convention's shape from, and once
// `deriveConvention`/`buildRegex` builds a `numeralType:"letter"` regex
// from that shape, `RE.exec` matches all four instances directly against
// the raw text — this grouping step is never asked to enumerate every
// instance, only enough of them to recognize the pattern at all.
function skeletonOf(line) {
  return line
    .replace(/\b[IVXLC]+\b/g, "@")
    .replace(/\b[A-Za-z]\b/g, "%")
    .replace(/\d+/g, "#")
    .replace(/\b[A-Za-z]+(?:-[A-Za-z]+)?\b/g, (w) => (wordToNumber(w) !== null ? "&" : w))
    .replace(/\p{L}+/gu, "W")
    .replace(/(?:W[^\p{L}@#&%]*)+/gu, "W")
    .trim();
}

function romanToInt(s) {
  const map = { I: 1, V: 5, X: 10, L: 50, C: 100 };
  let total = 0;
  for (let i = 0; i < s.length; i += 1) {
    const v = map[s[i]];
    const next = map[s[i + 1]];
    total += next && v < next ? -v : v;
  }
  return total;
}

// Spelled-out English number words, 1-99 — a closed, bounded vocabulary
// (this project's own NEGATION_WORDS/DEFINITE_DETERMINERS precedent,
// CLAUDE.md), not an attempt at every number English can name. Found
// needed on the synthetic "PART ONE" specimen S107 built specifically to
// exercise tier 3: the mechanical numeral parser had NO way to see that
// "ONE", "TWO", "THREE" increase, so a real, ordinary convention (many
// books number parts in words, not digits or Roman numerals) escalated to
// the model witness for a fact a closed word list already settles for
// free — and even confirmed, carried no numeral this file could build
// chapter ordinals from at all. 1-99 covers any realistic chapter count;
// nothing here guesses past that bound.
const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["zero", "ten", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
function wordToNumber(word) {
  const w = word.toLowerCase();
  const onesIdx = ONES.indexOf(w);
  if (onesIdx >= 0) return onesIdx;
  const tensIdx = TENS.indexOf(w);
  if (tensIdx >= 0) return tensIdx * 10;
  const compound = w.match(/^(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)-(one|two|three|four|five|six|seven|eight|nine)$/);
  if (compound) return TENS.indexOf(compound[1]) * 10 + ONES.indexOf(compound[2]);
  return null;
}

// ── THE ONE PLACE THIS FILE KNOWS WHAT A NUMERAL TOKEN CAN BE ─────────────
// `numeralValue` and `deriveConvention` used to each carry their OWN
// separate arabic/roman/word/letter recognition — three different bugs
// waiting to happen from the same knowledge drifting out of sync (and a
// real one already found: `deriveConvention` grew a THIRD near-duplicate
// top-level branch, `letterOrdinal`, copy-pasted from `wordFirst`, purely
// to add single-letter ordinals — a new NUMERAL SYSTEM hand-added as a new
// SHAPE, the same one-book-at-a-time patching this file's own header
// exists to replace, just moved up a level). This is the one function
// both now call: given a single token, which of the systems this project
// currently understands (if any) is it written in, and what value does it
// carry. Extending the set of systems (Greek letters, ordinal suffixes
// like "1st") means adding a branch HERE, once — never a new top-level
// shape in `deriveConvention`, and never a second copy of the same check
// in `numeralValue`.
function classifyNumeralToken(tok) {
  if (/^\d+$/.test(tok)) return { numeralType: "arabic", value: Number(tok) };
  if (/^[IVXLC]+$/.test(tok)) return { numeralType: "roman", value: romanToInt(tok) };
  const wordVal = wordToNumber(tok);
  if (wordVal !== null) return { numeralType: "word", value: wordVal, numeralCase: wordCase(tok) };
  // A single bare letter used as an ordinal (A=1, B=2, ... "APPENDIX B") —
  // tried last, so a letter that is ALSO Roman-shaped (I, V, X, L, C) is
  // read as Roman above, never double-counted here.
  if (/^[A-Za-z]$/.test(tok)) return { numeralType: "letter", value: tok.toUpperCase().charCodeAt(0) - 64 };
  return null;
}

// Exported for helix-read.mjs's own identity-set surprise hunt (eot-jsonl.mjs
// wiring): a chapter head's captured numeral text is the natural `positionOf`
// for findSurprise's "where does this member sit in its own space" question,
// and this is the one place that already answers it correctly across every
// numeral system this file knows — reused rather than a second copy of the
// same classification.
export function numeralValue(text) {
  // A digit RUN is checked directly (not word-by-word) since it needs no
  // word boundary the way a letter token does, and it outranks every other
  // system unconditionally — a candidate line mixing a real digit with
  // incidental letters is vanishingly rare next to the reverse.
  const arabicRun = text.match(/\d+/);
  if (arabicRun) return Number(arabicRun[0]);
  // Otherwise scan every word LEFT TO RIGHT and take the first one
  // `classifyNumeralToken` recognizes under any system — a candidate like
  // "PART ONE" has a marker word ("PART") before the numeral, and stopping
  // at the first token alone would give up right there.
  for (const word of text.match(/[A-Za-z]+(?:-[A-Za-z]+)?/g) ?? []) {
    const c = classifyNumeralToken(word);
    if (c) return c.value;
  }
  return null;
}

function isMonotonic(values) {
  if (values.some((v) => v === null)) return false;
  for (let i = 1; i < values.length; i += 1) if (values[i] <= values[i - 1]) return false;
  return true;
}

export function tier2(raw) {
  const cands = candidateLines(raw);
  const bySkeleton = new Map();
  for (const c of cands) {
    const sk = skeletonOf(c.text);
    (bySkeleton.get(sk) ?? bySkeleton.set(sk, []).get(sk)).push(c);
  }
  const groups = [...bySkeleton.entries()]
    .filter(([, members]) => members.length >= 2)
    .map(([skeleton, members]) => ({ skeleton, members: members.sort((a, b) => a.start - b.start) }));
  // Prefer the group with the most members — the genuine book-wide
  // convention should recur more than an incidental one.
  groups.sort((a, b) => b.members.length - a.members.length);
  for (const g of groups) {
    const values = g.members.map((m) => numeralValue(m.text));
    if (isMonotonic(values)) return { group: g, monotonic: true, values };
  }
  return groups.length ? { group: groups[0], monotonic: false, values: null } : null;
}

// TIER 3 — model witness, same discipline as witness-referent.mjs: a
// closed-set forced choice, asked twice under a content-free reorder,
// trusted only on agreement.
const OPTIONS = [
  "A: these lines each mark the start of a new chapter or numbered section",
  "B: these lines are something else — a repeated refrain, a caption, a speaker label, or other non-structural recurring text",
];
function buildMessages(sample, options) {
  const list = options.map((o, i) => `${i + 1}. ${o}`).join("\n");
  return [
    {
      role: "system",
      content:
        `You are given several short lines pulled from a document, each one standing alone between blank lines. ` +
        `Decide which of the two descriptions below best fits ALL of them as a group. ` +
        `Answer with the NUMBER only. Do not explain.`,
    },
    { role: "user", content: `Lines:\n${sample.map((s) => `- "${s}"`).join("\n")}\n\nDescriptions:\n${list}` },
  ];
}
async function ask(messages) {
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL, messages, stream: false,
      format: { type: "object", properties: { pick: { type: "integer" } }, required: ["pick"] },
      options: { num_predict: 20 },
    }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  const data = await res.json();
  try { const p = JSON.parse(data.message.content); return Number.isInteger(p.pick) ? p.pick : null; }
  catch { return null; }
}
export async function tier3(group) {
  const sample = group.members.slice(0, 6).map((m) => m.text);
  const forward = OPTIONS;
  const reversed = [...OPTIONS].reverse();
  const [p1, p2] = await Promise.all([ask(buildMessages(sample, forward)), ask(buildMessages([...sample].reverse(), reversed))]);
  const a1 = p1 === 1 ? forward[0] : p1 === 2 ? forward[1] : null;
  const a2 = p2 === 1 ? reversed[0] : p2 === 2 ? reversed[1] : null;
  if (!a1 || !a2) return { verdict: "unreadable", a1, a2 };
  if (a1 !== a2) return { verdict: "order-sensitive — refused", a1, a2 };
  return { verdict: a1.startsWith("A") ? "structural — confirmed" : "not structural — confirmed", a1, a2 };
}

// ── main ────────────────────────────────────────────────────────────────
// FOUND WRONG BY WIRING THIS FILE INTO eot-jsonl.mjs (S111): this whole CLI
// section had no guard at all — every line below ran UNCONDITIONALLY the
// moment anything imported this file, exactly the "importing a script as
// a module runs its own top-level body against whatever process.argv the
// CALLER happened to have" trap `grain-typing.mjs`'s own header (and
// `table-rec.mjs`'s existing guard) already named. `eot-jsonl.mjs` tried
// to import `tier1`/`buildRegex` from this file and got this file's own
// "usage: node structure-rec.mjs..." error instead, because importing it
// ran this section against eot-jsonl.mjs's own argv. Wrapped the same way
// `table-rec.mjs` already does it correctly.
if (import.meta.url === `file://${process.argv[1]}`) {
const bookPath = process.argv[2];
if (!bookPath) { console.error("usage: node structure-rec.mjs <path-to-document.txt>"); process.exit(1); }
const raw = fs.readFileSync(bookPath, "utf8");
const lib = loadLibrary();

const t1 = tier1(raw, lib);
if (t1) {
  console.log(`TIER 1 (mechanical, known convention): "${t1.conv.name}" — ${t1.hits.length} matches. No model call.`);
  process.exit(0);
}

console.log(`REC FIRED: no known convention (${lib.conventions.map((c) => c.name).join(", ")}) reached 2 matches. Escalating.`);
const t2 = tier2(raw);
if (!t2) {
  console.log("TIER 2: no recurring skeleton found at all (no >=2 short, blank-bounded lines share a shape). Refusing — no structure asserted.");
  process.exit(2);
}

console.log(`TIER 2 (mechanical, skeleton recurrence): skeleton "${t2.group.skeleton}", ${t2.group.members.length} members, sample: ${t2.group.members.slice(0, 3).map((m) => JSON.stringify(m.text)).join(", ")}`);
if (t2.monotonic) {
  console.log(`Numeral sequence is monotonic (${t2.values.join(" < ")}) — accepted mechanically, WITHOUT a model call.`);
  const parsed = deriveConvention(t2.group.members[0].text);
  if (!parsed) {
    console.log(`Could not parse the sample line ("${t2.group.members[0].text}") into a known shape (word-first or bare-numeral) — refusing to guess a regex for it. Disclosed, not fixed.`);
    process.exit(3);
  }
  const newConv = {
    name: `${parsed.word ? parsed.word + " " : ""}<${parsed.numeralType}>${parsed.requiresPeriod ? "." : ""}`,
    ...parsed,
    foundIn: path.basename(bookPath), foundVia: "mechanical (skeleton recurrence + monotonic numeral)",
    dateFound: new Date().toISOString().slice(0, 10),
  };
  // Every member of the group must actually re-parse to this SAME shape —
  // the numeral being monotonic doesn't by itself guarantee every sibling
  // line has the identical word/period shape the first one happened to.
  const consistent = t2.group.members.every((m) => {
    const p = deriveConvention(m.text);
    return p && p.word === newConv.word && p.numeralType === newConv.numeralType && p.requiresPeriod === newConv.requiresPeriod && p.titleOnSameLine === newConv.titleOnSameLine && p.numeralCase === newConv.numeralCase;
  });
  if (!consistent) {
    console.log("The group's own members do not all parse to the same shape — refusing rather than deriving from one member alone.");
    process.exit(3);
  }
  if (!lib.conventions.some((c) => c.word === newConv.word && c.numeralType === newConv.numeralType && c.requiresPeriod === newConv.requiresPeriod && Boolean(c.titleOnSameLine) === Boolean(newConv.titleOnSameLine) && c.numeralCase === newConv.numeralCase)) {
    lib.conventions.push(newConv);
    saveLibrary(lib);
    console.log(`Appended new convention to heading-conventions.json: ${JSON.stringify(newConv)}`);
  } else {
    console.log("This exact convention is already in the library (tier 1 should have caught it — worth checking why it didn't).");
  }
  process.exit(0);
}

console.log("No monotonic numeral in this group — ambiguous. Escalating to tier 3 (model witness).");
const verdict = await tier3(t2.group);
console.log(`TIER 3: forward=${verdict.a1 ?? "unreadable"} reversed=${verdict.a2 ?? "unreadable"} -> ${verdict.verdict}`);
if (verdict.verdict === "structural — confirmed") {
  // Confirmed structural, but tier 2 found no monotonic numeral — this is
  // now read as `deriveConvention`'s own "none" shape (a literal marker,
  // ordinals assigned by document order) rather than refused outright.
  // The model's OWN confirmation is what licenses accepting a numeral-less
  // convention here — deriveConvention's "none" branch has no way on its
  // own to tell a real recurring marker from a recurring refrain, and this
  // is the one place that independent check has actually been done.
  const parsed = deriveConvention(t2.group.members[0].text);
  if (!parsed || parsed.numeralType !== "none") {
    console.log(`Could not read the sample line ("${t2.group.members[0].text}") as a literal, numeral-less marker either — refusing to guess. Disclosed, not fixed.`);
    process.exit(3);
  }
  const consistent = t2.group.members.every((m) => {
    const p = deriveConvention(m.text);
    return p && p.word === parsed.word && p.numeralType === parsed.numeralType && p.requiresPeriod === parsed.requiresPeriod;
  });
  if (!consistent) {
    console.log("The group's own members do not all parse to the same literal marker — refusing rather than deriving from one member alone.");
    process.exit(3);
  }
  const newConv = {
    name: `"${parsed.word}" (no numeral)${parsed.requiresPeriod ? "." : ""}`,
    ...parsed,
    foundIn: path.basename(bookPath),
    foundVia: "model witness (tier 3, confirmed structural, no numeral — ordinals assigned by document order)",
    dateFound: new Date().toISOString().slice(0, 10),
  };
  if (!lib.conventions.some((c) => c.word === newConv.word && c.numeralType === "none" && c.requiresPeriod === newConv.requiresPeriod)) {
    lib.conventions.push(newConv);
    saveLibrary(lib);
    console.log(`Appended new convention to heading-conventions.json: ${JSON.stringify(newConv)}`);
  } else {
    console.log("This exact convention is already in the library (tier 1 should have caught it — worth checking why it didn't).");
  }
  process.exit(0);
} else {
  console.log("Refusing to assert a structural convention for this document.");
}
}
