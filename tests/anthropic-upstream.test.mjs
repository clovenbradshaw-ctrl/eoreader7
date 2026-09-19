// anthropic-upstream.test.mjs — the direct Anthropic lane's pure decisions:
//
// Lane routing (which id rides Anthropic's own API), message conversion
// (Ollama-format transcript → the Anthropic wire), and the disabled-without-
// a-key discipline. No network: ANTHROPIC_API_KEY is set in-process to a
// dummy, and discovery is never called (the hot path reads the cache only).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as up from "../anthropic-upstream.mjs";

process.env.ANTHROPIC_API_KEY = "test-dummy-key";
process.env.ER7_ANTHROPIC_MODELS = "anthropic/claude-sonnet-4-6,anthropic/claude-haiku-4-5";

test("api id strips the provider prefix; bare ids pass through", () => {
  assert.equal(up.anthropicApiModelId("anthropic/claude-sonnet-4-6"), "claude-sonnet-4-6");
  assert.equal(up.anthropicApiModelId("claude-sonnet-4-6"), "claude-sonnet-4-6");
});

test("lane decision: door-passing Claude ids route, local tags do not", () => {
  // No discovery refresh (no network in tests): the door passes Claude ids
  // even undiscovered, so scoped keys without models:list still work.
  const r = up.upstreamAnthropicModelFor("er7:anthropic/claude-sonnet-4-6");
  assert.deepEqual(r, { providerID: "anthropic", modelID: "claude-sonnet-4-6" });
  assert.deepEqual(
    up.upstreamAnthropicModelFor("er7:claude-haiku-4-5"),
    { providerID: "anthropic", modelID: "claude-haiku-4-5" },
  );
  assert.equal(up.upstreamAnthropicModelFor("er7:gemma2:2b"), null);
  assert.equal(up.upstreamAnthropicModelFor("er7:olmo2:7b"), null);
});

test("configured flag is env-live: deleting the key disables the lane", () => {
  assert.equal(up.anthropicConfigured(), true);
  const saved = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    assert.equal(up.anthropicConfigured(), false);
    assert.equal(up.upstreamAnthropicModelFor("er7:anthropic/claude-sonnet-4-6"), null);
  } finally {
    process.env.ANTHROPIC_API_KEY = saved;
  }
});

test("message conversion: system splits out, same-role merges, user-first holds", () => {
  const { system, messages } = up.toAnthropicMessages([
    { role: "system", content: "be brief" },
    { role: "user", content: "q1" },
    { role: "user", content: "q2" },
    { role: "assistant", content: "a1" },
    { role: "user", content: "q3" },
  ]);
  assert.equal(system, "be brief");
  assert.deepEqual(messages.map((m) => m.role), ["user", "assistant", "user"]);
  assert.ok(messages[0].content.includes("q1") && messages[0].content.includes("q2"), "consecutive user turns merge");
});

test("message conversion: empty prompt is a typed refusal, never an API call", () => {
  const { messages } = up.toAnthropicMessages([{ role: "system", content: "only system" }]);
  assert.equal(messages, null);
});
