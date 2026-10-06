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
  // a unit with a list-valued field makes every house relevant (SYN·Pattern, the list-production house, needs one — a review finding:
  // it used to be relevant to an object of scalars)
  const unit = unitOf({ name: "u", params: ["a"], runs: [run([1], { x: 1, xs: [1] }), run([2], { x: 2, xs: [2] }), run([3], { x: 3, xs: [3, 4] }), run([4], { x: 4, xs: [] })] });
  const none = leads(housesFor(unit, [])), one = leads(housesFor(unit, [{ name: "copy", cell: "CON·Figure" }]));
  const all = leads(housesFor(unit, algebraAddresses().map((c) => ({ name: `s-${c.op}-${c.grain}`, cell: cellKey(c.op, c.grain) }))));
  assert.equal(none.length, 27);
  assert.equal(one.length, 26);
  assert.equal(all.length, 0);
  // a lead is relevant by construction: a scalar unit never lists a per-field house as a lead
  assert.ok(leads(housesFor(unitOf(scalarUnit()), [])).every((h) => h.grain !== "Figure" && h.cell !== "SYN·Pattern"));
  // and an object of scalars has no list-production house to lead anyone to
  assert.ok(!leads(housesFor(unitOf(objectUnit()), [])).some((h) => h.cell === "SYN·Pattern"));
});

test("describe: one line per house and a summary a status line can print", () => {
  const text = describe(occupancy(housesFor(unitOf(objectUnit()), [{ name: "copy", cell: "CON·Figure" }]), [{ slot: "u.x", species: "copy", cell: "CON·Figure" }]));
  assert.equal(text.split("\n").length, 28);
  assert.match(text, /of 27 houses/);
  assert.match(text, /CON·Figure\s+Link\s+occupied\s+u\.x←copy/);
});

// ================================================================ ADVERSARIAL — findings of an independent review (2026-10-01)
test("a unit whose structure is UNKNOWN is `unmeasured`, never `not-relevant` — one null among the shown targets must not delete ten houses from the leads", () => {
  const c = { name: "u", params: ["a"], runs: [run([1], { x: 1 }), run([2], null), run([3], { x: 3 }), run([4], { x: 4 })] };
  const u = unitOf(c);
  const hs = housesFor(u, []);
  const fieldHouses = hs.filter((h) => /Figure$/.test(h.cell));
  assert.ok(fieldHouses.every((h) => h.status === "unmeasured" && h.relevant === null), "unknown structure is a statement about the reader, not about the unit");
  assert.ok(leads(hs).length >= 10 || hs.filter((h) => h.relevant === null).length >= 9);
});

test("unitOf does not crash on a contract it cannot read — a throwing want() is an unmeasured unit with the reason", () => {
  const c = { name: "boom", params: [], runs: [{ args: () => [], want: () => { throw new Error("no"); } }] };
  const u = unitOf(c);
  assert.equal(u.shape, "unknown");
  assert.ok(u.unreadable);
});

test("unitOf validates `shown`: a non-integer or negative count is a typed refusal", () => {
  const c = { name: "u", params: [], runs: [run([], { x: 1 })] };
  for (const bad of [-1, 2.5, NaN, "3"]) assert.throws(() => unitOf(c, { shown: bad }), TypeError);
});

test("a house question that depends on a LIST field is relevant only when the unit has one", () => {
  const scalars = unitOf({ name: "s", params: [], runs: [run([], { a: 1, b: "x" }), run([], { a: 2, b: "y" })] });
  const withList = unitOf({ name: "l", params: [], runs: [run([], { a: 1, xs: [1] }), run([], { a: 2, xs: [2, 3] })] });
  assert.deepEqual(withList.listKeys, ["xs"]);
  assert.deepEqual(scalars.listKeys, []);
  const rel = (u) => housesFor(u, []).find((h) => h.cell === "SYN·Pattern").relevant;
  assert.equal(rel(scalars), false);
  assert.equal(rel(withList), true);
});

test("residentCell refuses inherited property names and malformed cells with the SAME typed refusal as any non-house", () => {
  for (const bad of ["constructor·Figure", "toString·Ground", "__proto__·Figure", "CON·Figure·garbage", ["CON", "Figure", "x"], "CON", "", null]) {
    assert.throws(() => residentCell(bad), (e) => e instanceof TypeError && /not a house/.test(e.message), JSON.stringify(bad));
  }
});

test("a fill that lands in a house the unit's structure called not-relevant is FLAGGED, not silently called occupied-and-irrelevant", () => {
  const scalar = unitOf({ name: "s", params: [], runs: [run([], 1), run([], 2), run([], 3), run([], 4)] });
  const occ = occupancy(housesFor(scalar, []), [{ slot: "s", species: "copy", cell: "CON·Figure" }]);
  const h = occ.find((x) => x.cell === "CON·Figure");
  assert.equal(h.status, "occupied");
  assert.equal(h.anomaly, true);
});

test("RELEVANCE READS ONLY THE SHOWN STRUCTURE: parameter names, the name, the held-out count and the docstring may change and no house moves", () => {
  const mk = (name, params, held) => ({ name, doc: name.repeat(9), params, runs: [run([1], { x: 1, xs: [1] }), run([2], { x: 2, xs: [] }), run([3], { x: 3, xs: [3] }), ...Array.from({ length: held }, (_, i) => run([i], { x: i, xs: [i] }))] });
  const vec = (c) => housesFor(unitOf(c), []).map((h) => `${h.cell}:${h.relevant}`).join("|");
  const base = vec(mk("a", ["p"], 1));
  for (const c of [mk("zzzzzzzzzzzzzzzz", ["p"], 1), mk("a", ["a_very_long_parameter_name", "second", "third"], 1), mk("a", ["p"], 0), mk("a", ["p"], 9)]) assert.equal(vec(c), base);
});

test("each house's question is the one its cell asks — the five that species live in are pinned to the act they name", () => {
  const ask = (cell) => housesFor(unitOf({ name: "u", params: [], runs: [run([], { x: 1, xs: [1] })] }), []).find((h) => h.cell === cell).asks.toLowerCase();
  assert.match(ask("CON·Figure"), /copy/);
  assert.match(ask("SYN·Figure"), /expression/);
  assert.match(ask("DEF·Figure"), /categor/);
  assert.match(ask("EVA·Figure"), /pick|rank|compar/);
  assert.match(ask("SYN·Pattern"), /list/);
  assert.match(ask("NUL·Figure"), /absent|null|missing/);
});
