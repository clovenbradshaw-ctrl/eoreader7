// tests/arrow.test.js — Eddington: a sequence has an arrow when it reads
// differently backwards; which way is forward is learned from a reference.
// The falsification lives here: a process that is reversible by
// construction and reads as an arrow refutes the organ; a cyclic process
// that reads as reversible refutes it the other way.

import { test } from "node:test";
import assert from "node:assert/strict";
import { arrowOf, irreversibility, grams, reversedGrams, jsDivergence, CELL } from "../kernel/arrow.js";
import { lcg } from "../kernel/continuation.js";

// a → b → c → a, with a small chance of staying put: irreversible by construction
function cyclic(n, seed, stay = 0.1) {
  const rng = lcg(seed), states = ["a", "b", "c"], out = [];
  let s = 0;
  for (let i = 0; i < n; i += 1) { out.push(states[s]); if (rng() > stay) s = (s + 1) % 3; }
  return out;
}
// symmetric random walk on a ring: reversible by construction (detailed balance)
function walk(n, seed) {
  const rng = lcg(seed), states = ["a", "b", "c", "d"], out = [];
  let s = 0;
  for (let i = 0; i < n; i += 1) { out.push(states[s]); s = (s + (rng() < 0.5 ? 1 : 3)) % 4; }
  return out;
}
function iid(n, seed) { const rng = lcg(seed); return Array.from({ length: n }, () => "abcd"[Math.floor(rng() * 4)]); }

test("the cell is CON·Pattern — Network, Tracing — a regularity of order relations across the whole", () => {
  assert.equal(CELL.op, "CON");
  assert.equal(CELL.grain, "Pattern");
  assert.equal(CELL.terrain, "Network");
  assert.equal(CELL.stance, "Tracing");
});

test("grams reverse gram-wise, and a palindrome has irreversibility exactly 0", () => {
  const p = grams(["a", "b", "c"], 2);
  assert.deepEqual([...reversedGrams(p).keys()], ["b\u0001a", "c\u0001b"]);
  assert.equal(irreversibility(["a", "b", "c", "b", "a"], 2), 0);
  assert.equal(jsDivergence(p, p), 0);
});

test("a cyclic chain is irreversible — beyond every shuffled draw", () => {
  const r = arrowOf(cyclic(400, 1));
  assert.equal(r.verdict, "irreversible");
  assert.equal(r.null.rank, 0);
  assert.ok(r.irreversibility > r.null.max);
  assert.equal(r.direction, null, "no reference, no direction — disclosed as null");
});

test("FALSIFICATION: a reversible walk and an i.i.d. stream must NOT read as an arrow", () => {
  for (const [name, ev] of [["walk", walk(400, 2)], ["iid", iid(400, 3)]]) {
    const r = arrowOf(ev);
    assert.equal(r.verdict, "reversible", `${name}: irreversibility ${r.irreversibility} vs null ${r.null.min}–${r.null.max}`);
    assert.ok(r.null.rank > 0);
  }
});

test("the null of the cyclic chain — its own shuffle — is reversible", () => {
  const rng = lcg(9);
  const ev = cyclic(400, 1);
  const sh = [...ev].sort(() => rng() - 0.5);
  assert.equal(arrowOf(sh).verdict, "reversible");
});

test("direction is learned from a reference: the chain reads forward against itself, backward when reversed", () => {
  const ref = cyclic(600, 4);
  const fwd = arrowOf(cyclic(300, 5), { reference: ref });
  const bwd = arrowOf([...cyclic(300, 5)].reverse(), { reference: ref });
  assert.equal(fwd.direction, "forward");
  assert.equal(bwd.direction, "backward");
  assert.equal(fwd.preference.rank, 0);
  assert.equal(bwd.preference.rank, 0);
  assert.equal(bwd.verdict, "irreversible", "reversal keeps the magnitude; only the sign flips");
});

test("a reference cannot give a direction to a sequence that has no arrow", () => {
  const r = arrowOf(iid(300, 6), { reference: cyclic(600, 4) });
  assert.equal(r.verdict, "reversible");
  assert.equal(r.direction, null);
});

test("void, not zero: an unordered input or one too short to read backwards", () => {
  assert.equal(arrowOf(null).verdict, "void");
  assert.equal(arrowOf(["a", "b"]).verdict, "void");
  assert.throws(() => arrowOf(["a", "b", "c"], { k: 1 }), /at least 2/);
});

test("same seed, same verdict and same null — reproducible", () => {
  const a = arrowOf(cyclic(200, 7), { draws: 16, seed: 3 });
  const b = arrowOf(cyclic(200, 7), { draws: 16, seed: 3 });
  assert.deepEqual(a, b);
});
