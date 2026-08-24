import test from "node:test";
import assert from "node:assert/strict";
import {
  structuralFieldGeometry,
  relationNetworkComponents,
  interpretiveParadigmModels,
} from "../kernel/terrain-math.js";
import { hyperedge } from "../kernel/hypergraph.js";

function edge(id, relation, refs) {
  return hyperedge({
    id,
    relation,
    witness: `w:${id}`,
    scope: { sequencePosition: 1 },
    participants: refs.map((ref, i) => ({ ref, role: i === 0 ? "subject" : "object", standing: "referent" })),
  });
}

function obligation(id, ground, kind, { openedAt = 1, alternatives = [] } = {}) {
  return Object.freeze({
    schema: "EOObligation@1",
    id,
    status: "open",
    openedAt,
    persistence: 0,
    grounds: Object.freeze([ground]),
    alternatives: Object.freeze(alternatives),
    consequences: Object.freeze([{ kind, edge: ground }]),
    distinction: Object.freeze({
      target: ground,
      materiality: Object.freeze({
        makesDifference: true,
        reasons: Object.freeze([{ kind: "live_dependent_projection" }]),
      }),
    }),
  });
}

test("Field diagnostic distinguishes uncoupled co-presence from shared incidence", () => {
  const uncoupled = structuralFieldGeometry([
    edge("e:a", "saw", ["ref:a", "ref:b"]),
    edge("e:b", "entered", ["ref:c", "ref:d"]),
  ]);
  const coupled = structuralFieldGeometry([
    edge("e:c", "saw", ["ref:a", "ref:b"]),
    edge("e:d", "entered", ["ref:a", "ref:d"]),
  ]);
  assert.equal(uncoupled.standing, "discrete_field_diagnostic");
  assert.equal(uncoupled.incidenceEnergy, 0);
  assert.equal(uncoupled.couplingDensity, 0);
  assert.ok(coupled.incidenceEnergy > 0);
  assert.ok(coupled.couplingDensity > uncoupled.couplingDensity);
});

test("Network diagnostic returns connected components rather than one star per referent", () => {
  const edges = [
    edge("e:1", "knows", ["ref:a", "ref:b"]),
    edge("e:2", "knows", ["ref:b", "ref:c"]),
    edge("e:3", "knows", ["ref:c", "ref:a"]),
    edge("e:4", "sees", ["ref:x", "ref:y"]),
  ];
  const refs = new Map(edges.map((item) => [item.id, new Set(item.participants.map((p) => p.ref))]));
  const networks = relationNetworkComponents(edges, refs);
  assert.equal(networks.length, 1, "the isolated one-link component is not Pattern-grain Network");
  assert.deepEqual(networks[0].edgeRefs, ["e:1", "e:2", "e:3"]);
  assert.deepEqual(networks[0].referentRefs, ["ref:a", "ref:b", "ref:c"]);
  assert.equal(networks[0].cycleRank, 1);
  assert.equal(networks[0].topology, "cyclic");
  assert.equal(networks[0].standing, "incidence_topology_diagnostic");
});

test("retrospective Paradigm diagnostic requires explanatory compression over independent grounds", () => {
  const repeated = [
    obligation("o:1", "edge:a", "identity"),
    obligation("o:2", "edge:b", "identity"),
    obligation("o:3", "edge:c", "identity"),
  ];
  const models = interpretiveParadigmModels(repeated);
  assert.equal(models.length, 1);
  assert.equal(models[0].standing, "retrospective_paradigm_candidate");
  assert.equal(models[0].memberCount, 3);
  assert.equal(models[0].groundRefs.length, 3);
  assert.ok(models[0].compressionGain > 0);

  const noIndependentGround = interpretiveParadigmModels([
    obligation("o:4", "edge:a", "identity"),
    obligation("o:5", "edge:a", "identity"),
    obligation("o:6", "edge:a", "identity"),
  ]);
  assert.equal(noIndependentGround.length, 0);
});
