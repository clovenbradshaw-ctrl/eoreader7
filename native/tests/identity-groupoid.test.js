import test from "node:test";
import assert from "node:assert/strict";
import {
  projectIdentityGroupoid,
  identityProofPath,
  projectIdentityQuotient,
} from "../kernel/index.js";

const occurrence = (id) => Object.freeze({ schema: "EOReferentOccurrence@1", id, standing: "unresolved_identity" });
const referent = (id, occurrenceRefs = [], supportRefs = []) => Object.freeze({ schema: "EOReferent@1", id, occurrenceRefs: Object.freeze(occurrenceRefs), supportRefs: Object.freeze(supportRefs), standing: "provisional" });

test("Entity preserves the witnessed generators by which identity is warranted", () => {
  const a = occurrence("ref-occ:a");
  const b = occurrence("ref-occ:b");
  const victor = referent("ref:victor");
  const discourse = Object.freeze({ schema: "EODiscourseIdentityLink@1", id: "identity:a:b", leftOccurrence: a.id, rightOccurrence: b.id, standing: "supported" });
  const binding = Object.freeze({ schema: "EOPronounBinding@1", id: "binding:b:victor", occurrence: b.id, referent: victor.id, standing: "provisional", supportRefs: Object.freeze(["witness:pronoun"]) });
  const groupoid = projectIdentityGroupoid([a, b, victor, discourse, binding]);

  assert.equal(groupoid.generators.length, 2);
  assert.deepEqual(groupoid.generators.map((edge) => edge.id), [binding.id, discourse.id].sort());
  assert.ok(groupoid.generators.every((edge) => edge.invertible === true));
  assert.equal(groupoid.components.length, 1);

  const proof = identityProofPath(groupoid, a.id, victor.id);
  assert.ok(proof);
  assert.deepEqual(proof.steps.map((step) => step.generatorRef), [discourse.id, binding.id]);
  assert.ok(proof.supportRefs.includes("witness:pronoun"));
  assert.equal(proof.witnessed, false, "composition of witness support is a present derivation, not new witness");
});

test("inverse identity paths preserve which generator was traversed backwards", () => {
  const a = occurrence("ref-occ:a");
  const victor = referent("ref:victor");
  const binding = Object.freeze({ schema: "EOPronounBinding@1", id: "binding:a:victor", occurrence: a.id, referent: victor.id, standing: "provisional" });
  const groupoid = projectIdentityGroupoid([a, victor, binding]);
  const inverse = identityProofPath(groupoid, victor.id, a.id);
  assert.equal(inverse.steps.length, 1);
  assert.equal(inverse.steps[0].generatorRef, binding.id);
  assert.equal(inverse.steps[0].inverse, true);
});

test("unresolved similarity never becomes an identity generator", () => {
  const a = occurrence("ref-occ:a");
  const b = occurrence("ref-occ:b");
  const alternative = Object.freeze({ schema: "EOIdentityAlternative@1", id: "candidate:a:b", left: a.id, right: b.id, standing: "live_hypothesis" });
  const groupoid = projectIdentityGroupoid([a, b, alternative]);
  assert.equal(groupoid.generators.length, 0);
  assert.equal(identityProofPath(groupoid, a.id, b.id), null);
});

test("the historical quotient is now pi0 of the proof-relevant identity groupoid", () => {
  const a = occurrence("ref-occ:a");
  const b = occurrence("ref-occ:b");
  const victor = referent("ref:victor", [a.id], ["witness:name"]);
  const binding = Object.freeze({ schema: "EODefiniteBinding@1", id: "binding:b:victor", occurrence: b.id, referent: victor.id, standing: "provisional" });
  const quotient = projectIdentityQuotient([a, b, victor, binding]);
  assert.equal(quotient.basis, "connected_components_pi0_of_proof_relevant_identity_groupoid");
  assert.equal(quotient.groupoid.schema, "EOIdentityGroupoid@1");
  assert.equal(quotient.classes.length, quotient.groupoid.components.length);
  assert.deepEqual(quotient.classes[0].occurrenceRefs, quotient.groupoid.components[0].occurrenceRefs);
  assert.equal(quotient.classes[0].basis, "pi0_of_warranted_identity_groupoid");
});
