#!/usr/bin/env node
// holodeck.mjs — ONE SERVER FOR THE WHOLE SURFACE KIT.
//
//   node holodeck.mjs [--dir NOTEBOOK_DIR] [--learned DIR] [--port 8900] [--by human:you]
//
//   /            the hub: what is here, whether every chain verifies, how many learned skills are on
//   /notebook/   the notebook (Chat · Generate · Notebook) — ask in plain words, drop files, run cells, promote claims
//   /skills/     the Skills surface — every path the pipeline can take, learned analyses included, each with its switch
//   /health      the same facts as JSON (chains, skill counts) — what a test or a supervisor reads
//
// One ledger directory (--learned) is shared by both surfaces, so a switch flipped in either is the same recorded decision, and the
// notebook's Audit reads exactly what the Skills page shows. Bound to 127.0.0.1 only.
import http from "node:http"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { notebookHandler, load } from "./notebook-surface.mjs";
import { skillsHandler } from "./skills-surface.mjs";
import { collectSkills } from "../../organs/skills-index.js";
import { learnedDir } from "../../organs/hard-read.js";
import { verify } from "./notebook.mjs";
import { openWorkspace } from "./notebook-workspace.mjs";
import * as L from "./notebook-learn.mjs";
import { dataOf } from "./notebook.mjs";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function holodeck({ dir, learned = learnedDir(), by = "human:you", swarm, mouth } = {}) {
  const nb = notebookHandler({ dir, by, learned, base: "/notebook", skillsBase: "/skills/", swarm, mouth });
  const collect = () => collectSkills({ learnedDir: learned, layoutRules: fileURLToPath(new URL("./layout-conventions.json", import.meta.url)) });
  const sk = skillsHandler({ learnedDir: learned, collect, base: "/skills" });
  const facts = () => {
    const wsp = openWorkspace(dir), convs = wsp.list(), cur = convs[0], st = cur ? wsp.state(cur.id) : load(dir), v = verify(st), lib = L.library(learned), store = L.verifyStore(learned);
    return { chains: { notebook: v.notebook.ok && convs.every((c) => verify(wsp.state(c.id)).notebook.ok), claims: v.bench.ok, learned: store.ok, workspace: wsp.verify().ok }, conversations: convs.map((c) => ({ id: c.id, title: c.title, type: c.type, parent: c.parent })), files: dataOf(st.nb).map((d) => d.name), cells: st.nb.entries.filter((e) => e.kind === "cell").length, skills: { learned: lib.length, on: lib.filter((k) => k.effectiveOn).length, off: lib.filter((k) => !k.effectiveOn).length }, by };
  };
  const hub = () => { const f = facts(), ok = f.chains.notebook && f.chains.claims && f.chains.learned;
    return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Holodeck</title><style>:root{--bg:#fff;--fg:#212121;--mut:#757575;--line:#cfcfcf;--acc:#1565c0;--ok:#1b7f4b;--bad:#c62828}@media(prefers-color-scheme:dark){:root{--bg:#141416;--fg:#e6e6e6;--mut:#9a9a9a;--line:#3a3a3d;--acc:#8fa8ff;--ok:#66d19e;--bad:#ff8a80}}body{background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif;margin:0}main{max-width:760px;margin:40px auto;padding:0 16px}h1{font-weight:500}a.card{display:block;border:1px solid var(--line);border-radius:8px;padding:12px 16px;margin:10px 0;color:var(--fg);text-decoration:none}a.card:hover{border-color:var(--acc)}a.card b{color:var(--acc)}.k{color:var(--mut);font-size:13px}.ok{color:var(--ok)}.bad{color:var(--bad);font-weight:600}</style><main><h1>Holodeck</h1>
<p class="k">Acting as <b>${esc(f.by)}</b> · chains <span class="${ok ? "ok" : "bad"}">${ok ? "all verify" : "BROKEN"}</span> (notebook ${f.chains.notebook}, claims ${f.chains.claims}, learned methods ${f.chains.learned})</p>
<a class="card" href="/notebook/"><b>Notebook</b> — Chat · Generate · Notebook<div class="k">${f.conversations.length} conversation(s): ${f.conversations.map((c) => `${esc(c.title)} [${esc(c.type)}]`).join(" · ")}. ${f.cells} cells (first tab) · ${f.files.length} file(s) ingested${f.files.length ? ": " + esc(f.files.join(", ")) : ""}. Ask in plain words; if no method is learned and no model is set, an ant colony searches the data.</div></a>
<a class="card" href="/skills/"><b>Skills</b> — the paths the pipeline can take<div class="k">${f.skills.learned} learned analyses (${f.skills.on} on, ${f.skills.off} off), plus code routes, received priors and reading rules. Every switch is a named person's recorded decision.</div></a>
<a class="card" href="/notebook/?style=chat&drawer=1&tab=audit"><b>Audit</b> — how every claim was produced<div class="k">claim → method → who wrote it → what admitted it → who switched it.</div></a>
<p class="k">JSON: <a href="/health">/health</a></p></main>`; };
  return async (req, res) => {
    const url = new URL(req.url, "http://x"), p = url.pathname;
    if (p === "/health") { res.setHeader("content-type", "application/json"); res.end(JSON.stringify(facts())); return; }
    if (p === "/") { res.setHeader("content-type", "text/html"); res.end(hub()); return; }
    if (p === "/notebook") { res.statusCode = 302; res.setHeader("location", "/notebook/"); res.end(); return; }
    if (p === "/skills") { res.statusCode = 302; res.setHeader("location", "/skills/"); res.end(); return; }
    if (p.startsWith("/notebook/") && (await nb(req, res, p.slice("/notebook".length) || "/", url))) return;
    if (p.startsWith("/skills/") && (await sk(req, res, p.slice("/skills".length) || "/"))) return;
    res.statusCode = 404; res.end("not found");
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf(`--${k}`); return i >= 0 ? a[i + 1] : d; };
  const dir = opt("dir", path.join(process.env.HOME ?? ".", ".er7", "notebook")), learned = opt("learned", learnedDir()), port = Number(opt("port", 8900));
  http.createServer(holodeck({ dir, learned, by: opt("by", "human:you") })).listen(port, "127.0.0.1", () => console.log(`holodeck on http://127.0.0.1:${port}/  (notebook ${dir} · ledgers ${learned})`));
}
