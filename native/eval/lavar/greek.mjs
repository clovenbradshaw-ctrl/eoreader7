// greek.mjs — the PRO-DROP seam for Ancient Greek (--lang=grc/ell) (2026-09-17).
//
// Ancient Greek grammaticalizes its clause subject IN the verb (person+number
// endings): a finite verb with no overt nominative is a COMPLETE clause, not
// an incomplete one. The positional reader's S90 gate — "a clause needs a
// subject group AND an object group" (eot-jsonl.mjs) — is the English/Latin-
// script assumption its own header admits carrying over unchanged. MEASURED
// on Epictetus' Enchiridion: 259 sentences, the gate refused 254. A pro-drop
// language is not missing subjects; the subject is where the language puts it.
//
// This seam recovers what the gate refused, mechanically and NEVER by hand-
// typed vocabulary: the earned VERB is named, its OBJECT is the maximal
// nominal run after it (a token whose dominant class the language's OWN
// received POSPrior@1 types as nominal: NOUN/PROPN/ADJ/PRON/DET/NUM — the
// prior decides, nobody types a word list), and the run stops at the first
// token the prior types as non-nominal (a second VERB, an ADP/SCONJ/CCONJ,
// an adverb) or at punctuation. The subject is DISCLOSED as grammaticalized
// in the verb and is never fabricated into a referent (the ledger's own
// anti-self-referent law: end1==label would be a fold).
//
// The object run tolerates forms the prior does not attest (Greek inflects
// heavily): an unknown token continues the run, because refusing a heavy
// inflected noun for being un-attested would re-introduce the very deafness
// this file exists to close. Boundaries are conservative, never greedy.

import { stripDiacritics as strip, groupByStem, refOf } from "../../adapters/text/stem-identity.js";

const TOKEN = /[\p{L}\p{N}’']+|[.,;:!?—–()«»“”]/gu;
const NOMINAL = new Set(["NOUN", "PROPN", "ADJ", "PRON", "DET", "NUM"]);
// The clause reader's nominal set excludes DET — the article is a case probe,
// never a being; bare nominals are collected on their own case-marked ending.
const CLAUSE_NOMINAL = new Set(["NOUN", "PROPN", "ADJ", "PRON", "NUM"]);
const STOP = new Set(["VERB", "ADP", "SCONJ", "CCONJ", "ADV", "AUX"]);
// The Greek definite article IS the case probe: ὁ (nom), τοῦ (gen), τῷ
// (dat), τόν (acc) — the article marks its noun's grammatical role, and the
// reader uses it where English uses capital letters.
const ARTICLES = new Set(["ὁ", "ἡ", "οἱ", "αἱ", "τό", "τά", "τὸν", "τήν", "τοῦ", "τῆς", "τῶν", "τῷ", "τῇ", "τοῖς", "ταῖς"]);

const tokenize = (text) => {
  const out = [];
  for (const m of text.matchAll(TOKEN)) out.push({
    w: m[0].toLowerCase(), raw: m[0], start: m.index, end: m.index + m[0].length,
    punct: /^[.,;:!?—–()«»“”]$/.test(m[0]),
  });
  return out;
};

// stripDiacritics is the shared adapters/text/stem-identity.js primitive
// (imported above as `strip`), not re-derived here — Greek ACCENTS MOVE
// between cases (θά-να-τος → θα-νά-του), the exact reason that module's own
// stem comparison exists. Re-exported under greek.mjs's own established
// name for backward compatibility with any existing caller.
export { strip as stripDiacritics };

/** confirmedVerbSet(prior, share) — every form the received POSPrior@1
 * attests as (VERB+AUX)-dominant above the share floor: the sole authority
 * on what may head a relation in Greek. Mechanical; the prior decides. */
export function confirmedVerbSet(prior, share = 0.5) {
  const forms = prior?.forms ?? prior ?? {};
  const confirmed = new Set();
  for (const [form, tags] of Object.entries(forms)) {
    const verbish = (tags.VERB ?? 0) + (tags.AUX ?? 0);
    const total = Object.values(tags).reduce((a, b) => a + b, 0);
    if (total && verbish / total > share) confirmed.add(form);
  }
  return confirmed;
}

/** confirmGreekVerbs(verbs, prior, share) — filter the earned vocabulary to
 * the prior-confirmed verbs. The positional slot-measure earns whatever sits
 * in the verb slot; on free-order Greek that is not a verb (measured: "καὶ",
 * "τὸ", even English front-matter keys). The prior confirms; an un-confirmed
 * proposal is refused — never guessed. Mutates the Set, returns it. */
export function confirmGreekVerbs(verbs, prior, share = 0.5) {
  const confirmed = confirmedVerbSet(prior, share);
  for (const v of verbs) if (!confirmed.has(v)) verbs.delete(v);
  return verbs;
}

/** nominalClass(form, prior) — the prior's dominant class for a form, or
 * null if un-attested. Mechanical: the class with the most attestations. */
export function nominalClass(form, prior) {
  const counts = prior?.forms?.[form];
  if (!counts) return null;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

// A capitalised token, Unicode-general (not a Latin-only [A-Z] check) — the
// SAME shape surfaces.js's own CAP_TOKEN uses for English, applied here to a
// different script for a reason that had to be MEASURED, not assumed: see
// bareBeingCandidates's own header below for why no sentence-initial
// exclusion is carried over from that English precedent.
const CAP = /^[\p{Lu}][\p{L}ʼ’]*$/u;

/** bareBeingCandidates(toks, prior) — internal collector for THE BARE-NAME
 * TIER (2026-09-17, closing the gap CLAUDE.md's own session record names:
 * "greekBeings's article-gated referent-identity mechanism does not find
 * recurring beings on Homeric epic verse"). Two measured, disclosed facts
 * license this, neither assumed:
 *
 * 1. Homeric proper names are largely ABSENT from a Koine/Attic-trained
 *    POS prior's own vocabulary (checked directly: zero of six tested
 *    Iliad character names — Ἀχιλλεύς, Ὀδυσσεύς, Ἀγαμέμνων, Ἕκτωρ — are
 *    attested in the real GreekPOSPrior@1 at all), and the article-marked
 *    tier above already measures zero beings across the whole corpus —
 *    two of its own gates (article adjacency, prior attestation) both
 *    structurally cannot fire on this material's own proper-name
 *    vocabulary.
 * 2. What the real fetched Perseus edition's own orthography DOES carry:
 *    capitalisation reserved for proper names, not sentence-initial
 *    position — MEASURED on 200,000 characters of the real Iliad text,
 *    sentence-initial capitalisation (8.9%, 84/941) is indistinguishable
 *    from the OVERALL word capitalisation rate (9.4%, 3049/32281).
 *    English's near-100%-at-sentence-start confound (the reason
 *    surfaces.js's own CAP_TOKEN callers exclude sentence-initial
 *    position) simply does not exist in this edition's convention — so
 *    no sentence-initial exclusion is carried over.
 *
 * A candidate is admitted when the prior is SILENT on the token (the exact
 * class of tolerance greekClauses's own object-run already extends to
 * unattested inflected nominals, applied here to unattested proper names)
 * or when the prior confidently classifies it as NOMINAL; a token the
 * prior confidently classifies as non-nominal (a capitalised conjunction,
 * a capitalised verb at a real sentence start) is refused either way.
 * Capitalisation only nominates a candidate — recurrence
 * (minOccurrences) and the SAME stem-grouping mechanism the article tier
 * already uses still do the actual identity work. A token immediately
 * preceded by an article is skipped here (already counted by the tier
 * above; counting it twice would inflate one true occurrence into two). */
function bareBeingCandidates(toks, prior) {
  const out = [];
  for (let i = 0; i < toks.length; i += 1) {
    const t = toks[i];
    if (t.punct || !CAP.test(t.raw)) continue;
    let p = i - 1;
    while (p >= 0 && toks[p].punct) p -= 1;
    if (p >= 0 && ARTICLES.has(toks[p].w)) continue; // already counted by the article tier
    const cls = nominalClass(t.w, prior);
    if (cls && !NOMINAL.has(cls)) continue; // prior confidently says non-nominal
    out.push({ art: null, head: t.raw, headLower: t.w, at: [t.start, t.end] });
  }
  return out;
}

/** greekBeings(chapterText, prior, { minOccurrences, includeBare }) — THE
 * ABSTRACT-BEING TIER (2026-09-17). Ancient Greek prose is populated by
 * article-marked nominal phrases, not capitalised proper nouns: a being is
 * a recurring ARTICLE + NOMINAL-HEAD chunk (the head typed by the received
 * POS prior), its cased variants grouped by STEM (longest-common-prefix >=
 * 5, at least half the longer form). "ὁ κυβερνήτης" and "τῷ κυβερνήτῃ" are
 * one being (the helmsman) because their stems agree. Identity by
 * consequence, made morphological. Mechanical: the prior classifies, the
 * article cases, the stem groups — nobody types a being.
 *
 * includeBare (default false, so every existing caller is byte-identical):
 * also folds bareBeingCandidates's own recurring capitalised tokens into
 * the SAME stem groups, so a being found once articled and once bare (the
 * ordinary Homeric pattern — a name alternates by metrical convenience)
 * merges into one being with a combined occurrence count, rather than two
 * separate, under-corroborated fragments. A being's `bare` field discloses
 * whether every one of its occurrences came from the bare tier alone. */
export function greekBeings(chapterText, prior, { minOccurrences = 2, includeBare = false } = {}) {
  const toks = tokenize(chapterText);
  const phrases = [];
  for (let i = 0; i < toks.length; i += 1) {
    if (!ARTICLES.has(toks[i].w)) continue;
    let j = i + 1;
    while (j < toks.length && toks[j].punct) j += 1;
    if (j >= toks.length) continue;
    const cls = nominalClass(toks[j].w, prior);
    if (!cls || !NOMINAL.has(cls)) continue;
    phrases.push({ art: toks[i].raw, head: toks[j].raw, headLower: toks[j].w, at: [toks[j].start, toks[j].end] });
  }
  if (includeBare) phrases.push(...bareBeingCandidates(toks, prior));
  // The stem-grouping itself is the shared, language-agnostic primitive
  // (adapters/text/stem-identity.js::groupByStem) — Greek supplies only
  // the candidate phrases and, per group, its own surfaces/bare fields.
  return groupByStem(phrases, { minOccurrences }).map((g) => ({
    stem: g.stem,
    surfaces: [...new Set(g.members.map((m) => (m.art ? `${m.art} ${m.head}` : m.head)))],
    occurrences: g.occurrences,
    at: g.at,
    bare: g.members.every((m) => !m.art),
  }));
}

/** personOf(verbForm, casePrior, opts) — THE PERSON TIER (2026-09-17). The
 * GreekCasePrior@1 (built by build-latin-case-prior.mjs's one-master
 * mechanism from UD_Ancient_Greek-PROIEL) tallies Person|Number by the
 * verb's word-ending: -εις → 2|Sing at 100%, -μαι → 1|Sing, -ουσι → 3|Plur.
 * A pro-drop clause's implicit subject is recoverable from the verb itself.
 * The prior only tallies; the consumer's own confidence floor decides
 * (minShare/minCount) — the prior never guesses, the reader refuses below it.
 */
export function personOf(verbForm, casePrior, { minShare = 0.5, minCount = 20, endingLen = 3 } = {}) {
  const table = casePrior?.verbPersonalEndings;
  if (!table) return null;
  const ending = strip(verbForm).slice(-endingLen);
  const entry = table[ending];
  if (!entry?.ranked?.length) return null;
  const top = entry.ranked[0];
  if (top.share < minShare || top.count < minCount) return null;
  const [person, number] = top.key.split("|");
  return { person: Number(person), number, share: top.share, count: top.count, ending, cell: top.cell ?? null };
}

/** personLabel(person, number, lang) — the third-person term of a Greek
 * grammatical person in the TARGET language. The gloss is a projection, never
 * a baked English sentence: the structured paradigm renders in any language
 * whose terms are declared. */
export function personLabel(person, number, lang = "eng") {
  const L = GLOSS_TERMS[lang] ?? GLOSS_TERMS.eng;
  const key = `${person}|${number}`;
  return L.persons[key] ?? L.persons[`${person}`] ?? "one";
}

// THE DECLARED GLOSS TERMS — received grammatical terminology per language,
// disclosed, never tuned. The paradigm is a cube structure; these are its
// projections. Adding a language is adding its terms, nothing else.
const GLOSS_TERMS = {
  eng: {
    personWord: "person",
    persons: { "1|Sing": "I", "2|Sing": "you", "3|Sing": "he/she/it", "1|Plur": "we", "2|Plur": "you (pl.)", "3|Plur": "they" },
    num: { Sing: "singular", Plur: "plural" }, ord: { 1: "st", 2: "nd", 3: "rd" },
    tense: { Pres: "present", Past: "past", Fut: "future" },
    voice: { Act: "active", Mid: "middle", Pass: "passive" },
    mood: { Ind: "indicative", Sub: "subjunctive", Opt: "optative", Imp: "imperative" },
  },
  ell: {
    personWord: "πρόσωπο",
    persons: { "1|Sing": "εγώ", "2|Sing": "εσύ", "3|Sing": "αυτός/αυτή/αυτό", "1|Plur": "εμείς", "2|Plur": "εσείς", "3|Plur": "αυτοί/αυτές" },
    num: { Sing: "ενικού", Plur: "πληθυντικού" }, ord: { 1: "ο", 2: "ο", 3: "ο" },
    tense: { Pres: "ενεστώτας", Past: "αόριστος", Fut: "μέλλοντας" },
    voice: { Act: "ενεργητική", Mid: "μέση", Pass: "παθητική" },
    mood: { Ind: "οριστική", Sub: "υποτακτική", Opt: "ευκτική", Imp: "προστακτική" },
  },
  fra: {
    personWord: "personne",
    persons: { "1|Sing": "je", "2|Sing": "tu", "3|Sing": "il/elle", "1|Plur": "nous", "2|Plur": "vous", "3|Plur": "ils/elles" },
    num: { Sing: "singulier", Plur: "pluriel" }, ord: { 1: "re", 2: "e", 3: "e" },
    tense: { Pres: "présent", Past: "passé", Fut: "futur" },
    voice: { Act: "actif", Mid: "moyen", Pass: "passif" },
    mood: { Ind: "indicatif", Sub: "subjonctif", Opt: "optatif", Imp: "impératif" },
  },
  spa: {
    personWord: "persona",
    persons: { "1|Sing": "yo", "2|Sing": "tú", "3|Sing": "él/ella", "1|Plur": "nosotros", "2|Plur": "vosotros", "3|Plur": "ellos/ellas" },
    num: { Sing: "singular", Plur: "plural" }, ord: { 1: "ra", 2: "da", 3: "ra" },
    tense: { Pres: "presente", Past: "pasado", Fut: "futuro" },
    voice: { Act: "activa", Mid: "media", Pass: "pasiva" },
    mood: { Ind: "indicativo", Sub: "subjuntivo", Opt: "optativo", Imp: "imperativo" },
  },
};

/** verbGloss(paradigm, lang) — the native reading of a finite verb in the
 * TARGET language: "2nd person singular, present indicative active — you" is
 * one projection of a structure that also reads as "2ο πρόσωπο ενικού,
 * ενεστώτας οριστική ενεργητική — εσύ" or "2e personne du singulier, présent
 * indicatif actif — tu". Pure; declared terms; defaults to English. */
export function verbGloss(paradigm, lang = "eng") {
  if (!paradigm) return null;
  const L = GLOSS_TERMS[lang] ?? GLOSS_TERMS.eng;
  const person = personLabel(paradigm.person, paradigm.number, lang);
  const gram = [paradigm.tense && L.tense[paradigm.tense], paradigm.mood && L.mood[paradigm.mood], paradigm.voice && L.voice[paradigm.voice]].filter(Boolean).join(" ") || "finite";
  const num = paradigm.number ? (L.num[paradigm.number] ?? paradigm.number) : "";
  const ord = L.ord[paradigm.person] ?? "";
  return `${paradigm.person}${ord} ${L.personWord} ${num}, ${gram} — ${person}`;
}

/** glossLanguages() — the languages a paradigm gloss can be rendered in
 * (the declared terms table). Adding a language is adding its terms. */
export const glossLanguages = () => Object.keys(GLOSS_TERMS);

/** paradigmOf(verbForm, casePrior, opts) — THE FULL VERBAL PARADIGM
 * (2026-09-17). Measured: the Greek ending carries Person|Number (215/220),
 * Voice (213/220), Mood (206/220) and Tense (193/220) at decisive shares — a
 * NATIVE speaker settles all four from the verb itself. Each axis is read
 * from its own projection with its own confidence floor, each mapped to its
 * cube cell. Returns { person, number, tense, voice, mood, …cells }. */
export function paradigmOf(verbForm, casePrior, { minShare = 0.5, minCount = 20, endingLen = 3 } = {}) {
  if (!casePrior) return null;
  const ending = strip(verbForm).slice(-endingLen);
  const read = (table) => {
    const e = table?.[ending];
    if (!e?.ranked?.length) return null;
    const top = e.ranked[0];
    if (top.share < minShare || top.count < minCount) return null;
    return top;
  };
  const person = read(casePrior.verbPersonalEndings);
  const voice = read(casePrior.verbVoiceByEnding);
  const mood = read(casePrior.verbMoodByEnding);
  const tense = read(casePrior.verbTenseByEnding);
  if (!person && !voice && !mood && !tense) return null;
  const [p, num] = person?.key.split("|") ?? [null, null];
  return {
    person: p ? Number(p) : null, number: num ?? null,
    voice: voice?.key ?? null, mood: mood?.key ?? null, tense: tense?.key ?? null,
    personCell: person?.cell ?? null, voiceCell: voice?.cell ?? null, moodCell: mood?.cell ?? null, tenseCell: tense?.cell ?? null,
    share: Math.min(person?.share ?? 1, voice?.share ?? 1, mood?.share ?? 1, tense?.share ?? 1),
    ending,
  };
}

/** caseOf(token, casePrior, opts) — the Case|Number of a word from its
 * ending, via the received GreekCasePrior@1 (the one-master builder's
 * nominalEndings: word-ending -> Case|Number -> cube cell). The prior only
 * tallies; the reader's own confidence floor decides — below it, a gap. */
export function caseOf(token, casePrior, { minShare = 0.5, minCount = 10, endingLen = 2 } = {}) {
  const table = casePrior?.nominalEndings;
  if (!table) return null;
  const ending = strip(token).slice(-endingLen);
  const entry = table[ending];
  if (!entry?.ranked?.length) return null;
  const top = entry.ranked[0];
  if (top.share < minShare || top.count < minCount) return null;
  const [Case, number] = top.key.split("|");
  return { case: Case, number, share: top.share, count: top.count, ending, cell: top.cell ?? null };
}

/** beingRefOf(headLower, beingsByStem) — bind a clause end to a tier-1
 * being by the SAME stem comparison greekBeings itself used to discover
 * it (adapters/text/stem-identity.js::refOf) — a discovery pass and a
 * binding pass can never disagree about what counts as the same stem,
 * because both call that one shared function. Greek's own referent
 * namespace ("grc") is fixed here, never a caller-supplied parameter —
 * this function IS the Greek adapter's binder. */
export function beingRefOf(headLower, beingsByStem) {
  return refOf(headLower, beingsByStem.keys(), { lang: "grc" });
}

/** greekClauses(sentText, verbs, posPrior, casePrior, { beings }) — THE
 * CASE-MARKED CLAUSE READER (2026-09-17). The positional reader's subject
 * group is dead on free-order Greek; CASE is the grammar (the prior's own
 * thesis). For each clause segment (bounded by punctuation) and each earned
 * verb: the NOMINATIVE nominal is the subject (SEG·Figure), the ACCUSATIVE
 * (or genitive) is the object, and a nominative after a subjectless verb is
 * a predicate complement — the copula-thesis shape the seam could not see
 * ("τὰ μέν ἐστιν ἐφ' ἡμῖν" — some things ARE in our power). Ends bind to
 * the tier-1 beings by stem. Returns [{verb, subject, object, subjectRef,
 * objectRef, subjectCell, objectCell}] — subject null means pro-drop. */
export function greekClauses(sentText, verbs, posPrior, casePrior, { beings = [], minShare = 0.5, minCount = 10 } = {}) {
  if (!(verbs instanceof Set) || !verbs.size || !casePrior) return [];
  const beingsByStem = new Map(beings.map((b) => [b.stem, b]));
  const toks = tokenize(sentText);
  const segments = [];
  let cur = [];
  for (const t of toks) { if (t.punct) { if (cur.length) segments.push(cur); cur = []; } else cur.push(t); }
  if (cur.length) segments.push(cur);
  const out = [];
  for (const seg of segments) {
    const verbIdx = [];
    for (let i = 0; i < seg.length; i += 1) if (verbs.has(seg[i].w)) verbIdx.push(i);
    for (const vi of verbIdx) {
      const v = seg[vi];
      // BARE AND ARTICLE-HEADED NOMINALS, both case-marked by their ending:
      // Greek predicate nominatives (the copula-thesis complement) are often
      // bare — "ὁ θάνατος ἐστίν φόβος" has no article on φόβος. The DET
      // itself is never collected (the article is a case probe, not a being).
      //
      // PRIOR SILENCE DOES NOT VETO A CASE READING (2026-09-17). A token the
      // POS prior confidently classifies as non-nominal is still refused
      // outright (cls && !CLAUSE_NOMINAL.has(cls)) — the prior's veto holds.
      // But an UNATTESTED token (cls === null) is admitted when caseOf can
      // settle its case from the ending alone — caseOf carries its OWN
      // confidence floor (minShare/minCount) and needs no POS attestation to
      // fire, so refusing it here for a DIFFERENT resource's silence was a
      // narrower gate than either signal on its own requires. Measured
      // reason: two different resources (a Koine/Attic-trained POS prior, a
      // UD_Ancient_Greek-Perseus case prior) do not share one vocabulary —
      // most Homeric proper names and many inflected common nouns are
      // unattested in the POS prior specifically, and this gate was
      // discarding every one of them before caseOf's own reading was ever
      // consulted. A token with NEITHER signal (cls null AND no case) is
      // still refused — there is nothing to go on either way.
      //
      // THE ARTICLE ITSELF MUST NOT SLIP THROUGH ON PRIOR SILENCE (found
      // the moment the above widening shipped — an existing test regressed
      // in the SAME pass that added it, caught before either landed). A
      // Greek article declines to agree with its noun's own case, so its
      // ENDING legitimately reads as a real case (τὸν ends -ον, the exact
      // shape of a real accusative noun) — caseOf cannot and should not try
      // to tell the two apart. When the token happens to be unattested in
      // ONE particular POS prior instance, the widening above would have
      // admitted the article itself as a nominal. ARTICLES is already this
      // file's own closed, received, prior-independent list (used above by
      // greekBeings) — checked first, unconditionally, before either signal.
      const nominals = [];
      for (let i = 0; i < seg.length; i += 1) {
        if (ARTICLES.has(seg[i].w)) continue;
        const cls = nominalClass(seg[i].w, posPrior);
        if (cls && !CLAUSE_NOMINAL.has(cls)) continue;
        const c = caseOf(seg[i].w, casePrior, { minShare, minCount });
        if (!cls && !c) continue;
        nominals.push({ head: seg[i].raw, headLower: seg[i].w, at: [seg[i].start, seg[i].end], case: c?.case ?? null, cell: c?.cell ?? null });
      }
      const nom = nominals.filter((n) => n.case === "Nom");
      const acc = nominals.filter((n) => n.case === "Acc");
      const gen = nominals.filter((n) => n.case === "Gen");
      const subject = nom.length ? nom[0] : null;
      let object = acc.length ? acc[0] : (gen.length ? gen[0] : null);
      if (!object) {
        // The predicate nominative must be a SECOND, DISTINCT nominal from
        // the subject (n !== subject, an identity check on the object,
        // never a value comparison — two textually-identical nominatives
        // are two real occurrences and both may stand). Without this
        // exclusion, a clause with only ONE nominative candidate re-selects
        // its own subject as the "complement" ("X is X") — a real bug
        // found 2026-09-17 the moment Homeric text (bare proper names, no
        // article, often exactly one case-marked nominal per clause) first
        // exercised this path; the earlier copula-thesis test never
        // triggered it because its fixture always has two distinct Nom
        // tokens (θάνατος, φόβος).
        const after = nominals.filter((n) => n.at[0] > v.end && n !== subject);
        const predNom = after.find((n) => n.case === "Nom");
        if (predNom) object = predNom;
      }
      out.push({
        verb: v.raw,
        subject, object,
        subjectRef: subject ? beingRefOf(subject.headLower, beingsByStem) : null,
        objectRef: object ? beingRefOf(object.headLower, beingsByStem) : null,
        subjectCell: subject?.cell ?? null, objectCell: object?.cell ?? null,
      });
    }
  }
  return out;
}

/** correlatives(sentText) — THE MASTERS-LEVEL TIER (2026-09-17). Beyond
 * grammar to ARGUMENT: Greek philosophical prose is built on the μέν/δέ
 * correlative — "on the one hand… on the other hand". The Enchiridion's
 * thesis is one: "τὰ μὲν ἐστιν ἐφ' ἡμῖν, τὰ δὲ οὐκ ἐφ' ἡμῖν" (some things
 * are up to us, others are not). For each δέ in the sentence, the reader
 * names the LEFT half (the μέν-side, with or without the explicit μέν) and
 * the RIGHT half (the δέ-side) — the contrastive architecture of the claim.
 * Pure. */
export function correlatives(sentText) {
  const text = String(sentText ?? "");
  const toks = tokenize(text);
  const out = [];
  for (let i = 0; i < toks.length; i += 1) {
    // MATCH ON THE STRIPPED FORM: δέ's accent is not one codepoint (tonos
    // 0x3AD and varia 0x1F72 render identically); the elided δ' is included.
    const w = strip(toks[i].w);
    if (w !== "δε" && w !== "δ") continue;
    const left = text.slice(0, toks[i].start).trim();
    const right = text.slice(toks[i].end).trim().replace(/^[,.··;:\s]+/, "").replace(/[,;:··\s]+$/, "");
    if (left.length >= 2 && right.length >= 2) {
      out.push({ left, right, leftHasMen: strip(left).includes("μεν"), at: [toks[i].start, toks[i].end] });
    }
  }
  return out;
}

/** prodropClauses(sentText, verbs, prior) — the clauses the positional gate
 * refused: every earned verb, its case-marked nominal object after it (or
 * none), with the object's byte address. Pure; testable. */
export function prodropClauses(sentText, verbs, prior) {
  const out = [];
  if (!(verbs instanceof Set) || !verbs.size) return out;
  const toks = [];
  for (const m of sentText.matchAll(TOKEN)) toks.push({ w: m[0].toLowerCase(), raw: m[0], start: m.index, end: m.index + m[0].length, punct: /^[.,;:!?—–()«»“”]$/.test(m[0]) });
  for (let i = 0; i < toks.length; i += 1) {
    const t = toks[i];
    if (t.punct || !verbs.has(t.w)) continue; // only an earned verb starts a clause here
    let j = i + 1;
    const parts = [];
    while (j < toks.length && !toks[j].punct) {
      const cls = nominalClass(toks[j].w, prior);
      if (cls && !NOMINAL.has(cls)) break; // a second verb, an adposition, a conjunction — the run ends
      parts.push(toks[j]);
      j += 1;
    }
    const object = parts.length ? parts.map((p) => p.raw).join(" ") : null;
    const at = parts.length ? [parts[0].start, parts[parts.length - 1].end] : [t.start, t.end];
    out.push({ verb: t.raw, object, at });
    i = j - 1; // skip the consumed run
  }
  return out;
}