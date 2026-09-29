#!/usr/bin/env node
// podcast-app-server.mjs — the real backend the generated listening app
// talks to. Loopback only. Holds ONE in-memory ledger (kernel/notes.js via
// adapters/build/podcast-feed.js) for the life of the process, so
// subscribing once and browsing across several page loads works — a real
// upgrade over podcast-run.mjs's own disclosed per-invocation posture,
// stated here rather than silently assumed.
//
//   node podcast-app-server.mjs [--port 8931]
//
// Serves podcast-app-generated.html at "/" (the file podcast-app-codegen.mjs
// writes — THE SYSTEM's own output, never rewritten here) and two JSON
// routes, /api/subscribe and /api/episodes, both backed by the real organs:
// podcast-feed.js for the fetch+parse+ledger, organs/ethos.js +
// organs/charter.js for the same real per-episode ethos check
// podcast-run.mjs's own `subscribe` command already runs.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeNotes } from "../../kernel/notes.js";
import { makeLibrary, parseFeed } from "../../adapters/build/podcast-feed.js";
import { armCharter } from "../../organs/arm-charter.js";
import { constitution } from "../../organs/ethos.js";
import { charterGate } from "../../organs/charter.js";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.argv.find((a) => a.startsWith("--port="))?.split("=")[1]) || 8931;

const notes = makeNotes();
const lib = makeLibrary({ notes });
let log = notes.createNotes();
const feedXmlByShow = new Map(); // show title -> its last-synced raw xml, so /api/episodes can re-render descriptions/audio without re-fetching

function assessEpisode(description) {
  armCharter();
  const ethos = charterGate(constitution().charter, description ?? "");
  return { ethos: ethos.verdict, ethosBasis: ethos.basis };
}

function episodesJson(showTitle) {
  const xml = feedXmlByShow.get(showTitle);
  const feed = xml ? parseFeed(xml) : { items: [] };
  const byTitle = new Map(feed.items.map((it) => [it.title, it]));
  return lib.episodesOf(log, showTitle).map((note) => {
    const item = byTitle.get(note.end2);
    const assessed = assessEpisode(item?.description ?? "");
    return {
      title: note.end2,
      pubDate: item?.pubDate ?? null,
      description: item?.description ?? null,
      audioUrl: item?.enclosureUrl ?? null,
      ethos: assessed.ethos,
      ethosBasis: assessed.ethosBasis,
    };
  });
}

const send = (res, code, body, type = "application/json") => {
  res.writeHead(code, { "Content-Type": type, "Access-Control-Allow-Origin": "http://127.0.0.1" });
  res.end(body);
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  try {
    if (url.pathname === "/api/subscribe" && req.method === "GET") {
      const feedUrl = url.searchParams.get("url");
      if (!feedUrl) return send(res, 400, JSON.stringify({ error: "missing url param" }));
      const res2 = await fetch(feedUrl);
      if (!res2.ok) return send(res, 502, JSON.stringify({ error: `feed fetch failed: ${res2.status}` }));
      const xml = await res2.text();
      const synced = lib.syncFeed(log, { url: feedUrl, xml });
      log = synced.log;
      feedXmlByShow.set(synced.show.title, xml);
      return send(res, 200, JSON.stringify({ show: synced.show, added: synced.added, episodes: episodesJson(synced.show.title) }));
    }
    if (url.pathname === "/api/episodes" && req.method === "GET") {
      const show = url.searchParams.get("show");
      if (!show) return send(res, 400, JSON.stringify({ error: "missing show param" }));
      return send(res, 200, JSON.stringify({ episodes: episodesJson(show) }));
    }
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const file = path.join(HERE, "podcast-app-generated.html");
      if (!fs.existsSync(file)) return send(res, 404, "podcast-app-generated.html does not exist yet — run podcast-app-codegen.mjs first", "text/plain");
      return send(res, 200, fs.readFileSync(file, "utf8"), "text/html");
    }
    // The UX-steered revision (podcast-app-codegen.mjs --improve), served
    // alongside the original rather than in place of it — both are real,
    // inspectable artifacts of what the model actually produced each time.
    if (url.pathname === "/improved") {
      const file = path.join(HERE, "podcast-app-improved.html");
      if (!fs.existsSync(file)) return send(res, 404, "podcast-app-improved.html does not exist yet — run podcast-app-codegen.mjs --improve first", "text/plain");
      return send(res, 200, fs.readFileSync(file, "utf8"), "text/html");
    }
    send(res, 404, JSON.stringify({ error: "not found" }));
  } catch (e) {
    send(res, 500, JSON.stringify({ error: String(e?.message ?? e) }));
  }
});

server.listen(PORT, "127.0.0.1", () => console.log(`podcast app server: http://127.0.0.1:${PORT}/`));
