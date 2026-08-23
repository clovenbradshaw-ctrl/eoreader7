const freeze = (value) => Object.freeze(value);

const OCCURRENCE_BINDING_SCHEMAS = new Set(["EOPronounBinding@1", "EODefiniteBinding@1"]);
const DEFAULT_DEPTH_THRESHOLDS = Object.freeze([2, 4, 8, 16]);

const positionOf = (edge) => Number.isFinite(edge?.scope?.sequencePosition)
  ? edge.scope.sequencePosition
  : Number.isFinite(edge?.sequencePosition)
    ? edge.sequencePosition
    : null;

const occurrenceOf = (participant) => participant?.occurrence
  ?? (participant?.standing === "unresolved_surface" ? participant?.ref : null);

function endpointOf(participant, bindings) {
  if (!participant) return null;
  if (participant.standing === "referent" && participant.ref) {
    return freeze({ entityRef: participant.ref, basis: "witnessed_referent", bindingRef: null });
  }
  const occurrence = occurrenceOf(participant);
  if (!occurrence) return null;
  const binding = bindings.get(occurrence);
  if (!binding?.referent) return null;
  return freeze({ entityRef: binding.referent, basis: "explicit_occurrence_binding", bindingRef: binding.id });
}

function structuralFeature({ id, entityRef, featureKey, featureValue, edge, basis, bindingRef = null }) {
  return freeze({
    id,
    entityRef,
    featureKey,
    featureValue,
    sequencePosition: positionOf(edge),
    witness: edge?.witness ?? null,
    witnessRefs: freeze([...(edge?.witnessRefs ?? [])]),
    provenance: freeze({
      modality: edge?.meta?.modality ?? edge?.provenance?.modality ?? null,
      giver: "kernel/kind-graph-structure",
      basis,
      sourceSchema: edge?.schema ?? null,
      sourceRef: edge?.id ?? null,
      bindingRef,
    }),
  });
}

/**
 * Present-tense structural projection over immutable witnessed hyperedges.
 *
 * Raw edges remain untouched. Occurrence bindings only change which Entity the
 * current projection attributes an already-witnessed participation to. The
 * ledger is deliberately semantic-label free: it exposes role, recurrence
 * depth, role breadth, and relation-diversity depth. Kind induction still has
 * to prove that any of those distinctions changes held-out consequences.
 */
export function createKindGraphStructureLedger({ depthThresholds = DEFAULT_DEPTH_THRESHOLDS } = {}) {
  const thresholds = [...new Set(depthThresholds)]
    .filter((value) => Number.isInteger(value) && value >= 2)
    .sort((a, b) => a - b);
  if (!thresholds.length) throw new TypeError("Kind graph structure requires at least one depth threshold >= 2");

  const rawEdges = new Map();
  const bindings = new Map();
  let dirty = true;
  let cached = freeze([]);

  const rememberEdge = (edge) => {
    if (edge?.schema !== "EOHyperedge@1" || !edge.id || positionOf(edge) === null || rawEdges.has(edge.id)) return false;
    rawEdges.set(edge.id, edge);
    dirty = true;
    return true;
  };

  const rememberBinding = (binding) => {
    if (!OCCURRENCE_BINDING_SCHEMAS.has(binding?.schema) || !binding?.occurrence || !binding?.referent) return false;
    const prior = bindings.get(binding.occurrence);
    if (prior?.id === binding.id && prior?.referent === binding.referent) return false;
    bindings.set(binding.occurrence, binding);
    dirty = true;
    return true;
  };

  const ingest = (entries = []) => {
    let changed = 0;
    for (const entry of entries ?? []) {
      if (rememberEdge(entry)) changed += 1;
      if (rememberBinding(entry)) changed += 1;
    }
    return changed;
  };

  const snapshot = () => {
    if (!dirty) return cached;
    const features = [];
    const relationCount = new Map();
    const predicates = new Map();
    const roles = new Map();
    const roleBreadthEmitted = new Set();
    const sorted = [...rawEdges.values()].sort((a, b) => positionOf(a) - positionOf(b) || a.id.localeCompare(b.id));

    for (const edge of sorted) {
      for (let ordinal = 0; ordinal < (edge.participants ?? []).length; ordinal += 1) {
        const participant = edge.participants[ordinal];
        const endpoint = endpointOf(participant, bindings);
        if (!endpoint?.entityRef) continue;
        const entityRef = endpoint.entityRef;
        const role = participant.role ?? "participant";
        const bindingRef = endpoint.bindingRef;

        features.push(structuralFeature({
          id: `kind-evidence:graph-role:${edge.id}:${ordinal}`,
          entityRef,
          featureKey: "relation_role",
          featureValue: role,
          edge,
          basis: endpoint.basis === "explicit_occurrence_binding"
            ? "bound_hyperedge_role"
            : "witnessed_hyperedge_role",
          bindingRef,
        }));

        const count = (relationCount.get(entityRef) ?? 0) + 1;
        relationCount.set(entityRef, count);
        if (thresholds.includes(count)) {
          features.push(structuralFeature({
            id: `kind-evidence:graph-participation-depth:${entityRef}:${count}`,
            entityRef,
            featureKey: "relation_participation_depth",
            featureValue: `${count}+`,
            edge,
            basis: "witnessed_relation_recurrence_threshold",
            bindingRef,
          }));
        }

        if (!predicates.has(entityRef)) predicates.set(entityRef, new Set());
        const predicateSet = predicates.get(entityRef);
        const beforePredicates = predicateSet.size;
        predicateSet.add(edge.relation);
        if (predicateSet.size > beforePredicates && thresholds.includes(predicateSet.size)) {
          features.push(structuralFeature({
            id: `kind-evidence:graph-diversity-depth:${entityRef}:${predicateSet.size}`,
            entityRef,
            featureKey: "relation_diversity_depth",
            featureValue: `${predicateSet.size}+`,
            edge,
            basis: "witnessed_relation_diversity_threshold",
            bindingRef,
          }));
        }

        if (!roles.has(entityRef)) roles.set(entityRef, new Set());
        const roleSet = roles.get(entityRef);
        roleSet.add(role);
        if (!roleBreadthEmitted.has(entityRef) && roleSet.has("subject") && roleSet.has("object")) {
          roleBreadthEmitted.add(entityRef);
          features.push(structuralFeature({
            id: `kind-evidence:graph-role-breadth:${entityRef}:subject-object`,
            entityRef,
            featureKey: "relation_role_breadth",
            featureValue: "subject_object",
            edge,
            basis: "witnessed_role_breadth",
            bindingRef,
          }));
        }
      }
    }

    cached = freeze(features);
    dirty = false;
    return cached;
  };

  ingest([]);
  return freeze({
    schema: "EOKindGraphStructureLedger@1",
    ingest,
    snapshot,
    diagnostics: () => freeze({
      rawEdges: rawEdges.size,
      occurrenceBindings: bindings.size,
      projectedFeatures: snapshot().length,
      depthThresholds: freeze([...thresholds]),
    }),
  });
}
