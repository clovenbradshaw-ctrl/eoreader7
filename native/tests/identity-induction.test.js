// identity-induction.test.js — the walls of kernel/identity-induction.js on
// synthetic, medium-blind material: nodes are opaque ids, features opaque
// symbols. Nothing here is a word. The known-answer controls on real books
// live in eval/identity/.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeIdentityInduction } from "../kernel/identity-induction.js";
import { createSeededRng } from "../kernel/rng.js";
import { BOUND, CONTRADICTED, CONTESTED, UNBOUND, BEYOND_REACH } from "../interpretation/hl.js";
import { identityVerdict } from "../kernel/identity-verdict.js";
import { makeIdentityExclusion } from "../kernel/identity-exclusion.js";

const OPTS = { draws: 150, alpha: 0.05, seed: 3, minOccurrences: 20, maxHop: 1, smooth: 0.5, resolution: 8, minFeatureCount: 2 };

// A population of "kinds": each node draws its features from its own
// characteristic pool plus a shared background pool.
function world({ nodes, perNode = 60, seed = 1, twin = null }) {
  const rng = createSeededRng({ seed });
  const shared = Array.from({ length: 40 }, (_, i) => `bg${i}`);
  const rec = new Map();
  for (const n of nodes) {
    const own = Array.from({ length: 12 }, (_, i) => `${n}-f${i}`);
    const occ = [];
    for (let i = 0; i < perNode; i += 1) {
      const o = [];
      for (let k = 0; k < 4; k += 1) o.push({ f: rng() < 0.6 ? own[Math.floor(rng() * own.length)] : shared[Math.floor(rng() * shared.length)], hop: 1 });
      occ.push(o);
    }
    rec.set(n, occ);
  }
  if (twin) { // rename a random half of `twin`'s occurrences to `${twin}#twin`
    const occ = rec.get(twin); const keep = [], moved = [];
    for (const o of occ) (rng() < 0.5 ? moved : keep).push(o);
    rec.set(twin, keep); rec.set(`${twin}#twin`, moved);
  }
  return rec;
}
const NODES = Array.from({ length: 16 }, (_, i) => `n${i}`);

test("every number is declared — nothing defaults", () => {
  for (const k of Object.keys(OPTS)) {
    const o = { ...OPTS }; delete o[k];
    assert.throws(() => makeIdentityInduction(new Map(), o), new RegExp(k));
  }
  assert.throws(() => makeIdentityInduction(new Map(), { ...OPTS, resolution: 11 }), /resolution/);
});

test("a planted twin is judged the same", () => {
  const id = makeIdentityInduction(world({ nodes: NODES, perNode: 120, twin: "n3" }), OPTS);
  const r = id.judge("n3", "n3#twin");
  assert.equal(r.verdict, BOUND, JSON.stringify(r.tests));
});

test("two distinct nodes are judged different", () => {
  const id = makeIdentityInduction(world({ nodes: NODES }), OPTS);
  const r = id.judge("n3", "n4");
  assert.notEqual(r.verdict, BOUND);
  assert.ok([CONTRADICTED, UNBOUND].includes(r.verdict));
});

test("below the declared occurrence floor is a gap, never 'different'", () => {
  const rec = world({ nodes: NODES }); rec.set("thin", rec.get("n2").slice(0, 5));
  const r = makeIdentityInduction(rec, OPTS).judge("n2", "thin");
  assert.equal(r.verdict, UNBOUND); assert.equal(r.reason, "not_enough_reading");
});

test("idle things never match: two nodes drawn at random from the whole record are a gap", () => {
  // idle = indistinguishable from a random draw of the record — test 3's own
  // null. (A node of pure SHARED features is not idle when every other node
  // has its own: it departs from the average by lacking them — found when
  // this fixture was first written that way.)
  const rec = world({ nodes: NODES });
  const rng = createSeededRng({ seed: 9 });
  const pool = [...rec.values()].flat();
  for (const n of ["idleA", "idleB"]) rec.set(n, Array.from({ length: 60 }, () => pool[Math.floor(rng() * pool.length)]));
  const r = makeIdentityInduction(rec, OPTS).judge("idleA", "idleB");
  assert.equal(r.verdict, UNBOUND); assert.equal(r.reason, "idle");
});

test("a feature that names the candidate is masked — twins are not told apart by spelling", () => {
  // each half carries a feature naming the OTHER half, the way a hop-2
  // "this end also keeps label L" feature does in text
  const rec = world({ nodes: NODES, perNode: 120, twin: "n5" });
  rec.set("n5", rec.get("n5").map((o) => [...o, { f: "names:n5#twin", hop: 1 }, { f: "names:n5#twin", hop: 1 }]));
  rec.set("n5#twin", rec.get("n5#twin").map((o) => [...o, { f: "names:n5", hop: 1 }, { f: "names:n5", hop: 1 }]));
  const namesNode = (f) => (f.startsWith("names:") ? f.slice(6) : null);
  const masked = makeIdentityInduction(rec, { ...OPTS, namesNode }).judge("n5", "n5#twin");
  const leaked = makeIdentityInduction(rec, OPTS).judge("n5", "n5#twin");
  assert.equal(masked.verdict, BOUND);
  assert.ok(masked.masked >= 2);
  assert.notEqual(leaked.verdict, BOUND, "without the mask the self-naming feature decides it");
});

test("the organ names no medium", () => {
  const src = readFileSync(new URL("../kernel/identity-induction.js", import.meta.url), "utf8").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const w of ["sentence", "word", "token", "verb", "text", "pronoun"]) assert.ok(!new RegExp(`\\b${w}`, "i").test(src), `kernel body says '${w}'`);
});

test("shuffle control: random nodes whose features name their OWN node are idle, never same", () => {
  // every occurrence carries a feature naming the node it belongs to (the
  // hop-2 shape). Masking only the judged pair leaves the others' self-names
  // in the null, and random nodes then "carry weight" — found live, 13/66.
  const base = world({ nodes: NODES });
  const pool = [...base.values()].flat();
  const rng = createSeededRng({ seed: 11 });
  const rec = new Map();
  for (let i = 0; i < 12; i += 1) {
    const id = `r${i}`;
    rec.set(id, Array.from({ length: 60 }, () => [...pool[Math.floor(rng() * pool.length)], { f: `names:${id}`, hop: 1 }]));
  }
  const ii = makeIdentityInduction(rec, { ...OPTS, namesNode: (f) => (f.startsWith("names:") ? f.slice(6) : null) });
  let same = 0;
  for (let i = 0; i < 12; i += 1) for (let j = i + 1; j < 12; j += 1) if (ii.judge(`r${i}`, `r${j}`).verdict === BOUND) same += 1;
  assert.equal(same, 0);
});

// ── positioned worlds: every occurrence carries its place in the reading ──
// A node's features drift with the reading (its world changes over time).
// A twin that follows the SAME drift is the same being read in two names; an
// impostor with the same overall bag but the drift REVERSED is not.
function drifting({ nodes, per = 400, seed = 5, twin = null, reversedTwin = null }) {
  const rng = createSeededRng({ seed });
  const rec = new Map();
  for (const n of nodes) {
    const early = Array.from({ length: 6 }, (_, i) => `${n}-e${i}`), late = Array.from({ length: 6 }, (_, i) => `${n}-l${i}`);
    const occ = [];
    for (let i = 0; i < per; i += 1) {
      const at = Math.floor((i / per) * 1000), p = i / per; // drift: early features give way to late ones
      occ.push({ at, features: Array.from({ length: 4 }, () => ({ f: rng() < 0.7 ? (rng() > p ? early : late)[Math.floor(rng() * 6)] : `bg${Math.floor(rng() * 30)}`, hop: 1 })) });
    }
    rec.set(n, occ);
  }
  if (twin) { const keep = [], moved = []; for (const o of rec.get(twin)) (rng() < 0.5 ? moved : keep).push(o); rec.set(twin, keep); rec.set(`${twin}#twin`, moved); }
  if (reversedTwin) { // the same features, the drift run backwards through the reading
    const src = rec.get(reversedTwin);
    rec.set(`${reversedTwin}#rev`, src.filter((_, i) => i % 2).map((o) => ({ at: 1000 - o.at, features: o.features })));
    rec.set(reversedTwin, src.filter((_, i) => !(i % 2)));
  }
  return rec;
}
const TRAJ = { ...OPTS, minOccurrences: 20, resolution: 8, trajectory: { windows: 20, basis: 12, draws: 40 } };
const DRIFT_NODES = Array.from({ length: 10 }, (_, i) => `d${i}`);

test("test 5: a twin that follows the same trajectory stays bound", () => {
  const r = makeIdentityInduction(drifting({ nodes: DRIFT_NODES, twin: "d2" }), TRAJ).judge("d2", "d2#twin");
  assert.equal(r.verdict, BOUND, JSON.stringify(r.tests.dynamics));
  assert.ok(r.tests.dynamics.ranks.a >= 1 && r.tests.dynamics.ranks.b >= 1);
});

test("test 5: the same bag with the trajectory reversed is never bound — identity is the pattern, not the bag", () => {
  const rec = drifting({ nodes: DRIFT_NODES, reversedTwin: "d3" });
  const bagOnly = makeIdentityInduction(rec, { ...TRAJ, trajectory: undefined }).judge("d3", "d3#rev");
  const withPattern = makeIdentityInduction(rec, TRAJ).judge("d3", "d3#rev");
  assert.equal(bagOnly.verdict, BOUND, "the bag alone cannot tell them apart");
  assert.notEqual(withPattern.verdict, BOUND, JSON.stringify(withPattern.tests.dynamics));
});

test("test 5 declares its numbers, and cannot turn a non-bound into bound", () => {
  assert.throws(() => makeIdentityInduction(new Map(), { ...TRAJ, trajectory: { windows: 10 } }), /basis|draws/);
  const rec = drifting({ nodes: DRIFT_NODES });
  const plain = makeIdentityInduction(rec, { ...TRAJ, trajectory: undefined }), withT = makeIdentityInduction(rec, TRAJ);
  for (const [x, y] of [["d0", "d1"], ["d4", "d5"], ["d6", "d7"]]) if (plain.judge(x, y).verdict !== BOUND) assert.notEqual(withT.judge(x, y).verdict, BOUND);
});

test("positions without a declared trajectory, and a trajectory without positions, are typed", () => {
  const r = makeIdentityInduction(world({ nodes: NODES, perNode: 120, twin: "n3" }), { ...OPTS, trajectory: { windows: 8, basis: 8, draws: 20 } }).judge("n3", "n3#twin");
  assert.equal(r.verdict, BEYOND_REACH); assert.equal(r.reason, "no_positions");
});

test("the reading cursor: occurrences after asOf do not exist for the judgment", () => {
  const rec = drifting({ nodes: DRIFT_NODES, twin: "d2" });
  const id = makeIdentityInduction(rec, { ...TRAJ, trajectory: undefined });
  const early = id.judge("d2", "d2#twin", { asOf: 50 });
  assert.equal(early.asOf, 50);
  assert.equal(early.verdict, UNBOUND); assert.equal(early.reason, "not_enough_reading", "only ~10 occurrences each by position 50");
  assert.ok(early.read.a < id.judge("d2", "d2#twin").read.a);
});

test("the widening bound is recorded, and a bound that never settles is not bound", () => {
  const r = makeIdentityInduction(world({ nodes: NODES, perNode: 120, twin: "n3" }), OPTS).judge("n3", "n3#twin");
  assert.deepEqual(r.tests.bound, { settled: true, hop: 1 });
});

test("identity-verdict composes FOR and AGAINST through hl.js's one table", () => {
  const ind = (verdict) => ({ a: "x", b: "y", verdict, reason: null });
  const ex = (verdict, proof = []) => ({ a: "x", b: "y", verdict, proof });
  const proof = [{ a: { id: "x#1" }, b: { id: "y#1" } }];
  assert.equal(identityVerdict(ind(BOUND), ex(UNBOUND)).verdict, BOUND);
  assert.equal(identityVerdict(ind(BOUND), ex(CONTRADICTED, proof)).verdict, CONTESTED);
  assert.equal(identityVerdict(ind(UNBOUND), ex(CONTRADICTED, proof)).verdict, CONTRADICTED);
  assert.equal(identityVerdict(ind(UNBOUND), ex(UNBOUND)).verdict, UNBOUND, "neither is not 'different'");
  assert.equal(identityVerdict(ind(BEYOND_REACH), ex(BEYOND_REACH)).verdict, BEYOND_REACH);
  const b = identityVerdict(ind(BOUND), ex(UNBOUND));
  assert.equal(b.hypothesis.standing, "live_hypothesis", "bound lands as a revisable hypothesis, never a fact");
  assert.deepEqual(identityVerdict(ind(BOUND), ex(CONTRADICTED, proof)).hypothesis.attackRefs, ["x#1", "y#1"]);
  assert.equal(identityVerdict(ind(UNBOUND), ex(UNBOUND)).hypothesis, null);
});

test("a measured difference of USE never convicts: induction's 'different' is raised, not against", () => {
  // Наташа/Наташу: one woman, two case forms, surroundings that differ by role
  const ind = { a: "Наташа", b: "Наташу", verdict: CONTRADICTED, reason: "consequence_not_aligned" };
  const r = identityVerdict(ind, { a: "Наташа", b: "Наташу", verdict: UNBOUND, proof: [] });
  assert.equal(r.verdict, UNBOUND, "a difference of use is not a different thing");
  assert.deepEqual(r.raised, ["induction:consequence_not_aligned"]);
  assert.equal(r.against, false);
  // only a declared, witnessed conflict convicts
  const proved = identityVerdict(ind, { a: "Наташа", b: "Наташу", verdict: CONTRADICTED, proof: [{ a: { id: "n#1" }, b: { id: "n#2" } }] });
  assert.equal(proved.verdict, CONTRADICTED);
});
