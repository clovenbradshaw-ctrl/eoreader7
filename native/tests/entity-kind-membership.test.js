import test from "node:test";
import assert from "node:assert/strict";
import { createKindInductionIndex, indexKindEntries, kindEvidence } from "../kernel/kind-induction.js";
import { induceEntityKindCandidates, testKindMembers } from "../kernel/entity-kind-induction.js";

// ── fixture: a planted cohesive cluster inside a scattered population ──────
//
// Ground truth by construction (the falsification-probe discipline: declare
// it BEFORE the run). Four entities (e1..e4) share three distinctive
// interaction channels; eight background entities (b1..b8) carry channels
// that recur in at most two entities each, unsystematically. Every entity
// also shares one COMMON channel (medium=water) so the field's
// common-channel downweighting is genuinely exercised, not vacuous.
//
// Built through the REAL index path (createKindInductionIndex +
// indexKindEntries + kindEvidence), never a hand-typed Map — the same
// entityFeatures shape kind-induction.js itself hands to the inducer at
// its own call site.
function plantedIndex() {
  const index = createKindInductionIndex();
  const entries = [];
  let seq = 0;
  const feat = (entityRef, featureKey, featureValue) => {
    seq += 1;
    entries.push(kindEvidence({
      id: `ev-${seq}`,
      entityRef,
      featureKey,
      featureValue,
      sequencePosition: seq,
      witness: `w-${seq}`,
    }));
  };
  const cluster = ["e1", "e2", "e3", "e4"];
  for (const id of cluster) {
    feat(id, "habitat", "reef");
    feat(id, "diet", "plankton");
    feat(id, "locomotion", "jet");
    feat(id, "medium", "water");
  }
  const backgroundFeatures = [
    ["b1", [["habitat", "trench"], ["diet", "detritus"]]],
    ["b2", [["habitat", "shore"], ["locomotion", "crawl"]]],
    ["b3", [["diet", "algae"], ["colour", "red"]]],
    ["b4", [["habitat", "trench"], ["colour", "silver"]]],
    ["b5", [["diet", "detritus"], ["locomotion", "drift"]]],
    ["b6", [["habitat", "shore"], ["colour", "red"]]],
    ["b7", [["diet", "algae"], ["locomotion", "drift"]]],
    ["b8", [["colour", "silver"], ["locomotion", "crawl"]]],
  ];
  for (const [id, feats] of backgroundFeatures) {
    for (const [k, v] of feats) feat(id, k, v);
    feat(id, "medium", "water");
  }
  indexKindEntries(index, entries);
  return index;
}

const OPTS = { permutations: 64, population: "membership-test-pop" };

test("a planted cohesive cluster CLEARS its declared-membership null", () => {
  const index = plantedIndex();
  const result = testKindMembers(index.entityFeatures, ["e1", "e2", "e3", "e4"], OPTS);
  assert.equal(result.refused, undefined, "a measurable declaration is measured, never refused");
  assert.ok(result.energy.bindingEnergy > 0, "the planted cluster binds to itself more than to the boundary");
  assert.equal(result.bindingNull.passed, true, "and that binding survives the random-subset null");
  assert.equal(result.cleared, true);
  assert.equal(result.bindingNull.protocol.name, "random-subset-binding-energy");
  assert.equal(result.bindingNull.protocol.iterations, 64, "draws are the caller's declared number, echoed");
  assert.equal(result.populationCount, 12);
});

test("a scattered declared membership FAILS the same null — a verdict, not a refusal", () => {
  const index = plantedIndex();
  const result = testKindMembers(index.entityFeatures, ["e1", "b3", "b5", "b7"], OPTS);
  assert.equal(result.refused, undefined, "failing is a measurement; refusal is reserved for unmeasurable declarations");
  assert.equal(result.cleared, false, "a mixed set does not clear");
  assert.equal(typeof result.bindingNull.pValue, "number", "the null actually ran and reported");
});

test("unknown members are refused by name, never silently dropped", () => {
  const index = plantedIndex();
  const result = testKindMembers(index.entityFeatures, ["e1", "ghost", "phantom"], OPTS);
  assert.equal(result.refused.type, "unknown_members");
  assert.deepEqual(result.refused.unknown, ["ghost", "phantom"]);
  assert.equal(result.cleared, undefined, "a refusal carries no verdict");
});

test("a single declared member is refused under_powered — no internal pair exists", () => {
  const index = plantedIndex();
  const result = testKindMembers(index.entityFeatures, ["e1"], OPTS);
  assert.equal(result.refused.type, "under_powered");
  assert.equal(result.refused.floor, 2);
});

test("members covering the whole population are refused no_boundary — the null cannot perturb", () => {
  const index = plantedIndex();
  const everyone = ["e1", "e2", "e3", "e4", "b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8"];
  const result = testKindMembers(index.entityFeatures, everyone, OPTS);
  assert.equal(result.refused.type, "no_boundary");
  assert.equal(result.refused.populationCount, 12);
});

test("the declared test AGREES with the inducer's own discovery on the same field", () => {
  // Cross-organ agreement: induceEntityKindCandidates finds the planted
  // basin on its own; handing that discovered membership back to
  // testKindMembers clears — one field, two doors, one answer.
  const index = plantedIndex();
  const induced = induceEntityKindCandidates(index.entityFeatures, {
    permutations: 64,
    population: "membership-test-pop",
  });
  const found = induced.candidates.find((c) =>
    ["e1", "e2", "e3", "e4"].every((id) => c.memberRefs.includes(id)));
  assert.ok(found, "the inducer discovers the planted basin unaided");
  const declared = testKindMembers(index.entityFeatures, [...found.memberRefs], OPTS);
  assert.equal(declared.cleared, true, "the declared-membership door confirms the induced basin");
});

test("the seeded null is deterministic — identical declarations, identical measurement", () => {
  const index = plantedIndex();
  const a = testKindMembers(index.entityFeatures, ["e1", "e2", "e3", "e4"], OPTS);
  const b = testKindMembers(index.entityFeatures, ["e1", "e2", "e3", "e4"], OPTS);
  assert.deepEqual(a.bindingNull, b.bindingNull);
  assert.deepEqual(a.energy, b.energy);
});
