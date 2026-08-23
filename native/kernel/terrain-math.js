const freeze = (value) => Object.freeze(value);

const log2 = (value) => Math.log(value) / Math.log(2);
const choose2 = (n) => n < 2 ? 0 : (n * (n - 1)) / 2;
const unique = (values = []) => [...new Set(values.filter((value) => value !== null && value !== undefined))];

function counts(values = []) {
  const out = new Map();
  for (const value of values) out.set(value, (out.get(value) ?? 0) + 1);
  return out;
}

export function shannonEntropy(values = []) {
  if (!values.length) return 0;
  const distribution = counts(values);
  let entropy = 0;
  for (const count of distribution.values()) {
    const p = count / values.length;
    entropy -= p * log2(p);
  }
  return entropy;
}

function normalizedEntropy(values = []) {
  const k = new Set(values).size;
  if (k <= 1) return 0;
  return shannonEntropy(values) / log2(k);
}

function participantSite(participant) {
  if (!participant) return null;
  if (participant.standing === "referent" && participant.ref) return `ref:${participant.ref}`;
  const occurrence = participant.occurrence ?? participant.ref;
  if (occurrence) return `occ:${occurrence}`;
  if (participant.surfaceKey) return `surface:${participant.surfaceKey}`;
  return null;
}

/** Structure/Ground: incidence potential over a local carrier. */
export function structuralFieldGeometry(edges = []) {
  const usable = edges.filter((edge) => edge?.schema === "EOHyperedge@1" && edge.id);
  const edgeCount = usable.length;
  const siteEdges = new Map();
  const relationValues = [];
  let incidenceCount = 0;

  for (const edge of usable) {
    relationValues.push(edge.relation ?? "unknown");
    const sites = new Set((edge.participants ?? []).map(participantSite).filter(Boolean));
    incidenceCount += sites.size;
    for (const site of sites) {
      if (!siteEdges.has(site)) siteEdges.set(site, new Set());
      siteEdges.get(site).add(edge.id);
    }
  }

  let incidenceEnergy = 0;
  const coupledPairs = new Set();
  for (const edgeIds of siteEdges.values()) {
    incidenceEnergy += choose2(edgeIds.size);
    const ids = [...edgeIds].sort();
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) coupledPairs.add(`${ids[i]}|${ids[j]}`);
    }
  }

  const possiblePairs = choose2(edgeCount);
  return freeze({
    model: "local_incidence_field",
    linkCount: edgeCount,
    siteCount: siteEdges.size,
    incidenceCount,
    incidenceEnergy,
    coupledEdgePairs: coupledPairs.size,
    couplingDensity: possiblePairs ? coupledPairs.size / possiblePairs : 0,
    relationEntropy: shannonEntropy(relationValues),
    normalizedRelationEntropy: normalizedEntropy(relationValues),
  });
}

function edgeReferents(edge, referentsByEdge) {
  return [...(referentsByEdge?.get(edge.id) ?? [])].filter(Boolean).sort();
}

/** Structure/Pattern: connected topology of Links and earned referents. */
export function relationNetworkComponents(edges = [], referentsByEdge = new Map()) {
  const edgeById = new Map(edges.filter((edge) => edge?.schema === "EOHyperedge@1" && edge.id).map((edge) => [edge.id, edge]));
  const refsByEdge = new Map();
  const edgesByRef = new Map();

  for (const edge of edgeById.values()) {
    const refs = edgeReferents(edge, referentsByEdge);
    if (!refs.length) continue;
    refsByEdge.set(edge.id, refs);
    for (const ref of refs) {
      if (!edgesByRef.has(ref)) edgesByRef.set(ref, new Set());
      edgesByRef.get(ref).add(edge.id);
    }
  }

  const seenEdges = new Set();
  const components = [];
  for (const startEdge of refsByEdge.keys()) {
    if (seenEdges.has(startEdge)) continue;
    const edgeQueue = [startEdge];
    const componentEdges = new Set();
    const componentRefs = new Set();
    seenEdges.add(startEdge);

    while (edgeQueue.length) {
      const edgeId = edgeQueue.pop();
      componentEdges.add(edgeId);
      for (const ref of refsByEdge.get(edgeId) ?? []) {
        if (componentRefs.has(ref)) continue;
        componentRefs.add(ref);
        for (const neighbor of edgesByRef.get(ref) ?? []) {
          if (seenEdges.has(neighbor)) continue;
          seenEdges.add(neighbor);
          edgeQueue.push(neighbor);
        }
      }
    }

    if (componentEdges.size < 2) continue;
    const edgeRefs = [...componentEdges].sort();
    const referentRefs = [...componentRefs].sort();
    const relationValues = edgeRefs.map((id) => edgeById.get(id)?.relation ?? "unknown");
    let incidenceCount = 0;
    const degreeByReferent = {};
    for (const ref of referentRefs) {
      const degree = [...(edgesByRef.get(ref) ?? [])].filter((id) => componentEdges.has(id)).length;
      degreeByReferent[ref] = degree;
      incidenceCount += degree;
    }
    const vertexCount = edgeRefs.length + referentRefs.length;
    const cycleRank = Math.max(0, incidenceCount - vertexCount + 1);
    const branchingReferents = referentRefs.filter((ref) => degreeByReferent[ref] > 2).length;

    components.push(freeze({
      model: "bipartite_hypergraph_component",
      edgeRefs: freeze(edgeRefs),
      referentRefs: freeze(referentRefs),
      edgeCount: edgeRefs.length,
      referentCount: referentRefs.length,
      incidenceCount,
      cycleRank,
      topology: cycleRank > 0 ? "cyclic" : "acyclic",
      branchingReferents,
      degreeByReferent: freeze(degreeByReferent),
      relationEntropy: shannonEntropy(relationValues),
      normalizedRelationEntropy: normalizedEntropy(relationValues),
    }));
  }

  return freeze(components.sort((a, b) => b.edgeCount - a.edgeCount || b.cycleRank - a.cycleRank || a.edgeRefs[0].localeCompare(b.edgeRefs[0])));
}

function nestedReferenceValues(value, out = new Set()) {
  if (value == null) return out;
  if (typeof value === "string") {
    if (/^(ref|ref-occ|occ|edge|expectation|obligation|identity|composition|frame|pattern|motif|task):/.test(value)) out.add(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) nestedReferenceValues(item, out);
    return out;
  }
  if (typeof value === "object") for (const item of Object.values(value)) nestedReferenceValues(item, out);
  return out;
}

function obligationRefs(obligation) {
  const refs = new Set([...(obligation?.grounds ?? []), ...(obligation?.alternatives ?? [])].filter(Boolean).map(String));
  for (const ref of nestedReferenceValues(obligation?.consequences ?? [])) refs.add(ref);
  return refs;
}

function consequenceKinds(obligation) {
  return (obligation?.consequences ?? []).map((item) => item?.kind).filter(Boolean);
}

function persistenceOf(obligation, sequence) {
  const stored = Math.max(0, Number(obligation?.persistence ?? 0));
  if (!Number.isFinite(sequence) || !Number.isFinite(obligation?.openedAt)) return stored;
  return Math.max(stored, sequence - obligation.openedAt + 1, 0);
}

/** Interpretation/Ground: coupled potential of unresolved material constraints. */
export function interpretiveAtmosphereField(obligations = [], { sequence = null } = {}) {
  const usable = obligations.filter((item) => item?.id);
  const potentials = [];
  const potentialById = new Map();
  const refsById = new Map();
  const allKinds = [];

  for (const obligation of usable) {
    const persistence = persistenceOf(obligation, sequence);
    const consequenceCount = Math.max(1, (obligation.consequences ?? []).length);
    const alternativeCount = Math.max(1, (obligation.alternatives ?? []).length);
    const materialityReach = Math.max(1, obligation?.distinction?.materiality?.reasons?.length ?? 0);
    const consequenceReach = Math.max(consequenceCount, materialityReach);
    const localPotential = (1 + persistence) * consequenceReach * (1 + log2(alternativeCount));
    const refs = obligationRefs(obligation);
    refsById.set(obligation.id, refs);
    potentialById.set(obligation.id, localPotential);
    allKinds.push(...consequenceKinds(obligation));
    potentials.push(freeze({ obligation: obligation.id, persistence, consequenceReach, alternativeCount, potential: localPotential }));
  }

  const couplings = [];
  let couplingEnergy = 0;
  for (let i = 0; i < usable.length; i += 1) {
    for (let j = i + 1; j < usable.length; j += 1) {
      const a = usable[i].id;
      const b = usable[j].id;
      const ar = refsById.get(a) ?? new Set();
      const br = refsById.get(b) ?? new Set();
      if (!ar.size || !br.size) continue;
      let shared = 0;
      for (const ref of ar) if (br.has(ref)) shared += 1;
      if (!shared) continue;
      const coupling = shared / Math.sqrt(ar.size * br.size);
      const energy = coupling * Math.sqrt((potentialById.get(a) ?? 0) * (potentialById.get(b) ?? 0));
      couplingEnergy += energy;
      couplings.push(freeze({ from: a, to: b, shared, coupling, energy }));
    }
  }

  const localPotential = potentials.reduce((sum, item) => sum + item.potential, 0);
  return freeze({
    model: "coupled_unresolved_potential_field",
    obligationCount: usable.length,
    localPotential,
    couplingEnergy,
    totalEnergy: localPotential + couplingEnergy,
    consequenceEntropy: shannonEntropy(allKinds),
    normalizedConsequenceEntropy: normalizedEntropy(allKinds),
    potentials: freeze(potentials),
    couplings: freeze(couplings),
  });
}

function countBucket(value) {
  const n = Math.max(0, Number(value) || 0);
  if (n === 0) return "0";
  if (n === 1) return "1";
  if (n <= 3) return "2-3";
  if (n <= 7) return "4-7";
  return "8+";
}

function materialityReasonKinds(obligation) {
  return unique((obligation?.distinction?.materiality?.reasons ?? []).map((reason) => reason?.kind).filter(Boolean)).sort();
}

/**
 * Functional signature of an interpretation. It deliberately ignores JS field
 * names such as `target`, `relation`, or `composition`: serialization shape is
 * not ontology. The signature asks what causal work the Lens does—what kinds
 * of consequence it bears, what materiality relation warrants it, and the
 * coarse geometry of its grounds/alternatives.
 */
export function interpretiveSignature(obligation) {
  const consequence = unique(consequenceKinds(obligation)).sort();
  const materialityKinds = materialityReasonKinds(obligation);
  const tokens = unique([
    ...consequence.map((kind) => `consequence:${kind}`),
    ...materialityKinds.map((kind) => `materiality:${kind}`),
    `grounds:${countBucket((obligation?.grounds ?? []).length)}`,
    `alternatives:${countBucket((obligation?.alternatives ?? []).length)}`,
    `consequences:${countBucket((obligation?.consequences ?? []).length)}`,
  ]).sort();
  return freeze({ key: tokens.join("|"), tokens: freeze(tokens), complexity: tokens.length });
}

/** Interpretation/Pattern: explanatory compression over independent Lenses. */
export function interpretiveParadigmModels(obligations = []) {
  const groups = new Map();
  for (const obligation of obligations) {
    if (!obligation?.id) continue;
    const signature = interpretiveSignature(obligation);
    if (!signature.key || signature.complexity === 0) continue;
    if (!groups.has(signature.key)) groups.set(signature.key, { signature, members: [] });
    groups.get(signature.key).members.push(obligation);
  }

  const out = [];
  for (const { signature, members } of groups.values()) {
    const independentGrounds = new Set(members.flatMap((item) => item.grounds ?? []).filter(Boolean));
    if (members.length < 2 || independentGrounds.size < 2) continue;
    const separateCost = members.length * signature.complexity;
    const pointerCost = members.length;
    const modelCost = signature.complexity + pointerCost;
    const compressionGain = separateCost - modelCost;
    if (!(compressionGain > 0)) continue;
    out.push(freeze({
      model: "minimum_description_length",
      signature: signature.key,
      tokens: signature.tokens,
      memberRefs: freeze(members.map((item) => item.id).sort()),
      groundRefs: freeze([...independentGrounds].sort()),
      memberCount: members.length,
      signatureComplexity: signature.complexity,
      separateCost,
      modelCost,
      compressionGain,
      compressionRatio: modelCost / separateCost,
      basis: "functional_interpretive_signature_not_serialization_shape",
    }));
  }
  return freeze(out.sort((a, b) => b.compressionGain - a.compressionGain || b.memberCount - a.memberCount || a.signature.localeCompare(b.signature)));
}
