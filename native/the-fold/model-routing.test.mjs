// model-routing.test.mjs — the routing policy pinned: a plain turn and the
// summary refresh never spend the big model; deep work always does; a missing
// rung degrades to the next one loaded, never to an unloaded name.

import test from "node:test";
import assert from "node:assert/strict";

import { MODEL_PICKER, ROUTE_KINDS, routeModel, S1_MODEL, S2_MODEL, WITNESS_MODEL, resolveNamedModel , isPinnedModel} from "./model-routing.js";

const OFFERED = [...MODEL_PICKER];
const SELECTED = MODEL_PICKER[MODEL_PICKER.length - 1];

test("the picker is four rungs, fastest first", () => {
  assert.equal(MODEL_PICKER.length, 4);
  assert.equal(MODEL_PICKER[0], "gemma2:2b");
  // user direction 2026-09-02: no thinking-mode model on the ladder, and small ones first
  for (const m of MODEL_PICKER) assert.ok(!/^(olmo-3|qwen3|deepseek-r1)/.test(m), `${m} is a reasoning model — not a rung`);
  assert.equal(MODEL_PICKER[MODEL_PICKER.length - 1], "qwen2.5:14b-instruct-q4_K_M");
});

test("a flat question uses the fastest loaded model, never the selected one", () => {
  assert.equal(routeModel(ROUTE_KINDS.FLAT, { offered: OFFERED, selected: SELECTED }), MODEL_PICKER[0]);
});

test("the summary refresh is always the fastest loaded model", () => {
  assert.equal(routeModel(ROUTE_KINDS.SUMMARY, { offered: OFFERED, selected: SELECTED }), MODEL_PICKER[0]);
  assert.equal(routeModel(ROUTE_KINDS.SUMMARY, { offered: OFFERED, selected: MODEL_PICKER[0] }), MODEL_PICKER[0]);
});

test("deep work uses the model the user chose", () => {
  assert.equal(routeModel(ROUTE_KINDS.DEEP, { offered: OFFERED, selected: SELECTED }), SELECTED);
});

test("a missing fast rung degrades to the next one loaded, never to an unloaded name", () => {
  assert.equal(routeModel(ROUTE_KINDS.FLAT, { offered: OFFERED.slice(1), selected: SELECTED }), OFFERED[1]);
});

test("a single-model machine routes everything to that model", () => {
  const one = [SELECTED];
  assert.equal(routeModel(ROUTE_KINDS.FLAT, { offered: one, selected: SELECTED }), SELECTED);
  assert.equal(routeModel(ROUTE_KINDS.DEEP, { offered: one, selected: SELECTED }), SELECTED);
});

test("deep work with no selection falls back to the fastest rung, never throws", () => {
  assert.equal(routeModel(ROUTE_KINDS.DEEP, { offered: OFFERED }), MODEL_PICKER[0]);
});

test("S1 and S2 are distinct, fixed models", () => {
  assert.equal(S1_MODEL, "hf.co/allenai/OLMo-2-0425-1B-Instruct-GGUF:latest");
  assert.equal(S2_MODEL, "gemma2:2b");
  assert.notEqual(S1_MODEL, S2_MODEL);
  // S1 is a genuine specialist pick, never a picker rung. S2 coincides with
  // MODEL_PICKER[0] (both gemma2:2b) -- an accident of this assignment, not
  // a structural requirement of the abstraction.
  assert.ok(!MODEL_PICKER.includes(S1_MODEL), "S1's model is a specialist, never offered as a picker rung");
});

test("WITNESS_MODEL is its own declared choice, not a silent alias of S1_MODEL's identity", () => {
  // The value is the same as S1_MODEL today (both name the smallest pulled
  // instruct model) — that is a coincidence of what happens to be measured
  // best for each job right now, not a structural requirement. Declared as
  // its own export, own comment, own giver, so changing one never silently
  // moves the other.
  assert.equal(WITNESS_MODEL, "hf.co/allenai/OLMo-2-0425-1B-Instruct-GGUF:latest");
  assert.ok(!MODEL_PICKER.includes(WITNESS_MODEL), "a specialist pick, never offered as a picker rung");
});

test("resolveNamedModel returns the named model when Ollama actually has it", () => {
  const available = new Set([S1_MODEL, S2_MODEL, ...MODEL_PICKER]);
  assert.equal(resolveNamedModel(S1_MODEL, { available, offered: OFFERED }), S1_MODEL);
  assert.equal(resolveNamedModel(S2_MODEL, { available, offered: OFFERED }), S2_MODEL);
});

test("resolveNamedModel degrades to the fastest offered rung when the named model isn't pulled, never to an unloaded name", () => {
  const available = new Set(); // S1_MODEL never pulled on this machine
  assert.equal(resolveNamedModel(S1_MODEL, { available, offered: OFFERED }), OFFERED[0]);
});

test("resolveNamedModel with nothing offered either falls back to MODEL_PICKER's own fastest rung, never throws", () => {
  assert.equal(resolveNamedModel(S1_MODEL, { available: new Set(), offered: [] }), MODEL_PICKER[0]);
});

test("a room mouth is pinned: the person chose a machine, so every kind goes there, and a pinned name is never the 'fast' rung for anyone else", () => {
  const pinned = "room:@worker:server qwen2.5-coder:1.5b";
  assert.equal(isPinnedModel(pinned), true);
  assert.equal(isPinnedModel("gemma2:2b"), false);
  assert.equal(isPinnedModel("room:not-an-id"), false);
  assert.equal(isPinnedModel(null), false);
  for (const kind of Object.values(ROUTE_KINDS)) assert.equal(routeModel(kind, { offered: ["gemma2:2b", pinned], selected: pinned }), pinned, kind);
  assert.equal(routeModel(ROUTE_KINDS.FLAT, { offered: [pinned, "gemma2:2b"], selected: "gemma2:2b" }), "gemma2:2b", "a pinned name is skipped when picking the fast local rung");
});
