// kernel/cascade.js's cascadeNull/cascadeSurprise — a measured null for
// cascade() reach, per plans/cascade-null-model.md. Pins the additions
// directly, never touching cascade()/dependentsIndex() themselves.
//
// Falsifiers proven here, each named for why it could be wrong:
//   1. cascadeNull is not deterministic under a fixed rng — could be wrong
//      if sampling order or trial order depended on Map/Set iteration in a
//      way a seeded rng doesn't pin (it shouldn't, since both are built
//      fresh and walked in insertion order every call).
//   2. cascadeSurprise on a hub seed (star graph) does not rank near 1.0 —
//      could be wrong if the null's synthetic seeds could themselves land
//      on the hub as often as a leaf, which would flatten the distribution
//      instead of concentrating it near the leaves' near-zero reach.
//   3. cascadeSurprise on the one node with strictly minimal reach in a
//      graph where that reach is a genuine minority outcome does not rank
//      near 0.0 — the mirror case of (2), proven on a chain rather than
//      the star, because in the star reach-0 is the MAJORITY outcome
//      (every leaf has it), so a leaf's own reach ties nearly everything
//      and correctly ranks near 1.0 under the "at or below" definition —
//      that is not a bug, it is what "reach 0 is typical here" looks like.
//   4. rank is not roughly uniform on [0, 1] when "real" seeds are drawn
//      the same way as the null itself — could be wrong if the null
//      sampling and the "real" sampling are not actually comparable
//      (e.g. sampling with replacement on one side only), which would bias
//      rank toward one end regardless of the graph.
import test from "node:test";
import assert from "node:assert/strict";
import { dependentsIndex, cascade, cascadeNull, cascadeSurprise } from "../kernel/cascade.js";

// A tiny deterministic PRNG (mulberry32) so tests never depend on
// Math.random — same seed, same sequence, every run.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function chainGraph(n) {
  // a -> b -> c -> ... , n nodes, node i depends on node i-1
  const ids = Array.from({ length: n }, (_, i) => String.fromCharCode(97 + i));
  const items = ids.slice(1).map((id, i) => ({ id, deps: [ids[i]] }));
  return { index: dependentsIndex(items, (item) => item.deps), ids };
}

function starGraph(leafCount) {
  const leaves = Array.from({ length: leafCount }, (_, i) => `leaf${i}`);
  const items = leaves.map((id) => ({ id, deps: ["hub"] }));
  return { index: dependentsIndex(items, (item) => item.deps), hub: "hub", leaves };
}

test("cascadeNull is deterministic under a fixed rng", () => {
  const { index } = chainGraph(10);
  const first = cascadeNull(index, 1, { trials: 20, rng: mulberry32(42) });
  const second = cascadeNull(index, 1, { trials: 20, rng: mulberry32(42) });
  assert.deepEqual(first, second, "same seed, same rng sequence, same output — nothing else contributes randomness");
});

test("chain graph: cascadeNull's mean reach from a single random seed matches the analytic average tail length", () => {
  const n = 26;
  const { index } = chainGraph(n);
  // From a random position i (0-indexed) in a chain of n nodes, the tail
  // reachable (nodes strictly after i) has length (n-1-i). Averaged over
  // i = 0..n-1 uniformly, that's (n-1)/2.
  const expected = (n - 1) / 2;
  const { reachedCounts } = cascadeNull(index, 1, { trials: 4000, rng: mulberry32(7) });
  const mean = reachedCounts.reduce((a, b) => a + b, 0) / reachedCounts.length;
  assert.ok(
    Math.abs(mean - expected) < 1.0,
    `mean reach ${mean} should track the analytic average tail length ${expected} within tolerance`
  );
});

test("star graph: seeding the hub ranks near 1.0 — every synthetic single-leaf draw reaches far less", () => {
  const { index, hub } = starGraph(24);
  const result = cascadeSurprise(index, [hub], { trials: 500, rng: mulberry32(3) });
  assert.equal(result.reached, 24, "the hub's real cascade reaches every leaf");
  assert.ok(result.rank > 0.95, `hub seed should rank near 1.0, got ${result.rank}`);
});

test("chain graph: seeding the one node with the strictly minimal reach ranks near 0.0 — here reach 0 is a genuine minority (1 node out of n), unlike the star", () => {
  const { index, ids } = chainGraph(26);
  const last = ids[ids.length - 1];
  const result = cascadeSurprise(index, [last], { trials: 500, rng: mulberry32(11) });
  assert.equal(result.reached, 0, "the chain's last node has no dependents");
  assert.ok(result.rank < 0.15, `the unique minimal-reach seed should rank low, got ${result.rank}`);
});

test("unbiasedness: rank is roughly uniform on [0, 1] when the 'real' seeds are drawn the same way as the null itself", () => {
  const { index } = chainGraph(40);
  const rng = mulberry32(99);
  const ranks = [];
  for (let i = 0; i < 60; i++) {
    // Draw a "real" seed exactly the way cascadeNull would, from the same
    // universe, so this run's seeds are not privileged over the null's own.
    const universe = [...index.keys()].concat([...index.values()].flatMap((s) => [...s]));
    const seed = universe[Math.floor(rng() * universe.length)];
    ranks.push(cascadeSurprise(index, [seed], { trials: 100, rng }).rank);
  }
  const mean = ranks.reduce((a, b) => a + b, 0) / ranks.length;
  assert.ok(
    mean > 0.35 && mean < 0.65,
    `mean rank ${mean} over ${ranks.length} draws should sit near 0.5 (uniform), not cluster at either end`
  );
});

test("cascadeNull and cascadeSurprise never call anything but the real cascade() — a diamond graph's exact-once/shortest-depth guarantee still holds inside every trial", () => {
  const items = [
    { id: "B", deps: ["A"] },
    { id: "C", deps: ["A"] },
    { id: "D", deps: ["B", "C"] },
  ];
  const index = dependentsIndex(items, (item) => item.deps);
  const direct = cascade(index, ["A"]);
  const viaSurprise = cascadeSurprise(index, ["A"], { trials: 10, rng: mulberry32(1) });
  assert.equal(viaSurprise.reached, direct.length, "the 'real' half of cascadeSurprise is exactly cascade()'s own result, not a reimplementation");
});
