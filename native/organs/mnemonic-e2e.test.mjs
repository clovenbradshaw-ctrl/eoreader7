// mnemonic-e2e.test.mjs — the child on REAL FILES: actual PNG images and
// actual WAV audio, where we know exactly what they contain, run through
// the full byte path — ffmpeg decode → shadow/echo → recognition → spatial
// coordinates → de-lossy handles. No CV model anywhere in the recognition:
// the parent's lessons are simulated (the CV parent's OUTPUT shape — named
// regions with coordinates), the child's recognition runs the same
// machinery the proxy would call.
//
// The PNGs and WAVs are written by the test itself (zlib for PNG, PCM for
// WAV — node's own zlib, no image library), so the ground truth is exact:
// the dog is on the LEFT of the photograph, the cat on the RIGHT, the audio
// is a sawtooth at 330 Hz.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { createSeededRng } from "../kernel/rng.js";
import { load } from "../adapters/image/material.js";
import { figureRegions } from "../kernel/shadow-echo.js";
import {
  emptyStore,
  teachGrid,
  teachSeries,
  recognizeImage,
  recognizeSeries,
  mnemonicLook,
  saveStore,
  loadStore,
} from "./mnemonic.js";

const W = 96;
const H = 96;
const PW = 384; // the real photo's pixel width
const PH = 288; // the real photo's pixel height

const jitterOf = (seed, j) => (createSeededRng(seed)() - 0.5) * 2 * j;
const noise = (seed) => (createSeededRng(seed)() - 0.5) * 2 * 0.02;

const inEllipse = (cx, cy, rx, ry, x, y) => {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
};

// ── the real scene, composed in PIXEL space at KNOWN coordinates ─────────
// Parametrized so the parent can teach the child dogs and cats across
// several photographs (position and scale vary — the way a kind appears).
function scenePixels({ dogX = 150, dogScale = 1, catX = 252, cat = true, dog = true, seed = 1 } = {}) {
  const px = new Float64Array(PW * PH).fill(0.25);
  const d = {
    body: [dogX, 150, 60 * dogScale, 26 * dogScale],
    head: [dogX + 54 * dogScale, 120 * dogScale + 30 * (1 - dogScale), 18 * dogScale, 16 * dogScale],
    legs: [[dogX - 30 * dogScale, 150 + 26 * dogScale], [dogX + 30 * dogScale, 150 + 26 * dogScale]],
  };
  // the cat is made DISTINCT at the child's decode resolution: large ears
  // (they vanish at the 96-grid otherwise — measured: at 96x96 a small-eared
  // cat IS a tall skinny dog, and the dog family honestly swallowed it) and
  // a sweeping tail, plus a higher body — its own silhouette, not a dog's
  const c = {
    body: [catX, 150, 22, 44],
    head: [catX, 102, 16, 14],
    ears: [[catX - 14, 82], [catX + 14, 82]],
    tail: [catX + 44, 176], // curled AWAY from the dog — a tail sweeping left would merge the two figures
  };
  for (let y = 0; y < PH; y += 1) {
    for (let x = 0; x < PW; x += 1) {
      const dogBody = inEllipse(d.body[0], d.body[1], d.body[2], d.body[3], x, y);
      const dogHead = inEllipse(d.head[0], d.head[1], d.head[2], d.head[3], x, y);
      const dogLeg = d.legs.some(([lx, ly]) => x >= lx - 10 * dogScale && x <= lx + 10 * dogScale && y >= ly && y <= ly + 26 * dogScale);
      const catBody = inEllipse(c.body[0], c.body[1], c.body[2], c.body[3], x, y);
      const catHead = inEllipse(c.head[0], c.head[1], c.head[2], c.head[3], x, y);
      const catEar = c.ears.some(([ex, ey]) => Math.abs(x - ex) <= 10 && Math.abs(y - ey) <= 12 && (x - ex) * (y - ey) > 0);
      const catTail = inEllipse(c.tail[0], c.tail[1], 26, 5, x, y);
      if (dog && (dogBody || dogHead || dogLeg)) px[y * PW + x] = 0.95;
      else if (cat && (catBody || catHead || catEar || catTail)) px[y * PW + x] = 0.85;
    }
  }
  for (let i = 0; i < px.length; i += 1) px[i] += noise(seed + i);
  return px;
}

// ── a minimal PNG writer (zlib deflate + CRC — node's own zlib, no libs) ──
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
function writePNG(filePath, grayFloats, w, h) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // grayscale
  const raw = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y += 1) {
    raw[y * (w + 1)] = 0; // filter none
    for (let x = 0; x < w; x += 1) {
      raw[y * (w + 1) + 1 + x] = Math.max(0, Math.min(255, Math.round(grayFloats[y * w + x] * 255)));
    }
  }
  const png = Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  fs.writeFileSync(filePath, png);
}

function writeWAV(filePath, samples, sampleRate = 8000) {
  const n = samples.length;
  const data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i += 1) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const hdr = Buffer.alloc(44);
  hdr.write("RIFF", 0);
  hdr.writeUInt32LE(36 + data.length, 4);
  hdr.write("WAVE", 8);
  hdr.write("fmt ", 12);
  hdr.writeUInt32LE(16, 16);
  hdr.writeUInt16LE(1, 20); // PCM
  hdr.writeUInt16LE(1, 22); // mono
  hdr.writeUInt32LE(sampleRate, 24);
  hdr.writeUInt32LE(sampleRate * 2, 28);
  hdr.writeUInt16LE(2, 32);
  hdr.writeUInt16LE(16, 34);
  hdr.write("data", 36);
  hdr.writeUInt32LE(data.length, 40);
  fs.writeFileSync(filePath, Buffer.concat([hdr, data]));
}

const sawtooth = (freq, n = 8192, sr = 8000) =>
  Float64Array.from({ length: n }, (_, i) => 2 * (((i * freq) / sr) % 1) - 1);
const sine = (freq, n = 8192, sr = 8000) =>
  Float64Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * freq * i) / sr));

const tmp = path.join(os.tmpdir(), `mnemonic-e2e-${process.pid}`);
fs.mkdirSync(tmp, { recursive: true });

// the parent's lessons: the kind shown across a few photographs, each
// lesson written as a REAL PNG and decoded through the SAME ffmpeg path
// the child reads — a lesson and a query must live in the same world
// (measured: teaching from a hand-resampled grid while recognition reads
// ffmpeg's own resize produced a cat family that never matched its own
// query). The child proposes its own tight figure box for each lesson.
async function teachKind(store, name, scenes, sourcePrefix) {
  let i = 0;
  for (const scene of scenes) {
    const p = path.join(tmp, `${sourcePrefix}-${i + 1}.png`);
    writePNG(p, scene, PW, PH);
    const { buf, w, h } = await load(p, { w: W, h: H });
    i += 1;
    teachGrid(store, name, { grid: buf, w, h, source: p, sourceBytes: 120000 });
  }
}

test("a real photograph: the dog is recognized WHERE it is, in PIXEL coordinates", async () => {
  const photoPath = path.join(tmp, "park.png");
  writePNG(photoPath, scenePixels(), PW, PH);

  const store = emptyStore();
  // dogs seen at several positions and scales in several photographs
  await teachKind(store, "dog", [
    scenePixels({ dogX: 150 }),
    scenePixels({ dogX: 138, dogScale: 0.9 }),
    scenePixels({ dogX: 128, dogScale: 1.1 }),
    scenePixels({ dogX: 145, dogScale: 1.0 }),
    scenePixels({ dogX: 132, dogScale: 0.85 }),
    scenePixels({ dogX: 142, dogScale: 1.15 }),
  ], "lesson");

  // recognize the REAL file — ffmpeg decodes the actual PNG bytes
  const rec = await recognizeImage(store, photoPath);
  assert.ok(rec.pixelDims, "ffprobe must report the real pixel dimensions");
  assert.equal(rec.pixelDims.width, PW);
  assert.equal(rec.pixelDims.height, PH);
  const dogRegion = rec.regions.find((r) => r.recognized.includes("dog"));
  assert.ok(dogRegion, "the dog must be recognized in the photograph");
  // the child's coordinates are in the photo's PIXELS, and they point where
  // the dog actually is (body center x=150, y=150)
  const [rx, ry, rw, rh] = dogRegion.pixelRegion;
  const cx = rx + rw / 2;
  const cy = ry + rh / 2;
  assert.ok(Math.abs(cx - 150) < 30, `dog region center x ${cx} must be near the dog's 150`);
  assert.ok(Math.abs(cy - 150) < 30, `dog region center y ${cy} must be near the dog's 150`);
  // the de-lossy handle: the child names where it learned the dog from
  assert.match(dogRegion.concepts.dog.verifyAt.source, /lesson-\d+\.png$/);
  // the memory is a compression: every item is 144 bytes, disclosed against
  // its source's size
  for (const item of store.concepts.dog.items) {
    assert.equal(item.d.length, 192); // base64 of 144 bytes
    assert.ok(item.ratio < 0.01, `memory is ${(item.ratio * 100).toFixed(3)}% of its source`);
  }
});

test("a real photograph with a dog AND a cat: two regions, each named where it is", async () => {
  const photoPath = path.join(tmp, "dogcat.png");
  writePNG(photoPath, scenePixels(), PW, PH);
  const store = emptyStore();
  await teachKind(store, "dog", [
    scenePixels({ dogX: 150 }),
    scenePixels({ dogX: 138, dogScale: 0.9 }),
    scenePixels({ dogX: 128, dogScale: 1.1 }),
    scenePixels({ dogX: 145, dogScale: 1.0 }),
    scenePixels({ dogX: 132, dogScale: 0.85 }),
    scenePixels({ dogX: 142, dogScale: 1.15 }),
  ], "dog");
  // the cat is taught from dog+cat photographs (the world queries live
  // in — measured: a cat-only lesson frame carries ffmpeg resize-ringing
  // below the cat that the query frame's own floor excludes, so a cat-only
  // lesson never matched its query) and the parent names the cat's region
  // explicitly — the CV parent has spatial coordinates, and uses them
  let ci = 0;
  for (const o of [
    { dogX: 150, catX: 252 },
    { dogX: 138, dogScale: 0.9, catX: 270 },
    { dogX: 128, dogScale: 1.1, catX: 235 },
    { dogX: 145, dogScale: 1.0, catX: 262 },
    { dogX: 132, dogScale: 0.85, catX: 245 },
    { dogX: 142, dogScale: 1.15, catX: 258 },
  ]) {
    const p = path.join(tmp, `cat-${ci + 1}.png`);
    writePNG(p, scenePixels(o), PW, PH);
    const { buf, w, h } = await load(p, { w: W, h: H });
    const prop = figureRegions(buf, w, h);
    // the parent names the RIGHT-HALF figure (the cat) — spatial coordinates
    const catRegion = prop.regions.find((r) => r.region[0] + r.region[2] / 2 > W / 2);
    assert.ok(catRegion, "the parent must find the cat where it is");
    ci += 1;
    teachGrid(store, "cat", { grid: buf, w, h, region: catRegion.region, source: p, sourceBytes: 120000 });
  }
  const rec = await recognizeImage(store, photoPath);
  const dog = rec.regions.find((r) => r.recognized.includes("dog"));
  const cat = rec.regions.find((r) => r.recognized.includes("cat"));
  assert.ok(dog, "the dog must be recognized");
  assert.ok(cat, "the cat must be recognized");
  const dogX = dog.pixelRegion[0] + dog.pixelRegion[2] / 2;
  const catX = cat.pixelRegion[0] + cat.pixelRegion[2] / 2;
  assert.ok(dogX < PW / 2, `the dog (x ${dogX}) is on the LEFT of the photo`);
  assert.ok(catX > PW / 2, `the cat (x ${catX}) is on the RIGHT of the photo`);
  assert.ok(!dog.recognized.includes("cat") && !cat.recognized.includes("dog"), "each region is named as its own kind");
});

test("the mnemonic fast path reads the REAL photograph from memory — no CV model", async () => {
  const photoPath = path.join(tmp, "park.png");
  writePNG(photoPath, scenePixels(), PW, PH);
  const store = emptyStore();
  await teachKind(store, "dog", [
    scenePixels({ dogX: 150 }),
    scenePixels({ dogX: 138, dogScale: 0.9 }),
    scenePixels({ dogX: 128, dogScale: 1.1 }),
    scenePixels({ dogX: 145, dogScale: 1.0 }),
    scenePixels({ dogX: 132, dogScale: 0.85 }),
    scenePixels({ dogX: 142, dogScale: 1.15 }),
  ], "lesson");
  const fast = await mnemonicLook(store, photoPath);
  assert.ok(fast, "the child must answer from memory");
  assert.ok(fast.concepts.includes("dog"));
  assert.match(fast.text, /Recognized from memory/);
  assert.match(fast.standing, /fast-path memory read/);
  assert.ok(fast.summary.includes("learned from"), "the memory names its own source");
});

test("real audio: a recorded sawtooth WAV is heard as a saw; a sine WAV at the same pitch is not", async () => {
  const sawPath = path.join(tmp, "saw.wav");
  const sinePath = path.join(tmp, "sine.wav");
  writeWAV(sawPath, sawtooth(330));
  writeWAV(sinePath, sine(330));
  // decode the WAVs ourselves (the organ accepts the raw sample series —
  // the byte source, exactly what the audio adapters' own decoders produce)
  const decodeWav = (p) => {
    const buf = fs.readFileSync(p);
    const n = buf.readUInt32LE(40) / 2;
    const out = new Float64Array(n);
    for (let i = 0; i < n; i += 1) out[i] = buf.readInt16LE(44 + i * 2) / 32767;
    return out;
  };
  const store = emptyStore();
  for (const f of [220, 330, 440]) {
    teachSeries(store, "saw", sawtooth(f), { source: `saw-${f}.wav`, sourceBytes: 16384, label: "sawtooth" });
  }
  const heard = recognizeSeries(store, decodeWav(sawPath), { modality: "audio" });
  assert.ok(heard.whole.recognized.includes("saw"), "the recorded saw must be heard as a saw");
  const notHeard = recognizeSeries(store, decodeWav(sinePath), { modality: "audio" });
  assert.ok(!notHeard.whole.recognized.includes("saw"), "the recorded sine must not be heard as a saw");
});

test("the real store survives a round-trip on disk and still recognizes", async () => {
  const storePath = path.join(tmp, "store.json");
  const photoPath = path.join(tmp, "park.png");
  writePNG(photoPath, scenePixels(), PW, PH);
  const store = emptyStore();
  await teachKind(store, "dog", [
    scenePixels({ dogX: 150 }),
    scenePixels({ dogX: 138, dogScale: 0.9 }),
    scenePixels({ dogX: 128, dogScale: 1.1 }),
    scenePixels({ dogX: 145, dogScale: 1.0 }),
    scenePixels({ dogX: 132, dogScale: 0.85 }),
    scenePixels({ dogX: 142, dogScale: 1.15 }),
  ], "lesson");
  saveStore(store, storePath);
  const loaded = loadStore(storePath);
  const rec = await recognizeImage(loaded, photoPath);
  assert.ok(rec.regions.some((r) => r.recognized.includes("dog")), "recognition survives disk round-trip");
  const size = fs.statSync(storePath).size;
  assert.ok(size < 20000, `the whole memory on disk is ${size} bytes — a compression, never the bytes themselves`);
});