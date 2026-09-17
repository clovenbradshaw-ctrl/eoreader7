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

/** personLabel(person, number) — the English gloss of a Greek grammatical
 * person, for the disclosure line. The Enchiridion's constant 2sg is "you". */
export function personLabel(person, number) {
  const map = { "1|Sing": "I", "2|Sing": "you", "3|Sing": "he/she/it", "1|Plur": "we", "2|Plur": "you (pl.)", "3|Plur": "they" };
  return map[`${person}|${number}`] ?? "one";
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
      const nominals = [];
      for (let i = 0; i < seg.length; i += 1) {
        const cls = nominalClass(seg[i].w, posPrior);
        if (!cls || !CLAUSE_NOMINAL.has(cls)) continue;
        const c = caseOf(seg[i].w, casePrior, { minShare, minCount });
        nominals.push({ head: seg[i].raw, headLower: seg[i].w, at: [seg[i].start, seg[i].end], case: c?.case ?? null, cell: c?.cell ?? null });
      }
      const nom = nominals.filter((n) => n.case === "Nom");
      const acc = nominals.filter((n) => n.case === "Acc");
      const gen = nominals.filter((n) => n.case === "Gen");
      const subject = nom.length ? nom[0] : null;
      let object = acc.length ? acc[0] : (gen.length ? gen[0] : null);
      if (!object) {
        const after = nominals.filter((n) => n.at[0] > v.end);
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