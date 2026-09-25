// native/organs/claim-relevance.js — ONLY THE TOKENS THE SURF BELIEVES ARE
// RELEVANT (2026-09-25). The user, after cli/claude-code-recall.mjs's first
// cut surfaced this session's standing claims unconditionally up to a fixed
// cap: "we need to interrupt the prompting to not get ALL the tokens, only
// the ones the SURF believes are relevant." native/the-fold/surf.js itself
// is the web-FETCH stage and explicitly judges nothing ("stage 4 decides");
// the actual JUDGING doctrine this repo already has is
// native/the-fold/admission.js's: no hand-set constant, every cut MEASURED
// from the material against a null. This file applies that same doctrine to
// a different material — not essay prose, a session's own folded reasoning
// claims — to decide which of them are worth spending tokens on for a given
// prompt.
//
// FOUR THINGS WERE TRIED, IN ORDER, AGAINST REAL DATA, BEFORE THIS DESIGN —
// disclosed because each failure is a real, specific lesson for whoever
// next reaches for admission.js or a frequency measure here:
//
//  1. admission.js's own measureBondNull ("how much do two ARBITRARY
//     passages of this ground already bond"). Returned {max:1, mean:1,
//     pairs:0} against this session's own real claims: its distinctSentences
//     step (near-duplicate/containment collapse, tuned for chunk-boundary-
//     duplicated essay prose) folded a corpus of short, densely-related,
//     technical claim descriptions below its own N<3 floor. Every real
//     score (0.04–0.44) would have sat under that degenerate, unbeatable
//     ceiling forever — silence for every prompt, the opposite of the ask.
//  2. admission.js's own measureVariance, to at least strip stopwords
//     before scoring with raw bond(). Same root cause: it too routes
//     through distinctSentences with no way to bypass it, so it silently
//     returned an EMPTY variance set, and a bare "the" shared by one claim
//     and an unrelated prompt produced a nonzero score.
//  3. The same null formula measureVariance uses (N·(1−(1−1/N)^k)),
//     reimplemented directly over the CANDIDATE list (never routed through
//     distinctSentences). Better, but a binary variance/not-variance split
//     needs a word to repeat at least twice across the WHOLE set before it
//     can ever be flagged — and at turn-scale (3–20 short claims), "the"
//     very often occurs only once or twice purely because there is so
//     little text, not because it is rare.
//  4. Continuous IDF weighting over the SAME small candidate set (no binary
//     cut — every word contributes, scaled by rarity). Fixed the ranking
//     case (an "apple pie recipe" claim correctly outscored a bare "apple"
//     claim) but NOT the off-topic case at realistic session scale (10
//     claims): measured live, "the" sat in 4/10 candidate claims — common
//     enough that even continuous IDF could not separate it far enough
//     from a word appearing in 1/10 (idf 1.79 vs 2.71 — not a strong
//     enough ratio). No purely frequency-based measure over a FEW SHORT
//     PHRASES has enough data to reliably tell a coincidentally-frequent
//     function word from a genuinely-common content word; this is a
//     sample-size limit, not a formula defect.
//
// WHAT THIS FILE ACTUALLY USES: the SAME smoothed-IDF formula
// (idf(w) = ln((N+1)/(df(w)+1)) + 1), but measured against the SHARED,
// ALREADY-ACCUMULATED reasoning ledger (documents/eoreader7-reasoning:1
// .jsonl — every claim any session has ever declared) instead of the
// current turn's own handful of candidates. Measured live against the real
// ledger (2,903 real declared claims): df("the")=2136 (73%), df
// ("implements")=4 (0.14%) — idf 1.31 vs 7.36, a clean, load-bearing
// separation no small per-turn sample could produce. Reading and
// tokenizing the whole ledger cost ~110ms live — negligible against this
// hook's own 10s budget, so no truncation/sampling was needed; a future
// pass could cache it if the ledger grows enough for that to change,
// disclosed as a known, not-yet-necessary optimization. This is still a
// measured statistic of REAL, already-existing accumulated data, never a
// hand-picked stopword list — the same "no hand-set constant" doctrine,
// just given a large enough population to actually work at turn scale.
// Falls back to attempt 4's candidate-set-only IDF only when the ledger
// has fewer than 20 declared claims so far (a fresh install, or an
// isolated test with nothing seeded) — the same kind of structural
// data-sufficiency floor admission.js's own measureBondNull already draws
// at N<3, at a different scale for a differently-sized population.
//
// A FIFTH, DEEPER, DISCLOSED LIMIT (found building the test for #4-fixed):
// even with idf("the")=1.0 (the theoretical minimum, measured against a
// 202-line synthetic ledger where "the" is the ONLY word shared across
// every line), a genuinely off-topic prompt can still surface one or two
// claims whose entire overlap is that single common word. This is not a
// formula defect — it is a real, information-theoretic property of
// mean+SD admission over a candidate population that clusters at EXACT
// ZERO: any nonzero score, however tiny in absolute terms, looks like a
// statistical outlier relative to a population sitting at 0. Median+MAD
// and other robust-statistic alternatives were considered and have the
// identical failure mode when the robust center and spread are ALSO
// exactly zero (the common case here — most candidates share nothing at
// all with an off-topic prompt). The honestly testable, honestly
// documented bound this file provides is "never floods, never surfaces
// most of the candidate set" — not "always exactly empty for an
// off-topic prompt". This is still a large, real improvement over
// cli/claude-code-recall.mjs's prior behavior (up to 20 claims shown
// unconditionally, zero filtering) — see tests/claim-relevance.test.mjs's
// own adversarial test for the measured, disclosed bound this actually
// delivers.
import fs from "node:fs";
import { wordTokens } from "../the-fold/admission.js";
import { ledgerFile } from "../../cli/reasoning-ledger.mjs";

/** idf(w) = ln((N+1)/(df(w)+1)) + 1 (smoothed IDF) as a lookup function —
 *  a word absent from `df` (never seen in the reference population) reads
 *  as df=0, which this formula already scores as the MAXIMUM possible
 *  weight (the correct answer: never-seen is maximally distinguishing). */
function idfLookup(df, N) {
  return (w) => Math.log((N + 1) / ((df.get(w) ?? 0) + 1)) + 1;
}

/** Document frequency across the current CANDIDATE SET only — attempt 4
 *  above, kept as the fallback for when the shared ledger has too little
 *  history yet. */
function candidateDf(units, locale) {
  const df = new Map();
  for (const u of units) for (const w of new Set(wordTokens(u, locale))) df.set(w, (df.get(w) ?? 0) + 1);
  return { df, n: units.length };
}

const MIN_LEDGER_CLAIMS = 20;

/** Document frequency across the SHARED reasoning ledger — every
 *  "reasoning-claim" line any session has ever appended (see this file's
 *  own header for the measured numbers). Returns null (caller falls back
 *  to candidateDf) when the ledger is missing, unreadable, or has fewer
 *  than MIN_LEDGER_CLAIMS lines — not enough accumulated history for a
 *  background measurement to be more reliable than the candidate set
 *  itself. Reads via cli/reasoning-ledger.mjs's own ledgerFile() (respects
 *  EO_LEDGER_DIR for test isolation) rather than re-deriving the path. */
function ledgerDf(locale) {
  let file;
  try { file = ledgerFile(); } catch { return null; }
  let raw;
  try { raw = fs.readFileSync(file, "utf8"); } catch { return null; }
  const df = new Map();
  let n = 0;
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    if (obj.kind !== "reasoning-claim") continue;
    n++;
    const t = obj.said ?? obj.text ?? "";
    for (const w of new Set(wordTokens(t, locale))) df.set(w, (df.get(w) ?? 0) + 1);
  }
  return n >= MIN_LEDGER_CLAIMS ? { df, n } : null;
}

/** The share of `claimT`'s own vocabulary, WEIGHTED by rarity (idf),
 *  that also appears in `promptT`. Directional (like admission.js's own
 *  bond): asks how much of what the CLAIM says the prompt echoes, not the
 *  reverse — a short prompt with few content words should not be
 *  penalized for not containing every word a longer claim does. */
function weightedScore(claimT, promptT, idf, locale) {
  const claimWords = new Set(wordTokens(claimT, locale));
  const promptWords = new Set(wordTokens(promptT, locale));
  if (!claimWords.size) return 0;
  let hit = 0, total = 0;
  for (const w of claimWords) {
    const weight = idf(w);
    total += weight;
    if (promptWords.has(w)) hit += weight;
  }
  return total > 0 ? hit / total : 0;
}

/** A folded claim's plain-text surface — the same SVO string
 *  cli/claude-code-recall.mjs already renders per line. Exported so a
 *  caller with a differently-shaped candidate can still reuse the scoring
 *  below by pre-mapping to {subject,rel,object} or overriding via `text`. */
export function claimText(note) {
  return `${note?.subject ?? ""} ${note?.rel ?? ""} ${note?.object ?? ""}`.trim();
}

/**
 * relevantClaims(promptText, claims, { locale, text }) -> the subset of
 * `claims` whose IDF-weighted overlap with `promptText` clears this
 * candidate set's own measured ceiling (mean + 1 population SD of the
 * set's own scores — a real statistic of the population present, never a
 * hand-picked number), ranked highest-scoring first. `text(claim)`
 * overrides how a claim's surface text is derived (default: claimText
 * above). Fewer than 3 candidates: returns all of them, unfiltered (see
 * this file's own header for why).
 */
export function relevantClaims(promptText, claims, { locale = null, text = claimText } = {}) {
  const list = Array.isArray(claims) ? claims : [];
  if (list.length < 3) return list;
  const prompt = String(promptText ?? "");
  const bg = ledgerDf(locale);
  const { df, n } = bg ?? candidateDf(list.map(text), locale);
  const idf = idfLookup(df, n);
  const scored = list.map((c) => ({ claim: c, score: weightedScore(text(c), prompt, idf, locale) }));
  const count = scored.length;
  const mean = scored.reduce((s, x) => s + x.score, 0) / count;
  const sd = Math.sqrt(scored.reduce((s, x) => s + (x.score - mean) ** 2, 0) / count);
  const ceiling = mean + sd;
  return scored
    .filter((x) => x.score > ceiling)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.claim);
}
