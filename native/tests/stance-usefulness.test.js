import test from "node:test";
import assert from "node:assert/strict";
import { stanceMathematicalAction } from "../kernel/stance-math.js";
import { reasoningAffordances } from "../kernel/reasoning.js";

const cases = [
  {
    name: "surface similarity is not enough to bind Entity identity",
    address: { mode:"Relate", domain:"Existence", grain:"Figure", terrain:"Entity", stance:"Binding", op:"SIG" },
    proofs: ["figure_endpoints_addressed"],
    expectedGrounded: false,
  },
  {
    name: "proof-relevant identity may ground Entity binding",
    address: { mode:"Relate", domain:"Existence", grain:"Figure", terrain:"Entity", stance:"Binding", op:"SIG" },
    proofs: ["figure_endpoints_addressed","relation_supported","identity_not_inferred_from_similarity"],
    expectedGrounded: true,
  },
  {
    name: "two links do not by themselves license Network composition",
    address: { mode:"Generate", domain:"Structure", grain:"Pattern", terrain:"Network", stance:"Composing", op:"SYN" },
    proofs: ["components_addressed","composition_law_named"],
    expectedGrounded: false,
  },
  {
    name: "closure plus prospective grounding can ground Network composition action",
    address: { mode:"Generate", domain:"Structure", grain:"Pattern", terrain:"Network", stance:"Composing", op:"SYN" },
    proofs: ["components_addressed","composition_law_named","closure_or_failure_reported","candidate_requires_prospective_grounding"],
    expectedGrounded: true,
  },
  {
    name: "shared Pattern grain does not license unsupported Paradigm tracing",
    address: { mode:"Relate", domain:"Interpretation", grain:"Pattern", terrain:"Paradigm", stance:"Tracing", op:"EVA" },
    proofs: ["patterns_addressed"],
    expectedGrounded: false,
  },
  {
    name: "supported invariant correspondence can ground Paradigm tracing action",
    address: { mode:"Relate", domain:"Interpretation", grain:"Pattern", terrain:"Paradigm", stance:"Tracing", op:"EVA" },
    proofs: ["patterns_addressed","correspondence_supported","preserved_or_changed_invariants_reported"],
    expectedGrounded: true,
  },
  {
    name: "co-presence alone does not establish Field transport",
    address: { mode:"Relate", domain:"Structure", grain:"Ground", terrain:"Field", stance:"Tending", op:"CON" },
    proofs: ["ground_endpoints_addressed"],
    expectedGrounded: false,
  },
  {
    name: "supported coupling with a named transport law can ground Field tending action",
    address: { mode:"Relate", domain:"Structure", grain:"Ground", terrain:"Field", stance:"Tending", op:"CON" },
    proofs: ["ground_endpoints_addressed","coupling_supported","transport_law_named"],
    expectedGrounded: true,
  },
];

const score = (decisions) => {
  let tp=0, tn=0, fp=0, fn=0;
  for (let i=0; i<cases.length; i++) {
    const predicted = decisions[i], actual = cases[i].expectedGrounded;
    if (predicted && actual) tp++;
    else if (!predicted && !actual) tn++;
    else if (predicted && !actual) fp++;
    else fn++;
  }
  return { tp, tn, fp, fn, accuracy:(tp+tn)/cases.length, precision: tp/(tp+fp || 1) };
};

test("stance mathematics is useful: proof obligations eliminate mode-only false positives on adversarial actions", () => {
  // A terrain+mode-only affordance says all eight actions are possible. It has
  // no mathematical criterion by which to distinguish the four under-grounded
  // proposals from the four supported ones.
  const modeOnly = cases.map(() => true);
  const withStanceMath = cases.map((fixture, i) => stanceMathematicalAction({
    id:`usefulness:${i}`,
    address:fixture.address,
    inputRefs:[`input:${i}`],
    proofs:fixture.proofs,
    rule:"fixture",
  }).complete);

  const baseline = score(modeOnly);
  const stance = score(withStanceMath);

  assert.deepEqual(baseline, { tp:4, tn:0, fp:4, fn:0, accuracy:0.5, precision:0.5 });
  assert.deepEqual(stance, { tp:4, tn:4, fp:0, fn:0, accuracy:1, precision:1 });
  assert.ok(stance.accuracy > baseline.accuracy);
  assert.ok(stance.precision > baseline.precision);
});

test("stance mathematics adds non-equivalent mathematical work to the same live Network without removing any move", () => {
  const affordances = reasoningAffordances({ terrainState:{ Network:[{id:"network:triangle"}] } });
  assert.equal(affordances.length, 3);

  const families = new Set(affordances.map((a) => a.mathematicalFamily));
  assert.deepEqual([...families].sort(), ["composition_closure","factorization","invariant_correspondence"]);

  const obligations = affordances.map((a) => a.proofObligations.join("|"));
  assert.equal(new Set(obligations).size, 3);
  assert.ok(affordances.every((a) => a.witnessed === false));
});

test("the usefulness comes from selective refusal, not from making fewer reasoning possibilities available", () => {
  const orientation = {
    terrainState: {
      Entity:[{id:"entity:1"}],
      Field:[{id:"field:1"}],
      Network:[{id:"network:1"}],
      Paradigm:[{id:"paradigm:1"}],
    },
  };
  const affordances = reasoningAffordances(orientation);
  assert.equal(affordances.length, 12); // all three modes remain available per terrain
  assert.equal(affordances.filter((a) => a.move === "distinguish").length, 4);
  assert.equal(affordances.filter((a) => a.move === "relate").length, 4);
  assert.equal(affordances.filter((a) => a.move === "generate").length, 4);
  assert.ok(affordances.every((a) => a.mathematicalContract?.standing === "contract"));
});
