const freeze = (value) => Object.freeze(value);

const stableHash = (value) => {
  let h = 2166136261;
  for (const ch of String(value)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
};

const stableValue = (value) => {
  if (value === undefined) return "true";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableValue(value[key])}`).join(",")}}`;
};

function seedFrom(value) {
  const text = stableValue(value);
  let h = 2166136261;
  for (const ch of text) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 1;
}

function createSeededRng(seedValue) {
  let state = seedFrom(seedValue);
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x100000000;
  };
}

function shuffled(values, rng) {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function quantileAt(values, q) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(0, Math.min(1, q)) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.min(lo + 1, sorted.length - 1);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (rank - lo);
}

function empiricalNull({ observed, samples, quantile = 0.95, protocol }) {
  const threshold = quantileAt(samples, quantile);
  const exceed = samples.filter((sample) => sample >= observed).length;
  const pValue = (exceed + 1) / (samples.length + 1);
  return freeze({
    schema: "EONullResult@1",
    observed,
    threshold,
    quantile,
    pValue,
    passed: observed > threshold,
    protocol: freeze({ ...protocol }),
  });
}

function structuralEntities(entityFeatures) {
  const out = [];
  for (const [entityRef, features] of entityFeatures ?? []) {
    const attributes = [];
    for (const [signature, record] of features ?? []) {
      attributes.push(freeze({
        signature,
        featureKey: record.featureKey,
        featureValue: record.featureValue,
        count: record.evidenceIds?.size ?? 1,
        firstAt: record.firstAt,
        lastAt: record.lastAt,
      }));
    }
    if (attributes.length) out.push(freeze({ id: entityRef, attributes: freeze(attributes) }));
  }
  return out;
}

/**
 * EOReader5's successful entity-Kind machinery began one level before Kind:
 * discover which structural parameters recur across a population. In v7 a
 * parameter is the presence of a witnessed structural feature signature, not
 * a semantic class name supplied by the kernel.
 */
export function induceEntityParameters(entityFeatures, {
  minEntityCount,
  minPrevalence,
  permutations,
  quantile = 0.95,
  population = "entities:anonymous",
} = {}) {
  const entities = structuralEntities(entityFeatures);
  const n = entities.length;
  const resolvedMinEntityCount = minEntityCount ?? Math.max(3, Math.ceil(Math.sqrt(Math.max(1, n))));
  const resolvedMinPrevalence = minPrevalence ?? 1 / Math.max(2, Math.sqrt(Math.max(1, n)));
  const resolvedPermutations = permutations ?? Math.max(40, Math.round(n * 5));
  if (n < resolvedMinEntityCount) return freeze([]);

  const bySignature = new Map();
  for (const entity of entities) {
    for (const attr of entity.attributes) {
      if (!bySignature.has(attr.signature)) bySignature.set(attr.signature, { attr, members: new Set() });
      bySignature.get(attr.signature).members.add(entity.id);
    }
  }

  const entityIds = entities.map((entity) => entity.id);
  const out = [];
  for (const [signature, entry] of bySignature) {
    const memberCount = entry.members.size;
    const prevalence = memberCount / n;
    if (memberCount < 2 || prevalence < resolvedMinPrevalence) continue;

    const rng = createSeededRng({ population, signature, purpose: "parameter-prevalence-null" });
    const nullSamples = [];
    for (let i = 0; i < resolvedPermutations; i += 1) {
      const selected = shuffled(entityIds, rng).slice(0, memberCount);
      nullSamples.push(selected.filter((id) => entry.members.has(id)).length);
    }
    const nullResult = empiricalNull({
      observed: memberCount,
      samples: nullSamples,
      quantile,
      protocol: {
        name: "label-shuffle-structural-prevalence",
        iterations: resolvedPermutations,
        statistic: "entity-count-with-feature",
        scope: `${population} feature:${signature}`,
      },
    });
    if (!nullResult.passed) continue;

    out.push(freeze({
      schema: "EOParameterHypothesis@1",
      id: `parameter:${stableHash(`${population}|${signature}`)}`,
      signature,
      featureKey: entry.attr.featureKey,
      featureValue: entry.attr.featureValue,
      memberRefs: freeze([...entry.members].sort()),
      prevalence,
      memberCount,
      populationCount: n,
      nullComparison: nullResult,
      standing: "structural_parameter_hypothesis",
      witnessed: false,
      admissible: false,
      basis: "recurrent_structural_feature",
    }));
  }
  out.sort((a, b) => b.prevalence - a.prevalence || a.signature.localeCompare(b.signature));
  return freeze(out);
}

function profileFor(entity, parameterIndex) {
  const vector = new Uint8Array(parameterIndex.size);
  for (const attr of entity.attributes) {
    const idx = parameterIndex.get(attr.signature);
    if (idx !== undefined) vector[idx] = 1;
  }
  return vector;
}

export function profileJaccard(a, b) {
  if (a.length !== b.length) return 0;
  let intersection = 0;
  let union = 0;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] === 1 && b[i] === 1) intersection += 1;
    if (a[i] === 1 || b[i] === 1) union += 1;
  }
  return union === 0 ? 0 : intersection / union;
}

function pairKey(a, b) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function pairwiseSimilarities(profiles, entityIds) {
  const matrix = new Map();
  for (let i = 0; i < entityIds.length; i += 1) {
    for (let j = i + 1; j < entityIds.length; j += 1) {
      matrix.set(`${i}-${j}`, profileJaccard(profiles.get(entityIds[i]), profiles.get(entityIds[j])));
    }
  }
  return matrix;
}

function deriveCohesionThreshold(matrix) {
  const values = [...matrix.values()];
  if (!values.length) return 0.25;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clusterCohesion(cluster, matrix) {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < cluster.length; i += 1) {
    for (let j = i + 1; j < cluster.length; j += 1) {
      sum += matrix.get(pairKey(cluster[i], cluster[j])) ?? 0;
      count += 1;
    }
  }
  return count ? sum / count : 0;
}

function greedyClusters(entities, entityIds, profiles, matrix, threshold, minKindSize) {
  const activation = new Map(entities.map((entity) => [
    entity.id,
    entity.attributes.reduce((sum, attr) => sum + (attr.count ?? 1), 0),
  ]));
  const sortedIds = [...entityIds].sort((a, b) =>
    (activation.get(b) ?? 0) - (activation.get(a) ?? 0) || a.localeCompare(b));
  const sortedIndices = sortedIds.map((id) => entityIds.indexOf(id));
  const assigned = new Set();
  const clusters = [];

  for (const seed of sortedIndices) {
    if (assigned.has(seed)) continue;
    const cluster = [seed];
    assigned.add(seed);
    let changed = true;
    while (changed) {
      changed = false;
      let bestIdx = -1;
      let bestSimilarity = -1;
      for (let i = 0; i < entityIds.length; i += 1) {
        if (assigned.has(i)) continue;
        let sum = 0;
        for (const member of cluster) sum += matrix.get(pairKey(member, i)) ?? 0;
        const mean = cluster.length ? sum / cluster.length : 0;
        if (mean > bestSimilarity) {
          bestSimilarity = mean;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0 && bestSimilarity >= threshold) {
        cluster.push(bestIdx);
        assigned.add(bestIdx);
        changed = true;
      }
    }
    if (cluster.length >= minKindSize) clusters.push(cluster);
  }
  return clusters;
}

function standardParameters(memberIds, entitiesById, parameters, minPrevalence) {
  const out = [];
  for (const parameter of parameters) {
    let count = 0;
    for (const id of memberIds) {
      const entity = entitiesById.get(id);
      if (entity?.attributes.some((attr) => attr.signature === parameter.signature)) count += 1;
    }
    const prevalence = memberIds.length ? count / memberIds.length : 0;
    if (prevalence < minPrevalence) continue;
    const distinctiveness = parameter.prevalence > 0 ? prevalence / parameter.prevalence : 0;
    out.push(freeze({
      parameterRef: parameter.id,
      signature: parameter.signature,
      featureKey: parameter.featureKey,
      featureValue: parameter.featureValue,
      prevalence,
      populationPrevalence: parameter.prevalence,
      distinctiveness,
    }));
  }
  out.sort((a, b) => b.distinctiveness - a.distinctiveness || b.prevalence - a.prevalence || a.signature.localeCompare(b.signature));
  return freeze(out);
}

/**
 * Restore EOReader5's population-level Kind induction as a v7 hypothesis
 * generator. These candidates are deliberately not terrain facts: they name no
 * semantic class, are unwitnessed, and remain inadmissible until a downstream
 * consequence/DMD gate earns them.
 */
export function induceEntityKindCandidates(entityFeatures, {
  minEntityCount,
  minPrevalence,
  cohesionThreshold,
  minKindSize,
  permutations,
  quantile = 0.95,
  population = "entities:anonymous",
} = {}) {
  const entities = structuralEntities(entityFeatures);
  const n = entities.length;
  const resolvedMinEntityCount = minEntityCount ?? Math.max(3, Math.ceil(Math.sqrt(Math.max(1, n))));
  const resolvedMinPrevalence = minPrevalence ?? 1 / Math.max(2, Math.sqrt(Math.max(1, n)));
  const resolvedMinKindSize = minKindSize ?? Math.max(2, Math.floor(Math.sqrt(Math.max(1, n)) / 3));
  const resolvedPermutations = permutations ?? Math.max(40, Math.round(n * 5));
  if (n < resolvedMinEntityCount) return freeze({ candidates: freeze([]), parameters: freeze([]), diagnostics: freeze({ entities: n, parameters: 0, clusters: 0, validated: 0 }) });

  const parameters = induceEntityParameters(entityFeatures, {
    minEntityCount: resolvedMinEntityCount,
    minPrevalence: resolvedMinPrevalence,
    permutations: resolvedPermutations,
    quantile,
    population,
  });
  if (!parameters.length) return freeze({ candidates: freeze([]), parameters, diagnostics: freeze({ entities: n, parameters: 0, clusters: 0, validated: 0 }) });

  const parameterIndex = new Map(parameters.map((parameter, index) => [parameter.signature, index]));
  const profiles = new Map(entities.map((entity) => [entity.id, profileFor(entity, parameterIndex)]));
  const entityIds = entities.map((entity) => entity.id);
  const matrix = pairwiseSimilarities(profiles, entityIds);
  const threshold = cohesionThreshold ?? deriveCohesionThreshold(matrix);
  const clusters = greedyClusters(entities, entityIds, profiles, matrix, threshold, resolvedMinKindSize);
  const entitiesById = new Map(entities.map((entity) => [entity.id, entity]));
  const records = [];

  for (const cluster of clusters) {
    const memberIds = cluster.map((idx) => entityIds[idx]).sort();
    const observed = clusterCohesion(cluster, matrix);
    const rng = createSeededRng({ population, memberIds, purpose: "kind-cohesion-null" });
    const nullSamples = [];
    for (let i = 0; i < resolvedPermutations; i += 1) {
      const sampleIds = shuffled(entityIds, rng).slice(0, memberIds.length);
      const sampleIndices = sampleIds.map((id) => entityIds.indexOf(id));
      nullSamples.push(clusterCohesion(sampleIndices, matrix));
    }
    const cohesionNull = empiricalNull({
      observed,
      samples: nullSamples,
      quantile,
      protocol: {
        name: "random-partition-cohesion",
        iterations: resolvedPermutations,
        statistic: "mean-pairwise-jaccard",
        scope: `${population} members:${memberIds.length}`,
      },
    });
    const standards = standardParameters(memberIds, entitiesById, parameters, resolvedMinPrevalence);
    const evidenceRefs = [...new Set(memberIds.flatMap((id) =>
      [...(entityFeatures.get(id)?.values() ?? [])].flatMap((record) => [...(record.evidenceIds ?? [])])))].sort();
    const witnessRefs = [...new Set(memberIds.flatMap((id) =>
      [...(entityFeatures.get(id)?.values() ?? [])].flatMap((record) => [...(record.witnessRefs ?? [])])))].sort();
    const kindKey = `kind:population:${stableHash(`${population}|${memberIds.join("|")}|${standards.slice(0, 6).map((item) => item.signature).join("|")}`)}`;
    records.push(freeze({
      schema: "EOKindCandidate@1",
      id: `kind-candidate:${stableHash(`${kindKey}|${observed}`)}`,
      kindKey,
      standing: "structural_kind_hypothesis",
      witnessed: false,
      admissible: false,
      memberRefs: freeze(memberIds),
      memberCount: memberIds.length,
      standardParameters: standards,
      distinguishingParameters: freeze(standards.slice(0, 6)),
      cohesion: observed,
      cohesionThreshold: threshold,
      cohesionNull,
      evidenceRefs: freeze(evidenceRefs),
      witnessRefs: freeze(witnessRefs),
      basis: "entity_parameter_profile_cohesion",
      provenance: freeze({ giver: "kernel/entity-kind-induction", predecessor: "eoreader5/entity-kinds" }),
    }));
  }

  const validated = records.filter((candidate) => candidate.cohesionNull.passed)
    .sort((a, b) => b.cohesion - a.cohesion || b.memberCount - a.memberCount);
  const fallback = [...records].sort((a, b) => b.cohesion - a.cohesion || b.memberCount - a.memberCount)[0] ?? null;
  const candidates = validated.length
    ? validated
    : fallback
      ? [freeze({ ...fallback, fallbackNomination: true })]
      : [];

  return freeze({
    candidates: freeze(candidates),
    parameters,
    diagnostics: freeze({
      entities: n,
      parameters: parameters.length,
      clusters: records.length,
      validated: validated.length,
      cohesionThreshold: threshold,
      minKindSize: resolvedMinKindSize,
      fallbackUsed: validated.length === 0 && Boolean(fallback),
    }),
  });
}
