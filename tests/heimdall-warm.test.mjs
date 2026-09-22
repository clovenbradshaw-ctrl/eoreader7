// heimdall-warm.test.mjs — the keep-warm pressure test and the dual-daemon
// collision detector (2026-09-21, the reload storm's two halves).
//
// The warm test is the residency/keep-warm gate: holding a model resident is
// NOT a new load, so it judges on AVAILABLE memory (free + reclaimable
// inactive) plus swap churn — never on "truly free", which sits chronically at
// ~50MB on macOS and would latch the keep-warm off forever (measured: 132
// reloads of gemma2:2b while the box sat idle).
//
// The collision detector proves "two `ollama serve` daemons answer the model
// port" from lsof proof + the process table — the root cause of the reload
// storm and the "waiting inside Ollama" queue time.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as h from "../heimdall.mjs";

const { warmPressureTest, warmPressureReason, modelServerCollisionOf } = h;

// ── warmPressureTest ────────────────────────────────────────────────────────
test("warm: unknown headroom never convicts", () => {
  assert.equal(warmPressureTest(null), false);
  assert.equal(warmPressureTest({}), false);
  assert.equal(warmPressureTest({ memFreeMb: null }), false);
});

test("warm: judges on AVAILABLE memory, not on chronically-low free", () => {
  // The macOS shape that stood the holon down for days: ~50MB free but
  // gigabytes reclaimable. A held model is not a new load — the box is clear.
  assert.equal(warmPressureTest({ memFreeMb: 52, memAvailableMb: 3292, swapOutPerS: 0 }), false);
  // The 2026-09-19 shape (real pressure): free AND available are gone.
  assert.equal(warmPressureTest({ memFreeMb: 47, memAvailableMb: 47, swapOutPerS: 0 }), true);
});

test("warm: available below the warm floor is pressured", () => {
  assert.equal(warmPressureTest({ memFreeMb: 50, memAvailableMb: 200, swapOutPerS: 0 }), true);
  assert.ok((warmPressureReason({ memFreeMb: 50, memAvailableMb: 200, swapOutPerS: 0 }) || "").includes("available"));
});

test("warm: swap churn stands a warm down even with headroom", () => {
  assert.equal(warmPressureTest({ memFreeMb: 600, memAvailableMb: 6000, swapOutPerS: 500 }), true);
  assert.ok((warmPressureReason({ memFreeMb: 600, memAvailableMb: 6000, swapOutPerS: 500 }) || "").includes("thrashing"));
});

test("warm: quiet high-free box is always clear", () => {
  assert.equal(warmPressureTest({ memFreeMb: 8000, memAvailableMb: 8000, swapOutPerS: 0 }), false);
});

// ── modelServerCollisionOf ──────────────────────────────────────────────────
const rows = [
  { pid: 81981, args: "/Applications/Ollama.app/Contents/Resources/ollama serve" },
  { pid: 95844, args: "/opt/homebrew/Cellar/ollama/0.24.0/libexec/ollama serve" },
  { pid: 11445, args: "ollama runner --model /Users/mlacy/.ollama/models/blobs/sha256-x --port 50345" },
];

// The daemon's port is PRIVATE now (native/kernel/model-server.js) and the
// conventional port is the channel's — derived here, never restated.
const DAEMON_PORT = Number(new URL(h.modelServerUrl()).port);
const CHANNEL = h.channelPort();

test("collision: two daemons on the model port is a collision", () => {
  const held = new Map([[81981, new Set([DAEMON_PORT])], [95844, new Set([DAEMON_PORT])]]);
  const c = modelServerCollisionOf(held, rows);
  assert.ok(c, "two ollama serve daemons sharing the port must be named");
  assert.equal(c.pids.length, 2);
  assert.ok(c.pids.includes(81981) && c.pids.includes(95844));
});

test("collision: one daemon is not a collision", () => {
  const held = new Map([[95844, new Set([DAEMON_PORT])]]);
  assert.equal(modelServerCollisionOf(held, rows), null);
});

test("collision: a runner on another port is never a daemon", () => {
  // Only `ollama serve` counts; the runner holds a different port anyway.
  const held = new Map([[95844, new Set([DAEMON_PORT])], [11445, new Set([50345])]]);
  assert.equal(modelServerCollisionOf(held, rows), null);
});

test("collision: no lsof proof is never a conviction", () => {
  assert.equal(modelServerCollisionOf(null, rows), null);
  assert.equal(modelServerCollisionOf(undefined, rows), null);
});

test("collision: two daemons but a different port is not this server's collision", () => {
  const held = new Map([[81981, new Set([11499])], [95844, new Set([11499])]]);
  assert.equal(modelServerCollisionOf(held, rows), null);
});

test("collision: a daemon on the CHANNEL's port is a collision by itself — it takes the callers the channel admits (2026-09-21)", () => {
  const held = new Map([[95844, new Set([DAEMON_PORT])], [81981, new Set([CHANNEL])]]);
  const c = modelServerCollisionOf(held, rows);
  assert.ok(c);
  assert.deepEqual(c.pids, [81981]);
  assert.equal(c.port, CHANNEL);
});