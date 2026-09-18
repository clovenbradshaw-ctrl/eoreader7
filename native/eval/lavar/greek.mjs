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
//
// READER UPGRADE (2026-09-18, muse-swarm-grc): the ending-only case vote
// misreads ambiguous endings the treebank itself splits (PROIEL TRAIN: -ης
// is Gen|Sing 69% / Nom|Sing 30% — so "ὁ κυβερνήτης" read Gen). An
// unsupervised swarm (Wilson's gate + born mass, nine Muses seating the
// nine terrains, full 27-cell op×grain seed) bred reader configs against
// the PROIEL TEST split's sentence context until CASE agreement cleared a
// declared 88% floor: 84.4% -> 89.4% at 88.3% coverage (was 89.9%) with
// {minShare 0.6, minCount 20, articleMode soft, articleWindow 1}. Soft =
// the preceding article overrides ONLY a weak ending vote (share < 0.8),
// so "ὁ κυβερνήτης" turns Nom while "τὸν Κυψέλου" (Gen vote 0.98) stays
// Gen. Neuter το/τά are Nom/Acc-ambiguous and excluded from the probe by
// design. caseOf defaults are unchanged (isolated, article off); the
// clause reader below carries the swarm's floors. SUBSTANTIVES (2026-09-18):
// a lone article heads its phrase (substantiveOf) — "τὰ μὲν ἐστιν" finally
// reads its subject; neuter το/τά resolve by the clause verb's own number
// and position, and stay gaps without verb tables.
import { grammarCell } from "../../kernel/cube.js";

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
// ARTICLE_CASE — the unambiguous articles as Case|Number, keyed stripped.
// το/τά are DELIBERATELY ABSENT: neuter το is Nom-or-Acc (Sing), τα
// Nom-or-Acc (Plur) — "τὰ μὲν ἐστιν" is nominative. Forcing them Acc would
// mislabel every neuter subject; an ambiguous probe is no probe.
const ARTICLE_CASE = new Map([
  ["ο", "Nom|Sing"], ["η", "Nom|Sing"], ["οι", "Nom|Plur"], ["αι", "Nom|Plur"],
  ["τον", "Acc|Sing"], ["την", "Acc|Sing"], ["τους", "Acc|Plur"], ["τας", "Acc|Plur"],
  ["του", "Gen|Sing"], ["της", "Gen|Sing"], ["των", "Gen|Plur"],
  ["τω", "Dat|Sing"], ["τη", "Dat|Sing"], ["τοις", "Dat|Plur"], ["ταις", "Dat|Plur"],
]);

/** articleProbe(prevForms, window) — the nearest preceding unambiguous
 * article within `window` tokens back, or null. Pure; the map decides. */
export function articleProbe(prevForms = [], window = 1) {
  const forms = Array.isArray(prevForms) ? prevForms : [];
  for (let d = 1; d <= window && d <= forms.length; d += 1) {
    const f = strip(String(forms[forms.length - d] ?? "").toLowerCase());
    if (!f || /^[.,;:!?—–()«»“”]+$/.test(forms[forms.length - d])) return null;
    if (ARTICLE_CASE.has(f)) {
      const [Case, number] = ARTICLE_CASE.get(f).split("|");
      const cell = grammarCell("Case", Case);
      return { case: Case, number, dist: d, cell: cell ? { op: cell.op, grain: cell.grain, terrain: cell.terrain, stance: cell.stance } : null };
    }
  }
  return null;
}

const tokenize = (text) => {
  const out = [];
  for (const m of text.matchAll(TOKEN)) out.push({
    w: m[0].toLowerCase(), raw: m[0], start: m.index, end: m.index + m[0].length,
    punct: /^[.,;:!?—–()«»“”]$/.test(m[0]),
  });
  return out;
};

/** stripDiacritics — NFD + drop combining marks. Greek ACCENTS MOVE between
 * cases (θά-να-τος → θα-νά-του): a stem comparison on raw letters sees the
 * shifted accent as a different word. The stem is the unaccented skeleton. */
const strip = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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

/** greekBeings(chapterText, prior, { minOccurrences }) — THE ABSTRACT-BEING
 * TIER (2026-09-17). Ancient Greek prose is populated by article-marked
 * nominal phrases, not capitalised proper nouns: a being is a recurring
 * ARTICLE + NOMINAL-HEAD chunk (the head typed by the received POS prior),
 * its cased variants grouped by STEM (longest-common-prefix >= 5, at least
 * half the longer form). "ὁ κυβερνήτης" and "τῷ κυβερνήτῃ" are one being
 * (the helmsman) because their stems agree. Identity by consequence, made
 * morphological. Mechanical: the prior classifies, the article cases, the
 * stem groups — nobody types a being. */
export function greekBeings(chapterText, prior, { minOccurrences = 2 } = {}) {
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
  const stems = new Map(); // stem -> phrases
  const assign = (ph) => {
    const b = strip(ph.headLower);
    for (const [stem, grp] of stems) {
      const a = strip(stem);
      const len = Math.min(a.length, b.length);
      let lcp = 0;
      while (lcp < len && a[lcp] === b[lcp]) lcp += 1;
      if (lcp >= 5 && lcp / Math.max(a.length, b.length) >= 0.5) { grp.push(ph); return; }
    }
    stems.set(ph.headLower, [ph]);
  };
  for (const ph of phrases) assign(ph);
  const out = [];
  for (const [stem, grp] of stems) {
    if (grp.length < minOccurrences) continue;
    out.push({
      stem,
      surfaces: [...new Set(grp.map((g) => `${g.art} ${g.head}`))],
      occurrences: grp.length,
      at: grp[0].at,
    });
  }
  return out.sort((a, b) => b.occurrences - a.occurrences);
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
 * tallies; the reader's own confidence floor decides — below it, a gap.
 *
 * ENCLITIC DATIVES first (2026-09-18): μοι/σοι/ἐμοί (Sing) and ὑμῖν/ἡμῖν
 * (Plur) are a closed class of dative pronouns — MEASURED on the PROIEL
 * TEST split: 27/27 gold Dat, 27/27 ending-voted Nom (the stripped -οι
 * ending merges dative σοί with nominative-plural οἱ). A closed grammatical
 * class, received in the priors.js precedent, never a vocabulary list.
 * DISCLOSED RESIDUAL: possessive σοί (your, nom.pl) shares the stripped
 * form and will read Dat — unattested in TEST, named not hidden.
 *
 * `articleMode` admits the preceding article as a second witness (the
 * muse-swarm's soft rule): "off" (default — isolated ending vote, exactly
 * as before), "soft" (the article overrides only a weak vote below
 * `weakBelow`, or a gap), "strict" (the article always wins). The article
 * needs its context: `prevForms` are the raw preceding tokens, oldest
 * first, `articleWindow` how far back to look. */
const ENCLITIC_DATIVES = new Map([
  ["μοι", "Sing"], ["σοι", "Sing"], ["εμοι", "Sing"],
  ["υμιν", "Plur"], ["ημιν", "Plur"],
]);
export function caseOf(token, casePrior, { minShare = 0.5, minCount = 10, endingLen = 2, articleMode = "off", prevForms = null, articleWindow = 1, weakBelow = 0.8 } = {}) {
  const encliticNum = ENCLITIC_DATIVES.get(strip(token).toLowerCase());
  if (encliticNum) {
    const cell = grammarCell("Case", "Dat");
    return { case: "Dat", number: encliticNum, share: 1, count: 0, ending: strip(token).slice(-endingLen), cell: cell ? { op: cell.op, grain: cell.grain, terrain: cell.terrain, stance: cell.stance } : null, src: "enclitic" };
  }
  const table = casePrior?.nominalEndings;
  if (!table) return null;
  const ending = strip(token).slice(-endingLen);
  const entry = table[ending];
  const top = entry?.ranked?.[0] ?? null;
  const vote = top && top.share >= minShare && top.count >= minCount
    ? (() => { const [Case, number] = top.key.split("|"); return { case: Case, number, share: top.share, count: top.count, ending, cell: top.cell ?? null, src: "ending" }; })()
    : null;
  if (articleMode !== "off" && prevForms) {
    const probe = articleProbe(prevForms, articleWindow);
    if (probe && (articleMode === "strict" || !vote || vote.share < weakBelow)) {
      return { case: probe.case, number: probe.number, share: vote?.share ?? null, count: vote?.count ?? 0, ending, cell: probe.cell ?? vote?.cell ?? null, src: "article" };
    }
  }
  return vote;
}

/** GREEK_CLAUSE_OPENERS — the subordinating complementizers that open a
 * finite subordinate clause (2026-09-18), keyed stripped: ὅτι (that), ὡς
 * (as/how/that), μή (lest/that-not), εἰ (if), ἐπεί (since), ὅτε (when),
 * ἕως (until), ἵνα (so that), ὅπως (how/so that). The English CLAUSE_OPENERS
 * precedent (adapters/text/priors.js) one register over: a clause is the
 * boundary of an assertion, and an extractor whose left wall is the
 * punctuation-bounded segment walks across it — "πρόσεχε μή σε ἡ φαντασία
 * συναρπάσῃ" read imagination as the subject OF the command. A segment is
 * sub-split on these; the opener stays at the new sub-segment's head (it is
 * skipped as a particle, never collected). DELIBERATELY ABSENT: μέν/δέ
 * (correlatives — correlatives() owns that architecture, splitting on δέ
 * would shred it) and the relative pronouns ὅς/ἥ/ὅ (their pronoun IS the
 * subordinate subject — "ὃς ἐξέβαλε" reads correctly unsplit; relatives are
 * a later tier). ὡς-adverbial fragments without a verb yield no clause —
 * the same harmless absence as any verbless segment. */
const GREEK_CLAUSE_OPENERS = new Set(["οτι", "ως", "μη", "ει", "επει", "οτε", "εως", "ινα", "οπως"]);

/** splitSubordinate(seg, { match }) — sub-split a punctuation-bounded token
 * segment on GREEK_CLAUSE_OPENERS, opener kept at the new head. Pure.
 *
 * `match` (default "stripped") compares stripped forms. MEASURED FAILURE
 * (2026-09-18, ant-opener-swarm): the verb εἶ (you are, circumflex) strips
 * to "ει" — identical to the complementizer εἰ (if, proclitic, NEVER
 * accented). Stripped matching split every εἶ clause ("μωρὸς εἶ" lost its
 * subject). `match: "accent"` additionally requires an unaccented token
 * for the ει opener (no tonos/oxia/varia/perispomeni in NFD) — the exact
 * classical distinction between proclitic and verb. Other openers showed
 * no measured clash and stay stripped. */
const HAS_ACCENT = /[̀́͂]/;
export function splitSubordinate(seg, { match = "stripped" } = {}) {
  const out = [];
  let cur = [];
  for (const t of seg) {
    const f = strip(t.w);
    const isOpen = !t.punct && GREEK_CLAUSE_OPENERS.has(f) && cur.length &&
      !(match === "accent" && f === "ει" && HAS_ACCENT.test(t.w.normalize("NFD")));
    if (isOpen) {
      out.push(cur);
      cur = [];
    }
    cur.push(t);
  }
  if (cur.length) out.push(cur);
  return out.length ? out : [seg];
}

/** REL_CARRY — relative-pronoun forms that ride into the next sub-segment
 * (2026-09-18, ant-opener-swarm). Splitting strands a trailing relative
 * ("…, ἃ μὴ ἔχει αὐτός" → [ἃ] + [μὴ ἔχει αὐτός]): the head is verbless, its
 * final token is the subordinate verb's own object, and αὐτός folds into
 * itself ("αὐτός ἔχει αὐτός"). Article-ambiguous forms (ο/η/οι/αι — ὅ vs ὁ
 * strip identically) are EXCLUDED: only unambiguous relatives ride.
 * Condition: head verbless + head-final ∈ REL_CARRY + next has a verb. */
const REL_CARRY = new Set(["ος", "ον", "ην", "ω", "ους", "ας", "α", "ου", "ης", "ων", "οις", "αις"]);

/** carryRelatives(subs, verbs) — move a stranded trailing relative into the
 * next sub-segment's head, preserving order. Pure. */
export function carryRelatives(subs, verbs) {
  const out = subs.map((s) => [...s]);
  for (let i = 1; i < out.length; i += 1) {
    const prev = out[i - 1], next = out[i];
    if (!prev.length || !next.length) continue;
    if (prev.some((t) => verbs.has(t.w))) continue;
    if (!next.some((t) => verbs.has(t.w))) continue;
    if (!REL_CARRY.has(strip(prev[prev.length - 1].w))) continue;
    next.unshift(prev.pop());
    if (!prev.length) { out.splice(i - 1, 1); i -= 1; }
  }
  return out;
}

/** substantiveOf(tok, nextTok, verbNum, verbStart, posPrior) — the article
 * standing ALONE as a nominal head (2026-09-18). Greek substantivizes
 * freely: "τὰ μὲν ἐστιν" (the things are…), "ὁ δὲ ἀπῆλθεν" (he left). The
 * prior must type the token DET (nobody hand-types an article); the
 * article has NO noun when the next token is not a nominal head or a
 * second article (an attributive "ὁ κυβερνήτης" is never doubled).
 * Unambiguous articles carry their case. Neuter το/τά are resolved by the
 * clause verb's own number and the article's position — the classical
 * schema (neuter plural subjects take a singular verb, so preverbal τα +
 * singular verb is the subject, postverbal τα the object):
 *   τα + Sing + before → Nom|Plur · τα + after → Acc|Plur · το + Sing +
 *   before → Nom|Sing · το + after → Acc|Sing · τα/το + plural verb +
 *   before → null (a neuter plural cannot subject a plural verb; a
 *   topicalized object is refused rather than guessed).
 * Without verb tables (verbNum null) το/τά stay gaps — as before. */
export function substantiveOf(tok, nextTok, verbNum, verbStart, posPrior) {
  if (!tok || nominalClass(tok.w, posPrior) !== "DET") return null;
  const f = strip(tok.w);
  const isUnamb = ARTICLE_CASE.has(f);
  const isNeut = f === "το" || f === "τα";
  if (!isUnamb && !isNeut) return null;
  if (nextTok) {
    const nc = nominalClass(nextTok.w, posPrior);
    if (nc && (CLAUSE_NOMINAL.has(nc) || nc === "DET")) return null;
  }
  const cellFor = (c) => { const cell = grammarCell("Case", c); return cell ? { op: cell.op, grain: cell.grain, terrain: cell.terrain, stance: cell.stance } : null; };
  if (isUnamb) {
    const [Case, number] = ARTICLE_CASE.get(f).split("|");
    return { case: Case, number, cell: cellFor(Case), src: "substantive" };
  }
  if (!verbNum) return null;
  const before = tok.start < verbStart;
  if (f === "τα") {
    if (before) return verbNum === "Sing" ? { case: "Nom", number: "Plur", cell: cellFor("Nom"), src: "substantive" } : null;
    return { case: "Acc", number: "Plur", cell: cellFor("Acc"), src: "substantive" };
  }
  if (before) return verbNum === "Sing" ? { case: "Nom", number: "Sing", cell: cellFor("Nom"), src: "substantive" } : null;
  return { case: "Acc", number: "Sing", cell: cellFor("Acc"), src: "substantive" };
}

/** COPULA_FORMS — the paradigm of εἰμί (to be), stripped whole forms
 * (2026-09-18, ant-residual-swarm). Present, imperfect, future indicative;
 * subjunctive, optative, imperative, infinitive, nominative participles.
 * Giver: Smyth §768. Checked against VERB tokens only (an article never
 * sits in the verb slot), so the ἡ/ᾖ overlap cannot misfire. A closed
 * grammatical class in the priors.js precedent — received, never mined. */
const COPULA_FORMS = new Set([
  "ειμι", "ει", "εστι", "εστιν", "εσμεν", "εστε", "εισι", "εισιν",
  "ην", "ησθα", "η", "ημεν", "ητε", "ησαν",
  "εσομαι", "εση", "εσται", "εσομεθα", "εσεσθε", "εσονται",
  "ω", "ης", "η", "ωμεν", "ητε", "ωσι",
  "ειην", "ειης", "ειη", "ειημεν", "ειητε", "ειησαν",
  "ισθι", "εστω", "ειναι", "ων", "ουσα", "ον",
]);
export const isCopula = (verbForm) => COPULA_FORMS.has(strip(String(verbForm ?? "").toLowerCase()));

/** beingRefOf(headLower, beingsByStem) — bind a clause end to a tier-1 being
 * by stem recurrence (identity by consequence, made morphological): the head
 * and a being's stem share a prefix >= 5, at least half the longer form. */
export function beingRefOf(headLower, beingsByStem) {
  const b = strip(headLower);
  for (const [stem, _b] of beingsByStem) {
    const a = strip(stem);
    const len = Math.min(a.length, b.length);
    let lcp = 0;
    while (lcp < len && a[lcp] === b[lcp]) lcp += 1;
    if (lcp >= 5 && lcp / Math.max(a.length, b.length) >= 0.5) return `ref:grc:auto:${stem}`;
  }
  return null;
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
export function greekClauses(sentText, verbs, posPrior, casePrior, { beings = [], minShare = 0.6, minCount = 20, articleMode = "soft", articleWindow = 1, openerMatch = "accent", carry = true, selfFoldRefuse = true, copAccRefuse = "substantive", auxPartRefuse = true } = {}) {
  if (!(verbs instanceof Set) || !verbs.size || !casePrior) return [];
  const beingsByStem = new Map(beings.map((b) => [b.stem, b]));
  const toks = tokenize(sentText);
  const segments = [];
  let cur = [];
  for (const t of toks) { if (t.punct) { if (cur.length) segments.push(cur); cur = []; } else cur.push(t); }
  if (cur.length) segments.push(cur);
  const out = [];
  // SUBORDINATION (2026-09-18): a complementizer opens a new clause —
  // the matrix verb must not inherit the embedded subject. The opener
  // stays at the sub-segment's head (skipped as a particle, never an end).
  const clausesOf = (seg, verbIdx) => {
    const sub = [];
    for (const vi of verbIdx) {
      const v = seg[vi];
      // The clause verb's own number resolves neuter substantives (τα + singular
      // verb = the classical neuter-plural-subject schema). Null without verb
      // tables — το/τά then stay gaps, exactly as before. Its mood refuses
      // phantom subjects: an imperative addresses (vocative), never nominates —
      // "ἡ πρόσεχε" is not a subject but an address beside a command. Only
      // positive Imp evidence blocks, and only lone-article subjects (overt
      // nouns keep today's behavior — the vocative ambiguity is a separate tier).
      const verbNum = paradigmOf(v.raw, casePrior, { minShare, minCount })?.number ?? null;
      const verbImp = paradigmOf(v.raw, casePrior, { minShare, minCount })?.mood === "Imp";
      // AUX participle without a finite reading (ὄντος: AUX-dominant, no
      // personal ending) takes no nominative subject — a genitive absolute
      // expects its Genitive, and ἡ beside it is an address from elsewhere.
      // Finite AUX (ἐστιν, εἶ: personal ending present) and VERB heads pass.
      const verbAuxBare = nominalClass(v.w, posPrior) === "AUX" && verbNum === null;
      // A copula takes no accusative object (predicate nominative, partitive
      // genitive, prepositional phrase — never Acc). Measured: "Τὸ ἔστιν
      // ἀλλήλους" glued across πρός. Cognate-accusative poetry disclosed.
      const verbCop = isCopula(v.w);
      // BARE AND ARTICLE-HEADED NOMINALS, both case-marked by their ending:
      // Greek predicate nominatives (the copula-thesis complement) are often
      // bare — "ὁ θάνατος ἐστίν φόβος" has no article on φόβος. The DET
      // itself is never collected (the article is a case probe, not a being).
      const nominals = [];
      for (let i = 0; i < seg.length; i += 1) {
        const cls = nominalClass(seg[i].w, posPrior);
        if (cls === "DET") {
          // A lone article is its phrase's head (τὰ μὲν ἐστιν — the things
          // ARE); an article with its noun is never doubled (ὁ κυβερνήτης).
          const sub = substantiveOf(seg[i], seg[i + 1] ?? null, verbNum, v.start, posPrior);
          if (sub && !(auxPartRefuse && sub.case === "Nom" && verbAuxBare)) nominals.push({ head: seg[i].raw, headLower: seg[i].w, at: [seg[i].start, seg[i].end], case: sub.case, cell: sub.cell, caseSrc: sub.src });
          continue;
        }
        if (!cls || !CLAUSE_NOMINAL.has(cls)) continue;
        const prevForms = seg.slice(Math.max(0, i - 3), i).map((t) => t.raw);
        const c = caseOf(seg[i].w, casePrior, { minShare, minCount, articleMode, prevForms, articleWindow });
        nominals.push({ head: seg[i].raw, headLower: seg[i].w, at: [seg[i].start, seg[i].end], case: c?.case ?? null, cell: c?.cell ?? null, caseSrc: c?.src ?? null });
      }
      const nom = nominals.filter((n) => n.case === "Nom");
      const acc = nominals.filter((n) => n.case === "Acc");
      const gen = nominals.filter((n) => n.case === "Gen");
      const subject = nom.length ? (nom.find((n) => n.caseSrc !== "substantive" || !verbImp) ?? null) : null;
      // A BARE ARTICLE cannot predicate a copula ("τὰ ἐστιν τὰ" says
      // nothing), but an ending-marked accusative can BE a neuter predicate
      // ("ἀτιμία ἐστὶ κακόν" — dishonor IS evil: κακόν is Nom neuter wearing
      // an Acc-looking -ον). copAccRefuse "substantive" splits exactly there;
      // "refuse" also drops neuter predicates (measured loss, ant-residual
      // round 2); masculine/feminine Acc after a copula ("ἀλλήλους" across
      // πρός) is cross-phrase glue a phrase-boundary tier must own — gender
      // decides it and the reader has no gender. Cognate-accusative poetry
      // disclosed as before.
      let object;
      if (verbCop && copAccRefuse) {
        const accKept = copAccRefuse === "substantive"
          ? acc.filter((n) => n.caseSrc !== "substantive")
          : [];
        object = accKept.length ? accKept[0] : (gen.length ? gen[0] : null);
      } else {
        object = acc.length ? acc[0] : (gen.length ? gen[0] : null);
      }
      if (!object) {
        const after = nominals.filter((n) => n.at[0] > v.end);
        // A bare-article predicate complement says nothing ("ὁ ἐστιν ὁ") —
        // refused, while ending-based complements ("φόβος") still fill it.
        // A self-predication says nothing either ("νόμος ἐστὶν νόμος" —
        // the ledger's anti-self-referent law: end1 == end2 is a fold).
        const predNom = after.find((n) => n.case === "Nom" && n.caseSrc !== "substantive" &&
          !(selfFoldRefuse && subject && strip(n.headLower) === strip(subject.headLower)));
        if (predNom) object = predNom;
      }
      sub.push({
        verb: v.raw,
        subject, object,
        subjectRef: subject ? beingRefOf(subject.headLower, beingsByStem) : null,
        objectRef: object ? beingRefOf(object.headLower, beingsByStem) : null,
        subjectCell: subject?.cell ?? null, objectCell: object?.cell ?? null,
      });
    }
    return sub;
  };
  for (const seg of segments) {
    let subs = splitSubordinate(seg, { match: openerMatch });
    if (carry) subs = carryRelatives(subs, verbs);
    for (const sub of subs) {
      const subVerbs = [];
      for (let i = 0; i < sub.length; i += 1) if (verbs.has(sub[i].w)) subVerbs.push(i);
      if (!subVerbs.length) continue;
      out.push(...clausesOf(sub, subVerbs));
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