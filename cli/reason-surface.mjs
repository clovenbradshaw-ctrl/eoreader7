#!/usr/bin/env node
// cli/reason-surface.mjs — THE REASONING, AS A REAL REPORT (2026-09-22).
//
// Default output: one table, a row per declared claim — its verdict, what
// was said, and where it is grounded — generated from the same real
// computed data every time (never hand-typed). 2026-09-25: cut down from a
// terminal-window page of tiles, cards and drag handles after the user
// found it overdesigned: "make it more just a series of rows". The
// nine-terrain lattice mode still exists behind --lattice.
//
// A SEPARATE driver from cli/reason.mjs (another session was concurrently
// editing that file toward a durable ledger feed when this was written;
// this imports the same organs directly — gfpClaim, lintGfp, citeGround —
// so nothing here depends on reason.mjs's own in-flight shape).
//
// VERBATIM DISCIPLINE: this report never carries a citation's `excerpt` —
// only ground/file/line/verdict/score/floor, the same structural-only rule
// reason.mjs's own console/--json output and reasoning-record.js hold (see
// that file's header for why: the one honest verbatim home for a citation
// is the real file at its own line, opened live, never a copy).
//
//   node cli/reason-surface.mjs FILE.json --out /path/to/report.html [--lattice]
import fs from "node:fs";
import path from "node:path";
import { gfpClaim, render } from "../native/kernel/gfp-claim.js";
import { lintGfp } from "../native/organs/reasoning-lint.js";
import { citeGround } from "../native/organs/ground-cite.js";

const argv = process.argv.slice(2);
const outIdx = argv.indexOf("--out");
const outPath = outIdx >= 0 ? argv[outIdx + 1] : null;
const useLattice = argv.includes("--lattice");
const file = argv.find((a, i) => i !== outIdx && i !== outIdx + 1 && !a.startsWith("--"));
const input = JSON.parse(file ? fs.readFileSync(file, "utf8") : fs.readFileSync(0, "utf8"));

const declared = (input.claims ?? []).map((c) => gfpClaim(c));
const said = (i) => input.claims[i]?.said ?? input.claims[i]?.text ?? null;
const sources = declared.map((c, i) => citeGround(c, said(i)));
const gfp = lintGfp(declared, { ...(input.declare ?? {}), strictness: "strict" });
const errors = gfp.findings.filter((f) => f.severity === "error");
const cited = sources.filter((s) => s.verdict === "cited");
const pass = errors.length === 0;

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rel = (p) => { const cwd = process.cwd(); return p && p.startsWith(cwd) ? p.slice(cwd.length + 1) : p; };
const notationOf = (c) => { try { return render(c, "case-marked"); } catch { return null; } };

function renderRows() {
  const glyph = (v) => (v === "cited" ? "✓ cited" : v === "event" ? "✓ event" : v === "missing" ? "✗ missing" : v === "unattributed" ? "? unattributed" : "· " + v);
  const tone = (v) => (v === "cited" || v === "event" ? "ok" : v === "missing" ? "bad" : v === "unattributed" ? "warn" : "dim");
  // Self-labeled and structural only, so pasted into a later chat with no
  // other context it still says what it is and where to look.
  const chatRefOf = (c, s) => [
    `grounding citation — ${s.verdict}`,
    `  claim: ${c.roles.ARG0 ?? ""} · ${c.rel} · ${c.roles.ARG1 ?? ""}`,
    `  ground: ${s.ground}`,
    s.file ? `  file: ${s.file}${s.line ? `:${s.line}` : ""}` : null,
    s.verdict === "cited" ? `  score: ${s.score} (null floor ${s.floor})` : null,
    s.verdict === "event" ? `  commit: ${s.hash} in ${s.repo} — ${s.files?.length ?? 0} file(s)` : null,
  ].filter(Boolean).join("\n");
  // render() drops polarity, so a negated claim would otherwise read as its own affirmation.
  const notation = (c) => `${notationOf(c) ?? `${c.roles.ARG0 ?? ""} ${c.rel} ${c.roles.ARG1 ?? ""}`} [${c.force}${c.polarity === "-" ? ", negated" : ""}]`;

  const saidCell = (c, i) => (said(i) ? `${esc(said(i))}<div class="dim">${esc(notation(c))}</div>` : esc(notation(c)));
  const sourceCell = (c, s) => {
    const src = (label) => `<span class="src" data-copy="${esc(chatRefOf(c, s))}" title="copy a reference for chat">${esc(label)}</span>`;
    if (s.verdict === "cited") return src(`${rel(s.file)}:${s.line}`);
    if (s.verdict === "event") return `${src(`${s.hash} · ${s.files?.length ?? 0} file(s)`)}<div class="dim">${esc(path.basename(s.repo))}</div>`;
    if (s.verdict === "unattributed") return `${src(rel(s.file))}<div class="dim">file exists; nothing in it matched</div>`;
    if (s.verdict === "missing") return `${src(rel(s.ground))}<div class="dim">${esc(s.detail ?? "nothing at this path")}</div>`;
    return `<span class="dim">${esc(s.ground)} — not a file or commit, nothing to check</span>`;
  };
  const scoreCell = (s) => (s.verdict === "cited" || s.verdict === "unattributed" ? `${s.score ?? 0} · ${s.floor ?? 0}` : "");

  const lintRows = gfp.findings.map((f) => `<tr><td class="v ${f.severity === "error" ? "bad" : "warn"}">${f.severity === "error" ? "✗" : "⚠"} ${esc(f.kind)}</td><td colspan="3">${esc(f.detail)}${f.at ? `<div class="dim">${esc(f.at)}</div>` : ""}</td></tr>`);
  const claimRows = sources.map((s, i) => {
    const c = declared[i];
    const hay = [s.verdict, s.ground, s.file, s.hash, said(i), notationOf(c)].filter(Boolean).join(" ").toLowerCase();
    return `<tr data-filter="${esc(hay)}"><td class="v ${tone(s.verdict)}">${glyph(s.verdict)}</td><td>${saidCell(c, i)}</td><td>${sourceCell(c, s)}</td><td class="n">${scoreCell(s)}</td></tr>`;
  });

  const counts = {};
  for (const s of sources) counts[s.verdict] = (counts[s.verdict] ?? 0) + 1;
  const tally = ["cited", "event", "unattributed", "missing", "unaddressed"].filter((v) => counts[v]).map((v) => `${counts[v]} ${v}`).join(", ");
  const when = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

  return `<meta charset="utf-8">
<title>Reason Grounding</title>
<style>
  :root{--bg:#fbfaf7;--fg:#24211c;--dim:#726a57;--line:#e7e1d4;--ok:#3f7a45;--bad:#a8412f;--warn:#85600e;--link:#9a5a1f;color-scheme:light;}
  @media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){--bg:#161412;--fg:#e9e3d6;--dim:#958c7a;--line:#2c2823;--ok:#8cbf86;--bad:#d27b6d;--warn:#d9b04f;--link:#e0a466;color-scheme:dark;} }
  :root[data-theme="dark"]{--bg:#161412;--fg:#e9e3d6;--dim:#958c7a;--line:#2c2823;--ok:#8cbf86;--bad:#d27b6d;--warn:#d9b04f;--link:#e0a466;color-scheme:dark;}
  *{box-sizing:border-box;}
  body{margin:0;background:var(--bg);color:var(--fg);font:13px/1.5 ui-monospace,"SF Mono",Menlo,Consolas,monospace;}
  main{max-width:1100px;margin:0 auto;padding:24px 16px;}
  header{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px 16px;margin-bottom:12px;}
  .sum{flex:1 1 auto;}
  #q{font:inherit;color:inherit;background:transparent;border:1px solid var(--line);border-radius:4px;padding:3px 8px;width:16em;max-width:100%;}
  table{width:100%;border-collapse:collapse;}
  th{text-align:left;font-weight:normal;color:var(--dim);border-bottom:1px solid var(--line);padding:4px 12px 4px 0;}
  td{vertical-align:top;border-bottom:1px solid var(--line);padding:8px 12px 8px 0;overflow-wrap:anywhere;}
  td:nth-child(3){width:34%;}
  td.v,td.n,th.n{white-space:nowrap;}
  .dim{color:var(--dim);} .ok{color:var(--ok);} .bad{color:var(--bad);} .warn{color:var(--warn);}
  .src{color:var(--link);cursor:pointer;}
  .src.copied::after{content:" ✓ copied";color:var(--ok);}
  .src.copy-failed::after{content:" ✗ copy blocked";color:var(--bad);}
  tr.hide{display:none;}
  .legend{margin-top:16px;}
  @media (max-width:640px){
    thead{display:none;}
    table,tbody,tr,td{display:block;}
    tr{border-bottom:1px solid var(--line);padding:8px 0;}
    td,td:nth-child(3){border:0;padding:2px 0;width:auto;}
    td.n:empty{display:none;}
  }
</style>
<main>
  <header>
    <div class="sum"><b>Grounding</b> · ${declared.length} claim(s)${tally ? ` — ${tally}` : ""} · <span class="${pass ? "ok" : "bad"}">${pass ? "OK" : `${errors.length} error(s)`}</span> <span class="dim">· ${esc(when)}</span></div>
    ${claimRows.length ? `<input id="q" type="text" placeholder="filter" autocomplete="off" aria-label="filter rows"><span id="count" class="dim"></span>` : ""}
  </header>
  ${lintRows.length || claimRows.length ? `<table>
    <thead><tr><th>verdict</th><th>said</th><th>source</th><th class="n">score · floor</th></tr></thead>
    <tbody>
${[...lintRows, ...claimRows].join("\n")}
    </tbody>
  </table>` : `<p class="dim">no claims declared this run</p>`}
  <p class="dim legend">cited means the claim's words beat a null floor against that part of the file — the claim is present there, not proven by it, and a paraphrase can cite. Click a source to copy a reference for chat. No source text is copied onto this page.</p>
</main>
<script>
  document.querySelectorAll('.src[data-copy]').forEach(function(el){
    el.addEventListener('click', function(){
      var flag = function(cls){ el.classList.add(cls); setTimeout(function(){ el.classList.remove(cls); }, 1400); };
      try{
        navigator.clipboard.writeText(el.getAttribute('data-copy')).then(function(){ flag('copied'); }, function(){ flag('copy-failed'); });
      }catch(e){ flag('copy-failed'); }
    });
  });
  (function(){
    var q = document.getElementById('q'), count = document.getElementById('count');
    if(!q) return;
    var rows = document.querySelectorAll('tr[data-filter]');
    q.addEventListener('input', function(){
      var t = q.value.trim().toLowerCase(), shown = 0;
      rows.forEach(function(r){
        var hide = t.length > 0 && r.getAttribute('data-filter').indexOf(t) === -1;
        r.classList.toggle('hide', hide);
        if(!hide) shown++;
      });
      count.textContent = t ? (shown + ' of ' + rows.length) : '';
    });
  })();
</script>`;
}

let html, note;
if (useLattice) {
  const { renderLatticeSurface } = await import("../native/the-fold/surface/block-surface-lattice.mjs");
  // (the nine-terrain mapping — unchanged from the earlier pass; kept
  // behind --lattice rather than removed, see this file's own header)
  const byFile1 = new Map();
  for (const s of sources) if (s.file) byFile1.set(s.file, (byFile1.get(s.file) ?? 0) + 1);
  const t1 = { docs: [...byFile1.entries()].map(([f, n]) => ({ title: path.basename(f), meta: f, meta2: `${n} claim(s) grounded here`, basis: "resolved by native/organs/ground-cite.js::citeGround" })) };
  const verdictCounts = {}; for (const s of sources) verdictCounts[s.verdict] = (verdictCounts[s.verdict] ?? 0) + 1;
  const t2 = { kinds: Object.entries(verdictCounts).map(([kind, count]) => ({ kind, label: kind, count })), categories: [...new Set(declared.map((c) => c.rel))] };
  const entityCounts = new Map(); for (const c of declared) for (const v of Object.values(c.roles ?? {})) entityCounts.set(v, (entityCounts.get(v) ?? 0) + 1);
  const t3 = { beads: [...entityCounts.entries()].map(([name, count]) => ({ name, count })), splits: [], note: `${entityCounts.size} distinct role-value(s) across ${declared.length} claim(s)` };
  const byFile4 = new Map();
  for (let i = 0; i < declared.length; i++) { const c = declared[i], s = sources[i]; const key = s.file ?? `(${s.verdict}: ${c.ground})`; if (!byFile4.has(key)) byFile4.set(key, []); byFile4.get(key).push({ kind: s.verdict, ref: s.ref ?? c.ground, verbatim: `${c.roles.ARG0 ?? ""} · ${c.rel} · ${c.roles.ARG1 ?? ""}`.trim(), chips: [c.force], basis: s.verdict === "cited" ? `score ${s.score} vs floor ${s.floor}` : s.verdict }); }
  const t4 = { docs: [...byFile4.entries()].map(([title, rows]) => ({ title, rows })) };
  const t5 = { blocks: [{ title: "citation scores", meta: `${cited.length}/${sources.length}`, html: cited.length ? `<table><tr><th>ground</th><th class="num">score</th><th class="num">floor</th></tr>${cited.map((s) => `<tr><td>${esc(s.ground)}</td><td class="num">${s.score}</td><td class="num">${s.floor}</td></tr>`).join("")}</table>` : `<p class="empty">none</p>` }] };
  const grounds6 = [...new Set(declared.map((c) => c.ground))];
  const nodeAt = new Map(grounds6.map((g, i) => { const cols = Math.max(1, Math.ceil(Math.sqrt(grounds6.length))); return [g, { x: 70 + (i % cols) * 140, y: 60 + Math.floor(i / cols) * 90 }]; }));
  const t6 = { lenses: [], svg: { note: "nodes are grounds, edges are claims", nodes: grounds6.map((g) => ({ x: nodeAt.get(g).x, y: nodeAt.get(g).y, label: g.length > 24 ? `…${g.slice(-22)}` : g })), edges: declared.filter((c) => nodeAt.has(c.ground)).map((c) => { const p = nodeAt.get(c.ground); return { x1: p.x, y1: p.y, x2: p.x, y2: p.y, mx: p.x, my: p.y - 20, label: c.rel }; }) } };
  const t7 = { note: "always self:model — nothing here was read by the engine out of prose", prose: declared.map((c, i) => ({ ground: "mouth", tag: "self:model", text: said(i) ?? `${c.roles.ARG0 ?? ""} ${c.rel} ${c.roles.ARG1 ?? ""}`, ref: null, gapNote: sources[i]?.verdict === "cited" ? `independently cited at ${sources[i].file}:${sources[i].line}` : "no independent citation" })) };
  const t8 = { lensPills: Object.keys(verdictCounts), lighting: [] };
  const t9 = { worldviews: [{ label: "eoreader7 GFP core", on: true }], note: "the reasoner never grades itself", strata: [], seal: { pass, text: pass ? "PASS" : `${errors.length} ERROR` }, checks: [{ ok: pass, text: `${errors.length} GFP contradiction(s)` }, { ok: sources.every((s) => s.verdict !== "missing"), text: `${sources.filter((s) => s.verdict === "missing").length} ground(s) resolve to no real file` }, { ok: true, text: `${cited.length}/${sources.length} claim(s) earned a real citation` }], prov: "kernel/reasoning-lint.js::lintGfp + organs/ground-cite.js::citeGround" };
  html = renderLatticeSurface({ def: { title: "reason.mjs — grounding lattice", sub: `${declared.length} claim(s) · ${cited.length}/${sources.length} cited · gate ${pass ? "PASS" : "REFUSE"}`, mark: "reason-surface", verbs: [{ word: "LINT", text: "GFP consistency" }, { word: "CITE", text: "a real file per claim" }, { word: "SEAL", text: "pass only when nothing is contradicted" }] }, t1, t2, t3, t4, t5, t6, t7, t8, t9, status: { left: "nine terrains, one instance", ok: pass ? "sealed" : "refused" } });
  note = "lattice";
} else {
  html = renderRows();
  note = "rows";
}

if (outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html);
  console.log(`reason-surface (${note}): wrote ${html.length} bytes to ${outPath}`);
} else {
  process.stdout.write(html);
}
