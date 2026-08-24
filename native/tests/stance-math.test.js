import test from "node:test";
import assert from "node:assert/strict";
import { STANCE_MATHEMATICS, stanceFor, stanceMathematicalContract, stanceMathematicalAction } from "../kernel/stance-math.js";
import { reasoningAffordances } from "../kernel/reasoning.js";

test("all nine stances have distinct mathematical contracts", () => {
  assert.equal(Object.keys(STANCE_MATHEMATICS).length, 9);
  assert.equal(stanceFor("Differentiate", "Ground"), "Clearing");
  assert.equal(stanceFor("Relate", "Figure"), "Binding");
  assert.equal(stanceFor("Generate", "Pattern"), "Composing");
  assert.equal(STANCE_MATHEMATICS.Clearing.family, "refinement");
  assert.equal(STANCE_MATHEMATICS.Binding.family, "morphism_binding");
  assert.equal(STANCE_MATHEMATICS.Composing.family, "composition_closure");
});

test("stance contract is orthogonal to terrain while sharing grain", () => {
  const networkTracing = stanceMathematicalContract({ mode:"Relate", domain:"Structure", grain:"Pattern", terrain:"Network", stance:"Tracing", op:"CON" });
  const paradigmTracing = stanceMathematicalContract({ mode:"Relate", domain:"Interpretation", grain:"Pattern", terrain:"Paradigm", stance:"Tracing", op:"EVA" });
  assert.equal(networkTracing.stance, "Tracing");
  assert.equal(paradigmTracing.stance, "Tracing");
  assert.equal(networkTracing.family, paradigmTracing.family);
  assert.notEqual(networkTracing.terrain, paradigmTracing.terrain);
});

test("stance action never promotes an unproved proposal to witness", () => {
  const proposed = stanceMathematicalAction({
    address:{ mode:"Generate", domain:"Structure", grain:"Pattern", terrain:"Network", stance:"Composing", op:"SYN" },
    inputRefs:["link:a","link:b"], outputRefs:["network:candidate"], rule:"path-composition",
    proofs:["components_addressed","composition_law_named"],
  });
  assert.equal(proposed.complete, false);
  assert.equal(proposed.standing, "proposed_action");
  assert.equal(proposed.witnessed, false);
  assert.equal(proposed.admissible, false);
  assert.deepEqual(proposed.missingProofs, ["closure_or_failure_reported","candidate_requires_prospective_grounding"]);

  const grounded = stanceMathematicalAction({
    address:{ mode:"Relate", domain:"Existence", grain:"Figure", terrain:"Entity", stance:"Binding", op:"SIG" },
    inputRefs:["occ:a","occ:b"], supportRefs:["w:identity"], rule:"identity-proof-path",
    proofs:["figure_endpoints_addressed","relation_supported","identity_not_inferred_from_similarity"],
  });
  assert.equal(grounded.complete, true);
  assert.equal(grounded.standing, "grounded_action");
  assert.equal(grounded.admissible, false);
  assert.equal(grounded.admission, "requires_interrogation");
});

test("reasoning affordances expose stance mathematics for every live terrain address", () => {
  const orientation = {
    terrainState:{ Network:[{id:"network:1"}] },
    stanceState:{ Tracing:[{id:"trace:prior"}] },
  };
  const affordances = reasoningAffordances(orientation);
  assert.equal(affordances.length, 3);
  const byStance = Object.fromEntries(affordances.map((item) => [item.address.stance, item]));
  assert.equal(byStance.Unraveling.mathematicalFamily, "factorization");
  assert.equal(byStance.Tracing.mathematicalFamily, "invariant_correspondence");
  assert.equal(byStance.Composing.mathematicalFamily, "composition_closure");
  assert.equal(byStance.Tracing.stanceContinuity, true);
  assert.equal(byStance.Unraveling.stanceContinuity, false);
  assert.ok(byStance.Composing.proofObligations.includes("composition_law_named"));
  assert.equal(byStance.Composing.mathematicalContract.terrain, "Network");
});
