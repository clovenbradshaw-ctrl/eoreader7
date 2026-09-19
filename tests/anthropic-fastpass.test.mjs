// anthropic-fastpass.test.mjs — Heimdall's fast pass for the ungated lane:
//
// A remote mouth (Anthropic's own API, the opencode server) never touches the
// local box, so a saturated box or a full local family lane must not 429 it.
// The fast pass skips saturation, the family cap, and the head-of-line queue;
// the ration, the servable check, and the exactly-once claim still apply.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as h from "../heimdall.mjs";

const { __queueTest, releaseClaim, isUngatedModel } = h;

function call(person, model, { claim, device } = {}) {
  const headers = { "x-er7-user": person };
  if (claim) headers["x-er7-claim"] = claim;
  if (device) __queueTest.setDevice(device);
  return h.admitChat(JSON.stringify({ model }), headers);
}

test.beforeEach(() => __queueTest.reset());

test("ungated ids are recognized; local ids are not", () => {
  assert.equal(isUngatedModel("er7:anthropic/claude-sonnet-4-6"), true);
  assert.equal(isUngatedModel("er7:claude-haiku-4-5"), true);
  assert.equal(isUngatedModel("anthropic/claude-opus-4-1"), true);
  assert.equal(isUngatedModel("er7:opencode/claude-sonnet-4-6"), true);
  assert.equal(isUngatedModel("er7:gemma2:2b"), false);
  assert.equal(isUngatedModel("er7:olmo2:7b"), false);
  assert.equal(isUngatedModel("unknown"), false);
});

test("FAST PASS: a saturated box still admits a remote model, flagged fastPass", () => {
  __queueTest.setSaturated(true);
  const r = call("A", "er7:anthropic/claude-sonnet-4-6");
  assert.equal(r.allowed, true, `remote must be admitted when saturated: ${JSON.stringify(r)}`);
  assert.equal(r.fastPass, true);
  assert.equal(r.ungated, true);
});

test("FAST PASS: the local line still queues while remotes pass", () => {
  __queueTest.setSaturated(true);
  const local = call("local-user", "er7:gemma2:2b");
  assert.equal(local.allowed, false, "local must still queue when saturated");
  assert.ok(local.queue?.position >= 1);
  const remote = call("remote-user", "er7:anthropic/claude-sonnet-4-6");
  assert.equal(remote.allowed, true, "remote must not wait behind the local line");
  // The remote never took a place in line: the local's position is unchanged.
  const again = call("local-user", "er7:gemma2:2b");
  assert.equal(again.queue?.position, local.queue?.position, "a fast pass must not shuffle the local line");
});

test("FAST PASS: exactly-once still applies to remote turns", () => {
  __queueTest.setSaturated(false);
  __queueTest.setDevice("mac-pro");
  assert.equal(call("A", "er7:anthropic/claude-sonnet-4-6", { claim: "turn-9" }).allowed, true);
  const dup = call("B", "er7:anthropic/claude-sonnet-4-6", { claim: "turn-9", device: "mac-mini" });
  assert.equal(dup.allowed, false);
  assert.equal(dup.type, "claimed");
  __queueTest.setDevice("mac-pro"); // release runs as the holder
  releaseClaim("turn-9");
  assert.equal(call("C", "er7:anthropic/claude-sonnet-4-6", { claim: "turn-9", device: "mac-mini" }).allowed, true);
});

test("FAST PASS: an unservable remote is still refused, honestly", () => {
  __queueTest.setSaturated(false);
  h.markUnservable("anthropic/claude-sonnet-4-6", "test-poison");
  const r = call("A", "er7:anthropic/claude-sonnet-4-6");
  assert.equal(r.allowed, false);
  assert.equal(r.type, "model_unavailable");
  h.markServable("anthropic/claude-sonnet-4-6");
  assert.equal(call("A", "er7:anthropic/claude-sonnet-4-6").allowed, true);
});
