// kind-functional-induction.test.js — kinds induced from relation profiles and
// one-valuedness induced per kind, on synthetic, medium-blind referents.
import test from "node:test";
import assert from "node:assert/strict";
import { induceKindsAndFunctions } from "../kernel/kind-functional-induction.js";
import { makeIdentityExclusion } from "../kernel/identity-exclusion.js";
import { CONTRADICTED, UNBOUND, BEYOND_REACH } from "../interpretation/hl.js";

// Two populations. Kind X takes relations b, c, x; kind Y takes b, k, y.
// In X, b is single-valued (every repeat agrees); c is many-valued.
// In Y, b is MANY-valued; k is single-valued. Only per-kind induction sees that.
function world() {
  const recs = new Map();
  for (let i = 0; i < 24; i += 1) recs.set(`X${i}`, [
    { rel: "b", value: `b${i}`, refs: 1 }, { rel: "b", value: `b${i}`, refs: 1 },
    { rel: "c", value: `c${i}a`, refs: 1 }, { rel: "c", value: `c${i}b`, refs: 1 },
    { rel: "x", value: `x${i}`, refs: 1 },
  ]);
  for (let i = 0; i < 24; i += 1) recs.set(`Y${i}`, [
    { rel: "b", value: `v${i}a`, refs: 1 }, { rel: "b", value: `v${i}b`, refs: 1 },
    { rel: "k", value: `k${i}`, refs: 1 }, { rel: "k", value: `k${i}`, refs: 1 },
    { rel: "y", value: `y${i}`, refs: 1 }, { rel: "once", value: `o${i}`, refs: 1 },
  ]);
  for (const [id, as] of recs) as.forEach((a, j) => { a.id = `${id}#${j}`; });
  return recs;
}
const run = (recs, extra = {}) => induceKindsAndFunctions([...recs.keys()], {
  assertionsOf: (id) => recs.get(id), sameValue: (u, v) => u === v, witnessed: (a) => a.refs > 0,
  exposureFloor: 2, kindOptions: { population: "test", permutations: 60 }, ...extra,
});
const standingOf = (res, member, rel) => { const k = [...res.kindsOf(member)][0]; return res.relations.get(k)?.[rel]?.standing; };

test("numbers are declared", () => {
  assert.throws(() => induceKindsAndFunctions([], { assertionsOf: () => [], sameValue: () => true, kindOptions: {} }), /exposureFloor/);
  assert.throws(() => induceKindsAndFunctions([], { assertionsOf: () => [], sameValue: () => true, exposureFloor: 2 }), /kindOptions/);
});

test("kinds are induced from what referents do, and the two populations separate", () => {
  const res = run(world());
  assert.ok(res.kinds.length >= 2, JSON.stringify(res.diagnostics));
  const kx = [...res.kindsOf("X0")][0], ky = [...res.kindsOf("Y0")][0];
  assert.ok(kx && ky && kx !== ky);
});

test("one-valuedness is per kind: b is fixed for X and not for Y", () => {
  const res = run(world());
  assert.equal(standingOf(res, "X0", "b"), "fixed");
  assert.equal(standingOf(res, "Y0", "k"), "fixed");
  // disagreements with no time attached cannot tell change from contradiction
  assert.equal(standingOf(res, "Y0", "b"), "time-unknown");
  assert.equal(standingOf(res, "X0", "c"), "time-unknown");
  const ky = [...res.kindsOf("Y0")][0];
  assert.ok(!res.register.get(ky).has("b"), "an undecided relation licenses nothing");
});

// A kind whose members hold "s" one at a time (successive intervals) and "m"
// several at once (overlapping intervals), and "f" fixed.
function timedWorld() {
  const recs = new Map();
  for (let i = 0; i < 24; i += 1) recs.set(`P${i}`, [
    { rel: "s", value: `s${i}a`, interval: { lo: 0, hi: 9 }, refs: 1 }, { rel: "s", value: `s${i}b`, interval: { lo: 10, hi: 20 }, refs: 1 },
    { rel: "m", value: `m${i}a`, interval: { lo: 0, hi: 20 }, refs: 1 }, { rel: "m", value: `m${i}b`, interval: { lo: 5, hi: 15 }, refs: 1 },
    { rel: "f", value: `f${i}`, refs: 1 }, { rel: "f", value: `f${i}`, refs: 1 },
  ]);
  for (let i = 0; i < 24; i += 1) recs.set(`Q${i}`, [{ rel: "q", value: `q${i}`, refs: 1 }, { rel: "q", value: `q${i}`, refs: 1 }, { rel: "z", value: `z${i}`, refs: 1 }]);
  for (const [id, as] of recs) as.forEach((a, j) => { a.id = `${id}#${j}`; });
  return recs;
}

test("time separates change from contradiction: one-at-a-time vs many-valued vs fixed", () => {
  const res = run(timedWorld());
  assert.equal(standingOf(res, "P0", "s"), "one-at-a-time");
  assert.equal(standingOf(res, "P0", "m"), "many-valued");
  assert.equal(standingOf(res, "P0", "f"), "fixed");
});

test("a one-at-a-time parameter excludes only at a cursor where both values hold", () => {
  const recs = timedWorld();
  const res = run(recs);
  // two records of P0 split by time: early holds s0a, late holds s0b — change, not two people
  recs.set("early", [{ rel: "s", value: "s0a", interval: { lo: 0, hi: 9 }, refs: 1, id: "e#0" }, { rel: "f", value: "f0", refs: 1, id: "e#1" }, { rel: "m", value: "m0a", refs: 1, id: "e#2" }]);
  recs.set("late", [{ rel: "s", value: "s0b", interval: { lo: 10, hi: 20 }, refs: 1, id: "l#0" }, { rel: "f", value: "f0", refs: 1, id: "l#1" }, { rel: "m", value: "m0b", refs: 1, id: "l#2" }]);
  recs.set("rival", [{ rel: "s", value: "zz", interval: { lo: 0, hi: 20 }, refs: 1, id: "r#0" }, { rel: "f", value: "f0", refs: 1, id: "r#1" }]);
  const k = [...res.kindsOf("P0")][0];
  const ex = makeIdentityExclusion({ kindsOf: (id) => res.kindsOf(id).size ? res.kindsOf(id) : new Set([k]), assertionsOf: (id) => recs.get(id), functional: res.register, sameValue: (u, v) => u === v, witnessed: (a) => a.refs > 0 });
  assert.equal(ex.judge("early", "late").verdict, UNBOUND, "disjoint times are change");
  assert.deepEqual(ex.judge("early", "late").changed, ["s"]);
  const clash = ex.judge("early", "rival", { at: 5 });
  assert.equal(clash.verdict, UNBOUND, "an induced candidate never convicts");
  assert.equal(clash.raised[0]?.rel, "s", "but both hold at t=5 and disagree: the conflict is raised");
  assert.equal(ex.judge("late", "rival", { at: 25 }).raised.length, 0, "neither value holds at t=25");
});

test("the reading cursor: an assertion not yet read is not yet believed", () => {
  const recs = world();
  const res = run(recs);
  recs.set("X0late", [{ rel: "b", value: "other", refs: 1, seq: 50, id: "xl#0" }, { rel: "x", value: "x0", refs: 1, seq: 1, id: "xl#1" }]);
  const k = [...res.kindsOf("X0")][0];
  const ex = makeIdentityExclusion({ kindsOf: (id) => res.kindsOf(id).size ? res.kindsOf(id) : new Set([k]), assertionsOf: (id) => recs.get(id), functional: res.register, sameValue: (u, v) => u === v, witnessed: (a) => a.refs > 0 });
  const exAt = (cursor) => makeIdentityExclusion({ kindsOf: (id) => res.kindsOf(id).size ? res.kindsOf(id) : new Set([k]), assertionsOf: (id) => recs.get(id), functional: res.register, sameValue: (u, v) => u === v, witnessed: (a) => a.refs > 0, registerAsOf: 0 }).judge("X0", "X0late", { asOf: cursor });
  assert.equal(exAt(10).raised.length, 0, "the late assertion is not yet read");
  assert.equal(exAt(60).raised[0]?.rel, "b");
});

test("the for-whom decides which relations are asked about", () => {
  const recs = world();
  const res = run(recs);
  const ex = makeIdentityExclusion({ kindsOf: res.kindsOf, assertionsOf: (id) => recs.get(id), functional: res.register, sameValue: (u, v) => u === v, witnessed: (a) => a.refs > 0 });
  assert.equal(ex.judge("X0", "X1").reason, "candidate_conflict");
  // X's only tested one-valued relation is b: a for-whom that does not ask
  // about b has nothing checkable — a gap, never "not excluded"
  const r = ex.judge("X0", "X1", { relevant: (rel) => rel !== "b" });
  assert.equal(r.verdict, BEYOND_REACH); assert.equal(r.reason, "no_functional_relation_declared");
});

test("a relation never asserted twice was never tested: unexposed, licenses nothing", () => {
  const res = run(world());
  assert.equal(standingOf(res, "Y0", "once"), "unexposed");
  const k = [...res.kindsOf("Y0")][0];
  assert.ok(!res.register.get(k).has("once"));
});

test("an unwitnessed conflict does not refute", () => {
  const recs = world();
  for (let i = 0; i < 24; i += 1) recs.get(`X${i}`).push({ rel: "x", value: `other${i}`, refs: 0, id: `X${i}#u` });
  const res = run(recs);
  assert.notEqual(standingOf(res, "X0", "x"), "refuted");
});

test("the induced register RAISES conflicts, typed as candidates, and never convicts", () => {
  const recs = world();
  const res = run(recs);
  const ex = makeIdentityExclusion({ kindsOf: res.kindsOf, assertionsOf: (id) => recs.get(id), functional: res.register, sameValue: (u, v) => u === v, witnessed: (a) => a.refs > 0 });
  const r = ex.judge("X0", "X1");
  assert.equal(r.verdict, UNBOUND); assert.equal(r.reason, "candidate_conflict");
  assert.ok(r.raised.every((p) => p.rel === "b" && p.raisedAs === "candidate_conflict"));
});

test("kinds and standings are learned only from what was read by the cursor", () => {
  const recs = world();
  // relation 'late' is asserted (repeatedly, agreeing) only after seq 100
  for (const [id, as] of recs) if (id.startsWith("X")) as.push({ rel: "late", value: `L${id}`, refs: 1, seq: 200, id: `${id}#l1` }, { rel: "late", value: `L${id}`, refs: 1, seq: 201, id: `${id}#l2` });
  const early = run(recs, { asOf: 100 }), all = run(recs);
  const kE = [...early.kindsOf("X0")][0], kA = [...all.kindsOf("X0")][0];
  assert.ok(!early.register.get(kE)?.has("late"), "not yet read");
  assert.ok(all.register.get(kA).has("late"));
  assert.equal(early.builtAsOf, 100);
});
