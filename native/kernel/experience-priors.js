const freeze = (value) => Object.freeze(value);

const TERRAINS = Object.freeze(["Void", "Entity", "Kind", "Field", "Link", "Network", "Atmosphere", "Lens", "Paradigm"]);
const STANCES = Object.freeze(["Clearing", "Dissecting", "Unraveling", "Tending", "Binding", "Tracing", "Cultivating", "Making", "Composing"]);
const OPERATORS = Object.freeze(["NUL", "SIG", "INS", "SEG", "CON", "SYN", "DEF", "EVA", "REC"]);

const stable = (values = []) => freeze([...new Set(values.filter(Boolean))].sort());
const rate = (n, d) => d > 0 ? n / d : 0;

function sourceOf(item, index) {
  return item?.source
    ?? item?.reading?.turns?.[0]?.encounter?.source
    ?? item?.turns?.[0]?.encounter?.source
    ?? `prior-reading:${index}`;
}

function unwrap(item) {
  return item?.reading ?? item;
}

function networkSignature(network = {}) {
  const topology = network?.topology ?? {};
  return freeze({
    topology: topology.topology ?? "unknown",
    cycleRank: Number(topology.cycleRank ?? 0),
    branchingReferents: Number(topology.branchingReferents ?? 0),
    edgeCount: Number(topology.edgeCount ?? network?.edgeRefs?.length ?? 0),
    referentCount: Number(topology.referentCount ?? network?.referentRefs?.length ?? 0),
  });
}

export function experienceNetworkSignatureKey(network = {}) {
  const s = network?.topology && network?.cycleRank === undefined ? networkSignature(network) : network;
  return `${s.topology ?? "unknown"}|b1:${Number(s.cycleRank ?? 0)}|branch:${Number(s.branchingReferents ?? 0)}|e:${Number(s.edgeCount ?? 0)}|r:${Number(s.referentCount ?? 0)}`;
}

function countWorks(map, key, work) {
  if (!map.has(key)) map.set(key, { occurrences: 0, works: new Set() });
  const record = map.get(key);
  record.occurrences += 1;
  record.works.add(work);
  return record;
}

function normalizeReadings(items = []) {
  return items.map((item, index) => ({ source: sourceOf(item, index), reading: unwrap(item) })).filter((item) => item.reading?.fold);
}

/**
 * Learn a reader's portable experience prior from earlier, fully separate
 * readings. Nothing from the target source is accepted here.
 *
 * The prior stores recurrence across WORKS rather than recurrence inside one
 * work. This prevents a single idiosyncratic book from masquerading as a
 * reader-wide expectation. It is descriptive memory, never witness for the
 * next source.
 */
export function deriveExperiencePrior(items = [], {
  id = "experience-prior",
  giver,
  minRelationWorkSupport = 2,
  minNetworkWorkSupport = 2,
  maxRelationVocabulary = 512,
} = {}) {
  if (!giver) throw new TypeError("deriveExperiencePrior requires a named giver");
  if (!Number.isInteger(minRelationWorkSupport) || minRelationWorkSupport < 1) throw new TypeError("minRelationWorkSupport must be a positive integer");
  if (!Number.isInteger(minNetworkWorkSupport) || minNetworkWorkSupport < 1) throw new TypeError("minNetworkWorkSupport must be a positive integer");

  const readings = normalizeReadings(items);
  if (!readings.length) throw new TypeError("deriveExperiencePrior requires at least one completed reading");
  const relationStats = new Map();
  const networkStats = new Map();
  const terrainWorks = new Map(TERRAINS.map((terrain) => [terrain, new Set()]));
  const stanceStats = new Map(STANCES.map((stance) => [stance, { occurrences: 0, works: new Set() }]));
  const operatorStats = new Map(OPERATORS.map((op) => [op, { occurrences: 0, works: new Set() }]));

  for (const { source, reading } of readings) {
    const entries = reading.fold?.graphEntries ?? [];
    for (const edge of entries) {
      if (edge?.schema !== "EOHyperedge@1" || !edge.relation) continue;
      // Only carry forward relation forms that the previous reading itself
      // regarded as lexically eligible. Auxiliaries/noise do not become
      // cross-book familiarity merely because they appeared often.
      if (edge.meta?.compositionStanding?.eligible === false) continue;
      countWorks(relationStats, edge.relation, source);
    }

    // Network/Field/Atmosphere/Paradigm are often emergent projections rather
    // than direct graph entries. Learn from the reader's effective present
    // terrain, not merely the direct terrain index, or prior experience would
    // systematically forget exactly the higher-order forms it had earned.
    const terrains = reading.effectiveTerrainState ?? reading.terrainState ?? {};
    for (const terrain of TERRAINS) if ((terrains[terrain] ?? []).length > 0) terrainWorks.get(terrain).add(source);
    for (const network of terrains.Network ?? []) {
      const signature = networkSignature(network);
      const key = experienceNetworkSignatureKey(signature);
      if (!networkStats.has(key)) networkStats.set(key, { signature, occurrences: 0, works: new Set() });
      const record = networkStats.get(key);
      record.occurrences += 1;
      record.works.add(source);
    }

    for (const operation of reading.fold?.transformationObjects ?? []) {
      if (operatorStats.has(operation?.operator)) {
        const record = operatorStats.get(operation.operator);
        record.occurrences += 1;
        record.works.add(source);
      }
      if (stanceStats.has(operation?.stance)) {
        const record = stanceStats.get(operation.stance);
        record.occurrences += 1;
        record.works.add(source);
      }
    }
  }

  const workCount = readings.length;
  const relationVocabulary = [...relationStats.entries()]
    .map(([relation, record]) => freeze({
      relation,
      occurrences: record.occurrences,
      workSupport: record.works.size,
      workRate: rate(record.works.size, workCount),
      sourceRefs: stable(record.works),
    }))
    .filter((record) => record.workSupport >= minRelationWorkSupport)
    .sort((a, b) => b.workSupport - a.workSupport || b.occurrences - a.occurrences || a.relation.localeCompare(b.relation))
    .slice(0, maxRelationVocabulary);

  const networkPatterns = [...networkStats.entries()]
    .map(([key, record]) => freeze({
      key,
      signature: record.signature,
      occurrences: record.occurrences,
      workSupport: record.works.size,
      workRate: rate(record.works.size, workCount),
      sourceRefs: stable(record.works),
    }))
    .filter((record) => record.workSupport >= minNetworkWorkSupport)
    .sort((a, b) => b.workSupport - a.workSupport || b.occurrences - a.occurrences || a.key.localeCompare(b.key));

  const terrainExpectations = TERRAINS.map((terrain) => freeze({
    terrain,
    workSupport: terrainWorks.get(terrain).size,
    workRate: rate(terrainWorks.get(terrain).size, workCount),
  }));
  const stanceExpectations = STANCES.map((stance) => {
    const record = stanceStats.get(stance);
    return freeze({ stance, occurrences: record.occurrences, workSupport: record.works.size, workRate: rate(record.works.size, workCount) });
  });
  const operatorExpectations = OPERATORS.map((operator) => {
    const record = operatorStats.get(operator);
    return freeze({ operator, occurrences: record.occurrences, workSupport: record.works.size, workRate: rate(record.works.size, workCount) });
  });

  return freeze({
    schema: "EOExperiencePrior@1",
    id,
    giver,
    standing: "defeasible_experience_prior",
    witnessed: false,
    admissible: false,
    sourceCount: workCount,
    sourceRefs: stable(readings.map((item) => item.source)),
    relationVocabulary: freeze(relationVocabulary),
    networkPatterns: freeze(networkPatterns),
    terrainExpectations: freeze(terrainExpectations),
    stanceExpectations: freeze(stanceExpectations),
    operatorExpectations: freeze(operatorExpectations),
    provenance: freeze({
      giver,
      basis: "completed_prior_readings",
      targetExcluded: true,
      relationRule: `relation must recur in >=${minRelationWorkSupport} independent prior works`,
      networkRule: `network signature must recur in >=${minNetworkWorkSupport} independent prior works`,
    }),
  });
}

export function experienceRelationVocabulary(priors = []) {
  const out = new Map();
  for (const prior of priors ?? []) {
    if (prior?.schema !== "EOExperiencePrior@1") continue;
    for (const record of prior.relationVocabulary ?? []) {
      if (!record?.relation) continue;
      if (!out.has(record.relation)) out.set(record.relation, { relation: record.relation, priorRefs: [], workSupport: 0, occurrences: 0 });
      const aggregate = out.get(record.relation);
      aggregate.priorRefs.push(prior.id);
      aggregate.workSupport = Math.max(aggregate.workSupport, record.workSupport ?? 0);
      aggregate.occurrences += record.occurrences ?? 0;
    }
  }
  return freeze([...out.values()].map((record) => freeze({ ...record, priorRefs: stable(record.priorRefs) })));
}

/** Compare a current earned Network against remembered cross-work forms. */
export function evaluateNetworkAgainstExperience(network, priors = []) {
  const signature = networkSignature(network);
  const key = experienceNetworkSignatureKey(signature);
  const matches = [];
  for (const prior of priors ?? []) {
    if (prior?.schema !== "EOExperiencePrior@1") continue;
    const pattern = (prior.networkPatterns ?? []).find((item) => item.key === key);
    if (pattern) matches.push(freeze({ priorRef: prior.id, workSupport: pattern.workSupport, workRate: pattern.workRate, occurrences: pattern.occurrences }));
  }
  return freeze({
    schema: "EOExperiencePriorEvaluation@1",
    target: network?.id ?? null,
    kind: "network_signature",
    signature,
    key,
    expected: matches.length > 0,
    matches: freeze(matches),
    standing: matches.length ? "prior_supported" : "prior_strained_by_novel_form",
    witnessed: false,
  });
}
