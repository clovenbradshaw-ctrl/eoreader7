#!/usr/bin/env node
// fake-proxy.mjs — hermetic stand-in for the real er7 proxy (proxy.mjs), so
// the TUI e2e suite drives real keystrokes against real Ink renders WITHOUT
// touching the real proxy, real Ollama, or real heimdall admission.
//
// Routes mirrored from proxy-api.mjs/proxy-runner.mjs:
//   GET  /health            -> { status: "ok", upstream, eoreader7 }
//   GET  /v1/models         -> er7-prefixed roster (deterministic, fake)
//   POST /v1/chat/completions -> one-shot grounded answer (rich fixture)
//   POST /v1/agent          -> a small coding round-trip (list/read/write/run)
//
// The answer text is a fixture meant to stress whatever the TUI's content
// renderer does — headers, code fences, lists, long lines (wrap pressure),
// and a UTF-8 codepoint. Overridable via the FIXTURE env var for tests that
// need a different shape.

import http from "node:http";

const PORT = Number(process.env.FIXTURE_PORT ?? process.env.ER7_PROXY_PORT ?? 11993);

const MODELS = [
  { id: "er7:smollm2:1.7b", object: "model" },
  { id: "er7:gemma2:2b", object: "model" },
  { id: "er7:qwen3:30b-a3b", object: "model" },
];

const CHAT_ANSWER = `# How the fold reads

The fold grounds every answer in a **reading record**, never in vibes.

## Two postures

1. Grounded chat — retrieval, checking, citations run server-side.
2. Coding agent — same pipeline, plus a sandboxed \`vm.Context\`.

\`\`\`js
const fold = await readEncounters(encounters, { source });
console.log(fold.relationEdges);
\`\`\`

A long line that should wrap instead of being cut off at the edge of the
terminal and silently lost: this is the pressure test for word-wrap in the
transcript pane. It goes on and on and on and on and on and on until it has
crossed well past one hundred characters of running text so the renderer has
something to actually wrap.

Tail.`;

const AGENT_ROUNDS = [
  { turn: 1, action: "list", files: ["readme.md", "src/main.js"] },
  { turn: 2, action: "read", path: "readme.md", contentChars: 1841 },
  { turn: 3, action: "write", path: "src/main.js", contentChars: 322 },
  { turn: 4, action: "run", output: "3 relations bound, 0 dropped" },
];

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch { resolve({}); }
    });
  });
}

http
  .createServer(async (req, res) => {
    if (process.env.FIXTURE_LOG === "1") {
      process.stderr.write(`[fake-proxy] ${req.method} ${req.url}\n`);
    }
    const send = (status, obj) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(obj));
    };

    if (req.url === "/health") {
      send(200, { status: "ok", upstream: `http://127.0.0.1:${PORT - 2}`, eoreader7: true });
      return;
    }
    if (req.url === "/v1/models") {
      send(200, { object: "list", data: MODELS });
      return;
    }
    if (req.url === "/v1/chat/completions" && req.method === "POST") {
      const body = await readBody(req);
      if (process.env.FIXTURE_429 === "1") {
        send(429, { error: { message: "family er7 busy — retry after 0s", type: "lane_full", retry_after: 0 } });
        return;
      }
      // Streaming clients (stream: true) get the real SSE wire shape —
      // content deltas, then the final envelope chunk carrying reading +
      // model, then [DONE] — so the TUI's live path is exercised, not just
      // the one-shot path. Chunks are small and flushed with a short pause
      // so a test can observe partial text before the tail arrives.
      if (body.stream) {
        const answer = process.env.FIXTURE_ANSWER ?? CHAT_ANSWER;
        const id = `er7-${Date.now()}`;
        const created = Math.floor(Date.now() / 1000);
        res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
        const pieces = answer.match(/[\s\S]{1,24}/g) ?? [answer];
        let first = true;
        for (const piece of pieces) {
          const chunk = {
            id, object: "chat.completion.chunk", created, model: body.model,
            choices: [{ index: 0, delta: first ? { role: "assistant", content: piece } : { content: piece }, finish_reason: null }],
          };
          first = false;
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          await new Promise((r) => setTimeout(r, 15));
        }
        res.write(`data: ${JSON.stringify({
          id, object: "chat.completion.chunk", created, model: body.model,
          choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
          reading: { relationEdges: 3, referentBindings: 7, hyperlexiconCandidates: 2 },
        })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }
      send(200, {
        choices: [{ message: { role: "assistant", content: process.env.FIXTURE_ANSWER ?? CHAT_ANSWER } }],
        reading: { relationEdges: 3, referentBindings: 7, hyperlexiconCandidates: 2 },
        model: body.model,
      });
      return;
    }
    if (req.url === "/v1/agent" && req.method === "POST") {
      send(200, { done: true, answer: "All three files wired, verified, and sandboxed.", rounds: AGENT_ROUNDS, files: ["readme.md", "src/main.js"] });
      return;
    }
    send(404, { error: { message: `no route ${req.method} ${req.url}` } });
  })
  .listen(PORT, "127.0.0.1", () => {
    console.error(`[fake-proxy] listening on ${PORT}`);
  });