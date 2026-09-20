// swarm-residue.test.mjs — the swarm's anti-matter: the surviving read
// carries its named holes (the essay "The anti-matter of every terrain",
// section six — the swarm is the collision chamber, and the residue is a
// question, not an answer). Derived from the framings' OWN records: the
// terrains they occupied against the nine, and their typed gaps, which ARE
// the questions this chain cannot answer. Never guessed; record-bound.
import { test } from "node:test";
import assert from "node:assert/strict";
import { swarmResidue, antTerrain } from "../swarm-server.mjs";
import { TERRAINS } from "../native/kernel/terrain-state.js";

const ant = (over = {}) => ({ ids: ["x"], kind: "seed", f: 0, admitted: false, terrain: "Lens", ...over });

test("the residue reports the terrains no framing touched and the typed gaps as the chain's unanswered questions", () => {
  const r = swarmResidue([
    ant({ terrain: "Lens", admitted: true, f: 3 }),
    ant({ terrain: "Entity", gap: "no_material" }),
    ant({ terrain: "Link", gap: "not_yet_executable" }),
    ant({ terrain: undefined }),
  ]);
  assert.equal(r.schema, "EOSwarmAntimatter@1");
  assert.equal(r.counted.touched, 3, "three terrains occupied by framings");
  assert.equal(r.counted.unplaced, 1, "a framing with no terrain is counted unplaced, never guessed into a terrain");
  assert.equal(r.counted.questions, 2);
  assert.deepEqual([...r.questions].sort(), ["no_material", "not_yet_executable"], "the typed gaps ARE the questions this chain cannot answer");
  assert.equal(r.untouchedTerrains.length, 9 - 3, "the nine-terrain closure, minus the touched");
  assert.ok(!r.untouchedTerrains.includes("Lens"));
  assert.ok(r.line.includes("terrains NOT touched: "));
  assert.ok(r.line.includes("holes of the framings: no_material | not_yet_executable"));
  assert.equal(r.recordBound, true);
});

test("the residue's holes are the framings' own — the same gap is one question, never counted per framing", () => {
  const r = swarmResidue([
    ant({ terrain: "Lens", gap: "no_material" }),
    ant({ terrain: "Lens", gap: "no_material" }),
    ant({ terrain: "Lens", admitted: true, f: 2 }),
  ]);
  assert.equal(r.counted.questions, 1, "deduped by the typed gap — one question, whatever the number of framings that could not read it");
  assert.equal(r.untouchedTerrains.length, 8);
  assert.deepEqual([...r.touchedTerrains], ["Lens"]);
  assert.equal(r.counted.unplaced, 0);
});

test("an empty swarm is the full negative space — all nine terrains untouched, and the pointed-at reason is the question", () => {
  const r = swarmResidue([], { question: "no capacity points at this" });
  assert.equal(r.counted.touched, 0);
  assert.equal(r.counted.unplaced, 0);
  assert.equal(r.untouchedTerrains.length, TERRAINS.length, "the whole cube is untouched — the full negative space");
  assert.deepEqual(r.questions, ["no capacity points at this"], "the pointing's own typed reason is the chain's first question");
  assert.equal(r.counted.questions, 1);
});

test("FALSIFICATION, the line's hygiene: separators a question carries are made safe — the line splits back (falsified 2026-09-19)", () => {
  // The swarm's pointing reasons always contained " — " (the template's own
  // em-dash), and material can carry " | " — the line once could not be
  // split back. The shared renderer sanitizes: | -> /, — -> -, newlines ->
  // spaces. The structured array is the record; the line is a rendering.
  const r = swarmResidue([], { question: 'no registry row matches "cast | graph" — name a capacity' });
  const parts = r.line.split(" — ");
  assert.equal(parts.length, 2, "the clause join is the only em-dash — the carried one was sanitized");
  assert.ok(!parts[1].includes(" | "), "the item separator can never collide with a carried separator");
  assert.ok(!parts[1].includes(" — "), "the questions clause carries no em-dash");
  assert.ok(parts[1].includes("holes of the framings: no registry row matches \"cast / graph\" - name a capacity"));
});

test("FALSIFICATION, the differentiated ant: its own cell wins over the parent's terrain label — the report never contradicts its own persona (falsified 2026-09-19)", () => {
  // A SEG·Figure ant is a Link-cell framing; the differentiated census
  // carries the parent's terrain label (Lens), which once won and left the
  // report contradicting its own persona. The cell is the framing's record.
  const differentiated = { ids: ["cast"], kind: "differentiated", op: "SEG", grain: "Figure", terrain: "Lens", admitted: true, f: 2 };
  const r = swarmResidue([differentiated]);
  assert.equal(antTerrain(differentiated), "Link", "the framing's own cell");
  assert.deepEqual([...r.touchedTerrains], ["Link"], "the residue counts the cell the framing occupies");
  assert.equal(r.counted.unplaced, 0);
  assert.ok(r.untouchedTerrains.includes("Lens"), "the parent's label is not the child's occupation");
});

test("the residue line rides the swarm answer — the surviving read carries its named holes", () => {
  const r = swarmResidue([ant({ terrain: "Lens", gap: "not_yet_executable" })]);
  assert.match(r.line, /^terrains NOT touched: /);
  assert.ok(r.line.endsWith("not_yet_executable"), "the question is the last thing on the line — the residue is a question, not an answer");
});

// ── the falsifications, pinned (2026-09-19) ───────────────────────────────

test("FALSIFICATION, the persona hole: a framing with no cube coordinates carries its own typed gap as a question", () => {
  // Before the fix, the persona gap (a row with no op/grain — the capacity's
  // own hole) was dropped from the residue; the swarm's strongest question
  // never reached the line.
  const r = swarmResidue([
    ant({ terrain: "Lens", gap: "not_yet_executable", persona: { gap: "no_cube_coordinates" } }),
    ant({ terrain: "Entity", persona: { gap: "no_cube_coordinates" } }),
  ]);
  assert.equal(r.counted.personaGaps, 2, "both framings carry the hole");
  assert.equal(r.counted.questions, 2, "the persona gap is a question the chain cannot answer — deduped with the other typed gaps");
  assert.ok(r.questions.includes("no_cube_coordinates"));
  assert.ok(r.line.includes("no_cube_coordinates"));
});

test("FALSIFICATION, the closure: a terrain that is not one of the cube's nine is never touched — the line's closure holds", () => {
  // Before the fix, a "Bogus" terrain was counted touched while untouched
  // stayed all nine: touched ∩ untouched ≠ ∅, a closure the line silently
  // broke. Now the invalid terrain is unplaced, and the two lists never lie
  // about each other.
  const r = swarmResidue([
    ant({ terrain: "Bogus" }),
    ant({ terrain: "Lens", admitted: true, f: 1 }),
  ]);
  assert.deepEqual([...r.touchedTerrains], ["Lens"], "only the cube's own terrains can be touched");
  assert.equal(r.counted.unplaced, 1, "the bogus terrain is unplaced — counted, never guessed");
  assert.equal(r.counted.touched + r.counted.unplaced, 2, "every framing is accounted for exactly once");
  assert.equal(r.untouchedTerrains.length + r.counted.touched, TERRAINS.length, "the closure holds — touched and untouched partition the nine");
});

test("FALSIFICATION, the vacuity is checkable: when no framing carries a terrain, the line reports all nine — honestly, with the count to prove it", () => {
  // The vacuous all-nine case must be checkable from the residue itself:
  // every framing unplaced, zero touched, and the disclosure on the record.
  const r = swarmResidue([
    ant({ terrain: undefined, gap: "no_material" }),
    ant({ terrain: undefined, gap: "no_material" }),
  ]);
  assert.equal(r.counted.touched, 0);
  assert.equal(r.counted.unplaced, 2);
  assert.equal(r.untouchedTerrains.length, 9, "no framing occupied a terrain — the whole cube is untouched, honestly");
  assert.equal(r.counted.questions, 1, "the one typed gap is the one question");
  assert.equal(r.recordBound, true);
});

test("FALSIFICATION, the dropped terrain: a seed framing's terrain is the cube's own inverse of its op+grain — the residue was once wrong about the whole cube", () => {
  // eoSwarm's seed census drops terrain; the residue then reported all nine
  // untouched while the framings demonstrably occupied terrains (their
  // stances resolved from those very op+grain pairs). antTerrain restores
  // the terrain by the same arithmetic capacityAnt used to derive grain from
  // the row's terrain — an inverse, never a guess.
  assert.equal(antTerrain({ op: "EVA", grain: "Figure" }), "Lens");
  assert.equal(antTerrain({ op: "NUL", grain: "Ground" }), "Void");
  assert.equal(antTerrain({ terrain: "Link", op: "EVA", grain: "Figure" }), "Lens", "the framing's own cell wins — a carried label that contradicts it is the parent's, never the framing's (falsified 2026-09-19)");
  assert.equal(antTerrain({ terrain: "Link" }), "Link", "the carried label is the fallback when no cell is derivable");
  assert.equal(antTerrain({ op: "BOGUS", grain: "Figure" }), null, "a derivation that fails is a typed absence, never a guess");
  assert.equal(antTerrain({}), null);
  const r = swarmResidue([
    ant({ terrain: undefined, op: "EVA", grain: "Figure", gap: "not_yet_executable" }),
  ]);
  assert.deepEqual([...r.touchedTerrains], ["Lens"], "the derived terrain reaches the residue");
  assert.equal(r.counted.unplaced, 0);
});