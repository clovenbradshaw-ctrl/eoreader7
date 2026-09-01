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

// ── the witnessed merge: transitivity through a compound surface ────────
//
// Found by the-fold's MHC battery (order 5, Nominal — POLICIES.md P44
// there): on both Wikipedia fixtures the fold gathered 23/24 and 10/12 of
// the pairs its own individuation rule calls one being, and every miss was
// one shape — a bare token stranded while the compound containing it merged
// with the OTHER bare token first. `Mikhail Kutuzov` corefers with BOTH
// `Mikhail` and `Kutuzov`; the assignment loop took the first match and
// broke, so which single-token form stranded was decided by scan order.
// "Is the same being as" is transitive; a greedy first-match closure over
// the pairwise rule is not. The compound surface is a WITNESS that the two
// groups co-name one being, and the fix merges exactly on that witness —
// never on chained pairwise similarity alone.
test("a compound surface coreferent with two prior referents witnesses them as one being", () => {
  const lines = [
    "That morning General Kutuzov rode past the mill and said nothing of it.",
    "By noon staff found Kutuzov at the weir gate reading the dispatches twice.",
    "Later still Kutuzov signed the order and sent the rider south at dusk.",
    "At the council Kutuzov spoke last and briefly, as was his habit.",
    "The elder Mikhail kept his own counsel through the first reading.",
    "Old friends called Mikhail stubborn long before the war made it useful.",
    "They said Mikhail would not move the army for any letter from court.",
    "The full name Mikhail Kutuzov appeared once on the order of the day.",
    "Clerks wrote Mikhail Kutuzov again beneath the seal before it was sent.",
    "Down the road Kate watched. Near the mill Kate waited. All month Kate counted the days.",
  ];
  const d = dr2(xs2(corpus(lines), {}), { minPartners: 2, minSentences: 1 });
  const bare1 = refIdOf(d.events, "Mikhail");
  const bare2 = refIdOf(d.events, "Kutuzov");
  const full = refIdOf(d.events, "Mikhail Kutuzov");
  assert.ok(bare1 && bare2 && full, "all three surfaces must actually be admitted — a vacuous fixture pins nothing");
  assert.equal(bare1, full, "the compound gathers its first-name form");
  assert.equal(bare2, full, "the compound gathers its surname form — the stranding this test exists for");
});

test("the witnessed merge never crosses the ambiguity wall: two bearers of one first name stay apart", () => {
  // The Princess/Vane wall, first-name-shaped, and the case that makes blind
  // union-find (and the OLD match-any-member scan) wrong: before the
  // witnessed-merge fix, this exact fixture put BOTH compounds in ONE
  // referent — two generals merged through a bare first name sitting at
  // (not above) the generic fence, whenever the bare form was assigned
  // first. The wall this test pins is bearer separation. Where the bare
  // fragment lands is order-dependent by construction — the pairwise
  // relation here (M~MK, M~MB, MK≁MB) admits NO violation-free partition,
  // and {M,MK},{MB} is a minimal-violation reading; revising it when the
  // second bearer arrives is revision.js's work, not this loop's — so this
  // test deliberately does not pin the fragment.
  const lines = [
    "At dawn Mikhail Kutuzov read the first dispatch beside the map table.",
    "By evening Mikhail Kutuzov had signed nothing and said less than that.",
    "Meanwhile Mikhail Barclay argued for the withdrawal along the north road.",
    "In the council Mikhail Barclay stood alone against the older marshals.",
    "Some said Mikhail favoured caution above any glory the court could offer.",
    "Others said Mikhail had already chosen and would not be moved from it.",
    "Down the road Kate watched. Near the mill Kate waited. All month Kate counted the days.",
  ];
  const d = dr2(xs2(corpus(lines), {}), { minPartners: 2, minSentences: 1 });
  const kutuzov = refIdOf(d.events, "Mikhail Kutuzov");
  const barclay = refIdOf(d.events, "Mikhail Barclay");
  assert.ok(kutuzov && barclay, "both bearers must actually be admitted");
  assert.notEqual(kutuzov, barclay, "two bearers never merge through their shared first name");
});

test("a bare fragment matching two established bearers is a typed gap with candidates, never a third being", () => {
  // The subset direction of the witness rule, landed at the right LAYER.
  // Bare "Mikhail" corefers with the maximal evidence of BOTH established
  // bearers and contains neither — the type level can say exactly that and
  // no more. Admitting it as its own referent would assert a third being
  // that does not exist; joining either group would guess. So admission is
  // WITHHELD and the form lands as an `ambiguous_surface` gap naming its
  // candidates — each of its MENTIONS is an occurrence-level question for
  // the activation machinery (the same recall resolvePronouns performs),
  // never this loop's to answer. (Before the fix, first-match-break
  // silently handed the whole form to whichever group the scan reached
  // first.)
  const lines = [
    "At dawn Mikhail Kutuzov read the first dispatch beside the map table.",
    "By evening Mikhail Kutuzov had signed nothing and said less than that.",
    "At last Mikhail Kutuzov chose the older road and the longer delay.",
    "Meanwhile Mikhail Barclay argued for the withdrawal along the north road.",
    "In the council Mikhail Barclay stood alone against the older marshals.",
    "By autumn Mikhail Barclay had ceded the command without one word more.",
    "Some said Mikhail favoured caution above any glory the court could offer.",
    "Others said Mikhail had already chosen and would not be moved from it.",
    "Down the road Kate watched. Near the mill Kate waited. All month Kate counted the days.",
  ];
  const d = dr2(xs2(corpus(lines), {}), { minPartners: 2, minSentences: 1 });
  const kutuzov = refIdOf(d.events, "Mikhail Kutuzov");
  const barclay = refIdOf(d.events, "Mikhail Barclay");
  assert.ok(kutuzov && barclay, "both bearers must actually be admitted");
  assert.notEqual(kutuzov, barclay);
  assert.equal(refIdOf(d.events, "Mikhail"), undefined, "an ambiguous form is never admitted as a being");
  const gap = d.gaps.find((g) => g.reason === "ambiguous_surface" && g.surface === "Mikhail");
  assert.ok(gap, "the withholding is a typed gap, not silence");
  assert.deepEqual([...gap.candidates].sort(), [barclay, kutuzov].sort(), "the gap carries exactly the two candidate referents");
  assert.match(gap.detail, /occurrence-level/);
});

// ── the comma-gluing fix: punctuation glued to a token's own edge is a
// hard break, never a name-run continuation ────────────────────────────
//
// Found reading a real fetched "Война и мир" passage: "Пьера, Анна
// Павловна" (an abbé-and-Pierre aside, then a NEW subject introduced by a
// comma) extracted as the single spurious 3-token surface "Пьера Анна
// Павловна" — accumulateSurfaceEvidence's run-walker crossed split(/\s+/)'s
// own token boundary without noticing the comma sat directly against
// "Пьера"'s trailing edge, with no space to separate it from what followed.
// Reproduced identically in English (this fixture) to confirm the defect
// was general, not script-specific, before the fix landed — surfaces.js's
// own accumulateSurfaceEvidence header carries the full account.
test("a comma glued to a capitalised token's own edge is a hard break: two names either side of it never glue into one surface", () => {
  const lines = [
    "In the corner sat Pierre, Anna Pavlovna rose at once to greet him.",
    "Pierre bowed low and Anna Pavlovna smiled behind her fan.",
    "Across the room Pierre caught the eye of Anna Pavlovna once more.",
  ];
  const found = xs2(corpus(lines), {});
  const names = new Set(found.map((s) => s.surface));
  assert.ok(names.has("Anna Pavlovna"), "the real two-word name must still extract");
  assert.ok(names.has("Pierre"), "the real one-word name must still extract");
  assert.ok(!names.has("Pierre Anna"), "the comma must break the run — no glued 2-token surface");
  assert.ok(!names.has("Pierre Anna Pavlovna"), "the comma must break the run — no glued 3-token surface");

  // And at the referent level: two different people never merge into one
  // being through a surface that should never have existed.
  const d = dr2(found, { minPartners: 2, minSentences: 1 });
  assert.equal(refIdOf(d.events, "Pierre Anna"), undefined, "the glued surface is never even offered to the referent loop");
  const pierre = refIdOf(d.events, "Pierre");
  const anna = refIdOf(d.events, "Anna Pavlovna");
  assert.ok(pierre && anna, "both real people must actually be admitted");
  assert.notEqual(pierre, anna, "two different people, correctly never merged");
});

test("plain whitespace between two capitalised tokens is NOT a hard break: an ordinary multi-word name still extracts and merges as one candidate", () => {
  // The fix's necessary complement: hardBreakAfter must fire ONLY when
  // punctuation sits glued directly against a token's own edge, never on
  // the ordinary single space that separates every real multi-word name's
  // own tokens — a regression control so the comma fix above cannot be
  // (mis)generalised into breaking runs on whitespace alone.
  const lines = [
    "Beside the fire sat Natasha Rostova still in her travelling cloak.",
    "Natasha Rostova had not spoken since the letter arrived that morning.",
    "By nightfall Natasha Rostova agreed to everything her father asked.",
  ];
  const found = xs2(corpus(lines), {});
  const names = new Set(found.map((s) => s.surface));
  assert.ok(names.has("Natasha Rostova"), "an ordinary two-word name, whitespace-joined, must still extract whole");
  const d = dr2(found, { minPartners: 2, minSentences: 1 });
  assert.ok(refIdOf(d.events, "Natasha Rostova"), "and must still be admitted as a referent");
});

test("capitalisationIsSignificant uses an exact binomial tail, not a normal approximation: 6-of-7 capitalised is NOT enough evidence at this sample size", () => {
  // The normal approximation (the old CAP_SIG_Z = 1.645 z-bound) called
  // cap=6/lower=1 (n=7) "significant" — pHat 0.857 clears its approximate
  // 0.811 bound. The exact one-sided binomial tail, P(X>=6 | n=7, p=0.5) =
  // 8/128 = 0.0625, sits ABOVE the declared CAP_SIG_ALPHA = 0.05: six-of-
  // seven is real evidence but not enough of it yet, and the old
  // approximation was admitting it anyway — the false-positive class this
  // fix closes.
  const lines = [
    "Beside the fire sat Amber quietly.",
    "By morning Amber had already left the camp.",
    "Everyone agreed Amber was the bravest of them all.",
    "Nobody had seen Amber since the storm passed.",
    "The captain praised Amber for her courage.",
    "Later that day Amber returned with fresh water.",
    "The old necklace was made of amber beads.",
  ];
  const found = xs2(corpus(lines), {});
  const names = new Set(found.map((s) => s.surface));
  assert.ok(!names.has("Amber"), "6 capitalised against 1 lowercase (n=7) is exactly the normal approximation's false positive — the exact test correctly withholds it");
});

test("capitalisationIsSignificant's exact tail still admits genuinely strong evidence: 9-of-10 capitalised clears both the old approximation and the exact test", () => {
  // A positive control alongside the case above: P(X>=9 | n=10, p=0.5) =
  // 11/1024 ≈ 0.0107, comfortably under CAP_SIG_ALPHA — the fix narrows a
  // false positive at low n, it does not make the test harder to pass on
  // real evidence.
  const lines = [
    "Beside the wall stood Halvorsen watching the harbor.",
    "By dusk Halvorsen had crossed the bridge.",
    "Everyone respected Halvorsen for his patience.",
    "Nobody questioned Halvorsen about the plan.",
    "The captain thanked Halvorsen for the warning.",
    "Later that week Halvorsen returned to the fort.",
    "Soon afterward Halvorsen sent another message.",
    "Even now Halvorsen remembers that winter.",
    "Finally the council summoned Halvorsen to explain.",
    "The soldiers used the term halvorsen for the manoeuvre.",
  ];
  const found = xs2(corpus(lines), {});
  const names = new Set(found.map((s) => s.surface));
  assert.ok(names.has("Halvorsen"), "9 capitalised against 1 lowercase (n=10) is strong evidence and must still be admitted");
});

// ── the morphological fold seam: one being stops stranding across its
// case-forms in an inflecting script — the fix the anaphora investigation
// located (the-fold eval/results/anaphora-ru-RESULTS.md). The seam is a
// foldToken injected into namesCorefer/discoverReferents; absent, token
// identity stands and behavior is byte-identical.
import { makeProperNounFold } from "../adapters/text/propernoun-fold.js";
import { namesCorefer as nc } from "../adapters/text/surfaces.js";
import { readFileSync } from "node:fs";

const ru = JSON.parse(readFileSync(new URL("../../../live_priors/derived-priors/propernoun-priors/propernoun-ru.json", import.meta.url), "utf8"));
const ruFold = makeProperNounFold(ru);

test("the fold seam merges one being's case-forms; the ADJ wall holds", () => {
  // The exact mechanism measured on real material: token-identity refuses the
  // pair ("Кутузов" vs "Кутузова" share no orthographic token). An injected
  // fold that maps both onto the same stem makes the containment test pass.
  // The fold supplied here is inline (a Map) — this test pins the MECHANISM,
  // not any one register's coverage (the treebank's coverage is the next
  // test's subject, honestly).
  assert.equal(nc("Кутузов", "Кутузова"), false, "no fold: case forms strand (token identity)");
  const inline = makeProperNounFold({ schema: "ProperNounPrior@1", forms: {
    "кутузов": { lemmas: { "кутузов": 1 } },
    "кутузова": { lemmas: { "кутузов": 1 } },
    "кутузовым": { lemmas: { "кутузов": 1 } },
  } });
  assert.equal(nc("Кутузов", "Кутузова", inline), true, "same lemma folds together (masculine gen)");
  assert.equal(nc("Кутузов", "Кутузовым", inline), true, "same lemma folds together (instrumental)");
  assert.equal(nc("Бородино", "Бородинский", inline), false, "a derived adjective is not in the PROPN fold — the wall holds");
});

test("makeProperNounFold honors the single-lemma/multi-lemma and ADJ contracts on the real register", () => {
  // Москва's case-forms all carry ONE lemma in the treebank -> folded. A
  // form attested under MULTIPLE lemmas -> returned unchanged (strand, never
  // guessed). A derived adjective and any unseen surname -> returned
  // unchanged (absent from the PROPN register). The last two are the honest
  // measure of REGISTER COVERAGE: the fold is only as wide as the prior —
  // the fixture's own central surnames (Кутузов, Бородино, Багратион) are
  // absent from UD_Russian-GSD and strand even folded, exactly as measured.
  assert.equal(ruFold("Москве"), "москва");
  assert.equal(ruFold("Москву"), "москва");
  assert.equal(ruFold("Москвы"), "москва");
  assert.equal(ruFold("Наполеона"), "наполеон");
  assert.equal(ruFold("Кутузов"), "кутузов", "unseen surname stays unfolded (coverage gap, disclosed)");
  assert.equal(ruFold("Бородинский"), "бородинский", "adjective stays unfolded (ADJ wall)");
});

test("the fold unifies a real register's case-forms into one referent end to end", () => {
  // Москва/Mоскве/Mоскву are covered by live_priors' propernoun-ru.json (all
  // map to lemma москва) — a genuine proof that the injected fold reaches
  // discoverReferents
  // and heals the stranding for the forms the register covers. The control
  // run (no fold) strands the same two forms.
  const lines = [
    "Осенью подошли войска к Москве и встали лагерем за городом.",
    "Все дороги к Москве были перекрыты и охранялись днём и ночью.",
    "В Москве граф ждал известий и не находил себе места.",
    "Только из Москвы приходили редкие письма о сражении.",
    "И снова из Москвы не было никаких вестей до самой весны.",
    "К утру Москву оставили последние жители и все службы.",
    "Они так и не вернулись в Москву до самой весны.",
  ];
  const folded = dr2(xs2(corpus(lines), {}), { minPartners: 3, minSentences: 1, foldToken: ruFold });
  const control = dr2(xs2(corpus(lines), {}), { minPartners: 3, minSentences: 1 });
  const foldMoskve = refIdOf(folded.events, "Москве");
  const foldMoskvu = refIdOf(folded.events, "Москву");
  const foldMoskvy = refIdOf(folded.events, "Москвы");
  const ctlMoskve = refIdOf(control.events, "Москве");
  const ctlMoskvu = refIdOf(control.events, "Москву");
  assert.ok(foldMoskve && foldMoskvu && foldMoskvy, "all three case-forms admitted in the folded run");
  assert.equal(foldMoskve, foldMoskvu, "folded: genitive and dative are one place");
  assert.equal(foldMoskve, foldMoskvy, "folded: the genitive spines with them");
  if (ctlMoskve && ctlMoskvu) {
    assert.notEqual(ctlMoskve, ctlMoskvu, "unfolded control: the same two forms strand");
  }
});
