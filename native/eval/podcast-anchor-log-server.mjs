#!/usr/bin/env node
// podcast-anchor-log-server.mjs — the REAL backend (identical feed-fetch,
// charter-gate, ethos logic to podcast-app-server.mjs) serving the
// code-anchor-log's own composed output at "/" instead of the older
// podcast-app-ledger.jsonl's fold, so the anchor-log-driven app can be
// e2e tested against a real feed exactly the way the ad-hoc one was.
import http from "node:http";
import fs from "node:fs";
import { makeNotes } from "../kernel/notes.js";
import { makeLibrary, parseFeed } from "../adapters/build/podcast-feed.js";
import { armCharter } from "../organs/arm-charter.js";
import { constitution } from "../organs/ethos.js";
import { charterGate } from "../organs/charter.js";

const PORT = 8940;
const APP_FILE = new URL("../the-fold/surface/podcast-app-from-anchors.html", import.meta.url).pathname;

const notes = makeNotes();
const lib = makeLibrary({ notes });
let log = notes.createNotes();
const feedXmlByShow = new Map();

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
      title: note.end2, pubDate: item?.pubDate ?? null, description: item?.description ?? null,
      audioUrl: item?.enclosureUrl ?? null, ethos: assessed.ethos, ethosBasis: assessed.ethosBasis,
    };
  });
}

const send = (res, code, body, type = "application/json") => {
  const withCharset = type.startsWith("text/") || type === "application/json" ? `${type}; charset=utf-8` : type;
  res.writeHead(code, { "Content-Type": withCharset, "Access-Control-Allow-Origin": "http://127.0.0.1" });
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
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return send(res, 200, fs.readFileSync(APP_FILE, "utf8"), "text/html");
    }
    send(res, 404, JSON.stringify({ error: "not found" }));
  } catch (e) {
    send(res, 500, JSON.stringify({ error: String(e?.message ?? e) }));
  }
});

server.listen(PORT, "127.0.0.1", () => console.log(`anchor-log app server: http://127.0.0.1:${PORT}/`));
