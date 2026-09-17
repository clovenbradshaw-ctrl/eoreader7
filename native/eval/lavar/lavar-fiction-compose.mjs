// lavar-fiction-compose.mjs — the fan-fiction passage composed from LaVar's
// own admitted readings.
//
// The correction, closed: the mechanical slot organ measured 0/90 on this
// material (ambiguous_verb — English's noun-verb conversion), so the fiction
// was composed from SVO fragments and read as nonsense. LaVar (the grader,
// LAVAR.md) reads the source like a literate adult and supplies the
// arrangements; the machine byte-verifies each and admits it through the
// real kernel (lavar-read.mjs). THIS script composes the ADMITTED notes —
// grader-verified GFP arrangements, each at its byte address — into a
// passage, with the register chosen by the prompt (output-voice.js) and the
// token-trace rule of compose.js holding: every word is an arrangement's own
// end or a declared connective. No model, no slot organ.
//
// Reads the holograph result lavar-read.mjs wrote, orders the admitted notes
// by their byte span (document order = chronology), and composes.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { compose } from "../../../../the-fold/compose.js";
import { voiceOf } from "../../organs/output-voice.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const HOLOGRAPH = join(HERE, "results", "pg2600-holograph.json");
const OUT = join(HERE, "results", "lavar-fiction.html");

const holo = JSON.parse(readFileSync(HOLOGRAPH, "utf8"));
const admitted = holo.results
  .filter((x) => x.heard?.length)
  .map((x) => ({ note: x.heard[0], span: x.span ?? { start: 0 } }))
  .sort((a, b) => (a.span?.start ?? 0) - (b.span?.start ?? 0));

const PROMPT = "Give the short precise account of the scene at the river: Napoleon's orders, the troops, and the reports.";
const makeRenderer = (prompt) => (merged, claim) => {
  const c = String(claim?.case ?? merged?.case ?? "").toUpperCase();
  if (c === "UNDETERMINED" || !c) return null;
  const v = voiceOf({ prompt, claim: { end1: claim?.end1, label: claim?.label, end2: claim?.end2 } });
  return v.text || null;
};

const items = admitted.map((a, i) => ({
  claim: { end1: a.note.end1, label: a.note.label, end2: a.note.end2, sentence: [a.note.end1, a.note.label, a.note.end2].filter(Boolean).join(" ") },
  merged: { case: "SINGLE", standing: "single" },
  offset: a.span?.start ?? i,
}));

const out = compose(items, { renderClaim: makeRenderer(PROMPT), orderBy: (a, b) => (a.offset ?? 0) - (b.offset ?? 0) });

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>LaVar's fan fiction — composed from grader-verified arrangements</title>
<style>
  :root { --paper:#0f1214; --ink:#e8e4da; --dim:#8b877d; }
  * { box-sizing:border-box; }
  body { background:var(--paper); color:var(--ink); font:15px/1.7 Georgia, serif; margin:0; padding:32px 24px 90px; }
  header, main { max-width:760px; margin:0 auto; }
  h1 { font-size:24px; margin:0 0 6px; }
  .lede { color:var(--dim); font-size:13px; line-height:1.5; }
  .prose { margin-top:20px; border-left:3px solid #2a2f34; padding-left:20px; }
  .sentence { margin:0 0 12px; }
  .meta { margin-top:18px; color:var(--dim); font:11.5px ui-monospace,Monaco,monospace; }
  .arr { color:#c2a96b; font-size:12px; }
</style>
</head>
<body>
<header>
  <h1>LaVar's fan fiction — a passage composed from grader-verified arrangements</h1>
  <p class="lede">The correction, closed. The mechanical slot organ measured 0/90 on this material (ambiguous_verb — English's noun-verb conversion), so fiction composed from its output was nonsense. LaVar (the grader, reading the source like a literate adult) supplied the arrangements; the machine byte-verified each and admitted 6 through the real kernel, refusing 3 as incomplete ("an arrangement needs two ends and something between them"). This passage is composed from those admitted notes — every word an arrangement's own end or a declared connective, register chosen by the prompt. No model, no slot organ.</p>
</header>
<main>
  <div class="prose">${out.sentences.map((s) => `<p class="sentence">${esc(s.text)}</p>`).join("") || `<p>nothing composed</p>`}</div>
  <div class="meta">${esc(out.coverageLine ? "" : "")}composed ${out.coverage.composed} of ${out.coverage.given} · ${out.coverage.withheld} withheld
  <div>arrangements: ${admitted.map((a) => `<span class="arr">${esc(a.note.end1)} —${esc(a.note.label)}→ ${esc(a.note.end2 ?? "")}</span>`).join(" · ")}</div>
  </div>
</main>
</body>
</html>`;

writeFileSync(OUT, html, "utf8");
console.log(`wrote ${OUT}`);
console.log(`admitted arrangements: ${admitted.length}`);
console.log(`composed: ${out.text}`);