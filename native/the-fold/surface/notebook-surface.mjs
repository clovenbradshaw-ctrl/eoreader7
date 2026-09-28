#!/usr/bin/env node
// notebook-surface.mjs — the fold as a notebook, in a page a person drives.
//
//   node notebook-surface.mjs serve DIR [--port 8960] --by human:you
//   node notebook-surface.mjs ingest DIR FILE...        (any file; gaps are printed, never hidden)
//   node notebook-surface.mjs render DIR OUT.html       (static; run buttons absent)
//   node notebook-surface.mjs export DIR OUT.ipynb      node notebook-surface.mjs import DIR FILE.ipynb
//
// DIR holds one JSON file: the two chained logs (notebook + bench) and the ingested files. Every
// action is a ledger entry by a NAMED person (--by); the page can run code, edit, add claims and
// promote them, and cannot do any of it as a model. What a claim may say is the bench's sentence.
import fs from "node:fs"; import path from "node:path"; import http from "node:http";
import { ingest } from "../../organs/ingest.js";
import { emptyNotebook, addData, addCell, editCell, sourceOf, execsOf, editsOf, dataOf, stale, verify, NOTEBOOK_SCHEMA } from "./notebook.mjs";
import { runCell } from "./notebook-run.mjs";
import { toIpynb, fromIpynb } from "./notebook-ipynb.mjs";
import { phrase, statusOf, promote, support, STATUSES } from "./bench.mjs";
import { resolveHandles, labelOf } from "./handles.mjs";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const file = (dir) => path.join(dir, "notebook.json");

export function load(dir) {
  if (!fs.existsSync(file(dir))) return emptyNotebook();
  const j = JSON.parse(fs.readFileSync(file(dir), "utf8"));
  const st = { nb: { schema: NOTEBOOK_SCHEMA, entries: j.nb }, bench: { schema: "EOBench@1", entries: j.bench }, files: j.files ?? {} };
  const v = verify(st);
  if (!v.notebook.ok || !v.bench.ok) throw new Error(`the ledger does not verify: ${JSON.stringify(v)}`);
  return st;
}
export function save(dir, st) { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(file(dir) + ".tmp", JSON.stringify({ nb: st.nb.entries, bench: st.bench.entries, files: st.files })); fs.renameSync(file(dir) + ".tmp", file(dir)); }

const CSS = `:root{--bg:#fff;--fg:#1c1c1e;--mut:#6b6b70;--line:#dcdce0;--card:#f6f6f8;--ok:#1a7f4b;--bad:#b3261e;--warn:#8a5a00;--acc:#3457d5}
@media(prefers-color-scheme:dark){:root{--bg:#141416;--fg:#e8e8ea;--mut:#9a9aa2;--line:#2d2d33;--card:#1c1c20;--ok:#5cc98d;--bad:#ff8a80;--warn:#e0b060;--acc:#8fa8ff}}
body{background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif;margin:0}main{max-width:860px;margin:0 auto;padding:16px}
h1{font-size:20px}h2{font-size:14px;color:var(--mut);text-transform:uppercase;letter-spacing:.06em}
.cell{border:1px solid var(--line);border-radius:8px;margin:10px 0;background:var(--card)}.cell>header{display:flex;gap:8px;align-items:center;padding:6px 10px;border-bottom:1px solid var(--line);font-size:12px;color:var(--mut)}
.cell>header b{color:var(--fg)}pre{margin:0;padding:10px;overflow:auto;font:13px/1.45 ui-monospace,monospace;white-space:pre-wrap}textarea{width:100%;box-sizing:border-box;min-height:90px;font:13px ui-monospace,monospace;background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:6px;padding:8px}
.out{border-top:1px dashed var(--line);background:var(--bg)}.out img{max-width:100%;display:block;padding:8px}.tag{border:1px solid var(--line);border-radius:10px;padding:0 8px;font-size:11px}
.claim{padding:10px}.st-computed_in_range{color:var(--ok)}.st-proved{color:var(--ok);font-weight:600}.stale{color:var(--warn)}.gap{color:var(--warn);font-size:12px}.bad{color:var(--bad)}
button{font:inherit;font-size:12px;border:1px solid var(--line);background:var(--bg);color:var(--fg);border-radius:6px;padding:2px 10px;cursor:pointer}button:hover{border-color:var(--acc)}
.data{font-size:13px;border:1px solid var(--line);border-radius:8px;padding:8px 12px;margin:6px 0}`;

export function renderPage(st, { live = false, by = "", handles = resolveHandles({}).handles } = {}) {
  const v = verify(st);
  const cells = st.nb.entries.filter((e) => e.kind === "cell").map((c) => {
    const src = sourceOf(st.nb, c.id), ex = execsOf(st.nb, c.id), last = ex.at(-1), edits = editsOf(st.nb, c.id).length;
    if (c.type === "markdown") return `<section class="cell" id="${esc(c.id)}"><header><b>note</b> ${esc(c.id)} · ${esc(c.author)}${edits ? ` · ${edits} edit(s)` : ""}</header><pre>${esc(src)}</pre></section>`;
    if (c.type === "claim") {
      const s = statusOf(st.bench, c.id), sup = support(st.bench, c.id);
      const btns = live ? STATUSES.filter((x) => STATUSES.indexOf(x) > STATUSES.indexOf(s) && x !== "stated").map((x) => `<button data-op="promote" data-card="${esc(c.id)}" data-to="${x}">promote → ${esc(labelOf(handles, "status", x))}</button>`).join(" ") : "";
      return `<section class="cell" id="${esc(c.id)}"><header><b>${esc(labelOf(handles, "status", s))}</b> <span class="tag">claim</span> ${esc(c.id)} · ${sup.checks.length} check(s), ${sup.controls.length} control(s) that failed as they should${sup.failed.length ? `, <span class="bad">${sup.failed.length} check(s) came back false</span>` : ""}</header><div class="claim st-${s}">${esc(phrase(st.bench, c.id))}</div><div class="claim">${btns}</div></section>`;
    }
    const why = stale(st, c.id);
    const figs = (last?.figures ?? []).map((f) => `<img alt="figure ${esc(f.name)} (sha256 ${f.sha.slice(0, 12)})" src="data:image/png;base64,${f.png}">`).join("");
    const bound = c.for ? ` · <span class="tag">${esc(c.role)} of ${esc(c.for)}</span>` : "";
    const edit = live ? `<textarea data-src="${esc(c.id)}">${esc(src)}</textarea>` : `<pre>${esc(src)}</pre>`;
    return `<section class="cell" id="${esc(c.id)}"><header><b>${esc(c.lang)}</b> ${esc(c.id)} · ${esc(c.author)}${bound}${edits ? ` · ${edits} edit(s)` : ""} · ${ex.length} run(s)${why ? ` · <span class="stale">${esc(why)}</span>` : ""} ${live ? `<button data-op="run" data-cell="${esc(c.id)}">run</button> <button data-op="edit" data-cell="${esc(c.id)}">save edit</button>` : ""}</header>${edit}${last ? `<div class="out"><pre class="${last.ok ? "" : "bad"}">${esc(last.output) || "(no output)"}</pre>${figs}<pre style="color:var(--mut);font-size:11px">run ${last.n} · ${last.ms ?? "?"} ms · code ${last.codeSha.slice(0, 12)} · saw ${Object.keys(last.dataShas).length} data file(s) · scope ${esc(last.scope.kind)}${last.result === null ? "" : ` · result ${last.result}`}</pre></div>` : ""}</section>`;
  }).join("");
  const data = dataOf(st.nb).map((d) => `<div class="data"><b>${esc(d.name)}</b> <span class="tag">${esc(d.dataKind)}</span> ${d.chars} chars${d.tables ? `, ${d.tables} table(s)` : ""} · ${esc(d.by)}${d.gaps.map((g) => `<div class="gap">⚠ ${esc(g.kind)} — ${esc(g.reason)}</div>`).join("")}</div>`).join("") || `<p class="gap">nothing ingested yet</p>`;
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Notebook</title><style>${CSS}</style><main>
<h1>Notebook <span class="tag">${v.notebook.ok && v.bench.ok ? "chain verifies" : "CHAIN BROKEN"}</span></h1>
<p style="color:var(--mut)">Every cell, edit and run is a sealed ledger entry. A claim reads only as wide as what was checked; only a named person can move it up.${live ? ` Acting as <b>${esc(by)}</b>. <a href="/ipynb">download .ipynb</a>` : ""}</p>
<h2>Given</h2>${data}<h2>Cells</h2>${cells}
${live ? `<h2>Add</h2><p><select id="type"><option>code</option><option>markdown</option><option>claim</option></select> <input id="cid" placeholder="id"> <select id="lang"><option>python</option><option>js</option></select> <input id="for" placeholder="claim id (optional)"> <select id="role"><option>check</option><option>control</option></select></p><textarea id="newsrc"></textarea><p><button data-op="add">add cell</button></p>` : ""}
</main>${live ? `<script>const call=async(b)=>{const r=await fetch("/api",{method:"POST",body:JSON.stringify(b)});const j=await r.json();if(j.error)alert(j.error);else location.reload()};document.addEventListener("click",e=>{const o=e.target.dataset?.op;if(!o)return;const d=e.target.dataset;if(o==="run")call({op:"run",cell:d.cell});if(o==="edit")call({op:"edit",cell:d.cell,source:document.querySelector('[data-src="'+d.cell+'"]').value});if(o==="promote")call({op:"promote",card:d.card,to:d.to});if(o==="add")call({op:"add",id:cid.value,type:type.value,lang:lang.value,source:newsrc.value,for:document.getElementById("for").value||null,role:role.value})})</script>` : ""}`;
}

export function act(st, by, b) {
  if (b.op === "run") return runCell(st, b.cell);
  if (b.op === "edit") return editCell(st, { cell: b.cell, source: b.source, by });
  if (b.op === "add") return addCell(st, { id: b.id, type: b.type, lang: b.lang, source: b.source, author: by, for: b.for || null, role: b.for ? b.role : null });
  if (b.op === "promote") { const r = promote(st.bench, { card: b.card, to: b.to, by, evidence: b.evidence ?? null }); return r.error ? r : { state: { ...st, bench: r.log } }; }
  return { error: "unknown op" };
}

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
if (import.meta.url === `file://${process.argv[1]}`) {
  const positional = []; for (let i = 2; i < process.argv.length; i++) { if (process.argv[i].startsWith("--")) i++; else positional.push(process.argv[i]); }
  const [cmd, dir, ...rest] = positional;
  const by = arg("--by", "human:unknown");
  let st = load(dir);
  if (cmd === "ingest") {
    for (const f of rest) {
      const ing = ingest({ name: path.basename(f), bytes: fs.readFileSync(f) });
      const r = addData(st, ing, by); if (r.error) { console.error(r.error); process.exit(1); }
      st = r.state; console.log(`${ing.name}: ${ing.kind}, ${ing.text.length} chars, ${ing.tables.length} table(s)${ing.gaps.length ? "\n  gaps: " + ing.gaps.map((g) => g.kind).join(", ") : ""}`);
    }
    save(dir, st);
  } else if (cmd === "render") { fs.writeFileSync(rest[0], renderPage(st)); console.log("wrote", rest[0]); }
  else if (cmd === "export") { fs.writeFileSync(rest[0], JSON.stringify(toIpynb(st), null, 1)); console.log("wrote", rest[0]); }
  else if (cmd === "import") { const r = fromIpynb(JSON.parse(fs.readFileSync(rest[0], "utf8")), { author: by, state: st }); save(dir, r.state); console.log("imported", r.state.nb.entries.length, "entries;", r.notes.length, "note(s)"); }
  else if (cmd === "serve") {
    const port = Number(arg("--port", 8960));
    http.createServer(async (req, res) => {
      if (req.method === "POST" && req.url === "/api") {
        let body = ""; for await (const c of req) body += c;
        let r; try { r = act(st, by, JSON.parse(body)); } catch (e) { r = { error: String(e.message) }; }
        if (r.state) { st = r.state; save(dir, st); }
        res.setHeader("content-type", "application/json"); return res.end(JSON.stringify({ error: r.error ?? null }));
      }
      if (req.url === "/ipynb") { res.setHeader("content-type", "application/json"); return res.end(JSON.stringify(toIpynb(st), null, 1)); }
      res.setHeader("content-type", "text/html"); res.end(renderPage(st, { live: true, by }));
    }).listen(port, "127.0.0.1", () => console.log(`notebook on http://127.0.0.1:${port} as ${by}`));
  } else { console.error("usage: see header"); process.exit(1); }
}
