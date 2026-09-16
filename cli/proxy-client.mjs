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

/**
 * POST /v1/chat/completions, non-streaming. `history` is the prior turns of
 * THIS tab ([{role:'user'|'assistant', content}]); `task` is the newest
 * user message. sessionId sticks the conversation to one accumulating
 * reader fold on the proxy's side (see proxy.mjs sessionIdFromHeaders) —
 * the proxy's own persistence, not anything this client tracks.
 */
export async function chatCompletion({ model, history = [], task, sessionId, workspace }) {
  const messages = [...history, { role: "user", content: task }];
  const headers = { "content-type": "application/json" };
  if (sessionId) headers["x-er7-session"] = sessionId;
  if (workspace) headers["x-er7-workspace"] = workspace;
  const res = await fetch(`${BASE}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model: withPrefix(model), messages, stream: false }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error?.message || `POST /v1/chat/completions: ${res.status}`);
  }
  return {
    text: body?.choices?.[0]?.message?.content ?? "",
    reading: body?.reading ?? null,
  };
}
