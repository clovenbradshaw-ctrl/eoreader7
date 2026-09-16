import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { MODEL_PREFIX, parseProxyRequest, toOpenAIModelList, reprefixOllamaTags, openAIResponse, openAIStreamLines, ollamaChatResponse, ollamaChatStreamLines, humanizeNote, parseAnthropicRequest, flattenAnthropicContent, anthropicCountTokensResponse, anthropicMessageResponse, anthropicStreamStart, anthropicContentBlockStart, anthropicContentBlockDelta, anthropicContentBlockStop, anthropicMessageDelta, anthropicMessageStop } from "./proxy-api.mjs";
import { offeredOllamaModels, runProxyTurn, keepModelHot, hotModelSet, OLLAMA_KEEP_ALIVE_S, startDocumentJob, documentJobStatus } from "./proxy-runner.mjs";
import { warmPostprocess } from "./postprocess.mjs";
import { ledgerFilePath, projectLedgerFile } from "./native/the-fold/document-ledger.js";
import { runCodeLoop } from "./native/the-fold/code-loop.js";
import { runOpenCodingLoop, AGENT_MAX_TURNS } from "./native/the-fold/sandboxed-agent.js";
// The watcher, wired IN (2026-09-13): heimdall's vitals, admission, status,
// and surface-watching run inside this process — one process, no separate
// steer port, no second checkout to drift. When imported, heimdall.mjs
// exports its machinery and does not listen or loop on its own.
import { heimdallStatus, admitChat, startWatcher, markInflight, disclosure, observeCall } from "./heimdall.mjs";
// "Computed, not generated" — the-fold's own house rule (arithmetic.js),
// reused directly rather than re-derived: a small model answering "what is
// today's date?" from its stale training data, with nothing in THIS proxy's
// pipeline checking it (no web access, no mechanical clock door of its
// own), was found live. checkClock is pure and Node-safe (the arithmetic
// door's own injected-mathjs functions need a vendored engine; this one
// doesn't) — a shared fix here reaches every caller of this endpoint, not
// only one client.
import { checkClock } from "../the-fold/arithmetic.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.ER7_PROXY_PORT) || 11436;
// The heimdall alias port — claude and older clients point here. Same server,
// same code; keeping it means the merged watcher doesn't break existing
// configs that route through 11437.
const STEER_ALIAS_PORT = Number(process.env.ER7_HEIMDALL_PORT ?? 11437);
const UPSTREAM = process.env.ER7_UPSTREAM || "http://localhost:11434";
const { hostname: UP_HOST, port: UP_PORT } = new URL(UPSTREAM);
const KEEP_WARM_INTERVAL_MS = Number(process.env.ER7_KEEP_WARM_INTERVAL_MS ?? 120000);
// A whole-turn wall clock, independent of the per-call stream timeout inside
// runProxyTurn. The client must always get a terminal chunk; a turn that is
// slow in its post-stream work must not hang the stream forever. Generous on
// purpose: it is a backstop over the per-call REQUEST_TIMEOUT_MS, never a
// way to kill a slow-but-active stream.
const TURN_DEADLINE_MS = Number(process.env.ER7_TURN_DEADLINE_MS ?? 300000);
// /v1/code runs several model calls plus real test executions per request —
// a generous backstop over the single-turn deadline above, never a way to
// let a wedged loop hang the process forever.
const CODE_LOOP_DEADLINE_MS = Number(process.env.ER7_CODE_LOOP_DEADLINE_MS ?? 600000);
// Per-session virtual filesystem for /v1/agent — carried across calls in
// the SAME conversation (a person keeps building on what they wrote three
// messages ago), in memory only, never written to real disk. Unbounded
// growth across distinct sessions is a real, disclosed limit (there is no
// eviction) — acceptable for now the same way getSession()'s own in-memory
// map already is; not a new class of debt.
const agentFilesBySession = new Map();

const ts = () => new Date().toISOString().slice(11, 23);
const log = (msg) => process.stderr.write(`[${ts()}] [er7-proxy] ${msg}\n`);

const _warnedOnce = new Set();

function sessionIdFromHeaders(req) {
  const h = req.headers;
  const id = h["x-er7-session"] || h["x-session-id"] || h["x-conversation-id"];
  if (id && typeof id === "string" && id.length <= 128) return id;
  // Stable, not timestamped: a client that never sends a session header (raw
  // evals, curl, py scripts) must STILL accumulate one fold across turns —
  // a timestamped fallback silently reset the fold every request, which is
  // exactly the fold-forgetting the proxy exists to prevent.
  const scope = workspaceFromHeaders(req)
    ? `-${requireCrc32(workspaceFromHeaders(req))}`
    : "";
  return `er7-session-${req.socket?.remoteAddress?.replace(/[^a-z0-9]/gi, "") || "local"}${scope}`;
}

// The person's DURABLE identity — the key the theory of mind persists under.
// Distinct from the session id: a person is one across sessions (their
// asserted claims and their standing survive), while a session is one
// conversation (its specifics stay in the chat history). Falls back to the
// same stable base the anonymous session uses, so a person who never sends
// a header is still one person across turns.
function userIdFromHeaders(req) {
  const u = String(req.headers["x-er7-user"] ?? "").trim();
  if (u && u.length <= 128) return u;
  // No explicit identity: fall back to the SESSION's own base, never to the
  // bare remote address. On a local machine every header-less client IS
  // 127.0.0.1, so keying the durable speaker model off the address would
  // merge every local user into one person. A client that sends a session
  // id gets that session's lane (its own theory of mind, never a stranger's);
  // a client that sends nothing keeps the stable machine+workspace fallback.
  const session = sessionIdFromHeaders(req);
  if (session) return `user-session-${requireCrc32(session)}`;
  const scope = workspaceFromHeaders(req)
    ? `-${requireCrc32(workspaceFromHeaders(req))}`
    : "";
  return `user-${req.socket?.remoteAddress?.replace(/[^a-z0-9]/gi, "") || "local"}${scope}`;
}

let _crc32cache = new Map();
function requireCrc32(str) {
  if (_crc32cache.has(str)) return _crc32cache.get(str);
  let crc = 0xffffffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i);
    for (let k = 0; k < 8; k++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  const out = (crc ^ 0xffffffff) >>> 0;
  _crc32cache.set(str, out);
  return out;
}

function workspaceFromHeaders(req) {
  const ws = String(req.headers["x-er7-workspace"] ?? "").trim();
  if (!ws || ws.length > 2048) return "";
  return ws;
}

// The answer's grain: an explicit x-er7-mode header overrides the body's
// `mode` (the header is the SURFACE's choice — the Fold steers its own
// surfaces; the body field is a direct caller's). Normalized by the runner
// (auto/chat/long/origami; compose/artifact alias origami).
function modeFromHeaders(req, bodyMode) {
  const h = String(req.headers["x-er7-mode"] ?? "").trim().toLowerCase();
  if (h) return h;
  return bodyMode;
}

// WHO is at the door (organs/interlocutor.js, Buber): the mechanical signals a
// request already carries, read into a bundle the runner turns into a belief
// about whether an agent or a person is speaking. Nothing here is asked of the
// model or read from the content of the ask — only the request's SHAPE (its
// doorway, user-agent, tool definitions, transcript structure). `doorway` is the
// one thing the handler knows that the body does not.
function callerFromRequest(req, doorway, parsed = {}) {
  const h = req.headers || {};
  const messages = Array.isArray(parsed?.messages) ? parsed.messages : [];
  const hasToolTurns = messages.some((m) =>
    m?.role === "tool" || m?.role === "function" ||
    (Array.isArray(m?.tool_calls) && m.tool_calls.length > 0) ||
    (Array.isArray(m?.content) && m.content.some?.((c) => c?.type === "tool_use" || c?.type === "tool_result")));
  return {
    doorway,
    userAgent: String(h["user-agent"] ?? ""),
    declaredUser: String(h["x-er7-user"] ?? "").trim(),
    tools: Array.isArray(parsed?.tools) ? parsed.tools.length : 0,
    system: !!(parsed?.system || messages.some((m) => m?.role === "system")),
    hasAssistantTurns: messages.some((m) => m?.role === "assistant"),
    hasToolTurns,
    messageCount: messages.length,
  };
}

// HEIMDALL, WIRED IN — the admission gate on the proxy's OWN chat path. A
// saturated box or a full family lane refuses with a typed 429, never a
// hang; the refusal carries Retry-After so a client backs off. The proxy's
// own surface inflight is marked on admission and released when the response
// closes, so the ETA/queue disclosure is real.
function admitChatRequest(parsed) {
  const admit = admitChat(parsed ? JSON.stringify(parsed) : "{}");
  if (admit.allowed) markInflight("er7", 1);
  return admit;
}
function releaseChatRequest() {
  markInflight("er7", -1);
}
// Release the inflight mark once, on EITHER signal: 'finish' (the response
// was handed to the OS) or 'close' (the socket closed, possibly mid-stream on
// a disconnect). Idempotent — a keep-alive connection must never leave the
// mark stuck and 429 a false busy-lane.
function releaseOnResponse(res) {
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    releaseChatRequest();
  };
  res.on("finish", release);
  res.on("close", release);
}

function forward(req, res) {
  const opts = {
    hostname: UP_HOST,
    port: UP_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `${UP_HOST}:${UP_PORT}` },
  };

  const up = http.request(opts, (upRes) => {
    res.writeHead(upRes.statusCode, upRes.headers);
    upRes.pipe(res, { end: true });
  });

  req.pipe(up, { end: true });

  up.on("error", (err) => {
    log(`upstream error: ${err.message}`);
    if (!res.headersSent) {
      res.writeHead(502, { "content-type": "application/json" });
    }
    res.end(JSON.stringify({ error: { message: `upstream: ${err.message}` } }));
  });

  req.on("close", () => {
    up.destroy();
  });
}

async function handleRequest(req, res) {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "*");
  res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // GET / — the self-describing front door. Any app pointed at this base
  // URL with no other knowledge learns every way in, in one request: the
  // plain endpoint (send text, get text — no chat scaffolding required)
  // and the three LLM-shaped protocols, so an app that already speaks
  // OpenAI, Ollama, or Anthropic client code needs zero eoreader7-specific
  // code at all, just a different base URL / model id.
  if (req.method === "GET" && (req.url === "/" || req.url === "")) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      eoreader7: true,
      health: "GET /health",
      status: "GET /heimdall",
      simplest: {
        description: "Send a task, get an answer. No model prefix, no message roles, no chat history required.",
        request: "POST /v1/ask  { \"task\": \"<question or instruction>\" }",
        response: "{ \"answer\": \"<text>\", \"sessionId\": \"...\", ... }",
      },
      code: {
        description: "A physics-gated coding loop: the model may ask to read a real file first, then proposes an edit as raw find/add bytes (never a JSON tool call or a shell command); the edit op is derived mechanically, applied to a real file, and your own declared test command decides pass/fail for real, every round.",
        request: "POST /v1/code  { \"task\": \"...\", \"workspace\": \"/abs/path\", \"testCommand\": \"npm test\", \"maxRounds\"?: 3 }",
        response: "{ \"done\": bool, \"rounds\": [...], \"finalTestOutput\": \"...\" }",
      },
      llmCompatible: {
        description: "Point any existing OpenAI/Ollama/Anthropic client at this base URL — eoreader7 answers as an er7-prefixed model.",
        openai: { models: "GET /v1/models", chat: "POST /v1/chat/completions", modelId: `${MODEL_PREFIX}<real-ollama-model>` },
        ollama: { tags: "GET /api/tags", chat: "POST /api/chat", modelId: `${MODEL_PREFIX}<real-ollama-model>` },
        anthropic: { messages: "POST /v1/messages", countTokens: "POST /v1/messages/count_tokens" },
      },
      documents: { start: "POST /v1/documents", poll: "GET /v1/documents/:id" },
      headers: {
        "x-er7-session": "stick a conversation to one accumulating reader fold (optional; a stable session is derived from the connection otherwise)",
        "x-er7-user": "durable identity across sessions (optional)",
        "x-er7-workspace": "absolute path to admit real files into the session (optional)",
        "x-er7-mode": "auto | chat | long | origami (optional; auto decides from the task)",
      },
    }));
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", upstream: UPSTREAM, eoreader7: true }));
    return;
  }

  // /heimdall — the full status (vitals, every surface, the DEF/EVA/REC log
  // tail), served LOCALLY: the watcher runs inside this process. A person
  // asks ANY surface this path and gets the whole box.
  if (req.method === "GET" && req.url === "/heimdall") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(heimdallStatus()));
    return;
  }

  // /heimdall/observe — a surface reports one finished call as IT measured it
  // (Ollama's own counters, which every caller already receives on the done
  // chunk). The bridge keeps the account of what each model really does; no
  // watcher call is spent to find out. Loopback-bound like everything here.
  if (req.method === "POST" && req.url === "/heimdall/observe") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    try { observeCall(JSON.parse(raw || "{}")); } catch { /* a malformed report is dropped, never fatal */ }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === "GET" && req.url === "/v1/models") {
    try {
      const tags = await offeredOllamaModels();
      const realNames = (tags.models ?? []).map((m) => m.name || m.model);
      const list = toOpenAIModelList(realNames);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(list));
    } catch (err) {
      res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { message: `failed to fetch models from upstream: ${err.message}` } }));
    }
    return;
  }

  if (req.method === "GET" && req.url === "/api/tags") {
    try {
      const tags = await offeredOllamaModels();
      const reprefixed = reprefixOllamaTags(tags);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(reprefixed));
    } catch (err) {
      res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { message: `failed to fetch tags from upstream: ${err.message}` } }));
    }
    return;
  }

  // Start a document composition JOB (detached — returns immediately, the
  // essay is written to disk in real time, pollable and resumable).
  if (req.method === "POST" && req.url === "/v1/documents") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      try {
        const parsed = JSON.parse(body);
        const job = await startDocumentJob({
          task: String(parsed.task ?? "").trim(),
          model: parsed.model ?? "olmo2:7b",
          workspace: parsed.workspace ?? "",
          sessionId: parsed.sessionId ?? null,
          holonLevel: parsed.holonLevel ?? "section",
        });
        res.writeHead(202, { "content-type": "application/json" });
        res.end(JSON.stringify(job));
      } catch (err) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: { message: err.message } }));
      }
    });
    return;
  }

  // GET /v1/documents/:id.html — the LIVE HTML projection (fetches the JSONL
  // + citations on every refresh and folds client-side; MD/JSON are exports).
  // GET /v1/documents/:id.jsonl — the raw append-only ledger (the artifact).
  // GET /v1/documents/:id.citations.json — the structured citation ledger.
  if (req.method === "GET" && /^\/v1\/documents\/[^/]+\.(html|jsonl|citations\.json)$/.test(req.url)) {
    try {
      const base = decodeURIComponent(req.url.split("/").pop());
      const docsDir = path.join(HERE, "documents");
      const resolved = { html: base.replace(/\.html$/, ""), jsonl: base.replace(/\.jsonl$/, ""), citations: base.replace(/\.citations\.json$/, "") };
      let file = null, mime = null;
      if (base.endsWith(".html")) {
        // The shell is written by the job as <jobId>_1.html; the JSONL is
        // served relative to it, so the live fold finds both.
        file = path.join(docsDir, `${resolved.html.replace(/:/g, "_")}_1.html`);
        mime = "text/html";
      } else if (base.endsWith(".jsonl")) {
        // The shell fetches <jobId>_1.jsonl (underscore form); the ledger is
        // <jobId>:1.jsonl (colon form). Resolve both.
        const stem = resolved.jsonl; // e.g. er7-doc-123_1
        const colonForm = stem.replace(/_(\d+)$/, ":$1");
        file = ledgerFilePath(docsDir, `${colonForm}`);
        if (!fs.existsSync(file)) file = ledgerFilePath(docsDir, `${stem}`);
        mime = "application/x-ndjson";
      } else if (base.endsWith(".citations.json")) {
        file = path.join(docsDir, `${resolved.citations.replace(/:/g, "_")}.citations.json`);
        mime = "application/json";
      }
      if (!file || !fs.existsSync(file)) { res.writeHead(404, { "content-type": "text/plain" }); res.end("not found"); return; }
      const data = fs.readFileSync(file, "utf8");
      res.writeHead(200, { "content-type": mime, "cache-control": "no-store" });
      res.end(data);
    } catch (err) {
      res.writeHead(500, { "content-type": "text/plain" });
      res.end(String(err.message));
    }
    return;
  }

  // GET /v1/documents/:id — poll a job: its status + the CURRENT projection
  // (the essay as written so far, re-folded from the append-only ledger).
  if (req.method === "GET" && req.url.startsWith("/v1/documents/")) {
    try {
      const docId = decodeURIComponent(req.url.slice("/v1/documents/".length));
      // The ledger is `${sessionId}:${turnCount}`; accept the jobId directly
      // (a fresh job's ledger is `${jobId}:1`).
      const docsDir = path.join(HERE, "documents");
      let projection = projectLedgerFile(ledgerFilePath(docsDir, docId));
      if (projection == null) projection = projectLedgerFile(ledgerFilePath(docsDir, `${docId}:1`));
      const job = documentJobStatus(docId);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        status: job?.status ?? (projection != null ? "complete" : "unknown"),
        projection: projection ?? "",
        job: job ? { jobId: job.jobId, chars: job.chars, sections: job.sections, createdAt: job.createdAt, updatedAt: job.updatedAt, error: job.error ?? null, satisfaction: job.satisfaction ?? null, totalStrain: job.totalStrain ?? null } : null,
      }));
    } catch (err) {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { message: err.message } }));
    }
    return;
  }

  // POST /v1/ask — the plain doorway. No chat-completion scaffolding (no
  // message roles, no model prefix, no "the last message must have role
  // user"): a caller sends the text it wants read and gets the answer back.
  // This is the SAME turn (runProxyTurn) and the SAME admission gate the
  // three LLM-shaped protocols use below — a busy box refuses this path
  // exactly as it refuses theirs, never a quieter unguarded backdoor to the
  // same resource.
  if (req.method === "POST" && req.url === "/v1/ask") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "bad json" }));
        return;
      }
      const task = String(parsed?.task ?? "").trim();
      if (!task) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: 'task is required — the text to read, e.g. { "task": "..." }' }));
        return;
      }
      // Same default the /v1/documents job uses — one literal, not a second
      // magic constant for the same choice.
      const model = String(parsed?.model ?? "").trim() || "olmo2:7b";
      const mode = modeFromHeaders(req, typeof parsed?.mode === "string" ? parsed.mode : "auto");

      const admit = admitChatRequest({ model });
      if (!admit.allowed) {
        res.writeHead(admit.status, { "content-type": "application/json", "retry-after": String(admit.retryAfterS) });
        res.end(JSON.stringify({ error: admit.message, type: admit.type, retry_after: admit.retryAfterS }));
        return;
      }
      releaseOnResponse(res);

      // A body-supplied sessionId is honored first (a caller with no header
      // machinery can still keep one accumulating reader fold across calls
      // by just repeating the same string); the header/derived fallback
      // below is what every other endpoint already uses.
      const sessionId = String(parsed?.sessionId ?? "").trim() || sessionIdFromHeaders(req);
      const workspace = String(parsed?.workspace ?? "").trim() || workspaceFromHeaders(req);
      const userId = userIdFromHeaders(req);
      log(`ask → session=${sessionId} user=${userId} model=${model} taskLength=${task.length} mode=${mode} workspace=${workspace ? `"${workspace}"` : "none"}`);

      const turnAbort = new AbortController();
      const onDisconnect = () => {
        if (res.writableEnded) return;
        if (!turnAbort.signal.aborted) turnAbort.abort();
      };
      res.on("close", onDisconnect);
      const turnDeadline = setTimeout(() => {
        if (!turnAbort.signal.aborted) turnAbort.abort();
      }, TURN_DEADLINE_MS);
      try {
        const result = await runProxyTurn({
          sessionId, userId, workspace, model, task, mode,
          chatHistory: Array.isArray(parsed?.chatHistory) ? parsed.chatHistory : [],
          caller: callerFromRequest(req, "ask", parsed),
          signal: turnAbort.signal,
        });
        clearTimeout(turnDeadline);
        res.removeListener("close", onDisconnect);
        res.writeHead(200, { "content-type": "application/json", "x-er7-session": sessionId });
        res.end(JSON.stringify({
          answer: result.text,
          sessionId,
          model,
          interlocutor: result.interlocutor ?? null,
          usage: { promptTokens: result.usage?.promptTokens ?? 0, completionTokens: result.usage?.completionTokens ?? 0 },
          relationEdges: result.relationEdges,
          referentBindings: result.referentBindings,
          thinking: result.thinking ?? null,
          answerShape: result.answerShape ?? null,
          truncated: result.truncated ?? false,
          document: result.document ?? null,
        }));
      } catch (err) {
        clearTimeout(turnDeadline);
        res.removeListener("close", onDisconnect);
        log(`ask execution error: ${err.message}`);
        if (!res.headersSent) {
          res.writeHead(err?.message === "cancelled" ? 499 : 500, { "content-type": "application/json" });
        }
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // POST /v1/code — a physics-gated, bounded coding loop (native/the-fold/
  // code-loop.js). The model never writes a shell command or a JSON tool
  // call: it proposes ONE edit as raw find/add bytes against a real,
  // already-existing file; the edit op is derived from those bytes, never
  // taken from a label; the CALLER'S OWN declared testCommand — never a
  // model-authored string — decides pass/fail for real, every round.
  if (req.method === "POST" && req.url === "/v1/code") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "bad json" }));
        return;
      }
      const task = String(parsed?.task ?? "").trim();
      const workspace = String(parsed?.workspace ?? "").trim();
      const testCommand = String(parsed?.testCommand ?? "").trim();
      if (!task || !workspace || !testCommand) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: 'task, workspace and testCommand are all required — e.g. { "task": "...", "workspace": "/abs/path", "testCommand": "npm test" }' }));
        return;
      }
      const model = String(parsed?.model ?? "").trim() || "olmo2:7b";
      const maxRounds = Number.isFinite(Number(parsed?.maxRounds)) ? Math.max(1, Math.min(10, Number(parsed.maxRounds))) : 3;

      const admit = admitChatRequest({ model });
      if (!admit.allowed) {
        res.writeHead(admit.status, { "content-type": "application/json", "retry-after": String(admit.retryAfterS) });
        res.end(JSON.stringify({ error: admit.message, type: admit.type, retry_after: admit.retryAfterS }));
        return;
      }
      releaseOnResponse(res);

      const sessionId = String(parsed?.sessionId ?? "").trim() || sessionIdFromHeaders(req);
      const userId = userIdFromHeaders(req);
      log(`code → session=${sessionId} user=${userId} model=${model} workspace="${workspace}" maxRounds=${maxRounds}`);

      const loopAbort = new AbortController();
      const onDisconnect = () => {
        if (res.writableEnded) return;
        if (!loopAbort.signal.aborted) loopAbort.abort();
      };
      res.on("close", onDisconnect);
      const loopDeadline = setTimeout(() => {
        if (!loopAbort.signal.aborted) loopAbort.abort();
      }, CODE_LOOP_DEADLINE_MS);
      try {
        const result = await runCodeLoop({ sessionId, userId, model, task, workspace, testCommand, maxRounds, caller: callerFromRequest(req, "code", parsed), signal: loopAbort.signal });
        clearTimeout(loopDeadline);
        res.removeListener("close", onDisconnect);
        res.writeHead(200, { "content-type": "application/json", "x-er7-session": sessionId });
        res.end(JSON.stringify(result));
      } catch (err) {
        clearTimeout(loopDeadline);
        res.removeListener("close", onDisconnect);
        log(`code execution error: ${err.message}`);
        if (!res.headersSent) {
          res.writeHead(err?.message === "cancelled" ? 499 : 400, { "content-type": "application/json" });
        }
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // POST /v1/agent — an open-ended coding loop, Claude Code's own shape
  // (read/write/run freely, no declared test command), over the SAME
  // runProxyTurn pipeline /v1/code and /v1/chat/completions already use.
  // "Operate within the browser sandbox is the idea" (user direction):
  // nothing this loop touches is real — an in-memory virtual filesystem, JS
  // executed in a severed vm.Context (native/the-fold/sandboxed-agent.js) —
  // so there is nothing here for a person to approve before it runs, the
  // same reasoning that lets term.js auto-run its own proven-severed
  // runtimes without asking each time.
  if (req.method === "POST" && req.url === "/v1/agent") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "bad json" }));
        return;
      }
      const task = String(parsed?.task ?? "").trim();
      if (!task) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: 'task is required — e.g. { "task": "write a function that..." }' }));
        return;
      }
      const model = String(parsed?.model ?? "").trim() || "olmo2:7b";
      const maxTurns = Number.isFinite(Number(parsed?.maxTurns)) ? Math.max(1, Math.min(AGENT_MAX_TURNS, Number(parsed.maxTurns))) : AGENT_MAX_TURNS;

      const admit = admitChatRequest({ model });
      if (!admit.allowed) {
        res.writeHead(admit.status, { "content-type": "application/json", "retry-after": String(admit.retryAfterS) });
        res.end(JSON.stringify({ error: admit.message, type: admit.type, retry_after: admit.retryAfterS }));
        return;
      }
      releaseOnResponse(res);

      const sessionId = String(parsed?.sessionId ?? "").trim() || sessionIdFromHeaders(req);
      const userId = userIdFromHeaders(req);
      log(`agent → session=${sessionId} user=${userId} model=${model} maxTurns=${maxTurns}`);

      if (!agentFilesBySession.has(sessionId)) agentFilesBySession.set(sessionId, new Map());
      const files = agentFilesBySession.get(sessionId);

      const loopAbort = new AbortController();
      const onDisconnect = () => {
        if (res.writableEnded) return;
        if (!loopAbort.signal.aborted) loopAbort.abort();
      };
      res.on("close", onDisconnect);
      const loopDeadline = setTimeout(() => {
        if (!loopAbort.signal.aborted) loopAbort.abort();
      }, CODE_LOOP_DEADLINE_MS);
      try {
        const result = await runOpenCodingLoop({ sessionId, userId, model, task, files, maxTurns, caller: callerFromRequest(req, "agent", parsed), signal: loopAbort.signal });
        clearTimeout(loopDeadline);
        res.removeListener("close", onDisconnect);
        res.writeHead(200, { "content-type": "application/json", "x-er7-session": sessionId });
        res.end(JSON.stringify({ done: result.done, answer: result.answer, rounds: result.rounds, files: Object.fromEntries(result.files) }));
      } catch (err) {
        clearTimeout(loopDeadline);
        res.removeListener("close", onDisconnect);
        log(`agent execution error: ${err.message}`);
        if (!res.headersSent) {
          res.writeHead(err?.message === "cancelled" ? 499 : 400, { "content-type": "application/json" });
        }
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.method === "POST" && req.url === "/v1/chat/completions") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: { message: "bad json" } }));
        return;
      }

      const reqData = parseProxyRequest(parsed);
      if (reqData.error) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: { message: reqData.error } }));
        return;
      }
      reqData.mode = modeFromHeaders(req, reqData.mode);
      reqData.caller = callerFromRequest(req, "chat", parsed);

      // HEIMDALL, WIRED IN — admission on the proxy's own path.
      const admit = admitChatRequest(parsed);
      if (!admit.allowed) {
        res.writeHead(admit.status, { "content-type": "application/json", "retry-after": String(admit.retryAfterS) });
        res.end(JSON.stringify({ error: { message: admit.message, type: admit.type, retry_after: admit.retryAfterS } }));
        return;
      }
      releaseOnResponse(res);

      const sessionId = sessionIdFromHeaders(req);
      const workspace = workspaceFromHeaders(req);
      const userId = userIdFromHeaders(req);
      log(`turn → session=${sessionId} user=${userId} model=${reqData.model} taskLength=${reqData.task.length} stream=${reqData.stream} mode=${reqData.mode} workspace=${workspace ? `"${workspace}"` : "none"}`);

      const created = Math.floor(Date.now() / 1000);
      const id = `er7-${Date.now()}`;

      // A mechanical door, checked before anything else spends a model call
      // or a heimdall admission slot: "what is today's date?"/"what time is
      // it?" etc. are answered from this machine's own real clock, never
      // asked of the model. Real Date, real timezone — never a guess.
      const clock = checkClock(reqData.task, { now: new Date() });
      if (clock) {
        log(`turn → session=${sessionId} clock op=${clock.op} — computed, zero model calls`);
        const reading = { computed: true, mechanism: "clock", op: clock.op, sessionId };
        if (reqData.stream) {
          res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive", "x-er7-session": sessionId });
          for (const line of openAIStreamLines({ id, model: parsed.model, text: clock.display, created, reading })) res.write(line);
          res.end("data: [DONE]\n\n");
        } else {
          const resp = openAIResponse({ id, model: parsed.model, text: clock.display, created, usage: { promptTokens: 0, completionTokens: 0 }, reading });
          res.writeHead(200, { "content-type": "application/json", "x-er7-session": sessionId });
          res.end(JSON.stringify(resp));
        }
        return;
      }

      if (reqData.stream) {
        res.writeHead(200, {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
          "x-er7-session": sessionId,
        });

        // ── RESILIENCE SCAFFOLDING (hoisted: the catch block must see these) ──
        // A client that disconnects must not leave a zombie turn holding the
        // generation slot — that is what wedges every later request. The turn
        // is aborted the moment the socket closes. There is NO idle watchdog
        // and no short wall-clock: a slow model on a loaded box can sit quiet
        // for a minute between notes and its first content token, and an
        // ACTIVE stream must never be killed for being slow — only a turn
        // whose client is gone is a zombie. The model call itself is already
        // bounded by REQUEST_TIMEOUT_MS inside streamOllamaChat; TURN_DEADLINE
        // is a generous whole-turn backstop over and above it.
        const turnAbort = new AbortController();
        const onDisconnect = () => {
          if (res.writableEnded) return; // response finished — not a disconnect
          if (!turnAbort.signal.aborted) turnAbort.abort();
        };
        res.on("close", onDisconnect);
        const turnDeadline = setTimeout(() => {
          if (!turnAbort.signal.aborted) turnAbort.abort();
        }, TURN_DEADLINE_MS);
        const clearTurn = () => {
          clearTimeout(turnDeadline);
          res.removeListener("close", onDisconnect);
        };

        let first = true;
        let reasoningOpen = false;
        const emit = (token) => {
          if (!token) return;
          const chunk = {
            id, object: "chat.completion.chunk", created, model: parsed.model,
            choices: [{
              index: 0,
              delta: first ? { role: "assistant", content: token } : { content: token },
              finish_reason: null,
            }],
          };
          first = false;
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        };
        // EOReader7's own reading-pipeline notes — humanized to plain English
        // (never a raw JSON dump) and surfaced as reasoning deltas, one per
        // line, so the naked model's answer stays visually distinct from the
        // reading process. Notes with no readable form (per-file scan noise,
        // raw ollama bookkeeping) are silently dropped by humanizeNote.
        const emitNote = (note) => {
          const text = humanizeNote(note);
          if (!text) return;
          const chunk = {
            id, object: "chat.completion.chunk", created, model: parsed.model,
            choices: [{
              index: 0,
              delta: { reasoning_content: `${text}\n` },
              finish_reason: null,
            }],
          };
          reasoningOpen = true;
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        };

        // Client asked to not stream but mis-set stream: assume default on.
        const onNote = reqData.discloseThinking ? emitNote : null;
        // Realtime generation: composition section content streams as
        // reasoning_content so the user sees the essay/code being built live.
        const emitThinking = (text) => {
          if (!text) return;
          const chunk = {
            id, object: "chat.completion.chunk", created, model: parsed.model,
            choices: [{
              index: 0,
              delta: { reasoning_content: text },
              finish_reason: null,
            }],
          };
          reasoningOpen = true;
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        };
        const onThinking = reqData.discloseThinking ? emitThinking : null;

        // ── OPERATIONAL DISCLOSURE ────────────────────────────────────────────
        // The user's own question, answered in the thinking panel: how long
        // will this take, and how busy is the box. With heimdall wired IN,
        // the proxy computes this itself (vitals + queue) — no bridge headers
        // to wait for. This is disclosure about the INSTRUMENT'S OWN STATE —
        // the one place it is allowed to be visible — never part of the answer.
        const d = disclosure();
        const eta = d.queue?.ahead > 0 ? (d.queue?.etaHuman ?? "now") : "now";
        const cpuBusy = d.cpu?.busy ?? "";
        const gpuBusy = d.gpu?.busy ?? "";
        const disclosureLine = (() => {
          const parts = [];
          if (eta && eta !== "now") parts.push(`about ${eta} to respond`);
          else if (eta === "now") parts.push("no wait ahead");
          if (cpuBusy) parts.push(`CPU ~${cpuBusy}% busy`);
          if (gpuBusy) parts.push(`GPU ~${gpuBusy}% busy`);
          return parts.length ? `Heimdall: ${parts.join(" · ")}.` : null;
        })();
        if (reqData.discloseThinking && disclosureLine) {
          emitThinking(`\n${disclosureLine}\n`);
        }

        try {
          const result = await runProxyTurn({ sessionId, userId, workspace, signal: turnAbort.signal, ...reqData }, emit, onNote, onThinking);
          clearTurn();
          // Thinking affordance: when discloseThinking is on, emit the grounding
          // block as reasoning_content before the final chunk.
          if (reqData.discloseThinking && result.thinking) {
            res.write(`data: ${JSON.stringify({
              id, object: "chat.completion.chunk", created, model: parsed.model,
              choices: [{ index: 0, delta: { reasoning_content: result.thinking }, finish_reason: null }],
            })}\n\n`);
          }
          res.write(`data: ${JSON.stringify({
            id, object: "chat.completion.chunk", created, model: parsed.model,
            choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
            reading: {
              sessionId, relationEdges: result.relationEdges, referentBindings: result.referentBindings,
              hyperlexiconCandidates: result.hyperlexiconCandidates, turn: result.turn,
              workspace: result.workspace ?? null, post: result.post ?? null,
              thinking: result.thinking ?? null,
              answerShape: result.answerShape ?? null,
              truncated: result.truncated ?? false,
              document: result.document ?? null,
            },
          })}\n\n`);
          res.write("data: [DONE]\n\n");
          res.end();
        } catch (err) {
          clearTurn();
          log(`proxy execution error: ${err.message}`);
          // A cancelled turn is not an error to the client that is still
          // listening; it is a clean stop. A dead client gets nothing (it is
          // gone) and the slot is freed, which is the whole point.
          const cancelled = err?.message === "cancelled";
          if (!res.writableEnded) {
            const errChunk = { id, object: "chat.completion.chunk", created, model: parsed.model, choices: [{ index: 0, delta: { content: cancelled ? "" : `\n[EOReader7 error: ${err.message}]` }, finish_reason: "stop" }] };
            res.write(`data: ${JSON.stringify(errChunk)}\n\n`);
            res.write("data: [DONE]\n\n");
            res.end();
          }
        }
      } else {
        // RESILIENCE: bound the non-streaming turn too — a wedged turn must
        // return a typed error, never leave the client hanging. HOISTED above
        // the try/catch (same as the streaming path): the catch block must be
        // able to clearTimeout the deadline and remove the disconnect listener
        // without a ReferenceError killing the whole server.
        const turnAbort = new AbortController();
        const onDisconnect = () => {
          if (res.writableEnded) return; // response finished — not a disconnect
          if (!turnAbort.signal.aborted) turnAbort.abort();
        };
        res.on("close", onDisconnect);
        const turnDeadline = setTimeout(() => {
          if (!turnAbort.signal.aborted) turnAbort.abort();
        }, TURN_DEADLINE_MS);
        try {
          const result = await runProxyTurn({ sessionId, userId, workspace, signal: turnAbort.signal, ...reqData });
          clearTimeout(turnDeadline);
          res.removeListener("close", onDisconnect);
          const resp = openAIResponse({ id, model: parsed.model, text: result.text, created, usage: result.usage, reading: result });
          resp.reading.sessionId = sessionId;
          resp.reading.thinking = result.thinking ?? null;
          resp.reading.answerShape = result.answerShape ?? null;
          resp.reading.truncated = result.truncated ?? false;
          resp.reading.document = result.document ?? null;
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify(resp));
        } catch (err) {
          clearTimeout(turnDeadline);
          res.removeListener("close", onDisconnect);
          log(`proxy execution error: ${err.message}`);
          if (!res.headersSent) {
            res.writeHead(err?.message === "cancelled" ? 499 : 500, { "content-type": "application/json" });
          }
          res.end(JSON.stringify({ error: { message: err.message } }));
        }
      }
    });
    return;
  }

  if (req.method === "POST" && req.url === "/api/chat") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: { message: "bad json" } }));
        return;
      }

      const reqData = parseProxyRequest(parsed);
      if (reqData.error) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: { message: reqData.error } }));
        return;
      }
      reqData.mode = modeFromHeaders(req, reqData.mode);
      reqData.caller = callerFromRequest(req, "ollama", parsed);

      // HEIMDALL, WIRED IN — admission on the proxy's own path.
      const admit = admitChatRequest(parsed);
      if (!admit.allowed) {
        res.writeHead(admit.status, { "content-type": "application/json", "retry-after": String(admit.retryAfterS) });
        res.end(JSON.stringify({ error: { message: admit.message, type: admit.type, retry_after: admit.retryAfterS } }));
        return;
      }
      releaseOnResponse(res);

      const sessionId = sessionIdFromHeaders(req);
      const workspace = workspaceFromHeaders(req);
      const userId = userIdFromHeaders(req);
      log(`ollama chat turn → session=${sessionId} user=${userId} model=${reqData.model} taskLength=${reqData.task.length} mode=${reqData.mode} workspace=${workspace ? `"${workspace}"` : "none"}`);

      const createdAt = new Date().toISOString();

      if (reqData.stream) {
        res.writeHead(200, {
          "content-type": "application/x-ndjson",
          "cache-control": "no-cache",
          connection: "keep-alive",
          "x-er7-session": sessionId,
        });

        // ── RESILIENCE SCAFFOLDING (hoisted — the catch must see these) ──
        const turnAbort = new AbortController();
        const onDisconnect = () => {
          if (res.writableEnded) return; // response finished — not a disconnect
          if (!turnAbort.signal.aborted) turnAbort.abort();
        };
        res.on("close", onDisconnect);
        const turnDeadline = setTimeout(() => {
          if (!turnAbort.signal.aborted) turnAbort.abort();
        }, TURN_DEADLINE_MS);
        const clearTurn = () => {
          clearTimeout(turnDeadline);
          res.removeListener("close", onDisconnect);
        };

        try {
          let first = true;
          await runProxyTurn({ sessionId, userId, workspace, signal: turnAbort.signal, ...reqData }, (token) => {
            if (!token) return;
            res.write(JSON.stringify({
              model: parsed.model, created_at: createdAt,
              message: { role: "assistant", content: token },
              done: false,
            }) + "\n");
            first = false;
          });
          clearTurn();
          res.write(JSON.stringify({
            model: parsed.model, created_at: createdAt,
            message: { role: "assistant", content: "" },
            done: true, done_reason: "stop",
          }) + "\n");
          res.end();
        } catch (err) {
          clearTurn();
          log(`proxy execution error: ${err.message}`);
          if (!res.writableEnded) {
            res.write(JSON.stringify({
              model: parsed.model, created_at: createdAt,
              message: { role: "assistant", content: err?.message === "cancelled" ? "" : `[EOReader7 error: ${err.message}]` },
              done: true, done_reason: err?.message === "cancelled" ? "stop" : "error",
            }) + "\n");
            res.end();
          }
        }
      } else {
        // RESILIENCE: same abort + deadline for the non-streaming shape.
        // HOISTED above the try/catch so the catch block can clear the
        // deadline without a ReferenceError killing the server.
        const turnAbort = new AbortController();
        const onDisconnect = () => {
          if (res.writableEnded) return; // response finished — not a disconnect
          if (!turnAbort.signal.aborted) turnAbort.abort();
        };
        res.on("close", onDisconnect);
        const turnDeadline = setTimeout(() => {
          if (!turnAbort.signal.aborted) turnAbort.abort();
        }, TURN_DEADLINE_MS);
        try {
          const result = await runProxyTurn({ sessionId, userId, workspace, signal: turnAbort.signal, ...reqData });
          clearTimeout(turnDeadline);
          res.removeListener("close", onDisconnect);
          const resp = ollamaChatResponse({ model: parsed.model, text: result.text, createdAt, usage: result.usage, reading: result });
          resp.reading = { ...(result.reading ?? result), sessionId };
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify(resp));
        } catch (err) {
          clearTimeout(turnDeadline);
          res.removeListener("close", onDisconnect);
          log(`proxy execution error: ${err.message}`);
          if (!res.headersSent) {
            res.writeHead(err?.message === "cancelled" ? 499 : 500, { "content-type": "application/json" });
          }
          res.end(JSON.stringify({ error: { message: err.message } }));
        }
      }
    });
    return;
  }

  // ── ANTHROPIC MESSAGES API (Claude Code) ─────────────────────────────────
  // Claude Code speaks the Anthropic wire, never openai/ollama. This surface
  // translates it onto the SAME reading pipeline every other client hits
  // (runProxyTurn), so a Claude Code conversation folds its own session lane
  // and gets the grounded prompt like anything else. Streaming emits the
  // anthropic event shape (message_start → content_block_* → message_stop).
  // POST /v1/messages/count_tokens — the SDK's usage estimator; a cheap
  // char/4 guess, never a round trip through the reading.
  if (req.method === "POST" && req.url === "/v1/messages/count_tokens") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      let parsed;
      try { parsed = JSON.parse(body); } catch { parsed = {}; }
      const pieces = [
        ...(Array.isArray(parsed.system) ? parsed.system : [parsed.system]),
        ...(Array.isArray(parsed.messages) ? parsed.messages.map((m) => m?.content) : []),
      ];
      const chars = pieces.map((p) => flattenAnthropicContent(p)).join(" ").length;
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(anthropicCountTokensResponse(chars)));
    });
    return;
  }

  if (req.method === "POST" && req.url === "/v1/messages") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "bad json" } }));
        return;
      }

      const reqData = parseAnthropicRequest(parsed);
      if (reqData.error) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: reqData.error } }));
        return;
      }
      reqData.caller = callerFromRequest(req, "messages", parsed);

      const sessionId = sessionIdFromHeaders(req);
      const workspace = workspaceFromHeaders(req);
      const userId = userIdFromHeaders(req);
      log(`messages turn → session=${sessionId} user=${userId} model=${reqData.model} taskLength=${reqData.task.length} stream=${reqData.stream} workspace=${workspace ? `"${workspace}"` : "none"}`);

      const id = `msg_er7_${Date.now()}`;

      if (reqData.stream) {
        res.writeHead(200, {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
          "x-er7-session": sessionId,
        });

        // ── RESILIENCE SCAFFOLDING — same contract as the chat routes: a
        // client disconnect frees the generation slot, the deadline is a
        // generous whole-turn backstop over the per-call stream timeout.
        const turnAbort = new AbortController();
        const onDisconnect = () => {
          if (res.writableEnded) return;
          if (!turnAbort.signal.aborted) turnAbort.abort();
        };
        res.on("close", onDisconnect);
        const turnDeadline = setTimeout(() => {
          if (!turnAbort.signal.aborted) turnAbort.abort();
        }, TURN_DEADLINE_MS);
        const clearTurn = () => {
          clearTimeout(turnDeadline);
          res.removeListener("close", onDisconnect);
        };

        let outputTokens = 0;
        try {
          res.write(anthropicStreamStart({ id, model: parsed.model }));
          res.write(anthropicContentBlockStart(0));
          const result = await runProxyTurn({ sessionId, userId, workspace, signal: turnAbort.signal, ...reqData }, (token) => {
            if (!token) return;
            outputTokens += 1;
            res.write(anthropicContentBlockDelta(0, token));
          });
          clearTurn();
          res.write(anthropicContentBlockStop(0));
          res.write(anthropicMessageDelta({ outputTokens: outputTokens || (result?.usage?.completionTokens ?? 0) }));
          res.write(anthropicMessageStop());
          res.end();
        } catch (err) {
          clearTurn();
          log(`messages streaming error: ${err.message}`);
          const cancelled = err?.message === "cancelled";
          if (!res.writableEnded) {
            if (!cancelled) res.write(anthropicContentBlockDelta(0, `\n[EOReader7 error: ${err.message}]`));
            res.write(anthropicContentBlockStop(0));
            res.write(anthropicMessageDelta({ outputTokens }));
            res.write(anthropicMessageStop());
            res.end();
          }
        }
      } else {
        const turnAbort = new AbortController();
        const onDisconnect = () => {
          if (res.writableEnded) return;
          if (!turnAbort.signal.aborted) turnAbort.abort();
        };
        res.on("close", onDisconnect);
        const turnDeadline = setTimeout(() => {
          if (!turnAbort.signal.aborted) turnAbort.abort();
        }, TURN_DEADLINE_MS);
        try {
          const result = await runProxyTurn({ sessionId, userId, workspace, signal: turnAbort.signal, ...reqData });
          clearTimeout(turnDeadline);
          res.removeListener("close", onDisconnect);
          const resp = anthropicMessageResponse({ id, model: parsed.model, text: result.text, usage: result.usage });
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify(resp));
        } catch (err) {
          clearTimeout(turnDeadline);
          res.removeListener("close", onDisconnect);
          log(`messages error: ${err.message}`);
          if (!res.headersSent) {
            res.writeHead(err?.message === "cancelled" ? 499 : 500, { "content-type": "application/json" });
          }
          res.end(JSON.stringify({ type: "error", error: { type: err?.message === "cancelled" ? "cancelled" : "internal_error", message: err.message } }));
        }
      }
    });
    return;
  }

  forward(req, res);
}

// One handler, two doorways: the proxy port (11436, opencode) and the
// heimdall alias port (11437, claude / older clients). Same code, one process.
const server = http.createServer(handleRequest);
const aliasServer = http.createServer(handleRequest);

server.listen(PORT, "127.0.0.1", () => {
  log(`eoreader7 proxy listening on http://127.0.0.1:${PORT}`);
  log(`upstream: ${UPSTREAM}`);
  log(`opencode → http://127.0.0.1:${PORT}/v1`);
  // The heimdall alias port: claude and older clients still point at 11437.
  // A SECOND server, the SAME handler — one process, two doorways.
  aliasServer.listen(STEER_ALIAS_PORT, "127.0.0.1", () => {
    log(`heimdall alias on http://127.0.0.1:${STEER_ALIAS_PORT} (the watcher runs inside this process)`);
  });
  // HEIMDALL, WIRED IN — start the watcher (vitals + surface probes + the
  // fold surfaces' re-forge) on this process. The er7 surface IS this proxy:
  // its own port is watched for status but never re-forged (a proxy cannot
  // spawn a duplicate of itself).
  startWatcher({ selfPort: PORT });
  log("watcher: heimdall running inside the proxy");
  // Pre-load pyodide (WASM Python) in the background so the FIRST turn's
  // post-processing does not pay the ~10-16s cold-load. Fire-and-forget.
  warmPostprocess().then(({ available, error }) => {
    log(`post-processing runtime: ${available ? "pyodide ready" : `pyodide unavailable (${error})`}`);
  });

  // Keep models hot — OFF BY DEFAULT (ER7_KEEP_ALIVE_S=0). On a 24GB box every
  // model that got touched once earned a long keep_alive and they stacked up
  // (three models resident, the box dragging). Set ER7_KEEP_ALIVE_S > 0 to
  // turn this back on for a single pinned model (ER7_HOT_MODELS).
  if (OLLAMA_KEEP_ALIVE_S > 0) {
    const warmSet = hotModelSet();
    if (warmSet.size) log(`keep-warm: will hold resident: ${[...warmSet].join(", ")} (keep_alive ${OLLAMA_KEEP_ALIVE_S}s)`);
    for (const model of warmSet) {
      keepModelHot(model).then((ok) => {
        log(`keep-warm: ${model} ${ok ? "resident" : "NOT CONFIRMED"}`);
      });
    }
    setInterval(() => {
      for (const model of hotModelSet()) {
        keepModelHot(model).then((ok) => {
          if (!ok && !_warnedOnce.has(model)) {
            _warnedOnce.add(model);
            log(`keep-warm: ${model} did not confirm (was it pulled?)`);
          }
        });
      }
    }, KEEP_WARM_INTERVAL_MS);
  }
});

process.on("SIGINT", () => {
  log("shutting down");
  server.close(() => process.exit(0));
  aliasServer.close();
});
process.on("SIGTERM", () => {
  log("shutting down");
  server.close(() => process.exit(0));
  aliasServer.close();
});