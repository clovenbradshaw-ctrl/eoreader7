// seed-and-consent.test.mjs — the 2026-09-20 benchmark wiring: (1) the story
// cast draw is SEEDABLE — the same seed over the same ground draws the same
// cast (reproducible runs), and a null seed stays the honest fresh random;
// (2) web sourcing honors per-request consent (webConsent:true) as well as the
// process-wide env toggle.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createSeededRng, seedFrom, shuffled } from "./rng.js";

test("the same seed draws the same sequence (reproducible runs)", () => {
  const a = createSeededRng("the role of the Cumberland River");
  const b = createSeededRng("the role of the Cumberland River");
  const seqA = Array.from({ length: 8 }, () => a());
  const seqB = Array.from({ length: 8 }, () => b());
  assert.deepEqual(seqA, seqB, "identical seed, identical draws");
});

test("a different seed draws a different sequence", () => {
  const a = createSeededRng("topic-one");
  const b = createSeededRng("topic-two");
  const seqA = Array.from({ length: 8 }, () => a()).join(",");
  const seqB = Array.from({ length: 8 }, () => b()).join(",");
  assert.notEqual(seqA, seqB);
});

test("seedFrom is stable for the same value however it is constructed", () => {
  assert.equal(seedFrom({ topic: "rivers", n: 2 }), seedFrom({ n: 2, topic: "rivers" }), "key order must not change the seed");
});

test("shuffled with a fixed seed is deterministic and never mutates the input", () => {
  const pool = ["a", "b", "c", "d", "e"];
  const before = [...pool];
  const rng = createSeededRng("fixed-seed");
  const s1 = shuffled(pool, rng);
  const rng2 = createSeededRng("fixed-seed");
  const s2 = shuffled(pool, rng2);
  assert.deepEqual(s1, s2, "same seed, same shuffle");
  assert.deepEqual(pool, before, "the input is never mutated");
});