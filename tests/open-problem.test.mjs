// open-problem.test.mjs — the open-problem hand: prove/solve asks for famously
// unsolved problems are declined mechanically, pre-model (zero mouth tokens);
// factual questions ABOUT them flow through normally.
import { test } from "node:test";
import assert from "node:assert/strict";
import { openProblemOf } from "../proxy-runner.mjs";

test("prove-asks trip the gate with millennium flags", () => {
  assert.deepEqual(openProblemOf("Prove that P ≠ NP."), { name: "P versus NP", millennium: true });
  assert.deepEqual(openProblemOf("Prove the Collatz conjecture: every positive integer reaches 1."), { name: "the Collatz conjecture", millennium: false });
  const ns = openProblemOf("Give an explicit smooth solution to the 3D Navier–Stokes existence problem.");
  assert.equal(ns?.name, "Navier–Stokes existence and smoothness");
  assert.equal(ns?.millennium, true);
});

test("factual questions do NOT trip the gate", () => {
  assert.equal(openProblemOf("What is P vs NP?"), null);
  assert.equal(openProblemOf("Who proved Fermat's Last Theorem, and by what method?"), null);
  assert.equal(openProblemOf("Was the Poincaré conjecture proved, and by whom?"), null);
  assert.equal(openProblemOf("Tell me about the Collatz conjecture."), null);
});

test("unknown problems are not claimed", () => {
  assert.equal(openProblemOf("Prove that all even numbers are the sum of two primes in base 7."), null);
  assert.equal(openProblemOf("Solve x^2 = 4."), null);
});
