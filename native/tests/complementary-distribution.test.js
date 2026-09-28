import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { complementaryDistribution } from "../kernel/complementary-distribution.js";

const D = { window: 20, draws: 200, alpha: 0.05, seed: 3, minSharedScenes: 5, totalFrames: 2000 };
// 40 scenes of 20 frames; in each scene A holds 4 frames and B holds 4 frames
const scenes = (place) => { const a = [], b = []; for (let s = 0; s < 40; s += 1) { const [pa, pb] = place(s); a.push(...pa.map((f) => s * 20 + f)); b.push(...pb.map((f) => s * 20 + f)); } return [a, b]; };

test("every number is declared", () => {
  assert.throws(() => complementaryDistribution([1], [2], { window: 20 }), /declared/);
});

test("one referent under two names: same scenes, never the same frame -> complementary", () => {
  const [a, b] = scenes(() => [[0, 5, 10, 15], [2, 7, 12, 17]]);
  const r = complementaryDistribution(a, b, D);
  assert.equal(r.verdict, "complementary", JSON.stringify(r));
  assert.equal(r.observed, 0);
});

test("two people named side by side -> together (raised, never a proof)", () => {
  const [a, b] = scenes(() => [[0, 5, 10, 15], [0, 5, 10, 16]]);
  assert.equal(complementaryDistribution(a, b, D).verdict, "together");
});

test("CONTROL built to fail: independent placement within shared scenes is never complementary", () => {
  let x = 11; const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pick = () => { const s = new Set(); while (s.size < 4) s.add(Math.floor(rnd() * 20)); return [...s]; };
  let complementary = 0;
  for (let t = 0; t < 20; t += 1) { const [a, b] = scenes(() => [pick(), pick()]); if (complementaryDistribution(a, b, { ...D, seed: t }).verdict === "complementary") complementary += 1; }
  assert.ok(complementary <= 3, `independent placement read complementary ${complementary}/20 times`);
});

test("expressions that never share a scene are a gap, never 'different'", () => {
  const a = [0, 1, 2, 3, 4, 5], b = [1500, 1501, 1502];
  const r = complementaryDistribution(a, b, D);
  assert.equal(r.verdict, "gap");
  assert.equal(r.reason, "no_shared_scenes");
});

test("the organ names no medium and reads no spelling", () => {
  const src = readFileSync(new URL("../kernel/complementary-distribution.js", import.meta.url), "utf8").replace(/\/\/.*$/gm, "");
  for (const w of ["sentence", "word", "token", "text", "string", "name"]) assert.ok(!new RegExp(`\\b${w}`, "i").test(src), `kernel code names '${w}'`);
});
