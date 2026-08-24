import test from "node:test";
import assert from "node:assert/strict";
import {
  receivedGround,
  applyObservation,
  deriveOrientation,
  reasoningAffordances,
  createEmergentTerrainIndex,
  indexEmergentTerrainEntries,
  snapshotEmergentTerrainState,
  createKindInductionIndex,
  snapshotKindState,
} from "../kernel/index.js";
import { hyperedge } from "../kernel/hypergraph.js";
import { explicitKindAssertions } from "../adapters/text/kind-assertions.js";
import { createCausalTextPerceiver } from "../adapters/text/recursive.js";

const POS = Object.freeze({
  schema: "POSPrior@1",
  language: "eng",
  forms: Object.freeze({
    student: Object.freeze({ NOUN: 10 }),
    scientist: Object.freeze({ NOUN: 9, ADJ: 1 }),
    was: Object.freeze({ AUX: 10 }),
    met: Object.freeze({ VERB: 10 }),
  }),
  provenance: Object.freeze({ source: "fixture/ud-pos" }),
});

const victor = Object.freeze({ schema: "EOReferent@1", id: "ref:victor", surfaces: Object.freeze(["Victor"]) });

function materialObligation(id, ground) {
  return Object.freeze({
    schema: "EOObligation@1",
    id,
    status: "open",
    grounds: Object.freeze([ground]),
    alternatives: Object.freeze([]),
    consequences: Object.freeze([{ kind: "relation_attribution", edge: ground }]),
    distinction: Object.freeze({
      target: ground,
      relation: "identity",
      materiality: Object.freeze({ makesDifference: true, reasons: Object.freeze([{ kind: "live_dependent_projection" }]) }),
    }),
  });
}

test("explicit classifications and indefinite nominals witness Kind evidence; bare recurrence does not", () => {
  const yes = explicitKindAssertions("Victor was a student.", { sequencePosition: 7, referents: [victor], posPrior: POS });
  assert.equal(yes.length, 2, "copular membership and the indefinite nominal are two witnessed grounds");
  assert.ok(yes.every((entry) => entry.schema === "EOKindEvidence@1"));
  assert.ok(yes.every((entry) => entry.evidenceType === "explicit_classification"));
  assert.ok(yes.every((entry) => entry.terrain === undefined && entry.eo === undefined));
  const victorMembership = yes.find((entry) => entry.entityRef === victor.id);
  const possibleInstance = yes.find((entry) => entry.provenance?.basis === "indefinite_nominal_instantiation");
  assert.ok(victorMembership);
  assert.ok(possibleInstance?.entityRef.startsWith("possible-instance:text:"));
  assert.equal(victorMembership.kindSurface, "student");
  assert.equal(victorMembership.provenance.giver, "lang/en");
  assert.equal(victorMembership.provenance.posPrior, "fixture/ud-pos");

  const projection = snapshotKindState(createKindInductionIndex(yes));
  assert.equal(projection.length, 1);
  assert.equal(projection[0].terrain, "Kind");
  assert.equal(projection[0].standing, "received_explicit_classification");
  assert.equal(projection[0].kindSurface, "student");

  const encountered = explicitKindAssertions("Victor met a student.", { sequencePosition: 8, referents: [victor], posPrior: POS });
  assert.equal(encountered.length, 1, "indefinite nominal names the repeatable form without classifying Victor");
  assert.notEqual(encountered[0].entityRef, victor.id);
  assert.equal(encountered[0].provenance.basis, "indefinite_nominal_instantiation");
  assert.equal(explicitKindAssertions("Victor, Victor, student, student.", { sequencePosition: 9, referents: [victor], posPrior: POS }).length, 0);
});

test("recursive text perception carries explicit classification as evidence, not terrain fact", async () => {
  const perceiver = createCausalTextPerceiver({ relationPosPrior: POS });
  const text = "Victor was a student.";
  const candidates = await perceiver.perceive({ modality: "text", material: text, sequencePosition: 0, anchor: { start: 0, end: text.length }, source: "fixture" }, {
    terrainState: { Entity: [victor] },
    activeReferents: [], activeTasks: [], receivedPriors: [],
  });
  assert.equal(candidates.length, 1);
  const evidence = candidates[0].candidate.graphEntries.find((entry) => entry.schema === "EOKindEvidence@1" && entry.evidenceType === "explicit_classification");
  assert.ok(evidence);
  assert.equal(evidence.terrain, undefined);
});

test("co-present witnessed links project Field and connected referent topology projects Network", () => {
  const edgeA = hyperedge({
    id: "edge:a", relation: "saw", witness: "fixture:a", scope: { sequencePosition: 1 }, eo: { op: "CON", grain: "Figure" },
    participants: [{ ref: victor.id, standing: "referent", role: "subject" }, { ref: "occ:a", standing: "unresolved_surface", role: "object" }],
  });
  const edgeB = hyperedge({
    id: "edge:b", relation: "entered", witness: "fixture:b", scope: { sequencePosition: 1 }, eo: { op: "CON", grain: "Figure" },
    participants: [{ ref: victor.id, standing: "referent", role: "subject" }, { ref: "occ:b", standing: "unresolved_surface", role: "object" }],
  });
  const observation = Object.freeze({ schema: "Observation@1", id: "obs:network", witness: "fixture", anchor: { start: 0, end: 1 }, distinctions: [], hyperedges: [edgeA, edgeB], graphEntries: [victor] });
  const fold = applyObservation(receivedGround(), observation);
  const orientation = deriveOrientation(fold);

  assert.equal(orientation.terrainCounts.Field, 1);
  assert.equal(orientation.terrainCounts.Network, 1);
  assert.deepEqual([...orientation.terrainState.Field[0].edgeRefs].sort(), ["edge:a", "edge:b"]);
  assert.deepEqual(orientation.terrainState.Network[0].referentRefs, [victor.id]);
  assert.deepEqual([...orientation.terrainState.Network[0].edgeRefs].sort(), ["edge:a", "edge:b"]);
  assert.equal(orientation.terrainState.Network[0].topology.topology, "acyclic");
  assert.equal(orientation.terrainState.Network[0].topology.cycleRank, 0);
  assert.equal(orientation.terrainState.Field[0].witnessed, false);
  assert.equal(orientation.terrainState.Network[0].witnessed, false);

  const networkMoves = reasoningAffordances(orientation).filter((move) => move.address.terrain === "Network");
  assert.equal(networkMoves.length, 3);
  assert.ok(networkMoves.every((move) => move.stanceContinuity === false));
});

test("incremental Network topology honors a later binding without rewriting raw witness", () => {
  const edgeA = hyperedge({
    id: "edge:bound:a", relation: "saw", witness: "fixture:bound:a", scope: { sequencePosition: 2 }, eo: { op: "CON", grain: "Figure" },
    participants: [{ ref: victor.id, standing: "referent", role: "subject" }, { ref: "occ:other", standing: "unresolved_surface", role: "object" }],
  });
  const edgeB = hyperedge({
    id: "edge:bound:b", relation: "entered", witness: "fixture:bound:b", scope: { sequencePosition: 3 }, eo: { op: "CON", grain: "Figure" },
    participants: [{ ref: "occ:he", occurrence: "occ:he", standing: "unresolved_surface", role: "subject", surface: "he" }, { ref: "occ:room", standing: "unresolved_surface", role: "object" }],
  });
  const index = createEmergentTerrainIndex([edgeA, edgeB]);
  assert.equal(snapshotEmergentTerrainState(index).Network.length, 0);
  const binding = Object.freeze({ schema: "EOPronounBinding@1", id: "binding:he-victor", occurrence: "occ:he", referent: victor.id, standing: "provisional" });
  indexEmergentTerrainEntries(index, [binding]);
  const state = snapshotEmergentTerrainState(index);
  assert.equal(state.Network.length, 1);
  assert.deepEqual(state.Network[0].referentRefs, [victor.id]);
  assert.deepEqual([...state.Network[0].edgeRefs].sort(), [edgeA.id, edgeB.id].sort());
  assert.equal(edgeB.participants[0].standing, "unresolved_surface");
  assert.equal(edgeB.participants[0].ref, "occ:he");
});

test("material unresolved interpretation projects Atmosphere; only compressive independent lenses project Paradigm", () => {
  const obligations = [
    materialObligation("obligation:identity:a", "edge:a"),
    materialObligation("obligation:identity:b", "edge:b"),
    materialObligation("obligation:identity:c", "edge:c"),
  ];
  const fold = receivedGround({ obligations });
  const orientation = deriveOrientation(fold);
  assert.equal(orientation.terrainCounts.Atmosphere, 1);
  assert.equal(orientation.terrainCounts.Paradigm, 1);
  assert.deepEqual([...orientation.terrainState.Atmosphere[0].obligationRefs].sort(), obligations.map((item) => item.id).sort());
  const atmosphere = orientation.terrainState.Atmosphere[0].field;
  assert.equal(atmosphere.model, "interpretive_constraint_factor_graph");
  assert.equal(atmosphere.factorCount, 3);
  assert.equal(atmosphere.tensionAvailable, false, "material unresolved structure is real even when conflict magnitude is not identifiable");
  assert.equal(atmosphere.tension, null);
  assert.equal(orientation.terrainState.Paradigm[0].groundRefs.length, 3);
  assert.ok(orientation.terrainState.Paradigm[0].model.compressionGain > 0);
});

test("two trivial repetitions do not yet earn Paradigm because they do not compress", () => {
  const obligations = [
    Object.freeze({ ...materialObligation("obligation:identity:a", "edge:a"), distinction: Object.freeze({ materiality: Object.freeze({ makesDifference: true }) }) }),
    Object.freeze({ ...materialObligation("obligation:identity:b", "edge:b"), distinction: Object.freeze({ materiality: Object.freeze({ makesDifference: true }) }) }),
  ];
  const orientation = deriveOrientation(receivedGround({ obligations }));
  assert.equal(orientation.terrainCounts.Atmosphere, 1);
  assert.equal(orientation.terrainCounts?.Paradigm ?? 0, 0);
});

test("recurrence without material consequence cannot bootstrap Atmosphere or Paradigm", () => {
  const fold = receivedGround({ obligations: [
    { ...materialObligation("obligation:identity:a", "edge:a"), distinction: { materiality: { makesDifference: false } } },
    { ...materialObligation("obligation:identity:b", "edge:b"), distinction: { materiality: { makesDifference: false } } },
  ] });
  const orientation = deriveOrientation(fold);
  assert.equal(orientation.terrainCounts?.Atmosphere ?? 0, 0);
  assert.equal(orientation.terrainCounts?.Paradigm ?? 0, 0);
});
