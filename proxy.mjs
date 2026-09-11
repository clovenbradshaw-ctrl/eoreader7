import http from "node:http";
import { parseProxyRequest, toOpenAIModelList, reprefixOllamaTags, openAIResponse, openAIStreamLines, ollamaChatResponse, ollamaChatStreamLines, humanizeNote } from "./proxy-api.mjs";
import { offeredOllamaModels, runProxyTurn, keepModelHot, hotModelSet, OLLAMA_KEEP_ALIVE_S } from "./proxy-runner.mjs";
import { warmPostprocess } from "./postprocess.mjs";

const PORT = Number(process.env.ER7_PROXY_PORT) || 11436;
const UPSTREAM = process.env.ER7_UPSTREAM || "http://localhost:11434";
const { hostname: UP_HOST, port: UP_PORT } = new URL(UPSTREAM);
const KEEP_WARM_INTERVAL_MS = Number(process.env.ER7_KEEP_WARM_INTERVAL_MS ?? 120000);

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

const server = http.createServer(async (req, res) => {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "*");
  res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", upstream: UPSTREAM, eoreader7: true }));
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

      const sessionId = sessionIdFromHeaders(req);
      const workspace = workspaceFromHeaders(req);
      log(`turn → session=${sessionId} model=${reqData.model} taskLength=${reqData.task.length} stream=${reqData.stream} workspace=${workspace ? `"${workspace}"` : "none"}`);

      const created = Math.floor(Date.now() / 1000);
      const id = `er7-${Date.now()}`;

      if (reqData.stream) {
        res.writeHead(200, {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
          "x-er7-session": sessionId,
        });

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

        try {
          const result = await runProxyTurn({ sessionId, workspace, ...reqData }, emit, onNote, onThinking);
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
          log(`proxy execution error: ${err.message}`);
          const errChunk = { id, object: "chat.completion.chunk", created, model: parsed.model, choices: [{ index: 0, delta: { content: `\n[EOReader7 error: ${err.message}]` }, finish_reason: "stop" }] };
          res.write(`data: ${JSON.stringify(errChunk)}\n\n`);
          res.write("data: [DONE]\n\n");
          res.end();
        }
      } else {
        try {
          const result = await runProxyTurn({ sessionId, workspace, ...reqData });
          const resp = openAIResponse({ id, model: parsed.model, text: result.text, created, usage: result.usage, reading: result });
          resp.reading.sessionId = sessionId;
          resp.reading.thinking = result.thinking ?? null;
          resp.reading.answerShape = result.answerShape ?? null;
          resp.reading.truncated = result.truncated ?? false;
          resp.reading.document = result.document ?? null;
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify(resp));
        } catch (err) {
          log(`proxy execution error: ${err.message}`);
          if (!res.headersSent) {
            res.writeHead(500, { "content-type": "application/json" });
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

      const sessionId = sessionIdFromHeaders(req);
      const workspace = workspaceFromHeaders(req);
      log(`ollama chat turn → session=${sessionId} model=${reqData.model} taskLength=${reqData.task.length} workspace=${workspace ? `"${workspace}"` : "none"}`);

      const createdAt = new Date().toISOString();

      if (reqData.stream) {
        res.writeHead(200, {
          "content-type": "application/x-ndjson",
          "cache-control": "no-cache",
          connection: "keep-alive",
          "x-er7-session": sessionId,
        });

        try {
          let first = true;
          await runProxyTurn({ sessionId, workspace, ...reqData }, (token) => {
            if (!token) return;
            res.write(JSON.stringify({
              model: parsed.model, created_at: createdAt,
              message: { role: "assistant", content: token },
              done: false,
            }) + "\n");
            first = false;
          });
          res.write(JSON.stringify({
            model: parsed.model, created_at: createdAt,
            message: { role: "assistant", content: "" },
            done: true, done_reason: "stop",
          }) + "\n");
          res.end();
        } catch (err) {
          log(`proxy execution error: ${err.message}`);
          res.write(JSON.stringify({
            model: parsed.model, created_at: createdAt,
            message: { role: "assistant", content: `[EOReader7 error: ${err.message}]` },
            done: true, done_reason: "error",
          }) + "\n");
          res.end();
        }
      } else {
        try {
          const result = await runProxyTurn({ sessionId, workspace, ...reqData });
          const resp = ollamaChatResponse({ model: parsed.model, text: result.text, createdAt, usage: result.usage, reading: result });
          resp.reading = { ...(result.reading ?? result), sessionId };
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify(resp));
        } catch (err) {
          log(`proxy execution error: ${err.message}`);
          if (!res.headersSent) {
            res.writeHead(500, { "content-type": "application/json" });
          }
          res.end(JSON.stringify({ error: { message: err.message } }));
        }
      }
    });
    return;
  }

  forward(req, res);
});

server.listen(PORT, "127.0.0.1", () => {
  log(`eoreader7 proxy listening on http://127.0.0.1:${PORT}`);
  log(`upstream: ${UPSTREAM}`);
  log(`opencode → http://127.0.0.1:${PORT}/v1`);
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
});
process.on("SIGTERM", () => {
  log("shutting down");
  server.close(() => process.exit(0));
});