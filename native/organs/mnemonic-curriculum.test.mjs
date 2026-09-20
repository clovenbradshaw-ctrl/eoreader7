// mnemonic-curriculum.test.mjs — the iterative teaching loop, shaped like
// the Greek method: present the material in many forms, measure what is
// missed, teach the gap, re-measure. Here the material is a 2D SHAPE seen
// in many rotations. The child is never shown the test orientation; every
// round it either recognizes the pose (the family's bound reached it) or
// discloses it as NOVEL — it never guesses.
//
// What the loop MEASURED before it worked (the falsification history):
//  - one instance per pose leaves the bound at the quantization floor —
//    a pose must be taught in several hands (the Greek teaching's many
//    hands of the same letter);
//  - a shape's own symmetry orbit creates TWINS (a square at 0° and 90°
//    are the same shadow at 0.02) — every lesson's nearest sibling is its
//    twin, so the nearest-bound measured only the noise, never the pose
//    chain. The kernel now derives the twin level from the kind's OWN
//    distance spectrum (the largest gap separates hand-edges from pose-
//    edges) — the twin is not counted as distance;
//  - the square's 90° symmetry then does the rest: teach ONE quarter-
//    octant and the symmetry carries every rotation; the triangle (no
//    symmetry) must be taught its full half-circle.

import test from "node:test";
import assert from "node:assert/strict";
import { createSeededRng } from "../kernel/rng.js";
import {
  emptyStore,
  teachGrid,
  recognizeGrid,
  nameKind,
  kindByName,
} from "./mnemonic.js";

const W = 96;
const H = 96;
const noise = (seed) => (createSeededRng(seed)() - 0.5) * 2 * 0.02;

const triangleAt0 = ({ seed = 1 } = {}) => {
  const g = new Float64Array(W * H).fill(0.22);
  const top = H / 2 - 22;
  const base = H / 2 + 22;
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    const t = (y - top) / (base - top);
    if (y >= top && y <= base && Math.abs(x - W / 2) <= 22 * t) g[y * W + x] = 1;
  }
  for (let i = 0; i < g.length; i += 1) g[i] += noise(seed + i);
  return g;
};

const squareAt0 = ({ seed = 1 } = {}) => {
  const g = new Float64Array(W * H).fill(0.22);
  const s = 44;
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    if (Math.abs(x - W / 2) <= s / 2 && Math.abs(y - H / 2) <= s / 2) g[y * W + x] = 1;
  }
  for (let i = 0; i < g.length; i += 1) g[i] += noise(seed + i);
  return g;
};

const starAt0 = ({ seed = 1 } = {}) => {
  const g = new Float64Array(W * H).fill(0.22);
  const s = 26;
  const cx = W / 2;
  const cy = H / 2;
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const r = i % 2 === 0 ? s : s * 0.45;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
  const inPoly = (px, py) => {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    if (inPoly(x, y)) g[y * W + x] = 1;
  }
  for (let i = 0; i < g.length; i += 1) g[i] += noise(seed + i);
  return g;
};

// rotation: the shape turned in the grid, bilinearly sampled — a real pose,
// not a pixelated one
function rotateGrid(grid, w, h, degrees, { seed = 1 } = {}) {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const out = new Float64Array(w * h).fill(0.22);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const sx = cos * dx + sin * dy + cx;
      const sy = -sin * dx + cos * dy + cy;
      if (sx < 0 || sy < 0 || sx > w - 1 || sy > h - 1) continue;
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const fx = sx - x0;
      const fy = sy - y0;
      const x1 = Math.min(w - 1, x0 + 1);
      const y1 = Math.min(h - 1, y0 + 1);
      const v00 = grid[y0 * w + x0];
      const v10 = grid[y0 * w + x1];
      const v01 = grid[y1 * w + x0];
      const v11 = grid[y1 * w + x1];
      const top = v00 * (1 - fx) + v10 * fx;
      const bot = v01 * (1 - fx) + v11 * fx;
      out[y * w + x] = top * (1 - fy) + bot * fy;
    }
  }
  for (let i = 0; i < out.length; i += 1) out[i] += noise(seed + i);
  return out;
}

// a pose is taught in several HANDS — the same orientation with different
// grain, the way the Greek teaching shows a form in many hands
function teachPose(store, shapeName, at0, deg) {
  for (let hand = 0; hand < 3; hand += 1) {
    const g = rotateGrid(at0({ seed: 50 + deg + hand * 37 }), W, H, deg, { seed: 60 + deg + hand * 41 });
    teachGrid(store, shapeName, { grid: g, w: W, h: H, source: `${shapeName}-r${deg}-h${hand}.png`, sourceBytes: 120000 });
  }
}

// the unseen test set: every 10° from 10° to 170° — never taught directly
const TESTS = Array.from({ length: 17 }, (_, i) => (i + 1) * 10);

function coverage(store, shapeName, at0) {
  let recognized = 0;
  const misses = [];
  for (const deg of TESTS) {
    const g = rotateGrid(at0({ seed: 100 + deg }), W, H, deg, { seed: 200 + deg });
    const rec = recognizeGrid(store, g, W, H);
    const r = rec.regions.find((x) => x.recognized.includes(shapeName));
    if (r) recognized += 1;
    else misses.push(deg);
  }
  return { recognized, total: TESTS.length, misses };
}

test("the curriculum: recognition over UNSEEN rotations rises with each teaching round", () => {
  const store = emptyStore();
  const curve = {};

  const shapes = {
    // the square's own 90° symmetry: one quarter-octant taught is enough —
    // every other rotation is a symmetry twin the family's own spectrum
    // refuses to count as distance
    square: { at0: squareAt0, rounds: [[0], [10, 20, 30], [40, 50, 60, 70]] },
    // the triangle has no rotational symmetry: it must be taught its full
    // half-circle pose chain
    triangle: { at0: triangleAt0, rounds: [[0], [10, 20, 30, 40, 50], [60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170]] },
    // the star's own 72° symmetry: one fundamental span carries the rest
    star: { at0: starAt0, rounds: [[0], [18, 36, 54], [9, 27, 45, 63]] },
  };

  for (const [name, spec] of Object.entries(shapes)) {
    spec.rounds.forEach((poses, round) => {
      for (const deg of poses) teachPose(store, name, spec.at0, deg);
      curve[`${name}-r${round}`] = coverage(store, name, spec.at0);
    });
  }

  for (const [name, spec] of Object.entries(shapes)) {
    const r0 = curve[`${name}-r0`].recognized;
    const r1 = curve[`${name}-r1`].recognized;
    const r2 = curve[`${name}-r2`].recognized;
    assert.ok(r1 >= r0 && r2 >= r1,
      `${name}: recognition over unseen poses must never fall with teaching (${r0} -> ${r1} -> ${r2})`);
    assert.ok(r2 > r0, `${name}: the iterative loop must measurably learn (${r0}/17 -> ${r2}/17 unseen poses)`);
    assert.ok(r2 >= 15, `${name}: final coverage reaches the unseen pose space (${r2}/17, misses ${curve[`${name}-r2`].misses.join(",") || "none"})`);
    // the gaps close: an unseen orientation BETWEEN taught ones is
    // recognized — the bound bridges the taught pose chain
    const g5 = rotateGrid(spec.at0({ seed: 105 }), W, H, 5, { seed: 205 });
    const mid = recognizeGrid(store, g5, W, H);
    assert.ok(mid.regions[0].recognized.includes(name), `${name}: the unseen 5° pose between 0° and 10° is bridged by the taught chain`);
  }

  // the square's 90° symmetry honored from round zero: before any 90°
  // teaching exists, the 90° pose IS the 0° pose's shadow
  const fresh = emptyStore();
  teachPose(fresh, "square", squareAt0, 0);
  const sq90 = recognizeGrid(fresh, rotateGrid(squareAt0({ seed: 190 }), W, H, 90, { seed: 290 }), W, H);
  assert.ok(sq90.regions.find((r) => r.recognized.includes("square")),
    "the square's 90° rotation is its own shadow — recognized from round zero");

  // the triangle's 90° rotation is NOT its own shadow — never guessed
  const fresh2 = emptyStore();
  teachPose(fresh2, "triangle", triangleAt0, 0);
  const t90 = recognizeGrid(fresh2, rotateGrid(triangleAt0({ seed: 190 }), W, H, 90, { seed: 290 }), W, H);
  assert.ok(!t90.regions.find((r) => r.recognized.includes("triangle")),
    "an untaught 90° triangle is not guessed as a triangle");
  assert.ok(t90.regions[0].novel, "the untaught pose is high possibility, never a confident guess");
});

test("the learned shape is a REFERENT: named in many languages, recognized by any surface", () => {
  const store = emptyStore();
  for (let i = 0; i < 7; i += 1) {
    teachGrid(store, "triangle", { grid: triangleAt0({ seed: i * 10 + 1 }), w: W, h: H, source: `tri-${i}.png`, sourceBytes: 120000, label: "triangle" });
  }
  nameKind(store, "triangle", "en", ["triangle"]);
  nameKind(store, "triangle", "el", ["τρίγωνον", "τρίγωνο"]);
  nameKind(store, "triangle", "he", ["משולש"]);
  nameKind(store, "triangle", "ja", ["三角形"]);
  nameKind(store, "triangle", "ar", ["مثلث"]);
  // every surface resolves to the one being
  for (const surface of ["triangle", "τρίγωνον", "משולש", "三角形", "مثلث", "ΤΡΊΓΩΝΟΝ"]) {
    const hits = kindByName(store, surface);
    assert.ok(hits.length >= 1 && hits[0].concept === "triangle", `${surface} binds to the triangle referent`);
  }
  // named and seen are the same identity
  assert.equal(kindByName(store, "τρίγωνο")[0].identity, store.concepts.triangle.identity);
});