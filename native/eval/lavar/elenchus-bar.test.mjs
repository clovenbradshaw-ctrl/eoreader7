// elenchus-bar.test.mjs — the measured bar, tested against the exact
// measured record the analysis stands on (AIW ch1: 21 genotypes, the
// identical 16-digit shape 0.583042748288777; the hand-set +0.005).
import test from "node:test";
import assert from "node:assert/strict";
import { rerunFloor, elenchusBar, bornAcceptance, RERUN_NULL } from "./elenchus-bar.mjs";

test("the rerun-null floor of a deterministic read is 0 — the shape is reproducible to its own digits", () => {
  const reruns = Array(5).fill(0.583042748288777); // the measured AIW ch1 reproducibility
  assert.equal(rerunFloor(reruns), 0);
});

test("THE FAILING TEST: a real improvement of +0.001 is refused by the hand-set +0.005 bar, accepted by the derived bar", () => {
  const reruns = Array(5).fill(0.583042748288777);
  const bar = elenchusBar(reruns);
  // The old bar was a literal. This test FAILS on the old code.
  assert.ok(0.005 > 0.001, "precondition: the old bar is above the improvement it refused");
  assert.ok(bar < 0.001, `the derived bar (${bar}) must admit the +0.001 improvement the +0.005 refused`);
});

test("a measured nonzero rerun floor is honored, never flattened", () => {
  const reruns = [0.583042748288777, 0.583042748288777, 0.583045548288777];
  const bar = elenchusBar(reruns);
  assert.ok(bar >= 2.8e-9, "the floor is the measured max |delta|, not epsilon");
});

test("an empty rerun set yields a zero bar — nothing measured, nothing refused", () => {
  assert.equal(elenchusBar([]), 0);
});

test("bornAcceptance: an improvement at or above the population's alpha-quantile of its own masses clears", () => {
  const populationDeltas = [0.001, 0.0002, 0.0008, 0.0001, 0.0005, 0.0003, 0.0012, 0.0004, 0.0006, 0.0009, 0.0007, 0.00005];
  // The alpha=0.05 quantile of the population's OWN masses is the top
  // (1.2e-3)^2 — a lone observation never clears the top of the
  // distribution it is being judged against; it must be one of the top
  // mass-carriers, which is exactly "coherent with the colony's growth."
  assert.equal(bornAcceptance({ delta: 0.0012, populationDeltas }), true);
  assert.equal(bornAcceptance({ delta: 0.0007, populationDeltas }), false);
});

test("bornAcceptance: a zero or negative delta carries no mass — a reroll, refused", () => {
  const populationDeltas = [0.001, 0.0005];
  assert.equal(bornAcceptance({ delta: 0, populationDeltas }), false);
  assert.equal(bornAcceptance({ delta: -0.001, populationDeltas }), false);
});

test("bornAcceptance: no observed population means no admission — never a verdict from silence", () => {
  assert.equal(bornAcceptance({ delta: 0.5, populationDeltas: [] }), false);
});

test("the declared contract is declared: draws, seed, alpha", () => {
  assert.equal(RERUN_NULL.draws, 5);
  assert.equal(RERUN_NULL.seed, 42); // the null-arm's own seed discipline
  assert.equal(RERUN_NULL.alpha, 0.05);
});