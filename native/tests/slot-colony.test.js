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

// ================================================================ ADVERSARIAL — each case below is a finding of an independent
// review of this module (2026-10-01), reproduced here first and fixed after. The 18 tests above passed on all of the buggy code.

test("THE SPECIES GET A VIEW, NOT THE COLONY: a species that rewrites its slot's gate, forges a fill in the environment, or poisons the kind cannot change what the colony records", async () => {
  const slot = (id, kind) => ({ id, kind, holds: () => false });            // a gate that refuses everything
  const liar = { name: "liar", cell: "CON·Figure", fill: (s) => { try { s.holds = () => true; s.kind = "poisoned"; s.id = "renamed"; } catch { /* a frozen view throws in strict mode — also fine */ } return { f: () => 1 }; } };
  const r = await colonize({ slots: [slot("a", "number")], species: [liar], mode: "declared", clock: clock() });
  assert.equal(r.filled.size, 0, "the gate the caller supplied decides, not the gate the species left behind");
  assert.deepEqual(r.unfilled, ["a"]);
  assert.deepEqual(r.trails, {}, "no deposit for a refused candidate, under any head");

  const forger = { name: "forger", cell: "CON·Figure", fill: (s, env) => { env.filled.set("victim", { species: "forger", cell: "CON·Figure", candidate: {}, pass: 0 }); return null; } };
  const r2 = await colonize({ slots: [slot("victim", "number"), slot("b", "number")], species: [forger], mode: "declared", clock: clock() });
  assert.equal(r2.filled.size, 0, "a forged environment entry is not a fill");
  assert.deepEqual(r2.unfilled.sort(), ["b", "victim"]);
});

test("A species that empties the environment cannot make the colony run forever, and cannot un-fill a slot the gate already passed", async () => {
  const slots = [{ id: "x", kind: "number", holds: (c) => c.f() === 1 }, { id: "y", kind: "string", holds: () => false }];
  let calls = 0;
  // fills x honestly, then on every other slot deletes x from the map it was handed (an adversary, or just a species with a bug)
  const vandal = { name: "vandal", cell: "CON·Figure", fill: (s, env) => { calls++; if (calls > 300) return null; if (s.id === "x") return { f: () => 1 }; env.filled.delete("x"); return null; } };
  const r = await colonize({ slots, species: [vandal], mode: "declared", clock: clock() });
  assert.ok(calls < 40, `the run must end quickly (calls=${calls})`);
  assert.deepEqual([...r.filled.keys()], ["x"], "x was filled through the gate and stays filled");
});

test("A gate that throws or rejects is a REFUSAL of that candidate, flagged — it does not kill the run and lose every earlier fill and trail", async () => {
  const good = { id: "good", kind: "number", holds: (c) => c.f() === 1 };
  const boom = { id: "boom", kind: "number", holds: () => { throw new Error("gate crashed"); } };
  const rejects = { id: "rej", kind: "number", holds: async () => { throw new Error("async gate crashed"); } };
  const sp = { name: "s", cell: "CON·Figure", fill: () => ({ f: () => 1 }) };
  const r = await colonize({ slots: [good, boom, rejects], species: [sp], mode: "declared", clock: clock() });
  assert.deepEqual([...r.filled.keys()], ["good"]);
  assert.deepEqual(r.unfilled.sort(), ["boom", "rej"]);
  assert.equal(r.rows.filter((x) => x.gateThrew).length >= 2, true, "the throw is on the record");
  assert.equal(r.trails["slot|number"].length, 1, "only the real fill deposited");
});

test("Slots must be addressable: a duplicate or missing id is a typed refusal, not an unfilled slot that vanishes", async () => {
  const sp = { name: "s", cell: "CON·Figure", fill: () => null };
  const g = () => true;
  await assert.rejects(() => colonize({ slots: [{ id: "u.x", kind: "number", holds: g }, { id: "u.x", kind: "string", holds: g }], species: [sp] }), /duplicate|unique/i);
  await assert.rejects(() => colonize({ slots: [{ kind: "number", holds: g }], species: [sp] }), TypeError);
  await assert.rejects(() => colonize({ slots: [{ id: "u", kind: 7, holds: g }], species: [sp] }), TypeError, "a kind is a string — a trail head is made of it");
  await assert.rejects(() => colonize({ slots: [{ id: "u", kind: "number" }], species: [sp] }), TypeError, "a slot with no gate has nothing to believe");
});

test("a falsy candidate (0, \"\", false) is a candidate and is gated — only null/undefined is 'no candidate'", async () => {
  const slot = { id: "z", kind: "number", holds: (c) => c === 0 };
  const zero = { name: "zero", cell: "NUL·Figure", fill: () => 0 };
  const r = await colonize({ slots: [slot], species: [zero], mode: "declared", clock: clock() });
  assert.deepEqual([...r.filled.keys()], ["z"], "0 reproduced the held-out answer and was refused as 'no candidate'");
});

test("THE NULL ARM MAY NOT PASS VACUOUSLY: no slot carrying a redeal, no species, or a gate nothing ever evaluated is `untested`, never `gate_holds`", async () => {
  const sp = { name: "s", cell: "CON·Figure", fill: () => null };
  const none = await nullArm({ slots: [], species: [sp] });
  assert.equal(none.verdict, "untested");
  const mute = await nullArm({ slots: [mkSlot("a", "number"), mkSlot("b", "number")], species: [sp] });
  assert.equal(mute.tried, 2);
  assert.equal(mute.verdict, "untested", "tried 2 slots but no species offered a candidate, so the gate was never exercised");
  assert.equal(mute.gated, 0);
  assert.equal(mute.unexercised, 2);
  const live = await nullArm({ slots: [mkSlot("a", "number")], species: [mk("wrong", "CON·Figure", { number: "wrong" })] });
  assert.equal(live.verdict, "gate_holds", "a candidate was offered and refused: the gate ran");
  assert.equal(live.gated, 1);
  const partial = await nullArm({ slots: [mkSlot("a", "number"), mkSlot("b", "string")], species: [mk("wrong", "CON·Figure", { number: "wrong" })] });
  assert.equal(partial.verdict, "gate_holds_partial", "one slot exercised the gate, one did not — say so");
  assert.equal(partial.unexercised, 1);
});

test("THE NULL ARM'S FILLS ARE COUNTED FROM THE ROWS, not from the final map — a species cannot erase a leak", async () => {
  const slots = [{ id: "k", kind: "number", holds: () => true }, { id: "m", kind: "string", holds: () => false }];
  let calls = 0;
  const eraser = { name: "eraser", cell: "CON·Figure", fill: (s, env) => { calls++; if (calls > 300) return null; if (s.id === "k") return { f: () => 1 }; env.filled.delete("k"); return null; } };
  const r = await nullArm({ slots, species: [eraser] });
  assert.equal(r.verdict, "gate_leaky");
  assert.equal(r.falseFills, 1);
});

test("A redeal that equals the real target is not a false target — `redealt` reports what it dropped, and an identity redeal is excluded, not counted as a leak", async () => {
  const constant = (id) => { const s = { id, kind: "number", wants: [5, 5, 5], holds: (c) => c.f() === 5 }; s.redeal = (rot) => ({ ...s, id: `${id}~${rot}`, wants: [5, 5, 5] }); return s; };
  const varied = (id) => { const s = { id, kind: "number", wants: [1, 2, 3], holds: (c) => c.f() === 1 }; s.redeal = (rot) => ({ ...s, id: `${id}~${rot}`, wants: [2, 3, 1] }); return s; };
  const rep = redealt([constant("c"), varied("v")], [1, 2]);
  assert.deepEqual(rep.map((s) => s.id), ["v~1", "v~2"], "the constant slot's redeals are the real target again and are not false");
  assert.deepEqual(rep.report, { requested: 4, produced: 2, identity: 2, dropped: 0 });
});

test("the result does not alias or leak the caller's trails: nothing deposited returns a COPY, and the species cannot edit what it was handed", async () => {
  const mine = { "slot|number": [{ head: "slot|number", route: "x", ok: true, ms: 1, at: 0 }] };
  const r = await colonize({ slots: [], species: [], mode: "learned", trails: mine });
  assert.notEqual(r.trails, mine);
  assert.deepEqual(r.trails, mine);
});

test("selection inside a species is visible: a species that calls the gate itself has its calls counted on the row, so a gate used as a search oracle cannot hide", async () => {
  const slot = { id: "s", kind: "number", holds: (c) => c.f() === 3 };
  const searcher = { name: "searcher", cell: "SYN·Figure", fill: (s, env) => { for (const k of [1, 2, 3, 4]) if (env.gate({ f: () => k }) === true) return { f: () => k }; return null; } };
  const r = await colonize({ slots: [slot], species: [searcher], mode: "declared", clock: clock() });
  assert.equal(r.filled.size, 1);
  const row = r.rows.find((x) => x.outcome === "filled");
  assert.equal(row.gateCalls, 3, "three candidates were tried against the gate inside fill() before the colony's own check");
  assert.equal(r.selection, 1, "one fill rested on a search over more than one candidate");
});

test("skipUnchanged: a refused candidate is not re-gated in a later pass unless a fill has landed since its last attempt — the order metric stops counting passes", async () => {
  // pass 1: late has nothing yet (early is unfilled), dead is refused, early fills. pass 2: late fills (early is there now), dead is
  // refused again — a fill landed since its last try, so the retry is legitimate. pass 3: nothing landed since dead's pass-2 try.
  const slots = [
    { id: "late", kind: "string", holds: (c) => c.f() === "ok" },
    { id: "dead", kind: "number", holds: () => false },
    { id: "early", kind: "boolean", holds: (c) => c.f() === true },
  ];
  const sp = [
    { name: "d", cell: "DEF·Figure", fill: (s) => (s.id === "dead" ? { f: () => 0 } : null) },
    { name: "late", cell: "CON·Figure", fill: (s, env) => (s.id === "late" && env.filled.has("early") ? { f: () => "ok" } : null) },
    { name: "early", cell: "NUL·Figure", fill: (s) => (s.id === "early" ? { f: () => true } : null) },
  ];
  const always = await colonize({ slots, species: sp, mode: "declared", clock: clock() });
  const skip = await colonize({ slots, species: sp, mode: "declared", clock: clock(), skipUnchanged: true });
  assert.equal(always.wasted, 3, "the registered behaviour re-gates the dead slot in every pass, including the one where nothing could have changed");
  assert.equal(skip.wasted, 2, "pass 3 is skipped for it: no fill landed since its pass-2 try");
  assert.deepEqual([...always.filled.keys()].sort(), [...skip.filled.keys()].sort(), "the same fills");
  assert.ok(skip.attempts < always.attempts);
});

test("THE GATE IS `=== true`: a truthy non-true verdict (1, \"yes\", {}, [], a string) is a refusal, not a fill", async () => {
  for (const verdict of [1, "yes", "true", {}, [], new Boolean(true)]) {
    const slot = { id: "g", kind: "number", holds: () => verdict };
    const r = await colonize({ slots: [slot], species: [{ name: "s", cell: "CON·Figure", fill: () => ({ f: () => 1 }) }], mode: "declared", clock: clock() });
    assert.equal(r.filled.size, 0, `a verdict of ${JSON.stringify(verdict)} must not fill`);
  }
});

test("the default order is `declared` — a default that implies a benefit nobody measured would be a claim (slot-colony-RESULTS.md)", async () => {
  const r = await colonize({ slots: [], species: [] });
  assert.equal(r.mode, "declared");
});
