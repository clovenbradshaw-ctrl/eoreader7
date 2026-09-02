// native/adapters/text/morphology.js — the act closure: hear every attested
// inflection of a verb the material already earned.
//
// A human who has learned "trudged" hears "trudges" and "trudging" without
// re-learning anything — inflection is transparent to a reader in a way
// exact-string matching is not. This file gives the native reader that,
// the LICENSED way, on two walls:
//
//   1. Recurrence is earned at the ACT level, once. The vocabulary's own
//      gates measured "trudged"; the closure never adds an act the
//      material did not earn — it widens FORM, not vocabulary.
//   2. Only forms ATTESTED IN THIS MATERIAL join. UniMorph knows ten
//      thousand inflections; the closure admits only tokens the book
//      actually contains that are the same act as a measured verb. The
//      prior decides sameness (received, giver named); the material
//      decides presence.
//
// The engine's own organs decide "same act" (perceiver/text/morphology.js
// — ported from eoreader5, its header carrying the two mistakes already
// made and fixed there: never pick a lemma; the suffix rule is part of
// the lookup). This file re-derives nothing — and it IMPORTS nothing:
// the text-boundary conformance wall forbids an adapter from reaching
// into the frozen provider, so the lemmatizer arrives INJECTED (the
// cast.js pattern), from a caller that may name legacy — an eval driver,
// a host assembly — never from here. Lineage: the-fold measured the
// identical move on MINE-1 (lemma equivalence: bound 531 -> 536, zero
// contradictions) — the precedent this follows.

/**
 * actClosure(verbs, tokenTypes, lemmatizer) -> { forms, added, gap }
 *
 * `verbs`      the measured vocabulary (Set of lowercase forms)
 * `tokenTypes` every distinct token of THIS material (the presence wall)
 * `lemmatizer` the engine's createLemmatizer over a loaded prior — its
 *              own `gap` (no prior) degrades the closure to exact forms,
 *              loudly, never silently changing answers.
 */
export const actClosure = (verbs, tokenTypes, lemmatizer) => {
  const base = verbs instanceof Set ? verbs : new Set(verbs ?? []);
  const forms = new Set(base);
  const added = [];
  if (!lemmatizer || lemmatizer.gap) return { forms, added, gap: lemmatizer?.gap ?? { reason: "no_lemmatizer", tier: "model", detail: "no morphology prior injected — the closure is exact forms only" } };
  // Index measured verbs by every lemma candidate, then admit a token when
  // its own lemma set intersects a measured verb's — sameAct, precomputed
  // once instead of |tokens| x |verbs| pairwise calls.
  const byLemma = new Map();
  for (const v of base) for (const l of lemmatizer.lemmasOf(v)) {
    if (!byLemma.has(l)) byLemma.set(l, v);
  }
  for (const t of tokenTypes) {
    const w = String(t ?? "").toLowerCase();
    if (!w || forms.has(w)) continue;
    for (const l of lemmatizer.lemmasOf(w)) {
      const src = byLemma.get(l);
      if (src) { forms.add(w); added.push({ form: w, sameActAs: src }); break; }
    }
  }
  return { forms, added, gap: null };
};

// ── the lemmatizer itself, native (2026-09-02) ───────────────────────────
// Ported from the frozen provider's perceiver/text/morphology.js under the
// ratchet (native replaces legacy only under conformance — see
// conformance/morphology-parity.test.mjs, which runs both over the same
// forms). Its two standing decisions are kept verbatim: never pick ONE
// lemma (lemmasOf returns the candidate SET), and the English suffix rule is
// part of the lookup, unioned with the table, never a fallback chosen
// between them — gated on the prior's own declared language ("eng", or
// omitted), so a prior for another language never gets English guesses
// folded under it. No file I/O here: a browser hands in the parsed prior.

const stemsOf = (w) => {
  const out = new Set();
  const add = (s) => { if (s && s.length > 1) out.add(s); };
  if (w.endsWith("ies")) { add(w.slice(0, -3) + "y"); }
  if (w.endsWith("ied")) { add(w.slice(0, -3) + "y"); }
  if (w.endsWith("ing")) { add(w.slice(0, -3)); add(w.slice(0, -3) + "e"); }
  if (w.endsWith("es")) { add(w.slice(0, -2)); add(w.slice(0, -1)); }
  if (w.endsWith("ed")) { add(w.slice(0, -2)); add(w.slice(0, -1)); }
  if (w.endsWith("s") && !w.endsWith("ss")) { add(w.slice(0, -1)); }
  for (const s of [...out]) if (/(.)\1$/.test(s)) add(s.slice(0, -1)); // stopped -> stop
  return out;
};

/** A parsed MorphologyPrior@1 → { language, giver, forms, irregular }; refuses a prior with no giver. */
export const morphologyFromPrior = (raw) => {
  if (raw?.schema !== "MorphologyPrior@1") throw new TypeError(`morphologyFromPrior: unknown schema ${raw?.schema}`);
  if (!raw.provenance?.source) throw new TypeError("morphologyFromPrior: a prior must name its giver");
  return { language: raw.language, giver: raw.provenance.source, forms: raw.forms, irregular: raw.irregular };
};

// The index the lemmatizer reads IS the prior's own `forms` table (form →
// lemma candidates), exactly as the frozen provider's callers pass it —
// no second shape is built here.
export const createLemmatizer = (index, { fallback = null, language = null } = {}) => {
  const map = new Map();
  if (index instanceof Map) for (const [k, v] of index) map.set(k, new Set(v));
  else if (index && typeof index === "object") for (const [k, v] of Object.entries(index)) map.set(k, new Set(v));
  const gap = map.size === 0
    ? { reason: "no_morphology_prior", tier: "model", needsWitness: true, detail: "irregular inflections (lay/lie, went/go, saw/see) will not be recognised" }
    : null;
  const englishRule = language == null || language === "eng";
  const lemmasOf = (form) => {
    const w = String(form || "").toLowerCase();
    const out = new Set();
    if (w) out.add(w);
    for (const l of map.get(w) ?? []) out.add(l);
    if (englishRule) for (const s of stemsOf(w)) out.add(s);
    return out;
  };
  const sameAct = (a, b) => {
    const x = String(a || "").toLowerCase(), y = String(b || "").toLowerCase();
    if (x && x === y) return true;
    if (map.size === 0) return fallback ? fallback(x, y) : x === y;
    const la = lemmasOf(x);
    for (const l of lemmasOf(y)) if (la.has(l)) return true;
    return false;
  };
  return { lemmasOf, sameAct, size: map.size, gap };
};
