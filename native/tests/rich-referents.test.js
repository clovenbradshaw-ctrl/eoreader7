import test from "node:test";
import assert from "node:assert/strict";
import { descriptorOccurrence, descriptorHypotheses } from "../adapters/text/individuation.js";

test("pronouns never become referent occurrences", () => {
  for (const surface of ["I", "it", "he", "she", "they", "you", "who"]) {
    const occ = descriptorOccurrence({ standing: "unresolved_surface", surface, role: "subject" }, { encounterRef: "e:1" });
    assert.equal(occ, null, surface);
  }
});

test("one-off descriptors remain occurrences, not identity hypotheses", () => {
  const occ = descriptorOccurrence({ standing: "unresolved_surface", surface: "the creature", occurrence: "occ:1", role: "subject" }, { encounterRef: "e:1", edge: { id: "edge:1", relation: "entered" } });
  assert.equal(occ?.schema, "EOReferentOccurrence@1");
  assert.equal(occ?.determination, "definite");
  assert.deepEqual(descriptorHypotheses([occ]), []);
});

test("recurrence opens an identity hypothesis without proving sameness", () => {
  const a = descriptorOccurrence({ standing: "unresolved_surface", surface: "the creature", occurrence: "occ:1", role: "subject" }, { encounterRef: "e:1", edge: { id: "edge:1", relation: "entered" } });
  const b = descriptorOccurrence({ standing: "unresolved_surface", surface: "the creature", occurrence: "occ:2", role: "object" }, { encounterRef: "e:2", edge: { id: "edge:2", relation: "saw" } });
  const [hypothesis] = descriptorHypotheses([a, b]);
  assert.equal(hypothesis?.schema, "EOIdentityHypothesis@1");
  assert.equal(hypothesis?.standing, "live_hypothesis");
  assert.equal(hypothesis?.surface, "the creature");
  assert.equal(hypothesis?.occurrenceRefs.length, 2);
  assert.equal(hypothesis?.encounterRefs.length, 2);
  assert.notEqual(hypothesis?.schema, "EOReferent@1");
});

test("bare single-token ambiguity is not promoted without another role signal", () => {
  for (const surface of ["fiend", "life", "true", "overcome", "ice"]) {
    assert.equal(descriptorOccurrence({ standing: "unresolved_surface", surface }, { encounterRef: "e:1" }), null, surface);
  }
});
