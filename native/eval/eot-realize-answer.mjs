// eval/eot-realize-answer.mjs — ANSWERING LIKE THE CODING PIPELINE REASONS:
// DEFINE THE VOID, HUNT TO FILL IT, COMPOSE FROM THE EOT. The answer is a claim
// built from the meaning layer, never an echo of a recalled passage.
import { annotationFromMeaning, linearize } from "../kernel/eot-rich.js";
import { realizeToken } from "../kernel/eot-realize.js";
import { needOf, STOP } from "./eot-realize-need.mjs";
import { GIVER, NP_RELS, REFERENT_POS, WH_OPENERS } from "./eot-realize-lens.en.mjs";
import { mechanicalSummary } from "./eot-summary.mjs";

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const MATCH = (r, words) => words.some((w) => r.lemma && r.lemma.toLowerCase() === w.toLowerCase());
const WH = WH_OPENERS;

/** Realize the noun phrase rooted at headKey — the head + its NP-internal
 *  dependents, ordered by the language's measured parameters. */
export function phraseOf(rows, headKey, forms, params) {
  const subset = rows.filter((r) => r.key === headKey || (r.head === headKey && NP_RELS.has(String(r.deprel).split(":")[0])));
  const order = params ? linearize(subset, params) : subset.map((r) => r.key);
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return order.map((k) => byKey.get(k)).filter(Boolean).map((r) => realizeToken(r, forms)).join(" ").trim();
}

/** The TOPIC of a material — the content words its passages repeatedly name. */
export function aboutOf(store) {
  const entries = [...store.values()];
  const df = new Map();
  for (const entry of entries) {
    const seen = new Set();
    for (const w of (entry.text ?? "").toLowerCase().split(/\W+/)) { if (w.length < 3 || STOP.has(w) || seen.has(w)) continue; seen.add(w); df.set(w, (df.get(w) ?? 0) + 1); }
  }
  const top = [...df.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 8);
  return { passages: entries.length, top };
}

/** A defining relation for the referent, read off one record's arcs — the
 *  English lens's realization: copular identity ("X is Y"), never a question. */
export function definingRelation(rec, needWords, forms, params, kind = null) {
  const rows = annotationFromMeaning(rec);
  const root = rows.find((r) => r.head === null);
  if (!root || WH.has(String(root.lemma).toLowerCase())) return null;
  const cop = rows.find((r) => r.deprel === "cop" && r.head === root.key);
  if (cop && ["NOUN", "PROPN", "ADJ"].includes(root.upos) && !rows.some((r) => r.head === root.key && r.deprel === "case")) {
    const subj = rows.find((r) => /^(nsubj|csubj)/.test(r.deprel) && r.head === root.key && ["NOUN", "PROPN"].includes(r.upos));
    if (subj && !WH.has(String(subj.lemma).toLowerCase()) && MATCH(subj, needWords)) {
      const text = `${cap(phraseOf(rows, subj.key, forms, params))} ${realizeToken(cop, forms)} ${phraseOf(rows, root.key, forms, params)}.`;
      return { kind: "identity", subject: { lemma: subj.lemma, upos: subj.upos, key: subj.key }, subjectKind: "direct", words: text.split(/\s+/).length, text };
    }
  }
  if ((kind === "action" || kind === "why" || kind === "cue" || kind === "imperative") && root.upos === "VERB") {
    const subj = rows.find((r) => /^(nsubj|csubj)/.test(r.deprel) && r.head === root.key && REFERENT_POS.has(r.upos) && MATCH(r, needWords));
    const obj = rows.find((r) => /^(obj|iobj|xcomp|obl)/.test(r.deprel) && r.head === root.key);
    if (subj && obj) {
      const text = `${cap(phraseOf(rows, subj.key, forms, params))} ${realizeToken(root, forms)} ${phraseOf(rows, obj.key, forms, params)}.`;
      return { kind: "predicate", subject: { lemma: subj.lemma, upos: subj.upos, key: subj.key }, subjectKind: "direct", words: text.split(/\s+/).length, text };
    }
  }
  return null;
}

/** answer({ store, index, field, referents, forms, params, prompt, boundVoid }). */
export function answer({ store, index, field, referents, forms, params, prompt, boundVoid = null }) {
  const void_ = boundVoid ?? needOf(prompt);
  const referentWords = void_.needWords;
  const boundRefs = void_.boundRefs ? new Set(void_.boundRefs) : null;
  if (boundRefs && referentWords.length === 0) {
    const voidName = [...boundRefs].map((id) => referents.represent(id)).join(" | ");
    const huntWords = voidName.toLowerCase().split(/\W+/).filter((w) => w.length >= 2);
    const r = huntAndAdmit({ store, index, referents, forms, params, referentWords: huntWords, voidRefs: boundRefs, void_, voidName });
    return { prompt, void: void_, lens: GIVER, voidReferent: { ids: [...boundRefs], name: voidName }, ...r };
  }
  if (void_.kind === "topic") {
    const summary = mechanicalSummary({ store, referents, question: prompt });
    let answerText = summary.text;
    if (!answerText) {
      const about = aboutOf(store);
      const names = about.top.map(([w, n]) => `${w} (${n} of ${about.passages} passage(s))`).join(", ");
      answerText = about.top.length ? `The material's ${about.passages} passages repeatedly name: ${names} — the words that recur across its parts are its subject.` : `The material's ${about.passages} passages carry no word that recurs above the witness floor.`;
    }
    return { prompt, void: void_, lens: GIVER, voidReferent: null, recall: null, hunt: { refs: store.size, candidates: 0, admitted: 0, passages: [] }, answer: answerText, finding: null, summary: { subject: summary.subject, basis: summary.basis ?? null } };
  }
  if (!referentWords.length) return { prompt, void: void_, lens: GIVER, voidReferent: null, recall: null, hunt: { refs: 0, candidates: 0, admitted: 0, passages: [] }, answer: null, finding: "the prompt carried no content words to hunt for." };
  const phraseRefs = new Set(referents?.resolveName?.(referentWords.join(" ")) ?? []);
  const per = referentWords.map((w) => new Set(referents?.resolveName?.(w) ?? []));
  let voidRefs = new Set();
  if (phraseRefs.size) voidRefs = phraseRefs;
  else if (per.length && per.every((s) => s.size)) { let inter = per[0]; for (const s of per.slice(1)) inter = new Set([...inter].filter((id) => s.has(id))); voidRefs = inter; }
  const voidName = voidRefs.size ? [...voidRefs].map((id) => referents.represent(id)).join(" | ") : null;
  return { prompt, void: void_, lens: GIVER, voidReferent: voidRefs.size ? { ids: [...voidRefs], name: voidName } : null, ...huntAndAdmit({ store, index, referents, forms, params, referentWords, voidRefs, void_, voidName }) };
}

function huntAndAdmit({ store, index, referents, forms, params, referentWords, voidRefs, void_, voidName }) {
  const refs = new Set();
  for (const w of referentWords) for (const r of index?.get(w) ?? []) refs.add(r);
  const hunted = [];
  for (const ref of refs) {
    const entry = store.get(ref);
    if (!entry) continue;
    for (const rec of entry.records) {
      const def = definingRelation(rec, referentWords, forms, params, void_.kind);
      if (!def) continue;
      const subjRefs = new Set();
      for (const id of referents?.resolveName?.(def.subject.lemma) ?? []) subjRefs.add(id);
      const byReferent = voidRefs.size > 0 && [...subjRefs].some((id) => voidRefs.has(id));
      const byString = voidRefs.size === 0 && MATCH({ lemma: def.subject.lemma, upos: def.subject.upos }, referentWords);
      def.connect = byReferent ? "referent" : byString ? "string" : null;
      def.referent = subjRefs.size ? [...subjRefs].map((id) => ({ id, name: referents.represent(id) })) : [];
      if (def.connect) hunted.push({ ref, source: entry.text, definition: def });
    }
  }
  const admitted = hunted.map((h) => { const direct = h.definition.subjectKind === "referent"; return { ...h, keep: !WH.has(h.definition.text.toLowerCase().split(/\W+/).find((w) => WH.has(w)) ?? ""), score: (h.definition.connect === "referent" ? 4 : 2) + (direct ? 3 : 1) + (h.definition.words <= 10 ? 1 : 0) + (h.definition.kind === "identity" ? 1 : 0) - h.definition.words / 12 }; }).filter((h) => h.keep).sort((a, b) => b.score - a.score);
  const answerText = admitted[0]?.definition.text ?? null;
  const finding = answerText ? null : `no passage in the ${store.size} addressed defines ${referentWords.join(" ")}${voidName ? ` (resolved to ${voidName})` : ""} — the word appears in ${refs.size} passage(s) but none carries a defining relation; what would satisfy it: a passage stating what ${referentWords.join(" ")} is.`;
  return { recall: null, hunt: { refs: refs.size, candidates: hunted.length, admitted: admitted.length, passages: admitted.slice(0, 2).map((h) => ({ ref: h.ref, kind: h.definition.kind, connect: h.definition.connect, referent: h.definition.referent, score: +h.score.toFixed(2), source: h.source.slice(0, 90) })) }, answer: answerText, finding };
}
