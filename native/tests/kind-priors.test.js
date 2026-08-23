import test from "node:test";
import assert from "node:assert/strict";
import {
  kindEvidence,
  createKindInductionIndex,
  snapshotKindState,
  deriveKindPriors,
  conditionKindProjections,
} from "../kernel/index.js";

const feature = (id, entityRef, key, value, at, modality = "text") => kindEvidence({
  id, entityRef, featureKey: key, featureValue: value, sequencePosition: at,
  witness: `${modality}:${id}`, provenance: { modality, giver: `fixture/${modality}`, basis: "witnessed_feature" },
});

const explicit = (id, entityRef, kindKey, label, at) => kindEvidence({
  id, entityRef, evidenceType: "explicit_classification", kindKey, kindSurface: label,
  sequencePosition: at, witness: `corpus:${id}`, provenance: { modality: "text", giver: "fixture/corpus", basis: "explicit_classification" },
});

function corpusEntries() {
  return [
    explicit("c:a:kind", "c:a", "kind:person", "person", 1),
    explicit("c:b:kind", "c:b", "kind:person", "person", 1),
    explicit("c:c:kind", "c:c", "kind:place", "place", 1),
    explicit("c:d:kind", "c:d", "kind:place", "place", 1),
    feature("c:a:agent", "c:a", "relation_role", "subject", 2),
    feature("c:b:agent", "c:b", "relation_role", "subject", 2),
    feature("c:a:pronoun", "c:a", "anaphoric_class", "gendered_singular", 3),
    feature("c:b:pronoun", "c:b", "anaphoric_class", "gendered_singular", 3),
    feature("c:c:in", "c:c", "adjacent_closed_class_left", "in", 2),
    feature("c:d:in", "c:d", "adjacent_closed_class_left", "in", 2),
    feature("c:c:from", "c:c", "adjacent_closed_class_left", "from", 3),
    feature("c:d:from", "c:d", "adjacent_closed_class_left", "from", 3),
  ];
}

function sourceEntries() {
  return [
    feature("s:a:selector", "s:a", "anaphoric_class", "gendered_singular", 1),
    feature("s:b:selector", "s:b", "anaphoric_class", "gendered_singular", 2),
    feature("s:c:selector", "s:c", "anaphoric_class", "gendered_singular", 3),
    feature("s:x:selector", "s:x", "adjacent_closed_class_left", "in", 1),
    feature("s:y:selector", "s:y", "adjacent_closed_class_left", "in", 1),
    feature("s:z:selector", "s:z", "adjacent_closed_class_left", "in", 1),
    feature("s:a:outcome", "s:a", "relation_role", "subject", 4),
    feature("s:b:outcome", "s:b", "relation_role", "subject", 5),
    feature("s:c:outcome", "s:c", "relation_role", "subject", 6),
    feature("s:x:later", "s:x", "later_observation", true, 4),
    feature("s:y:later", "s:y", "later_observation", true, 5),
    feature("s:z:later", "s:z", "later_observation", true, 6),
  ];
}

test("corpus evidence can derive defeasible person/place Kind priors", () => {
  const priors = deriveKindPriors(corpusEntries(), {
    giver: "live_priors:test-corpus",
    corpus: "fixture",
    minMembers: 2,
    minFeatureSupport: 2,
    minLift: 1.2,
  });
  const person = priors.find((prior) => prior.kindKey === "kind:person");
  const place = priors.find((prior) => prior.kindKey === "kind:place");
  assert.ok(person);
  assert.ok(place);
  assert.equal(person.label, "person");
  assert.equal(place.label, "place");
  assert.ok(person.features.some((feature) => feature.signature.includes("anaphoric_class")));
  assert.ok(place.features.some((feature) => feature.signature.includes("adjacent_closed_class_left")));
});

test("a live prior can name an earned Kind but cannot create one", () => {
  const priors = deriveKindPriors(corpusEntries(), {
    giver: "live_priors:test-corpus",
    corpus: "fixture",
    minMembers: 2,
    minFeatureSupport: 2,
    minLift: 1.2,
  });

  const noKind = snapshotKindState(createKindInductionIndex([
    feature("n:a", "n:a", "anaphoric_class", "gendered_singular", 1),
    feature("n:b", "n:b", "anaphoric_class", "gendered_singular", 2),
    feature("n:c", "n:c", "anaphoric_class", "gendered_singular", 3),
  ]));
  assert.equal(noKind.length, 0);
  assert.equal(conditionKindProjections(noKind, priors).length, 0);

  const earned = snapshotKindState(createKindInductionIndex(sourceEntries()));
  const personLike = earned.find((projection) => projection.standing === "earned_invariant" && projection.selector?.value === "gendered_singular");
  assert.ok(personLike);
  const [conditioned] = conditionKindProjections([personLike], priors);
  assert.equal(conditioned.priorLabel, "person");
  assert.equal(conditioned.priorStanding, "defeasible_prior_hypothesis");
  assert.equal(conditioned.standing, "earned_invariant");
  assert.equal(conditioned.materiality.makesDifference, true);
});
