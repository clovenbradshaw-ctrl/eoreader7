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
// Serves the UI-codegen ledger's LIVE FOLD at "/" (podcast-app-ledger.js —
// every round podcast-app-codegen.mjs ever ran, append-only; "/" always
// shows the current one, "/history" shows every round that ever existed,
// "/history/:seq" replays any one of them) and two JSON routes,
// /api/subscribe and /api/episodes, both backed by the real organs:
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
import { readAppLedger, projectApp, historyOf } from "../../adapters/build/podcast-app-ledger.js";

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

// FOUND LIVE, FIXED HERE (2026-09-30): neither this header nor any
// generated HTML declared a charset, so a browser rendering real prose
// (curly quotes, em-dashes) fell back to a legacy encoding and produced
// visible mojibake ("â€œ"). Every text/* response now declares utf-8
// explicitly — a one-line, harness-level fix, never touching what the
// model itself generates.
const send = (res, code, body, type = "application/json") => {
  const withCharset = type.startsWith("text/") || type === "application/json" ? `${type}; charset=utf-8` : type;
  res.writeHead(code, { "Content-Type": withCharset, "Access-Control-Allow-Origin": "http://127.0.0.1" });
  res.end(body);
};

/** currentAppHtml() — the ledger's live fold (podcast-app-codegen.mjs no
 * longer overwrites a mutable file; every round lands on the append-only
 * ledger instead). Falls back to the PR's own already-committed first-round
 * artifact only when the ledger has never had a round land on it at all. */
function currentAppHtml() {
  const fold = projectApp(readAppLedger());
  if (fold?.html) return fold.html;
  const file = path.join(HERE, "podcast-app-generated.html");
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

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
    if (url.pathname === "/" || url.pathname === "/index.html" || url.pathname === "/improved") {
      // "/improved" kept as an alias for anything that already links to it
      // — there is only ONE current app now (the ledger's fold), never two
      // separately-mutable files.
      const html = currentAppHtml();
      if (!html) return send(res, 404, "no round has landed yet — run podcast-app-codegen.mjs first", "text/plain");
      return send(res, 200, html, "text/html");
    }
    // The full append-only history: every round ever landed, none of them
    // destroyed by a later one — the direct answer to "why overwrite
    // instead of iterating to the log": now nothing does.
    if (url.pathname === "/history") {
      const rows = historyOf(readAppLedger());
      return send(res, 200, JSON.stringify({ rounds: rows.map((r) => ({ seq: r.seq, kind: r.kind, round: r.round, mode: r.mode, instruction: r.instruction, fresh: r.fresh, check: r.check, htmlLength: r.html.length })) }, null, 2));
    }
    if (url.pathname.startsWith("/history/")) {
      const seq = Number(url.pathname.slice("/history/".length));
      const row = historyOf(readAppLedger()).find((r) => r.seq === seq);
      if (!row) return send(res, 404, JSON.stringify({ error: `no round at seq ${seq}` }));
      return send(res, 200, row.html, "text/html");
    }
    send(res, 404, JSON.stringify({ error: "not found" }));
  } catch (e) {
    send(res, 500, JSON.stringify({ error: String(e?.message ?? e) }));
  }
});

server.listen(PORT, "127.0.0.1", () => console.log(`podcast app server: http://127.0.0.1:${PORT}/`));
