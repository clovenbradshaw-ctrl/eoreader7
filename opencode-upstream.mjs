// opencode-upstream.mjs — the opencode server as a second mouth.
//
// The proxy's models are named `er7:<real>`; most `<real>` ids are Ollama tags
// served at ER7_OLLAMA_URL. But a caller may name a model the opencode server
// serves instead (e.g. `anthropic/claude-sonnet-4-6` via the user's opencode
// auth) — those ids are NOT in Ollama, so the Ollama path would 404. This
// module is the other lane: generation through `opencode serve`'s HTTP API
// (opencode.ai/docs/server), verified against @opencode-ai/sdk 1.18.x types.
//
// A draw here is ONE ephemeral session per call, deleted afterwards:
//   POST /session { title }            -> { id } (a set title skips auto-title)
//   GET  /event                        -> SSE, opened BEFORE the prompt so no
//                                          delta is missed
//   POST /session/{id}/prompt_async    -> 204, the reply streams as
//                                          `message.part.updated` deltas until
//                                          `session.idle` for our session
//   DELETE /session/{id}               -> cleanup, best-effort, never fatal
//
// THE MOUTH IS PURE TEXT — NO TOOLS, EVER. The runner's contract is a text
// draw: the model answers, it never acts. An agentic loop with tools enabled
// could edit files or run shell commands as a side effect of a READING turn,
// so three independent bars hold, in order:
//   1. EVERY tool id the server reports (GET /experimental/tool/ids) is
//      passed `false` in the prompt's `tools` map — the model is never even
//      offered a tool to call.
//   2. The session runs with `directory` set to a fresh empty temp dir, so a
//      relative file tool has no workspace to touch even if (1) missed one.
//   3. A watchdog watches the event stream: any `tool` part or
//      `permission.updated` event for our session aborts the session and
//      FAILS the draw closed (throw, never partial text) — a side effect may
//      not ride home inside an answer.
// If (1) cannot even enumerate the tools (unknown server version), the draw
// still proceeds on bars (2)+(3): best-effort disable list plus fail-closed
// watchdog. Nothing here is silent: every bar reports on `onNote`.
//
// Token budget: opencode takes no max_tokens, so the HARD CAP is enforced
// client-side — accumulated chars/4 past maxTokens aborts the session and the
// draw reports truncated, exactly the discipline streamOllamaChat keeps ("the
// tip of consciousness must not loop").
//
// USAGE, REAL — NOT ESTIMATED. The server reports per-message usage on
// `message.updated` (AssistantMessage.tokens { input, output, reasoning,
// cache: { read, write } } + cost), and the draw carries the last assistant
// message's numbers on its terminal { done } chunk: prompt_eval_count=input,
// eval_count=output, plus reasoningTokens/cacheRead/cacheWrite/cost. The
// chars/4 estimate survives ONLY as the live budget tripwire and as the
// fallback when a server never sends usage. After a natural finish the draw
// also feeds its own account back INTO opencode (POST /log, best-effort) —
// the ephemeral session is deleted, but its usage stays on the server's log.
//
// Model discovery: GET /provider -> { all: [{ id, models: {...} }],
// connected: [ids] }. A stripped model id belongs to this lane when it names
// a model of a CONNECTED provider. Cached for OPENCODE_MODELS_CACHE_MS; the
// runner's preflight and the /v1/models handler refresh it, the hot draw path
// only reads the cache (never blocks a turn on discovery).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const OPENCODE_URL = (process.env.ER7_OPENCODE_URL ?? "http://127.0.0.1:4096").replace(/\/+$/, "");
export const OPENCODE_ON = (process.env.ER7_OPENCODE ?? "1") !== "0";
export const OPENCODE_TIMEOUT_MS = Number(process.env.ER7_OPENCODE_TIMEOUT_MS ?? 290000);
export const OPENCODE_MODELS_CACHE_MS = Number(process.env.ER7_OPENCODE_MODELS_CACHE_MS ?? 60000);
// AUTH: `opencode serve` answers 401 when OPENCODE_SERVER_PASSWORD is set in
// its environment (basic auth, user `opencode` unless overridden). The proxy
// runs in that same environment, so it presents the same credentials —
// without this every call to the lane 401s. Absent password = no header.
function opencodeAuthHeader() {
  const pw = process.env.OPENCODE_SERVER_PASSWORD;
  if (!pw) return {};
  const user = process.env.OPENCODE_SERVER_USERNAME ?? "opencode";
  return { authorization: `Basic ${Buffer.from(`${user}:${pw}`).toString("base64")}` };
}
// THE NARROW DOOR (2026-09-17): only Claude and DeepSeek models ride this
// lane for now — everything else stays on Ollama even if the opencode server
// could serve it. Substring match on the full `providerID/modelID`, so it
// also covers Claude/DeepSeek via aggregators (openrouter, copilot, ...).
// ER7_OPENCODE_ALLOW widens it later ("*" = every connected model).
const OPENCODE_ALLOW = String(process.env.ER7_OPENCODE_ALLOW ?? "claude,deepseek")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
function allowedByDoor(id) {
  if (OPENCODE_ALLOW.includes("*")) return true;
  const low = String(id ?? "").toLowerCase();
  return OPENCODE_ALLOW.some((sub) => low.includes(sub));
}

// Best-effort disable list when /experimental/tool/ids is unreachable
// (older server): the built-in opencode 1.x tool ids. The watchdog below is
// the real guarantee; this list only keeps the model from TRYING.
const FALLBACK_TOOL_IDS = [
  "bash", "edit", "read", "write", "glob", "grep", "list", "patch",
  "todowrite", "todoread", "webfetch", "websearch", "task", "codesearch",
  "diagnostics", "multiedit",
];

async function fetchJson(url, { method = "GET", body = null, timeoutMs = 8000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json", ...opencodeAuthHeader() },
      signal: ctrl.signal,
      ...(body === null ? {} : { body: JSON.stringify(body) }),
    });
    if (!res.ok) throw new Error(`opencode ${method} ${url.replace(OPENCODE_URL, "")}: ${res.status}`);
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } finally {
    clearTimeout(timer);
  }
}

export async function opencodeReachable({ timeoutMs = 3000 } = {}) {
  if (!OPENCODE_ON) return false;
  try {
    const health = await fetchJson(`${OPENCODE_URL}/global/health`, { timeoutMs });
    return health?.healthy !== false;
  } catch {
    return false;
  }
}

// ── model discovery ---------------------------------------------------------
let _models = new Set();
let _modelsTs = 0;

function fullModelIds(providerId, models) {
  const out = [];
  for (const [key, m] of Object.entries(models ?? {})) {
    if (String(key).includes("/")) out.push(String(key));
    else out.push(`${providerId}/${key}`);
    if (m?.id && String(m.id).includes("/")) out.push(String(m.id));
  }
  return out;
}

export async function refreshOpencodeModels({ force = false, timeoutMs = 8000 } = {}) {
  const now = Date.now();
  if (!force && _models.size && now - _modelsTs < OPENCODE_MODELS_CACHE_MS) return _models;
  if (!OPENCODE_ON) { _models = new Set(); _modelsTs = now; return _models; }
  try {
    const prov = await fetchJson(`${OPENCODE_URL}/provider`, { timeoutMs });
    const connected = new Set(prov?.connected ?? []);
    const found = new Set();
    for (const p of prov?.all ?? []) {
      if (!connected.has(p?.id)) continue;
      // The narrow door is applied at DISCOVERY, not just at routing: the
      // /v1/models roster only ever offers what this lane may serve.
      for (const id of fullModelIds(p.id, p?.models)) {
        if (allowedByDoor(id)) found.add(id);
      }
    }
    _models = found;
    _modelsTs = now;
    return _models;
  } catch {
    // A failed refresh never empties a warm cache mid-turn; it only stamps it
    // so the next turn retries. Discovery failing closed would flap the lane.
    _modelsTs = now;
    return _models;
  }
}

export function knownOpencodeModels() {
  return new Set(_models);
}

const stripPrefix = (model) => String(model ?? "").replace(/^er7:/, "");

// upstreamModelFor(model) — the lane decision. Returns { providerID, modelID }
// when the stripped id names a model of a CONNECTED opencode provider AND
// passes the narrow door (Claude/DeepSeek only, for now), else null (the
// Ollama lane owns it). Reads the cache only — never fetches — so the hot
// draw path cannot block on discovery; the runner preflights first.
export function upstreamModelFor(model) {
  if (!OPENCODE_ON) return null;
  const id = stripPrefix(model);
  if (!id || !_models.has(id)) return null;
  if (!allowedByDoor(id)) return null;
  const slash = id.indexOf("/");
  if (slash < 1) return null;
  return { providerID: id.slice(0, slash), modelID: id.slice(slash + 1) };
}

// ── the draw ----------------------------------------------------------------
// Convert Ollama-format chat messages to one opencode user message: system
// turns become the `system` prompt, the rest join in order into a single text
// part (a prompt_async call carries ONE user message; prior assistant turns
// ride as their own verbatim prose, which is exactly the continuation thread).
function toOpencodePrompt(messages) {
  const system = [];
  const turns = [];
  for (const m of messages ?? []) {
    const text = String(m?.content ?? "");
    if (!text) continue;
    if (m?.role === "system") system.push(text);
    else turns.push(text);
  }
  return { system: system.join("\n\n") || undefined, text: turns.join("\n\n") };
}

async function toolDisableMap({ timeoutMs = 8000, onNote = null } = {}) {
  let ids = null;
  try {
    const res = await fetchJson(`${OPENCODE_URL}/experimental/tool/ids`, { timeoutMs });
    if (Array.isArray(res)) ids = res;
    else if (Array.isArray(res?.ids)) ids = res.ids;
    else if (res && typeof res === "object") ids = Object.keys(res);
  } catch (err) {
    if (onNote) onNote({ move: "opencode_tool_ids_fallback", error: String(err?.message ?? err) });
  }
  if (!ids?.length) ids = FALLBACK_TOOL_IDS;
  return Object.fromEntries(ids.map((id) => [String(id), false]));
}

function sandboxDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "er7-opencode-"));
  return dir;
}

// Tolerant SSE reader: standard `event:`/`data:` blocks, falling back to bare
// JSON lines. Resolves events as { type, data }.
//
// TEARDOWN RACE (2026-09-17, measured): when the consumer is done (idle seen,
// terminal chunk yielded) it closes this generator while a `reader.read()`
// is still in flight; cancelling then rejects the pending read with undici's
// `TypeError: terminated` — into NOBODY, i.e. an unhandled rejection that
// kills the whole proxy process. So the loop runs under a `closed` flag the
// finally sets before cancelling: a rejection after close is the teardown
// itself, swallowed; a rejection mid-stream (server actually died) still
// throws to the caller, which retries the draw.
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
          else if (line.trim()) datas.push(line.trim());
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

export async function* streamOpencodeText(
  { providerID, modelID },
  messages,
  { maxTokens = 1024, title = "er7 mouth", signal = null, onNote = null, timeoutMs = OPENCODE_TIMEOUT_MS } = {},
) {
  if (!providerID || !modelID) throw new Error("streamOpencodeText: providerID/modelID required");
  const { system, text } = toOpencodePrompt(messages);
  if (!text.trim()) throw new Error("streamOpencodeText: empty prompt");

  // Bar 2 first: the sandbox exists before any session does.
  const dir = sandboxDir();
  const tools = await toolDisableMap({ onNote });
  if (onNote) onNote({ move: "opencode_tools_disabled", count: Object.keys(tools).length, dir });

  const session = await fetchJson(`${OPENCODE_URL}/session?directory=${encodeURIComponent(dir)}`, {
    method: "POST", body: { title }, timeoutMs: 15000,
  });
  const sessionID = session?.id;
  if (!sessionID) throw new Error("opencode: session create returned no id");

  const finish = async () => {
    try {
      await fetchJson(`${OPENCODE_URL}/session/${encodeURIComponent(sessionID)}?directory=${encodeURIComponent(dir)}`, { method: "DELETE", timeoutMs: 8000 });
    } catch { /* cleanup is best-effort, never fatal */ }
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* likewise */ }
  };

  const abortSession = async () => {
    try {
      await fetchJson(`${OPENCODE_URL}/session/${encodeURIComponent(sessionID)}/abort?directory=${encodeURIComponent(dir)}`, { method: "POST", timeoutMs: 8000 });
    } catch { /* abort is best-effort; the timeout below still bounds us */ }
  };

  // The SSE opens BEFORE prompt_async: the 204 returns immediately and deltas
  // stream on the bus — subscribing second would miss the head of the reply.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const onAbort = () => ctrl.abort();
  if (signal) {
    if (signal.aborted) throw new Error("aborted");
    signal.addEventListener("abort", onAbort, { once: true });
  }
  let sse = null;
  try {
    sse = await fetch(`${OPENCODE_URL}/event?directory=${encodeURIComponent(dir)}`, { signal: ctrl.signal, headers: { ...opencodeAuthHeader() } });
    if (!sse.ok) throw new Error(`opencode GET /event: ${sse.status}`);
  } catch (err) {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onAbort);
    await finish();
    throw err;
  }

  const promptRes = await (async () => {
    const pctrl = new AbortController();
    const ptimer = setTimeout(() => pctrl.abort(), 30000);
    try {
      const r = await fetch(`${OPENCODE_URL}/session/${encodeURIComponent(sessionID)}/prompt_async?directory=${encodeURIComponent(dir)}`, {
        method: "POST",
        headers: { "content-type": "application/json", ...opencodeAuthHeader() },
        signal: pctrl.signal,
        body: JSON.stringify({
          model: { providerID, modelID },
          ...(system ? { system } : {}),
          tools,
          parts: [{ type: "text", text }],
        }),
      });
      if (r.status !== 204) throw new Error(`opencode prompt_async: ${r.status} ${await r.text().catch(() => "")}`.slice(0, 300));
      return r;
    } finally {
      clearTimeout(ptimer);
    }
  })().catch(async (err) => {
    clearTimeout(timer);
    try { ctrl.abort(); } catch { /* already closed */ }
    if (signal) signal.removeEventListener("abort", onAbort);
    await finish();
    throw err;
  });
  void promptRes;

  let emittedChars = 0;
  let emittedTokens = 0; // chars/4 estimate — the live budget tripwire ONLY
  let overBudget = false;
  // Real usage, when the server reports it: the last assistant message's
  // tokens/cost, carried on the terminal { done } chunk (never estimated).
  let reported = null;
  const noteUsage = (tokens, cost) => {
    if (!tokens) return;
    const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
    reported = {
      input: num(tokens.input),
      output: num(tokens.output),
      reasoning: num(tokens.reasoning),
      cacheRead: num(tokens.cache?.read),
      cacheWrite: num(tokens.cache?.write),
      cost: Number.isFinite(Number(cost)) ? Number(cost) : null,
    };
  };
  const doneChunk = (truncated) => ({
    done: true,
    truncated,
    prompt_eval_count: reported?.input ?? 0,
    eval_count: reported?.output ?? emittedTokens,
    reasoningTokens: reported?.reasoning ?? 0,
    cacheRead: reported?.cacheRead ?? 0,
    cacheWrite: reported?.cacheWrite ?? 0,
    ...(reported?.cost === null ? {} : { cost: reported?.cost ?? null }),
    estimated: reported ? false : true, // false = the server's own counters
  });
  // THE FEED BACK IN: the ephemeral session is deleted on finish, which would
  // take its usage with it — so a natural finish posts one log row to the
  // opencode server itself (service er7-mouth). Best-effort, never fatal,
  // never blocking the answer (fired after the terminal chunk is yielded).
  const logUsage = async (truncated) => {
    try {
      await fetchJson(`${OPENCODE_URL}/log`, {
        method: "POST",
        body: {
          service: "er7-mouth",
          level: "info",
          message: `er7 draw via ${providerID}/${modelID}: ${reported?.input ?? 0} in / ${reported?.output ?? emittedTokens} out${truncated ? " (truncated)" : ""}`,
          extra: {
            providerID, modelID, sessionID, truncated,
            input: reported?.input ?? 0,
            output: reported?.output ?? emittedTokens,
            reasoning: reported?.reasoning ?? 0,
            cacheRead: reported?.cacheRead ?? 0,
            cacheWrite: reported?.cacheWrite ?? 0,
            ...(reported?.cost === null || reported?.cost === undefined ? {} : { cost: reported.cost }),
            estimated: reported ? false : true,
          },
        },
        timeoutMs: 5000,
      });
    } catch { /* usage logging never fails a turn */ }
  };
  const seenByPart = new Map(); // part id -> chars already emitted (snapshot fallback)
  const takePiece = (part, delta) => {
    const seen = seenByPart.get(part?.id) ?? 0;
    // Deltas are incremental since the last update for this part: consuming
    // the stream in order, advancing `seen` keeps a later full-text snapshot
    // from re-emitting what deltas already carried.
    if (typeof delta === "string" && delta) {
      seenByPart.set(part?.id, seen + delta.length);
      return delta;
    }
    // No delta: some servers send full-text snapshots — emit only the unseen
    // tail past what this part id already contributed.
    const full = String(part?.text ?? "");
    if (full.length <= seen) return "";
    seenByPart.set(part?.id, full.length);
    return full.slice(seen);
  };
  try {
    for await (const { type, data } of readSse(sse, signal ?? ctrl.signal)) {
      if (type === "server.connected") continue;
      const props = data?.properties ?? data ?? {};
      const sid = props.sessionID ?? props.part?.sessionID ?? props.info?.sessionID ?? null;
      if (sid && sid !== sessionID) continue; // the bus is global; only ours

      // USAGE — the server's own counters, kept off the text path entirely.
      // message.updated carries the cumulative AssistantMessage (tokens +
      // cost); the LAST one before idle is the draw's account. Filtered to
      // our session like everything else; user-role messages have no tokens.
      if (type === "message.updated" && props.info?.role === "assistant") {
        noteUsage(props.info.tokens, props.info.cost);
        continue;
      }

      // BAR 3 — THE WATCHDOG. A tool part or a permission ask for OUR session
      // means a bar above failed: abort the session and fail the draw CLOSED.
      // Partial text is discarded (never yielded-half-then-thrown: the throw
      // happens before any yield of this event, and the runner's draw treats
      // a throw as a failed draw, not a committed one).
      if (type === "permission.updated") {
        await abortSession();
        throw Object.assign(new Error(`opencode: model requested permission (${props.title ?? props.type ?? "unknown"}) — tools are disabled for mouth draws`), { code: "ERR_OPENCODE_TOOL_BLOCKED" });
      }
      if (type === "message.part.updated" && props.part?.type && props.part.type !== "text" && props.part.type !== "reasoning" && props.part.type !== "step-start" && props.part.type !== "step-finish") {
        await abortSession();
        throw Object.assign(new Error(`opencode: model produced a non-text part (${props.part.type}) — tools are disabled for mouth draws`), { code: "ERR_OPENCODE_TOOL_BLOCKED" });
      }
      if (type === "message.part.updated" && props.part?.type === "text") {
        const piece = takePiece(props.part, props.delta);
        if (piece) {
          emittedChars += piece.length;
          emittedTokens = Math.ceil(emittedChars / 4);
          if (emittedTokens > maxTokens) {
            // HARD CAP, client-side: stop yielding AND stop the server (abort,
            // not just stop reading) — the tip of consciousness must not loop.
            overBudget = true;
            await abortSession();
            yield doneChunk(true);
            return;
          }
          yield piece;
        }
      }
      if (type === "session.error" || type === "message.error" || type === "server.error") {
        const msg = props.error?.message ?? props.message ?? data?.error?.message ?? "unknown opencode error";
        throw new Error(`opencode: ${String(msg).slice(0, 300)}`);
      }
      if (type === "session.idle" || (type === "session.status" && props.status?.type === "idle")) {
        yield doneChunk(overBudget);
        await logUsage(overBudget);
        return;
      }
    }
    // Stream ended without idle: the reply is over but unmarked. Report what
    // we emitted as complete ONLY if we emitted anything; else the draw
    // failed (an empty answer is never a natural finish).
    if (emittedChars > 0) {
      yield doneChunk(overBudget);
      await logUsage(overBudget);
    } else {
      throw new Error("opencode: event stream ended with no text and no idle");
    }
  } finally {
    clearTimeout(timer);
    try { ctrl.abort(); } catch { /* already closed */ }
    if (signal) signal.removeEventListener("abort", onAbort);
    await finish();
  }
}
