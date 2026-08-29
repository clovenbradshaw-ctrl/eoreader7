// eoreader6 · perceiver/text/relations — SVO extraction from prose.
//
// MEDIUM-SPECIFIC BY CONSTRUCTION, and that is why it lives in the perceiver.
// The organ above it (emergence/graph.js) consumes (subject, verb, object,
// polarity) triples and never learns where they came from — a video
// perceiver would supply its own triples from actor-action-target and the
// graph would not change a line.
//
// THE VOCABULARY IS DERIVED, NEVER TYPED IN. This file used to carry a
// 90-word hand-listed English verb string (`married|fought|led|wrote|...`),
// and that list was the whole terrain's bottleneck: every triple the graph
// ever saw was gated on a literal match against it, so any English prose
// that didn't happen to use one of those 90 words produced zero triples —
// zero nodes, zero edges, no Network, nothing for `induceKinds` to induce a
// Kind from. MEASURED on a civic-prose passage using ordinary verbs the list
// omitted (praised, approved, filed, briefed, lobbied, summoned): 0 triples.
// Rewriting the same sentences with verbs the list happened to contain
// (told, gave, found, knew, saw) produced a full graph. The list was not a
// simplification of English, it was a sample of it standing in for the
// whole, and every terrain built on CON·Link inherited that sample's edges.
//
// `discoverRelationVocab` replaces the list with a measurement: a candidate
// verb is the token immediately FOLLOWING a candidate referent surface
// (perceiver/text/surfaces.js::extractSurfaces — the SAME blind, capitalised-
// run detector every other organ in this ladder already uses to find the
// cast) — the slot SVO order puts a verb in, with the surface standing as
// the clause's subject. Admitted only if it is not itself capitalised (not a
// surface), not a bare number, and not a member of this text's own closed
// class (material.js::functionWordSet, Zipf-derived, no stopword list).
//
// TWO SHAPES WERE MEASURED AND ONE WAS REFUSED. The first attempt anchored on
// BOTH ends — the token strictly BETWEEN two surfaces — matching the shape a
// hand-verb-list would have matched. On Frankenstein (64 blind referents,
// 1,031 surface occurrences in ~78k words) it found *six* candidates in the
// whole novel: name-dense civic prose (the case this design was first argued
// from) has a named object in most clauses; a first-person novel does not —
// objects are pronouns, which this ladder cannot yet resolve to a referent
// (surfaces.js's own documented model-tier gap). Anchoring on ONE end — what
// immediately follows a surface acting as subject — needs no object-side
// referent and found 165 candidates, 33 of them recurring across ≥2 DISTINCT
// surfaces: entered, went, came, appeared, became, nursed, shone, spent, saw,
// spoke, seemed, soothed, desired among them, alongside residual noise
// (auxiliaries and prepositions the Zipf threshold didn't catch at this
// book's size — `were`, `could`, `from` — the same tuning tension
// material.js's own DEFAULT_RELEVANCE_THRESHOLD comment already names).
// Anchoring on the token BEFORE a surface was tried too and refused: it
// mixes true object-final verbs with premodifying epithets ("dear
// Elizabeth", "poor Justine") that recur next to many names for reasons that
// have nothing to do with being a relation.
//
// `minSurfaces` applies the same recurrence discipline
// `referents/entity.js::admitEntity` applies to a being: a candidate seen
// after only ONE surface scored well once; one seen after several DIFFERENT
// surfaces recurs, and only a recurring difference is testimony (SEED.md,
// "the unit of record").
//
// This is still a heuristic, and still declared as such. It will not
// fabricate: no triple is emitted without a literal match against the
// vocabulary it was handed, and a caller that hands in no vocabulary gets no
// triples back, never a guessed one.
//
// NEGATION MARKERS ARE NOT IN SCOPE HERE. "not", "never", "didn't" and the
// rest are a small closed grammatical category, the same tier as narrator.js's
// FIRST_PERSON pronoun set or surfaces.js's Roman-numeral grammar — a
// received fact about a language's function words, not an open-class
// semantic list standing in for content the text should be measured for.
// Amendment V says this directly: such a set "is a received prior with a
// named giver... not a set mined from the material." What was mined out
// above is the open class (verbs), which has no such standing.
//
//   · POLARITY IS READ, NEVER ASSERTED. "never married" and "did not love"
//     are negative relations, not absent ones. Defaulting to affirmative
//     would fabricate the most consequential bit in the triple.
//
// The extraction is heuristic and declared as such. It will not fabricate:
// no triple is emitted without a literal verb match in the clause.

import { diaNorm } from "./surfaces.js";
import {
  NEGATION_WORDS, THIRD_PERSON_SINGULAR,
  AUXILIARY_VERBS, DEFINITE_DETERMINERS, INDEFINITE_DETERMINERS,
  POSSESSIVE_DETERMINERS, NP_COORDINATORS,
} from "./priors.js";

// The cell this organ occupies on the operator grid (engine/operators.js):
// CON · Link · Binding — subject · verb · object triples; the graph's
// medium-specific mouth. Declared, checked by conformance.
export const CELL = Object.freeze({ op: "CON", grain: "Figure" });

// Unicode-aware: translated prose is full of accented names (Natásha, Hélène)
// that ASCII \w silently truncates mid-name.
const W = "[\\p{L}\\p{N}_'’]+";
const TOKEN_STRIP = /^[^\p{L}\p{N}'’]+|[^\p{L}\p{N}'’]+$/gu;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// A received closed class (Amendment V: a small set of function words is a
// named prior, not content mined from the material — the same tier as
// narrator.js's FIRST_PERSON or surfaces.js's Roman-numeral grammar). Held
// as a Set so discoverRelationVocab can refuse to admit "never" as a verb —
// measured on Frankenstein at minSurfaces=1: it followed a surface once and
// nothing here knew to say no. Migrated to the prior register (priors.js).
//
// No word-count cap (`{0,2}` or any other value) gates the window this
// class is tested against (built in extractRelations, see `windowStart`
// below) — MEASURED against pg2600 (War and Peace), a cap has no principled
// value: {0,2} silently missed hundreds of real same-clause negations ("I
// have never yet asked you for...", "he did not like the conversation"),
// and every value tried up to {0,6} still read as correct by hand, so the
// cap was measuring nothing except how conservative the guess happened to
// be. What actually distinguishes a connected negation from an unrelated
// one is not word count — it's whether an INDEPENDENT clause with its own
// verb sits between the trigger and this verb, which the window is already
// bounded by. Once that's true, the check reduces to a plain existence
// test: ANY trigger anywhere in an already-clause-bounded window is a real
// one — the regex below does not need to also anchor "and nothing but words
// after it to the end", so it doesn't try to. That anchored shape was tried
// first (`\s+(?:W\s+)*$`) and measured to be a real ReDoS: `W` itself is a
// `+` nested inside the outer `*`, so on a non-match (the common case —
// most windows are affirmative) the engine had to try every way of
// partitioning the window into word+space runs before giving up. MEASURED:
// switching {0,2} to that unbounded anchored form took full-book extraction
// from 15s to 97-285s (non-deterministic — classic backtracking blowup,
// worse on some runs than others), concentrated on short, unrelated
// sentences with no real cause to be slow. This plain existence form has no
// repeated group to backtrack through at all.
//
// `bin/priors/lang/en.json`'s own pattern (spans.js::splitSentences's
// `{abbreviations}` seam) is applied here too: "a mechanism is
// language-agnostic or it is not a mechanism," and a hardcoded English
// closed class is a lie for every other language. `words` is a
// caller-supplied Set (a vendored `NegationPrior@1`, e.g.
// `bin/priors/lang/eu.json`'s `negation: ["ez", ...]` for Basque, which
// fronts its own negation particle BEFORE the finite verb exactly as this
// window already checks for — see that file's own provenance for the
// citation). Reference equality against the module's own default
// `NEGATION_WORDS` (never a value comparison, which an injected Set that
// happens to contain the same English words would wrongly satisfy) is how
// the English-only "no longer" idiom stays English-only: it is appended
// ONLY when nothing was injected, never presumed to apply to a vendored
// language's own closed class.
const negationBeforeVerbFor = (words) => {
  const alt = [...words].map(escapeRe).join("|");
  const extra = words === NEGATION_WORDS ? "|no longer" : "";
  return new RegExp(`\\b(?:${alt}${extra})\\b`, "iu");
};

// The exact complement of W: any run of characters that is not part of a
// word — whitespace, commas, parens, quote marks, em-dashes, a Gutenberg
// hard-wrap newline. Collapsing every such run to one space before testing
// the negation-before-verb regex lets it see past formatting exactly as it already
// sees past ordinary whitespace — it can only turn a non-match into a match
// (it never deletes, splits, or reorders a word), so no sentence that
// already resolved "-" changes.
const NOISE_RUN = /[^\p{L}\p{N}_'’]+/gu;

// Sentence-ending punctuation — a real boundary already used elsewhere in
// this file's own design (MATCHER's object terminator below), not a
// negation-specific invention. Commas are deliberately excluded: they set
// off parenthetical asides WITHIN a clause ("did not, truly, love") and
// stopping there would undo the NOISE_RUN collapse above.
const SENTENCE_END = /[.!?;]/g;

/**
 * The text's own relation vocabulary — measured, not typed in.
 *
 * `surfaces` is whatever perceiver/text/surfaces.js::extractSurfaces already
 * found blind (an array of `{surface}` or a plain iterable of surface
 * strings) — the same candidate cast every referent-gated reader in this
 * ladder builds before it ever calls this organ, so nothing new is asked of
 * a caller that already runs the ladder in order (SIG before CON;
 * operators.js::OPERATOR_ORDER).
 *
 * A candidate is the token immediately following a surface occurrence — at
 * most a few characters of whitespace away, never crossing a clause break
 * (a comma, a full stop, a quote mark ends the run of letters this reads, so
 * "Victor. Elizabeth" or "Victor, who" both find no candidate there, exactly
 * as intended). It is admitted to the vocabulary only if:
 *
 *   · it is not itself capitalised — a capitalised token there is shaped
 *     like a surface, not a verb ("Victor AND Elizabeth" excluded by case,
 *     not by a conjunction list);
 *   · it is not a bare number;
 *   · it is not a member of `functionWords` — this text's own Zipf-derived
 *     closed class (material.js::functionWordSet). Omit `functionWords` and
 *     this filter simply does not run, same discipline as
 *     surfaces.js::extractSurfaces;
 *   · it follows at least `minSurfaces` DISTINCT surfaces. `minSurfaces` is
 *     declared by the caller, never defaulted here, for the same reason
 *     `referents/entity.js`'s `minArrivals` is never defaulted: how much
 *     recurrence makes a pattern rather than a coincidence is a property of
 *     the reading, not a constant this file gets to assume for every
 *     caller's material.
 *
 * `negationWords` (bin/priors/lang/en.json's own pattern, the same seam
 * spans.js::splitSentences's `{abbreviations}` already opened): defaults to
 * this file's own English `NEGATION_WORDS` (priors.js, giver lang/en). A
 * caller reading a different language's material injects that language's
 * OWN vendored negation prior instead — e.g. Basque's "ez" (bin/priors/
 * lang/eu.json) — never a second hardcoded English list standing in for a
 * language it was never measured against.
 *
 * Returns `{ verbs, candidates }`. `candidates` is every token that followed
 * at least one surface, ranked by how many distinct surfaces it followed,
 * kept so a caller can inspect what the gate let through and what it
 * refused — a gap is a result, and so is the sorted list around a threshold.
 * Each candidate also carries `surfaceForms` — the distinct surfaces it
 * followed — so a causal reader can accumulate admission frame by frame
 * (LOSS-LESS-LADDER.md L3: a verb is admitted once it has ALREADY followed
 * minSurfaces distinct surfaces, never on the strength of the whole text).
 *
 * `posPrior`, when supplied, is a giver-named `POSPrior@1`. A connector is
 * admitted only when VERB+AUX account for more than half of its attested
 * uses. Unattested forms remain admitted as an explicit prior gap rather
 * than being treated as non-verbs: a witness cannot refuse what it never
 * saw. Genuinely mixed attested forms are refused and remain available to an
 * occurrence-level resolver; one anomalous annotation cannot turn a common
 * preposition into a verb.
 * Omit the prior and the original material-only behaviour is unchanged.
 */
/**
 * `anchorSpans` (optional) — POSITIONAL anchors beyond the surface strings:
 * [{index, length, anchor}] where `anchor` names WHO stands at that span (a
 * bound referent's id). This is the Fold-conditioned door pronoun-subject
 * clauses come through: a pronoun the binding organ resolved to an
 * established being is a witnessed occurrence of that being, so the token
 * after it sits in the same slot the token after a name does. The wall is
 * positional on purpose — anchoring the STRING "he" would anchor every
 * unbound "he" in the book, which is exactly the unlicensed shape the
 * treebank-VERB nomination was refused for (S8: the prior attempt is
 * cited, not repeated). Same gates, same distinct-anchor recurrence count,
 * one shared tally.
 */
export const discoverRelationVocab = (text, { surfaces, functionWords = null, minSurfaces, negationWords = NEGATION_WORDS, posPrior = null, anchorSpans = null, phrasalPredicates = false, auxiliaryVerbs = AUXILIARY_VERBS } = {}) => {
  if (!Number.isInteger(minSurfaces) || minSurfaces < 1)
    throw new TypeError("discoverRelationVocab: minSurfaces is declared — how much recurrence counts as a pattern is the caller's to say, never a default here");

  const s = String(text ?? "");
  const names = [...(surfaces ?? [])]
    .map((x) => (typeof x === "string" ? x : x?.surface))
    .filter((x) => typeof x === "string" && x.length > 0);
  const uniqueNames = [...new Set(names)].sort((a, b) => b.length - a.length);
  if (!uniqueNames.length && !(anchorSpans?.length)) return { verbs: new Set(), candidates: [] };

  // Longest-first alternation, same discipline as read-people.mjs's
  // surfaceToId: "Victor Frankenstein" must win over "Victor" at the same
  // start offset, or the shorter surface eats half the longer one's hits.
  // A BRACKETED ASIDE IS CROSSED, not read as the end of the clause.
  //
  // This allowed only whitespace between a surface and its candidate verb,
  // so any aside opening with a bracket hid the verb entirely. Measured on
  // the sentence that states the fact plainly:
  //
  //   "Hannibal Hamlin (August 27, 1809 - July 4, 1891) was the 15th vice
  //    president of the United States"
  //
  // The token after "Hamlin" is "(August", not "was", so no verb was ever
  // nominated for him and no edge named him as a subject.
  //
  // Category, never an enumeration: \p{Ps} is every opening punctuation
  // mark in every script and \p{Pe} every closing one, so （ ） 「 」 【 】
  // ［ ］ are covered without listing them. Zero-or-more, so the ordinary
  // no-aside case is byte-identical to before.
  //
  // Skipping is the meaning, not a workaround: a parenthetical here carries
  // facts ABOUT the surface just named — dates, aliases — not a new subject
  // taking its own verb. The being and its aside are one mention, so the
  // token after the MENTION is the token after the being.
  const AFTER = /^\s*(?:[\p{Ps}][^\p{Pe}]*[\p{Pe}]\s*)*([\p{L}\p{N}'’]+)/u;

  const surfacesByToken = new Map(); // lowercase token -> Set(anchors it directly followed: surface forms and bound-referent ids alike)
  // ONE tally for both anchor kinds — the gates below run identically, so a
  // candidate seen once after a name and once after a bound pronoun counts
  // two distinct anchors, exactly as two names would.
  //
  // `phrasalPredicates` (DR5, live_priors/goldens/reading/DERIVED-RULES.md):
  // OFF by default — byte-identical to before. ON, a leading run of
  // AUXILIARY_VERBS/negation tokens is SKIPPED (bounded to
  // MAX_AUX_HOPS) before nominating a candidate, so "Member States have
  // pledged..." nominates "pledged" — the real content verb — rather than
  // "have", which this file's own tallyAfter always found before (measured
  // live: "have" alone as the anchor swallows the entire real predicate,
  // "pledged themselves to achieve...", into the OBJECT capture instead).
  // This function ONLY changes which token gets NOMINATED; extractRelations's
  // own `phrasalPredicates` (the same name, the same flag a caller passes to
  // both) is what lets MATCHER actually bridge the skipped aux chain in the
  // real text — the two are a declared pair, not independent knobs, because
  // nominating "pledged" without also letting MATCHER reach past "have
  // pledged" would make matches that used to succeed (wrongly) simply
  // vanish instead.
  const MAX_AUX_HOPS = 4;
  const tallyAfter = (afterEnd, anchorId) => {
    let cursor = afterEnd;
    for (let hop = 0; hop <= MAX_AUX_HOPS; hop += 1) {
      const after = s.slice(cursor, cursor + 40).match(AFTER);
      if (!after) return;
      const cleaned = after[1].replace(TOKEN_STRIP, "");
      if (!cleaned) return;
      if (/^\p{Lu}/u.test(cleaned)) return;       // capitalised — shaped like a surface, not a verb
      if (/^\p{Nd}+$/u.test(cleaned)) return;     // a bare number, not a verb
      const lower = cleaned.toLowerCase();
      cursor += after[0].length;
      if (phrasalPredicates && (auxiliaryVerbs.has(lower) || negationWords.has(lower))) {
        // An auxiliary/modal may itself be the clause's OWN main verb — a
        // bare copula ("There WAS nothing") or possessive ("the book HAD
        // pictures") — rather than a true auxiliary with a participle
        // following ("was reading"). The identical ambiguity phasepost.js's
        // own header already names for have/has/had, found HERE by measuring
        // this exact mechanism against real prose (live_priors/goldens/
        // reading): unconditionally skipping every aux occurrence, with no
        // fallback, silently dropped "was"/"had" from the vocabulary
        // whenever nothing verb-like happened to follow, losing real edges
        // the pre-DR5 pipeline used to find. Both readings now get
        // independent evidence: the aux word ITSELF is tallied too (never a
        // negation word — a modifier, never a verb, even bare), and the
        // scan still continues past it looking for a real content verb.
        // MATCHER's own AUX_GROUP_RE always prefers the LONGER aux+verb
        // combination when a real vocab verb follows it (greedy bounded
        // repetition), so admitting the bare aux as an ADDITIONAL candidate
        // never reintroduces the swallow bug DR5 was built to close — it
        // only restores the bare-copula reading for clauses where nothing
        // better follows.
        if (auxiliaryVerbs.has(lower)) {
          if (!surfacesByToken.has(lower)) surfacesByToken.set(lower, new Set());
          surfacesByToken.get(lower).add(anchorId);
        }
        continue;
      }
      if (functionWords && functionWords.has(lower)) return; // this text's own closed class
      if (negationWords.has(lower)) return; // a negation marker modifies a verb; it is not one
      if (!surfacesByToken.has(lower)) surfacesByToken.set(lower, new Set());
      surfacesByToken.get(lower).add(anchorId);
      return;
    }
  };
  if (uniqueNames.length) {
    const SURFACE_RE = new RegExp(`\\b(?:${uniqueNames.map(escapeRe).join("|")})\\b`, "gu");
    let m;
    while ((m = SURFACE_RE.exec(s)) !== null) tallyAfter(m.index + m[0].length, diaNorm(m[0]));
  }
  for (const span of anchorSpans ?? []) {
    if (!Number.isFinite(span?.index) || !Number.isFinite(span?.length) || !span?.anchor) continue;
    tallyAfter(span.index + span.length, String(span.anchor));
  }

  const verbs = new Set();
  const candidates = [];
  for (const [token, seenAfter] of surfacesByToken) {
    const attested = posPrior?.forms?.[token] ?? null;
    const attestedTotal = attested ? Object.values(attested).reduce((sum, count) => sum + count, 0) : 0;
    const verbShare = attestedTotal ? ((attested.VERB ?? 0) + (attested.AUX ?? 0)) / attestedTotal : 0;
    const verbDominant = !posPrior || !attested || verbShare > 0.5;
    const posStanding = !posPrior ? "not_supplied" : !attested ? "gap" : verbDominant ? "verb_dominant" : "nonverb_dominant";
    candidates.push({ verb: token, surfaces: seenAfter.size, surfaceForms: Array.from(seenAfter), verbDominant, verbShare, posStanding, upos: attested });
    if (seenAfter.size >= minSurfaces && verbDominant) verbs.add(token);
  }
  candidates.sort((x, y) => y.surfaces - x.surfaces);

  return { verbs, candidates };
};

/**
 * Triples stated in one passage, against a vocabulary the caller measured
 * (`discoverRelationVocab`, or any other named Set — the mouth does not care
 * where a Set came from, only that nothing is matched that isn't in it).
 * `limit` defaults to Infinity: that cap is a display concern, and silently
 * dropping relations before the graph has seen them would make the belief
 * structure a function of a presentation default.
 *
 * No `verbs`, or an empty one, yields no triples — never a guessed match.
 * That is the same refusal every organ in this repo makes when handed no
 * ground to perceive through: the honest answer to "what did this passage
 * say" before a vocabulary exists to hear it with is nothing, not a fallback
 * dictionary.
 *
 * `negationWords`: same param, same default, same seam as
 * discoverRelationVocab's own — see negationBeforeVerbFor's header, above.
 *
 * `functionWords` (this text's own Zipf-derived closed class,
 * material.js::functionWordSet — same discipline as discoverRelationVocab's
 * own `functionWords` param, same file, above): bounds the OBJECT capture at
 * the next function-word boundary instead of the next clause terminator.
 * MEASURED (NEXT-RELATION-SLOTS.md, full War and Peace reading, 2,863 bound
 * pronouns classified by what the object capture did with them): the old
 * `.+?` clause-final capture swallowed 54.3% of them inside a wider object
 * (mean width 45 chars) that no filler mechanism could attach to; bounding
 * at the next function word instead cut that to 13.2% and nearly doubled
 * the isolated-capture rate a pronoun/name lookup CAN attach to (12.2% ->
 * 20.5%). Also validated against a scored civic-prose clause-agency golden
 * this function feeds (see READING-POLICY.md A19 for the number — deliberately
 * not repeated here: a conformance test pins that no file outside that
 * golden's own directory may name it by path, so production code is never
 * tuned toward one eval set): every genre improved, none regressed. Omit
 * `functionWords` and this bound simply does not run — the object capture
 * falls back to the original clause-final shape, same discipline as every
 * other optional filter in this file.
 */
const WORD_TOKEN = /[\p{L}\p{N}_'’-]+/gu;

/**
 * expandSubjectNP(s, anchorStart, anchorEnd, leftBound, closed) — DR4
 * (live_priors/goldens/reading/DERIVED-RULES.md): MATCHER's own subject
 * capture is at most 2 tokens immediately before the verb; a real NP is
 * often much wider ("the peoples of the United Nations", "disregard and
 * contempt for human rights"). This walks BACKWARD from the anchor's own
 * start, token by token, never crossing `leftBound` (the same clause-
 * boundary reach `extractRelations`'s own polarity window already computes
 * — real signal already in hand, not a guessed reach):
 *
 *   - a definite/indefinite/possessive determiner INCLUDES itself, then
 *     STOPS — the NP's own left edge (RULE.md Part I, DR4's own rule).
 *   - an NP coordinator ("and"/"or") INCLUDES itself and CONTINUES, so a
 *     coordinated sibling NP further back ("Tom, and his brother arrived")
 *     joins too — but only if something stands before it to coordinate
 *     WITH; a coordinator with nothing behind it is left unconsumed.
 *   - clause-internal punctuation (a comma, semicolon, colon) between two
 *     tokens STOPS the walk without crossing it — the same wall
 *     `leftBound` already enforces at the sentence/clause level, applied
 *     one register finer.
 *   - an ordinary content word (article-less nouns, adjectives, a
 *     genitive) INCLUDES itself and CONTINUES.
 *
 * Reaching `leftBound` with no determiner ever found returns the WIDEST
 * span found rather than refusing — a bare-plural or mass-noun subject
 * ("human rights are...") is ordinary, legal English with no determiner
 * at all, and DR4 names this as a case to ADMIT, never to guess past.
 *
 * Returns `null` when nothing wider than the anchor was found (byte-
 * identical subject either way — the caller keeps its own anchor text).
 */
export function expandSubjectNP(s, anchorStart, anchorEnd, leftBound, closed = {}) {
  const {
    definiteDeterminers = DEFINITE_DETERMINERS,
    indefiniteDeterminers = INDEFINITE_DETERMINERS,
    possessiveDeterminers = POSSESSIVE_DETERMINERS,
    npCoordinators = NP_COORDINATORS,
    auxiliaryVerbs = AUXILIARY_VERBS,
  } = closed;
  const toks = [];
  WORD_TOKEN.lastIndex = Math.max(0, leftBound);
  let tm;
  while ((tm = WORD_TOKEN.exec(s)) !== null) {
    if (tm.index >= anchorEnd) break;
    toks.push({ text: tm[0], start: tm.index, end: tm.index + tm[0].length });
  }
  let i = toks.findIndex((t) => t.start === anchorStart);
  if (i <= 0) return null; // anchor not found, or already at the leftmost token — nothing to expand
  const anchorTokIdx = i;
  while (i > 0) {
    const prev = toks[i - 1];
    const between = s.slice(prev.end, toks[i].start);
    if (/[,;:]/.test(between)) break; // a clause-internal boundary — stop, never cross it
    const lower = prev.text.toLowerCase();
    // An auxiliary verb can never sit inside a subject NP — reaching one
    // before ever finding a determiner (or `leftBound`) means the walk has
    // crossed OUT of the noun phrase and INTO predicate territory, which
    // only happens when the raw anchor this walk started from was itself
    // mis-positioned (a fronted adverbial between an auxiliary and its main
    // verb — "the peoples ... have IN THE CHARTER reaffirmed" — leaves the
    // MATCHER's own bare anchor sitting on "the Charter", nowhere near the
    // real subject, and widening blindly from there walked the whole
    // preceding clause including "have" itself before this check existed).
    // REFUSE outright (null, not a partial span) rather than return
    // whatever was accumulated so far: a wrong wider subject is worse than
    // a coarse one, the same standing rule this file's own span-pairing
    // logic already states elsewhere. Checked before the determiner/
    // coordinator branches only for readability — an auxiliary is never a
    // member of either closed class, so the order does not change behavior.
    if (auxiliaryVerbs.has(lower)) return null;
    if (definiteDeterminers.has(lower) || indefiniteDeterminers.has(lower) || possessiveDeterminers.has(lower)) {
      i -= 1; // include the determiner — normally the NP's own left edge...
      // ...UNLESS what precedes it is "of" — "the peoples OF THE United
      // Nations" — a genitive/PP-linking preposition means the just-found
      // determiner belongs to an EMBEDDED noun phrase modifying an outer
      // head noun, which has its OWN determiner further back still. Bounded
      // by the same `i > 0`/`leftBound` walls as the rest of this loop —
      // this can only continue as many times as real tokens remain, never
      // an unbounded search — so "the King of England" and "the leader of
      // the party of the coalition" both resolve to their true outer NP
      // rather than stopping at the innermost embedded one.
      if (i > 0 && toks[i - 1].text.toLowerCase() === "of" && !/[,;:]/.test(s.slice(toks[i - 1].end, toks[i].start))) {
        i -= 1; continue;
      }
      break;
    }
    if (npCoordinators.has(lower)) {
      if (i - 1 === 0) break; // a dangling coordinator with nothing behind it to join — do not consume it
      i -= 1; continue; // include the coordinator, keep looking for the sibling NP's own edge
    }
    i -= 1; // an ordinary content word — include, keep scanning
  }
  if (i === anchorTokIdx) return null; // nothing wider found
  return { subject: s.slice(toks[i].start, anchorEnd), start: toks[i].start };
}

export const extractRelations = (text, { verbs, limit = Infinity, functionWords = null, negationWords = NEGATION_WORDS, phrasalPredicates = false, auxiliaryVerbs = AUXILIARY_VERBS, nounPhraseSubjects = false, definiteDeterminers = DEFINITE_DETERMINERS, indefiniteDeterminers = INDEFINITE_DETERMINERS, possessiveDeterminers = POSSESSIVE_DETERMINERS, npCoordinators = NP_COORDINATORS } = {}) => {
  const negationBeforeVerb = negationBeforeVerbFor(negationWords);
  const vocab = verbs instanceof Set ? verbs : new Set(verbs ?? []);
  if (vocab.size === 0) return [];

  const VERB_ALT = [...vocab].map(escapeRe).join("|");
  // The object group always requires at least one token (mandatory first
  // `${W}`) — a pronoun or name sitting immediately after the verb is never
  // refused for being function-word-shaped itself ("gave HIM the letter":
  // "him" is a function word by Zipf frequency, and must still be captured,
  // or the one case this bound exists to help — a pronoun as the whole
  // object — would be the one case it broke). Only tokens AFTER that first
  // one stop at a function-word boundary. No trailing anchor after the
  // object group (unlike negationBeforeVerbFor's earlier ReDoS, fixed above)
  // — the object simply matches as much as it structurally can and the
  // pattern ends there, so there is nothing for a failed later requirement
  // to backtrack the object choice against. MEASURED adversarially (a
  // 5,000-token run with no function word anywhere, and the same run with
  // no matching verb at all, forcing a full scan): both resolve in single-
  // digit milliseconds.
  const OBJECT_GROUP = functionWords && functionWords.size
    ? `(${W}(?:\\s+(?!(?:${[...functionWords].map(escapeRe).join("|")})\\b)${W})*)`
    : `(.+?)(?:\\.|,|;|$)`;
  // Subject and verb and object are ALL read straight from MATCHER's own
  // m[1]/m[2]/m[3] — a chorus review (CHORUS-LOG.md, Diaconis) found this
  // file used to re-derive them via a second regex (SPLITTER) applied to
  // m[0], a bare `.+?` with no dotAll flag. That worked while the object
  // group was clause-terminator-bounded (never crossed a line break
  // either), but once OBJECT_GROUP started spanning a Gutenberg hard-wrap
  // newline (its `\s+` separators match `\n`, by design — the whole point
  // of NOISE_RUN elsewhere in this file), SPLITTER's `.` could not follow
  // it across that same newline and silently re-split at a LATER verb
  // occurrence instead, corrupting the subject to several tokens. Confirmed
  // reproducing a real corrupted admit in the checked-in civic-prose golden
  // data before this fix. Two regexes agreeing to parse the same text is a
  // liability by construction; one is now the only source of truth.
  // Second site of the same wall: an aside can stand between the subject
  // and its verb, so a bare `\s+` between them could never pair "Hamlin"
  // with "was" no matter what the vocabulary discovered.
  const ASIDE = `[\\p{Ps}][^\\p{Pe}]*[\\p{Pe}]`;
  // `phrasalPredicates` (DR5): OFF by default — MATCHER is byte-identical
  // to before (AUX_GROUP_RE is the empty string, so the concatenation below
  // reduces exactly to the original pattern). ON, a BOUNDED (0-4 hops, the
  // same MAX_AUX_HOPS discoverRelationVocab's own paired fix uses) run of
  // auxiliary/negation tokens is allowed between the subject and the
  // recognised verb — bounded, never `*`, so this adds no new backtracking
  // hazard to a file whose own header already records two prior ReDoS
  // incidents. Captured as its own group so the full predicate ("have
  // pledged", "does not measure") rides in `verb`, never split with its
  // real head trapped inside the object.
  const AUX_HOP_LIMIT = 4;
  const AUX_GROUP_RE = phrasalPredicates
    ? `((?:\\b(?:${[...new Set([...auxiliaryVerbs, ...negationWords])].map(escapeRe).join("|")})\\b\\s+){0,${AUX_HOP_LIMIT}})`
    : "";
  const VERB_IDX = phrasalPredicates ? 3 : 2;
  const OBJECT_IDX = phrasalPredicates ? 4 : 3;
  // The subject's own optional second token is ordinarily greedy (prefers
  // to take it when the rest of the pattern can still succeed either way)
  // — harmless before this pass, because an auxiliary/negation word there
  // never let the REST of the original pattern succeed anyway (VERB_ALT
  // had to sit immediately after, and an aux word is never itself the
  // recognised verb). `phrasalPredicates` changes that: AUX_GROUP_RE can
  // now independently absorb the very same word, so BOTH readings of "He
  // does not measure" (subject "He does" + aux "not" + verb "measure", or
  // subject "He" + aux "does not" + verb "measure") lead to a successful
  // overall match, and greedy always wins the first — wrongly, since an
  // auxiliary/negation word is a received CLOSED class that is never
  // itself the second token of an ordinary two-word subject ("Prince
  // Andrew", never "Prince does"). The negative lookahead makes that
  // structural fact explicit rather than leaving it to accidental
  // backtracking order; SUBJECT_SECOND_GUARD is the empty string (no
  // lookahead at all) when `phrasalPredicates` is off, so the ORIGINAL
  // pattern text is unchanged byte-for-byte in the default case.
  const SUBJECT_SECOND_GUARD = phrasalPredicates
    ? `(?!\\s+(?:${[...new Set([...auxiliaryVerbs, ...negationWords])].map(escapeRe).join("|")})\\b)`
    : "";
  const MATCHER = new RegExp(`(?<=^|[^\\p{L}])(${W}(?:${SUBJECT_SECOND_GUARD}\\s+${W})?)\\s+(?:${ASIDE}\\s+)*${AUX_GROUP_RE}(${VERB_ALT})\\s+${OBJECT_GROUP}`, "giu");

  // The exact terminator set the OLD (pre-function-word-bound) object
  // capture used to reach: `.`, `,`, `;`, or end of string. Used below only
  // to find the TRUE clause boundary for polarity-window purposes — never
  // to bound what is captured as the object, which is now deliberately
  // narrower (the function-word boundary). Decoupling these two was a
  // second chorus finding (Dijkstra/Frankfurt/Alexander, independently):
  // reusing the object's own (now narrower) end as "how far this clause's
  // territory reaches" left a trailing negation word AFTER a truncated
  // object ("...never abandoned hope, and...") unclaimed by either match,
  // so it silently bled into the NEXT relation's polarity window instead of
  // being walled off with the clause it actually belongs to. Confirmed
  // reproducing a fabricated negative polarity on an entirely affirmative
  // clause before this fix.
  const clauseEndAfter = (from) => {
    let end = s.length;
    for (const ch of [".", ",", ";"]) {
      const idx = s.indexOf(ch, from);
      if (idx !== -1 && idx < end) end = idx;
    }
    return end === s.length ? end : end + 1;
  };

  const rels = [];
  const seen = new Set();
  const s = String(text ?? "");
  let m;
  // The end of the previous match's own CLAUSE (via clauseEndAfter, not
  // just where its now-narrower object capture stopped) — a triple with
  // its own verb already claims everything up to its clause boundary, so a
  // negation trigger sitting before that belongs to THAT clause, not this
  // one. Real signal already computed by this loop, not a second
  // vocabulary or a guessed reach.
  let previousMatchEnd = 0;
  // Sentence-terminator scan advances forward ALONGSIDE the main match loop
  // (never rewound to 0) — MATCHER's own m.index is monotonically
  // increasing, so each terminator is visited once across the whole call,
  // not once per match. Re-scanning from the start of `s` for every match
  // would make this O(document length × match count) instead of O(document
  // length), the exact cost this file's existing 40-char-slice design used
  // to avoid by staying small — this stays cheap by staying forward-only.
  let lastSentenceEnd = -1;
  SENTENCE_END.lastIndex = 0;

  while ((m = MATCHER.exec(s)) !== null) {
    // The subject group is at most 2 tokens ("Prince Andrew"), and a leading
    // conjunction or determiner ("and he", "the King") can occupy the FIRST
    // of those 2 slots exactly the way a wide object used to swallow a
    // pronoun — the same defect, mirrored to the other end of the triple.
    // Post-processed here rather than bounded in MATCHER itself: rejecting a
    // function-word-shaped token at match-start via the regex would also
    // reject the single most important case this exists to serve — "He told
    // her" IS a bare pronoun subject and must stay "He", not be refused for
    // being function-word-shaped. Stripping only fires when there are TWO
    // tokens and the FIRST is the function word, so a lone pronoun subject
    // is never touched (nothing left to strip it down to). Also refused
    // when the REMAINING token is itself a negation trigger (the effective
    // `negationWords` — this file's own NEGATION_WORDS by default, or
    // whatever the caller injected) — a chorus finding (Dijkstra): "does not
    // measure" captures subject "does not", and stripping "does" (a function
    // word) left "not" standing in as the reported subject, a fabricated
    // referent that is actually the negation marker for the verb, not an
    // entity at all. Left as the original 2-token form instead — garbage
    // that plainly fails referent matching, not garbage disguised as a name.
    // And refused when the STRIPPED token is itself a third-person singular
    // pronoun (THIRD_PERSON_SINGULAR, already a received prior elsewhere in
    // this file's own ladder — priors.js, giver lang/en) — another chorus
    // finding (Holmes): "his King"/"her King" both strip to bare "King",
    // and for a caller with no referent-resolution seam of its own
    // (packages/host/sing.js, wired to this parameter by the same session
    // that added it), the stripped string IS the identity the belief graph
    // keys on — two distinct people sharing a title, distinguished only by
    // a possessive, would silently merge into one graph node. "the King" ->
    // "King" stays fine ("the" carries no identity of its own to lose);
    // only a pronoun that itself carries person/gender is refused.
    let subject = m[1].trim();
    // The subject's own start offset in `s` — group 1 begins exactly where
    // the whole match does (the lookbehind ahead of it is zero-width) —
    // moves when stripping below removes a leading function word, so DR4's
    // NP-expansion (further down) walks backward from where the SURVIVING
    // subject text actually begins, never from the raw (pre-strip) start.
    let subjectStart = m.index;
    if (functionWords && functionWords.size) {
      const subjTokens = subject.split(/\s+/);
      if (
        subjTokens.length === 2 &&
        functionWords.has(subjTokens[0].toLowerCase()) &&
        !negationWords.has(subjTokens[1].toLowerCase()) &&
        !(subjTokens[0].toLowerCase() in THIRD_PERSON_SINGULAR)
      ) { subjectStart = m.index + m[1].lastIndexOf(subjTokens[1]); subject = subjTokens[1]; }
    }
    // DR5: the aux/negation chain MATCHER absorbed (empty string when
    // `phrasalPredicates` is off, or none was present) rides ahead of the
    // recognised anchor verb — the full predicate is what `verb` carries,
    // exactly as a phrasal-predicate-aware downstream reader (phasepost.js's
    // own headVerb) expects, never just the anchor token alone.
    const auxText = phrasalPredicates ? (m[2] ?? "").trim() : "";
    const anchorVerb = m[VERB_IDX].trim().toLowerCase();
    const verb = auxText ? `${auxText.toLowerCase()} ${anchorVerb}` : anchorVerb;
    const object = m[OBJECT_IDX].trim().replace(/[.,;]$/, "");
    if (!subject || !object) { previousMatchEnd = clauseEndAfter(m.index + m[0].length); continue; }

    const key = `${subject}|${verb}|${object}`.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);

      // The polarity window's backward bound is whichever is CLOSER: the
      // previous match's own clause end (see comment above
      // `previousMatchEnd`), or the most recent sentence-ending punctuation
      // — both real facts already in hand, never a character or word count.
      const subjEnd = m.index + m[1].length;
      while (SENTENCE_END.lastIndex <= m.index) {
        const sm = SENTENCE_END.exec(s);
        if (sm === null) break;
        // Overshot this match — put the cursor back exactly on it (not all
        // the way to 0) so the NEXT match's scan still finds it; exec()
        // otherwise advances lastIndex past it permanently.
        if (sm.index >= m.index) { SENTENCE_END.lastIndex = sm.index; break; }
        lastSentenceEnd = sm.index;
      }
      const windowStart = Math.max(previousMatchEnd, lastSentenceEnd + 1, 0);
      const before = s.slice(windowStart, subjEnd + 1).replace(NOISE_RUN, " ");
      // DR4 (live_priors/goldens/reading/DERIVED-RULES.md): OFF by default
      // — byte-identical subject/offset to before. ON, the survived subject
      // (post function-word-stripping, so `subjectStart` already reflects
      // whatever the caller will actually keep) is left-expanded to its own
      // NP boundary, never crossing `windowStart` — the identical clause
      // reach the polarity window above already computes, reused rather
      // than re-derived.
      let finalSubject = subject;
      let finalSubjectStart = subjectStart;
      if (nounPhraseSubjects) {
        const expanded = expandSubjectNP(s, subjectStart, subjectStart + subject.length, windowStart, { definiteDeterminers, indefiniteDeterminers, possessiveDeterminers, npCoordinators, auxiliaryVerbs });
        if (expanded) { finalSubject = expanded.subject; finalSubjectStart = expanded.start; }
      }
      rels.push({
        subject: finalSubject,
        verb,
        object,
        // Additive to the existing `before`-window check, never a
        // replacement for it: DR5's own aux-chain capture is the first time
        // a negation sitting BETWEEN subject and verb ("does NOT measure")
        // is captured text at all rather than silently swallowed into the
        // object, so it could never be seen by any polarity check before —
        // widening the SIGNAL a check can see is not the same risk as
        // widening what the check itself accepts.
        polarity: (negationBeforeVerb.test(before) || (phrasalPredicates && negationBeforeVerb.test(auxText))) ? "-" : "+",
        offset: m.index,
        subjectOffset: finalSubjectStart,
        objectOffset: m.index + m[0].lastIndexOf(m[OBJECT_IDX]),
      });
      if (rels.length >= limit) { previousMatchEnd = clauseEndAfter(m.index + m[0].length); break; }
    }
    previousMatchEnd = clauseEndAfter(m.index + m[0].length);
  }

  return rels;
};
