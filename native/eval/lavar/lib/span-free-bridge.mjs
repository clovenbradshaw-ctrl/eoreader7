// native/eval/lavar/lib/span-free-bridge.mjs — the span-free node bridge,
// shared by read-real.mjs (the reference recipe) and cli/eoreader7.mjs (the
// commandline). One implementation; neither caller re-derives it.
//
// REFERENTS ARE NODES, NEVER LITERAL SPANS (2026-09-12). A being is a
// span-free node born at first admission; a literal span is only a WITNESS
// that points at it. The composition ledger's bindings resolve an edge's
// participant only when the binding's `occurrence` equals the participant's
// own id. The assembly's anchor evidence is keyed to `ref-occ:…`
// (referent-adjudicated) while the hyperedge participants carry `occ:…`
// (text) — zero overlap, so a holograph without this bridge composes empty
// (264 edges, 0 chains, 0 candidates, measured). The bridge keys each
// participant-level binding to the EDGE's own `occ:` id by matching
// (encounter + surface), carrying a META-ID: the canonical referent identity,
// stable across text versions — what a future Rosetta match and the swarm's
// breakthrough store both key on. The identity taxonomy it instantiates:
//   text-occurrence  occ:file:encounter:idx:role   (S0 bytes)
//   canonical-occurrence  co:<canonical surface>   (S1 — across versions)
//   referent (meta)  ref:<canonical name>          (S2 Entity)
//   kind             kind:<population kind>        (S3 Kind)
//
// TWO FIXES ARE INSIDE THE MATCH, NOT BEHIND IT:
//   1. Identity, not containment (2026-09-13). Matching a participant's
//      surface against a canonical surface by CONTAINMENT fails exactly
//      where the perceiver already succeeded — a pronoun, an inflected
//      form, a fragment (the participant surface never CONTAINS the
//      canonical name). The perceiver already resolved these into
//      EOReferent@1 / EOMention@1 nodes; the bridge reuses that verdict.
//   2. Cast beings only (2026-09-13). A chain's shared bridge must be a
//      REAL being the reading established — `ref:auto:*` — never a holding
//      or a bare surface ("the daisies" / "the jar" / "the use of a book"
//      are not beings; measured: 28 distinct resolved refs, only 3
//      ref:auto:*, 0 chain sites formed without the gate).
//
// POSSESSIVE DEFINITE DESCRIPTIONS ARE HOLDINGS (S88's fourth signal,
// 2026-09-12). "her sister" is a being — but a HOLDING, not a final
// referent: the reader asks "who is the 'her' here?", then "who is X's
// sister?" — not known yet -> put in HOLDING (an open identity hypothesis).
// When the material later identifies that sister, the holding RESOLVES via
// the canonicalization floor (2 independent witnesses). The same
// resolve/hold/resolve loop works for ANY parameter (X's mother, X's
// brother, X's house).
//
// Side effect, disclosed: the possessive path PUSHES the open
// EOIdentityHypothesis@1 holding onto the caller's `rawEntries` array (the
// holding lands on the record, exactly as read-real.mjs always did). Frozen
// perceiver participants are never mutated — the binding carries the
// resolution.

const POSS = /^(my|her|his|our|their|your)\s+([\p{L}][\p{L}' -]{1,24})$/iu;

/**
 * bridgeEdgeParticipants(rawEntries) -> { participantBindings }
 *
 * Builds EODefiniteBinding@1 entries keyed to EDGE participants' own
 * occurrence ids, resolving each to a span-free cast referent (`ref:auto:*`)
 * by the perceiver's own encounter + surface-equality verdict. Pure apart
 * from the disclosed possessive-holding push.
 */
export function bridgeEdgeParticipants(rawEntries = []) {
  const refOccurrences = rawEntries.filter((e) => e.schema === "EOReferentOccurrence@1");
  const anchors = rawEntries.filter((e) => e.schema === "EOAnchorEvidence@1");

  // Build the span-free node table: ref -> { canonicalSurface, encounterRefs }.
  const refNodes = new Map();
  for (const ro of refOccurrences) {
    const r = ro.referent ?? ro.canonicalSurface;
    if (!r) continue;
    const n = refNodes.get(r) ?? { ref: r, canonicalSurface: ro.canonicalSurface ?? ro.surface ?? r, encounters: new Set() };
    if (ro.encounterRef) n.encounters.add(ro.encounterRef);
    refNodes.set(r, n);
  }
  for (const a of anchors) if (a.referent) {
    const n = refNodes.get(a.referent) ?? { ref: a.referent, canonicalSurface: a.surface ?? a.referent, encounters: new Set() };
    refNodes.set(a.referent, n);
  }
  // The EOReferent@1 nodes carry the full surface set the perceiver
  // admitted (Alice, White Rabbit, Dinah) — fold them in so the
  // surface-equality match has every admitted name, not just the first
  // occurrence's canonical form.
  for (const r of rawEntries.filter((e) => e.schema === "EOReferent@1")) {
    const n = refNodes.get(r.id) ?? { ref: r.id, canonicalSurface: (r.surfaces ?? [])[0] ?? r.id, encounters: new Set(), surfaces: [] };
    n.surfaces = [...new Set([...(n.surfaces ?? []), ...(r.surfaces ?? [])])];
    refNodes.set(r.id, n);
  }

  const mentions = rawEntries.filter((e) => e.schema === "EOMention@1");
  // referent -> node table (canonical surface + the encounters it was seen in)
  const refById = new Map();
  for (const n of refNodes.values()) refById.set(n.ref, n);
  // encounter -> the referent(s) the perceiver resolved there (from mentions)
  const mentionedRefsByEnc = new Map();
  for (const m of mentions) {
    if (!mentionedRefsByEnc.has(m.encounterRef)) mentionedRefsByEnc.set(m.encounterRef, []);
    mentionedRefsByEnc.get(m.encounterRef).push(m.referent);
  }
  // canonical surface (lowercased) -> referent node — CAST BEINGS ONLY
  const refBySurface = new Map();
  for (const [ref, node] of refById) {
    if (!String(ref ?? "").startsWith("ref:auto:")) continue; // cast beings only
    for (const s of [node.canonicalSurface, ...(node.surfaces ?? [])]) {
      const key = String(s ?? "").toLowerCase();
      if (key.length >= 3 && !refBySurface.has(key)) refBySurface.set(key, node);
    }
  }
  // the pronoun -> referent resolution the perceiver already made
  const resolveAt = (p, pEnc) => {
    const encKey = `encounter:${pEnc}`;
    const psurf = String(p.surface ?? "").toLowerCase();
    // 1. exact canonical-surface match at the same encounter
    const exact = refBySurface.get(psurf);
    if (exact && (exact.encounters.size === 0 || exact.encounters.has(encKey))) return exact;
    // 2. the perceiver's own mention resolution at this encounter
    const resolved = mentionedRefsByEnc.get(encKey) ?? [];
    if (resolved.length === 1) {
      const node = refById.get(resolved[0]);
      if (node) return node;
    }
    // 3. surface-equality (never containment) against any node seen here
    for (const ref of resolved) {
      const node = refById.get(ref);
      if (!node) continue;
      for (const s of [node.canonicalSurface, ...(node.surfaces ?? [])]) {
        if (String(s ?? "").toLowerCase() === psurf && psurf.length >= 3) return node;
      }
    }
    return null;
  };

  const participantBindings = [];
  for (const edge of rawEntries.filter((e) => e.schema === "EOHyperedge@1")) {
    // The edge's scope.sequencePosition IS the encounter it was read in.
    const edgeEnc = String(edge.scope?.sequencePosition ?? "");
    for (const p of edge.participants ?? []) {
      if (p.standing === "referent") continue;
      const node = resolveAt(p, edgeEnc);
      if (!node) continue;
      // The participant is a frozen perceiver object — never mutate it. The
      // ledger resolves standing from the EODefiniteBinding below.
      participantBindings.push(Object.freeze({
        schema: "EODefiniteBinding@1",
        id: `definite-binding:meta:${p.occurrence}`,
        occurrence: p.occurrence, // the edge's own occurrence id (S0 witness)
        referent: node.ref,        // the SPAN-FREE node id (S2 meaning)
        metaId: node.canonicalSurface, // the canonical form (across versions)
        surface: p.surface,
        adjudicatedBy: "span-free node bridge — Wilson's swarm",
        provenance: Object.freeze({ giver: "span-free node bridge", basis: `identity, not containment: the perceiver resolved this participant's occurrence at encounter:${edgeEnc} to ${node.ref} (EOMention@1 / EOReferentOccurrence@1); the span is the WITNESS, the node is the identity; referents are never keyed by literal spans`, canonicalOccurrence: node.canonicalSurface }),
      }));
    }
  }

  // Possessive definite descriptions are HOLDINGS.
  const holdings = new Map(); // (noun, owner) -> the ONE open hypothesis
  for (const edge of rawEntries.filter((e) => e.schema === "EOHyperedge@1")) {
    for (const p of edge.participants ?? []) {
      if (p.standing === "referent") continue;
      const pm = POSS.exec(String(p.surface ?? ""));
      if (!pm) continue;
      const owner = pm[1].toLowerCase(), noun = pm[2].toLowerCase();
      // ONE open identity hypothesis per (slot, owner) — all "her sister"
      // mentions resolve to the SAME holding, so chains can form on it.
      const hkey = `${noun}|${owner}`;
      let hypothesis = holdings.get(hkey);
      if (!hypothesis) {
        hypothesis = Object.freeze({
          schema: "EOIdentityHypothesis@1",
          id: `identity:poss:${noun}:${owner}`,
          surface: p.surface,
          canonicalSurface: noun,
          parameter: { slot: noun, of: owner },
          occurrence: p.occurrence,
          standing: "open", // HOLDING — not yet resolved
          adjudicatedBy: "span-free node bridge possessive-holding",
          provenance: Object.freeze({ giver: "span-free node bridge possessive-holding", basis: "S88's fourth signal — a common noun under a possessive determiner is a parameterized being in HOLDING; the possessive resolves to its owner, the slot awaits a witness; ALL mentions share this one holding", canonicalOccurrence: noun }),
        });
        holdings.set(hkey, hypothesis);
        rawEntries.push(hypothesis); // the holding lands on the record
      }
      participantBindings.push(Object.freeze({
        schema: "EODefiniteBinding@1",
        id: `definite-binding:poss:${p.occurrence}`,
        occurrence: p.occurrence,
        referent: hypothesis.id, // every mention points at the ONE holding
        metaId: noun,
        surface: p.surface,
        possessiveAnchor: owner,
        adjudicatedBy: "span-free node bridge possessive-holding",
        provenance: Object.freeze({ giver: "span-free node bridge possessive-holding", basis: "a possessive definite description is a HOLDING identity hypothesis, shared across mentions, resolved later by a witness", canonicalOccurrence: noun }),
      }));
    }
  }

  return { participantBindings };
}