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