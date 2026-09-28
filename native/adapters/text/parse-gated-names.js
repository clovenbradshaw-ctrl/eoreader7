// adapters/text/parse-gated-names.js — proper-name candidate admission with
// the per-occurrence SVO parse as the GATE and capitalisation as
// CORROBORATION, not a coequal vote.
//
// THE GAP THIS CLOSES. Measured 2026-09-23 on a 365-item, 9-annotator blind
// gold for Henry IV Part 1 (modern spelling): the two detectors this repo
// already had for "is this word a name" — surfaces.js's `extractSurfaces`
// (a capitalised-run scan; imports only deriveAbbreviations and
// NEVER_A_NAME/HONORIFIC_TITLES, never a parser) and existence-grain.js's
// naming signal (also `R.cased && e.capP < ALPHA`, its own separate
// capitalisation-significance test) — are BOTH orthography-only. Neither
// reads the material's own SVO structure. The one detector that does,
// `english-parser.js`'s per-sentence dependency tagger read via
// `upostOccurrences`, already outperformed both on F1 (67.4 vs 55.1 and
// 63.7) used alone. Confirmed by the user's own read of the code: "we have
// to go through SVO for English to get there" (to the cube) — checked, not
// assumed, and it was right in a stronger way than stated: two of five
// candidate detectors did not touch the parse AT ALL, not just weight it
// too lightly.
//
// THE RULE, and why it is this rule and not a plausible-sounding one.
// Nine admission formulas were scored against the same gold before this
// one was picked (existence-grain's own naming signal AND-gated with the
// parse actually CRATERED recall to 43.2%, because it compounds two
// already-conservative gates):
//   parse-any (>=1 occurrence PROPN) alone ................ F1 70.5
//   parse-majority (>=0.5 of occurrences PROPN) alone ...... F1 67.4
//   parse-any AND capitalised (surfaces.js run) ............ F1 77.5  <- this rule
//   parse-majority OR (parse-any AND capitalised) .......... F1 70.7
//   parse-any AND existence-grain's own naming/Entity ...... F1 55.6
//   parse-any AND (existence-grain OR capitalised) ......... F1 77.4
//   best PRE-EXISTING combination (no parse gate at all) ... F1 76.3
// "parse-any AND capitalised" won: precision 69.4%, recall 87.7%, F1 77.5
// — the best of everything tried, including the best combination of the
// OLD orthography-only detectors. A single real syntactic PROPN reading is
// enough to license (majority-of-occurrences is stricter and scores
// worse); capitalisation stays required as independent corroboration, so
// a parser mistake tagging a stray lowercase function word PROPN once
// cannot admit it alone.
//
// WIRED, not standalone. The rule this file measured is reimplemented
// inline in recursive.js's createCausalTextPerceiver (its own `parseModel`
// option, `synPropnSeen` accumulator, folded incrementally one sentence at
// a time rather than calling this file's batch entry point) and is ON BY
// DEFAULT in production: proxy-runner.mjs::createSessionReader sets
// `parseModel = process.env.ER7_PARSE_GATED_NAMES !== "0" ?
// getEnglishParserModel() : null`, and that reader is what runProxyTurn
// (proxy.mjs's live POST /v1/chat/completions handler) actually
// instantiates per session. `parseGatedNames` itself (the function this
// file exports) stays a standalone entry point used only by its own test
// and by callers who want the batch shape — recursive.js does not call it
// directly, but both it and recursive.js's inline gate now share ONE
// primitive, `synPropnFormsForSentences` below, so the two can no longer
// silently diverge on sentence boundaries the way they did until
// 2026-09-28 (see that function's own header for the bug this closed).
//
// PARTICULAR TO ENGLISH, named rather than assumed: `model` is
// english-parser.js's trained UD parser for English (parser-eng-ewt.json).
// A caseless script or a language without this repo's own trained parser
// has no parse to gate with — surfaces.js's capitalisation scan (or its
// own script's Entity/Kind cues) remains what runs for it.

import { splitSentences } from "./spans.js";
import { extractSurfaces } from "./surfaces.js";
import { tokenize as engTokenize, analyse as engAnalyse } from "./english-parser.js";

const WORD = /\p{L}[\p{L}'’]*/gu;

/**
 * synPropnFormsForSentences(model, sentences) — every lowercase form the
 * material's own per-sentence parse tags PROPN at least once, across the
 * given sentence TEXTS (plain strings, already split by the caller's own
 * sentence boundaries).
 *
 * THE ONE SHARED PRIMITIVE behind both `parseGatedNames` below and
 * recursive.js's incremental per-sentence fold — deliberately taking
 * already-split sentence strings rather than re-splitting `text` itself,
 * because re-splitting was the bug: until 2026-09-28 this file called
 * english-parser.js's own `upostOccurrences(model, text)`, which re-splits
 * sentences internally via that file's ICU-based `sentences()` — a DIFFERENT
 * splitter than spans.js::splitSentences, which recursive.js's inline gate
 * (and this file's own `extractSurfaces` call, two lines below) already
 * used. The two splitters demonstrably disagree on exactly the name-initial
 * abbreviation cases spans.js was built to fix: ICU's sentence segmenter
 * treats "Ulysses S." as ending a sentence, splitting "The letter was
 * signed by Ulysses S. Grant himself." into "...Ulysses S." + "Grant
 * himself." — and the fragment "Grant himself." tags "Grant" differently
 * than the material's own real sentence does, so the OLD `upostOccurrences`
 * path never admitted "Grant" at all while recursive.js's inline gate,
 * reading the SAME text through spans.js's abbreviation-aware split,
 * correctly did. Reproduced live against the real trained model
 * (parser-eng-ewt.json) and pinned in parse-gated-names.test.mjs.
 *
 * A sentence the parser can't tokenise or tag never blocks the read (the
 * same typed-degradation discipline recursive.js's own try/catch already
 * followed) — it just contributes no evidence for that sentence.
 */
export function synPropnFormsForSentences(model, sentences) {
  const forms = new Set();
  for (const text of sentences) {
    try {
      const toks = engTokenize(text);
      const rows = engAnalyse(model, toks.map((t) => t.form));
      for (const r of rows) if (r.upos === "PROPN") forms.add(r.form.toLowerCase());
    } catch {}
  }
  return forms;
}

/**
 * parseGatedNames(text, {model, sentenceOpts, surfaceOpts}) —
 *
 * `model` a loaded english-parser.js model (loadModel(json)), REQUIRED.
 *
 * Returns:
 *   admitted  Set<lowercased word> licensed by parse-any AND capitalised.
 *   evidence  Map<word, {capitalized, synPropn}> — the raw evidence behind
 *             every capitalised-run candidate, admitted or not, so a
 *             caller can see why one was refused.
 *   runs      surfaces.js's own capitalised-run candidates (multi-word
 *             surfaces like "Sir John Falstaff"), filtered to the runs
 *             where at least one constituent word is admitted — the
 *             shape a referent-discovery caller (discoverReferents)
 *             actually consumes, not bare isolated words.
 */
export function parseGatedNames(text, { model, sentenceOpts, surfaceOpts } = {}) {
  if (!model) throw new TypeError("parseGatedNames: a loaded english-parser.js model is required");
  const sents = splitSentences(text, sentenceOpts);
  const surfaceRuns = extractSurfaces(sents, surfaceOpts);
  const synPropnForms = synPropnFormsForSentences(model, sents.map((s) => s.text));

  const capitalizedWords = new Set();
  for (const r of surfaceRuns) for (const w of r.surface.toLowerCase().match(WORD) ?? []) capitalizedWords.add(w);

  const admitted = new Set();
  const evidence = new Map();
  for (const w of capitalizedWords) {
    const synPropn = synPropnForms.has(w);
    evidence.set(w, { capitalized: true, synPropn });
    if (synPropn) admitted.add(w);
  }

  const runs = surfaceRuns.filter((r) => (r.surface.toLowerCase().match(WORD) ?? []).some((w) => admitted.has(w)));
  return { admitted, evidence, runs };
}
