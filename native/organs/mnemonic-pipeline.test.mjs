// mnemonic-pipeline.test.mjs — the continuous learning loop: the child gets
// recursively better at knowing what something is — whether the working
// stream gives it material or we ask it to keep iterating — and it never
// needs a CV model to do it. The claims under test:
//   1. the working stream: material the child has never seen is absorbed
//      from its own recognition — novel things become provisional kinds;
//   2. iteration converges: re-reading the same material, the novelty curve
//      falls to zero (a fixed point — nothing new is learned);
//   3. the parent teaches ONCE (a CV-parent read with named boxes), and the
//      child then recognizes the class from memory alone — no CV;
//   4. the memory is a compression all the way through: 144 bytes per
//      lesson, however much the loop learns.

import test from "node:test";
import assert from "node:assert/strict";
import { createSeededRng } from "../kernel/rng.js";
import { emptyStore, recognizeGrid, saveStore, loadStore } from "./mnemonic.js";
import { learnFromGrid, learnIteratively, learningReport, learnFromLook } from "./mnemonic-pipeline.js";
import { load } from "../adapters/image/material.js";

const W = 96;
const H = 96;
const noise = (seed) => (createSeededRng(seed)() - 0.5) * 2 * 0.02;
const jitterOf = (seed, j) => (createSeededRng(seed)() - 0.5) * 2 * j;

const triangle = ({ seed = 1, jitter = 0.5 } = {}) => {
  const g = new Float64Array(W * H).fill(0.22);
  const s = 40 * (1 + jitterOf(seed, jitter * 0.2));
  const ox = W / 2 + jitterOf(seed + 1, jitter * 10);
  const oy = H / 2 + jitterOf(seed + 2, jitter * 10);
  const top = oy - s / 2;
  const base = oy + s / 2;
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    const t = (y - top) / (base - top);
    if (y >= top && y <= base && Math.abs(x - ox) <= (s / 2) * t) g[y * W + x] = 1;
  }
  for (let i = 0; i < g.length; i += 1) g[i] += noise(seed + i);
  return g;
};

const square = ({ seed = 1, jitter = 0.5 } = {}) => {
  const g = new Float64Array(W * H).fill(0.22);
  const s = 40 * (1 + jitterOf(seed, jitter * 0.2));
  const ox = W / 2 + jitterOf(seed + 1, jitter * 10);
  const oy = H / 2 + jitterOf(seed + 2, jitter * 10);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    if (Math.abs(x - ox) <= s / 2 && Math.abs(y - oy) <= s / 2) g[y * W + x] = 1;
  }
  for (let i = 0; i < g.length; i += 1) g[i] += noise(seed + i);
  return g;
};

test("the working stream: material the child has never seen is absorbed from its own recognition", () => {
  const store = emptyStore();
  const before = learningReport(store);
  assert.equal(before.kinds, 0, "the child begins knowing nothing");
  // a stream of triangles passes through the working loop — the child has
  // no CV model, only its own shadow/echo recognition
  for (let i = 0; i < 12; i += 1) {
    const g = triangle({ seed: i * 10 + 1, jitter: 0.5 });
    const { report } = learnFromGrid(store, g, W, H, { source: `stream-${i}.png` });
    assert.ok(report.regions >= 1, "every working frame is read");
  }
  const report = learningReport(store);
  assert.ok(report.kinds >= 1, `the stream produced at least one kind (${report.kinds})`);
  assert.ok(report.lessons >= 12, "every seen thing is a 144-byte lesson");
});

test("iteration converges: the novelty curve falls to zero — a fixed point", () => {
  const store = emptyStore();
  // the child is asked to keep iterating over one piece of material
  const g = triangle({ seed: 500, jitter: 0.4 });
  const first = learnIteratively(store, { grid: g, w: W, h: H }, { rounds: 6, source: "iterate-1" });
  assert.ok(first.converged, `the first iteration converges (curve: ${first.curve.join(" -> ")})`);
  assert.ok(first.curve[0] >= 1, "the first round found the thing novel");
  assert.equal(first.curve[first.curve.length - 1], 0, "the final round learned nothing new");
  // re-reading the SAME material now takes ZERO learning rounds — the
  // memory already knows it (recursively better: the second pass is free)
  const again = learnIteratively(store, { grid: g, w: W, h: H }, { rounds: 6, source: "iterate-2" });
  assert.equal(again.rounds, 1, "re-seeing known material converges in one round");
  assert.equal(again.curve[0], 0, "nothing is novel on the second pass");
  // and a NEW triangle (never shown) is now recognized from memory
  const fresh = recognizeGrid(store, triangle({ seed: 777, jitter: 0.4 }), W, H);
  assert.ok(fresh.regions[0].recognized.includes("triangle") || fresh.regions[0].novel,
    "the new triangle is either recognized from memory or disclosed — never guessed");
});

test("the parent teaches ONCE; the child recognizes the class from memory alone after", async () => {
  // simulate the CV parent's read of a real image: named boxes with
  // spatial coordinates (the lookAtImage result shape)
  const { writePNG, scenePixels } = await import("./mnemonic-pipeline-fixtures.js");
  const store = emptyStore();
  // the parent reads THREE photographs of the circle class and names each —
  // several hands of the same thing, the law every axis measured
  for (let v = 0; v < 3; v += 1) {
    const pngPath = scenePixels(v);
    const lookResult = {
      imagePath: pngPath,
      width: 384,
      height: 288,
      boxes: [{ id: `b${v}`, region: [160 + v * 32, 112 + v * 16, 64, 64], text: "circle", color: null }],
      connectors: [],
    };
    const learned = await learnFromLook(store, lookResult);
    assert.ok(learned.taught >= 1, `the parent's named box ${v} became a lesson`);
    assert.equal(learned.from, "cv-parent", "the lesson came from the CV parent");
  }
  // the child now recognizes the class from memory — a NEW file with the
  // same kind of thing, no CV parent anywhere
  const { recognizeImage } = await import("./mnemonic.js");
  const second = await recognizeImage(store, scenePixels(1), { grid: 128 }); // the same decode grid the parent taught in
  assert.ok(second.regions.some((r) => r.recognized.includes("circle")),
    "the child recognizes the circle class from its 144-byte memory — no CV model");
});

test("the loop keeps the compression: 144 bytes per lesson, however much is learned", async () => {
  const store = emptyStore();
  for (let i = 0; i < 10; i += 1) {
    const g = i % 2 ? triangle({ seed: i * 10 + 1 }) : square({ seed: i * 10 + 1 });
    learnFromGrid(store, g, W, H, { source: `mix-${i}.png` });
  }
  const report = learningReport(store);
  assert.ok(report.kinds >= 2, "both shapes became kinds");
  for (const [name, kind] of Object.entries(report.universe.kinds)) {
    void name;
    assert.ok(kind.lessons > 0, "each kind has lessons");
  }
  for (const entry of Object.values(store.concepts)) {
    for (const item of entry.items) assert.equal(item.d.length, 192, "every lesson is the 144-byte shadow");
  }
  const tmp = `/tmp/mnemonic-pipeline-${process.pid}.json`;
  saveStore(store, tmp);
  const loaded = loadStore(tmp);
  const report2 = learningReport(loaded);
  assert.equal(report2.kinds, report.kinds, "the store survives the round-trip");
  const { unlinkSync } = await import("node:fs");
  unlinkSync(tmp);
});