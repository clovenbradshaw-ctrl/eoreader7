import { prospectiveBehavioralEquivalence } from "./kind-behavior.js";

const freeze = (value) => Object.freeze(value);

function retentionFraction(baselineMembers = [], currentMembers = []) {
  if (!baselineMembers.length) return 0;
  const current = new Set(currentMembers);
  let retained = 0;
  for (const member of baselineMembers) if (current.has(member)) retained += 1;
  return retained / baselineMembers.length;
}

function trackedRecord(candidate, sequence, options) {
  return freeze({
    kindKey: candidate.kindKey,
    candidateRef: candidate.id,
    formedAt: sequence,
    lastSeenAt: sequence,
    stableSightings: 1,
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
  if (retention < options.minMembershipRetention) return trackedRecord(candidate, sequence, options);
  return freeze({
    ...record,
    candidateRef: candidate.id,
    lastSeenAt: Math.max(record.lastSeenAt, sequence),
    stableSightings: record.stableSightings + (sequence > record.lastSeenAt ? 1 : 0),
    latestMemberRefs: freeze(currentMembers),
    latestField: candidate.field,
    minimumRetention: Math.min(record.minimumRetention, retention),
  });
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
  const modalities = new Set();
  for (const id of evidenceRefs) {
    const modality = index?.evidenceById?.get(id)?.provenance?.modality;
    if (modality) modalities.add(modality);
  }
  return [...modalities].sort();
}

function futureEvidenceRefs(index, validation, formedAt) {
  const out = new Set();
  const refs = [...(validation?.memberRefs ?? []), ...(validation?.nonmemberRefs ?? [])];
  for (const entityRef of refs) {
    for (const [, record] of index?.entityFeatures?.get(entityRef) ?? []) {
      if (record?.featureKey !== validation.responseChannel || !(record.firstAt > formedAt)) continue;
      for (const id of record.evidenceIds ?? []) out.add(id);
    }
  }
  return [...out].sort();
}

function decodeOutcome(value) {
  try { return JSON.parse(value); } catch { return value; }
}

function admittedProjection(index, record, validation, admittedAt) {
  const evidenceRefs = [...new Set([...record.evidenceRefs, ...futureEvidenceRefs(index, validation, record.formedAt)])].sort();
  const witnessRefs = witnessRefsFor(index, evidenceRefs);
  const modalities = modalitiesFor(index, evidenceRefs);
  const dominant = validation.dominantOutcome;
  return freeze({
    schema: "EOKindProjection@1",
    id: `terrain:kind:earned:${record.kindKey}`,
    terrain: "Kind",
    kindKey: record.kindKey,
    standing: "earned_invariant",
    witnessed: false,
    mechanism: "behavioral_equivalence_of_metastable_basin",
    memberRefs: freeze([...record.memberRefs].sort()),
    structuralSignatures: freeze([...record.structuralSignatures].sort()),
    consequence: dominant ? freeze({ key: validation.responseChannel, value: decodeOutcome(dominant.outcome), effect: dominant.effect }) : null,
    evidenceRefs: freeze(evidenceRefs),
    witnessRefs: freeze(witnessRefs),
    modalities: freeze(modalities),
    field: record.field,
    behavior: validation,
    materiality: freeze({
      makesDifference: true,
      reasons: freeze([freeze({
        kind: "metastable_population_has_distinct_lawful_future",
        responseChannel: validation.responseChannel,
        behavioralDivergence: validation.behavioralDivergence,
        totalVariation: validation.totalVariation,
        pValue: validation.pValue,
      })]),
    }),
    validation: freeze({
      ...validation,
      method: "prospective_approximate_bisimulation_after_metastability",
      formedAt: record.formedAt,
      lastSeenAt: record.lastSeenAt,
      admittedAt,
      stableSightings: record.stableSightings,
      requiredStableSightings: record.options.minStableSightings,
      minimumMembershipRetention: record.minimumRetention,
      requiredMembershipRetention: record.options.minMembershipRetention,
      memberCount: record.memberRefs.length,
      evaluableMemberCount: validation.memberRefs?.length ?? 0,
      evaluableNonMemberCount: validation.nonmemberRefs?.length ?? 0,
      supportingMemberCount: validation.supportingMemberRefs?.length ?? 0,
      supportingNonMemberCount: validation.supportingNonmemberRefs?.length ?? 0,
      memberRate: dominant?.memberRate ?? null,
      nonMemberRate: dominant?.nonmemberRate ?? null,
      effect: dominant?.effect ?? null,
      counterfactual: "future response law conditioned on metastable basin membership versus exchangeable population labels",
    }),
    basis: "metastable_candidate_basin_admitted_by_prospective_behavioral_equivalence",
  });
}

/**
 * Kind admission is behavioral, not taxonomic.
 *
 * Interaction affinity may nominate a basin. Hysteresis establishes that the
 * basin is a metastable macrostate. Only later observations can admit Kind:
 * members must exhibit a coherent future response law that differs from the
 * surrounding population under an exchangeability null. This is a finite-data
 * approximation to causal-state equivalence / probabilistic bisimulation.
 */
export function createKindBehaviorAdmissionLedger({
  minMembers = 3,
  minConsequenceSupport = 2,
  minEffect = 0.5,
  alpha = 0.05,
  minStableSightings = 2,
  minMembershipRetention = 0.75,
  minBehavioralDivergence = 0.05,
  maxWithinDivergence = 0.5,
  behaviorPermutations = 63,
} = {}) {
  const options = freeze({ minMembers, minConsequenceSupport, minEffect, alpha, minStableSightings, minMembershipRetention, minBehavioralDivergence, maxWithinDivergence, behaviorPermutations });
  const tracked = new Map();
  const admitted = new Map();

  function observe(candidates = [], index, at = null) {
    const sequence = Number.isFinite(at) ? at : Math.max(0, ...[...(index?.latestAtByEntity?.values() ?? [])].filter(Number.isFinite));
    const seen = new Set();
    for (const candidate of candidates ?? []) {
      if (candidate?.schema !== "EOKindCandidate@1" || !candidate.kindKey) continue;
      if (candidate.fallbackNomination === true || candidate.field?.stable !== true || admitted.has(candidate.kindKey)) continue;
      seen.add(candidate.kindKey);
      const prior = tracked.get(candidate.kindKey);
      tracked.set(candidate.kindKey, prior ? updateTrackedRecord(prior, candidate, sequence, options) : trackedRecord(candidate, sequence, options));
    }

    const newlyAdmitted = [];
    for (const [kindKey, record] of tracked) {
      if (!seen.has(kindKey) || record.stableSightings < options.minStableSightings || sequence <= record.formedAt) continue;
      const validation = prospectiveBehavioralEquivalence(index, record, {
        minMembers: options.minMembers,
        minConsequenceSupport: options.minConsequenceSupport,
        minBehavioralDivergence: options.minBehavioralDivergence,
        maxWithinDivergence: options.maxWithinDivergence,
        minEffect: options.minEffect,
        alpha: options.alpha,
        permutations: options.behaviorPermutations,
      });
      if (!validation) continue;
      const projection = admittedProjection(index, record, validation, sequence);
      admitted.set(kindKey, projection);
      tracked.delete(kindKey);
      newlyAdmitted.push(projection);
    }
    return freeze(newlyAdmitted);
  }

  const snapshot = () => freeze([...admitted.values()].sort((a, b) => a.kindKey.localeCompare(b.kindKey)));
  const diagnostics = () => freeze({
    mechanism: "behavioral_equivalence_of_metastable_basin",
    candidateMechanism: "interaction_affinity_basin",
    stabilityModel: "metastable_hysteresis",
    admissionModel: "prospective_approximate_bisimulation",
    minStableSightings: options.minStableSightings,
    minMembershipRetention: options.minMembershipRetention,
    trackedBasins: tracked.size,
    admittedBasins: admitted.size,
    tracked: freeze([...tracked.values()].map((record) => freeze({ kindKey: record.kindKey, formedAt: record.formedAt, lastSeenAt: record.lastSeenAt, stableSightings: record.stableSightings, memberCount: record.memberRefs.length, memberRefs: record.memberRefs, minimumRetention: record.minimumRetention }))),
    admitted: freeze([...admitted.values()].map((projection) => freeze({ kindKey: projection.kindKey, memberRefs: projection.memberRefs, responseChannel: projection.validation?.responseChannel ?? null, behavioralDivergence: projection.validation?.behavioralDivergence ?? null, totalVariation: projection.validation?.totalVariation ?? null, pValue: projection.validation?.pValue ?? null }))),
  });
  return freeze({ observe, snapshot, diagnostics });
}
