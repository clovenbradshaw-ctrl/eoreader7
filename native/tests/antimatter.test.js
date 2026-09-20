// native/tests/antimatter.test.js — the negative space of every perspective
// and every terrain.
//
// The failure this organ exists to prevent is a THEORY OF PRESENCE: a mind
// modelled only by what it holds, a terrain named only by what it touches, a
// session logged only by its findings. The walls under test:
//   1. the anti-matter of a terrain is the NEAR complement — five entries,
//      closed and typed, each with its own fixed question; never the whole
//      complement, which is noise;
//   2. the null of an Existence terrain is ITSELF — the refusal of the same
//      figure;
//   3. a mind's negative space is derived from what its world raised — the
//      claims it holds against the material's contradiction, and the claims
//      it has no stance on; never guessed, record-bound;
//   4. the collision's residue is a QUESTION, not an answer;
//   5. the folds carry the negative space: foldUniverseAt.negative and
//      universeOf.blindspots — the false-belief task as a field, not a
//      footnote.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cellOf, TERRAIN_BY_DOMAIN } from "../kernel/cube.js";
import { terrainAntimatter, mindAntimatter, sessionAntimatter, collide } from "../kernel/antimatter.js";
import { USER, userOperation, foldUniverseAt, universeOf, entityForWhom, userForWhom, parliament } from "../kernel/theory-of-mind.js";
import { READER, STANCE, projectPerspectives, perspectiveOperation } from "../kernel/perspective.js";
import { deltaFold } from "../kernel/fold.js";
import { intersection } from "../kernel/antimatter.js";

const freeze = Object.freeze;

// ── fixtures ─────────────────────────────────────────────────────────────

const lensLog = (...ops) => ops.map((op) => deltaFold([op]));

// A lens operation carried on the log, same shape as theory-of-mind.test.js
// uses for reader and being acts.
const lensOp = ({ holder, claim, stance = STANCE.HOLDS, basis = "asserted", id = null, via = [] }) => ({
  schema: "EOOperation@1",
  id: id ?? `lens:${holder}:${claim}`,
  mode: "Relate",
  domain: "Interpretation",
  grain: "Figure",
  operator: stance === STANCE.CONCEDED ? "REC" : "EVA",
  terrain: "Lens",
  stance: stance === STANCE.CONCEDED ? "conceded" : "holds",
  witness: "trial",
  payload: { holder, claim, stance, basis, via },
});

// ── the terrain's near complement ─────────────────────────────────────────

test("the anti-matter of a terrain is the NEAR complement — closed, typed, five entries, never the whole complement", () => {
  for (const [domain, byGrain] of Object.entries(TERRAIN_BY_DOMAIN)) {
    for (const [grain, terrain] of Object.entries(byGrain)) {
      const am = terrainAntimatter(terrain);
      assert.equal(am.schema, "EOTerrainAntimatter@1");
      assert.equal(am.terrain, terrain);
      assert.equal(am.counted.near, 5, `${terrain}: five entries — one own null, two other domains, two own-domain grains`);
      const kinds = am.near.map((n) => n.kind).sort();
      assert.deepEqual(kinds, ["other_domain", "other_domain", "own_domain", "own_domain", "own_null"]);
      assert.equal(am.near.filter((n) => n.kind === "own_null").length, 1);
      for (const n of am.near) {
        assert.ok(typeof n.question === "string" && n.question.length > 0, `${terrain}/${n.kind}: a question is fixed, never blank`);
        assert.ok(TERRAIN_BY_DOMAIN[n.domain]?.[n.grain] === n.terrain, `${terrain}: the entry is the cube's own arithmetic, never a second list`);
      }
      assert.ok(am.gap === undefined, `${terrain}: a named terrain has no gap`);
    }
  }
});

test("Lens, exactly: its own null is Entity — can this figure fail at all? — and the excluded lenses are Entity, Link, Atmosphere, Paradigm", () => {
  const am = terrainAntimatter(cellOf("EVA", "Figure"));
  assert.equal(am.terrain, "Lens");
  assert.equal(am.cell.op, "EVA");
  const ownNull = am.near.find((n) => n.kind === "own_null");
  assert.equal(ownNull.op, "NUL");
  assert.equal(ownNull.terrain, "Entity");
  assert.equal(ownNull.question, "can this figure fail at all?");
  assert.equal(ownNull.self, false, "a Lens is not an Existence terrain — its null is not itself");
  const other = am.near.filter((n) => n.kind === "other_domain").map((n) => [n.terrain, n.question]);
  assert.deepEqual(other, [
    ["Entity", "what IS this thing?"],
    ["Link", "how is it arranged?"],
  ]);
  const ownDomain = am.near.filter((n) => n.kind === "own_domain").map((n) => [n.terrain, n.question]);
  assert.deepEqual(ownDomain, [
    ["Atmosphere", "what atmosphere does it stand in?"],
    ["Paradigm", "what paradigm does it expect?"],
  ]);
});

test("the null of an Existence terrain is ITSELF — the refusal of the same figure, self: true", () => {
  for (const terrain of ["Void", "Entity", "Kind"]) {
    const am = terrainAntimatter(terrain);
    const ownNull = am.near.find((n) => n.kind === "own_null");
    assert.equal(ownNull.self, true, `${terrain}: the null of existence is the same figure refused`);
    assert.equal(ownNull.terrain, terrain);
  }
  assert.equal(terrainAntimatter("Lens").near.find((n) => n.kind === "own_null").self, false);
});

test("terrainAntimatter refuses what it cannot name — a typed gap, never an empty anti-matter", () => {
  const am = terrainAntimatter("Dracula");
  assert.equal(am.gap.type, "unknown_spec");
  assert.equal(am.near.length, 0);
});

// ── the mind's negative space ─────────────────────────────────────────────

test("a mind's anti-matter: what it holds against the material's contradiction, and what its world raised that it never answered", () => {
  const entries = lensLog(
    lensOp({ holder: "victor", claim: "creature:is:fiend" }),
    lensOp({ holder: "creature", claim: "creature:is:fiend", stance: STANCE.REFUSES, basis: "asserted" }),
    lensOp({ holder: "walton", claim: "the:voyage:is:long", basis: "asserted" }),
  );
  const projected = projectPerspectives(entries);

  const victor = mindAntimatter(projected, "victor");
  assert.equal(victor.schema, "EOMindAntimatter@1");
  assert.equal(victor.counted.undermined, 1, "the material contradicts a claim victor HOLDS — his blindspot");
  assert.equal(victor.undermined[0].claim, "creature:is:fiend");
  assert.equal(victor.undermined[0].contradictors[0].holder, "creature");
  assert.equal(victor.undermined[0].contradictors[0].stance, STANCE.REFUSES);
  assert.equal(victor.counted.unsettled, 1, "walton's claim was raised and victor has no stance on it — victor's unanswered question");
  assert.equal(victor.unsettled[0].claim, "the:voyage:is:long");

  const creature = mindAntimatter(projected, "creature");
  assert.equal(creature.counted.undermined, 0, "the creature does not HOLD the claim it refuses — nothing is undermined");
  assert.equal(creature.counted.unsettled, 1, "the voyage claim was raised and the creature has no stance on it");

  const walton = mindAntimatter(projected, "walton");
  assert.equal(walton.counted.unsettled, 1, "one claim, one question — deduped by claim, never counted per raising");
  assert.equal(walton.unsettled[0].claim, "creature:is:fiend");
  assert.equal(walton.recordBound, true, "the negative space is bound to what the log raised — what the log never raised is a hole in the record, not a blindspot");
});

test("a mind with no record is a typed gap, never an empty negative space", () => {
  const projected = projectPerspectives(lensLog(lensOp({ holder: "victor", claim: "x" })));
  const am = mindAntimatter(projected, "nobody");
  assert.equal(am.gap.type, "unknown_holder");
  assert.equal(am.counted.undermined, 0);
});

// ── the collision ─────────────────────────────────────────────────────────

test("the collision: belief meets its null — the residue is a question, not an answer", () => {
  const entries = lensLog(
    lensOp({ holder: "victor", claim: "creature:is:fiend" }),
    lensOp({ holder: "creature", claim: "creature:is:fiend", stance: STANCE.REFUSES }),
  );
  const projected = projectPerspectives(entries);
  const pov = projected.perspectives["victor"];
  const negative = mindAntimatter(projected, "victor");
  const clash = collide(freeze({ holder: "victor", perspective: pov }), negative);
  assert.equal(clash.schema, "EOCollision@1");
  assert.equal(clash.counted.residue, 1, "victor still holds the claim against the material's contradiction — the question survives the collision");
  assert.equal(clash.counted.absorbed, 0);
  assert.equal(clash.residue[0].claim, "creature:is:fiend");
  assert.match(clash.note, /question, not an answer/);
});

test("a conceded claim is the absorbed collision — the hole was sewn, read across the cursor", () => {
  const entries = lensLog(
    lensOp({ holder: "victor", claim: "creature:is:fiend" }),
    lensOp({ holder: "creature", claim: "creature:is:fiend", stance: STANCE.REFUSES }),
    perspectiveOperation({ holder: "victor", claim: "creature:is:fiend", stance: STANCE.CONCEDED, basis: "asserted", witness: "trial" }),
  );
  // The negative space at the moment victor HOLDS — the collision the later
  // fold resolves. A cursor, never a re-read: the projection is folded, never
  // recomputed (P159).
  const before = projectPerspectives(entries, { atSeq: 2 });
  const after = projectPerspectives(entries);
  const negative = mindAntimatter(before, "victor");
  assert.equal(negative.counted.undermined, 1, "at the cursor, victor holds the claim the material contradicts");
  const pov = after.perspectives["victor"];
  assert.equal(pov.beliefs[0].stance, STANCE.CONCEDED, "the concession is kept — REC re-zeros, never erases");
  const clash = collide(freeze({ holder: "victor", perspective: pov }), negative);
  assert.equal(clash.counted.residue, 0, "the mind no longer holds the claim — no question survives");
  assert.equal(clash.counted.absorbed, 1, "the contradiction was absorbed — the collision resolved");
});

// ── the session's log line ────────────────────────────────────────────────

test("the session's anti-matter: the terrains NOT touched and the questions this chain cannot answer", () => {
  const readerClaim = lensOp({ holder: READER, claim: "self:readsFor:user", basis: "witnessed" });
  const networkOp = { schema: "EOOperation@1", id: "op:syn", mode: "Generate", domain: "Structure", grain: "Pattern", operator: "SYN", terrain: "Network", stance: "holds", witness: "trial", payload: {} };
  const entries = [
    deltaFold([userOperation({ claim: "the council is corrupt", witness: "turn:0" })]),
    deltaFold([readerClaim]),
    deltaFold([networkOp]),
  ];
  const am = sessionAntimatter(entries, { question: "who chairs it?" });
  assert.equal(am.schema, "EOSessionAntimatter@1");
  assert.equal(am.question, "who chairs it?");
  assert.deepEqual([...am.touchedTerrains].sort(), ["Lens", "Network"]);
  assert.equal(am.untouchedTerrains.length, 7, "seven terrains the session did not occupy");
  assert.ok(!am.untouchedTerrains.includes("Lens") && !am.untouchedTerrains.includes("Network"));
  assert.deepEqual(am.questions, ["the council is corrupt"], "the chain (the reader) holds no stance on the person's claim — it cannot answer it");
  assert.match(am.line, /terrains NOT touched: /);
  assert.match(am.line, /questions this chain cannot answer: the council is corrupt/);
  assert.equal(am.recordBound, true);
});

test("a claim the reader answered is not a question of the session", () => {
  const claim = "the council is corrupt";
  const entries = [
    deltaFold([userOperation({ claim, witness: "turn:0" })]),
    deltaFold([lensOp({ holder: READER, claim, basis: "witnessed" })]),
  ];
  const am = sessionAntimatter(entries);
  assert.deepEqual(am.questions, [], "the reader holds a stance on the claim — the chain answered it");
  assert.equal(am.counted.questions, 0);
});

// ── the folds carry the negative space ────────────────────────────────────

test("foldUniverseAt carries the mind's negative space and its collision", () => {
  const entries = lensLog(
    userOperation({ claim: "the council is corrupt", witness: "turn:0" }),
    lensOp({ holder: "witness", claim: "the council is corrupt", stance: STANCE.REFUSES, basis: "asserted" }),
  );
  const fold = foldUniverseAt(userForWhom({ question: "is the council corrupt?" }), { holder: USER, entries, gateOpts: { minDiscovered: 5, minRelevance: 0.1 } });
  assert.equal(fold.negative.schema, "EOMindAntimatter@1", "a model of a mind carries what the mind does not know");
  assert.equal(fold.collision.schema, "EOCollision@1");
  assert.equal(fold.negative.counted.undermined, 1, "the person holds the claim; the material contradicts it — the model's blindspot is reported, never hidden");
  assert.equal(fold.collision.counted.residue, 1, "the person still holds against the contradiction — the residue is the question");
});

test("universeOf carries the being's blindspots — the false-belief task as a field", () => {
  const aliceHolds = lensOp({ holder: "ref:alice", claim: "alice:world:is:curious", basis: "asserted" });
  const readerRefuses = lensOp({ holder: READER, claim: "alice:world:is:curious", stance: STANCE.REFUSES, basis: "witnessed" });
  const fold = universeOf(entityForWhom({ holder: "ref:alice" }), { entries: lensLog(aliceHolds, readerRefuses) });
  assert.equal(fold.blindspots.schema, "EOMindAntimatter@1");
  assert.equal(fold.blindspots.counted.undermined, 1, "alice holds a claim the material contradicts — she does not know her own contradiction exists");
  assert.equal(fold.blindspots.undermined[0].contradictors[0].holder, READER);
  assert.equal(fold.collision.counted.residue, 1, "alice still holds — the question survives");
  assert.equal(fold.universe.heldCount, 1, "the universe is still what the being holds; the blindspots are reported apart, never folded in");
});

test("a mind that holds nothing still has its negative space — a typed gap, and a collision of zero", () => {
  const fold = foldUniverseAt(userForWhom({ question: "what happened to Alice?" }), { holder: USER, entries: lensLog(lensOp({ holder: "someone", claim: "x" })) });
  assert.equal(fold.negative.schema, "EOMindAntimatter@1");
  assert.equal(fold.collision.schema, "EOCollision@1");
  assert.equal(fold.collision.counted.residue, 0, "no held claim, no collision — a zero is counted, never guessed");
  assert.equal(fold.collision.counted.absorbed, 0);
});

// ── the falsifications, pinned so they cannot return ──────────────────────

test("FALSIFICATION, the collision's inputs: a cross-mind collide is refused, never silently mixed", () => {
  // Before the gate, collide(foldOfA, antimatterOfB) produced a confident
  // collision between two minds' worlds — a category error wearing a
  // finding's clothes.
  const entries = lensLog(
    lensOp({ holder: "victor", claim: "creature:is:fiend" }),
    lensOp({ holder: "creature", claim: "creature:is:fiend", stance: STANCE.REFUSES }),
  );
  const projected = projectPerspectives(entries);
  const fold = freeze({ holder: "victor", perspective: projected.perspectives["victor"] });
  const otherMind = mindAntimatter(projected, "creature");
  assert.throws(() => collide(fold, otherMind), /victor|creature/, "a collision between two minds' worlds is refused with the mismatch named");
  assert.throws(() => collide(fold, { undermined: [] }), /EOMindAntimatter/, "a non-anti-matter is refused at the door — a guess wearing the collision's clothes");
  assert.throws(() => collide({ perspective: null }, mindAntimatter(projected, "victor")), /collide|matter/, "a collision needs the matter it collides");
});

test("FALSIFICATION, the counts: counted is derived from the produced entries, never a literal restatement", () => {
  // Before the fix, counted restated the 1/2/2 as literals; a cube change
  // would have moved near while counted kept lying. The count must be the
  // arrays' own arithmetic or the test breaks.
  for (const [domain, byGrain] of Object.entries(TERRAIN_BY_DOMAIN)) {
    for (const grain of Object.keys(byGrain)) {
      const am = terrainAntimatter(byGrain[grain]);
      const byKind = (kind) => am.near.filter((n) => n.kind === kind).length;
      assert.equal(am.counted.ownNull, byKind("own_null"));
      assert.equal(am.counted.otherDomains, byKind("other_domain"));
      assert.equal(am.counted.ownDomain, byKind("own_domain"));
      assert.equal(am.counted.near, am.near.length);
    }
  }
});

test("FALSIFICATION, the irony wall: a claim raised outside the being's declared world is OUTSIDE, never the being's own unanswered question", () => {
  // Before the fix, the FOR-THEM fold's unsettled list included claims from
  // holders the being was never in the loop on — world-external noise
  // reported as the being's blindspot. Out of the loop means it does not
  // affect them.
  const entries = lensLog(
    lensOp({ holder: "ref:alice", claim: "alice:world:is:curious", basis: "asserted" }),
    lensOp({ holder: "walton", claim: "the:voyage:is:long", basis: "asserted" }),
  );
  const fold = universeOf(entityForWhom({ holder: "ref:alice" }), { entries });
  assert.equal(fold.blindspots.worldBound, "declared", "the FOR-THEM fold declares the being's world");
  assert.deepEqual([...fold.blindspots.world].sort(), ["ref:alice"], "a being with no relay chain has a world of only itself");
  assert.equal(fold.blindspots.counted.unsettled, 0, "walton's claim was never asked of alice — it is not her blindspot");
  assert.equal(fold.blindspots.counted.outside, 1, "the claim is reported as outside — the being is out of the loop on it (the irony wall)");
  assert.equal(fold.blindspots.outside[0].claim, "the:voyage:is:long");
});

test("FALSIFICATION, the declared world: a holder in the being's own relay chain IS its world — their claims are its unsettled", () => {
  const entries = lensLog(
    lensOp({ holder: "ref:alice", claim: "alice:world:is:curious", basis: "asserted", via: ["felix"] }),
    lensOp({ holder: "felix", claim: "felix:is:free", basis: "asserted" }),
    lensOp({ holder: "walton", claim: "the:voyage:is:long", basis: "asserted" }),
  );
  const fold = universeOf(entityForWhom({ holder: "ref:alice" }), { entries });
  assert.deepEqual([...fold.blindspots.world].sort(), ["felix", "ref:alice"], "the world is the being itself and the holders its acts relay through");
  assert.equal(fold.blindspots.counted.unsettled, 1, "felix is in alice's world — his claim is asked of her");
  assert.equal(fold.blindspots.unsettled[0].claim, "felix:is:free");
  assert.equal(fold.blindspots.counted.outside, 1, "walton is still outside it");
  assert.equal(fold.blindspots.outside[0].claim, "the:voyage:is:long");
});

test("FALSIFICATION, string-bound (disclosed, not closed): a contradiction in a different claim string is invisible — the organ refuses to infer meaning (S6)", () => {
  // "the creature is a fiend" and "the creature is gentle" contradict, but
  // the organ matches claim strings, never meaning. It must not invent the
  // relation, and it must not report it. The wall is the header's own,
  // pinned by this test so the disclosure cannot silently shrink.
  const entries = lensLog(
    lensOp({ holder: "victor", claim: "the creature is a fiend" }),
    lensOp({ holder: "walton", claim: "the creature is gentle", basis: "asserted" }),
  );
  const projected = projectPerspectives(entries);
  const negative = mindAntimatter(projected, "victor");
  assert.equal(negative.counted.undermined, 0, "the contradiction is invisible — the organ sees claim strings, never meaning");
  assert.equal(negative.counted.unsettled, 1, "the other claim is still unsettled for victor — the question survives, unclaimed as a contradiction");
  const src = readFileSync(new URL("../kernel/antimatter.js", import.meta.url), "utf8");
  assert.ok(src.includes("STRING-BOUND"), "the string-bound wall is stated in the organ's own header — a disclosed limit, never a silent one");
});

// ── the swarm's findings, pinned (falsified 2026-09-19) ───────────────────

test("SWARM, the cursor: a negative atSeq is refused — a projection is a prefix, never a suffix", () => {
  // A negative cursor passed the integer gate and read end-relative —
  // a confident projection of a prefix the caller never named.
  const entries = lensLog(lensOp({ holder: "victor", claim: "x" }));
  assert.throws(() => projectPerspectives(entries, { atSeq: -2 }), /prefix|suffix/, "a cursor is a prefix, never a suffix");
});

test("SWARM, the cell: an operator that does not land in the claimed terrain is a typed gap, never a confident anti-matter", () => {
  // {op:"EVA", domain:"Existence", grain:"Figure"} names no real cell — EVA
  // lands in Interpretation. Before the gate, the organ answered it with a
  // full confident anti-matter for Entity, violating its own wall.
  const bad = terrainAntimatter({ op: "EVA", domain: "Existence", grain: "Figure" });
  assert.equal(bad.gap.type, "unknown_spec", "a nonexistent cell has no anti-matter");
  assert.equal(bad.near.length, 0);
  const bogus = terrainAntimatter({ op: "BOGUS", domain: "Existence", grain: "Figure" });
  assert.equal(bogus.gap.type, "unknown_spec", "a bogus operator is refused at the door");
  assert.ok(terrainAntimatter({ op: "EVA", domain: "Interpretation", grain: "Figure" }).gap === undefined, "a real cell passes");
});

test("SWARM, the world: an empty world list is NO world — the whole log is the world, never the silent reverse", () => {
  // [] is truthy; before the fix it declared an EMPTY world and every claim
  // flipped to outside — a confident, reversed classification.
  const entries = lensLog(
    lensOp({ holder: "victor", claim: "creature:is:fiend" }),
    lensOp({ holder: "walton", claim: "the:voyage:is:long" }),
  );
  const projected = projectPerspectives(entries);
  const noWorld = mindAntimatter(projected, "victor", { world: [] });
  assert.equal(noWorld.worldBound, "log", "an empty list is not a world — the default is the whole log");
  assert.equal(noWorld.counted.unsettled, 1, "walton's claim is unsettled for victor, exactly as with no world at all");
  assert.equal(noWorld.counted.outside, 0);
  assert.deepEqual(noWorld.world, null);
});

test("SWARM, the split: a claim raised with different stances keeps the first raiser and discloses the split, never smoothed", () => {
  const entries = lensLog(
    lensOp({ holder: "walton", claim: "the:voyage:is:long", stance: STANCE.REFUSES }),
    lensOp({ holder: "victor", claim: "the:voyage:is:long", basis: "asserted" }),
    lensOp({ holder: "creature", claim: "creature:is:lonely", basis: "asserted" }),
  );
  const projected = projectPerspectives(entries);
  const negative = mindAntimatter(projected, "creature");
  assert.equal(negative.counted.unsettled, 1, "one claim, one question");
  const q = negative.unsettled[0];
  assert.equal(q.claim, "the:voyage:is:long");
  assert.deepEqual([...q.stances].sort(), ["holds", "refuses"], "the surviving entry keeps the first raiser and the split is disclosed");
  assert.equal(q.contestedRaise, true, "the material itself is split on the claim — the split is disclosed, never smoothed");
});

test("SWARM, the collision's matter: an empty beliefs array is no matter — a collision with undermined claims refuses it", () => {
  const entries = lensLog(
    lensOp({ holder: "victor", claim: "creature:is:fiend" }),
    lensOp({ holder: "creature", claim: "creature:is:fiend", stance: STANCE.REFUSES }),
  );
  const projected = projectPerspectives(entries);
  const negative = mindAntimatter(projected, "victor");
  assert.throws(() => collide({ holder: "victor", perspective: { beliefs: [] } }, negative), /beliefs|matter/, "an empty perspective collides nothing — 'absorbed: never did' is a caller error wearing a verdict's clothes");
});

test("SWARM, the misread region: the intersection — claims the reader holds that the material never raised, and claims it holds that the material contradicts", () => {
  const entries = lensLog(
    lensOp({ holder: READER, claim: "self:readsFor:user", basis: "witnessed" }),
    lensOp({ holder: READER, claim: "the council is corrupt", basis: "witnessed" }),
    lensOp({ holder: USER, claim: "the council is corrupt", basis: "asserted" }),
    lensOp({ holder: "witness", claim: "the council is corrupt", stance: STANCE.REFUSES, basis: "asserted" }),
  );
  const projected = projectPerspectives(entries);
  const region = intersection(projected, { reader: READER });
  assert.equal(region.schema, "EOAntimatterIntersection@1");
  assert.equal(region.counted.unsupported, 1, "self:readsFor:user is held by the reader and never raised by the material — the document's hole read as its ground");
  assert.deepEqual(region.unsupported.map((u) => u.claim), ["self:readsFor:user"]);
  assert.equal(region.counted.undermined, 1, "the reader holds 'the council is corrupt' and the material contradicts it — the reader does not know its own contradiction exists");
  assert.equal(region.undermined[0].claim, "the council is corrupt");
  assert.match(region.note, /misreading region/);
});

test("SWARM, the irony wall at the world's boundary: the reader is never in a being's world, even when a relay passes through it", () => {
  // One relayed op through the reader must not pull the reader's whole
  // claim set into the being's blindspots (falsified by the swarm).
  const entries = lensLog(
    lensOp({ holder: "ref:alice", claim: "alice:world:is:curious", basis: "asserted", via: [READER] }),
    lensOp({ holder: READER, claim: "the:letter:was:poisoned", basis: "witnessed" }),
  );
  const fold = universeOf(entityForWhom({ holder: "ref:alice" }), { entries });
  assert.deepEqual([...fold.blindspots.world], ["ref:alice"], "the reader is excluded from the being's world");
  assert.equal(fold.blindspots.counted.unsettled, 0, "the reader's claim is never asked of alice");
  assert.equal(fold.blindspots.counted.outside, 1, "it is reported as outside — the being is out of the loop on it (the irony wall)");
  assert.equal(fold.blindspots.outside[0].claim, "the:letter:was:poisoned");
});

test("SWARM, the mind's terrain: the negative space carries the perspective's own terrain anti-matter — Lens's excluded lenses, derived", () => {
  const entries = lensLog(lensOp({ holder: "victor", claim: "x" }));
  const projected = projectPerspectives(entries);
  const negative = mindAntimatter(projected, "victor");
  assert.equal(negative.lensAntiMatter.schema, "EOTerrainAntimatter@1");
  assert.equal(negative.lensAntiMatter.terrain, "Lens", "a mind's acts land in Lens — its terrain anti-matter is fixed and derived");
  assert.deepEqual(negative.lensAntiMatter.questions.slice(1, 3), ["what IS this thing?", "how is it arranged?"], "the other domains' lenses applied to the perspective — Entity and Link");
  assert.equal(negative.disclosure.length > 0, true, "the record-of-holes disclosure is a field a caller receives, not a comment it must find");
});

test("SWARM, the canonical surface: the anti-matter is reachable through the kernel's own index — the export line is exercised", async () => {
  // Before this test, antimatter.test.js imported the module directly and
  // the kernel/index.js export line was exercised by nothing — a typo there
  // would have gone green.
  const kernel = await import("../kernel/index.js");
  for (const name of ["terrainAntimatter", "mindAntimatter", "sessionAntimatter", "collide", "intersection"]) {
    assert.equal(typeof kernel[name], "function", `${name} must be exported from the kernel's own index`);
  }
});

test("SWARM, medium-blind: the anti-matter organ's executable body names no medium (S6, the sibling organ's own scan)", () => {
  const src = readFileSync(new URL("../kernel/antimatter.js", import.meta.url), "utf8");
  const body = src.slice(src.indexOf("import {"));
  for (const forbidden of ["sentence", "pronoun", "surface", "token", "word", "text"]) {
    assert.ok(
      !new RegExp(`\\b${forbidden}\\b`, "i").test(body),
      `kernel/antimatter.js's executable body must not mention "${forbidden}" — it would not be medium-general`,
    );
  }
});

test("SWARM, the line is one renderer: session and swarm share the format, and a carried separator cannot break it (falsified 2026-09-19)", async () => {
  // The renderer was once duplicated in two files and had already drifted
  // (the session's question field never entered its line; the swarm's did).
  // renderAntimatterLine is the single source; sanitization keeps the line
  // splittable even when a claim carries " | " or " — ".
  const kernel = await import("../kernel/index.js");
  assert.equal(typeof kernel.renderAntimatterLine, "function");
  const dirty = kernel.renderAntimatterLine({ untouched: ["Kind"], questions: ['a | b — c'] });
  assert.equal(dirty, "terrains NOT touched: Kind — questions this chain cannot answer: a / b - c", "the separators are sanitized");
  assert.equal(kernel.renderAntimatterLine({ untouched: [], questions: [] }), "all terrains touched", "no trailing ghost when every terrain was touched");
  const custom = kernel.renderAntimatterLine({ untouched: [], questions: ["x"], clause: "holes of the framings" });
  assert.equal(custom, "all terrains touched — holes of the framings: x", "the clause is the surface's own category");
});

test("SWARM, the parliament's holes: every admitted mind's negative space is counted apart, and an unmeasured hole is null, never zero", () => {
  // The admitted-mind fixture is theory-of-mind.test.js's own aliceStructure —
  // the same trajectory shape that fold passes the coherence leg with.
  const structureCounts = [1, 1, 1, 2, 2, 3, 3, 4, 4, 3, 3, 2, 2, 1];
  const structure = [];
  structureCounts.forEach((n, i) => {
    for (let k = 0; k < n; k += 1) structure.push({ schema: "EOHyperedge@1", id: `h:${i}:${k}`, encounterRef: `enc:${i}`, relation: "happened", participants: [{ surface: "Alice", ref: "ref:alice" }] });
  });
  const entries = [
    ...structure,
    deltaFold([lensOp({ holder: USER, claim: "alice:is:curious", basis: "asserted" })]),
    deltaFold([lensOp({ holder: "witness", claim: "alice:is:curious", stance: STANCE.REFUSES, basis: "asserted" })]),
  ];
  const asking = foldUniverseAt(userForWhom({ question: "what happened to Alice?" }), { holder: USER, entries, gateOpts: { minDiscovered: 5, minRelevance: 0.1 } });
  assert.equal(asking.admitted, true, "the mind reads the material — admitted to the parliament");
  const assembly = parliament([asking], { question: "what happened to Alice?" });
  assert.equal(assembly.counted.holes, 1, "the admitted mind's holes ride the parliament");
  const hole = assembly.holes[0];
  assert.equal(hole.holder, USER);
  assert.equal(hole.undermined, 1, "the person holds the claim the material contradicts");
  assert.equal(hole.residue, 1, "the collision's residue is counted apart");
  const bare = parliament([freeze({ holder: "x", body: "x", admitted: true, gate: { decision: "admitted" } })]);
  assert.equal(bare.holes[0].undermined, null, "a fold with no measured negative space reports null, never a measured zero");
});