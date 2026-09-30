#!/usr/bin/env node
// skills-surface.mjs — THE PATHS THIS INSTANCE CAN TAKE, WHEN EACH APPLIES, AND WHETHER IT IS ON.
//
//   node skills-surface.mjs serve  [--port 8950] [--live-priors DIR] [--learned DIR] [--form-priors FILE]
//   node skills-surface.mjs render OUTDIR  [same options]        (a static page: switches are read-only)
//   node skills-surface.mjs toggle SKILL on|off "why" --by human:you [--learned DIR]
//   node skills-surface.mjs flag   SKILL "why"        --by human:you [--learned DIR]
//   node skills-surface.mjs concede RULE "why"                       [--learned DIR]
//
// A skill is a PATH the pipeline can go down, taken only for some content — not something that applies to
// everything. Each card says WHEN it applies (its trigger), what it is for, whether it is on, what stands
// behind it (a giver or evidence), how completely it is DEFINED (eight parameters; the gaps are shown), how it
// is GOVERNED (Ostrom), and what it is RELATED to (derived from the code). The disclosure JSONs of a turn link
// here by skill id: every card's element id IS the skill id.
//
// Switches write an append-only ledger a person owns (organs/skill-toggles.js); the pipeline reads that ledger.
// A switch whose path the pipeline does not yet read says so on its card, in words.
import fs from "node:fs"; import path from "node:path"; import http from "node:http"; import { fileURLToPath } from "node:url";
import { collectSkills, concedeLearned } from "../../organs/skills-index.js";
import { setToggle, flagSkill } from "../../organs/skill-toggles.js";
import { PARAMETERS } from "../../organs/skill-definition.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const idAttr = (id) => esc(id);
const link = (id) => `<a href="#${esc(id)}">${esc(id)}</a>`;

const GOVERNANCE = [
  ["authority", "Authority", "who may use it and who may change it"], ["fit", "Fit here", "does it work on THIS instance's content"], ["monitoring", "Monitoring", "an append-only record of every firing"],
  ["sanctions", "Sanctions", "standing → flagged → conceded → off"], ["resolution", "Resolution", "what happens when it disagrees with another path"], ["nesting", "Nesting", "what it sits inside, what it contains"],
];

function defTable(def) {
  return `<table class="def">${PARAMETERS.map((p, i) => { const s = def.slots[i]; return `<tr class="${s.gap ? "gap" : ""}"><th title="${esc(p.asks)}">${esc(p.label)}</th><td>${s.gap ? `<em>not declared — a gap, not a guess</em>` : esc(s.answer)}${s.from ? `<div class="from">${esc(s.from)}</div>` : ""}</td><td class="lens">${[p.holacracy, p.aristotle, p.tinbergen].filter(Boolean).map(esc).join(" · ")}</td></tr>`; }).join("")}</table>`;
}
function govTable(g) {
  return `<table class="def">${GOVERNANCE.map(([k, label, ask]) => `<tr class="${g[k].answer ? "" : "gap"}"><th title="${esc(ask)}">${esc(label)}</th><td>${g[k].answer ? esc(g[k].answer) : "<em>not declared</em>"}</td><td class="lens">Ostrom ${esc(g[k].principle)}</td></tr>`).join("")}</table>`;
}
function relBlock(s) {
  const r = s.relations; const row = (k, v) => (v ? `<p><b>${k}</b> ${v}</p>` : "");
  return row("uses", r.uses.map((u) => `<code>${esc(u.path)}</code>`).join(" ")) +
    row("named by", r.usedBy.length ? r.usedBy.map((u) => `<code title="${esc(u.text)}">${esc(u.file)}:${u.line}</code>`).join(" ") : "") +
    (!r.usedBy.length && s.origin === "received" ? `<p><b>named by</b> <em>nothing in the code names this prior — nothing consumes it yet</em></p>` : "") +
    row("nested under", r.parent ? link(r.parent) : "") + row("contains", r.children.map(link).join(" ")) +
    row("also applies to the same content", r.coApplies.slice(0, 8).map(link).join(" ") + (r.coApplies.length > 8 ? ` +${r.coApplies.length - 8}` : ""));
}

function card(s, { live }) {
  const answered = s.definition.answered, total = s.definition.total;
  const purpose = s.definition.slots[0].answer;
  const rung = s.governance.sanctions.rung;
  const usedTxt = s.governance.fit.answer;
  return `<article class="skill ${s.effectiveOn ? "on" : "off"}" id="${idAttr(s.id)}" data-skill="${idAttr(s.id)}">
  <header><label class="switch" title="${s.effectiveOn ? "on — click to turn off" : esc(s.offBecause ?? "off")}"><input type="checkbox" ${s.effectiveOn ? "checked" : ""} ${live ? "" : "disabled"} data-toggle="${idAttr(s.id)}"><span></span></label>
    <h3>${esc(s.name)}</h3><span class="chip o-${esc(s.origin)}">${esc(s.origin)}</span><span class="chip rung r-${esc(rung)}">${esc(rung)}</span>
    ${s.honored ? "" : `<span class="chip dim" title="the pipeline does not yet read this skill's switch">switch not yet read</span>`}</header>
  <p class="when"><b>Applies when</b> ${esc(s.appliesWhen)}</p>
  ${purpose ? `<p class="purpose">${esc(purpose)}</p>` : `<p class="purpose gaptxt">no purpose declared</p>`}
  <p class="meta"><span class="cov" title="parameters answered of ${total}"><i style="width:${(answered / total) * 100}%"></i></span> defined ${answered}/${total} · ${esc(s.standing)}${s.decided ? ` · switch set by ${esc(s.by)}${s.why ? ` — ${esc(s.why)}` : ""}` : " · switch never set (default on)"}</p>
  <p class="meta">${esc(usedTxt)}</p>
  <details><summary>Defined by <small>(Holacracy · Aristotle · Tinbergen)</small></summary>${defTable(s.definition)}</details>
  <details><summary>Governed by <small>(Ostrom)</small></summary>${govTable(s.governance)}${live ? `<p class="acts"><button data-flag="${idAttr(s.id)}">raise a flag</button>${s.concede ? "" : ""}</p>` : ""}</details>
  <details><summary>Related</summary>${relBlock(s)}<p class="from">${esc(s.address)}</p></details>
</article>`;
}

function group(title, note, items, { open, live }) {
  const on = items.filter((x) => x.effectiveOn).length;
  return `<section class="grp"><details ${open ? "open" : ""}><summary><h2>${esc(title)}</h2> <span class="n">${items.length} · ${on} on</span></summary><p class="note">${esc(note)}</p>${items.map((s) => card(s, { live })).join("")}</details></section>`;
}

export function renderSkills({ collected, live = false }) {
  const { routes, received, learned } = collected;
  const kinds = [...new Set(received.map((s) => s.kind))];
  const params = `<details class="params" open><summary><h2>What defines a skill</h2></summary>
    <p>A skill is a <b>path the pipeline can take</b> — taken only for content its trigger fires on, and switchable. What applies to everything is the pipeline, not a skill.
    Each is defined by <b>eight parameters</b>, drawn from three traditions that converge, and governed by <b>Ostrom's principles</b> for a commons held by many. A parameter nothing answers is shown as a <b>gap</b>; nothing is filled in.</p>
    <table class="def"><tr><th>parameter</th><th>asks</th><th class="lens">Holacracy · Aristotle · Tinbergen</th></tr>${PARAMETERS.map((p) => `<tr><th>${esc(p.label)}</th><td>${esc(p.asks)}</td><td class="lens">${[p.holacracy, p.aristotle, p.tinbergen].filter(Boolean).map(esc).join(" · ")}</td></tr>`).join("")}</table>
    <table class="def"><tr><th>governance</th><th>asks</th><th class="lens">Ostrom</th></tr>${GOVERNANCE.map(([k, l, a]) => `<tr><th>${l}</th><td>${a}</td><td class="lens">${esc(GOV_P[k])}</td></tr>`).join("")}</table>
    <p class="note">Switches are decisions by a named person, recorded append-only. A skill the pipeline does not yet read a switch for says so. A skill a turn used is listed, linked here by its id, in that turn's disclosure JSON (<code>skills</code>) and in the ingestion log.</p></details>`;
  return `<h1>Skills</h1><p class="role">${routes.length + received.length + learned.length} paths · ${kinds.length} received kinds · ${learned.length} learned here${live ? "" : " · static page: switches are read-only"}</p>
${live ? `<p class="who">You are <input id="who" value="human:you" size="16"> <small>(recorded with every switch; a model is refused)</small> <input id="filter" placeholder="filter by name, language, trigger…" size="30"></p>` : ""}
${params}
${group("Code paths", "Paths the pipeline takes because code says so, each with its trigger.", routes, { open: true, live })}
${group("Learned here", "Earned by reading on this instance; each stands on its evidence and can be conceded or switched off.", learned, { open: true, live })}
${group("Received", "Handed to this instance — live_priors' derived priors and the received layout rules; each stands on the giver it declares. Grouped by kind.", [], { open: false, live }).replace("<p class=\"note\">", "<p class=\"note\">")}
${kinds.map((k) => group(`received · ${k}`, "", received.filter((s) => s.kind === k), { open: false, live })).join("")}`;
}
const GOV_P = { authority: "1 boundaries · 3 collective choice · 7 right to organise", fit: "2 congruence with local conditions", monitoring: "4 monitoring", sanctions: "5 graduated sanctions", resolution: "6 conflict resolution", nesting: "8 nested enterprises" };

const CSS = `:root{color-scheme:light dark;--bg:#fbfaf7;--fg:#1c1b19;--mut:#6b675f;--line:#8884;--acc:#1f5fbf;--warn:#a4372a;--ok:#2b7a43}@media(prefers-color-scheme:dark){:root{--bg:#161513;--fg:#ece9e2;--mut:#a29d92;--acc:#7aa7ff;--warn:#f08a7c;--ok:#7bd192}}
body{background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,sans-serif;margin:0 auto;max-width:64rem;padding:1.5rem 1rem 4rem}h1{margin:.2rem 0}h2{font-size:1.05rem;margin:0;display:inline}h3{margin:0;font-size:15px}
.role,.note,.from,.meta,small{color:var(--mut);font-size:13px}.n{color:var(--mut);font-size:13px;margin-left:.5rem}.grp>details>summary{cursor:pointer;padding:.4rem 0;border-bottom:1px solid var(--line)}
.skill{border:1px solid var(--line);border-radius:8px;padding:.6rem .8rem;margin:.7rem 0;scroll-margin-top:1rem}.skill:target{outline:2px solid var(--acc)}.skill.off{opacity:.55}
.skill header{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}.skill p{margin:.3rem 0}.when b{color:var(--acc)}.gaptxt{color:var(--mut);font-style:italic}
.chip{font:11.5px ui-monospace,monospace;border:1px solid var(--line);border-radius:4px;padding:0 .35rem;color:var(--mut)}.o-received{color:var(--acc);border-color:var(--acc)}.o-learned{color:var(--ok);border-color:var(--ok)}.o-code{color:var(--fg)}
.r-flagged,.r-conceded,.r-off{color:var(--warn);border-color:var(--warn)}.dim{opacity:.7}
.switch{position:relative;width:34px;height:18px;display:inline-block}.switch input{opacity:0;width:0;height:0}.switch span{position:absolute;inset:0;background:var(--line);border-radius:18px;transition:.15s}.switch span:before{content:"";position:absolute;height:14px;width:14px;left:2px;top:2px;background:var(--bg);border-radius:50%;transition:.15s}
.switch input:checked+span{background:var(--ok)}.switch input:checked+span:before{transform:translateX(16px)}.switch input:disabled+span{opacity:.5}
.cov{display:inline-block;width:56px;height:6px;background:var(--line);border-radius:3px;vertical-align:middle;margin-right:.35rem}.cov i{display:block;height:100%;background:var(--acc);border-radius:3px}
details details{margin:.3rem 0 .3rem .2rem}details summary{cursor:pointer}table.def{border-collapse:collapse;width:100%;font-size:13px;margin:.4rem 0}.def th{text-align:left;vertical-align:top;padding:.25rem .5rem .25rem 0;white-space:nowrap;color:var(--mut);font-weight:600}.def td{padding:.25rem .5rem .25rem 0;vertical-align:top}.def .lens{color:var(--mut);font-size:12px;width:28%}.def tr.gap td em,.def tr.gap th{color:var(--warn)}.def tr+tr{border-top:1px solid var(--line)}
code{font:12px ui-monospace,monospace}a{color:var(--acc)}button{font:inherit;font-size:13px}.who input{font:inherit}.params{border:1px solid var(--line);border-radius:8px;padding:.5rem .8rem;margin:1rem 0}`;

const JS = `const who=()=>document.getElementById('who').value.trim();
const post=async(u,b)=>{const r=await fetch(u,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)});const j=await r.json();if(j.error){alert(j.error);return false}location.reload();return true};
document.addEventListener('change',e=>{const t=e.target.closest('[data-toggle]');if(!t)return;const why=prompt('Why? (recorded with the switch)','')||null;post(BASE+'/toggle',{skill:t.dataset.toggle,on:t.checked,by:who(),why}).then(ok=>{if(!ok)t.checked=!t.checked})});
document.addEventListener('click',e=>{const b=e.target.closest('[data-flag]');if(!b)return;const why=prompt('What is the concern? (a flag needs a reason)','');if(why)post(BASE+'/flag',{skill:b.dataset.flag,by:who(),why})});
const f=document.getElementById('filter');if(f)f.addEventListener('input',()=>{const q=f.value.toLowerCase();document.querySelectorAll('.skill').forEach(a=>{a.style.display=!q||a.textContent.toLowerCase().includes(q)?'':'none'});if(q)document.querySelectorAll('.grp details').forEach(d=>d.open=true)});
if(location.hash){const el=document.getElementById(decodeURIComponent(location.hash.slice(1)));if(el){let p=el.parentElement;while(p){if(p.tagName==='DETAILS')p.open=true;p=p.parentElement}el.scrollIntoView()}}`;

export const pageHtml = (collected, { live, base = "" }) => `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Skills</title><style>${CSS}</style>${renderSkills({ collected, live })}<script>const BASE=${JSON.stringify(base)};${JS}</script>`;

/** skillsHandler({ learnedDir, collect, base }) -> async (req, res, pathname) => handled? — the Skills surface as a mountable route set. */
export function skillsHandler({ learnedDir, collect, base = "" }) {
  const body = (req) => new Promise((ok) => { let b = ""; req.on("data", (d) => (b += d)); req.on("end", () => { try { ok(JSON.parse(b || "{}")); } catch { ok({}); } }); });
  return async (req, res, p) => {
    const send = (code, type, s) => { res.writeHead(code, { "content-type": type }); res.end(s); };
    if (req.method === "POST" && p === "/toggle") { const b = await body(req); const r = setToggle(learnedDir, { skill: b.skill, on: b.on, by: b.by, why: b.why }); send(200, "application/json", JSON.stringify(r.error ? { error: r.error } : { ok: true, seq: r.entry.seq })); return true; }
    if (req.method === "POST" && p === "/flag") { const b = await body(req); const r = flagSkill(learnedDir, { skill: b.skill, by: b.by, why: b.why }); send(200, "application/json", JSON.stringify(r.error ? { error: r.error } : { ok: true, seq: r.entry.seq })); return true; }
    if (p === "/" || p.startsWith("/skills-surface.html")) { send(200, "text/html; charset=utf-8", pageHtml(collect(), { live: true, base })); return true; }
    return false;
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const a = process.argv.slice(2); const opt = (k, d = null) => { const i = a.indexOf(`--${k}`); return i >= 0 ? a[i + 1] : d; };
  const learnedDir = opt("learned", process.env.ER7_LEARNED_DIR ?? path.join(process.env.HOME ?? "", ".er7", "learned"));
  const collect = () => collectSkills({ livePriors: opt("live-priors", path.join(process.cwd(), "..", "live_priors")), layoutRules: opt("layout-rules", fileURLToPath(new URL("./layout-conventions.json", import.meta.url))), learnedDir, foldSkillsDir: opt("fold-skills"), formPriors: opt("form-priors") });
  const cmd = a[0];
  if (cmd === "concede") { const r = concedeLearned(learnedDir, a[1], a[2]); console.log(r.error ? `refused: ${r.error}` : `conceded ${a[1]}: ${a[2]}`); process.exit(r.error ? 1 : 0); }
  if (cmd === "toggle") { const r = setToggle(learnedDir, { skill: a[1], on: a[2] === "on", by: opt("by"), why: a[3] && !a[3].startsWith("--") ? a[3] : null }); console.log(r.error ? `refused: ${r.error}` : `${a[1]} → ${a[2]} (seq ${r.entry.seq})`); process.exit(r.error ? 1 : 0); }
  if (cmd === "flag") { const r = flagSkill(learnedDir, { skill: a[1], by: opt("by"), why: a[2] }); console.log(r.error ? `refused: ${r.error}` : `flagged ${a[1]} (seq ${r.entry.seq})`); process.exit(r.error ? 1 : 0); }
  if (cmd === "render") { const out = a[1] ?? "skills-out"; fs.mkdirSync(out, { recursive: true }); const c = collect(); fs.writeFileSync(path.join(out, "skills-surface.html"), pageHtml(c, { live: false })); console.log(`wrote ${out}/skills-surface.html  ${c.routes.length} code · ${c.received.length} received · ${c.learned.length} learned`); }
  if (cmd === "serve") {
    const port = Number(opt("port", 8950));
    const body = (req) => new Promise((res) => { let b = ""; req.on("data", (d) => (b += d)); req.on("end", () => { try { res(JSON.parse(b || "{}")); } catch { res({}); } }); });
    http.createServer(async (req, res) => {
      const send = (code, type, s) => { res.writeHead(code, { "content-type": type }); res.end(s); };
      if (req.method === "POST" && req.url === "/toggle") { const b = await body(req); const r = setToggle(learnedDir, { skill: b.skill, on: b.on, by: b.by, why: b.why }); return send(200, "application/json", JSON.stringify(r.error ? { error: r.error } : { ok: true, seq: r.entry.seq })); }
      if (req.method === "POST" && req.url === "/flag") { const b = await body(req); const r = flagSkill(learnedDir, { skill: b.skill, by: b.by, why: b.why }); return send(200, "application/json", JSON.stringify(r.error ? { error: r.error } : { ok: true, seq: r.entry.seq })); }
      if (req.url.startsWith("/skills-surface.html") || req.url === "/") return send(200, "text/html; charset=utf-8", pageHtml(collect(), { live: true }));
      send(404, "text/plain", "not found");
    }).listen(port, "127.0.0.1", () => console.log(`skills surface on http://127.0.0.1:${port}/  (ledger: ${learnedDir})`));
  }
}
