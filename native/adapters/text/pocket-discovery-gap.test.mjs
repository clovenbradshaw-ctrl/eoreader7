// pocket-discovery-gap.test.mjs — locks in the honestly-measured behavior
// this file's own header documents: correctly reports k=1 on an unstructured
// cloud, and recovers a real cluster count on well- and moderately-separated
// synthetic data. Not a claim of perfect recall (the header discloses 4/5,
// not 5/5, on repeated 3-cluster trials) -- these are the two single-seed
// cases from that same measurement run that DID pass, so a future edit that
// breaks the method entirely is caught, without pretending the method is
// flawless.

import test from "node:test";
import assert from "node:assert/strict";
import { discoverPocketsByGapStatistic } from "./pocket-discovery-gap.js";

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function gaussian(rnd) { let u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function blob(center, spread, count, rnd) { const out = []; for (let i = 0; i < count; i++) out.push(center.map((c) => c + gaussian(rnd) * spread)); return out; }
function randomCenter(dim, scale, rnd) { return Array(dim).fill(0).map(() => gaussian(rnd) * scale); }

test("a single unstructured cloud (non-axis-aligned) is reported as k=1", () => {
  const rnd = rng(99);
  const cloud = blob(Array(16).fill(0), 1.0, 45, rnd);
  const result = discoverPocketsByGapStatistic(cloud, { seed: 11, nullTrials: 20 });
  assert.equal(result.k, 1);
  assert.equal(result.pockets.length, 1);
});

test("two moderately-separated, non-axis-aligned blobs are recovered as k=2", () => {
  const rnd = rng(123);
  const centers = [randomCenter(16, 1.8, rnd), randomCenter(16, 1.8, rnd)];
  const data = centers.flatMap((c) => blob(c, 0.6, 20, rnd));
  const result = discoverPocketsByGapStatistic(data, { seed: 13, nullTrials: 20 });
  assert.equal(result.k, 2);
});

test("a repeated well-separated 3-cluster case (seed 401) is recovered as k=3", () => {
  const rnd = rng(401);
  const centers = [randomCenter(16, 3, rnd), randomCenter(16, 3, rnd), randomCenter(16, 3, rnd)];
  const data = centers.flatMap((c) => blob(c, 0.6, 15, rnd));
  const result = discoverPocketsByGapStatistic(data, { seed: 401, nullTrials: 20 });
  assert.equal(result.k, 3);
});

test("fewer than 4 vectors returns one trivial pocket rather than attempting a gap estimate", () => {
  const result = discoverPocketsByGapStatistic([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
  assert.equal(result.k, 1);
  assert.equal(result.pockets.length, 1);
  assert.equal(result.pockets[0].n, 3);
});

test("every returned pocket's memberIdx partitions all n input vectors exactly once", () => {
  const rnd = rng(7);
  const centers = [randomCenter(16, 3, rnd), randomCenter(16, 3, rnd), randomCenter(16, 3, rnd)];
  const data = centers.flatMap((c) => blob(c, 0.6, 15, rnd));
  const result = discoverPocketsByGapStatistic(data, { seed: 7, nullTrials: 20 });
  const allIdx = result.pockets.flatMap((p) => p.memberIdx).sort((a, b) => a - b);
  assert.deepEqual(allIdx, Array.from({ length: data.length }, (_, i) => i));
});
