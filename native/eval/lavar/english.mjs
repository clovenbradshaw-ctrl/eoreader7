// english.mjs — the IMPERATIVE/INTRANSITIVE seam for English (2026-09-17).
//
// English is not pro-drop, but it grammaticalizes clause shapes the S90 gate
// ("subject group AND object group") refuses anyway. MEASURED on a modern
// Nashville ordinance (RS2026-2264): 5 of 8 S90-gate absences are clauses a
// literate English reader hears — a legislative imperative ("NOW, THEREFORE,
// BE IT RESOLVED BY THE COUNCIL OF ..."), a form-check line ("Answer checked:
// [X] No"), and a clause whose verb is complete without an object group
// ("Video surveillance solutions, drones, and ... analysis all fall within
// that definition."). The gate's refusal is a property of the gate, never of
// the material — the same law greek.mjs already states for Greek, applied to
// English's own refused shapes.
//
// This seam recovers what the gate refused, mechanically and never by hand-
// typed vocabulary. The received POSPrior@1 (pos-eng.json) is the sole
// authority on what a word IS: the slot-measure proposes, the prior confirms.
// MEASURED on the same ordinance: the slot-measure earned "and", "of", "with",
// "to", "cooperative" and "governmental" as verbs — the identical garbage the
// Greek gate was built to refuse. The two recovered clause classes:
//
//  1. IMPERATIVE/SUBJUNCTIVE — a clause that OPENS with an earned verb and
//     has no nominal subject before it carries its subject in the MOOD: the
//     "you" of the imperative ("Answer checked: [X] No") or the subjunctive
//     "it" of legislative formula ("BE IT RESOLVED"). The subject is
//     disclosed as grammaticalized in the verb's mood and is never fabricated
//     into a referent (end1==label would be a fold — the ledger's own law).
//  2. INTRANSITIVE/PREDICATE — a clause with a nominal subject and an earned
//     verb but no object GROUP is still a complete clause when the verb's
//     complement is a prepositional phrase or nothing ("all fall within that
//     definition"). The object is where the language leaves it.

import { nominalClass, confirmedVerbSet } from "./greek.mjs";
import { GRAMMAR_MIN_SHARE } from "../../adapters/text/grain-typing.js";

const TOKEN = /[\p{L}\p{N}’']+|[.,;:!?—–()«»“”]/gu;
// A clause-initial subject group may open with any nominal class the prior
// attests; English's subject is found by POSITION (first nominal before the
// verb), the reader's own native grammar.
const SUBJECT = new Set(["NOUN", "PROPN", "PRON", "DET", "NUM"]);
// These close a clause: a second verb, an adposition, a conjunction, an
// adverb — after one of these the subject run is over.
const STOP = new Set(["VERB", "AUX", "ADP", "SCONJ", "CCONJ", "ADV"]);

const tokenize = (text) => {
  const out = [];
  for (const m of text.matchAll(TOKEN)) out.push({
    w: m[0].toLowerCase(), raw: m[0], start: m.index, end: m.index + m[0].length,
    punct: /^[.,;:!?—–()«»“”]$/.test(m[0]),
  });
  return out;
};

/** confirmEnglishVerbs(verbs, prior, share) — the VERB GATE, English side
 * (2026-09-17). The positional slot-measure nominates whatever sits in the
 * verb slot; on real prose that is "and", "of", "with", "to", even adjectives
 * ("cooperative", "governmental") — measured on a Nashville ordinance. The
 * received POSPrior@1 is the sole authority on what may head a relation: the
 * slot-measure proposes, the prior confirms, an un-confirmed proposal is
 * refused — never guessed. Mutates the Set, returns it. English was the one
 * language left ungated (the GREEK-only comment); the same defect measured on
 * English is this gate. */
export function confirmEnglishVerbs(verbs, prior, share = GRAMMAR_MIN_SHARE) {
  const confirmed = confirmedVerbSet(prior, share);
  for (const v of verbs) if (!confirmed.has(v)) verbs.delete(v);
  return verbs;
}

/** englishImperatives(sentText, verbs, prior) — the MOOD-grain clause reader.
 * A clause that opens with an earned verb — after optional adverbs/vocatives,
 * which never include a nominal subject — carries its subject in the verb's
 * mood: imperative "you", subjunctive "it". Returns [{verb, object, at}] with
 * the object the maximal nominal run after the verb; the subject is disclosed
 * as grammaticalized, never fabricated. */
export function englishImperatives(sentText, verbs, prior, { minShare = GRAMMAR_MIN_SHARE } = {}) {
  const out = [];
  if (!(verbs instanceof Set) || !verbs.size) return out;
  const toks = tokenize(sentText);
  let i = 0;
  while (i < toks.length && toks[i].punct) i += 1; // a clause can open on punctuation
  if (i >= toks.length) return out;
  // The clause opens with the verb only if the run before it is adverbs and
  // vocatives — never a nominal subject, which would make this an ordinary
  // declarative the gate should not have refused.
  let j = i;
  while (j < toks.length) {
    const cls = nominalClass(toks[j].w, prior);
    if (toks[j].punct) break;
    if (cls && SUBJECT.has(cls)) return out; // a subject opens — not an imperative
    if (j > i && cls && STOP.has(cls)) break; // a connector closes the head run
    if (verbs.has(toks[j].w)) break; // the earned verb
    if (!cls) return out; // unattested token before the verb — can't rule out a subject, refuse
    j += 1;
  }
  if (j >= toks.length || !verbs.has(toks[j].w)) return out;
  const verb = toks[j];
  const headCls = j > i ? nominalClass(toks[j - 1].w, prior) : null;
  // The object: the maximal nominal run after the verb, stopped at the first
  // non-nominal token or punctuation (the same conservative boundary greek.mjs
  // uses — never greedy).
  const parts = [];
  let k = j + 1;
  while (k < toks.length && !toks[k].punct) {
    const cls = nominalClass(toks[k].w, prior);
    if (cls && STOP.has(cls)) break;
    parts.push(toks[k]);
    k += 1;
  }
  const object = parts.length ? parts.map((p) => p.raw).join(" ") : null;
  const at = parts.length ? [parts[0].start, parts[parts.length - 1].end] : [verb.start, verb.end];
  out.push({ verb: verb.raw, object, at, mood: headCls === "ADV" ? "imperative-after-adverb" : "imperative" });
  return out;
}

/** englishIntransitives(sentText, verbs, prior) — the INTRANSITIVE clause
 * reader. A nominal subject, an earned verb, and no object GROUP after it is
 * a complete English clause when the verb's complement is a prepositional
 * phrase or nothing ("all fall within that definition"). Returns
 * [{subject, verb, at}] — the subject is the clause's own word, the verb the
 * clause's own word, and the absence of an object is DISCLOSED, never
 * fabricated. */
export function englishIntransitives(sentText, verbs, prior) {
  const out = [];
  if (!(verbs instanceof Set) || !verbs.size) return out;
  const toks = tokenize(sentText);
  for (let i = 0; i < toks.length; i += 1) {
    if (toks[i].punct || !verbs.has(toks[i].w)) continue;
    const verb = toks[i];
    // A nominal subject immediately before the verb (the reader's positional
    // subject group), possibly with a determiner.
    let s = i - 1;
    while (s >= 0 && toks[s].punct) s -= 1;
    if (s < 0) continue;
    const cls = nominalClass(toks[s].w, prior);
    if (!cls || !SUBJECT.has(cls)) continue;
    const subject = toks[s];
    // No object GROUP after: the run after the verb holds no nominal object
    // head before any adposition — a noun inside a prepositional phrase
    // ("within that definition") is a PP complement, never an object group
    // (the S90 gate's own term). ADP/SCONJ/CCONJ/ADV close the object run.
    let after = i + 1;
    let hasNominal = false;
    while (after < toks.length && !toks[after].punct) {
      const c2 = nominalClass(toks[after].w, prior);
      if (c2 && STOP.has(c2)) break; // a preposition opens a complement, not an object
      if (c2 && SUBJECT.has(c2) && c2 !== "DET") { hasNominal = true; break; }
      after += 1;
    }
    if (hasNominal) continue; // an object GROUP exists — the gate should have read it
    const at = [subject.start, verb.end];
    out.push({ subject: subject.raw, verb: verb.raw, at });
  }
  return out;
}

/** englishClauses(sentText, verbs, prior) — the seam's composition: the
 * clauses S90 refused, heard by the mood and the missing-object shapes, with
 * the subject disclosed as grammaticalized (imperative) or present-but-objectless
 * (intransitive). Pure; testable. */
export function englishClauses(sentText, verbs, prior, opts = {}) {
  return [
    ...englishImperatives(sentText, verbs, prior, opts),
    ...englishIntransitives(sentText, verbs, prior),
  ];
}