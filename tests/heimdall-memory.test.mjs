// heimdall-memory.test.mjs — the 2026-09-19 lesson: free pages are
// admission-grade. Three large-model loads hung (120s, 420s, abort→cascade)
// while CPU idle read "fine" and the daemon answered a resident model in
// 2.7s. Memory pressure is its own signal: fail fast, never hang.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as h from "../heimdall.mjs";

const { __queueTest, memoryPressured } = h;

function call(person, model) {
  return h.admitChat(JSON.stringify({ model }), { "x-er7-user": person });
}

test.beforeEach(() => __queueTest.reset());

test("memoryPressured: unknown headroom never convicts", () => {
  assert.equal(memoryPressured(null), false);
  assert.equal(memoryPressured({}), false);
  assert.equal(memoryPressured({ memFreeMb: null }), false);
});

test("memoryPressured: below/above the floor", () => {
  assert.equal(memoryPressured({ memFreeMb: 47 }), true);
  assert.equal(memoryPressured({ memFreeMb: 511 }), true);
  assert.equal(memoryPressured({ memFreeMb: 512 }), false);
  assert.equal(memoryPressured({ memFreeMb: 8000 }), false);
});

test("MEMORY GATE: a large non-resident model is refused fast under pressure", () => {
  __queueTest.setSaturated(false);
  __queueTest.setVitals({ memFreeMb: 47, cpuIdle: 70 }); // idle CPU, full memory
  __queueTest.setOllamaModels([]); // /api/ps read OK, model known-absent (not unknown)
  const r = call("A", "qwen2.5:14b-instruct-q4_K_M");
  assert.equal(r.allowed, false);
  assert.equal(r.type, "memory_pressured");
  assert.equal(r.status, 503);
  assert.ok(r.message.includes("47"), "the refusal names the measured headroom");
});

test("MEMORY GATE: a resident small model answers under pressure (loads nothing)", () => {
  __queueTest.setSaturated(false);
  __queueTest.setVitals({ memFreeMb: 47, cpuIdle: 70 });
  __queueTest.setOllamaModels([{ name: "gemma2:2b" }]);
  assert.equal(call("A", "er7:gemma2:2b").allowed, true);
});

test("MEMORY GATE: a NON-resident small model is refused fast under pressure (2026-09-20)", () => {
  // The evict-and-swap hang: gemma2:2b sailed through the old >4B exemption
  // with ~218MB free against a 9.8GB resident and stalled ~290s in total
  // proxy silence. Small is not free — any load evicts.
  __queueTest.setSaturated(false);
  __queueTest.setVitals({ memFreeMb: 218, cpuIdle: 70 });
  __queueTest.setOllamaModels([{ name: "qwen3:8b" }]); // gemma2:2b NOT resident
  const r = call("A", "er7:gemma2:2b");
  assert.equal(r.allowed, false);
  assert.equal(r.type, "memory_pressured");
  assert.equal(r.status, 503);
  assert.ok(r.message.includes("218"), "the refusal names the measured headroom");
});

test("MEMORY GATE: unknown residency never convicts a small model", () => {
  __queueTest.setSaturated(false);
  __queueTest.setVitals({ memFreeMb: 47, cpuIdle: 70 });
  __queueTest.setOllamaModels(null); // /api/ps unreadable: residency unknown
  assert.equal(call("A", "er7:gemma2:2b").allowed, true);
});

test("MEMORY GATE: unknown headroom never convicts a large model", () => {
  __queueTest.setSaturated(false);
  __queueTest.setVitals({ cpuIdle: 70 }); // no memFreeMb: no reading yet
  assert.equal(call("A", "qwen2.5:14b-instruct-q4_K_M").allowed, true);
});

test("MEMORY GATE: headroom above the floor admits large models", () => {
  __queueTest.setSaturated(false);
  __queueTest.setVitals({ memFreeMb: 8000, cpuIdle: 70 });
  assert.equal(call("A", "qwen2.5:14b-instruct-q4_K_M").allowed, true);
});

test("MEMORY GATE: the remote fast pass is untouched by memory pressure", () => {
  __queueTest.setSaturated(true);
  __queueTest.setVitals({ memFreeMb: 12, cpuIdle: 2 }); // pegged AND pressured
  const r = call("A", "er7:anthropic/claude-sonnet-4-6");
  assert.equal(r.allowed, true, "remote mouths load nothing locally — never gated");
  assert.equal(r.fastPass, true);
});
