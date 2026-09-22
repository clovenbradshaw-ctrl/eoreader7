#!/usr/bin/env node
// expertise-surface.mjs — A SURFACE TO STEER POLANYI (2026-09-22).
//
// The user: "build a surface where we can chat to steer him at a topic to
// develop competency on and lets have the GH login there, and theres a chat
// interface to steer and give links and feedback. the hero content is what
// it's processing, seeing it absorb it in real time, and the right panel is
// the append only log of learning, and we can have the hero content also be
// a fold of that log … we want the chatting to be eoreader7-based fully, so
// we need the pipeline to work without a frontier model … and it saves into
// our gh as live priors but other could be saving to their system."
//
// EVERY PIECE REUSED, NOTHING RE-INVENTED:
//   the chat        streamOllamaChat (proxy-runner.mjs) — the SAME gated
//                    local-model wire the whole pipeline uses. No Claude,
//                    no frontier model, ever, in this file. The model is
//                    only ever the mouth (conversation, questions back); it
//                    never decides which URL to fetch — that is read
//                    mechanically off the person's own pasted text (a URL
//                    regex), the same discipline surf.js/hunt.js already
//                    hold everywhere else in this session's work.
//   the absorbing   surf.js's liveWeb() fetch, medium.js's segmentCollection
//                    / elementsOf — the SAME readers the whole shape study
//                    ran on. Each instance's text is broadcast as it is read.
//   the learning    paradigm.js learnParadigmEmergent + form-prior.js
//                    learnForm — this session's own two organs, unchanged.
//   the log         the-fold/expertise.js — Polanyi's own ledger
//                    (provisional → corroborated → confirmed, every entry's
//                    source named), unchanged.
//   the save        a real `git` push of native/memory/expertise-store.json
//                    (+ a copy of the session's ledger) to a NEW BRANCH of
//                    the live_priors repo (a sibling checkout — the SAME
//                    repo other Claude sessions already push priors
//                    branches to, per this project's own convention), named
//                    after the logged-in GitHub account — so a different
//                    person's surface pushes to THEIR OWN branch, and
//                    nothing here ever pushes to `main` or force-pushes.
//
// GITHUB LOGIN is the OAuth DEVICE FLOW (no redirect URI, no client secret
// needed client-side — appropriate for a local tool): GITHUB_CLIENT_ID must
// be set in the environment, or the surface says so plainly and the push
// button stays disabled. No session is ever faked.
//
//   GITHUB_CLIENT_ID=... node native/the-fold/surface/expertise-surface.mjs [--port 8823]
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { streamOllamaChat } from "../../../proxy-runner.mjs";
import { declareVoidSpec } from "../void-spec.js";
import { surfQueries, liveWeb } from "../surf.js";
import { segmentCollection, elementsOf } from "../medium.js";
import { learnParadigmEmergent } from "../paradigm.js";
import { learnForm } from "../form-prior.js";
import { loadExpertise, saveExpertise, recordExpertise, projectExpertise, knownForms, expertiseLines } from "../expertise.js";

const execFileP = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..", "..", "..");
const LIVE_PRIORS = path.join(ROOT, "..", "live_priors");
const MODEL = process.env.EXPERTISE_MODEL ?? "gemma2:2b";
const PORT = Number((process.argv.includes("--port") ? process.argv[process.argv.indexOf("--port") + 1] : null) ?? process.env.EXPERTISE_SURFACE_PORT ?? 8823);
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID ?? null;

// ── broadcast (the SAME shape proxy.mjs's /heimdall/live already runs) ─────
const clients = new Set();
function broadcast(event, data) {
  const chunk = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) { try { res.write(chunk); } catch { clients.delete(res); } }
}

// ── sessions: an in-memory cookie → github identity (never persisted, never faked) ──
const sessions = new Map();
function sessionOf(req) {
  const cookie = String(req.headers.cookie ?? "").match(/es_sid=([a-f0-9]+)/)?.[1];
  return cookie ? sessions.get(cookie) ?? null : null;
}

// ── the local-model chat (Polanyi's own voice, gated, never a frontier model) ──
const SYSTEM = `You are Polanyi, this engine's archon of expertise: you learn a FORM (a poem, a document type, a musical tune, anything with a recurring shape) by reading real examples of it and measuring what recurs against a comparison group — never by being told the shape. A person is steering you at a topic. Speak plainly and briefly: confirm what topic you understood, ask for real example sources if none were given yet (links, or a name of a place to find them), and report what you found in the examples you were just given — the name and count of what recurred, never inventing a claim you did not measure. You never decide which links to fetch yourself; the person's own pasted links are what you read.`;

async function* chatReply(history, message) {
  const messages = [{ role: "system", content: SYSTEM }, ...history, { role: "user", content: message }];
  for await (const chunk of streamOllamaChat(MODEL, messages, { maxTokens: 220 })) if (typeof chunk === "string") yield chunk;
}

const URL_RE = /\bhttps?:\/\/[^\s)>\]"']+/g;

// ── the learning pass, broadcasting every step ──────────────────────────────
async function runLearningPass({ topic, sourceUrls, populationUrls, source }) {
  broadcast("status", { phase: "surf", topic });
  const web = liveWeb();
  const read = async (urls, hunt) => {
    const out = [];
    for (const url of urls) {
      broadcast("absorb", { url, hunt, phase: "fetching" });
      let page;
      try { page = await web.fetch(url); } catch (e) { broadcast("absorb", { url, hunt, phase: "failed", error: String(e?.message ?? e).slice(0, 200) }); continue; }
      broadcast("absorb", { url, hunt, phase: "read", chars: page.text.length, title: page.title, excerpt: page.text.slice(0, 1200) });
      out.push({ url, text: page.text });
    }
    return out;
  };
  const corpusPages = await read(sourceUrls, "instances");
  const popPages = await read(populationUrls, "population");
  const toUnits = (pages) => pages.flatMap(({ url, text }) => {
    const seg = segmentCollection(text);
    return seg.units.length > 1 ? seg.units.map((u) => ({ ...u, id: `${url}#${u.id}` })) : [{ id: url, elements: elementsOf(text).elements }];
  }).filter((u) => u.elements.length >= 2);
  const instances = toUnits(corpusPages), population = toUnits(popPages);
  broadcast("status", { phase: "learning", topic, instances: instances.length, population: population.length });
  if (instances.length < 5 || population.length < 5) {
    broadcast("status", { phase: "refused", reason: instances.length < 5 ? "under_powered" : "no_null", instances: instances.length, population: population.length });
    return { refused: true };
  }
  const paradigm = learnParadigmEmergent({ name: topic, instances, population });
  if (paradigm.refused) { broadcast("status", { phase: "refused", reason: paradigm.refused, basis: paradigm.basis }); return { refused: true }; }
  const formPrior = learnForm(instances, { slots: "emergent" });
  const ex = loadExpertise();
  const before = projectExpertise(ex, topic);
  const r = recordExpertise(ex, { name: topic, paradigm, formPrior, source: source || sourceUrls.join(","), note: `${instances.length} instance(s) via the surface` });
  saveExpertise(ex);
  broadcast("ledger", { topic, revision: (before?.revision ?? 0) + 1, status: r.status, corroboration: r.corroboration, confirmed: r.confirmed, lines: expertiseLines(ex, topic) });
  broadcast("status", { phase: "done", topic, status: r.status, corroboration: r.corroboration, confirmed: r.confirmed });
  return { ok: true, status: r.status, corroboration: r.corroboration, confirmed: r.confirmed, lines: expertiseLines(ex, topic) };
}

// ── GitHub device flow (no secret; a session is only ever real) ────────────
async function ghFetch(url, opts) { const r = await fetch(url, { ...opts, headers: { accept: "application/json", ...opts?.headers } }); return r.json(); }

// ── the push: a real, mechanical git push to the person's OWN branch ───────
async function pushToLivePriors(identity) {
  if (!fs.existsSync(LIVE_PRIORS)) return { ok: false, error: `no live_priors checkout at ${LIVE_PRIORS}` };
  const branch = `claude/expertise-${identity.login}-${new Date().toISOString().slice(0, 10)}`;
  const destDir = path.join(LIVE_PRIORS, "derived-priors", "expertise-priors");
  const git = (args, cwd = LIVE_PRIORS) => execFileP("git", args, { cwd });
  await git(["fetch", "origin", "main"]);
  await git(["checkout", "-B", branch, "origin/main"]);
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(path.join(ROOT, "native", "memory", "expertise-store.json"), path.join(destDir, `expertise-store.${identity.login}.json`));
  const docPath = path.join(ROOT, "documents", "expertise:1.jsonl");
  if (fs.existsSync(docPath)) fs.copyFileSync(docPath, path.join(destDir, `expertise-ledger.${identity.login}.jsonl`));
  await git(["add", "--", `derived-priors/expertise-priors/expertise-store.${identity.login}.json`, `derived-priors/expertise-priors/expertise-ledger.${identity.login}.jsonl`]);
  const status = await git(["status", "--porcelain", "--", "derived-priors/expertise-priors"]);
  if (!status.stdout.trim()) { await git(["checkout", "main"]); return { ok: false, error: "nothing to push — no expertise recorded yet" }; }
  await git(["-c", `user.name=${identity.name || identity.login}`, "-c", `user.email=${identity.login}@users.noreply.github.com`, "commit", "-m", `expertise: ${identity.login}'s learned forms, ${new Date().toISOString()}`]);
  const remote = `https://x-access-token:${identity.token}@github.com/clovenbradshaw-ctrl/live_priors.git`;
  await git(["push", remote, `${branch}:${branch}`]);
  await git(["checkout", "main"]);
  return { ok: true, branch };
}

// ── HTTP ─────────────────────────────────────────────────────────────────
const PAGE = fs.readFileSync(path.join(HERE, "expertise-surface.html"), "utf8");
function readBody(req) { return new Promise((resolve) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => resolve(b)); }); }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (req.method === "GET" && url.pathname === "/") { res.writeHead(200, { "content-type": "text/html" }); res.end(PAGE); return; }

    if (req.method === "GET" && url.pathname === "/events") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive", "access-control-allow-origin": "*" });
      const ex = loadExpertise();
      res.write(`event: hello\ndata: ${JSON.stringify({ forms: knownForms(ex).map((n) => ({ name: n, ...projectExpertise(ex, n) })), model: MODEL, github: !!GITHUB_CLIENT_ID })}\n\n`);
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }

    if (req.method === "POST" && url.pathname === "/chat") {
      const { history = [], message = "" } = JSON.parse((await readBody(req)) || "{}");
      const links = [...new Set([...String(message).matchAll(URL_RE)].map((m) => m[0]))];
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store" });
      for await (const tok of chatReply(history, message)) res.write(`event: token\ndata: ${JSON.stringify(tok)}\n\n`);
      res.write(`event: links\ndata: ${JSON.stringify(links)}\n\n`);
      res.write("event: done\ndata: {}\n\n");
      res.end();
      return;
    }

    if (req.method === "POST" && url.pathname === "/learn") {
      const body = JSON.parse((await readBody(req)) || "{}");
      const { topic, sourceUrls = [], populationUrls = [], source = "" } = body;
      if (!topic || !sourceUrls.length || !populationUrls.length) { res.writeHead(400, { "content-type": "application/json" }); res.end(JSON.stringify({ error: "topic, sourceUrls and populationUrls (its relative ground) are all required" })); return; }
      res.writeHead(202, { "content-type": "application/json" }); res.end(JSON.stringify({ started: true }));
      runLearningPass({ topic, sourceUrls, populationUrls, source }).catch((e) => broadcast("status", { phase: "error", error: String(e?.message ?? e) }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/auth/github/device") {
      if (!GITHUB_CLIENT_ID) { res.writeHead(400, { "content-type": "application/json" }); res.end(JSON.stringify({ error: "GITHUB_CLIENT_ID is not set in this server's environment — GitHub login is not configured" })); return; }
      const j = await ghFetch("https://github.com/login/device/code", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, scope: "public_repo" }) });
      res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(j));
      return;
    }

    if (req.method === "POST" && url.pathname === "/auth/github/poll") {
      const { device_code } = JSON.parse((await readBody(req)) || "{}");
      const j = await ghFetch("https://github.com/login/oauth/access_token", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, device_code, grant_type: "urn:ietf:params:oauth:grant-type:device_code" }) });
      if (j.access_token) {
        const me = await ghFetch("https://api.github.com/user", { headers: { authorization: `Bearer ${j.access_token}`, "user-agent": "eoreader7-expertise-surface" } });
        const sid = crypto.randomBytes(16).toString("hex");
        sessions.set(sid, { login: me.login, name: me.name, avatar: me.avatar_url, token: j.access_token });
        res.writeHead(200, { "content-type": "application/json", "set-cookie": `es_sid=${sid}; HttpOnly; SameSite=Lax; Path=/` });
        res.end(JSON.stringify({ ok: true, login: me.login, name: me.name, avatar: me.avatar_url }));
        return;
      }
      res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(j)); // { error: "authorization_pending" } etc — the page keeps polling
      return;
    }

    if (req.method === "GET" && url.pathname === "/auth/me") {
      const s = sessionOf(req);
      res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(s ? { login: s.login, name: s.name, avatar: s.avatar } : null));
      return;
    }

    if (req.method === "POST" && url.pathname === "/push") {
      const s = sessionOf(req);
      if (!s) { res.writeHead(401, { "content-type": "application/json" }); res.end(JSON.stringify({ error: "not logged in to GitHub" })); return; }
      const out = await pushToLivePriors(s);
      res.writeHead(out.ok ? 200 : 400, { "content-type": "application/json" }); res.end(JSON.stringify(out));
      return;
    }

    if (req.method === "GET" && url.pathname === "/fold") {
      const ex = loadExpertise();
      const name = url.searchParams.get("form");
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(name ? { name, lines: expertiseLines(ex, name), current: projectExpertise(ex, name) } : { forms: knownForms(ex).map((n) => ({ name: n, ...projectExpertise(ex, n) })) }));
      return;
    }

    res.writeHead(404); res.end("not found");
  } catch (e) {
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: String(e?.message ?? e) }));
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Polanyi's surface: http://127.0.0.1:${PORT}`);
  console.log(`local model: ${MODEL} (no frontier model — streamOllamaChat only)`);
  console.log(GITHUB_CLIENT_ID ? "GitHub device login: configured" : "GitHub device login: NOT configured (set GITHUB_CLIENT_ID) — push disabled");
  console.log(fs.existsSync(LIVE_PRIORS) ? `live_priors: ${LIVE_PRIORS}` : `live_priors: not found at ${LIVE_PRIORS} — push will fail honestly`);
});
