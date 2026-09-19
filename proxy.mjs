import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { MODEL_PREFIX, parseProxyRequest, toOpenAIModelList, reprefixOllamaTags, openAIResponse, openAIStreamLines, ollamaChatResponse, ollamaChatStreamLines, humanizeNote, parseAnthropicRequest, flattenAnthropicContent, anthropicCountTokensResponse, anthropicMessageResponse, anthropicStreamStart, anthropicContentBlockStart, anthropicContentBlockDelta, anthropicContentBlockStop, anthropicMessageDelta, anthropicMessageStop } from "./proxy-api.mjs";
import { offeredOllamaModels, runProxyTurn, keepModelHot, hotModelSet, OLLAMA_KEEP_ALIVE_S, startDocumentJob, documentJobStatus, refreshOpencodeModels, upstreamModelFor, refreshAnthropicModels, upstreamAnthropicModelFor } from "./proxy-runner.mjs";
import { warmPostprocess } from "./postprocess.mjs";
import { ledgerFilePath, projectLedgerFile } from "./native/the-fold/document-ledger.js";
import { runCodeLoop } from "./native/the-fold/code-loop.js";
import { runSwarmTurn } from "./swarm-server.mjs";
import { runOpenCodingLoop, AGENT_MAX_TURNS } from "./native/the-fold/sandboxed-agent.js";
// AntiStrauss — the safety-and-ethics gate (native/the-fold/antistrauss.mjs).
// Every model call that enters this proxy through runProxyTurn is gated
// inside proxy-runner.mjs::streamOllamaChat, the single choke point before
// the upstream Ollama fetch. See the module header for the full wiring map;
// a refusal surfaces as an ERR_ANTISTRAUSS_BLOCKED error on the route below.
// The watcher, wired IN (2026-09-13): heimdall's vitals, admission, status,
// and surface-watching run inside this process — one process, no separate
// steer port, no second checkout to drift. When imported, heimdall.mjs
// exports its machinery and does not listen or loop on its own.
import { heimdallStatus, admitChat, startWatcher, markInflight, disclosure, observeCall, bridgeMessage, holonTree, declareLoop, mintRule, loadedModels, isBoxSaturated, readVitals, makeRuleAuthorHolon, derivedRuleStore, releaseClaim, isServable, markUnservable, markServable, seedUnservableLarge } from "./heimdall.mjs";
// "Computed, not generated" — the-fold's own house rule (arithmetic.js),
// reused directly rather than re-derived: a small model answering "what is
// today's date?" from its stale training data, with nothing in THIS proxy's
// pipeline checking it (no web access, no mechanical clock door of its
// own), was found live. `checkQuantity` is the-fold's own full ladder
// (arithmetic → shaped questions → calendar → clock → comparison) — a
// shared fix here reaches every caller of this endpoint, not only one
// client. mathjs is now a real dependency of this checkout's own root
// package.json (added alongside this wiring) rather than left as a
// disclosed absence: `checkArithmetic`/`checkShaped`/`checkComparison` all
// need an injected engine, and until now this proxy had none to give them.
import { checkQuantity } from "../the-fold/arithmetic.js";
import { create, all } from "mathjs";
const math = create(all);
// Knights-and-knaves: a closed, enumerable boolean-consistency puzzle,
// solved by exhaustive check — never narrated by the model. Found live in
// THIS proxy's own TUI: a 5-archivist puzzle got a free-text deduction that
// stalled mid-puzzle and, where it did finish, applied Knight/Knave
// polarity backwards. Same shared-pipeline reasoning as `checkQuantity`
// above — one fix here reaches every caller of this endpoint.
import { checkLogicPuzzle } from "../the-fold/logic-puzzle.js";
// A second, unrelated puzzle kind — attribute assignment (the zebra-puzzle
// family), no truth-tellers, no self-referential statements — sharing
// reasoning-core.js's solver with logic-puzzle.js and changing nothing
// there. Proves the search itself is general, not tuned to one puzzle.
import { checkPreferencePuzzle } from "../the-fold/preference-puzzle.js";
import { runMechanical, precisionWinner, CONCLUSION } from "./native/organs/precision-race.js";
// Archons on a Matrix homeserver (the-fold/archon-hyphae.mjs): one account +
// one EOT room per worktree-archon, the operator always an admin of every
// room, and the same record/print/list verbs reachable from THIS surface —
// the proxy every other surface talks to. One implementation, every door.
// The module was DELETED from the-fold by the user (2026-09-18) — the archons
// no longer write notes for each other. The import is therefore GUARDED: when
// the module is absent, the three verbs below are typed gaps on the record
// (the fold's own posture for an unbuilt organ), and the proxy boots without
// them — a missing feature must never block the whole surface.
let provisionArchon = null, recordArchon = null, loadArchonConversation = null, renderConversation = null, roster = null, DEFAULT_HS = null;
const ARCHON_GAP = { absent: true, reason: "the-fold/archon-hyphae.mjs was deleted by the operator — the archons no longer write notes; this surface's archon verbs are typed gaps", kind: "archon_unavailable" };
try {
  const hyphae = await import("../the-fold/archon-hyphae.mjs");
  ({ provisionArchon, recordArchon, loadArchonConversation, renderConversation, roster, DEFAULT_HS } = hyphae);
} catch (err) {
  if (err?.code !== "ERR_MODULE_NOT_FOUND") console.error(`[proxy] archon-hyphae import failed for a non-missing reason: ${err.message}`);
}
const archonUnavailable = () => ARCHON_GAP;

// The mechanical pipeline: each mechanism either settles the question, names
// a gap, or leaves it alone (native/organs/precision-race.js). It runs BESIDE
// the normal turn, never instead of it — the model's draft is a prediction,
// a settled mechanism is an observation, and the observation wins.
const MECHANISMS = [
  {
    name: "quantity",
    run(task) {
      const f = checkQuantity(task, { math, now: new Date() });
      if (!f) return null;
      if (f.gap) return { concluded: false, gap: `${f.expression} — ${f.gap}` };
      return { concluded: true, kind: CONCLUSION.BOUND, text: f.display, detail: { kind: f.kind ?? "arithmetic", op: f.op ?? null, expression: f.expression } };
    },
  },
  {
    name: "logic-puzzle",
    run(task) {
      const f = checkLogicPuzzle(task);
      if (!f) return null;
      const kind = f.valid.length === 1 ? CONCLUSION.BOUND : f.valid.length === 0 ? CONCLUSION.CONTRADICTED : CONCLUSION.CONTESTED;
      return { concluded: true, kind, text: f.display, detail: { valid: f.valid, external: f.external, totalTried: f.totalTried } };
    },
  },
  {
    name: "preference-puzzle",
    run(task) {
      const f = checkPreferencePuzzle(task);
      if (!f) return null;
      const kind = f.valid.length === 1 ? CONCLUSION.BOUND : f.valid.length === 0 ? CONCLUSION.CONTRADICTED : CONCLUSION.CONTESTED;
      return { concluded: true, kind, text: f.display, detail: { valid: f.valid, external: f.external, totalTried: f.totalTried } };
    },
  },
];

function raceReading(race) {
  return {
    winner: race.winner,
    basis: race.basis,
    mechanism: race.observation?.mechanism ?? null,
    kind: race.observation?.kind ?? null,
    detail: race.observation?.detail ?? null,
    gaps: race.observation?.gaps ?? [],
    superseded: race.superseded,
  };
}

const HERE = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.ER7_PROXY_PORT) || 11436;
// The heimdall alias port — claude and older clients point here. Same server,
// same code; keeping it means the merged watcher doesn't break existing
// configs that route through 11437.
const STEER_ALIAS_PORT = Number(process.env.ER7_HEIMDALL_PORT ?? 11437);
const UPSTREAM = process.env.ER7_UPSTREAM || "http://localhost:11434";
// NOTE (2026-09-19): the raw passthrough to UPSTREAM was removed. There is no
// generic forwarder left in this file — unmatched routes default-deny below
// with a typed unserved_path gap, so POST /api/generate and friends can never
// bypass the ethos/AntiStrauss gate. UPSTREAM survives only as a status string
// (GET /health) and as the Ollama origin proxy-runner.mjs dials internally.
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
function admitChatRequest(parsed, headers = {}) {
  const admit = admitChat(parsed ? JSON.stringify(parsed) : "{}", headers);
  // A fast-passed (ungated/remote) turn never touched the local box, so it
  // must not hold a local inflight slot — otherwise it would inflate
  // workAhead/ETA and trip the family cap for the local calls behind it.
  if (admit.allowed && !admit.fastPass) markInflight("er7", 1);
  return admit;
}
// A refusal answers with a REAL place in line (x-queue-position + the queue
// disclosure) so a caller can say "Heimdall: you're #3 · ~2m" instead of a
// bare 429. Every admission path shares this one shape.
function refuseAdmission(res, admit) {
  const headers = { "content-type": "application/json", "retry-after": String(admit.retryAfterS ?? 15) };
  if (admit.queue?.position != null) headers["x-queue-position"] = String(admit.queue.position);
  res.writeHead(admit.status, headers);
  res.end(JSON.stringify({ error: admit.message, type: admit.type, retry_after: admit.retryAfterS, queue: admit.queue ?? null, zipper: admit.zipper ?? null }));
}
function releaseChatRequest() {
  markInflight("er7", -1);
}
// Release the inflight mark once, on EITHER signal: 'finish' (the response
// was handed to the OS) or 'close' (the socket closed, possibly mid-stream on
// a disconnect). Idempotent — a keep-alive connection must never leave the
// mark stuck and 429 a false busy-lane.
function releaseOnResponse(res, claimId, admit = null) {
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    // Only release a slot that was actually taken: fast-passed turns never
    // marked one. The claim lease is always freed — exactly-once applies to
    // every lane.
    if (!admit?.fastPass) releaseChatRequest();
    // Free the turn's lease the moment it finishes (or fails / disconnects),
    // so a device that stalled is not waited out for the whole lease — the
    // recovery turn on another device starts as soon as the claim is gone.
    if (claimId) releaseClaim(claimId);
  };
  res.on("finish", release);
  res.on("close", release);
}

// NOTE (2026-09-19): forward() — the raw passthrough that piped any unmatched
// route directly to ER7_UPSTREAM with no ethos/AntiStrauss gate — was deleted
// here. Do not re-add a generic proxy: every model-touching route must go
// through runProxyTurn (ethos clearance + antistrauss.gate inside
// proxy-runner.mjs::streamOllamaChat). Unknown paths default-deny at the end
// of handleRequest with a typed unserved_path gap.

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
      // HEIMDALL'S CALL: seed the doubt — a large model that has never
      // answered is not offered until it proves itself; then keep only what
      // this box can actually serve right now.
      seedUnservableLarge(tags.models ?? []);
      // HEIMDALL'S CALL: the roster is only what this box can actually serve
      // right now — a model disclosed as hanging, or one that timed out with
      // nothing returned, is not offered until it proves it answers.
      const realNames = (tags.models ?? [])
        .map((m) => m.name || m.model)
        .filter((name) => isServable(name));
      // THE SECOND LANE: Claude/DeepSeek models the opencode server can serve
      // (discovery already applies the narrow door, so this list is only what
      // the lane may actually serve). Best-effort — an opencode outage never
      // breaks the local roster, it just offers no remote models.
      let opencodeIds = [];
      try {
        opencodeIds = [...await refreshOpencodeModels()];
      } catch { /* the local roster stands on its own */ }
      // THE THIRD LANE: frontier Claude models served directly by Anthropic's
      // own API (ANTHROPIC_API_KEY). Best-effort like the second lane — no key
      // means no frontier ids, and the local roster stands on its own.
      let anthropicIds = [];
      try {
        anthropicIds = [...await refreshAnthropicModels()];
      } catch { /* the local roster stands on its own */ }
      const list = toOpenAIModelList([...realNames, ...opencodeIds, ...anthropicIds]);
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

  // /v1/archons — the archons' EOT rooms on a Matrix homeserver, read from
  // THIS surface (the one every other surface talks through). record appends
  // an EOT entry to an archon's room; conversation prints the FULL stream —
  // every entry of every kind, both roles, gaps named, nothing hidden. All
  // three verbs are the-fold/archon-hyphae.mjs's one implementation, so a
  // call from the TUI, the browser, or a raw client sees the identical text.
  if (req.method === "GET" && req.url === "/v1/archons") {
    try {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(roster ? { archons: roster(), homeserver: DEFAULT_HS } : { gap: ARCHON_GAP }));
    } catch (err) {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { message: err.message } }));
    }
    return;
  }

  if (req.method === "POST" && /^\/v1\/archons\/[^/]+\/record$/.test(req.url)) {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      try {
        if (!recordArchon) { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ gap: ARCHON_GAP })); return; }
        const slug = decodeURIComponent(req.url.split("/")[3]);
        const parsed = JSON.parse(body || "{}");
        const text = String(parsed.text ?? parsed.task ?? "").trim();
        if (!text) { res.writeHead(400, { "content-type": "application/json" }); res.end(JSON.stringify({ error: { message: "record needs text" } })); return; }
        const r = await recordArchon(parsed.homeserver ?? DEFAULT_HS, slug, { text, kind: parsed.kind ?? "lesson", role: parsed.role ?? "assistant" });
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(r));
      } catch (err) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: { message: err.message } }));
      }
    });
    return;
  }

  if (req.method === "GET" && /^\/v1\/archons\/[^/]+\/conversation$/.test(req.url)) {
    try {
      if (!loadArchonConversation) { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ gap: ARCHON_GAP })); return; }
      const slug = decodeURIComponent(req.url.split("/")[3]);
      const hs = req.headers["x-er7-homeserver"] ?? DEFAULT_HS;
      const loaded = await loadArchonConversation(hs, slug);
      const text = renderConversation(loaded);
      res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      res.end(text);
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
  // POST /v1/swarm — explicit swarm dispatch (capacity-swarm, wired).
  // { task (NL pointing), text?, attachments?[{name,text}], name?, query?, claim? }
  // No model call and no Heimdall admission: pure organ reads, each capacity
  // capped at its own 8000 chars by capacity-runner.js; the bar is measured
  // per call. Returns the JSON-safe report + `answer` prose.
  if (req.method === "POST" && req.url === "/v1/swarm") {
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
      const task = String(parsed?.task ?? "");
      const sessionId = sessionIdFromHeaders(req);
      const texts = [
        ...(typeof parsed?.text === "string" && parsed.text ? [{ name: String(parsed?.name ?? "swarm-material"), text: parsed.text }] : []),
        ...(Array.isArray(parsed?.attachments) ? parsed.attachments.map((a, i) => ({ name: String(a?.name ?? `attachment-${i + 1}`).slice(0, 120), text: String(a?.text ?? "") })).filter((a) => a.text.trim()) : []),
      ];
      try {
        const report = runSwarmTurn({ task, texts, name: String(parsed?.name ?? "swarm-material"), query: parsed?.query, claim: parsed?.claim, force: true });
        res.writeHead(200, { "content-type": "application/json", "x-er7-session": sessionId });
        res.end(JSON.stringify({ sessionId, ...report }));
      } catch (err) {
        log(`swarm execution error: ${err.message}`);
        if (!res.headersSent) res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

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

      const admit = admitChatRequest({ model }, req.headers);
      if (!admit.allowed) {
        refuseAdmission(res, admit);
        return;
      }
      releaseOnResponse(res, String(req.headers["x-er7-claim"] || req.headers["x-er7-session"] || ""), admit);

      // A body-supplied sessionId is honored first (a caller with no header
      // machinery can still keep one accumulating reader fold across calls
      // by just repeating the same string); the header/derived fallback
      // below is what every other endpoint already uses.
      const sessionId = String(parsed?.sessionId ?? "").trim() || sessionIdFromHeaders(req);
      const workspace = String(parsed?.workspace ?? "").trim() || workspaceFromHeaders(req);
      const attachments = Array.isArray(parsed?.attachments)
        ? parsed.attachments.map((a, i) => ({ name: String(a?.name ?? `attachment-${i + 1}`).slice(0, 120), text: String(a?.text ?? "") })).filter((a) => a.text.trim())
        : [];
      const userId = userIdFromHeaders(req);
      log(`ask → session=${sessionId} user=${userId} model=${model} taskLength=${task.length} mode=${mode} workspace=${workspace ? `"${workspace}"` : "none"}`);

      const turnAbort = new AbortController();
      const onDisconnect = () => {
        if (res.writableEnded) return;
        if (!turnAbort.signal.aborted) turnAbort.abort();
      };
      res.on("close", onDisconnect);
      const turnDeadline = setTimeout(() => {
        if (!turnAbort.signal.aborted) {
          markUnservable(model, "turned_no_answer");
          turnAbort.abort();
        }
      }, TURN_DEADLINE_MS);
      try {
        const result = await runProxyTurn({
          sessionId, userId, workspace, attachments, model, task, mode,
          chatHistory: Array.isArray(parsed?.chatHistory) ? parsed.chatHistory : [],
          resumeAnswered: Array.isArray(parsed?.resumeAnswered) ? parsed.resumeAnswered : [],
          openBefore: Array.isArray(parsed?.openBefore) ? parsed.openBefore : null,
          caller: callerFromRequest(req, "ask", parsed),
          signal: turnAbort.signal,
        });
        markServable(model); // it answered — Heimdall keeps it servable
        clearTimeout(turnDeadline);
        res.removeListener("close", onDisconnect);
        res.writeHead(200, { "content-type": "application/json", "x-er7-session": sessionId });
        res.end(JSON.stringify({
          answer: result.text,
          sessionId,
          model: result.model ?? model,
          heimdall: bridgeMessage({ model: result.model ?? model }),
          interlocutor: result.interlocutor ?? null,
          usage: { promptTokens: result.usage?.promptTokens ?? 0, completionTokens: result.usage?.completionTokens ?? 0 },
          relationEdges: result.relationEdges,
          referentBindings: result.referentBindings,
          thinking: result.thinking ?? null,
          answerShape: result.answerShape ?? null,
          truncated: result.truncated ?? false,
          document: result.document ?? null,
          // THE ASK-BACK ENVELOPE (build-clarify): the person sees the plain
          // questions in `answer`; the record carries the structured shape —
          // which cells are open, the round, the schema — so the fold, the
          // TUI and a raw client render the SAME door and answer with the
          // SAME {cell, value} shape (ONE-ENGINE-PLAN: one turn, every door).
          mechanical: result.mechanical ?? null,
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

      const admit = admitChatRequest({ model }, req.headers);
      if (!admit.allowed) {
        refuseAdmission(res, admit);
        return;
      }
      releaseOnResponse(res, String(req.headers["x-er7-claim"] || req.headers["x-er7-session"] || ""), admit);

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

      const admit = admitChatRequest({ model }, req.headers);
      if (!admit.allowed) {
        refuseAdmission(res, admit);
        return;
      }
      releaseOnResponse(res, String(req.headers["x-er7-claim"] || req.headers["x-er7-session"] || ""), admit);

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
        // Disclosure rides with the response: every virtual-file move the
        // loop makes is collected here (agent_list/read/write/run/done, plus
        // the inner reading pipeline's own notes tagged with agentTurn) and
        // returned as `notes` — the record, alongside `rounds` (the display).
        // Nothing leaves the sandbox to produce it: virtual Map + severed
        // vm.Context only, no real disk, no egress.
        const notes = [];
        const onNote = (n) => { if (n && typeof n === "object") notes.push(n); };
        const result = await runOpenCodingLoop({ sessionId, userId, model, task, files, maxTurns, caller: callerFromRequest(req, "agent", parsed), signal: loopAbort.signal, onNote });
        clearTimeout(loopDeadline);
        res.removeListener("close", onDisconnect);
        res.writeHead(200, { "content-type": "application/json", "x-er7-session": sessionId });
        res.end(JSON.stringify({ done: result.done, answer: result.answer, rounds: result.rounds, files: Object.fromEntries(result.files), notes }));
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
      const admit = admitChatRequest(parsed, req.headers);
      if (!admit.allowed) {
        refuseAdmission(res, admit);
        return;
      }
      releaseOnResponse(res, String(req.headers["x-er7-claim"] || req.headers["x-er7-session"] || ""), admit);

      const sessionId = sessionIdFromHeaders(req);
      const workspace = workspaceFromHeaders(req);
      const userId = userIdFromHeaders(req);
      log(`turn → session=${sessionId} user=${userId} model=${reqData.model} taskLength=${reqData.task.length} stream=${reqData.stream} mode=${reqData.mode} workspace=${workspace ? `"${workspace}"` : "none"}`);

      // SWARM AUTO-ROUTE (swarm-server.mjs — capacity-swarm): NL that names
      // swarming never reaches the model. The pointed capacities run through
      // Wilson's own gate over this turn's own material (attachments +
      // history) and the measured report IS the answer — no model call, bar
      // measured per turn. Ordinary chat is untouched (intent gate: only
      // swarm/ants/every-capacity phrasing routes).
      const swarmTurn = runSwarmTurn({
        task: reqData.task,
        texts: [
          ...(reqData.attachments ?? []).map((a) => ({ name: a.name, text: a.text })),
          ...(reqData.chatHistory ?? []).map((m, i) => ({ name: `history-${i}`, text: m.content })),
        ],
        name: "chat-turn",
      });
      if (swarmTurn.routed) {
        const created = Math.floor(Date.now() / 1000);
        const id = `er7-${Date.now()}`;
        const swarmReading = { sessionId, answerShape: "swarm", swarm: { ...swarmTurn, answer: undefined }, truncated: false };
        if (reqData.stream) {
          res.writeHead(200, {
            "content-type": "text/event-stream",
            "cache-control": "no-cache",
            connection: "keep-alive",
            "x-er7-session": sessionId,
          });
          for (const line of openAIStreamLines({ id, model: parsed.model, text: swarmTurn.answer, created, reading: swarmReading })) res.write(line);
          res.end();
        } else {
          const resp = openAIResponse({ id, model: parsed.model, text: swarmTurn.answer, created, usage: { promptTokens: 0, completionTokens: 0 }, reading: swarmReading });
          resp.reading.sessionId = sessionId;
          resp.heimdall = bridgeMessage({ model: parsed.model });
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify(resp));
        }
        return;
      }

      const created = Math.floor(Date.now() / 1000);
      const id = `er7-${Date.now()}`;

      // The mechanical pipeline starts now and runs on its own; the normal
      // turn below proceeds exactly as it would without it.
      const observationP = runMechanical(reqData.task, MECHANISMS);

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
          if (!turnAbort.signal.aborted) {
            // reqData.model: the stripped id of the mouth on THIS turn. A bare
            // `model` is not in scope on these routes — naming it crashed the
            // whole proxy on the first slow-turn deadline (measured 2026-09-19:
            // a ReferenceError in this timer killed the process mid-battery).
            markUnservable(reqData.model, "turned_no_answer");
            turnAbort.abort();
          }
        }, TURN_DEADLINE_MS);
        const clearTurn = () => {
          clearTimeout(turnDeadline);
          res.removeListener("close", onDisconnect);
        };

        let first = true;
        let reasoningOpen = false;
        // A slow mechanism would delay the stream's first token by its own
        // run time; today's mechanisms settle in well under a millisecond.
        const observation = await observationP;
        const mechanicalWins = observation.concluded;
        const writeContent = (token) => {
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
        // When the observation has concluded, the computed text is the
        // content and the model's tokens are kept as the superseded draft.
        const emit = mechanicalWins ? () => {} : writeContent;
        if (mechanicalWins) writeContent(observation.text);
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
          if (result?.model) parsed.model = result.model; // plain-speech switch disclosed: the envelope names who answered
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
              workspace: result.workspace ?? null, attachments: result.attachments ?? null,
              post: result.post ?? null,
              thinking: result.thinking ?? null,
              answerShape: result.answerShape ?? null,
              truncated: result.truncated ?? false,
              document: result.document ?? null,
              // A mechanical verdict (verbatim snip) rides the chunk whole,
              // so every surface can render non-model prose as snipped —
              // visually distinct from generated text — never as the model's
              // own words.
              mechanical: result.mechanical ?? null,
              quote: result.quote ?? null,
              // THE FULL READING, STREAMED — the per-sentence surface, the
              // charter verdict, the archons, the void, the resolutions, the
              // satisfaction. A UI drawing marks LIVE (the-fold's browser
              // chat) needs these in the streamed final chunk, not only the
              // non-streaming body — ONE-ENGINE-PLAN's named gap ("streaming
              // today drops most of reading").
              reading: result.reading ?? null,
              charter: result.charter ?? null,
              groundedWisdom: result.groundedWisdom ?? null,
              privacy: result.privacy ?? null,
              copy: result.copy ?? null,
              security: result.security ?? null,
              blindspot: result.blindspot ?? null,
              pii: result.pii ?? null,
              injection: result.injection ?? null,
              shadow: result.shadow ?? null,
              shadowSites: result.shadowSites ?? null,
              interlocutor: result.interlocutor ?? null,
              surfed: result.surfed ?? null,
              resolutions: result.resolutions ?? null,
              satisfaction: result.satisfaction ?? null,
              kelsen: result.kelsen ?? null,
              void: result.void ?? null,
              mode: result.mode ?? null,
              usage: result.usage ?? null,
              race: raceReading(precisionWinner({ observation, draft: result.text })),
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
          if (!turnAbort.signal.aborted) {
            // reqData.model: the stripped id of the mouth on THIS turn. A bare
            // `model` is not in scope on these routes — naming it crashed the
            // whole proxy on the first slow-turn deadline (measured 2026-09-19:
            // a ReferenceError in this timer killed the process mid-battery).
            markUnservable(reqData.model, "turned_no_answer");
            turnAbort.abort();
          }
        }, TURN_DEADLINE_MS);
        try {
          const result = await runProxyTurn({ sessionId, userId, workspace, signal: turnAbort.signal, ...reqData });
          if (result?.model) parsed.model = result.model; // plain-speech switch disclosed: the envelope names who answered
          clearTimeout(turnDeadline);
          res.removeListener("close", onDisconnect);
          const race = precisionWinner({ observation: await observationP, draft: result.text });
          const resp = openAIResponse({ id, model: parsed.model, text: race.text, created, usage: result.usage, reading: result });
          resp.reading.race = raceReading(race);
          resp.reading.sessionId = sessionId;
          resp.reading.thinking = result.thinking ?? null;
          resp.reading.answerShape = result.answerShape ?? null;
          resp.reading.truncated = result.truncated ?? false;
          resp.reading.document = result.document ?? null;
          resp.heimdall = bridgeMessage({ model: parsed.model });
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
      const admit = admitChatRequest(parsed, req.headers);
      if (!admit.allowed) {
        refuseAdmission(res, admit);
        return;
      }
      releaseOnResponse(res, String(req.headers["x-er7-claim"] || req.headers["x-er7-session"] || ""), admit);

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
          if (!turnAbort.signal.aborted) {
            // reqData.model: the stripped id of the mouth on THIS turn. A bare
            // `model` is not in scope on these routes — naming it crashed the
            // whole proxy on the first slow-turn deadline (measured 2026-09-19:
            // a ReferenceError in this timer killed the process mid-battery).
            markUnservable(reqData.model, "turned_no_answer");
            turnAbort.abort();
          }
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
          if (!turnAbort.signal.aborted) {
            // reqData.model: the stripped id of the mouth on THIS turn. A bare
            // `model` is not in scope on these routes — naming it crashed the
            // whole proxy on the first slow-turn deadline (measured 2026-09-19:
            // a ReferenceError in this timer killed the process mid-battery).
            markUnservable(reqData.model, "turned_no_answer");
            turnAbort.abort();
          }
        }, TURN_DEADLINE_MS);
        try {
          const result = await runProxyTurn({ sessionId, userId, workspace, signal: turnAbort.signal, ...reqData });
          if (result?.model) parsed.model = result.model; // plain-speech switch disclosed: the envelope names who answered
          clearTimeout(turnDeadline);
          res.removeListener("close", onDisconnect);
          const resp = ollamaChatResponse({ model: parsed.model, text: result.text, createdAt, usage: result.usage, reading: result });
          resp.reading = { ...(result.reading ?? result), sessionId };
          resp.heimdall = bridgeMessage({ model: parsed.model });
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
          if (!turnAbort.signal.aborted) {
            // reqData.model: the stripped id of the mouth on THIS turn. A bare
            // `model` is not in scope on these routes — naming it crashed the
            // whole proxy on the first slow-turn deadline (measured 2026-09-19:
            // a ReferenceError in this timer killed the process mid-battery).
            markUnservable(reqData.model, "turned_no_answer");
            turnAbort.abort();
          }
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
          if (!turnAbort.signal.aborted) {
            // reqData.model: the stripped id of the mouth on THIS turn. A bare
            // `model` is not in scope on these routes — naming it crashed the
            // whole proxy on the first slow-turn deadline (measured 2026-09-19:
            // a ReferenceError in this timer killed the process mid-battery).
            markUnservable(reqData.model, "turned_no_answer");
            turnAbort.abort();
          }
        }, TURN_DEADLINE_MS);
        try {
          const result = await runProxyTurn({ sessionId, userId, workspace, signal: turnAbort.signal, ...reqData });
          if (result?.model) parsed.model = result.model; // plain-speech switch disclosed: the envelope names who answered
          clearTimeout(turnDeadline);
          res.removeListener("close", onDisconnect);
          const resp = anthropicMessageResponse({ id, model: parsed.model, text: result.text, usage: result.usage });
          resp.heimdall = bridgeMessage({ model: parsed.model });
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

  // DEFAULT-DENY (2026-09-19): the old forward(req,res) passthrough stood
  // here and piped ANY unmatched route (POST /api/generate, /api/show,
  // /api/embed, ...) straight to Ollama with no ethos/AntiStrauss gate.
  // Now: unknown paths are a typed gap, never a proxy. Served routes are all
  // matched above — GET /, /health, /heimdall (+POST /heimdall/observe),
  // GET /v1/models, GET /api/tags, POST /v1/ask|code|agent, POST
  // /v1/chat/completions, POST /api/chat, POST /v1/messages(+/count_tokens),
  // document + archon verbs. Anything else 404s here.
  let pathname = req.url || "/";
  try {
    pathname = new URL(req.url, "http://localhost").pathname;
  } catch { /* keep the raw url as the reported path */ }
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: `no such route: ${req.method} ${pathname}`, type: "unserved_path", path: pathname, method: req.method }));
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
  // The residency holon's HYSTERESIS STATE and THRESHOLDS (module-scoped,
  // persist across cadences — the ant bridge's memory of whether it is
  // standing down, and the two separated lines it stands down/resumes at).
  let _residencyStanding = "active";
  let _residencyClearTicks = 0;
  const _residencyStandbyIdle = Number(process.env.ER7_RESIDENCY_STANDBY_IDLE ?? 10);
  const _residencyResumeIdle = Number(process.env.ER7_RESIDENCY_RESUME_IDLE ?? 30);
  const _residencyClearTicksNeeded = Number(process.env.ER7_RESIDENCY_CLEAR_TICKS ?? 3);
  // The residency holon — Heimdall's own DEF→EVA→REC child. It watches the
  // models that have served turns and holds them resident (the "do not
  // evict" policy): when a used model drops out of /api/ps, it re-warms it
  // rather than letting the next caller eat the cold-load. It is the bridge's
  // own hands on the keep-alive, at holon cadence, on the record.
  declareLoop({
    name: "residency",
    def: "a model that has served a turn stays resident; a dropped one is re-warmed before the next caller pays the load — but never while the box is busy, and never flapping (hysteresis: stand down and resume at DIFFERENT thresholds, and only after the box has been clear for N consecutive ticks — the army-ant bridge's own lesson, Nature Comm. 2022)",
    cadenceMs: Number(process.env.ER7_RESIDENCY_CADENCE_MS ?? 45000),
    // HYSTERESIS (the army-ant bridge's lesson, Nature Comm. 2022 — declared
    // constants above: standbyIdle/resumeIdle/clearTicks): stand down and
    // resume at DIFFERENT cpuIdle thresholds, and only after N consecutive
    // clear ticks, so load oscillating around one line never flaps the holon.
    sense: async () => {
      const idle = readVitals()?.cpuIdle ?? null;
      // Standing-down state persists across cadences (module-scoped): once
      // the holon stands down it stays down until the box is clear enough
      // AND clear long enough — the ant bridge's hysteresis, never a snap.
      if (_residencyStanding === "standby") {
        // In standby: only a sustained clear box resumes warming.
        if (idle == null) return { class: "stand_down", probe: "no_vitals", missing: [] };
        if (idle < _residencyResumeIdle) {
          _residencyClearTicks = 0;
          return { class: "stand_down", probe: `idle_${Math.round(idle)}%<resume_${_residencyResumeIdle}%`, missing: [] };
        }
        _residencyClearTicks += 1;
        if (_residencyClearTicks < _residencyClearTicksNeeded) {
          return { class: "stand_down", probe: `clear_${_residencyClearTicks}/${_residencyClearTicksNeeded}`, missing: [] };
        }
        // Sustained clear — resume. Reset the state; the code below runs.
        _residencyStanding = "active";
        _residencyClearTicks = 0;
        log(`REC — residency: box clear ${_residencyClearTicksNeeded} ticks at ${Math.round(idle)}% idle — warming resumed`);
      }
      // Active: stand down on saturation (the standby line), then hysteresis
      // decides when warming may return.
      if (idle != null && idle <= _residencyStandbyIdle) {
        _residencyStanding = "standby";
        _residencyClearTicks = 0;
        log(`REC — residency: box pegged at ${Math.round(idle)}% idle — stand down (resume only at ≥${_residencyResumeIdle}% for ${_residencyClearTicksNeeded} ticks)`);
        return { class: "stand_down", probe: `saturated_idle_${Math.round(idle)}%`, missing: [] };
      }
      const resident = new Set((loadedModels() ?? []).map((m) => m.name));
      const used = hotModelSet();
      const missing = [...used].filter((m) => !resident.has(m));
      return missing.length ? { class: "model_dropped", probe: missing.slice(0, 1).join(","), missing: missing.slice(0, 1) } : null;
    },
    act: async (finding) => {
      if (finding.class === "stand_down") {
        return { note: `stand-down: ${finding.probe} — no re-warm this cadence` };
      }
      const warmed = [];
      for (const m of finding.missing) {
        try { if (await keepModelHot(m)) warmed.push(m); } catch { /* one bad warm is not a finding */ }
      }
      return { note: warmed.length ? `re-warmed: ${warmed.join(", ")}` : null, warmed };
    },
  });
  log("holon: residency declared (saturation-gated, hysteretic)");

  // THE RULE-AUTHOR HOLON — the swarm reads its own ledger and writes its
  // own standing rules (Wilson, 2026-09-17). Every tick it counts how often
  // each finding-class recurred in the window; a pattern past the floor
  // earns a derived rule (giver heimdall, standing disclosed, falsifying
  // control carried), adopted once and never re-derived every tick. The
  // bridge learns its own rules from its own recorded history — no mind.
  declareLoop({
    name: "rule-author",
    def: "the swarm reads its own ledger: a finding that recurs past the floor earns a standing rule (with its falsifying control); the bridge writes its own emergent law",
    cadenceMs: Number(process.env.ER7_RULE_AUTHOR_CADENCE_MS ?? 120000),
    sense: makeRuleAuthorHolon().sense,
    act: makeRuleAuthorHolon().act,
  });
  log("holon: rule-author declared (emergent rules from the ledger)");
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
    // Warming into a memory-pressured box is futile (learned 2026-09-19: a
    // 9GB load with ~47MB free hung 120s+): stand down, don't deepen the storm.
    const pressuredNow = () => {
      const v = readVitals?.() ?? null;
      return v?.memFreeMb != null && v.memFreeMb < Number(process.env.ER7_MEM_FLOOR_MB ?? 512);
    };
    const warmSet = hotModelSet();
    if (warmSet.size) log(`keep-warm: will hold resident: ${[...warmSet].join(", ")} (keep_alive ${OLLAMA_KEEP_ALIVE_S}s)`);
    for (const model of warmSet) {
      if (upstreamModelFor(model)) continue; // no Ollama copy to hold — not a failure
      if (upstreamAnthropicModelFor(model)) continue; // direct Anthropic lane — no local copy either
      if (pressuredNow()) { log(`keep-warm: standing down (memory pressured) — ${model} not warmed`); continue; }
      keepModelHot(model).then((ok) => {
        log(`keep-warm: ${model} ${ok ? "resident" : "NOT CONFIRMED"}`);
      });
    }
    setInterval(() => {
      if (pressuredNow()) return; // the storm deepens if warming fights callers for pages
      for (const model of hotModelSet()) {
        // Opencode-lane models have no Ollama copy to hold: keepModelHot
        // no-ops for them (falsy), which is NOT a failure — skip silently
        // instead of crying "was it pulled?" every interval. Same for the
        // direct Anthropic lane.
        if (upstreamModelFor(model)) continue;
        if (upstreamAnthropicModelFor(model)) continue;
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