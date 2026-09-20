// mnemonic-shapes.test.mjs — the child on BASIC SHAPES: prove the shadow/
// echo + DMD framework discriminates shapes it cannot cheat on (circle vs
// square vs triangle vs star), picks shapes from other shapes, and runs the
// full universe dynamics — falsification, splits, novelty rolling up into
// confirmed kinds, holonic parts, the void, and the DMD-bounded verdict.
// All pure: synthesized grids, no ffmpeg, no CV model. Every jitter is
// SEEDED (kernel/rng.js) — the family a child is taught must be the same
// family on every run, or the bounds themselves would be the flake.

import test from "node:test";
import assert from "node:assert/strict";
import { createSeededRng } from "../kernel/rng.js";
import {
  emptyStore,
  teachGrid,
  recognizeGrid,
  absorbRecognition,
  falsifyOccurrence,
  universeSnapshot,
  confirmKind,
} from "./mnemonic.js";
import {
  splitProposals,
  occurrenceKey,
  CANONICALIZATION_FLOOR,
} from "../kernel/kind-universe.js";

const W = 96;
const H = 96;

// deterministic jitter: a seeded draw in [-j, j] per axis (createSeededRng
// returns the draw function itself)
const jitterOf = (seed, j) => (createSeededRng(seed)() - 0.5) * 2 * j;

const noise = (seed) => (createSeededRng(seed)() - 0.5) * 2 * 0.02;

// ── basic shapes, each a grid function with SEEDED jitter ─────────────────
const circle = ({ seed = 1, jitter = 0.5, cx = W / 2, cy = H / 2, r = 24 } = {}) => {
  const g = new Float64Array(W * H).fill(0.22);
  const rr = r * (1 + jitterOf(seed, jitter * 0.2));
  const ox = cx + jitterOf(seed + 1, jitter * 10);
  const oy = cy + jitterOf(seed + 2, jitter * 10);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    if ((x - ox) ** 2 + (y - oy) ** 2 <= rr * rr) g[y * W + x] = 1;
  }
  for (let i = 0; i < g.length; i += 1) g[i] += noise(seed + i);
  return g;
};

const square = ({ seed = 1, jitter = 0.5, cx = W / 2, cy = H / 2, side = 40, mark = null } = {}) => {
  const g = new Float64Array(W * H).fill(0.22);
  const s = side * (1 + jitterOf(seed, jitter * 0.2));
  const ox = cx + jitterOf(seed + 1, jitter * 10);
  const oy = cy + jitterOf(seed + 2, jitter * 10);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    if (Math.abs(x - ox) <= s / 2 && Math.abs(y - oy) <= s / 2) g[y * W + x] = 1;
    if (mark && (x - mark[0]) ** 2 + (y - mark[1]) ** 2 <= mark[2] ** 2) g[y * W + x] = 1;
  }
  for (let i = 0; i < g.length; i += 1) g[i] += noise(seed + i);
  return g;
};

const triangle = ({ seed = 1, jitter = 0.5, cx = W / 2, cy = H / 2, size = 40 } = {}) => {
  const g = new Float64Array(W * H).fill(0.22);
  const s = size * (1 + jitterOf(seed, jitter * 0.2));
  const ox = cx + jitterOf(seed + 1, jitter * 10);
  const oy = cy + jitterOf(seed + 2, jitter * 10);
  const top = oy - s / 2;
  const base = oy + s / 2;
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    const t = (y - top) / (base - top);
    const halfW = (s / 2) * t;
    if (y >= top && y <= base && Math.abs(x - ox) <= halfW) g[y * W + x] = 1;
  }
  for (let i = 0; i < g.length; i += 1) g[i] += noise(seed + i);
  return g;
};

const star = ({ seed = 1, jitter = 0.5, cx = W / 2, cy = H / 2, size = 24 } = {}) => {
  const g = new Float64Array(W * H).fill(0.22);
  const s = size * (1 + jitterOf(seed, jitter * 0.2));
  const ox = cx + jitterOf(seed + 1, jitter * 10);
  const oy = cy + jitterOf(seed + 2, jitter * 10);
  const points = Array.from({ length: 10 }, (_, i) => {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? s : s * 0.45;
    return [ox + rad * Math.cos(ang), oy + rad * Math.sin(ang)];
  });
  const inPoly = (px, py) => {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
      const [xi, yi] = points[i];
      const [xj, yj] = points[j];
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

// a diamond: a square rotated 45° — the hard case, deliberately NOT taught.
const diamond = () => {
  const g = new Float64Array(W * H).fill(0.22);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    if (Math.abs(x - W / 2) + Math.abs(y - H / 2) <= 30) g[y * W + x] = 1;
  }
  for (let i = 0; i < g.length; i += 1) g[i] += noise(i);
  return g;
};

const teachAll = (store, name, fn, n = 7) => {
  for (let i = 0; i < n; i += 1) {
    teachGrid(store, name, { grid: fn({ seed: i * 10 + 1 }), w: W, h: H, source: `${name}-${i}.png`, sourceBytes: 120000, label: name });
  }
};

test("basic shapes: each is recognized as itself and nothing else", () => {
  const store = emptyStore();
  teachAll(store, "circle", circle);
  teachAll(store, "square", square);
  teachAll(store, "triangle", triangle);
  teachAll(store, "star", star);

  const check = (fn, name, others) => {
    const rec = recognizeGrid(store, fn({ seed: 500 }), W, H);
    const region = rec.regions.find((r) => r.recognized.includes(name));
    assert.ok(region, `${name} was not recognized`);
    for (const other of others) {
      assert.ok(!region.recognized.includes(other), `${name} was recognized as ${other}`);
    }
  };
  check(circle, "circle", ["square", "triangle", "star"]);
  check(square, "square", ["circle", "triangle", "star"]);
  check(triangle, "triangle", ["circle", "square", "star"]);
  check(star, "star", ["circle", "square", "triangle"]);
});

test("picking shapes from other shapes: a diamond is not a square, and it is novel — high possibility", () => {
  const store = emptyStore();
  teachAll(store, "square", square);
  const rec = recognizeGrid(store, diamond(), W, H);
  const region = rec.regions[0];
  assert.ok(!region.recognized.includes("square"), "a rotated square must not be confidently called a square");
  assert.ok(region.novel, "an unrecognized shape is a NOVEL thing");
  assert.equal(region.novel.possibility, "high");
  assert.match(region.novel.name, /^kind:novel:/);
});

test("falsifiability: a refuted lesson leaves the framework, and the memory admits it was wrong", () => {
  const store = emptyStore();
  teachAll(store, "square", square);
  // a triangle sneaks in as a badly-taught "square" — the child believes it
  const sneaky = teachGrid(store, "square", { grid: triangle({ seed: 999 }), w: W, h: H, source: "mistake.png", sourceBytes: 120000, label: "square" });
  const before = recognizeGrid(store, triangle({ seed: 998 }), W, H);
  assert.ok(before.regions[0].recognized.includes("square"), "the false lesson was believed");
  // the parent re-reads the source and contradicts it: DEF
  const occId = occurrenceKey("square", "mistake.png", sneaky.items[sneaky.items.length - 1].region);
  const res = falsifyOccurrence(store, "square", occId, { by: "cv-parent", reason: "re-read: this region is a triangle, not a square" });
  assert.equal(res.falsified, 1);
  const after = recognizeGrid(store, triangle({ seed: 998 }), W, H);
  assert.ok(!after.regions[0].recognized.includes("square"), "after refutation the triangle is no longer a square");
  const snap = universeSnapshot(store);
  assert.equal(snap.kinds.square.falsified, 1);
  assert.equal(snap.kinds.square.lessons, 7, "the refuted lesson no longer counts as a live lesson");
  // the refuted occurrence stays on file — a revision line, never an edit
  const occ = store.concepts.square.occurrences.find((o) => o.id === occId);
  assert.equal(occ.falsified, true);
  assert.equal(occ.falsifyReason, "re-read: this region is a triangle, not a square");
});

test("splits: a kind whose members stop being mutually reachable proposes sub-kinds", () => {
  const store = emptyStore();
  // one concept taught from WIDE rectangles and TALL rectangles — the two
  // families do not touch at the within-kind distance
  const rect = (h, w, seed) => {
    const g = new Float64Array(W * H).fill(0.22);
    const ox = W / 2 + jitterOf(seed, 4);
    const oy = H / 2 + jitterOf(seed + 1, 4);
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
      if (Math.abs(x - ox) <= w / 2 && Math.abs(y - oy) <= h / 2) g[y * W + x] = 1;
    }
    for (let i = 0; i < g.length; i += 1) g[i] += noise(seed + i);
    return g;
  };
  for (let i = 0; i < 4; i += 1) teachGrid(store, "rect", { grid: rect(16, 60, i * 10 + 1), w: W, h: H, source: `wide-${i}.png`, sourceBytes: 120000 });
  for (let i = 0; i < 4; i += 1) teachGrid(store, "rect", { grid: rect(60, 16, i * 10 + 100), w: W, h: H, source: `tall-${i}.png`, sourceBytes: 120000 });
  const split = splitProposals(store, "rect");
  assert.ok(split.components.length === 2, `expected 2 sub-kind proposals, got ${split.components.length}`);
  assert.ok(split.components.every((c) => c.length === 4));
  assert.ok(split.bound > 0);
});

test("novelty rolls up into a confirmed kind: SIG, then CON — possibility becomes probability", () => {
  const store = emptyStore();
  // noise-free diamonds, so the two sightings are the SAME thing at the
  // child's own resolution (position is normalized away by the tight crop)
  const cleanDiamond = (cx, cy, size) => {
    const g = new Float64Array(W * H).fill(0.22);
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
      if (Math.abs(x - cx) + Math.abs(y - cy) <= size) g[y * W + x] = 1;
    }
    return g;
  };
  // the child has never seen a diamond; the first sighting is HIGH
  // POSSIBILITY — signed as a provisional kind and taught its own lesson
  const first = recognizeGrid(store, cleanDiamond(48, 48, 30), W, H);
  const novel = first.regions[0].novel.name;
  absorbRecognition(store, first, { source: "photo-1.png", grid: cleanDiamond(48, 48, 30), w: W, h: H });
  assert.equal(store.concepts[novel].status, "provisional");
  assert.equal(store.concepts[novel].items.length, 1);
  assert.equal(store.concepts[novel].occurrences.length, 1);
  // a second sighting from a DIFFERENT source: recognized (the child learned
  // its own novelty), and corroboration crosses the floor → CONFIRMED
  const second = recognizeGrid(store, cleanDiamond(40, 60, 30), W, H);
  assert.ok(second.regions[0].recognized.includes(novel), "the child must recognize what it learned from its own novelty");
  absorbRecognition(store, second, { source: "photo-2.png", grid: cleanDiamond(40, 60, 30), w: W, h: H });
  const confirmed = confirmKind(store, novel);
  assert.equal(confirmed.corroboration, CANONICALIZATION_FLOOR);
  assert.equal(store.concepts[novel].status, "confirmed");
  const snap = universeSnapshot(store);
  assert.equal(snap.kinds[novel].status, "confirmed");
  assert.equal(snap.kinds[novel].distinctSources, 2);
});

test("the verdict is bounded geometry, not a score: the margin IS the certainty, the void names what it is NOT", () => {
  const store = emptyStore();
  teachAll(store, "circle", circle);
  teachAll(store, "square", square);
  const rec = recognizeGrid(store, circle({ seed: 500 }), W, H);
  const r = rec.regions[0];
  const c = r.concepts.circle;
  assert.equal(c.verdict, "recognized");
  assert.ok(c.margin > 0, "a circle sits strictly inside the circle bound");
  assert.ok(c.bound > 0, "the bound is the kind's own derived spread");
  assert.equal(c.void.kind, "square", "the reading names its void");
  assert.ok(c.void.distance > c.nearestDistance, "the circle is closer to circle than to its void");
  assert.equal(c.reading, "primary", "against {circle, square}, a circle reads primarily as circle");
});

test("the same bytes read differently against different kind sets: dog/cat vs mammal/plant", () => {
  // the same underlying dog grid — parsed against {dog, cat} it reads as
  // dog; parsed against {mammal, plant} (mammal taught from dog AND cat
  // images, plant from a fern shape) the SAME dog reads as mammal, and dog
  // itself becomes a containment inside mammal, not a primary reading.
  const fern = () => {
    const g = new Float64Array(W * H).fill(0.22);
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        if (Math.abs(x - W / 2) <= 4 && y > H * 0.3) g[y * W + x] = 1;
        const frond = Math.abs(x - W / 2) <= 6 && Math.abs(y - H * 0.55) <= 8 && (x + y) % 7 === 0;
        if (frond) g[y * W + x] = 1;
      }
    }
    return g;
  };

  const narrow = emptyStore();
  teachAll(narrow, "dog", dogLike);
  teachAll(narrow, "cat", catLike);
  const dogBytes = dogLike({ seed: 500 });
  const narrowRec = recognizeGrid(narrow, dogBytes, W, H);
  const narrowDog = narrowRec.regions[0].concepts.dog;
  assert.ok(narrowDog.verdict === "recognized" && narrowDog.reading === "primary", "parsing on {dog, cat}: the dog reads as dog");

  const broad = emptyStore();
  for (let i = 0; i < 7; i += 1) {
    teachGrid(broad, "mammal", { grid: dogLike({ seed: i * 10 + 1 }), w: W, h: H, source: `m-dog-${i}.png`, sourceBytes: 120000 });
  }
  for (let i = 0; i < 7; i += 1) {
    teachGrid(broad, "mammal", { grid: catLike({ seed: i * 10 + 1 }), w: W, h: H, source: `m-cat-${i}.png`, sourceBytes: 120000 });
  }
  teachAll(broad, "plant", fern);
  const broadRec = recognizeGrid(broad, dogBytes, W, H);
  const broadMammal = broadRec.regions[0].concepts.mammal;
  assert.ok(broadMammal.verdict === "recognized", "parsing on {mammal, plant}: the same bytes read as mammal");
  assert.ok(broadRec.regions[0].recognized.includes("mammal"));
  // with dog and cat NOT in the parsing set, the dog's reading is mammal —
  // and its void is now the plant, not the cat
  assert.equal(broadMammal.void.kind, "plant");
  assert.equal(broadMammal.reading, "primary");
});

test("holonic parts: a circle inside a ring-frame is a part of it — what is a whole is a part", () => {
  const store = emptyStore();
  // the WHOLE is taught as a ring-frame — a border whose box can contain a
  // separate figure — WITH interior content in some lessons, because the
  // region's shadow IS everything inside its box: a family that has only
  // seen empty rings would honestly not recognize a ring with a circle in
  // it (measured). The circle family is taught across radii, because a
  // r=7 circle is not a r=24 circle until it has been shown one.
  const ring = ({ seed = 1, side = 56, border = 4, mark = null } = {}) => {
    const g = new Float64Array(W * H).fill(0.22);
    const ox = W / 2 + jitterOf(seed, 4);
    const oy = H / 2 + jitterOf(seed + 1, 4);
    const s = side * (1 + jitterOf(seed + 2, 0.2));
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
      const onBorder = (Math.abs(x - ox) <= s / 2 && Math.abs(y - oy) <= s / 2) &&
        (Math.abs(x - ox) >= s / 2 - border || Math.abs(y - oy) >= s / 2 - border);
      const inMark = mark && (x - mark[0]) ** 2 + (y - mark[1]) ** 2 <= mark[2] ** 2;
      if (onBorder || inMark) g[y * W + x] = 1;
    }
    for (let i = 0; i < g.length; i += 1) g[i] += noise(seed + i);
    return g;
  };
  for (let i = 0; i < 4; i += 1) {
    teachGrid(store, "frame", { grid: ring({ seed: i * 10 + 1, side: 40 + (i % 3) * 8 }), w: W, h: H, source: `frame-${i}.png`, sourceBytes: 120000 });
  }
  for (let i = 0; i < 3; i += 1) {
    teachGrid(store, "frame", { grid: ring({ seed: i * 10 + 40, side: 48 + i * 8, mark: [W / 2 + i * 6, H / 2 - i * 4, 5] }), w: W, h: H, source: `frame-mark-${i}.png`, sourceBytes: 120000 });
  }
  for (let i = 0; i < 7; i += 1) {
    const r = [7, 12, 24][i % 3];
    teachGrid(store, "circle", { grid: circle({ seed: i * 10 + 1, r }), w: W, h: H, source: `circle-${i}-r${r}.png`, sourceBytes: 120000 });
  }
  // a small circle INSIDE a ring's box, same frame — a separate figure
  const frame = new Float64Array(W * H).fill(0.22);
  const rg = ring({ seed: 200, side: 56 });
  const ci = circle({ seed: 201, cx: W / 2, cy: H / 2, r: 7, jitter: 0 });
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    frame[y * W + x] = Math.max(rg[y * W + x], ci[y * W + x]);
  }
  const rec = recognizeGrid(store, frame, W, H);
  const ringRegion = rec.regions.find((r) => r.recognized.includes("frame"));
  assert.ok(ringRegion, "the ring was recognized");
  // the circle inside the ring's box is proposed as a PART of it
  const part = ringRegion.parts?.find((p) => p.recognized.includes("circle"));
  assert.ok(part, "the circle inside the ring must be a part of the frame region");
  // the parts edge appears in the universe lattice
  absorbRecognition(store, rec, { source: "frame.png", grid: frame, w: W, h: H });
  const snap = universeSnapshot(store);
  const edge = snap.parts.find((p) => p.whole === "frame" && p.part === "circle");
  assert.ok(edge, "the lattice must record frame ⊃ circle");
});

// dog-like / cat-like grids (this suite's own minimal animals)
function dogLike({ seed = 1, cx0 = W / 2, s = 1 } = {}) {
  const g = new Float64Array(W * H).fill(0.22);
  const cx = cx0 + jitterOf(seed, 4);
  const cy = H * 0.58;
  const scale = s;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const body = inEllipse(cx, cy, 30 * scale, 13 * scale, x, y);
      const head = inEllipse(cx + 27 * scale, cy - 15 * scale, 9 * scale, 8 * scale, x, y);
      const leg = (x >= cx - 24 * scale && x <= cx - 18 * scale) || (x >= cx + 18 * scale && x <= cx + 24 * scale);
      if (body || head || (leg && y >= cy + 10 * scale && y <= cy + 10 * scale + 15 * scale)) g[y * W + x] = 1;
    }
  }
  for (let i = 0; i < g.length; i += 1) g[i] += noise(seed + i);
  return g;
}

function catLike({ seed = 1, cx0 = W / 2 } = {}) {
  const g = new Float64Array(W * H).fill(0.22);
  const cx = cx0 + jitterOf(seed, 4);
  const cy = H * 0.5;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const body = inEllipse(cx, cy, 12, 24, x, y);
      const head = inEllipse(cx, cy - 26, 9, 8, x, y);
      const ear = (x >= cx - 8 && x <= cx - 2 && y >= cy - 34 && y <= cy - 26 && (y - (cy - 26)) < (x - (cx - 8)) * 0.9) ||
        (x >= cx + 2 && x <= cx + 8 && y >= cy - 34 && y <= cy - 26 && (y - (cy - 26)) < ((cx + 8) - x) * 0.9);
      if (body || head || ear) g[y * W + x] = 1;
    }
  }
  for (let i = 0; i < g.length; i += 1) g[i] += noise(seed + i);
  return g;
}

function inEllipse(cx, cy, rx, ry, x, y) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}