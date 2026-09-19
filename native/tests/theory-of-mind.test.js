// native/tests/theory-of-mind.test.js — the walls on folding the universe at
// any given for-whom.
//
// The failure this organ exists to prevent is a COLLAPSE, and there are four
// shapes of it, each refused here:
//   1. three subjects (system, user, entity) treated as three mechanisms —
//      they are three for-whoms of one fold operation;
//   2. a being treated as one mind — a body may sit many minds, and the
//      parliament adjudicates them including against itself;
//   3. a being's universe folded from the READER's knowledge of it — the
//      dramatic irony the being is out of the loop on must never enter its
//      world or gate it;
//   4. a mind read only by its held content — it is read at three altitudes
//      (atmosphere / lens / paradigm), and the gate is those altitudes gated.
//
// Medium-blindness is asserted by reading the organ's own executable body,
// exactly as contest.test.js reads contest.js.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  USER,
  selfForWhom, userForWhom, entityForWhom, mindsAt, mindHolder, bodyOf,
  foldUniverseAt, universeOf, theoryOfMind, userOperation, parliament, mindShape, sameShape,
} from "../kernel/theory-of-mind.js";
import { READER, STANCE, projectPerspectives } from "../kernel/perspective.js";
import { deltaFold } from "../kernel/fold.js";
import { FIRST_PERSON, INTERROGATIVE_PRONOUNS, NEGATION_WORDS, ANAPHORIC_PRONOUNS } from "../adapters/text/priors.js";
import { userTurnOperation, turnsToUserLog } from "../adapters/chat/user-turns.js";

// ── fixtures ─────────────────────────────────────────────────────────────

const structureCounts = [1, 1, 1, 2, 2, 3, 3, 4, 4, 3, 3, 2, 2, 1]; // 32 total, all 14 encounters non-empty
const aliceStructure = () => {
  const entries = [];
  structureCounts.forEach((n, i) => {
    for (let k = 0; k < n; k += 1) entries.push({ schema: "EOHyperedge@1", id: `h:${i}:${k}`, encounterRef: `enc:${i}`, relation: "happened", participants: [{ surface: "Alice", ref: "ref:alice" }] });
  });
  return entries;
};

const lensLog = (...ops) => ops.map((op) => deltaFold([op]));
const QUESTION = "what happened to Alice?";

const STOP = new Set(["hi", "hey", "hello", "thanks", "ok", "okay", "please"]);
// "no"/"nope" are absent from the received NEGATION_WORDS (a disclosed gap in
// priors.js itself, closed locally exactly as admission.js closes it) — the
// caller's own closed class, extended at the door, never a new list.
const NEG = new Set([...NEGATION_WORDS, "no", "nope", "nah"]);
const TURN_OPTS = { firstPerson: FIRST_PERSON, interrogatives: INTERROGATIVE_PRONOUNS, negation: NEG, anaphoric: ANAPHORIC_PRONOUNS, stop: STOP };

// ── the medium-blind scan, on the executable body only (contest.test.js's shape) ──

test("no branch of the theory-of-mind organ mentions any medium", () => {
  const src = readFileSync(new URL("../kernel/theory-of-mind.js", import.meta.url), "utf8");
  const body = src.slice(src.indexOf("export const USER"));
  for (const forbidden of ["sentence", "pronoun", "surface", "token", "word", "text"]) {
    assert.ok(
      !new RegExp(`\\b${forbidden}\\b`, "i").test(body),
      `kernel/theory-of-mind.js's executable body must not mention "${forbidden}" — it would not be medium-general`,
    );
  }
});

// ── the constructors: three subjects, one frame ───────────────────────────

test("three subjects are three frames of one operation — self, user, entity", () => {
  const self = selfForWhom({ question: "what do I hold?" });
  const user = userForWhom({ question: QUESTION });
  const entity = entityForWhom({ holder: "victor" });
  assert.equal(self.medium, "self", "the system's mind reads the self plane");
  assert.equal(self.knowing, "proprioception", "knowing-oneself is the ninth spoke");
  assert.match(self.giver, /echo of human life/, "the system's giver is what the reader IS (self.js, verbatim)");
  assert.equal(user.medium, "chat", "the person's mind reads the chat doorway");
  assert.equal(user.knowing, "ostension", "the person hands material over and asks directly");
  assert.equal(entity.question, "the universe as known to victor", "a being's own horizon is its question when no ask is given — FOR THEM");
});

test("a body may sit many minds — the address is body:mind:key, and bodyOf recovers the seat", () => {
  assert.equal(mindHolder(USER, "engineer"), "holder:user:mind:engineer");
  assert.equal(bodyOf("holder:user:mind:engineer"), USER);
  const minds = mindsAt(USER, [
    { key: "engineer", question: "does the design hold?" },
    { key: "citizen", question: "is the council corrupt?" },
  ]);
  assert.equal(minds.length, 2);
  assert.equal(minds[0].id, "holder:user:mind:engineer");
  assert.equal(minds[1].id, "holder:user:mind:citizen");
  assert.notEqual(minds[0].recipe, minds[1].recipe, "two minds of one body are two frames — two recipes");
});

// ── the one operation, aimed at all three ─────────────────────────────────

test("THE ONE OPERATION: the same fold works for the user, the system, and an entity", () => {
  const structure = aliceStructure();
  const userFold = foldUniverseAt(userForWhom({ question: QUESTION }), { holder: USER, entries: structure, gateOpts: { minDiscovered: 5, minRelevance: 0.1 } });
  assert.equal(userFold.schema, "EOUniverse@1");
  assert.equal(userFold.body, USER);
  assert.equal(userFold.admitted, true, "the user's reading finds Alice, structured, relevant to its own question");

  const selfFold = foldUniverseAt(selfForWhom({ question: "what do I hold?" }), {
    holder: READER,
    entries: lensLog(
      userOperation({ claim: "the council is corrupt", witness: "turn:1" }),
      userOperation({ claim: "does the council meet on Tuesdays?", question: true, witness: "turn:2" }),
    ),
  });
  assert.equal(selfFold.holder, READER, "the system folds at its own seat");
  assert.equal(selfFold.admitted, false, "the reader holds the person's claims, but the trajectory is empty — no structure, refused");
  assert.ok(selfFold.gaps.some((g) => g.type === "coherence_withheld"), "the withheld coherence leg is a typed gap, never a false refusal");

  const entityFold = foldUniverseAt(entityForWhom({ holder: "victor", question: "what does victor hold?" }), {
    entries: lensLog(
      userOperation({ claim: "x" }), // the person's claim is not victor's
    ),
  });
  assert.equal(entityFold.holder, "victor");
  assert.ok(entityFold.gaps.some((g) => g.type === "unknown_holder"), "a being with no recorded belief is a typed gap, never a silent empty universe");
});

// ── the system's self-model is reflexive ──────────────────────────────────

test("the fold at the reader's own position is the reader's self-model", () => {
  // The reading's own act — a witnessed Lens belief — is what the reader
  // holds about itself; the fold at READER is that self-model.
  const readerAct = { schema: "EOOperation@1", id: "lens:reader:self:readsFor", mode: "Relate", domain: "Interpretation", grain: "Figure", operator: "EVA", terrain: "Lens", stance: "holds", witness: "self:ledger#0-10", payload: { holder: READER, claim: "self:readsFor:user", stance: STANCE.HOLDS, basis: "witnessed", via: [] } };
  const fold = foldUniverseAt(selfForWhom({ question: "what do I hold?" }), { holder: READER, entries: lensLog(readerAct) });
  assert.equal(fold.perspective.heldCount, 1, "the reader's own holding is in its self-model");
  assert.equal(fold.perspective.held[0].basis, "witnessed", "the reader's own act is witnessed, never asserted");
});

// ── the user model from turns ─────────────────────────────────────────────

test("the chat adapter lands the person's turns as the person's held beliefs, by shape never by content", () => {
  const ask = userTurnOperation("does the council meet on Tuesdays?", { index: 0, ...TURN_OPTS });
  const assertion = userTurnOperation("the council is corrupt", { index: 1, ...TURN_OPTS });
  const correction = userTurnOperation("no, that's wrong", { index: 2, ...TURN_OPTS });
  assert.equal(ask.kind, "ask");
  assert.equal(ask.op.operator, "DEF", "an ask distinguishes a gap — DEF");
  assert.equal(assertion.kind, "assertion");
  assert.equal(assertion.op.operator, "EVA", "an assertion holds a claim — EVA");
  assert.equal(correction.kind, "correction");
  assert.equal(correction.op.payload.stance, STANCE.REFUSES, "a negation-led turn refuses what was held");

  const greeting = userTurnOperation("hi", { index: 3, ...TURN_OPTS });
  assert.equal(greeting.gap.type, "no_content", "a greeting is a turn, never a held claim");
  const empty = userTurnOperation("   ", { index: 4, ...TURN_OPTS });
  assert.equal(empty.gap.type, "empty_turn");
});

test("the user model is folded from the person's own turns, and the person's asserted claim never becomes the reader's witnessed belief", () => {
  const log = turnsToUserLog([
    "the council is corrupt",
    "does the council meet on Tuesdays?",
  ], TURN_OPTS);
  const projected = projectPerspectives([log]);
  assert.equal(log.gaps.length, 0);
  const userPov = projected.perspectives[USER];
  assert.equal(userPov.beliefs.length, 2);
  assert.ok(userPov.beliefs.every((b) => b.basis === "asserted"), "everything the person said is asserted, never witnessed");
  assert.equal(projected.perspectives[READER], undefined, "the person's claims did not leak into the reader's own beliefs");
  assert.deepEqual(userPov.beliefs.map((b) => b.operator).sort(), ["DEF", "EVA"]);
});

// ── many minds of one body ────────────────────────────────────────────────

test("a person under two minds is two foldable minds, and the parliament types their contest a self-disagreement", () => {
  const log = turnsToUserLog([
    "does the design hold?",
    "the council is corrupt",
    "the design holds perfectly",
    "no, the design fails",
  ], { ...TURN_OPTS, mind: (turn, i) => (i % 2 === 0 ? "engineer" : "citizen") });
  const projected = projectPerspectives([log]);
  const engineer = projected.perspectives[mindHolder(USER, "engineer")];
  const citizen = projected.perspectives[mindHolder(USER, "citizen")];
  assert.equal(engineer.beliefs.length, 2, "the engineer mind holds its own turns");
  assert.equal(citizen.beliefs.length, 2, "the citizen mind holds its own turns");
  assert.equal(projected.perspectives[USER], undefined, "every turn was spoken under a mind — the body's remainder is empty");

  // Structure the reading both minds stand on: design edges and council edges.
  const combined = [];
  structureCounts.forEach((n, i) => {
    for (let k = 0; k < n; k += 1) {
      const isDesign = (i + k) % 2 === 0;
      combined.push({ schema: "EOHyperedge@1", id: `s:${i}:${k}`, encounterRef: `enc:${i}`, relation: isDesign ? "holds" : "corrupt", participants: [{ surface: isDesign ? "the design" : "the council", ref: isDesign ? "ref:design" : "ref:council" }] });
    }
  });
  const entries = [...combined, log];
  const gateOpts = { minDiscovered: 5, minRelevance: 0.1 };
  const engFold = foldUniverseAt(mindsAt(USER, [{ key: "engineer", question: "does the design hold?" }])[0], { entries, gateOpts });
  const citFold = foldUniverseAt(mindsAt(USER, [{ key: "citizen", question: "is the council corrupt?" }])[0], { entries, gateOpts });
  assert.equal(engFold.admitted, true, "the engineer mind's reading answers its own question");
  assert.equal(citFold.admitted, true, "the citizen mind's reading answers its own question");

  const assembly = parliament([engFold, citFold], { projected });
  assert.equal(assembly.counted.admitted, 2);
  const selfContest = assembly.contests.find((c) => c.selfDisagreement === true);
  assert.ok(selfContest, "a contest between two minds of one body is a self-disagreement");
  assert.equal(selfContest.a.holder, mindHolder(USER, "engineer"));
  assert.equal(selfContest.b.holder, mindHolder(USER, "citizen"));
  assert.equal(assembly.bodies[USER], 2, "the body sat two admitted minds — the multiplicity, counted once");
});

// ── the FOR-THEM universe, and the irony wall ─────────────────────────────

test("the FOR-THEM fold is the being's own world, folded from the being's own participations and holdings", () => {
  // The reader knows a great deal about the creature; the creature knows
  // less. The reader's knowledge must not enter the creature's universe.
  const structure = aliceStructure().map((e) => ({ ...e, participants: [{ surface: "Alice", ref: "ref:alice" }] }));
  const log = deltaFold([userOperation({ claim: "alice is not the queen", witness: "turn:0", mind: null })]);
  // the being itself: alice participates in the structure; alice holds one belief
  const aliceHolds = { schema: "EOOperation@1", id: "lens:ref:alice:world", mode: "Relate", domain: "Interpretation", grain: "Figure", operator: "EVA", terrain: "Lens", stance: "holds", witness: "enc:1", payload: { holder: "ref:alice", claim: "alice:world:is:curious", stance: STANCE.HOLDS, basis: "asserted", via: [] } };
  const userLog = deltaFold([...log.operations, aliceHolds]);
  const entries = [...structure, userLog];
  const fold = universeOf(entityForWhom({ holder: "ref:alice" }), { entries });
  assert.equal(fold.schema, "EOUniverseFor@1");
  assert.equal(fold.attributed.count, structure.length, "the reading's placement of the being is reported as reader knowledge — attributed, typed as such");
  assert.equal(fold.attributed.detail.includes("reading's knowledge"), true, "the attribution names itself as the reading's, never the being's own");
  assert.equal(fold.universe.heldCount, 1, "the universe is what the being itself holds");
  assert.ok(!fold.universe.held.some((b) => b.claim === "alice is not the queen"), "the reader's belief about alice is not alice's own — never folded in");
  assert.equal(fold.admitted, true, "the being attested a world of its own (one held belief) — the FOR-THEM gate admits on the being's own attestation");
});

test("dramatic irony is OUT OF THE LOOP: reported apart, and it does not affect the being", () => {
  // The reader witnessed something the being has no belief about: the
  // being is out of the loop on it. Even a fold where the being experienced
  // NOTHING stays refused — the irony does not rescue it.
  const readerKnows = { schema: "EOOperation@1", id: "lens:reader:secret", mode: "Relate", domain: "Interpretation", grain: "Figure", operator: "EVA", terrain: "Lens", stance: "holds", witness: "trial", payload: { holder: READER, claim: "the:letter:was:poisoned", stance: STANCE.HOLDS, basis: "witnessed", via: [] } };
  const fold = universeOf(entityForWhom({ holder: "ref:alice" }), { entries: lensLog(readerKnows) });
  assert.equal(fold.universe.heldCount, 0, "the being attested no world of its own");
  assert.equal(fold.admitted, false, "a being that attested nothing has no universe, however much the reader knows about it");
  assert.equal(fold.outOfLoop.count, 1, "the irony is reported — the being is out of the loop on it");
  assert.deepEqual(fold.outOfLoop.asymmetric.map((x) => x.claim), ["the:letter:was:poisoned"]);
  assert.equal(fold.gate.decision.startsWith("refused"), true, "the irony did not affect the verdict — it is out of the loop, not in it");
  assert.ok(!fold.universe.held.some((b) => b.claim === "the:letter:was:poisoned"), "the secret is nowhere in the universe");
});

// ── the falsifications, pinned so they cannot return ──────────────────────

test("FALSIFICATION, the irony wall: the reader's placement of a being into events is reader knowledge — it never admits the being's universe and never enters it", () => {
  // The reader extracted "alice fell down the hole" and placed alice in it;
  // alice attested nothing. Before the fix, that attribution WAS the being's
  // "experience" — the reader's knowledge wearing the being's own clothes.
  const structure = [{ schema: "EOHyperedge@1", id: "h0", encounterRef: "enc:0", relation: "fell", participants: [{ surface: "Alice", ref: "ref:alice" }] }];
  const readerKnows = { schema: "EOOperation@1", id: "lens:reader:fall", mode: "Relate", domain: "Interpretation", grain: "Figure", operator: "EVA", terrain: "Lens", stance: "holds", witness: "trial", payload: { holder: READER, claim: "alice:fell:down:the:hole", stance: STANCE.HOLDS, basis: "witnessed", via: [] } };
  const fold = universeOf(entityForWhom({ holder: "ref:alice" }), { entries: [...structure, ...lensLog(readerKnows)] });
  assert.equal(fold.attributed.count, 1, "the reading's placement of alice is reported as reader knowledge — attributed");
  assert.equal(fold.universe.heldCount, 0, "nothing the reader attributed entered the being's own world");
  assert.equal(fold.admitted, false, "reader-attributed participation does not admit the being's universe — the being attested nothing");
  assert.equal(fold.outOfLoop.count, 1, "the reader's belief alice never held is the irony, reported apart");
});

test("FALSIFICATION, the adapter: an acknowledgment that opens with 'no' is never a refusal", () => {
  // Before the fix, "No problem, thanks for the help!" landed as a REFUSES
  // correction — gratitude held as a denial, a manufactured belief.
  const thanks = userTurnOperation("No problem, thanks for the help!", { index: 0, ...TURN_OPTS });
  assert.equal(thanks.kind, "assertion", "an acknowledgment points at nothing the reading holds — never a refusal");
  assert.equal(thanks.op.payload.stance, STANCE.HOLDS);
  const denial = userTurnOperation("No, that's wrong", { index: 1, ...TURN_OPTS });
  assert.equal(denial.kind, "correction", "a negation that points BACK at what was held is a re-zero");
  assert.equal(denial.op.payload.stance, STANCE.REFUSES);
});

test("FALSIFICATION, the altitude: a withheld paradigm leg is never reported as admitted", () => {
  // Before the fix, a trajectory too short to decompose reported
  // paradigm.admitted === true by WITHHOLDAL — a shape nobody measured.
  const flat = foldUniverseAt(userForWhom({ question: QUESTION }), { holder: USER, entries: lensLog(userOperation({ claim: "x", witness: "t:0" })) });
  assert.equal(flat.gate.coherentEvaluable, false, "the trajectory is too short to evaluate");
  assert.equal(flat.altitudes.paradigm.admitted, false, "a withheld leg is not an admitted shape — withheld, never refused, never passed");
  assert.equal(flat.altitudes.paradigm.evaluable, false);
  assert.ok(flat.gaps.some((g) => g.type === "coherence_withheld"), "the withholding is a typed gap, never a silent verdict");
});

test("FALSIFICATION, the address: a body may not itself be a mind", () => {
  // Before the fix, a mind-of-a-mind address was constructible and bodyOf
  // silently returned the inner MIND as the "body" — the parliament's
  // self-disagreement check could then misread a body for a mind.
  assert.throws(() => mindHolder(USER, "engineer:mind:x"), /mind|body/, "a mind key may not smuggle another mind's address");
  assert.throws(() => mindHolder(mindHolder(USER, "engineer"), "x"), /body/, "a body that is itself a mind is refused at the door");
});

test("FALSIFICATION (disclosed, not closed): a rhetorical denial reads as an ask — the shape is all a mechanical read has", () => {
  // "Why would I do that?" is a denial; the mechanical shape reads an ask.
  // The person's own words stay the claim, and the first-person flag is now
  // true so the reader's model can treat the ask cautiously. Meaning is S3,
  // the model's and the reader's — never this file's.
  const rhetorical = userTurnOperation("Why would I do that?", { index: 0, ...TURN_OPTS });
  assert.equal(rhetorical.kind, "ask", "shape wins over meaning — disclosed");
  assert.equal(rhetorical.firstPerson, true, "the first-person tell is scanned across the whole turn, not only its opening");
  assert.equal(rhetorical.op.payload.claim, "Why would I do that?", "the person's own words stay the claim");
});

test("the being's private world — what it holds that the reader is out of the loop on — is reported apart", () => {
  const alicePrivate = { schema: "EOOperation@1", id: "lens:ref:alice:secret", mode: "Relate", domain: "Interpretation", grain: "Figure", operator: "EVA", terrain: "Lens", stance: "holds", witness: "enc:1", payload: { holder: "ref:alice", claim: "alice:knows:the:secret", stance: STANCE.HOLDS, basis: "asserted", via: [] } };
  const fold = universeOf(entityForWhom({ holder: "ref:alice" }), { entries: lensLog(alicePrivate) });
  assert.equal(fold.private.count, 1, "what the being holds and the reader has not modelled is the being's private world");
  assert.deepEqual(fold.private.asymmetric.map((x) => x.claim), ["alice:knows:the:secret"]);
});

// ── the three altitudes ───────────────────────────────────────────────────

test("a mind is read at three altitudes, and the gate IS those altitudes gated", () => {
  const fold = foldUniverseAt(userForWhom({ question: QUESTION }), { holder: USER, entries: aliceStructure(), gateOpts: { minDiscovered: 5, minRelevance: 0.1 } });
  assert.equal(fold.admitted, true);
  assert.equal(fold.altitudes.atmosphere.admitted, fold.gate.material, "atmosphere is the material leg — is there a ground at all?");
  assert.equal(fold.altitudes.lens.admitted, fold.gate.relevant, "lens is the relevance leg — does what it holds touch the question?");
  assert.equal(fold.altitudes.paradigm.admitted, fold.gate.coherent, "paradigm is the coherence leg — is there a shape to its reading?");
  assert.equal(fold.altitudes.paradigm.dominantMode, fold.gate.real, "the paradigm's shape IS the dominant DMD mode of its reading");
  assert.equal(fold.gate.coherentEvaluable, true, "the trajectory is long enough for the shape to be evaluated, not withheld");
  assert.equal(fold.altitudes.atmosphere.ground, null, "an undeclared ground is an undeclared ground — never invented");

  // Two minds at the same altitude, holding different things, disagree; two
  // minds on different grounds or shapes are not reading the same thing.
  const a = foldUniverseAt(userForWhom({ question: QUESTION }), { holder: USER, entries: aliceStructure(), gateOpts: { minDiscovered: 5, minRelevance: 0.1 } });
  const b = foldUniverseAt(userForWhom({ question: "is the rabbit late?" }), { holder: USER, entries: aliceStructure(), gateOpts: { minDiscovered: 5, minRelevance: 0.1 } });
  assert.equal(sameShape(a, b), true, "same ground, same shape — the same altitude, so their difference is a disagreement");
  const flat = foldUniverseAt(userForWhom({ question: QUESTION }), { holder: USER, entries: lensLog(userOperation({ claim: "x", witness: "t:0" })) });
  assert.equal(sameShape(a, flat), false, "a reading with no shape is not reading at the same altitude");
});

// ── the recursion ─────────────────────────────────────────────────────────

test("theory of mind reads the relay chain at depth: I think you think X is a depth, not a guess", () => {
  const entries = lensLog(
    { schema: "EOOperation@1", id: "l1", mode: "Relate", domain: "Interpretation", grain: "Figure", operator: "EVA", terrain: "Lens", stance: "holds", witness: "vol2ch5", payload: { holder: READER, claim: "felix:taught:safie", stance: STANCE.HOLDS, basis: "reported", via: ["victor", "creature"] } },
    { schema: "EOOperation@1", id: "l2", mode: "Relate", domain: "Interpretation", grain: "Figure", operator: "EVA", terrain: "Lens", stance: "holds", witness: "vol2ch3", payload: { holder: READER, claim: "creature:is:lonely", stance: STANCE.HOLDS, basis: "reported", via: ["creature"] } },
    { schema: "EOOperation@1", id: "l3", mode: "Relate", domain: "Interpretation", grain: "Figure", operator: "EVA", terrain: "Lens", stance: "holds", witness: "vol2ch2", payload: { holder: "victor", claim: "creature:is:fiend", stance: STANCE.HOLDS, basis: "asserted", via: [] } },
    { schema: "EOOperation@1", id: "l4", mode: "Relate", domain: "Interpretation", grain: "Figure", operator: "EVA", terrain: "Lens", stance: "holds", witness: "vol2ch5", payload: { holder: "creature", claim: "felix:taught:safie", stance: STANCE.HOLDS, basis: "asserted", via: [] } },
  );
  const projected = projectPerspectives(entries);

  const d1 = theoryOfMind(projected, READER, "creature", { depth: 1 });
  assert.equal(d1.count, 2, "the reader's model of the creature is every belief relayed via it");
  assert.equal(d1.depth, 1);

  const d2 = theoryOfMind(projected, READER, "victor", { depth: 2 });
  assert.equal(d2.count, 1, "the reader's model of victor's model: victor at one remove from the source");
  assert.equal(d2.attributed[0].via.length, 2, "the relay chain is the model's own evidence");
  assert.equal(d2.attributed[0].via[0], "victor");

  const emptyDepth = theoryOfMind(projected, READER, "creature", { depth: 2 });
  assert.equal(emptyDepth.count, 0);
  assert.equal(emptyDepth.gap.type, "no_attributed_relay", "a depth with nothing at it is a typed gap, never a silent zero");
  assert.throws(() => theoryOfMind(projected, READER, "creature", { depth: 0 }), /depth/, "a depth is declared, never defaulted");
});

// ── the parliament ────────────────────────────────────────────────────────

test("the parliament admits who was reading the question, refuses who was not, with the gate's own reason", () => {
  const structure = aliceStructure();
  const asking = foldUniverseAt(userForWhom({ question: QUESTION }), { holder: USER, entries: structure, gateOpts: { minDiscovered: 5, minRelevance: 0.1 } });
  // a being whose reading is about nothing Alice-related: structure but no relevance
  const elsewhere = aliceStructure().map((e) => ({ ...e, id: `x:${e.id}`, relation: "slept", participants: [{ surface: "the cat", ref: "ref:cat" }] }));
  const notReading = foldUniverseAt(entityForWhom({ holder: "ref:cat", question: QUESTION }), { holder: "ref:cat", entries: elsewhere, gateOpts: { minDiscovered: 5, minRelevance: 0.5 } });
  assert.equal(asking.admitted, true);
  assert.equal(notReading.admitted, false);
  const assembly = parliament([asking, notReading], { question: QUESTION });
  assert.equal(assembly.counted.admitted, 1);
  assert.equal(assembly.counted.refused, 1);
  assert.match(assembly.refused[0].reason, /REFUSED/, "a refused mind is refused with its gate's own reason");
  assert.equal(assembly.refused[0].holder, "ref:cat");
});

// ── typed gaps in the turn attribution ────────────────────────────────────

test("turn attribution refuses what it cannot claim, typed and never guessed", () => {
  assert.equal(userTurnOperation("", { index: 0, ...TURN_OPTS }).gap.type, "empty_turn");
  assert.equal(userTurnOperation("hi", { index: 1, ...TURN_OPTS }).gap.type, "no_content");
  assert.equal(userTurnOperation("the council is corrupt", { ...TURN_OPTS }).gap.type, "unaddressed_turn", "a claim without a witness is unaddressed — P5.2");
  const logged = turnsToUserLog(["", "the council is corrupt", "hi", "who chairs it?"], TURN_OPTS);
  assert.equal(logged.operations.length, 2, "the two content-bearing turns are claimed");
  assert.equal(logged.gaps.length, 2, "the two empty-content turns are kept TYPED, never guessed");
});