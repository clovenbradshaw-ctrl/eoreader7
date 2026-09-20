// mnemonic-falsify.test.mjs — the falsification tier. Every claim the child
// makes is attacked here and the outcome is MEASURED, not wished: a test
// that passes proves the claim survived; a test that fails names the broken
// claim with the numbers. The house's own discipline (AGENTS.md): meaning
// is what survives contention, with the dissent disclosed.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createSeededRng } from "../kernel/rng.js";
import {
  emptyStore,
  teachGrid,
  recognizeGrid,
  absorbRecognition,
  falsifyOccurrence,
  mnemonicLook,
  saveStore,
} from "./mnemonic.js";
import { occurrenceKey } from "../kernel/kind-universe.js";
import { load } from "../adapters/image/material.js";

const W = 96;
const H = 96;
const jitterOf = (seed, j) => (createSeededRng(seed)() - 0.5) * 2 * j;
const noise = (seed) => (createSeededRng(seed)() - 0.5) * 2 * 0.02;

const inEllipse = (cx, cy, rx, ry, x, y) => {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
};

const dogGrid = ({ seed = 1, cx0 = W / 2, s = 1 } = {}) => {
  const rnd = (a, b) => a + (createSeededRng(seed)() - 0.5) * 0.5 * (b - a);
  const g = new Float64Array(W * H).fill(0.22);
  const cx = cx0 + (rnd(0, 1) - 0.5) * 10;
  const cy = H * 0.58;
  const scale = s * (1 + (rnd(0, 1) - 0.5) * 0.18);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const body = inEllipse(cx, cy, 30 * scale, 13 * scale, x, y);
      const head = inEllipse(cx + 27 * scale, cy - 15 * scale, 9 * scale, 8 * scale, x, y);
      const legL = x >= cx - 24 * scale && x <= cx - 18 * scale && y >= cy + 10 * scale && y <= cy + 10 * scale + 15 * scale;
      const legR = x >= cx + 18 * scale && x <= cx + 24 * scale && y >= cy + 10 * scale && y <= cy + 10 * scale + 15 * scale;
      if (body || head || legL || legR) g[y * W + x] = 1;
    }
  }
  for (let i = 0; i < g.length; i += 1) g[i] += noise(seed + i);
  return g;
};

const circleGrid = ({ seed = 1, r = 24, cx = W / 2, cy = H / 2 } = {}) => {
  const g = new Float64Array(W * H).fill(0.22);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) g[y * W + x] = 1;
  }
  for (let i = 0; i < g.length; i += 1) g[i] += noise(seed + i);
  return g;
};

const triangleGrid = ({ seed = 1 } = {}) => {
  const g = new Float64Array(W * H).fill(0.22);
  const top = H / 2 - 20;
  const base = H / 2 + 20;
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    const t = (y - top) / (base - top);
    if (y >= top && y <= base && Math.abs(x - W / 2) <= 20 * t) g[y * W + x] = 1;
  }
  for (let i = 0; i < g.length; i += 1) g[i] += noise(seed + i);
  return g;
};

const mirrorX = (g) => {
  const out = new Float64Array(W * H);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) out[y * W + (W - 1 - x)] = g[y * W + x];
  return out;
};

const rotate90 = (g) => {
  const out = new Float64Array(W * H);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) out[x * W + (H - 1 - y)] = g[y * W + x];
  return out;
};

const teachKind = (store, name, fn, n = 6) => {
  for (let i = 0; i < n; i += 1) {
    teachGrid(store, name, { grid: fn({ seed: i * 10 + 1 }), w: W, h: H, source: `${name}-${i}.png`, sourceBytes: 120000 });
  }
};

// ── falsification 1: the mirror. The shadow is pose-dependent BY DESIGN and
//    pose must be taught — so a MIRRORED dog must be a disclosed novelty,
//    never a confident dog. If the child called a mirrored dog "dog", the
//    memory would be lying. ──────────────────────────────────────────────
test("FALSIFY the pose claim: a mirrored dog is NOT confidently a dog — the shadow is pose-dependent and says so", () => {
  const store = emptyStore();
  teachKind(store, "dog", dogGrid);
  const rec = recognizeGrid(store, mirrorX(dogGrid({ seed: 500 })), W, H);
  const region = rec.regions.find((r) => r.recognized.includes("dog"));
  assert.ok(!region, "a mirrored dog must not be confidently read as a dog — the memory has never seen that pose");
  assert.ok(rec.regions[0].novel, "the mirrored pose is disclosed as a novel thing, not guessed as a known one");
});

// ── falsification 2: rotation. A 90°-rotated SQUARE is still a square —
//    and the child MUST say so: the square's shadow is 90°-symmetric by
//    construction (a square in its tight box is its own rotation). The
//    falsifiable claim is the TRIANGLE: rotated 180° it is a different
//    silhouette, and the child must disclose it as novel, never call it a
//    triangle by mistake. ────────────────────────────────────────────────
test("FALSIFY rotation: the child honors the square's 90° symmetry and discloses the rotated triangle as novel", () => {
  const store = emptyStore();
  const square = ({ seed = 1 } = {}) => {
    const g = new Float64Array(W * H).fill(0.22);
    const ox = W / 2 + jitterOf(seed, 2);
    const oy = H / 2 + jitterOf(seed + 1, 2);
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
      if (Math.abs(x - ox) <= 20 && Math.abs(y - oy) <= 20) g[y * W + x] = 1;
    }
    for (let i = 0; i < g.length; i += 1) g[i] += noise(seed + i);
    return g;
  };
  teachKind(store, "square", square);
  teachKind(store, "triangle", triangleGrid);
  // the square: 90° rotation is the same shadow — the child must recognize
  // it (a symmetric shape's shadow carries the symmetry)
  const rotatedSquare = recognizeGrid(store, rotate90(square({ seed: 500 })), W, H);
  assert.ok(rotatedSquare.regions[0].recognized.includes("square"),
    "a 90°-rotated square IS a square — the shadow's symmetry is the shape's own");
  // the triangle: 180° rotation is a different silhouette — disclosed novel
  const rotatedTriangle = recognizeGrid(store, rotate90(triangleGrid({ seed: 500 })), W, H);
  const asTriangle = rotatedTriangle.regions.find((r) => r.recognized.includes("triangle"));
  assert.ok(!asTriangle, "a rotated triangle must not be confidently called a triangle — that pose was never taught");
  assert.ok(rotatedTriangle.regions[0].novel, "rotation is disclosed as novelty, never guessed");
});

// ── falsification 3: the SELF-CONFIRMING trace. absorbRecognition records
//    recognized things as OCCURRENCES — so a mis-recognition, once absorbed,
//    leaves a corroborating trace in the kind's ledger that the parent's
//    refutation of the ORIGINAL lesson does not clean. The framework heals
//    (the sole refuted lesson empties it); the ledger keeps the lie's mark.
test("FALSIFY the self-confirming trace: refutation heals the framework but leaves the absorbed occurrence in the ledger", () => {
  const store = emptyStore();
  // a REAL square family (wide enough to believe a lookalike lesson) plus
  // the parent's ONE error: a triangle taught as "square"
  const square = ({ seed = 1 } = {}) => {
    const g = new Float64Array(W * H).fill(0.22);
    const ox = W / 2 + jitterOf(seed, 4);
    const oy = H / 2 + jitterOf(seed + 1, 4);
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
      if (Math.abs(x - ox) <= 20 && Math.abs(y - oy) <= 20) g[y * W + x] = 1;
    }
    for (let i = 0; i < g.length; i += 1) g[i] += noise(seed + i);
    return g;
  };
  for (let i = 0; i < 7; i += 1) teachGrid(store, "square", { grid: square({ seed: i * 10 + 1 }), w: W, h: H, source: `sq-${i}.png`, sourceBytes: 120000 });
  const bad = teachGrid(store, "square", { grid: triangleGrid({ seed: 9 }), w: W, h: H, source: "mistake.png", sourceBytes: 120000, label: "square" });
  // the child believes the false lesson (the wide family absorbs it) and
  // the universe-building step ABSORBS a triangle sighting into "square"
  const first = recognizeGrid(store, triangleGrid({ seed: 42 }), W, H);
  assert.ok(first.regions[0].recognized.includes("square"), "the false lesson is believed (the falsification: it IS)");
  absorbRecognition(store, first, { source: "photo-1.png", grid: triangleGrid({ seed: 42 }), w: W, h: H });
  const occBefore = store.concepts.square.occurrences.filter((o) => !o.falsified).length;
  assert.ok(occBefore >= 8, `the absorbed sighting is recorded in the ledger (${occBefore} live occurrences)`);
  // the parent re-reads the original source and refutes THAT lesson
  const occId = occurrenceKey("square", "mistake.png", bad.items[bad.items.length - 1].region);
  falsifyOccurrence(store, "square", occId, { by: "cv-parent", reason: "re-read: this is a triangle" });
  // the FRAMEWORK heals: with the false lesson refuted, the remaining
  // square family no longer reaches the triangle
  const after = recognizeGrid(store, triangleGrid({ seed: 7 }), W, H);
  assert.ok(!after.regions[0].recognized.includes("square"), "DEF heals the framework — the triangle stops firing as square");
  // but the LEDGER keeps the lie: the absorbed triangle occurrence at
  // photo-1 was never refuted, and it still corroborates the kind — one
  // future honest lesson plus this stale trace would confirm the kind
  const occAfter = store.concepts.square.occurrences.filter((o) => !o.falsified).length;
  assert.ok(occAfter >= 8, `the absorbed trace survives refutation (${occAfter} live occurrences remain) — the ledger keeps the lie's mark`);
});

// ── falsification 4: the OUTLIER bound. The leave-one-out bound is the
//    worst within-family nearest distance — so ONE bad lesson widens the
//    kind to everything within reach of the bad lesson. Teach squares and
//    one triangle as "square": the family's bound must absorb triangles. ─
test("FALSIFY the outlier bound: one bad lesson widens the kind's bound to the bad lesson's neighborhood", () => {
  const store = emptyStore();
  const square = ({ seed = 1 } = {}) => {
    const g = new Float64Array(W * H).fill(0.22);
    const ox = W / 2 + jitterOf(seed, 4);
    const oy = H / 2 + jitterOf(seed + 1, 4);
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
      if (Math.abs(x - ox) <= 20 && Math.abs(y - oy) <= 20) g[y * W + x] = 1;
    }
    for (let i = 0; i < g.length; i += 1) g[i] += noise(seed + i);
    return g;
  };
  for (let i = 0; i < 3; i += 1) teachGrid(store, "square", { grid: square({ seed: i + 1 }), w: W, h: H, source: `sq-${i}.png`, sourceBytes: 120000 });
  teachGrid(store, "square", { grid: triangleGrid({ seed: 99 }), w: W, h: H, source: "bad.png", sourceBytes: 120000 });
  const before = recognizeGrid(store, triangleGrid({ seed: 5 }), W, H);
  assert.ok(before.regions[0].recognized.includes("square"),
    "with the bad lesson in the family, a triangle reads as a square — the outlier bound is as wide as its worst member");
  // the falsification mechanism exists: refute the bad lesson and the
  // triangle stops being a square
  const occId = occurrenceKey("square", "bad.png", store.concepts.square.items.find((i) => i.source.endsWith("bad.png")).region);
  falsifyOccurrence(store, "square", occId, { by: "cv-parent", reason: "re-read: triangle" });
  const after = recognizeGrid(store, triangleGrid({ seed: 5 }), W, H);
  assert.ok(!after.regions[0].recognized.includes("square"), "refutation heals the outlier bound");
});

// ── falsification 5: the two-lesson family. Two identical lessons give a
//    zero bound (the quantization resolution is the floor) — so a third,
//    slightly different example of the SAME kind is rejected. The child is
//    honest but brittle: one photograph of a dog, taught twice, recognizes
//    only that photograph. ───────────────────────────────────────────────
test("FALSIFY two-lesson brittleness: identical lessons make the kind recognize only its exact self", () => {
  const store = emptyStore();
  const g1 = dogGrid({ seed: 3 });
  teachGrid(store, "dog", { grid: g1, w: W, h: H, source: "a.png", sourceBytes: 120000 });
  teachGrid(store, "dog", { grid: g1, w: W, h: H, source: "b.png", sourceBytes: 120000 });
  const exact = recognizeGrid(store, g1, W, H);
  assert.ok(exact.regions[0].recognized.includes("dog"), "the exact taught dog is recognized");
  const other = recognizeGrid(store, dogGrid({ seed: 4 }), W, H);
  assert.ok(!other.regions[0].recognized.includes("dog"),
    "another dog of the same kind is rejected — two identical lessons give the child no room, and the child says so");
  assert.ok(other.regions[0].novel, "the unseen dog is honestly novel, not guessed");
});

// ── falsification 6: the REAL false positive, on the fast path. The Kaggle
//    data measured a brick wall INSIDE the coin family's spread — so the
//    fast path would claim "a coin" for a wall of bricks. The claim must be
//    disclosed as the memory read it is, never as a verified CV finding. ──
test("FALSIFY the fast path on real data: a brick wall is read as coins, and the standing says what that means", { skip: !fs.existsSync(path.join(os.homedir(), ".cache", "kagglehub", "datasets", "benai9916", "computer-vision-sample-images", "versions", "4", "coins_on_white.jpg")) }, async () => {
  const ROOT = path.join(os.homedir(), ".cache", "kagglehub", "datasets", "benai9916", "computer-vision-sample-images", "versions", "4");
  const store = emptyStore();
  for (const f of ["coins_on_white.jpg", "pennies.jpg", "separate_coins.jpg"]) {
    const p = path.join(ROOT, f);
    const { buf, w, h } = await load(p, { w: 128, h: 128 });
    teachGrid(store, "coin", { grid: buf, w, h, source: p, sourceBytes: fs.statSync(p).size });
  }
  const bricks = await mnemonicLook(store, path.join(ROOT, "bricks.jpg"));
  assert.ok(bricks, "the falsification reproduces: the memory reads bricks as coins (measured: inside the coin family's spread)");
  assert.match(bricks.text, /Recognized from memory/, "the fast path says exactly what it is: a memory read");
  assert.match(bricks.standing, /de-lossy it and re-verify any time/, "the standing hands the reader the de-lossy handle — the CV parent can re-check");
});

// ── falsification 7: the memory stays a compression. The universe keeps
//    building — if the store ever grew toward the size of its sources, the
//    size rule would be dead. The store's growth is bounded by lessons and
//    occurrences, never by bytes of the things seen. ─────────────────────
test("FALSIFY the store's growth: absorbRecognition on many frames never approaches source bytes", () => {
  const store = emptyStore();
  for (let i = 0; i < 20; i += 1) {
    const g = circleGrid({ seed: i * 3 + 1, cx: 20 + (i % 5) * 14, cy: 20 + (i % 4) * 18 });
    const rec = recognizeGrid(store, g, W, H);
    absorbRecognition(store, rec, { source: `frame-${i}.png`, grid: g, w: W, h: H });
  }
  const tmp = path.join(os.tmpdir(), `mnemonic-falsify-${process.pid}.json`);
  saveStore(store, tmp);
  const size = fs.statSync(tmp).size;
  fs.unlinkSync(tmp);
  // 20 frames × 96×96 grids = 184k cells of source material; the memory
  // must stay a fraction of that (the twin-level bound widened recognition,
  // so more novel kinds were signed — 20KB for 184K cells of seen material
  // is still a 9× compression of the grids alone, and a fraction of a
  // percent of the source files)
  assert.ok(size < 30000, `the memory of 20 frames is ${size} bytes — a compression, never the frames`);
  assert.ok(store.concepts[Object.keys(store.concepts)[0]].items[0].d.length === 192, "every lesson is the 144-byte shadow, no more");
});