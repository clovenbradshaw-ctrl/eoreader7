const freeze = (value) => Object.freeze(value);
const CLOSED = new Set(["resolved", "closed", "superseded", "retracted"]);

const refsOf = (value, out = new Set()) => {
  if (value == null) return out;
  if (typeof value === "string") {
    if (/^(ref|ref-occ|surface|occ|lex|mention|encounter|obs|edge|expectation|obligation|identity|discourse-link|withheld-composition|composition|frame|pattern|motif|delta|op|gap|task-target|task-evidence):/.test(value)) out.add(value);
    return out;
  }
  if (Array.isArray(value)) { for (const item of value) refsOf(item, out); return out; }
  if (typeof value === "object") for (const item of Object.values(value)) refsOf(item, out);
  return out;
};

const live = (entry) => entry && !CLOSED.has(entry.status) && !CLOSED.has(entry.state);

const CONSEQUENCE_SCHEMAS = new Set([
  "EOCanonicalHyperedge@1",
  "EOExpectation@1",
  "EOObligation@1",
  "EOIdentityAlternative@1",
  "EOPatternCandidate@1",
  "EOMotifCandidate@1",
  "EOLicensedComposition@1",
]);

const MATERIAL_KINDS = new Set([
  "relation_attribution",
  "relation_scope_or_multiplicity",
  "causal_attribution",
  "identity",
  "boundary",
  "expectation",
  "contradiction",
  "bridge_interpretation",
]);

function foldLookup(fold = {}) {
  let index = null;
  return (ref) => {
    if (!index) {
      index = new Map();
      for (const entry of [
        ...(fold?.expectations ?? []),
        ...(fold?.obligations ?? []),
        ...(fold?.unresolvedAlternatives ?? []),
        ...(fold?.activeFrames ?? []),
        ...(fold?.graphEntries ?? []),
      ]) {
        if (entry?.id && live(entry)) index.set(entry.id, entry);
      }
    }
    return index.get(ref) ?? null;
  };
}

/**
 * EO's active-reading bound: a distinction deserves effort only when resolving
 * it can change a consequence-bearing projection of the present Fold.
 *
 * The hypergraph index is authoritative when supplied. This matters both
 * semantically and computationally: DMD is a question about live dependency,
 * so it should follow indexed dependency edges rather than repeatedly scan the
 * whole Fold. Standalone callers without a graph retain a lazy Fold fallback.
 *
 * Salience, recurrence, uncertainty, and HL candidate standing may nominate a
 * distinction; none of them establish that the distinction makes a difference.
 */
export function differenceMakesDifference({ distinction = null, consequences = [], fold = {}, graph = null } = {}) {
  const targetRefs = refsOf(distinction);
  const consequenceRefs = refsOf(consequences);
  const reasons = [];
  const fallbackLookup = graph?.byId ? null : foldLookup(fold);
  const lookup = (ref) => graph?.byId ? graph.byId.get(ref) ?? null : fallbackLookup(ref);
  const hasLive = (ref) => live(lookup(ref));

  for (const ref of targetRefs) {
    const dependents = graph?.dependent?.get(ref) ?? [];
    for (const id of dependents) {
      const entry = graph?.byId?.get(id);
      if (!live(entry) || !CONSEQUENCE_SCHEMAS.has(entry?.schema)) continue;
      reasons.push(freeze({ kind: "live_dependent_projection", target: ref, ref: id, schema: entry.schema }));
    }
  }

  for (const ref of consequenceRefs) {
    const entry = lookup(ref);
    if (live(entry)) reasons.push(freeze({ kind: "explicit_live_consequence", ref, schema: entry?.schema ?? null }));
  }

  for (const consequence of consequences ?? []) {
    if (!consequence || typeof consequence !== "object" || !MATERIAL_KINDS.has(consequence.kind)) continue;
    const refs = [...refsOf(consequence)];
    if (refs.some(hasLive)) {
      reasons.push(freeze({ kind: "material_consequence_kind", consequence: consequence.kind, refs: freeze(refs) }));
    }
  }

  const unique = [];
  const seen = new Set();
  for (const reason of reasons) {
    const key = JSON.stringify(reason);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(reason);
  }

  return freeze({
    makesDifference: unique.length > 0,
    reasons: freeze(unique),
    targets: freeze([...targetRefs]),
    consequenceRefs: freeze([...consequenceRefs]),
  });
}
