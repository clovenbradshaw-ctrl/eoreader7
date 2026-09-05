// mhc-control.test.js — the MHC battery refuses a one-material run with a
// typed gap instead of reading "none readable" (the-fold P95 / S65).
import test from "node:test";
import assert from "node:assert/strict";
import { controlRule } from "../eval/the-fold/lib/mhc-control.mjs";

test("one material: a typed control_absent gap, naming the invocation", () => {
  const r = controlRule(["war-and-peace"]);
  assert.equal(r.ok, false);
  assert.equal(r.gap.type, "control_absent");
  assert.deepEqual(r.gap.chosen, ["war-and-peace"]);
  assert.match(r.gap.detail, /invocation, not the material/);
});

test("no material at all is the same gap; so is one material named twice", () => {
  assert.equal(controlRule(["borodino", "borodino"]).ok, false, "a duplicate key is one material, not a control");
  assert.equal(controlRule([]).ok, false);
  assert.equal(controlRule(undefined).ok, false);
});

test("two or more: each material's control is another one from the run", () => {
  const r = controlRule(["war-and-peace", "borodino", "borodino-ru"]);
  assert.equal(r.ok, true);
  assert.equal(r.controlFor(0), "borodino");
  assert.equal(r.controlFor(1), "war-and-peace");
  assert.equal(r.controlFor(2), "war-and-peace");
  assert.notEqual(r.controlFor(2), "borodino-ru");
});
