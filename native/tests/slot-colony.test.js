// slot-colony.test.js — the real colony over the 27 houses. The kernel (stigmergy, cube) is real; the species are stand-ins
// whose behaviour is stated per slot kind, so every claim here is about the COLONY — the gate, the environment, the orders,
// the null arm — and none is about how good any real filler is (that is the measurement driver's, against real species).
import test from "node:test";
import assert from "node:assert/strict";
import { colonize, kindOfSlot, derivedOrder, declaredOrder, scrambleTrails, nullArm, redealt, fillsOf, MODES, COLONY_SCHEMA } from "../organs/slot-colony.js";
import { housesFor, occupancy, unitOf } from "../organs/code-habitat.js";

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const clock = () => { let t = 0; return () => (t += 1); };
const lcg = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
const TRUTH = { number: (a) => a * 2, string: (a) => `s${a}`, boolean: (a) => a > 2 };
const SHOWN = [1, 2, 3], HELD = [4, 5];

/** a slot of a given kind; its gate is the held-out runs, `null` when there are none */
function mkSlot(id, kind, { held = HELD, truth = TRUTH[kind] } = {}) {
  const wants = SHOWN.map(truth);
  const s = { id, kind: kindOfSlot(wants), truth, holds: (c) => (held.length ? held.every((a) => eq(c.f(a), truth(a))) : null) };
  s.redeal = (rot) => { const rotated = SHOWN.map((_, i) => wants[(i + rot) % SHOWN.length]); return { ...s, id: `${id}~${rot}`, holds: (c) => held.every((a) => eq(c.f(a), truth(a))) && SHOWN.every((a, i) => eq(c.f(a), rotated[i])) }; };
  return s;
}
/** a species whose behaviour per slot kind is stated: right (the true function), wrong (a candidate the gate refuses) or null (no candidate) */
const mk = (name, cell, table, { needs = null } = {}) => ({
  name, cell,
  fill: (slot, env) => {
    if (needs && !env.filled.has(needs)) return null;
    const b = table[slot.kind] ?? "null";
    return b === "right" ? { f: slot.truth } : b === "wrong" ? { f: () => "WRONG" } : null;
  },
});

test("kindOfSlot is structural — a type, never a meaning; the same types under different values are the same kind", () => {
  assert.equal(kindOfSlot([1, 2, 3]), "number");
  assert.equal(kindOfSlot([1.5, 99, -3]), "number");
  assert.equal(kindOfSlot(["a", "bb"]), kindOfSlot(["totally", "different"]));
  assert.equal(kindOfSlot(["a", null]), "string?");
  assert.equal(kindOfSlot([[1], []]), "array<number>");
  assert.equal(kindOfSlot([[], []]), "array<empty>");
  assert.equal(kindOfSlot([1, "a"]), "mixed");
  assert.equal(kindOfSlot([null, null]), "null");
  assert.equal(kindOfSlot([]), "none");
});

test("orders: declared is the caller's, derived is the chain of the species' houses (ties keep the caller's order), reversed is the control", async () => {
  const sp = [mk("decide", "DEF·Figure", {}), mk("compose", "SYN·Figure", {}), mk("copy", "CON·Figure", {}), mk("template", "SYN·Figure", {})];
  assert.deepEqual(declaredOrder(sp), ["decide", "compose", "copy", "template"]);
  assert.deepEqual(derivedOrder(sp), ["copy", "compose", "template", "decide"]);
  const r = await colonize({ slots: [], species: sp, mode: "reversed" });
  assert.equal(r.mode, "reversed");
  assert.deepEqual(MODES, ["declared", "derived", "reversed", "learned"]);
  assert.ok(COLONY_SCHEMA.startsWith("EOSlotColony@"));
});

test("typed refusals: a bad mode, two species with one name, a species in a cell that is not a house", async () => {
  await assert.rejects(() => colonize({ slots: [], species: [], mode: "fastest" }), TypeError);
  await assert.rejects(() => colonize({ slots: [], species: [mk("a", "CON·Figure", {}), mk("a", "SYN·Figure", {})] }), /distinct/);
  await assert.rejects(() => colonize({ slots: [], species: [mk("a", "QQQ·Figure", {})] }), TypeError);
});

test("THE GATE: a candidate fills only if it reproduces the runs it was not shown; a refused candidate deposits nothing; no held-out run is `unverifiable`, never a fill", async () => {
  const wrong = mk("liar", "CON·Figure", { number: "wrong" });
  const r1 = await colonize({ slots: [mkSlot("a", "number")], species: [wrong], clock: clock() });
  assert.equal(r1.filled.size, 0);
  assert.deepEqual(r1.unfilled, ["a"]);
  assert.equal(r1.rows[0].outcome, "refused");
  assert.deepEqual(r1.trails, {}, "a failure deposits nothing (the kernel's rule)");
  const right = mk("honest", "CON·Figure", { number: "right" });
  const r2 = await colonize({ slots: [mkSlot("a", "number", { held: [] })], species: [right], clock: clock() });
  assert.equal(r2.filled.size, 0, "a candidate with nothing to be tested on is not a pass");
  assert.equal(r2.rows[0].outcome, "unverifiable");
  assert.equal(r2.wasted, 1);
  const r3 = await colonize({ slots: [mkSlot("a", "number")], species: [right], clock: clock(), now: 1e12 });
  assert.equal(r3.filled.size, 1);
  assert.equal(r3.trails["slot|number"].length, 1, "a fill deposits exactly one trail, under its slot kind");
  assert.equal(r3.trails["slot|number"][0].route, "honest");
});

test("A species that throws is a miss, not a crash — the colony records it and tries the next", async () => {
  const boom = { name: "boom", cell: "CON·Figure", fill: () => { throw new Error("x"); } };
  const ok = mk("ok", "SYN·Figure", { number: "right" });
  const r = await colonize({ slots: [mkSlot("a", "number")], species: [boom, ok], mode: "declared", clock: clock() });
  assert.equal(r.filled.get("a").species, "ok");
  assert.equal(r.rows[0].threw, true);
  assert.equal(r.rows[0].outcome, "no-candidate");
});

test("STIGMERGY, NOT MESSAGES: a filler that needs another slot's fill is retried after the environment changes — it fills in pass 2, and the quiet pass ends the run", async () => {
  const base = mk("base", "SYN·Figure", { number: "right" });
  const dependent = mk("dependent", "DEF·Figure", { boolean: "right" }, { needs: "base" });
  const slots = [mkSlot("dep", "boolean"), mkSlot("base", "number")]; // the dependent slot comes FIRST
  const r = await colonize({ slots, species: [base, dependent], mode: "derived", clock: clock() });
  assert.equal(r.filled.get("base").pass, 1);
  assert.equal(r.filled.get("dep").pass, 2, "the dependent slot waited for the environment");
  assert.equal(r.passes, 3, "pass 3 filled nothing and stopped the run");
  assert.equal(r.unfilled.length, 0);
});

test("THE ORDER METRIC MOVES WITH THE ORDER (II.23): where the early-chain species is right, reversed wastes work; where the late-chain one is right, reversed saves it", async () => {
  const early = [mk("copy", "CON·Figure", { number: "right" }), mk("compose", "SYN·Figure", { number: "wrong" }), mk("decide", "DEF·Figure", { number: "wrong" })];
  const late = [mk("copy", "CON·Figure", { number: "wrong" }), mk("compose", "SYN·Figure", { number: "wrong" }), mk("decide", "DEF·Figure", { number: "right" })];
  const slots = () => [mkSlot("a", "number"), mkSlot("b", "number"), mkSlot("c", "number")];
  const E = { derived: await colonize({ slots: slots(), species: early, mode: "derived", clock: clock() }), reversed: await colonize({ slots: slots(), species: early, mode: "reversed", clock: clock() }) };
  const L = { derived: await colonize({ slots: slots(), species: late, mode: "derived", clock: clock() }), reversed: await colonize({ slots: slots(), species: late, mode: "reversed", clock: clock() }) };
  assert.equal(E.derived.wasted, 0);
  assert.equal(E.reversed.wasted, 6, "two wrong candidates refused per slot, three slots");
  assert.equal(L.derived.wasted, 6);
  assert.equal(L.reversed.wasted, 0);
  for (const r of [E.derived, E.reversed, L.derived, L.reversed]) assert.equal(r.filled.size, 3, "the order changes the cost, never what can be filled");
});

test("LEARNED ORDER: taught on one set, a colony tries the species that filled this KIND of slot first — and a ledger with the association scrambled does not help", async () => {
  // numbers are filled by the LAST house in the chain, strings by the first: the derived order is wrong for numbers
  const species = () => [mk("copy", "CON·Figure", { string: "right", number: "wrong" }), mk("compose", "SYN·Figure", { number: "wrong" }), mk("decide", "DEF·Figure", { number: "right" })];
  const mkSet = (tag) => [...Array(6).keys()].flatMap((i) => [mkSlot(`${tag}n${i}`, "number"), mkSlot(`${tag}s${i}`, "string")]);
  const taught = await colonize({ slots: mkSet("train"), species: species(), mode: "derived", clock: clock(), now: 1e12 });
  assert.equal(taught.trails["slot|number"].every((t) => t.route === "decide"), true);
  assert.equal(taught.trails["slot|string"].every((t) => t.route === "copy"), true);
  const test_ = () => mkSet("test");
  const derived = await colonize({ slots: test_(), species: species(), mode: "derived", clock: clock(), now: 1e12 });
  const learned = await colonize({ slots: test_(), species: species(), mode: "learned", trails: taught.trails, clock: clock(), now: 1e12 });
  const scrambled = scrambleTrails(taught.trails, lcg(7));
  const changed = Object.entries(taught.trails).some(([h, l]) => l.some((t, i) => t.route !== scrambled[h][i].route));
  assert.ok(changed, "the scramble actually broke the head→route association");
  const control = await colonize({ slots: test_(), species: species(), mode: "learned", trails: scrambled, clock: clock(), now: 1e12 });
  assert.ok(learned.wasted < derived.wasted, `learned ${learned.wasted} < derived ${derived.wasted}`);
  assert.equal(learned.wasted, 0);
  assert.ok(control.wasted >= learned.wasted, "scrambled trails carry no information and cannot beat the learned order");
  for (const r of [derived, learned, control]) assert.equal(r.filled.size, 12, "order never changes what is filled");
});

test("`online:false` reads only the trails it was GIVEN — a run cannot teach itself; `online:true` can", async () => {
  const sp = () => [mk("a", "CON·Figure", { number: "wrong" }), mk("b", "SYN·Figure", { number: "right" })];
  const slots = () => [mkSlot("one", "number"), mkSlot("two", "number")];
  const off = await colonize({ slots: slots(), species: sp(), mode: "learned", clock: clock(), now: 1e12, online: false });
  const on = await colonize({ slots: slots(), species: sp(), mode: "learned", clock: clock(), now: 1e12, online: true });
  const rankOfFill = (r, slot) => r.rows.find((x) => x.slot === slot && x.outcome === "filled").rank;
  assert.equal(rankOfFill(off, "two"), 1, "no teaching inside the run: species b is still second");
  assert.equal(rankOfFill(on, "two"), 0, "online, the first fill taught the second slot");
});

test("THE NULL ARM: redealt targets must fill nothing — a memorizer is caught by the held-out gate, and a leaky gate is SEEN by the control", async () => {
  const memorizer = { name: "memo", cell: "SYN·Figure", fill: (slot) => ({ f: (a) => SHOWN.includes(a) ? slot.truth(a) : undefined }) };
  const real = [mkSlot("a", "number"), mkSlot("b", "string")];
  const r = await colonize({ slots: real, species: [memorizer], clock: clock() });
  assert.equal(r.filled.size, 0, "a memorizer passes the shown examples and fails the held-out runs");
  const honest = mk("honest", "CON·Figure", { number: "right", string: "right" });
  const rd = redealt(real);
  assert.equal(rd.length, 4);
  const clean = await nullArm({ slots: rd, species: [honest] });
  assert.deepEqual([clean.tried, clean.falseFills, clean.verdict], [4, 0, "gate_holds"]);
  const leaky = rd.map((s) => ({ ...s, holds: () => true }));
  const caught = await nullArm({ slots: leaky, species: [honest] });
  assert.equal(caught.verdict, "gate_leaky");
  assert.equal(caught.falseFills, 4);
});

test("the habitat lands the fills: each fill names its species' house, and an empty relevant house remains a lead", async () => {
  const species = [mk("copy", "CON·Figure", { string: "right" }), mk("decide", "DEF·Figure", { number: "right" })];
  const r = await colonize({ slots: [mkSlot("u.name", "string"), mkSlot("u.total", "number")], species, clock: clock() });
  const contract = { name: "u", params: ["a"], runs: [1, 2, 3, 4].map((a) => ({ args: () => [a], want: () => ({ name: "n", total: 1 }) })) };
  const houses = occupancy(housesFor(unitOf(contract), species.map((s) => ({ name: s.name, cell: s.cell }))), fillsOf(r));
  assert.deepEqual(houses.find((h) => h.cell === "CON·Figure").occupants, ["u.name←copy"]);
  assert.deepEqual(houses.find((h) => h.cell === "DEF·Figure").occupants, ["u.total←decide"]);
  assert.equal(houses.find((h) => h.cell === "EVA·Figure").status, "empty");
});
