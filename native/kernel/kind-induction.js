const freeze = (value) => Object.freeze(value);

const stableHash = (value) => {
  let h = 2166136261;
  for (const ch of String(value)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
};

function stableValue(value) {
  if (value === undefined) return "true";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableValue(value[key])}`).join(",")}}`;
}

const sequenceOf = (entry) => Number.isFinite(entry?.sequencePosition)
  ? entry.sequencePosition
  : Number.isFinite(entry?.scope?.sequencePosition)
    ? entry.scope.sequencePosition
    : null;

const witnessRefsOf = (entry) => {
  const refs = new Set(entry?.witnessRefs ?? []);
  if (entry?.witness) refs.add(entry.witness);
  return [...refs].filter(Boolean);
};

const signatureOf = (entry) => entry?.featureKey
  ? `${entry.featureKey}=${stableValue(entry.featureValue)}`
  : null;

function featureDescriptor(entry) {
  return freeze({
    key: entry.featureKey,
    value: entry.featureValue,
    signature: signatureOf(entry),
  });
}

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

function ensureEntity(index, entityRef) {
  if (!index.entityFeatures.has(entityRef)) index.entityFeatures.set(entityRef, new Map());
  return index.entityFeatures.get(entityRef);
}

function ingestFeature(index, entry) {
  const signature = signatureOf(entry);
  const at = sequenceOf(entry);
  if (!signature || !entry.entityRef || at === null) return false;
  const entity = ensureEntity(index, entry.entityRef);
  let record = entity.get(signature);
  if (!record) {
    record = {
      signature,
      featureKey: entry.featureKey,
      featureValue: entry.featureValue,
      firstAt: at,
      lastAt: at,
      evidenceIds: new Set(),
      witnessRefs: new Set(),
      modalities: new Set(),
    };
    entity.set(signature, record);
  }
  record.firstAt = Math.min(record.firstAt, at);
  record.lastAt = Math.max(record.lastAt, at);
  record.evidenceIds.add(entry.id);
  for (const ref of witnessRefsOf(entry)) record.witnessRefs.add(ref);
  if (entry?.provenance?.modality) record.modalities.add(entry.provenance.modality);

  if (!index.entitiesByFeature.has(signature)) index.entitiesByFeature.set(signature, new Map());
  index.entitiesByFeature.get(signature).set(entry.entityRef, record);
  const latest = index.latestAtByEntity.get(entry.entityRef);
  index.latestAtByEntity.set(entry.entityRef, latest === undefined ? at : Math.max(latest, at));
  return true;
}

function ingestExplicit(index, entry) {
  if (!entry?.entityRef || !entry?.kindKey) return false;
  if (!index.explicitByKind.has(entry.kindKey)) index.explicitByKind.set(entry.kindKey, new Map());
  index.explicitByKind.get(entry.kindKey).set(entry.id, entry);
  return true;
}

/**
 * Modality-blind evidence record. Sense organs may name a witnessed structural
 * feature without saying whether it is a selector, an outcome, or a Kind.
 * The kernel decides those roles from recurrence, temporal order, and a
 * consequence differential. Explicit source classifications use kindKey and
 * evidenceType="explicit_classification"; they are received evidence, not
 * induced invariants.
 */
export function kindEvidence({
  id,
  entityRef,
  evidenceType = "structural_feature",
  featureKey = null,
  featureValue = undefined,
  kindKey = null,
  kindSurface = null,
  sequencePosition = null,
  witness = null,
  witnessRefs = [],
  anchor = null,
  provenance = {},
} = {}) {
  if (!id || !entityRef) throw new TypeError("kindEvidence requires id and entityRef");
  if (evidenceType === "explicit_classification" && !kindKey) throw new TypeError("explicit classification requires kindKey");
  if (evidenceType === "structural_feature" && !featureKey) throw new TypeError("structural feature evidence requires featureKey");
  return freeze({
    schema: "EOKindEvidence@1",
    id,
    entityRef,
    evidenceType,
    featureKey,
    featureValue,
    kindKey,
    kindSurface,
    sequencePosition,
    standing: "witnessed_evidence",
    witnessed: true,
    witness,
    witnessRefs: freeze([...new Set(witnessRefsOf({ witness, witnessRefs }))]),
    anchor: anchor ? freeze({ ...anchor }) : null,
    provenance: freeze({ ...provenance }),
  });
}

export function createKindInductionIndex(entries = [], options = {}) {
  const index = {
    schema: "EOKindInductionIndex@1",
    options: freeze({
      minMembers: options.minMembers ?? 3,
      minFitMembers: options.minFitMembers ?? 2,
      minConsequenceSupport: options.minConsequenceSupport ?? 2,
      minEffect: options.minEffect ?? 0.5,
      alpha: options.alpha ?? 0.05,
    }),
    evidenceById: new Map(),
    explicitByKind: new Map(),
    entityFeatures: new Map(),
    entitiesByFeature: new Map(),
    latestAtByEntity: new Map(),
    snapshot: null,
    diagnostics: null,
    dirty: true,
  };
  indexKindEntries(index, entries);
  return index;
}

export function indexKindEntries(index, entries = []) {
  if (index?.schema !== "EOKindInductionIndex@1") throw new TypeError("indexKindEntries requires EOKindInductionIndex@1");
  let changed = 0;
  for (const entry of entries ?? []) {
    if (entry?.schema !== "EOKindEvidence@1" || !entry.id || index.evidenceById.has(entry.id)) continue;
    const accepted = entry.evidenceType === "explicit_classification"
      ? ingestExplicit(index, entry)
      : entry.evidenceType === "structural_feature"
        ? ingestFeature(index, entry)
        : false;
    if (!accepted) continue;
    index.evidenceById.set(entry.id, entry);
    changed += 1;
  }
  if (changed > 0) {
    index.dirty = true;
    index.snapshot = null;
    index.diagnostics = null;
  }
  return changed;
}

function receivedKindProjections(index) {
  const out = [];
  for (const [kindKey, evidenceMap] of index.explicitByKind) {
    const evidence = [...evidenceMap.values()];
    if (!evidence.length) continue;
    const memberRefs = [...new Set(evidence.map((entry) => entry.entityRef))].sort();
    const evidenceRefs = evidence.map((entry) => entry.id).sort();
    const witnessRefs = [...new Set(evidence.flatMap(witnessRefsOf))].sort();
    const modalities = [...new Set(evidence.map((entry) => entry?.provenance?.modality).filter(Boolean))].sort();
    out.push(freeze({
      schema: "EOKindProjection@1",
      id: `terrain:kind:received:${stableHash(`${kindKey}|${evidenceRefs.join("|")}`)}`,
      terrain: "Kind",
      kindKey,
      kindSurface: evidence.find((entry) => entry.kindSurface)?.kindSurface ?? null,
      standing: "received_explicit_classification",
      witnessed: false,
      memberRefs: freeze(memberRefs),
      evidenceRefs: freeze(evidenceRefs),
      witnessRefs: freeze(witnessRefs),
      modalities: freeze(modalities),
      basis: "explicit_classification_evidence",
    }));
  }
  return out;
}

function consequenceRecord(index, entityRef, signature) {
  return index.entityFeatures.get(entityRef)?.get(signature) ?? null;
}

function futureObserved(index, entityRef, after) {
  return (index.latestAtByEntity.get(entityRef) ?? -Infinity) > after;
}

function earnedKindProjection(index, selectorSignature, selectorMembers, population, diagnostics) {
  const { minMembers, minFitMembers, minConsequenceSupport, minEffect, alpha } = index.options;
  if (selectorMembers.size < minMembers || selectorMembers.size <= minFitMembers) return null;
  const ordered = [...selectorMembers.entries()]
    .sort((a, b) => a[1].firstAt - b[1].firstAt || a[0].localeCompare(b[0]));
  const formedAt = ordered[minFitMembers - 1][1].firstAt;
  const fitMemberRefs = ordered.slice(0, minFitMembers).map(([entityRef]) => entityRef);
  const holdoutMemberRefs = ordered.slice(minFitMembers)
    .filter(([, record]) => record.firstAt > formedAt)
    .map(([entityRef]) => entityRef);
  if (!holdoutMemberRefs.length) {
    diagnostics.withheldNoHoldout += 1;
    return null;
  }

  const memberRefs = new Set(ordered.map(([entityRef]) => entityRef));
  const candidateConsequences = new Set();
  for (const entityRef of memberRefs) {
    const selector = selectorMembers.get(entityRef);
    for (const [signature, record] of index.entityFeatures.get(entityRef) ?? []) {
      if (signature === selectorSignature) continue;
      if (record.firstAt > Math.max(formedAt, selector.firstAt)) candidateConsequences.add(signature);
    }
  }

  let best = null;
  for (const consequenceSignature of candidateConsequences) {
    const evaluableMembers = [...memberRefs].filter((entityRef) => futureObserved(index, entityRef, Math.max(formedAt, selectorMembers.get(entityRef).firstAt)));
    const nonMemberRefs = [...population].filter((entityRef) => !memberRefs.has(entityRef));
    const evaluableNonMembers = nonMemberRefs.filter((entityRef) => futureObserved(index, entityRef, formedAt));
    if (evaluableMembers.length < minMembers || evaluableNonMembers.length < 1) continue;

    const supportingMembers = evaluableMembers.filter((entityRef) => {
      const selector = selectorMembers.get(entityRef);
      const consequence = consequenceRecord(index, entityRef, consequenceSignature);
      return consequence && consequence.firstAt > Math.max(formedAt, selector.firstAt);
    });
    const holdoutSupport = holdoutMemberRefs.filter((entityRef) => supportingMembers.includes(entityRef));
    if (supportingMembers.length < minConsequenceSupport || holdoutSupport.length < 1) continue;

    const supportingNonMembers = evaluableNonMembers.filter((entityRef) => {
      const consequence = consequenceRecord(index, entityRef, consequenceSignature);
      return consequence && consequence.firstAt > formedAt;
    });
    const memberRate = supportingMembers.length / evaluableMembers.length;
    const nonMemberRate = supportingNonMembers.length / evaluableNonMembers.length;
    const effect = memberRate - nonMemberRate;
    if (effect < minEffect) continue;

    const N = evaluableMembers.length + evaluableNonMembers.length;
    const K = supportingMembers.length + supportingNonMembers.length;
    const n = evaluableMembers.length;
    const k = supportingMembers.length;
    const pValue = hypergeometricUpperTail(N, K, n, k);
    if (pValue > alpha) continue;

    const consequenceExample = consequenceRecord(index, supportingMembers[0], consequenceSignature);
    const result = {
      consequenceSignature,
      consequence: freeze({ key: consequenceExample.featureKey, value: consequenceExample.featureValue, signature: consequenceSignature }),
      evaluableMembers,
      evaluableNonMembers,
      supportingMembers,
      supportingNonMembers,
      holdoutSupport,
      memberRate,
      nonMemberRate,
      effect,
      pValue,
    };
    if (!best || result.pValue < best.pValue || (result.pValue === best.pValue && result.effect > best.effect)) best = result;
  }

  if (!best) {
    diagnostics.withheldNoConsequence += 1;
    return null;
  }

  const selectorExample = ordered[0][1];
  const selectorEvidenceRefs = [...memberRefs].flatMap((entityRef) => [...(selectorMembers.get(entityRef)?.evidenceIds ?? [])]);
  const consequenceEvidenceRefs = best.supportingMembers.flatMap((entityRef) => [...(consequenceRecord(index, entityRef, best.consequenceSignature)?.evidenceIds ?? [])]);
  const evidenceRefs = [...new Set([...selectorEvidenceRefs, ...consequenceEvidenceRefs])].sort();
  const witnessRefs = [...new Set(evidenceRefs.flatMap((id) => witnessRefsOf(index.evidenceById.get(id))))].sort();
  const modalities = [...new Set(evidenceRefs.map((id) => index.evidenceById.get(id)?.provenance?.modality).filter(Boolean))].sort();
  const selector = freeze({ key: selectorExample.featureKey, value: selectorExample.featureValue, signature: selectorSignature });
  const kindKey = `kind:induced:${stableHash(selectorSignature)}`;

  return freeze({
    schema: "EOKindProjection@1",
    id: `terrain:kind:earned:${stableHash(`${selectorSignature}|${best.consequenceSignature}|${formedAt}`)}`,
    terrain: "Kind",
    kindKey,
    standing: "earned_invariant",
    witnessed: false,
    selector,
    memberRefs: freeze([...memberRefs].sort()),
    fitMemberRefs: freeze([...fitMemberRefs].sort()),
    holdoutMemberRefs: freeze([...holdoutMemberRefs].sort()),
    consequence: best.consequence,
    evidenceRefs: freeze(evidenceRefs),
    witnessRefs: freeze(witnessRefs),
    modalities: freeze(modalities),
    materiality: freeze({
      makesDifference: true,
      reasons: freeze([freeze({
        kind: "held_out_consequence_differential",
        consequence: best.consequenceSignature,
        effect: best.effect,
        pValue: best.pValue,
      })]),
    }),
    validation: freeze({
      method: "temporal_holdout_hypergeometric",
      formedAt,
      fitMemberRefs: freeze([...fitMemberRefs].sort()),
      holdoutMemberRefs: freeze([...holdoutMemberRefs].sort()),
      holdoutSupportRefs: freeze([...best.holdoutSupport].sort()),
      evaluableMemberCount: best.evaluableMembers.length,
      evaluableNonMemberCount: best.evaluableNonMembers.length,
      supportingMemberCount: best.supportingMembers.length,
      supportingNonMemberCount: best.supportingNonMembers.length,
      memberRate: best.memberRate,
      nonMemberRate: best.nonMemberRate,
      effect: best.effect,
      pValue: best.pValue,
      alpha,
    }),
    basis: "shared_entity_structure_with_held_out_consequence",
  });
}

function computeSnapshot(index) {
  const received = receivedKindProjections(index);
  const earned = [];
  const diagnostics = {
    explicitKinds: received.length,
    selectorNominations: 0,
    earnedKinds: 0,
    withheldNoHoldout: 0,
    withheldNoConsequence: 0,
  };
  const population = new Set(index.entityFeatures.keys());
  for (const [selectorSignature, members] of index.entitiesByFeature) {
    if (members.size < index.options.minMembers) continue;
    diagnostics.selectorNominations += 1;
    const projection = earnedKindProjection(index, selectorSignature, members, population, diagnostics);
    if (projection) earned.push(projection);
  }
  earned.sort((a, b) => a.kindKey.localeCompare(b.kindKey));
  diagnostics.earnedKinds = earned.length;
  index.diagnostics = freeze({ ...diagnostics });
  index.snapshot = freeze([...received, ...earned]);
  index.dirty = false;
  return index.snapshot;
}

export function snapshotKindState(index, { ids = null } = {}) {
  if (index?.schema !== "EOKindInductionIndex@1") throw new TypeError("snapshotKindState requires EOKindInductionIndex@1");
  const snapshot = (!index.dirty && index.snapshot) ? index.snapshot : computeSnapshot(index);
  if (!ids) return snapshot;
  const allowed = ids instanceof Set ? ids : new Set(ids);
  return freeze(snapshot.filter((projection) =>
    allowed.has(projection.id)
    || allowed.has(projection.kindKey)
    || (projection.memberRefs ?? []).some((id) => allowed.has(id))
    || (projection.evidenceRefs ?? []).some((id) => allowed.has(id))));
}

export function kindDiagnostics(index) {
  if (index?.schema !== "EOKindInductionIndex@1") throw new TypeError("kindDiagnostics requires EOKindInductionIndex@1");
  if (index.dirty || !index.diagnostics) computeSnapshot(index);
  return index.diagnostics;
}

export function projectKinds(entries = [], options = {}) {
  return snapshotKindState(createKindInductionIndex(entries, options));
}
