// eoreader6 · perceiver/text/surfaces — candidate referent surfaces, and the
// structural (engine-tier) coreference between them. No word sets anywhere:
// every filter here is derived from the text's own statistics.
//
// SCOPE (Constitution II.13, script earning test): diaNorm below folds only
// the five Latin vowels' acute/grave/circumflex/umlaut diacritics (á/à/â/ä
// ... ú/ù/û/ü). It is disclosed-narrow, not script-agnostic: it does NOT
// fold ñ/ç/ø/å/æ/ß/š/ž/ł or any non-Latin-vowel diacritic, and it does not
// touch combining marks in scripts where they carry phonemic/grammatical
// content rather than accent decoration (Vietnamese tone marks, Hebrew
// niqqud, Arabic tashkil, Devanagari matras) — a blanket Unicode
// combining-mark strip was tried and reverted for exactly this reason: it
// silently claimed cross-script generality with no invariance fixture to
// back it, which II.13 names as the more severe failure than a disclosed
// narrow scope ("the silence is the more severe failure than the scope").
// Extending coverage requires a giver (II.2) for each script's own folding
// rule and a fixture proving it, not an algorithmic generalization.
//
// TIER DISCIPLINE — the load-bearing part, and the reason this file is small:
//   ENGINE tier (derivable, built here): NAME-variant coreference.
//     "Victor Frankenstein" ≈ "Frankenstein" ≈ "Victor" by containment or
//     shared final token. Structural, no witness needed.
//   MODEL tier (NOT derivable, reported as a typed gap): descriptor synonymy
//     ("the creature" ≈ "the wretch") and PRONOUN binding ("he" -> whom).
//     eoreader5's dead-ends log records distributional coref failing twice
//     (frame-level lift, sentence-level complementary distribution). It is not
//     retried here. A missing prior produces a gap, never a guessed number.
//
// Ported rather than reinvented (CLAUDE.md names each of these a
// consistently-reinvented wheel): diaNorm, namesCorefer, the cap/lower
// physics filter, and whole-word counting all come from eoreader5's
// presence.js / entity-fold.js.

import { deriveAbbreviations } from "./spans.js";
import { NEVER_A_NAME, HONORIFIC_TITLES } from "./priors.js";

const DIA_RE = /[áàâäéèêëíìîïóòôöúùûü]/g;
const DIA_TO = { á:"a",à:"a",â:"a",ä:"a",é:"e",è:"e",ê:"e",ë:"e",í:"i",ì:"i",î:"i",ï:"i",ó:"o",ò:"o",ô:"o",ö:"o",ú:"u",ù:"u",û:"u",ü:"u" };

export const diaNorm = (t) => String(t ?? "").toLowerCase().trim().replace(DIA_RE, (c) => DIA_TO[c]);

// The cell this organ occupies on the operator grid (engine/operators.js):
// SIG · Void · Tending — candidate referent surfaces, from the text's own
// statistics. Declared, checked by conformance.
export const CELL = Object.freeze({ op: "SIG", grain: "Ground" });

const rawTokensOf = (id) => diaNorm(id).split(/\s+/).filter((t) => t.length > 2);

// A morphological fold applied to each token before identity comparison:
// token -> (optionally folded) token. Absent, it is the identity — the fold
// never fires and behavior is byte-identical to today's token-identity
// coreference (English, whose proper nouns do not inflect for case, never
// sees a fold). A RECEIVED fold (a giver-named register, e.g. a treebank-
// derived ProperNounPrior) may map an inflected case-form to its lemma, so
// "Кутузову"/"Кутузовым" fold onto the same stem "Кутузов" and one being
// stops stranding across its case forms (the-fold
// eval/results/anaphora-ru-RESULTS.md). The fold is INJECTED by the caller,
// mirroring how morphology.js's lemmatizer arrives for actClosure — the
// adapter itself imports nothing (text-boundary conformance wall).
const tokensOf = (id, fold) => rawTokensOf(id).map(fold ?? ((t) => t));

// Exact match, or — when a declension folder is injected
// (adapters/text/declension.js::createDeclensionFolder, over a received,
// giver-named prior) — related by a licensed case transform in either
// direction. Deliberately pairwise, never a per-token canonical lemma: see
// declension.js's own header for why. `sameStem` omitted degrades every
// comparison below to plain `===`, byte-identical to before this existed.
const tokenEq = (x, y, sameStem) => x === y || (!!sameStem && (sameStem(x, y) || sameStem(y, x)));
const tokenSetContains = (from, into, sameStem) => from.every((t) => into.some((u) => tokenEq(t, u, sameStem)));

/**
 * Two NAMES corefer: containment, or a shared final token (surname). Two
 * independent wideners arrived the same week and COMPOSE rather than
 * compete — they answer different halves of "the same token":
 *
 *   `fold`     — a per-token normalizer applied BEFORE comparison (a
 *                giver-named morphological fold; identity when absent).
 *   `sameStem` — a pairwise relation consulted AT comparison (declension:
 *                "Кутузов"/"Кутузова" related by a licensed case
 *                transform; null degrades tokenEq to ===).
 *
 * Third argument: an options object `{ sameStem, fold }`, or — for the
 * callers that predate the merge — a bare function, read as `fold`.
 */
export const namesCorefer = (a, b, opts) => {
  const { sameStem = null, fold = null } = typeof opts === "function" ? { fold: opts } : (opts ?? {});
  const ta = tokensOf(a, fold);
  const tb = tokensOf(b, fold);
  if (!ta.length || !tb.length) return false;
  const subset = tokenSetContains(ta, tb, sameStem) || tokenSetContains(tb, ta, sameStem);
  return subset || tokenEq(ta[ta.length - 1], tb[tb.length - 1], sameStem);
};

// A capitalised RUN: consecutive capitalised tokens, which is what a
// multi-word name looks like from the outside. Sentence-initial position is
// recorded because a token there is capitalised by grammar, not by being a
// name — the ratio filter below needs to know the difference.
const CAP_TOKEN = /^[\p{Lu}][\p{L}'’]*$/u;
const LOWER_TOKEN = /^[\p{Ll}][\p{L}'’]*$/u;

// A one-sided 95% significance resolution — declared, the same standing as
// this codebase's other Born-gate quantiles (e.g. nul-adjacent 0.95
// thresholds elsewhere): a stated resolution for a statistical test, not a
// hand-picked bridge between unrelated scales (SEED.md's actual complaint).
const CAP_SIG_ALPHA = 0.05;

/**
 * The exact one-sided binomial tail, P(X >= k | n, p=0.5), computed in LOG
 * SPACE via the term-to-term recurrence log(p_j) = log(p_{j-1}) +
 * log(n-j+1) - log(j) (p_0 = 0.5^n), then log-sum-exp over j=k..n.
 *
 * Found live, not assumed: a normal approximation was the ORIGINAL
 * implementation here, and it is a poor fit exactly where this organ's own
 * docstring says the null matters most — a candidate "seen only a handful
 * of times." Measured on real material (live_priors' own UDHR corpus,
 * POLICIES.md LP13's amendment (was LP8; renumbered on that repo's merge)): Czech's own "Spojených" (United) — 4
 * capitalised, 1 lowercase, in the whole document — is refused by BOTH the
 * old approximation and this exact test (the true one-sided p-value at
 * n=5 is 0.1875, genuinely above 0.05; 4-of-5 is real-looking evidence
 * that is simply not enough of it), which is the honest reason to replace
 * the approximation with the exact answer rather than adjust a threshold
 * to admit that one specimen — an approximation and its exact target can
 * diverge in EITHER direction at low n, and only computing the real answer
 * tells you which. A direct real-space sum instead of this log-space one
 * would either overflow a factorial or underflow `0.5^n` to exactly zero
 * well before n reaches "seen thousands" (0.5^1075 is already smaller than
 * the smallest representable double) — log-space has no such ceiling, so
 * this is the exact answer at every scale this organ is ever handed, not
 * a hybrid with its own new threshold to justify.
 */
const logBinomialTailAtHalf = (k, n) => {
  if (k <= 0) return 0; // P(X >= 0) = 1, log(1) = 0
  if (k > n) return -Infinity; // impossible under n trials
  const logHalf = Math.log(0.5);
  let logTerm = n * logHalf; // log P(X = 0)
  let logMax = -Infinity;
  const kept = [];
  for (let j = 1; j <= n; j += 1) {
    logTerm = logTerm + Math.log(n - j + 1) - Math.log(j);
    if (j >= k) {
      kept.push(logTerm);
      if (logTerm > logMax) logMax = logTerm;
    }
  }
  let sumExp = 0;
  for (const lt of kept) sumExp += Math.exp(lt - logMax);
  return logMax + Math.log(sumExp);
};

/**
 * Is this candidate's non-initial capitalisation rate significant against
 * the null that capitalisation is a fair coin flip (p=0.5) unrelated to
 * namehood — the EXACT one-sided binomial tail at THIS candidate's own
 * (cap, lower) counts, never an approximation to it. Replaces a single
 * fixed ratio band shared by every word (formerly [0.8, 2.0], applied
 * uniformly regardless of how much evidence a given candidate actually
 * carried) with a bound that widens for a word seen only a handful of
 * times and tightens for one seen thousands: two occurrences split evenly
 * can never clear it (not enough evidence either way), where the same
 * split at high volume would.
 */
const capitalisationIsSignificant = (cap, lower) => {
  const n = cap + lower;
  return Math.exp(logBinomialTailAtHalf(cap, n)) < CAP_SIG_ALPHA;
};

// ---------------------------------------------------------------------------
// ORTHOGRAPHIC NORMALISATION AND REJECTION.
//
// Four facts about writing, not four facts about English. Each states the
// glyph-level property it reads and the measurement that made it necessary,
// because a filter without a measurement is a preference.
//
// All four are about the SAME thing the ratio filter above is about: which
// capitalisations are evidence of namehood and which are produced by the
// writing system for some other reason. Sentence-initial position was already
// excluded on exactly this ground; these are the remaining cases the same
// argument covers.
// ---------------------------------------------------------------------------

// 1. THE APOSTROPHE CLITIC. "Locke's" and "Locke" are one name written twice;
//    the apostrophe is a mark of inflection, not a different referent. Left
//    unmerged this splits every possessed name in a scholarly text — measured
//    on Process and Reality: Locke 68 + Locke's 45, Hume 66 + Hume's 40,
//    Descartes 48 + Descartes' 27, and the same again for God, Kant, Newton
//    and Whitehead. Seven of the book's principal referents appeared twice
//    each, at roughly half strength.
//    This reads the apostrophe glyph. It does not know what a possessive is,
//    and a script without the clitic simply never matches.
const POSSESSIVE = /['’]s?$/i;
export const stripPossessive = (token) => token.replace(POSSESSIVE, "");

// 2. ROMAN NUMERALS ARE NUMBERS. A number is not a name, in any language that
//    writes numbers. Measured: II, III, IV, V and VI entered the cast of
//    Process and Reality with 28, 26, 22, 17 and 10 mentions — five of the top
//    twenty referents were section numbers.
//    Guarded two ways so a real name cannot be caught: the form must be
//    ALL-UPPERCASE as written (a name is Title Case — "Mill" is not "MILL"),
//    and it must parse as a well-formed numeral, so "MILL" and "DID" are
//    rejected by the grammar rather than by a list.
const ROMAN = /^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
export const isRomanNumeral = (token) =>
  token.length > 0 && token === token.toUpperCase() && ROMAN.test(token);

// 3. ALL-CAPS IS TYPOGRAPHY. In a run where every token is capitalised because
//    the whole run is set in capitals — a heading, a running head, an
//    emphasised phrase — capitalisation carries no more naming evidence than
//    it does at the start of a sentence, and is excluded for the same reason.
//    Measured: "ORDER OF NATURE" (13), "AND FORM" (10) and "EXTENSIVE
//    CONTINUUM" (10) are Process and Reality's part titles, lifted out of the
//    table of contents by the PDF extractor.
//    Restricted to runs of TWO OR MORE tokens. A lone all-caps token is
//    routinely a name shouted by the typesetter ("DESCARTES" at the head of a
//    section) and diaNorm already folds it into the Title Case form.
const isAllCaps = (token) => {
  const letters = token.replace(/[^\p{L}]/gu, "");
  return letters.length > 0 && letters === letters.toUpperCase();
};

// 4. A NUMERAL SUFFIX INDEXES A NAME, it does not make a new one. "Part I" and
//    "Part IV" are the same word plus a divider. Folding them onto the stem is
//    the same move as folding the possessive: it merges, never deletes, so a
//    genuinely numbered name ("Henry V") joins "Henry" rather than vanishing —
//    which is what coreference should do with it anyway.
const stripNumeralIndex = (tokens) => {
  const out = tokens.slice();
  while (out.length > 1 && isRomanNumeral(out[out.length - 1])) out.pop();
  return out;
};

/**
 * The orthographic form under which two spellings of one name are the same
 * candidate. Exported so a host counting mentions can normalise the text the
 * same way this normalised the candidates — otherwise the merged surface has
 * a count that belongs to only one of its spellings.
 */
export const normaliseSurface = (surface) =>
  stripNumeralIndex(String(surface).split(/\s+/).map(stripPossessive)).join(" ");

/**
 * @param {Array<{text: string, order: number}>} sentences
 * @param {object} [options]
 * @param {Set<string>|null} [options.functionWords] closed class derived from
 *   this text's own frequency distribution (material.js::functionWordSet).
 * @param {Iterable<string>|null} [options.abbreviations] tokens this text
 *   always writes with a trailing period (spans.js::deriveAbbreviations).
 *   "Cf", "Sect", "Fig", "Bk" are capitalised and recurrent and are not
 *   names; the set is derived from the text, so no abbreviation list is
 *   asserted here.
 * @param {number} [options.minGlyphs] shortest surface that can be a name,
 *   counted in letters and digits. A single capitalised glyph is an initial,
 *   an axis label or a maths variable — measured on a quantum-computing paper,
 *   M, L, S, J, C and W took six of the top ten places.
 */
/**
 * The two phases of surface extraction, split so a CAUSAL reader can fold
 * each sentence in ONCE (S4: slowness is an incremental-algorithm defect,
 * never a license to coarsen — and never a license to re-read: the
 * per-sentence evidence below depends on nothing but the sentence, while
 * functionWords/abbreviations bite only in the projection over the
 * aggregate). extractSurfaces stays byte-identical: accumulate fresh, then
 * project — proven by diffing a full Frankenstein read's output before and
 * after this split.
 */
export const createSurfaceEvidence = () => ({
  capCounts: new Map(),   // surface -> times seen capitalised, NOT sentence-initial
  lowerCounts: new Map(), // lowercased form -> times seen lowercase anywhere
  sentenceIndex: new Map(), // surface -> Set(sentence order)
});

export const accumulateSurfaceEvidence = (sentences, evidence, { abbreviations = null } = {}) => {
  const { capCounts, lowerCounts, sentenceIndex } = evidence;
  // ABBREVIATIONS DO NOT BREAK A RUN — a period is the one punctuation mark
  // with a genuine dual role (sentence end OR abbreviation marker), unlike
  // comma/semicolon/colon/dash, which are unambiguous separators in every
  // script that has them. Found live (the-fold, reading Dracula, same day
  // as the run-breaking fix above): "Mr. Renfield" was being severed into
  // "Mr" and "Renfield" by the very fix meant to close "Lord Godalming;
  // Professor Van Helsing" — treating an abbreviation's own period exactly
  // like a real separator. `spans.js::deriveAbbreviations` already solves
  // this question for `splitSentences` (is this period a sentence end or a
  // title); reused here rather than re-derived a second way — the same
  // per-language, per-material fact answered once.
  const abbrev = abbreviations
    ? new Set(abbreviations)
    : deriveAbbreviations(sentences.map((s) => s.text).join(" "));
  for (const sent of sentences) {
    // TOKENS, AND WHETHER PUNCTUATION SEPARATED THEM FROM THEIR NEIGHBOURS.
    // The SAME defect was found independently on two books the same week —
    // the-fold reading Dracula ("Lord Godalming; Professor Van Helsing;
    // Mr. Quincey Morris" glued into one run by whitespace-splitting) and
    // this repo reading Война и мир ("Пьера, Анна Павловна" becoming the
    // 3-token run "Пьера Анна Павловна") — convergent evidence, and the
    // merge keeps BOTH sides' halves because each caught what the other
    // missed: the Dracula side's abbreviation exception (a trailing period
    // on a known title is NOT a boundary — "Mr. Renfield" is one name; the
    // period is the one mark with a dual role, and deriveAbbreviations +
    // the received HONORIFIC_TITLES class already answer exactly this
    // question for splitSentences), and the Война-и-мир side's LEADING
    // junk (an opening quote or dash leads the NEXT token — a boundary the
    // trailing-only check cannot see).
    const rawToks = sent.text.split(/\s+/);
    const toks = [];
    const breaksAfter = [];
    const leadingJunk = [];
    // A whitespace-delimited token with NO letters at all — a bare "&", a
    // spaced dash, a stray colon, a numeral — reduces to an empty `cleaned`
    // and used to vanish from `toks` without a trace, so the tokens either
    // side of it read as directly adjacent and the run-walker bridged
    // straight across. A token without letters is never part of a name;
    // whatever it does between two words (a coordinating "&" joining two
    // DIFFERENT titles, a list separator) is exactly what must break a
    // capitalised run — the same fact the comma glued to a token's edge
    // states just below, for the one shape the edge check cannot see: junk
    // that is its own token. Found live (2026-09-05) on the War and Peace
    // fixture, in the 2012 musical's own title "Natasha, Pierre & The Great
    // Comet of 1812": "Pierre" glued onto "The Great Comet" across the bare
    // "&", fabricating a surface that appears nowhere in the material and
    // merging two referents through it — the-fold POLICIES.md "the stale
    // stage" (2026-09-05) and READING-SPEC's paired entry carry the run.
    // The category is "no letters", never a list of marks (P50).
    let pendingHardBreak = false;
    for (const raw of rawToks) {
      const withoutLeading = raw.replace(/^[^\p{L}]+/gu, "");
      const cleaned = withoutLeading.replace(/[^\p{L}'’]+$/gu, "");
      if (!cleaned) {
        pendingHardBreak = true;
        continue;
      }
      toks.push(cleaned);
      leadingJunk.push(withoutLeading.length !== raw.length || pendingHardBreak);
      pendingHardBreak = false;
      const trailing = withoutLeading.slice(cleaned.length);
      const isAbbreviatedTitle = trailing === "." && (abbrev.has(cleaned) || HONORIFIC_TITLES.has(cleaned.toLowerCase()));
      breaksAfter.push(trailing.length > 0 && !isAbbreviatedTitle);
    }
    const hardBreakAfter = toks.map((_, k) => breaksAfter[k] || (leadingJunk[k + 1] ?? false));
    // A unit set entirely in capitals is a heading or a running head, and every
    // token in it is capitalised by typography. Reading capitalisation as
    // evidence here is the sentence-initial mistake at unit scale — on Process
    // and Reality it put the table of contents into the cast. Skipped for
    // capitalisation evidence; its lowercase counts are moot, there are none.
    if (toks.length > 1 && toks.every(isAllCaps)) continue;
    for (let i = 0; i < toks.length; i++) {
      if (LOWER_TOKEN.test(toks[i])) {
        const k = diaNorm(toks[i]);
        lowerCounts.set(k, (lowerCounts.get(k) ?? 0) + 1);
      }
    }
    // capitalised runs, skipping the sentence-initial token: it is capitalised
    // by position and carries no evidence of namehood on its own
    let i = 1;
    while (i < toks.length) {
      // NEVER_A_NAME (priors.js, lang/en, received): "I"/"I've"/"I'll"/
      // "I'd"/"I'm" carry no naming evidence in English regardless of
      // capitalisation — found live reading Dracula end to end, where the
      // first-person pronoun was individuating itself as its own cast
      // entry ("I've", 8 mentions) purely because CAP_TOKEN matches a bare
      // capital I. This prior already existed, unconsumed here — the same
      // compiled-but-unwired shape this project's own history keeps
      // finding. A run may still start on the NEXT token, so this skips
      // rather than breaks: "I saw Renfield" must still individuate
      // Renfield.
      if (NEVER_A_NAME.has(toks[i].toLowerCase())) { i++; continue; }
      if (!CAP_TOKEN.test(toks[i])) { i++; continue; }
      // A run always includes its own starting token; it extends past
      // token k only when the next token is capitalised, is not a received
      // never-a-name form ("I've" individuating itself — Dracula, live),
      // AND nothing punctuated separated k from k+1 in the material's own
      // bytes (either side's junk — see the union above).
      let j = i + 1;
      while (j < toks.length && CAP_TOKEN.test(toks[j]) && !NEVER_A_NAME.has(toks[j].toLowerCase()) && !hardBreakAfter[j - 1]) j++;
      const run = toks.slice(i, j);
      // An all-caps run inside an otherwise mixed-case unit is the same
      // typography as an all-caps unit — a part title quoted mid-paragraph.
      if (run.length > 1 && run.every(isAllCaps)) { i = j; continue; }
      // every prefix-run up to 4 tokens is a candidate ("Victor",
      // "Victor Frankenstein"); >4 tokens is a heading, not a name
      for (let len = 1; len <= Math.min(run.length, 4); len++) {
        // Normalised at the point of counting, so the two spellings of one
        // name accumulate into one candidate with one count rather than
        // being merged later with counts that have to be added back up.
        const surface = normaliseSurface(run.slice(0, len).join(" "));
        if (!surface) continue;
        capCounts.set(surface, (capCounts.get(surface) ?? 0) + 1);
        if (!sentenceIndex.has(surface)) sentenceIndex.set(surface, new Set());
        sentenceIndex.get(surface).add(sent.order);
      }
      i = j;
    }
  }
  return evidence;
};

export const surfacesFromEvidence = (evidence, { functionWords = null, abbreviations = null, minGlyphs = 2 } = {}) => {
  const { capCounts, lowerCounts, sentenceIndex } = evidence;
  const abbrev = abbreviations ? new Set(abbreviations) : null;
  // The physics filter (eoreader5, measured): a NAME essentially never appears
  // lowercased, while a sentence/dialogue opener ("Well", "Why") constantly
  // does. A pronoun that is capitalised by orthographic convention rather
  // than by namehood ("I" in English) survives this filter regardless,
  // because it has no lowercase form to compare against — it was the single
  // largest false positive here (2152 "mentions" in Frankenstein). The fix
  // reuses the Zipf-derived closed-class detector from material.js rather
  // than naming any language's pronouns: `functionWords` is a Set the
  // caller derives from this same text's own frequency distribution.
  // Optional — omit it and the filter simply doesn't run.
  //
  // Multi-word runs skip this filter (a lowercase form of "Victor
  // Frankenstein" does not occur to compare against), and so does any
  // single word never seen lowercase at all (lower === 0) — the strongest
  // possible evidence for namehood, nothing left to test against.
  //
  // What remains is genuinely ambiguous: a word seen written BOTH ways.
  // capitalisationIsSignificant asks a binomial question of it — is this
  // word's own capitalised share (cap / (cap + lower)) further above a fair
  // coin than chance alone would produce AT THIS WORD'S OWN SAMPLE SIZE —
  // derived per candidate from its own two counts, not a fixed shared band.
  const surfaces = [];
  for (const [surface, cap] of capCounts) {
    const words = surface.split(/\s+/);
    // Numbers and single glyphs, per the two orthographic facts above.
    if (words.every(isRomanNumeral)) continue;
    if (surface.replace(/[^\p{L}\p{N}]/gu, "").length < minGlyphs) continue;
    if (words.length === 1) {
      if (abbrev && abbrev.has(surface)) continue;
      if (functionWords && functionWords.has(diaNorm(surface))) continue;
      const lower = lowerCounts.get(diaNorm(surface)) ?? 0;
      if (lower > 0 && !capitalisationIsSignificant(cap, lower)) continue;
    }
    surfaces.push({ surface, mentions: cap, sentences: sentenceIndex.get(surface).size });
  }
  return surfaces.sort((a, b) => b.mentions - a.mentions);
};

/**
 * extractLeadingSurfaces — the MIRROR of `extractSurfaces`: the capitalised
 * runs that OPEN a sentence, which every other reader here deliberately
 * skips.
 *
 * WHY IT IS SEPARATE AND WHY IT RETURNS SO LITTLE. `extractSurfaces` starts
 * its run scan at token 1 because a sentence-initial capital "is capitalised
 * by position and carries no evidence of namehood on its own" (that scan's
 * own comment, unchanged). That exclusion is correct and stays. But a name
 * that ONLY ever appears sentence-initially is then invisible to the whole
 * cast ladder, and a consumer may want to test such a candidate against
 * evidence of a DIFFERENT kind — a real pronoun binding resolving to it —
 * rather than against capitalisation again. This organ hands over exactly
 * those candidates and asserts nothing about them: it is as evidence-free
 * about namehood as "a capitalized word opened this sentence", and its
 * whole contract is that the caller must confirm them by other means.
 *
 * Built 2026-09-01. `the-fold`'s hypergraph.js has described this organ in
 * its own "referent bar" section, and `hypergraph.test.mjs` has imported it
 * by name, since that mechanism was written — while it existed in NEITHER
 * engine provider, so the mechanism could never run and its two tests could
 * not pass. That went unnoticed for as long as the test file itself could
 * not load. The mechanism's own consumer gate is unchanged and still off by
 * default (app.js declines to inject it, with its reasons); this only makes
 * the thing it names real.
 *
 * Tokenisation, punctuation breaks, all-caps units, NEVER_A_NAME and the
 * run-extension rule are the SAME as the main scan's — this reuses that
 * logic with the single difference the name states (start at token 0, and
 * take only the opening run), rather than re-deriving a second, drifting
 * copy of it.
 */
export const extractLeadingSurfaces = (sentences, { abbreviations } = {}) => {
  const abbrev = abbreviations ?? new Set();
  const out = new Map(); // surface -> count of sentences it opened
  for (const sent of sentences ?? []) {
    const rawToks = String(sent?.text ?? sent ?? "").split(/\s+/);
    const toks = [];
    const breaksAfter = [];
    const leadingJunk = [];
    // The same letterless-token break as the main scan's (see
    // accumulateSurfaceEvidence) — this function is that scan with one
    // stated difference, and the two must not drift.
    let pendingHardBreak = false;
    for (const raw of rawToks) {
      const withoutLeading = raw.replace(/^[^\p{L}]+/gu, "");
      const cleaned = withoutLeading.replace(/[^\p{L}'’]+$/gu, "");
      if (!cleaned) {
        pendingHardBreak = true;
        continue;
      }
      toks.push(cleaned);
      leadingJunk.push(withoutLeading.length !== raw.length || pendingHardBreak);
      pendingHardBreak = false;
      const trailing = withoutLeading.slice(cleaned.length);
      const isAbbreviatedTitle = trailing === "." && (abbrev.has(cleaned) || HONORIFIC_TITLES.has(cleaned.toLowerCase()));
      breaksAfter.push(trailing.length > 0 && !isAbbreviatedTitle);
    }
    if (!toks.length) continue;
    const hardBreakAfter = toks.map((_, k) => breaksAfter[k] || (leadingJunk[k + 1] ?? false));
    if (toks.length > 1 && toks.every(isAllCaps)) continue; // a heading, not a sentence
    if (NEVER_A_NAME.has(toks[0].toLowerCase())) continue;
    if (!CAP_TOKEN.test(toks[0])) continue;
    let j = 1;
    while (j < toks.length && CAP_TOKEN.test(toks[j]) && !NEVER_A_NAME.has(toks[j].toLowerCase()) && !hardBreakAfter[j - 1]) j++;
    const surface = toks.slice(0, j).join(" ");
    out.set(surface, (out.get(surface) ?? 0) + 1);
  }
  return [...out].map(([surface, sentences]) => ({ surface, sentences }));
};

export const extractSurfaces = (sentences, opts = {}) =>
  surfacesFromEvidence(accumulateSurfaceEvidence(sentences, createSurfaceEvidence(), { abbreviations: opts.abbreviations }), opts);

// ---------------------------------------------------------------------------
// WHETHER THIS MECHANISM CAN FIRE ON THIS MATERIAL AT ALL.
//
// Every filter above reads ONE glyph-level property: capitalisation.
// CAP_TOKEN/LOWER_TOKEN, the sentence-initial exclusion, the all-caps
// typography rules, and capitalisationIsSignificant's binomial are all
// questions about case. On a script that HAS no case, none of them can
// fire — not "fires weakly", not "degrades": the mechanism is structurally
// inert, and every count it returns is about whatever cased debris (a Latin
// citation, an English caption) happens to sit in the file, never about the
// material's own language.
//
// Measured, on real material, before this existed: a Hebrew Wikipedia
// article yielded 6 candidate surfaces across 79 sentences and a Korean one
// 15 across 129 — and the surfaces were "Internet Encyclopedia", "The School
// of Athens", and a first-letter-eaten "enny Teichmann" (from "Jenny"). Each
// read as a small, plausible, wholly false result. Nothing said the organ had
// not read the language.
//
// THIS DOES NOT MAKE THOSE SCRIPTS READABLE, and deliberately so. This
// file's own header records that a blanket algorithmic generalisation across
// scripts was tried and REVERTED, because II.13 holds a silent claim of
// cross-script generality to be a more severe failure than a disclosed narrow
// scope. Inventing a caseless substitute for capitalisation here — recurrence,
// n-gram salience, position — would be that same reverted move under a new
// name, and it would need a giver and an invariance fixture per script to be
// admissible at all. So this reports the boundary instead of crossing it,
// which is what the tier discipline above already requires of every other
// undecidable question in this file: A MISSING PRIOR PRODUCES A GAP, NEVER A
// GUESSED NUMBER.
//
// The giver for the distinction itself is the Unicode Character Database's
// own General_Category: `\p{Cased_Letter}` is exactly the set of letters that
// HAVE case (Lu/Ll/Lt), and `\p{L}` minus that is exactly the caseless
// letters (Lo) — Hebrew, Arabic, Hangul, CJK, Devanagari, Thai. Verified
// directly against real strings in Greek, Cyrillic and Armenian (which ARE
// bicameral IN PRACTICE, and are correctly not gapped). Not a list of
// scripts maintained here; a property looked up per character.
//
// Georgian was ALSO claimed correctly-not-gapped here, on the same test, and
// that claim was wrong — found running this instrument on all 516 real UDHR
// translations (live_priors POLICIES.md LP13 (was LP8)), not by re-reading this file.
// `\p{Cased_Letter}` answers "does this LETTER belong to a case category" —
// Mkhedruli, modern Georgian's everyday alphabet, is General_Category Ll, so
// it passes. It does not answer the question this mechanism actually needs
// answered: does the MATERIAL ever use the OTHER member of that category —
// Mtavruli, Georgian's uppercase — to mark anything. Ordinary published
// Georgian does not; Mtavruli is a monumental/decorative variant, not a
// working capitalisation convention, and a real 10,174-letter UDHR
// translation contained exactly zero of it (its only Lu characters were 30
// stray Latin letters from the file's own English header). `scriptCoverage`
// read that as casedShare 1.0 and gap: null; extractSurfaces, run on the
// same real material, found zero real Georgian surfaces — every one of the
// 18 "candidates" it did find was that same Latin debris. This is caught
// below by a third, distinct boundary; the two boundaries above are
// unchanged and still correct for what they test.
const CASED_LETTER = /\p{Cased_Letter}/u;
const ANY_LETTER = /\p{L}/u;

/**
 * How much of this material's own writing the capitalisation mechanism can
 * see, and — when the answer is "little or none" — the typed gap saying so.
 *
 * Returns `{ casedLetters, caselessLetters, casedShare, gap }`. `gap` is null
 * when the material is bicameral enough for the mechanism to be about it, and
 * otherwise a typed gap carrying the measured share, so a caller can never
 * read a surface count without also being told what fraction of the script it
 * was computed over.
 *
 * Three boundaries, all structural, none a dial:
 *   - `casedLetters === 0` with letters present: the mechanism cannot fire at
 *     all. Zero is not a threshold.
 *   - caseless letters in the MAJORITY: most of this material is invisible to
 *     the mechanism. Majority is where a plurality flips — the same non-tuned
 *     standing this project's writer-decay window already declares for itself
 *     — not a chosen constant.
 *   - the material's letters are all cased AND pass both checks above, yet no
 *     CAPITALISATION ever appears where this mechanism can read it as
 *     evidence (Georgian's Mkhedruli, found live — see the header above).
 *     `CAP_TOKEN` deliberately excludes sentence-initial position (position
 *     is not namehood); a material where the case member THIS mechanism
 *     watches for never once occurs elsewhere is exactly as blind as one
 *     with no case category at all, whatever Unicode's own General_Category
 *     says about its letters. Tested not by a percentage but by the same
 *     recurrence the extraction mechanism itself already computes: does ANY
 *     candidate surface — `accumulateSurfaceEvidence`'s own `sentenceIndex`,
 *     reused rather than re-derived — appear in more than zero sentences.
 *     Zero is not a threshold here either.
 *
 * @param {object} [options.evidence] a `createSurfaceEvidence()` accumulator
 *   already folded over `sentences` via `accumulateSurfaceEvidence` — reused
 *   so a caller who is about to call `extractSurfaces` on the same sentences
 *   anyway (eot-sidecar.mjs's `attemptWindow` does exactly this) folds the
 *   material once, not twice. Omit it and this computes its own — the third
 *   boundary needs the SAME walk `extractSurfaces` performs to ask its
 *   question, and a second implementation of that walk here would be
 *   exactly the drift class this codebase's own postmortems (P22, P24, P25
 *   in the-fold's CLAUDE.md) already name.
 */
export const scriptCoverage = (sentences, { evidence } = {}) => {
  let casedLetters = 0;
  let caselessLetters = 0;
  for (const sent of sentences) {
    for (const ch of String(sent?.text ?? "")) {
      if (!ANY_LETTER.test(ch)) continue;
      if (CASED_LETTER.test(ch)) casedLetters += 1;
      else caselessLetters += 1;
    }
  }
  const letters = casedLetters + caselessLetters;
  const casedShare = letters === 0 ? 0 : casedLetters / letters;
  const base = { casedLetters, caselessLetters, casedShare };

  if (letters === 0) return { ...base, gap: null };

  if (casedLetters === 0) {
    return {
      ...base,
      gap: {
        reason: "script_without_case",
        tier: "model",
        needsWitness: true,
        casedShare,
        detail:
          "every candidate-surface filter in this organ reads capitalisation, and this material's " +
          "letters are entirely caseless (Unicode General_Category: no Cased_Letter present), so the " +
          "mechanism cannot fire on it at all. Any surface count reported alongside this gap is about " +
          "cased debris in the file, never about this material's own language. Reading names in this " +
          "script needs a per-script prior with its own giver and an invariance fixture — an " +
          "algorithmic substitute for capitalisation was tried and reverted here (II.13).",
      },
    };
  }

  if (casedLetters < caselessLetters) {
    return {
      ...base,
      gap: {
        reason: "script_mostly_without_case",
        tier: "model",
        needsWitness: true,
        casedShare,
        detail:
          `only ${(casedShare * 100).toFixed(1)}% of this material's letters carry case, so the ` +
          "capitalisation mechanism is reading a minority of the script and the majority is invisible " +
          "to it. Surfaces found here are drawn from that cased minority — typically citations, " +
          "captions or loanwords in another script — and are not evidence about the material's own " +
          "language. Same remedy and same refusal as script_without_case.",
      },
    };
  }

  const ev = evidence ?? accumulateSurfaceEvidence(sentences, createSurfaceEvidence());
  let sentencesWithNonInitialCap = 0;
  {
    const seen = new Set();
    for (const idxSet of ev.sentenceIndex.values()) {
      for (const i of idxSet) seen.add(i);
    }
    sentencesWithNonInitialCap = seen.size;
  }
  if (sentencesWithNonInitialCap === 0) {
    return {
      ...base,
      gap: {
        reason: "script_case_unused",
        tier: "model",
        needsWitness: true,
        casedShare,
        detail:
          "this material's letters are cased (Unicode General_Category: Cased_Letter present, no " +
          "caseless majority), yet no candidate surface — a capitalised token outside sentence-initial " +
          "position — was found in ANY sentence. CAP_TOKEN excludes sentence-initial capitals as " +
          "evidence by design (position is not namehood), so a script whose case member this mechanism " +
          "watches for never occurs anywhere else is exactly as invisible to it as a caseless script, " +
          "regardless of what Unicode's own category says about its letters. Any surface reported " +
          "alongside this gap is cased debris (typically a container's own front matter, in another " +
          "language), never evidence about this material's own writing. Same remedy as the other two " +
          "gaps: a per-script prior with its own giver and an invariance fixture.",
      },
    };
  }

  return { ...base, gap: null };
};

/**
 * Cluster candidate surfaces into referents by NAME-variant coreference only.
 * Emits DEF.admit events for referents/index.js::projectReferents — the
 * canonical path, not a parallel string-matching substitute.
 *
 * Returns { events, gaps }. `gaps` is not decoration: every referent
 * discovered this way is name-only, so its pronoun and descriptor mentions
 * are known-missing and are reported as such.
 */
/**
 * Tokens that individuate vs tokens that classify. A token combining with
 * many DIFFERENT other tokens across the corpus ("Princess" before Mary,
 * Hélène, Anna, Drubetskáya; "Rostóv" after Nicholas, Ilyá, Pétya) is a
 * title or a family name — it groups people, it does not pick one out.
 * A token appearing in only one or two surfaces ("Frankenstein", only ever
 * after "Victor") individuates.
 *
 * Derived from this text's own combinatorics — no title list, no honorific
 * table, nothing language-specific. Necessary because `namesCorefer` is a
 * PAIRWISE test against one known seed; used transitively for clustering it
 * over-merges exactly here, which eoreader5's relationship-graph notes
 * record as measured ("a multi-word seed must strip single-word
 * nameSurfaces first, or it absorbs every OTHER prince's bare 'Prince'").
 */
const quantileOf = (sorted, q) => {
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
};

/**
 * A partner-count fence derived from THIS document's own co-occurrence
 * structure, not a fixed absolute count. The interquartile range is already
 * this codebase's own measure of a distribution's ordinary spread (nul's
 * `volume`, "aperture") — a token whose partner-set size sits more than one
 * IQR above the 75th percentile of this document's own partner-count
 * distribution is exceeding what ordinary co-occurrence breadth looks like
 * HERE, a Tukey-style upper fence rather than a percentile chosen by hand.
 * Degrades safely rather than gapping: too little multi-word structure to
 * have a fence at all (empty or uniform partner counts, IQR 0) means nothing
 * exceeds it, so `genericTokens` correctly finds nothing generic — the right
 * answer when the material can't support the distinction, not a special case.
 */
const deriveMinPartners = (partners) => {
  const counts = [...partners.values()].map((s) => s.size).sort((a, b) => a - b);
  if (counts.length === 0) return Infinity;
  const q1 = quantileOf(counts, 0.25);
  const q3 = quantileOf(counts, 0.75);
  return q3 + (q3 - q1);
};

/**
 * @param {object} [options.minPartners] override the derived fence — omit to
 *   derive it from `surfaces`'s own co-occurrence structure (see
 *   `deriveMinPartners`). Compares by EXCEEDS (`>`), matching the derived
 *   fence's own "outside the ordinary spread" convention.
 */
export const genericTokens = (surfaces, { minPartners } = {}) => {
  const partners = new Map(); // token -> Set(other tokens it co-occurs with in a surface)
  for (const { surface } of surfaces) {
    const toks = diaNorm(surface).split(/\s+/).filter((t) => t.length > 2);
    if (toks.length < 2) continue;
    for (const t of toks) {
      if (!partners.has(t)) partners.set(t, new Set());
      for (const u of toks) if (u !== t) partners.get(t).add(u);
    }
  }
  const fence = minPartners ?? deriveMinPartners(partners);
  const generic = new Set();
  for (const [tok, set] of partners) if (set.size > fence) generic.add(tok);
  return generic;
};

/**
 * A recurrence floor derived from THIS document's own candidate-surface
 * pool: a candidate must recur across MORE distinct sentences than the
 * bottom quarter of the pool does. Most candidate surfaces in any real text
 * are Zipfian one-off capitalisations (the 25th percentile is often exactly
 * 1), so this weeds out that long tail while scaling with how
 * recurrence-rich the material actually is, rather than a fixed absolute
 * sentence count.
 *
 * The 25th percentile, not the median: a TINY or heavily-tied pool (a short
 * document, or one dominated by a couple of names) can put the median AT
 * the pool's own maximum, and "exceeds the median" then rejects everything,
 * including the most-recurring candidates — measured, on a 3-candidate
 * pool tied 4/4/2, where a median-based floor of 4 admitted nothing. The
 * 25th percentile targets the LOW tail specifically and does not collide
 * with the top the same way.
 *
 * Degrades safely rather than rejecting everyone: a pool small or uniform
 * enough that its OWN 25th percentile sits at or above every member's own
 * count (a single surviving candidate is the extreme case — its own
 * percentile always equals itself) means the pool cannot support the
 * distinction, so nothing is filtered — the same "the material can't
 * support it, so don't fabricate an answer" standing `deriveMinPartners`
 * already takes above, not a special case.
 */
const deriveMinSentences = (surfaces) => {
  const counts = surfaces.map((s) => s.sentences).sort((a, b) => a - b);
  if (counts.length === 0) return 0;
  const floor = quantileOf(counts, 0.25);
  return counts.every((c) => c <= floor) ? 0 : floor;
};

/**
 * @param {object} [options.minSentences] override the derived recurrence
 *   floor — omit to derive it from `surfaces` (see `deriveMinSentences`).
 *   Compares by EXCEEDS (`>`), matching `minPartners`'s convention.
 * @param {object} [options.minPartners] forwarded to `genericTokens`.
 * @param {object} [options.groups] surface-arrays this pooled `surfaces` list
 *   was assembled from (each a document's own candidates, in the same order
 *   they were concatenated into `surfaces`) — omit for the single-document
 *   case, where `surfaces` IS the one group and nothing changes.
 *
 *   WHY THIS EXISTS: `genericTokens`'s fence is an IQR statistic over
 *   WHATEVER pool it is handed — correct for one document, where the pool
 *   IS the material whose ordinary co-occurrence breadth is in question.
 *   Pool two OR MORE documents' candidates flat and hand them to
 *   `genericTokens` unchanged, and every unrelated document's own one-off
 *   proper nouns (each a fresh partner-count-1 token) dilutes the SAME
 *   quartile fence a real name-and-title pair inside ONE of the documents
 *   is measured against — the fence keeps falling as more documents join,
 *   until it wrongly brands an ordinary name individuating-token as generic
 *   PURELY because other, unrelated documents were also in the batch.
 *   Measured live on the challenge-25 fixture: "kade" (correctly generic
 *   within source A alone, by A's own co-occurrence structure — it is A's
 *   title, not A's individuating evidence) additionally took "marcus" and
 *   "aurelius" down with it the moment source C's candidates joined the
 *   pool, because C's own one-off proper nouns (unrelated to Kade) pushed
 *   the POOLED fence to 1 — collapsing a within-document merge
 *   ("Marcus Aurelius" / "Marcus Aurelius Kade") that succeeds standalone.
 *   `groups`, when given, derives the generic set PER GROUP and unions the
 *   results — each document's own candidates are still judged against
 *   their OWN co-occurrence breadth, exactly as the single-document case
 *   already does; pooling more documents can only ADD generic tokens found
 *   within some document's own material, never dilute another document's
 *   fence with material foreign to it.
 *
 *   `deriveMinSentences`'s recurrence floor has the EXACT same compositional
 *   flaw and gets the same treatment: pooled flat, a richly-recurring
 *   document (many candidates recurring across many sentences) raises the
 *   25th-percentile floor past what a SHORT, sparser document's own
 *   candidates can ever clear — a name that individuates fine standalone
 *   drops out entirely the moment it is pooled with a longer document,
 *   never merging (there's no DEF.admit event to merge) rather than
 *   over-merging. `groups` derives the floor per group too, so each
 *   document's own candidates are judged against their own recurrence
 *   floor, exactly as `minSentences` already promises for the
 *   single-document case.
 */
export const discoverReferents = (surfaces, { minSentences, minPartners, groups, foldToken, sameStem = null } = {}) => {
  const events = [];
  const assigned = new Map(); // surface -> referent_id
  const generic = groups
    ? groups.reduce((out, g) => {
        for (const t of genericTokens(g, { minPartners })) out.add(t);
        return out;
      }, new Set())
    : genericTokens(surfaces, { minPartners });
  // One sentences-floor per group when grouped, looked up by the surface
  // OBJECT's identity (not its string, which two different documents' own
  // candidates could coincidentally share) — a Map keyed on object identity
  // is exactly what surfaces' own array elements give for free.
  const sentencesFloorOf = groups
    ? (() => {
        const byGroup = groups.map((g) => minSentences ?? deriveMinSentences(g));
        const lookup = new Map();
        groups.forEach((g, gi) => { for (const s of g) lookup.set(s, byGroup[gi]); });
        return (s) => lookup.get(s);
      })()
    : (() => {
        const floor = minSentences ?? deriveMinSentences(surfaces);
        return () => floor;
      })();

  // Two surfaces corefer only on evidence a GENERIC token didn't supply:
  // strip titles/family names from both and require the remainder to still
  // corefer. "Princess Mary" vs "Princess Hélène" -> mary vs helene -> no.
  // "Victor Frankenstein" vs "Frankenstein" -> victor vs (empty) -> falls
  // back to the unstripped test, which containment answers correctly.
  const individuating = (surface) =>
    diaNorm(surface).split(/\s+/).filter((t) => t.length > 2 && !generic.has(t));

  // The singleton-partner rescue's evidence: each token's partner set,
  // counted over EVIDENCE-WORTHY surfaces only (the same sentences floor
  // clustering itself applies — junk one-off surfaces like "Chapter
  // Clerval" would otherwise hand a real name phantom partners).
  const eligiblePartners = (() => {
    const m = new Map();
    for (const entry of surfaces) {
      if (entry.sentences <= sentencesFloorOf(entry)) continue;
      const toks = diaNorm(entry.surface).split(/\s+/).filter((t) => t.length > 2);
      for (const t of toks) {
        if (!m.has(t)) m.set(t, new Set());
        for (const u of toks) if (u !== t) m.get(t).add(u);
      }
    }
    return m;
  })();

  const corefersIndividuated = (a, b) => {
    const ia = individuating(a);
    const ib = individuating(b);
    if (ia.length && ib.length) return namesCorefer(ia.join(" "), ib.join(" "), { fold: foldToken, sameStem });
    // No individuating evidence on one side means no evidence FOR merging —
    // not licence to fall back on the generic tokens just judged unreliable.
    // That inverted fallback kept every Princess in one referent: both
    // "Princess Mary" and "Princess Hélène" strip to nothing, and the
    // fallback then merged them on the shared title alone.
    //
    // ONE exception, licensed by the material's own combinatorics (S9: low
    // sets possible): a bare generic token whose corpus-wide partner set —
    // above the same evidence floor — is EXACTLY ONE token can only name
    // that partner's bearer. "Clerval" is generic (a family name), but this
    // book gives it one partner ("Henry"), so bare "Clerval" has one
    // possible referent; "Princess" has many partners and stays refused.
    // Measured before this rescue: the book's dominant surface for Henry
    // Clerval (44 mentions, bare "Clerval") stranded as its own referent,
    // and the Network standing organ read the split alias as a top "bond"
    // — self-company, not company.
    const rescued = (bare, other) => {
      const toks = diaNorm(bare).split(/\s+/).filter((t) => t.length > 2);
      if (toks.length !== 1) return false;
      const ps = eligiblePartners.get(toks[0]);
      if (!ps || ps.size !== 1) return false;
      const [only] = ps;
      return diaNorm(other).split(/\s+/).includes(only);
    };
    if (!ia.length && ib.length && rescued(a, b)) return true;
    if (!ib.length && ia.length && rescued(b, a)) return true;
    return diaNorm(a) === diaNorm(b);
  };

  // ── assignment: against the group's own strongest evidence, with merges
  // witnessed downward and ambiguity stranded ─────────────────────────────
  //
  // The first shape of this loop matched an arriving surface against EVERY
  // already-assigned surface and took the first hit. Two measured failures,
  // both order-dependence (found by the-fold's MHC battery driving this
  // organ over real Wikipedia material, then reproduced here at fixture
  // scale — rich-referents.test.js pins both):
  //
  //   · STRANDING. "Mikhail Kutuzov" corefers with BOTH bare "Kutuzov" and
  //     bare "Mikhail"; first-match-break joined whichever the scan reached
  //     first and left the other stranded in its own referent. A greedy
  //     first-match closure over the pairwise rule is not transitive, and
  //     "is the same being as" necessarily is.
  //   · ACCRETION. With bare "Mikhail" assigned FIRST and two real bearers
  //     in the material ("Mikhail Kutuzov", "Mikhail Barclay") each compound
  //     matched the bare fragment and both landed in ONE referent — two
  //     generals merged through a shared first name sitting at (not above)
  //     the generic fence.
  //
  // Both die to the same two rules, and the direction of containment is the
  // whole difference between them (S9 — high sets probability for low: a
  // group's ESTABLISHED evidence decides what may join it, never its
  // weakest member):
  //
  //   1. Membership is decided against the group's MAXIMAL member — the
  //      surface carrying the most individuating tokens — never against any
  //      member. A fragment cannot pull in a third party the group's own
  //      evidence refuses ("Mikhail Barclay" vs a group whose maximal is
  //      "Mikhail Kutuzov" is refused, whatever bare members the group holds).
  //   2. A surface matching MULTIPLE groups merges them only when it
  //      WITNESSES the merge — its own individuating tokens CONTAIN each
  //      group's maximal evidence ("Mikhail Kutuzov" ⊇ {mikhail}, ⊇
  //      {kutuzov}: one person, stated by the material in one breath). A
  //      surface on the SUBSET side of multiple groups (bare "Mikhail"
  //      against established "Mikhail Kutuzov" and "Mikhail Barclay") is an
  //      ambiguous fragment claiming membership in both, and strands as its
  //      own referent — disclosed on its event, never guessed.
  //
  // The generic fence remains the outer guard (three-plus bearers make the
  // shared token generic and it stops individuating at all); these rules
  // close the two-bearer band the fence's own strict-exceeds convention
  // deliberately leaves open.
  // A THIRD SHAPE, found 2026-09-05 by the same battery re-run, and the
  // blind spot the two rules above share: the ANCHOR ARRIVES FIRST. Assignment
  // is most-individuated-first (below), so a group's maximal member is
  // usually its founder, and every fragment then faces THAT member alone,
  // one at a time. Two different fragments of one anchor — "Oxford
  // University" and "University Press" against "Oxford University Press",
  // the Translations bibliography that also lists Cambridge and Cornell
  // University Press — each pass rule 1 on their own (each is a subset of
  // the maximal's tokens) and both are absorbed, though they never match
  // EACH OTHER: {oxford, university} and {university, press} overlap on one
  // token and neither contains the other. Rule 2 cannot see it: there is
  // only ever one group in play, never two to bridge. The greedy closure is
  // still not transitive, just through the anchor now instead of a bare
  // fragment.
  //
  // The cut is exactly the shape and nothing wider: a fragment arriving
  // into a single matched group is held against that group's OTHER
  // CHILDREN (never its maximal — matching the maximal is what got it
  // here), and a sibling it PARTIALLY OVERLAPS — a token in common, neither
  // containing the other — is a conflict. Disjoint siblings are not: {ilya,
  // andreyevich} and {rostov} under "Ilya Andreyevich Rostov" are the
  // ordinary given-name-then-surname pair and must keep merging (pinned).
  // A conflict lands as the SAME typed ambiguity rule 2 already uses —
  // withheld, candidates named, the sibling named — never a guess and never
  // a third being. Disclosed cost, pinned rather than hidden: {ilya,
  // rostov} against a sibling {ilya, andreyevich} is the same structural
  // shape as the publisher case and is refused too; only world knowledge
  // (a person carries a patronymic, a press does not) tells them apart,
  // and this tier does not have it. rich-referents.test.js pins all four.
  const partiallyOverlaps = (a, b) => {
    if (!a.length || !b.length) return false;
    const shared = a.some((t) => b.includes(t));
    if (!shared) return false;
    const aInB = a.every((t) => b.includes(t));
    const bInA = b.every((t) => a.includes(t));
    return !aInB && !bInA;
  };

  const clusters = new Map(); // canonical id -> { maximal, maximalTokens, born, children: [{ surface, tokens }] }
  const aliases = new Map(); // folded id -> surviving id
  const resolveId = (id) => {
    let c = id;
    while (aliases.has(c)) c = aliases.get(c);
    return c;
  };
  const merges = [];
  const ambiguities = [];

  // EVIDENCE BEFORE FRAGMENTS. The callers' mention-descending order is
  // systematically backwards for assignment: a bare form's counts include
  // every occurrence of the compounds containing it, so fragments outrank
  // their own evidence and found groups first — which is what made both
  // measured failures order-dependent, and what made the two-bearer
  // ambiguity undetectable (the fragment was always already a group by the
  // time its bearers arrived). Assignment therefore walks a COPY sorted
  // most-individuated first (ties by recurrence, then mentions, then
  // spelling for determinism): established, individuated surfaces define
  // the field, and fragments then face it — S9's downward direction applied
  // to the loop's own order. `surfaces` itself is left untouched for the
  // floor/fence derivations and for callers.
  const assignmentOrder = [...surfaces].sort((a, b) => {
    const ia = individuating(a.surface).length;
    const ib = individuating(b.surface).length;
    if (ib !== ia) return ib - ia;
    if (b.sentences !== a.sentences) return b.sentences - a.sentences;
    if ((b.mentions ?? 0) !== (a.mentions ?? 0)) return (b.mentions ?? 0) - (a.mentions ?? 0);
    return a.surface < b.surface ? -1 : a.surface > b.surface ? 1 : 0;
  });

  for (const entry of assignmentOrder) {
    const { surface, sentences } = entry;
    if (sentences <= sentencesFloorOf(entry)) continue;

    const arriving = individuating(surface);
    const matched = [];
    for (const [id, g] of clusters) {
      if (corefersIndividuated(surface, g.maximal)) matched.push([id, g]);
    }

    let referentId = null;
    let basis = "name-variant coreference";
    if (matched.length === 1) {
      const [id, g] = matched[0];
      // The anchor-first blind spot (see partiallyOverlaps above): matched
      // the group's maximal, now held against the group's other children.
      const sibling = g.children.find((c) => partiallyOverlaps(arriving, c.tokens));
      if (sibling) {
        ambiguities.push({ surface, candidates: [id], conflictsWith: sibling.surface });
        continue;
      }
      referentId = id;
    } else if (matched.length > 1) {
      const witnessed =
        arriving.length > 0 &&
        matched.every(([, g]) => g.maximalTokens.length > 0 && g.maximalTokens.every((t) => arriving.includes(t)));
      if (witnessed) {
        matched.sort((a, b) => a[1].born - b[1].born);
        referentId = matched[0][0];
        const kept = matched[0][1];
        const folded = [];
        for (const [otherId, og] of matched.slice(1)) {
          aliases.set(otherId, referentId);
          clusters.delete(otherId);
          folded.push(otherId);
          // The folded group's members are the kept group's members now —
          // its maximal becomes a child, its children come along — so a
          // later fragment is held against everything the group holds.
          kept.children.push({ surface: og.maximal, tokens: og.maximalTokens }, ...og.children);
        }
        merges.push({ kept: referentId, folded, witness: surface });
        basis = "name-variant coreference (this surface's own tokens contain every merged referent's evidence — a witnessed merge)";
      } else {
        // An ambiguous fragment is NOT a third being, and admitting it as
        // one asserts something false at a layer that cannot check it. The
        // type-level fact is "this FORM belongs to more than one established
        // referent"; WHICH referent any given mention names is an
        // occurrence-level question, answered by discourse salience — the
        // same one-hop activation recall resolvePronouns already performs,
        // exactly the anaphor a bare mid-document name is (S11: a type-level
        // tally never answers an occurrence-level question; S15: writers use
        // bare-name returns as middle-distance accessibility devices). So
        // the form lands as a typed GAP carrying its candidates, admission
        // withheld, and the occurrence layer closes it.
        ambiguities.push({ surface, candidates: matched.map(([id]) => id) });
        continue;
      }
    }
    if (!referentId) {
      referentId = `ref:auto:${diaNorm(surface).replace(/\s+/g, "_")}`;
      clusters.set(referentId, { maximal: surface, maximalTokens: arriving, born: clusters.size + aliases.size, children: [] });
    } else {
      const g = clusters.get(referentId);
      // The invariant `children` keeps: every member except the current
      // maximal. A longer arrival displaces the maximal into the children;
      // anything else joins them.
      if (arriving.length > g.maximalTokens.length) {
        g.children.push({ surface: g.maximal, tokens: g.maximalTokens });
        g.maximal = surface;
        g.maximalTokens = arriving;
      } else {
        g.children.push({ surface, tokens: arriving });
      }
    }

    events.push({
      type: "DEF.admit",
      referent_id: referentId,
      surface,
      provenance: { giver: "surfaces/discoverReferents", tier: "engine", basis },
    });
    assigned.set(surface, referentId);
  }

  // A merge folds ids that earlier events already carry — canonicalize so
  // every event names the surviving referent, never a folded alias.
  for (const e of events) e.referent_id = resolveId(e.referent_id);

  const referentIds = new Set(events.map((e) => e.referent_id));
  const gaps = [...referentIds].map((id) => ({
    reason: "pronoun_and_descriptor_mentions_unresolved",
    referent: id,
    tier: "model",
    needsWitness: true,
    detail:
      "name-variant coreference is engine-tier and complete; binding pronouns and definite " +
      "descriptions to this referent is not derivable (eoreader5 measured distributional coref " +
      "failing twice). Supply a per-text prior to close this gap.",
  }));

  for (const a of ambiguities) {
    gaps.push({
      reason: "ambiguous_surface",
      surface: a.surface,
      candidates: a.candidates.map(resolveId),
      conflictsWith: a.conflictsWith ?? null,
      tier: "model",
      needsWitness: true,
      detail: a.conflictsWith
        ? `this form corefers with the group's maximal member but partially overlaps a sibling already ` +
          `in it ("${a.conflictsWith}") without containing it or being contained by it — two different ` +
          `sub-phrases of one anchor, or two fragments of one name that only world knowledge could tell apart; ` +
          `the type level withholds admission rather than guess. Each of its mentions is an occurrence-level ` +
          `question — resolve by activation recall against the candidate (the perceiver's pronouns/roles ` +
          `machinery), or close with a per-text prior.`
        : "this form corefers with more than one established referent, so the type level withholds " +
          "admission; each of its mentions is an occurrence-level question — resolve by activation " +
          "recall against the candidates (the perceiver's pronouns/roles machinery), or close with " +
          "a per-text prior.",
    });
  }

  return { events, gaps, merges };
};
