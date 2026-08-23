import test from "node:test";
import assert from "node:assert/strict";
import { descriptorOccurrence, directDescriptorOccurrences, descriptorHypotheses } from "../adapters/text/individuation.js";

test("pronouns never become referent occurrences", () => {
  for (const surface of ["I", "it", "he", "she", "they", "you", "who"]) {
    const occ = descriptorOccurrence({ standing: "unresolved_surface", surface, role: "subject" }, { encounterRef: "e:1" });
    assert.equal(occ, null, surface);
  }
});

test("relation descriptors require determiner evidence", () => {
  const good = descriptorOccurrence({ standing: "unresolved_surface", surface: "the creature", occurrence: "occ:1", role: "subject" }, { encounterRef: "e:1", edge: { id: "edge:1", relation: "entered" } });
  assert.equal(good?.schema, "EOReferentOccurrence@1");
  assert.equal(good?.determination, "definite");
  for (const surface of ["old man", "young girl", "when I", "have been", "borne away", "fiend"]) {
    assert.equal(descriptorOccurrence({ standing: "unresolved_surface", surface }, { encounterRef: "e:1" }), null, surface);
  }
});

test("direct witness detects determiner descriptions without relation extraction", () => {
  const found = directDescriptorOccurrences("I saw the creature beside my father. The creature fled from this place.", { encounterRef: "e:1" });
  assert.ok(found.some((x) => x.canonicalSurface === "the creature"));
  assert.ok(found.some((x) => x.canonicalSurface === "my father"));
  assert.ok(found.some((x) => x.canonicalSurface === "this place"));
  assert.ok(found.every((x) => !x.canonicalSurface.includes(" i")));
});

test("one-off descriptors remain occurrences, not identity hypotheses", () => {
  const [occ] = directDescriptorOccurrences("The creature entered.", { encounterRef: "e:1" });
  assert.equal(occ?.schema, "EOReferentOccurrence@1");
  assert.deepEqual(descriptorHypotheses([occ]), []);
});

test("recurrence opens an identity hypothesis without proving sameness", () => {
  const [a] = directDescriptorOccurrences("The creature entered.", { encounterRef: "e:1" });
  const [b] = directDescriptorOccurrences("The creature vanished.", { encounterRef: "e:2" });
  const [hypothesis] = descriptorHypotheses([a, b]);
  assert.equal(hypothesis?.schema, "EOIdentityHypothesis@1");
  assert.equal(hypothesis?.standing, "live_hypothesis");
  assert.equal(hypothesis?.surface, "the creature");
  assert.equal(hypothesis?.occurrenceRefs.length, 2);
  assert.equal(hypothesis?.encounterRefs.length, 2);
  assert.notEqual(hypothesis?.schema, "EOReferent@1");
});
