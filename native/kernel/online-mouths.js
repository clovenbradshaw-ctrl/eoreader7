// online-mouths.js — the ONLINE tier: hosted models with free levels (2026-09-22).
//
// The operator's ask: "a mode where it can use online models too, with
// security reduced but we try different free levels" — the roster is the
// Free-LLM directory (github.com/nejib1/Free-LLM), read into a registry of
// OpenAI-compatible chat endpoints, ordered by the LEVEL of their free offer:
// permanent free tiers first, then renewable credits, then one-time trial
// credits. Keyless providers sit last inside level 1 — free without a signup,
// and the most anonymous third party of all.
//
// SECURITY REDUCED, stated plainly: on this tier the prompt LEAVES THE BOX
// to a third party. It runs only with the `onlineMouths` setting on, only
// for a caller that may hop tiers (a person by default, anyone asking
// `x-er7-tier: any`), never for `x-er7-tier: exact|local`, never for
// embeddings, and always behind the same AntiStrauss gate as every other
// mouth. Every online call is stamped (`x-heimdall-tier: online`,
// `x-heimdall-provider`) and lands on the ledger.
//
// FREE LEVELS ARE TRIED IN ORDER, AND MEASURED: a 429 (or a quota body)
// marks the provider EXHAUSTED for its Retry-After (else its own rate window);
// a 5xx or a network failure stands it DOWN for a bounded spell; a model
// name the provider does not know is re-discovered from its /models list
// once, never guessed twice. The next call takes the first provider in level
// order that is neither exhausted nor down, keyed (or keyless), preferring
// the lower measured latency inside a level. Nothing here is a threshold on
// the box; the numbers are the providers' own published windows.
//
// Keys: `<KEY_ENV>` in the environment, or `state/online-keys.json`
// ({ "groq": "gsk_…", … }) — never committed (see .gitignore).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KEYS_FILE = process.env.ER7_ONLINE_KEYS_FILE || path.join(HERE, "..", "..", "state", "online-keys.json");

// level 1 = permanent free tier, 2 = renewable credits, 3 = one-time trial.
// `window` = the provider's published rate window in seconds (the fallback
// exhaustion when a 429 carries no Retry-After). `model` is the README's
// free/key model; ER7_ONLINE_MODEL_<NAME> overrides it, and a 404 on it
// triggers discovery from /models.
export const PROVIDERS = Object.freeze([
  // level 1 — permanent free tiers (README §"Permanent Free Tiers")
  { name: "groq",         level: 1, baseUrl: "https://api.groq.com/openai/v1",                         keyEnv: "GROQ_API_KEY",         model: "llama-3.1-8b-instant",                          window: 60,   note: "30 RPM, 14.4k RPD, free forever" },
  { name: "google",       level: 1, baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", keyEnv: "GEMINI_API_KEY",       model: "gemini-2.0-flash",                              window: 60,   note: "5–30 RPM, up to 9000 RPD" },
  { name: "mistral",      level: 1, baseUrl: "https://api.mistral.ai/v1",                              keyEnv: "MISTRAL_API_KEY",      model: "mistral-small-latest",                          window: 1,    note: "1 request/second, free" },
  { name: "huggingface",  level: 1, baseUrl: "https://router.huggingface.co/v1",                       keyEnv: "HF_TOKEN",             model: "meta-llama/Llama-3.1-8B-Instruct",              window: 3600, note: "300 requests/hour" },
  { name: "cohere",       level: 1, baseUrl: "https://api.cohere.ai/compatibility/v1",                 keyEnv: "COHERE_API_KEY",       model: "command-r7b-12-2024",                           window: 60,   note: "20 RPM, 1000/month" },
  { name: "nvidia",       level: 1, baseUrl: "https://integrate.api.nvidia.com/v1",                    keyEnv: "NVIDIA_API_KEY",       model: "meta/llama-3.1-8b-instruct",                    window: 60,   note: "40 RPM" },
  { name: "ollama-cloud", level: 1, baseUrl: "https://ollama.com/v1",                                  keyEnv: "OLLAMA_API_KEY",       model: "gpt-oss:120b",                                  window: 3600, note: "light usage tier, 1 concurrent model" },
  { name: "siliconflow",  level: 1, baseUrl: "https://api.siliconflow.com/v1",                         keyEnv: "SILICONFLOW_API_KEY",  model: "Qwen/Qwen2.5-7B-Instruct",                      window: 60,   note: "free models, phone verification" },
  { name: "modelscope",   level: 1, baseUrl: "https://api-inference.modelscope.cn/v1",                 keyEnv: "MODELSCOPE_API_KEY",   model: "Qwen/Qwen2.5-7B-Instruct",                      window: 86400, note: "500/day per model, 2000/day total" },
  { name: "aionlabs",     level: 1, baseUrl: "https://api.aionlabs.ai/v1",                             keyEnv: "AIONLABS_API_KEY",     model: "aion-1.0-mini",                                 window: 86400, note: "daily token allowance, undisclosed exact quota" },
  { name: "hetzner",      level: 1, baseUrl: "https://inference.hetzner.com/api/v1",                   keyEnv: "HETZNER_API_KEY",      model: "llama-3.1-8b-instruct",                         window: 60,   note: "3M in / 60K out tokens per 60s, experimental phase" },
  { name: "inference-net", level: 1, baseUrl: "https://api.inference.net/v1",                          keyEnv: "INFERENCE_NET_API_KEY", model: "meta-llama/llama-3.1-8b-instruct",             window: 60,   note: "30 RPM fair use" },
  { name: "llm7",         level: 1, baseUrl: "https://api.llm7.io/v1",                                 keyEnv: "LLM7_API_KEY",         model: "DeepSeek-V4-Flash-0731",                        window: 60,   note: "30 RPM keyless, 120 RPM with a free token", keyless: true },
  { name: "pollinations", level: 1, baseUrl: "https://text.pollinations.ai/openai",                    keyEnv: "POLLINATIONS_API_KEY", model: "openai-fast",                                   window: 15,   note: "~1 request / 15s anonymous", keyless: true },
  // level 2 — renewable credits
  { name: "openrouter",   level: 2, baseUrl: "https://openrouter.ai/api/v1",                           keyEnv: "OPENROUTER_API_KEY",   model: "meta-llama/llama-3.3-70b-instruct:free",        window: 60,   note: "20 RPM, 50 RPD free models" },
  { name: "requesty",     level: 2, baseUrl: "https://router.requesty.ai/v1",                          keyEnv: "REQUESTY_API_KEY",     model: "meta-llama/llama-3.3-70b-instruct:free",        window: 60,   note: "60 RPM, 200/day free models" },
  { name: "venice",       level: 2, baseUrl: "https://api.venice.ai/api/v1",                           keyEnv: "VENICE_API_KEY",       model: "llama-3.3-70b",                                 window: 60,   note: "10 RPM free tier" },
  { name: "grok",         level: 2, baseUrl: "https://api.x.ai/v1",                                    keyEnv: "XAI_API_KEY",          model: "grok-2-mini",                                   window: 60,   note: "$25 one-time signup credit" },
  // level 3 — one-time trial credits (each expires; the exhaustion window is a guess where the README gives none)
  { name: "cerebras",     level: 3, baseUrl: "https://api.cerebras.ai/v1",                             keyEnv: "CEREBRAS_API_KEY",     model: "llama3.1-8b",                                   window: 60,   note: "$5 trial, 30 days" },
  { name: "sambanova",    level: 3, baseUrl: "https://api.sambanova.ai/v1",                            keyEnv: "SAMBANOVA_API_KEY",    model: "Meta-Llama-3.1-8B-Instruct",                    window: 60,   note: "$5 trial, 3 months" },
  { name: "together",     level: 3, baseUrl: "https://api.together.xyz/v1",                            keyEnv: "TOGETHER_API_KEY",     model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",  window: 60,   note: "free research models need a $5 deposit" },
  { name: "hyperbolic",   level: 3, baseUrl: "https://api.hyperbolic.xyz/v1",                          keyEnv: "HYPERBOLIC_API_KEY",   model: "meta-llama/Llama-3.1-8B-Instruct",              window: 60,   note: "$1 one-time" },
  { name: "nebius",       level: 3, baseUrl: "https://api.tokenfactory.nebius.com/v1",                 keyEnv: "NEBIUS_API_KEY",       model: "meta-llama/Llama-3.1-8B-Instruct",              window: 60,   note: "$1 one-time, requires a bank card on file" },
  { name: "novita",       level: 3, baseUrl: "https://api.novita.ai/v3/openai",                        keyEnv: "NOVITA_API_KEY",       model: "meta-llama/llama-3.1-8b-instruct",              window: 60,   note: "$0.50 one-time" },
  { name: "scaleway",     level: 3, baseUrl: "https://api.scaleway.ai/v1",                             keyEnv: "SCALEWAY_API_KEY",     model: "llama-3.1-8b-instruct",                         window: 60,   note: "1M tokens one-time" },
  { name: "deepinfra",    level: 3, baseUrl: "https://api.deepinfra.com/v1/openai",                    keyEnv: "DEEPINFRA_API_KEY",    model: "meta-llama/Meta-Llama-3.1-8B-Instruct",         window: 60,   note: "$5 one-time, 90-day expiry" },
  { name: "nscale",       level: 3, baseUrl: "https://inference.api.nscale.com/v1",                    keyEnv: "NSCALE_API_KEY",       model: "meta-llama/Llama-3.1-8B-Instruct",              window: 60,   note: "$5 one-time" },
  { name: "friendli",     level: 3, baseUrl: "https://inference.friendli.ai/v1",                       keyEnv: "FRIENDLI_API_KEY",     model: "meta-llama-3.1-8b-instruct",                    window: 60,   note: "$10 one-time" },
  { name: "deepseek",     level: 3, baseUrl: "https://api.deepseek.com/v1",                            keyEnv: "DEEPSEEK_API_KEY",     model: "deepseek-chat",                                 window: 60,   note: "5M tokens, 30 days" },
  { name: "ai21",         level: 3, baseUrl: "https://api.ai21.com/studio/v1",                         keyEnv: "AI21_API_KEY",         model: "jamba-mini",                                    window: 60,   note: "$10, 3 months" },
  { name: "upstage",      level: 3, baseUrl: "https://api.upstage.ai/v1/solar",                        keyEnv: "UPSTAGE_API_KEY",      model: "solar-mini",                                    window: 60,   note: "$10, 3 months" },
  { name: "nousportal",   level: 3, baseUrl: "https://inference-api.nousresearch.com/v1",               keyEnv: "NOUS_API_KEY",         model: "Hermes-4-70B",                                  window: 60,   note: "no signup limits published — verify live" },
  { name: "zai",          level: 3, baseUrl: "https://api.z.ai/api/paas/v4",                           keyEnv: "ZAI_API_KEY",          model: "glm-4.5-flash",                                 window: 1,    note: "~1 RPS, ~1000/day Flash tier" },
]);
// Two providers in the README have no OpenAI-compatible /chat/completions
// endpoint of their own shape (Replicate: async prediction API; Cloudflare
// Workers AI: /accounts/{id}/ai/run/{model}, account-scoped path) — left out
// on purpose rather than force-fit through this wire; Coze and OVH publish
// unclear or narrow free terms as of the README\'s own reading and are
// deferred rather than guessed onto the roster.

const DOWN_MS = 5 * 60 * 1000; // a 5xx / network failure stands a provider down for one bounded spell
const EWMA = 0.3;

function readKeysFile() {
  try { return JSON.parse(fs.readFileSync(KEYS_FILE, "utf8")) ?? {}; } catch { return {}; }
}
export function keyFor(p, env = process.env, file = null) {
  const fromEnv = env[p.keyEnv];
  if (fromEnv) return String(fromEnv);
  const f = file ?? readKeysFile();
  return f[p.name] ? String(f[p.name]) : null;
}
export function modelFor(p, env = process.env) {
  return env[`ER7_ONLINE_MODEL_${p.name.toUpperCase().replace(/-/g, "_")}`] || p.model;
}

/** Live standing per provider: measured, in memory. */
export function makeOnlineRegistry({ providers = PROVIDERS, env = process.env, now = Date.now, keys = null } = {}) {
  const state = new Map(providers.map((p) => [p.name, { exhaustedUntil: 0, downUntil: 0, calls: 0, fails: 0, meanMs: null, model: modelFor(p, env), lastError: null, discovered: false }]));
  const keyed = (p) => p.keyless || !!keyFor(p, env, keys);
  return {
    providers,
    /** The first usable provider in level order — keyed, not exhausted, not
     *  down — the lowest measured latency inside a level; unmeasured tried. */
    pick({ exclude = [] } = {}) {
      const t = now();
      const skip = new Set(exclude);
      const cands = providers.filter((p) => !skip.has(p.name) && keyed(p)).filter((p) => { const s = state.get(p.name); return s.exhaustedUntil <= t && s.downUntil <= t; });
      // inside a level: keyed before keyless (an anonymous third party is the
      // last resort), then measured latency — an unmeasured provider scores at
      // the level's own mean (tried, never starved, never preferred), then
      // the listed order.
      const measured = cands.map((p) => state.get(p.name).meanMs).filter((v) => Number.isFinite(v) && v > 0);
      const typical = measured.length ? measured.reduce((a, b) => a + b, 0) / measured.length : 0;
      const lat = (p) => { const v = state.get(p.name).meanMs; return Number.isFinite(v) && v > 0 ? v : typical; };
      cands.sort((a, b) => a.level - b.level || (a.keyless ? 1 : 0) - (b.keyless ? 1 : 0) || lat(a) - lat(b) || providers.indexOf(a) - providers.indexOf(b));
      const p = cands[0];
      return p ? { provider: p, model: state.get(p.name).model, key: p.keyless ? (keyFor(p, env, keys) ?? null) : keyFor(p, env, keys) } : null;
    },
    /** An answer landed. */
    observe(name, { ms, ok }) {
      const s = state.get(name); if (!s) return;
      if (ok) { s.calls += 1; if (Number.isFinite(ms) && ms > 0) s.meanMs = s.meanMs == null ? Math.round(ms) : Math.round((1 - EWMA) * s.meanMs + EWMA * ms); }
      else s.fails += 1;
    },
    /** The free level ran out: exhausted for Retry-After, else the window. */
    exhausted(name, { retryAfterS = null, reason = "429" } = {}) {
      const s = state.get(name); const p = providers.find((x) => x.name === name); if (!s || !p) return 0;
      const secs = Number.isFinite(Number(retryAfterS)) && Number(retryAfterS) > 0 ? Number(retryAfterS) : p.window;
      s.exhaustedUntil = now() + secs * 1000; s.lastError = reason; s.fails += 1;
      return secs;
    },
    down(name, reason) { const s = state.get(name); if (!s) return; s.downUntil = now() + DOWN_MS; s.lastError = String(reason ?? "down"); s.fails += 1; },
    setModel(name, model) { const s = state.get(name); if (s) { s.model = model; s.discovered = true; } },
    standing(name) { return state.get(name) ?? null; },
    disclosure() {
      const t = now();
      return providers.map((p) => { const s = state.get(p.name); return { name: p.name, level: p.level, keyed: keyed(p), keyless: !!p.keyless, model: s.model, note: p.note, standing: s.downUntil > t ? "down" : s.exhaustedUntil > t ? "exhausted" : "ready", exhaustedInS: s.exhaustedUntil > t ? Math.round((s.exhaustedUntil - t) / 1000) : 0, calls: s.calls, fails: s.fails, meanMs: s.meanMs, lastError: s.lastError }; });
    },
  };
}

// ── wire translation: the channel speaks Ollama's wire; the providers speak OpenAI's ──
/** An Ollama /api/chat or /api/generate body → an OpenAI chat body. Pure. */
export function toOpenAIBody(parsed, model, { stream = false } = {}) {
  const messages = Array.isArray(parsed?.messages) ? parsed.messages.map((m) => ({ role: m?.role ?? "user", content: typeof m?.content === "string" ? m.content : Array.isArray(m?.content) ? m.content.map((p) => p?.text ?? "").join("\n") : String(m?.content ?? "") }))
    : typeof parsed?.prompt === "string" ? [...(parsed.system ? [{ role: "system", content: String(parsed.system) }] : []), { role: "user", content: parsed.prompt }] : [];
  const o = parsed?.options ?? {};
  const body = { model, messages, stream };
  if (Number.isFinite(o.temperature)) body.temperature = o.temperature;
  if (Number.isFinite(o.top_p)) body.top_p = o.top_p;
  if (Number.isFinite(o.num_predict) && o.num_predict > 0) body.max_tokens = o.num_predict;
  if (stream) body.stream_options = { include_usage: true };
  return body;
}
/** An OpenAI chat completion → Ollama's /api/chat (or /api/generate) shape. Pure. */
export function fromOpenAIResponse(j, { model, route = "chat", startedAt = Date.now() } = {}) {
  const choice = j?.choices?.[0] ?? {};
  const content = choice.message?.content ?? choice.text ?? "";
  const usage = j?.usage ?? {};
  const base = { model, created_at: new Date().toISOString(), done: true, done_reason: choice.finish_reason ?? "stop", total_duration: (Date.now() - startedAt) * 1e6, prompt_eval_count: usage.prompt_tokens ?? 0, eval_count: usage.completion_tokens ?? 0 };
  return route === "generate" ? { ...base, response: content } : { ...base, message: { role: "assistant", content } };
}
/** One OpenAI SSE `data:` object → one Ollama NDJSON chunk (or null for keep-alives). Pure. */
export function sseChunkToOllama(obj, { model, route = "chat" } = {}) {
  if (!obj || typeof obj !== "object") return null;
  const choice = obj.choices?.[0];
  const delta = choice?.delta?.content ?? choice?.text ?? "";
  const done = !!choice?.finish_reason || (!choice && !!obj.usage);
  if (!delta && !done) return null;
  const chunk = route === "generate" ? { model, created_at: new Date().toISOString(), response: delta, done } : { model, created_at: new Date().toISOString(), message: { role: "assistant", content: delta }, done };
  if (done) { chunk.done_reason = choice?.finish_reason ?? "stop"; chunk.prompt_eval_count = obj.usage?.prompt_tokens ?? 0; chunk.eval_count = obj.usage?.completion_tokens ?? 0; }
  return chunk;
}
/** Split an SSE text buffer into complete `data:` JSON objects; returns [objects, rest]. Pure. */
export function splitSse(buffer) {
  const out = [];
  let rest = buffer;
  let idx;
  while ((idx = rest.indexOf("\n\n")) !== -1) {
    const event = rest.slice(0, idx); rest = rest.slice(idx + 2);
    for (const line of event.split("\n")) {
      const m = /^data:\s*(.*)$/.exec(line.trim());
      if (!m) continue;
      if (m[1] === "[DONE]") { out.push({ done: true }); continue; }
      try { out.push(JSON.parse(m[1])); } catch { /* a partial or comment line */ }
    }
  }
  return [out, rest];
}
