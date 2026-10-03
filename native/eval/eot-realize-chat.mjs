#!/usr/bin/env node
// eval/eot-realize-chat.mjs — SPIN THE REALIZER UP IN THE BROWSER AS A CHATBOT.
// A tiny node:http door (builtins only):
//   GET  /            the chat page (eot-realize-chat.html)
//   GET  /registers   the registers + their measured reach
//   POST /chat        { prompt, register } -> the reasoned turn
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { englishGrammar, admit, listRegisters } from "./eot-realize-memory.mjs";
import { reply } from "./eot-realize-reply.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const HTML = path.join(HERE, "eot-realize-chat.html");
const REACH = path.join(ROOT, "native", "eval", "results", "eot-realize-memory-all.json");

const arg = (flag, fb) => { const i = process.argv.indexOf(flag); return i > 0 ? process.argv[i + 1] : fb; };
const PORT = Number(arg("--port", process.env.ER7_CHAT_PORT ?? 8827));
let N = Number(arg("--n", 400));
let DEF_REG = arg("--register", "literature-books");

const reach = fs.existsSync(REACH) ? JSON.parse(fs.readFileSync(REACH, "utf8")).runs ?? null : null;
const memories = new Map();
const threads = new Map();

function memory(register) {
  if (!memories.has(register)) {
    const { model } = englishGrammar();
    memories.set(register, admit(register, { n: N, model }));
    console.log(`[chat] admitted ${register}: ${memories.get(register).passages.length} passages`);
  }
  return memories.get(register);
}

function registersPayload() {
  return {
    default: DEF_REG, n: N,
    registers: listRegisters().map((r) => {
      const loaded = memories.has(r.name) ? { sentences: memories.get(r.name).passages.length, addressed: memories.get(r.name).store.size } : null;
      const measured = reach?.find((x) => x.register === r.name)?.agg ?? null;
      return { ...r, loaded, measured };
    }),
  };
}

const send = (res, code, body, type = "application/json") => { res.writeHead(code, { "content-type": type, "cache-control": "no-store" }); res.end(body); };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
  if (req.method === "GET" && url.pathname === "/") { if (!fs.existsSync(HTML)) return send(res, 500, `no chat page at ${HTML}`); return send(res, 200, fs.readFileSync(HTML), "text/html; charset=utf-8"); }
  if (req.method === "GET" && url.pathname === "/registers") return send(res, 200, JSON.stringify(registersPayload()));
  if (req.method === "POST" && url.pathname === "/chat") {
    let body = "";
    for await (const chunk of req) body += chunk;
    let payload = {};
    try { payload = JSON.parse(body || "{}"); } catch { return send(res, 400, JSON.stringify({ error: "bad json" })); }
    const register = payload.register ?? DEF_REG;
    const prompt = String(payload.prompt ?? "").trim();
    if (!prompt) return send(res, 400, JSON.stringify({ error: "empty prompt" }));
    try {
      const { forms, params } = englishGrammar();
      const { store, field, index, referents } = memory(register);
      const last = threads.get(register) ?? null;
      const loaded = memories.get(register) ? { sentences: memories.get(register).passages.length, addressed: memories.get(register).store.size } : null;
      const state = { register, loaded, registers: listRegisters().map((r) => ({ name: r.name, note: r.note })), last: last ? { kind: last.void?.kind ?? null, referent: last.voidReferent?.name ?? null } : null };
      const t0 = Date.now();
      const row = reply({ store, index, field, referents, forms, params, prompt, last, state });
      threads.set(register, row.thread ?? { void: row.void, answer: row.answer ?? row.reply ?? row.finding });
      return send(res, 200, JSON.stringify({ ...row, register, ms: Date.now() - t0, registers: registersPayload() }));
    } catch (e) {
      console.error(`[chat] turn failed on ${register}:`, e);
      return send(res, 200, JSON.stringify({ void: { kind: "error" }, lens: "—", reply: null, finding: `the turn failed before it could answer: ${String(e?.message ?? e).slice(0, 200)}`, registers: registersPayload() }));
    }
  }
  return send(res, 404, JSON.stringify({ error: `no ${url.pathname}` }));
});

export function startChatServer({ port = PORT, n = N, register = DEF_REG } = {}) {
  N = n; DEF_REG = register;
  server.listen(port, () => { const addr = server.address(); console.log(`EOT ⇄ NL — the realizer, as a chatbot\n  http://localhost:${addr?.port ?? port}   (register: ${register}, ${n} passages per register)\n  reverse leg: no model. forward leg: the English parser, disclosed.`); });
  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) startChatServer();
