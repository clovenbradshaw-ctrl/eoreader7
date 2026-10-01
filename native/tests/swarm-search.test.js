// swarm-search.test.js — Wilson's colony over a discrete operating-point space, and the exhaustive sweep that is its control
// (eval/lavar/lib/swarm-search.mjs).
//
// The colony is judged by the gate it breeds through (eval/lavar/swarm-gate.mjs), and the gate was built for a fitness that is noisy and costs
// a model call. A treebank fitness is neither, and the first full run measured what that does: the gate squares EVERY observed improvement,
// negative ones included, so one large loss recorded early raises the born-mass quantile past any small real gain. This file pins that
// mechanism at the gate and at the colony, so the sweep-beside-the-colony comparison in the results document cannot silently stop being true.
import test from "node:test";
import assert from "node:assert/strict";
import {
  COLONY, mulberry32, spaceSize, keyOf, allConfigs, neighbours, children, exhaustive, colony, spreadSeeds, plateauOf, leastClaim,
} from "../eval/lavar/lib/swarm-search.mjs";
import { createSwarmGate, stanceOf } from "../eval/lavar/swarm-gate.mjs";
import { RERUN_NULL } from "../eval/lavar/elenchus-bar.mjs";

// A ramp with a pit around it: along y = 0 every step in x gains 1; every point with y ≠ 0 is a pit worth -10. Integers throughout, so no
// improvement is ever a floating-point near-tie of another.
const SPACE = [{ key: "x", values: [0, 1, 2, 3, 4, 5, 6] }, { key: "y", values: [0, 1, 2] }];
const rampWithPit = ({ x, y }) => (y === 0 ? x : -10);

test("the space: its size, its fixed enumeration order, and a point's identity", () => {
  assert.equal(spaceSize(SPACE), 21);
  const all = allConfigs(SPACE);
  assert.equal(all.length, 21);
  assert.deepEqual(all[0], { x: 0, y: 0 });
  assert.deepEqual(all[1], { x: 0, y: 1 }, "the last dimension varies fastest");
  assert.deepEqual(all[20], { x: 6, y: 2 });
  assert.equal(new Set(all.map((c) => keyOf(SPACE, c))).size, 21, "every point has its own key");
  assert.equal(keyOf(SPACE, { x: 3, y: 1 }), "3|1");
});

test("neighbours: one step up and one step down along each coordinate, never off the edge; children: one parent's value per coordinate, never a parent", () => {
  assert.deepEqual(neighbours(SPACE, { x: 0, y: 0 }).map((c) => keyOf(SPACE, c)), ["1|0", "0|1"]);
  assert.equal(neighbours(SPACE, { x: 3, y: 1 }).length, 4);
  assert.equal(neighbours(SPACE, { x: 6, y: 2 }).length, 2);
  const kids = children(SPACE, { x: 0, y: 0 }, { x: 6, y: 2 });
  assert.deepEqual(kids.map((c) => keyOf(SPACE, c)).sort(), ["0|2", "6|0"]);
  const three = [{ key: "a", values: [0, 1] }, { key: "b", values: [0, 1] }, { key: "c", values: [0, 1] }];
  const crossed = children(three, { a: 0, b: 0, c: 0 }, { a: 1, b: 1, c: 1 });
  assert.equal(crossed.length, 6, "2^3 - 2 mixed children of two points that differ everywhere");
  assert.equal(children(three, { a: 0, b: 0, c: 0 }, { a: 0, b: 0, c: 0 }).length, 0, "a point bred with itself has no child");
});

test("mulberry32 is a seeded generator: the same seed, the same stream; values are in [0, 1)", () => {
  const a = mulberry32(42), b = mulberry32(42), c = mulberry32(43);
  const sa = Array.from({ length: 8 }, a), sb = Array.from({ length: 8 }, b), sc = Array.from({ length: 8 }, c);
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
  assert.ok(sa.every((x) => x >= 0 && x < 1));
});

test("exhaustive: every point is measured once, the best is the argmax, and a flat top is counted as a plateau rather than hidden", () => {
  let calls = 0;
  const r = exhaustive(SPACE, (c) => { calls += 1; return rampWithPit(c); });
  assert.equal(calls, 21);
  assert.equal(r.evaluations, 21);
  assert.deepEqual(r.best.cfg, { x: 6, y: 0 });
  assert.equal(r.best.f, 6);
  assert.equal(r.plateau, 1);
  const flat = exhaustive(SPACE, ({ x }) => (x >= 5 ? 1 : 0));
  assert.equal(flat.plateau, 6, "x = 5 and 6 across three values of y all tie at the top");
  assert.deepEqual(flat.best.cfg, { x: 5, y: 0 }, "ties break by enumeration order, declared");
  assert.equal(exhaustive(SPACE, (c) => ({ f: rampWithPit(c), extra: "kept" })).best.detail.extra, "kept", "a fitness may return its own detail and it rides the point");
});

test("spreadSeeds: the lowest corner, the centre and the highest corner, chosen without looking at a score", () => {
  assert.deepEqual(spreadSeeds(SPACE), [{ x: 0, y: 0 }, { x: 3, y: 1 }, { x: 6, y: 2 }]);
});

test("the colony climbs while a step's gain is as large as the largest loss it has seen: on a ramp it reaches the sweep's champion, and everything it did is on the genealogy", () => {
  // a ramp in x with y irrelevant, from ONE seed: every step up gains 1 and every step down loses 1, so no loss is ever larger than the gain that
  // follows it. (A second seed far below the champion would put its neighbours on the record as large losses against it — that is the stall, below.)
  const ramp = ({ x }) => x;
  const seeds = [{ x: 3, y: 1 }];
  const sweep = exhaustive(SPACE, ramp);
  const r = colony({ space: SPACE, fitness: ramp, seeds, knobs: { randomPerGen: 0 } });
  assert.equal(r.best.f, sweep.best.f, "the colony reaches the top of the ramp");
  assert.equal(r.best.cfg.x, 6);
  assert.equal(r.evaluations, r.census.length);
  // append-only genealogy: the seeds first, then one row per birth; every row has a fate
  assert.deepEqual(r.genealogy.slice(0, seeds.length).map((g) => g.op), ["seed"]);
  assert.ok(r.genealogy.every((g) => ["kept", "refused", "retried"].includes(g.fate)));
  assert.ok(r.genealogy.filter((g) => g.op !== "seed").every((g) => g.gen >= 1));
  assert.equal(r.births, r.genealogy.filter((g) => g.op !== "seed" && g.fate !== "retried").length);
  assert.equal(r.admitted, r.genealogy.filter((g) => g.op !== "seed" && g.fate === "kept").length);
  assert.equal(r.admitted, 3, "it admitted exactly the climb 3 → 4 → 5 → 6");
});

test("a point tried once is never measured again: a re-meet is 'retried', and the measurement count is the number of distinct points plus the bar's rerun of the best seed", () => {
  const counts = new Map();
  const fit = (c) => { const k = keyOf(SPACE, c); counts.set(k, (counts.get(k) ?? 0) + 1); return rampWithPit(c); };
  const r = colony({ space: SPACE, fitness: fit, seeds: spreadSeeds(SPACE), knobs: { randomPerGen: 0 } });
  const best0 = keyOf(SPACE, { x: 0, y: 0 });
  for (const [k, n] of counts) assert.equal(n, k === best0 ? 1 + RERUN_NULL.draws : 1, `point ${k}`);
  assert.ok(r.genealogy.some((g) => g.fate === "retried"), "the colony met a point it had already measured");
  assert.ok(r.genealogy.filter((g) => g.fate === "retried").every((g) => g.improvement === null));
  // a seed handed over twice is one point
  const dup = new Map();
  colony({ space: SPACE, fitness: (c) => { const k = keyOf(SPACE, c); dup.set(k, (dup.get(k) ?? 0) + 1); return rampWithPit(c); }, seeds: [{ x: 0, y: 0 }, { x: 0, y: 0 }], knobs: { randomPerGen: 0, maxGens: 1 } });
  assert.equal(dup.get("0|0"), 1 + RERUN_NULL.draws, "measured once as a seed, then the bar's reruns");
});

test("the bar is MEASURED: a deterministic fitness collapses it to epsilon, a fitness that varies between reads raises it to what it varies by, and nothing kept is below it", () => {
  const det = colony({ space: SPACE, fitness: rampWithPit, seeds: spreadSeeds(SPACE), knobs: { randomPerGen: 0 } });
  assert.equal(det.bar, Number.EPSILON);
  let n = 0;
  const jittery = (c) => rampWithPit(c) + (n++ % 2 ? 0.4 : 0);
  const noisy = colony({ space: SPACE, fitness: jittery, seeds: spreadSeeds(SPACE), knobs: { randomPerGen: 0 } });
  assert.ok(noisy.bar >= 0.4 - 1e-12, `the bar ${noisy.bar} honours the measured rerun spread`);
  for (const r of [det, noisy]) for (const g of r.genealogy) if (g.op !== "seed" && g.fate === "kept") assert.ok(g.improvement >= r.bar, "an admitted point cleared the bar");
});

test("the colony is deterministic: the same seed gives the same genealogy, and the random arm is drawn from unseen points only", () => {
  const run = (seed) => colony({ space: SPACE, fitness: rampWithPit, seeds: spreadSeeds(SPACE), knobs: { seed } });
  assert.equal(JSON.stringify(run(42).genealogy), JSON.stringify(run(42).genealogy));
  const withRandom = run(7);
  const randoms = withRandom.genealogy.filter((g) => g.op === "random");
  assert.ok(randoms.length >= 1, "REC·Ground: a random point each generation");
  assert.ok(randoms.every((g) => g.fate !== "retried"), "a random draw is from the unseen pool, so it is never a re-meet");
  assert.equal(COLONY.seed, RERUN_NULL.seed, "the colony's default seed is the contract's declared seed");
});

test("each birth carries its cell's stance from the kernel cube, never a label typed here", () => {
  const r = colony({ space: SPACE, fitness: rampWithPit, seeds: spreadSeeds(SPACE), knobs: { randomPerGen: 1 } });
  const want = { seed: stanceOf("INS", "Figure"), random: stanceOf("REC", "Ground"), mutate: stanceOf("INS", "Figure"), breed: stanceOf("CON", "Figure") };
  for (const g of r.genealogy) assert.equal(g.stance, want[g.op], g.op);
  assert.ok(new Set(Object.values(want)).size >= 3, "the cube really distinguishes the acts");
});

test("the colony stops after dryLimit consecutive generations that admit nothing, and says it stopped dry", () => {
  const r = colony({ space: SPACE, fitness: rampWithPit, seeds: spreadSeeds(SPACE), knobs: { randomPerGen: 0 } });
  assert.equal(r.dry, true);
  assert.ok(r.generations < COLONY.maxGens);
  const cap = colony({ space: SPACE, fitness: rampWithPit, seeds: spreadSeeds(SPACE), knobs: { randomPerGen: 0, maxGens: 1 } });
  assert.equal(cap.generations, 1, "maxGens is a cap, honoured");
});

// ── THE FINDING THIS FILE EXISTS TO PIN ──────────────────────────────────────

test("THE GATE'S STALL, AT THE GATE: it squares every observed improvement, negatives included, so a small real gain is refused beside a large recorded loss", () => {
  const gate = createSwarmGate({ bar: Number.EPSILON });
  gate.recordImprovement(0);
  gate.recordImprovement(-0.7);
  gate.recordImprovement(0.1);
  assert.equal(gate.admits(0.1), false, "a +0.1 gain is refused: its square, 0.01, is below the 95th percentile of the squares, which is the loss's 0.49");
  const gainsOnly = createSwarmGate({ bar: Number.EPSILON });
  gainsOnly.recordImprovement(0);
  gainsOnly.recordImprovement(0.1);
  assert.equal(gainsOnly.admits(0.1), true, "the same gain with the loss left out of the record is admitted");
  // If the gate is ever changed to treat losses differently, the stall and the sullivan-names-RESULTS.md comparison of the two colonies
  // were measured against a gate that no longer exists. Re-run `node eval/lavar/sullivan-names.mjs` before changing this assertion.
});

test("THE GATE'S STALL, IN THE COLONY: the same landscape and seeds, one colony that records its losses and one that records only gains — the first is stopped by a pit it passed, the second climbs further", () => {
  const seeds = spreadSeeds(SPACE);
  const base = { randomPerGen: 0 };
  const sweep = exhaustive(SPACE, rampWithPit);
  const recordsLosses = colony({ space: SPACE, fitness: rampWithPit, seeds, knobs: { ...base, recordLosses: true } });
  const gainsOnly = colony({ space: SPACE, fitness: rampWithPit, seeds, knobs: { ...base, recordLosses: false } });
  assert.equal(sweep.best.f, 6, "the sweep finds the top of the ramp");
  assert.equal(recordsLosses.best.f, 1, "one step up the ramp, then the pits recorded around the seeds raise the born-mass quantile past every further gain");
  assert.ok(gainsOnly.best.f > recordsLosses.best.f, `the gains-only colony climbs further (${gainsOnly.best.f} against ${recordsLosses.best.f})`);
  assert.ok(recordsLosses.genealogy.some((g) => g.fate === "refused" && g.improvement > 0), "a refused row with a positive improvement is the stall made visible on the genealogy");
  assert.equal(recordsLosses.dry, true);
  // and the crossover is what carries the gains-only colony to the top: x from the highest corner, y from the lowest, in one child
  assert.equal(gainsOnly.best.f, sweep.best.f);
  const crossed = gainsOnly.genealogy.find((g) => g.op === "breed" && g.fate === "kept");
  assert.ok(crossed, "a kept breed row");
  assert.deepEqual(crossed.cfg, { x: 6, y: 0 });
  assert.equal(crossed.parents.length, 2, "a bred child names both parents");
});

test("THE STALL NEEDS NO PIT: a smooth peak does it, because the neighbour on the far side of the best point is worse by more than the gain on the near side", () => {
  const peak = ({ x }) => 0 - (x - 4) ** 2;
  const seeds = [{ x: 0, y: 0 }, { x: 3, y: 1 }];
  const sweep = exhaustive(SPACE, peak);
  const recordsLosses = colony({ space: SPACE, fitness: peak, seeds, knobs: { randomPerGen: 0, recordLosses: true } });
  const gainsOnly = colony({ space: SPACE, fitness: peak, seeds, knobs: { randomPerGen: 0, recordLosses: false } });
  assert.equal(sweep.best.f, 0);
  assert.equal(recordsLosses.best.f, -1, "stopped one step short: x = 2 is 3 worse than x = 3, x = 4 is only 1 better, and 1² < 3²");
  assert.equal(gainsOnly.best.f, 0, "with the loss left out of the record the same step is admitted");
  // The lesson the results document draws: the gate is a top-5% test of the squares of EVERY improvement it has seen, so on a landscape with a
  // peak the colony cannot be the selector — the exhaustive sweep is, and the colony is reported beside it as what it measured and where it stopped.
});

// ── PLATEAUS ─────────────────────────────────────────────────────────────────

test("plateauOf: every point that ties the best within a tolerance; empty in, empty out", () => {
  const pts = [{ cfg: "a", f: 1 }, { cfg: "b", f: 1 - 1e-13 }, { cfg: "c", f: 0.9 }];
  assert.deepEqual(plateauOf(pts).map((p) => p.cfg), ["a", "b"]);
  assert.deepEqual(plateauOf(pts, 0.2).map((p) => p.cfg), ["a", "b", "c"]);
  assert.deepEqual(plateauOf([]), []);
});

test("leastClaim: the point that claims least — fewest claims, then the higher floor, then the lower breadth, then enumeration order", () => {
  const P = (minShare, maxK, claims) => ({ cfg: { minShare, maxK, claims }, f: 1 });
  const claimsOf = (c) => c.claims;
  const opts = { claimsOf, higher: ["minShare"], lower: ["maxK"] };
  assert.deepEqual(leastClaim([P(0.5, 2, 3), P(0.5, 2, 1), P(0.5, 2, 2)], opts).cfg.claims, 1, "fewest claims first");
  assert.deepEqual(leastClaim([P(0.5, 2, 1), P(0.9, 2, 1)], opts).cfg.minShare, 0.9, "tied on claims: the higher floor speaks less");
  assert.deepEqual(leastClaim([P(0.9, 4, 1), P(0.9, 2, 1)], opts).cfg.maxK, 2, "tied on both: the lower breadth is less machinery");
  const first = P(0.9, 2, 1), second = { cfg: { ...first.cfg }, f: 1 };
  assert.equal(leastClaim([first, second], opts).cfg, first.cfg, "a full tie is the first in enumeration order");
  assert.equal(leastClaim([], opts), null);
  assert.equal(leastClaim([P(0.5, 2, 0)], opts).claims, 0, "a point that claims nothing is a point");
});
