const freeze = (value) => Object.freeze(value);

function stableValue(value) {
  if (value === undefined) return "true";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableValue(value[key])}`).join(",")}}`;
}

export function kindFeatureSignature(featureKey, featureValue) {
  return featureKey ? `${featureKey}=${stableValue(featureValue)}` : null;
}

export function kindPrior({
  id,
  kindKey,
  label = null,
  features = [],
  memberCount = 0,
  populationCount = 0,
  provenance = {},
  declaredParams = {},
} = {}) {
  if (!id || !kindKey) throw new TypeError("kindPrior requires id and kindKey");
  if (!provenance?.giver) throw new TypeError("kindPrior requires a named provenance.giver");
  return freeze({
    schema: "EOKindPrior@1",
    id,
    kindKey,
    label,
    standing: "corpus_derived_prior",
    witnessed: false,
    memberCount,
    populationCount,
    features: freeze(features.map((feature) => freeze({ ...feature }))),
    provenance: freeze({ ...provenance }),
    declaredParams: freeze({ ...declaredParams }),
  });
}

/**
 * Derive defeasible Kind priors from a corpus that has already been read.
 * Explicit classifications supply the corpus labels; structural features
 * supply the modality-independent predictors. The resulting artifact is
 * knowledge ABOUT the corpus. It is never witness for a later source.
 */
export function deriveKindPriors(entries = [], {
  giver,
  corpus = null,
  minMembers = 2,
  minFeatureSupport = 2,
  minLift = 1.5,
  smoothing = 0.5,
} = {}) {
  if (!giver) throw new TypeError("deriveKindPriors requires a named giver");
  if (!Number.isInteger(minMembers) || minMembers < 1) throw new TypeError("minMembers must be a positive integer");
  if (!Number.isInteger(minFeatureSupport) || minFeatureSupport < 1) throw new TypeError("minFeatureSupport must be a positive integer");
  if (!(minLift > 1)) throw new TypeError("minLift must be > 1");
  if (!(smoothing > 0)) throw new TypeError("smoothing must be > 0");

  const labelsByKind = new Map();
  const membersByKind = new Map();
  const featuresByEntity = new Map();

  for (const entry of entries ?? []) {
    if (entry?.schema !== "EOKindEvidence@1" || !entry.entityRef) continue;
    if (entry.evidenceType === "explicit_classification" && entry.kindKey) {
      if (!membersByKind.has(entry.kindKey)) membersByKind.set(entry.kindKey, new Set());
      membersByKind.get(entry.kindKey).add(entry.entityRef);
      if (entry.kindSurface && !labelsByKind.has(entry.kindKey)) labelsByKind.set(entry.kindKey, entry.kindSurface);
      continue;
    }
    if (entry.evidenceType !== "structural_feature" || !entry.featureKey) continue;
    const signature = kindFeatureSignature(entry.featureKey, entry.featureValue);
    if (!signature) continue;
    if (!featuresByEntity.has(entry.entityRef)) featuresByEntity.set(entry.entityRef, new Map());
    const profile = featuresByEntity.get(entry.entityRef);
    if (!profile.has(signature)) profile.set(signature, {
      signature,
      featureKey: entry.featureKey,
      featureValue: entry.featureValue,
      evidenceRefs: new Set(),
    });
    profile.get(signature).evidenceRefs.add(entry.id);
  }

  const population = new Set(featuresByEntity.keys());
  const populationCount = population.size;
  if (!populationCount) return freeze([]);
  const priors = [];

  for (const [kindKey, rawMembers] of membersByKind) {
    const members = [...rawMembers].filter((entityRef) => population.has(entityRef));
    if (members.length < minMembers) continue;
    const memberSet = new Set(members);
    const nonmembers = [...population].filter((entityRef) => !memberSet.has(entityRef));
    const signatures = new Map();
    for (const entityRef of members) {
      for (const [signature, feature] of featuresByEntity.get(entityRef) ?? []) {
        if (!signatures.has(signature)) signatures.set(signature, feature);
      }
    }

    const features = [];
    for (const [signature, descriptor] of signatures) {
      const memberSupport = members.filter((entityRef) => featuresByEntity.get(entityRef)?.has(signature)).length;
      if (memberSupport < minFeatureSupport) continue;
      const nonmemberSupport = nonmembers.filter((entityRef) => featuresByEntity.get(entityRef)?.has(signature)).length;
      const memberRate = (memberSupport + smoothing) / (members.length + 2 * smoothing);
      const nonmemberRate = (nonmemberSupport + smoothing) / (nonmembers.length + 2 * smoothing);
      const lift = memberRate / nonmemberRate;
      if (lift < minLift) continue;
      features.push(freeze({
        signature,
        featureKey: descriptor.featureKey,
        featureValue: descriptor.featureValue,
        memberSupport,
        nonmemberSupport,
        memberRate,
        nonmemberRate,
        lift,
        logLift: Math.log(lift),
      }));
    }
    if (!features.length) continue;
    features.sort((a, b) => b.logLift - a.logLift || b.memberSupport - a.memberSupport || a.signature.localeCompare(b.signature));
    priors.push(kindPrior({
      id: `kind-prior:${kindKey}`,
      kindKey,
      label: labelsByKind.get(kindKey) ?? null,
      features,
      memberCount: members.length,
      populationCount,
      provenance: { giver, corpus, basis: "explicit_classifications_x_structural_features" },
      declaredParams: { minMembers, minFeatureSupport, minLift, smoothing },
    }));
  }

  return freeze(priors.sort((a, b) => b.memberCount - a.memberCount || a.kindKey.localeCompare(b.kindKey)));
}

function projectionSignatures(projection) {
  const signatures = new Set();
  if (projection?.selector?.signature) signatures.add(projection.selector.signature);
  if (projection?.consequence?.signature) signatures.add(projection.consequence.signature);
  for (const signature of projection?.structuralSignatures ?? []) if (signature) signatures.add(signature);
  return signatures;
}

function rankedHypothesesForSignatures(signatures, priors = [], { limit = 5, minScore = 0, minMatched = 1 } = {}) {
  const hypotheses = [];
  for (const prior of priors ?? []) {
    if (prior?.schema !== "EOKindPrior@1") continue;
    const matched = (prior.features ?? []).filter((feature) => signatures.has(feature.signature));
    if (matched.length < minMatched) continue;
    const score = matched.reduce((sum, feature) => sum + (feature.logLift ?? 0), 0);
    if (score <= minScore) continue;
    hypotheses.push({ prior, matched, score });
  }
  hypotheses.sort((a, b) => b.score - a.score || a.prior.kindKey.localeCompare(b.prior.kindKey));
  return hypotheses.slice(0, limit);
}

export function rankKindPriorHypotheses(projection, priors = [], { limit = 5, minScore = 0, minMatched = 1 } = {}) {
  if (projection?.standing !== "earned_invariant") return freeze([]);
  const signatures = projectionSignatures(projection);
  if (!signatures.size) return freeze([]);
  return freeze(rankedHypothesesForSignatures(signatures, priors, { limit, minScore, minMatched }).map(({ prior, matched, score }) => freeze({
    schema: "EOKindPriorHypothesis@1",
    priorRef: prior.id,
    kindKey: prior.kindKey,
    label: prior.label,
    standing: "defeasible_prior_hypothesis",
    admissible: false,
    witnessed: false,
    score,
    matchedSignatures: freeze(matched.map((feature) => feature.signature).sort()),
    giver: prior.provenance?.giver ?? null,
    corpus: prior.provenance?.corpus ?? null,
  })));
}

/**
 * Priors may orient attention before a Kind is earned. This is the extraction
 * surface for "person-like", "place-like", etc. It never mutates Kind terrain:
 * each hypothesis is unwitnessed and inadmissible until current-source
 * evidence earns a Kind or explicitly witnesses a classification.
 */
export function snapshotEntityKindPriorHypotheses(kindIndex, priors = [], {
  limitPerEntity = 3,
  minScore = 0,
  minMatched = 1,
  minMargin = 0,
} = {}) {
  if (kindIndex?.schema !== "EOKindInductionIndex@1") throw new TypeError("snapshotEntityKindPriorHypotheses requires EOKindInductionIndex@1");
  const usable = (priors ?? []).filter((prior) => prior?.schema === "EOKindPrior@1");
  if (!usable.length) return freeze([]);
  const out = [];
  for (const [entityRef, profile] of kindIndex.entityFeatures ?? []) {
    const signatures = new Set(profile.keys());
    if (!signatures.size) continue;
    const ranked = rankedHypothesesForSignatures(signatures, usable, { limit: limitPerEntity, minScore, minMatched });
    if (!ranked.length) continue;
    const margin = ranked.length > 1 ? ranked[0].score - ranked[1].score : ranked[0].score;
    if (margin < minMargin) continue;
    for (let rank = 0; rank < ranked.length; rank += 1) {
      const { prior, matched, score } = ranked[rank];
      out.push(freeze({
        schema: "EOEntityKindHypothesis@1",
        id: `entity-kind-prior:${entityRef}:${prior.kindKey}`,
        entityRef,
        priorRef: prior.id,
        kindKey: prior.kindKey,
        label: prior.label,
        rank: rank + 1,
        standing: "defeasible_prior_hypothesis",
        admissible: false,
        witnessed: false,
        score,
        margin: rank === 0 ? margin : null,
        matchedSignatures: freeze(matched.map((feature) => feature.signature).sort()),
        giver: prior.provenance?.giver ?? null,
        corpus: prior.provenance?.corpus ?? null,
      }));
    }
  }
  out.sort((a, b) => a.entityRef.localeCompare(b.entityRef) || a.rank - b.rank || b.score - a.score);
  return freeze(out);
}

export function conditionKindProjections(projections = [], priors = [], options = {}) {
  const usable = (priors ?? []).filter((prior) => prior?.schema === "EOKindPrior@1");
  if (!usable.length) return freeze([...(projections ?? [])]);
  return freeze((projections ?? []).map((projection) => {
    if (projection?.standing !== "earned_invariant") return projection;
    const hypotheses = rankKindPriorHypotheses(projection, usable, options);
    if (!hypotheses.length) return projection;
    const preferred = hypotheses[0];
    return freeze({
      ...projection,
      priorHypotheses: hypotheses,
      priorLabel: preferred.label ?? preferred.kindKey,
      priorKindKey: preferred.kindKey,
      priorStanding: "defeasible_prior_hypothesis",
    });
  }));
}
