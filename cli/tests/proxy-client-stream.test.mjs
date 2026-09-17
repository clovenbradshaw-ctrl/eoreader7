// proxy-client-stream.test.mjs — the live path: chatCompletion with
// onToken sends stream:true and paints SSE content deltas incrementally,
// routes reasoning_content to onThinking, retries heimdall's 429 BEFORE
// the stream opens, and resolves the same { text, reading, model } shape
// as the one-shot path. Real HTTP round-trips against a small stand-in
// SSE server on a test-only port (no mocking library).
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

process.env.ER7_PROXY_PORT = "18472";
process.env.ER7_QUEUE_MAX_WAIT = "8000";
// Dynamic import: must run AFTER the env vars above are set, since
// er7-proxy.mjs reads ER7_PROXY_PORT once at module-evaluation time.
const { chatCompletion } = await import("../proxy-client.mjs");

let server;
let lastRequest = null;
// First chat POST gets heimdall's retryable 429; the retry gets the SSE.
let calls = 0;
// A one-shot override for a single non-retryable response, checked before
// anything else — same pattern as proxy-client.test.mjs's forceOnce.
let forceOnce = null;

function startSseProxy() {
  server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      lastRequest = { url: req.url, method: req.method, body: body ? JSON.parse(body) : null };
      if (req.url === "/v1/chat/completions" && req.method === "POST") {
        if (forceOnce) {
          const { status, body: b } = forceOnce;
          forceOnce = null;
          res.writeHead(status, { "content-type": "application/json" });
          res.end(JSON.stringify(b));
          return;
        }
        calls += 1;
        if (calls === 1) {
          res.writeHead(429, { "content-type": "application/json", "retry-after": "0" });
          res.end(JSON.stringify({ error: { message: "family er7 busy — retry after 0s", type: "lane_full", retry_after: 0 } }));
          return;
        }
        const parsed = lastRequest.body;
        res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
        const id = "er7-test";
        const created = Math.floor(Date.now() / 1000);
        const chunks = [
          { id, object: "chat.completion.chunk", created, model: parsed.model, choices: [{ index: 0, delta: { role: "assistant", content: "Hello " }, finish_reason: null }] },
          { id, object: "chat.completion.chunk", created, model: parsed.model, choices: [{ index: 0, delta: { reasoning_content: "a pipeline note\n" }, finish_reason: null }] },
          { id, object: "chat.completion.chunk", created, model: parsed.model, choices: [{ index: 0, delta: { content: "world" }, finish_reason: null }] },
          { id, object: "chat.completion.chunk", created, model: parsed.model, choices: [{ index: 0, delta: {}, finish_reason: "stop" }], reading: { relationEdges: 3 } },
        ];
        (async () => {
          for (const c of chunks) {
            res.write(`data: ${JSON.stringify(c)}\n\n`);
            await new Promise((r) => setTimeout(r, 20));
          }
          res.write("data: [DONE]\n\n");
          res.end();
        })();
        return;
      }
      res.writeHead(404);
      res.end();
    });
  });
  return new Promise((resolve) => server.listen(18472, "127.0.0.1", resolve));
}

test.before(startSseProxy);
test.after(() => new Promise((resolve) => server.close(resolve)));

test("chatCompletion with onToken streams deltas live and resolves the full envelope", async () => {
  const deltas = [];
  const notes = [];
  const retries = [];
  const t0 = Date.now();
  const res = await chatCompletion({
    model: "gemma2:2b",
    history: [],
    task: "hi",
    onToken: (d) => deltas.push({ d, at: Date.now() - t0 }),
    onThinking: (t) => notes.push(t),
    onRetry: (r) => retries.push(r),
  });
  assert.equal(res.text, "Hello world");
  assert.equal(res.model, "er7:gemma2:2b");
  assert.equal(res.reading.relationEdges, 3);
  assert.equal(lastRequest.body.stream, true);
  assert.equal(lastRequest.body.model, "er7:gemma2:2b");
  assert.deepEqual(deltas.map((x) => x.d), ["Hello ", "world"]);
  assert.ok(deltas[1].at - deltas[0].at >= 15, "deltas arrive incrementally, not batched at DONE");
  assert.deepEqual(notes, ["a pipeline note\n"]);
  assert.equal(retries.length, 1);
  assert.equal(retries[0].type, "lane_full");
});

test("chatCompletion stream does NOT retry a non-retryable 4xx", async () => {
  forceOnce = { status: 400, body: { error: { message: "bad model name", type: "invalid_request" } } };
  let tokens = 0;
  await assert.rejects(
    () => chatCompletion({ model: "gemma2:2b", history: [], task: "hey", onToken: () => { tokens += 1; } }),
    /bad model name/,
  );
  assert.equal(tokens, 0, "no deltas before the error");
});
