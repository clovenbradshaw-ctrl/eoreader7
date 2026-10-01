// ═══ LOVELACE · TEACH IT TO FISH ═══ WATCH THE FOLD EVOLVE — the app as a live projection of its log.
//   node native/the-fold/app-view.mjs --work <dir holding fold.jsonl> [--port 8830] [--app-port 8831]
// Watches <work>/fold.jsonl. Every time an entry lands it re-projects the app from the leaves that have landed (the open ones are visible gaps, never guesses), restarts the app's own server, and the page here — a
// timeline of the log beside the running app — updates on its own. Read-only on the log: the builder appends, this only reads. Localhost only.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { compSpecOf } from "../organs/comp-read.js";
import { assembleApp, REQUIRED_UNITS } from "./app-assemble.mjs";
import { startApp } from "./app-drive.mjs";
import { project, verify } from "./app-fold.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), FIX = path.join(here, "fixtures", "weather-fuel");
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const spec = (f) => compSpecOf(JSON.parse(fs.readFileSync(path.join(FIX, "comps", f), "utf8")));

/** the units the assembler takes, from the fold's landed entries */
export const unitsOf = (proj) => Object.fromEntries(Object.entries(proj.landed).map(([n, e]) => [n, { code: e.code, model: e.by ?? e.model ?? null, rounds: e.rounds ?? 0, calls: e.calls ?? 0, cached: false, declared: e.declared ?? {}, resolutions: e.resolutions ?? [] }]));

const PAGE = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fold</title>
<style>:root{--bg:#f6f7f9;--fg:#15181d;--mut:#5b6472;--line:#dde1e7;--ok:#1a7f37;--open:#b35900;--surf:#fff}@media(prefers-color-scheme:dark){:root{--bg:#0f1318;--fg:#e6e9ee;--mut:#9aa4b2;--line:#252c36;--ok:#3fb950;--open:#e3963e;--surf:#171c23}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,sans-serif;display:grid;grid-template-columns:minmax(300px,380px) 1fr;height:100vh}
aside{border-right:1px solid var(--line);overflow:auto;padding:14px 16px;background:var(--surf)}main{display:flex;flex-direction:column;min-width:0}
h1{font-size:1rem;margin:0 0 2px}.sub{color:var(--mut);font-size:.85rem;margin:0 0 12px}
.bar{height:8px;border-radius:99px;background:var(--line);overflow:hidden;margin:6px 0 4px}.bar i{display:block;height:100%;background:var(--ok);transition:width .4s}
.leaf{display:flex;gap:8px;align-items:baseline;padding:6px 0;border-bottom:1px solid var(--line)}.dot{width:10px;height:10px;border-radius:50%;flex:none;transform:translateY(1px);background:var(--line)}.dot.ok{background:var(--ok)}.dot.open{background:var(--open)}
.leaf b{font-weight:600}.leaf small{color:var(--mut);display:block;overflow-wrap:anywhere}h2{font-size:.8rem;text-transform:uppercase;letter-spacing:.05em;color:var(--mut);margin:16px 0 6px}
.ev{overflow-wrap:anywhere;padding:5px 0;border-bottom:1px dashed var(--line);font-size:.85rem}.ev .k{font-family:ui-monospace,monospace;color:var(--mut)}.ev.new{animation:f 1.6s}@keyframes f{from{background:#ffd54a55}to{background:transparent}}
.top{padding:10px 14px;border-bottom:1px solid var(--line);background:var(--surf);display:flex;gap:12px;align-items:center;flex-wrap:wrap}.top code{color:var(--mut)}iframe{flex:1;border:0;width:100%;background:#fff}.empty{margin:auto;color:var(--mut);padding:24px;text-align:center}
@media(max-width:760px){body{grid-template-columns:1fr;grid-template-rows:auto 1fr;height:auto}aside{border-right:0;border-bottom:1px solid var(--line);max-height:50vh}iframe{min-height:70vh}}</style>
<aside><h1>The fold</h1><p class="sub" id="sub">waiting for the first entry…</p><div class="bar"><i id="bar" style="width:0"></i></div><div id="count" class="sub"></div>
<h2>Checks</h2><div id="leaves"></div><h2>Log (newest first)</h2><div id="log"></div></aside>
<main><div class="top"><b id="state">—</b><span id="chain"></span><code id="head"></code></div><iframe id="app" hidden title="the app, as the fold stands"></iframe><div class="empty" id="empty">Nothing has landed yet. The app appears here as soon as a check passes.</div></main>
<script>let last=-1,seen=new Set();const $=(i)=>document.getElementById(i);const short=(b)=>{const p=String(b||'').split('+').map(x=>x.trim()),m=p.filter(x=>x&&!x.startsWith('species')),k=p.filter(x=>x.startsWith('species:')).length;return (m.join(' + ')||'')+(k?(m.length?' + ':'')+k+' species fill(s)':'')};const esc=(s)=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function tick(){try{const r=await fetch('/fold.json',{cache:'no-store'});const d=await r.json();
$('sub').textContent=d.title||'';const pct=d.total?Math.round(100*d.passing/d.total):0;$('bar').style.width=pct+'%';$('count').textContent=d.passing+' of '+d.total+' checks passing'+(d.passing===d.total&&d.total?' — ready to merge':' — merge blocked');
$('leaves').innerHTML=d.required.map(n=>{const e=d.landed[n],o=d.open[n];if(e)e.by=short(e.by);return '<div class="leaf"><span class="dot '+(e?'ok':o?'open':'')+'"></span><div><b>'+esc(n)+'</b><small>'+(e?'passing · '+esc(e.by||'')+(e.calls?' · '+e.calls+' model call(s)':' · no model call')+' · #'+e.seq:o?'open · '+esc((o.failures||[]).slice(0,1).join('')).slice(0,110):'not tried yet')+'</small></div></div>'}).join('');
$('log').innerHTML=d.log.map(e=>'<div class="ev'+(seen.size&&!seen.has(e.seq)?' new':'')+'"><span class="k">#'+e.seq+' '+e.kind+'</span> '+esc(e.text)+'</div>').join('');d.log.forEach(e=>seen.add(e.seq));
$('chain').textContent=d.chain?'· chain intact':'· CHAIN BROKEN';$('head').textContent='head #'+d.head;$('state').textContent=d.appUrl?'app running':'no app yet';
if(d.appUrl){if(d.head!==last){last=d.head;const f=$('app');f.hidden=false;$('empty').hidden=true;f.src=d.appUrl+'?v='+d.head+'#'+(d.place||'London')}}}catch(e){}}
setInterval(tick,1500);tick();</script></html>`;

export function startViewer({ work, port = 8830, appPort = 8831, title = "" } = {}) {
  const foldFile = path.join(work, "fold.jsonl"), appDir = path.join(work, "app");
  let appHandle = null, projectedHead = -2, busy = false, appUrl = null, lastErr = null;
  const read = () => (fs.existsSync(foldFile) ? fs.readFileSync(foldFile, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
  async function reproject() {
    if (busy) return; busy = true;
    try {
      const entries = read(), head = entries.length - 1;
      if (head === projectedHead) return;
      const proj = project(entries, null, REQUIRED_UNITS);
      if (Object.keys(proj.landed).length) {
        if (appHandle) { appHandle.stop(); appHandle = null; }
        const asm = assembleApp({ outDir: appDir, weatherSpec: spec("weather-comp-detect.json"), fuelSpec: spec("fuel-comp-detect.json"), units: unitsOf(proj), partial: true, provenance: { comps: JSON.parse(fs.readFileSync(path.join(FIX, "comps", "PROVENANCE.json"), "utf8")) } });
        if (asm.ok) { appHandle = await startApp(appDir, { port: appPort }); appUrl = appHandle.url; lastErr = null; } else lastErr = asm.gap;
      }
      projectedHead = head;
    } catch (e) { lastErr = String(e.message).slice(0, 200); projectedHead = read().length - 1; } finally { busy = false; }
  }
  const timer = setInterval(reproject, 1000); reproject();
  const text = (e) => e.kind === "land" || e.kind === "supersede" ? `${e.leaf} ${e.kind === "land" ? "passes" : "superseded"} — ${e.by ?? ""}${e.calls ? `, ${e.calls} model call(s)` : ", no model call"}` : e.kind === "open" ? `${e.leaf} open — ${(e.failures ?? []).slice(0, 1).join("").slice(0, 120)}` : e.kind === "propose" ? `plan: ${(e.needs ?? []).map((n) => n.need).join(", ")}` : e.kind === "project" ? `preview re-projected (${e.passing}/${e.total})` : (e.note ?? "");
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    if (u.pathname === "/") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(PAGE); }
    if (u.pathname === "/fold.json") {
      const entries = read(), proj = project(entries, null, REQUIRED_UNITS), strip = ({ code, ...r }) => r;
      const body = { title: title || path.basename(work), head: entries.length - 1, passing: proj.passing, total: proj.total, required: proj.required, landed: Object.fromEntries(Object.entries(proj.landed).map(([k, v]) => [k, strip(v)])), open: Object.fromEntries(Object.entries(proj.open).map(([k, v]) => [k, strip(v)])), log: entries.slice().reverse().slice(0, 80).map((e) => ({ seq: e.seq, kind: e.kind, text: text(e) })), chain: verify(entries).ok, appUrl, err: lastErr };
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); return res.end(JSON.stringify(body));
    }
    if (u.pathname.startsWith("/entry/")) { const e = read()[Number(u.pathname.slice(7))]; res.writeHead(e ? 200 : 404, { "content-type": "application/json" }); return res.end(JSON.stringify(e ?? { error: "no such entry" })); }
    res.writeHead(404); res.end("not found");
  }).listen(port, "127.0.0.1");
  return { url: `http://127.0.0.1:${port}/`, stop() { clearInterval(timer); server.close(); appHandle?.stop(); }, reproject };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const work = path.resolve(arg("work", "./generate-work")), v = startViewer({ work, port: Number(arg("port", 8830)), appPort: Number(arg("app-port", 8831)), title: arg("title", "") });
  console.log(`watching ${path.join(work, "fold.jsonl")} — open ${v.url}`);
}
