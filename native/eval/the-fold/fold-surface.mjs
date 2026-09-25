// fold-surface.mjs — a clickable browser over the harness append-only log.
//
// Reads every harness-rounds-*.json + harness-samples-*.jsonl under
// RESULTS_DIR and renders ONE self-contained HTML file with:
//   • task index (20 tasks, aggregated conversion), each clickable
//   • a task profile: every run's rounds (draws, bodies, kelsen/temp,
//     verdicts), clickable to expand
//   • mouth profiles (model × candidates) aggregated from the log
//   • the EDGES: replay → projectedFrom, ant → decomposedFrom, and each
//     body's diagnosis link
// All data is embedded as JSON in one file — no server, no network.
//
// Usage: node native/eval/the-fold/fold-surface.mjs [out.html]
//   default out: native/eval/the-fold/results/fold-surface.html

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(HERE, "results");
const OUT = process.argv[2] ?? path.join(RESULTS_DIR, "fold-surface.html");

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function tempOf(kelsen) {
  if (kelsen == null) return "cold (default)";
  return `t=${(0.1 + (1 - kelsen) * 0.8).toFixed(2)}`;
}

const tasks = new Map(); // task -> { runs: [], bodies: [], mouths: Map }
const samples = [];

for (const f of fs.readdirSync(RESULTS_DIR)) {
  if (f.startsWith("harness-samples-") && f.endsWith(".jsonl")) {
    for (const line of fs.readFileSync(path.join(RESULTS_DIR, f), "utf8").split("\n")) {
      if (!line.trim()) continue;
      try { samples.push(JSON.parse(line)); } catch { /* skip */ }
    }
  }
  if (!f.startsWith("harness-rounds-") || !f.endsWith(".json")) continue;
  const base = f.slice("harness-rounds-".length, -".json".length);
  const zi = base.lastIndexOf("Z-");
  const taskId = zi >= 0 ? base.slice(zi + 2).replace(/-/g, "/") : base;
  let data;
  try { data = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, f), "utf8")); } catch { continue; }
  const meta = data && !Array.isArray(data) ? data.meta ?? {} : {};
  const rounds = Array.isArray(data) ? data : data.rounds ?? [];
  const t = tasks.get(taskId) ?? { id: taskId, runs: [], bodies: [], mouths: new Map(), ant: false, replay: false };
  const mouthKey = `${meta.model ?? "unknown"} × ${meta.candidates ?? "?"}`;
  const m = t.mouths.get(mouthKey) ?? { model: meta.model ?? "unknown", cands: meta.candidates ?? "?", draws: 0, greens: 0 };
  const run = { file: f, meta, rounds: [], draws: 0, greens: 0, edges: [] };
  if (meta.replay) { t.replay = true; run.edges.push({ kind: "replay", to: meta.projectedFrom }); }
  if (meta.role === "ant") { t.ant = true; run.edges.push({ kind: "ant→decomposedFrom", to: meta.decomposedFrom }); }
  for (const r of rounds) {
    run.rounds.push(r);
    if (r?.action === "patch" && r?.add) {
      run.draws += 1;
      m.draws += 1;
      if (r.testExitCode === 0) { run.greens += 1; m.greens += 1; }
    }
  }
  t.runs.push(run);
  t.mouths.set(mouthKey, m);
  tasks.set(taskId, t);
}

// ── render ──────────────────────────────────────────────────────────────
const rows = [...tasks.values()].sort((a, b) => a.id.localeCompare(b.id));
const totalDraws = [...tasks.values()].reduce((s, t) => s + [...t.mouths.values()].reduce((x, m) => x + m.draws, 0), 0);
const totalGreens = [...tasks.values()].reduce((s, t) => s + [...t.mouths.values()].reduce((x, m) => x + m.greens, 0), 0);

const taskCards = rows.map((t) => {
  const ms = [...t.mouths.values()];
  const dg = ms.reduce((s, m) => s + m.draws, 0);
  const gg = ms.reduce((s, m) => s + m.greens, 0);
  const best = ms.sort((a, b) => (a.greens ? a.draws / a.greens : Infinity) - (b.greens ? b.draws / b.greens : Infinity))[0];
  const runsHtml = t.runs.map((run) => {
    const roundsHtml = run.rounds.map((r) => {
      const kind = r?.action ?? "?";
      const body = r?.add ?? (r?.gap ? `[gap: ${r.gap.kind}]` : (r?.raw ?? ""));
      const verdict = r.testExitCode === 0 ? "GREEN" : (r.testExitCode != null ? "fail" : (r.gap ? "gap" : ""));
      const vClass = r.testExitCode === 0 ? "g" : "f";
      return `<div class="round" onclick="this.classList.toggle('open')">
        <div class="rhead"><span class="v ${vClass}">${verdict}</span>
          <span class="m">r${r.round ?? "?"}d${r.draw ?? "?"} ${kind} ${tempOf(r.kelsen)}</span>
          ${r.streamCut ? `<span class="tag cut">STREAM CUT</span>` : ""}
          ${r.replay ? `<span class="tag replay">REPLAY</span>` : ""}
        </div>
        <pre class="code">${esc(body)}</pre>
        ${r.testOutput ? `<pre class="out">${esc(String(r.testOutput).slice(0, 400))}</pre>` : ""}
      </div>`;
    }).join("");
    const edgeHtml = run.edges.map((e) => `<span class="edge">${e.kind}: <code>${esc(e.to ?? "")}</code></span>`).join("");
    return `<div class="run">
      <div class="runhead" onclick="this.parentElement.classList.toggle('open')">
        <span class="runfile">${esc(run.file)}</span>
        <span class="m">${run.draws} draws / ${run.greens} green</span>
        ${edgeHtml}
      </div>
      <div class="rounds">${roundsHtml}</div>
    </div>`;
  }).join("");
  return `<div class="task" id="task-${esc(t.id.replace(/\//g, "-"))}">
    <div class="taskhead" onclick="this.parentElement.classList.toggle('open')">
      <span class="tname">${esc(t.id)}</span>
      <span class="m">${dg} draws / ${gg} green</span>
      ${t.replay ? `<span class="tag replay">replayed</span>` : ""}
      ${t.ant ? `<span class="tag ant">ant</span>` : ""}
      <span class="m best">best: ${esc(best?.model ?? "?")} ${best?.greens ? `${(best.draws / best.greens).toFixed(1)} d/g` : "—"}</span>
    </div>
    <div class="runs">${runsHtml}</div>
  </div>`;
}).join("");

const mouthRows = [...new Map([...tasks.values()].flatMap((t) => [...t.mouths.entries()].map(([k, m]) => [k, m]))).values()]
  .sort((a, b) => (a.greens ? a.draws / a.greens : Infinity) - (b.greens ? b.draws / b.greens : Infinity));
const mouthHtml = mouthRows.map((m) => {
  const rate = m.greens ? (m.draws / m.greens).toFixed(1) : "—";
  return `<div class="mouth"><span class="tname">${esc(m.model)}</span><span class="m">cands=${m.cands} · ${m.draws} draws · ${m.greens} green · ${rate} d/g</span></div>`;
}).join("");

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>fold-surface — the append-only log, browsable</title>
<style>
  :root { color-scheme: dark; }
  body { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #0d1117; color: #c9d1d9; margin: 0; padding: 24px; }
  h1 { font-size: 18px; color: #e6edf3; } h2 { font-size: 14px; color: #8b949e; margin-top: 28px; border-top: 1px solid #21262d; padding-top: 12px; }
  .stats { color: #8b949e; font-size: 12px; margin-bottom: 16px; }
  .task, .mouth, .run { border: 1px solid #21262d; border-radius: 6px; margin-bottom: 6px; }
  .taskhead, .runhead { display: flex; gap: 12px; align-items: center; padding: 8px 12px; cursor: pointer; }
  .taskhead:hover, .runhead:hover { background: #161b22; }
  .tname { font-weight: 600; color: #58a6ff; }
  .m { color: #8b949e; font-size: 12px; }
  .best { margin-left: auto; }
  .runs, .rounds { display: none; }
  .task.open .runs, .run.open .rounds { display: block; padding: 4px 12px 12px; }
  .round { border-top: 1px dashed #21262d; padding: 6px 0; }
  .rhead { display: flex; gap: 10px; align-items: center; cursor: pointer; font-size: 12px; }
  .v { font-weight: 700; font-size: 10px; padding: 1px 6px; border-radius: 10px; }
  .g { background: #1f6feb22; color: #3fb950; } .f { background: #f8514922; color: #f85149; }
  .tag { font-size: 10px; padding: 1px 6px; border-radius: 10px; }
  .cut { background: #d2992222; color: #d29922; } .replay { background: #3fb95022; color: #3fb950; } .ant { background: #a371f722; color: #a371f7; }
  .code { background: #161b22; border: 1px solid #21262d; border-radius: 4px; padding: 8px; margin: 4px 0 0; overflow-x: auto; white-space: pre; font-size: 12px; color: #e6edf3; display: none; }
  .out { background: #161b22; color: #8b949e; border-radius: 4px; padding: 6px; font-size: 11px; white-space: pre-wrap; display: none; }
  .round.open .code, .round.open .out { display: block; }
  .edge { font-size: 10px; color: #a371f7; background: #a371f722; padding: 1px 6px; border-radius: 10px; }
  .edge code { color: inherit; }
  .mouth { display: flex; gap: 12px; padding: 6px 12px; }
  #search { width: 100%; box-sizing: border-box; padding: 8px 12px; margin-bottom: 16px; background: #161b22; color: #e6edf3; border: 1px solid #21262d; border-radius: 6px; font-family: inherit; }
</style></head><body>
<h1>fold-surface — the append-only log, browsable</h1>
<div class="stats">${tasks.size} tasks · ${totalDraws} draws · ${totalGreens} greens · ${[...tasks.values()].reduce((s, t) => s + t.runs.length, 0)} runs · ${samples.length} samples · generated ${new Date().toISOString()}</div>
<input id="search" placeholder="filter tasks (Basic/15, qwen, ant, replay, cut…)" oninput="filter(this.value)">
<h2>Tasks</h2>
<div id="tasks">${taskCards}</div>
<h2>Mouths (model × candidates)</h2>
${mouthHtml}
<script>
function filter(q) {
  q = q.toLowerCase();
  document.querySelectorAll(".task").forEach((el) => {
    const hay = el.textContent.toLowerCase();
    el.style.display = hay.includes(q) ? "" : "none";
  });
}
</script>
</body></html>`;

fs.writeFileSync(OUT, html);
console.log(`wrote ${OUT} (${tasks.size} tasks, ${(html.length / 1024).toFixed(0)} KB)`);