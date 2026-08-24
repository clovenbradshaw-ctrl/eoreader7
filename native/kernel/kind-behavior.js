const freeze = (value) => Object.freeze(value);
const log2 = (value) => Math.log(value) / Math.log(2);

function stableValue(value) {
  if (value === undefined) return "true";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableValue(value[key])}`).join(",")}}`;
}

function seedFrom(value) {
  let h = 2166136261;
  for (const ch of String(value)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 1;
}

function seededRng(seedValue) {
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

function sequenceOf(entry) {
  if (Number.isFinite(entry?.sequencePosition)) return entry.sequencePosition;
  if (Number.isFinite(entry?.scope?.sequencePosition)) return entry.scope.sequencePosition;
  return null;
}

function normalized(counts) {
  const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
  if (!(total > 0)) return new Map();
  return new Map([...counts].map(([key, value]) => [key, value / total]));
}

function entropy(distribution) {
  let out = 0;
  for (const p of distribution.values()) if (p > 0) out -= p * log2(p);
  return out;
}

export function jensenShannonDivergence(a, b) {
  const keys = new Set([...a.keys(), ...b.keys()]);
  const midpoint = new Map();
  for (const key of keys) midpoint.set(key, ((a.get(key) ?? 0) + (b.get(key) ?? 0)) / 2);
  return Math.max(0, entropy(midpoint) - (entropy(a) + entropy(b)) / 2);
}

export function totalVariationDistance(a, b) {
  const keys = new Set([...a.keys(), ...b.keys()]);
  let distance = 0;
  for (const key of keys) distance += Math.abs((a.get(key) ?? 0) - (b.get(key) ?? 0));
  return distance / 2;
}

function featureEvents(index, entityRef, after, excludedSignatures) {
  const byChannel = new Map();
  for (const [signature, record] of index?.entityFeatures?.get(entityRef) ?? []) {
    if (excludedSignatures.has(signature) || !record?.featureKey) continue;
    const evidenceIds = [...(record.evidenceIds ?? [])];
    const knownFuture = evidenceIds.filter((id) => {
      const at = sequenceOf(index?.evidenceById?.get(id));
      return at !== null && at > after;
    });
    const unknownSequence = evidenceIds.filter((id) => sequenceOf(index?.evidenceById?.get(id)) === null);
    const futureIds = knownFuture.length
      ? knownFuture
      : record.firstAt > after
        ? (unknownSequence.length ? unknownSequence : evidenceIds.length ? evidenceIds : [null])
        : [];
    if (!futureIds.length) continue;
    if (!byChannel.has(record.featureKey)) byChannel.set(record.featureKey, []);
    for (const evidenceId of futureIds) byChannel.get(record.featureKey).push(freeze({
      entityRef,
      channel: record.featureKey,
      outcome: stableValue(record.featureValue),
      value: record.featureValue,
      signature,
      evidenceId,
    }));
  }
  return byChannel;
}

function profileForEvents(events = []) {
  const counts = new Map();
  for (const event of events) counts.set(event.outcome, (counts.get(event.outcome) ?? 0) + 1);
  return normalized(counts);
}

function meanDistribution(profiles) {
  const out = new Map();
  if (!profiles.length) return out;
  for (const profile of profiles) for (const [outcome, p] of profile.distribution) out.set(outcome, (out.get(outcome) ?? 0) + p / profiles.length);
  return out;
}

function distributionObject(distribution) {
  return freeze(Object.fromEntries([...distribution].sort(([a], [b]) => a.localeCompare(b))));
}

function memberDivergence(profiles, model) {
  if (!profiles.length) return 1;
  return profiles.reduce((sum, profile) => sum + jensenShannonDivergence(profile.distribution, model), 0) / profiles.length;
}

function permutationPValue(profiles, memberCount, observed, { permutations, seed }) {
  if (profiles.length < 2 || memberCount < 1 || memberCount >= profiles.length) return 1;
  const rng = seededRng(seed);
  let exceed = 0;
  let samples = 0;
  for (let i = 0; i < permutations; i += 1) {
    const permuted = shuffled(profiles, rng);
    const a = meanDistribution(permuted.slice(0, memberCount));
    const b = meanDistribution(permuted.slice(memberCount));
    const distance = jensenShannonDivergence(a, b);
    if (distance >= observed - Number.EPSILON) exceed += 1;
    samples += 1;
  }
  return (exceed + 1) / (samples + 1);
}

function profilesForChannel(eventsByEntity, entityRefs, channel) {
  const profiles = [];
  for (const entityRef of entityRefs) {
    const events = eventsByEntity.get(entityRef)?.get(channel) ?? [];
    if (!events.length) continue;
    profiles.push(freeze({ entityRef, events: freeze([...events]), distribution: profileForEvents(events) }));
  }
  return profiles;
}

function bestOutcome(memberDistribution, nonmemberDistribution) {
  const outcomes = new Set([...memberDistribution.keys(), ...nonmemberDistribution.keys()]);
  let best = null;
  for (const outcome of outcomes) {
    const memberRate = memberDistribution.get(outcome) ?? 0;
    const nonmemberRate = nonmemberDistribution.get(outcome) ?? 0;
    const effect = Math.abs(memberRate - nonmemberRate);
    if (!best || effect > best.effect || (effect === best.effect && outcome.localeCompare(best.outcome) < 0)) {
      best = { outcome, memberRate, nonmemberRate, effect };
    }
  }
  return best;
}

/**
 * Test a metastable candidate basin as an empirical causal state.
 *
 * Affinity is only nomination. After formation, each entity supplies a future
 * response distribution on independently observed feature channels. Basin
 * membership is ontologically useful only when a response channel has:
 *
 * 1. enough independently observed members,
 * 2. low within-basin divergence from the basin's future law,
 * 3. a materially different law outside the basin, and
 * 4. a prospective label-permutation null that rejects exchangeability.
 *
 * This is a finite-data approximation to behavioral equivalence / probabilistic
 * bisimulation. It does not claim exact state equality and it does not invent
 * transition probabilities for unobserved outcomes.
 */
export function prospectiveBehavioralEquivalence(index, record, {
  minMembers = 3,
  minConsequenceSupport = 2,
  minBehavioralDivergence = 0.05,
  maxWithinDivergence = 0.5,
  minEffect = 0.5,
  alpha = 0.05,
  permutations = 63,
} = {}) {
  const memberRefs = [...record.memberRefs];
  const members = new Set(memberRefs);
  const population = [...(index?.entityFeatures?.keys() ?? [])];
  const nonmemberRefs = population.filter((ref) => !members.has(ref));
  if (memberRefs.length < minMembers || !nonmemberRefs.length) return null;

  const excluded = new Set(record.structuralSignatures ?? []);
  const eventsByEntity = new Map();
  const channels = new Set();
  for (const entityRef of population) {
    const future = featureEvents(index, entityRef, record.formedAt, excluded);
    eventsByEntity.set(entityRef, future);
    for (const channel of future.keys()) channels.add(channel);
  }

  let best = null;
  for (const channel of channels) {
    const memberProfiles = profilesForChannel(eventsByEntity, memberRefs, channel);
    const nonmemberProfiles = profilesForChannel(eventsByEntity, nonmemberRefs, channel);
    if (memberProfiles.length < Math.max(minMembers, minConsequenceSupport) || !nonmemberProfiles.length) continue;

    const memberDistribution = meanDistribution(memberProfiles);
    const nonmemberDistribution = meanDistribution(nonmemberProfiles);
    const behavioralDivergence = jensenShannonDivergence(memberDistribution, nonmemberDistribution);
    const totalVariation = totalVariationDistance(memberDistribution, nonmemberDistribution);
    const withinMemberDivergence = memberDivergence(memberProfiles, memberDistribution);
    if (behavioralDivergence < minBehavioralDivergence) continue;
    if (totalVariation < minEffect) continue;
    if (withinMemberDivergence > maxWithinDivergence) continue;

    const allProfiles = [...memberProfiles, ...nonmemberProfiles];
    const pValue = permutationPValue(allProfiles, memberProfiles.length, behavioralDivergence, {
      permutations,
      seed: `${record.kindKey}|${record.formedAt}|${channel}`,
    });
    if (pValue > alpha) continue;

    const outcome = bestOutcome(memberDistribution, nonmemberDistribution);
    const result = freeze({
      method: "prospective_approximate_bisimulation",
      responseChannel: channel,
      memberRefs: freeze(memberProfiles.map((profile) => profile.entityRef).sort()),
      nonmemberRefs: freeze(nonmemberProfiles.map((profile) => profile.entityRef).sort()),
      memberDistribution: distributionObject(memberDistribution),
      nonmemberDistribution: distributionObject(nonmemberDistribution),
      behavioralDivergence,
      totalVariation,
      withinMemberDivergence,
      pValue,
      permutations,
      dominantOutcome: outcome ? freeze(outcome) : null,
    });
    if (!best
      || result.pValue < best.pValue
      || (result.pValue === best.pValue && result.behavioralDivergence > best.behavioralDivergence)
      || (result.pValue === best.pValue && result.behavioralDivergence === best.behavioralDivergence && result.totalVariation > best.totalVariation)) best = result;
  }

  return best;
}
