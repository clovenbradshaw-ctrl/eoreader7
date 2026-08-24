import test from "node:test";
import assert from "node:assert/strict";
import { createRecursiveReader } from "../kernel/reading.js";
import { hyperedge } from "../kernel/hypergraph.js";
import { executeStanceReasoning } from "../kernel/stance-reasoner.js";

const edge = (id, relation, refs) => hyperedge({
  id,
  relation,
  participants: refs.map((ref, i) => ({ role:i === 0 ? "from" : "to", standing:"referent", ref })),
  witness:`obs:${id}`,
  scope:{ sequencePosition:1 },
});

test("actual recursive reader derives Network consequences and generates grounded-testable motifs with stance math", async () => {
  // Two independently witnessed relation components with the same topological
  // form. These are ordinary Fold graph entries; no Network object is seeded.
  const graphEntries = [
    edge("edge:a1", "supports", ["ref:a", "ref:b"]),
    edge("edge:a2", "supports", ["ref:b", "ref:c"]),
    edge("edge:b1", "contains", ["ref:x", "ref:y"]),
    edge("edge:b2", "contains", ["ref:y", "ref:z"]),
  ];
  const reader = createRecursiveReader({ seed:{ graphEntries } });
  const read = await reader.read([]);

  // The reader itself must earn the Networks from the witnessed Links.
  assert.equal(read.effectiveTerrainState.Network.length, 2);
  assert.ok(read.effectiveTerrainState.Network.every((network) => network.witnessed === false));

  const orientation = {
    terrainState: read.effectiveTerrainState,
    stanceState: read.stanceState,
  };
  const run = executeStanceReasoning(orientation, { terrain:"Network", includeGeneration:true });

  // Unraveling reasons from beta1=0 / acyclicity to a graph-theoretic
  // consequence that was never written into the source Fold.
  const unravel = run.reasoning.filter((item) => item.stance === "Unraveling");
  assert.equal(unravel.length, 2);
  assert.ok(unravel.every((item) => item.standing === "entailed_projection"));
  assert.ok(unravel.every((item) => item.claim.kind === "connected_acyclic_incidence_graph"));
  assert.ok(unravel.every((item) => item.claim.consequence === "unique_simple_incidence_path_between_any_two_vertices"));

  // Tracing compares independently emerged Networks and recognizes that the
  // topological invariants are preserved despite different relation predicates.
  const tracing = run.reasoning.find((item) => item.stance === "Tracing");
  assert.ok(tracing);
  assert.equal(tracing.claim.equivalentAtThisResolution, true);
  assert.equal(tracing.claim.preserved.topologyClass, true);
  assert.equal(tracing.claim.preserved.cycleRank, true);

  // Composing generates a higher-order candidate motif, but the epistemic
  // boundary remains intact: it is not witness and cannot self-admit.
  assert.equal(run.generation.length, 2);
  for (const generated of run.generation) {
    assert.equal(generated.schema, "EOMathematicalGenerationProposal@1");
    assert.equal(generated.proposal.kind, "tree_like_incidence_motif");
    assert.equal(generated.witnessed, false);
    assert.equal(generated.admissible, false);
    assert.equal(generated.admission, "requires_prospective_grounding");
    assert.equal(generated.action.complete, true);
  }

  // Reasoning/generation must not mutate the Fold.
  assert.equal(run.mutatesFold, false);
  assert.deepEqual(reader.getFold(), read.fold);
});
