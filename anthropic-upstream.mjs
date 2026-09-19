// anthropic-upstream.mjs — Anthropic's own API as a direct mouth.
//
// The proxy's models are named `er7:<real>`; most `<real>` ids are Ollama tags,
// and `provider/model` ids ride the opencode lane (opencode-upstream.mjs).
// This module is the third lane: frontier Claude models served DIRECTLY by
// api.anthropic.com with a caller-supplied ANTHROPIC_API_KEY — no `opencode
// serve` in between, so a token-usage comparison (eoreader7's grounded prompt
// vs raw, local vs frontier) measures the FRONTIER model, not the aggregator.
//
//   ANTHROPIC_API_KEY      — the key (required; absent = lane disabled)
//   ER7_ANTHROPIC_URL      — override (default https://api.anthropic.com)
//   ER7_ANTHROPIC_VERSION  — API version header (default 2023-06-01)
//   ER7_ANTHROPIC_ALLOW    — substring door, comma-separated (default "claude";
//                            "*" = every model id the account can serve)
//   ER7_ANTHROPIC_EXCLUDE  — exact ids (or `prefix*`) never served here
//   ER7_ANTHROPIC_MODELS   — explicit ids, comma-separated (always offered when
//                            the key is present, even if discovery is down)
//   ER7_ANTHROPIC_TIMEOUT_MS — per-draw wall clock (default 290000)
//
// A draw keeps the SAME yield contract as the other lanes (strings + a
// terminal { done }) so streamOllamaChat needs no shape changes, and carries
// the server's OWN counters on the terminal chunk (never estimated):
// prompt_eval_count=input_tokens, eval_count=output_tokens, plus
// cacheCreation/cacheRead. Heimdall counts it apart (ungated: no local VRAM,
// no keep-alive, no reload) and the used-vs-saved ledger rides those counters.
// The antistrauss gate runs BEFORE this lane (in streamOllamaChat) — nothing
// reaches Anthropic that the gate refused.
//
// Model discovery: GET /v1/models (cached for ANTHROPIC_MODELS_CACHE_MS); the
// turn preflight warms it, the hot draw path only reads the cache.

const _stripEr7 = (model) => String(model ?? "").replace(/^er7:/, "");

// The id the ANTHROPIC API itself wants: `anthropic/claude-x` →
/// `claude-x`. A bare `claude-x` passes through unchanged.
export function anthropicApiModelId(stripped) {
  const id = String(stripped ?? "").trim();
  if (/^anthropic\//i.test(id)) return id.replace(/^anthropic\//i, "");
  return id;
}

export const ANTHROPIC_URL = (process.env.ER7_ANTHROPIC_URL ?? "https://api.anthropic.com").replace(/\/+$/, "");
export const ANTHROPIC_VERSION = process.env.ER7_ANTHROPIC_VERSION ?? "2023-06-01";
export const ANTHROPIC_ON = (process.env.ER7_ANTHROPIC ?? "1") !== "0";
export const ANTHROPIC_TIMEOUT_MS = Number(process.env.ER7_ANTHROPIC_TIMEOUT_MS ?? 290000);
export const ANTHROPIC_MODELS_CACHE_MS = Number(process.env.ER7_ANTHROPIC_MODELS_CACHE_MS ?? 60000);

function apiKey() {
  return process.env.ANTHROPIC_API_KEY ?? "";
}

export function anthropicConfigured() {
  return ANTHROPIC_ON && Boolean(apiKey());
}

function anthropicHeaders() {
  return {
    "content-type": "application/json",
    "x-api-key": apiKey(),
    "anthropic-version": ANTHROPIC_VERSION,
  };
}

const ANTHROPIC_ALLOW = String(process.env.ER7_ANTHROPIC_ALLOW ?? "claude")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
function allowedByDoor(id) {
  if (ANTHROPIC_ALLOW.includes("*")) return true;
  const low = String(id ?? "").toLowerCase();
  return ANTHROPIC_ALLOW.some((sub) => low.includes(sub));
}

const ANTHROPIC_EXCLUDE = String(process.env.ER7_ANTHROPIC_EXCLUDE ?? "")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
function excludedByDeadList(id) {
  const low = String(id ?? "").toLowerCase();
  return ANTHROPIC_EXCLUDE.some((e) => e.endsWith("*") ? low.startsWith(e.slice(0, -1)) : low === e);
}

function explicitModelIds() {
  return String(process.env.ER7_ANTHROPIC_MODELS ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);
}

// ── model discovery -----------------------------------------------------------
let _models = new Set();
let _modelsTs = 0;

async function fetchJson(url, { method = "GET", body = null, timeoutMs = 8000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: anthropicHeaders(),
      signal: ctrl.signal,
      ...(body === null ? {} : { body: JSON.stringify(body) }),
    });
    if (!res.ok) throw new Error(`anthropic ${method} ${url.replace(ANTHROPIC_URL, "")}: ${res.status}`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } finally {
    clearTimeout(timer);
  }
}

export async function anthropicReachable({ timeoutMs = 5000 } = {}) {
  if (!anthropicConfigured()) return false;
  try {
    await fetchJson(`${ANTHROPIC_URL}/v1/models?limit=1`, { timeoutMs });
    return true;
  } catch {
    // A key that cannot list models may still draw (scoped keys): presence
    // of the key is the reachability claim, discovery is best-effort.
    return true;
  }
}

export async function refreshAnthropicModels({ force = false, timeoutMs = 8000 } = {}) {
  const now = Date.now();
  if (!force && _models.size && now - _modelsTs < ANTHROPIC_MODELS_CACHE_MS) return _models;
  const found = new Set();
  for (const id of explicitModelIds()) {
    if (allowedByDoor(id) && !excludedByDeadList(id)) found.add(id);
  }
  if (!anthropicConfigured()) {
    _models = found;
    _modelsTs = now;
    return _models;
  }
  try {
    const listed = await fetchJson(`${ANTHROPIC_URL}/v1/models?limit=100`, { timeoutMs });
    for (const m of listed?.data ?? []) {
      const id = String(m?.id ?? "").trim();
      if (!id) continue;
      if (allowedByDoor(id) && !excludedByDeadList(id)) found.add(id);
    }
  } catch {
    // Discovery failing never empties the explicit list mid-turn.
  }
  _models = found;
  _modelsTs = now;
  return _models;
}

export function knownAnthropicModels() {
  // The explicit list is known even before the first discovery refresh, so a
  // freshly-booted proxy with a key already routes (the preflight warms the
  // cache; this seeds it for the hot path's first turn).
  if (anthropicConfigured()) {
    for (const id of explicitModelIds()) {
      if (allowedByDoor(id) && !excludedByDeadList(id)) _models.add(id);
    }
  }
  return new Set(_models);
}

// upstreamAnthropicModelFor(model) — the lane decision. The stripped id names
// this lane when the key is present AND the id passes the door (Claude ids by
// default) AND is either discovered or explicitly listed. Bare `claude-x` ids
// are normalized to `anthropic/claude-x` for the roster; the API itself gets
// the bare id. Reads the cache only — never fetches — so the hot draw path
// cannot block on discovery; the runner preflights first.
export function upstreamAnthropicModelFor(model) {
  if (!anthropicConfigured()) return null;
  const stripped = _stripEr7(model);
  if (!stripped) return null;
  const apiId = anthropicApiModelId(stripped);
  if (!apiId || !allowedByDoor(apiId) && !allowedByDoor(stripped)) return null;
  if (excludedByDeadList(apiId) || excludedByDeadList(stripped)) return null;
  // Known = discovered OR explicit. An undiscovered-but-door-passing Claude id
  // still routes (keys with no models:list scope must work): the API itself
  // is the final arbiter and its 404 is honest.
  const known = _models.has(stripped) || _models.has(apiId);
  if (!known && !allowedByDoor(apiId)) return null;
  return { providerID: "anthropic", modelID: apiId };
}

// ── the draw ------------------------------------------------------------------
// Ollama-format messages → the Anthropic wire: system turns become `system`,
// user/assistant turns keep their roles in order. Consecutive same-role turns
// are merged (the API rejects role repeats); anything else is dropped.
export function toAnthropicMessages(messages) {
  const system = [];
  const turns = [];
  for (const m of messages ?? []) {
    const text = String(m?.content ?? "");
    if (!text) continue;
    if (m?.role === "system") system.push(text);
    else if (m?.role === "assistant" || m?.role === "user") {
      const last = turns[turns.length - 1];
      if (last && last.role === m.role) last.content += `\n\n${text}`;
      else turns.push({ role: m.role, content: text });
    }
  }
  if (!turns.length || turns[0].role !== "user") {
    // The API requires a user turn first: a leading assistant turn (a prompt
    // that opens with history) is folded into the first user turn.
    const firstUser = turns.findIndex((t) => t.role === "user");
    if (firstUser < 0) return { system: system.join("\n\n") || undefined, messages: null };
    const head = turns.slice(0, firstUser).map((t) => `${t.role}: ${t.content}`).join("\n\n");
    turns[firstUser].content = head ? `${head}\n\n${turns[firstUser].content}` : turns[firstUser].content;
    turns.splice(0, firstUser);
  }
  return {
    system: system.join("\n\n") || undefined,
    messages: turns.map((t) => ({ role: t.role, content: t.content })),
  };
}

async function* readSse(res, signal) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let closed = false;
  try {
    while (true) {
      if (signal?.aborted) throw new Error("cancelled");
      let read;
      try {
        read = await reader.read();
      } catch (err) {
        if (closed) return;
        throw err;
      }
      const { done, value } = read;
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n\n")) !== -1) {
        const block = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        let type = null;
        const datas = [];
        for (const line of block.split("\n")) {
          if (line.startsWith("event:")) type = line.slice(6).trim();
          else if (line.startsWith("data:")) datas.push(line.slice(5).trim());
        }
        if (!datas.length) continue;
        const raw = datas.join("\n");
        let data = null;
        try { data = JSON.parse(raw); } catch { continue; }
        yield { type: type ?? data?.type ?? null, data };
      }
    }
  } finally {
    closed = true;
    try { await reader.cancel(); } catch { /* already closed */ }
  }
}

export async function* streamAnthropicText(
  { modelID },
  messages,
  { maxTokens = 1024, kelsen = null, signal = null, onNote = null, timeoutMs = ANTHROPIC_TIMEOUT_MS } = {},
) {
  if (!modelID) throw new Error("streamAnthropicText: modelID required");
  if (!anthropicConfigured()) throw new Error("streamAnthropicText: ANTHROPIC_API_KEY is not set");
  const { system, messages: anthropicMessages } = toAnthropicMessages(messages);
  if (!anthropicMessages?.length) throw new Error("streamAnthropicText: empty prompt");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const onAbort = () => ctrl.abort();
  if (signal) {
    if (signal.aborted) throw new Error("aborted");
    signal.addEventListener("abort", onAbort, { once: true });
  }
  let res = null;
  try {
    const pctrl = new AbortController();
    const ptimer = setTimeout(() => pctrl.abort(), 30000);
    // The caller's abort (disconnect/deadline) must also kill the setup
    // fetch, not just the stream below.
    const onSetupAbort = () => pctrl.abort();
    if (signal) signal.addEventListener("abort", onSetupAbort, { once: true });
    try {
      res = await fetch(`${ANTHROPIC_URL}/v1/messages`, {
        method: "POST",
        headers: anthropicHeaders(),
        signal: pctrl.signal,
        body: JSON.stringify({
          model: modelID,
          max_tokens: maxTokens,
          ...(system ? { system } : {}),
          messages: anthropicMessages,
          stream: true,
          // KELSEN-DEGREES → temperature, the same mapping the Ollama lane
          // uses (bound = cold, free = warm), so one gauge steers every mouth.
          ...(kelsen == null ? {} : { temperature: 0.1 + (1 - kelsen) * 0.8 }),
        }),
      });
    } finally {
      clearTimeout(ptimer);
      if (signal) signal.removeEventListener("abort", onSetupAbort);
    }
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`anthropic ${res.status} ${errText.slice(0, 200)}`.trim());
    }
  } catch (err) {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onAbort);
    throw err;
  }

  // REAL usage, straight off the wire: message_start carries the input side
  // (incl. prompt-cache split), message_delta the output side. Nothing here
  // is estimated — this is what makes the frontier comparison measurable.
  let inputTokens = 0, cacheCreation = 0, cacheRead = 0, outputTokens = 0;
  let emittedChars = 0;
  const doneChunk = (truncated) => ({
    done: true,
    truncated,
    prompt_eval_count: inputTokens,
    eval_count: outputTokens || Math.ceil(emittedChars / 4),
    cacheCreation,
    cacheRead,
    cost: null, // the API reports tokens, never dollars — cost stays unknown
    estimated: false, // the server's own counters, never chars/4
  });
  try {
    for await (const { type, data } of readSse(res, signal ?? ctrl.signal)) {
      if (type === "message_start") {
        const u = data?.message?.usage ?? {};
        if (Number.isFinite(Number(u.input_tokens))) inputTokens = Number(u.input_tokens);
        if (Number.isFinite(Number(u.cache_creation_input_tokens))) cacheCreation = Number(u.cache_creation_input_tokens);
        if (Number.isFinite(Number(u.cache_read_input_tokens))) cacheRead = Number(u.cache_read_input_tokens);
        continue;
      }
      if (type === "content_block_delta") {
        const piece = data?.delta?.text ?? "";
        if (piece) {
          emittedChars += piece.length;
          if (emittedChars / 4 > maxTokens + 4096) {
            // Backstop, not the budget: max_tokens already bounds the server.
            // This only fires if the wire misbehaves.
            yield doneChunk(true);
            return;
          }
          yield piece;
        }
        continue;
      }
      if (type === "message_delta") {
        const u = data?.usage ?? {};
        if (Number.isFinite(Number(u.output_tokens))) outputTokens = Number(u.output_tokens);
        continue;
      }
      if (type === "message_stop") {
        yield doneChunk(false);
        return;
      }
      if (type === "error" || data?.type === "error") {
        const msg = data?.error?.message ?? "unknown anthropic error";
        throw new Error(`anthropic: ${String(msg).slice(0, 200)}`);
      }
    }
    // Stream ended without message_stop: complete ONLY if text was emitted.
    if (emittedChars > 0) {
      yield doneChunk(false);
    } else {
      throw new Error("anthropic: event stream ended with no text and no stop");
    }
  } finally {
    clearTimeout(timer);
    try { ctrl.abort(); } catch { /* already closed */ }
    if (signal) signal.removeEventListener("abort", onAbort);
    try { await res?.body?.cancel?.(); } catch { /* already closed */ }
  }
}
