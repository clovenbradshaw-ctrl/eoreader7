// byok-upstream.test.mjs — the caller-supplied-key lane's pure decisions and
// wire behavior, mocked at fetch: no real provider is ever called, and
// ANTHROPIC_API_KEY is deliberately left unset throughout, since the whole
// point of BYOK is that the server's own env var is never required.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as byok from "../byok-upstream.mjs";

delete process.env.ANTHROPIC_API_KEY;

function sseBody(chunks) {
  const encoder = new TextEncoder();
  let i = 0;
  return {
    getReader() {
      return {
        async read() {
          if (i >= chunks.length) return { done: true, value: undefined };
          const value = encoder.encode(chunks[i++]);
          return { done: false, value };
        },
        async cancel() {},
      };
    },
  };
}

test("byokBaseUrlFor resolves a known online-mouths.js provider by name", () => {
  assert.equal(byok.byokBaseUrlFor("google"), "https://generativelanguage.googleapis.com/v1beta/openai");
  assert.equal(byok.byokBaseUrlFor("openai"), "https://api.openai.com/v1");
  assert.equal(byok.byokBaseUrlFor("not-a-real-provider"), null);
});

test("byokSupportedProviders lists anthropic first, then openai, then the online-mouths.js roster", () => {
  const list = byok.byokSupportedProviders();
  assert.equal(list[0], "anthropic");
  assert.ok(list.includes("openai"));
  assert.ok(list.includes("google"));
  assert.ok(list.includes("groq"));
});

test("streamByokText: anthropic sends the CALLER's key, not any env var, with no ANTHROPIC_API_KEY set", async () => {
  assert.equal(process.env.ANTHROPIC_API_KEY, undefined);
  let capturedUrl = null;
  let capturedHeaders = null;
  const realFetch = global.fetch;
  global.fetch = async (url, init) => {
    capturedUrl = String(url);
    capturedHeaders = init.headers;
    return {
      ok: true,
      body: sseBody([
        "event: message_start\ndata: {\"type\":\"message_start\",\"message\":{\"usage\":{\"input_tokens\":5}}}\n\n",
        "event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"delta\":{\"text\":\"hi\"}}\n\n",
        "event: message_delta\ndata: {\"type\":\"message_delta\",\"usage\":{\"output_tokens\":1}}\n\n",
        "event: message_stop\ndata: {\"type\":\"message_stop\"}\n\n",
      ]),
    };
  };
  try {
    const out = [];
    for await (const chunk of byok.streamByokText({ provider: "anthropic", apiKey: "sk-ant-caller-supplied", model: "claude-sonnet-5" }, [{ role: "user", content: "hi" }])) {
      out.push(chunk);
    }
    assert.ok(capturedUrl.endsWith("/v1/messages"), `expected the anthropic messages endpoint, got ${capturedUrl}`);
    assert.equal(capturedHeaders["x-api-key"], "sk-ant-caller-supplied");
    const text = out.filter((c) => typeof c === "string").join("");
    assert.equal(text, "hi");
    const done = out.find((c) => c?.done);
    assert.equal(done.prompt_eval_count, 5);
    assert.equal(done.eval_count, 1);
  } finally {
    global.fetch = realFetch;
  }
});

test("streamByokText: openai sends a Bearer header with the caller's key to api.openai.com", async () => {
  let capturedUrl = null;
  let capturedHeaders = null;
  let capturedBody = null;
  const realFetch = global.fetch;
  global.fetch = async (url, init) => {
    capturedUrl = String(url);
    capturedHeaders = init.headers;
    capturedBody = JSON.parse(init.body);
    return {
      ok: true,
      body: sseBody([
        "data: {\"choices\":[{\"delta\":{\"content\":\"hi\"}}]}\n\n",
        "data: {\"choices\":[{\"delta\":{},\"finish_reason\":\"stop\"}],\"usage\":{\"prompt_tokens\":3,\"completion_tokens\":1}}\n\n",
        "data: [DONE]\n\n",
      ]),
    };
  };
  try {
    const out = [];
    for await (const chunk of byok.streamByokText({ provider: "openai", apiKey: "sk-caller-openai-key", model: "gpt-4o-mini" }, [{ role: "user", content: "hi" }])) {
      out.push(chunk);
    }
    assert.equal(capturedUrl, "https://api.openai.com/v1/chat/completions");
    assert.equal(capturedHeaders.authorization, "Bearer sk-caller-openai-key");
    assert.equal(capturedBody.model, "gpt-4o-mini");
    const text = out.filter((c) => typeof c === "string").join("");
    assert.equal(text, "hi");
    const done = out.find((c) => c?.done);
    assert.equal(done.prompt_eval_count, 3);
    assert.equal(done.eval_count, 1);
    assert.equal(done.estimated, false);
  } finally {
    global.fetch = realFetch;
  }
});

test("streamByokText: an unknown provider throws, naming the supported list", async () => {
  await assert.rejects(
    async () => {
      for await (const _ of byok.streamByokText({ provider: "not-a-real-provider", apiKey: "x", model: "m" }, [{ role: "user", content: "hi" }])) { /* noop */ }
    },
    /unknown provider "not-a-real-provider"/,
  );
});

test("streamByokText: missing provider/apiKey/model are refused before any fetch", async () => {
  await assert.rejects(async () => { for await (const _ of byok.streamByokText({ apiKey: "x", model: "m" }, [])) { /* noop */ } }, /provider required/);
  await assert.rejects(async () => { for await (const _ of byok.streamByokText({ provider: "openai", model: "m" }, [])) { /* noop */ } }, /apiKey required/);
  await assert.rejects(async () => { for await (const _ of byok.streamByokText({ provider: "openai", apiKey: "x" }, [])) { /* noop */ } }, /model required/);
});
