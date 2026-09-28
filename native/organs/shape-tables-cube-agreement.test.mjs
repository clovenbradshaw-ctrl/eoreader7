// native/organs/shape-tables-cube-agreement.test.mjs — a drift guard, not a
// new mechanism.
//
// THE HAZARD. essay-shape-register.js's SHAPE_ASSERTIONS and
// document-ledger.js's VOID_CELLS each carry a hand-typed `terrain` field
// per (op, grain) cell, rather than deriving it from cube.js's own
// `cellOf`/`TERRAIN_BY_DOMAIN` — unlike story-shapes.js, which takes an
// injected `cellOf` and never hardcodes a terrain at all. cube.js's own
// OPERATOR_CHAIN comment names exactly this class of bug: "a restatement of
// a table... is exactly how the divergence... happened." Checked by hand at
// the time this test was written, all 54 hardcoded terrain values (27 cells
// × 2 tables) agreed with the real cube — so there is no live bug today, but
// nothing before this file would have NOTICED if cube.js's TERRAIN_BY_DOMAIN
// or either hardcoded table changed without the other moving too.
//
// This file changes that: it is the loud, immediate test failure a future
// silent drift should produce, in the same spirit as void-holarchy.test.mjs's
// own per-operator terrain pin — against the real, unmocked cube.js, never a
// second restated table.
//
// SCOPE: a test file only. No production code is exercised for behavior here
// beyond a straight field comparison; the one production change this file's
// existence required was exporting VOID_CELLS from document-ledger.js (it
// was a module-local const with no external reader).
import test from "node:test";
import assert from "node:assert/strict";
import { cellOf } from "../kernel/cube.js";
import { SHAPE_ASSERTIONS } from "./essay-shape-register.js";
import { VOID_CELLS } from "../the-fold/document-ledger.js";

// Every cell asserts the REAL cube resolved its own (op, grain) — never a
// silent pass from two independently-wrong values both reading undefined.
function assertAgreesWithCube(entries, label) {
  assert.ok(Array.isArray(entries) && entries.length > 0, `${label}: expected a non-empty array of cells`);
  for (const entry of entries) {
    const real = cellOf(entry.op, entry.grain);
    assert.ok(!real.gap, `${label}: ${entry.op}·${entry.grain} — cellOf reported a gap (${real.reason}), not a real cell`);
    assert.ok(typeof entry.terrain === "string" && entry.terrain.length > 0, `${label}: ${entry.op}·${entry.grain} — the table's own terrain is not a real string`);
    assert.equal(entry.terrain, real.terrain, `${label}: ${entry.op}·${entry.grain} declares terrain "${entry.terrain}" but the real cube says "${real.terrain}"`);
  }
}

test("essay-shape-register.js's SHAPE_ASSERTIONS: every cell's hardcoded terrain agrees with cube.js's cellOf", () => {
  assertAgreesWithCube(SHAPE_ASSERTIONS, "SHAPE_ASSERTIONS");
});

test("document-ledger.js's VOID_CELLS: every cell's hardcoded terrain agrees with cube.js's cellOf", () => {
  assertAgreesWithCube(VOID_CELLS, "VOID_CELLS");
});

test("both tables cover the full 27-cell space — nine operators × three grains, no cell missing, none repeated", () => {
  for (const [entries, label] of [[SHAPE_ASSERTIONS, "SHAPE_ASSERTIONS"], [VOID_CELLS, "VOID_CELLS"]]) {
    const keys = entries.map((e) => `${e.op}·${e.grain}`);
    assert.equal(keys.length, 27, `${label}: expected 27 cells, found ${keys.length}`);
    assert.equal(new Set(keys).size, 27, `${label}: expected 27 DISTINCT cells, found a repeat`);
  }
});

test("the two tables agree with EACH OTHER on terrain, cell for cell (both already agree with cube.js individually — this pins that agreement as a fact about the pair, not just about cube.js)", () => {
  const byCell = (entries) => new Map(entries.map((e) => [`${e.op}·${e.grain}`, e.terrain]));
  const shapeTerrain = byCell(SHAPE_ASSERTIONS);
  const voidTerrain = byCell(VOID_CELLS);
  for (const [key, terrain] of shapeTerrain) {
    assert.equal(voidTerrain.get(key), terrain, `${key}: SHAPE_ASSERTIONS says "${terrain}", VOID_CELLS says "${voidTerrain.get(key)}"`);
  }
});
