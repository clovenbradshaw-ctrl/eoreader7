#!/usr/bin/env node
// phase-report.mjs — THE WORK PRODUCT AT EVERY STEP.
//
// The watchmaker's rule this repo already states: kill a run at any boundary
// and the ledger should hold a finished instrument, not a half-essay. That is
// only true if you can SEE each phase's product. Until now the projection
// showed the prose and nothing else, so a run that failed in the middle
// looked like it had produced nothing, and a run that succeeded gave no way
// to read what each layer actually did.
//
// This reads the two records a projection already writes — the append-only
// ledger (`documents/<id>:1.jsonl`) and the wheel (`<id>_1.wheel.json`) — and
// lays every phase out in order: what it DECLARED, what it PRODUCED, what its
// gates said, and whether the product stands on its own. Nothing is computed
// here and nothing is inferred; every line on the page is a line in a record.
//
//   node native/the-fold/phase-report.mjs <docId> [--out FILE]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.join(HERE, "..", "..", "documents");

const esc = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

function readLedger(docId) {
  for (const cand of [`${docId}:1.jsonl`, `${docId}.jsonl`]) {
    const p = path.join(DOCS, cand);
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    }
  }
  return [];
}
function readWheel(docId) {
  const p = path.join(DOCS, `${docId.replace(/:/g, "_")}_1.wheel.json`);
  if (fs.existsSync(p)) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }
  return null;
}

/** Every phase, in the order the engine runs them, with the record each one
 *  leaves. `from` says which record the product is read out of, so a missing
 *  phase reads as "did not run" rather than as an empty success. */
const PHASES = [
  // Each phase reads the wheel turn when a run recorded one, and otherwise the
  // ledger lines of its roles — the pipeline runner writes every stage to the
  // ledger, the older composition path writes some of them to the wheel.
  { key: "check",     title: "Loop checks", asks: "did every loop of the spiral leave the piece at least as useful as the last?", roles: ["check"] },
  { key: "prompt",    title: "Prompt",      asks: "what was asked, exactly?",                         roles: ["prompt"] },
  { key: "register",  title: "Register",    asks: "what kind of thing is being asked for?",           roles: ["register"], wheel: "register" },
  { key: "impression",title: "Impression",  asks: "what has this instrument seen of that kind?",      roles: [], wheel: "impression" },
  { key: "discovery", title: "Framing",     asks: "what makes a good one, and in whose voice?",       roles: [], wheel: "discovery" },
  { key: "void",      title: "Void",        asks: "what must this piece answer?",                     roles: ["void", "plan"] },
  { key: "ground",    title: "Ground",      asks: "what material may this piece be measured against?", roles: ["ground"] },
  { key: "eot-draft", title: "EOT draft",   asks: "what will the piece claim, part by part, and on which bytes?", roles: ["eot-draft"] },
  { key: "eot",       title: "EOT statements", asks: "each statement, and what the flesh later taught the structure", roles: ["eot"] },
  { key: "flesh",     title: "Flesh",       asks: "each admitted sentence, and the statements it carries", roles: ["flesh"] },
  { key: "arrange",   title: "Arrangement", asks: "what shape will the piece take, and does its reasoning hold?", roles: ["arrange"] },
  { key: "floor",     title: "Floor",       asks: "what is the piece already, before any prose is written?", roles: ["floor"] },
  { key: "prosify",   title: "Prosified pass", asks: "what did the mouth write for each part, and what was kept?", roles: ["prosify", "admission"] },
  { key: "draft",     title: "The piece",   asks: "what does it say now?",                            roles: ["part"] },
  { key: "revision",  title: "Revision",    asks: "what did re-grounding and editing change?",        roles: ["revision"] },
  { key: "archon",    title: "Archons",     asks: "what does each editor find, and what does it license?", roles: ["archon"] },
  { key: "fold",      title: "Fold",        asks: "what had no job, and left the piece?",             roles: ["fold"] },
  { key: "tighten",   title: "Tighten",     asks: "what was rewritten plainly, and what was refused?", roles: ["tighten"] },
  { key: "turn",      title: "Turns",       asks: "which transitions were earned?",                   roles: ["turn"] },
  { key: "arrive",    title: "Arrival · Gebser", asks: "is the origin present in every part, none of it lost, and no single perspective with the last word?", roles: ["arrive", "concrescence"] },
  { key: "contract",  title: "Gates",       asks: "what did every layer's low and high gate say?",    roles: ["contract"] },
  { key: "summary",   title: "Run summary", asks: "what did this run cost, and where did it land?",   roles: ["summary"] },
  { key: "sources",   title: "Sources",     asks: "what is quoted, verbatim, from where?",            roles: ["citations"] },
];

function wheelTurn(wheel, key) {
  return (wheel?.turns ?? []).find((t) => t.phase === key) ?? null;
}

function renderWheelTurn(t) {
  if (!t) return `<p class="gap">did not run — no turn recorded</p>`;
  const measure = t.eva?.measure ? `<pre>${esc(JSON.stringify(t.eva.measure, null, 2))}</pre>` : "";
  const rec = t.rec ? `<pre>${esc(JSON.stringify(t.rec, null, 2).slice(0, 2600))}</pre>` : "";
  return `
    <p class="declared"><b>Declared:</b> ${esc(t.def?.satisfaction ?? "—")}</p>
    <p class="basis">${esc(t.eva?.basis ?? "")}</p>
    ${measure ? `<h4>measured</h4>${measure}` : ""}
    ${rec ? `<h4>product</h4>${rec}` : ""}`;
}

// FOLDED BY DEFAULT (user direction, 2026-09-21: "we rarely want to see the
// unfolded version of things"). A line another line superseded is folded
// away; the count of folded versions is stated so nothing is hidden.
let SUPERSEDED = new Set();
function renderLines(lines) {
  if (!lines.length) return `<p class="gap">did not run — nothing of this kind is on the ledger</p>`;
  const alive = lines.filter((l) => !SUPERSEDED.has(l.id));
  const folded = lines.length - alive.length;
  return (folded ? `<p class="basis">${folded} earlier version${folded === 1 ? "" : "s"} folded away</p>` : "") + alive.map((l) => {
    const text = String(l.text ?? "").trim();
    const empty = !text;
    return `<article class="line${empty ? " empty" : ""}">
      <h4>${esc(l.title ?? l.role)}</h4>
      ${empty ? `<p class="gap">empty</p>` : `<pre class="prose">${esc(text.slice(0, 6000))}</pre>`}
      <p class="basis"><b>${esc(l.giver ?? "")}</b>${l.basis ? ` · ${esc(l.basis)}` : ""}</p>
    </article>`;
  }).join("\n");
}

export function renderPhaseReport(docId) {
  const ledger = readLedger(docId);
  const wheel = readWheel(docId);
  const alive = new Set(ledger.filter((l) => l.supersedes).flatMap((l) => (Array.isArray(l.supersedes) ? l.supersedes : [l.supersedes])));
  SUPERSEDED = alive;
  const task = wheel?.task ?? (ledger.find((l) => l.role === "prompt")?.text ?? "");
  const body = PHASES.map((ph) => {
    const turn = ph.wheel ? wheelTurn(wheel, ph.wheel) : null;
    const lines = ledger.filter((l) => ph.roles.includes(l.role));
    if (!turn && !lines.length) return "";
    const content = turn ? renderWheelTurn(turn) : renderLines(lines);
    const count = turn ? 1 : lines.filter((l) => !SUPERSEDED.has(l.id)).length;
    const usable = turn ? 1 : lines.filter((l) => !SUPERSEDED.has(l.id) && String(l.text ?? "").trim()).length;
    return `<section>
      <header>
        <h2>${esc(ph.title)}</h2>
        <p class="asks">${esc(ph.asks)}</p>
        <p class="tally">${usable} of ${count} product${count === 1 ? "" : "s"} carry content</p>
      </header>
      ${content}
    </section>`;
  }).join("\n");
  const superseded = ledger.filter((l) => alive.has(l.id)).length;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Phase Record</title>
<style>
:root{--bg:#fbfaf8;--fg:#1b1a17;--dim:#6b675f;--rule:#e2ddd4;--card:#fff;--gap:#b4462a;--ok:#2f6b4a}
:root{--ok:#2f6b4a}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#15140f;--fg:#ece7dd;--dim:#9a948a;--rule:#2f2c25;--card:#1d1b16;--gap:#e0714f;--ok:#79b894}}
:root[data-theme="dark"]{--bg:#15140f;--fg:#ece7dd;--dim:#9a948a;--rule:#2f2c25;--card:#1d1b16;--gap:#e0714f;--ok:#79b894}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 ui-serif,Georgia,serif;padding:0 16px 96px}
main{max-width:52rem;margin:0 auto}
h1{font-size:1.6rem;margin:2.5rem 0 .2rem;line-height:1.2}
.task{color:var(--dim);margin:0 0 2rem;font-style:italic}
section{border-top:1px solid var(--rule);padding:1.6rem 0}
section header{margin-bottom:1rem}
h2{font-size:1.15rem;margin:0;letter-spacing:.01em}
.asks{margin:.15rem 0 .1rem;color:var(--dim);font-size:.92rem}
.tally{margin:0;font:600 .78rem/1.4 ui-sans-serif,system-ui;color:var(--dim);text-transform:uppercase;letter-spacing:.06em}
.line{background:var(--card);border:1px solid var(--rule);border-radius:10px;padding:.9rem 1rem;margin:.7rem 0}
.line.empty{opacity:.75}
h4{margin:0 0 .45rem;font:600 .9rem/1.35 ui-sans-serif,system-ui}
pre{white-space:pre-wrap;word-wrap:break-word;margin:.4rem 0;font:13px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;background:transparent}
pre.prose{font:16px/1.65 ui-serif,Georgia,serif}
.basis{margin:.5rem 0 0;color:var(--dim);font:12.5px/1.5 ui-sans-serif,system-ui}
.declared{margin:.2rem 0}
.gap{color:var(--gap);font:600 .86rem/1.5 ui-sans-serif,system-ui;margin:.3rem 0}
footer{color:var(--dim);font-size:.82rem;border-top:1px solid var(--rule);padding-top:1rem;margin-top:2rem}
</style></head>
<body><main>
<h1>Phase record</h1>
<p class="task">${esc(task || docId)}</p>
${body}
<footer>${esc(docId)} · ${ledger.length} ledger line(s), ${superseded} superseded · every line on this page is a line in a record, nothing is inferred</footer>
</main></body></html>`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const docId = process.argv[2];
  if (!docId) { console.error("usage: phase-report.mjs <docId> [--out FILE]"); process.exit(1); }
  const outIdx = process.argv.indexOf("--out");
  const out = outIdx > 0 ? process.argv[outIdx + 1] : path.join(DOCS, `${docId.replace(/:/g, "_")}.phases.html`);
  fs.writeFileSync(out, renderPhaseReport(docId));
  console.log(out);
}
