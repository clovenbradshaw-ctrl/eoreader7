import { TERRAINS } from "./terrain-state.js";

const freeze = (value) => Object.freeze(value);
const OPEN = new Set([undefined, null, "open", "strengthened", "weakened"]);
const OCCURRENCE_BINDINGS = new Set(["EOPronounBinding@1", "EODefiniteBinding@1"]);

const stableHash = (value) => {
  let h = 2166136261;
  for (const ch of String(value)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
};

const unique = (values = []) => [...new Set(values.filter(Boolean))];
const emptyTerrainState = () => Object.fromEntries(TERRAINS.map((terrain) => [terrain, freeze([])]));
const scopeOf = (edge) => edge?.meta?.encounterRef ?? (Number.isFinite(edge?.scope?.sequencePosition) ? `sequence:${edge.scope.sequencePosition}` : null);
const material = (item) => item?.id && OPEN.has(item.status) && item?.distinction?.materiality?.makesDifference === true;

function fieldProjection(scope, edges = []) {
  if (!scope || edges.length < 2) return null;
  const edgeRefs = edges.map((edge) => edge.id).filter(Boolean).sort();
  if (edgeRefs.length < 2) return null;
  return freeze({
    schema: "EOStructuralFieldProjection@1",
    id: `terrain:field:${stableHash(`${scope}|${edgeRefs.join("|")}`)}`,
    terrain: "Field",
    standing: "projection",
    witnessed: false,
    scope,
    edgeRefs: freeze(edgeRefs),
    relationTypes: freeze(unique(edges.map((edge) => edge.relation)).sort()),
    basis: "co_present_witnessed_links",
  });
}

function networkProjection(referent, edges = []) {
  if (!referent || edges.length < 2) return null;
  const edgeRefs = edges.map((edge) => edge.id).filter(Boolean).sort();
  if (edgeRefs.length < 2) return null;
  return freeze({
    schema: "EORelationNetworkProjection@1",
    id: `terrain:network:${stableHash(`${referent}|${edgeRefs.join("|")}`)}`,
    terrain: "Network",
    standing: "projection",
    witnessed: false,
    bridgeRef: referent,
    edgeRefs: freeze(edgeRefs),
    relationTypes: freeze(unique(edges.map((edge) => edge.relation)).sort()),
    basis: "earned_referent_connects_witnessed_links",
  });
}

function atmosphereProjection(obligations = []) {
  if (!obligations.length) return null;
  const obligationRefs = obligations.map((item) => item.id).sort();
  const consequenceKinds = unique(obligations.flatMap((item) => item.consequences ?? []).map((item) => item?.kind)).sort();
  return freeze({
    schema: "EOInterpretiveAtmosphereProjection@1",
    id: `terrain:atmosphere:${stableHash(obligationRefs.join("|"))}`,
    terrain: "Atmosphere",
    standing: "projection",
    witnessed: false,
    obligationRefs: freeze(obligationRefs),
    consequenceKinds: freeze(consequenceKinds),
    basis: "present_ground_of_unresolved_consequential_interpretation",
  });
}

function paradigmKey(obligation) {
  if (String(obligation?.id ?? "").startsWith("obligation:identity:")) return "identity";
  if (String(obligation?.id ?? "").startsWith("obligation:composition:")) return "composition";
  const kinds = unique((obligation?.consequences ?? []).map((item) => item?.kind)).sort();
  return kinds.length ? kinds.join("+") : null;
}

function paradigmProjections(obligations = []) {
  const groups = new Map();
  for (const obligation of obligations) {
    const key = paradigmKey(obligation);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(obligation);
  }
  const out = [];
  for (const [pattern, members] of groups) {
    // Pattern grain requires independently grounded instances. Repetition of
    // one obligation or one ground cannot bootstrap a Paradigm.
    const independentGrounds = new Set(members.flatMap((item) => item.grounds ?? []));
    if (members.length < 2 || independentGrounds.size < 2) continue;
    const obligationRefs = members.map((item) => item.id).sort();
    out.push(freeze({
      schema: "EOInterpretiveParadigmProjection@1",
      id: `terrain:paradigm:${stableHash(`${pattern}|${obligationRefs.join("|")}`)}`,
      terrain: "Paradigm",
      standing: "projection",
      witnessed: false,
      pattern,
      obligationRefs: freeze(obligationRefs),
      groundRefs: freeze([...independentGrounds].sort()),
      basis: "repeated_independently_grounded_material_interpretation",
    }));
  }
  return out;
}

function earnedRefsForEdge(edge, bindingByOccurrence) {
  const refs = new Set();
  for (const participant of edge?.participants ?? []) {
    if (participant?.standing === "referent" && participant.ref) {
      refs.add(participant.ref);
      continue;
    }
    const occurrence = participant?.occurrence ?? participant?.ref;
    const bound = occurrence ? bindingByOccurrence.get(occurrence) : null;
    if (bound) refs.add(bound);
  }
  return refs;
}

function refreshField(index, scope) {
  if (!scope) return;
  const edgeIds = index.edgeIdsByScope.get(scope) ?? new Set();
  const edges = [...edgeIds].map((id) => index.edgesById.get(id)).filter(Boolean);
  const projection = fieldProjection(scope, edges);
  if (projection) index.projections.Field.set(scope, projection);
  else index.projections.Field.delete(scope);
  index.dirty = true;
}

function refreshNetwork(index, referent) {
  if (!referent) return;
  const edgeIds = index.edgeIdsByReferent.get(referent) ?? new Set();
  const edges = [...edgeIds].map((id) => index.edgesById.get(id)).filter(Boolean);
  const projection = networkProjection(referent, edges);
  if (projection) index.projections.Network.set(referent, projection);
  else index.projections.Network.delete(referent);
  index.dirty = true;
}

function refreshEdgeReferents(index, edgeId) {
  const edge = index.edgesById.get(edgeId);
  if (!edge) return;
  const prior = index.referentsByEdge.get(edgeId) ?? new Set();
  const next = earnedRefsForEdge(edge, index.bindingByOccurrence);
  const affected = new Set([...prior, ...next]);
  for (const ref of prior) {
    if (next.has(ref)) continue;
    index.edgeIdsByReferent.get(ref)?.delete(edgeId);
  }
  for (const ref of next) {
    if (!index.edgeIdsByReferent.has(ref)) index.edgeIdsByReferent.set(ref, new Set());
    index.edgeIdsByReferent.get(ref).add(edgeId);
  }
  index.referentsByEdge.set(edgeId, next);
  for (const ref of affected) refreshNetwork(index, ref);
}

function ingestEdge(index, edge) {
  if (edge?.schema !== "EOHyperedge@1" || !edge.id || index.edgesById.has(edge.id)) return false;
  index.edgesById.set(edge.id, edge);
  const scope = scopeOf(edge);
  if (scope) {
    if (!index.edgeIdsByScope.has(scope)) index.edgeIdsByScope.set(scope, new Set());
    index.edgeIdsByScope.get(scope).add(edge.id);
    refreshField(index, scope);
  }
  for (const participant of edge.participants ?? []) {
    if (participant?.standing === "referent") continue;
    const occurrence = participant?.occurrence ?? participant?.ref;
    if (!occurrence) continue;
    if (!index.edgeIdsByOccurrence.has(occurrence)) index.edgeIdsByOccurrence.set(occurrence, new Set());
    index.edgeIdsByOccurrence.get(occurrence).add(edge.id);
  }
  refreshEdgeReferents(index, edge.id);
  return true;
}

function ingestBinding(index, binding) {
  if (!OCCURRENCE_BINDINGS.has(binding?.schema) || !binding?.id || !binding?.occurrence || !binding?.referent) return false;
  const current = index.bindingByOccurrence.get(binding.occurrence);
  const currentId = index.bindingIdByOccurrence.get(binding.occurrence);
  index.bindingsById.set(binding.id, binding);
  if (current === binding.referent && currentId === binding.id) return false;
  index.bindingByOccurrence.set(binding.occurrence, binding.referent);
  index.bindingIdByOccurrence.set(binding.occurrence, binding.id);
  for (const edgeId of index.edgeIdsByOccurrence.get(binding.occurrence) ?? []) refreshEdgeReferents(index, edgeId);
  index.dirty = true;
  return true;
}

function removeBinding(index, id) {
  const binding = index.bindingsById.get(id);
  if (!binding) return false;
  index.bindingsById.delete(id);
  if (index.bindingIdByOccurrence.get(binding.occurrence) !== id) return true;
  index.bindingIdByOccurrence.delete(binding.occurrence);
  index.bindingByOccurrence.delete(binding.occurrence);
  for (const edgeId of index.edgeIdsByOccurrence.get(binding.occurrence) ?? []) refreshEdgeReferents(index, edgeId);
  index.dirty = true;
  return true;
}

function refreshInterpretive(index) {
  const obligations = [...index.obligationsById.values()].filter(material);
  index.projections.Atmosphere.clear();
  const atmosphere = atmosphereProjection(obligations);
  if (atmosphere) index.projections.Atmosphere.set("current", atmosphere);
  index.projections.Paradigm.clear();
  for (const paradigm of paradigmProjections(obligations)) index.projections.Paradigm.set(paradigm.pattern, paradigm);
  index.dirty = true;
}

/**
 * Incremental projection of terrains that emerge from already-earned Fold
 * structure rather than from a single producing EO operation. Raw witness is
 * retained separately; these projections remain present-tense views only.
 */
export function createEmergentTerrainIndex(entries = []) {
  const index = {
    schema: "EOEmergentTerrainIndex@1",
    edgesById: new Map(),
    edgeIdsByScope: new Map(),
    edgeIdsByOccurrence: new Map(),
    bindingsById: new Map(),
    bindingByOccurrence: new Map(),
    bindingIdByOccurrence: new Map(),
    edgeIdsByReferent: new Map(),
    referentsByEdge: new Map(),
    obligationsById: new Map(),
    projections: {
      Field: new Map(),
      Network: new Map(),
      Atmosphere: new Map(),
      Paradigm: new Map(),
    },
    snapshot: null,
    dirty: true,
  };
  indexEmergentTerrainEntries(index, entries);
  return index;
}

export function indexEmergentTerrainEntries(index, entries = []) {
  if (index?.schema !== "EOEmergentTerrainIndex@1") throw new TypeError("indexEmergentTerrainEntries requires EOEmergentTerrainIndex@1");
  let interpretiveDirty = false;
  for (const entry of entries ?? []) {
    if (!entry) continue;
    if (entry.schema === "EOHyperedge@1") {
      ingestEdge(index, entry);
      continue;
    }
    if (OCCURRENCE_BINDINGS.has(entry.schema)) {
      ingestBinding(index, entry);
      continue;
    }
    if (entry.schema === "EOObligation@1" && entry.id) {
      index.obligationsById.set(entry.id, entry);
      interpretiveDirty = true;
      continue;
    }
    if (entry.schema === "EOOperation@1" && entry?.payload?.action === "remove-provisional" && entry.payload.id) removeBinding(index, entry.payload.id);
  }
  if (interpretiveDirty) refreshInterpretive(index);
  return index;
}

function materialObligationsForIds(index, ids) {
  const out = [];
  for (const obligation of index.obligationsById.values()) {
    if (!material(obligation)) continue;
    if (ids.has(obligation.id) || [...(obligation.grounds ?? []), ...(obligation.alternatives ?? [])].some((id) => ids.has(id))) out.push(obligation);
  }
  return out;
}

export function snapshotEmergentTerrainState(index, { ids = null } = {}) {
  if (index?.schema !== "EOEmergentTerrainIndex@1") throw new TypeError("snapshotEmergentTerrainState requires EOEmergentTerrainIndex@1");
  if (!ids) {
    if (!index.dirty && index.snapshot) return index.snapshot;
    const state = emptyTerrainState();
    state.Field = freeze([...index.projections.Field.values()]);
    state.Network = freeze([...index.projections.Network.values()]);
    state.Atmosphere = freeze([...index.projections.Atmosphere.values()]);
    state.Paradigm = freeze([...index.projections.Paradigm.values()]);
    index.snapshot = freeze(state);
    index.dirty = false;
    return index.snapshot;
  }

  const allowed = ids instanceof Set ? ids : new Set(ids);
  const state = emptyTerrainState();
  const scopes = new Set();
  const referents = new Set();
  for (const id of allowed) {
    const edge = index.edgesById.get(id);
    if (edge) {
      const scope = scopeOf(edge);
      if (scope) scopes.add(scope);
      for (const ref of index.referentsByEdge.get(id) ?? []) referents.add(ref);
    }
    if (index.edgeIdsByReferent.has(id)) referents.add(id);
  }

  const fields = [];
  for (const scope of scopes) {
    const edges = [...(index.edgeIdsByScope.get(scope) ?? [])].filter((id) => allowed.has(id)).map((id) => index.edgesById.get(id)).filter(Boolean);
    const projection = fieldProjection(scope, edges);
    if (projection) fields.push(projection);
  }
  state.Field = freeze(fields);

  const networks = [];
  for (const referent of referents) {
    const allIds = [...(index.edgeIdsByReferent.get(referent) ?? [])];
    const visibleIds = allowed.has(referent) ? allIds : allIds.filter((id) => allowed.has(id));
    const projection = networkProjection(referent, visibleIds.map((id) => index.edgesById.get(id)).filter(Boolean));
    if (projection) networks.push(projection);
  }
  state.Network = freeze(networks);

  const obligations = materialObligationsForIds(index, allowed);
  const atmosphere = atmosphereProjection(obligations);
  state.Atmosphere = atmosphere ? freeze([atmosphere]) : freeze([]);
  state.Paradigm = freeze(paradigmProjections(obligations));
  return freeze(state);
}

/**
 * Standalone projection for callers that only have a Fold snapshot. Recursive
 * reading uses EOEmergentTerrainIndex@1 and never rescans the accumulated Fold
 * merely to orient toward the next encounter.
 */
export function projectEmergentTerrains(fold = {}, { ids = null } = {}) {
  const entries = [
    ...(fold?.graphEntries ?? []),
    ...(fold?.obligations ?? []),
  ];
  return snapshotEmergentTerrainState(createEmergentTerrainIndex(entries), { ids });
}

export function mergeTerrainStates(...states) {
  const result = {};
  for (const terrain of TERRAINS) {
    const populated = states.map((state) => state?.[terrain] ?? []).filter((entries) => entries.length > 0);
    if (populated.length === 0) {
      result[terrain] = freeze([]);
      continue;
    }
    // The common case is orthogonal direct/emergent terrain buckets. Reuse the
    // already-frozen array instead of copying thousands of direct entries on
    // every orientation turn.
    if (populated.length === 1) {
      result[terrain] = populated[0];
      continue;
    }
    const byId = new Map();
    for (const entries of populated) for (const entry of entries) if (entry?.id) byId.set(entry.id, entry);
    result[terrain] = freeze([...byId.values()]);
  }
  return freeze(result);
}
