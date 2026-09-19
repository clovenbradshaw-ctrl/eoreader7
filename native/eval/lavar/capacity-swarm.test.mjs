// capacity-swarm.test.mjs — universal swarmable capacity, falsified.
import test from "node:test";
import assert from "node:assert/strict";
import { listCapacities } from "../../organs/capacities.js";
import {
  capacityAnt, capacityAnts, detectSwarmIntent, pointCapacities,
  yieldOf, swarmCapacities,
} from "./capacity-swarm.mjs";
import { personaOf } from "./eo-swarm.mjs";

// Toy runCapacity: cast yields 3 referents, relations yields 2 edges,
// everything else is reference-only (the real not_yet_executable shape).
const toyRun = (id, { text } = {}) => {
  if (!text?.trim()) return { gap: "no_material", id };
  if (id === "cast") return { id, referents: [{ id: "a" }, { id: "b" }, { id: "c" }] };
  if (id === "relations") return { id, edges: [{ e: 1 }, { e: 2 }] };
  return { gap: "not_yet_executable", id };
};

test("auto-generation: every registry row becomes an ant with no hand list", () => {
  const ants = capacityAnts();
  assert.equal(ants.length, listCapacities().length);
  assert.ok(ants.length > 10, "registry is large; all of it is swarmable");
  const ids = new Set(ants.map((a) => a.capacity));
  for (const c of listCapacities()) assert.ok(ids.has(c.id), `capacity ${c.id} has an ant`);
});

test("auto-generation: a newly registered capability is swarmable untouched", () => {
  const ants = capacityAnts([{ id: "brand-new", terrain: "Link", op: "CON", what: "a future organ" }]);
  assert.equal(ants.length, 1);
  assert.deepEqual(ants[0].ids, ["brand-new"]);
  assert.equal(ants[0].op, "CON");
  assert.equal(ants[0].grain, "Figure");
});

test("capacityAnt parses compound ops and unknown cells honestly", () => {
  assert.equal(capacityAnt({ id: "x", op: "SIG+INS", terrain: "Entity" }).op, "SIG");
  const unknown = capacityAnt({ id: "y", op: "???", terrain: "Nope" });
  assert.equal(unknown.op, null);
  assert.equal(unknown.grain, null);
});

test("detectSwarmIntent routes swarm phrasing, ignores ordinary chat", () => {
  assert.equal(detectSwarmIntent("swarm all capacities at this chapter").swarm, true);
  assert.equal(detectSwarmIntent("try everything, find signal from noise").swarm, true);
  assert.equal(detectSwarmIntent("what does this passage mean?").swarm, false);
});

test("pointCapacities: 'everything' points at the whole registry", () => {
  const p = pointCapacities("swarm everything whatsoever");
  assert.equal(p.mode, "all");
  assert.equal(p.pointed.length, listCapacities().length);
});

test("pointCapacities: NL names point at matching rows", () => {
  const p = pointCapacities("point the cast and relations ants at this text");
  assert.equal(p.mode, "pointed");
  const ids = p.pointed.map((c) => c.id);
  assert.ok(ids.includes("cast") && ids.includes("relations"));
});

test("pointCapacities: exact registry id addresses, even below the word floor (web)", () => {
  const p = pointCapacities("point the web ant at this");
  assert.deepEqual(p.pointed.map((c) => c.id), ["web"]);
});

test("pointCapacities: no match is a typed gap, never silent empty", () => {
  const p = pointCapacities("xyzzy zqxj wugs qvothe");
  assert.equal(p.gap, "no_pointing");
});

test("yieldOf: counts are signal, gaps are zero noise", () => {
  assert.equal(yieldOf({ referents: [1, 2] }), 2);
  assert.equal(yieldOf({ edges: [1] }), 1);
  assert.equal(yieldOf({ gap: "not_yet_executable", id: "graph" }), 0);
  assert.equal(yieldOf(null), 0);
});

test("swarmCapacities: NL-pointed swarm finds the real signal", () => {
  const out = swarmCapacities({
    nl: "point the cast and relations ants at this",
    runCapacity: toyRun,
    material: { text: "Lincoln appointed Hamlin. Hamlin served.", name: "t" },
    bar: Number.EPSILON,
  });
  assert.deepEqual([...out.pointed].sort(), ["cast", "relations"]);
  const byId = Object.fromEntries(out.reports.map((r) => [r.capacity, r]));
  assert.equal(byId.cast.yield, 3);
  assert.equal(byId.relations.yield, 2);
  // breeding unions the two yields (3+2=5) and must become best: synergy via swarm
  assert.deepEqual([...out.swarm.best.ids].sort(), ["cast", "relations"]);
  assert.ok(!personaOf(out.swarm.best).gap, "bred ant carries a real persona");
});

test("swarmCapacities: reference-only noise never admits on empty material", () => {
  const out = swarmCapacities({
    nl: "swarm everything",
    runCapacity: toyRun,
    material: { text: "", name: "empty" },
    bar: Number.EPSILON,
  });
  assert.equal(out.mode, "all");
  // every yield is 0 (no_material / not_yet_executable); best stays 0
  assert.equal(out.swarm.best.f, 0);
  const bred = out.swarm.ants.filter((a) => a.kind === "bred");
  assert.ok(bred.every((a) => a.admitted === false), "zero-improvement children are refused by the gate");
});
