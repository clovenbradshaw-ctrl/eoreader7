// proxy-client.mjs — thin HTTP client onto er7-proxy.mjs's server (proxy.mjs).
//
// This is the ONLY module in the TUI that talks to the fold proxy. It does
// not reimplement isUp()/start() — those come straight from er7-proxy.mjs
// so "the TUI starts the proxy" and "er7-proxy start" are the exact same
// code path, never two implementations that can drift.
//
// Grounded chat (mode: "chat" in a tab) goes through here, non-streaming
// (stream: false) even though proxy.mjs's own /v1/chat/completions CAN
// stream token-by-token for a plain answer (see proxy-runner.mjs's draw()).
// Disclosed design choice, not an oversight: the fold's own documented
// scope (the-fold/CLAUDE.md, "the model proxy") states streaming is meant
// to be single-shot — a draft must not be shown before the grounding/
// correction pass has run against it — and post-processing can still
// rewrite fullText after the raw stream finishes, so an SSE relay here
// could show text that the final answer later disagrees with. Simpler and
// honest: one request, one wait, a "thinking…" spinner, one answer.

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
const RETRYABLE_TYPES = new Set(["saturated", "lane_full"]);
export const CHAT_MAX_RETRIES = 5;

async function postChatCompletion(headers, payload) {
  const res = await fetch(`${BASE}/v1/chat/completions`, { method: "POST", headers, body: JSON.stringify(payload) });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

/**
 * POST /v1/chat/completions, non-streaming. `history` is the prior turns of
 * THIS tab ([{role:'user'|'assistant', content}]); `task` is the newest
 * user message. sessionId sticks the conversation to one accumulating
 * reader fold on the proxy's side (see proxy.mjs sessionIdFromHeaders) —
 * the proxy's own persistence, not anything this client tracks.
 *
 * `onRetry({ attempt, retryAfterS, type })` is called before each backoff
 * wait, so a caller like the TUI can show "family busy, retrying in Ns…"
 * instead of the request just appearing to hang.
 */
export async function chatCompletion({ model, history = [], task, sessionId, workspace, onRetry }) {
  const messages = [...history, { role: "user", content: task }];
  const headers = { "content-type": "application/json" };
  if (sessionId) headers["x-er7-session"] = sessionId;
  if (workspace) headers["x-er7-workspace"] = workspace;
  const payload = { model: withPrefix(model), messages, stream: false };

  let attempt = 0;
  for (;;) {
    const { res, body } = await postChatCompletion(headers, payload);
    if (res.ok) {
      return { text: body?.choices?.[0]?.message?.content ?? "", reading: body?.reading ?? null };
    }
    const type = body?.error?.type;
    if (res.status === 429 && RETRYABLE_TYPES.has(type) && attempt < CHAT_MAX_RETRIES) {
      attempt += 1;
      const retryAfterS = Number(body?.error?.retry_after ?? res.headers.get("retry-after") ?? 2);
      onRetry?.({ attempt, retryAfterS, type });
      await new Promise((r) => setTimeout(r, retryAfterS * 1000));
      continue;
    }
    throw new Error(body?.error?.message || `POST /v1/chat/completions: ${res.status}`);
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
  for (;;) {
    const res = await fetch(`${BASE}/v1/agent`, { method: "POST", headers, body: JSON.stringify(payload) });
    const body = await res.json().catch(() => ({}));
    if (res.ok) return body; // { done, answer, rounds, files }
    // /v1/agent's error shape is FLAT ({error, type, retry_after}), matching
    // /v1/code's own convention — NOT chatCompletion's nested {error:{...}}
    // shape. Two different response shapes on two sibling routes, kept as
    // each route's own file already had it rather than silently unified.
    const type = body?.type;
    if (res.status === 429 && RETRYABLE_TYPES.has(type) && attempt < CHAT_MAX_RETRIES) {
      attempt += 1;
      const retryAfterS = Number(body?.retry_after ?? res.headers.get("retry-after") ?? 2);
      onRetry?.({ attempt, retryAfterS, type });
      await new Promise((r) => setTimeout(r, retryAfterS * 1000));
      continue;
    }
    throw new Error(typeof body?.error === "string" ? body.error : `POST /v1/agent: ${res.status}`);
  }
}
