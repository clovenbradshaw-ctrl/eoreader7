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
        kind: "basin_changes_future_expectation",
        consequence: result.signature,
        effect: result.effect,
        pValue: result.pValue,
      })]),
    }),
    validation: freeze({
      method: "prospective_basin_ablation",
      formedAt: record.formedAt,
      admittedAt,
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
      counterfactual: "future consequence prediction with basin membership versus population baseline",
    }),
    basis: "stable_relational_affinity_basin_with_prospective_consequence",
  });
}

/**
 * A basin is not a Kind when it merely exists geometrically. This ledger makes
 * the distinction prospective: it remembers the first stable basin seen by the
 * recursive reader, then waits for new source experience. Only if later lawful
 * consequences differ for basin members versus the surrounding population is
 * the basin admitted. That is the EO phase transition: affinity nominates;
 * future consequence earns ontological standing.
 */
export function createKindBasinAdmissionLedger({
  minMembers = 3,
  minConsequenceSupport = 2,
  minEffect = 0.5,
  alpha = 0.05,
} = {}) {
  const options = freeze({ minMembers, minConsequenceSupport, minEffect, alpha });
  const tracked = new Map();
  const admitted = new Map();

  function observe(candidates = [], index, at = null) {
    const sequence = Number.isFinite(at)
      ? at
      : Math.max(0, ...[...(index?.latestAtByEntity?.values() ?? [])].filter(Number.isFinite));
    for (const candidate of candidates ?? []) {
      if (candidate?.schema !== "EOKindCandidate@1" || !candidate.kindKey) continue;
      if (candidate.fallbackNomination === true || candidate.field?.stable !== true) continue;
      if (tracked.has(candidate.kindKey) || admitted.has(candidate.kindKey)) continue;
      tracked.set(candidate.kindKey, freeze({
        kindKey: candidate.kindKey,
        candidateRef: candidate.id,
        formedAt: sequence,
        memberRefs: freeze([...(candidate.memberRefs ?? [])].sort()),
        structuralSignatures: new Set(candidate.structuralSignatures ?? []),
        evidenceRefs: freeze([...(candidate.evidenceRefs ?? [])]),
        field: candidate.field,
        options,
      }));
    }

    const newlyAdmitted = [];
    for (const [kindKey, record] of tracked) {
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
      trackedBasins: tracked.size,
      admittedBasins: admitted.size,
      tracked: freeze([...tracked.values()].map((record) => freeze({
        kindKey: record.kindKey,
        formedAt: record.formedAt,
        memberCount: record.memberRefs.length,
        bindingEnergy: record.field?.bindingEnergy ?? null,
      }))),
    });
  }

  return freeze({ observe, snapshot, diagnostics });
}
