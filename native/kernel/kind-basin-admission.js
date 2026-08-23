const freeze = (value) => Object.freeze(value);

function logChoose(n, k) {
  if (!Number.isInteger(n) || !Number.isInteger(k) || k < 0 || k > n) return -Infinity;
  const m = Math.min(k, n - k);
  let out = 0;
  for (let i = 1; i <= m; i += 1) out += Math.log(n - m + i) - Math.log(i);
  return out;
}

function hypergeometricProbability(N, K, n, k) {
  if (k < 0 || k > K || k > n || n - k > N - K) return 0;
  return Math.exp(logChoose(K, k) + logChoose(N - K, n - k) - logChoose(N, n));
}

function hypergeometricUpperTail(N, K, n, k) {
  const max = Math.min(K, n);
  let p = 0;
  for (let x = k; x <= max; x += 1) p += hypergeometricProbability(N, K, n, x);
  return Math.min(1, p);
}

function featureRecord(index, entityRef, signature) {
  return index?.entityFeatures?.get(entityRef)?.get(signature) ?? null;
}

function latestAt(index, entityRef) {
  return index?.latestAtByEntity?.get(entityRef) ?? -Infinity;
}

function evidenceRefsFor(index, entityRefs, signatures) {
  const out = new Set();
  for (const entityRef of entityRefs) {
    for (const signature of signatures) {
      for (const id of featureRecord(index, entityRef, signature)?.evidenceIds ?? []) out.add(id);
    }
  }
  return [...out].sort();
}

function witnessRefsFor(index, evidenceRefs) {
  const refs = new Set();
  for (const id of evidenceRefs) {
    const evidence = index?.evidenceById?.get(id);
    if (evidence?.witness) refs.add(evidence.witness);
    for (const ref of evidence?.witnessRefs ?? []) if (ref) refs.add(ref);
  }
  return [...refs].sort();
}

function modalitiesFor(index, evidenceRefs) {
  const out = new Set();
  for (const id of evidenceRefs) {
    const modality = index?.evidenceById?.get(id)?.provenance?.modality;
    if (modality) out.add(modality);
  }
  return [...out].sort();
}

function consequenceDescriptor(index, entityRef, signature) {
  const record = featureRecord(index, entityRef, signature);
  return record ? freeze({ key: record.featureKey, value: record.featureValue, signature }) : null;
}

function candidateFutureConsequences(index, record) {
  const signatures = new Set();
  for (const entityRef of record.memberRefs) {
    for (const [signature, feature] of index?.entityFeatures?.get(entityRef) ?? []) {
      if (record.structuralSignatures.has(signature)) continue;
      if (feature.firstAt > record.formedAt) signatures.add(signature);
    }
  }
  return signatures;
}

function evaluateCandidate(index, record, options) {
  const members = new Set(record.memberRefs);
  const population = [...(index?.entityFeatures?.keys() ?? [])];
  const nonmembers = population.filter((entityRef) => !members.has(entityRef));
  if (members.size < options.minMembers || nonmembers.length < 1) return null;

  let best = null;
  for (const signature of candidateFutureConsequences(index, record)) {
    const evaluableMembers = [...members].filter((entityRef) => latestAt(index, entityRef) > record.formedAt);
    const evaluableNonmembers = nonmembers.filter((entityRef) => latestAt(index, entityRef) > record.formedAt);
    if (evaluableMembers.length < options.minMembers || evaluableNonmembers.length < 1) continue;

    const supportingMembers = evaluableMembers.filter((entityRef) => {
      const feature = featureRecord(index, entityRef, signature);
      return feature && feature.firstAt > record.formedAt;
    });
    const supportingNonmembers = evaluableNonmembers.filter((entityRef) => {
      const feature = featureRecord(index, entityRef, signature);
      return feature && feature.firstAt > record.formedAt;
    });
    if (supportingMembers.length < options.minConsequenceSupport) continue;

    const memberRate = supportingMembers.length / evaluableMembers.length;
    const nonmemberRate = supportingNonmembers.length / evaluableNonmembers.length;
    const effect = memberRate - nonmemberRate;
    if (effect < options.minEffect) continue;

    const N = evaluableMembers.length + evaluableNonmembers.length;
    const K = supportingMembers.length + supportingNonmembers.length;
    const n = evaluableMembers.length;
    const k = supportingMembers.length;
    const pValue = hypergeometricUpperTail(N, K, n, k);
    if (pValue > options.alpha) continue;

    const result = {
      signature,
      evaluableMembers,
      evaluableNonmembers,
      supportingMembers,
      supportingNonmembers,
      memberRate,
      nonmemberRate,
      effect,
      pValue,
    };
    if (!best || result.pValue < best.pValue || (result.pValue === best.pValue && result.effect > best.effect)) best = result;
  }
  return best;
}

function retentionFraction(baselineMembers = [], currentMembers = []) {
  if (!baselineMembers.length) return 0;
  const current = new Set(currentMembers);
  let retained = 0;
  for (const member of baselineMembers) if (current.has(member)) retained += 1;
  return retained / baselineMembers.length;
}

function trackedRecord(candidate, sequence, options, { sightings = 1 } = {}) {
  return freeze({
    kindKey: candidate.kindKey,
    candidateRef: candidate.id,
    formedAt: sequence,
    lastSeenAt: sequence,
    stableSightings: sightings,
    memberRefs: freeze([...(candidate.memberRefs ?? [])].sort()),
    latestMemberRefs: freeze([...(candidate.memberRefs ?? [])].sort()),
    structuralSignatures: new Set(candidate.structuralSignatures ?? []),
    evidenceRefs: freeze([...(candidate.evidenceRefs ?? [])]),
    field: candidate.field,
    latestField: candidate.field,
    minimumRetention: 1,
    options,
  });
}

function updateTrackedRecord(record, candidate, sequence, options) {
  const currentMembers = [...(candidate.memberRefs ?? [])].sort();
  const retention = retentionFraction(record.memberRefs, currentMembers);
  if (retention < options.minMembershipRetention) {
    // The old basin dissolved. This is a new formation even if the structural
    // signature hashes to the same Kind key. Reset the causal horizon so no
    // consequence observed after the old basin can leak into the new one.
    return trackedRecord(candidate, sequence, options);
  }
  const newSighting = sequence > record.lastSeenAt ? 1 : 0;
  return freeze({
    ...record,
    candidateRef: candidate.id,
    lastSeenAt: Math.max(record.lastSeenAt, sequence),
    stableSightings: record.stableSightings + newSighting,
    latestMemberRefs: freeze(currentMembers),
    latestField: candidate.field,
    minimumRetention: Math.min(record.minimumRetention, retention),
  });
}

function admittedProjection(index, record, result, admittedAt) {
  const structuralSignatures = [...record.structuralSignatures].sort();
  const consequence = consequenceDescriptor(index, result.supportingMembers[0], result.signature);
  const evidenceRefs = [...new Set([
    ...record.evidenceRefs,
    ...evidenceRefsFor(index, result.supportingMembers, [result.signature]),
  ])].sort();
  const witnessRefs = witnessRefsFor(index, evidenceRefs);
  const modalities = modalitiesFor(index, evidenceRefs);
  return freeze({
    schema: "EOKindProjection@1",
    id: `terrain:kind:earned:${record.kindKey}`,
    terrain: "Kind",
    kindKey: record.kindKey,
    standing: "earned_invariant",
    witnessed: false,
    mechanism: "interaction_affinity_basin",
    memberRefs: freeze([...record.memberRefs].sort()),
    structuralSignatures: freeze(structuralSignatures),
    consequence,
    evidenceRefs: freeze(evidenceRefs),
    witnessRefs: freeze(witnessRefs),
    modalities: freeze(modalities),
    field: record.field,
    materiality: freeze({
      makesDifference: true,
      reasons: freeze([freeze({
        kind: "metastable_basin_changes_future_expectation",
        consequence: result.signature,
        effect: result.effect,
        pValue: result.pValue,
      })]),
    }),
    validation: freeze({
      method: "prospective_metastable_basin_ablation",
      formedAt: record.formedAt,
      lastSeenAt: record.lastSeenAt,
      admittedAt,
      stableSightings: record.stableSightings,
      requiredStableSightings: record.options.minStableSightings,
      minimumMembershipRetention: record.minimumRetention,
      requiredMembershipRetention: record.options.minMembershipRetention,
      memberCount: record.memberRefs.length,
      evaluableMemberCount: result.evaluableMembers.length,
      evaluableNonMemberCount: result.evaluableNonmembers.length,
      supportingMemberCount: result.supportingMembers.length,
      supportingNonMemberCount: result.supportingNonmembers.length,
      memberRate: result.memberRate,
      nonMemberRate: result.nonmemberRate,
      effect: result.effect,
      pValue: result.pValue,
      alpha: record.options.alpha,
      counterfactual: "future consequence prediction with metastable basin membership versus population baseline",
    }),
    basis: "metastable_relational_affinity_basin_with_prospective_consequence",
  });
}

/**
 * A basin is not a Kind when it merely exists geometrically. It must survive
 * perturbation through at least two recursive observations while retaining its
 * original core, then make a prospective difference to later consequences.
 *
 * This gives Kind real hysteresis: affinity nominates a phase; persistence
 * establishes metastability; future consequence earns ontological standing.
 * If the core dissolves, the formation horizon resets rather than allowing old
 * evidence to justify a newly formed population.
 */
export function createKindBasinAdmissionLedger({
  minMembers = 3,
  minConsequenceSupport = 2,
  minEffect = 0.5,
  alpha = 0.05,
  minStableSightings = 2,
  minMembershipRetention = 0.75,
} = {}) {
  if (!Number.isInteger(minStableSightings) || minStableSightings < 1) throw new TypeError("minStableSightings must be a positive integer");
  if (!(minMembershipRetention > 0 && minMembershipRetention <= 1)) throw new TypeError("minMembershipRetention must be in (0,1]");
  const options = freeze({ minMembers, minConsequenceSupport, minEffect, alpha, minStableSightings, minMembershipRetention });
  const tracked = new Map();
  const admitted = new Map();

  function observe(candidates = [], index, at = null) {
    const sequence = Number.isFinite(at)
      ? at
      : Math.max(0, ...[...(index?.latestAtByEntity?.values() ?? [])].filter(Number.isFinite));
    const seenThisTurn = new Set();

    for (const candidate of candidates ?? []) {
      if (candidate?.schema !== "EOKindCandidate@1" || !candidate.kindKey) continue;
      if (candidate.fallbackNomination === true || candidate.field?.stable !== true) continue;
      if (admitted.has(candidate.kindKey)) continue;
      seenThisTurn.add(candidate.kindKey);
      const prior = tracked.get(candidate.kindKey);
      tracked.set(candidate.kindKey, prior
        ? updateTrackedRecord(prior, candidate, sequence, options)
        : trackedRecord(candidate, sequence, options));
    }

    const newlyAdmitted = [];
    for (const [kindKey, record] of tracked) {
      if (!seenThisTurn.has(kindKey)) continue;
      if (record.stableSightings < options.minStableSightings) continue;
      if (sequence <= record.formedAt) continue;
      const result = evaluateCandidate(index, record, options);
      if (!result) continue;
      const projection = admittedProjection(index, record, result, sequence);
      admitted.set(kindKey, projection);
      tracked.delete(kindKey);
      newlyAdmitted.push(projection);
    }
    return freeze(newlyAdmitted);
  }

  function snapshot() {
    return freeze([...admitted.values()].sort((a, b) => a.kindKey.localeCompare(b.kindKey)));
  }

  function diagnostics() {
    return freeze({
      mechanism: "interaction_affinity_basin",
      stabilityModel: "metastable_hysteresis",
      minStableSightings: options.minStableSightings,
      minMembershipRetention: options.minMembershipRetention,
      trackedBasins: tracked.size,
      admittedBasins: admitted.size,
      tracked: freeze([...tracked.values()].map((record) => freeze({
        kindKey: record.kindKey,
        formedAt: record.formedAt,
        lastSeenAt: record.lastSeenAt,
        stableSightings: record.stableSightings,
        memberCount: record.memberRefs.length,
        memberRefs: record.memberRefs,
        latestMemberRefs: record.latestMemberRefs,
        minimumRetention: record.minimumRetention,
        bindingEnergy: record.field?.bindingEnergy ?? null,
        latestBindingEnergy: record.latestField?.bindingEnergy ?? null,
      }))),
      admitted: freeze([...admitted.values()].map((projection) => freeze({
        kindKey: projection.kindKey,
        memberCount: projection.memberRefs?.length ?? 0,
        memberRefs: projection.memberRefs ?? freeze([]),
        structuralSignatures: projection.structuralSignatures ?? freeze([]),
        bindingEnergy: projection.field?.bindingEnergy ?? null,
        consequence: projection.consequence ?? null,
        formedAt: projection.validation?.formedAt ?? null,
        admittedAt: projection.validation?.admittedAt ?? null,
        stableSightings: projection.validation?.stableSightings ?? null,
        minimumMembershipRetention: projection.validation?.minimumMembershipRetention ?? null,
        effect: projection.validation?.effect ?? null,
        pValue: projection.validation?.pValue ?? null,
      }))),
    });
  }

  return freeze({ observe, snapshot, diagnostics });
}
