import test from "node:test";
import assert from "node:assert/strict";
import { createCausalTextPerceiver } from "../adapters/text/recursive.js";

const relationPosPrior = Object.freeze({
  schema: "POSPrior@1",
  language: "eng",
  provenance: Object.freeze({ source: "fixture-pos" }),
  forms: Object.freeze({
    seized: Object.freeze({ VERB: 10 }),
  }),
});

const monster = Object.freeze({
  schema: "EOReferent@1",
  id: "ref:monster",
  surfaces: Object.freeze(["the monster"]),
  supportRefs: Object.freeze(["discourse-link:monster"]),
  standing: "provisional",
  provenance: Object.freeze({
    giver: "text/discourse-referents::projectDiscourseReferents",
    basis: "explicit apposition fixture",
  }),
});

const encounter = Object.freeze({
  schema: "Encounter@1",
  modality: "text",
  source: "fixture",
  sequencePosition: 1,
  anchor: Object.freeze({ start: 0, end: 22 }),
  material: "The monster seized me.",
});

const orientationWithMonster = Object.freeze({
  schema: "EOOrientation@1",
  terrainState: Object.freeze({ Entity: Object.freeze([monster]) }),
  activeReferents: Object.freeze([]),
  activeTasks: Object.freeze([]),
});

test("prior Fold referent can focus lexical relation perception without global verb recurrence", async () => {
  const perceiver = createCausalTextPerceiver({ minRelationSurfaces: 2, relationPosPrior });
  const [candidate] = await perceiver.perceive(encounter, orientationWithMonster);
  assert.ok(candidate);
  assert.deepEqual(candidate.nominationCause, ["bottom_up_difference", "fold_conditioned_attention"]);
  assert.equal(candidate.candidate.hyperedges.length, 1);
  const edge = candidate.candidate.hyperedges[0];
  assert.equal(edge.relation, "seized");
  assert.equal(edge.meta.attention, "fold_conditioned_referent");
  assert.equal(edge.participants[0].standing, "unresolved_surface");
  const binding = candidate.candidate.distinctions.find((item) => item.kind === "occurrence_binding")?.binding;
  assert.equal(binding?.schema, "EODefiniteBinding@1");
  assert.equal(binding?.referent, monster.id);
});

test("attention alone cannot invent a relation without an already-earned referent", async () => {
  const perceiver = createCausalTextPerceiver({ minRelationSurfaces: 2, relationPosPrior });
  const result = await perceiver.perceive(encounter, Object.freeze({ schema: "EOOrientation@1", activeTasks: Object.freeze([]) }));
  assert.deepEqual(result, []);
});

test("Fold attention stays closed when no giver-named POS prior is supplied", async () => {
  const perceiver = createCausalTextPerceiver({ minRelationSurfaces: 2 });
  const result = await perceiver.perceive(encounter, orientationWithMonster);
  assert.deepEqual(result, []);
});
