// settling.test.js — kernel/settling.js pinned on constructed streams
// (2026-09-25). Falsifiers, each named for why it could be wrong:
//   1. a stream where nothing recurs not read as never_settles (structural).
//   2. a constant stream not read as settled_any_order — could be wrong if
//      the shuffle could ever change a constant stream's run mass.
//   3. a stream of regimes (blocks of one value, then another) not read as
//      settles_in_sequence — could be wrong if run mass did not exceed what
//      the same facts scattered at random already hold.
//   4. ABSENT counted as a held value.
//   5. the refusals: fewer steps than the floor; settled but too few
//      orderings to reach the declared pValue.
//   6. not deterministic under a fixed rng; pValue not required.
import test from "node:test";
import assert from "node:assert/strict";
import { settling, CELL } from "../kernel/settling.js";
import { CANONICALIZATION_FLOOR } from "../kernel/corroboration.js";
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

test("the cell is stamped and domain-legal: NUL at Pattern grain lands on Kind", () => {
  assert.equal(cellOf(CELL.op, CELL.grain).terrain, "Kind");
});

test("1. nothing recurs → never_settles, structurally, with no shuffle spent", () => {
  const steps = Array.from({ length: 12 }, (_, i) => ({ [`topic${i}`]: "present", [`word${i}`]: "present" }));
  const r = settling(steps, { pValue: 0.05, rng: mulberry32(1) });
  assert.equal(r.verdict, "never_settles");
  assert.equal(r.settles, false);
  assert.equal(r.p, null);
  assert.equal(r.shuffles, 0);
  assert.equal(r.maxRun, 1);
  assert.match(r.basis, /nothing settles, structurally/);
});

test("2. a constant stream → settled_any_order: every slot holds, and the shuffle cannot tell (p = 1)", () => {
  const steps = Array.from({ length: 10 }, () => ({ heading: "dispute resolution", stance: "negotiate" }));
  const r = settling(steps, { pValue: 0.05, shuffles: 100, rng: mulberry32(2) });
  assert.equal(r.verdict, "settled_any_order");
  assert.equal(r.settles, true);
  assert.deepEqual(r.settled, ["heading", "stance"]);
  assert.equal(r.runMass, 20);
  assert.equal(r.p, 1);
  assert.ok(r.early > r.late, `bits fall on a constant stream: ${r.early} → ${r.late}`);
});

test("3. regimes → settles_in_sequence: blocks of one value hold beyond what the same facts scattered at random would", () => {
  const steps = [];
  for (const [who, mood] of [["raskolnikov", "feverish"], ["porfiry", "cat-and-mouse"], ["sonia", "reading"]]) {
    for (let i = 0; i < 10; i++) steps.push({ who, mood });
  }
  const r = settling(steps, { pValue: 0.05, shuffles: 400, rng: mulberry32(3) });
  assert.equal(r.verdict, "settles_in_sequence", r.basis);
  assert.deepEqual(r.settled, ["mood", "who"]);
  assert.equal(r.runMass, 20, "the longest run per settled slot (10), summed over two slots — not every block");
  assert.equal(r.maxRun, 10);
  assert.ok(r.p < 0.05, `p ${r.p}`);
});

test("4. ABSENT is not a held value: a slot present once then missing never settles", () => {
  const steps = [{ once: "x", keep: "k" }, { keep: "k" }, { keep: "k" }, { keep: "k" }, { keep: "k" }];
  const r = settling(steps, { pValue: 0.05, shuffles: 50, rng: mulberry32(4) });
  assert.deepEqual(r.settled, ["keep"]);
  assert.equal(r.runLengths.once, 1);
});

test("5. refusals are typed and derived: fewer steps than the floor; settled but too few orderings for the declared bar", () => {
  const short = settling([{ a: 1 }], { pValue: 0.05 });
  assert.equal(short.gap, "too_short");
  assert.equal(short.floor, CANONICALIZATION_FLOOR);
  const three = settling([{ a: 1 }, { a: 1 }, { a: 1 }], { pValue: 0.05 }); // 3! = 6 orderings <= 20
  assert.equal(three.gap, "settled_order_untestable");
  assert.equal(three.settles, true);
  assert.equal(three.p, null);
  const threeLoose = settling([{ a: 1 }, { a: 1 }, { a: 1 }], { pValue: 0.5 }); // 6 > 2: testable at a looser bar
  assert.equal(threeLoose.gap, undefined);
  assert.equal(threeLoose.verdict, "settled_any_order");
});

test("6. deterministic under a fixed rng; pValue is required", () => {
  const steps = Array.from({ length: 8 }, (_, i) => ({ who: i < 4 ? "a" : "b", n: i }));
  assert.deepEqual(settling(steps, { pValue: 0.05, shuffles: 60, rng: mulberry32(6) }), settling(steps, { pValue: 0.05, shuffles: 60, rng: mulberry32(6) }));
  assert.throws(() => settling(steps, {}), /pValue is declared/);
});
