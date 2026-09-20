// mnemonic.test.mjs — the child: shadow/echo memory, DMD frameworks, spatial
// recognition without a CV model, and the omnimodal faces (image, series,
// text). Pure — no ffmpeg, no OpenCV, no vision model: grids and series are
// synthesized here, and the recognition core (recognizeGrid / recognizeSeries
// / recognizeText) is exactly what the organ runs after decoding real bytes.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  descriptorOf,
  descriptorFromSeries,
  figureRegions,
  figureSegments,
  fftMagnitude,
  resample,
  quantizeDescriptor,
  dequantizeDescriptor,
  encodeDescriptor,
  decodeDescriptor,
  DESCRIPTOR_LEN,
  DESCRIPTOR_BYTES,
  SERIES_LEN,
} from "../kernel/shadow-echo.js";
import {
  emptyStore,
  teachGrid,
  teachSeries,
  teachText,
  recognizeGrid,
  recognizeSeries,
  recognizeText,
  childSpace,
  saveStore,
  loadStore,
  TEXT_SHAPE,
} from "./mnemonic.js";

const W = 96;
const H = 96;

const { createSeededRng } = await import("../kernel/rng.js");
const noise = (seed) => (createSeededRng(seed)() - 0.5) * 2 * 0.02;

// ── synthetic shapes: a dog is a wide body + head + legs; a cat is a tall
//    body + head + pointed ears. Jitter moves/reshapes the taught kind;
//    scale is taught ACROSS its range (measured: the tight-bbox crop makes
//    scale invariance approximate — a 40% scale change costs ~0.1 in
//    descriptor distance, 4× the jitter cost — so the child must see the
//    kind at the scales it will be asked about, the way it must see poses).
const inEllipse = (cx, cy, rx, ry, x, y) => {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
};

const SCALES = [0.6, 0.8, 1.0, 1.2];
const teachDogs = (store, nPerScale = 2) => {
  let i = 0;
  for (const s of SCALES) {
    for (let k = 0; k < nPerScale; k += 1) {
      i += 1;
      teachGrid(store, "dog", { grid: dogGrid({ jitter: 0.5, seed: i, s }), w: W, h: H, source: `dog-${i}.png`, sourceBytes: 120000, label: "dog" });
    }
  }
};

const dogGrid = ({ jitter = 0, seed = 1, cx0 = W / 2, s = 1 } = {}) => {
  const rnd = (a, b) => a + (createSeededRng(seed)() - 0.5) * jitter * (b - a);
  const g = new Float64Array(W * H).fill(0.22);
  const cx = cx0 + (rnd(0, 1) - 0.5) * 10;
  const cy = H * 0.58 + (rnd(0, 1) - 0.5) * 8;
  const scale = s * (1 + (rnd(0, 1) - 0.5) * jitter * 0.18);
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

const catGrid = ({ jitter = 0, cx0 = W / 2, seed = 1, s = 1 } = {}) => {
  const g = new Float64Array(W * H).fill(0.22);
  const cx = cx0 + (jitter ? (createSeededRng(seed)() - 0.5) * 10 : 0);
  const cy = H * 0.5;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const body = inEllipse(cx, cy, 12 * s, 24 * s, x, y);
      const head = inEllipse(cx, cy - 26 * s, 9 * s, 8 * s, x, y);
      const earL = x >= cx - 8 * s && x <= cx - 2 * s && y >= cy - 34 * s && y <= cy - 26 * s && (y - (cy - 26 * s)) < (x - (cx - 8 * s)) * 0.9;
      const earR = x >= cx + 2 * s && x <= cx + 8 * s && y >= cy - 34 * s && y <= cy - 26 * s && (y - (cy - 26 * s)) < ((cx + 8 * s) - x) * 0.9;
      if (body || head || earL || earR) g[y * W + x] = 1;
    }
  }
  for (let i = 0; i < g.length; i += 1) g[i] += noise(seed + i);
  return g;
};

const teachCats = (store) => {
  let i = 0;
  for (const s of [0.8, 1.0, 1.2]) {
    for (let k = 0; k < 3; k += 1) {
      i += 1;
      teachGrid(store, "cat", { grid: catGrid({ jitter: 0.4, seed: i, s }), w: W, h: H, source: `cat-${i}.png`, sourceBytes: 120000 });
    }
  }
};

// ── the size rule: a memory larger than its source is not a memory ────────
test("the descriptor is a compression, not a copy: 144 bytes for any image", () => {
  assert.equal(DESCRIPTOR_LEN, 144);
  assert.equal(DESCRIPTOR_BYTES, 144);
  assert.equal(SERIES_LEN, 28);
  assert.equal(TEXT_SHAPE, 48);
});

test("teachGrid refuses a lesson whose source is smaller than the memory of it", () => {
  const store = emptyStore();
  const g = new Float64Array(W * H).fill(0.5);
  assert.throws(() => teachGrid(store, "dog", { grid: g, w: W, h: H, sourceBytes: 100 }), /larger than its source/);
});

test("teachSeries refuses the same way", () => {
  const store = emptyStore();
  assert.throws(() => teachSeries(store, "tone", [1, 2, 3], { sourceBytes: 60 }), /larger than its source/);
});

// ── the numeric machinery: FFT, quantization, child space ────────────────
test("fftMagnitude: an impulse is flat across all bins; a sine spikes at its own bin", () => {
  const n = 64;
  const impulse = new Float64Array(n);
  impulse[5] = 1;
  const flat = fftMagnitude(impulse);
  for (let i = 1; i < n; i += 1) assert.ok(Math.abs(flat[i] - flat[0]) < 1e-9, `bin ${i} not flat`);
  const sine = Float64Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * 4 * i) / n));
  const mag = fftMagnitude(sine);
  let best = 0;
  for (let i = 1; i < n; i += 1) if (mag[i] > mag[best]) best = i;
  assert.equal(best, 4);
});

test("quantization is one byte per bin and round-trips into the child's own world", () => {
  const g = dogGrid();
  const d = descriptorOf(g, W, H);
  const q = quantizeDescriptor(d);
  assert.equal(q.length, DESCRIPTOR_BYTES);
  assert.ok(q.every((b) => b >= 0 && b <= 255));
  const back = dequantizeDescriptor(q);
  let maxErr = 0;
  for (let i = 0; i < d.length; i += 1) maxErr = Math.max(maxErr, Math.abs(d[i] - back[i]));
  assert.ok(maxErr <= 1 / 255, `max quantization error ${maxErr}`);
  const encoded = encodeDescriptor(d);
  const decoded = decodeDescriptor(encoded);
  assert.deepEqual(Array.from(decoded), Array.from(childSpace(d)));
});

test("resample is a box average and preserves length targets", () => {
  const series = Float64Array.from({ length: 96 }, (_, i) => i);
  const r = resample(series, 8);
  assert.equal(r.length, 8);
  assert.ok(Math.abs(r[0] - 5.5) < 1e-9); // 0..11 averaged
});

// ── spatial proposal: WHERE things are, without a CV model ────────────────
test("figureRegions finds each figure where it is, and a flat grid has none", () => {
  const g = new Float64Array(W * H).fill(0.25);
  for (let y = 20; y < 40; y += 1) for (let x = 10; x < 30; x += 1) g[y * W + x] = 1;
  for (let y = 60; y < 80; y += 1) for (let x = 60; x < 80; x += 1) g[y * W + x] = 1;
  const { regions, mask } = figureRegions(g, W, H);
  assert.equal(mask, "figure");
  assert.equal(regions.length, 2);
  const xs = regions.map((r) => r.region[0]).sort((a, b) => a - b);
  assert.equal(xs[0], 10);
  assert.equal(xs[1], 60);
  const flat = figureRegions(new Float64Array(W * H).fill(0.5), W, H);
  assert.equal(flat.mask, "flat");
  assert.equal(flat.regions.length, 0);
});

test("figureSegments finds where in TIME energy happens; a constant tone has none", () => {
  const s = new Float64Array(200).fill(0.2);
  for (let i = 30; i < 60; i += 1) s[i] = 1;
  for (let i = 120; i < 150; i += 1) s[i] = 1;
  const { segments } = figureSegments(s);
  assert.equal(segments.length, 2);
  // the two energy runs, largest first, mapped back to sample coordinates
  assert.deepEqual(segments[0].segment, [120, 32]);
  assert.deepEqual(segments[1].segment, [32, 24]);
  const flat = figureSegments(new Float64Array(200).fill(0.5));
  assert.equal(flat.mask, "flat");
  assert.equal(flat.segments.length, 0);
});

// ── the parent teaches, the child recognizes — with spatial coordinates ───
test("a dog is learned from dogs and recognized where it is, not everywhere", () => {
  const store = emptyStore();
  teachDogs(store);
  // a NEW dog (never taught) is recognized, and the memory names where the
  // lesson came from (the de-lossy handle).
  const rec = recognizeGrid(store, dogGrid({ jitter: 0.5, seed: 99 }), W, H);
  assert.ok(rec.regions.length >= 1);
  const regionMatch = rec.regions.find((r) => r.recognized.includes("dog"));
  assert.ok(regionMatch, "no region recognized as dog");
  const m = regionMatch.concepts.dog;
  assert.equal(m.verdict, "recognized");
  assert.ok(m.margin >= 0);
  assert.ok(m.verifyAt.source.startsWith("dog-"));
  // the memory is a compression: every taught item stores 144 bytes + a
  // declared ratio against its source.
  for (const item of store.concepts.dog.items) {
    assert.equal(item.d.length, 192); // base64 of 144 bytes
    assert.equal(item.ratio, 144 / 120000);
    assert.equal(item.sourceHash, null);
  }
});

test("a cat is not a dog — the framework is of dogness, not of everything", () => {
  const store = emptyStore();
  teachDogs(store);
  const rec = recognizeGrid(store, catGrid(), W, H);
  const asDog = rec.regions.every((r) => !r.recognized.includes("dog"));
  assert.ok(asDog, "the cat region must not be recognized as a dog");
});

test("a photograph with a dog AND a cat is two regions, each named where it is", () => {
  const store = emptyStore();
  teachDogs(store);
  teachCats(store);
  // a dog on the LEFT, a cat on the RIGHT, in one frame — the dog is drawn
  // scaled into the left half (its body would overflow the midline), the cat
  // into the right; scale and position are normalized away by the crop.
  const both = new Float64Array(W * H).fill(0.22);
  const dog = dogGrid({ jitter: 0.2, seed: 7, cx0: 26, s: 0.6 });
  const cat = catGrid({ cx0: 70, jitter: 0.2, seed: 50 });
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (x < W / 2) both[y * W + x] = dog[y * W + x];
      else both[y * W + x] = cat[y * W + x];
    }
  }
  const rec = recognizeGrid(store, both, W, H);
  const dogRegion = rec.regions.find((r) => r.recognized.includes("dog"));
  const catRegion = rec.regions.find((r) => r.recognized.includes("cat"));
  assert.ok(dogRegion, "no region recognized as dog");
  assert.ok(catRegion, "no region recognized as cat");
  assert.ok(dogRegion.region[0] + dogRegion.region[2] / 2 < W / 2, "the dog was named on the LEFT");
  assert.ok(catRegion.region[0] + catRegion.region[2] / 2 > W / 2, "the cat was named on the RIGHT");
  assert.ok(!dogRegion.recognized.includes("cat"), "the dog region is not a cat");
  assert.ok(!catRegion.recognized.includes("dog"), "the cat region is not a dog");
});

// ── the series face (audio): the same framework, the same WHERE ───────────
const sawtooth = (freq, n = 2048, sr = 8000) =>
  Float64Array.from({ length: n }, (_, i) => 2 * (((i * freq) / sr) % 1) - 1);

const sine = (freq, n = 2048, sr = 8000) =>
  Float64Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * freq * i) / sr));

test("the audio face learns a timbre and hears it at ANY pitch — pitch-invariant echo statistics", () => {
  const store = emptyStore();
  // the echo is built from pitch-INVARIANT spectral statistics (support,
  // flatness, rolloff, crest — measured: a 2× pitch range costs ~0.08 in
  // family spread while a different timbre at the same pitch costs ~0.75),
  // so the child hears a saw across octaves the way it sees a dog across
  // poses it was shown.
  for (const f of [220, 330, 440]) {
    teachSeries(store, "saw", sawtooth(f), { source: `saw-${f}.wav`, sourceBytes: 4096, label: "sawtooth" });
  }
  // a saw at an UNTAUGHT pitch between the taught ones is recognized — the
  // timbre is heard, not the pitch
  const rec = recognizeSeries(store, sawtooth(275), { modality: "audio" });
  assert.ok(rec.whole.recognized.includes("saw"), "the saw must be heard as a saw");
  const m = rec.whole.concepts.saw;
  assert.ok(m.margin >= 0, "a saw of the family sits inside the bound");
  assert.ok(m.verifyAt.source.startsWith("saw-"));
  // a sine at the SAME pitch is not the same timbre
  const sineRec = recognizeSeries(store, sine(330), { modality: "audio" });
  assert.ok(!sineRec.whole.recognized.includes("saw"), "a sine must not be heard as a saw");
});

// ── the text face: motifs shadow, modes echo, passages are the WHERE ──────
const motifWindows = (pattern) => {
  // 10 windows of motif-count Maps; `pattern` marks windows carrying the
  // motif signature
  const out = [];
  for (let w = 0; w < 10; w += 1) {
    const counts = new Map();
    if (pattern.includes(w)) {
      counts.set("the", 6); counts.set("and", 4); counts.set("of", 5); counts.set("to", 3);
    } else {
      counts.set("but", 1); counts.set("or", 1); counts.set("if", 1);
    }
    out.push(counts);
  }
  return out;
};

test("the text face learns a motif signature and finds the passages that carry it", () => {
  const store = emptyStore();
  for (const pattern of [[2, 3, 4], [4, 5, 6], [1, 2, 3]]) {
    teachText(store, "register", motifWindows(pattern), { source: "text-1.md", sourceBytes: 8000 });
  }
  const rec = recognizeText(store, motifWindows([4, 5, 6]));
  const passage = rec.passages.find((p) => p.recognized.includes("register"));
  assert.ok(passage, "no passage recognized as register");
  assert.ok(passage.segment[1] >= 3, "the passage is at least three windows");
});

// ── the store survives a round-trip; the memory is earned, not received ───
test("the store saves and loads, and recognition survives the round-trip", () => {
  const store = emptyStore();
  teachDogs(store);
  const tmp = path.join(os.tmpdir(), `mnemonic-test-${process.pid}.json`);
  saveStore(store, tmp);
  const loaded = loadStore(tmp);
  fs.unlinkSync(tmp);
  assert.equal(loaded.schema, "MnemonicStore@1");
  assert.equal(loaded.concepts.dog.items.length, 8);
  const rec = recognizeGrid(loaded, dogGrid({ jitter: 0.5, seed: 3 }), W, H);
  assert.ok(rec.regions.some((r) => r.recognized.includes("dog")), "recognition must survive the store round-trip");
});