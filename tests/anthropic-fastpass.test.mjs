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

// LEAVES THE DEVICE (2026-09-22): the fast pass keys on off-device PREFIXES,
// and a model the daemon has installed is on-device whatever its name. The
// old bare-substring list let the local DeepSeek MoE small mouth skip every
// local gate while it loaded onto this very box.
test("leavesDevice: the local DeepSeek small mouth is on-device; the DeepSeek API lane is not", () => {
  h.__tiersTest.setInstalled([{ name: "deepseek-v2:16b-lite-chat-q4_0", size: 8.9e9, families: ["deepseek2"] }, { name: "gemma2:2b", size: 1.6e9, families: ["gemma2"] }]);
  assert.equal(h.leavesDevice("er7:deepseek-v2:16b-lite-chat-q4_0"), false, "an installed model never leaves the device");
  assert.equal(isUngatedModel("er7:deepseek-v2:16b-lite-chat-q4_0"), false, "so it never skips the local gates");
  assert.equal(h.leavesDevice("deepseek/deepseek-chat"), true, "the provider/model API lane leaves the device");
  assert.equal(h.leavesDevice("online/pollinations/openai"), true);
  assert.equal(h.leavesDevice("er7:claude-haiku-4-5"), true);
  assert.equal(h.leavesDevice("hf.co/someone/some-model:q4"), false, "a registry path is not a provider prefix");
  // even a name that LOOKS remote is local once the daemon holds it
  h.__tiersTest.setInstalled([{ name: "claude-mimic:latest", size: 1e9, families: ["llama"] }]);
  assert.equal(h.leavesDevice("claude-mimic"), false, "local wins over any prefix");
  h.__tiersTest.setInstalled(null);
});

test("FAST PASS: a saturated box QUEUES the local DeepSeek small mouth instead of waving it through", () => {
  h.__tiersTest.setInstalled([{ name: "deepseek-v2:16b-lite-chat-q4_0", size: 8.9e9, families: ["deepseek2"] }]);
  __queueTest.setSaturated(true);
  const r = call("local-user", "er7:deepseek-v2:16b-lite-chat-q4_0");
  assert.notEqual(r.fastPass, true, `the local MoE must not fast-pass: ${JSON.stringify(r)}`);
  assert.equal(r.allowed, false, "a saturated box holds a local model in the line");
  h.__tiersTest.setInstalled(null);
});
