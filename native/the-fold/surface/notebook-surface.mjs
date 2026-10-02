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
import { audit, auditText } from "./notebook-audit.mjs";
import { exploreColumn, candidateFor, pheromone, loadTrails } from "./notebook-swarm.mjs";
import { renderPage, mdToHtml } from "./notebook-views.mjs";
export { renderPage, mdToHtml };
import * as L from "./notebook-learn.mjs";
import { learnedDir } from "../../organs/hard-read.js";
import { toIpynb, fromIpynb } from "./notebook-ipynb.mjs";
import { phrase, statusOf, promote, support, STATUSES } from "./bench.mjs";
import { resolveHandles, labelOf } from "./handles.mjs";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
import { load, save } from "./notebook-store.mjs";
import { openWorkspace } from "./notebook-workspace.mjs";
import { datasetOf, search as dsSearch, label as dsLabel, summary as dsSummary } from "./notebook-dataset.mjs";
export { load, save };

let toolsCache;
async function toolsText(st) { if (toolsCache) return toolsCache; const r = runPython("tools()", {}, { timeoutMs: 20000 }); return (toolsCache = r.output); }


// A model may only POINT here (choose among methods already learned). WRITING a new method is `mouth`, and goes through the gate.
async function askModel({ question, skills, columns }) {
  // 2026-10-01: the draw address is the mouth (ER7_MOUTH_URL, Penelope) — her
  // admission, then the bridge executes; the surface never draws past her.
  const url = process.env.ER7_MOUTH_URL ?? process.env.ER7_OLLAMA_URL, model = process.env.ER7_NB_MODEL;
  if (!url || !model) throw new Error("no model configured (ER7_OLLAMA_URL / ER7_NB_MODEL)");
  const schema = { type: "object", properties: { skills: { type: "array", items: { enum: skills.map((r) => r.id) } }, columns: { type: "array", items: { enum: columns } } }, required: ["skills", "columns"] };
  const r = await fetch(`${url}/api/chat`, { method: "POST", body: JSON.stringify({ model, stream: false, format: schema, options: { temperature: 0 }, messages: [{ role: "user", content: `Choose which learned methods answer the question, and which columns. Question: ${question}\nMethods:\n${skills.map((x) => `${x.id}: ${x.desc}`).join("\n")}\nColumns: ${columns.join(", ")}` }] }) });
  return JSON.parse((await r.json()).message.content);
}
const MAX_RUNS = 80; // declared: one question may spend at most this many cell runs


const SWARM_KEEP = 6; // declared: at most this many of the colony's finds per question are put to the gate
async function swarmFor(st, p, text, dir, ctx) {
  const cols = p.columns, reports = [], cands = [];
  for (const col of cols) {
    let r; try { r = await exploreColumn({ files: st.files, file: p.file, col, dir, rounds: ctx.swarm?.rounds, ants: ctx.swarm?.ants }); } catch (e) { return { error: String(e.message) }; }
    const meta = { run: r.run, tried: r.tried, ceiling: r.ceiling };
    reports.push(`- ${col}: ${r.tried} pipelines tried by ${r.log.length} generations of ants (trails ${r.trailsBefore} → ${r.trailsAfter}); chance ceiling z = ${r.ceiling.shuffle.toFixed(1)} (shuffle) / ${r.ceiling.phase.toFixed(1)} (phase); ${r.structures.length ? `${r.structures.length} cleared it — strongest: ${r.structures[0].gloss} beats the ${r.structures[0].null} null, z = ${r.structures[0].z.toFixed(1)}` : "NOTHING cleared it"}`);
    for (const s of r.structures) cands.push({ s, meta, col });
  }
  cands.sort((a, b) => (b.s.null === "phase") - (a.s.null === "phase") || b.s.z - a.s.z);
  const admitted = [], refused = [], seen = new Set();
  for (const { s, meta, col } of cands) {
    if (admitted.length >= SWARM_KEEP) break;
    const c = candidateFor(s, meta), order = [col, ...p.numeric.filter((x) => x !== col)];
    const g = L.admit(c, { file: p.file, cols: order, files: st.files });
    if (!g.ok) { refused.push(`${s.gloss} vs ${s.null} (${col}): ${g.reason.slice(0, 120)}`); continue; }
    const rep = g.evidence.runs.find((x) => x.role === "check"); // the colony chose it on the FIRST half; the check re-tests on the SECOND
    if (!rep?.result) { refused.push(`${s.gloss} vs ${s.null} (${col}): did NOT replicate on the held-out second half (z was ${s.z.toFixed(1)} in the search)`); continue; }
    const stored = L.store(dir, c, { question: text, mouth: c.by, file: p.file }, g.evidence);
    if (seen.has(stored.id)) continue; seen.add(stored.id); admitted.push(L.library(dir).find((k) => k.id === stored.id));
  }
  const note = `**The colony searched** (${cols.join(", ")}; first half of each series only, the check re-tests on the second half)\n\n${reports.join("\n")}${admitted.length ? `\n\n**Admitted through the gate** (${admitted.length}): ${admitted.map((k) => k.name).join("; ")}` : ""}${refused.length ? `\n\n**Refused by the gate** (${refused.length}): ${refused.join("; ")}` : ""}`;
  return { skills: admitted, note };
}

async function askTurn(st, by, text, ctx = {}, b_force = false) {
  const P = "model:planner", dir = ctx.dir ?? learnedDir();
  const files = Object.entries(st.files).map(([name, f]) => ({ name, tables: f.tables }));
  const p = await plan(text, files, { library: L.library(dir), ask: process.env.ER7_OLLAMA_URL ? askModel : null });
  if (p.refusal) return { error: p.refusal };
  let taught = null, skills = p.skills, via = p.via;
  const offNote = p.offMatches?.length ? `\n\n**Switched off, so NOT used:** ${p.offMatches.map((k) => `${k.name} (${k.id}; ${k.switch?.by ?? "conceded"}${k.switch?.why ? `: ${k.switch.why}` : ""})`).join("; ")}` : "";
  if (!skills.length && p.offMatches?.length) return { error: `the method that answers this is switched off: ${p.offMatches.map((k) => `${k.name} (${k.id}) — ${k.switch?.by ?? "conceded"}${k.switch?.why ? `: ${k.switch.why}` : ""}`).join("; ")}.\nI will not write a new one around a switch. /skill ${p.offMatches[0].id} on because <why>  turns it back on.` };
  let swarmNote = "";
  if (!skills.length || b_force) {
    const mouth = b_force ? null : (ctx.mouth ?? L.ollamaMouth());
    if (mouth) {
      const g = await L.generate({ question: text, cols: p.columns.length ? [...p.columns, ...p.numeric.filter((c) => !p.columns.includes(c))] : p.numeric, file: p.file, files: st.files, mouth, dir, tools: L.toolDocs(), examples: L.library(dir).filter((s) => s.effectiveOn).slice(-2) });
      if (!g.ok) return { error: `a method was proposed and refused ${g.attempts.length} time(s); the last reason: ${g.reason}\n${g.attempts.map((a, i) => `  try ${i + 1}: ${a.ok ? "admitted" : a.reason}`).join("\n")}` };
      skills = [L.library(dir).find((s) => s.id === g.id)]; taught = g; via = `a method learned just now from a model (${g.attempts.length} attempt(s)) — it passed the gate: it ran, was deterministic, and its control failed`;
    } else {
      if (ctx.swarm === false) return { error: `I have no learned method for that question, and no model to write one.\nTeach me: write a check and a control cell for a claim (/claim, /check, /control), then  /learn <check cell> <control cell> as <what it answers>.\nOr point me at a model: set ER7_OLLAMA_URL and ER7_NB_MODEL.\nWhat I have learned so far: ${L.library(dir).filter((s) => s.effectiveOn).map((s) => s.name).join("; ") || "nothing yet"}.` };
      // No method and no model: the colony searches the data itself — and what it finds must pass the same gate before it is believed.
      const sw = await swarmFor(st, p, text, dir, ctx); if (sw.error) return sw;
      skills = sw.skills; swarmNote = sw.note; taught = sw.skills.length ? { swarm: true } : null;
      via = b_force ? "you asked me to explore: an ant colony searched the data for structure, its finds went through the gate" : "no learned method matched and no model was available, so an ant colony searched the data for structure; its finds went through the gate";
      if (!skills.length) {
        let s0 = st; const id = `ask${st.nb.entries.filter((e) => e.kind === "cell" && e.type === "markdown").length + 1}`;
        const r0 = addCell(s0, { id, type: "markdown", source: `**Asked:** ${text}\n\n${swarmNote}\n\nNothing cleared the bar, so there is nothing to claim. That is a result about this file, not a failure to look.`, author: P }); if (r0.error) return r0;
        return { state: r0.state, selected: id, notice: null };
      }
    }
  }
  const runs = p.columns.length * skills.length * 2;
  if (runs > MAX_RUNS) return { error: `that would be ${runs} runs (the limit is ${MAX_RUNS}); name fewer columns or say which analysis` };
  let s = st; const put = (o) => { let id = o.id; while (cellOf(s.nb, id)) id += "x"; const r = addCell(s, { ...o, id, author: P }); if (r.error) throw new Error(r.error); s = r.state; return id; };
  const run = (id) => { const r = runCell(s, id); if (r.error) throw new Error(r.error); s = r.state; return r.exec; };
  const n0 = s.nb.entries.filter((e) => e.kind === "cell" && e.type === "markdown").length + 1;
  const prior = ctx.ws ? dsSearch(datasetOf(ctx.ws), text, { k: 3, excludeConv: ctx.cid, kind: "generated" }) : [];
  const priorNote = prior.length ? `\n\n**Earlier in this workspace (generated — context, NOT evidence):** ${prior.map((i) => `${dsLabel(i)} ${String(i.text).replace(/\s+/g, " ").slice(0, 110)}`).join(" | ")}` : "";
  put({ id: `ask${n0}`, type: "markdown", source: `**Asked:** ${text}\n\n**Method${skills.length > 1 ? "s" : ""}:** ${skills.map((k) => `${k.name} (${k.id}${k.conceded ? ", conceded" : ""}; learned from ${k.lineage?.mouth ?? "?"}, used ${k.uses}×)`).join("; ")} on ${p.columns.join(", ")} of ${p.file}. Chosen by: ${via}.${p.matched.length ? ` Matched on: ${p.matched.join(", ")}.` : ""}${offNote}${priorNote}${swarmNote ? `\n\n${swarmNote}` : ""}${p.unmatched.length ? `\n\n**Not understood (matched nothing):** ${p.unmatched.join(", ")}` : ""}\n\nEvery claim below is proposed by the planner and only as wide as its check; each has a control that fails. None of the methods is built in — see /skills.` });
  const findings = [], claims = [], quality = new Map();
  for (const col of p.columns) for (const k of skills) {
    const tag = `${col}-${k.id.slice(0, 6)}`, m = { id: k.id, name: k.name, codeSha: k.codeSha }, cid = put({ id: `k-${tag}`, type: "claim", source: L.fill(k.claim, p.file, col), method: m });
    const e = run(put({ id: `chk-${tag}`, type: "code", lang: "python", source: L.fill(k.check, p.file, col), for: cid, role: "check", method: m }));
    run(put({ id: `ctl-${tag}`, type: "code", lang: "python", source: L.fill(k.control, p.file, col), for: cid, role: "control", method: m }));
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
  if (b.op === "explore") return askTurn(st, by, b.text || "explore this file for structure", ctx, true);
  if (b.op === "learn") return learnOp(st, by, b, ctx);
  if (b.op === "skills") { const lib = L.library(ctx.dir ?? learnedDir()); return { notice: lib.length ? lib.map((k) => `${k.id}  ${k.conceded ? "[CONCEDED] " : k.effectiveOn ? "[on] " : "[OFF] "}${k.name}\n   ${k.claim}\n   learned from ${k.lineage?.mouth ?? "?"} on "${k.lineage?.question ?? ""}" · used ${k.uses}× · ${k.evidence?.generalisation ?? ""}${k.switch?.decided ? ` · switch: ${k.switch.on ? "on" : "off"} by ${k.switch.by}${k.switch.why ? ` (${k.switch.why})` : ""}` : ""}`).join("\n") : "nothing learned yet — ask a question (a model writes and the gate admits), or /learn from your own cells" }; }
  if (b.op === "skill") {
    const dir = ctx.dir ?? learnedDir(), lib = L.library(dir);
    if (b.which === "all") { const r = L.switchAll(dir, b.on, by, b.why); return r.error ? r : { state: st, notice: `all learned analyses are now ${b.on ? "ON" : "OFF"} (${by}${b.why ? `: ${b.why}` : ""}) — recorded in the skill-toggles ledger` }; }
    const hit = lib.filter((k) => k.id.startsWith(b.which) || k.name.toLowerCase().includes(String(b.which).toLowerCase()));
    if (hit.length !== 1) return { error: hit.length ? `"${b.which}" matches ${hit.length} methods — use an id: ${hit.map((k) => k.id).join(", ")}` : `no learned method matches "${b.which}" — /skills lists them` };
    const r = L.switchAnalysis(dir, hit[0].id, b.on, by, b.why); return r.error ? r : { state: st, notice: `${hit[0].name} (${hit[0].id}) is now ${b.on ? "ON" : "OFF"} — ${by}${b.why ? `: ${b.why}` : ""}. Recorded in the skill-toggles ledger.` };
  }
  if (b.op === "dataset") { if (!ctx.ws) return { error: "no workspace here" }; const items = datasetOf(ctx.ws), sm = dsSummary(items), hits = b.query ? dsSearch(items, b.query, { k: 10 }) : items.slice(-12).reverse(); return { notice: `workspace dataset: ${sm.source} source(s), ${sm.generated} generated item(s) (${Object.entries(sm.by).map(([k, v]) => `${v} ${k}`).join(", ")}) across ${ctx.ws.list(true).length} conversation(s)\nGenerated items are context about what was done — never evidence for themselves.\n\n${b.query ? `matching "${b.query}":` : "most recent:"}\n${hits.map((i) => `${dsLabel(i)}\n   ${String(i.text).replace(/\s+/g, " ").slice(0, 200)}`).join("\n") || "(nothing matches)"}` }; }
  if (b.op === "audit") return { notice: auditText(audit(st, ctx.dir ?? learnedDir())) };
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


/** notebookHandler({ dir, by, learned, base, skillsBase, swarm, mouth }) -> async (req, res, pathname, url) => handled?
 *  The notebook as a mountable route set, over a WORKSPACE of conversations (notebook-workspace.mjs): each its own ledger, each flagged
 *  chat / generate / notebook, forkable. `?c=<id>` (GET) or `c` in the body (POST) picks the conversation; the first open one otherwise. */
export function notebookHandler({ dir, by, learned = learnedDir(), base = "", skillsBase = null, swarm, mouth }) {
  const ws = openWorkspace(dir); if (!ws.list(true).length) ws.create({ type: "notebook", by });
  const ctx = { dir: learned, ...(swarm !== undefined ? { swarm } : {}), ...(mouth !== undefined ? { mouth } : {}) };
  const pick = (id) => { const open = ws.list(); return open.find((c) => c.id === id) ?? open[0] ?? (ws.create({ type: "notebook", by }), ws.list()[0]); };
  const WS_OPS = { "ws-new": (b, c) => { const r = ws.create({ type: b.type, title: b.title, by }); return r.error ? r : { goto: r.id }; }, "ws-fork": (b, c) => { const r = ws.fork(c.id, { at: b.at ?? "end", title: b.title, by }); return r.error ? r : { goto: r.id, notice: `forked at ${b.at ?? "the end"}: ${r.entries} entries carried (same seals); ${r.notCarried ? `${r.notCarried} promotion(s) stayed with the parent — decisions do not travel` : "no promotions to leave behind"}` }; },
    "ws-retype": (b, c) => { const r = ws.retype(c.id, b.type, by); return r.error ? r : { notice: null }; }, "ws-rename": (b, c) => { const r = ws.rename(c.id, b.title, by); return r.error ? r : {}; },
    "ws-close": (b, c) => { const r = ws.close(c.id, by); if (r.error) return r; return { goto: (ws.list()[0] ?? pick()).id }; } };
  return async (req, res, p, url) => {
    if (req.method === "POST" && p === "/api") {
      let body = ""; for await (const c of req) body += c;
      let b = {}, r; try { b = JSON.parse(body); const c = pick(b.c);
        if (WS_OPS[b.op]) r = WS_OPS[b.op](b, c); else { const st = ws.state(c.id); r = await act(st, by, b, { ...ctx, ws, cid: c.id }); if (r.state) ws.save(c.id, r.state); }
      } catch (e) { r = { error: String(e.message) }; }
      res.setHeader("content-type", "application/json"); res.end(JSON.stringify({ error: r.error ?? null, notice: r.notice ?? null, selected: r.selected ?? null, goto: r.goto ?? null })); return true;
    }
    if (p === "/ipynb") { const c = pick(url.searchParams.get("c")); res.setHeader("content-type", "application/json"); res.end(JSON.stringify(toIpynb(ws.state(c.id)), null, 1)); return true; }
    if (p === "/") {
      const q = url.searchParams, c = pick(q.get("c")), st = ws.state(c.id), par = c.parent ? ws.get(c.parent) : null;
      const lineage = par ? `forked from “${esc(par.title)}” (${esc(par.id)}) after ${esc(c.forkedAt)} — the first ${st.nb.entries.length ? "entries" : "entries"} are the parent's own, with the same seals; ${c.notCarried ? `${c.notCarried} promotion(s) were not carried` : "no promotions were left behind"}` : null;
      res.setHeader("content-type", "text/html");
      res.end(renderPage(st, { live: true, by, sel: q.get("sel") || null, style: q.get("style") || c.type, dir: learned, drawer: q.get("drawer") === "1", tab: q.get("tab") || "skills", base, skillsBase, tabs: ws.list(), current: c.id, lineage }));
      return true;
    }
    return false;
  };
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
  } else if (cmd === "render") { fs.writeFileSync(rest[0], renderPage(st, { style: arg("--style", "notebook"), dir: arg("--learned", learnedDir()), drawer: arg("--drawer", "") === "1", tab: arg("--tab", "skills") })); console.log("wrote", rest[0]); }
  else if (cmd === "export") { fs.writeFileSync(rest[0], JSON.stringify(toIpynb(st), null, 1)); console.log("wrote", rest[0]); }
  else if (cmd === "import") { const r = fromIpynb(JSON.parse(fs.readFileSync(rest[0], "utf8")), { author: by, state: st }); save(dir, r.state); console.log("imported", r.state.nb.entries.length, "entries;", r.notes.length, "note(s)"); }
  else if (cmd === "serve") {
    const h = notebookHandler({ dir, by, learned: arg("--learned", learnedDir()) }), port = Number(arg("--port", 8960));
    http.createServer(async (req, res) => { const url = new URL(req.url, "http://x"); if (!(await h(req, res, url.pathname, url))) { res.statusCode = 404; res.end("not found"); } }).listen(port, "127.0.0.1", () => console.log(`notebook on http://127.0.0.1:${port} as ${by}`));
  } else { console.error("usage: see header"); process.exit(1); }
}
