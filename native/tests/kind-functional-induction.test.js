// kind-functional-induction.test.js — kinds induced from relation profiles and
// one-valuedness induced per kind, on synthetic, medium-blind referents.
import test from "node:test";
import assert from "node:assert/strict";
import { induceKindsAndFunctions } from "../kernel/kind-functional-induction.js";
import { makeIdentityExclusion } from "../kernel/identity-exclusion.js";

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

test("one-valuedness is per kind: b is a candidate for X and refuted for Y", () => {
  const res = run(world());
  assert.equal(standingOf(res, "X0", "b"), "candidate");
  assert.equal(standingOf(res, "Y0", "b"), "refuted");
  assert.equal(standingOf(res, "X0", "c"), "refuted");
  assert.equal(standingOf(res, "Y0", "k"), "candidate");
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

test("the induced register drives exclusion, typed as candidate", () => {
  const recs = world();
  const res = run(recs);
  const ex = makeIdentityExclusion({ kindsOf: res.kindsOf, assertionsOf: (id) => recs.get(id), functional: res.register, sameValue: (u, v) => u === v, witnessed: (a) => a.refs > 0 });
  const r = ex.judge("X0", "X1");
  assert.equal(r.verdict, "excluded"); assert.equal(r.standing, "candidate");
  assert.ok(r.proof.every((p) => p.rel === "b"));
  assert.equal(ex.judge("Y0", "Y1").verdict !== "excluded" || ex.judge("Y0", "Y1").proof.every((p) => p.rel === "k"), true);
});
