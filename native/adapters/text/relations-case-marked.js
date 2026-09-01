// native/adapters/text/relations-case-marked.js — grammatical role by
// MORPHOLOGY, not position. relations.js's own header says its slot-
// finding is positional: "the token immediately FOLLOWING a candidate
// referent surface... the slot SVO order puts a verb in." That is a fact
// about analytic, fixed-word-order languages (English, French, Chinese) —
// not a fact about clauses in general. Latin, Russian, Finnish, Japanese,
// Korean, and Sanskrit signal grammatical role through case morphology
// (a noun's own ending) or verb agreement, largely independent of
// position — several of these languages already sit in live_priors.
//
// THE ARRANGEMENT NEVER NEEDED GRAMMATICAL NAMES. Two ordered ends and a
// label is already typologically neutral (the-fold's grammar-lens
// section, and POLICIES.md P72 for the shape this organ targets natively:
// `{end1, label, end2}`, never `{subject, verb, object}` — Latin's case
// system does not map 1:1 onto English argument structure closely enough
// to justify borrowing those names a second time through a different
// mechanism). What varies per language is only WHERE to look for the two
// ends and the label — never which one is the agent.
//
// WHY LATIN, FIRST. Not because it is easy — because it is a bad fit for
// the positional mechanism, which is the actual generality test (S31's
// own gate: a fix scoped to a convenient case proves nothing). Latin has
// free constituent order (a real, held-out TEST specimen this organ
// matches exactly against gold: "possedit cetera pontus" — literally
// "possessed the-rest the-sea," verb-object-subject order — this organ
// correctly reports end1=pontus/end2=cetera with no notion of position
// at all) and a real, receivable case-ending system, so the mechanism can
// be built and measured rather than argued.
//
// THE PRIOR IS MEASURED, NOT TYPED IN. `live_priors/derived-priors/
// case-priors/case-marking-lat.json` (`LatinCasePrior@1` — moved there
// 2026-08-30, a received lexicon is content, not app logic, act-priors'
// own precedent) is built from UD_Latin-Perseus (Perseus Digital
// Library texts — Cicero, Ovid, the same classical register already in
// live_priors — CC BY-NC-SA 2.5, giver named, non-commercial noted
// plainly rather than glossed over) by `scripts/build-latin-case-prior.mjs`:
// for every nominal token (NOUN/PROPN/ADJ/PRON/NUM) with a Case feature in
// 1,334 training sentences, tally (word-final 2 characters -> Case|Number)
// and keep the WHOLE ranked distribution, never collapsed to one guess —
// the same ambiguity-preserved discipline pos-eng.json already holds.
// Some endings are genuinely decisive ("-am" is 100% Acc|Sing in this
// corpus); most are not ("-is" spans five distinct readings). A form
// whose ending the training sentences never attested, or whose top
// reading does not clear a declared confidence floor, is a typed gap —
// never a guess dressed as a case.
//
// VERB-FINDING IS RECEIVED, NOT MINED — a real, measured correction.
// The first cut mined 3-character verb-personal-endings from the SAME
// treebank the way case endings are mined above, and it under-covered
// badly: only 75 of 224 distinct endings observed in training cleared a
// volume-5 floor, because personal-ending morphology fragments by
// conjugation-stem vowel (-ent vs -unt vs -ant are all "3rd person
// plural," landing in different buckets) — a modest corpus sample does
// not contain enough of each to earn frequency-based trust. That is the
// structural-floor-vs-model-of-the-material distinction this codebase
// already draws elsewhere (meta-parameters-INVENTORY.md): personal-ending
// morphology is a closed grammatical fact (Allen & Greenough's New Latin
// Grammar, a public-domain standard reference — the giver), not something
// a frequency table should be asked to re-discover from a small sample.
// `esse` (to be — the single most frequent Latin verb, and among the most
// irregular: sum/es/est does not fit any stem+ending split) is a small,
// additional received closed class of its own present-indicative forms;
// imperfect/future/perfect forms of `esse` are a disclosed, unattempted
// extension.
//
// A SECOND REAL BUG, ALSO FOUND BY MEASURING AGAINST GOLD, NOT REASONED
// ABOUT: bare single-character personal endings ("-o" 1sg, "-m" 1sg,
// "-t" 3sg) collide constantly with common noun case endings ("-o" is
// also the 2nd-declension ablative singular; "-m" is also how EVERY
// 1st/2nd-declension accusative singular ends, "-am"/"-um"/"-em"). Left
// unguarded, this forced a spurious second "verb candidate" on 163 of 222
// real single-verb test sentences, reported as `ambiguous_verb`. A `weak`
// personal-ending match is now withdrawn when the SAME word ALSO reads as
// a confident nominal case — the more specific, better-calibrated signal
// wins — never withdrawn outright, which would have silently lost real
// 1sg/3sg coverage on words with no such collision.
//
// MEASURED, HONEST, NOT FORCED HIGHER. Full pipeline (raw sentence in,
// {end1,label,end2} out) against 380 held-out UD_Latin-Perseus TEST
// sentences (never used to build the prior) restricted to single-finite-
// verb clauses: end1 (vs gold nsubj) precision 0.24 / recall 0.07; end2
// (vs gold obj) precision 0.35 / recall 0.11. Modest by conventional NLP
// standards, and disclosed as exactly that rather than tuned past what
// the mechanism actually earned. Isolating the case-classification step
// alone (given the correct token directly, no verb-finding or sentence-
// level competition) shows why: of gold subjects, 82% get a confident
// case reading but only 36% of THOSE are correctly Nom — nominative is
// genuinely the least systematically marked Latin case (3rd-declension
// nominatives are often irregular, stem-final-consonant-driven rather
// than suffix-patterned) — a known fact in Latin morphology, not an
// artifact of this organ. Accusative fares much better (76% of confident
// readings correct) because -um/-am/-em are comparatively unambiguous.
// This asymmetry is reported, not smoothed over: `end1` and `end2` are
// NOT equally reliable, and a caller should not treat them as if they were.
//
// WHAT THIS DOES NOT ATTEMPT. Multi-finite-verb sentences (clause
// segmentation — 559 of 939 test sentences were skipped from measurement
// for exactly this reason, named rather than silently included and
// scored wrong). Bare-stem imperatives (Latin's 2nd-singular imperative
// often has no personal ending at all — "mitte," "carpe" — indistinguishable
// from a noun stem by ending alone; a real, disclosed gap, not a bug).
// Dative/genitive/ablative-marked participants are typed as
// `object_slot_is_oblique_not_accusative`, never silently reported as
// `end2` — the exact SVO-shaped substitution ("call it the object because
// it isn't the subject") this organ exists to refuse. NOUN-PHRASE-INTERNAL
// AGREEMENT is not modeled — an attributive adjective or participle
// sharing its head noun's case ("deiectum leo," a fallen lion: both
// nominative, one word) reads as a SECOND same-case candidate and
// correctly, honestly gaps as `ambiguous_nominative`/`ambiguous_accusative`
// rather than guessing which of the two is the actual clausal argument.
// This is a real, disclosed ceiling on this organ's current recall, not a
// bug: resolving it needs phrase-boundary detection this pass does not
// attempt.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// Loaded once, lazily -- callers that never touch Latin material pay
// nothing. Injectable via `casePrior` for tests and for a future second
// case-marking language sharing this organ's mechanism with its own prior.
//
// THE FILE LIVES IN live_priors, NOT HERE (moved 2026-08-30, act-priors'
// own precedent: "a received lexicon is content, not app logic, so it
// lives with the corpus" — live_priors/derived-priors/case-priors/README.md
// carries the full provenance). This module still owns the CODE that
// reads it, the same repo split phasepost.js already holds for
// ActPrior@1: engine organs live here, the data they receive lives with
// the corpus that received it.
let _defaultPrior = null;
export function defaultLatinCasePrior() {
  if (!_defaultPrior) {
    _defaultPrior = JSON.parse(
      readFileSync(path.join(HERE, "..", "..", "..", "..", "live_priors", "derived-priors", "case-priors", "case-marking-lat.json"), "utf8"),
    );
  }
  return _defaultPrior;
}

const MIN_ENDING_VOLUME = 5; // an ending attested fewer times than this in training is too noisy to trust
const MIN_TOP_SHARE = 0.4; // the top reading must clear this share of the ending's own distribution, or it is a gap

function topReading(table, ending) {
  const entry = table[ending];
  if (!entry || entry.total < MIN_ENDING_VOLUME) return null;
  const top = entry.ranked[0];
  if (!top || top.share < MIN_TOP_SHARE) return null;
  return top;
}

const CASE_ENDING_LEN = 2;

// A small, closed, received class of common Latin prepositions (any
// standard Latin grammar reference — Allen & Greenough's own list) —
// never a candidate participant, no matter what its final two letters
// happen to resemble. A real, measured miss this organ's own test found:
// "Super" (over/above) reads its "-er" ending as a plausible nominative,
// and unguarded, a preposition opening a sentence was reported as its
// subject. The SAME closed-class-exclusion discipline priors.js's own
// NEGATION_WORDS/FIRST_PERSON already hold for English function words,
// applied here to Latin's.
const LATIN_PREPOSITIONS = new Set([
  "ab", "a", "ad", "ante", "apud", "circa", "circum", "contra", "cum", "de",
  "ex", "e", "in", "inter", "ob", "per", "post", "prae", "pro", "propter",
  "sine", "sub", "super", "trans", "extra", "infra", "intra", "supra", "ultra",
]);

function classifyNominal(casePrior, word) {
  const lower = word.toLowerCase();
  if (LATIN_PREPOSITIONS.has(lower)) return null;
  const ending = lower.slice(-CASE_ENDING_LEN);
  const reading = topReading(casePrior.nominalEndings, ending);
  if (!reading) return null;
  const [Case, Number] = reading.key.split("|");
  return { word, ending, case: Case, number: Number, share: reading.share };
}

// Received (Allen & Greenough's New Latin Grammar), not mined -- see this
// file's own header for why the mined 3-character-suffix approach was
// tried first and rejected on measured coverage. Longest suffix checked
// first (the same discipline pronouns.js's own surfaceMatcher already
// holds) so "-ntur" is never shadowed by the bare "-r" it also ends in.
const LATIN_PERSONAL_ENDINGS = [
  { suffix: "ntur", person: "3", number: "Plur" },
  { suffix: "mini", person: "2", number: "Plur" },
  { suffix: "mur", person: "1", number: "Plur" },
  { suffix: "tur", person: "3", number: "Sing" },
  { suffix: "ris", person: "2", number: "Sing" },
  { suffix: "re", person: "2", number: "Sing" },
  { suffix: "mus", person: "1", number: "Plur" },
  { suffix: "tis", person: "2", number: "Plur" },
  { suffix: "nt", person: "3", number: "Plur" },
  // `weak`: measured live against real gold sentences (this file's own
  // tests) to collide constantly with common noun-case endings — "-o" is
  // also the 2nd-declension ablative singular; "-m" is how every 1st/2nd-
  // declension accusative singular ends; "-or" is also the extremely
  // common 3rd-declension nominative agent-noun suffix ("praedator,"
  // "amator," "victor" are all ordinary nouns, not deponent verbs).
  // Withdrawn below when the SAME word also carries a confident nominal
  // reading — never dropped outright, which would lose real coverage on
  // words with no such collision.
  { suffix: "or", person: "1", number: "Sing", weak: true },
  { suffix: "o", person: "1", number: "Sing", weak: true },
  { suffix: "m", person: "1", number: "Sing", weak: true },
  { suffix: "t", person: "3", number: "Sing", weak: true },
];
const MIN_VERB_STEM_LEN = 2; // "da-tur", "i-t" are genuinely short real stems, measured against gold forms

// `esse` (to be): present indicative only, the dominant forms in
// practice. Imperfect/future/perfect forms are a disclosed, unattempted
// extension -- named here so a future pass does not have to re-discover
// that esse needed special-casing at all.
const ESSE_FORMS = {
  sum: { person: "1", number: "Sing" }, es: { person: "2", number: "Sing" }, est: { person: "3", number: "Sing" },
  sumus: { person: "1", number: "Plur" }, estis: { person: "2", number: "Plur" }, sunt: { person: "3", number: "Plur" },
};

function classifyVerb(word) {
  const lower = word.toLowerCase();
  if (ESSE_FORMS[lower]) return { word, ending: lower, ...ESSE_FORMS[lower], share: 1, weak: false, giver: "lang/la esse paradigm, received" };
  for (const { suffix, person, number, weak } of LATIN_PERSONAL_ENDINGS) {
    if (lower.length - suffix.length < MIN_VERB_STEM_LEN) continue;
    if (lower.endsWith(suffix)) return { word, ending: suffix, person, number, share: 1, weak: Boolean(weak), giver: "lang/la personal endings, received" };
  }
  return null;
}

// Strip LEADING/TRAILING non-letter characters (a word-attached period,
// comma, quote) -- not "the whole token is punctuation," which never
// trims "manent." to "manent" (a real bug this organ shipped with once,
// caught only by validating against real sentences rather than hand-typed
// examples). Same \p{L} Unicode-letter-boundary discipline pronouns.js's
// own surfaceMatcher already uses.
const stripPunct = (w) => w.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");

/**
 * extractCaseMarkedRelation(text, { casePrior }) -> { end1, label, end2, gap }
 *
 * The typologically-neutral shape natively: an ordered first end, a
 * label, an ordered second end (CLAUDE.md's grammar-lens section) — never
 * `subject`/`verb`/`object`, because Latin's dative/genitive/ablative
 * participants have no honest 1:1 mapping onto English argument
 * structure and this organ refuses to force one.
 *
 * @param {string} text one sentence, single finite verb. A sentence with
 *   zero or multiple finite verbs is out of this organ's declared scope
 *   (clause segmentation, unbuilt) — callers pre-filter or accept the
 *   resulting `ambiguous_verb`/`no_verb_found` gap as an honest refusal.
 * @param {object} options
 * @param {object} [options.casePrior] the LatinCasePrior@1 object.
 *   Defaults to `defaultLatinCasePrior()` (case-marking-lat.json);
 *   injectable for tests and for a future second case-marking language.
 * @param {string} [options.verbHint] an exact form to treat as the
 *   clause's verb, bypassing verb-finding — isolates role-assignment
 *   accuracy for measurement. Production callers never pass this.
 */
export function extractCaseMarkedRelation(text, { casePrior = defaultLatinCasePrior(), verbHint = null } = {}) {
  const words = String(text ?? "").split(/\s+/).map(stripPunct).filter(Boolean);

  let verbCandidates = words
    .map((w) => ({ w, v: classifyVerb(w) }))
    .filter((x) => x.v)
    .filter((x) => !x.v.weak || !classifyNominal(casePrior, x.w));

  let chosenVerb = null;
  if (verbHint) {
    const w = words.find((x) => x.toLowerCase() === verbHint.toLowerCase());
    chosenVerb = w ? { w, v: classifyVerb(w) } : null;
  } else if (verbCandidates.length === 1) {
    chosenVerb = verbCandidates[0];
  } else if (verbCandidates.length > 1) {
    // More than one plausible finite-verb ending. A typed gap, never a
    // guess at which is the clause's actual predicate — that needs
    // clause segmentation this organ does not attempt.
    return { end1: null, label: null, end2: null, gap: { reason: "ambiguous_verb", candidates: verbCandidates.map((c) => c.w) } };
  }
  if (!chosenVerb) return { end1: null, label: null, end2: null, gap: { reason: "no_verb_found" } };

  const nominals = words.filter((w) => w !== chosenVerb.w).map((w) => classifyNominal(casePrior, w)).filter(Boolean);
  let nominatives = nominals.filter((n) => n.case === "Nom");
  const accusatives = nominals.filter((n) => n.case === "Acc");
  const obliques = nominals.filter((n) => n.case === "Dat" || n.case === "Abl" || n.case === "Gen");

  // Subject-verb NUMBER agreement is grammatical law in Latin, used only
  // to narrow an ambiguous nominative set, never to override a clean
  // single reading.
  if (nominatives.length > 1 && chosenVerb.v?.number) {
    const agreeing = nominatives.filter((n) => n.number === chosenVerb.v.number);
    if (agreeing.length === 1) nominatives = agreeing;
  }

  const gaps = [];
  let end1 = null, end2 = null;
  if (nominatives.length === 0) gaps.push("no_nominative_found");
  else if (nominatives.length > 1) gaps.push("ambiguous_nominative");
  else end1 = nominatives[0];

  if (accusatives.length === 1) end2 = accusatives[0];
  else if (accusatives.length > 1) gaps.push("ambiguous_accusative");
  else if (obliques.length > 0) gaps.push("object_slot_is_oblique_not_accusative");
  else gaps.push("intransitive_or_no_object_found");

  return {
    end1: end1 ? { word: end1.word, case: end1.case, number: end1.number } : null,
    label: { word: chosenVerb.w, person: chosenVerb.v?.person ?? null, number: chosenVerb.v?.number ?? null },
    end2: end2 ? { word: end2.word, case: end2.case, number: end2.number } : null,
    gap: gaps.length ? gaps : null,
  };
}
