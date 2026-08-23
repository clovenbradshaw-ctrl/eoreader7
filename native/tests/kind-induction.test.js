import test from "node:test";
import assert from "node:assert/strict";
import {
  kindEvidence,
  createKindInductionIndex,
  indexKindEntries,
  snapshotKindState,
  kindDiagnostics,
  receivedGround,
  applyObservation,
  deriveOrientation,
  reasoningAffordances,
} from "../kernel/index.js";

function feature(id, entityRef, key, value, at, modality = "sensor") {
  return kindEvidence({
    id,
    entityRef,
    featureKey: key,
    featureValue: value,
    sequencePosition: at,
    witness: `${modality}:${id}`,
    provenance: { modality, giver: `fixture/${modality}`, basis: "witnessed_feature" },
  });
}

function earnedFixture(modality = "sensor") {
  return [
    feature("e:a:selector", "entity:a", "trajectory", "accelerating", 1, modality),
    feature("e:b:selector", "entity:b", "trajectory", "accelerating", 2, modality),
    feature("e:c:selector", "entity:c", "trajectory", "accelerating", 3, modality),
    feature("e:d:selector", "entity:d", "trajectory", "steady", 1, modality),
    feature("e:e:selector", "entity:e", "trajectory", "steady", 1, modality),
    feature("e:f:selector", "entity:f", "trajectory", "steady", 1, modality),

    // The consequence is later than the selector and later than kind formation
    // for the holdout member. It therefore was not used to nominate the Kind.
    feature("e:a:outcome", "entity:a", "outcome", "boundary-crossing", 4, modality),
    feature("e:b:outcome", "entity:b", "outcome", "boundary-crossing", 5, modality),
    feature("e:c:outcome", "entity:c", "outcome", "boundary-crossing", 6, modality),

    // Nonmembers are observed later too, but do not show the consequence.
    feature("e:d:later", "entity:d", "later_observation", "present", 4, modality),
    feature("e:e:later", "entity:e", "later_observation", "present", 5, modality),
    feature("e:f:later", "entity:f", "later_observation", "present", 6, modality),
  ];
}

test("shared structure alone nominates but does not earn Kind", () => {
  const entries = [
    feature("a:s", "entity:a", "shape", "round", 1),
    feature("b:s", "entity:b", "shape", "round", 2),
    feature("c:s", "entity:c", "shape", "round", 3),
    feature("d:s", "entity:d", "shape", "square", 1),
    feature("e:s", "entity:e", "shape", "square", 1),
    feature("f:s", "entity:f", "shape", "square", 1),
  ];
  const index = createKindInductionIndex(entries);
  assert.equal(snapshotKindState(index).length, 0);
  assert.ok(kindDiagnostics(index).selectorNominations >= 2);
  assert.ok(kindDiagnostics(index).withheldNoConsequence >= 1);
});

test("a recurring invariant earns Kind only when it changes held-out consequences", () => {
  const index = createKindInductionIndex(earnedFixture());
  const kinds = snapshotKindState(index);
  const kind = kinds.find((item) => item.standing === "earned_invariant" && item.selector?.value === "accelerating");
  assert.ok(kind, "accelerating entities should earn an invariant Kind");
  assert.equal(kind.terrain, "Kind");
  assert.equal(kind.witnessed, false, "the projection is not a new historical witness");
  assert.equal(kind.materiality.makesDifference, true);
  assert.equal(kind.consequence.value, "boundary-crossing");
  assert.deepEqual(kind.fitMemberRefs, ["entity:a", "entity:b"]);
  assert.deepEqual(kind.holdoutMemberRefs, ["entity:c"]);
  assert.deepEqual(kind.validation.holdoutSupportRefs, ["entity:c"]);
  assert.equal(kind.validation.memberRate, 1);
  assert.equal(kind.validation.nonMemberRate, 0);
  assert.ok(kind.validation.pValue <= 0.05);
});

test("the exact same Kind kernel reads audio, video, data, and sensor evidence", () => {
  for (const modality of ["audio", "video", "data", "sensor"]) {
    const kind = snapshotKindState(createKindInductionIndex(earnedFixture(modality)))
      .find((item) => item.standing === "earned_invariant" && item.selector?.value === "accelerating");
    assert.ok(kind, `${modality} should earn the same structural Kind`);
    assert.deepEqual(kind.modalities, [modality]);
    assert.equal(kind.basis, "shared_entity_structure_with_held_out_consequence");
  }
});

test("explicit source classification is received Kind evidence, not an EO operation", () => {
  const explicit = kindEvidence({
    id: "kind-evidence:explicit:student",
    entityRef: "entity:victor",
    evidenceType: "explicit_classification",
    kindKey: "kind-surface:student",
    kindSurface: "student",
    sequencePosition: 7,
    witness: "text:7:0",
    provenance: { modality: "text", giver: "lang/en", basis: "explicit_copular_predicate_nominal" },
  });
  assert.equal(explicit.terrain, undefined);
  assert.equal(explicit.eo, undefined);
  const kind = snapshotKindState(createKindInductionIndex([explicit]))[0];
  assert.equal(kind.terrain, "Kind");
  assert.equal(kind.standing, "received_explicit_classification");
  assert.deepEqual(kind.memberRefs, ["entity:victor"]);
  assert.equal(kind.witnessed, false);
});

test("Kind projection is present-tense Fold state and unlocks all three Pattern moves", () => {
  const entries = earnedFixture("data");
  const observation = Object.freeze({
    schema: "Observation@1",
    id: "obs:kinds",
    witness: "fixture",
    anchor: Object.freeze({ start: 0, end: 1 }),
    distinctions: Object.freeze([]),
    hyperedges: Object.freeze([]),
    graphEntries: Object.freeze(entries),
  });
  const fold = applyObservation(receivedGround(), observation);
  const orientation = deriveOrientation(fold);
  assert.ok(orientation.terrainCounts.Kind >= 1);
  assert.ok(orientation.activeKinds.some((item) => item.standing === "earned_invariant"));
  const moves = reasoningAffordances(orientation).filter((move) => move.address.terrain === "Kind");
  assert.equal(moves.length, 3);
  assert.deepEqual(moves.map((move) => move.address.stance).sort(), ["Composing", "Tracing", "Unraveling"].sort());
});

test("incremental indexing can earn a Kind only after the consequential future arrives", () => {
  const all = earnedFixture();
  const selectors = all.filter((entry) => !String(entry.id).includes(":outcome") && !String(entry.id).includes(":later"));
  const futures = all.filter((entry) => !selectors.includes(entry));
  const index = createKindInductionIndex(selectors);
  assert.equal(snapshotKindState(index).filter((item) => item.standing === "earned_invariant").length, 0);
  indexKindEntries(index, futures);
  assert.ok(snapshotKindState(index).some((item) => item.standing === "earned_invariant"));
});
