// cast.js — names resolve to referents, not to strings.
// Handle: Zhengming — after Confucius's rectification of names: a name answers to its referent, not to its string. Amendment XVII.
//
// Measured motivation, in order: the grounding check flagged "Pierre
// Bezukhov" as not-in-the-material against the very chapters that name him,
// because containment compared byte sequences. A diacritic fold fixed that
// instance and missed the class — no string rule makes "Pierre" support
// "Bezukhov". What makes any of these equivalent is that they point to the
// same REFERENT, and referent discovery is an organ the engine already has:
// surfaces.js's extractSurfaces (candidate names by the text's own
// capitalisation physics) and discoverReferents (name-variant coreference at
// engine tier — containment and shared final token, generic tokens stripped
// so two Princesses never merge). Descriptor synonymy and pronoun binding
// stay model-tier gaps there, and therefore stay unsupported here — this
// resolver rescues exactly what the engine can derive, nothing further.
//
// Pure, organs injected: the engine's functions arrive as arguments, because
// this module is imported by both the page (which loads them from /engine)
// and the node tests (which load them by relative path). The organs are
// used, never copied — the fold discipline (diaNorm's disclosed-narrow
// scope) rides in with them.

/**
 * Build a per-passage-set name resolver from the engine's own organs.
 *
 * `makeCastResolver(organs)` → `castFor(passages)` → `resolveName(name)`.
 *
 * The cast is discovered from THE PASSAGES' OWN TEXT at check time — not
 * from the whole source — so "supported by the material" keeps meaning the
 * material this turn was actually handed. minSentences is 0 by declaration:
 * this asks presence ("did these passages establish this name"), not cast
 * membership ("is this a recurring being"), and a name mentioned once is
 * present once.
 */
/**
 * The cast as HANDLES — one representative surface per referent, for a
 * decoding grammar to enumerate. The most-individuated surface represents
 * (most glyphs: "Pierre Bezúkhov" over "Pierre"), because the handle is what
 * the bound answer will print and the fullest established form points at
 * its referent least ambiguously. Same organs, same discovery as the
 * resolver; the two cannot drift.
 */
/**
 * The text this organ reads for one passage: its own span of a whole-page
 * furniture blanking when the caller asks for it AND the chunker attached a
 * verified copy, otherwise the passage's raw text.
 *
 * THE DECISION THIS TAKES, AND WHY IT IS OPT-IN. hypergraph.js already reads
 * `chunk.blanked` for EXTRACTION, and its own header states — deliberately,
 * as a deferral rather than an oversight — that the referent index was left
 * on the unblanked text: "What the change removes is navbox EDGES, not navbox
 * REFERENTS. Blanking the index's input too is a separate decision with its
 * own cost (a name genuinely introduced in a caption or a list is then
 * unknown to the reading) and is not taken here."
 *
 * That deferral had a real benefit on one side and a real cost on the other
 * and no measurement of either. Measured 2026-09-04 on three accounts of
 * Borodino: with the index on raw text, Wikipedia navbox link titles enter
 * the cast as referents and the longest-established-surface rule MERGES them
 * with real people — "Prince Andrew" became "August Prince Andrew", Barclay
 * de Tolly merged with Pyotr Bagration, and "Light While There" (a link to
 * Tolstoy's 1888 "Walk in the Light While There is Light") became a referent
 * competing for slots. Since P11 routes ALL identity through this organ, a
 * corrupted cast corrupts every claim downstream of it.
 *
 * So the option exists and the default does not change. Omitted, every
 * caller sees byte-identical behaviour — the same posture `blankFurniture`,
 * `verbForms` and `nounPhraseSubjects` already hold. The cost the deferral
 * named is real and is measured beside the benefit rather than assumed away
 * (eval/the-fold/cast-furniture.mjs), because "this region is furniture" is a
 * Pattern-grain claim a corpus can refute and never earn.
 *
 * The readback gate is hypergraph.js's own, reused rather than re-derived: a
 * copy is usable only when it is the same length as the text it stands for.
 * Anything else falls back to the raw text — feature off, never wrong.
 */
function readableOf(p, blanked) {
  const raw = String(p?.text ?? "");
  if (!blanked) return raw;
  const b = p?.blanked;
  return typeof b === "string" && b.length === raw.length ? b : raw;
}

export function makeCastHandles({ splitSentences, extractSurfaces, discoverReferents }) {
  return function handlesFor(passages, { blanked = false } = {}) {
    const text = (passages ?? []).map((p) => readableOf(p, blanked)).join("\n\n");
    if (!text.trim()) return [];
    let events;
    try {
      const sentences = splitSentences(text);
      const surfaces = extractSurfaces(sentences, {});
      events = discoverReferents(surfaces, { minSentences: 0 }).events;
    } catch {
      return [];
    }
    const best = new Map(); // referent_id -> longest surface
    for (const e of events) {
      const prev = best.get(e.referent_id);
      if (!prev || e.surface.length > prev.length) best.set(e.referent_id, e.surface);
    }
    return [...best.values()].sort();
  };
}

/**
 * The referent index: the same discovery as the resolver below, exposed as
 * IDENTITIES rather than a boolean. `makeReferentIndex(organs)` →
 * `indexFor(passages)` → `{ events, referents, resolve, represent }`, where
 * `resolve(name)` answers WHICH referents a name points at (a Set of
 * referent ids, empty when none) and `represent(id)` is the referent's
 * most-individuated established surface. The relation tier (hypergraph.js)
 * needs identities, not booleans: an edge's endpoints must key on WHO,
 * so that "Bezukhov" and "Pierre Bezúkhov" land on the same node. One
 * implementation of "the same name" — the resolver is a projection of this
 * index, so support and identity cannot drift apart.
 */
export function makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm }) {
  return function indexFor(passages, { blanked = false } = {}) {
    const text = (passages ?? []).map((p) => readableOf(p, blanked)).join("\n\n");
    const empty = { events: [], referents: new Set(), resolve: () => new Set(), represent: () => null };
    if (!text.trim()) return empty;
    let events;
    try {
      const sentences = splitSentences(text);
      const surfaces = extractSurfaces(sentences, {});
      events = discoverReferents(surfaces, { minSentences: 0 }).events;
    } catch {
      // An organ refusing (script it doesn't apply to, empty material) means
      // no cast — the index is empty and the byte check stands alone.
      return empty;
    }
    if (!events.length) return empty;

    const best = new Map(); // referent_id -> longest established surface
    for (const e of events) {
      const prev = best.get(e.referent_id);
      if (!prev || e.surface.length > prev.length) best.set(e.referent_id, e.surface);
    }

    // Prefix tolerance exists for stems and inflections, and four
    // characters is the shortest thing that can be a stem rather than a
    // coincidence — the same MIN_STEM grounding.js earned. Without the
    // floor, a bare initial covered a whole surname: material writing
    // only "Pierre B." supported "Pierre Bezukhov", crediting the model
    // with a surname the material never wrote. Found by asking the gate
    // the abbreviation question directly (II.10: a check is verified
    // against what it must reject).
    const MIN_STEM = 4;
    const covers = (s, p) =>
      s === p ||
      (Math.min(s.length, p.length) >= MIN_STEM && (s.startsWith(p) || p.startsWith(s)));

    function resolve(name) {
      // Two tests, both required, because they answer different questions.
      // namesCorefer — the engine's own sameness test, so what counts as
      // "the same name" cannot drift between discovery and support. But
      // coreference is SYMMETRIC (built for merging a cast) and support is
      // not: material that says only "Pierre" must not support an answer
      // that extends him to "Pierre Bezukhov" — the surname would be model-
      // supplied content wearing a resolved name's clothes. So the second
      // test is coverage: every individuating token of the claimed name
      // must appear in the established surface. Sub-forms of an established
      // name resolve; extensions of it do not.
      //
      // Honestly noted: at engine tier this rescue largely coincides with
      // folded byte containment — the genuinely disjoint alias ("Peter
      // Kirílovich" for Pierre) is model-tier, typed as a gap by the engine
      // itself, and closes only when a received prior with a named giver
      // supplies it. This resolver is the seam where that prior will plug
      // in; it does not pretend to be the prior.
      const ids = new Set();
      const parts = diaNorm(name).split(/\s+/).filter((t) => t.length > 2);
      if (!parts.length) return ids;
      for (const e of events) {
        if (!namesCorefer(name, e.surface)) continue;
        const surfaceTokens = diaNorm(e.surface).split(/\s+/);
        if (parts.every((p) => surfaceTokens.some((s) => covers(s, p)))) ids.add(e.referent_id);
      }
      return ids;
    }

    return { events, referents: new Set(best.keys()), resolve, represent: (id) => best.get(id) ?? null };
  };
}

export function makeCastResolver(organs) {
  const indexFor = makeReferentIndex(organs);
  return function castFor(passages, { blanked = false } = {}) {
    const index = indexFor(passages, { blanked });
    if (!index.events.length) return () => false;
    // The resolver is the index's boolean face: a name is supported exactly
    // when it resolves to at least one referent. One implementation, two
    // projections — support and identity cannot drift.
    return function resolveName(name) {
      return index.resolve(name).size > 0;
    };
  };
}
