import test from "node:test";
import assert from "node:assert/strict";
import {
  descriptorOccurrence,
  directDescriptorOccurrences,
  descriptorHypotheses,
} from "../adapters/text/individuation.js";
import {
  appositionalDescriptorBindings,
  demonstrativeSuccessionBindings,
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
  const [referent] = projectDiscourseReferents([...binding.occurrences, ...binding.links]);
  assert.deepEqual(new Set(referent.surfaces), new Set(["the wretch", "the monster"]));
});

test("demonstrative succession binds only from one unambiguous prior definite", () => {
  const prior = directDescriptorOccurrences(
    "The creature whom I had left in my apartment might still be there, alive and walking about.",
    { encounterRef: "e:678" },
  );
  const current = directDescriptorOccurrences(
    "I dreaded to behold this monster, but I feared still more that Henry should see him.",
    { encounterRef: "e:679" },
  );
  const binding = demonstrativeSuccessionBindings({ priorOccurrences: prior, currentOccurrences: current, witness: "w:679" });
  assert.equal(binding.links.length, 1);
  const [referent] = projectDiscourseReferents([...prior, ...current, ...binding.links]);
  assert.deepEqual(new Set(referent.surfaces), new Set(["the creature", "this monster"]));
});

test("demonstrative succession abstains when two prior definites compete", () => {
  const prior = directDescriptorOccurrences(
    "The creature watched the stranger while my apartment remained open.",
    { encounterRef: "e:1" },
  );
  const current = directDescriptorOccurrences("This monster moved.", { encounterRef: "e:2" });
  const binding = demonstrativeSuccessionBindings({ priorOccurrences: prior, currentOccurrences: current, witness: "w:2" });
  assert.equal(binding.links.length, 0);
});

test("later female creature occurrence is not pulled into an earlier discourse cluster", () => {
  const binding = appositionalDescriptorBindings(
    "I beheld the wretch—the miserable monster whom I had created.",
    { encounterRef: "e:640", witness: "w:640" },
  );
  const later = directDescriptorOccurrences(
    "The wretch saw me destroy the creature on whose future existence he depended.",
    { encounterRef: "e:2436" },
  );
  const creature = later.find((x) => x.canonicalSurface === "the creature");
  const [referent] = projectDiscourseReferents([...binding.occurrences, ...binding.links, ...later]);
  assert.ok(referent.occurrenceRefs.every((id) => id !== creature.id));
  assert.ok(!referent.surfaces.includes("the creature"));
});
