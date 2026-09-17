// Real HTTP round-trips against a small stand-in server on a test-only
// port (no mocking library) — checks the wire shapes proxy-client.mjs
// actually sends/parses against proxy.mjs's real routes (GET /v1/models,
// POST /v1/chat/completions, GET /health), per proxy-api.mjs's own shapes.
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

process.env.ER7_PROXY_PORT = "18463";
process.env.ER7_QUEUE_MAX_WAIT = "1200"; // tiny retry budget for the give-up test (the real gate is TIME now, not an attempt count) // unlikely to collide with a real proxy
// Dynamic import: must run AFTER the env var above is set, since
// er7-proxy.mjs reads ER7_PROXY_PORT once at module-evaluation time.
const { listModels, chatCompletion, withPrefix, stripPrefix, CHAT_MAX_RETRIES } = await import("../proxy-client.mjs");

let server;
let lastRequest = null;
// When set, the next N chat-completion requests get heimdall's own 429
// shape (admitChat's real body: { error: { message, type, retry_after } })
// before the server answers normally — exercises the real retry loop
// against the real wire shape, not a hand-picked stub.
let busyForNCalls = 0;
let busyType = "lane_full";
// A one-shot override for a single non-retryable response, checked before
// the busy-loop shape above — avoids tearing down/rebuilding the server
// mid-file (undici's connection pool reused a socket into the old server
// instance and produced a flaky ECONNRESET when this test did that).
let forceOnce = null;

function startFakeProxy() {
  server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      lastRequest = { url: req.url, method: req.method, body: body ? JSON.parse(body) : null, headers: req.headers };
      if (req.url === "/health") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
      } else if (req.url === "/v1/models") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ object: "list", data: [{ id: "er7:gemma2:2b", object: "model" }, { id: "er7:llama3.2:latest", object: "model" }] }));
      } else if (req.url === "/v1/chat/completions" && req.method === "POST") {
        if (forceOnce) {
          const { status, body: b } = forceOnce;
          forceOnce = null;
          res.writeHead(status, { "content-type": "application/json" });
          res.end(JSON.stringify(b));
          return;
        }
        if (busyForNCalls > 0) {
          busyForNCalls -= 1;
          res.writeHead(429, { "content-type": "application/json", "retry-after": "0" }); // 0s: keep the test fast, real value is heimdall's RETRY_AFTER_S
          res.end(JSON.stringify({ error: { message: `family er7 busy — retry after 0s`, type: busyType, retry_after: 0 } }));
          return;
        }
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ choices: [{ message: { role: "assistant", content: "a grounded answer" } }], reading: { relationEdges: 3 } }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });
  });
  return new Promise((resolve) => server.listen(18463, "127.0.0.1", resolve));
}

test.before(startFakeProxy);
test.after(() => new Promise((resolve) => server.close(resolve)));

test("withPrefix/stripPrefix round-trip", () => {
  assert.equal(withPrefix("gemma2:2b"), "er7:gemma2:2b");
  assert.equal(withPrefix("er7:gemma2:2b"), "er7:gemma2:2b");
  assert.equal(stripPrefix("er7:gemma2:2b"), "gemma2:2b");
  assert.equal(stripPrefix("gemma2:2b"), "gemma2:2b");
});

test("listModels parses the real GET /v1/models shape", async () => {
  const models = await listModels();
  assert.deepEqual(models, ["er7:gemma2:2b", "er7:llama3.2:latest"]);
});

test("chatCompletion posts the right shape and parses the real response shape", async () => {
  const res = await chatCompletion({
    model: "er7:gemma2:2b",
    history: [{ role: "user", content: "earlier" }, { role: "assistant", content: "earlier reply" }],
    task: "what is this",
    sessionId: "sess-1",
    workspace: "/tmp/ws",
  });
  assert.equal(res.text, "a grounded answer");
  assert.equal(res.reading.relationEdges, 3);

  assert.equal(lastRequest.url, "/v1/chat/completions");
  assert.equal(lastRequest.body.model, "er7:gemma2:2b");
  assert.equal(lastRequest.body.stream, false);
  assert.deepEqual(lastRequest.body.messages, [
    { role: "user", content: "earlier" },
    { role: "assistant", content: "earlier reply" },
    { role: "user", content: "what is this" },
  ]);
  assert.equal(lastRequest.headers["x-er7-session"], "sess-1");
  assert.equal(lastRequest.headers["x-er7-workspace"], "/tmp/ws");
});

test("chatCompletion accepts a bare (unprefixed) model id and prefixes it", async () => {
  await chatCompletion({ model: "gemma2:2b", history: [], task: "hi" });
  assert.equal(lastRequest.body.model, "er7:gemma2:2b");
});

test("chatCompletion retries automatically on heimdall's lane_full 429 and succeeds", async () => {
  busyForNCalls = 2;
  busyType = "lane_full";
  const retries = [];
  const res = await chatCompletion({ model: "er7:gemma2:2b", history: [], task: "hey", onRetry: (info) => retries.push(info) });
  assert.equal(res.text, "a grounded answer"); // the request that looked like an error to the caller actually just needed to wait
  assert.equal(retries.length, 2);
  assert.deepEqual(retries.map((r) => r.attempt), [1, 2]);
  assert.equal(retries[0].type, "lane_full");
});

test("chatCompletion retries on saturated the same way as lane_full", async () => {
  busyForNCalls = 1;
  busyType = "saturated";
  const retries = [];
  await chatCompletion({ model: "er7:gemma2:2b", history: [], task: "hey", onRetry: (info) => retries.push(info) });
  assert.equal(retries[0].type, "saturated");
});

test("chatCompletion gives up after CHAT_MAX_RETRIES and surfaces a real error", async () => {
  busyForNCalls = CHAT_MAX_RETRIES + 1; // never actually clears within the retry budget
  await assert.rejects(() => chatCompletion({ model: "er7:gemma2:2b", history: [], task: "hey" }), /busy/);
  busyForNCalls = 0; // don't leak into later tests
});

test("chatCompletion does NOT retry a non-retryable 4xx (a real client error stays a real error)", async () => {
  forceOnce = { status: 400, body: { error: { message: "bad model name", type: "invalid_request" } } };
  let calls = 0;
  await assert.rejects(
    () => chatCompletion({ model: "er7:gemma2:2b", history: [], task: "hey", onRetry: () => { calls += 1; } }),
    /bad model name/,
  );
  assert.equal(calls, 0, "a plain 400 must never trigger the busy-retry loop");
});
