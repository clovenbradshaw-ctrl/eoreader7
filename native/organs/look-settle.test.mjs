// look-settle.test.mjs — falsification of the escalation return
// (2026-09-29). settleRead's escalation verdicts were declared inside the
// loop body and died with the iteration — the return below threw
// ReferenceError on EVERY read, model or not, and the whole escalation
// path was down. Caught live by a frontier falsification turn
// (look_error: "escalationBlocked is not defined"). These tests pin the
// return on the model-free paths; the loop path is covered by the live
// frontier series (frontier-enzyme-run.mjs), never by a mock judge.
import { test } from "node:test";
import assert from "node:assert/strict";
import { settleRead } from "./look.js";

test("settle: returns, never throws, when there are no mechanical facts", async () => {
  const r = await settleRead("a plain first read", [], "gemma2:2b");
  assert.equal(r.settled, true);
  assert.equal(r.turns, 1, "nothing to check against — no escalation attempted");
  assert.equal(r.visionRead, "a plain first read");
});

test("settle: returns, never throws, when there is no vision read", async () => {
  const r = await settleRead(null, ["a mechanical fact"], "gemma2:2b");
  assert.equal(r.settled, true);
  assert.equal(r.turns, 1);
});

test("settle: the escalation verdicts always ride the return", async () => {
  for (const r of [
    await settleRead("read", [], "gemma2:2b"),
    await settleRead(null, ["fact"], "gemma2:2b"),
  ]) {
    assert.ok("escalationBlocked" in r, "the key exists even when the loop never ran");
    assert.ok("escalationFailed" in r, "the key exists even when the loop never ran");
    assert.equal(r.escalationBlocked, null);
    assert.equal(r.escalationFailed, null);
  }
});
