// healing-loop.test.mjs — the recursion mechanics, injected: a controllable
// fake stands in for runCodeLoop (exactly the seam runCodeLoop itself
// already offers for its own model call, one layer up) so these tests are
// fast, deterministic, and touch no real model or real files.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runHealingCodeLoop, DEFAULT_HEALING_WORKSPACE } from "./healing-loop.js";

const BASE_ARGS = { sessionId: "s", model: "m", task: "original task", workspace: "/tmp/x", testCommand: "echo ok" };

test("runHealingCodeLoop: no healing needed — a normal result passes through untouched, healedAt empty", async () => {
  const runner = async () => ({ done: true, rounds: [{ ok: true }], finalTestOutput: "OK" });
  const result = await runHealingCodeLoop(BASE_ARGS, { codeLoopRunner: runner });
  assert.equal(result.done, true);
  assert.deepEqual(result.healedAt, []);
  assert.deepEqual(result.rounds, [{ ok: true }]);
});

test("runHealingCodeLoop: an ORDINARY failure (done:false, no throw) is never treated as something to heal", async () => {
  // repeatsLastGap/rounds-exhausted-shaped failures are code-loop.js's own
  // concern; this module only reacts to a THROWN, infrastructure-shaped
  // error, never a normal done:false result.
  let calls = 0;
  const runner = async () => { calls += 1; return { done: false, rounds: [], finalTestOutput: null }; };
  const result = await runHealingCodeLoop(BASE_ARGS, { codeLoopRunner: runner });
  assert.equal(result.done, false);
  assert.deepEqual(result.healedAt, []);
  assert.equal(calls, 1, "an ordinary done:false must never trigger a heal attempt or a retry");
});

test("runHealingCodeLoop: one infra throw triggers exactly one heal-then-retry cycle", async () => {
  let calls = 0;
  const tasksSeen = [];
  const runner = async (args) => {
    calls += 1;
    tasksSeen.push(args.task);
    if (calls === 1) throw new Error("boom: infra broke");
    return { done: true, rounds: [], finalTestOutput: "OK" };
  };
  const result = await runHealingCodeLoop(BASE_ARGS, { codeLoopRunner: runner });
  assert.equal(result.done, true);
  assert.equal(calls, 3, "original (throws), heal diagnosis (succeeds), retry of original (succeeds)");
  assert.equal(result.healedAt.length, 1);
  assert.match(result.healedAt[0].task, /boom: infra broke/);
  assert.match(tasksSeen[1], /boom: infra broke/, "the heal's own task must name the real caught error, not a generic label");
  assert.equal(result.healedAt[0].workspace, DEFAULT_HEALING_WORKSPACE, "a heal defaults to targeting eoreader7's own repo root, not some other workspace");
});

test("runHealingCodeLoop: a heal that ITSELF needs healing recurses genuinely (multi-level, holonic)", async () => {
  // The first two calls (whatever task they carry) fail; the third and
  // beyond succeed. This forces: original fails, healing IT fails too (a
  // second, deeper heal is required), healing THAT succeeds, the inner
  // retry succeeds, and finally the true original succeeds — genuine
  // nested recursion, not a fixed 2-step shape. A plain counter is used
  // rather than de-duplicating by task text, since diagnosisTaskFor's
  // fixed preamble text means naive text-based fakes can collide.
  let callCount = 0;
  const calls = [];
  const runner = async (args) => {
    callCount += 1;
    calls.push(args.task);
    if (callCount <= 2) throw new Error(`infra broke, attempt #${callCount}`);
    return { done: true, rounds: [], finalTestOutput: "OK" };
  };
  const result = await runHealingCodeLoop(BASE_ARGS, { codeLoopRunner: runner, maxHealingDepth: 6 });
  assert.equal(result.done, true, `expected eventual convergence; calls were: ${JSON.stringify(calls)}`);
  assert.ok(calls.length >= 4, `expected genuine multi-level recursion (>=4 calls), got ${calls.length}`);
  assert.equal(result.healedAt.length, 1, "depth0's own heal decision is the one top-level record");
  assert.ok(result.healedAt[0].result.healedAt.length >= 1, "the nested heal attempt itself required and recorded a FURTHER heal, nested inside .result — proving genuine multi-level recursion, not a flat 2-step");
});

test("runHealingCodeLoop: maxHealingDepth is a real, finite bound — an unfixable failure exhausts, it never recurses forever", async () => {
  const runner = async () => { throw new Error("permanently broken"); };
  await assert.rejects(
    () => runHealingCodeLoop(BASE_ARGS, { codeLoopRunner: runner, maxHealingDepth: 2 }),
    (err) => {
      assert.equal(err.code, "ERR_HEALING_EXHAUSTED");
      assert.equal(err.healingDepth, 2);
      assert.match(err.message, /permanently broken/);
      return true;
    },
  );
});

test("runHealingCodeLoop: every heal attempt forces requireReasoning:true, regardless of the original call's own setting", async () => {
  let originalCalls = 0;
  let sawHealArgs = null;
  const runner = async (args) => {
    if (args.task === BASE_ARGS.task) {
      originalCalls += 1;
      if (originalCalls === 1) throw new Error("boom");
      return { done: true, rounds: [], finalTestOutput: "OK" };
    }
    sawHealArgs = args;
    return { done: true, rounds: [], finalTestOutput: "OK" };
  };
  const result = await runHealingCodeLoop({ ...BASE_ARGS, requireReasoning: false }, { codeLoopRunner: runner });
  assert.equal(result.done, true);
  assert.equal(sawHealArgs.requireReasoning, true, "a self-directed heal edit must never skip the reasoning gate, even if the original task didn't require it");
  assert.equal(sawHealArgs.contextMode, "fold");
});
