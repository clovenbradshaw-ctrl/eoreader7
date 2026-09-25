// build-holograph-surface.mjs — EOHolographOutput@1 + self-contained facing page
// for the metropolitan-code responsibilities → harm graph.
//
// Produces:
//   holograph.json          — the artifact (per OHS holograph shape)
//   metro-code-holograph.html — the facing page, no build step, everything
//                               resolves to the byte (ground text embedded).

import fs from "node:fs";

const ROOT = new URL("./", import.meta.url);
const rows = fs.readFileSync(new URL("./ledger/metro-code-departments.jsonl", import.meta.url), "utf8")
  .trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
const graph = JSON.parse(fs.readFileSync(new URL("./harm-graph.json", import.meta.url), "utf8"));
const wiring = JSON.parse(fs.readFileSync(new URL("./wiktionary-wiring.json", import.meta.url), "utf8"));

// 1. ground texts, embedded for byte resolution
const ground = {};
for (const r of rows) {
  const file = r.doc.split("/").pop();
  if (!ground[file]) ground[file] = fs.readFileSync(new URL(`./ground/${file}`, import.meta.url), "utf8");
}

// 2. EOHolographOutput@1 artifact
const prose = rows.map((r, i) => ({
  text: r.verbatim,
  ground: "material",
  ref: `${r.doc}#${r.at[0]}-${r.at[1]}`,
  groundedOn: "responsibility provision, byte-anchored in the grounded text layer",
  carry: 1,
  department: r.fields.department,
  chapter: r.fields.chapter,
}));

const beings = [
  ...(graph.departmentNames ?? []).map((d) => ({ id: `ref:dept:${d.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, kind: "department", label: d })),
  ...(graph.harmReferentIds ?? []).map((h) => ({ id: h, kind: "harm-referent", label: graph.harmReferentsById?.[h]?.label ?? h, terms: wiring.vocabulary?.harmReferents?.[h] ?? [] })),
];

const assertions = graph.edgesList.map((e) => ({
  id: e.id,
  relation: e.relation,
  relationTerms: wiring.vocabulary?.relations?.[e.relation] ?? [],
  from: e.participants[0],
  to: e.participants[1],
  witness: e.witness,
}));

const holograph = {
  schema: "EOHolographOutput@1",
  title: "Metropolitan Code — Department Responsibilities and Measurable Harm",
  prose,
  assertions,
  beings,
  tiers: {
    holograph: prose.map((p) => ({ text: p.text, ground: "material", ref: p.ref, department: p.department })),
    shadow: prose.map((p) => ({ ground: "material", ref: p.ref })),
    echo: { at: "one ledger per department chapter; every row byte-anchored", sentences: prose.length, model: 0 },
  },
  verdict: {
    total: prose.length,
    material: prose.length,
    model: 0,
    line: `${prose.length} of ${prose.length} sentence(s) grounded in the record; 0 are the mouth's own prose.`,
  },
  overview: `63 departments · ${graph.harmReferentIds.length} harm referents · ${graph.edgesList.length} typed edges · ${prose.length} byte-anchored responsibilities. Sources: Metropolitan Code of Laws (Municode 14214) + Charter; extractor: native/organs/plans/extract.mjs; edges: EOHyperedge@1.`,
};
fs.writeFileSync(new URL("./holograph.json", import.meta.url), JSON.stringify(holograph, null, 2));

// 3. the facing page
const DATA = { ground, rows, edges: assertions, harms: beings.filter((b) => b.kind === "harm-referent"), depts: beings.filter((b) => b.kind === "department"), wiring };

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// precompute per-department rows and per-department harms
const byDept = {};
for (const r of rows) {
  (byDept[r.fields.department] ??= []).push(r);
}
const deptHarms = {};
for (const e of assertions) {
  const depName = e.from.replace(/^ref:dept:/, "").replace(/-/g, " ");
  (deptHarms[depName] ??= []).push(e);
}
const deptOrder = Object.keys(byDept).sort();

// harm referent -> departments map for the graph panel
const harmDepts = {};
for (const e of assertions) {
  const depName = e.from.replace(/^ref:dept:/, "").replace(/-/g, " ");
  (harmDepts[e.to] ??= []).push({ dep: depName, relation: e.relation });
}

const page = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Fold — Metropolitan Code — responsibilities → harm</title>
<style>
  :root { --bg:#0d0b16; --bg2:#141126; --bg3:#1b1735; --line:#2b2450; --line2:#3a3170; --ink:#ece9fb; --muted:#8f88b3; --dim:#6b6492; --violet:#a78bfa; --violet2:#8b5cf6; --violet3:#7c3aed; --ok:#4ade80; --bad:#f87171; --amber:#fbbf24; --header-bg: rgba(13,11,22,.92); }
  html[data-theme="light"] { --bg:#f8f6ff; --bg2:#fff; --bg3:#efeafb; --line:#e2ddf3; --line2:#c8bfe8; --ink:#241e3f; --muted:#5b5480; --dim:#8b84ab; --violet:#6d4bd8; --violet2:#7c3aed; --violet3:#6d28d9; --ok:#15803d; --bad:#b91c1c; --amber:#b45309; --header-bg: rgba(248,246,255,.92); }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font-family:Georgia,serif; line-height:1.6; transition:background .25s,color .25s; }
  header { position:sticky; top:0; z-index:20; background:var(--header-bg); backdrop-filter:blur(6px); border-bottom:1px solid var(--line); padding:.65rem 1.4rem; display:flex; align-items:center; gap:1rem; flex-wrap:wrap; }
  .mark { display:flex; align-items:center; gap:.55rem; font-family:ui-monospace,Menlo,monospace; font-size:.85rem; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); }
  .mark .dot { width:12px; height:12px; border-radius:3px; background:linear-gradient(135deg,var(--violet),var(--violet3)); box-shadow:0 0 12px rgba(139,92,246,.55); }
  .mark b { color:var(--ink); }
  .spacer { flex:1; }
  .status { font-family:ui-monospace,Menlo,monospace; font-size:.72rem; color:var(--dim); }
  .status .ok { color:var(--ok); }
  button { font-family:ui-monospace,Menlo,monospace; font-size:.74rem; color:var(--muted); background:var(--bg2); border:1px solid var(--line2); border-radius:6px; padding:.32rem .7rem; cursor:pointer; }
  button:hover { color:var(--ink); border-color:var(--violet2); }
  main { max-width:72rem; margin:0 auto; padding:1.4rem 1.4rem 4rem; }
  .hero { padding:1.1rem 0 1.2rem; border-bottom:1px solid var(--line); margin-bottom:1.2rem; }
  .hero h1 { margin:0 0 .3rem; font-size:1.8rem; font-weight:600; }
  .hero p { margin:.15rem 0; font-family:ui-monospace,Menlo,monospace; font-size:.76rem; color:var(--muted); }
  .verbs { display:flex; gap:.5rem 1.2rem; flex-wrap:wrap; margin-top:.8rem; font-family:ui-monospace,Menlo,monospace; font-size:.68rem; color:var(--dim); }
  .verbs .verb b { color:var(--violet); font-weight:600; text-transform:uppercase; }
  .toolbar { display:flex; gap:.5rem; flex-wrap:wrap; align-items:center; margin-bottom:1rem; }
  .toolbar input[type=text] { flex:1; min-width:200px; background:var(--bg2); border:1px solid var(--line2); border-radius:6px; color:var(--ink); font-family:ui-monospace,monospace; font-size:.74rem; padding:.35rem .6rem; }
  .pill { font-size:.74rem; padding:.2rem .7rem; border-radius:999px; border:1px solid var(--line2); color:var(--muted); display:inline-flex; align-items:center; gap:.35rem; cursor:pointer; }
  .pill.on { color:var(--violet); border-color:var(--violet2); }
  section { margin:1.2rem 0; }
  h2 { font-size:1.1rem; margin:1.4rem 0 .6rem; font-weight:600; border-bottom:1px solid var(--line); padding-bottom:.35rem; }
  .cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:.6rem; }
  .card { border:1px solid var(--line); border-radius:8px; padding:.55rem .7rem; background:var(--bg3); }
  .card h3 { margin:0 0 .2rem; font-size:.95rem; }
  .card .rel { font-family:ui-monospace,monospace; font-size:.68rem; color:var(--violet); }
  .card .meta { font-family:ui-monospace,monospace; font-size:.66rem; color:var(--dim); }
  .def a { color:var(--violet); text-decoration:none; border-bottom:1px dotted var(--violet2); }
  .def a:hover { color:var(--ink); }
  details.dept { border:1px solid var(--line); border-radius:10px; background:var(--bg2); margin:.6rem 0; }
  summary { cursor:pointer; list-style:none; padding:.5rem .8rem; font-family:ui-monospace,Menlo,monospace; font-size:.8rem; color:var(--ink); user-select:none; }
  summary::-webkit-details-marker { display:none; }
  summary::before { content:"▸ "; color:var(--violet2); }
  details[open]>summary::before { content:"▾ "; }
  summary:hover { color:var(--violet); }
  summary .meta { color:var(--dim); font-size:.68rem; margin-left:.5rem; }
  .harms { margin:.2rem .8rem .6rem; display:flex; gap:.4rem; flex-wrap:wrap; }
  .hbadge { font-size:.62rem; padding:.1rem .5rem; border-radius:999px; border:1px solid var(--line2); color:var(--muted); }
  .row { display:grid; grid-template-columns:auto 1fr auto; gap:.6rem; align-items:start; padding:.5rem .8rem; border-top:1px solid var(--line); cursor:pointer; }
  .row:hover { background:var(--bg3); }
  .row.flash { background:rgba(139,92,246,.18); }
  .row .n { font-family:ui-monospace,monospace; font-size:.62rem; color:var(--dim); padding-top:.25rem; min-width:3.2rem; }
  .row .v { font-size:.86rem; }
  .row .ref { font-family:ui-monospace,monospace; font-size:.62rem; color:var(--dim); text-align:right; padding-top:.3rem; white-space:nowrap; }
  .empty { font-family:ui-monospace,monospace; font-size:.72rem; color:var(--dim); padding:.3rem .8rem .8rem; }
  #inspector { position:fixed; inset:0; background:rgba(10,8,20,.72); display:none; align-items:center; justify-content:center; z-index:50; }
  #inspector.on { display:flex; }
  .insp-box { background:var(--bg2); border:1px solid var(--line2); border-radius:12px; max-width:54rem; width:92%; max-height:82%; overflow:auto; padding:1.1rem 1.3rem; }
  .insp-box h3 { margin:.1rem 0 .5rem; font-size:1rem; }
  .insp-verbatim { background:var(--bg3); border:1px solid var(--line); border-radius:8px; padding:.7rem .9rem; font-size:.92rem; }
  .insp-meta { font-family:ui-monospace,monospace; font-size:.72rem; color:var(--dim); margin:.6rem 0 0; }
  .insp-close { float:right; }
  .prov { display:none; }
  body.no-prov .prov { display:block; }
</style>
</head>
<body>
<header>
  <div class="mark"><span class="dot"></span><b>The Fold</b><span>·</span>metro code → harm</div>
  <div class="spacer"></div>
  <div class="status">live · <span class="ok">${rows.length} responsibilities · ${graph.edgesList.length} edges · ${graph.harmReferentIds.length} harm referents · ${Object.keys(byDept).length} departments</span></div>
  <button id="tog-theme">theme</button>
  <button id="tog-prov">provenance</button>
</header>
<main>
  <div class="hero">
    <h1>Metropolitan Code — Department Responsibilities and Measurable Harm</h1>
    <p>Every responsibility of every department, office, board and commission of the Metropolitan Government of Nashville and Davidson County — byte-anchored in the code, then attached to the measurable harms they bear on through typed edges.</p>
    <div class="verbs">
      <span class="verb"><b>relations</b>: responds_to · regulates · mitigates · enforces_against · investigates · monitors · may_cause</span>
      <span class="verb"><b>ground</b>: 68 chapters · Code of Ordinances + Charter (Municode 14214)</span>
      <span class="verb"><b>definitions</b>: Wiktionary, pulled on the fly</span>
    </div>
  </div>

  <div class="toolbar">
    <input type="text" id="gsearch" placeholder="filter responsibilities by text…">
    <span class="pill on" id="p-graph">harm graph</span>
    <span class="pill on" id="p-register">register</span>
  </div>

  <section id="s-graph">
    <h2>Harm referents → departments</h2>
    <div class="cards" id="harm-cards"></div>
  </section>

  <section id="s-register">
    <h2>The register</h2>
    <div id="depts"></div>
    <p class="empty">Click any responsibility to open its byte.</p>
  </section>

  <div class="prov">ledger: plans/metro-code/ledger/metro-code-departments.jsonl · graph: plans/metro-code/harm-graph.json · wiring: plans/metro-code/wiktionary-wiring.json · basis: deterministic extractor + duty classifier (native/organs/plans/extract.mjs) · EOHyperedge@1 via kernel/hypergraph.js</div>
</main>

<div id="inspector"><div class="insp-box">
  <button class="insp-close" id="insp-close">close</button>
  <h3 id="insp-title"></h3>
  <div class="insp-verbatim" id="insp-verbatim"></div>
  <p class="insp-meta" id="insp-meta"></p>
  <p class="insp-meta" id="insp-defs"></p>
</div></div>

<script>
const DATA = ${JSON.stringify(DATA)};
const esc = (s)=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const { ground, rows, edges, harms, depts, wiring } = DATA;
const byDept = {};
for (const r of rows) (byDept[r.fields.department] ??= []).push(r);
const depName = (ref)=>ref.replace(/^ref:dept:/,"").replace(/-/g," ");
const deptHarms = {};
for (const e of edges) (deptHarms[depName(e.from)] ??= []).push(e);

// def links for a harm id / relation
const defLinks = (termRefs) => (termRefs||[]).map(t => {
  const term = Object.keys(wiring.terms).find(k => wiring.terms[k].rest.includes(encodeURIComponent(t).toLowerCase()) || wiring.termToRef?.[k]===t);
  const key = Object.keys(wiring.terms).find(k => (wiring.termToRef && wiring.termToRef[k]===t));
  if (!key) return '';
  const u = wiring.terms[key].page;
  return '<a target="_blank" href="'+esc(u)+'">'+esc(key)+'</a>';
}).filter(Boolean).join(' · ');

// harm cards
document.getElementById('harm-cards').innerHTML = harms.map(h => {
  const conns = edges.filter(e=>e.to===h.id);
  const terms = h.terms||[];
  const termRefs = terms;
  const defs = defLinks(termRefs);
  const rowsHtml = conns.map(e =>
    '<div class="card" style="margin-top:.4rem"><span class="rel">'+esc(e.relation)+'</span> &rarr; <b>'+esc(depName(e.from))+'</b><br><span class="meta">'+esc((e.witness||[]).length)+' witness rows</span></div>'
  ).join('');
  return '<div class="card"><h3>'+esc(h.label)+'</h3><div class="def">'+defs+'</div>'+rowsHtml+'</div>';
}).join('');

// register
const deptOrder = Object.keys(byDept).sort((a,b)=>byDept[b].length-byDept[a].length);
document.getElementById('depts').innerHTML = deptOrder.map(d => {
  const rs = byDept[d];
  const hs = deptHarms[d]||[];
  const harmBadges = hs.map(e=>'<span class="hbadge" data-rel="'+esc(e.relation)+'">'+esc(e.relation)+' → '+esc((harms.find(h=>h.id===e.to)||{}).label||e.to)+'</span>').join('');
  const rowHtml = rs.map(r => {
    const [s,e2] = r.at;
    return '<div class="row" data-ref="'+esc(r.id)+'" data-dep="'+esc(d)+'" data-verbatim="'+esc(r.verbatim)+'" data-doc="'+esc(r.doc)+'" data-span="'+s+'-'+e2+'"><span class="n">'+esc(r.fields.chapter)+'</span><span class="v">'+esc(r.verbatim)+'</span><span class="ref">'+esc(r.doc.split('/').pop())+'#'+s+'-'+e2+'</span></div>';
  }).join('');
  return '<details class="dept" data-dep="'+esc(d)+'"><summary>'+esc(d)+'<span class="meta">'+rs.length+' responsibilities</span></summary><div class="harms">'+harmBadges+'</div>'+rowHtml+'</details>';
}).join('');

// open verb — click a row -> byte inspector
document.getElementById('depts').addEventListener('click', (ev)=>{
  const row = ev.target.closest('.row');
  if (!row) return;
  const file = row.dataset.doc.split('/').pop();
  const [s,e2] = row.dataset.span.split('-').map(Number);
  const g = ground[file] || '';
  const verbatim = row.dataset.verbatim;
  document.getElementById('insp-title').textContent = row.dataset.dep + ' · ' + file + '#' + s + '-' + e2;
  document.getElementById('insp-verbatim').textContent = verbatim;
  const resolved = g.slice(s,e2).replace(/\\s+/g,' ').trim();
  const match = resolved === verbatim || g.includes(verbatim);
  document.getElementById('insp-meta').innerHTML = 'byte span ' + s + '–' + e2 + ' in ground/' + esc(file) + (match ? ' · <span style="color:var(--ok)">resolves verbatim</span>' : ' · <span style="color:var(--bad)">span/verbatim mismatch</span>');
  document.getElementById('insp-defs').innerHTML = '';
  document.getElementById('inspector').classList.add('on');
});
document.getElementById('insp-close').addEventListener('click', ()=>{ document.getElementById('inspector').classList.remove('on'); });
document.getElementById('inspector').addEventListener('click', (ev)=>{ if(ev.target.id==='inspector') document.getElementById('inspector').classList.remove('on'); });

// search
const filterReg = (q)=>{
  q = q.toLowerCase();
  for (const d of document.querySelectorAll('details.dept')) {
    const rows = d.querySelectorAll('.row');
    let any = false;
    for (const r of rows) {
      const hit = !q || (r.dataset.verbatim||'').toLowerCase().includes(q) || r.dataset.dep.toLowerCase().includes(q);
      r.style.display = hit ? '' : 'none';
      if (hit) any = true;
    }
    d.style.display = any ? '' : 'none';
    if (any) d.open = true;
  }
};
document.getElementById('gsearch').addEventListener('input', (e)=>filterReg(e.target.value));

// toggles
document.getElementById('tog-theme').addEventListener('click', ()=>{
  document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
});
document.getElementById('tog-prov').addEventListener('click', ()=>{ document.body.classList.toggle('no-prov'); });
document.getElementById('p-graph').addEventListener('click', (e)=>{
  e.target.classList.toggle('on');
  document.getElementById('s-graph').style.display = e.target.classList.contains('on') ? '' : 'none';
});
document.getElementById('p-register').addEventListener('click', (e)=>{
  e.target.classList.toggle('on');
  document.getElementById('s-register').style.display = e.target.classList.contains('on') ? '' : 'none';
});
</script>
</body>
</html>`;

fs.writeFileSync(new URL("./metro-code-holograph.html", import.meta.url), page);
console.log("wrote holograph.json", JSON.stringify(holograph).length, "bytes");
console.log("wrote metro-code-holograph.html", page.length, "bytes");