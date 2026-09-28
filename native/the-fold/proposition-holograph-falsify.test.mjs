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

// ── H7  ENTAILMENT REQUIRES BOTH ENDS, AS PHRASES — NOT NAME-DROPPING ONE.
// Found running the holograph against a real, uncurated document (Wikipedia's
// "The X-Files" article — eval/the-fold/proposition-holograph-real-data.mjs,
// results/proposition-holograph-real-data-RESULTS.md, Finding 2): a sentence
// that only NAMES one participant of a noisy, mis-parsed ground fact (a
// parenthetical the mechanical extractor misread as a relation) typed as
// verbatim-grounded with nothing actually reproduced. Mutation-checked:
// reverting the phrase+both-ends check to "2+ tokens shared with the fact's
// COMBINED ends" (the pre-fix logic) makes the first assertion below fail.
// Also covers the same fix's other half: an entailed fact's address is now
// checked against real bytes (organs/verify-span.js) when `sources` is
// handed in — integrating the proposition side with the discipline the
// reading side (document-holograph.mjs, product-assay.mjs) already applies
// to its own ledger spans, never assumed true with no source to check.
test("H7 — entailment requires both ends as phrases; a verified span is required to trust the address", () => {
  const h = createPropositionHolograph();
  // The real case: "Cigarette Smoking Man" (end1) is named; "William B"
  // (end2) never appears anywhere in the sentence. Pure commentary, nothing
  // from the fact actually reproduced.
  const commentary = captureProposition(h, "The Cigarette Smoking Man functions less as a person than as the series' recurring proof that institutions outlast any single villain.", {
    groundFacts: [{ end1: "Cigarette Smoking Man", label: "(", end2: "William B", fact: "Cigarette Smoking Man ( William B", ref: "xfiles.txt#6172-8726" }],
  });
  assert.equal(commentary.typing, "invent", "naming one end of a fact is not verbatim carry of it");
  assert.equal(commentary.closestGroundFact, "Cigarette Smoking Man ( William B", "the near-miss is disclosed, not silently dropped");

  // Both ends present, as phrases -> genuinely entails, with no sources to
  // check the address stays disclosed as untried, never assumed true.
  const reproduced = captureProposition(h, "David Duchovny plays Fox Mulder on the show.", {
    groundFacts: [{ end1: "Fox Mulder", label: "(", end2: "David Duchovny", fact: "Fox Mulder ( David Duchovny", ref: "xfiles.txt#0-3636" }],
  });
  assert.equal(reproduced.typing, "entail");
  assert.equal(reproduced.entailVerified, null, "no sources handed in -> verification not attempted, never assumed");

  // SPAN VERIFICATION: with real sources supplied, a genuine address reads
  // back; a fabricated one is caught and disclosed, without changing the
  // (separate) verbatim-ends typing decision.
  const sourceText = "Fox Mulder (David Duchovny) and Dana Scully.";
  const sources = { "xfiles.txt": sourceText };
  const realSpanText = "Fox Mulder (David Duchovny)";
  const realStart = sourceText.indexOf(realSpanText);
  const verified = captureProposition(h, "David Duchovny plays Fox Mulder on the show.", {
    groundFacts: [{ end1: "Fox Mulder", label: "(", end2: "David Duchovny", fact: "Fox Mulder ( David Duchovny", ref: "xfiles.txt#0-3636",
      spans: [{ ref: "xfiles.txt", start: realStart, end: realStart + realSpanText.length, text: realSpanText }] }],
    sources,
  });
  assert.equal(verified.entailVerified, true, "the span reads back from the real source");

  const fabricated = captureProposition(h, "David Duchovny plays Fox Mulder on the show.", {
    groundFacts: [{ end1: "Fox Mulder", label: "(", end2: "David Duchovny", fact: "Fox Mulder ( David Duchovny", ref: "xfiles.txt#0-3636",
      spans: [{ ref: "xfiles.txt", start: realStart, end: realStart + realSpanText.length, text: "a sentence nowhere in the source" }] }],
    sources,
  });
  assert.equal(fabricated.typing, "entail", "typing is about the ends carried verbatim in the PROPOSITION, a separate question from the fact's own address");
  assert.equal(fabricated.entailVerified, false, "but a fabricated address is disclosed, never trusted silently");
});

// ── H8  A FACT WHOSE TWO ENDS ARE THE SAME TEXT CANNOT ENTAIL ANYTHING.
// Found re-testing H7's own fix against the same real document: a mis-parsed
// reflexive sentence ("she is partnered with Mulder... so that she can
// debunk Mulder's...") produced a ground fact with end1 === end2 ===
// "Mulder". H7's both-ends check is trivially satisfied by ANY sentence
// naming Mulder once, since "both ends" collapse to one — the same class
// of bug as H7, one level more subtle. Mutation-checked: removing the
// identical-ends guard makes this test's first assertion fail.
test("H8 — a fact whose ends fold to the same text is never entail's witness", () => {
  const h = createPropositionHolograph();
  const degenerate = captureProposition(h, "Mulder is depicted as a Bureau profiler who was educated at Oxford.", {
    groundFacts: [{ end1: "Mulder", label: "initially so that she can debunk", end2: "Mulder", fact: "Mulder initially so that she can debunk Mulder", ref: "xfiles.txt#3655-6150" }],
  });
  assert.equal(degenerate.typing, "invent", "naming Mulder once cannot entail a fact whose 'two ends' are both just Mulder");
  assert.equal(degenerate.closestGroundFact, null, "an identical-ends fact is excluded before it can even count as the closest near-miss");

  // A genuine two-different-ends fact is unaffected by the guard.
  const genuine = captureProposition(h, "David Duchovny plays Fox Mulder on the show.", {
    groundFacts: [{ end1: "Fox Mulder", label: "(", end2: "David Duchovny", fact: "Fox Mulder ( David Duchovny", ref: "xfiles.txt#0-3636" }],
  });
  assert.equal(genuine.typing, "entail", "the guard targets identical ends only, not real two-party facts");
});