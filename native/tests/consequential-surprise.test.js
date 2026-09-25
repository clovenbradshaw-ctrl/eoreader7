// consequential-surprise.test.js — kernel/consequential-surprise.js pinned on
// constructed graphs (2026-09-25). Falsifiers, each named for why it could be
// wrong:
//   1. not deterministic under a fixed rng — could be wrong if the per-seed-
//      count null cache changed the rng's consumption order between runs.
//   2. a slot attached to a star's hub is not load-bearing / a leaf's is —
//      could be wrong if the null were drawn from a different universe than
//      the real seeds, or if the rank used a different "at or below" than
//      cascadeSurprise.
//   3. reach 0 counted as load-bearing on an empty index (rank vacuously 1.0).
//   4. thinButLoadBearing not reported when the hub sits under the
//      corroboration floor, or reported when it does not.
//   5. the holograph not updated exactly once per call (a repeat must move
//      belief less than the first admission — bayes-surprise's own law).
//   6. the two partitions not summing to the whole (arithmetic drift).
import test from "node:test";
import assert from "node:assert/strict";
import { createHolograph } from "../kernel/bayes-surprise.js";
import { dependentsIndex } from "../kernel/cascade.js";
import { CANONICALIZATION_FLOOR } from "../kernel/corroboration.js";
import { consequentialSurprise, CELL } from "../kernel/consequential-surprise.js";
import { cellOf } from "../kernel/cube.js";

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function starGraph(leafCount) {
  const leaves = Array.from({ length: leafCount }, (_, i) => `leaf${i}`);
  const items = leaves.map((id) => ({ id, deps: ["hub"] }));
  return { index: dependentsIndex(items, (item) => item.deps), leaves };
}

const seedsOf = (slot) => (slot === "hubSlot" ? ["hub"] : slot === "leafSlot" ? ["leaf3"] : []);

test("the cell is stamped and domain-legal: EVA at Pattern grain lands on Paradigm", () => {
  const cell = cellOf(CELL.op, CELL.grain);
  assert.equal(cell.terrain, "Paradigm");
  assert.equal(cell.mode, "Relate");
});

test("1. deterministic under a fixed rng", () => {
  const { index } = starGraph(30);
  const a = consequentialSurprise(createHolograph(), { hubSlot: "x", leafSlot: "y", loose: "z" }, { index, seedsOf, pValue: 0.05, trials: 50, rng: mulberry32(3) });
  const b = consequentialSurprise(createHolograph(), { hubSlot: "x", leafSlot: "y", loose: "z" }, { index, seedsOf, pValue: 0.05, trials: 50, rng: mulberry32(3) });
  assert.deepEqual(a, b);
});

test("2. star graph: the slot attached to the hub is load-bearing, the slot attached to a leaf is local, the unattached slot is local by construction", () => {
  const { index } = starGraph(40);
  const r = consequentialSurprise(createHolograph(), { hubSlot: "x", leafSlot: "y", loose: "z" }, { index, seedsOf, pValue: 0.05, trials: 200, rng: mulberry32(11) });
  const row = (slot) => r.rows.find((x) => x.slot === slot);
  assert.equal(row("hubSlot").reached, 40);
  assert.ok(row("hubSlot").rank > 0.95, `hub rank ${row("hubSlot").rank}`);
  assert.equal(row("hubSlot").loadBearing, true);
  assert.equal(row("leafSlot").reached, 0);
  assert.equal(row("leafSlot").loadBearing, false);
  assert.equal(row("loose").rank, null);
  assert.equal(row("loose").loadBearing, false);
  assert.ok(r.rows[0].slot === "hubSlot", "load-bearing rows sort first");
  assert.ok(r.consequentialBits > 0 && Math.abs(r.consequentialBits - row("hubSlot").bayes) < 1e-12);
});

test("3. a reach of zero is never load-bearing, even on an empty index where every synthetic seed also reaches zero", () => {
  const index = dependentsIndex([], () => []);
  const r = consequentialSurprise(createHolograph(), { hubSlot: "x" }, { index, seedsOf, pValue: 0.05, trials: 20, rng: mulberry32(5) });
  const row = r.rows[0];
  assert.equal(row.reached, 0);
  assert.equal(row.rank, 1, "rank is vacuously 1.0 on an empty index — that is what the guard exists for");
  assert.equal(row.loadBearing, false);
  assert.equal(r.consequentialBits, 0);
});

test("4. thinButLoadBearing: a load-bearing hub under the corroboration floor is reported; at the floor it is not; volatility passes through", () => {
  const { index } = starGraph(40);
  const thin = consequentialSurprise(createHolograph(), { hubSlot: "x" }, { index, seedsOf, pValue: 0.05, trials: 200, rng: mulberry32(2), corroborationOf: () => CANONICALIZATION_FLOOR - 1 });
  assert.equal(thin.rows[0].thin, true);
  assert.equal(thin.rows[0].thinButLoadBearing, true);
  const solid = consequentialSurprise(createHolograph(), { hubSlot: "x" }, { index, seedsOf, pValue: 0.05, trials: 200, rng: mulberry32(2), corroborationOf: () => CANONICALIZATION_FLOOR });
  assert.equal(solid.rows[0].thin, false);
  assert.equal(solid.rows[0].thinButLoadBearing, false);
  const volatile = consequentialSurprise(createHolograph(), { hubSlot: "x" }, { index, seedsOf, pValue: 0.05, trials: 200, rng: mulberry32(2), volatilityOf: () => 0.01 });
  assert.equal(volatile.rows[0].volatile, true);
});

test("5. the holograph is admitted exactly once per call: a repeat moves belief less, and the admitted count advances by one", () => {
  const { index } = starGraph(10);
  const holo = createHolograph();
  const first = consequentialSurprise(holo, { hubSlot: "x" }, { index, seedsOf, pValue: 0.05, trials: 20, rng: mulberry32(9) });
  assert.equal(holo.admitted, 1);
  const second = consequentialSurprise(holo, { hubSlot: "x" }, { index, seedsOf, pValue: 0.05, trials: 20, rng: mulberry32(9) });
  assert.equal(holo.admitted, 2);
  assert.ok(second.bayes < first.bayes, `repeat ${second.bayes} did not move less than first ${first.bayes}`);
});

test("6. the partition sums to the whole, and the declared inputs are required", () => {
  const { index } = starGraph(12);
  const r = consequentialSurprise(createHolograph(), { hubSlot: "x", leafSlot: "y", loose: "z" }, { index, seedsOf, pValue: 0.05, trials: 30, rng: mulberry32(1) });
  assert.ok(Math.abs(r.consequentialBits + r.localBits - r.bayes) < 1e-9);
  assert.throws(() => consequentialSurprise(createHolograph(), { a: 1 }, { index, seedsOf }), /pValue is declared/);
  assert.throws(() => consequentialSurprise(createHolograph(), { a: 1 }, { index, pValue: 0.05 }), /seedsOf/);
  assert.throws(() => consequentialSurprise(createHolograph(), { a: 1 }, { seedsOf, pValue: 0.05 }), /dependentsIndex/);
  assert.match(r.basis, /pValue 0.05/);
});
