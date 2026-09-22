// heimdall-probe.test.mjs — the liveness probe never loads a model
// (2026-09-22). Measured: the idle watchdog's probe asked gemma2:2b every
// 30s whether or not it was loaded, so on a one-model box it evicted the warm
// small mouth, and it cut a resident model's keep-alive to the daemon's
// default. A stub daemon records every request the probe makes.
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let psModels = [];
const seen = [];
const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => { body += c; });
  req.on("end", () => {
    seen.push({ method: req.method, url: req.url, body: body ? JSON.parse(body) : null });
    res.setHeader("content-type", "application/json");
    if (req.url === "/api/tags") return res.end(JSON.stringify({ models: [] }));
    if (req.url === "/api/ps") return res.end(JSON.stringify({ models: psModels }));
    if (req.url === "/api/chat") return res.end(JSON.stringify({ done: true, message: { content: "OK" } }));
    res.statusCode = 404; res.end("{}");
  });
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const _scratch = fs.mkdtempSync(path.join(os.tmpdir(), "er7-probe-test-"));
process.env.ER7_OLLAMA_URL = `http://127.0.0.1:${port}`;
process.env.ER7_HEIMDALL_LOG_FILE = path.join(_scratch, "heimdall-log.jsonl");
process.env.ER7_SETTINGS_FILE = path.join(_scratch, "settings.json");
process.env.ER7_DERIVED_RULES_FILE = path.join(_scratch, "derived-rules.json");
process.env.ER7_TRIALS_FILE = path.join(_scratch, "trials.json");
const h = await import("../heimdall.mjs");

test.after(() => server.close());

test("probe: nothing resident — tags answering is the check, and no chat is sent (a probe never loads a model)", async () => {
  seen.length = 0; psModels = [];
  const p = await h.probeModelServer();
  assert.equal(p.ok, true);
  assert.equal(p.surface, "tags");
  assert.ok(!seen.some((r) => r.url === "/api/chat"), `no generate may be sent: ${JSON.stringify(seen.map((r) => r.url))}`);
});

test("probe: an embedder alone is not a model to probe", async () => {
  seen.length = 0; psModels = [{ name: "nomic-embed-text:latest", size: 3e8, expires_at: new Date(Date.now() + 600_000).toISOString() }];
  const p = await h.probeModelServer();
  assert.equal(p.ok, true);
  assert.ok(!seen.some((r) => r.url === "/api/chat"));
});

test("probe: asks the smallest RESIDENT generative model, carrying its remaining keep-alive", async () => {
  seen.length = 0;
  psModels = [
    { name: "deepseek-v2:16b-lite-chat-q4_0", size: 9e9, expires_at: new Date(Date.now() + 3_000_000).toISOString() },
    { name: "tiny:1b", size: 1e9, expires_at: new Date(Date.now() + 1_200_000).toISOString() },
  ];
  const p = await h.probeModelServer();
  assert.equal(p.ok, true);
  assert.equal(p.surface, "generate");
  const chat = seen.find((r) => r.url === "/api/chat");
  assert.equal(chat.body.model, "tiny:1b", "the probe never names a model the daemon is not holding");
  const s = Number(String(chat.body.keep_alive).replace(/s$/, ""));
  assert.ok(s > 1100 && s <= 1200, `the resident model keeps its own remaining keep-alive, not the daemon default: ${chat.body.keep_alive}`);
});
