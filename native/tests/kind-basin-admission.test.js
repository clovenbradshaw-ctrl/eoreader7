import test from "node:test";
import assert from "node:assert/strict";
import { createKindBasinAdmissionLedger } from "../kernel/index.js";

function featureRecord({ key, value, firstAt, id, witness }) {
  return {
    featureKey: key,
    featureValue: value,
    firstAt,
    lastAt: firstAt,
    evidenceIds: new Set([id]),
    witnessRefs: new Set([witness]),
  };
}

function fixtureIndex() {
  const entityFeatures = new Map();
  const latestAtByEntity = new Map();
  const evidenceById = new Map();
  const add = (entityRef, signature, { key, value, at }) => {
    const id = `e:${entityRef}:${key}:${at}`;
    const witness = `w:${entityRef}:${at}`;
    if (!entityFeatures.has(entityRef)) entityFeatures.set(entityRef, new Map());
    entityFeatures.get(entityRef).set(signature, featureRecord({ key, value, firstAt: at, id, witness }));
    latestAtByEntity.set(entityRef, Math.max(latestAtByEntity.get(entityRef) ?? -Infinity, at));
    evidenceById.set(id, { id, witness, witnessRefs: [witness], provenance: { modality: "sensor" } });
  };
  return { entityFeatures, latestAtByEntity, evidenceById, add };
}

function basinCandidate(memberRefs = ["entity:a", "entity:b", "entity:c"]) {
  return Object.freeze({
    schema: "EOKindCandidate@1",
    id: `candidate:basin:accelerating:${memberRefs.join(":")}`,
    kindKey: "kind:basin:accelerating",
    standing: "structural_kind_hypothesis",
    witnessed: false,
    admissible: false,
    memberRefs: Object.freeze([...memberRefs]),
    structuralSignatures: Object.freeze(['trajectory="accelerating"']),
    evidenceRefs: Object.freeze(["e:entity:a:trajectory:1", "e:entity:b:trajectory:2", "e:entity:c:trajectory:3"]),
    field: Object.freeze({
      model: "weighted_relational_affinity",
      stable: true,
      bindingEnergy: 0.42,
      internalAffinity: 0.71,
      boundaryAffinity: 0.29,
    }),
  });
}

function seedTrajectory(index) {
  index.add("entity:a", 'trajectory="accelerating"', { key: "trajectory", value: "accelerating", at: 1 });
  index.add("entity:b", 'trajectory="accelerating"', { key: "trajectory", value: "accelerating", at: 2 });
  index.add("entity:c", 'trajectory="accelerating"', { key: "trajectory", value: "accelerating", at: 3 });
  for (const ref of ["entity:d", "entity:e", "entity:f"]) {
    index.add(ref, 'trajectory="steady"', { key: "trajectory", value: "steady", at: 1 });
  }
}

function addConsequences(index, start = 5) {
  index.add("entity:a", 'outcome="boundary-crossing"', { key: "outcome", value: "boundary-crossing", at: start });
  index.add("entity:b", 'outcome="boundary-crossing"', { key: "outcome", value: "boundary-crossing", at: start + 1 });
  index.add("entity:c", 'outcome="boundary-crossing"', { key: "outcome", value: "boundary-crossing", at: start + 2 });
  index.add("entity:d", 'later="present"', { key: "later", value: "present", at: start });
  index.add("entity:e", 'later="present"', { key: "later", value: "present", at: start + 1 });
  index.add("entity:f", 'later="present"', { key: "later", value: "present", at: start + 2 });
}

test("a Kind basin must persist before later experience can make it consequential", () => {
  const index = fixtureIndex();
  seedTrajectory(index);
  const ledger = createKindBasinAdmissionLedger();

  assert.deepEqual(ledger.observe([basinCandidate()], index, 3), []);
  assert.equal(ledger.snapshot().length, 0, "one statistically stable snapshot cannot mint Kind");
  assert.equal(ledger.diagnostics().tracked[0].stableSightings, 1);

  assert.deepEqual(ledger.observe([basinCandidate()], index, 4), []);
  assert.equal(ledger.diagnostics().tracked[0].stableSightings, 2, "re-observation establishes metastability");

  addConsequences(index, 5);
  const admitted = ledger.observe([basinCandidate()], index, 7);
  assert.equal(admitted.length, 1);
  assert.equal(admitted[0].terrain, "Kind");
  assert.equal(admitted[0].standing, "earned_invariant");
  assert.equal(admitted[0].mechanism, "interaction_affinity_basin");
  assert.equal(admitted[0].materiality.makesDifference, true);
  assert.equal(admitted[0].validation.method, "prospective_metastable_basin_ablation");
  assert.ok(admitted[0].validation.stableSightings >= 2);
  assert.equal(admitted[0].validation.minimumMembershipRetention, 1);
  assert.equal(admitted[0].validation.memberRate, 1);
  assert.equal(admitted[0].validation.nonMemberRate, 0);
  assert.ok(admitted[0].validation.pValue <= 0.05);
  assert.equal(admitted[0].consequence.value, "boundary-crossing");

  assert.deepEqual(ledger.observe([basinCandidate()], index, 8), [], "INS(Kind) is a one-time phase transition");
  assert.equal(ledger.snapshot().length, 1);
});

test("a dissolving basin resets its causal formation horizon instead of inheriting old evidence", () => {
  const index = fixtureIndex();
  seedTrajectory(index);
  const ledger = createKindBasinAdmissionLedger({ minMembershipRetention: 0.75 });
  ledger.observe([basinCandidate()], index, 3);
  ledger.observe([basinCandidate()], index, 4);
  assert.equal(ledger.diagnostics().tracked[0].formedAt, 3);
  assert.equal(ledger.diagnostics().tracked[0].stableSightings, 2);

  // Only two of the original three members survive: retention 2/3 < .75.
  const perturbed = basinCandidate(["entity:a", "entity:b", "entity:x"]);
  assert.deepEqual(ledger.observe([perturbed], index, 5), []);
  const reset = ledger.diagnostics().tracked[0];
  assert.equal(reset.formedAt, 5);
  assert.equal(reset.stableSightings, 1);
  assert.deepEqual(reset.memberRefs, ["entity:a", "entity:b", "entity:x"]);

  // Consequences that follow the old basin but precede renewed metastability
  // cannot immediately admit the reset basin.
  addConsequences(index, 6);
  assert.deepEqual(ledger.observe([perturbed], index, 8), []);
  assert.equal(ledger.snapshot().length, 0);
});

test("fallback or unstable basins remain hypotheses even when later features differ", () => {
  const index = fixtureIndex();
  seedTrajectory(index);
  addConsequences(index, 5);

  const ledger = createKindBasinAdmissionLedger();
  const unstable = Object.freeze({ ...basinCandidate(), field: Object.freeze({ ...basinCandidate().field, stable: false }) });
  const fallback = Object.freeze({ ...basinCandidate(), fallbackNomination: true });
  assert.deepEqual(ledger.observe([unstable, fallback], index, 3), []);
  assert.deepEqual(ledger.observe([unstable, fallback], index, 7), []);
  assert.equal(ledger.snapshot().length, 0);
});
