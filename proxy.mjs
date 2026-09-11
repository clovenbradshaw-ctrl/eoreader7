import http from "node:http";
import { parseProxyRequest, toOpenAIModelList, reprefixOllamaTags, openAIResponse, openAIStreamLines, ollamaChatResponse, ollamaChatStreamLines } from "./proxy-api.mjs";
import { offeredOllamaModels, runProxyTurn } from "./proxy-runner.mjs";

const PORT = Number(process.env.ER7_PROXY_PORT) || 11436;
const UPSTREAM = process.env.ER7_UPSTREAM || "http://localhost:11434";
const { hostname: UP_HOST, port: UP_PORT } = new URL(UPSTREAM);

const ts = () => new Date().toISOString().slice(11, 23);
const log = (msg) => process.stderr.write(`[${ts()}] [er7-proxy] ${msg}\n`);

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

      log(`turn → model=${reqData.model} taskLength=${reqData.task.length} stream=${reqData.stream}`);

      try {
        const result = await runProxyTurn(reqData);
        const created = Math.floor(Date.now() / 1000);
        const id = `er7-${Date.now()}`;

        if (reqData.stream) {
          res.writeHead(200, {
            "content-type": "text/event-stream",
            "cache-control": "no-cache",
            connection: "keep-alive",
          });
          const lines = openAIStreamLines({ id, model: parsed.model, text: result.text, created, reading: result });
          for (const line of lines) res.write(line);
          res.end();
        } else {
          const resp = openAIResponse({ id, model: parsed.model, text: result.text, created, usage: result.usage, reading: result });
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify(resp));
        }
      } catch (err) {
        log(`proxy execution error: ${err.message}`);
        if (!res.headersSent) {
          res.writeHead(500, { "content-type": "application/json" });
        }
        res.end(JSON.stringify({ error: { message: err.message } }));
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

      log(`ollama chat turn → model=${reqData.model} taskLength=${reqData.task.length}`);

      try {
        const result = await runProxyTurn(reqData);
        const createdAt = new Date().toISOString();

        if (reqData.stream) {
          res.writeHead(200, {
            "content-type": "application/x-ndjson",
            "cache-control": "no-cache",
            connection: "keep-alive",
          });
          const lines = ollamaChatStreamLines({ model: parsed.model, text: result.text, createdAt, usage: result.usage, reading: result });
          for (const line of lines) res.write(line);
          res.end();
        } else {
          const resp = ollamaChatResponse({ model: parsed.model, text: result.text, createdAt, usage: result.usage, reading: result });
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify(resp));
        }
      } catch (err) {
        log(`proxy execution error: ${err.message}`);
        if (!res.headersSent) {
          res.writeHead(500, { "content-type": "application/json" });
        }
        res.end(JSON.stringify({ error: { message: err.message } }));
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
});

process.on("SIGINT", () => {
  log("shutting down");
  server.close(() => process.exit(0));
});
process.on("SIGTERM", () => {
  log("shutting down");
  server.close(() => process.exit(0));
});
