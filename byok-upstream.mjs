// byok-upstream.mjs — a caller-supplied key, for any frontier model, as a mouth (2026-09-28).
//
// Every other lane in this proxy (anthropic-upstream.mjs, opencode-upstream.mjs,
// online-mouths.js) sources its key from THIS SERVER's own environment or a
// shared local file — one key, for the whole proxy, configured by whoever
// runs it. This lane is the opposite shape: the CALLER supplies a key with
// the request (streamOllamaChat's `byok` option), for a provider of their own
// choosing, and it is used for exactly that one call and never stored.
//
// Two wire shapes are covered:
//   - "anthropic": native Anthropic wire, delegated to anthropic-upstream.mjs's
//     own streamAnthropicText with an apiKeyOverride — no ANTHROPIC_API_KEY on
//     this server required at all.
//   - anything else: the OpenAI-compatible /chat/completions wire, using
//     online-mouths.js's own PURE wire-translation helpers (toOpenAIBody,
//     sseChunkToOllama, splitSse) — the same functions that already translate
//     for every provider in that file's PROVIDERS table, reused rather than
//     re-implemented. The base URL for a known provider name is read from
//     that same table (so "google", "groq", "mistral", "deepseek", "xai" (via
//     its online-mouths.js name "grok"), "openrouter", etc. all work with zero
//     new code); OpenAI itself is added here since online-mouths.js's roster
//     is deliberately free-tier-only and OpenAI has no permanent free tier.
//
// Yields the SAME contract every other lane yields (string chunks, then one
// terminal { done, prompt_eval_count, eval_count, estimated }) so the caller
// in proxy-runner.mjs needs no shape-specific handling — same guardAccept/
// guardFinish output gate, same retry loop, same heimdall accounting shape.

import { anthropicApiModelId, streamAnthropicText } from "./anthropic-upstream.mjs";
import { PROVIDERS as ONLINE_PROVIDERS, toOpenAIBody, sseChunkToOllama, splitSse } from "./native/kernel/online-mouths.js";

// OpenAI has no permanent free tier, so online-mouths.js's roster (free
// levels only) leaves it out on purpose — BYOK doesn't care about free
// tiers, so it belongs here instead of in that file.
const EXTRA_OPENAI_WIRE_PROVIDERS = Object.freeze({
  openai: "https://api.openai.com/v1",
});

export function byokBaseUrlFor(provider) {
  const p = String(provider ?? "").trim().toLowerCase();
  if (!p) return null;
  if (EXTRA_OPENAI_WIRE_PROVIDERS[p]) return EXTRA_OPENAI_WIRE_PROVIDERS[p];
  const known = ONLINE_PROVIDERS.find((x) => x.name === p);
  return known ? known.baseUrl : null;
}

/** Every provider name this lane can serve, anthropic first (native wire),
 * then every OpenAI-wire provider this proxy already knows a base URL for. */
export function byokSupportedProviders() {
  return ["anthropic", ...Object.keys(EXTRA_OPENAI_WIRE_PROVIDERS), ...ONLINE_PROVIDERS.map((p) => p.name)];
}

const DEFAULT_TIMEOUT_MS = 290000; // same order as OPENCODE_TIMEOUT_MS/ANTHROPIC_TIMEOUT_MS

async function* streamOpenAIWireText({ baseUrl, apiKey, model }, messages, { maxTokens = 1024, signal = null, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const body = toOpenAIBody({ messages }, model, { stream: true });
  if (Number.isFinite(maxTokens) && maxTokens > 0) body.max_tokens = maxTokens;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const onAbort = () => ctrl.abort();
  if (signal) {
    if (signal.aborted) throw new Error("aborted");
    signal.addEventListener("abort", onAbort, { once: true });
  }
  let res = null;
  try {
    res = await fetch(`${String(baseUrl).replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      signal: ctrl.signal,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`byok ${baseUrl}: ${res.status} ${errText.slice(0, 200)}`.trim());
    }
  } catch (err) {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onAbort);
    throw err;
  }

  let promptTokens = 0;
  let genTokens = 0;
  let emittedChars = 0;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      if (signal?.aborted) throw new Error("cancelled");
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const [objs, rest] = splitSse(buf);
      buf = rest;
      for (const obj of objs) {
        if (obj?.done) continue; // the [DONE] sentinel splitSse marks — no fields to read
        if (obj?.usage?.prompt_tokens != null) promptTokens = obj.usage.prompt_tokens;
        if (obj?.usage?.completion_tokens != null) genTokens = obj.usage.completion_tokens;
        const piece = sseChunkToOllama(obj, { model, route: "chat" });
        if (!piece) continue;
        const text = piece.message?.content ?? "";
        if (text) {
          emittedChars += text.length;
          yield text;
        }
        if (piece.done) {
          yield {
            done: true,
            prompt_eval_count: piece.prompt_eval_count || promptTokens,
            eval_count: piece.eval_count || genTokens || Math.ceil(emittedChars / 4),
            estimated: !(piece.prompt_eval_count || promptTokens),
          };
          return;
        }
      }
    }
    if (emittedChars > 0) {
      yield { done: true, prompt_eval_count: promptTokens, eval_count: genTokens || Math.ceil(emittedChars / 4), estimated: !promptTokens };
    } else {
      throw new Error("byok: stream ended with no text and no done");
    }
  } finally {
    clearTimeout(timer);
    try { ctrl.abort(); } catch { /* already closed */ }
    if (signal) signal.removeEventListener("abort", onAbort);
    try { await reader.cancel(); } catch { /* already closed */ }
  }
}

/** streamByokText({provider, apiKey, model}, messages, opts) -> the same
 * {string chunks + terminal done} contract every other lane yields. */
export async function* streamByokText({ provider, apiKey, model }, messages, opts = {}) {
  if (!provider) throw new Error("streamByokText: provider required");
  if (!apiKey) throw new Error("streamByokText: apiKey required");
  if (!model) throw new Error("streamByokText: model required");
  const p = String(provider).trim().toLowerCase();
  if (p === "anthropic") {
    yield* streamAnthropicText({ modelID: anthropicApiModelId(model) }, messages, { ...opts, apiKeyOverride: apiKey });
    return;
  }
  const baseUrl = byokBaseUrlFor(p);
  if (!baseUrl) throw new Error(`streamByokText: unknown provider "${provider}" — known: ${byokSupportedProviders().join(", ")}`);
  yield* streamOpenAIWireText({ baseUrl, apiKey, model }, messages, opts);
}
