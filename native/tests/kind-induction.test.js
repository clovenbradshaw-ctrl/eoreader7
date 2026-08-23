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
  hyperedge,
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

function selectorFixture(modality = "sensor") {
  return [
    feature("e:a:selector", "entity:a", "trajectory", "accelerating", 1, modality),
    feature("e:b:selector", "entity:b", "trajectory", "accelerating", 2, modality),
    feature("e:c:selector", "entity:c", "trajectory", "accelerating", 3, modality),
    feature("e:d:selector", "entity:d", "trajectory", "steady", 1, modality),
    feature("e:e:selector", "entity:e", "trajectory", "steady", 1, modality),
    feature("e:f:selector", "entity:f", "trajectory", "steady", 1, modality),
    feature("e:a:outcome", "entity:a", "outcome", "boundary-crossing", 4, modality),
    feature("e:b:outcome", "entity:b", "outcome", "boundary-crossing", 5, modality),
    feature("e:c:outcome", "entity:c", "outcome", "boundary-crossing", 6, modality),
    feature("e:d:later", "entity:d", "later_observation", "present", 4, modality),
    feature("e:e:later", "entity:e", "later_observation", "present", 5, modality),
    feature("e:f:later", "entity:f", "later_observation", "present", 6, modality),
  ];
}

test("shared structure nominates but cannot itself earn Kind", () => {
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
  const diagnostics = kindDiagnostics(index);
  assert.ok(diagnostics.selectorNominations >= 2);
  assert.equal(diagnostics.selectorAdmission, "disabled_by_default");
  assert.equal(diagnostics.earnedKinds, 0);
});

test("even a predictive single feature remains diagnostic rather than ontology by default", () => {
  const index = createKindInductionIndex(selectorFixture());
  const diagnostics = kindDiagnostics(index);
  assert.ok(diagnostics.selectorNominations > 0);
  assert.equal(diagnostics.selectorAdmission, "disabled_by_default");
  assert.equal(snapshotKindState(index).filter((item) => item.standing === "earned_invariant").length, 0);
});

test("legacy single-selector consequence math remains explicit opt-in diagnostic compatibility", () => {
  const index = createKindInductionIndex(selectorFixture(), { legacySelectorAdmission: true });
  const kinds = snapshotKindState(index);
  const kind = kinds.find((item) => item.standing === "earned_invariant" && item.selector?.value === "accelerating");
  assert.ok(kind);
  assert.equal(kind.terrain, "Kind");
  assert.equal(kind.witnessed, false);
  assert.equal(kind.materiality.makesDifference, true);
  assert.equal(kind.consequence.value, "boundary-crossing");
  assert.deepEqual(kind.fitMemberRefs, ["entity:a", "entity:b"]);
  assert.deepEqual(kind.holdoutMemberRefs, ["entity:c"]);
  assert.deepEqual(kind.validation.holdoutSupportRefs, ["entity:c"]);
  assert.equal(kind.validation.memberRate, 1);
  assert.equal(kind.validation.nonMemberRate, 0);
  assert.ok(kind.validation.pValue <= 0.05);
  assert.equal(kind.basis, "legacy_single_selector_with_held_out_consequence");
  assert.equal(kindDiagnostics(index).selectorAdmission, "legacy_opt_in");
});

test("legacy selector diagnostic remains modality-blind without becoming the canonical Kind mechanism", () => {
  for (const modality of ["audio", "video", "data", "sensor"]) {
    const kind = snapshotKindState(createKindInductionIndex(selectorFixture(modality), { legacySelectorAdmission: true }))
      .find((item) => item.standing === "earned_invariant" && item.selector?.value === "accelerating");
    assert.ok(kind, `${modality} should produce the same diagnostic result`);
    assert.deepEqual(kind.modalities, [modality]);
    assert.equal(kind.basis, "legacy_single_selector_with_held_out_consequence");
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

test("a present Kind projection unlocks all three Pattern moves without requiring selector admission", () => {
  const explicit = kindEvidence({
    id: "kind-evidence:explicit:student:orientation",
    entityRef: "entity:victor",
    evidenceType: "explicit_classification",
    kindKey: "kind-surface:student",
    kindSurface: "student",
    sequencePosition: 1,
    witness: "fixture:student",
    provenance: { modality: "data", giver: "fixture", basis: "explicit_classification" },
  });
  const observation = Object.freeze({
    schema: "Observation@1",
    id: "obs:kinds",
    witness: "fixture",
    anchor: Object.freeze({ start: 0, end: 1 }),
    distinctions: Object.freeze([]),
    hyperedges: Object.freeze([]),
    graphEntries: Object.freeze([explicit]),
  });
  const fold = applyObservation(receivedGround(), observation);
  const orientation = deriveOrientation(fold);
  assert.ok(orientation.terrainCounts.Kind >= 1);
  assert.ok(orientation.activeKinds.some((item) => item.standing === "received_explicit_classification"));
  const moves = reasoningAffordances(orientation).filter((move) => move.address.terrain === "Kind");
  assert.equal(moves.length, 3);
  assert.deepEqual(moves.map((move) => move.address.stance).sort(), ["Composing", "Tracing", "Unraveling"].sort());
});

test("legacy selector diagnostic can still be indexed prospectively when explicitly requested", () => {
  const all = selectorFixture();
  const selectors = all.filter((entry) => !String(entry.id).includes(":outcome") && !String(entry.id).includes(":later"));
  const futures = all.filter((entry) => !selectors.includes(entry));
  const index = createKindInductionIndex(selectors, { legacySelectorAdmission: true });
  assert.equal(snapshotKindState(index).filter((item) => item.standing === "earned_invariant").length, 0);
  indexKindEntries(index, futures);
  assert.ok(snapshotKindState(index).some((item) => item.standing === "earned_invariant"));
});

test("witnessed hyperedge roles become modality-blind Kind structure without new semantic witness", () => {
  const edge = hyperedge({
    id: "edge:fixture:1",
    relation: "crossed",
    participants: [
      { ref: "entity:a", role: "subject", standing: "referent" },
      { ref: "entity:b", role: "object", standing: "referent" },
    ],
    witness: "fixture:edge:1",
    scope: { sequencePosition: 1 },
    meta: { modality: "video" },
  });
  const index = createKindInductionIndex([edge]);
  const subject = index.entityFeatures.get("entity:a")?.get('relation_role="subject"');
  const object = index.entityFeatures.get("entity:b")?.get('relation_role="object"');
  assert.ok(subject);
  assert.ok(object);
  assert.equal(index.evidenceById.get("kind-evidence:graph-role:edge:fixture:1:0")?.witness, "fixture:edge:1");
  assert.equal(index.evidenceById.get("kind-evidence:graph-role:edge:fixture:1:0")?.provenance?.basis, "witnessed_hyperedge_role");
  assert.equal(snapshotKindState(index).filter((item) => item.standing === "earned_invariant").length, 0, "one edge cannot mint a Kind");
});
