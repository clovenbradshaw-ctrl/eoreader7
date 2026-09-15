#!/usr/bin/env node
// er7-client.mjs — thin HTTP client for the EOReader7 proxy.
//
// eoreader7 is NOT a browser app: it exposes a real HTTP API (proxy.mjs,
// port 11436, upstream Ollama). No Playwright needed here — plain fetch.
//
// Library:
//   import { ask, chat, documents, models, health } from "./er7-client.mjs";
//   const r = await ask("what river is Nashville on?", { model: "gemma2:2b" });
//   console.log(r.answer);
//
// CLI:
//   node er7-client.mjs health
//   node er7-client.mjs models
//   node er7-client.mjs ask "question" [--model NAME] [--mode auto|chat|long|projection]
//        [--session ID] [--workspace PATH] [--history "user: hi" "assistant: hello"]
//   node er7-client.mjs chat --model er7:gemma2:2b --message "hi" [--stream]
//   node er7-client.mjs documents --task "essay prompt" [--model NAME] [--poll] [--wait-ms 3000]
//
// Env: ER7_URL (default http://localhost:11436).

const ER7_URL = (process.env.ER7_URL || "http://localhost:11436").replace(/\/+$/, "");

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`${ER7_URL}${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const err = new Error(`er7 ${method} ${path}: ${res.status} ${(json?.error?.message) || (typeof json?.error === "string" ? json.error : text.slice(0, 300)) || res.statusText}`);
    err.status = res.status;
    err.json = json;
    err.headers = res.headers;
    throw err;
  }
  return { status: res.status, headers: res.headers, json };
}

export async function health() {
  return (await request("/health")).json;
}

export async function models() {
  const { json } = await request("/v1/models");
  return json?.data ?? [];
}

export async function ask(task, { model = "olmo2:7b", mode, sessionId, workspace, chatHistory } = {}) {
  const { json } = await request("/v1/ask", {
    method: "POST",
    body: { task, model, mode, sessionId, workspace, chatHistory },
  });
  return json;
}

export async function chat({ model, messages, stream = false, discloseThinking, kelsen, mode, signal } = {}) {
  if (!model) throw new Error("chat() requires model (er7:<real-ollama-model>)");
  const { json } = await request("/v1/chat/completions", {
    method: "POST",
    body: { model, messages, stream, discloseThinking, kelsen, mode },
  });
  return json;
}

export async function chatStream({ model, messages, discloseThinking, kelsen, mode, onChunk, signal }) {
  if (!model) throw new Error("chatStream() requires model (er7:<real-ollama-model>)");
  const res = await fetch(`${ER7_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true, discloseThinking, kelsen, mode }),
    signal,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`er7 stream: ${res.status} ${text.slice(0, 300)}`);
  }
  let full = "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop();
    for (const line of lines) {
      const data = line.startsWith("data:") ? line.slice(5).trim() : null;
      if (!data || data === "[DONE]") continue;
      try {
        const chunk = JSON.parse(data);
        const delta = chunk.choices?.[0]?.delta?.content ?? "";
        if (delta) {
          full += delta;
          onChunk?.(delta, chunk);
        }
      } catch {
        // ignore malformed keep-alive lines
      }
    }
  }
  return full;
}

export async function documents({ task, model = "olmo2:7b", workspace, sessionId, holonLevel, poll = false, waitMs = 3000, maxTries = 200 } = {}) {
  const { json: job } = await request("/v1/documents", {
    method: "POST",
    body: { task, model, workspace, sessionId, holonLevel },
  });
  if (!poll) return job;
  const docId = job.jobId ?? job.sessionId;
  for (let i = 0; i < maxTries; i++) {
    const { json } = await request(`/v1/documents/${encodeURIComponent(docId)}`);
    if (json.status === "complete" || json.status === "failed" || json.status === "error") return json;
    await new Promise((r) => setTimeout(r, waitMs));
  }
  return { status: "timeout", job };
}

function usage() {
  console.error(
    [
      "usage: node er7-client.mjs health",
      "       node er7-client.mjs models",
      "       node er7-client.mjs ask <question> [--model NAME] [--mode auto|chat|long|projection] [--session ID] [--workspace PATH]",
      "       node er7-client.mjs chat --model er7:<model> --message <text> [--stream] [--mode auto|chat|long|projection]",
      "       node er7-client.mjs documents --task <prompt> [--model NAME] [--poll]",
    ].join("\n")
  );
}

async function main() {
  const argv = process.argv.slice(2);
  const [cmd, ...rest] = argv;
  const opts = {};
  const positional = [];
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = rest[i + 1];
      if (val === undefined || val.startsWith("--")) {
        opts[key] = true;
      } else {
        opts[key] = val;
        i++;
      }
    } else {
      positional.push(a);
    }
  }

  switch (cmd) {
    case "health": {
      const h = await health();
      console.log(JSON.stringify(h, null, 2));
      break;
    }
    case "models": {
      const m = await models();
      for (const x of m) console.log(x.id);
      break;
    }
    case "ask": {
      const task = opts.task ?? positional.join(" ");
      if (!task) return usage();
      const r = await ask(task, {
        model: opts.model,
        mode: opts.mode,
        sessionId: opts.session,
        workspace: opts.workspace,
      });
      console.log(r.answer ?? JSON.stringify(r, null, 2));
      break;
    }
    case "chat": {
      if (!opts.model || !opts.message) return usage();
      const messages = [{ role: "user", content: opts.message }];
      if (opts.stream) {
        let printed = false;
        const text = await chatStream({ model: opts.model, messages, mode: opts.mode, onChunk: () => { if (!printed) { printed = true; } } });
        console.log(text);
      } else {
        const r = await chat({ model: opts.model, messages, mode: opts.mode });
        console.log(r.choices?.[0]?.message?.content ?? JSON.stringify(r, null, 2));
      }
      break;
    }
    case "documents": {
      if (!opts.task) return usage();
      const r = await documents({
        task: opts.task,
        model: opts.model,
        poll: opts.poll === true || opts.poll === "true",
      });
      if (r.projection) {
        console.log(`status: ${r.status}`);
        console.log(r.projection);
      } else {
        console.log(JSON.stringify(r, null, 2));
      }
      break;
    }
    default:
      return usage();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(`er7: ${e.message}`);
    process.exit(1);
  });
}