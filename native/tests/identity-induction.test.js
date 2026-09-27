// identity-induction.test.js — the walls of kernel/identity-induction.js on
// synthetic, medium-blind material: nodes are opaque ids, features opaque
// symbols. Nothing here is a word. The known-answer controls on real books
// live in eval/identity/.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeIdentityInduction } from "../kernel/identity-induction.js";
import { createSeededRng } from "../kernel/rng.js";

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
  assert.equal(r.verdict, "same", JSON.stringify(r.tests));
});

test("two distinct nodes are judged different", () => {
  const id = makeIdentityInduction(world({ nodes: NODES }), OPTS);
  const r = id.judge("n3", "n4");
  assert.equal(r.verdict, "different");
});

test("below the declared occurrence floor is a gap, never 'different'", () => {
  const rec = world({ nodes: NODES }); rec.set("thin", rec.get("n2").slice(0, 5));
  const r = makeIdentityInduction(rec, OPTS).judge("n2", "thin");
  assert.equal(r.verdict, "gap"); assert.equal(r.reason, "not_enough_reading");
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
  assert.equal(r.verdict, "gap"); assert.equal(r.reason, "idle");
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
  assert.equal(masked.verdict, "same");
  assert.ok(masked.masked >= 2);
  assert.equal(leaked.verdict, "different", "without the mask the self-naming feature decides it");
});

test("the organ names no medium", () => {
  const src = readFileSync(new URL("../kernel/identity-induction.js", import.meta.url), "utf8").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const w of ["sentence", "word", "token", "verb", "text", "pronoun"]) assert.ok(!new RegExp(`\\b${w}`, "i").test(src), `kernel body says '${w}'`);
});
