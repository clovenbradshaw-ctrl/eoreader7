// code-habitat.test.js — the 27 houses, and the walls that keep them a habitat and not a decoration.
// Real cube, real chain; the only stand-ins are contract-shaped objects.
import test from "node:test";
import assert from "node:assert/strict";
import { algebraAddresses, cellOf, OPERATOR_CHAIN, GRAINS, DOMAINS } from "../kernel/cube.js";
import { housesFor, unitOf, chainRank, residentCell, occupancy, leads, describe, cellKey, HABITAT_SCHEMA } from "../organs/code-habitat.js";

const run = (args, want) => ({ args: () => args, want: () => want });
const objectUnit = (name = "unit", doc = "") => ({ name, doc, params: ["a"], runs: [run([1], { x: 1, y: "a" }), run([2], { x: 2, y: "b" }), run([3], { x: 3, y: "c" }), run([4], { x: 4, y: "d" })] });
const scalarUnit = () => ({ name: "scalar", params: ["a"], runs: [run([1], 2), run([2], 4), run([3], 6), run([4], 8)] });

test("27 houses: exactly the cube's addresses, each a real cell, each with a question", () => {
  const houses = housesFor(unitOf(objectUnit()));
  assert.equal(houses.length, 27);
  assert.deepEqual(houses.map((h) => h.cell), algebraAddresses().map((c) => cellKey(c.op, c.grain)));
  assert.equal(new Set(houses.map((h) => h.cell)).size, 27, "no house twice");
  assert.equal(new Set(houses.map((h) => h.terrain)).size, 9, "all nine terrains are housed");
  for (const h of houses) { assert.ok(!cellOf(h.op, h.grain).gap, h.cell); assert.ok(h.asks.length > 10, `${h.cell} has a question`); }
  assert.ok(HABITAT_SCHEMA.startsWith("EOCodeHabitat@"));
});

test("the chain order is DERIVED from the kernel's own chain: Existence houses before Structure before Interpretation, and within a domain Differentiate, Relate, Generate", () => {
  const houses = housesFor(unitOf(objectUnit()));
  const rank = (h) => chainRank(h.cell);
  for (const a of houses) for (const b of houses) {
    const di = DOMAINS.indexOf(a.domain) - DOMAINS.indexOf(b.domain);
    if (di < 0) assert.ok(rank(a) < rank(b), `${a.cell} (${a.domain}) must precede ${b.cell} (${b.domain})`);
  }
  // the rank is exactly (position in the engine's chain) × grains + grain — recomputed here from the chain, not restated
  for (const h of houses) assert.equal(rank(h), OPERATOR_CHAIN.indexOf(h.op) * GRAINS.length + GRAINS.indexOf(h.grain));
  assert.ok(chainRank("CON·Figure") < chainRank("SYN·Figure") && chainRank("SYN·Figure") < chainRank("DEF·Figure") && chainRank("DEF·Figure") < chainRank("EVA·Figure"));
  assert.throws(() => chainRank("FOO·Figure"), TypeError);
});

test("a resident's house is validated by the engine's own cube — a cell that is not one of the 27 is a typed refusal, never a guess", () => {
  assert.equal(residentCell("CON·Figure").terrain, "Link");
  assert.equal(residentCell(["DEF", "Figure"]).terrain, "Lens");
  assert.throws(() => residentCell("FOO·Figure"), /not a house/);
  assert.throws(() => residentCell("CON·Nowhere"), /not a house/);
  assert.throws(() => housesFor(unitOf(objectUnit()), [{ name: "x", cell: "ZZZ·Ground" }]), TypeError);
});

test("THE CUBE IS NOT A CONTENT CLASSIFIER: relevance reads the unit's structure only — the same structure under different words and different targets gets the same houses", () => {
  const a = unitOf(objectUnit("busTimes", "unpadded clock times"));
  const b = unitOf({ name: "wardReport", doc: "a hospital ward -> free beds", params: ["z"], runs: [run([9], { p: 0, q: 0 }), run([8], { p: 1, q: 1 }), run([7], { p: 2, q: 2 }), run([6], { p: 3, q: 3 })] });
  const rel = (u) => housesFor(u).map((h) => `${h.cell}:${h.relevant}`);
  assert.deepEqual(rel(a), rel(b));
  // a unit with no output fields has no particulars: every per-field house is not-relevant, every whole-unit house stays relevant
  const s = housesFor(unitOf(scalarUnit()));
  for (const h of s.filter((h) => h.grain === "Figure" || h.cell === "SYN·Pattern")) assert.equal(h.relevant, false, h.cell);
  for (const h of s.filter((h) => h.grain !== "Figure" && h.cell !== "SYN·Pattern")) assert.equal(h.relevant, true, h.cell);
  assert.equal(unitOf(scalarUnit()).shape, "scalar");
  assert.equal(unitOf(objectUnit()).shape, "object");
  assert.deepEqual([...unitOf(objectUnit()).keys], ["x", "y"]);
});

test("occupancy: a house is `resident` when a species can live there, `occupied` only when a fill names it, `empty` when relevant and nothing lives there", () => {
  const unit = unitOf(objectUnit());
  const houses = housesFor(unit, [{ name: "copy", cell: "CON·Figure" }, { name: "compose", cell: "SYN·Figure" }]);
  assert.equal(houses.find((h) => h.cell === "CON·Figure").status, "resident");
  assert.equal(houses.find((h) => h.cell === "DEF·Figure").status, "empty");
  assert.deepEqual(occupancy(houses, []).filter((h) => h.status === "occupied"), [], "no fills, no occupancy");
  const occ = occupancy(houses, [{ slot: "u.x", species: "copy", cell: "CON·Figure" }, { slot: "u.y", species: "copy", cell: "CON·Figure" }]);
  assert.deepEqual(occ.find((h) => h.cell === "CON·Figure").occupants, ["u.x←copy", "u.y←copy"]);
  assert.equal(occ.filter((h) => h.status === "occupied").length, 1);
  assert.throws(() => occupancy(houses, [{ slot: "s", species: "x", cell: "NOPE·Figure" }]), TypeError);
});

test("leads move with the registry — the control for the coverage map: with every house housed there are no leads, with one resident there are many", () => {
  const unit = unitOf(objectUnit());
  const none = leads(housesFor(unit, [])), one = leads(housesFor(unit, [{ name: "copy", cell: "CON·Figure" }]));
  const all = leads(housesFor(unit, algebraAddresses().map((c) => ({ name: `s-${c.op}-${c.grain}`, cell: cellKey(c.op, c.grain) }))));
  assert.equal(none.length, 27);
  assert.equal(one.length, 26);
  assert.equal(all.length, 0);
  // a lead is relevant by construction: a scalar unit never lists a per-field house as a lead
  assert.ok(leads(housesFor(unitOf(scalarUnit()), [])).every((h) => h.grain !== "Figure" && h.cell !== "SYN·Pattern"));
});

test("describe: one line per house and a summary a status line can print", () => {
  const text = describe(occupancy(housesFor(unitOf(objectUnit()), [{ name: "copy", cell: "CON·Figure" }]), [{ slot: "u.x", species: "copy", cell: "CON·Figure" }]));
  assert.equal(text.split("\n").length, 28);
  assert.match(text, /of 27 houses/);
  assert.match(text, /CON·Figure\s+Link\s+occupied\s+u\.x←copy/);
});
