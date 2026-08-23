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

/**
 * Structure/Ground is treated as a field over the local encounter carrier.
 * Links contribute incidences at occupied sites. Repeated incidence at a site
 * creates coupling potential; heterogeneous relation types contribute field
 * entropy. No semantic class or lexical similarity is involved.
 */
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

/**
 * Structure/Pattern is topology over the bipartite incidence graph of earned
 * referents and witnessed Links. A Network is a connected component, not one
 * projection per high-degree referent. The first Betti number (cycle rank)
 * distinguishes trees/stars from genuinely cyclic relational structure.
 */
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

function obligationRefs(obligation) {
  return new Set([...(obligation?.grounds ?? []), ...(obligation?.alternatives ?? [])].filter(Boolean).map(String));
}

function consequenceKinds(obligation) {
  return (obligation?.consequences ?? []).map((item) => item?.kind).filter(Boolean);
}

function persistenceOf(obligation, sequence) {
  const stored = Math.max(0, Number(obligation?.persistence ?? 0));
  if (!Number.isFinite(sequence) || !Number.isFinite(obligation?.openedAt)) return stored;
  return Math.max(stored, sequence - obligation.openedAt + 1, 0);
}

/**
 * Interpretation/Ground is modeled as a potential field of unresolved material
 * constraints. Each obligation has local potential proportional to persistence
 * and consequence reach. Shared grounds/alternatives couple obligations, so a
 * mutually reinforcing unresolved region has more energy than an equal number
 * of independent questions. Entropy reports heterogeneity of consequence type.
 */
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
    potentials.push(freeze({
      obligation: obligation.id,
      persistence,
      consequenceReach,
      alternativeCount,
      potential: localPotential,
    }));
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

function distinctionShapeTokens(distinction) {
  if (!distinction || typeof distinction !== "object") return [];
  const tokens = [];
  for (const key of Object.keys(distinction).sort()) {
    if (key === "materiality") continue;
    tokens.push(`distinction:${key}`);
  }
  for (const reason of distinction?.materiality?.reasons ?? []) {
    if (reason?.kind) tokens.push(`materiality:${reason.kind}`);
  }
  return tokens;
}

export function interpretiveSignature(obligation) {
  const tokens = unique([
    ...consequenceKinds(obligation).map((kind) => `consequence:${kind}`),
    ...distinctionShapeTokens(obligation?.distinction),
  ]).sort();
  return freeze({
    key: tokens.join("|"),
    tokens: freeze(tokens),
    complexity: tokens.length,
  });
}

/**
 * Interpretation/Pattern uses a minimum-description-length test. A repeated
 * interpretive form becomes paradigm-like only when representing the common
 * model once plus pointers to independently grounded instances is cheaper than
 * representing every Lens independently. This replaces id-prefix/string
 * recurrence with structural explanatory compression.
 */
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
    const modelCost = signature.complexity + members.length;
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
    }));
  }
  return freeze(out.sort((a, b) => b.compressionGain - a.compressionGain || b.memberCount - a.memberCount || a.signature.localeCompare(b.signature)));
}
