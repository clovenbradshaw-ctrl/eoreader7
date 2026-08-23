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

function relationFields(fold = {}, ids = null) {
  const byScope = new Map();
  for (const edge of fold.graphEntries ?? []) {
    if (edge?.schema !== "EOHyperedge@1" || !edge.id) continue;
    const scope = edge?.meta?.encounterRef ?? (Number.isFinite(edge?.scope?.sequencePosition) ? `sequence:${edge.scope.sequencePosition}` : null);
    if (!scope) continue;
    if (!byScope.has(scope)) byScope.set(scope, []);
    byScope.get(scope).push(edge);
  }
  const out = [];
  for (const [scope, edges] of byScope) {
    const visible = ids ? edges.filter((edge) => ids.has(edge.id)) : edges;
    // A structural Ground requires more than one link. One relation is a Link;
    // co-present links supply the local field in which those figures occur.
    if (visible.length < 2) continue;
    const edgeRefs = visible.map((edge) => edge.id).sort();
    out.push(freeze({
      schema: "EOStructuralFieldProjection@1",
      id: `terrain:field:${stableHash(`${scope}|${edgeRefs.join("|")}`)}`,
      terrain: "Field",
      standing: "projection",
      witnessed: false,
      scope,
      edgeRefs: freeze(edgeRefs),
      relationTypes: freeze(unique(visible.map((edge) => edge.relation)).sort()),
      basis: "co_present_witnessed_links",
    }));
  }
  return out;
}

function relationNetworks(fold = {}, ids = null) {
  const bindingByOccurrence = new Map();
  for (const entry of fold.graphEntries ?? []) {
    if (!OCCURRENCE_BINDINGS.has(entry?.schema) || !entry?.occurrence || !entry?.referent) continue;
    bindingByOccurrence.set(entry.occurrence, entry.referent);
  }

  const byReferent = new Map();
  for (const edge of fold.graphEntries ?? []) {
    if (edge?.schema !== "EOHyperedge@1" || !edge.id) continue;
    for (const participant of edge.participants ?? []) {
      // Present topology may use an earned interpretation of an occurrence,
      // but raw witness is never rewritten. Lexical recurrence or an unresolved
      // surface without an explicit binding still cannot create a bridge.
      const occurrence = participant?.occurrence ?? participant?.ref;
      const referent = participant?.standing === "referent" ? participant.ref : bindingByOccurrence.get(occurrence);
      if (!referent) continue;
      if (!byReferent.has(referent)) byReferent.set(referent, new Map());
      byReferent.get(referent).set(edge.id, edge);
    }
  }
  const out = [];
  for (const [referent, edgeMap] of byReferent) {
    const all = [...edgeMap.values()];
    const visible = ids ? all.filter((edge) => ids.has(edge.id) || ids.has(referent)) : all;
    if (visible.length < 2) continue;
    const edgeRefs = visible.map((edge) => edge.id).sort();
    out.push(freeze({
      schema: "EORelationNetworkProjection@1",
      id: `terrain:network:${stableHash(`${referent}|${edgeRefs.join("|")}`)}`,
      terrain: "Network",
      standing: "projection",
      witnessed: false,
      bridgeRef: referent,
      edgeRefs: freeze(edgeRefs),
      relationTypes: freeze(unique(visible.map((edge) => edge.relation)).sort()),
      basis: "earned_referent_connects_witnessed_links",
    }));
  }
  return out;
}

const materialOpenObligations = (fold = {}, ids = null) => (fold.obligations ?? []).filter((item) => {
  if (!item?.id || !OPEN.has(item.status)) return false;
  if (item?.distinction?.materiality?.makesDifference !== true) return false;
  if (!ids) return true;
  if (ids.has(item.id)) return true;
  return [...(item.grounds ?? []), ...(item.alternatives ?? [])].some((id) => ids.has(id));
});

function interpretiveAtmosphere(fold = {}, ids = null) {
  const obligations = materialOpenObligations(fold, ids);
  if (!obligations.length) return [];
  const obligationRefs = obligations.map((item) => item.id).sort();
  const consequenceKinds = unique(obligations.flatMap((item) => item.consequences ?? []).map((item) => item?.kind)).sort();
  return [freeze({
    schema: "EOInterpretiveAtmosphereProjection@1",
    id: `terrain:atmosphere:${stableHash(obligationRefs.join("|"))}`,
    terrain: "Atmosphere",
    standing: "projection",
    witnessed: false,
    obligationRefs: freeze(obligationRefs),
    consequenceKinds: freeze(consequenceKinds),
    basis: "present_ground_of_unresolved_consequential_interpretation",
  })];
}

function paradigmKey(obligation) {
  if (String(obligation?.id ?? "").startsWith("obligation:identity:")) return "identity";
  if (String(obligation?.id ?? "").startsWith("obligation:composition:")) return "composition";
  const kinds = unique((obligation?.consequences ?? []).map((item) => item?.kind)).sort();
  return kinds.length ? kinds.join("+") : null;
}

function interpretiveParadigms(fold = {}, ids = null) {
  const groups = new Map();
  for (const obligation of materialOpenObligations(fold, ids)) {
    const key = paradigmKey(obligation);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(obligation);
  }
  const out = [];
  for (const [pattern, obligations] of groups) {
    // Pattern grain requires independently grounded instances. Repetition of
    // one obligation or one ground cannot bootstrap a Paradigm.
    const independentGrounds = new Set(obligations.flatMap((item) => item.grounds ?? []));
    if (obligations.length < 2 || independentGrounds.size < 2) continue;
    const obligationRefs = obligations.map((item) => item.id).sort();
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

/**
 * Present-tense terrain structure derived from already admitted Fold content.
 * These projections are not new witness and do not create DeltaFold surprise.
 * They are views over earned structure that can condition orientation and Q.
 */
export function projectEmergentTerrains(fold = {}, { ids = null } = {}) {
  const allowed = ids ? (ids instanceof Set ? ids : new Set(ids)) : null;
  const state = Object.fromEntries(TERRAINS.map((terrain) => [terrain, []]));
  state.Field.push(...relationFields(fold, allowed));
  state.Network.push(...relationNetworks(fold, allowed));
  state.Atmosphere.push(...interpretiveAtmosphere(fold, allowed));
  state.Paradigm.push(...interpretiveParadigms(fold, allowed));
  return freeze(Object.fromEntries(TERRAINS.map((terrain) => [terrain, freeze(state[terrain])])));
}

export function mergeTerrainStates(...states) {
  const result = {};
  for (const terrain of TERRAINS) {
    const byId = new Map();
    for (const state of states) for (const entry of state?.[terrain] ?? []) if (entry?.id) byId.set(entry.id, entry);
    result[terrain] = freeze([...byId.values()]);
  }
  return freeze(result);
}
