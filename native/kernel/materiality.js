const freeze = (value) => Object.freeze(value);
const CLOSED = new Set(["resolved", "closed", "superseded", "retracted"]);

const REF_RE = /^(ref|ref-occ|surface|occ|lex|mention|encounter|obs|edge|expectation|obligation|identity|discourse-link|withheld-composition|composition|frame|pattern|motif|delta|op|gap|task-target|task-evidence):/;
const EXPLICIT_REF_KEYS = new Set(["ref", "edge", "expectation", "obligation", "frame", "pattern", "referent", "composition", "target"]);
const refsOf = (value, out = new Set(), key = null) => {
  if (value == null) return out;
  if (typeof value === "string") {
    if (REF_RE.test(value) || EXPLICIT_REF_KEYS.has(key)) out.add(value);
    return out;
  }
  if (Array.isArray(value)) { for (const item of value) refsOf(item, out, key); return out; }
  if (typeof value === "object") for (const [childKey, item] of Object.entries(value)) refsOf(item, out, childKey);
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
  "terrain_projection",
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
 * The hypergraph index is authoritative when supplied. Explicit semantic ref
 * fields may point to any stable object id; they are not required to use one of
 * the kernel's conventional id prefixes. This keeps materiality omnimodal and
 * terrain-neutral while still refusing arbitrary prose strings as references.
 *
 * Terrain projection is a consequence like identity, relation attribution, or
 * expectation: a shift in Void/Entity/Kind/Field/Link/Network/Atmosphere/Lens/
 * Paradigm can activate work only when it points at a concrete live Fold object.
 * Naming a terrain alone never bootstraps importance.
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
    if (refs.some(hasLive)) reasons.push(freeze({ kind: "material_consequence_kind", consequence: consequence.kind, refs: freeze(refs) }));
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
