import test from "node:test";
import assert from "node:assert/strict";
import {
  descriptorOccurrence,
  directDescriptorOccurrences,
  descriptorHypotheses,
} from "../adapters/text/individuation.js";
import {
  appositionalDescriptorBindings,
  projectDiscourseReferents,
} from "../adapters/text/discourse-referents.js";

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
});

test("same-surface recurrence earns a hypothesis but not a being", () => {
  const [a] = directDescriptorOccurrences("The creature entered.", { encounterRef: "e:1" });
  const [b] = directDescriptorOccurrences("The creature vanished.", { encounterRef: "e:2" });
  const [hypothesis] = descriptorHypotheses([a, b]);
  assert.equal(hypothesis?.schema, "EOIdentityHypothesis@1");
  assert.equal(hypothesis?.standing, "live_hypothesis");
  assert.deepEqual(projectDiscourseReferents([a, b]), []);
});

test("explicit apposition binds occurrences into a contextual referent", () => {
  const binding = appositionalDescriptorBindings(
    "I beheld the wretch—the miserable monster whom I had created.",
    { encounterRef: "e:640", witness: "w:640" },
  );
  assert.equal(binding.links.length, 1);
  assert.equal(binding.occurrences.length, 2);
  assert.equal(binding.occurrences[0].canonicalSurface, "the wretch");
  assert.equal(binding.occurrences[1].canonicalSurface, "the monster");
  const [referent] = projectDiscourseReferents([...binding.occurrences, ...binding.links]);
  assert.equal(referent?.schema, "EOReferent@1");
  assert.equal(referent?.standing, "provisional");
  assert.deepEqual(new Set(referent.surfaces), new Set(["the wretch", "the monster"]));
});

test("same surface in an unrelated occurrence is not pulled into an appositional cluster", () => {
  const binding = appositionalDescriptorBindings(
    "I beheld the wretch—the miserable monster whom I had created.",
    { encounterRef: "e:640", witness: "w:640" },
  );
  const [femaleCreature] = directDescriptorOccurrences(
    "The wretch saw me destroy the creature on whose future existence he depended.",
    { encounterRef: "e:2436" },
  ).filter((x) => x.canonicalSurface === "the wretch");
  const creature = directDescriptorOccurrences(
    "The wretch saw me destroy the creature on whose future existence he depended.",
    { encounterRef: "e:2436" },
  ).find((x) => x.canonicalSurface === "the creature");
  const [referent] = projectDiscourseReferents([...binding.occurrences, ...binding.links, femaleCreature, creature]);
  assert.ok(referent.occurrenceRefs.every((id) => id !== creature.id));
  assert.ok(!referent.surfaces.includes("the creature"));
});
