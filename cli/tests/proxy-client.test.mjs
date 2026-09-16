// Real HTTP round-trips against a small stand-in server on a test-only
// port (no mocking library) — checks the wire shapes proxy-client.mjs
// actually sends/parses against proxy.mjs's real routes (GET /v1/models,
// POST /v1/chat/completions, GET /health), per proxy-api.mjs's own shapes.
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

process.env.ER7_PROXY_PORT = "18463"; // unlikely to collide with a real proxy
// Dynamic import: must run AFTER the env var above is set, since
// er7-proxy.mjs reads ER7_PROXY_PORT once at module-evaluation time.
const { listModels, chatCompletion, withPrefix, stripPrefix } = await import("../proxy-client.mjs");

let server;
let lastRequest = null;

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
