import test from "node:test"; import assert from "node:assert/strict";
import { colony, walk, TRANSFORMS, STATS, MAX_DEPTH } from "../organs/structure-swarm.js";
import { deposit } from "../kernel/stigmergy.js";
import { execFileSync } from "node:child_process";

// a fake world: any pipeline that squares then averages then asks for persistence has structure; everything else is noise
const has = (sp) => sp.includes("sq") && sp.includes("blk64") && sp.at(-1) === "acf8";
const fake = (specs) => specs.map((sp) => ({ spec: sp, stat: 1, z_shuffle: has(sp) ? 20 : 0.5, z_phase: 0.3, gloss: sp.join(" ") }));
const noise = (specs) => specs.map((sp) => ({ spec: sp, stat: 1, z_shuffle: 1.2, z_phase: 1.1, gloss: sp.join(" ") }));
const CEIL = (v) => async (specs) => ({ shuffle: v + 0.05 * specs.length, phase: v + 0.05 * specs.length });

test("ants follow trails: a colony that inherits a successful trail finds the structure sooner than a fresh one", async () => {
  const run = (trails, seed) => colony({ evalBatch: async (s) => fake(s), ceilingOf: CEIL(3), trails, seed, rounds: 3, ants: 24, now: 1e12 });
  const first = await run({}, 11); assert.ok(first.structures.some((s) => has(s.spec)), "the colony finds the planted pipeline");
  assert.ok(Object.keys(first.trails).length > 0, "successful ants laid trails");
  const fresh = await run({}, 5), taught = await run(first.trails, 5);
  const hits = (r) => r.results.filter((x) => has(x.spec)).length;
  assert.ok(hits(taught) >= hits(fresh), `a colony taught by earlier trails finds no fewer (${hits(taught)} vs ${hits(fresh)})`);
  const pheromone = Object.values(first.trails).flat().length; assert.ok(pheromone > 0);
});

test("failures deposit nothing; a colony on noise lays no trail and reports NO structure — the search-aware bar", async () => {
  const r = await colony({ evalBatch: async (s) => noise(s), ceilingOf: CEIL(3.5), trails: {}, seed: 3, now: 1e12 });
  assert.equal(Object.keys(r.trails).length, 0); assert.equal(r.structures.length, 0);
  assert.equal((await colony({ evalBatch: async (s) => fake(s), ceilingOf: async () => ({ shuffle: 99, phase: 99 }), seed: 3 })).structures.length, 0, "a ceiling above every z reports nothing");
});

test("trying more raises the bar; ants never repeat a pipeline; depth is capped; redundancy is folded", async () => {
  const small = await colony({ evalBatch: async (s) => fake(s), ceilingOf: CEIL(3), rounds: 1, ants: 6, seed: 2 }), big = await colony({ evalBatch: async (s) => fake(s), ceilingOf: CEIL(3), rounds: 3, ants: 24, seed: 2 });
  assert.ok(big.ceiling.shuffle > small.ceiling.shuffle);
  const keys = big.results.map((x) => x.spec.join(">")); assert.equal(new Set(keys).size, keys.length);
  assert.ok(big.results.every((x) => x.spec.length <= MAX_DEPTH + 1 && STATS.includes(x.spec.at(-1)) && x.spec.slice(0, -1).every((t) => TRANSFORMS.includes(t))));
  const per = new Map(); for (const s of big.structures) per.set(`${s.spec.at(-1)}|${s.null}`, (per.get(`${s.spec.at(-1)}|${s.null}`) ?? 0) + 1); assert.ok([...per.values()].every((n) => n <= 2));
});

test("the move names agree with the python judges (a drift here would make ants walk into moves that do not exist)", () => {
  const out = execFileSync("python3", ["-c", "import sys,json; sys.path.insert(0,'organs/er7py'); import swarm; print(json.dumps([swarm.TRANSFORM_NAMES, swarm.STAT_NAMES]))"], { encoding: "utf8", cwd: new URL("..", import.meta.url).pathname });
  const [T, S] = JSON.parse(out); assert.deepEqual(T, [...TRANSFORMS]); assert.deepEqual(S, [...STATS]);
});

test("the python judges: a bursty series beats both nulls where it should, a Gaussian one does not, and the ceiling sits above chance", () => {
  const py = `import sys,json; sys.path.insert(0,'organs/er7py'); import numpy as np, swarm
rng=np.random.default_rng(3); n=16384
g=rng.normal(size=n); env=np.exp(np.convolve(rng.normal(size=n),np.ones(300)/np.sqrt(300),'same')*0.9); b=g*env
spec=["sq","blk64","acf1"]
rb=swarm.evaluate(b,[spec],10,1)[0]; rg=swarm.evaluate(g,[spec],10,1)[0]
c=swarm.ceiling(g,[spec,["kurt"],["acf1"]],10,1,2)
print(json.dumps([rb["z_phase"],rg["z_phase"],rg["z_shuffle"],c["phase"],c["shuffle"]]))`;
  const [zb, zg, zgs, cp, cs] = JSON.parse(execFileSync("python3", ["-c", py], { encoding: "utf8", cwd: new URL("..", import.meta.url).pathname }));
  assert.ok(zb > 6, `bursty data clears the phase null (z=${zb})`); assert.ok(zg < 3.5, `Gaussian noise does not (z=${zg})`); assert.ok(zgs < 3.5 && cp < 6 && cs < 6, "chance ceilings stay small");
  assert.ok(zb > cp, "the bursts stand above the search-aware ceiling");
});
