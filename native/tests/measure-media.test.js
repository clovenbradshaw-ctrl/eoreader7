// measure-media.test.js — the measuring door over DECODED media (2026-09-05).
//
// The door (organs/measure.js) already placed a wav's rms/flux series
// against a Born-constructed null and framed every other container as
// bytes. This pins the extension: a caller that decoded the container with
// the perceivers' own loaders (adapters/{audio,image,video}/material.js —
// the frozen 6.1 perceivers crossed under parity) hands the decoded
// material in, and the series is that perceiver's own reduce — scanline
// luminance, motion energy per transition, rms/flux over decoded PCM. The
// probe teaches each medium's one channel; a wrong channel is a typed
// refusal; a pairing whose null collapses says so as a fact about the
// pairing, never about the material.
//
// Decoding is ffmpeg (the perceivers' own); the decode arms skip typed
// where it is absent. Zero model calls.
import test from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import * as nul from "../../nul/index.js";
import { parseMeasure, runMeasurement, phrase, DECODABLE, seriesFromMedia } from "../organs/measure.js";
import * as img from "../adapters/image/material.js";
import * as vid from "../adapters/video/material.js";
import * as aud from "../adapters/audio/material.js";

const FIX = new URL("../eval/the-fold/fixtures/media/", import.meta.url).pathname;
const reduce = { audio: aud.reduce, image: img.reduce, video: vid.reduce };
const run = (line, media) => runMeasurement(parseMeasure(line).decl, media, { nul, bindLinks: null, reduce });
const hasFfmpeg = (() => { try { execSync("ffmpeg -version", { stdio: "ignore" }); return true; } catch { return false; } })();

test("a bare audio reduce function still means audio, byte-identical to before: the wav path is untouched", () => {
  const bytes = new Uint8Array(44 + 8000 * 2);
  const view = new DataView(bytes.buffer);
  const tag = (o, s) => [...s].forEach((c, i) => (bytes[o + i] = c.charCodeAt(0)));
  tag(0, "RIFF"); view.setUint32(4, bytes.length - 8, true); tag(8, "WAVE"); tag(12, "fmt "); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, 8000, true); view.setUint32(28, 16000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  tag(36, "data"); view.setUint32(40, 16000, true);
  for (let i = 0; i < 8000; i++) view.setInt16(44 + i * 2, Math.round(Math.sin(i / 3) * 8000), true);
  const decl = parseMeasure("/measure t.wav channel:rms frame:400 as:burstiness broken:shuffle draws:50 window:4").decl;
  const asFn = seriesFromMedia({ kind: "wav", bytes }, decl, aud.reduce);
  const asObj = seriesFromMedia({ kind: "wav", bytes }, decl, reduce);
  assert.deepEqual(asFn.series, asObj.series);
  assert.equal(asFn.series.length, 20);
});

test("the probe teaches each decoded medium its one channel, and names the decoder gap for an undecoded container", async (t) => {
  if (!hasFfmpeg) return t.skip("ffmpeg absent — decoding is the perceivers' own ffmpeg");
  const image = { kind: "image", ...(await img.load(FIX + "gradient.png", { w: 64, h: 64 })) };
  const video = { kind: "video", frames: await vid.load(FIX + "cut.mp4", { fps: 10, w: 32, h: 18 }), w: 32, h: 18, fps: 10 };
  const pcm = { kind: "pcm", samples: await aud.load(FIX + "tone.wav", { sampleRate: 8000 }), sampleRate: 8000, container: "wav" };
  assert.match(run("/measure gradient.png", image).lines.join("\n"), /channels: luminance/);
  assert.match(run("/measure cut.mp4", video).lines.join("\n"), /channels: motion/);
  assert.match(run("/measure tone.wav", pcm).lines.join("\n"), /channels: rms .* flux/);
  const undecoded = run("/measure cut.mp4", { kind: "mp4", bytes: new Uint8Array(64) });
  assert.match(undecoded.lines[0], /container is named, not parsed; a decoder that offers it as its own series exists on the node side/);
  assert.ok(DECODABLE.has("mp4") && DECODABLE.has("png"));
});

test("image: scanline luminance placed against the shuffle null holds on the gradient; the wrong channel is refused by name", async (t) => {
  if (!hasFfmpeg) return t.skip("ffmpeg absent");
  const image = { kind: "image", ...(await img.load(FIX + "gradient.png", { w: 64, h: 64 })) };
  const r = run("/measure gradient.png channel:luminance frame:1 as:burstiness broken:shuffle draws:200 window:8", image);
  assert.ok(!r.refused, phrase(r));
  assert.match(phrase(r), /luminance per 1-scanline frame/);
  assert.match(phrase(r), /sits above every one of the 200 broken copies/);
  const wrong = run("/measure gradient.png channel:rms frame:1 as:burstiness broken:shuffle draws:200 window:8", image);
  assert.equal(wrong.refused.what, "channel");
  assert.match(wrong.refused.detail, /channel:luminance/);
});

test("video: the two-shot fixture's motion series has one transition, and the burstiness/shuffle pairing collapses — a typed fact about the pairing", async (t) => {
  if (!hasFfmpeg) return t.skip("ffmpeg absent");
  const frames = await vid.load(FIX + "cut.mp4", { fps: 10, w: 32, h: 18 });
  const video = { kind: "video", frames, w: 32, h: 18, fps: 10 };
  const series = seriesFromMedia(video, parseMeasure("/measure cut.mp4 channel:motion frame:1 as:burstiness broken:shuffle draws:200 window:5").decl, reduce);
  assert.equal(series.series.length, 39);
  const top = series.series.indexOf(Math.max(...series.series));
  assert.equal(top, 19, "the largest transition is between frames 19 and 20 — 2.0 s at 10 fps");
  const r = run("/measure cut.mp4 channel:motion frame:1 as:burstiness broken:shuffle draws:200 window:5", video);
  assert.equal(r.refused?.type, "degenerate_ground");
});

test("decoded PCM: compressed audio decoded by the perceiver's loader measures as rms/flux with its container named", async (t) => {
  if (!hasFfmpeg) return t.skip("ffmpeg absent");
  const pcm = { kind: "pcm", samples: await aud.load(FIX + "real-60s.wav", { sampleRate: 8000 }), sampleRate: 8000, container: "wav" };
  const r = run("/measure real-60s.wav channel:rms frame:400 as:burstiness broken:shuffle draws:200 window:20", pcm);
  assert.ok(!r.refused, phrase(r));
  assert.match(phrase(r), /decoded from wav/);
  assert.match(phrase(r), /1200 value\(s\)/);
});
