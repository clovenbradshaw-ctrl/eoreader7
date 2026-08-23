import test from "node:test";
import assert from "node:assert/strict";
import { kindEvidence, createKindInductionIndex, kindDiagnostics, kindCandidates, snapshotKindState } from "../kernel/index.js";

function feature(id, entityRef, featureKey, featureValue, at) {
  return kindEvidence({
    id,
    entityRef,
    featureKey,
    featureValue,
    sequencePosition: at,
    witness: `fixture:${id}`,
    provenance: { modality: "data", giver: "fixture/population-kinds", basis: "witnessed_feature" },
  });
}

function populationFixture() {
  const entries = [];
  let at = 1;
  const add = (entity, key, value) => entries.push(feature(`${entity}:${key}:${value}`, entity, key, value, at++));

  for (const entity of ["person:a", "person:b", "person:c", "person:d"]) {
    add(entity, "relation_role", "subject");
    add(entity, "relation_role_breadth", "subject_object");
    add(entity, "relation_participation_depth", "4+");
    add(entity, "anaphoric_class", "gendered_singular");
  }
  for (const entity of ["place:a", "place:b", "place:c", "place:d"]) {
    add(entity, "relation_role", "object");
    add(entity, "relation_participation_depth", "2+");
    add(entity, "adjacent_closed_class_left", "in");
    add(entity, "adjacent_closed_class_left", "from");
  }
  for (const entity of ["artifact:a", "artifact:b", "artifact:c", "artifact:d"]) {
    add(entity, "relation_role", "object");
    add(entity, "relation_participation_depth", "2+");
    add(entity, "adjacent_closed_class_left", "the");
    add(entity, "transformation_role", "made");
  }
  return entries;
}

test("EOReader5-style population induction discovers coherent latent entity kinds without semantic labels", () => {
  const index = createKindInductionIndex(populationFixture(), {
    populationMinPrevalence: 0.15,
    populationCohesionThreshold: 0.2,
    populationMinKindSize: 2,
    populationPermutations: 100,
    populationQuantile: 0.8,
  });
  const diagnostics = kindDiagnostics(index);
  const candidates = kindCandidates(index);
  assert.ok(diagnostics.populationKinds.parameters >= 4);
  assert.ok(diagnostics.populationKinds.clusters >= 2);
  assert.ok(candidates.length >= 2);
  for (const candidate of candidates) {
    assert.equal(candidate.schema, "EOKindCandidate@1");
    assert.equal(candidate.standing, "structural_kind_hypothesis");
    assert.equal(candidate.witnessed, false);
    assert.equal(candidate.admissible, false);
    assert.equal(candidate.kindSurface, undefined);
    assert.ok(candidate.memberCount >= 2);
    assert.ok(candidate.distinguishingParameters.length > 0);
  }
});

test("population Kind hypotheses do not enter Kind terrain before consequence admission", () => {
  const index = createKindInductionIndex(populationFixture(), {
    populationMinPrevalence: 0.15,
    populationCohesionThreshold: 0.2,
    populationMinKindSize: 2,
    populationPermutations: 100,
    populationQuantile: 0.8,
  });
  const candidates = kindCandidates(index);
  assert.ok(candidates.length > 0);
  const projected = snapshotKindState(index);
  assert.equal(projected.filter((kind) => kind.standing === "earned_invariant").length, 0);
  assert.ok(candidates.every((candidate) => candidate.standing === "structural_kind_hypothesis"));
});
