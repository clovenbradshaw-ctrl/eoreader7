import test from "node:test";
import assert from "node:assert/strict";
import {
  receivedGround,
  applyObservation,
  deriveOrientation,
  reasoningAffordances,
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
    distinction: Object.freeze({ materiality: Object.freeze({ makesDifference: true }) }),
  });
}

test("explicit copular classification earns Kind but lexical co-occurrence does not", () => {
  const yes = explicitKindAssertions("Victor was a student.", { sequencePosition: 7, referents: [victor], posPrior: POS });
  assert.equal(yes.length, 1);
  assert.equal(yes[0].terrain, "Kind");
  assert.deepEqual(yes[0].eo, { op: "SIG", grain: "Pattern" });
  assert.equal(yes[0].subject, victor.id);
  assert.equal(yes[0].kindSurface, "student");
  assert.equal(yes[0].provenance.giver, "lang/en");
  assert.equal(yes[0].provenance.posPrior, "fixture/ud-pos");

  assert.equal(explicitKindAssertions("Victor met a student.", { sequencePosition: 8, referents: [victor], posPrior: POS }).length, 0);
  assert.equal(explicitKindAssertions("Victor, Victor, student, student.", { sequencePosition: 9, referents: [victor], posPrior: POS }).length, 0);
});

test("recursive text perception carries earned Kind into witnessed graph entries", async () => {
  const perceiver = createCausalTextPerceiver({ relationPosPrior: POS });
  const text = "Victor was a student.";
  const candidates = await perceiver.perceive({ modality: "text", material: text, sequencePosition: 0, anchor: { start: 0, end: text.length }, source: "fixture" }, {
    terrainState: { Entity: [victor] },
    activeReferents: [], activeTasks: [], receivedPriors: [],
  });
  assert.equal(candidates.length, 1);
  const kind = candidates[0].candidate.graphEntries.find((entry) => entry.schema === "EOKindAssertion@1");
  assert.ok(kind);
  assert.equal(kind.terrain, "Kind");
});

test("co-present witnessed links project Field and earned referent topology projects Network", () => {
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
  assert.deepEqual(orientation.terrainState.Field[0].edgeRefs.sort(), ["edge:a", "edge:b"]);
  assert.equal(orientation.terrainState.Network[0].bridgeRef, victor.id);
  assert.deepEqual(orientation.terrainState.Network[0].edgeRefs.sort(), ["edge:a", "edge:b"]);
  assert.equal(orientation.terrainState.Field[0].witnessed, false);
  assert.equal(orientation.terrainState.Network[0].witnessed, false);

  // Projection of a terrain does not smuggle in a stance. All three moves stay
  // open and none claims continuity merely because a Field/Network emerged.
  const networkMoves = reasoningAffordances(orientation).filter((move) => move.address.terrain === "Network");
  assert.equal(networkMoves.length, 3);
  assert.ok(networkMoves.every((move) => move.stanceContinuity === false));
});

test("material unresolved interpretation projects Atmosphere; repeated independent material lenses project Paradigm", () => {
  const obligations = [
    materialObligation("obligation:identity:a", "edge:a"),
    materialObligation("obligation:identity:b", "edge:b"),
  ];
  const fold = receivedGround({ obligations });
  const orientation = deriveOrientation(fold);
  assert.equal(orientation.terrainCounts.Atmosphere, 1);
  assert.equal(orientation.terrainCounts.Paradigm, 1);
  assert.deepEqual(orientation.terrainState.Atmosphere[0].obligationRefs.sort(), obligations.map((item) => item.id).sort());
  assert.equal(orientation.terrainState.Paradigm[0].pattern, "identity");
  assert.equal(orientation.terrainState.Paradigm[0].groundRefs.length, 2);
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
