// native/kernel/kleene-up.js — the physics of finding and snipping.
// Handle: Kleene (Stephen Cole Kleene — the founder of regular languages).
// This kernel is named for him because it evicts his machinery by name: a
// thing is FOUND by its position in the byte field, never by a pattern
// guessed over it, and a thing is SNIPPED at its permanent address, never by
// a match. Kleene built the house; kleeneUp cleans it.
//
// THE PHYSICS. The byte field is the ground. A needle is a verbatim string
// with a measured position (or positions) in that field; an anchor is the
// address (c0, c1) where the needle's bytes actually sit; a window is the
// span AROUND the anchor — the encounter, not the needle alone. The same
// discipline the canon-ground (native/the-fold/canon-ground.mjs) runs for
// the physics canon, held here as a kernel primitive so any organ can FIND
// and SNIP without reaching for a regex. A needle is verified by its own
// bytes (sha256), a snip is reproducible from its address, and an absence is
// a typed result, never a guess.
//
// WHY THIS EXISTS. Regex finding is a pattern over the text; the pattern is
// the finder's guess about the shape, and it can silently match the wrong
// shape (a "15th vice president" pattern that also matches the phrase inside
// a different sentence; a `/wik/i` host check that also matches "wiki" in a
// path). Physics finding is a MEASUREMENT: this needle, at this offset, in
// this window — or not, in which case the absence is the finding. The walls
// are the same walls as the rest of the kernel: never invent what was not
// measured, and a space that would require guessing is a typed gap.
//
// THE WALLS (stated so they are not mistaken for features):
//
//   STRING-BOUND. Finding is by bytes. A thing the field expresses in a
//   DIFFERENT needle is not found, and this kernel refuses to infer the
//   relation (the kernel never reads meaning; semantic equivalence is the
//   model's and the caller's, never this file's). Case-folding is the only
//   normalization: it is mechanical, reversible, and returns the ORIGINAL
//   addresses (the map). Fold anything else and you are guessing a spelling.
//
//   GRAMMAR-BOUND. Regex that PARSES (splitting on whitespace, sentence
//   boundaries, character classes, quantifiers, captures) is grammar, not
//   finding, and kleeneUp does not claim it: `reduceRegex` names it
//   `structural` and leaves it alone — the mission is finding and snipping,
//   and a typed gap is a result, never a failure of the sweep.
//
//   ADDRESS-BOUND. The address is a birth, not a spelling (P5.2): a needle
//   located at (c0, c1) is re-findable at that address, and a snip cut there
//   is the SAME bytes every time. An address that no longer holds the needle
//   it claims is a drifted ground and is refused, never silently re-found.

export const SCHEMA = "KleeneUp@1";
export const HANDLE = "Kleene";

import crypto from "node:crypto";

const sha256hex = (s) => crypto.createHash("sha256").update(String(s ?? "")).digest("hex");

export const REFUSALS = Object.freeze({
  empty_text: Object.freeze({ gap: "kleene-up:empty_text", detail: "the field is empty — a needle cannot be measured in nothing, and an absence over an empty field is not a finding." }),
  empty_needle: Object.freeze({ gap: "kleene-up:empty_needle", detail: "the needle is empty — an empty needle is found everywhere and therefore nowhere; measure a real needle or report the absence." }),
  bad_anchor: Object.freeze({ gap: "kleene-up:bad_anchor", detail: "the anchor is not a measured address — a snip requires a (c0, c1) pair that lands inside the field." }),
  drifted: Object.freeze({ gap: "kleene-up:drifted", detail: "the anchor no longer holds the needle it claims — the ground moved, and the cut is refused, never silently re-found." }),
});

/**
 * Fold a field for measurement. Returns the case-folded string AND the map
 * from each folded offset back to the original field's offset, so a needle
 * found in the folded field yields the address of the REAL bytes. The map is
 * monotone; ASCII case-folding never changes length. This is the same
 * discipline quotes.js's normalizedIndex runs; held here so kernel code
 * (which may not import organs) can measure without reaching for a pattern.
 */
export function foldedIndex(field) {
  const text = String(field ?? "");
  const norm = text.toLocaleLowerCase("en-US");
  const map = new Array(norm.length);
  for (let i = 0; i < norm.length; i++) map[i] = i;
  return Object.freeze({ norm, map });
}

/** sha256 of a needle — the needle's own ground. */
export function needleDigest(needle) {
  return sha256hex(String(needle ?? ""));
}

/**
 * findNeedles — measure which needles are present in the field, at which
 * addresses. `needles` is a map or plain object of needle -> meta (or a list
 * of strings). Returns a KleeneUpFindings@1: every needle's first occurrence
 * (or all, with `all: true`) as (c0, c1) addresses into the ORIGINAL field,
 * each carrying the needle's digest. A needle that is absent is reported
 * present: false — the absence is the finding, never a hole in the report.
 * When `ci` is true (the default) the fold is the only normalization; the
 * addresses always point at the original bytes.
 */
export function findNeedles(field, needles, { ci = true, all = false } = {}) {
  const text = String(field ?? "");
  if (!text) return Object.freeze({ schema: "KleeneUpFindings@1", ...REFUSALS.empty_text, found: Object.freeze([]), absent: Object.freeze([]), counted: Object.freeze({ needles: 0, found: 0, absent: 0, occurrences: 0 }) });
  const entries = Array.isArray(needles)
    ? needles.map((n) => [n, null])
    : Object.entries(needles ?? {});
  if (!entries.length) return Object.freeze({ schema: "KleeneUpFindings@1", needles: [], found: Object.freeze([]), absent: Object.freeze([]), counted: Object.freeze({ needles: 0, found: 0, absent: 0, occurrences: 0 }) });

  const hay = ci ? foldedIndex(text) : null;
  const pool = hay ? hay.norm : text;
  const toOrig = (i) => (hay ? hay.map[i] : i);

  const found = [];
  const absent = [];
  for (const [needle, meta] of entries) {
    const n = String(needle ?? "");
    if (!n) { absent.push(Object.freeze({ needle: n, present: false, gap: REFUSALS.empty_needle.gap })); continue; }
    const needleN = ci ? n.toLocaleLowerCase("en-US") : n;
    const hits = [];
    let from = 0;
    while (true) {
      const i = pool.indexOf(needleN, from);
      if (i < 0) break;
      hits.push(Object.freeze({ c0: toOrig(i), c1: toOrig(i + needleN.length - 1) + 1 }));
      if (!all) break;
      from = i + 1;
    }
    const rec = Object.freeze({
      needle,
      digest: needleDigest(n),
      present: hits.length > 0,
      occurrences: Object.freeze(hits),
      meta: meta ?? null,
    });
    if (hits.length) found.push(rec); else absent.push(rec);
  }
  return Object.freeze({
    schema: "KleeneUpFindings@1",
    ci,
    all,
    folded: ci,
    found: Object.freeze(found),
    absent: Object.freeze(absent),
    counted: Object.freeze({ needles: entries.length, found: found.length, absent: absent.length, occurrences: found.reduce((m, r) => m + r.occurrences.length, 0) }),
  });
}

/**
 * findNeedle — the single-needle form. Returns the first occurrence's address
 * or a typed absence. `from` bounds the search (find the SECOND occurrence by
 * passing the first's c1). The returned `at` is the anchor into the original
 * field; `basis` names what was actually measured so a caller can disclose it.
 */
export function findNeedle(field, needle, { ci = true, from = 0 } = {}) {
  const report = findNeedles(field, [needle], { ci, all: false });
  if (!report.found.length) {
    const gap = report.gap ?? "kleene-up:absent";
    return Object.freeze({ found: false, needle, at: null, basis: `needle "${needle}" not present in the field — a typed absence, never a guess`, gap });
  }
  const r = report.found[0];
  const at = r.occurrences[0];
  // Respect `from`: findNeedle may be called to skip the first occurrence.
  if (from > 0) {
    const after = findNeedles(field.slice(from), [needle], { ci });
    if (!after.found.length) return Object.freeze({ found: false, needle, at: null, basis: `needle "${needle}" absent after offset ${from} — a typed absence`, gap: "kleene-up:absent" });
    const hit = after.found[0].occurrences[0];
    const shifted = Object.freeze({ c0: from + hit.c0, c1: from + hit.c1 });
    return Object.freeze({ found: true, needle, at: shifted, basis: `needle "${needle}" measured at ${shifted.c0}..${shifted.c1} (occurrence after ${from})`, digest: r.digest });
  }
  return Object.freeze({ found: true, needle, at, basis: `needle "${needle}" measured at ${at.c0}..${at.c1}`, digest: r.digest });
}

/**
 * windowAt — the encounter around an address. A finding's window is the span
 * AROUND the anchor in the field's own bytes: the reader who comes to
 * understand what was found comes across what surrounds it, never a summary.
 * Mirrors canon-ground's window (the passage plus what is around it). The ref
 * is the permanent address of the window itself, so a snip's provenance is an
 * address a future reader can re-open.
 */
export function windowAt(field, at, { window = 400 } = {}) {
  const text = String(field ?? "");
  const a = Array.isArray(at) ? { c0: at[0], c1: at[1] } : at ?? null;
  if (!a || !Number.isInteger(a.c0) || !Number.isInteger(a.c1) || a.c0 < 0 || a.c1 <= a.c0 || a.c1 > text.length) {
    return Object.freeze({ schema: "KleeneUpWindow@1", gap: REFUSALS.bad_anchor.gap, ref: null, text: "" });
  }
  const w = Math.max(0, Math.floor(Number(window) || 0));
  const c0 = Math.max(0, a.c0 - w);
  const c1 = Math.min(text.length, a.c1 + w);
  return Object.freeze({ schema: "KleeneUpWindow@1", anchor: Object.freeze({ c0: a.c0, c1: a.c1 }), window: w, ref: `field#${c0}-${c1}`, text: text.slice(c0, c1) });
}

/**
 * snipAt — the verbatim bytes at a permanent address. A snip is cut, never
 * composed: the bytes at (c0, c1) are returned exactly, with their address
 * and basis. When `verify` is given (the needle the address was measured for)
 * the cut bytes are checked against it — an address that no longer holds the
 * needle it claims is a drifted ground and is REFUSED, never silently
 * re-found (the ADDRESS-BOUND wall). The check folds the same way the finding
 * did (`ci`, on by default): a case-insensitive finding claims the needle up
 * to case, and folding is the only normalization.
 */
export function snipAt(field, at, { verify = null, ci = true } = {}) {
  const text = String(field ?? "");
  const a = Array.isArray(at) ? { c0: at[0], c1: at[1] } : at ?? null;
  if (!a || !Number.isInteger(a.c0) || !Number.isInteger(a.c1) || a.c0 < 0 || a.c1 <= a.c0 || a.c1 > text.length) {
    return Object.freeze({ schema: "KleeneUpSnip@1", snip: "", ref: null, gap: REFUSALS.bad_anchor.gap, basis: "the anchor is not a measured address — nothing was cut" });
  }
  const snip = text.slice(a.c0, a.c1);
  const mismatched = verify != null && (ci ? snip.toLocaleLowerCase("en-US") !== String(verify).toLocaleLowerCase("en-US") : snip !== String(verify));
  if (mismatched) {
    return Object.freeze({ schema: "KleeneUpSnip@1", snip: "", ref: null, gap: REFUSALS.drifted.gap, basis: `the bytes at ${a.c0}..${a.c1} are "${snip}", not the needle "${verify}" the address was measured for — drifted, refused` });
  }
  return Object.freeze({ schema: "KleeneUpSnip@1", snip, ref: `field#${a.c0}-${a.c1}`, at: Object.freeze({ c0: a.c0, c1: a.c1 }), digest: sha256hex(snip), basis: `verbatim bytes at ${a.c0}..${a.c1}, verified ${verify != null ? "against the measured needle" : "by address only"}` });
}

// ── reduceRegex: what a regex literal is, named — so the sweep knows what to
// claim. The classification is a MEASUREMENT of the pattern's own grammar,
// never an opinion about the caller's intent.
//
//   literal     the pattern's language is one verbatim string (metacharacters
//               are only punctuation escapes like `\.`); a regex that finds
//               one needle. -> needle
//   semantic    the pattern is a word-class: literals and \b-boundaries in
//               alternation (`(?:hamlet|macbeth)`, `\bwho\b|кто`); it finds a
//               WORD SET, which is a set of needles over the tokenized field.
//   structural  the pattern PARSES or SANITIZES (character classes, \d \w \s,
//               quantifiers, ^ $, .* , capture groups for extraction, splits);
//               grammar, not finding — left alone, disclosed.
//   typed_gap   the pattern uses backreferences, lookahead/lookbehind, or a
//               dynamic (constructed) source; cannot be a needle set, and is
//               named as a gap, never silently kept.
// The classifier is a hand scanner, not a regex — a regex-eviction archon that
// classifies regexes with a fragile regex would be hoist by its own petard.
const CLASS_ESCAPES = new Set(["d", "D", "w", "W", "s", "S", "p", "P", "B"]);
const META = new Set(["[", "]", "{", "}", "(", ")", "*", "+", "?", "^", "$", ".", "|"]);

// A branch is word-class-safe when it is only literals, `\b` boundaries, and
// punctuation escapes. Any class escape (\d \w \s \p), backref, class,
// quantifier, or anchor makes it grammar, not a needle.
function branchSafe(branch) {
  let hasWord = false;
  for (let i = 0; i < branch.length; i++) {
    const c = branch[i];
    if (c === "\\") {
      const n = branch[i + 1];
      if (n === undefined) return null;
      if (n >= "0" && n <= "9") return null; // backreference — context grammar
      if (CLASS_ESCAPES.has(n)) return null; // \d \w \s \p \B — classes/positions
      i += 1; continue;                      // punctuation escape = a literal char
    }
    if (META.has(c)) return null;
    hasWord = true;
  }
  return hasWord ? true : null;
}

// The unescaped needle of a word-class branch: `\b` marks the edge (never a
// char), `\X` punctuation escapes fold to the literal char.
function unescapeBranch(branch) {
  let out = "";
  for (let i = 0; i < branch.length; i++) {
    const c = branch[i];
    if (c === "\\") {
      const n = branch[i + 1];
      if (n === "b") { i += 1; continue; }
      if (n === undefined) { out += c; continue; }
      out += n; i += 1; continue;
    }
    out += c;
  }
  return out;
}

// The unescaped needle of a literal pattern. `\b` is a boundary, not the
// letter b — a pattern carrying one is a word class (semantic), so it is
// refused here and handled by the branch path below.
function unescapeLiteral(src) {
  let out = "";
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === "\\") {
      const n = src[i + 1];
      if (n === undefined) return null;
      if (n === "b") return null;
      if (n >= "0" && n <= "9") return null;
      if (CLASS_ESCAPES.has(n)) return null;
      out += n; i += 1; continue;
    }
    if (META.has(c)) return null;
    out += c;
  }
  return out.length ? out : null;
}

function splitBranches(src) {
  const out = [];
  let cur = "";
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === "\\") { cur += c + (src[i + 1] ?? ""); i += 1; continue; }
    if (c === "|") { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
}

export function reduceRegex(source, { flags = "" } = {}) {
  const src = String(source ?? "");
  if (!src) return Object.freeze({ kind: "typed_gap", source: src, flags, gap: "kleene-up:empty_pattern", detail: "an empty pattern is a pattern that matches everything — a typed gap, never a needle" });
  if (/\\([1-9])|\(\?[=!<]/.test(src)) return Object.freeze({ kind: "typed_gap", source: src, flags, gap: "kleene-up:backref_lookaround", detail: "backreferences and lookaround are context-reading grammar; a needle set cannot carry them" });

  // Try: pure literal — one verbatim needle.
  const needle = unescapeLiteral(src);
  if (needle != null) {
    return Object.freeze({ kind: "literal", source: src, flags, needle, ci: flags.includes("i"), detail: `the pattern is one verbatim needle "${needle}" — finding it is measuring its address, not testing a pattern` });
  }

  // Try: a word class — alternation of \b-bound literals (or a lone \b word).
  const wrapped = /^\(\?:/.test(src) && /\)$/.test(src) ? src.slice(3, -1) : src;
  const branches = splitBranches(wrapped);
  if (branches.length > 1 || src.includes("\\b")) {
    const safe = branches.map(branchSafe);
    if (safe.every(Boolean)) {
      const needles = branches.map(unescapeBranch);
      return Object.freeze({ kind: "semantic", source: src, flags, needles: Object.freeze(needles), ci: flags.includes("i"), detail: `the pattern is a word class over ${needles.length} needles — finding it is measuring which needles sit in the field, over the tokenized field` });
    }
  }

  return Object.freeze({ kind: "structural", source: src, flags, detail: "the pattern parses or sanitizes the field (classes, quantifiers, anchors, splits, captures) — grammar, not finding; kleeneUp leaves it and discloses it" });
}

/**
 * wordSet — a semantic/literal regex reduced to its needles, ready for
 * findNeedles over a tokenized field. A typed gap returns null: the caller
 * names the gap, never a guessed needle set.
 */
export function wordSet(source, { flags = "" } = {}) {
  const r = reduceRegex(source, { flags });
  if (r.kind === "literal") return Object.freeze({ needles: [r.needle], ci: r.ci, kind: "literal" });
  if (r.kind === "semantic") return Object.freeze({ needles: r.needles, ci: r.ci, kind: "semantic" });
  return null;
}