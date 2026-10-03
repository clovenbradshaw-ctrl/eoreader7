// native/tests/perspective.test.js — the walls on who-holds-what.
//
// The failure this organ exists to prevent is a collapse, not a crash: a
// reading that lets "Victor says the creature is a fiend" become "the
// creature is a fiend". Every test here is one shape of that collapse,
// refused.

import test from "node:test";
import assert from "node:assert/strict";
import {
  READER, BASIS, STANCE,
  projectPerspectives, commonGround, divergence, mentalModel, perspectiveOperation,
  originOf, independentHolders,
} from "../kernel/perspective.js";
import { deltaFold } from "../kernel/fold.js";

const log = (...ops) => ops.map((op) => deltaFold([op]));

test("a perspective act lands in Lens — the cell the algebra already gives Interpretation x Figure", () => {
  const held = perspectiveOperation({ holder: "victor", claim: "creature:is:fiend", witness: "vol2ch2" });
  assert.equal(held.terrain, "Lens");
  assert.equal(held.operator, "EVA", "holding a claim against a ground is Relate-Interpretation");
  assert.equal(held.domain, "Interpretation");
  assert.equal(perspectiveOperation({ holder: "victor", claim: "c", stance: STANCE.CONCEDED }).operator, "REC", "conceding is a re-zero");
  assert.equal(perspectiveOperation({ holder: "walton", claim: null }).operator, "DEF", "opening a holder distinguishes them from the reading");
  assert.throws(() => perspectiveOperation({ claim: "x" }), /named/, "an unattributed belief is refused");
});

test("what a character asserts never becomes what the reading witnessed", () => {
  const projected = projectPerspectives(log(
    perspectiveOperation({ holder: READER, claim: "creature:killed:william", witness: "trial" }),
    perspectiveOperation({ holder: "victor", claim: "creature:is:fiend", witness: "vol2ch2" }),
  ));
  const reader = projected.perspectives[READER];
  const victor = projected.perspectives.victor;
  assert.equal(reader.beliefs[0].basis, BASIS.WITNESSED, "the reading's own act is witnessed");
  assert.equal(victor.beliefs[0].basis, BASIS.ASSERTED, "a character's claim is asserted, never witnessed");
  assert.ok(!reader.beliefs.some((b) => b.claim === "creature:is:fiend"), "Victor's claim did not leak into the reading's own beliefs");
});

test("relayed belief keeps its chain, and depth is a fact about the claim", () => {
  const projected = projectPerspectives(log(
    perspectiveOperation({ holder: READER, claim: "felix:taught:safie", via: ["victor", "creature"], witness: "vol2ch5" }),
  ));
  const belief = projected.perspectives[READER].beliefs[0];
  assert.equal(belief.basis, BASIS.REPORTED, "a via chain makes it reported by construction, without anyone declaring it");
  assert.deepEqual(belief.via, ["victor", "creature"]);
});

test("divergence splits asymmetry from conflict — one number would hide which is present", () => {
  const projected = projectPerspectives(log(
    perspectiveOperation({ holder: READER, claim: "creature:killed:william" }),
    perspectiveOperation({ holder: READER, claim: "justine:is:innocent" }),
    perspectiveOperation({ holder: "geneva", claim: "justine:is:innocent", stance: STANCE.REFUSES }),
  ));
  const d = divergence(projected, READER, "geneva");
  assert.deepEqual(d.asymmetric.map((x) => x.claim), ["creature:killed:william"], "what the reader knows and Geneva has no belief about at all");
  assert.deepEqual(d.conflicting.map((x) => x.claim), ["justine:is:innocent"], "and the one they actively disagree on");
  assert.equal(d.count, 2);
  const shared = commonGround(projected, READER, "geneva");
  assert.equal(shared.count, 0, "a refusal is not common ground");
});

test("a re-zero keeps what it conceded — the past is kept, never erased", () => {
  const projected = projectPerspectives(log(
    perspectiveOperation({ holder: "victor", claim: "justine:is:guilty" }),
    perspectiveOperation({ holder: "victor", claim: "justine:is:guilty", stance: STANCE.CONCEDED }),
  ));
  const belief = projected.perspectives.victor.beliefs[0];
  assert.equal(belief.stance, STANCE.CONCEDED);
  assert.deepEqual(belief.supersedes, { stance: STANCE.HOLDS, atSeq: 0 }, "what was held before the concession is still on the record");
  assert.equal(belief.revisions, 1);
});

test("the cursor is real: a perspective is answerable about the past, and demanded as an integer", () => {
  const entries = log(
    perspectiveOperation({ holder: "victor", claim: "a" }),
    perspectiveOperation({ holder: "victor", claim: "b" }),
    perspectiveOperation({ holder: "victor", claim: "c" }),
  );
  assert.equal(projectPerspectives(entries, { atSeq: 2 }).perspectives.victor.beliefs.length, 2);
  assert.equal(projectPerspectives(entries).perspectives.victor.beliefs.length, 3);
  assert.throws(() => projectPerspectives(entries, { atSeq: 1.5 }), /cursor/);
});

test("a mental model reports its own coverage, and an empty one is a typed gap, not a zero", () => {
  const projected = projectPerspectives(log(
    perspectiveOperation({ holder: READER, claim: "felix:taught:safie", via: ["creature"] }),
    perspectiveOperation({ holder: "creature", claim: "felix:taught:safie" }),
    perspectiveOperation({ holder: "creature", claim: "creature:is:lonely" }),
  ));
  const model = mentalModel(projected, "creature", READER);
  assert.equal(model.count, 1);
  assert.equal(model.ofHoldsInTotal, 2);
  assert.equal(model.coverage, 0.5, "half of what the creature holds is modelled — said, not implied");
  const empty = mentalModel(projected, "walton", READER);
  assert.equal(empty.gap.type, "no_attributed_beliefs");
});

// ── THE RELAY-INFLATION REGRESSION (2026-09-28) ─────────────────────────────
// Found by actually running a falsification of "does for-whom scoping
// improve a reading", not designed in advance: a naive reading of
// `commonGround` as "two holders share a claim, therefore two witnesses"
// reintroduces the exact defect Bukhari's rule (organs/corroboration.js)
// already refuses at the witness-string layer. Pinned here so it cannot
// silently regress at the holder layer.
test("originOf collapses a relayed belief to its via chain's source; a fresh assertion is its own origin", () => {
  const asserted = perspectiveOperation({ holder: "mayor", claim: "sabotage", basis: BASIS.ASSERTED });
  const relayed = perspectiveOperation({ holder: "reporter", claim: "sabotage", basis: BASIS.REPORTED, via: ["mayor"] });
  const projected = projectPerspectives(log(asserted, relayed));
  assert.equal(originOf(projected.perspectives.mayor.beliefs[0]), "mayor");
  assert.equal(originOf(projected.perspectives.reporter.beliefs[0]), "mayor", "a relay's origin is who it was relayed FROM, not who relays it");
});

test("independentHolders refuses to count a relay as a second witness — a shared belief with a relayed origin is ONE origin, not two", () => {
  const projected = projectPerspectives(log(
    perspectiveOperation({ holder: "engineer", claim: "metal-fatigue", basis: BASIS.ASSERTED }),
    perspectiveOperation({ holder: "mayor", claim: "sabotage", basis: BASIS.ASSERTED }),
    perspectiveOperation({ holder: "reporter", claim: "sabotage", basis: BASIS.REPORTED, via: ["mayor"] }),
  ));
  const sabotage = independentHolders(projected, ["engineer", "mayor", "reporter"], "sabotage");
  assert.equal(sabotage.size, 1, "mayor's assertion and the reporter's relay of it are ONE origin — the relay-inflation bug, refused");
  assert.deepEqual([...sabotage], ["mayor"]);
  const fatigue = independentHolders(projected, ["engineer", "mayor", "reporter"], "metal-fatigue");
  assert.equal(fatigue.size, 1, "the engineer's own assertion, held by exactly one origin, is honestly single-witness");
});

test("independentHolders correctly counts TWO when two holders each assert independently — a relay chain never suppresses a genuine second witness", () => {
  const projected = projectPerspectives(log(
    perspectiveOperation({ holder: "engineer", claim: "metal-fatigue", basis: BASIS.ASSERTED }),
    perspectiveOperation({ holder: "inspector", claim: "metal-fatigue", basis: BASIS.ASSERTED }),
    perspectiveOperation({ holder: "reporter", claim: "metal-fatigue", basis: BASIS.REPORTED, via: ["inspector"] }),
  ));
  const origins = independentHolders(projected, ["engineer", "inspector", "reporter"], "metal-fatigue");
  assert.equal(origins.size, 2, "engineer and inspector are two real origins; the reporter's relay of the inspector adds no third");
  assert.deepEqual([...origins].sort(), ["engineer", "inspector"]);
});

test("a two-hop relay (reporter relays an aide who relays the mayor) collapses to the ORIGINAL source, not the nearest link", () => {
  // via is ordered nearest-relayer-first, original-source-last (theory-of-
  // mind.js's own worked example: via=[victor, creature], depth 2 reaches
  // via[0]="victor" the nearer link, depth 1 reaches via[last]="creature"
  // the more original one) — so the reporter's own via names the aide (who
  // told the reporter) first and the mayor (the original source) last.
  const projected = projectPerspectives(log(
    perspectiveOperation({ holder: "mayor", claim: "sabotage", basis: BASIS.ASSERTED }),
    perspectiveOperation({ holder: "aide", claim: "sabotage", basis: BASIS.REPORTED, via: ["mayor"] }),
    perspectiveOperation({ holder: "reporter", claim: "sabotage", basis: BASIS.REPORTED, via: ["aide", "mayor"] }),
  ));
  const origins = independentHolders(projected, ["mayor", "aide", "reporter"], "sabotage");
  assert.equal(origins.size, 1, "mayor, the aide who relayed the mayor, and the reporter who relayed both are one chain, one origin");
  assert.deepEqual([...origins], ["mayor"]);
});

test("a log with no perspective acts reports a typed gap, never a silent empty perspective (P4)", () => {
  const structural = deltaFold([{ schema: "EOOperation@1", terrain: "Entity", operator: "INS", payload: { claim: "x" } }]);
  const projected = projectPerspectives([structural]);
  assert.equal(projected.counted.lensActs, 0);
  assert.equal(projected.gap.type, "no_perspective_acts");
  assert.match(projected.gap.detail, /adapter/, "the gap names whose job the missing half is (S6)");
});
