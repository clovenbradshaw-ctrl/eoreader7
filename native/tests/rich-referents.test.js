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

// ── the singleton-partner rescue ────────────────────────────────────────
import { extractSurfaces as xs2, discoverReferents as dr2 } from "../adapters/text/surfaces.js";

const corpus = (lines) => lines.map((text, i) => ({ text, order: i }));
const refIdOf = (events, surface) => events.find((e) => e.type === "DEF.admit" && e.surface === surface)?.referent_id;

test("singleton-partner rescue: a bare family name with ONE evidence-worthy bearer merges; two bearers stay split — the Princess wall holds", () => {
  // Clerval-shaped, at fixture scale: the fence is DECLARED (2 — a derived
  // fence needs corpus-scale spread and this is a unit fixture, exactly the
  // case genericTokens' own header names) and 'marlowe' is made generic the
  // way 'clerval' really was: junk one-off surfaces ("Chapter Marlowe")
  // give it phantom partners, while its EVIDENCE-WORTHY partner is Edmund
  // alone. The rescue must read the floor-filtered partners, not the raw
  // ones — that distinction is the fix.
  // Names sit MID-sentence throughout: a sentence-initial capital is
  // position, not identity, and extractSurfaces rightly refuses it.
  const one = [
    "That winter Edmund Marlowe rode out early past the mill and the weir gate.",
    "By then Edmund Marlowe kept his ledger closed against the cold all season.",
    "At last Edmund Marlowe answered the summons before the frost had left the glass.",
    "See the notes in Chapter Marlowe for the weir accounts.",
    "They still called him Old Marlowe at the mill.",
    "At dusk Marlowe returned by the marsh road and said nothing of the weir.",
    "For a while Marlowe stood at the gate before knocking at the mill door.",
    "That night Marlowe wrote two letters and burned the second one unread.",
    "Down the road Kate watched. Near the mill Kate waited. All month Kate counted the days.",
  ];
  const a = dr2(xs2(corpus(one), {}), { minPartners: 2, minSentences: 1 });
  const bare = refIdOf(a.events, "Marlowe");
  const full = refIdOf(a.events, "Edmund Marlowe");
  assert.ok(bare && full, "both surfaces must actually be admitted — a vacuous fixture pins nothing");
  assert.equal(bare, full, "one evidence-worthy partner in the whole corpus = one possible bearer (S9: low sets possible)");

  // Princess-shaped: 'vane' is equally generic, but TWO evidence-worthy
  // bearers exist — bare 'Vane' has two possible referents and must merge
  // with neither.
  const many = [
    "By the window Mary Vane sat with her letters and her maps of the coast.",
    "Twice over Mary Vane read the tide tables and marked the third crossing out.",
    "Before dark Mary Vane sealed the answer as the lamp burned down.",
    "In the hall Helena Vane argued about the coast and the letters again.",
    "Even so Helena Vane would not sign, and said so before the fire died.",
    "Overnight Helena Vane left the map unrolled across the long table.",
    "See the appendix to Chapter Vane for the tide accounts.",
    "At the coast house Vane was expected before the letters arrived that night.",
    "In the end Vane never came, and the tide tables stayed open.",
  ];
  const b = dr2(xs2(corpus(many), {}), { minPartners: 2, minSentences: 1 });
  const vane = refIdOf(b.events, "Vane");
  const mary = refIdOf(b.events, "Mary Vane");
  const helena = refIdOf(b.events, "Helena Vane");
  assert.ok(vane && mary && helena, "all three surfaces admitted — the wall is actually exercised");
  assert.notEqual(vane, mary, "two possible bearers — the rescue must not fire");
  assert.notEqual(vane, helena, "two possible bearers — the rescue must not fire");
});
