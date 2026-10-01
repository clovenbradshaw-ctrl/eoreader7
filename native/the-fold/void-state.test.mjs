import test from "node:test";
import assert from "node:assert/strict";
import { drawState, tally, STATES } from "./void-state.mjs";
import * as hl from "../interpretation/hl.js";

test("the positions are hl.js's own strings, byte for byte — one lattice, never a re-typed synonym (nagarjuna one-lattice)", () => {
  assert.deepEqual(STATES, { BOUND: hl.BOUND, CONTRADICTED: hl.CONTRADICTED, UNBOUND: hl.UNBOUND, BEYOND_REACH: hl.BEYOND_REACH });
});

test("a draw is read against the examples it was shown: all reproduced is bound, one missed is contradicted, a draw that throws on every one is beyond reach, no examples is unbound", () => {
  assert.equal(drawState([true, true, true, false, false], 3), hl.BOUND, "the held-out runs do not move it: it is judged on what the void showed");
  assert.equal(drawState([true, false, true], 3), hl.CONTRADICTED);
  assert.equal(drawState(["threw", "threw", "threw"], 3), hl.BEYOND_REACH);
  assert.equal(drawState(null, 3), hl.BEYOND_REACH, "does not parse");
  assert.equal(drawState([], 0), hl.UNBOUND);
  assert.equal(drawState([true, true], 0), hl.UNBOUND, "showing nothing binds nothing, however the draw does");
});

test("a draw that throws on some examples and reproduces the rest is contradicted, not unreadable", () => {
  assert.equal(drawState([true, "threw", true], 3), hl.CONTRADICTED);
});

test("the false-bound count is the failure the system cannot see: bound on what it was shown, wrong on what it was not", () => {
  const t = tally([{ state: hl.BOUND, rightBeyondShown: true }, { state: hl.BOUND, rightBeyondShown: false }, { state: hl.CONTRADICTED }, { state: hl.BEYOND_REACH }]);
  assert.deepEqual([t.boundRight, t.falseBound, t[hl.CONTRADICTED], t[hl.BEYOND_REACH], t.n], [1, 1, 1, 1, 4]);
});
