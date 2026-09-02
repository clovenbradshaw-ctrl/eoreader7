// overtones.test.js — the harmonic series is heard where it is and not
// where it isn't, on sound built by construction; the overlap metric
// behaves like physics without being told any theory.
import { test } from "node:test";
import assert from "node:assert/strict";
import { discoverHarmonics, overtoneOverlap, fft } from "../adapters/audio/overtones.js";

const SR = 22050;
const tone = (hz, seconds, partials, seed = 1) => {
  const n = Math.floor(SR * seconds), s = new Float64Array(n);
  for (let i = 0; i < n; i += 1) for (let k = 1; k <= partials; k += 1) s[i] += Math.sin((2 * Math.PI * hz * k * i) / SR) / k;
  return s;
};
const noise = (seconds, seed) => { let x = seed >>> 0; const n = Math.floor(SR * seconds), s = new Float64Array(n); for (let i = 0; i < n; i += 1) { x = (x * 1664525 + 1013904223) >>> 0; s[i] = x / 4294967296 * 2 - 1; } return s; };
const H = { frame: 4096, hop: 2048, partials: 6, band: [80, 1000], draws: 60, seed: 0, alpha: 0.05, energyFloor: 0.001 };

test("fft: a pure sine puts its energy in one bin", () => {
  const n = 1024, re = new Float64Array(n), im = new Float64Array(n);
  for (let i = 0; i < n; i += 1) re[i] = Math.sin((2 * Math.PI * 16 * i) / n);
  fft(re, im);
  let best = 0; for (let i = 1; i < n / 2; i += 1) if (Math.hypot(re[i], im[i]) > Math.hypot(re[best], im[best])) best = i;
  assert.equal(best, 16);
});

test("a tone WITH partials hears harmonics; a pure sine and white noise do not (beyond alpha)", () => {
  const rich = discoverHarmonics(tone(220, 2, 6), SR, H);
  const pure = discoverHarmonics(tone(220, 2, 1), SR, H);
  const white = discoverHarmonics(noise(2, 9), SR, H);
  assert.ok(rich.share > 0.9, `rich ${rich.share}`);
  assert.ok(pure.share < 0.3, `pure sine ${pure.share} — nothing at the multiples`);
  assert.ok(white.share <= 0.15, `noise ${white.share}`);
  assert.ok(rich.profile[1] > 0.3 && rich.profile[1] < 0.7, `the profile is read, not assumed: k=2 at ${rich.profile[1]} (built at 1/2)`);
});

test("every number is declared", () => {
  assert.throws(() => discoverHarmonics(new Float64Array(100), SR, { frame: 64 }), /declared/);
  assert.throws(() => overtoneOverlap(220, 330, [1, 0.5], {}), /declared/);
});

test("the overlap metric: an octave and a fifth share more than a semitone and a tritone — arithmetic on frequencies, no theory named", () => {
  const profile = [1, 0.5, 0.33, 0.25, 0.2, 0.17, 0.14, 0.12];
  const f = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const o = (a, b) => overtoneOverlap(f(a), f(b), profile, { tolerance: 0.03 });
  assert.equal(o(60, 60), 1);
  assert.ok(o(60, 72) > o(60, 61), "octave > semitone");
  assert.ok(o(60, 67) > o(60, 66), "fifth > tritone");
  assert.ok(o(60, 67) > o(60, 61), "fifth > semitone");
  assert.equal(o(60, 67), o(67, 60), "symmetric");
});
