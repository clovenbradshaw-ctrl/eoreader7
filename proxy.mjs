import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { MODEL_PREFIX, parseProxyRequest, toOpenAIModelList, reprefixOllamaTags, openAIResponse, openAIStreamLines, ollamaChatResponse, ollamaChatStreamLines, humanizeNote, parseAnthropicRequest, flattenAnthropicContent, anthropicCountTokensResponse, anthropicMessageResponse, anthropicStreamStart, anthropicContentBlockStart, anthropicContentBlockDelta, anthropicContentBlockStop, anthropicMessageDelta, anthropicMessageStop } from "./proxy-api.mjs";
import * as ProxyRunner from "./proxy-runner.mjs";
// Claude Code's hook doorway and the reasoning door, POST /v1/hooks/claude-code
// and /v1/reason (claude-code-doorway.mjs). Namespace-imported for the same
// reason as ProxyRunner below.
import * as ClaudeCodeDoorway from "./claude-code-doorway.mjs";
// Namespace-imported and destructured so a sibling editing proxy-runner.mjs
// can never take this process down by removing one export: a missing name is
// undefined (and defaulted below), never a fatal static-import error.
const {
  offeredOllamaModels, runProxyTurn, keepModelHot, hotModelSet, OLLAMA_KEEP_ALIVE_S,
  startDocumentJob, documentJobStatus, refreshOpencodeModels, upstreamModelFor,
  refreshAnthropicModels, upstreamAnthropicModelFor,
} = ProxyRunner;
const listSessions = ProxyRunner.listSessions || (() => []);
let _inflight = 0; // turns currently running — the model watchdog never fires during one

// The mechanical code build (2026-09-21): a discrete multi-unit coding task is
// decomposed, the units drawn CONCURRENTLY, then assembled and validated —
// triggered by a REGULAR NL PROMPT, not a hand-built harness.
import { detectBuildTask, buildCodeTask } from "./native/organs/code-build.js";

// The caller's own tier ask for an ENGINE turn (x-er7-tier): "exact" pins
// the asked model for every draw; anything else lets Heimdall's mouth pick
// the fastest on-device mouth (heimdall.mjs mouthFor). Same header the
// channel reads.
function turnTierAsk(req) {
  const t = String(req?.headers?.["x-er7-tier"] || "").trim().toLowerCase();
  return t === "exact" ? "exact" : "any";
}

// The default model, chosen from what the box can ACTUALLY serve — hot first,
// then resident — never a hard-coded name that may be seeded unservable (the
// old `olmo2:7b` default 503'd every model-less ask; measured).
function pickDefaultModel() {
  try { const hot = [...hotModelSet()][0]; if (hot) return String(hot).replace(/^er7:/, ""); } catch { /* no hot set */ }
  try { const res = loadedModels(); const n = Array.isArray(res) ? res.map((m) => m.name || m.model).find(Boolean) : null; if (n) return n; } catch { /* unknown residency */ }
  return process.env.ER7_DEFAULT_MODEL || "gemma2:2b";
}
import { warmPostprocess } from "./postprocess.mjs";
import { ledgerFilePath, projectLedgerFile } from "./native/the-fold/document-ledger.js";
import { runCodeLoop } from "./native/the-fold/code-loop.js";
import { runSwarmTurn } from "./swarm-server.mjs";
import { contentRulesStore, contentRulesCount, CONTENT_RULES_FILE } from "./content-rules.mjs";
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
import { heimdallStatus, admitChat, startWatcher, markInflight, disclosure, observeCall, bridgeMessage, holonTree, declareLoop, mintRule, loadedModels, isBoxSaturated, readVitals, makeRuleAuthorHolon, derivedRuleStore, releaseClaim, isServable, markServable, seedUnservableLarge, liveReap, onLog, consolidateMemory, heimdallAsk, heimdallSettings, setHeimdallSetting, onLive, recordTurnMs, runHolonTree, logLines, contentLog, restartSurface, sampleVitalsNow, backgroundTasks, killTask, warmPressureTest, warmPressureReason, isUngatedModel, emitLive, evictModel, handleReport, beginTurn, endTurn, noteMechanism, quitMemoryHogs, quitApps, restartModelServer, probeModelServer, currentParallelism, getSurfaces, refreshOllamaModels, surfaceByPort, noteSurfaceActivity, turnScope, servedDisclosure } from "./heimdall.mjs";
import { heldKey, findHeld, holdTurn, heldById, heldReceipt, awaitHeld } from "./held-turns.mjs";
import { resolveServerKey, channelObserve, channelRefused, pickHost, hostBegin, hostEnd, reconcileModelServers, ledgerEva, ledgerRec, setChannelBound, liveReapIfDue, holdWindow, hopOf, messagesOf, streamAccounting, hostOwnedByPid, slaWaitMs, waiterTtlMs, serveTiersFor, mouthFor, warmSmallMouth, hostByName, onlineMouths, onlineEnabled } from "./heimdall.mjs";
import { toOpenAIBody, fromOpenAIResponse, sseChunkToOllama, splitSse } from "./native/kernel/online-mouths.js";
import { recordProvisional, getRevision, revisionReceipt, pendingRevisions, markAttempted, markDrawn, markFailed } from "./native/kernel/revisions.mjs";
import { MODEL_SERVER_URL, CHANNEL_PORT } from "./native/kernel/model-server.js";
import { antistrauss } from "./native/the-fold/antistrauss.mjs";
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

// THE GROUNDING GATE (2026-09-23) — `void.satisfied`/`satisfaction.ok` are
// finalized deep inside runProxyTurn (proxy-runner.mjs's chatVoidCheck): a
// mechanical check of the PROSE ALONE (non-empty, right shape, not meta),
// with zero knowledge of `race` (precisionWinner, computed here, AFTER
// runProxyTurn returns) or of `reading.claims` (readAnswerClaims — which
// sentences of the answer were actually bound as checked claims against a
// source). The two are merged as unrelated sibling keys onto the outgoing
// reading object at each response-assembly site, with nothing reconciling
// them: a model free-answer that CONTRADICTS its own attached source reads
// `satisfied: true` whenever race.winner==="model" (no mechanism settled it)
// and claims.length===0 (nothing in the answer bound to a source), because
// the prose itself is well-formed. This is additive only — a case where a
// mechanism won the race, or a claim actually bound to a source, is
// untouched.
function groundingGate(readingObj, race) {
  if (!readingObj || !race) return readingObj;
  const claimsCount = readingObj.reading?.claims?.length ?? readingObj.claims?.length ?? 0;
  if (race.winner === "model" && claimsCount === 0) {
    if (readingObj.void) readingObj.void = { ...readingObj.void, satisfied: false };
    if (readingObj.satisfaction) readingObj.satisfaction = { ...readingObj.satisfaction, ok: false };
    readingObj.disclosed = {
      ...(readingObj.disclosed ?? null),
      unchecked: true,
      basis: "no mechanism settled this question and no claim bound to a source — an unchecked model guess, not a checked answer",
    };
  }
  return readingObj;
}

const HERE = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.ER7_PROXY_PORT) || 11436;
// The surface this proxy IS, on the watcher's registry ("er7", port 11436).
// Every live token/call event emitted from this process belongs to it, so the
// watch surface can show which content is being generated for which server.
const OWN_SURFACE = "er7";

// WHICH SERVER IS THIS TURN GOING THROUGH (2026-09-21). Every fold page
// calls this proxy from the browser, so until now every fold turn read as
// er7's and the fold spans on the watch never moved. The page's Origin (or
// Referer) names the port it was served from; that port names a registered
// surface. An explicit x-er7-surface header is honored only when it names a
// registered surface. Anything else is er7's own traffic.
function surfaceFromRequest(req) {
  const h = req?.headers || {};
  const declared = String(h["x-er7-surface"] ?? "").trim();
  if (declared && getSurfaces().some((s) => s.name === declared)) return declared;
  for (const k of ["origin", "referer"]) {
    const v = String(h[k] ?? "");
    const m = /^https?:\/\/[^/]*?:(\d+)/.exec(v);
    if (m) { const s = surfaceByPort(m[1]); if (s) return s.name; }
  }
  return OWN_SURFACE;
}
// The words that went IN — the task, or the last user message — capped so
// the watch shows the prompt beside the answer without carrying a corpus.
function promptTextOf(task, messages) {
  if (typeof task === "string" && task.trim()) return task.slice(0, 2000);
  const arr = Array.isArray(messages) ? messages : [];
  for (let i = arr.length - 1; i >= 0; i--) {
    const m = arr[i];
    if (m?.role !== "user") continue;
    const c = typeof m.content === "string" ? m.content : Array.isArray(m.content) ? m.content.map((x) => x?.text ?? "").join(" ") : "";
    if (c.trim()) return c.slice(0, 2000);
  }
  return "";
}
// The heimdall alias port — claude and older clients point here. Same server,
// same code; keeping it means the merged watcher doesn't break existing
// configs that route through 11437.
const STEER_ALIAS_PORT = Number(process.env.ER7_HEIMDALL_PORT ?? 11437);
const UPSTREAM = process.env.ER7_UPSTREAM || MODEL_SERVER_URL; // the daemon's private address — the proxy's reads never loop through its own channel
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
  let deferred = false;
  const release = () => {
    if (released || deferred) return;
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
  // A HELD turn keeps running after its response is sent: its slot is freed
  // when the turn itself settles, not when the socket closes.
  return {
    until(promise) {
      deferred = true;
      Promise.resolve(promise).finally(() => { deferred = false; release(); }).catch(() => {});
    },
  };
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

  if (await ClaudeCodeDoorway.route?.(req, res, { log })) return;

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
      reason: {
        description: "eoreader7's reasoning check: claims, inferences, universals, equations and orderings in; the engine's verdict out. GET for the input format.",
        request: "POST /v1/reason  <cli/reason.mjs spec JSON>  (x-er7-reason-flags: --ants --json --compact)",
        response: "reason.mjs's report; its exit code in x-er7-exit",
      },
      claudeCode: {
        description: "Claude Code's hooks, through this pipeline: the eo-reason plugin forwards each hook event verbatim and relays the answer (claude-code/).",
        hooks: "POST /v1/hooks/claude-code  <Claude Code hook event JSON>",
      },
      documents: { start: "POST /v1/documents", poll: "GET /v1/documents/:id" },
      sessions: { list: "GET /v1/sessions", description: "Every live reader fold on this proxy, newest first. Reuse a sessionId (x-er7-session header or body field) to keep one accumulating fold; list them here." },
      ui: { description: "The built-in browser surface — no sibling repo needed.", open: "GET /ui" },
      heimdall: { description: "The watch — what Heimdall is seeing, live: every surface, every model's throughput, the sequence of prompts, CPU/GPU.", surface: "GET /heimdall-ui", stream: "GET /heimdall/live" },
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
    const status = heimdallStatus();
    status.revisions = {
      pending: pendingRevisions().length,
      rule: "a provisional (small-mouth/device/online) answer's original ask is remembered; on the same cadence the small mouth re-warms, it is retried against the model actually requested — the upgrade is collected at GET /v1/revisions/:id, never pushed over what already went out",
    };
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(status));
    return;
  }

  // /heimdall/ask — talk to Heimdall, the watchman. He answers for ONE
  // domain (the surfaces, the models, the line, the box's breath, the
  // efficiency, his rules, his child watchers, his settings) from his own
  // disclosed state; an off-domain ask gets a typed decline, never an
  // invention. A setting ask is validated, applied live, ledgered, and
  // persisted. Model-free: zero tokens.
  if (req.method === "POST" && req.url === "/heimdall/ask") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    let parsed = {};
    try { parsed = JSON.parse(raw || "{}"); } catch { /* a malformed ask is an empty ask */ }
    const ask = String(parsed.ask ?? parsed.task ?? "").trim();
    const caller = String(req.headers["x-er7-user"] || req.headers["x-er7-caller"] || parsed.caller || "operator").slice(0, 64);
    let fleet = [];
    try {
      const ports = [process.env.ER7_HEIMDALL_FLEET_PORT ?? 11438, 11439];
      const got = await Promise.all(ports.map((p) => fetch(`http://127.0.0.1:${p}/heimdall`, { signal: AbortSignal.timeout(1500) }).then((r) => r.ok ? r.json() : null).catch(() => null)));
      fleet = got.filter(Boolean);
    } catch { /* no fleet answering: he answers from his own probes */ }
    const gate = await heimdallAsk(ask, { caller, fleet });

    // OFF-DOMAIN, settings actions, empty, and the help listing stay mechanical:
    // the first is a firewall, the second is an action, the rest is a list —
    // none is a question to reason about.
    if (gate.refused || gate.intent === "setting" || gate.intent === "empty" || gate.intent === "help" || gate.intent === "modelserver" || gate.intent === "hogs" || gate.intent === "quit_all_apps") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(gate));
      return;
    }

    // Otherwise the question GOES THROUGH FOR REAL: a genuine eoreader7 turn
    // (the same pipeline every door uses), confined to the bridge by the frame
    // and GROUNDED in the very facts the gate computed — so it can phrase the
    // watchman's answer, never invent one. If the turn cannot run, the grounded
    // facts ARE the answer.
    let model = "gemma2:2b";
    try {
      const hot = [...hotModelSet()][0];
      const resident = loadedModels();
      const names = Array.isArray(resident) ? resident.map((m) => m.name || m.model) : [];
      if (hot) model = hot; else if (names[0]) model = names[0];
    } catch { /* fall back to the small default */ }
    const frame = [
      "You are Heimdall, the watchman who keeps the Bifr\u00f6st bridge \u2014 the local model surfaces of eoreader7.",
      "You answer ONLY about the bridge: the surfaces (which systems are up), the models and their speed, the line (the queue), the box (CPU/GPU/memory), where the efficiency is, your rules, your child watchers, your settings.",
      "If the ask is not about the bridge, refuse in one sentence and stop.",
      "Speak in the watchman's terse, declarative register. Use ONLY the measured facts below. Invent no number. If something was not measured, say so plainly. Do not ask follow-up questions.",
      "When asked how to fix, reduce, or improve something, give a concrete, ORDERED plan: name each step, the number that drives it, and the lever it turns \u2014 grounded in the facts.",
      "",
      "MEASURED FACTS (from the ledger and GET /heimdall):",
      gate.facts || gate.answer,
      "",
      `OPERATOR ASK: ${ask}`,
    ].join("\n");
    try {
      const t0 = Date.now();
      const up = await fetch(`http://127.0.0.1:${PORT}/v1/ask`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-er7-session": "heimdall-watch", "x-er7-user": "heimdall-operator", "x-er7-priority": "interactive" },
        body: JSON.stringify({ task: frame, model, sessionId: "heimdall-watch" }),
        signal: AbortSignal.timeout(90000),
      });
      const data = await up.json().catch(() => null);
      const text = data && typeof data.answer === "string" ? data.answer.trim() : "";
      if (up.ok && text) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          intent: gate.intent, answer: text, refused: false, grounded: gate.answer,
          disclosure: { giver: data.model || model, standing: "disclosed", groundedIn: "GET /heimdall + an eoreader7 turn", tokens: (data.usage?.promptTokens ?? 0) + (data.usage?.completionTokens ?? 0), turnMs: Date.now() - t0 },
        }));
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ...gate, disclosure: { ...gate.disclosure, groundedIn: "GET /heimdall (the turn did not answer)", note: data?.error?.message || `HTTP ${up.status}` } }));
      return;
    } catch (err) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ...gate, disclosure: { ...gate.disclosure, groundedIn: "GET /heimdall (the turn did not run)", note: err.message } }));
      return;
    }
  }

  // /heimdall/vitals — the tachometers: CPU total + per-core, load, RAM, GPU.
  if (req.method === "GET" && req.url === "/heimdall/vitals") {
    const v = await sampleVitalsNow().catch(() => null);
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(v ?? { error: "vitals unavailable" }));
    return;
  }

  // /heimdall/models — which models are loaded, prioritized, and how much RAM
  // each holds (for the memory waffle). Resident from Ollama /api/ps; the
  // installed roster from /api/tags; the priority (hot) set from the proxy.
  if (req.method === "GET" && req.url === "/heimdall/models") {
    let ps = [], tags = [];
    try { const r = await fetch(`${UPSTREAM}/api/ps`, { signal: AbortSignal.timeout(3000) }); if (r.ok) ps = (await r.json()).models ?? []; } catch { /* ollama silent */ }
    try { const r = await fetch(`${UPSTREAM}/api/tags`, { signal: AbortSignal.timeout(3000) }); if (r.ok) tags = (await r.json()).models ?? []; } catch { /* ollama silent */ }
    let hot = [];
    try { hot = [...hotModelSet()].map((n) => String(n).replace(/^er7:/, "")); } catch { /* no hot set */ }
    const st = heimdallStatus();
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      totalMb: st.vitals?.memTotalMb ?? null,
      availableMb: st.vitals?.memAvailableMb ?? null,
      ollamaMemMb: st.vitals?.ollamaMemMb ?? null,
      hot,
      resident: ps.map((m) => ({ name: m.name, sizeMb: Math.round((m.size || 0) / 1048576), vramMb: Math.round((m.size_vram || 0) / 1048576), contextLength: m.context_length ?? null, expiresAt: m.expires_at ?? null })),
      installed: tags.map((m) => ({ name: m.name, sizeMb: Math.round((m.size || 0) / 1048576) })).sort((a, b) => b.sizeMb - a.sizeMb),
      unservable: st.disclosure?.servable?.unservable || [],
    }));
    return;
  }

  // /heimdall/models/evict — unload one resident model NOW (Ollama keep_alive:0).
  // Frees its weights + KV cache on demand: the operator's hand on "available".
  if (req.method === "POST" && req.url === "/heimdall/models/evict") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    let parsed = {};
    try { parsed = JSON.parse(raw || "{}"); } catch { /* malformed */ }
    const name = String(parsed.name || "").trim();
    if (!name) { res.writeHead(400, { "content-type": "application/json" }); res.end(JSON.stringify({ ok: false, error: "name required" })); return; }
    const r = await evictModel(name).catch((err) => ({ ok: false, error: err.message }));
    res.writeHead(r.ok ? 200 : 400, { "content-type": "application/json" });
    res.end(JSON.stringify(r));
    return;
  }

  // /heimdall/apps/quit — SPECIAL: quit ANY user app (gated by the quitApps
  // setting, off by default). Keeps the surface, this session, the model server
  // and the system unless keepSurface:false.
  if (req.method === "POST" && req.url === "/heimdall/apps/quit") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    let parsed = {};
    try { parsed = JSON.parse(raw || "{}"); } catch { /* defaults */ }
    const r = await quitApps({ keepSurface: parsed.keepSurface !== false, max: parsed.max }).catch((err) => ({ ok: false, error: err.message }));
    res.writeHead(r.ok ? 200 : 400, { "content-type": "application/json" });
    res.end(JSON.stringify(r));
    return;
  }

  // /heimdall/memory/hogs — SPECIAL: quit the biggest memory-hog apps to free
  // RAM and drain swap. Gated by the quitHogs setting (off by default).
  if (req.method === "POST" && req.url === "/heimdall/memory/hogs") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    let parsed = {};
    try { parsed = JSON.parse(raw || "{}"); } catch { /* default max */ }
    const r = await quitMemoryHogs({ max: parsed.max }).catch((err) => ({ ok: false, error: err.message }));
    res.writeHead(r.ok ? 200 : 400, { "content-type": "application/json" });
    res.end(JSON.stringify(r));
    return;
  }

  // /v1/build — a discrete multi-unit coding task, built mechanically: the
  // units drawn concurrently, assembled and validated. The same path a plain
  // NL prompt takes on /v1/ask when it names such a task.
  if (req.method === "POST" && req.url === "/v1/build") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    let parsed = {};
    try { parsed = JSON.parse(raw || "{}"); } catch { /* malformed */ }
    const r = await buildCodeTask({ task: String(parsed.task ?? ""), model: parsed.model || "qwen2.5-coder:1.5b", testCommand: parsed.testCommand || null, out: parsed.out || null, parallelism: parsed.parallelism || currentParallelism() }).catch((e) => ({ ok: false, error: e.message }));
    res.writeHead(r.ok ? 200 : 400, { "content-type": "application/json" });
    res.end(JSON.stringify(r));
    return;
  }

  // /heimdall/model/restart — restart the model server (ollama serve) directly
  // with the tuned, non-wedging env. The lever against the wedge.
  if (req.method === "POST" && req.url === "/heimdall/model/restart") {
    const r = await restartModelServer().catch((err) => ({ ok: false, error: err.message }));
    res.writeHead(r.ok ? 200 : 500, { "content-type": "application/json" });
    res.end(JSON.stringify(r));
    return;
  }

  // /heimdall/report — a system flags a broken/blocked path; Heimdall tries to
  // fix it along the bridge (re-forge a surface, free memory, name a servable
  // model), and escalates if he cannot. Never silently dropped.
  if (req.method === "POST" && req.url === "/heimdall/report") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    let parsed = {};
    try { parsed = JSON.parse(raw || "{}"); } catch { /* malformed report */ }
    const r = await handleReport(parsed).catch((err) => ({ fixed: false, outcome: "path_escalated", error: err.message }));
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(r));
    return;
  }

  // /heimdall/tasks — the background tasks (the reaper's census + what's
  // running), and /heimdall/kill to end one by pid — same walls as the reaper.
  if (req.method === "GET" && req.url === "/heimdall/tasks") {
    const t = await backgroundTasks().catch((err) => ({ error: err.message }));
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(t));
    return;
  }
  if (req.method === "POST" && req.url === "/heimdall/kill") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    let parsed = {};
    try { parsed = JSON.parse(raw || "{}"); } catch { /* malformed: refused below */ }
    const r = await killTask(parsed.pid).catch((err) => ({ ok: false, error: err.message }));
    res.writeHead(r.ok ? 200 : 400, { "content-type": "application/json" });
    res.end(JSON.stringify(r));
    return;
  }

  // /heimdall/log — the ledger, parsed, for a filterable view; ?key/&surface/
  // &model/&sessionId/&finding pull one THREAD (the rows sharing an identity).
  if (req.method === "GET" && req.url.startsWith("/heimdall/log")) {
    let limit = 400, filter = null;
    try {
      const u = new URL(req.url, "http://x");
      limit = Number(u.searchParams.get("limit")) || 400;
      const f = {};
      for (const k of ["key", "surface", "model", "sessionId", "finding"]) { const val = u.searchParams.get(k); if (val) f[k] = val; }
      filter = Object.keys(f).length ? f : null;
    } catch { /* default: the tail */ }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ lines: logLines(limit, filter) }));
    return;
  }

  // /heimdall/content — the generated-content log: what actually went in
  // (prompts) and what came out (completed answers), persisted so the watch
  // surface can restore what it showed instead of forgetting it on reload.
  // The same thread filters as the ledger: ?surface/&model/&sessionId.
  if (req.method === "GET" && req.url.startsWith("/heimdall/content")) {
    let limit = 200, filter = null;
    try {
      const u = new URL(req.url, "http://x");
      limit = Number(u.searchParams.get("limit")) || 200;
      const f = {};
      for (const k of ["surface", "model", "sessionId"]) { const val = u.searchParams.get(k); if (val) f[k] = val; }
      filter = Object.keys(f).length ? f : null;
    } catch { /* default: the tail */ }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ rows: contentLog(limit, filter) }));
    return;
  }

  // /heimdall/restart — the operator re-forges one surface by name. The same
  // walls hold as the watcher's REC: never the self, never a restart storm.
  if (req.method === "POST" && req.url === "/heimdall/restart") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    let parsed = {};
    try { parsed = JSON.parse(raw || "{}"); } catch { /* a malformed ask is an empty one */ }
    const r = restartSurface(parsed.name);
    res.writeHead(r.ok ? 200 : 400, { "content-type": "application/json" });
    res.end(JSON.stringify(r));
    return;
  }

  // /heimdall/settings — the knobs, disclosed (GET), or set one directly
  // (POST {name, value}). The chat is the primary door; this is the plain one.
  if (req.method === "GET" && req.url === "/heimdall/settings") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ settings: heimdallSettings() }));
    return;
  }
  if (req.method === "POST" && req.url === "/heimdall/settings") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    let parsed = {};
    try { parsed = JSON.parse(raw || "{}"); } catch { /* malformed: a typed refusal below */ }
    let out;
    if (parsed.reset) { const def = heimdallSettings().find((s) => s.name === parsed.name); out = def ? setHeimdallSetting(parsed.name, def.default, { key: "operator" }) : { ok: false, error: `no such setting: ${parsed.name}` }; }
    else out = setHeimdallSetting(parsed.name, parsed.value, { key: "operator" });
    res.writeHead(out.ok ? 200 : 400, { "content-type": "application/json" });
    res.end(JSON.stringify(out));
    return;
  }

  // /heimdall/live — what Heimdall is seeing, in real time (2026-09-20): an
  // SSE stream of every act he takes (the append-only ledger, broadcast the
  // moment each row lands) plus a full status snapshot on a short cadence,
  // so the surfaces, vitals, queue, and throughput stay live between the
  // watcher's own ticks. The numbers are the SAME ones /heimdall serves —
  // nothing new is measured here, only watched. Loopback-bound like
  // everything else.
  if (req.method === "GET" && req.url === "/heimdall/live") {
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-store",
      connection: "keep-alive",
      "access-control-allow-origin": "*",
    });
    res.write(`event: hello\ndata: ${JSON.stringify({ status: heimdallStatus() })}\n\n`);
    const off = onLog((entry) => {
      try { res.write(`event: act\ndata: ${JSON.stringify(entry)}\n\n`); } catch { /* dead socket: dropped, never fatal */ }
    });
    // real traffic (a finished call's own counters) — live-only, not persisted
    const offLive = onLive((entry) => {
      try { res.write(`event: ${entry.act === "token" ? "token" : entry.act === "prompt" ? "prompt" : "traffic"}\ndata: ${JSON.stringify(entry)}\n\n`); } catch { /* dead socket: dropped */ }
    });
    const statusTimer = setInterval(() => {
      try { res.write(`event: status\ndata: ${JSON.stringify({ status: heimdallStatus() })}\n\n`); } catch { /* dead socket: dropped */ }
    }, 3000);
    const keepalive = setInterval(() => {
      try { res.write(": h\n\n"); } catch { /* dead socket: dropped */ }
    }, 15000);
    res.on("close", () => { off(); offLive(); clearInterval(statusTimer); clearInterval(keepalive); });
    return;
  }

  // /content-rules — the ant-swarm's standing rules for hard content types
  // (the protocol's preserve half). Every surface attached to eoreader7 reads
  // the SAME ledger here: a hard-meaning turn applies its standing rule by
  // name alongside the swarm's re-derivation (never instead of it), and a
  // turn that swarms on new hard material writes back through the same path.
  // Append-only; a rule carries its falsifying control. (Corrected
  // 2026-09-20 — the old wording overstated the rule's preemption.)
  if (req.method === "GET" && req.url === "/content-rules") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ count: contentRulesCount(), rules: contentRulesStore(), file: CONTENT_RULES_FILE }));
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

  // POST /heimdall/reap — run the duplicate reaper on demand (the same pass
  // the watcher's tick runs on its own cadence). Served locally: the watcher
  // runs inside this process. ER7_REAP_OFF=1 turns it into a census-only read.
  if (req.method === "POST" && req.url === "/heimdall/reap") {
    const r = await liveReap().catch((err) => ({ error: err.message }));
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(r));
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

  // GET /v1/sessions — the surface to SEE sessions: every live reader fold on
  // this proxy, newest first. A caller keeps one fold by repeating the same
  // sessionId (header x-er7-session or body field); this route is where the
  // list of those folds is read back out.
  // A HELD TURN'S RECEIPT: the finished answer when it is ready, the receipt
  // while it still runs. Only the requester who started it may collect it.
  if (req.method === "GET" && req.url.startsWith("/v1/held/")) {
    const e = heldById(decodeURIComponent(req.url.slice("/v1/held/".length)));
    if (!e || e.requester !== sessionIdFromHeaders(req)) {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { message: "no held turn with that id for this requester (finished answers are held for a while, then released)" } }));
      return;
    }
    if (e.status === "done") { res.writeHead(200, { "content-type": "application/json", "x-er7-held": e.id }); res.end(JSON.stringify(e.result)); return; }
    if (e.status === "failed") { res.writeHead(500, { "content-type": "application/json" }); res.end(JSON.stringify({ error: { message: e.error } })); return; }
    res.writeHead(202, { "content-type": "application/json", "retry-after": "15" });
    res.end(JSON.stringify(heldReceipt(e)));
    return;
  }

  if (req.method === "GET" && req.url === "/v1/sessions") {
    try {
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      res.end(JSON.stringify(listSessions()));
    } catch (err) {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { message: err.message } }));
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
        // HOLON LEVEL, VALIDATED (2026-09-20, falsification B7): an unknown
        // value used to degrade silently to full-section behavior — a
        // visible typed gap, never a default, is the house law. The three
        // accepted write-granularities are the text holarchy's part names.
        const HOLON_LEVELS = new Set(["section", "paragraph", "sentence"]);
        const holonLevel = parsed.holonLevel ?? "section";
        if (!HOLON_LEVELS.has(holonLevel)) {
          res.writeHead(400, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: { message: `holonLevel must be one of ${[...HOLON_LEVELS].join(", ")} — got "${holonLevel}"`, type: "unknown_holon_level" } }));
          return;
        }
const job = await startDocumentJob({
          task: String(parsed.task ?? "").trim(),
          model: parsed.model ?? pickDefaultModel(),
          workspace: parsed.workspace ?? "",
          sessionId: parsed.sessionId ?? null,
          holonLevel: parsed.holonLevel ?? "section",
          webConsent: parsed.webConsent === true || parsed.webConsent === "true",
          seed: parsed.seed != null ? String(parsed.seed) : null,
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

      // A REGULAR NL PROMPT that names a discrete multi-unit coding task is
      // recognized as a mechanical BUILD: compute the structure, draw only the
      // independent units (concurrently), assemble and validate. Not the model
      // turn — this shape is code.
      if (detectBuildTask(task)) {
        const b = await buildCodeTask({
          task, model: String(parsed?.model ?? "").trim() || "qwen2.5-coder:1.5b",
          testCommand: parsed?.testCommand ?? null, out: parsed?.out ?? null, parallelism: currentParallelism(),
        }).catch((e) => ({ ok: false, error: e.message }));
        if (b.ok) {
          log(`ask → BUILD units=${b.units.length} tokens=${b.tokens} wallMs=${b.wallMs} verified=${b.verified}`);
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({
            answer: `Recognized a discrete build: computed the structure, drew ${b.draws} independent unit(s) concurrently (${b.units.join(", ")}) — ${b.tokens} tokens, ${b.wallMs}ms; ${b.verified === true ? "the test passed" : b.verified === "syntax_only" ? "syntax-checked (no test given)" : "VERIFICATION FAILED"}.`,
            kind: b.kind, units: b.units, draws: b.draws, tokens: b.tokens, wallMs: b.wallMs, verified: b.verified, verifyError: b.verifyError,
            code: b.code, disclosure: b.disclosure,
          }));
          return;
        }
        // not a discrete build after all → fall through to the normal turn
      }
      // Same default the /v1/documents job uses — one literal, not a second
      // magic constant for the same choice.
      const model = String(parsed?.model ?? "").trim() || pickDefaultModel();
      const mode = modeFromHeaders(req, typeof parsed?.mode === "string" ? parsed.mode : "auto");

      // A body-supplied sessionId is honored first (a caller with no header
      // machinery can still keep one accumulating reader fold across calls
      // by just repeating the same string); the header/derived fallback
      // below is what every other endpoint already uses.
      const sessionId = String(parsed?.sessionId ?? "").trim() || sessionIdFromHeaders(req);
      const workspace = String(parsed?.workspace ?? "").trim() || workspaceFromHeaders(req);
      const attachments = Array.isArray(parsed?.attachments)
        ? parsed.attachments.map((a, i) => ({ name: String(a?.name ?? `attachment-${i + 1}`).slice(0, 120), text: String(a?.text ?? "") })).filter((a) => a.text.trim())
        : [];

      // THE ANT-SWARM TRIGGER ON THE PLAIN DOORWAY, RUN BEFORE ADMISSION: the
      // swarm needs no model and no Heimdall admission (pure organ reads, same
      // as /v1/swarm), so a turn pointed at material whose meaning is hard to
      // emerge — garble, truncation, density, a pointed-at void — is answered
      // by the swarm even when the box is refusing model loads. It runs before
      // admitChatRequest exactly because the swarm must never be gated by the
      // model load it does not need. What actually routes (swarm-server.mjs):
      // NL naming swarming, force, or the hard-meaning detector firing. A
      // standing content rule annotates a hard-meaning turn; it never routes
      // by itself (corrected 2026-09-20 — the old comment overstated it).
      const askSwarm = runSwarmTurn({
        task,
        texts: attachments.map((a) => ({ name: a.name, text: a.text })),
        history: Array.isArray(parsed?.chatHistory) ? parsed.chatHistory.map((m, i) => ({ name: `history-${i}`, text: String(m?.content ?? "") })) : [],
        name: "ask-turn",
      });
      if (askSwarm.routed) {
        const userId = userIdFromHeaders(req);
        log(`ask → swarm session=${sessionId} user=${userId} taskLength=${task.length} meaning=${askSwarm.meaning?.type ?? "none"}`);
        res.writeHead(200, { "content-type": "application/json", "x-er7-session": sessionId });
        res.end(JSON.stringify({
          answer: askSwarm.answer,
          sessionId,
          model,
          heimdall: bridgeMessage({ model }),
          answerShape: "swarm",
          swarm: { ...askSwarm, answer: undefined },
          hardMeaning: askSwarm.meaning?.hard ? askSwarm.meaning : null,
          contentRule: askSwarm.standing ?? null,
          usage: { promptTokens: 0, completionTokens: 0 },
        }));
        return;
      }

      // HELD, NOT RE-RUN (2026-09-22, extended from /v1/chat/completions):
      // the same request from the same requester, already running or
      // finished, is answered from the hold — no second admission, no
      // second turn. This is why my own 5-minute DeepSeek long-form timeout
      // earlier today cost what it cost: a retry of the identical request
      // would have re-paid the whole cold-load-times-N-calls cost again,
      // because this door aborted the turn on client disconnect instead of
      // letting it finish into a cache the way /v1/chat/completions already
      // does. Checked BEFORE admission, so a retry never re-queues.
      const holdKey = heldKey(sessionId, "/v1/ask", { task, model, mode, workspace, attachments, chatHistory: Array.isArray(parsed?.chatHistory) ? parsed.chatHistory : [] });
      const alreadyHeld = findHeld(holdKey);
      if (alreadyHeld) {
        try {
          const w = await awaitHeld(alreadyHeld, TURN_DEADLINE_MS);
          if (w.done) { res.writeHead(200, { "content-type": "application/json", "x-er7-session": sessionId, "x-er7-held": alreadyHeld.id }); res.end(JSON.stringify(w.result)); }
          else { res.writeHead(202, { "content-type": "application/json", "x-er7-session": sessionId, "retry-after": "15" }); res.end(JSON.stringify(heldReceipt(alreadyHeld))); }
        } catch (err) {
          res.writeHead(500, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      const admit = admitChatRequest({ model }, req.headers);
      if (!admit.allowed) {
        refuseAdmission(res, admit);
        return;
      }
      const lease = releaseOnResponse(res, String(req.headers["x-er7-claim"] || req.headers["x-er7-session"] || ""), admit);

      const userId = userIdFromHeaders(req);
      log(`ask → session=${sessionId} user=${userId} model=${model} taskLength=${task.length} mode=${mode} workspace=${workspace ? `"${workspace}"` : "none"}`);

      // THE MECHANICAL RACE, ON THIS DOOR TOO (falsification F3): the plain
      // doorway now runs the same observation-vs-prediction race
      // /v1/chat/completions already ran — a settled mechanism's computed
      // text is the answer, the model's draft rides as superseded, and a gap
      // is disclosed without suppressing anything.
      const observationP = runMechanical(task, MECHANISMS);
      const surface = surfaceFromRequest(req);

      // HELD, NEVER PUNISHED: not tied to the client's socket, never
      // aborted for being slow or for the client leaving — a slow turn says
      // nothing about whether the model works, and dropping it just means
      // paying the same cost again on the next try.
      const entry = holdTurn(holdKey, async () => {
        const turnT0 = Date.now(); // real prompt→response wall time, disclosed by Heimdall
        const _tid = beginTurn({ sessionId, model }); // E1: phase instrumentation
        _inflight++;
        noteSurfaceActivity(surface, "begin");
        emitLive({ act: "prompt", surface, model, sessionId, text: promptTextOf(task, parsed?.chatHistory) });
        try {
          // The turn's scope carries the caller's tier ask and collects which
          // on-device mouths answered its draws (heimdall.mjs mouthFor) —
          // returned below as `served`, never silent.
          const scope = { sessionId, tier: turnTierAsk(req) };
          const result = await turnScope.run(scope, () => runProxyTurn({
            sessionId, userId, workspace, attachments, model, task, mode,
            chatHistory: Array.isArray(parsed?.chatHistory) ? parsed.chatHistory : [],
            resumeAnswered: Array.isArray(parsed?.resumeAnswered) ? parsed.resumeAnswered : [],
            openBefore: Array.isArray(parsed?.openBefore) ? parsed.openBefore : null,
            caller: callerFromRequest(req, "ask", parsed),
            webConsent: parsed?.webConsent === true || parsed?.webConsent === "true",
            seed: parsed?.seed != null ? String(parsed.seed) : null,
          }, (chunk) => {
            // every generated chunk rides the live sink so the watch surface can
            // show the actual text as it is written (monitor-only; never stored).
            if (typeof chunk === "string" && chunk) { noteSurfaceActivity(surface, "chars", { chars: chunk.length }); emitLive({ act: "token", surface, model, sessionId, text: chunk }); }
          }));
          markServable(model); // it answered — Heimdall keeps it servable
          recordTurnMs(Date.now() - turnT0);
          endTurn(_tid); // E1: one row per turn — draws · load · prompt · gen
          _inflight--;
          noteSurfaceActivity(surface, "end");
          if (result?.text) emitLive({ act: "token", surface, model: result.model ?? model, sessionId, text: result.text, final: true });
          const observation = await observationP;
          const race = precisionWinner({ observation, draft: result.text });
          if (observation?.concluded && String(observation.kind) !== "BEYOND_REACH") {
            noteMechanism({ mechanism: observation.mechanism, kind: String(observation.kind), winner: race.winner, task });
          }
          // THE FOLLOW-UP FROM 256db92: that commit gated void/satisfaction on
          // the two /v1/chat/completions response shapes and named /v1/ask as
          // structurally out of scope because it carried neither field at all
          // — not a smaller gate gap, a total absence. Closed here the same
          // way: reconciled against race/claims before going out.
          const gated = groundingGate({ void: result.void ?? null, satisfaction: result.satisfaction ?? null, reading: result.reading ?? null }, race);
          return {
            answer: race.text,
            sessionId,
            model: result.model ?? model,
            heimdall: bridgeMessage({ model: result.model ?? model }),
            served: servedDisclosure(scope, result.model ?? model),
            interlocutor: result.interlocutor ?? null,
            usage: { promptTokens: result.usage?.promptTokens ?? 0, completionTokens: result.usage?.completionTokens ?? 0 },
            relationEdges: result.relationEdges,
            referentBindings: result.referentBindings,
            thinking: result.thinking ?? null,
            answerShape: result.answerShape ?? null,
            truncated: result.truncated ?? false,
            document: result.document ?? null,
            workspace: result.workspace ?? null,
            attachments: result.attachments ?? null,
            race: raceReading(race),
            void: gated.void,
            satisfaction: gated.satisfaction,
            disclosed: gated.disclosed ?? null,
            // THE ASK-BACK ENVELOPE (build-clarify): the person sees the plain
            // questions in `answer`; the record carries the structured shape —
            // which cells are open, the round, the schema — so the fold, the
            // TUI and a raw client render the SAME door and answer with the
            // SAME {cell, value} shape (ONE-ENGINE-PLAN: one turn, every door).
            mechanical: result.mechanical ?? null,
          };
        } catch (err) {
          _inflight--;
          endTurn(_tid);
          noteSurfaceActivity(surface, "end"); // a failed turn is still a finished one
          emitLive({ act: "token", surface, model, sessionId, text: `[error: ${err.message}]`, final: true, error: true });
          log(`ask execution error: ${err.message}`);
          throw err;
        }
      }, { requester: sessionIdFromHeaders(req) }); // the id GET /v1/held/:id checks; the key already carries the body sessionId
      lease.until(entry.promise);
      try {
        const w = await awaitHeld(entry, TURN_DEADLINE_MS);
        if (res.writableEnded || res.destroyed) return; // client gone; the answer waits in the hold
        if (w.done) {
          res.writeHead(200, { "content-type": "application/json", "x-er7-session": sessionId });
          res.end(JSON.stringify(w.result));
        } else {
          log(`turn held → session=${sessionId} ${entry.id} (past ${Math.round(TURN_DEADLINE_MS / 1000)}s, still running)`);
          res.writeHead(202, { "content-type": "application/json", "x-er7-session": sessionId, "retry-after": "15" });
          res.end(JSON.stringify(heldReceipt(entry)));
        }
      } catch (err) {
        if (res.writableEnded || res.destroyed) return;
        if (!res.headersSent) res.writeHead(500, { "content-type": "application/json" });
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
      const model = String(parsed?.model ?? "").trim() || pickDefaultModel();
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
      const model = String(parsed?.model ?? "").trim() || pickDefaultModel();
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

      const sessionId = sessionIdFromHeaders(req);
      const workspace = workspaceFromHeaders(req);
      const userId = userIdFromHeaders(req);

      // SWARM AUTO-ROUTE, RUN BEFORE HEIMDALL ADMISSION: the swarm needs no
      // model and no admission (pure organ reads, same as /v1/swarm), so a
      // turn pointed at material whose meaning is hard to emerge — garble,
      // truncation, density, a pointed-at void — is answered by the swarm
      // even when the box is refusing model loads. It runs before
      // admitChatRequest exactly because the swarm must never be gated by the
      // model load it does not need. What actually routes (swarm-server.mjs):
      // NL naming swarming, force, or the hard-meaning detector firing. A
      // standing content rule annotates a hard-meaning turn; it never routes
      // by itself (corrected 2026-09-20 — the old comment overstated it).
      const swarmTurn = runSwarmTurn({
        task: reqData.task,
        texts: (reqData.attachments ?? []).map((a) => ({ name: a.name, text: a.text })),
        history: (reqData.chatHistory ?? []).map((m, i) => ({ name: `history-${i}`, text: m.content })),
        name: "chat-turn",
      });
      if (swarmTurn.routed) {
        const created = Math.floor(Date.now() / 1000);
        const id = `er7-${Date.now()}`;
        const swarmReading = {
          sessionId, answerShape: "swarm",
          swarm: { ...swarmTurn, answer: undefined },
          // The ant-swarm trigger rides the reading so every surface sees WHY
          // the turn swarmed and what standing rule was applied or preserved.
          hardMeaning: swarmTurn.meaning?.hard ? swarmTurn.meaning : null,
          contentRule: swarmTurn.standing ?? null,
          truncated: false,
        };
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

      // HELD, NOT RE-RUN: the same request from the same requester, already
      // running or finished, is answered from the hold — no second admission,
      // no second turn.
      const holdKey = reqData.stream ? null : heldKey(sessionId, "/v1/chat/completions", { model: parsed.model, messages: parsed.messages, mode: reqData.mode, workspace, attachments: reqData.attachments });
      const alreadyHeld = holdKey ? findHeld(holdKey) : null;
      if (alreadyHeld) {
        try {
          const w = await awaitHeld(alreadyHeld, TURN_DEADLINE_MS);
          if (w.done) { res.writeHead(200, { "content-type": "application/json", "x-er7-session": sessionId, "x-er7-held": alreadyHeld.id }); res.end(JSON.stringify(w.result)); }
          else { res.writeHead(202, { "content-type": "application/json", "x-er7-session": sessionId, "retry-after": "15" }); res.end(JSON.stringify(heldReceipt(alreadyHeld))); }
        } catch (err) {
          res.writeHead(500, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: { message: err.message } }));
        }
        return;
      }

      // HEIMDALL, WIRED IN — admission on the proxy's own path, for the
      // NORMAL turn only. The swarm above never needed a model, so it was not
      // gated; a real model turn is admitted exactly as before.
      const admit = admitChatRequest(parsed, req.headers);
      if (!admit.allowed) {
        refuseAdmission(res, admit);
        return;
      }
      const lease = releaseOnResponse(res, String(req.headers["x-er7-claim"] || req.headers["x-er7-session"] || ""), admit);
      log(`turn → session=${sessionId} user=${userId} model=${reqData.model} taskLength=${reqData.task.length} stream=${reqData.stream} mode=${reqData.mode} workspace=${workspace ? `"${workspace}"` : "none"}`);

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
        // The same predicate on every door (falsification F4): only a
        // SETTLED conclusion suppresses the model — a BEYOND_REACH gap is
        // never a win, on any wire.
        const mechanicalWins = observation.concluded && observation.kind !== CONCLUSION.BEYOND_REACH;
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
              // `move` rides beside the humanized text (2026-09-22): the text
              // is this engine's own diagnostic register — apparatus names,
              // counts, milliseconds — right for the disclosure panel, wrong
              // for a live line a person reads mid-turn. A client that wants
              // to say "reading en.wikipedia.org" instead of "Gore's gather
              // boundary: kept 2 of 10 result(s)" needs the MOVE, not the
              // prose, to decide that; the prose stays for the panel.
              delta: { reasoning_content: `${text}\n`, move: note?.move ?? null, ...(note?.url ? { url: note.url } : {}) },
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

        const surface = surfaceFromRequest(req);
        try {
          const emitBoth = (chunk) => {
            try { emit(chunk); } catch { /* the real client's emit is untouched by a monitor */ }
            if (typeof chunk === "string" && chunk) { noteSurfaceActivity(surface, "chars", { chars: chunk.length }); emitLive({ act: "token", surface, model: reqData?.model ?? model, sessionId, text: chunk }); }
          };
          const _ctid = beginTurn({ sessionId, model: reqData?.model ?? model });
          _inflight++;
          noteSurfaceActivity(surface, "begin");
          emitLive({ act: "prompt", surface, model: reqData?.model ?? model, sessionId, text: promptTextOf(reqData?.task, reqData?.messages ?? parsed?.messages) });
          const scope = { sessionId, tier: turnTierAsk(req) };
          const result = await turnScope.run(scope, () => runProxyTurn({ sessionId, userId, workspace, signal: turnAbort.signal, ...reqData }, emitBoth, onNote, onThinking));
          endTurn(_ctid);
          _inflight--;
          noteSurfaceActivity(surface, "end");
          if (result?.model) parsed.model = result.model; // plain-speech switch disclosed: the envelope names who answered
          // The finished text rides out as a final token event (same contract
          // as /v1/ask) so the watch surface closes this door's stream panel
          // instead of leaving it blinking forever.
          if (result?.text) emitLive({ act: "token", surface, model: parsed.model ?? reqData?.model ?? model, sessionId, text: result.text, final: true });
          clearTurn();
          // Thinking affordance: when discloseThinking is on, emit the grounding
          // block as reasoning_content before the final chunk.
          if (reqData.discloseThinking && result.thinking) {
            res.write(`data: ${JSON.stringify({
              id, object: "chat.completion.chunk", created, model: parsed.model,
              choices: [{ index: 0, delta: { reasoning_content: result.thinking }, finish_reason: null }],
            })}\n\n`);
          }
          // The gate needs `race` before the chunk is built (it decides
          // satisfaction/void below), so it is computed once here instead of
          // inline in the `race:` field.
          const streamRace = precisionWinner({ observation, draft: result.text });
          const streamGated = groundingGate({ void: result.void ?? null, satisfaction: result.satisfaction ?? null, reading: result.reading ?? null }, streamRace);
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
              // The CHECKED text and the fact gate that produced it. The
              // content deltas above are the live draft plus any appended
              // replacement, so a streaming client that wants the answer the
              // non-streaming body would have returned needs it said once,
              // here. Found 2026-09-22 when the-fold's chat moved to streaming.
              text: result.text ?? null,
              factGate: result.factGate ?? null,
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
              satisfaction: streamGated.satisfaction,
              kelsen: result.kelsen ?? null,
              void: streamGated.void,
              disclosed: streamGated.disclosed ?? null,
              mode: result.mode ?? null,
              usage: result.usage ?? null,
              race: raceReading(streamRace),
              served: servedDisclosure(scope, parsed.model),
            },
          })}\n\n`);
          res.write("data: [DONE]\n\n");
          res.end();
        } catch (err) {
          clearTurn();
          noteSurfaceActivity(surface, "end"); // a failed turn is still a finished one
          emitLive({ act: "token", surface, model: reqData?.model ?? model, sessionId, text: `[${err?.message === "cancelled" ? "cancelled" : "error: " + err.message}]`, final: true, error: true });
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
        // HELD, NEVER PUNISHED (2026-09-22): the turn is not tied to the
        // client's socket and is never aborted for being slow. Past the
        // deadline the client gets a receipt; the turn finishes into the hold,
        // and the same request (or GET /v1/held/:id) collects it. The model is
        // not dropped — a slow turn says nothing about whether the model works.
        const entry = holdTurn(holdKey, async () => {
          const scope = { sessionId, tier: turnTierAsk(req) };
          const result = await turnScope.run(scope, () => runProxyTurn({ sessionId, userId, workspace, ...reqData }));
          const answeredBy = result?.model ?? parsed.model; // plain-speech switch disclosed: the envelope names who answered
          const race = precisionWinner({ observation: await observationP, draft: result.text });
          const resp = openAIResponse({ id, model: answeredBy, text: race.text, created, usage: result.usage, reading: result });
          resp.reading.race = raceReading(race);
          groundingGate(resp.reading, race);
          resp.reading.sessionId = sessionId;
          resp.reading.thinking = result.thinking ?? null;
          resp.reading.answerShape = result.answerShape ?? null;
          resp.reading.truncated = result.truncated ?? false;
          resp.reading.document = result.document ?? null;
          resp.heimdall = bridgeMessage({ model: answeredBy });
          resp.reading.served = servedDisclosure(scope, answeredBy);
          return resp;
        }, { requester: sessionId });
        lease.until(entry.promise);
        try {
          const w = await awaitHeld(entry, TURN_DEADLINE_MS);
          if (res.writableEnded || res.destroyed) return; // client gone; the answer waits in the hold
          if (w.done) {
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify(w.result));
          } else {
            log(`turn held → session=${sessionId} ${entry.id} (past ${Math.round(TURN_DEADLINE_MS / 1000)}s, still running)`);
            res.writeHead(202, { "content-type": "application/json", "x-er7-session": sessionId, "retry-after": "15" });
            res.end(JSON.stringify(heldReceipt(entry)));
          }
        } catch (err) {
          log(`proxy execution error: ${err.message}`);
          if (res.writableEnded || res.destroyed) return;
          if (!res.headersSent) res.writeHead(500, { "content-type": "application/json" });
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

      // SWARM AUTO-ROUTE, RUN BEFORE HEIMDALL ADMISSION — mirror of the
      // /v1/chat/completions path: the swarm needs no model and no admission
      // (pure organ reads), so a turn pointed at material whose meaning is
      // hard to emerge is answered by the swarm even when the box is refusing
      // model loads. What actually routes (swarm-server.mjs): NL naming
      // swarming, force, or the hard-meaning detector firing — a standing
      // content rule annotates but never routes (corrected 2026-09-20). This
      // is the web app's own door onto the collision chamber: the surviving
      // read carries its named holes — the residue rides the reading
      // envelope, and the Anti-matter line rides the answer prose the app
      // already renders.
      const swarmTurn = runSwarmTurn({
        task: reqData.task,
        texts: (reqData.attachments ?? []).map((a) => ({ name: a.name, text: a.text })),
        history: (reqData.chatHistory ?? []).map((m, i) => ({ name: `history-${i}`, text: m.content })),
        name: "chat-turn",
      });
      if (swarmTurn.routed) {
        const swarmSessionId = sessionIdFromHeaders(req);
        const swarmReading = {
          sessionId: swarmSessionId, answerShape: "swarm",
          swarm: { ...swarmTurn, answer: undefined },
          hardMeaning: swarmTurn.meaning?.hard ? swarmTurn.meaning : null,
          contentRule: swarmTurn.standing ?? null,
          truncated: false,
        };
        const swarmCreatedAt = new Date().toISOString();
        if (reqData.stream) {
          res.writeHead(200, {
            "content-type": "application/x-ndjson",
            "cache-control": "no-cache",
            connection: "keep-alive",
            "x-er7-session": swarmSessionId,
          });
          for (const line of ollamaChatStreamLines({ model: parsed.model, text: swarmTurn.answer, createdAt: swarmCreatedAt, usage: { promptTokens: 0, completionTokens: 0 }, reading: swarmReading })) res.write(line);
          res.end();
        } else {
          const resp = ollamaChatResponse({ model: parsed.model, text: swarmTurn.answer, createdAt: swarmCreatedAt, usage: { promptTokens: 0, completionTokens: 0 }, reading: swarmReading });
          resp.reading = { ...swarmReading, sessionId: swarmSessionId };
          resp.heimdall = bridgeMessage({ model: parsed.model });
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify(resp));
        }
        return;
      }

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

      // THE MECHANICAL RACE, ON THIS DOOR TOO (falsification F3): the ollama
      // door now runs the same observation-vs-prediction race the openai
      // door already ran. A settled mechanism's computed text is the answer
      // on both wire shapes; a gap is disclosed, never suppressing.
      const observationP = runMechanical(reqData.task, MECHANISMS);

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
            turnAbort.abort();
          }
        }, TURN_DEADLINE_MS);
        const clearTurn = () => {
          clearTimeout(turnDeadline);
          res.removeListener("close", onDisconnect);
        };

        try {
          let first = true;
          // A slow mechanism would delay the stream's first token by its own
          // run time; today's mechanisms settle in well under a millisecond.
          const observation = await observationP;
          const mechanicalWins = observation.concluded && observation.kind !== CONCLUSION.BEYOND_REACH;
          const writeChunk = (token) => {
            if (!token) return;
            res.write(JSON.stringify({
              model: parsed.model, created_at: createdAt,
              message: { role: "assistant", content: token },
              done: false,
            }) + "\n");
            first = false;
          };
          const emit = mechanicalWins ? () => {} : writeChunk;
          if (mechanicalWins) writeChunk(observation.text);
          const scope = { sessionId, tier: turnTierAsk(req) };
          const result = await turnScope.run(scope, () => runProxyTurn({ sessionId, userId, workspace, signal: turnAbort.signal, ...reqData }, (token) => {
            emit(token);
          }));
          clearTurn();
          // THE SAME READING ENVELOPE THE OTHER STREAMING DOOR ALREADY
          // CARRIES (ONE-ENGINE-PLAN, ~line 1307; SSE path ~line 1769): this
          // door streamed tokens but discarded `result` entirely, so its
          // final chunk had no `reading` at all — not void/satisfaction
          // missing, the whole envelope. Gated through groundingGate the
          // same way the SSE path and the non-streaming ollama path below
          // (~line 2066) already are.
          const race = precisionWinner({ observation, draft: result.text });
          const gated = groundingGate({ void: result.void ?? null, satisfaction: result.satisfaction ?? null, reading: result.reading ?? null }, race);
          res.write(JSON.stringify({
            model: parsed.model, created_at: createdAt,
            message: { role: "assistant", content: "" },
            done: true, done_reason: "stop",
            served: servedDisclosure(scope, parsed.model),
            reading: { ...(result.reading ?? result), sessionId, race: raceReading(race), void: gated.void, satisfaction: gated.satisfaction, disclosed: gated.disclosed ?? null },
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
            turnAbort.abort();
          }
        }, TURN_DEADLINE_MS);
        try {
          const scope = { sessionId, tier: turnTierAsk(req) };
          const result = await turnScope.run(scope, () => runProxyTurn({ sessionId, userId, workspace, signal: turnAbort.signal, ...reqData }));
          if (result?.model) parsed.model = result.model; // plain-speech switch disclosed: the envelope names who answered
          clearTimeout(turnDeadline);
          res.removeListener("close", onDisconnect);
          const race = precisionWinner({ observation: await observationP, draft: result.text });
          const resp = ollamaChatResponse({ model: parsed.model, text: race.text, createdAt, usage: result.usage, reading: result });
          // FIXED (found while investigating 256db92's follow-up note): this
          // spread reads result.reading when it is truthy — the ordinary
          // prose-chat case — which is only {schema, sentences, tally, claims,
          // notes, answerRecord, forms}. void/satisfaction are SIBLING keys on
          // `result`, not inside `result.reading`, so they were silently
          // dropped here even though the OpenAI-shaped and SSE paths already
          // disclose (and gate) both. Explicit keys below restore them and run
          // them through the same groundingGate reconciliation.
          const gated = groundingGate({ void: result.void ?? null, satisfaction: result.satisfaction ?? null, reading: result.reading ?? null }, race);
          resp.reading = { ...(result.reading ?? result), sessionId, race: raceReading(race), void: gated.void, satisfaction: gated.satisfaction, disclosed: gated.disclosed ?? null };
          resp.heimdall = bridgeMessage({ model: parsed.model });
          resp.served = servedDisclosure(scope, parsed.model);
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
  // GATED LIKE THE OTHER DOORS (2026-09-20, the last dissent closed): the
  // swarm auto-route runs before admission, heimdall admission runs before
  // the turn, and the mechanical race runs beside it — a Claude Code prompt
  // now waits in line exactly like an OpenAI-shaped one.
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

      // SWARM AUTO-ROUTE, RUN BEFORE HEIMDALL ADMISSION — mirror of the
      // other chat doors (2026-09-20, the last dissent closed): the swarm
      // needs no model and no admission, so a turn pointed at material whose
      // meaning is hard to emerge is answered on the Anthropic wire too,
      // even when the box is refusing model loads. What actually routes
      // (swarm-server.mjs): NL naming swarming, force, or the hard-meaning
      // detector firing — a standing content rule annotates but never routes.
      const swarmTurn = runSwarmTurn({
        task: reqData.task,
        texts: (reqData.attachments ?? []).map((a) => ({ name: a.name, text: a.text })),
        history: (reqData.chatHistory ?? []).map((m, i) => ({ name: `history-${i}`, text: m.content })),
        name: "messages-turn",
      });
      if (swarmTurn.routed) {
        const swarmSessionId = sessionIdFromHeaders(req);
        if (reqData.stream) {
          res.writeHead(200, {
            "content-type": "text/event-stream",
            "cache-control": "no-cache",
            connection: "keep-alive",
            "x-er7-session": swarmSessionId,
          });
          res.write(anthropicStreamStart({ id, model: parsed.model }));
          res.write(anthropicContentBlockStart(0));
          res.write(anthropicContentBlockDelta(0, swarmTurn.answer));
          res.write(anthropicContentBlockStop(0));
          res.write(anthropicMessageDelta({ outputTokens: 0 }));
          res.write(anthropicMessageStop());
          res.end();
        } else {
          const resp = anthropicMessageResponse({ id, model: parsed.model, text: swarmTurn.answer, usage: { promptTokens: 0, completionTokens: 0 } });
          resp.heimdall = bridgeMessage({ model: parsed.model });
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify(resp));
        }
        return;
      }

      // HEIMDALL, WIRED IN — admission on the Anthropic door too: a
      // saturated box or a full family lane refuses with the SAME typed 429
      // shape every other door uses, and the inflight mark is released
      // exactly once on finish or close.
      const admit = admitChatRequest({ model: reqData.model }, req.headers);
      if (!admit.allowed) {
        refuseAdmission(res, admit);
        return;
      }
      releaseOnResponse(res, String(req.headers["x-er7-claim"] || req.headers["x-er7-session"] || ""), admit);

      // THE MECHANICAL RACE — on this door too: a settled mechanism's
      // computed text is the answer on the Anthropic wire as well; a gap is
      // disclosed, never suppressing.
      const observationP = runMechanical(reqData.task, MECHANISMS);

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
            turnAbort.abort();
          }
        }, TURN_DEADLINE_MS);
        const clearTurn = () => {
          clearTimeout(turnDeadline);
          res.removeListener("close", onDisconnect);
        };

        let outputTokens = 0;
        try {
          // A slow mechanism would delay the stream's first token by its own
          // run time; today's mechanisms settle in well under a millisecond.
          const observation = await observationP;
          const mechanicalWins = observation.concluded && observation.kind !== CONCLUSION.BEYOND_REACH;
          const emitDelta = (token) => {
            if (!token) return;
            outputTokens += 1;
            res.write(anthropicContentBlockDelta(0, token));
          };
          const emit = mechanicalWins ? () => {} : emitDelta;
          res.write(anthropicStreamStart({ id, model: parsed.model }));
          res.write(anthropicContentBlockStart(0));
          if (mechanicalWins) emitDelta(observation.text);
          const scope = { sessionId, tier: turnTierAsk(req) };
          const result = await turnScope.run(scope, () => runProxyTurn({ sessionId, userId, workspace, signal: turnAbort.signal, ...reqData }, (token) => {
            emit(token);
          }));
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
            turnAbort.abort();
          }
        }, TURN_DEADLINE_MS);
        try {
          const scope = { sessionId, tier: turnTierAsk(req) };
          const result = await turnScope.run(scope, () => runProxyTurn({ sessionId, userId, workspace, signal: turnAbort.signal, ...reqData }));
          if (result?.model) parsed.model = result.model; // plain-speech switch disclosed: the envelope names who answered
          clearTimeout(turnDeadline);
          res.removeListener("close", onDisconnect);
          const race = precisionWinner({ observation: await observationP, draft: result.text });
          const resp = anthropicMessageResponse({ id, model: parsed.model, text: race.text, usage: result.usage });
          resp.heimdall = bridgeMessage({ model: parsed.model });
          resp.served = servedDisclosure(scope, parsed.model);
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

  // GET /ui — the built-in browser surface: a self-contained page that drives
  // this proxy through the SAME API every caller uses (/v1/models, /v1/ask,
  // /v1/sessions). No sibling repo, no build, no the-fold dependency. This is
  // the "drive eoreader7 from a browser" surface.
  if (req.method === "GET" && (req.url === "/ui" || req.url === "/ui/")) {
    const uiPath = path.join(HERE, "browser", "index.html");
    try {
      const html = fs.readFileSync(uiPath, "utf8");
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(html);
    } catch {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("built-in UI not found (browser/index.html) — but the API is here: POST /v1/ask");
    }
    return;
  }

  // GET /heimdall-ui — the heimdall watch surface: what Heimdall is seeing,
  // live in the browser, drawn as the bridge itself. Self-contained, no
  // build; streams /heimdall/live and reads the same numbers /heimdall
  // serves — the picture is the data, never a rendering of anything else.
  if (req.method === "GET" && req.url === "/heimdall-ui") {
    const uiPath = path.join(HERE, "browser", "heimdall.html");
    try {
      const html = fs.readFileSync(uiPath, "utf8");
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(html);
    } catch {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("heimdall watch surface not found (browser/heimdall.html) — the stream is here: GET /heimdall/live");
    }
    return;
  }

  // POST /ui/tui — the browser→TUI toggle: open a fresh terminal running the
  // TUI on this box. macOS: Terminal.app via osascript. Other platforms: name
  // the command so the operator can run it themselves (a browser cannot open a
  // terminal on every platform; disclosed, never silent).
  if (req.method === "POST" && req.url === "/ui/tui") {
    const { spawn } = await import("node:child_process");
    if (process.platform === "darwin") {
      try {
        const child = spawn("osascript", ["-e", `tell application "Terminal" to do script "eoreader7"`], { detached: true, stdio: "ignore" });
        child.unref();
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ opened: true, surface: "tui", note: "Terminal.app launched running eoreader7" }));
      } catch (err) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: { message: `could not open Terminal: ${err.message}` } }));
      }
    } else {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ opened: false, surface: "tui", note: "run `eoreader7` in a terminal to open the TUI" }));
    }
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

// ── ONE DRIVER PER CHECKOUT (2026-09-21) ──────────────────────────────────
// Two proxies in one working directory (measured: 11436 and an experiment on
// 11466, five hours side by side) each ran the holon tree, the reaper and
// the watchdog against ONE ledger and ONE rules file — the last writer won,
// and the older one's in-process watcher could re-forge the newer. The
// driver lock names the one process that drives; every other proxy in the
// checkout is a door only. A dead holder's lock is stale and taken.
const DRIVER_LOCK = path.join(HERE, "state", "heimdall-driver.lock");
function acquireDriverLock() {
  try {
    const cur = JSON.parse(fs.readFileSync(DRIVER_LOCK, "utf8"));
    if (cur?.pid && cur.pid !== process.pid) {
      try { process.kill(cur.pid, 0); return { held: false, pid: cur.pid, port: cur.port ?? null }; }
      catch { /* the holder is gone: stale */ }
    }
  } catch { /* no lock yet */ }
  try { fs.mkdirSync(path.dirname(DRIVER_LOCK), { recursive: true }); fs.writeFileSync(DRIVER_LOCK, JSON.stringify({ pid: process.pid, port: PORT, at: new Date().toISOString() })); }
  catch (e) { log(`driver lock: could not write (${e.message}) — driving anyway`); }
  return { held: true, pid: process.pid };
}
function releaseDriverLock() {
  try { const cur = JSON.parse(fs.readFileSync(DRIVER_LOCK, "utf8")); if (cur?.pid === process.pid) fs.unlinkSync(DRIVER_LOCK); } catch { /* not ours or already gone */ }
}

// ── THE CHANNEL DOOR (2026-09-21) — Ollama's port, held by Heimdall ───────
// Every server on this box that addresses the model at its conventional
// port lands HERE — the fold's servers, the evals, the bridge, any script
// (105 files did so directly; none had to change) — and passes: admission
// keyed by the calling SERVER (resolved from the connection; round-robin per
// server, the batch ration behind interactive work), the model's one window
// (a caller's num_ctx is dropped and disclosed), the AntiStrauss pre-call
// gate, the host picker (the local daemon or a phone through the bridge),
// then a streamed forward whose client disconnect aborts the daemon's work.
// Every call is measured per server. Read-only management routes pass to the
// local daemon. Nothing else is served — the same default-deny as the proxy.
const CHANNEL_ANSWER_ROUTES = new Set(["/api/chat", "/api/generate", "/api/embed", "/api/embeddings", "/v1/chat/completions", "/v1/completions", "/v1/embeddings"]);
const CHANNEL_READ_ROUTES = new Set(["/api/tags", "/api/ps", "/api/version", "/api/show", "/v1/models"]);
const CHANNEL_ID = `heimdall:${CHANNEL_PORT}`;
const channelServers = [];
function channelJson(res, status, obj, extra = {}) {
  res.writeHead(status, { "content-type": "application/json", "x-heimdall-channel": CHANNEL_ID, ...extra });
  res.end(JSON.stringify(obj));
}
function channelReadBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
/** Serve one turn from the first ready hosted provider (free levels in
 *  order). Returns true when an answer went out; false when every provider
 *  was exhausted, down, or unknown — the caller falls back to the local
 *  ladder. A 429 exhausts the provider (its Retry-After, else its window); a
 *  5xx or a network failure stands it down; a model the provider does not
 *  know is discovered once from /models. The response is translated back to
 *  the wire the caller spoke (Ollama NDJSON / JSON, or OpenAI as-is). */
async function tryOnline({ req, res, parsed, pathname, model, who, headers, t0, holds = 0 }) {
  const reg = onlineMouths();
  const route = /generate/.test(pathname) ? "generate" : "chat";
  const openaiWire = pathname.startsWith("/v1/");
  const stream = !!parsed.stream;
  const tried = [];
  for (let attempt = 0; attempt < 4; attempt++) {
    const pick = reg.pick({ exclude: tried });
    if (!pick) return false;
    const { provider: p, model: pm, key } = pick;
    tried.push(p.name);
    const body = openaiWire ? { ...parsed, model: pm } : toOpenAIBody(parsed, pm, { stream });
    const ac = new AbortController();
    let closedByClient = false;
    const onClose = () => { if (!res.writableFinished) { closedByClient = true; ac.abort(); } };
    res.on("close", onClose);
    const started = Date.now();
    let up;
    try {
      up = await fetch(`${p.baseUrl}/chat/completions`, { method: "POST", headers: { "content-type": "application/json", ...(key ? { authorization: `Bearer ${key}` } : {}) }, body: JSON.stringify(body), signal: AbortSignal.any([ac.signal, AbortSignal.timeout(60000)]) });
    } catch (e) {
      res.off("close", onClose);
      if (closedByClient) return true; // the caller left; nothing to fall back for
      reg.down(p.name, e?.cause?.code ?? e?.name ?? e.message); ledgerEva("online_down", { provider: p.name, reason: e?.cause?.code ?? e?.name ?? e.message, key: who.key }); continue;
    }
    if (up.status === 429) { res.off("close", onClose); const s = reg.exhausted(p.name, { retryAfterS: up.headers.get("retry-after") }); ledgerEva("online_exhausted", { provider: p.name, forS: s, key: who.key }); continue; }
    if (up.status === 404 || up.status === 400 || up.status === 422) {
      res.off("close", onClose);
      const st = reg.standing(p.name);
      if (st && !st.discovered) {
        const found = await discoverOnlineModel(p, key).catch(() => null);
        reg.setModel(p.name, found ?? pm);
        if (found && found !== pm) { tried.pop(); attempt -= 1; ledgerEva("online_model_discovered", { provider: p.name, model: found, key: who.key }); continue; }
      }
      reg.down(p.name, `HTTP ${up.status}`); ledgerEva("online_down", { provider: p.name, reason: `HTTP ${up.status}`, key: who.key }); continue;
    }
    if (!up.ok) { res.off("close", onClose); reg.down(p.name, `HTTP ${up.status}`); ledgerEva("online_down", { provider: p.name, reason: `HTTP ${up.status}`, key: who.key }); continue; }
    const stamps = { "x-heimdall-channel": CHANNEL_ID, "x-heimdall-tier": "online", "x-heimdall-provider": p.name, "x-heimdall-served-by": `${p.name}/${pm}`, "x-heimdall-revisable-by": model, "x-heimdall-provisional": "1", "x-heimdall-server": who.key, ...(holds ? { "x-heimdall-held": `${holds * 200}ms` } : {}) };
    // THE REVISABLE PROMISE, ON THIS PATH TOO (2026-09-22): tryOnline writes
    // its own response and never reaches the local-substitute recording
    // site further down — measured live: the online tier stamped
    // provisional/revisable-by with no x-heimdall-revision-id at all until
    // this was added. The online answer is the LEAST grounded of every
    // tier, so it is the one that most wants an upgrade offered.
    const rev = recordProvisional({ requester: headers?.["x-er7-caller"] ?? who.key, requestedModel: model, servedBy: `${p.name}/${pm}`, tier: "online", pathname, body: { ...parsed, model } });
    stamps["x-heimdall-revision-id"] = rev.id;
    let promptTokens = 0, evalTokens = 0;
    try {
      if (openaiWire) {
        res.writeHead(up.status, { "content-type": up.headers.get("content-type") || "application/json", ...stamps });
        let tail = "";
        if (up.body) for await (const chunk of up.body) { res.write(chunk); tail = (tail + Buffer.from(chunk).toString("utf8")).slice(-4096); }
        res.end();
        ({ promptTokens, evalTokens } = streamAccounting(tail));
      } else if (!stream) {
        const j = await up.json();
        const out = fromOpenAIResponse(j, { model: pm, route, startedAt: t0 });
        promptTokens = out.prompt_eval_count; evalTokens = out.eval_count;
        res.writeHead(200, { "content-type": "application/json", ...stamps });
        res.end(JSON.stringify(out));
      } else {
        res.writeHead(200, { "content-type": "application/x-ndjson", ...stamps });
        let buf = "";
        if (up.body) for await (const chunk of up.body) {
          buf += Buffer.from(chunk).toString("utf8");
          const [objs, rest] = splitSse(buf); buf = rest;
          for (const o of objs) { const c = sseChunkToOllama(o, { model: pm, route }); if (c) { if (c.done) { promptTokens = c.prompt_eval_count ?? promptTokens; evalTokens = c.eval_count ?? evalTokens; } res.write(JSON.stringify(c) + "\n"); } }
        }
        res.end();
      }
    } catch (e) {
      res.off("close", onClose);
      if (!res.headersSent) { reg.down(p.name, e?.name ?? e.message); continue; }
      res.end(); reg.observe(p.name, { ms: Date.now() - started, ok: false }); return true;
    }
    res.off("close", onClose);
    reg.observe(p.name, { ms: Date.now() - started, ok: true });
    channelObserve(who.key, { label: who.label, pid: who.pid, model: pm, requested: model, tier: "online", host: p.name, ms: Date.now() - t0, promptTokens, evalTokens, ok: true, status: 200 });
    return true;
  }
  return false;
}
async function discoverOnlineModel(p, key) {
  const r = await fetch(`${p.baseUrl}/models`, { headers: key ? { authorization: `Bearer ${key}` } : {}, signal: AbortSignal.timeout(8000) });
  if (!r.ok) return null;
  const j = await r.json().catch(() => null);
  const ids = (j?.data ?? j?.models ?? []).map((m) => m?.id ?? m?.name).filter((x) => typeof x === "string");
  return ids.find((id) => /llama|gemma|mistral|qwen|deepseek|gpt|flash|command|instruct/i.test(id)) ?? ids[0] ?? null;
}
/** The re-draw half of the revisable promise (2026-09-22): for each pending
 *  revision, ask serveTiersFor the same question the channel itself asks —
 *  can the ORIGINALLY-REQUESTED model answer inside the promise right now?
 *  If yes, draw it for real and hold the upgrade; if not, leave it pending
 *  for the next cadence. One bounded pass, never a queue of its own — a
 *  revision that keeps missing just keeps being asked again, cheaply. */
async function sweepRevisions() {
  for (const entry of pendingRevisions()) {
    let ready;
    try { ready = serveTiersFor(entry.requestedModel).find((t) => t.tier === "full" && t.waitMs <= slaWaitMs()); }
    catch { continue; }
    if (!ready) continue;
    markAttempted(entry.id);
    const host = hostByName(ready.host);
    if (!host) continue;
    try {
      const up = await fetch(`${host.url}${entry.pathname}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(entry.body), signal: AbortSignal.timeout(60000) });
      if (!up.ok) { markFailed(entry.id, new Error(`HTTP ${up.status}`)); continue; }
      const j = await up.json();
      markDrawn(entry.id, j);
      ledgerEva("revision_drawn", { requester: entry.requester, requestedModel: entry.requestedModel, servedBy: entry.servedBy, waitedMs: Date.now() - entry.createdAt });
    } catch (e) {
      markFailed(entry.id, e);
    }
  }
}
// A page on THIS box (any port) may use the channel from a browser — the same
// scope a plain Ollama on this port served pages before Heimdall held it.
// Any other origin gets no allow header: an arbitrary website must never be
// able to drive the local model through the user's own browser.
const LOOPBACK_PAGE_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;
const CHANNEL_EXPOSED_HEADERS = "x-heimdall-channel, x-heimdall-host, x-heimdall-pick, x-heimdall-tier, x-heimdall-served-by, x-heimdall-revisable-by, x-heimdall-provisional, x-heimdall-revision-id, x-heimdall-server, x-heimdall-window, x-heimdall-held, x-heimdall-provider, x-heimdall-in-tab, retry-after, x-queue-position";
async function handleChannel(req, res) {
  const t0 = Date.now();
  let pathname = req.url || "/";
  try { pathname = new URL(req.url, "http://localhost").pathname; } catch { /* raw url stands */ }
  // CORS, loopback pages only (2026-09-22): the channel shipped with none,
  // so the-fold's page could no longer reach :11434 at all and silently fell
  // through to :11436. setHeader here merges into every writeHead below.
  const pageOrigin = typeof req.headers.origin === "string" && LOOPBACK_PAGE_ORIGIN.test(req.headers.origin) ? req.headers.origin : null;
  if (pageOrigin) {
    res.setHeader("access-control-allow-origin", pageOrigin);
    res.setHeader("vary", "Origin");
    res.setHeader("access-control-expose-headers", CHANNEL_EXPOSED_HEADERS);
  }
  if (req.method === "OPTIONS") {
    if (pageOrigin) {
      res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
      res.setHeader("access-control-allow-headers", String(req.headers["access-control-request-headers"] || "content-type"));
    }
    res.writeHead(204);
    return res.end();
  }
  // THE REVISION'S RECEIPT (2026-09-22): a provisional answer's own promise,
  // collected by its id — requester-scoped, exactly like /v1/held/:id. Never
  // pushed to the caller; theirs to ask for.
  if (req.method === "GET" && pathname.startsWith("/v1/revisions/")) {
    const who = await resolveServerKey(req.socket);
    const requester = String(req.headers["x-er7-user"] || req.headers["x-er7-caller"] || who.key || "");
    const e = getRevision(decodeURIComponent(pathname.slice("/v1/revisions/".length)), { requester });
    if (!e) return channelJson(res, 404, { error: "no such revision for this requester (drawn revisions are held for a while, then released)" });
    return channelJson(res, 200, revisionReceipt(e));
  }
  const isAnswer = req.method === "POST" && CHANNEL_ANSWER_ROUTES.has(pathname);
  const isRead = CHANNEL_READ_ROUTES.has(pathname) && (req.method === "GET" || req.method === "POST");
  if (!isAnswer && !isRead) return channelJson(res, 404, { error: `no such route on the channel: ${req.method} ${pathname}`, type: "unserved_path", path: pathname, method: req.method });
  const raw = await channelReadBody(req).catch(() => Buffer.alloc(0));
  if (isRead) {
    try {
      const up = await fetch(`${MODEL_SERVER_URL}${req.url}`, { method: req.method, headers: { "content-type": req.headers["content-type"] || "application/json" }, body: req.method === "GET" ? undefined : raw, signal: AbortSignal.timeout(10000) });
      res.writeHead(up.status, { "content-type": up.headers.get("content-type") || "application/json", "x-heimdall-channel": CHANNEL_ID });
      if (!up.body) return res.end();
      for await (const chunk of up.body) res.write(chunk);
      return res.end();
    } catch (e) {
      return channelJson(res, 502, { error: `the model server at ${MODEL_SERVER_URL} did not answer: ${e?.cause?.code ?? e.message}`, type: "model_server_unreachable" });
    }
  }
  let parsed;
  try { parsed = JSON.parse(raw.toString("utf8") || "{}"); } catch { return channelJson(res, 400, { error: "bad json", type: "bad_json" }); }
  const model = String(parsed?.model ?? "").trim() || null;
  if (!model) return channelJson(res, 400, { error: "model required", type: "no_model" });
  // WHO — the server behind the connection, unless the caller declared itself
  const who = await resolveServerKey(req.socket);
  const headers = { ...req.headers };
  if (!headers["x-er7-user"] && !headers["x-er7-caller"] && !headers["x-er7-session"]) headers["x-er7-caller"] = who.key;
  // A server is not a human: the batch ration, behind interactive work,
  // unless it says otherwise. A PAGE on this box is a person at a page
  // (2026-09-22, the operator's rule: fastest for the person by default) —
  // interactive, so it gets a person's place in line and the on-device
  // substitute ladder. Anything that would leave the device stays opt-in.
  if (!headers["x-er7-priority"] && !headers["x-er7-user"]) headers["x-er7-priority"] = pageOrigin ? "interactive" : "batch";
  const { hop, from } = hopOf(headers);
  if (hop >= 2) return channelJson(res, 508, { error: "the channel saw this turn twice — a loop, refused", type: "loop" });
  const tierAsk = String(headers["x-er7-tier"] || "").trim().toLowerCase(); // "any" | "exact" | "" (a person hops, a batch waits)
  let served = null; // a substitute mouth, when the ladder de-escalated the turn
  // THE GATE — every answer-generating call, FIRST (moved 2026-09-22): it
  // used to run after admission, and the hold loop's online rung returns from
  // inside admission — so a prompt the gate would block could still leave
  // the box to an online provider. Nothing is admitted, held, substituted,
  // sent off-device, or recorded for revision until it has passed here.
  if (!/embed/.test(pathname)) {
    const gate = antistrauss.gate({ model, messages: messagesOf(parsed), route: "chat" }, { forceBlock: true });
    if (!gate.allow) return channelJson(res, 403, { error: gate.reason, type: "antistrauss_blocked", verdict: gate.verdict ?? null });
  }
  // ADMISSION — a re-entered turn (the bridge fell through) was admitted already
  let admit = null;
  if (hop === 0) {
    // THE MOUTH FIRST (2026-09-22, "use whatever model and system will be
    // fastest for the user"): a person's turn — interactive, or a caller that
    // said x-er7-tier: any — whose model is cold or busy past the promise is
    // served NOW by a warm on-device mouth, the same decision the engine's
    // own draws take (heimdall.mjs mouthFor), instead of paying a load
    // (measured: 28s of a 75s fold turn was reloading gemma2:2b). Stamped
    // provisional and revisable below, like every ladder answer. Never for
    // embeddings, never for a caller that pinned its model, never off-device.
    // (a request carrying images is a vision ask: never handed to a text mouth)
    const carriesImages = Array.isArray(parsed?.images) && parsed.images.length > 0 || (parsed?.messages ?? []).some((m) => Array.isArray(m?.images) && m.images.length || Array.isArray(m?.content) && m.content.some((c) => /image/.test(String(c?.type ?? ""))));
    const mouthOk = !/embed/.test(pathname) && !carriesImages && (tierAsk === "any" || (tierAsk !== "exact" && headers["x-er7-priority"] === "interactive"));
    if (mouthOk) {
      const m = mouthFor(model, { scope: null, exclude: from ?? hostOwnedByPid(who.pid) });
      if (m.provisional && hostByName(m.host)) {
        const altAdmit = admitChatRequest({ ...parsed, model: m.model }, { ...headers, "x-er7-quiet": "1" });
        if (altAdmit.allowed) { admit = altAdmit; served = { host: m.host, model: m.model, tier: m.tier }; }
      }
    }
    if (!admit) admit = admitChatRequest(parsed, headers);
    // HOLD, DON'T BOUNCE (2026-09-22): a refusal that will clear in seconds —
    // not your turn, the lane full, the box pegged, a wait inside the promise,
    // memory that a finishing turn frees — is held HERE on the open socket
    // and re-admitted the moment it clears (admission is 0.1 ms; the caller
    // keeps its place in line on every retry), bounded by slaSeconds. Measured
    // before this: a client told "retry in 30s" slept 30s for a slot that
    // freed in 2s. Only past the promise is the caller bounced, with the
    // measured wait.
    const HOLDABLE = new Set(["not_your_turn", "lane_full", "saturated", "expected_wait", "zipper", "memory_pressured", "model_diversity_capped"]);
    // IN-TAB FIRST, PAST THE PROMISE (2026-09-22, "fastest for the user"): a
    // page that says its own in-tab model is WARM (x-er7-in-tab: warm) is not
    // held on a refusal that MEASURES the box past the promise — the expected
    // wait already beyond it, or a load the box cannot afford now — once no
    // warm on-device mouth answered above. It is told at once and answers in
    // its own tab, instead of waiting out the whole promise first (the fold
    // hopped only after the 12s hold). Fairness refusals that clear inside
    // the promise (your turn, the lane, the zipper) are still held.
    const PAST_PROMISE = new Set(["expected_wait", "memory_pressured", "model_diversity_capped"]);
    const inTabWarm = String(headers["x-er7-in-tab"] || "").trim().toLowerCase() === "warm";
    const answerInTab = !!admit && !admit.allowed && inTabWarm && PAST_PROMISE.has(admit.type);
    if (!admit.allowed && HOLDABLE.has(admit.type) && !answerInTab) {
      // A person is told the truth at the promise (slaSeconds): past it, the
      // measured wait, not a spinner. A batch caller is held until served —
      // bouncing it after 12s cost it the 12s AND a retry (measured: three of
      // six 429s at 12.1s that would have been answered at ~19s) — bounded by
      // the line's own stale-waiter limit (waiterTtlSeconds), never forever.
      const interactive = headers["x-er7-priority"] === "interactive";
      const deadline = Date.now() + (interactive ? slaWaitMs() : waiterTtlMs());
      // THE LADDER (2026-09-22, SERVING-POLICY tiers 3–4): a person is not
      // left waiting on a mouth the box cannot afford right now. If a
      // substitute is WARM — the small mouth on a daemon, a phone's model
      // through the bridge — and can answer inside the promise, the turn is
      // served there NOW, stamped provisional and revisable by the model
      // asked for. Never a cold load. A caller asking `x-er7-tier: exact`
      // (and batch work by default) waits for its model instead.
      const substituteOk = !carriesImages && (tierAsk === "any" || (tierAsk !== "exact" && interactive));
      let holds = 0;
      while (!admit.allowed && HOLDABLE.has(admit.type) && Date.now() < deadline && !res.writableEnded && !req.socket.destroyed) {
        // THE ONLINE RUNG (2026-09-22, `onlineMouths` on — SECURITY REDUCED):
        // ahead of the small mouth because a hosted model answers better, and
        // the operator chose the trade; never for embeddings, never for a
        // caller that pinned its tier. The fast-pass lane admits it (ration
        // and claim, no local slot). If every provider is spent, the local
        // substitutes and the hold stand as before.
        if (substituteOk && onlineEnabled() && !/embed/.test(pathname)) {
          const onlineAdmit = admitChatRequest({ ...parsed, model: "online/any" }, { ...headers, "x-er7-quiet": "1" });
          if (onlineAdmit.allowed) {
            releaseOnResponse(res, onlineAdmit.claim?.id ?? null, onlineAdmit);
            if (await tryOnline({ req, res, parsed, pathname, model, who, headers, t0, holds })) return;
          }
        }
        if (substituteOk) {
          const alt = serveTiersFor(model, { exclude: from ?? hostOwnedByPid(who.pid) }).find((c) => c.tier !== "full" && c.waitMs <= slaWaitMs());
          if (alt) {
            const altAdmit = admitChatRequest({ ...parsed, model: alt.model }, { ...headers, "x-er7-quiet": "1" });
            if (altAdmit.allowed) { admit = altAdmit; served = alt; break; }
          }
        }
        await new Promise((r) => setTimeout(r, 200));
        holds += 1;
        admit = admitChatRequest(parsed, { ...headers, "x-er7-quiet": "1" });
      }
      if (admit.allowed && holds) res.setHeader("x-heimdall-held", `${holds * 200}ms`);
      if (req.socket.destroyed) return;
    }
    if (!admit.allowed) {
      const hold = channelRefused(who.key, admit.retryAfterS ?? 15, { label: who.label, pid: who.pid, priority: headers["x-er7-priority"] });
      const h = { "retry-after": String(hold.retryAfterS), "x-heimdall-server": who.key };
      if (answerInTab) { h["x-heimdall-in-tab"] = "answer-in-tab"; ledgerRec("answer_in_tab", { key: who.key, model, type: admit.type }); }
      if (admit.queue?.position != null) h["x-queue-position"] = String(admit.queue.position);
      return channelJson(res, admit.status, { error: admit.message, type: admit.type, retry_after: hold.retryAfterS, early_retry: hold.early || undefined, queue: admit.queue ?? null }, h);
    }
    releaseOnResponse(res, admit.claim?.id ?? null, admit);
  }
  // ONE WINDOW
  const askedWindow = holdWindow(parsed);
  if (askedWindow != null) ledgerEva("window_held", { key: who.key, model, asked: askedWindow });
  // WHICH HOST — sticky per server, resident first, shortest wait; never the
  // host this turn came from: named by the hop mark, or measured — the caller
  // IS a host (the bridge falling through to its upstream, hop mark or not).
  const exclude = from ?? hostOwnedByPid(who.pid);
  const picked = served ? { host: hostByName(served.host), reason: `ladder:${served.tier}` } : pickHost({ model, session: who.key, exclude });
  const host = picked.host;
  const servedModel = served ? served.model : model;
  // Captured BEFORE the mutation below, with the model actually asked for —
  // this, never the substitute's body, is what a revision later re-sends.
  const originalBody = served ? { ...parsed, model } : null;
  if (served) parsed.model = served.model;
  hostBegin(host.name, servedModel);
  const ac = new AbortController();
  let closedByClient = false;
  res.on("close", () => { if (!res.writableFinished) { closedByClient = true; ac.abort(); } });
  let status = null, ok = false, tail = "";
  try {
    const up = await fetch(`${host.url}${pathname}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-heimdall-hop": String(hop + 1), "x-heimdall-from": host.name, "x-er7-caller": headers["x-er7-caller"] ?? who.key, "x-er7-priority": headers["x-er7-priority"] ?? "batch" },
      body: JSON.stringify(parsed),
      signal: ac.signal,
    });
    status = up.status;
    const out = { "content-type": up.headers.get("content-type") || "application/json", "x-heimdall-channel": CHANNEL_ID, "x-heimdall-host": host.name, "x-heimdall-pick": picked.reason, "x-heimdall-server": who.key, "x-heimdall-tier": served ? served.tier : "full" };
    if (served) {
      out["x-heimdall-served-by"] = served.model; out["x-heimdall-revisable-by"] = model; out["x-heimdall-provisional"] = "1";
      // THE REVISABLE PROMISE, KEPT (2026-09-22): recorded only once the draw
      // is known to have SUCCEEDED (up.ok) — a provisional answer that never
      // actually came back is not something to promise an upgrade on.
      if (up.ok) {
        const rev = recordProvisional({ requester: headers["x-er7-caller"] ?? who.key, requestedModel: model, servedBy: served.model, tier: served.tier, pathname, body: originalBody });
        out["x-heimdall-revision-id"] = rev.id;
      }
    }
    if (askedWindow != null) out["x-heimdall-window"] = `held (asked ${askedWindow})`;
    res.writeHead(up.status, out);
    // fetch's body yields Uint8Arrays, whose toString() is "104,101,…" — decode
    // through a Buffer or the tail is digits and the accounting reads zero
    // (measured 22:56: the body carried prompt_eval_count 36, the ledger 0).
    if (up.body) for await (const chunk of up.body) { res.write(chunk); tail = (tail + Buffer.from(chunk).toString("utf8")).slice(-4096); }
    res.end();
    ok = up.ok;
  } catch (e) {
    const code = e?.cause?.code ?? e?.code ?? e?.name ?? "";
    if (!res.headersSent) channelJson(res, closedByClient ? 499 : 502, { error: `${host.name} did not answer: ${code || e.message}`, type: closedByClient ? "client_closed" : "host_failed", host: host.name });
    else res.end();
    hostEnd(host.name, { model: servedModel, ms: Date.now() - t0, ok: false, refused: /ECONNREFUSED|EHOSTUNREACH|ENOTFOUND/.test(String(code)) });
    channelObserve(who.key, { label: who.label, pid: who.pid, model: servedModel, requested: model, tier: served ? served.tier : "full", host: host.name, ms: Date.now() - t0, ok: false, status: closedByClient ? 499 : 502 });
    return;
  }
  const acct = streamAccounting(tail);
  hostEnd(host.name, { model: servedModel, ms: Date.now() - t0, ok, loadMs: acct.loadMs });
  channelObserve(who.key, { label: who.label, pid: who.pid, model: servedModel, requested: model, tier: served ? served.tier : "full", host: host.name, ms: Date.now() - t0, loadMs: acct.loadMs, promptTokens: acct.promptTokens, evalTokens: acct.evalTokens, ok, status });
}
/** Hold the channel: reconcile the daemons to one (the operator's rule), make
 *  sure ours answers, then bind BOTH loopback families — `localhost` resolves
 *  to ::1 here and 127.0.0.1 elsewhere, and a daemon on one family with the
 *  channel on the other is the split this door exists to end. A held port is
 *  a finding, retried while it drains, never a silent bypass. */
async function bootChannel() {
  const r = await reconcileModelServers().catch((e) => ({ ok: false, error: e.message }));
  log(`channel: reconcile — kept ${r.kept ?? "none"}, quit ${(r.quit ?? []).length}${r.ensured?.note ? `; ${r.ensured.note}` : r.ensured?.error ? `; ${r.ensured.error}` : r.error ? `; ${r.error}` : ""}`);
  // the roster, then the small mouth beside the working model (never into a pressured box)
  refreshOllamaModels().then(() => warmSmallMouth()).then((w) => log(`channel: small mouth — ${w.model ?? "none"}${w.warmed ? " warmed" : `: ${w.reason}`}`)).catch((err) => log(`small mouth: ${err.message}`));
  const bind = (host) => new Promise((resolve) => {
    const s = http.createServer(handleChannel);
    s.on("error", (e) => resolve({ ok: false, error: e.code || e.message }));
    s.listen(CHANNEL_PORT, host, () => resolve({ ok: true, server: s }));
  });
  const families = [{ host: "127.0.0.1", server: null, error: null }, { host: "::1", server: null, error: null }];
  for (let attempt = 1; attempt <= 8; attempt++) {
    for (const f of families) {
      if (f.server) continue;
      const b = await bind(f.host);
      if (b.ok) { f.server = b.server; f.error = null; channelServers.push(b.server); } else f.error = b.error;
    }
    if (families.every((f) => f.server || f.error !== "EADDRINUSE")) break;
    await new Promise((r) => setTimeout(r, 1500));
  }
  const state = { bound: families.some((f) => f.server), port: CHANNEL_PORT, daemon: MODEL_SERVER_URL, families: families.map((f) => ({ host: f.host, bound: !!f.server, error: f.error })) };
  setChannelBound(state);
  if (state.bound) log(`channel: holding ${families.filter((f) => f.server).map((f) => `${f.host}:${CHANNEL_PORT}`).join(" and ")} → ${MODEL_SERVER_URL}`);
  const held = families.filter((f) => !f.server && f.error === "EADDRINUSE");
  if (held.length) { log(`channel: ${held.map((f) => f.host).join(",")}:${CHANNEL_PORT} is HELD by another process — callers there bypass Heimdall`); ledgerEva("channel_port_held", { port: CHANNEL_PORT, hosts: held.map((f) => f.host) }); }
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
  //
  // EXTERNAL SUPERVISION (2026-09-20): set ER7_EXTERNAL_HEIMDALL=1 to run the
  // hive-mind OUT of this process (node heimdall-fleet.mjs, a separate
  // process, watches this proxy from outside). The lesson: a proxy that wedges
  // into a CPU self-loop (10h at 98.5%) takes an in-process watcher down with
  // it — nobody outside could see it. When an external fleet is present, this
  // proxy stays a thin sandbox: no in-process watcher, no self-re-forge, and
  // the fleet's /heimdall at ER7_HEIMDALL_FLEET_PORT (default 11438) is the
  // gate the operator reads. The proxy still answers its OWN /heimdall (the
  // disclosure), so the external watcher has something honest to probe.
  const driver = acquireDriverLock();
  if (!driver.held) {
    log(`driver: PASSIVE — pid ${driver.pid} holds state/heimdall-driver.lock; this proxy is a door only (no watcher, no holon driver, no reaper, no watchdog, no channel)`);
  } else {
    // THE CHANNEL: reconcile the daemons, ensure ours, hold Ollama's port.
    bootChannel().catch((err) => log(`channel boot error: ${err.message}`));
  }
  if (!driver.held) {
    // a door only: nothing below drives
  } else if ((process.env.ER7_EXTERNAL_HEIMDALL ?? "0") !== "1") {
    startWatcher({ selfPort: PORT });
    log("watcher: heimdall running inside the proxy");
  } else {
    log(`watcher: EXTERNAL heimdall — proxy is a sandbox; fleet on http://127.0.0.1:${process.env.ER7_HEIMDALL_FLEET_PORT ?? 11438}`);
    // no in-process watcher, but the tachometers still need a reading: sample
    // CPU/GPU/RAM lightly so every surface discloses live vitals.
    sampleVitalsNow().catch(() => {});
    setInterval(() => { sampleVitalsNow().catch(() => {}); }, 2000);
  }
  // THE MODEL WATCHDOG (2026-09-21): the wedge that cost every turn its
  // deadline gets an ending — probe the model server cheaply; after 3 misses
  // with no turn in flight, restart `ollama serve` in the tuned config. A
  // healthy-but-busy server is never restarted (the probe is /api/tags, and a
  // turn in flight stands it down). ER7_MODEL_WATCHDOG=0 disables it.
  // GATE FIXED 2026-09-21: the gate reads the SURFACE inflight (markInflight
  // "er7" — incremented by admitChatRequest on EVERY admitted door, the code
  // and documents doors included), never the local `_inflight` counter, which
  // only the /v1/ask and /v1/messages handlers incremented. A /v1/code loop
  // running under a stale `_inflight === 0` let this watchdog cold-restart
  // ollama mid-loop, killing every in-flight turn on the box (measured:
  // UND_ERR_SOCKET / UND_ERR_HEADERS_TIMEOUT on the code door while the model
  // server was restarted underneath it). The surface inflight is the honest
  // gate: it marks a turn as soon as admission admits it and releases it when
  // the response closes, on every door.
  if (driver.held && (process.env.ER7_MODEL_WATCHDOG ?? "1") !== "0") {
    let hits = 0;
    setInterval(async () => {
      const er7 = getSurfaces().find((s) => s.name === "er7");
      if ((er7?.inflight ?? 0) > 0) { hits = 0; return; }
      const p = await probeModelServer().catch(() => ({ ok: false }));
      if (p.ok) { hits = 0; return; }
      // Under memory pressure a probe timeout is MEMORY, not a wedge
      // (2026-09-21): the 21:50 restart was three timeouts at 93% swap, and
      // it bred a second daemon. A restart cannot make memory — stand down
      // and let the memory levers work; the timeout is its own finding.
      const vt = readVitals();
      if (warmPressureTest(vt)) { hits = 0; ledgerEva("probe_timeout_under_pressure", { reason: warmPressureReason(vt), surface: p.surface ?? null }); return; }
      hits += 1;
      if (hits >= 3) { hits = 0; const r = await restartModelServer().catch(() => null); log(`watchdog: model server unresponsive 3× — restarted ${r?.ok ? r.note : "(failed)"}`); }
    }, 30000);
  }
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
      const vt = readVitals();
      const idle = vt?.cpuIdle ?? null;
      // MEMORY IS THE BINDING CONSTRAINT on this box (measured: swap churn,
      // compressor 8GB, CPU 24% — the CPU-idle lines never saw it). Warming a
      // model into a thrashing box is how churn was born: warm → evicted →
      // drop → warm. So memory pressure stands the holon down exactly like CPU
      // saturation, and only a memory-clear box may resume. The test is the
      // WARM-specific one (available memory + churn), not the admission gate's
      // free-floor test: holding a model resident is not a new load, and the
      // chronically ~50MB "truly free" on macOS must not drop a held model so
      // the next prompt pays a cold load (measured: 132 reloads, box idle).
      const memPressed = warmPressureTest(vt);
      if (_residencyStanding === "standby") {
        // In standby: only a sustained clear box resumes warming.
        if (idle == null) return { class: "stand_down", probe: "no_vitals", missing: [] };
        if (memPressed) {
          _residencyClearTicks = 0;
          // A STABLE probe and the measured value as evidence (2026-09-21): a
          // value baked into the probe split one pattern into six ledger keys.
          return { class: "stand_down", probe: "memory_pressured", evidence: warmPressureReason(vt) ?? null, missing: [] };
        }
        if (idle < _residencyResumeIdle) {
          _residencyClearTicks = 0;
          return { class: "stand_down", probe: "idle_below_resume", evidence: `idle ${Math.round(idle)}% < resume ${_residencyResumeIdle}%`, missing: [] };
        }
        _residencyClearTicks += 1;
        if (_residencyClearTicks < _residencyClearTicksNeeded) {
          return { class: "stand_down", probe: "clearing", evidence: `clear ${_residencyClearTicks}/${_residencyClearTicksNeeded}`, missing: [] };
        }
        // Sustained clear — resume. Reset the state; the code below runs.
        _residencyStanding = "active";
        _residencyClearTicks = 0;
        log(`REC — residency: box clear ${_residencyClearTicksNeeded} ticks at ${Math.round(idle)}% idle — warming resumed`);
      }
      // Active: stand down on saturation (the standby line) or on memory
      // pressure, then hysteresis decides when warming may return.
      if (memPressed) {
        _residencyStanding = "standby";
        _residencyClearTicks = 0;
        const why = warmPressureReason(vt) || "pressured";
        log(`REC — residency: memory pressured (${why}) — stand down`);
        return { class: "stand_down", probe: "memory_pressured", evidence: why, missing: [] };
      }
      if (idle != null && idle <= _residencyStandbyIdle) {
        _residencyStanding = "standby";
        _residencyClearTicks = 0;
        log(`REC — residency: box pegged at ${Math.round(idle)}% idle — stand down (resume only at ≥${_residencyResumeIdle}% for ${_residencyClearTicksNeeded} ticks)`);
        return { class: "stand_down", probe: "saturated", evidence: `idle ${Math.round(idle)}%`, missing: [] };
      }
      // An unmeasured resident set is never a conviction (house law;
      // falsification F4, round 3): in external mode the model table is
      // never refreshed, and reporting every hot model as "dropped" against
      // an empty measurement would fabricate findings the rule-author could
      // mint into a false derived rule. Unknown → no finding.
      const loaded = loadedModels();
      if (loaded == null) return null;
      const resident = new Set(loaded.map((m) => m.name));
      // Residency is for LOCAL, generative models only: an embedding model is
      // not held warm for turns, and a REMOTE model (ungated lane) has no
      // local residency to keep — treating either as "dropped" is a category
      // error that minted churn findings (nomic-embed ×869, haiku ×308).
      const used = new Set([...hotModelSet()].filter((m) => !/embed/i.test(String(m)) && !isUngatedModel(m)));
      const missing = [...used].filter((m) => !resident.has(m));
      return missing.length ? { class: "model_dropped", probe: missing.slice(0, 1).join(","), missing: missing.slice(0, 1) } : null;
    },
    act: async (finding) => {
      if (finding.class === "stand_down") {
        return { note: `stand-down: ${finding.probe}${finding.evidence ? ` (${finding.evidence})` : ""} — no re-warm this cadence` };
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
  // ONE INSTANCE (2026-09-20, falsification A4-fix): the holon's sense and
  // act come from the SAME factory call — two separate makeRuleAuthorHolon()
  // calls would silently diverge the moment per-instance state lands.
  const ruleAuthor = makeRuleAuthorHolon();
  declareLoop({
    name: "rule-author",
    def: "the swarm reads its own ledger: a finding that recurs past the floor earns a standing rule (with its falsifying control); the bridge writes its own emergent law",
    cadenceMs: Number(process.env.ER7_RULE_AUTHOR_CADENCE_MS ?? 120000),
    sense: ruleAuthor.sense,
    act: ruleAuthor.act,
  });
  log("holon: rule-author declared (emergent rules from the ledger)");
  // THE MEMORY HOLON (2026-09-20, improvement B6): when heimdall runs wired
  // into this proxy, consolidation is a declared DEF→EVA→REC holon of its
  // own — the ledger is not infinite, and the fold happens on a cadence,
  // never on the request path. The watcher tick's own consolidation is
  // STANDALONE-only now (heimdall.mjs gates it on isMain), so the same act
  // never runs twice.
  let _lastMemoryAt = 0;
  const MEMORY_CADENCE_MS = Number(process.env.ER7_HEIMDALL_CONSOLIDATE ?? 15 * 60 * 1000);
  declareLoop({
    name: "memory",
    def: "the watcher's ledger is not infinite: recent past stays raw, older past folds to hourly then daily snapshots, past the cold horizon the memory is released — consolidated on its own cadence, never on the request path",
    cadenceMs: MEMORY_CADENCE_MS,
    sense: async () => {
      if (Date.now() - _lastMemoryAt < MEMORY_CADENCE_MS) return null;
      return { class: "consolidate_due", probe: "memory" };
    },
    act: async () => {
      _lastMemoryAt = Date.now();
      const r = consolidateMemory();
      return { note: `memory folded: ${r.folded ?? 0} line(s) released, ${r.kept ?? 0} kept raw (${r.hourly ?? 0} hourly, ${r.daily ?? 0} daily buckets)` };
    },
  });
  log("holon: memory declared (ledger fold on its own cadence)");
  // THE HOLON DRIVER IN FLEET MODE (2026-09-20, falsification F6): with
  // ER7_EXTERNAL_HEIMDALL=1 the watcher never runs here, so the tick never
  // drives runHolonTree — the memory holon was declared but never sensed and
  // the ledger grew unbounded. The holon tree is the proxy's own concern
  // (its models, its rules, its memory), so it is driven on a cadence even
  // when the watcher is external. Each holon keeps its own single-flight and
  // cadence gate — this interval only offers the tick.
  if (driver.held && (process.env.ER7_EXTERNAL_HEIMDALL ?? "0") === "1") {
    const holonDriverMs = Number(process.env.ER7_HOLON_DRIVER_MS ?? 30000);
    setInterval(() => {
      runHolonTree().catch((err) => log(`holon tree error: ${err.message}`));
      // THE WINDOW EYE IN FLEET MODE (2026-09-21, post-mortem falsification
      // 5.2): refreshOllamaModels fires the window_changed finding — a model
      // reloaded at a different num_ctx than the loaded window — and it only
      // ran inside the in-process watcher, which external mode disables. The
      // traffic-jam detector was therefore OFF on the operator's live box
      // while gemma2:2b was being reloaded 23× at disagreeing windows. Drive
      // the same eye here, on the driver the holon tree already uses.
      refreshOllamaModels().catch((err) => log(`ollama window eye error: ${err.message}`));
      // THE REAPER IN FLEET MODE (2026-09-21): it lived only in the standalone
      // tick, so on the operator's live box it never ran — `reaper.last` null
      // while one model sat loaded twice. Its own cadence, driven here.
      liveReapIfDue();
      // THE SMALL MOUTH, KEPT WARM (2026-09-22): warmSmallMouth ran once at
      // boot only — measured the same day: a declared small mouth (the
      // MoE fast-tier default) was evicted within minutes by real concurrent
      // traffic on the shared box (other callers' models filling
      // OLLAMA_MAX_LOADED_MODELS), and nothing re-warmed it until asked by
      // hand. Its own internal memory-pressure check (warmPressureTest)
      // already refuses to warm into a pressured box, so driving it here on
      // the same cadence is the residency holon's own rule, applied to the
      // one model that is never a real turn's own hotModelSet entry.
      warmSmallMouth().then((w) => { if (w.warmed) log(`small mouth re-warmed: ${w.model}`); }).catch((err) => log(`small mouth warm error: ${err.message}`));
      sweepRevisions().catch((err) => log(`revision sweep error: ${err.message}`));
    }, holonDriverMs).unref();
    log(`holon driver: external heimdall — holon tree + window eye driven locally every ${holonDriverMs}ms`);
  }
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
    // The WARM-specific pressure test judges on AVAILABLE memory (free +
    // reclaimable inactive), never "truly free" — chronically ~50MB on macOS
    // because the OS keeps everything in cache, so a free-based gate here would
    // latch the keep-warm off forever and let the held model drop (measured:
    // 132 reloads while the box sat idle). Churn still stands a warm down.
    const pressuredNow = () => warmPressureTest(readVitals?.() ?? null);
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

// Shutdown must actually terminate — the zombie-proxy lesson (2026-09-20).
// `server.close(cb)` stops accepting but WAITS for every existing connection
// to end, and a watch tab's SSE /heimdall/live connection never closes on its
// own, so the old process lingered forever with no listening socket but its
// full ~430MB footprint, one per restart, pushing an already swap-starved box
// deeper into the pressure that was causing the restarts. Close the servers,
// drop the long-lived SSE connections so the close callback can fire, and a
// hard deadline exits whatever still holds the loop.
// DRAIN FIRST (2026-09-21): a SIGTERM mid-turn used to closeAllConnections
// immediately — a /v1/code loop in flight (measured: the code door) was cut
// dead by the re-forge, the caller saw UND_ERR_SOCKET and the box looked
// broken. In-flight turns get a bounded drain window to finish; only the
// long-lived SSE watch streams are closed at once (they never finish on
// their own). A turn that is still running at the deadline is still cut, but
// a turn given a real chance to complete is no longer collateral.
const SHUTDOWN_DRAIN_MS = Number(process.env.ER7_SHUTDOWN_DRAIN_MS ?? 30000);
function shutdown(sig) {
  log(`shutting down (${sig})`);
  releaseDriverLock();
  server.close(() => process.exit(0));
  aliasServer.close();
  for (const s of channelServers) { try { s.close(); } catch { /* already closed */ } }
  const inflight = getSurfaces().find((s) => s.name === "er7")?.inflight ?? 0;
  if (inflight > 0) {
    log(`shutdown: ${inflight} turn(s) in flight — draining up to ${Math.round(SHUTDOWN_DRAIN_MS / 1000)}s before the hard close`);
    const t0 = Date.now();
    const drain = setInterval(() => {
      const nowInflight = getSurfaces().find((s) => s.name === "er7")?.inflight ?? 0;
      if (nowInflight <= 0 || Date.now() - t0 > SHUTDOWN_DRAIN_MS) {
        clearInterval(drain);
        try { server.closeAllConnections(); } catch {}
        try { aliasServer.closeAllConnections(); } catch {}
        setTimeout(() => process.exit(0), 200).unref();
      }
    }, 250);
    return;
  }
  try { server.closeAllConnections(); } catch {}
  try { aliasServer.closeAllConnections(); } catch {}
  setTimeout(() => process.exit(0), 1500).unref();
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));