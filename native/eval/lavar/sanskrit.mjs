// sanskrit.mjs — the PRO-DROP seam for Vedic Sanskrit (--lang=san) (2026-09-18).
//
// Sanskrit grammaticalizes its clause subject IN the verb (person+number
// endings) exactly like Greek: a finite verb with no overt nominative is a
// COMPLETE clause, not an incomplete one. Same positional-reader deafness,
// same recovery posture — but every finding below was re-measured on Vedic,
// never carried over from Greek. Where Greek's answers do not transfer, that
// is stated, not smoothed.
//
// WHAT TRANSFERS (the ladder, not the findings):
//   ending-keyed CasePrior@1 tallies built by the one-master builder
//   (build-latin-case-prior.mjs --strip=none --lang=san), the prior only
//   tallies and the reader's own confidence floor decides, ambiguity kept
//   whole per ending, gaps never guesses, out-of-sample competence against
//   the TEST split the prior never saw.
//
// WHAT DOES NOT TRANSFER (measured 2026-09-18 on sa_vedic-ud-test.conllu):
//   1. NO ARTICLE. Sanskrit has no definite article, so there is no article
//      probe and no article-headed beings tier. Beings are recurring BARE
//      nominal stems (cased variants grouped by stem, LCP>=4, half-length
//      rule — the Greek stem discipline with the prefix floor lowered 5→4:
//      Vedic a-/i-stems are short (agni-: agnir/agninā share 4), and 5 would
//      refuse every short-stem being. DISCLOSED RESIDUAL: sandhi-opaque
//      variants (agnir/agnaye share 3) do NOT group — same class as Greek's
//      σοί residual, named not hidden.
//   2. NO ENCLITIC OVERRIDE. Greek's enclitic datives measured 27/27 Dat and
//      earned a closed-class rule. Sanskrit's enclitics measured genuinely
//      ambiguous on TEST (me Dat 33/Gen 19; te Gen 53/Nom|Plur 48/Dat 20;
//      naḥ Dat 39/Acc 38/Gen 33) — forcing one reading would be a guess, so
//      enclitics go through the ending vote like everything else. The Greek
//      rule does not transfer; the ladder's honesty does.
//   3. EIGHT CASES, THREE NUMBERS. Vedic marks Abl/Ins/Loc alongside
//      Nom/Acc/Gen/Dat/Voc, and Dual alongside Sing/Plur (-au is Nom|Dual at
//      only 0.34 across 9 readings). The clause reader's oblique fallback is
//      Ins/Gen/Dat/Loc in that order; Dual is carried through person and
//      gloss, never collapsed.
//   4. VERB-PREFERABLY-FINAL (60% on TEST: 1322/2214 sentences), not SVO.
//      The object run is sought BEFORE the verb first (SOV), then after it
//      (verse order is free) — a preference, never an assumption.
//   5. ITI is the quotative boundary (627x PART on TEST): a clause ends where
//      reported speech ends. Segments split on daṇḍa/punctuation AND iti,
//      the way Greek splits on punctuation and reads δέ as architecture.
//   6. PARTICIPLES ARE NOMINAL (Vedic VerbForm=Part carries Case, 6732x in
//      train): a participle with Case is collected as a nominal, never as a
//      clause verb. Only earned finite verbs head clauses.
//
// READER OPERATING POINT (2026-09-18, sanskrit-swarm): a Wilson-gated
// colony (elenchusBar + bornAcceptance, the gate wilson.mjs breeds through)
// foraged 44 floor configs against the Vedic TEST split. H-max says 0.3/5
// (68.8% agr @ 98.9% cov); the reader keeps 0.5/10 (74.6% @ 77.7%) by the
// declared selection rule — highest agreement with coverage ≥ 3/4 —
// because a wrong case invents a false relation while a gap refuses a slot,
// and this project refuses accumulation (corroboration's false-kind
// discipline). The rule is declared; the numbers are measured; the colony
// log is sanskrit-swarm.mjs. Structural toggles (oblique order, preverbal
// preference) are the NEXT colony, not this one.
//
// OMNIMODAL LESSONS APPLIED (from omnimodal-discovery.mjs /
// omnimodal-pipeline.mjs — same organ, honest instruments):
//   L8  THE CLEANER IS INJECTABLE. IAST diacritics are phonemic: the
//       master's NFD-strip collapses ā→a ś→s ṛ→r ṇ→n ḥ→h (10/10 probe forms
//       destroyed — the music run's "d5"→"d" bug exactly). The prior was
//       built --strip=none and this seam keys on the LOWERCASED form with NO
//       strip (normForm). A Devanagari instrument (UFAL test fixture) reads
//       the same organ through transliteration — a second decoder with its
//       own recipe, never a silent conversion.
//   L3  NULL ARM. The competence test shuffles TEST gold features against
//       reader votes (within-UPOS permutation): agreement must dissolve to
//       chance, or the floors are licensing noise.
//   L4  HONEST ASYMMETRY. The Vedic TEST split is the independent oracle
//       (same giver, held out — gated). The UFAL Classical test (different
//       register AND different script) is reported as landings, never gated:
//       no oracle may be invented for it.
//   L11 CORROBORATION BY (source, recipe): a claim that survives the Vedic
//       IAST instrument AND the UFAL Devanagari→IAST instrument is
//       instrument-corroborated; one decoder alone never is.
//   L7  DEGENERATE REGIME disclosed: 2-char IAST endings are heavily
//       ambiguous (-aḥ Nom|Sing 0.57 ×13 readings; -te Gen|Sing 0.30 ×8;
//       -au Nom|Dual 0.34 ×9). Coverage and agreement are reported per axis
//       so a degenerate axis cannot hide inside a mean.
import { grammarCell } from "../../kernel/cube.js";

// IAST + Devanagari aware: letters AND combining marks stay inside the
// token (Vedic accents, where present, ride on marks — stripped nowhere).
// The avagraha (') stays inside words (so 'vasthānam is one token);
// daṇḍa (। ॥) and the verse bar (|) are clause boundaries.
const TOKEN = /[\p{L}\p{M}\p{N}’']+|[.,;:!?—–()«»“”।॥|]/gu;
const NOMINAL = new Set(["NOUN", "PROPN", "ADJ", "PRON", "DET", "NUM"]);
// Participles with Case are nominal-tier (finding 6): the clause reader
// admits a VERB/AUX token as a nominal when the POS prior types it as
// participating nominally — in practice the gold tags VerbForm=Part forms
// as VERB while giving them Case; the reader collects any token whose
// PRIOR-DOMINANT class is nominal, whatever its sentence role.
const PUNCT = new Set([".", ",", ";", ":", "!", "?", "—", "–", "(", ")", "«", "»", "“", "”", "।", "॥", "|"]);
// ITI — the closed quotative class (627x PART, no features, on TEST).
// Form-matched exactly as Greek matches δέ: a closed grammatical particle,
// received precedent, never a vocabulary list. A clause segment ends after it.
const ITI = new Set(["iti"]);
// Correlative right-half markers: tad/tathā/tatra/tadā answer a yad-side.
const CORR_RIGHT = new Set(["tad", "tathā", "tatra", "tadā", "tatas", "tasmāt", "tena"]);
const CORR_LEFT = new Set(["yad", "yathā", "yatra", "yadā", "yas", "yā", "yat", "ye", "yena", "yasmāt"]);

const tokenize = (text) => {
  const out = [];
  for (const m of String(text ?? "").matchAll(TOKEN)) out.push({
    w: m[0].toLowerCase(), raw: m[0], start: m.index, end: m.index + m[0].length,
    punct: PUNCT.has(m[0]),
  });
  return out;
};

/** normForm — the lookup key: LOWERCASE ONLY, no diacritic strip (L8).
 * IAST length/retroflexion/aspiration marks are the declension: stripping
 * them merges paradigms. The builder ran --strip=none; this side matches. */
export const normForm = (s) => String(s ?? "").toLowerCase();

/** confirmedVerbSet(prior, share) — every form the received POSPrior@1
 * attests as (VERB+AUX)-dominant above the share floor: the sole authority
 * on what may head a relation in Sanskrit. Mechanical; the prior decides. */
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

/** confirmSanskritVerbs(verbs, prior, share) — filter the earned vocabulary
 * to the prior-confirmed verbs. An un-confirmed proposal is refused — never
 * guessed. Mutates the Set, returns it. */
export function confirmSanskritVerbs(verbs, prior, share = 0.5) {
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

/** sanskritBeings(chapterText, prior, { minOccurrences }) — THE BEING TIER.
 * No article exists, so beings are recurring BARE nominal stems: a nominal
 * head (typed by the received POS prior) recurring >= minOccurrences times
 * whose shells share a prefix >= 4, at least half the longer form (>=4, not
 * Greek's 5 — Vedic short stems; sandhi-opaque variants like agnir/agnaye
 * stay split, disclosed in the header). "agnir" and "agninā" are one being
 * (Agni) because their stems agree. Identity by consequence, made
 * morphological — the article-free instrument over the same organ as
 * greekBeings. */
export function sanskritBeings(chapterText, prior, { minOccurrences = 2 } = {}) {
  const toks = tokenize(chapterText);
  const heads = [];
  for (const t of toks) {
    if (t.punct || ITI.has(t.w)) continue;
    const cls = nominalClass(t.w, prior);
    if (!cls || !NOMINAL.has(cls)) continue;
    heads.push({ head: t.raw, headLower: t.w, at: [t.start, t.end] });
  }
  const stems = new Map();
  const assign = (ph) => {
    const b = ph.headLower;
    for (const [stem, grp] of stems) {
      const len = Math.min(stem.length, b.length);
      let lcp = 0;
      while (lcp < len && stem[lcp] === b[lcp]) lcp += 1;
      if (lcp >= 4 && lcp / Math.max(stem.length, b.length) >= 0.5) { grp.push(ph); return; }
    }
    stems.set(ph.headLower, [ph]);
  };
  for (const h of heads) assign(h);
  const out = [];
  for (const [stem, grp] of stems) {
    if (grp.length < minOccurrences) continue;
    out.push({
      stem,
      surfaces: [...new Set(grp.map((g) => g.head))],
      occurrences: grp.length,
      at: grp[0].at,
    });
  }
  return out.sort((a, b) => b.occurrences - a.occurrences);
}

/** personOf(verbForm, casePrior, opts) — THE PERSON TIER. The
 * SanskritCasePrior@1 tallies Person|Number(+Dual) by the verb's final 3
 * IAST characters, unstripped: -ati → 3|Sing at 0.98, -nti → 3|Plur at
 * 0.97. The prior only tallies; the consumer's own floor decides. */
export function personOf(verbForm, casePrior, { minShare = 0.5, minCount = 20, endingLen = 3 } = {}) {
  const table = casePrior?.verbPersonalEndings;
  if (!table) return null;
  const ending = normForm(verbForm).slice(-endingLen);
  const entry = table[ending];
  if (!entry?.ranked?.length) return null;
  const top = entry.ranked[0];
  if (top.share < minShare || top.count < minCount) return null;
  const [person, number] = top.key.split("|");
  return { person: Number(person), number, share: top.share, count: top.count, ending, cell: top.cell ?? null };
}

/** personLabel(person, number, lang) — the term of a Sanskrit grammatical
 * person in the TARGET language. The gloss is a projection, never a baked
 * sentence: the structured paradigm renders in any language whose terms
 * are declared. Dual is first-class (Vedic marks it; Greek/English
 * projections must not collapse it). */
export function personLabel(person, number, lang = "eng") {
  const L = GLOSS_TERMS[lang] ?? GLOSS_TERMS.eng;
  const key = `${person}|${number}`;
  return L.persons[key] ?? L.persons[`${person}`] ?? "one";
}

const GLOSS_TERMS = {
  eng: {
    personWord: "person",
    persons: { "1|Sing": "I", "2|Sing": "you", "3|Sing": "he/she/it", "1|Dual": "we two", "2|Dual": "you two", "3|Dual": "those two", "1|Plur": "we", "2|Plur": "you (pl.)", "3|Plur": "they" },
    num: { Sing: "singular", Dual: "dual", Plur: "plural" }, ord: { 1: "st", 2: "nd", 3: "rd" },
    tense: { Pres: "present", Past: "past", Fut: "future" },
    voice: { Act: "active", Mid: "middle", Pass: "passive" },
    mood: { Ind: "indicative", Sub: "subjunctive", Opt: "optative", Imp: "imperative" },
  },
  san: {
    personWord: "puruṣa",
    persons: { "1|Sing": "aham", "2|Sing": "tvam", "3|Sing": "saḥ", "1|Dual": "āvām", "2|Dual": "yuvām", "3|Dual": "tau", "1|Plur": "vayam", "2|Plur": "yūyam", "3|Plur": "te" },
    num: { Sing: "ekavacana", Dual: "dvivacana", Plur: "bahuvacana" }, ord: { 1: "", 2: "", 3: "" },
    tense: { Pres: "laṭ", Past: "laṅ", Fut: "lṛṭ" },
    voice: { Act: "parasmaipada", Mid: "ātmanepada", Pass: "karmaṇi" },
    mood: { Ind: "nirdiṣṭa", Sub: "vidhi-liṅ", Opt: "vidhi-liṅ", Imp: "ājñā" },
  },
};

/** verbGloss(paradigm, lang) — the native reading of a finite verb in the
 * TARGET language. Pure; declared terms; defaults to English. */
export function verbGloss(paradigm, lang = "eng") {
  if (!paradigm) return null;
  const L = GLOSS_TERMS[lang] ?? GLOSS_TERMS.eng;
  const person = personLabel(paradigm.person, paradigm.number, lang);
  const gram = [paradigm.tense && L.tense[paradigm.tense], paradigm.mood && L.mood[paradigm.mood], paradigm.voice && L.voice[paradigm.voice]].filter(Boolean).join(" ") || "finite";
  const num = paradigm.number ? (L.num[paradigm.number] ?? paradigm.number) : "";
  const ord = L.ord[paradigm.person] ?? "";
  return `${paradigm.person}${ord} ${L.personWord} ${num}, ${gram} — ${person}`;
}

/** glossLanguages() — the languages a paradigm gloss can be rendered in. */
export const glossLanguages = () => Object.keys(GLOSS_TERMS);

/** paradigmOf(verbForm, casePrior, opts) — THE FULL VERBAL PARADIGM.
 * Each axis (person/voice/mood/tense) is read from its own projection with
 * its own confidence floor, each mapped to its cube cell. Voice is SPARSE
 * in Vedic (801/22,763 finite tokens carry Voice — the table has 32
 * endings): a missing voice axis is a gap, and a paradigm with only voice
 * missing is still returned. Returns null only when NO axis clears. */
export function paradigmOf(verbForm, casePrior, { minShare = 0.5, minCount = 20, endingLen = 3 } = {}) {
  if (!casePrior) return null;
  const ending = normForm(verbForm).slice(-endingLen);
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
 * final 2 IAST characters, via the received SanskritCasePrior@1. The key
 * is LOWERCASED, never stripped (L8). No article probe exists (finding 1);
 * no enclitic override exists (finding 2 — measured ambiguous, forced
 * readings would be guesses). Below the floor: a gap, never a guess. */
export function caseOf(token, casePrior, { minShare = 0.5, minCount = 10, endingLen = 2 } = {}) {
  const table = casePrior?.nominalEndings;
  if (!table) return null;
  const ending = normForm(token).slice(-endingLen);
  const entry = table[ending];
  const top = entry?.ranked?.[0] ?? null;
  if (!top || top.share < minShare || top.count < minCount) return null;
  const [Case, number] = top.key.split("|");
  return { case: Case, number, share: top.share, count: top.count, ending, cell: top.cell ?? null, src: "ending" };
}

/** beingRefOf(headLower, beingsByStem) — bind a clause end to a tier-1 being
 * by stem recurrence: shared prefix >= 4, at least half the longer form. */
export function beingRefOf(headLower, beingsByStem) {
  const b = normForm(headLower);
  for (const [stem] of beingsByStem) {
    const a = normForm(stem);
    const len = Math.min(a.length, b.length);
    let lcp = 0;
    while (lcp < len && a[lcp] === b[lcp]) lcp += 1;
    if (lcp >= 4 && lcp / Math.max(a.length, b.length) >= 0.5) return `ref:san:auto:${stem}`;
  }
  return null;
}

// Oblique fallback order for the object slot in an 8-case grammar:
// instrument (means) first, then the possessor, the recipient, the locus.
const OBLIQUE = ["Ins", "Gen", "Dat", "Loc"];

/** sanskritClauses(sentText, verbs, posPrior, casePrior, { beings }) — THE
 * CASE-MARKED CLAUSE READER, verb-preferably-final. For each clause segment
 * (bounded by punctuation OR iti) and each earned verb: the NOMINATIVE
 * nominal is the subject (SEG·Figure), the ACCUSATIVE is the object, else
 * the first Ins/Gen/Dat/Loc oblique; a nominative with no accusative after
 * a copula verb (as/bhū stems — detected by LEMMA only where the prior
 * attests, never by hand list… in practice: after any verb, a second Nom
 * following the subject is the predicate complement, same copula-thesis
 * shape as Greek) fills the complement. Preverbal nominals are preferred
 * for both slots (SOV, 60% measured); postverbal nominals still fill them
 * (verse order is free). Participles carrying Case are nominals (finding
 * 6), never clause heads — only earned FINITE verbs head clauses here.
 * An imperative beside a vocative addresses, never nominates: a lone Voc
 * subject beside an Imp verb is refused (Greek vocative precedent).
 * Ends bind to tier-1 beings by stem. subject null means pro-drop. */
export function sanskritClauses(sentText, verbs, posPrior, casePrior, { beings = [], minShare = 0.5, minCount = 10 } = {}) {
  if (!(verbs instanceof Set) || !verbs.size || !casePrior) return [];
  const beingsByStem = new Map(beings.map((b) => [b.stem, b]));
  const toks = tokenize(sentText);
  const segments = [];
  let cur = [];
  const flush = () => { if (cur.length) segments.push(cur); cur = []; };
  for (const t of toks) {
    if (t.punct) { flush(); continue; }
    cur.push(t);
    if (ITI.has(t.w)) flush(); // the quotative closes its clause
  }
  flush();
  const out = [];
  for (const seg of segments) {
    const verbIdx = [];
    for (let i = 0; i < seg.length; i += 1) if (verbs.has(seg[i].w)) verbIdx.push(i);
    for (const vi of verbIdx) {
      const v = seg[vi];
      const verbMood = paradigmOf(v.raw, casePrior, { minShare, minCount })?.mood ?? null;
      const verbImp = verbMood === "Imp";
      const nominals = [];
      for (let i = 0; i < seg.length; i += 1) {
        if (i === vi) continue;
        const cls = nominalClass(seg[i].w, posPrior);
        if (!cls || !NOMINAL.has(cls)) {
          // Finding 6: a Case-carrying participle reads nominally even
          // where the prior's dominant class is verbal — probe its ending.
          const c = caseOf(seg[i].raw, casePrior, { minShare, minCount });
          if (c) nominals.push({ head: seg[i].raw, headLower: seg[i].w, at: [seg[i].start, seg[i].end], case: c.case, cell: c.cell, caseSrc: "participle", pos: i });
          continue;
        }
        const c = caseOf(seg[i].raw, casePrior, { minShare, minCount });
        nominals.push({ head: seg[i].raw, headLower: seg[i].w, at: [seg[i].start, seg[i].end], case: c?.case ?? null, cell: c?.cell ?? null, caseSrc: c ? "ending" : null, pos: i });
      }
      const before = nominals.filter((n) => n.pos < vi);
      const after = nominals.filter((n) => n.pos > vi);
      const prefer = (list) => list.length ? list : nominals;
      // Subject: nominative, preverbal preferred; a lone vocative beside an
      // imperative is an address, never a subject.
      let subject = prefer(before).find((n) => n.case === "Nom")
        ?? nominals.find((n) => n.case === "Nom") ?? null;
      if (subject && verbImp && subject.case === "Voc") subject = null;
      if (!subject) {
        const voc = nominals.find((n) => n.case === "Voc");
        subject = (voc && !verbImp) ? voc : null;
      }
      // Object: accusative (preverbal first), else Ins/Gen/Dat/Loc oblique,
      // else a second nominative as predicate complement (copula-thesis).
      let object = prefer(before).find((n) => n.case === "Acc")
        ?? nominals.find((n) => n.case === "Acc") ?? null;
      if (!object) {
        for (const ob of OBLIQUE) {
          object = prefer(before).find((n) => n.case === ob) ?? nominals.find((n) => n.case === ob) ?? null;
          if (object) break;
        }
      }
      if (!object) {
        const noms = nominals.filter((n) => n.case === "Nom" && n !== subject);
        if (noms.length) object = noms[0];
      }
      void after;
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

/** correlatives(sentText) — the yad/tad architecture. Vedic argument, like
 * Greek, is built on correlatives: "yad … tad" (which… that), "yathā …
 * tathā" (as… so), "yatra … tatra" (where… there), "yadā … tadā" (when…
 * then). For each right-half marker, the reader names the LEFT half and the
 * RIGHT half. Pure. */
export function correlatives(sentText) {
  const text = String(sentText ?? "");
  const toks = tokenize(text);
  const out = [];
  for (let i = 0; i < toks.length; i += 1) {
    const t = toks[i];
    if (t.punct || !CORR_RIGHT.has(t.w)) continue;
    const left = text.slice(0, t.start).trim();
    const right = text.slice(t.end).trim().replace(/^[,.।॥|;:\s]+/, "").replace(/[,;.।॥|:\s]+$/, "");
    if (left.length >= 2 && right.length >= 2) {
      out.push({ left, right, leftHasYad: CORR_LEFT.has(normForm(left.split(/\s+/).pop() ?? "")) || [...CORR_LEFT].some((y) => normForm(left).includes(y)), at: [t.start, t.end] });
    }
  }
  return out;
}

/** prodropClauses(sentText, verbs, prior) — the clauses the positional gate
 * refused: every earned verb with its nominal run. SOV mirror of the Greek
 * seam: the run is sought BEFORE the verb first (the object precedes in
 * unmarked Sanskrit order), then after it; unknown tokens continue the run
 * (heavy inflection must not re-introduce deafness). Pure; testable. */
export function prodropClauses(sentText, verbs, prior) {
  const out = [];
  if (!(verbs instanceof Set) || !verbs.size) return out;
  const toks = tokenize(sentText).filter((t) => !t.punct);
  for (let i = 0; i < toks.length; i += 1) {
    const t = toks[i];
    if (!verbs.has(t.w)) continue;
    const collect = (idxs) => {
      const parts = [];
      for (const j of idxs) {
        const cls = nominalClass(toks[j].w, prior);
        if (cls && !NOMINAL.has(cls)) break;
        parts.push(toks[j]);
      }
      return parts;
    };
    // Preverbal run (walk back), else postverbal run (walk forward).
    let parts = [];
    const back = [];
    for (let j = i - 1; j >= 0 && !PUNCT.has(toks[j].raw); j -= 1) {
      const cls = nominalClass(toks[j].w, prior);
      if (cls && !NOMINAL.has(cls)) break;
      back.unshift(toks[j]);
    }
    parts = back.length ? back : collect(Array.from({ length: toks.length - i - 1 }, (_, k) => i + 1 + k));
    const object = parts.length ? parts.map((p) => p.raw).join(" ") : null;
    const at = parts.length ? [parts[0].start, parts[parts.length - 1].end] : [t.start, t.end];
    out.push({ verb: t.raw, object, at });
  }
  return out;
}
