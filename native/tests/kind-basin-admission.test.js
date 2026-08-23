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

function basinCandidate() {
  return Object.freeze({
    schema: "EOKindCandidate@1",
    id: "candidate:basin:accelerating",
    kindKey: "kind:basin:accelerating",
    standing: "structural_kind_hypothesis",
    witnessed: false,
    admissible: false,
    memberRefs: Object.freeze(["entity:a", "entity:b", "entity:c"]),
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

test("a stable interaction basin is only admitted after later experience makes it consequential", () => {
  const index = fixtureIndex();
  index.add("entity:a", 'trajectory="accelerating"', { key: "trajectory", value: "accelerating", at: 1 });
  index.add("entity:b", 'trajectory="accelerating"', { key: "trajectory", value: "accelerating", at: 2 });
  index.add("entity:c", 'trajectory="accelerating"', { key: "trajectory", value: "accelerating", at: 3 });
  for (const ref of ["entity:d", "entity:e", "entity:f"]) {
    index.add(ref, 'trajectory="steady"', { key: "trajectory", value: "steady", at: 1 });
  }

  const ledger = createKindBasinAdmissionLedger();
  assert.deepEqual(ledger.observe([basinCandidate()], index, 3), []);
  assert.equal(ledger.snapshot().length, 0, "affinity alone cannot mint Kind");

  index.add("entity:a", 'outcome="boundary-crossing"', { key: "outcome", value: "boundary-crossing", at: 4 });
  index.add("entity:b", 'outcome="boundary-crossing"', { key: "outcome", value: "boundary-crossing", at: 5 });
  index.add("entity:c", 'outcome="boundary-crossing"', { key: "outcome", value: "boundary-crossing", at: 6 });
  index.add("entity:d", 'later="present"', { key: "later", value: "present", at: 4 });
  index.add("entity:e", 'later="present"', { key: "later", value: "present", at: 5 });
  index.add("entity:f", 'later="present"', { key: "later", value: "present", at: 6 });

  const admitted = ledger.observe([basinCandidate()], index, 6);
  assert.equal(admitted.length, 1);
  assert.equal(admitted[0].terrain, "Kind");
  assert.equal(admitted[0].standing, "earned_invariant");
  assert.equal(admitted[0].mechanism, "interaction_affinity_basin");
  assert.equal(admitted[0].materiality.makesDifference, true);
  assert.equal(admitted[0].validation.method, "prospective_basin_ablation");
  assert.equal(admitted[0].validation.memberRate, 1);
  assert.equal(admitted[0].validation.nonMemberRate, 0);
  assert.ok(admitted[0].validation.pValue <= 0.05);
  assert.equal(admitted[0].consequence.value, "boundary-crossing");

  assert.deepEqual(ledger.observe([basinCandidate()], index, 7), [], "INS(Kind) is a one-time phase transition");
  assert.equal(ledger.snapshot().length, 1);
});

test("fallback or unstable basins remain hypotheses even when later features differ", () => {
  const index = fixtureIndex();
  for (const ref of ["entity:a", "entity:b", "entity:c"] ) {
    index.add(ref, 'trajectory="accelerating"', { key: "trajectory", value: "accelerating", at: 1 });
    index.add(ref, 'outcome="boundary-crossing"', { key: "outcome", value: "boundary-crossing", at: 5 });
  }
  for (const ref of ["entity:d", "entity:e", "entity:f"]) index.add(ref, 'later="present"', { key: "later", value: "present", at: 5 });

  const ledger = createKindBasinAdmissionLedger();
  const unstable = Object.freeze({ ...basinCandidate(), field: Object.freeze({ ...basinCandidate().field, stable: false }) });
  const fallback = Object.freeze({ ...basinCandidate(), fallbackNomination: true });
  assert.deepEqual(ledger.observe([unstable, fallback], index, 3), []);
  assert.deepEqual(ledger.observe([unstable, fallback], index, 6), []);
  assert.equal(ledger.snapshot().length, 0);
});
