// The audio, image and video perceivers cross from the frozen provider to
// native under parity (the ratchet, morphology-parity.test.mjs's own shape):
// both run over the SAME decoded material and must agree byte for byte.
//
// This is the first step the-fold/EOT-BEYOND-TEXT.md names ("give the audio
// perceiver a seat … the parity gate is the same gate"). The audio field
// perceiver (reading.js: chroma + timbre + moments per frame) and the audio
// material reduce (rms / flux per frame, with locate) are compared against
// the frozen 6.1 provider; the image (scanline luminance) and video (motion
// energy per transition) reduces likewise. Decoding for the image and video
// arms uses the frozen provider's own ffmpeg `load`, so those two arms skip
// typed where ffmpeg is absent — a skip is a typed gap, never a pass.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { buildAudioReading, extractFrameFields } from "../adapters/audio/reading.js";
import { reduce as audioReduce, locate } from "../adapters/audio/reduce.js";
import { reduce as viaMaterial } from "../adapters/audio/material.js";
import { decodeWav } from "../adapters/audio/wav.js";
import * as imageNative from "../adapters/image/material.js";
import * as videoNative from "../adapters/video/material.js";

const LEGACY = new URL("../../legacy-eoreader6.1/packages/engine/perceiver/", import.meta.url);
const FIX = new URL("../eval/the-fold/fixtures/media/", import.meta.url);
const legacyPresent = existsSync(new URL("audio/reading.js", LEGACY));
const hasFfmpeg = (() => { try { execSync("ffmpeg -version", { stdio: "ignore" }); return true; } catch { return false; } })();

test("audio field perceiver: native buildAudioReading agrees with the frozen provider on every unit of the tone fixture", async (t) => {
  if (!legacyPresent) return t.skip("frozen provider absent on this checkout (submodule)");
  const legacy = await import(new URL("audio/reading.js", LEGACY));
  const bytes = readFileSync(new URL("tone.wav", FIX));
  const w = decodeWav(new Uint8Array(bytes));
  const a = await buildAudioReading({ channelData: w.channelData, sampleRate: w.sampleRate, sourceBytes: bytes });
  const b = await legacy.buildAudioReading({ channelData: w.channelData, sampleRate: w.sampleRate, sourceBytes: bytes });
  assert.equal(a.units.length, b.units.length);
  assert.ok(a.units.length > 50, "the 5 s fixture yields frames");
  assert.deepEqual(a.units, b.units);
  assert.deepEqual(a.axis, b.axis);
  assert.deepEqual(a.field_spec, b.field_spec);
  // the structure the fixture was built with reads back: A (chroma 9) then C (chroma 0)
  const argmax = (v) => v.indexOf(Math.max(...v));
  assert.equal(argmax(a.units[10].field.slice(0, 12)), 9);
  assert.equal(argmax(a.units[80].field.slice(0, 12)), 0);
});

test("audio material reduce: rms and flux per frame agree with the frozen provider's inline reduce; locate addresses a frame back into seconds", async (t) => {
  if (!legacyPresent) return t.skip("frozen provider absent on this checkout (submodule)");
  const legacy = await import(new URL("audio/material.js", LEGACY));
  const bytes = readFileSync(new URL("tone.wav", FIX));
  const w = decodeWav(new Uint8Array(bytes));
  // the frozen reduce reads Int16 PCM; scale the decoded floats the same way
  const pcm = Int16Array.from(w.channelData[0], (v) => Math.max(-32768, Math.min(32767, Math.round(v * 32767))));
  for (const channel of ["rms", "flux"]) {
    const a = audioReduce(pcm, { frameSamples: 400, channel });
    const b = legacy.reduce(pcm, { frameSamples: 400, channel });
    assert.deepEqual(a, b, channel);
    assert.equal(a.length, 100);
  }
  assert.equal(audioReduce, viaMaterial, "material.js re-exports the pure reduce, the eoreader6 split");
  assert.deepEqual(locate(40, { frameSamples: 400, sampleRate: 8000 }), { sampleStart: 16000, sampleEnd: 16400, timeStart: 2, timeEnd: 2.05 });
  // the silent second of the fixture is exactly zero under rms
  const rms = audioReduce(pcm, { frameSamples: 400, channel: "rms" });
  assert.ok(rms.slice(41, 59).every((v) => v === 0), "frames 41–59 (2.05–2.95 s) are digital silence");
  assert.ok(rms[10] > 0 && rms[80] > 0);
});

test("image perceiver: native scanline luminance agrees with the frozen provider over the gradient fixture", async (t) => {
  if (!legacyPresent) return t.skip("frozen provider absent on this checkout (submodule)");
  if (!hasFfmpeg) return t.skip("ffmpeg absent — the image decode is the provider's own ffmpeg");
  const legacy = await import(new URL("image/material.js", LEGACY));
  const path = new URL("gradient.png", FIX).pathname;
  const decoded = await imageNative.load(path, { w: 64, h: 64 });
  const a = imageNative.reduce(decoded);
  const b = legacy.reduce(await legacy.load(path, { w: 64, h: 64 }));
  assert.deepEqual(a, b);
  assert.equal(a.length, 64);
  // the fixture's white square sits at rows 48–79 of 256 → rows 12–19 of 64: those scanlines are brighter than their neighbours
  const mean = (xs) => xs.reduce((s, v) => s + v, 0) / xs.length;
  assert.ok(mean(a.slice(12, 20)) > mean(a.slice(0, 12)) && mean(a.slice(12, 20)) > mean(a.slice(20, 64)));
});

test("video perceiver: native motion energy per transition agrees with the frozen provider, and the fixture's one cut is its one non-zero transition", async (t) => {
  if (!legacyPresent) return t.skip("frozen provider absent on this checkout (submodule)");
  if (!hasFfmpeg) return t.skip("ffmpeg absent — the video decode is the provider's own ffmpeg");
  const legacy = await import(new URL("video/material.js", LEGACY));
  const path = new URL("cut.mp4", FIX).pathname;
  const frames = await videoNative.load(path, { fps: 10, w: 32, h: 18 });
  const a = videoNative.reduce(frames);
  const b = legacy.reduce(await legacy.load(path, { fps: 10, w: 32, h: 18 }));
  assert.deepEqual(a, b);
  assert.equal(frames.length, 40);
  const nonZero = a.map((v, i) => [v, i]).filter(([v]) => v > 0);
  assert.equal(nonZero.length, 1);
  assert.equal(nonZero[0][1], 19, "the cut is between frames 19 and 20 (2.0 s)");
});
