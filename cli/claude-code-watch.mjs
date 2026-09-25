#!/usr/bin/env node
// cli/claude-code-watch.mjs — WATCH THE REASONING GROW (2026-09-25). The
// user: "i also want to be able to do a slash command to see the reasoning
// in terminal or browser or something, line by line and see it grow."
//
// Tails the SAME per-session ledger cli/claude-code-ledger.mjs already
// writes (documents/claude-code-<session>:1.jsonl, EOTObservation@1 lines —
// see that file's own header for the schema: role/kind/title/text/basis)
// and prints each new line as it lands, formatted by role. Read-only: never
// opens the ledger for write, never touches ~/.claude/eo-reason/sessions/
// state — this cannot affect the reasoning gate no matter how it's used.
//
//   node cli/claude-code-watch.mjs [--session <id>] [--claims-only]
//   node cli/claude-code-watch.mjs --serve <port> [--session <id>] [--claims-only]
//
// Default session: $CLAUDE_CODE_SESSION_ID / $CLAUDE_SESSION_ID, or (with
// neither set — a plain terminal tab has no reason to inherit them) the
// most recently modified documents/claude-code-*.jsonl, so running this
// from a fresh tab still finds "whatever session you were just in" without
// the id typed in by hand.
//
// Both surfaces show only what happens FROM NOW ON: on start, the read
// cursor is set to the ledger's CURRENT size, not 0 — this is a live watch,
// not a replay of the session's whole backlog (cli/claude-code-context.mjs
// already serves "what does this session know so far" on demand; this file
// serves "what is it doing right now").
//
// --serve <port>: a plain local HTTP server (no deps) at
// http://127.0.0.1:<port> serving one page that polls a JSON endpoint once
// a second and appends new lines to the DOM — the browser surface. Polling,
// not SSE/websockets: simpler, and once a second is fast enough for a human
// watching reasoning unfold; a real push channel is a disclosed possible
// upgrade, not a defect in this first cut. The server is stateless across
// requests except for one shared start-time offset (used only as the
// default for a client's very first request, before it has its own `since`
// cursor) — each browser tab's own `since` query param is authoritative
// after that, so multiple simultaneous viewers each track their own
// position correctly without colliding.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.join(HERE, "..", "documents");

export function parseArgs(argv) {
  const out = { session: null, claimsOnly: false, servePort: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--session") out.session = argv[++i] ?? null;
    else if (a === "--claims-only") out.claimsOnly = true;
    else if (a === "--serve") out.servePort = Number(argv[++i] ?? 4173);
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

function mostRecentSessionFile(docsDir) {
  let best = null, bestTime = -Infinity;
  let entries;
  try { entries = fs.readdirSync(docsDir); } catch { return null; }
  for (const name of entries) {
    const m = /^claude-code-(.+):1\.jsonl$/.exec(name);
    if (!m) continue;
    const full = path.join(docsDir, name);
    let stat; try { stat = fs.statSync(full); } catch { continue; }
    if (stat.mtimeMs > bestTime) { bestTime = stat.mtimeMs; best = { session: m[1], file: full }; }
  }
  return best;
}

/** Which ledger file to watch, given CLI args and the environment. Exported
 *  for tests — pure given its inputs, no hidden global state beyond the env
 *  vars it's explicitly documented to read. */
export function ledgerFileFor({ session, docsDir = DOCS, env = process.env } = {}) {
  if (session) return { session, file: path.join(docsDir, `claude-code-${session}:1.jsonl`) };
  const envSid = env.CLAUDE_CODE_SESSION_ID || env.CLAUDE_SESSION_ID;
  if (envSid) return { session: envSid, file: path.join(docsDir, `claude-code-${envSid}:1.jsonl`) };
  const recent = mostRecentSessionFile(docsDir);
  if (recent) return recent;
  return { session: null, file: null };
}

const ICON = { prompt: "▶", tool: "⚙", claim: "◆", stop: "■", flag: "⚠", notice: "…", event: "·" };
const clip = (s, n = 220) => { const t = String(s ?? "").replace(/\s+/g, " ").trim(); return t.length > n ? `${t.slice(0, n)}…` : t; };

/** One ledger line -> one printable line. Exported for tests. */
export function formatLine(line) {
  const icon = ICON[line.role] ?? "·";
  const when = String(line.appendedAt ?? "").slice(11, 19) || "--:--:--";
  const head = `${when} ${icon} ${String(line.kind ?? line.role ?? "?").toUpperCase()}`;
  return `${head}  ${clip(line.text)}`;
}

/**
 * Read every COMPLETE line appended to `file` since byte `offset`, call
 * onLine(parsedJson) for each, and return the new offset. A trailing
 * not-yet-newline-terminated fragment is left unread for the next call —
 * found by the LAST newline byte in what was just read, never by
 * accumulating an off-by-one line/byte count across a `.split("\n")`
 * result (that undercounts or overcounts depending on whether the read
 * chunk happens to end exactly on a newline; anchoring on the last real
 * newline byte sidesteps the whole class of bug). A malformed line (a
 * concurrent partial write this poll caught mid-flush, at worst) is
 * skipped rather than crashing the watcher.
 */
export function tick(file, offset, claimsOnly, onLine) {
  let stat; try { stat = fs.statSync(file); } catch { return offset; }
  if (stat.size <= offset) return offset;
  const fd = fs.openSync(file, "r");
  const len = stat.size - offset;
  const buf = Buffer.alloc(len);
  fs.readSync(fd, buf, 0, len, offset);
  fs.closeSync(fd);
  const lastNL = buf.lastIndexOf(0x0a);
  if (lastNL < 0) return offset; // nothing complete yet
  const complete = buf.subarray(0, lastNL);
  for (const raw of complete.toString("utf8").split("\n")) {
    if (!raw.trim()) continue;
    let obj; try { obj = JSON.parse(raw); } catch { continue; }
    if (!claimsOnly || obj.role === "claim") onLine(obj);
  }
  return offset + lastNL + 1;
}

function tailToStdout({ session, file }, claimsOnly) {
  if (!file) { console.error("eoreader7 watch: no session ledger found (no session id, and no documents/claude-code-*.jsonl yet)."); process.exit(1); }
  console.log(`eoreader7 watch · session ${session} · ${file}`);
  console.log("(Ctrl+C to stop — never exits on its own; showing new lines from now, not the session's past backlog)\n");
  let offset = 0;
  try { offset = fs.statSync(file).size; } catch { offset = 0; }
  setInterval(() => { offset = tick(file, offset, claimsOnly, (obj) => console.log(formatLine(obj))); }, 700);
}

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>eoreader7 — reasoning watch</title>
<style>
  body{background:#0b0e14;color:#d5dbe6;font:13px/1.5 ui-monospace,Menlo,Consolas,monospace;margin:0;padding:16px}
  #head{color:#7c8aa5;margin-bottom:10px}
  .line{white-space:pre-wrap;word-break:break-word;padding:3px 0;border-bottom:1px solid #161b25}
  .claim{color:#7ee0a8} .prompt{color:#8ab4f8} .tool{color:#c9a4f2} .stop{color:#f2c96d} .flag{color:#f27d7d} .notice{color:#5b6a85} .event{color:#9aa5b8}
</style></head><body>
<div id="head">eoreader7 — connecting…</div>
<div id="log"></div>
<script>
let since = null;
const log = document.getElementById('log'), head = document.getElementById('head');
async function poll() {
  try {
    const q = since === null ? '' : ('?since=' + since);
    const r = await fetch('/events' + q);
    const j = await r.json();
    since = j.offset;
    head.textContent = 'eoreader7 watch · session ' + j.session + ' · ' + new Date().toLocaleTimeString();
    for (const l of j.lines) {
      const d = document.createElement('div');
      d.className = 'line ' + (l.role || 'event');
      d.textContent = (l.appendedAt || '').slice(11,19) + '  ' + (l.kind || l.role || '?').toUpperCase() + '  ' + (l.text||'').slice(0,600);
      log.appendChild(d);
    }
    if (j.lines.length) window.scrollTo(0, document.body.scrollHeight);
  } catch (e) { head.textContent = 'eoreader7 watch — connection error, retrying…'; }
  setTimeout(poll, 1000);
}
poll();
</script></body></html>`;

function serve(port, { session, file }, claimsOnly) {
  if (!file) { console.error("eoreader7 watch: no session ledger found."); process.exit(1); }
  const startOffset = (() => { try { return fs.statSync(file).size; } catch { return 0; } })();
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === "/events") {
      const since = url.searchParams.has("since") ? Number(url.searchParams.get("since")) : startOffset;
      const lines = [];
      const offset = tick(file, since, claimsOnly, (obj) => lines.push(obj));
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ session, offset, lines }));
      return;
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(PAGE);
  });
  server.listen(port, "127.0.0.1", () => console.log(`eoreader7 watch · session ${session} · http://127.0.0.1:${port}`));
  return server;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("usage: node cli/claude-code-watch.mjs [--session <id>] [--claims-only] [--serve <port>]");
    process.exit(0);
  }
  const target = ledgerFileFor({ session: args.session });
  if (args.servePort) serve(args.servePort, target, args.claimsOnly);
  else tailToStdout(target, args.claimsOnly);
}
if (import.meta.url === `file://${process.argv[1]}`) main();
