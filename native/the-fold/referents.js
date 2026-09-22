// referents.js — THE PIPELINE ASKS WHO, NOT WHICH STRING (2026-09-21).
//
// The user's standing correction, restated for this pipeline: "all of our
// assertions of what a word is — it's just that assertion, it's pointing to a
// referent; that is how we are able to deal with typos." Every check the
// generation pipeline grew — a fact's anchors, whether prose carried it, what
// the subject is, whether a part takes up the last one — matched STRINGS. A
// sentence that says "Donelson" for "John Donelson", or "Walker" for "Dr.
// Thomas Walker", is making the same assertion about the same being, and a
// string test cannot see that.
//
// This module builds ONE resolver over the material with the engine's own
// referent organ (organs/cast.js `makeReferentIndex`, via namesCorefer and
// diaNorm) and answers every such question in referent ids. It adds nothing
// to the organ's notion of identity except one thing the organ itself should
// own and does not yet: a possessive ("Donelson's") is inflection of a name,
// not a new name, so it is resolved as its base.
//
// WHAT THE ORGAN DOES NOT YET DO, MEASURED 2026-09-21 on the Cumberland
// ground, and so what this pipeline cannot yet do:
//   - a misspelling ("Donelsn", "Cumberlnd", "Nashvile") resolves to nothing;
//   - identity fragments: "Cumberland", "Cumberland River" and "The Cumberland
//     River" are three referents; sentence openers ("Today", "May", "Old")
//     became referents of their own.
// Those belong in the referent organ, not here. Until they are fixed there, a
// misspelled name in the prose simply fails to carry its fact, and the fact is
// redrawn or floored — conservative, never a wrong binding.

import { makeReferentIndex } from "../organs/cast.js";
import { splitSentences } from "../adapters/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm, extractLeadingSurfaces } from "../adapters/text/surfaces.js";
import { nameRuns } from "./referent-verify.js";
import { dominantClass } from "./pos-prior.js";

const stripPossessive = (s) => String(s).replace(/['’]s\b/g, "").replace(/s['’](?=\s|$)/g, "s");

/**
 * buildReferents(ground) → { resolveText, resolveName, represent, size }
 *   resolveName(name)  → Set of referent ids the name points at
 *   resolveText(text)  → Set of referent ids any name in the text points at
 *   represent(id)      → the referent's most-individuated surface
 */
export function buildReferents(ground) {
  const indexFor = makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, leadingSurfaces: extractLeadingSurfaces });
  const idx = indexFor([{ text: String(ground ?? "") }]);
  // ONE BEING, ONE ID, FOR THE TWO CASES THAT ARE NOT NAMING AT ALL. The organ
  // made "The Cumberland River" and "Cumberland River" two referents, and
  // "Nashville's" a referent beside "Nashville". A leading article and a
  // possessive are grammar around a name, never part of it, so referents whose
  // surfaces differ ONLY by those are folded to one canonical id. Nothing else
  // is merged here: "Lake Cumberland" and "Cumberland Park" stay distinct,
  // which is the organ's call, not this module's.
  const norm = (s) => stripPossessive(String(s ?? "")).toLowerCase().replace(/^(the|a|an)(\s+|$)/, "").replace(/\s+/g, " ").trim();
  const canon = new Map();
  const byNorm = new Map();
  for (const id of [...idx.referents].sort()) {
    const n = norm(idx.represent(id));
    if (!byNorm.has(n)) byNorm.set(n, id);
    canon.set(id, byNorm.get(n));
  }
  const cache = new Map();
  const resolveName = (name) => {
    const key = String(name ?? "").trim();
    if (!key) return new Set();
    if (cache.has(key)) return cache.get(key);
    let ids = idx.resolve(key);
    if (!ids.size) ids = idx.resolve(stripPossessive(key));
    // WHEN A NAME REACHES SEVERAL BEINGS, THE ONE IT NAMES EXACTLY WINS.
    // "Cumberland" reached Cumberland, Cumberland River, Cumberland Park and
    // Lake Cumberland at once, and arrangement then chained unrelated parts
    // through Cumberland Park (measured 2026-09-21). If one referent's surface
    // is exactly the name, the name points at that one.
    if (ids.size > 1) {
      const want = norm(key);
      const exact = [...ids].filter((id) => norm(idx.represent(id)) === want);
      if (exact.length) ids = new Set(exact);
    }
    const out = new Set([...ids].map((id) => canon.get(id) ?? id));
    cache.set(key, out);
    return out;
  };
  // A ONE-WORD REFERENT IS ASSERTED IN ANY CASE. On small material the organ
  // admits a common noun that only ever opens a sentence ("Warehouses lined
  // the waterfront") as a referent; prose then says "warehouses" and a
  // capitals-only scan cannot see it is the same assertion. So a lowercase
  // word matching a one-word referent — singular or plural — resolves to it.
  const sing = (w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w);
  const oneWord = new Map();
  for (const id of idx.referents) {
    const n = norm(idx.represent(id));
    // Only a word the prior reads as a thing (noun, proper noun, or unseen)
    // is asserted in lowercase. A one-word "referent" that is really a modal,
    // an adjective or an adverb the organ admitted from a sentence opening
    // ("May", "Old") would otherwise capture every lowercase "may" and "old".
    const cls = n && !n.includes(" ") ? dominantClass(n) : null;
    if (n && !n.includes(" ") && (cls === null || cls === "NOUN" || cls === "PROPN")) oneWord.set(sing(n), canon.get(id) ?? id);
  }
  const resolveText = (text) => {
    const out = new Set();
    for (const tok of stripPossessive(String(text ?? "")).toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
      const id = tok ? oneWord.get(sing(tok)) : null;
      if (id) out.add(id);
    }
    for (const run of nameRuns(stripPossessive(text))) {
      // Try the whole run, then each tail of it, so "Before Dr. Thomas Walker"
      // or "While the Cumberland River" still reach the name inside.
      for (let i = 0; i < run.length; i++) {
        // A tail that is only an article names nothing: a sentence opening on
        // a bare "The" resolved to "The USGS" and made it a subject referent.
        if (!norm(run.slice(i).join(" "))) continue;
        const ids = resolveName(run.slice(i).join(" "));
        if (ids.size) { for (const id of ids) out.add(id); break; }
      }
    }
    return out;
  };
  return { resolveName, resolveText, represent: (id) => idx.represent(id), size: idx.referents.size, index: idx };
}

/**
 * attachReferents(draft, R) → the draft, now carrying its resolver and its
 * SUBJECT REFERENTS: beings named in more of the drawn parts than not. The
 * subject is what the whole is about; it is never demanded of a single fact
 * and never counts as one part taking up another. Measured, not listed.
 */
export function attachReferents(draft, R) {
  if (!draft?.root || !R) return draft;
  const parts = (draft.root.children ?? []).filter((p) => p.relevant !== false);
  const df = new Map();
  for (const p of parts) for (const id of R.resolveText(p.text ?? "")) df.set(id, (df.get(id) ?? 0) + 1);
  draft.referents = R;
  draft.subjectRefs = new Set([...df.entries()].filter(([, d]) => d * 2 > parts.length).map(([id]) => id));
  // RELEVANCE, BY WHO AND BY HOPS. The draft's own relevance pass tests the
  // ask's literal words; "Franck" never matched "Dr. Louis Franck" and an
  // EPA paragraph never said "mining" (falsifier: 2 of 9 and 5 of 26 parts
  // drawn). Here a part is also drawn when it names a being the ask names, or
  // shares a proper being with a part already drawn — expanding hop by hop
  // until nothing new joins (the hop bound is where the material stops
  // connecting, not a chosen depth).
  const all = draft.root.children ?? [];
  const asked = R.resolveText(draft.task ?? "");
  const beingsOf = new Map(all.map((p) => [p.id, new Set([...R.resolveText(p.text ?? "")].filter((id) => isProperReferent(R, id)))]));
  let changed = false;
  for (const p of all) if (!p.relevant && [...beingsOf.get(p.id)].some((id) => asked.has(id))) { p.relevant = true; p.drawnBy = "names a being the ask names"; changed = true; }
  if (all.some((p) => p.relevant) && all.some((p) => !p.relevant)) {
    for (let grew = true; grew;) {
      grew = false;
      const held = new Set(all.filter((p) => p.relevant).flatMap((p) => [...beingsOf.get(p.id)]));
      for (const p of all) if (!p.relevant && [...beingsOf.get(p.id)].some((id) => held.has(id) && !draft.subjectRefs.has(id))) { p.relevant = true; p.drawnBy = "shares a being with a drawn part"; grew = changed = true; }
    }
  }
  if (changed) draft.basis = `${draft.basis}; ${all.filter((p) => p.drawnBy).length} more part(s) drawn by referent (the ask's beings, then shared beings hop by hop)`;
  return draft;
}

/** Is this referent a PROPER being (a multi-word name, or one word the prior
 *  does not read as a common noun)? Common-noun referents the organ admitted
 *  from sentence openings ("Warehouses", "Steamboats") are real things of the
 *  material but too general to join parts across sources. */
export function isProperReferent(R, id) {
  const surface = String(R.represent(id) ?? "").replace(/^(the|a|an)\s+/i, "");
  if (!surface) return false;
  if (surface.includes(" ")) return true;
  const cls = dominantClass(surface.toLowerCase());
  return cls === null || cls === "PROPN";
}
