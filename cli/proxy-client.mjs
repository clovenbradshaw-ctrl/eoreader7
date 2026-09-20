// proxy-client.mjs — thin HTTP client onto er7-proxy.mjs's server (proxy.mjs).
//
// This is the ONLY module in the TUI that talks to the fold proxy. It does
// not reimplement isUp()/start() — those come straight from er7-proxy.mjs
// so "the TUI starts the proxy" and "er7-proxy start" are the exact same
// code path, never two implementations that can drift.
//
// Grounded chat (mode: "chat" in a tab) streams token-by-token when the
// caller passes onToken (stream: true on the wire — proxy.mjs's own SSE
// path, the same one er7-client.mjs::chatStream and the-fold's browser
// chat draw LIVE from). Without onToken the call stays one-shot
// (stream: false) with the "thinking…" spinner: one request, one wait,
// one answer.
//
// Honesty note on what streams: the SSE deltas are runProxyTurn's own
// composition chunks (proxy.mjs wires its emit straight into
// runProxyTurn's onToken), i.e. the grounded pipeline's text as it is
// drawn — not a pre-grounding draft. A small post-process pass (code
// lint/reorder, answer fixups) can still touch up fullText after the raw
// stream; the streamed text IS the answer every other live surface shows,
// and the TUI reconciles it at DONE time (stripCitationAppendix + the
// final reading/model envelope) rather than holding everything back.

import { isUp, start, PORT } from "./er7-proxy.mjs";

const BASE = `http://127.0.0.1:${PORT}`;
const MODEL_PREFIX = "er7:";

export { isUp };

/** Boots the proxy the same way `er7-proxy start` does, if it is not
 * already up. Returns the same shape start() returns, plus `wasUp`. */
export async function ensureRunning() {
  if (isUp()) return { wasUp: true, started: false, alreadyRunning: true, port: PORT };
  const res = await start({ quiet: true });
  return { wasUp: false, ...res };
}

export function stripPrefix(modelId) {
  return modelId?.startsWith(MODEL_PREFIX) ? modelId.slice(MODEL_PREFIX.length) : modelId;
}

export function withPrefix(realName) {
  return realName?.startsWith(MODEL_PREFIX) ? realName : `${MODEL_PREFIX}${realName}`;
}

/** GET /v1/models — the real, currently-pulled Ollama roster, er7-prefixed.
 * Never hardcode a model name: this is what makes /model tab-completion
 * (and the startup default) honest about what will actually answer. */
export async function listModels() {
  const res = await fetch(`${BASE}/v1/models`);
  if (!res.ok) throw new Error(`GET /v1/models: ${res.status} ${await res.text().catch(() => "")}`);
  const body = await res.json();
  return (body.data ?? []).map((m) => m.id);
}

/** GET /heimdall — the admission gate's own disclosure: how busy the box is
 *  and where a caller sits in the queue. Returns the queue disclosure
 *  ({ workAhead, perTurnMs, etaMs, etaHuman }) or null if the gate is not
 *  answering. A caller waiting on a turn can show "Heimdall: N ahead · ~Xs"
 *  instead of a silent spinner. */
export async function heimdallQueue() {
  try {
    const res = await fetch(`${BASE}/heimdall`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const body = await res.json();
    return body?.disclosure?.queue ?? null;
  } catch {
    return null;
  }
}

/** GET /v1/sessions — the surface to SEE sessions: every live reader fold on
 *  the proxy, newest first (sessionId, turnCount, lastChatText, model, mode,
 *  age). Reuse a sessionId (x-er7-session) to keep one accumulating fold. */
export async function listSessions() {
  try {
    const res = await fetch(`${BASE}/v1/sessions`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { count: 0, sessions: [] };
    return await res.json();
  } catch {
    return { count: 0, sessions: [] };
  }
}

/** The proxy's disclosed model state (GET /heimdall): modelQuirks (a quirk
 *  that says a model "hangs" is why it must never be the default — smollm2
 *  literally never answers on the system role) and the RESIDENT models
 *  (ollamaModels — already loaded, so a request starts immediately instead of
 *  a cold load that can take minutes under load). Returns
 *  { quirks, resident } (resident = bare model names, e.g. "gemma2:2b"). */
export async function heimdallModelQuirks() {
  try {
    const res = await fetch(`${BASE}/heimdall`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { quirks: {}, resident: [] };
    const body = await res.json();
    return {
      quirks: body?.modelQuirks ?? {},
      resident: (body?.ollamaModels ?? []).map((m) => m?.name).filter(Boolean),
    };
  } catch {
    return { quirks: {}, resident: [] };
  }
}

export function modelHangs(quirks, modelId) {
  const q = quirks?.[stripPrefix(modelId)] ?? {};
  return q?.systemRole === "hangs" || /hang/i.test(q?.note ?? "");
}

// heimdall's admission gate (../heimdall.mjs::admitChat) refuses a request
// with a TYPED, RETRYABLE 429 — "saturated" (the box) or "lane_full" (the
// model family's own concurrency cap, 1 by default) — carrying retry_after
// seconds in both the body and the Retry-After header. That refusal exists
// specifically so a well-behaved caller backs off and tries again; heimdall
// itself does not retry on a caller's behalf (it has no notion of "this
// request still matters"), so a client that just throws on the first 429
// turns an ordinary, expected, momentary capacity wait into a hard error
// for something as small as two messages landing a few hundred ms apart.
// This is that backoff, bounded so a genuinely wedged proxy still surfaces
// a real error rather than retrying forever.
//
// The queue refusals ("not_your_turn", "zipper", "claimed") are the SAME
// retryable family: a turn waits its place in line. The budget is TIME, not
// a small attempt count — a queue ETA of minutes must not die at 75 seconds
// (a real, found failure: every request gave up before it was ever served).
const RETRYABLE_TYPES = new Set(["saturated", "lane_full", "not_your_turn", "zipper", "claimed"]);
export const CHAT_MAX_RETRIES = 40; // headroom figure; the real gate is QUEUE_MAX_WAIT_MS
const QUEUE_MAX_WAIT_MS = Number(process.env.ER7_QUEUE_MAX_WAIT ?? 10 * 60 * 1000);

async function waitRetry(res, body, attempt, onRetry) {
  const type = body?.error?.type;
  const queue = body?.error?.queue ?? body?.queue ?? null;
  const retryAfterS = Number(body?.error?.retry_after ?? res.headers.get("retry-after") ?? 2);
  onRetry?.({ attempt, retryAfterS, type, position: queue?.position ?? null, etaHuman: queue?.etaHuman ?? null });
  await new Promise((r) => setTimeout(r, Math.max(1, retryAfterS) * 1000));
}

async function postChatCompletion(headers, payload) {
  const res = await fetch(`${BASE}/v1/chat/completions`, { method: "POST", headers, body: JSON.stringify(payload) });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

/**
 * POST /v1/chat/completions. `history` is the prior turns of THIS tab
 * ([{role:'user'|'assistant', content}]); `task` is the newest user
 * message. sessionId sticks the conversation to one accumulating reader
 * fold on the proxy's side (see proxy.mjs sessionIdFromHeaders) — the
 * proxy's own persistence, not anything this client tracks.
 *
 * `onRetry({ attempt, retryAfterS, type })` is called before each backoff
 * wait, so a caller like the TUI can show "family busy, retrying in Ns…"
 * instead of the request just appearing to hang.
 *
 * `onToken(delta)` turns the call into a live stream (stream: true on the
 * wire, SSE parsed incrementally — the transcript updates in real time
 * instead of waiting for the whole answer). `onThinking(text)` receives
 * the reading-pipeline's reasoning_content notes when the proxy emits
 * them. Both are optional; without onToken the call is one-shot
 * (stream: false). Either way the resolved value is the same shape:
 * { text, reading, model }.
 */
export async function chatCompletion({ model, history = [], task, sessionId, workspace, onRetry, onToken, onThinking }) {
  const messages = [...history, { role: "user", content: task }];
  const headers = { "content-type": "application/json" };
  if (sessionId) headers["x-er7-session"] = sessionId;
  if (workspace) headers["x-er7-workspace"] = workspace;
  if (typeof onToken === "function") {
    return chatCompletionStream({ model, messages, headers, onRetry, onToken, onThinking });
  }
  const payload = { model: withPrefix(model), messages, stream: false };

  let attempt = 0;
  const t0 = Date.now();
  for (;;) {
    const { res, body } = await postChatCompletion(headers, payload);
    if (res.ok) {
      return { text: body?.choices?.[0]?.message?.content ?? "", reading: body?.reading ?? null, model: body?.model ?? null };
    }
    const type = body?.error?.type;
    if (res.status === 429 && RETRYABLE_TYPES.has(type) && Date.now() - t0 < QUEUE_MAX_WAIT_MS) {
      attempt += 1;
      await waitRetry(res, body, attempt, onRetry);
      continue;
    }
    throw new Error(body?.error?.message || `POST /v1/chat/completions: ${res.status}`);
  }
}

/**
 * POST /v1/chat/completions with stream: true — SSE parsed incrementally
 * so the caller can paint each content delta live. The retry contract is
 * honored BEFORE the stream opens (a 429 is still JSON, never SSE); once
 * the 200 event-stream is open the turn is being served and the body is
 * drained to [DONE]. The final envelope chunk carries the same
 * { reading, model } the one-shot path returns, so streaming and
 * non-streaming resolve to the same shape.
 */
export async function chatCompletionStream({ model, messages, headers = {}, onRetry, onToken, onThinking }) {
  const payload = { model: withPrefix(model), messages, stream: true };
  const reqHeaders = { "content-type": "application/json", ...headers };
  let attempt = 0;
  const t0 = Date.now();
  for (;;) {
    const res = await fetch(`${BASE}/v1/chat/completions`, { method: "POST", headers: reqHeaders, body: JSON.stringify(payload) });
    const contentType = res.headers.get("content-type") ?? "";
    if (!res.ok || !contentType.includes("text/event-stream")) {
      const body = await res.json().catch(() => ({}));
      const type = body?.error?.type;
      if (res.status === 429 && RETRYABLE_TYPES.has(type) && Date.now() - t0 < QUEUE_MAX_WAIT_MS) {
        attempt += 1;
        await waitRetry(res, body, attempt, onRetry);
        continue;
      }
      throw new Error(body?.error?.message || `POST /v1/chat/completions: ${res.status}`);
    }
    // The stream is open — drain it to [DONE], forwarding content deltas
    // live and capturing the final envelope (reading + answering model).
    let full = "";
    let reading = null;
    let answerModel = null;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop();
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        let chunk;
        try { chunk = JSON.parse(data); } catch { continue; }
        if (chunk?.model) answerModel = chunk.model;
        if (chunk?.reading) reading = chunk.reading;
        const delta = chunk?.choices?.[0]?.delta ?? {};
        if (typeof delta.content === "string" && delta.content) {
          full += delta.content;
          try { onToken?.(delta.content); } catch { /* a UI paint must never kill the stream */ }
        }
        if (typeof delta.reasoning_content === "string" && delta.reasoning_content) {
          try { onThinking?.(delta.reasoning_content); } catch { /* same — notes are advisory */ }
        }
      }
    }
    return { text: full, reading, model: answerModel };
  }
}

/**
 * POST /v1/agent — the open-ended coding loop (native/the-fold/
 * sandboxed-agent.js), over the SAME proxy every other request uses. Runs
 * server-side, in a sandbox (an in-memory virtual filesystem, JS executed
 * in a severed vm.Context — never the real disk, never a real process) —
 * this client function is a thin HTTP call, same shape as chatCompletion,
 * also honoring heimdall's retry contract the identical way.
 */
export async function agentCompletion({ model, task, sessionId, maxTurns, onRetry }) {
  const headers = { "content-type": "application/json" };
  // /v1/agent (like its sibling /v1/code) expects the BARE model name,
  // never the er7: prefix — a real, found-live mismatch: /v1/chat/
  // completions strips the prefix server-side (parseProxyRequest's own
  // stripModelPrefix); /v1/agent and /v1/code never do, so a prefixed name
  // reached Ollama unstripped and came back a plain "ollama 400".
  const payload = { model: stripPrefix(model), task, sessionId, maxTurns };
  let attempt = 0;
  const t0 = Date.now();
  for (;;) {
    const res = await fetch(`${BASE}/v1/agent`, { method: "POST", headers, body: JSON.stringify(payload) });
    const body = await res.json().catch(() => ({}));
    if (res.ok) return body; // { done, answer, rounds, files }
    // /v1/agent's error shape is FLAT ({error, type, retry_after}), matching
    // /v1/code's own convention — NOT chatCompletion's nested {error:{...}}
    // shape. Two different response shapes on two sibling routes, kept as
    // each route's own file already had it rather than silently unified.
    const type = body?.type;
    if (res.status === 429 && RETRYABLE_TYPES.has(type) && Date.now() - t0 < QUEUE_MAX_WAIT_MS) {
      attempt += 1;
      const queue = body?.queue ?? null;
      const retryAfterS = Number(body?.retry_after ?? res.headers.get("retry-after") ?? 2);
      onRetry?.({ attempt, retryAfterS, type, position: queue?.position ?? null, etaHuman: queue?.etaHuman ?? null });
      await new Promise((r) => setTimeout(r, Math.max(1, retryAfterS) * 1000));
      continue;
    }
    throw new Error(typeof body?.error === "string" ? body.error : `POST /v1/agent: ${res.status}`);
  }
}

/**
 * POST /v1/swarm — explicit swarm dispatch (swarm-server.mjs, wired).
 * No model call and no Heimdall admission: pure organ reads, so no
 * retry loop — a failure is a real error, never a capacity wait.
 * Returns the report { routed, mode, pointed, best, ants, answer }.
 */
export async function swarmCompletion({ task, text, attachments, name, query, claim }) {
  const headers = { "content-type": "application/json" };
  const payload = { task, text, attachments, name, query, claim };
  const res = await fetch(`${BASE}/v1/swarm`, { method: "POST", headers, body: JSON.stringify(payload) });
  const body = await res.json().catch(() => ({}));
  if (res.ok) return body;
  throw new Error(typeof body?.error === "string" ? body.error : `POST /v1/swarm: ${res.status}`);
}
