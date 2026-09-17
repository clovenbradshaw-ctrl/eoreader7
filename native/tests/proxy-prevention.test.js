// proxy-prevention.test.js — the stale-citation prevention stack, pinned.
// Measured 2026-09-17: "write a haiku about debugging code" surfaced and
// cited a Wikisource gun-legislation page admitted turns earlier — six
// near-identical title variants in the poem's Sources appendix. The fix is
// three gates, and this file pins the pure one:
//   salientDocsForTask — the composition-surf salience gate: a doc that
//     fails the task's coarse screen is no one's source for this artifact
//     (never surfaced → never cited). Admission refusal and membership are
//     integration paths; this pins their shared decision.
import test from "node:test";
import assert from "node:assert/strict";
import { salientDocsForTask } from "../../proxy-runner.mjs";

const GUN_TEXT = "Israel to Introduce Legislation to Prohibit 3-D Printed High-Capacity Magazines Along with Plastic Guns. Israel to Introduce Legislation to Prohibit 3-D Printed High-Capacity Magazines Along with Plastic Guns (2013). The legislation concerns magazines along with plastic guns and high-capacity ammunition.";
const DEBUG_TEXT = "Debugging code demands patience: reproduce the bug, bisect the change, read the stack trace. A haiku about debugging honors the struggle of finding the fault. The crack in the code is a reflection of the human condition.";

function docs(map) {
  return new Map(Object.entries(map));
}

test("a stale page fails the task's salience gate", () => {
  const out = salientDocsForTask(docs({ "wikisource:s1:prohibit": { text: GUN_TEXT } }), "write a haiku about debugging code");
  assert.equal(out.length, 0, "zero-shared-vocabulary doc must not surface");
});

test("a page the task shares vocabulary with surfaces, ranked", () => {
  const out = salientDocsForTask(docs({
    "web:s1:0:https://gun.example": { text: GUN_TEXT },
    "web:s1:1:https://debug.example": { text: DEBUG_TEXT },
  }), "write a haiku about debugging code");
  assert.equal(out.length, 1);
  assert.equal(out[0].sourceId, "web:s1:1:https://debug.example");
  assert.ok(out[0].score > 0);
});

test("multiple salient docs rank by score, capped", () => {
  const out = salientDocsForTask(docs({
    "a": { text: DEBUG_TEXT }, // 4/5 task words (no "write")
    "b": { text: "Write a haiku: debugging code, a bug, the code's crack — write a code haiku about the debugging craft. " + DEBUG_TEXT }, // 5/5
  }), "write a haiku about debugging code", { maxSegments: 1 });
  assert.equal(out.length, 1);
  assert.equal(out[0].sourceId, "b", "higher-scoring doc wins the single slot");
});

test("conversation sources never surface", () => {
  const out = salientDocsForTask(docs({ "chat:s1:turn-3:response": { text: DEBUG_TEXT } }), "write a haiku about debugging code");
  assert.equal(out.length, 0);
});

test("empty docs yield nothing without throwing", () => {
  assert.equal(salientDocsForTask(new Map(), "anything at all").length, 0);
});