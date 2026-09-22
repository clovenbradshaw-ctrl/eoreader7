// essay-fold-falsify.test.mjs — THE FALSIFICATION TIER for the fold (the
// valuation phase of the concrescence, 2026-09-21):
//
//   "the mouth writes wide; the FOLD assembles the wide draft into the
//   asked-for shape. Each distinct claim goes to ONE beat, by its referent
//   signature; duplicates collapse and the loser is KEPT in `refused` with its
//   given; a beat that ends up thin is named `gap`, never silently empty. A
//   run killed at the fold boundary holds a usable outline, not a half-essay."
//
// Each falsification attacks a consequence of that law.
import test from "node:test";
import assert from "node:assert/strict";
import { wideToAtoms, foldWideToShape, foldClaimCore, DEFAULT_ESSAY_BEATS } from "./essay-fold.js";

// THE GROUND every fold test folds against — the wide drafts' sentences must
// be GROUNDED for the fold's re-admission gate to admit them (2026-09-21: the
// fold is the last mechanical door, and an empty ground refuses everything as
// an invented referent). This is the workspace's own material.
const FOLD_GROUND = [
  "The Cumberland River flows 688 miles from its headwaters in eastern Kentucky to the Ohio River at Smithland.",
  "The river drains a basin of about 18,000 square miles across the Cumberland Plateau.",
  "Native American peoples including the Cherokee, Chickasaw, and Shawnee used the Cumberland as a route for trade long before European contact.",
  "The river was named in 1750 by Dr. Thomas Walker for the Duke of Cumberland.",
  "Nashville was founded in 1779 by James Robertson and John Donelson, who traveled the river to reach it.",
  "Steamboats first arrived in Nashville in 1819, making the city a commercial hub for cotton and tobacco.",
  "Major floods in 1927 and 1937 shaped the city's relationship with the river.",
].join(" ");

// ── F1  EACH DISTINCT CLAIM GOES TO EXACTLY ONE BEAT. The fold never copies a
// claim into two beats — a fact is asserted once, where it does the most work.
test("F1 — each distinct claim appears in exactly one beat", () => {
  const wide = [
    "The Cumberland River flows 688 miles from its headwaters in eastern Kentucky to the Ohio River at Smithland.",
    "Native American peoples including the Cherokee used the Cumberland as a route for trade long before European contact.",
    "The river was named in 1750 by Dr. Thomas Walker for the Duke of Cumberland.",
    "Nashville was founded in 1779 by James Robertson and John Donelson, who traveled the river to reach it.",
  ];
  const atoms = wideToAtoms(wide);
  const fold = foldWideToShape(atoms, { beats: DEFAULT_ESSAY_BEATS, ground: FOLD_GROUND });
  const allSentences = fold.beats.flatMap((b) => b.sentences);
  const allCores = allSentences.map((s) => foldClaimCore(s));
  assert.equal(new Set(allCores).size, allCores.length, "no claim-core appears twice across all beats");
  assert.equal(fold.beats.reduce((n, b) => n + b.sentences.length, 0), allSentences.length, "every kept sentence is in exactly one beat");
});

// ── F2  A REPEATED CLAIM COLLAPSES; THE LOSER IS KEPT WITH ITS GIVER. Two
// sections both asserting the same fact must yield one beat sentence, and the
// duplicate must be in `refused` with given "model". The sentences differ only
// in hedge + number-word (the same claim), and in a trailing modifier.
test("F2 — a repeated claim collapses; the loser is kept with its given", () => {
  const wide = [
    "The river drains a basin of about 18,000 square miles across the Cumberland Plateau.",
    "The Cumberland drains roughly eighteen thousand square miles of the interior South.",
    "Steamboats first arrived in Nashville in 1819, making the city a commercial hub.",
  ];
  // F2's own ground — both drain sentences are GROUNDED here (the interior
  // South is in the ground), so the second collapses as a repeated_claim
  // rather than being refused as an invented referent. The test is about the
  // collapse; re-admission must admit it first.
  const F2_GROUND = "The Cumberland River drains a basin of about 18,000 square miles across the Cumberland Plateau. The interior South is the river's basin. Steamboats first arrived in Nashville in 1819, making the city a commercial hub.";
  const atoms = wideToAtoms(wide);
  const fold = foldWideToShape(atoms, { beats: DEFAULT_ESSAY_BEATS, ground: F2_GROUND });
  const drainSentences = fold.beats.flatMap((b) => b.sentences).filter((s) => s.toLowerCase().includes("square miles"));
  assert.equal(drainSentences.length, 1, "the draining claim survives exactly once");
  const refusedDrain = fold.refused.filter((r) => r.reason === "repeated_claim" && (r.sentence ?? "").toLowerCase().includes("square miles"));
  assert.ok(refusedDrain.length >= 1, "the collapsed duplicate is kept in refused");
  assert.equal(refusedDrain[0].giver, "model", "the loser carries its given — the mouth produced it");
});

// ── F3  A BEAT WITH NOTHING IS NAMED `gap`, NEVER SILENTLY EMPTY. If the wide
// draft carries no claim for the tension beat, the fold says so instead of
// pretending the beat exists.
test("F3 — a thin beat is named gap, never silently empty", () => {
  const wide = [
    "The Cumberland River flows 688 miles from eastern Kentucky to the Ohio River at Smithland.",
    "The river drains a basin of about 18,000 square miles.",
    "Native peoples used the river for trade long before European contact.",
    "The river was named in 1750 by Dr. Thomas Walker for the Duke of Cumberland.",
    "Steamboats made Nashville a commercial hub for cotton and tobacco after 1819.",
  ];
  const atoms = wideToAtoms(wide);
  const fold = foldWideToShape(atoms, { beats: DEFAULT_ESSAY_BEATS, ground: FOLD_GROUND });
  const tensionBeat = fold.beats.find((b) => b.title === "The tension");
  assert.ok(tensionBeat, "the tension beat exists in the shape");
  assert.equal(tensionBeat.gap, true, "no flood/danger claim was in the draft — the beat is named gap, not faked");
  assert.equal(tensionBeat.sentences.length, 0, "a gap beat holds no sentences");
});

// ── F4  DETERMINISTIC: the same wide draft over the same beats folds
// identically every time — the fold is a pure function of its inputs.
test("F4 — the fold is deterministic: same wide draft, same beats, same fold", () => {
  const wide = [
    "The river drains a basin of about 18,000 square miles.",
    "Steamboats made Nashville a commercial hub after 1819.",
    "The river was named in 1750 for the Duke of Cumberland.",
    "Major floods in 1927 and 1937 shaped the city's relationship with the river.",
  ];
  const atoms = wideToAtoms(wide);
  const a = foldWideToShape(atoms, { beats: DEFAULT_ESSAY_BEATS, ground: FOLD_GROUND });
  const b = foldWideToShape(atoms, { beats: DEFAULT_ESSAY_BEATS, ground: FOLD_GROUND });
  assert.deepEqual(a.beats.map((x) => x.text), b.beats.map((x) => x.text), "identical beats across two runs");
  assert.equal(a.refused.length, b.refused.length, "identical refusals across two runs");
});

// ── F5  THE WATCHMAKER RULE: the fold returns the beats EVEN when the draft
// is rough or the shape is larger than the content — a run killed at the fold
// boundary holds a usable outline. The beats array is always present, gaps
// named, refusals attributed.
test("F5 — the fold always returns a usable artifact, gaps named", () => {
  const atoms = wideToAtoms(["The river flows through Nashville."]); // one thin sentence
  const fold = foldWideToShape(atoms, { beats: DEFAULT_ESSAY_BEATS, ground: FOLD_GROUND });
  assert.ok(Array.isArray(fold.beats), "beats always present");
  assert.equal(fold.beats.length, DEFAULT_ESSAY_BEATS.length, "the full shape is returned");
  assert.ok(fold.beats.some((b) => b.gap), "thin beats are named gap");
  assert.ok(Array.isArray(fold.refused), "refusals always present");
  assert.ok(fold.register instanceof Set, "the claim registry is present — usable by later phases");
});

// ── F6  THE FOLD IS THE LAST MECHANICAL DOOR (2026-09-21, the "get the essay
// done" pass). A sentence the SECTION snip admitted — because the section's
// moment of ground was smaller — is RE-admitted here against the WHOLE ground:
// an invented referent ("Duke Energy" — the ground has the Duke of Cumberland,
// never Duke Energy), a meta sentence ("The Convention is a subject of
// discussion"), and a HOLLOW-ACTOR sentence ("Bob expects the river to play a
// role" — Bob is a book author in the bibliography, never an actor who
// expects) are all refused at the fold, before anything becomes the essay.
test("F6 — the fold re-admits every sentence against the whole ground", () => {
  const wide = [
    "The river drains a basin of about 18,000 square miles.",
    "The river's significance is further emphasized by the presence of the Duke Energy headquarters.",
    "The Convention is a subject of discussion.",
    "Bob expects the river to play a role in the city's future.",
    "The river was named in 1750 by Dr. Thomas Walker for the Duke of Cumberland.",
  ];
  const F6_GROUND = "The Cumberland River drains a basin of about 18,000 square miles. The river was named in 1750 by Dr. Thomas Walker for the Duke of Cumberland. Bob Duthie (2008), What to Expect Cruising the Cumberland.";
  const atoms = wideToAtoms(wide);
  const fold = foldWideToShape(atoms, { beats: DEFAULT_ESSAY_BEATS, ground: F6_GROUND });
  const reasons = fold.refused.map((r) => r.reason);
  const refusedText = fold.refused.map((r) => r.sentence).join(" ");
  assert.ok(reasons.includes("fold_invented_referent"), "Duke Energy is refused — invented against the whole ground");
  assert.ok(fold.refused.some((r) => r.reason === "fold_invented_referent" && r.sentence.includes("Duke Energy")), "Duke Energy refused by name");
  // The Convention sentence is refused — whether the gate names it an
  // invented referent ("The Convention" is not grounded) or meta ("a subject
  // of discussion"), the sentence does not become the essay. The reason that
  // fires first is a matter of check order; the refusal is the law.
  assert.ok(refusedText.includes("Convention is a subject of discussion"), "the Convention meta sentence is refused (invented referent or meta)");
  // "Bob expects the river to play a role" is refused — the ground knows only
  // "Bob Duthie" the book author, never a bare "Bob" who expects anything, so
  // the invented-referent gate refuses the sentence (the hollow-actor net
  // catches the shape when the name IS fully grounded). Either way it does not
  // become the essay.
  assert.ok(refusedText.includes("Bob expects"), "the hollow-actor sentence refused (invented bare actor, or hollow-actor verb)");
  assert.ok(reasons.includes("hollow_actor") || fold.refused.some((r) => r.sentence.includes("Bob expects") && r.reason === "fold_invented_referent"), "the Bob sentence refused by the invented-referent or hollow-actor gate");
  // The grounded, real sentences survive into beats.
  const beatText = fold.beats.map((b) => b.text).join(" ");
  assert.ok(beatText.includes("Walker") || beatText.includes("Duke of Cumberland"), "the real naming sentence survives");
  assert.ok(beatText.includes("18,000 square miles"), "the real drainage sentence survives");
});
// ── the shape the material declares (2026-09-21) ────────────────────────────
import { beatsFromGround } from "./essay-fold.js";

const BONGO = `The bongo is a forest antelope of central Africa. It has a chestnut coat with white stripes.

Bongos browse at night on leaves and bark. They avoid open ground and keep to dense cover.

Logging has cleared much of the lowland forest. Poaching has cut the eastern population to a few hundred.

Captive herds in zoos now supply animals for release. A reintroduction on Mount Kenya began in 2004.`;

test("THE TABLE IS GONE: a subject that is not a river gets beats of its own", () => {
  const r = beatsFromGround(BONGO);
  assert.equal(r.beats.length, 4, "the material declared four seams");
  const charges = r.beats.map((b) => b.charge).join(" ");
  for (const river of ["waterway", "steamboats", "cotton", "flood", "levy", "riverfront"]) {
    assert.ok(!charges.includes(river), `the old table's word "${river}" reached a bongo's shape`);
  }
  assert.match(r.beats[0].title, /bongo|antelope/);
  assert.match(r.beats[2].title, /logging|poaching|cleared/);
});

test("a charge word belongs to its own seam and to no other", () => {
  const r = beatsFromGround(BONGO);
  const seen = new Map();
  for (const b of r.beats) for (const w of b.charge.split(" ")) seen.set(w, (seen.get(w) ?? 0) + 1);
  for (const [w, n] of seen) assert.equal(n, 1, `"${w}" charges more than one beat — it distinguishes nothing`);
});

test("THE LAW: an unseamed ground yields the ASK's count, and says so", () => {
  const flat = BONGO.replace(/\n\s*\n/g, " ");
  const r = beatsFromGround(flat, { want: 3 });
  assert.equal(r.beats.length, 3, "the ask's count did not set the shape");
  assert.match(r.from, /ask's count/);
  const seamed = beatsFromGround(BONGO, { want: 3 });
  assert.equal(seamed.beats.length, 4, "the ask's count overrode a ground that declared its own seams");
  assert.match(seamed.from, /material's own seams/);
});

test("no ground, no shape — never a default one", () => {
  const r = beatsFromGround("");
  assert.equal(r.beats.length, 0);
  assert.match(r.basis, /no ground/);
});

test("the derived shape still folds: atoms land in the beat their words belong to", () => {
  const r = beatsFromGround(BONGO);
  const atoms = wideToAtoms([
    "Poaching has cut the eastern population to a few hundred animals.",
    "The bongo is a forest antelope with a chestnut coat.",
  ], { ground: BONGO });
  const fold = foldWideToShape(atoms, { beats: r.beats, ground: BONGO });
  const titleOf = (needle) => fold.beats.find((b) => b.text.includes(needle))?.title ?? null;
  assert.match(String(titleOf("Poaching")), /logging|poaching|cleared/);
  assert.match(String(titleOf("forest antelope")), /bongo|antelope/);
});

test("THE SAME CLAIM IN TWO BEATS: a paraphrase bringing no new grounded matter is refused", () => {
  const ground = "Native American peoples including the Cherokee, Chickasaw, and Shawnee used the Cumberland for trade, travel, and settlement long before European contact. Steamboats reached Nashville in 1819 and carried cotton downriver.";
  const atoms = wideToAtoms([
    "Native American peoples including the Cherokee, Chickasaw, and Shawnee used the Cumberland for trade, travel, and settlement.",
    "Native American tribes, including the Cherokee, Chickasaw, and Shawnee, utilized the Cumberland for centuries.",
    "Steamboats reached Nashville in 1819 and carried cotton downriver.",
  ], { ground });
  const fold = foldWideToShape(atoms, { beats: beatsFromGround(ground, { want: 2 }).beats, ground });
  const all = fold.beats.map((b) => b.text).join(" ");
  assert.ok(!(all.includes("utilized") && all.includes("used the Cumberland")), "the same claim was placed twice");
  assert.ok(fold.refused.some((r) => r.reason === "no_new_matter"), "the paraphrase was not refused with a reason");
  assert.ok(all.includes("Steamboats"), "a genuinely new claim was lost");
});
