// proposition-holograph-falsify.test.mjs — THE FALSIFICATION TIER for the
// proposition holograph (the user's laws, 2026-09-21):
//
//   "we need a holograph of propositions that are 1) not pre-existing, so
//   synthetic creations of the LLM 2) tied to what both inspired them and
//   what grounds them 3) their holonic, Morphogenic placement as written
//   4) their language appropriate parsing. once we have that, they can be
//   recombined as atoms iteratively and recursively."
//
//   "a proposition is not true everywhere. they must carry their CONTEXTUAL
//   meaning with them."
//
//   "every holonic level has its own atoms."
//
//   "the body of these atoms is an append only log and they get FOLDED in to
//   their state — which is how they can change or occupy multiple states."
//
// Each falsification attacks a consequence of those laws with adversarial
// material. RULED OUT = the law survived; FALSIFIED = it broke, named.
import test from "node:test";
import assert from "node:assert/strict";
import {
  createPropositionHolograph,
  captureProposition,
  recombineAtomsFor,
  settleAtoms,
  projectHolograph,
  propositionCore,
  propositionIdentity,
  foldAtom,
  STANDINGS,
} from "./proposition-holograph.js";

const FRAME_EN = { giver: "english", question: "trade", ground: "sourcing-v4", universe: "text", recipe: "en-work" };
const FRAME_RU = { giver: "russian", question: "trade", ground: "sourcing-v4", universe: "text", recipe: "ru-work" };

// ── H1  A PROPOSITION IS SYNTHETIC, TYPED MECHANICALLY, TIED TO ACTIVATION
// AND GROUND, IN A FRAME. The atom records the model CREATED it, the handed
// activation (inspiredBy), the byte ground (groundsOn), and its typing
// (entail/derive/invent — the record's derivation spectrum, never a model).
test("H1 — every atom is synthetic, typed mechanically, tied to activation + ground, in a frame", () => {
  const h = createPropositionHolograph();
  // ENTAIL: carries a ground fact's ends → byte-addressed.
  const entail = captureProposition(h, "The river's naming honored the Duke of Cumberland.", {
    activation: "Walker expedition named the Duke of Cumberland river",
    groundFacts: [{ end1: "the river's naming", label: "honored", end2: "the Duke of Cumberland", fact: "the river's naming honored the Duke of Cumberland", ref: "source.md#110" }],
    frame: FRAME_EN,
    placement: "whole.opening.turn",
    parsing: { subject: "the river's naming", label: "honored", object: "the Duke of Cumberland" },
    register: { field: "exposition", mode: "text" },
  });
  assert.equal(entail.typing, "entail", "carries a ground fact's ends — entail");
  assert.equal(entail.synthetic, true, "the proposition is the LLM's creation — not pre-existing");
  assert.ok(entail.inspiredBy.includes("Walker expedition"), "inspiredBy = the activation set the turn was handed");
  assert.deepEqual(entail.groundsOn, ["source.md#110"], "groundsOn = the ground fact's byte address");
  assert.equal(entail.frame.giver, "english", "the atom carries its frame");
  assert.equal(foldAtom(entail, { context: "whole.opening.turn" }), STANDINGS.CANDIDATE, "born candidate");
  assert.equal(entail.history.length, 1, "the body is a log — born with one folded state");
  // DERIVE: the chase equated it FOR WHOM — grounded-by-meaning, the middle term.
  const derive = captureProposition(h, "The city grew a skyline of steel where the river's memory kept its hold.", {
    activation: "Walker expedition named the Duke of Cumberland river",
    frame: FRAME_EN,
    chase: { derivation: "Derive", equated: 1, unEquated: 0, row: "row#7", whom: FRAME_EN },
  });
  assert.equal(derive.typing, "derive", "the record equated it FOR WHOM — derive");
  // INVENT: the chase named it un-equatable — disclosed, never laundered.
  const invent = captureProposition(h, "A city that forgets its water forgets itself.", {
    activation: "river", frame: FRAME_EN,
    chase: { derivation: "Invent", equated: 0, unEquated: 1, row: null, whom: FRAME_EN },
  });
  assert.equal(invent.typing, "invent", "un-equatable FOR WHOM — invent, disclosed");
});

// ── H2  RECOMBINATION IS MECHANICAL: it selects by ground, role, placement —
// never by the model. Accepted atoms are spent at that context.
test("H2 — recombination selects by ground, role, and placement; accepted atoms are spent", () => {
  const h = createPropositionHolograph();
  const frame = FRAME_EN;
  captureProposition(h, "The river's naming honored the Duke of Cumberland.", { activation: "river naming Duke", groundFacts: [{ end1: "river naming", label: "honored", end2: "Duke", fact: "river naming honored Duke", ref: "src#1" }], frame, placement: "whole.opening.turn" });
  captureProposition(h, "Major floods in 1927 reshaped river management.", { activation: "river", frame, chase: { derivation: "Derive", row: "row#2" }, placement: "whole.turn.turn" });
  captureProposition(h, "The city turned its back on the current that made it.", { activation: "river city", frame, chase: { derivation: "Invent" }, placement: "whole.resolution.resolution" });
  const picked = recombineAtomsFor(h, { activation: ["river", "city"], placement: "whole.resolution", max: 2 });
  assert.ok(picked.length >= 1, "at least one river/city atom is re-combinable");
  settleAtoms(h, { accept: [picked[0].id], context: "whole.resolution" });
  const again = recombineAtomsFor(h, { activation: ["river", "city"], placement: "whole.resolution", max: 2 });
  assert.ok(!again.some((a) => a.id === picked[0].id), "an accepted atom is spent at that context");
});

// ── H3  THE HOLOGRAPH PROJECTS TO THE FLAT SERIALIZATION. The essay IS the
// accepted atoms in placement order.
test("H3 — the essay is the accepted atoms in placement order", () => {
  const h = createPropositionHolograph();
  const frame = FRAME_EN;
  const a1 = captureProposition(h, "The river named for the Duke carried the city's trade.", { activation: "river", groundFacts: [{ end1: "river", label: "carried", end2: "trade", fact: "river carried trade", ref: "src#1" }], frame, placement: "whole.opening" });
  const a2 = captureProposition(h, "Steamboats bound Nashville to the river's rhythm.", { activation: "river", frame, chase: { derivation: "Derive", row: "row#2" }, placement: "whole.turn" });
  const a3 = captureProposition(h, "The current that made the city still runs beneath it.", { activation: "river", frame, chase: { derivation: "Invent" }, placement: "whole.resolution" });
  settleAtoms(h, { accept: [a2.id, a3.id, a1.id] }); // deliberately out of order
  const flat = projectHolograph(h);
  assert.equal(flat.length, 3);
  assert.ok(flat[0].includes("named for the Duke"), "opening first");
  assert.ok(flat[2].includes("still runs beneath it"), "resolution last");
});

// ── H4  THE CORE MAKES PARAPHRASE THE SAME CLAIM — omnilingual identity.
test("H4 — paraphrase variants reduce to the same proposition core", () => {
  const c1 = propositionCore("The Cumberland River played a significant role in Nashville's growth as a port city.");
  const c2 = propositionCore("The Cumberland River served as a vital artery for Nashville's growth as a port city.");
  const c3 = propositionCore("The Cumberland River is a major waterway of the southeastern United States.");
  assert.equal(c1, c2, "role/artery variants are the same claim");
  assert.notEqual(c1, c3, "a different claim is a different core");
  assert.ok(c1.length > 0, "the core is not empty");
});

// ── H5  THE BODY IS THE LOG: AN ATOM OCCUPIES MULTIPLE STATES AT ONCE, and
// the atom's IDENTITY IS FRAME-BEARING (the user's law: "a proposition is not
// true everywhere").
test("H5 — the atom's body is an append-only log; identity is frame-bearing", () => {
  const h = createPropositionHolograph();
  const atom = captureProposition(h, "The Cumberland River is a major waterway.", { activation: "river", frame: FRAME_EN, placement: "whole.opening" });
  settleAtoms(h, { accept: [atom.id], context: "whole.opening" });
  settleAtoms(h, { refuse: [atom.id], context: "whole.turn" });
  assert.equal(atom.history.length, 3, "born + accepted + refused — the log grew, nothing erased");
  const states = atom.history.map((e) => e.state);
  assert.ok(states.includes(STANDINGS.ACCEPTED) && states.includes(STANDINGS.REFUSED), "the atom occupied both states");
  assert.equal(foldAtom(atom, { context: "whole.opening" }), STANDINGS.ACCEPTED, "folded to ACCEPTED at the opening");
  assert.equal(foldAtom(atom, { context: "whole.turn" }), STANDINGS.REFUSED, "folded to REFUSED at the turn");
});

// ── H6  A PROPOSITION IS NOT TRUE EVERYWHERE: the identity is a byte key
// over {ends + frame}, never the bare ends. The SAME claim in two frames is
// TWO propositions (S43: two readings of one book by two recipes are two
// instruments). Carrying it out of its frame changes its identity.
test("H6 — the identity is frame-bearing: the same claim in two frames is two propositions", () => {
  const bare = propositionIdentity("The river carried the city's trade.");
  const en = propositionIdentity("The river carried the city's trade.", { frame: FRAME_EN });
  const ru = propositionIdentity("The river carried the city's trade.", { frame: FRAME_RU });
  assert.notEqual(en, ru, "same ends, different frame — DIFFERENT proposition (not true everywhere)");
  assert.ok(en.startsWith(propositionCore("The river carried the city's trade.")), "the identity is anchored on the claim core");
  assert.notEqual(bare, en, "the bare-ends key differs from the frame-bearing key");
  // The registry separates them: both land as distinct atoms.
  const h = createPropositionHolograph();
  captureProposition(h, "The river carried the city's trade.", { frame: FRAME_EN, activation: "river" });
  captureProposition(h, "The river carried the city's trade.", { frame: FRAME_RU, activation: "river" });
  assert.equal(h.byCore.size, 2, "two frames, two proposition identities — never collapsed onto one");
});