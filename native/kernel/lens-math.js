const freeze = (value) => Object.freeze(value);

function stableRefs(values = []) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.length > 0))].sort();
}

function nestedRefs(value, out = new Set()) {
  if (value == null) return out;
  if (typeof value === "string") {
    if (/^(ref|ref-occ|occ|edge|expectation|obligation|identity|composition|frame|pattern|motif|op|delta|task|surface):/.test(value)) out.add(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) nestedRefs(item, out);
    return out;
  }
  if (typeof value === "object") for (const item of Object.values(value)) nestedRefs(item, out);
  return out;
}

function normalizedWeights(raw, alternatives) {
  if (!raw || typeof raw !== "object") return null;
  const weights = alternatives.map((ref) => Number(raw[ref]));
  if (weights.some((value) => !Number.isFinite(value) || value < 0)) return null;
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (!(total > 0)) return null;
  return weights.map((value) => value / total);
}

function shannon(weights) {
  let h = 0;
  for (const p of weights ?? []) if (p > 0) h -= p * Math.log2(p);
  return h;
}

/**
 * Interpretation/Figure is an operator over a bounded possibility space.
 *
 * The kernel must not pretend that unweighted alternatives are probabilities.
 * With only a finite possibility set we can honestly measure Hartley
 * uncertainty, H0 = log2 |A|. If and only if an entry carries explicit
 * alternative weights and a named giver, we additionally expose Shannon
 * entropy. Bayesian/KL update remains downstream because it requires both a
 * prior and posterior distribution with provenance.
 */
export function interpretiveLensGeometry(entry) {
  if (!entry?.id) return null;
  const alternatives = stableRefs(entry.alternatives ?? entry?.distinction?.alternatives ?? []);
  const grounds = stableRefs(entry.grounds ?? [...nestedRefs(entry?.distinction)]);
  const consequenceRefs = stableRefs([...nestedRefs(entry.consequences ?? [])]);
  const possibilityCount = alternatives.length;
  const hartleyBits = possibilityCount > 0 ? Math.log2(possibilityCount) : null;
  const weightGiver = entry.weightGiver ?? entry?.weights?.giver ?? entry?.provenance?.weightGiver ?? null;
  const rawWeights = entry.alternativeWeights ?? entry?.weights?.alternatives ?? null;
  const probabilities = weightGiver ? normalizedWeights(rawWeights, alternatives) : null;

  return freeze({
    schema: "EOLensGeometry@1",
    id: `lens-geometry:${entry.id}`,
    lensRef: entry.id,
    model: probabilities ? "giver_weighted_possibility_space" : "unweighted_possibility_space",
    grounds: freeze(grounds),
    alternatives: freeze(alternatives),
    consequenceRefs: freeze(consequenceRefs),
    possibilityCount,
    quantified: possibilityCount > 0,
    weighted: Boolean(probabilities),
    probabilistic: Boolean(probabilities),
    weightGiver: probabilities ? weightGiver : null,
    hartleyUncertaintyBits: hartleyBits,
    maximumResolutionGainBits: hartleyBits,
    shannonEntropyBits: probabilities ? shannon(probabilities) : null,
    probabilities: probabilities ? freeze(probabilities.map((p, i) => freeze({ alternative: alternatives[i], probability: p }))) : null,
    bayesianUpdateAvailable: false,
    reasonBayesianUnavailable: probabilities
      ? "one calibrated distribution is insufficient for KL/Bayesian update; prior and posterior are both required"
      : "alternatives are not calibrated probabilities from a named giver",
    witnessed: false,
    basis: "interpretive_figure_as_bounded_possibility_transform",
  });
}

export function projectLensGeometry(lensEntries = []) {
  return freeze((lensEntries ?? []).map(interpretiveLensGeometry).filter(Boolean));
}
