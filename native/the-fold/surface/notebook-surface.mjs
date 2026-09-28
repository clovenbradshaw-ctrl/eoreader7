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
import { emptyNotebook, addData, addCell, editCell, cellOf, sourceOf, execsOf, editsOf, dataOf, stale, verify, NOTEBOOK_SCHEMA } from "./notebook.mjs";
import { runCell, runPython } from "./notebook-run.mjs";
import { parseCommand, COMMANDS } from "./notebook-commands.mjs";
import { plan, numericColumns } from "./notebook-plan.mjs";
import * as L from "./notebook-learn.mjs";
import { learnedDir } from "../../organs/hard-read.js";
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

const CSS = `:root{--bg:#fff;--page:#eeeeee;--fg:#212121;--mut:#757575;--line:#cfcfcf;--code:#f7f7f7;--in:#303f9f;--out:#d84315;--sel:#42a5f5;--ok:#1b7f4b;--bad:#c62828;--warn:#8a5a00;--bar:#f5f5f5}
@media(prefers-color-scheme:dark){:root{--bg:#1b1b1d;--page:#121213;--fg:#e6e6e6;--mut:#9a9a9a;--line:#3a3a3d;--code:#252528;--in:#8c9eff;--out:#ff8a65;--sel:#64b5f6;--ok:#66d19e;--bad:#ff8a80;--warn:#e0b060;--bar:#232326}}
[hidden]{display:none!important}*{box-sizing:border-box}body{margin:0;background:var(--page);color:var(--fg);font:14px/1.5 "Helvetica Neue",Helvetica,Arial,sans-serif}
#top{position:sticky;top:0;z-index:5;background:var(--bg);border-bottom:1px solid var(--line)}#top .t1{display:flex;align-items:center;gap:12px;padding:6px 16px}#top h1{font-size:18px;margin:0;font-weight:500}
.badge{font-size:11px;border:1px solid var(--line);border-radius:3px;padding:0 6px;color:var(--mut)}.badge.ok{color:var(--ok);border-color:var(--ok)}.badge.bad{color:var(--bad);border-color:var(--bad)}
#bar{display:flex;gap:4px;flex-wrap:wrap;padding:4px 16px;background:var(--bar);border-top:1px solid var(--line)}#bar button,#bar a{font:inherit;font-size:12px;border:1px solid var(--line);background:var(--bg);color:var(--fg);border-radius:3px;padding:3px 9px;cursor:pointer;text-decoration:none}#bar button:hover,#bar a:hover{border-color:var(--sel)}#bar .sp{flex:1}
#nb{max-width:1000px;margin:14px auto 120px;background:var(--bg);border:1px solid var(--line);padding:14px 10px;min-height:60vh}
.cell{display:flex;gap:6px;margin:6px 0;padding:2px 6px 2px 0;border-left:5px solid transparent}.cell.sel{border-left-color:var(--sel)}.cell:hover{border-left-color:var(--line)}.cell.sel:hover{border-left-color:var(--sel)}
.pr{flex:0 0 78px;text-align:right;font:12px/1.7 "DejaVu Sans Mono",monospace;color:var(--in);user-select:none;padding-top:5px}.pr.o{color:var(--out)}.pr .who{display:block;color:var(--mut);font-size:10px}
.body{flex:1;min-width:0}.code,textarea.code{border:1px solid var(--line);background:var(--code);border-radius:2px;padding:6px 8px;font:13px/1.45 "DejaVu Sans Mono",monospace;white-space:pre-wrap;margin:0;overflow:auto;width:100%;color:var(--fg)}
textarea.code{min-height:60px;resize:vertical;display:block}.sel textarea.code{border-color:var(--sel)}
.outp{padding:4px 8px;font:13px/1.45 "DejaVu Sans Mono",monospace;white-space:pre-wrap;margin:0;overflow:auto}.outp.bad{color:var(--bad)}.outp img{max-width:100%;display:block;margin:6px 0}
.meta{font-size:11px;color:var(--mut);padding:0 8px 2px}.stale{color:var(--warn)}
.md{padding:2px 8px}.md h1,.md h2,.md h3{margin:.4em 0 .2em;font-weight:500}.md code{background:var(--code);padding:0 4px}.md ul{margin:.3em 0}
.claim{border:1px solid var(--line);border-left:4px solid var(--mut);border-radius:2px;padding:6px 10px}.claim.computed_in_range,.claim.proved{border-left-color:var(--ok)}.claim .st{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--mut)}.claim.computed_in_range .st,.claim.proved .st{color:var(--ok)}
.chip{font-size:11px;border:1px solid var(--line);border-radius:9px;padding:0 7px;color:var(--mut)}.gap{color:var(--warn);font-size:12px}
.given{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px 88px}.given .f{border:1px solid var(--line);border-radius:3px;padding:2px 8px;font-size:12px;background:var(--bar)}
#cmd{position:fixed;left:0;right:0;bottom:0;background:var(--bg);border-top:1px solid var(--line);padding:8px 16px;z-index:6}#cmd input{width:100%;max-width:1000px;display:block;margin:0 auto;font:13px "DejaVu Sans Mono",monospace;padding:8px 10px;background:var(--code);color:var(--fg);border:1px solid var(--line);border-radius:3px}
#toast{position:fixed;left:50%;transform:translateX(-50%);bottom:64px;max-width:900px;width:calc(100% - 32px);background:var(--bg);border:1px solid var(--sel);border-radius:4px;padding:8px 12px;font:12px/1.5 "DejaVu Sans Mono",monospace;white-space:pre-wrap;max-height:50vh;overflow:auto;z-index:7;display:none;box-shadow:0 4px 18px #0003}#toast.on{display:block}#toast .x{float:right;cursor:pointer;color:var(--mut)}
#drop{position:fixed;inset:0;background:#42a5f544;border:3px dashed var(--sel);display:none;z-index:9;align-items:center;justify-content:center;font-size:22px}#drop.on{display:flex}`;

const inline = (t) => esc(t).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<i>$2</i>");
/** A small markdown: headings, bold/italic/code, bullet lists, paragraphs. Everything escaped first. */
export function mdToHtml(src) {
  const out = []; let list = false;
  for (const line of String(src).split("\n")) {
    const h = line.match(/^(#{1,3})\s+(.*)$/), li = line.match(/^\s*[-*]\s+(.*)$/);
    if (li) { if (!list) { out.push("<ul>"); list = true; } out.push(`<li>${inline(li[1])}</li>`); continue; }
    if (list) { out.push("</ul>"); list = false; }
    if (h) out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); else if (line.trim()) out.push(`<p style="margin:.3em 0">${inline(line)}</p>`);
  }
  if (list) out.push("</ul>");
  return out.join("");
}

export function renderPage(st, { live = false, by = "", handles = resolveHandles({}).handles, sel = null } = {}) {
  const v = verify(st), ok = v.notebook.ok && v.bench.ok;
  const allExecs = st.nb.entries.filter((e) => e.kind === "exec"); const count = (e) => allExecs.indexOf(e) + 1;
  const cellList = st.nb.entries.filter((e) => e.kind === "cell");
  const cells = cellList.map((c, idx) => {
    const src = sourceOf(st.nb, c.id), ex = execsOf(st.nb, c.id), last = ex.at(-1), edits = editsOf(st.nb, c.id).length;
    const cls = `cell${sel === c.id ? " sel" : ""}`, attr = `id="${esc(c.id)}" data-cell="${esc(c.id)}" data-type="${c.type}"`;
    const proposed = c.proposed ? ` <span class="chip">proposed by ${esc(c.author)}</span>` : "";
    if (c.type === "markdown") return `<section class="${cls}" ${attr}><div class="pr"><span class="who">${esc(c.id)}</span></div><div class="body"><div class="md" ${live ? `title="double-click to edit"` : ""}>${mdToHtml(src)}</div>${live ? `<textarea class="code" data-src="${esc(c.id)}" hidden>${esc(src)}</textarea>` : ""}${edits ? `<div class="meta">${edits} edit(s)</div>` : ""}${proposed}</div></section>`;
    if (c.type === "claim") {
      const s = statusOf(st.bench, c.id), sup = support(st.bench, c.id);
      const btns = live ? STATUSES.filter((x) => STATUSES.indexOf(x) > STATUSES.indexOf(s)).map((x) => `<button data-op="promote" data-card="${esc(c.id)}" data-to="${x}">promote → ${esc(labelOf(handles, "status", x))}</button>`).join(" ") : "";
      return `<section class="${cls}" ${attr}><div class="pr"><span class="who">${esc(c.id)}</span></div><div class="body"><div class="claim ${s}"><div class="st">${esc(labelOf(handles, "status", s))} · claim · ${sup.checks.length} check(s) · ${sup.controls.length} control(s) that failed as they should${sup.failed.length ? ` · <span class="bad" style="color:var(--bad)">${sup.failed.length} check(s) came back false</span>` : ""}</div>${esc(phrase(st.bench, c.id))}<div style="margin-top:4px">${btns}</div></div>${proposed}</div></section>`;
    }
    const why = stale(st, c.id), n = last ? count(last) : " ";
    const figs = (last?.figures ?? []).map((f) => `<img alt="figure ${esc(f.name)} (sha256 ${f.sha.slice(0, 12)})" src="data:image/png;base64,${f.png}">`).join("");
    const bound = c.for ? `<span class="chip">${esc(c.role)} of ${esc(c.for)}</span> ` : "";
    const box = live ? `<textarea class="code" data-src="${esc(c.id)}" rows="${Math.min(18, Math.max(2, src.split("\n").length))}" spellcheck="false">${esc(src)}</textarea>` : `<pre class="code">${esc(src)}</pre>`;
    return `<section class="${cls}" ${attr}><div class="pr">In&nbsp;[${last ? n : "&nbsp;"}]:<span class="who">${esc(c.lang)} · ${esc(c.id)}</span></div><div class="body">${bound}${proposed}${box}${last ? `` : ""}${last ? `</div></section><section class="cell${sel === c.id ? " sel" : ""}" data-out="${esc(c.id)}"><div class="pr o">Out&nbsp;[${n}]:</div><div class="body"><pre class="outp ${last.ok ? "" : "bad"}">${esc(last.output) || (last.figures.length ? "" : "(no output)")}</pre>${figs}<div class="meta">${last.ms ?? "?"} ms · ${ex.length} run(s) · code ${last.codeSha.slice(0, 10)} · saw ${Object.keys(last.dataShas).length} file(s) · scope ${esc(last.scope.kind)}${last.result === null ? "" : ` · result ${last.result}`}${edits ? ` · ${edits} edit(s)` : ""}${why ? ` · <span class="stale">⚠ ${esc(why)}</span>` : ""}</div>` : `<div class="meta">${why ? `<span class="stale">${esc(why)}</span>` : ""}</div>`}</div></section>`;
  }).join("");
  const given = dataOf(st.nb).map((d) => `<span class="f" title="${esc(d.gaps.map((g) => g.kind + ": " + g.reason).join("\n"))}"><b>${esc(d.name)}</b> ${esc(d.dataKind)} · ${d.chars} chars${d.tables ? ` · ${d.tables} table(s)` : ""}${d.gaps.length ? ` · <span class="gap">⚠ ${d.gaps.map((g) => esc(g.kind)).join(", ")}</span>` : ""}</span>`).join("");
  const bar = live ? `<div id="bar"><button data-op="run-sel" title="Ctrl+Enter">▶ Run</button><button data-op="run-all">▶▶ Run all</button><button data-op="add-type" data-t="code">+ Code</button><button data-op="add-type" data-t="md">+ Markdown</button><button data-op="add-type" data-t="claim">+ Claim</button><button data-op="cmd" data-c="/tools">Tools</button><button data-op="cmd" data-c="/data">Data</button><button data-op="cmd" data-c="/help">/ Commands</button><span class="sp"></span><a href="/ipynb" download="notebook.ipynb">⤓ .ipynb</a></div>` : "";
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Notebook</title><style>${CSS}</style>
<div id="top"><div class="t1"><h1>Notebook</h1><span class="badge ${ok ? "ok" : "bad"}">${ok ? "chain verifies" : "CHAIN BROKEN"}</span><span class="badge">Python 3 · no network</span>${live ? `<span class="badge">as ${esc(by)}</span>` : `<span class="badge">read-only</span>`}<span class="sp" style="flex:1"></span><span class="badge">Every run is a sealed entry · only a named person moves a claim up</span></div>${bar}</div>
<div id="nb">${given ? `<div class="given">${given}</div>` : ""}${cells || `<p style="margin:20px 88px;color:var(--mut)">Empty. Drop a file anywhere, or type below: <code>/ingest paper.pdf</code>, <code>/help</code>, or just python.</p>`}</div>
${live ? `<div id="cmd"><input id="line" list="cmds" autocomplete="off" spellcheck="false" placeholder="python, or /help — /ingest /py /md /claim /check /run /tools /promote" autofocus><datalist id="cmds">${COMMANDS.map(([c]) => `<option value="${esc(c.split(" ")[0])} ">`).join("")}</datalist></div><div id="toast"></div><div id="drop">Drop to ingest</div>` : ""}
${live ? `<script>
let sel=${JSON.stringify(sel)};const $=(q,r=document)=>r.querySelector(q);
const toast=(t)=>{const e=$("#toast");e.innerHTML='<span class="x" onclick="this.parentNode.classList.remove(\\'on\\')">✕</span>'+t.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));e.classList.add("on")};
const refresh=async(keep)=>{const h=await (await fetch("/?sel="+(sel||""))).text();const d=new DOMParser().parseFromString(h,"text/html");$("#top").replaceWith($("#top",d));$("#nb").replaceWith($("#nb",d));bind()};
const call=async(b)=>{const r=await fetch("/api",{method:"POST",body:JSON.stringify(b)});const j=await r.json();if(j.selected)sel=j.selected;if(j.error)toast("✕ "+j.error);else if(j.notice)toast(j.notice);await refresh();return j};
function pick(id){sel=id;document.querySelectorAll(".cell").forEach(c=>c.classList.toggle("sel",c.dataset.cell===id||c.dataset.out===id))}
function bind(){document.querySelectorAll("[data-src]").forEach(t=>{t.onfocus=()=>pick(t.dataset.src);t.onkeydown=async e=>{if(e.key==="Enter"&&(e.shiftKey||e.ctrlKey)){e.preventDefault();const id=t.dataset.src;await call({op:"edit",cell:id,source:t.value,quiet:true});const c=document.querySelector('[data-cell="'+id+'"]');if(c.dataset.type==="code")await call({op:"run",cell:id});const nxt=[...document.querySelectorAll('[data-cell]')];const i=nxt.findIndex(x=>x.dataset.cell===id);if(e.shiftKey&&nxt[i+1])document.querySelector('[data-src="'+nxt[i+1].dataset.cell+'"]')?.focus();else $("#line").focus()}}});
document.querySelectorAll(".cell").forEach(c=>c.onclick=()=>pick(c.dataset.cell||c.dataset.out));document.querySelectorAll(".md").forEach(m=>m.ondblclick=()=>{const t=m.parentNode.querySelector("textarea");m.hidden=true;t.hidden=false;t.focus()})}
bind();
document.addEventListener("click",e=>{const d=e.target.dataset||{};const o=d.op;if(!o)return;
if(o==="promote")call({op:"promote",card:d.card,to:d.to});
if(o==="run-sel"){if(sel)call({op:"run",cell:sel});else toast("select a code cell first")}
if(o==="run-all")call({op:"runmany",which:"all"});
if(o==="cmd")call({op:"line",line:d.c});
if(o==="add-type"){$("#line").value=d.t==="code"?"":d.t==="md"?"/md ":"/claim ";$("#line").focus()}});
$("#line").addEventListener("keydown",async e=>{if(e.key==="Enter"&&e.target.value.trim()){const l=e.target.value;e.target.value="";await call({op:"line",line:l})}});
let dc=0;addEventListener("dragenter",e=>{e.preventDefault();dc++;$("#drop").classList.add("on")});addEventListener("dragleave",()=>{if(--dc<=0)$("#drop").classList.remove("on")});addEventListener("dragover",e=>e.preventDefault());
addEventListener("drop",async e=>{e.preventDefault();dc=0;$("#drop").classList.remove("on");for(const f of e.dataTransfer.files){const b=new Uint8Array(await f.arrayBuffer());let s="";for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));await call({op:"upload",name:f.name,base64:btoa(s)})}});
</script>` : ""}`;
}

let toolsCache;
async function toolsText(st) { if (toolsCache) return toolsCache; const r = runPython("tools()", {}, { timeoutMs: 20000 }); return (toolsCache = r.output); }


// A model may only POINT here (choose among methods already learned). WRITING a new method is `mouth`, and goes through the gate.
async function askModel({ question, skills, columns }) {
  const url = process.env.ER7_OLLAMA_URL, model = process.env.ER7_NB_MODEL;
  if (!url || !model) throw new Error("no model configured (ER7_OLLAMA_URL / ER7_NB_MODEL)");
  const schema = { type: "object", properties: { skills: { type: "array", items: { enum: skills.map((r) => r.id) } }, columns: { type: "array", items: { enum: columns } } }, required: ["skills", "columns"] };
  const r = await fetch(`${url}/api/chat`, { method: "POST", body: JSON.stringify({ model, stream: false, format: schema, options: { temperature: 0 }, messages: [{ role: "user", content: `Choose which learned methods answer the question, and which columns. Question: ${question}\nMethods:\n${skills.map((x) => `${x.id}: ${x.desc}`).join("\n")}\nColumns: ${columns.join(", ")}` }] }) });
  return JSON.parse((await r.json()).message.content);
}
const MAX_RUNS = 80; // declared: one question may spend at most this many cell runs

async function askTurn(st, by, text, ctx = {}) {
  const P = "model:planner", dir = ctx.dir ?? learnedDir();
  const files = Object.entries(st.files).map(([name, f]) => ({ name, tables: f.tables }));
  const p = await plan(text, files, { library: L.library(dir), ask: process.env.ER7_OLLAMA_URL ? askModel : null });
  if (p.refusal) return { error: p.refusal };
  let taught = null, skills = p.skills, via = p.via;
  if (!skills.length) {
    const mouth = ctx.mouth ?? L.ollamaMouth();
    if (!mouth) return { error: `I have no learned method for that question, and no model to write one.\nTeach me: write a check and a control cell for a claim (/claim, /check, /control), then  /learn <check cell> <control cell> as <what it answers>.\nOr point me at a model: set ER7_OLLAMA_URL and ER7_NB_MODEL.\nWhat I have learned so far: ${L.library(dir).filter((s) => !s.conceded).map((s) => s.name).join("; ") || "nothing yet"}.` };
    const g = await L.generate({ question: text, cols: p.columns.length ? [...p.columns, ...p.numeric.filter((c) => !p.columns.includes(c))] : p.numeric, file: p.file, files: st.files, mouth, dir, tools: L.toolDocs(), examples: L.library(dir).filter((s) => !s.conceded).slice(-2) });
    if (!g.ok) return { error: `a method was proposed and refused ${g.attempts.length} time(s); the last reason: ${g.reason}\n${g.attempts.map((a, i) => `  try ${i + 1}: ${a.ok ? "admitted" : a.reason}`).join("\n")}` };
    skills = [L.library(dir).find((s) => s.id === g.id)]; taught = g; via = `a method learned just now from a model (${g.attempts.length} attempt(s)) — it passed the gate: it ran, was deterministic, and its control failed`;
  }
  const runs = p.columns.length * skills.length * 2;
  if (runs > MAX_RUNS) return { error: `that would be ${runs} runs (the limit is ${MAX_RUNS}); name fewer columns or say which analysis` };
  let s = st; const put = (o) => { let id = o.id; while (cellOf(s.nb, id)) id += "x"; const r = addCell(s, { ...o, id, author: P }); if (r.error) throw new Error(r.error); s = r.state; return id; };
  const run = (id) => { const r = runCell(s, id); if (r.error) throw new Error(r.error); s = r.state; return r.exec; };
  const n0 = s.nb.entries.filter((e) => e.kind === "cell" && e.type === "markdown").length + 1;
  put({ id: `ask${n0}`, type: "markdown", source: `**Asked:** ${text}\n\n**Method${skills.length > 1 ? "s" : ""}:** ${skills.map((k) => `${k.name} (${k.id}${k.conceded ? ", conceded" : ""}; learned from ${k.lineage?.mouth ?? "?"}, used ${k.uses}×)`).join("; ")} on ${p.columns.join(", ")} of ${p.file}. Chosen by: ${via}.${p.matched.length ? ` Matched on: ${p.matched.join(", ")}.` : ""}${p.unmatched.length ? `\n\n**Not understood (matched nothing):** ${p.unmatched.join(", ")}` : ""}\n\nEvery claim below is proposed by the planner and only as wide as its check; each has a control that fails. None of the methods is built in — see /skills.` });
  const findings = [], claims = [], quality = new Map();
  for (const col of p.columns) for (const k of skills) {
    const tag = `${col}-${k.id.slice(0, 6)}`, cid = put({ id: `k-${tag}`, type: "claim", source: L.fill(k.claim, p.file, col) });
    const e = run(put({ id: `chk-${tag}`, type: "code", lang: "python", source: L.fill(k.check, p.file, col), for: cid, role: "check" }));
    run(put({ id: `ctl-${tag}`, type: "code", lang: "python", source: L.fill(k.control, p.file, col), for: cid, role: "control" }));
    findings.push({ k, col, e }); claims.push(cid); L.recordUse(dir, k.id, { question: text, col, file: p.file });
    const q = (e.output.match(/^#quality (.*)$/m) ?? [])[1]; if (q && !quality.has(col)) quality.set(col, q);
  }
  const lines = findings.map(({ k, e }) => (e.output.match(/^#finding (.*)$/m) ?? [])[1]).filter(Boolean);
  const verdicts = claims.map((c) => { const sp = support(s.bench, c); return `- ${c.replace(/^k-/, "")}: ${sp.checks.length ? "the check held" : sp.failed.length ? "the check did NOT hold" : "not run"}${sp.controls.length ? ", and its control failed as it should" : ", but no control has failed yet, so it cannot be promoted"}`; });
  put({ id: `ans${n0}`, type: "markdown", source: `**Data as read**\n\n${[...quality.values()].map((q) => `- ${q}`).join("\n")}\n\n**What was found**\n\n${lines.map((l) => `- ${l}`).join("\n")}\n\n**Claims (proposed; you decide)**\n\n${verdicts.join("\n")}\n\nNothing above is promoted. \`/promote <claim> computed_in_range\` moves a claim only if a check and a failed control are on the ledger — and only you can.` });
  return { state: s, selected: `ans${n0}`, notice: taught ? `learned: ${skills[0].name} (${skills[0].id}) — stored in ${dir}` : null };
}

function learnOp(st, by, b, ctx) {
  const dir = ctx.dir ?? learnedDir();
  const chk = cellOf(st.nb, b.check), ctl = cellOf(st.nb, b.control);
  if (!chk || !ctl || chk.type !== "code" || ctl.type !== "code") return { error: "/learn <check cell> <control cell> as <what it answers> — both must be code cells" };
  if (!chk.for || chk.for !== ctl.for || chk.role !== "check" || ctl.role !== "control") return { error: `the check and control must be bound to the same claim (/check <claim> …, /control <claim> …)` };
  const A = sourceOf(st.nb, b.check), B = sourceOf(st.nb, b.control);
  const names = Object.keys(st.files).filter((n) => A.includes(n)); if (names.length !== 1) return { error: `the check must name exactly one ingested file (found ${names.length})` };
  const tbl = st.files[names[0]].tables[0]; const numeric = tbl ? numericColumns(tbl) : [];
  const col = numeric.find((c) => A.includes(`"${c}"`) || A.includes(`'${c}'`)); if (!col) return { error: "the check must name one numeric column of that file in quotes" };
  const claim = sourceOf(st.nb, chk.for);
  const r = L.learnFrom({ name: b.desc.split(/\s+/).slice(0, 8).join(" "), desc: b.desc, claim, checkCode: A, controlCode: B, usedFile: names[0], usedCol: col, cols: numeric, files: st.files, dir, by });
  if (!r.ok) return { error: `refused: ${r.reason}` };
  return { state: st, notice: `${r.existing ? "already known" : "learned"} (${r.id}): "${b.desc}"\nadmitted because: it ran twice with the same answer, its control failed, and ${r.evidence.generalisation}.\nAsk a question in plain words and it will be used.` };
}

/** act(st, by, body) -> { state?, error?, notice?, selected? } — one door for the buttons AND the / bar. */
export async function act(st, by, b, ctx = {}) {
  if (b.op === "line") { const p = parseCommand(b.line); if (p.error) return { error: p.error }; return act(st, by, p, ctx); }
  if (b.op === "ask") return askTurn(st, by, b.text, ctx);
  if (b.op === "learn") return learnOp(st, by, b, ctx);
  if (b.op === "skills") { const lib = L.library(ctx.dir ?? learnedDir()); return { notice: lib.length ? lib.map((k) => `${k.id}  ${k.conceded ? "[conceded] " : ""}${k.name}\n   ${k.claim}\n   learned from ${k.lineage?.mouth ?? "?"} on "${k.lineage?.question ?? ""}" · used ${k.uses}× · ${k.evidence?.generalisation ?? ""}`).join("\n") : "nothing learned yet — ask a question (a model writes and the gate admits), or /learn from your own cells" }; }
  if (b.op === "forget") return L.concede(ctx.dir ?? learnedDir(), b.id, b.because) ? { notice: `conceded ${b.id} — kept on the record, no longer chosen` } : { error: `no learned method ${b.id}` };
  if (b.op === "run") return runCell(st, b.cell);
  if (b.op === "runmany") {
    const ids = st.nb.entries.filter((e) => e.kind === "cell" && e.type === "code").map((c) => c.id).filter((id) => b.which === "all" || (b.which === "stale" ? stale(st, id) : id === b.which));
    if (!ids.length) return { error: `no code cell matches "${b.which}"` };
    let s = st; const log = [];
    for (const id of ids) { const r = runCell(s, id); if (r.error) return r; s = r.state; log.push(`${id}: ${r.exec.ok ? "ok" : "ERROR"} · ${r.exec.ms} ms`); }
    return { state: s, notice: log.join("\n") };
  }
  if (b.op === "edit") { const r = editCell(st, { cell: b.cell, source: b.source, by }); return r.error === "no change" ? { state: st } : r; }
  if (b.op === "add") {
    if (b.needs) return { error: `${b.lang === "js" ? "/js" : "/py"} needs code after it` };
    const bytype = { code: "c", markdown: "m", claim: "k" }[b.type]; const n = st.nb.entries.filter((e) => e.kind === "cell" && e.type === b.type).length + 1;
    let id = b.id || `${bytype}${n}`; while (cellOf(st.nb, id)) id += "x";
    if (b.for && !cellOf(st.nb, b.for)) return { error: `no claim "${b.for}" — see the ids on the left of each cell` };
    const r = addCell(st, { id, type: b.type, lang: b.lang, source: b.source, author: by, for: b.for || null, role: b.for ? b.role : null });
    if (r.error) return r;
    if (b.run && b.type === "code") { const x = runCell(r.state, id); return x.error ? x : { state: x.state, selected: id }; }
    return { state: r.state, selected: id };
  }
  if (b.op === "promote") { const r = promote(st.bench, { card: b.card, to: b.to, by, evidence: b.evidence ?? null }); return r.error ? r : { state: { ...st, bench: r.log } }; }
  if (b.op === "ingest" || b.op === "upload") {
    let bytes, name;
    if (b.op === "upload") { bytes = Buffer.from(b.base64, "base64"); name = path.basename(b.name); }
    else { const p = path.resolve(b.path.replace(/^~/, process.env.HOME ?? "~")); if (!fs.existsSync(p)) return { error: `no such file: ${p}` }; bytes = fs.readFileSync(p); name = path.basename(p); }
    const ing = ingest({ name, bytes }); const r = addData(st, ing, by); if (r.error) return r;
    return { state: r.state, notice: `${ing.name}: ${ing.kind}, ${ing.text.length} chars, ${ing.tables.length} table(s)${ing.gaps.length ? "\n" + ing.gaps.map((g) => `⚠ ${g.kind} — ${g.reason}`).join("\n") : ""}\n\nIn a cell:  data("${ing.name}")   ${ing.tables.length ? `table("${ing.name}")` : ""}` };
  }
  if (b.op === "data") return { notice: dataOf(st.nb).map((d) => `${d.name}  ${d.dataKind}  ${d.chars} chars${d.gaps.length ? "\n" + d.gaps.map((g) => `   ⚠ ${g.kind} — ${g.reason}`).join("\n") : ""}`).join("\n") || "nothing ingested yet — /ingest <path>, or drop a file" };
  if (b.op === "tools") return { notice: await toolsText(st) };
  if (b.op === "help") return { notice: COMMANDS.map(([c, d]) => `${c.padEnd(38)} ${d}`).join("\n") + "\n\nanything without a slash is python (the last expression is shown, like Jupyter).\nShift+Enter in a cell: save, run, next.  Drag a file onto the page to ingest it." };
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
        let r; try { r = await act(st, by, JSON.parse(body)); } catch (e) { r = { error: String(e.message) }; }
        if (r.state) { st = r.state; save(dir, st); }
        res.setHeader("content-type", "application/json"); return res.end(JSON.stringify({ error: r.error ?? null, notice: r.notice ?? null, selected: r.selected ?? null }));
      }
      if (req.url === "/ipynb") { res.setHeader("content-type", "application/json"); return res.end(JSON.stringify(toIpynb(st), null, 1)); }
      res.setHeader("content-type", "text/html"); res.end(renderPage(st, { live: true, by, sel: new URL(req.url, "http://x").searchParams.get("sel") || null }));
    }).listen(port, "127.0.0.1", () => console.log(`notebook on http://127.0.0.1:${port} as ${by}`));
  } else { console.error("usage: see header"); process.exit(1); }
}
