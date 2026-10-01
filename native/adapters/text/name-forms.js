// adapters/text/name-forms.js — Sullivan's third sense: WHICH MARKS ON A WRITTEN NAME LEAVE ITS REFERENT WHERE IT WAS. A name asked about with
// a clitic, a case ending or an elided article on it ("Anna's", "Annas", "l'Allemagne") is the same being as the bare name; a name with a
// plural on it ("the Smiths") is not. Which written marks do which is a fact about ONE language, learned from that language's own treebank,
// admitted only above the held-out score a swarm measured for it, stored with its giver — never typed here.
// Handle: Sullivan — existence-grain.js is her first sense (which forms may leave the Void), morph-cues.js her second (what a mark says),
//   this her third (what a mark leaves alone). The ladder it shares with them is the one the house already holds: a table of ENDINGS, tallied
//   once from a received treebank with its ambiguity preserved (build-latin-case-prior.mjs, case-marked-language.js), a confidence floor the
//   CALLER owns (here: an operating point a swarm chose on a split it did not learn from — eval/lavar/sullivan-names.mjs), and a typed
//   refusal where the table has nothing to say.
//
// WHY THIS REPLACES A TYPED RULE. The first route for this (identity-routes.js, S137) held an ENGLISH object: "an apostrophe glyph, optional
// s, at the end of the token". That is a rule composed for the student, with the answer in it, and the next language would have been another
// object with another answer in it. morph-cues.js's header names the alternative: "a mark is learned from what reliably comes with it, not
// from a rule composed for the student." Nothing in this file knows what an apostrophe is. It knows how to count, in a treebank, what a
// written name's final characters come with, and to answer from the count.
//
// THE UNIT AND THE GOLD. The unit is the RAW WRITTEN WORD (between two spaces), because that is what a reader meets; the treebank's tokens
// are aligned back to the sentence's own `# text` (eval/lavar/lib/ud-name-words.mjs), where English UD's "Elena" + "'s" and German UD's
// "Annas" (lemma Anna) are both just a name with a mark on it. The gold is the treebank's own: an exponent is whatever the annotation says
// is glued to the stem or is the stem's form minus its lemma, and its CLASS is the annotation's too — a clitic or a case ending keeps the
// referent, a plural does not. No class is decided here.
//
// WHAT IS LEARNED. For every ending of 1..maxK characters of a name word, the distribution over labels: "<exponent>|<class>" or ∅ (nothing
// to remove). The same for beginnings (the elided article of a Romance name). A prediction asks the LONGEST ending that speaks — has seen
// enough (minCount) and agrees enough (minShare) — and answers what it says: strip this exponent, or leave the word alone. An ending that
// speaks "leave alone" outranks a shorter one that says strip (the most specific evidence wins; this is what keeps "Thomas" from losing its
// s to an ending that is a possessive everywhere else). If no ending speaks the answer is SILENCE, not a guess.
//
// THE OPERATING POINT IS A SWARM'S, NOT A HAND'S. minShare, minCount, minStem (the fewest characters a stem may keep), maxK and which
// classes keep the referent are searched by Wilson's gate (eval/lavar/swarm-gate.mjs) on a held-out DEV split with the harmonic mean of
// agreement and coverage as fitness — the contract sanskrit-swarm.mjs holds — and reported on a TEST split no one tuned on. The prior
// stores the chosen point beside its lineage and its scores; a caller may override any of it and say so.
//
// WHAT IT DOES NOT DO, STATED. It strips; it does not undo stem alternation (Finnish "Helsingissä" / "Helsinki": the lemma is not a prefix
// of the form), and it counts how much of a language's name inflection that leaves unexplained (`explains.other`). It reads the written
// word alone, never its sentence, so a German "-s" that is a genitive in one sentence and a name's own last letter in another is one ending
// with one share. It folds apostrophes and case before it counts, declared in `normalisation`, because U+2019 and U+0027 are one mark in
// every corpus this house holds.
//
// PURE. No I/O: a caller passes the parsed prior.
import { REQUIRED_PROVENANCE, BASES } from "./morph-cues.js";

export const SCHEMA = "NameFormPrior@1";
/** The label of a name word with nothing to remove. */
export const NONE = "∅";
/** The classes whose exponent leaves the referent where it was. A plural ("number") is a group, not the individual. */
export const PRESERVING = Object.freeze(["clitic", "case"]);
/** Typed reasons a fold is not built. */
export const GAPS = Object.freeze({
  NO_PRIOR: "no_name_form_prior",
  OTHER_LANGUAGE: "name_form_prior_for_another_language",
  BAD_PRIOR: "name_form_prior_refused",
});

/** The marks a corpus writes as one apostrophe. Folded before counting and before asking. */
const APOSTROPHES = /[’ʼ‘`´]/g;
/** foldWord(s) — NFC, apostrophes to U+0027, lower case. Declared in the prior's `normalisation`; the counts and the asking share it. */
export const foldWord = (s) => String(s ?? "").normalize("NFC").replace(APOSTROPHES, "'").toLowerCase();
export const NORMALISATION = Object.freeze({ nfc: true, lowercase: true, apostrophes: "U+2019 U+02BC U+2018 U+0060 U+00B4 folded to U+0027" });

const cp = (s) => Array.from(s);
const lastN = (cps, n) => cps.slice(cps.length - n).join("");
const firstN = (cps, n) => cps.slice(0, n).join("");

// ── THE TABLE ─────────────────────────────────────────────────────────────

/**
 * tallyForms(rows, { maxK }) → { suffix, prefix, words } — the ending and beginning tables of a set of gold rows.
 * rows: [{ word, suffix, klass, prefix, prefixKlass }] (eval/lavar/lib/ud-name-words.mjs's nameWords). A row the gold could not read
 * (`other`) is not a row here. Each table maps an ending (1..maxK code points, word-internal only: a word must be longer than the key) to
 * { label → count }.
 */
export function tallyForms(rows, { maxK = 4 } = {}) {
  const suffix = new Map(), prefix = new Map();
  const bump = (T, key, label) => { let m = T.get(key); if (!m) T.set(key, (m = new Map())); m.set(label, (m.get(label) ?? 0) + 1); };
  let words = 0;
  for (const r of rows) {
    if (r.other) continue;
    words += 1;
    const w = cp(foldWord(r.word));
    const sl = r.suffix ? `${foldWord(r.suffix)}|${r.klass}` : NONE;
    const pl = r.prefix ? `${foldWord(r.prefix)}|${r.prefixKlass}` : NONE;
    for (let k = 1; k <= Math.min(maxK, w.length - 1); k += 1) { bump(suffix, lastN(w, k), sl); bump(prefix, firstN(w, k), pl); }
  }
  return { suffix, prefix, words };
}

/** What a distribution says at an operating point: nothing (does not speak), "leave alone", or "strip x". */
export function speak(dist, op) {
  if (!dist) return null;
  let n = 0, top = null, tn = -1;
  for (const [label, c] of dist) { n += c; if (c > tn || (c === tn && label < top)) { tn = c; top = label; } }
  if (n < op.minCount || tn / n < op.minShare) return null;
  if (top === NONE) return { kind: "none", n, share: tn / n };
  const bar = top.lastIndexOf("|");
  const exponent = top.slice(0, bar), klass = top.slice(bar + 1);
  if (!op.classes.includes(klass)) return { kind: "none", why: "class", klass, n, share: tn / n };
  return { kind: "strip", exponent, klass, n, share: tn / n };
}

const SIDES = Object.freeze({ suffix: { take: lastN, cut: (cps, x) => cps.slice(0, cps.length - cp(x).length), has: (w, x) => w.endsWith(x) }, prefix: { take: firstN, cut: (cps, x) => cps.slice(cp(x).length), has: (w, x) => w.startsWith(x) } });

/**
 * decide(table, word, side, op) → { stem, exponent, ending, share, n, silent } — the longest ending (or beginning) that speaks answers.
 * `table` is a Map ending → { label → n }, or a compiled rule map ending → verdict (see compile). `stem` is the FOLDED stem; the caller maps
 * it back onto the original characters (stripWord does).
 */
export function decide(table, word, side, op) {
  const S = SIDES[side];
  const cps = cp(foldWord(word));
  const compiled = table instanceof Map && table.__compiled === true;
  for (let k = Math.min(op.maxK, cps.length - 1); k >= 1; k -= 1) {
    const key = S.take(cps, k);
    const raw = table.get(key);
    if (!raw) continue;
    const v = compiled ? raw : speak(raw, op);
    if (!v) continue;
    if (v.kind === "none") return { stem: cps.join(""), exponent: "", ending: key, share: v.share, n: v.n, silent: false };
    const x = v.exponent;
    const folded = cps.join("");
    if (!S.has(folded, x)) return { stem: folded, exponent: "", ending: key, share: v.share, n: v.n, silent: false };
    const kept = S.cut(cps, x);
    if (kept.length < op.minStem) return { stem: folded, exponent: "", ending: key, share: v.share, n: v.n, silent: false, why: "stem" };
    return { stem: kept.join(""), exponent: x, ending: key, share: v.share, n: v.n, klass: v.klass, silent: false };
  }
  return { stem: cps.join(""), exponent: "", ending: null, share: null, n: 0, silent: true };
}

/**
 * foldedStem(word, tables, op) → the FOLDED stem the table (or a compiled rule map pair) leaves: the form the evaluation compares to the
 * gold's. stripWord answers the same question on the original characters; a test pins that the two agree.
 */
export function foldedStem(word, tables, op) {
  const cps = cp(foldWord(word));
  const s = decide(tables.suffix, word, "suffix", op), p = decide(tables.prefix, word, "prefix", op);
  const sx = s.exponent ? cp(s.exponent).length : 0, px = p.exponent ? cp(p.exponent).length : 0;
  const kept = cps.slice(px, cps.length - sx);
  return kept.length < op.minStem ? cps.join("") : kept.join("");
}

/**
 * compile(tables, op) → { suffix, prefix } — the table at an operating point, as the smallest rule list that answers every word the same
 * way: a key is kept only if its verdict differs from the verdict of the longest speaking shorter key under it (a key that repeats its
 * parent adds nothing), and a "leave alone" with nothing to override is dropped (silence says the same). Pure; the prior stores this, not
 * the tallies, so a browser loads kilobytes, not the treebank's whole ending table.
 */
export function compile(tables, op) {
  const out = {};
  for (const side of ["suffix", "prefix"]) {
    const T = tables[side];
    // only the keys decide() will ever look up: it reads at most op.maxK characters, so a longer key in a table tallied wider is not a rule
    const speaking = [...T].filter(([key]) => cp(key).length <= op.maxK).map(([key, dist]) => [key, speak(dist, op)]).filter(([, v]) => v).sort((a, b) => cp(a[0]).length - cp(b[0]).length || (a[0] < b[0] ? -1 : 1));
    const verdictOf = new Map(speaking);
    const rules = [];
    const same = (a, b) => (a?.kind ?? "none") === (b?.kind ?? "none") && (a?.exponent ?? "") === (b?.exponent ?? "");
    for (const [key, v] of speaking) {
      const k = cp(key);
      let parent = null;
      for (let j = k.length - 1; j >= 1; j -= 1) {
        const pk = side === "suffix" ? lastN(k, j) : firstN(k, j);
        if (verdictOf.has(pk)) { parent = verdictOf.get(pk); break; }
      }
      if (same(v, parent)) continue;
      rules.push({ ending: key, kind: v.kind, exponent: v.exponent ?? null, class: v.klass ?? v.why ?? null, share: +v.share.toFixed(4), n: v.n });
    }
    out[side] = rules.sort((a, b) => cp(b.ending).length - cp(a.ending).length || (a.ending < b.ending ? -1 : 1));
  }
  return out;
}

/** The compiled rules as the Map decide() reads. */
export function ruleMap(rules) {
  const m = new Map();
  for (const r of rules) m.set(r.ending, r.kind === "strip" ? { kind: "strip", exponent: r.exponent, klass: r.class, n: r.n, share: r.share } : { kind: "none", n: r.n, share: r.share });
  m.__compiled = true;
  return m;
}

// ── THE PRIOR ─────────────────────────────────────────────────────────────

/**
 * nameFormsFromPrior(raw) → loaded — validates and indexes a NameFormPrior@1. Refused, as morph-cues.js refuses, unless it names its giver,
 * period, region, register, script, license and source and says each one's basis, and its language and stage; and refused unless it holds
 * an operating point with its scores (a table with no measured point is a rule from nowhere).
 */
export function nameFormsFromPrior(raw) {
  if (raw?.schema !== SCHEMA) throw new TypeError(`nameFormsFromPrior: unknown schema ${raw?.schema}`);
  const p = raw.provenance ?? {};
  for (const k of REQUIRED_PROVENANCE) {
    const v = p[k];
    const said = v && typeof v === "object" ? v.value : v;
    if (said == null || said === "") throw new TypeError(`nameFormsFromPrior: a prior must name its ${k} — a convention without a ${k} is a rule from nowhere`);
    if (v && typeof v === "object" && !BASES.includes(v.basis)) throw new TypeError(`nameFormsFromPrior: ${k} must say its basis (${BASES.join(" | ")})`);
  }
  if (!raw.language?.iso || !raw.language?.stage) throw new TypeError("nameFormsFromPrior: a prior must name its language — ISO code and stage");
  const op = raw.operatingPoint;
  if (!op || !Number.isFinite(op.minShare) || !Number.isFinite(op.minCount) || !Number.isFinite(op.minStem) || !Number.isFinite(op.maxK) || !Array.isArray(op.classes)) {
    throw new TypeError("nameFormsFromPrior: a prior must hold its operating point (minShare, minCount, minStem, maxK, classes)");
  }
  if (!op.heldOut?.dev || !op.heldOut?.test) throw new TypeError("nameFormsFromPrior: an operating point must carry its held-out dev and test scores — a point nobody measured is not an operating point");
  return Object.freeze({
    language: raw.language, provenance: p, operatingPoint: op, explains: raw.explains ?? null,
    rules: Object.freeze({ suffix: ruleMap(raw.suffixRules ?? []), prefix: ruleMap(raw.prefixRules ?? []) }),
    suffixRules: raw.suffixRules ?? [], prefixRules: raw.prefixRules ?? [],
  });
}

/**
 * stripWord(word, loaded, override, sides) → { stem, suffix, prefix, silent } — the word with the learned marks removed, on the ORIGINAL
 * characters (case and apostrophe style kept). `sides` says which ends may lose a mark (default both). `silent` is true when no ending or
 * beginning spoke. A mark is cut only if the original's own tail folds to the exponent the rule names, so a length-changing lower-casing
 * can never cut the wrong characters.
 */
export function stripWord(word, loaded, override = {}, sides = ["suffix", "prefix"]) {
  // `isNumeral` is the consumer's: a stem below the floor is allowed when it is a numeral that indexes the name ("Charles I's"). It is asked of the
  // ORIGINAL characters here — a numeral is written in capitals, and decide() sees only the folded word — so decide() runs with no floor and the
  // floor is applied below, once, to the stem both edges leave.
  const { isNumeral = null, ...rest } = override;
  const op = { ...loaded.operatingPoint, ...rest };
  const noFloor = { ...op, minStem: 1 };
  const orig = cp(String(word ?? "").normalize("NFC"));
  const s = sides.includes("suffix") ? decide(loaded.rules.suffix, word, "suffix", noFloor) : { exponent: "", silent: true };
  const p = sides.includes("prefix") ? decide(loaded.rules.prefix, word, "prefix", noFloor) : { exponent: "", silent: true };
  let sx = s.exponent ? cp(s.exponent).length : 0, px = p.exponent ? cp(p.exponent).length : 0;
  if (sx && foldWord(orig.slice(orig.length - sx).join("")) !== s.exponent) sx = 0;
  if (px && foldWord(orig.slice(0, px).join("")) !== p.exponent) px = 0;
  const kept = orig.slice(px, orig.length - sx);
  // never strip a word down past the stem floor, unless what is left is a numeral
  if (kept.length < op.minStem && !(typeof isNumeral === "function" && kept.length && isNumeral(kept.join("")))) return { stem: orig.join(""), suffix: "", prefix: "", silent: s.silent && p.silent };
  return { stem: kept.join(""), suffix: sx ? s.exponent : "", prefix: px ? p.exponent : "", silent: s.silent && p.silent };
}

/**
 * nameFoldFromPrior(loaded, override) → (name) => string — the fold a referent index takes as `surfaceFold`: the suffix mark comes off the
 * LAST word of the name and the prefix mark off the FIRST (a phrase takes its enclitic at its right edge and its proclitic at its left;
 * a mark inside a name is part of how that name is written, and folding it joined "Dante" to "Dante's Inferno"). A one-word name may lose
 * both. Whitespace is kept exactly.
 */
export function nameFoldFromPrior(loaded, override = {}) {
  return (name) => {
    const text = String(name ?? "");
    const parts = text.split(/(\s+)/);
    const words = [];
    parts.forEach((x, i) => { if (x && !/^\s+$/.test(x)) words.push(i); });
    if (!words.length) return text;
    const first = words[0], last = words[words.length - 1];
    if (first === last) { parts[first] = stripWord(parts[first], loaded, override).stem; return parts.join(""); }
    parts[first] = stripWord(parts[first], loaded, override, ["prefix"]).stem;
    parts[last] = stripWord(parts[last], loaded, override, ["suffix"]).stem;
    return parts.join("");
  };
}

/**
 * nameFormRoute({ language, prior }) → { fold, prior, gap } — what a caller builds a route from. `fold` is null, with a typed gap, when
 * there is no prior, the prior is for another language, or it is refused: the index is then byte-identical, and the gap says why.
 * Sullivan: a mark's meaning is earned per language, and nothing here assumes it transfers.
 */
export function nameFormRoute({ language = null, prior = null, override = {} } = {}) {
  if (prior == null) return { fold: null, prior: null, gap: { type: GAPS.NO_PRIOR, detail: `no NameFormPrior@1 supplied for ${language ?? "an undeclared language"}` } };
  let loaded;
  try { loaded = nameFormsFromPrior(prior); } catch (e) { return { fold: null, prior: null, gap: { type: GAPS.BAD_PRIOR, detail: String(e?.message ?? e) } }; }
  const want = String(language ?? "").toLowerCase();
  const ids = [loaded.language.iso, loaded.language.bcp47].filter(Boolean).map((x) => String(x).toLowerCase());
  if (want && !ids.includes(want)) {
    return { fold: null, prior: loaded, gap: { type: GAPS.OTHER_LANGUAGE, detail: `the prior is for ${ids.join("/")} (${loaded.language.name ?? ""}); the material is declared ${language}` } };
  }
  return { fold: nameFoldFromPrior(loaded, override), prior: loaded, gap: null };
}
