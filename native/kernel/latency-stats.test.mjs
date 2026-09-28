// node --test native/kernel/latency-stats.test.mjs
//
// latency-stats.js — the two arithmetic idioms shared by huginn.js
// (the-fold) and online-mouths.js (this repo), pinned against the REAL
// module. Each case is chosen so it would FAIL against the pre-extraction
// inline code too, if that code diverged from what shipped here — this is
// a byte-identical-behavior extraction, not a new design.

import test from "node:test";
import assert from "node:assert/strict";

import { typicalLatency, ewmaUpdate } from "./latency-stats.js";

test("typicalLatency: an empty measured set returns the caller's own fallback, unchanged", () => {
  assert.equal(typicalLatency([], 0), 0, "online-mouths.js pick()'s own fallback");
  assert.equal(typicalLatency([], 1), 1, "huginn.js huginnPrioritize's own fallback");
});

test("typicalLatency: the mean of the measured values, fallback ignored once there is something to average", () => {
  assert.equal(typicalLatency([100, 200, 300], 0), 200);
  assert.equal(typicalLatency([50], 1), 50);
});

test("ewmaUpdate: a null prior seeds outright at the new observation, rounded", () => {
  assert.equal(ewmaUpdate(null, 1000, 0.4), 1000);
  assert.equal(ewmaUpdate(null, 999.6, 0.3), 1000, "rounds");
});

test("ewmaUpdate: blends toward the new observation by alpha, matching each caller's own weight", () => {
  // huginn.js's EWMA_ALPHA = 0.4
  assert.equal(ewmaUpdate(1000, 2000, 0.4), Math.round(0.6 * 1000 + 0.4 * 2000));
  // online-mouths.js's EWMA = 0.3
  assert.equal(ewmaUpdate(900, 300, 0.3), Math.round(0.7 * 900 + 0.3 * 300));
});

test("ewmaUpdate: a prior of 0 is a real measurement, not treated as unset (only null seeds)", () => {
  assert.equal(ewmaUpdate(0, 100, 0.5), Math.round(0.5 * 0 + 0.5 * 100));
});
