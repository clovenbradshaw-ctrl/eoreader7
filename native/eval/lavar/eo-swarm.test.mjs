// eo-swarm.test.mjs — the ant/eoSwarm naming layer, falsified. eoSwarm()
// must produce ants; every ant's persona must trace to a named archon
// already registered in organs/creativity-table.js (never a made-up one);
// and breeding (CON·Figure crossover) must still work, reachable only
// through the new eoSwarm/ant vocabulary.
import test from "node:test";
import assert from "node:assert/strict";
import { eoSwarm, personaOf } from "./eo-swarm.mjs";
import { ARCHONS as CREATIVITY_ARCHONS } from "../../organs/creativity-table.js";

// A tiny domain-general problem: three genes (a,b,c), "b depends on a", the
// fitness rewards having both a and b together (so breeding a+c and a+b,c
// have somewhere to find an improvement), terrains are just the gene names.
const terrain = { a: "Field", b: "Link", c: "Network" };
const deps = { a: new Set(), b: new Set(["a"]), c: new Set() };
const legal = (ids) => !ids.includes("b") || ids.includes("a");
const terrainOf = (ids) => ids.map((id) => terrain[id]);
const depsOf = (id) => deps[id];
const terrainOfOrgan = (id) => terrain[id];
const fitness = (ids) => {
  const has = (x) => ids.includes(x);
  let f = 0.1 * ids.length;
  if (has("a") && has("b")) f += 0.5; // the synergy only breeding can find
  return f;
};

test("eoSwarm produces ants, each traceable to a named creativity-table.js archon", () => {
  const result = eoSwarm({
    ants: [
      { id: "seed-a", ids: ["a"], op: "SYN", grain: "Pattern" },
      { id: "seed-b", ids: ["b"], op: "SIG", grain: "Ground" },
      { id: "seed-c", ids: ["c"], op: "REC", grain: "Ground" },
    ],
    fitness, terrainOf, legal, depsOf, terrainOfOrgan,
    bar: Number.EPSILON,
  });
  assert.ok(result.ants.length >= 3, "at least the seed ants are produced");
  const named = Object.values(CREATIVITY_ARCHONS);
  for (const ant of result.ants) {
    if (!ant.op || !ant.grain) continue; // an ant with no cube coordinates carries no persona claim
    assert.ok(!ant.persona.gap, `ant ${ant.ids.join("+")} (${ant.op}·${ant.grain}) must resolve a persona`);
    assert.ok(named.includes(ant.persona.archon), `persona archon "${ant.persona.archon}" must be one already registered in creativity-table.js`);
  }
});

test("personaOf grounds in creativity-table.js's own ARCHONS table, keyed off the ant's cube cell", () => {
  // Wilson himself: Pattern grain, Interpretation domain/phase — the swarm's own archon.
  const wilsonAnt = { op: "REC", grain: "Pattern" }; // REC·Pattern -> Interpretation domain
  const persona = personaOf(wilsonAnt);
  assert.equal(persona.archon, "Wilson");
  assert.equal(CREATIVITY_ARCHONS["Pattern|Interpretation"], "Wilson");
  assert.equal(persona.functionalRole, "Composing", "the mechanical/structural role rides beside the archon, not instead of it");
});

test("an ant with no cube coordinates gets a typed gap, never an invented persona", () => {
  const p = personaOf({ ids: ["x"] });
  assert.equal(p.gap, "no_cube_coordinates");
});

test("breeding (CON·Figure crossover) is reachable through eoSwarm and finds the a+b synergy fitness alone cannot", () => {
  const bred = eoSwarm({
    ants: [
      { id: "seed-a", ids: ["a"], op: "SYN", grain: "Pattern" },
      { id: "seed-b", ids: ["b"], op: "SIG", grain: "Ground" },
    ],
    fitness, terrainOf, legal, depsOf, terrainOfOrgan,
    bar: Number.EPSILON,
  });
  const bredAnts = bred.ants.filter((a) => a.kind === "bred");
  assert.ok(bredAnts.length >= 1, "at least one CON·Figure cross was attempted");
  const abChild = bredAnts.find((a) => a.ids.slice().sort().join(",") === "a,b");
  assert.ok(abChild, "the a+b crossover child exists");
  assert.equal(abChild.admitted, true, "the synergy fitness makes the crossover an improvement, so the gate admits it");
  assert.equal(bred.best.ids.slice().sort().join(","), "a,b", "the bred child becomes the new best — crossover works through eoSwarm");
  assert.equal(abChild.persona.archon, CREATIVITY_ARCHONS["Figure|Structure"], "a CON·Figure birth's persona traces to the archon registered for Figure|Structure");
});
