// heimdall-online.test.mjs — the ONLINE tier's pure parts (2026-09-22): the
// free levels in order, exhaustion and standing by measurement, and the wire
// translation between Ollama's shape and the providers' OpenAI shape.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PROVIDERS, makeOnlineRegistry, toOpenAIBody, fromOpenAIResponse, sseChunkToOllama, splitSse, keyFor } from "../native/kernel/online-mouths.js";

test("levels: permanent free tiers come before renewable credits before trials; inside a level the keyed and keyless are ordered as listed", () => {
  const levels = PROVIDERS.map((p) => p.level);
  assert.deepEqual([...levels], [...levels].sort((a, b) => a - b), "the registry is written in level order");
  assert.ok(PROVIDERS.some((p) => p.keyless), "a keyless provider exists so the mode works before any key is pasted");
});
test("pick: without keys only keyless providers are usable; a key in the env admits its provider ahead of them (same level, listed first)", () => {
  const noKeys = makeOnlineRegistry({ env: {}, keys: {} });
  const p0 = noKeys.pick();
  assert.ok(p0 && p0.provider.keyless, `keyless first when nothing is keyed: ${p0?.provider.name}`);
  const withGroq = makeOnlineRegistry({ env: { GROQ_API_KEY: "gsk_test" }, keys: {} });
  assert.equal(withGroq.pick().provider.name, "groq");
  const fromFile = makeOnlineRegistry({ env: {}, keys: { mistral: "m-test" } });
  assert.equal(fromFile.pick().provider.name, "mistral", "a key from the keys file counts");
  assert.equal(keyFor(PROVIDERS.find((p) => p.name === "groq"), {}, {}), null);
});
test("exhausted: a 429 stands the provider aside for Retry-After (else its own window) and the next level takes over; it returns when the window passes", () => {
  let t = 1_000_000;
  const reg = makeOnlineRegistry({ env: { GROQ_API_KEY: "a", OPENROUTER_API_KEY: "b" }, keys: {}, now: () => t });
  assert.equal(reg.pick().provider.name, "groq");
  const secs = reg.exhausted("groq", { retryAfterS: 7 });
  assert.equal(secs, 7);
  assert.equal(reg.disclosure().find((p) => p.name === "groq").standing, "exhausted");
  // the other level-1 keyless providers are still ahead of openrouter (level 2)
  const next = reg.pick();
  assert.ok(next.provider.level === 1 && next.provider.keyless, `next is a keyless level-1 provider: ${next.provider.name}`);
  const none = makeOnlineRegistry({ env: { OPENROUTER_API_KEY: "b" }, keys: {}, now: () => t, providers: PROVIDERS.filter((p) => !p.keyless) });
  assert.equal(none.pick().provider.name, "openrouter", "with no keyless providers and no level-1 key, level 2 serves");
  t += 8_000;
  assert.equal(reg.pick().provider.name, "groq", "back after the window");
  assert.equal(reg.exhausted("groq", {}), PROVIDERS.find((p) => p.name === "groq").window, "no Retry-After → the provider's own published window");
});
test("down: a failure stands a provider down for a bounded spell; latency is measured and orders inside a level", () => {
  let t = 5_000_000;
  const reg = makeOnlineRegistry({ env: { GROQ_API_KEY: "a", GEMINI_API_KEY: "b" }, keys: {}, now: () => t });
  reg.observe("groq", { ms: 900, ok: true }); reg.observe("google", { ms: 300, ok: true });
  assert.equal(reg.pick().provider.name, "google", "the faster measured provider inside the level goes first");
  reg.down("google", "ECONNRESET");
  assert.equal(reg.pick().provider.name, "groq");
  t += 6 * 60 * 1000;
  assert.equal(reg.pick().provider.name, "google", "back after the spell");
});
test("wire: an Ollama chat body becomes an OpenAI body with the options mapped; a generate prompt becomes messages", () => {
  const b = toOpenAIBody({ model: "gemma2:2b", messages: [{ role: "user", content: "hi" }], options: { temperature: 0, num_predict: 8 } }, "llama-3.1-8b-instant");
  assert.deepEqual(b, { model: "llama-3.1-8b-instant", messages: [{ role: "user", content: "hi" }], stream: false, temperature: 0, max_tokens: 8 });
  const g = toOpenAIBody({ prompt: "Say OK", system: "be brief" }, "m", { stream: true });
  assert.deepEqual(g.messages, [{ role: "system", content: "be brief" }, { role: "user", content: "Say OK" }]);
  assert.equal(g.stream, true); assert.deepEqual(g.stream_options, { include_usage: true });
});
test("wire: an OpenAI completion becomes Ollama's chat or generate shape with the counts; SSE deltas become NDJSON chunks, the last one done", () => {
  const j = { choices: [{ message: { content: "OK" }, finish_reason: "stop" }], usage: { prompt_tokens: 5, completion_tokens: 1 } };
  const c = fromOpenAIResponse(j, { model: "x", route: "chat" });
  assert.equal(c.message.content, "OK"); assert.equal(c.done, true); assert.equal(c.prompt_eval_count, 5); assert.equal(c.eval_count, 1);
  assert.equal(fromOpenAIResponse(j, { model: "x", route: "generate" }).response, "OK");
  const [objs, rest] = splitSse('data: {"choices":[{"delta":{"content":"O"}}]}\n\ndata: {"choices":[{"delta":{"content":"K"},"finish_reason":"stop"}],"usage":{"prompt_tokens":5,"completion_tokens":1}}\n\ndata: [DONE]\n\ndata: {"partial');
  assert.equal(objs.length, 3); assert.equal(rest, 'data: {"partial');
  const chunks = objs.map((o) => sseChunkToOllama(o, { model: "x" })).filter(Boolean);
  assert.equal(chunks[0].message.content, "O"); assert.equal(chunks[0].done, false);
  assert.equal(chunks[1].message.content, "K"); assert.equal(chunks[1].done, true); assert.equal(chunks[1].eval_count, 1);
  assert.equal(sseChunkToOllama({ choices: [{ delta: {} }] }, { model: "x" }), null, "an empty delta is a keep-alive, not a chunk");
});
