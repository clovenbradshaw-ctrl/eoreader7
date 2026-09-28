// native/organs/void-holarchy.test.mjs — the per-operator GRAIN, pinned.
//
// void-holarchy.js's defineLevelVoid() used to look up every one of the
// nine operators' terrain at a single hardcoded grain ("Figure"), so a
// level's declared/undeclared cells all read the SAME terrain regardless of
// which operator actually asked the question — five of the nine operators
// (NUL/INS/SEG/SYN/REC) do NOT canonically live at Figure grain (see
// void-shape.js's own VOID_OPERATORS table, and cube.js's real
// TERRAIN_BY_DOMAIN), so their reported `.terrain` was simply wrong.
//
// This asserts, for each of the nine operators, that defineLevelVoid's
// per-cell `.terrain` equals the REAL cube's TERRAIN_BY_DOMAIN value for
// that operator's own canonical grain — against the real, unmocked
// native/kernel/cube.js, never a restated table.
import test from "node:test";
import assert from "node:assert/strict";
import { defineLevelVoid, voidHolarchy, VOID_OPERATORS } from "./void-holarchy.js";
import { cellOf, TERRAIN_BY_DOMAIN } from "../kernel/cube.js";

// The nine operators' canonical terrain, read off the real cube via each
// operator's own canonical grain (VOID_OPERATORS' own `grain` field) —
// never a second, hand-typed table that could drift from cube.js.
const EXPECTED_TERRAIN = Object.fromEntries(
  VOID_OPERATORS.map((o) => [o.op, cellOf(o.op, o.grain).terrain]),
);

test("every operator's canonical grain resolves to the real cube's own terrain (sanity: the fixture is real, not restated)", () => {
  assert.deepEqual(EXPECTED_TERRAIN, {
    NUL: "Void",
    SIG: "Entity",
    INS: "Kind",
    SEG: "Field",
    CON: "Link",
    SYN: "Network",
    DEF: "Lens",
    EVA: "Lens",
    REC: "Paradigm",
  });
});

test("defineLevelVoid: every declared cell's terrain matches the real cube's terrain at ITS OWN canonical grain, for all nine operators", () => {
  // Every field left undeclared, so all nine land in `undeclared` — this
  // exercises the exact array the hardcoded-grain bug corrupted.
  const level = defineLevelVoid({}, { cellOf });
  assert.equal(level.schema, "EOVoidLevel@1");
  assert.equal(level.undeclared.length, 9);
  assert.equal(level.declared.length, 0);
  for (const u of level.undeclared) {
    assert.equal(
      u.terrain,
      EXPECTED_TERRAIN[u.op],
      `${u.op} should report terrain ${EXPECTED_TERRAIN[u.op]} (its own canonical grain), got ${u.terrain}`,
    );
  }
});

test("defineLevelVoid: the terrain is identical whether the cell is declared or undeclared — declaring a value never changes which cell it lands in", () => {
  const allDeclared = Object.fromEntries(VOID_OPERATORS.map((o) => [o.field, "x"]));
  const level = defineLevelVoid(allDeclared, { cellOf });
  assert.equal(level.declared.length, 9);
  assert.equal(level.undeclared.length, 0);
  for (const d of level.declared) {
    assert.equal(d.terrain, EXPECTED_TERRAIN[d.op]);
  }
});

test("voidHolarchy: every level's void carries the same corrected per-operator terrain, not a single grain uniformly", () => {
  const hol = voidHolarchy({ modality: "text", fieldsByLevel: {}, cellOf });
  assert.equal(hol.schema, "EOVoidHolarchy@1");
  assert.ok(hol.levels.length > 0);
  for (const level of hol.levels) {
    for (const cell of [...level.void.declared, ...level.void.undeclared]) {
      assert.equal(cell.terrain, EXPECTED_TERRAIN[cell.op]);
    }
  }
});

// One operator per canonical terrain, named individually so a failure
// message points straight at which operator regressed rather than only at
// an aggregate mismatch count.
for (const [op, expectedTerrain] of Object.entries({
  NUL: "Void",
  SIG: "Entity",
  INS: "Kind",
  SEG: "Field",
  CON: "Link",
  SYN: "Network",
  DEF: "Lens",
  EVA: "Lens",
  REC: "Paradigm",
})) {
  test(`defineLevelVoid: ${op} reports terrain ${expectedTerrain}, not whatever a uniform grain would give it`, () => {
    const level = defineLevelVoid({}, { cellOf });
    const cell = level.undeclared.find((u) => u.op === op);
    assert.ok(cell, `${op} should appear in undeclared`);
    assert.equal(cell.terrain, expectedTerrain);
  });
}
