#!/usr/bin/env node
// cli/reason-surface.mjs — THE REASONING, AS A REAL REPORT (2026-09-22).
//
// Default output: a citation-terminal report — the terminal-window
// aesthetic already approved earlier this session, generated from the
// SAME real computed data every time (never hand-typed). The user, after
// trying the nine-terrain lattice: "go back aesthetically and just have it
// focused on the grounding citations rather than all the terrains" — four
// real claims spread thin across nine mostly-empty sections, in
// block-surface-lattice.mjs's own violet/serif theme, wasn't it. That
// lattice mode still exists — pass --lattice — because it did work
// mechanically and may earn its place on a bigger claim set; it is simply
// not the default anymore.
//
// A SEPARATE driver from cli/reason.mjs (another session was concurrently
// editing that file toward a durable ledger feed when this was written;
// this imports the same organs directly — gfpClaim, lintGfp, citeGround —
// so nothing here depends on reason.mjs's own in-flight shape).
//
// VERBATIM DISCIPLINE: this report never carries a citation's `excerpt` —
// only ground/file/line/url/ref/verdict/score/floor, the same structural-
// only rule reason.mjs's own console/--json output and reasoning-record.js
// hold (see that file's header for why: the one honest verbatim home for a
// citation is the real file at its own line, opened live, never a copy).
// Nothing generated here needed an excerpt in the first place, so this
// file is safe to read back and inspect, unlike a citation's own bytes.
//
//   node cli/reason-surface.mjs FILE.json --out /path/to/report.html [--lattice]
import fs from "node:fs";
import path from "node:path";
import { gfpClaim } from "../native/kernel/gfp-claim.js";
import { lintGfp } from "../native/organs/reasoning-lint.js";
import { citeGround, polarityControl, fileUrl } from "../native/organs/ground-cite.js";

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
// Ground findings and the polarity control, computed here the same way
// reason.mjs computes them — this is a SEPARATE driver (see this file's
// own header on why), so it does not inherit them for free. Left out of
// this Findings section for a real stretch of this file's own history,
// caught while wiring the guard finding in: a finding nobody can see is
// not a disclosure.
const groundFindings = sources
  .filter((s) => s.verdict === "missing" || s.verdict === "unattributed")
  .map((s) => ({ kind: `ground_${s.verdict}`, severity: "warn", at: s.ground, detail: s.detail ?? (s.verdict === "missing" ? `no file exists at this ground — expected if this turn is CREATING ${s.ground}; otherwise the address may be wrong` : `${s.file} is real, but this claim's own words do not beat chance against it (score ${s.score ?? 0} vs floor ${s.floor ?? 0}) — the address exists; nothing here confirms this claim's content is actually there`) }));
const polarityChecks = declared.map((c, i) => sources[i].verdict === "cited" ? polarityControl(c, said(i), sources[i]) : null);
const guardFindings = polarityChecks
  .map((pc, i) => (pc?.checked && !pc.reachable) ? { kind: "ground_unreachable_guard", severity: "warn", at: declared[i].ground, detail: `this citation does not distinguish the claim from its own denial — read "cited" as presence in the file, never as support for what the claim says` } : null)
  .filter(Boolean);
const allFindings = [...gfp.findings, ...groundFindings, ...guardFindings];
const errors = allFindings.filter((f) => f.severity === "error");
const warns = allFindings.filter((f) => f.severity === "warn");
const cited = sources.filter((s) => s.verdict === "cited");
const pass = errors.length === 0;

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rel = (p) => { const cwd = process.cwd(); return p && p.startsWith(cwd) ? p.slice(cwd.length + 1) : p; };

// ── the case-marked GFP notation (kernel/gfp-claim.js's own render, reused
//    the same way reasoning-record.js does — "the claim's own words, never
//    a paraphrase") ──────────────────────────────────────────────────────
import { render } from "../native/kernel/gfp-claim.js";
const notationOf = (c) => { try { return render(c, "case-marked"); } catch { return null; } };

function renderCitationTerminal() {
  const badgeClass = (v) => (v === "cited" || v === "event" ? "cited" : v === "missing" ? "missing" : "unaddressed");
  const badgeGlyph = (v) => (v === "cited" ? "✓ cited" : v === "event" ? "✓ event" : v === "missing" ? "✗ missing" : v === "unattributed" ? "? unattributed" : "· " + v);

  const findingsHtml = allFindings.length
    ? allFindings.map((f) => `
      <div class="finding">
        <div class="ico">${f.severity === "error" ? "✗" : "⚠"}</div>
        <div>
          <span class="kind">${esc(f.kind)}</span><br>
          <span class="detail">${esc(f.detail)}</span>
          ${f.at ? `<div class="at">at ${esc(f.at)}</div>` : ""}
        </div>
      </div>`).join("")
    : `<p class="dim-line">no findings — every declared claim is internally consistent</p>`;

  // A key for this exact claim set, so a saved drag order never gets
  // silently applied to a DIFFERENT run's cards (only ever a per-viewer
  // convenience — artifact-design doctrine — never state this session
  // reads back or relies on).
  const orderKey = "reason-surface-order:" + declared.map((c) => c.ground + "|" + c.rel).join(",").length + ":" + sources.length;
  // The chat-ready reference: self-labeled plain text, structural only
  // (claim/verdict/ground/file — never an excerpt), so pasting it into a
  // FUTURE chat with no other context still tells Claude what it is and
  // where to look, the way a bare path:line pasted alone would not.
  const chatRefOf = (c, s) => [
    `grounding citation — ${badgeGlyph(s.verdict).replace(/^[✓✗?·]\s*/, "")}`,
    `  claim: ${c.roles.ARG0 ?? ""} · ${c.rel} · ${c.roles.ARG1 ?? ""}`,
    `  ground: ${s.ground}`,
    s.file ? `  file: ${s.file}${s.line ? `:${s.line}` : ""}` : null,
    s.verdict === "cited" ? `  score: ${s.score} (null floor ${s.floor})` : null,
    s.verdict === "event" ? `  commit: ${s.hash} in ${s.repo} — ${s.files?.length ?? 0} file(s)` : null,
  ].filter(Boolean).join("\n");

  const sourcesHtml = sources.map((s, i) => `
    <div class="card" draggable="true" data-idx="${i}" data-filter="${esc((rel(s.ground) ?? s.ground) + " " + s.verdict + " " + (s.file ? path.basename(s.file) : s.hash ? s.hash : "")).toLowerCase()}">
      <span class="drag-handle" title="drag to reorder">⠿</span>
      <button class="chatbtn" title="copy a chat-ready reference" data-copy="${esc(chatRefOf(declared[i], s))}">⌘</button>
      <span class="badge ${badgeClass(s.verdict)}">${badgeGlyph(s.verdict)}</span>
      <div class="ground">ground: <b>${esc(rel(s.ground) ?? s.ground)}</b></div>
      ${s.verdict === "event"
        ? `<button class="locbtn" data-copy="${esc(s.hash)} (${esc(s.repo)})"><span>${esc(s.hash)}</span><span class="copy-ico">⧉ copy</span></button>
           <div class="dim-line">${s.files?.length ?? 0} file(s) — verified against git directly, no relevance scoring: a commit either happened or it didn't</div>`
        : s.file
        ? `<button class="locbtn" data-copy="${esc(s.file)}:${s.line ?? "?"}"><span>${esc(path.basename(s.file))}:${s.line ?? "?"}</span><span class="copy-ico">⧉ copy</span></button>
           ${s.verdict === "cited" ? `<div class="score-row"><span><b>score</b> ${s.score}</span><span><b>floor</b> ${s.floor}</span></div>` : `<div class="dim-line">file exists, this claim's own words did not beat it</div>`}
           ${polarityChecks[i]?.checked && !polarityChecks[i].reachable ? `<div class="guard-note">⚑ presence only — not tested against its own denial</div>` : ""}`
        : `<div class="dim-line">${s.detail ?? (s.verdict === "missing" ? "no file at this address" : "not a filesystem ground — not a failure")}</div>`}
    </div>`).join("");

  const recordHtml = declared.length
    ? declared.map((c) => `<div class="rline"><span class="role">${esc(c.roles.ARG0 ?? "")}</span>·ARG0 <span class="rel">${esc(c.rel)}</span>·REL <span class="role">${esc(c.roles.ARG1 ?? "")}</span>·ARG1  <span class="g">[${c.force}]</span></div>`).join("\n")
    : `<div class="dim-line">no claims declared this run</div>`;

  return `<title>Reason Grounding</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>
  :root{
    --bg:#f6f1e7; --surface:#fffdf9; --surface-2:#f0e9da; --surface-3:#e6dcc6;
    --border:#d8cbac; --border-soft:#e6dcc6; --text:#2b2519; --text-dim:#6b6046; --text-faint:#948667;
    --accent:#a8672e; --accent-soft:#f0deb9; --ok:#4c7a4f; --ok-soft:#e2ecdf; --warn:#96701a; --warn-soft:#f2e6c4;
    --bad:#a34a3c; --bad-soft:#f2ded8; --neutral:#54697a; --neutral-soft:#e2eaee;
    --code-role:#2f6a8a; --record-bg:#ece3cd; --window-shadow:0 20px 45px -25px rgba(60,45,20,0.35), 0 0 0 1px rgba(60,45,20,0.04);
    color-scheme: light;
  }
  @media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){
    --bg:#15130f; --surface:#1d1a15; --surface-2:#25211a; --surface-3:#2e2921;
    --border:#3a3226; --border-soft:#2a251d; --text:#ece5d8; --text-dim:#a89c88; --text-faint:#6f6656;
    --accent:#d99a4e; --accent-soft:#3a2c1a; --ok:#8bb98a; --ok-soft:#20281f; --warn:#dab24a; --warn-soft:#2e2818;
    --bad:#c47368; --bad-soft:#2c1f1c; --neutral:#7f92a3; --neutral-soft:#1c2529;
    --code-role:#9fb0c2; --record-bg:#100e0b; --window-shadow:0 30px 60px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.02);
    color-scheme: dark;
  }}
  :root[data-theme="dark"]{
    --bg:#15130f; --surface:#1d1a15; --surface-2:#25211a; --surface-3:#2e2921;
    --border:#3a3226; --border-soft:#2a251d; --text:#ece5d8; --text-dim:#a89c88; --text-faint:#6f6656;
    --accent:#d99a4e; --accent-soft:#3a2c1a; --ok:#8bb98a; --ok-soft:#20281f; --warn:#dab24a; --warn-soft:#2e2818;
    --bad:#c47368; --bad-soft:#2c1f1c; --neutral:#7f92a3; --neutral-soft:#1c2529;
    --code-role:#9fb0c2; --record-bg:#100e0b; --window-shadow:0 30px 60px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.02);
    color-scheme: dark;
  }
  *{box-sizing:border-box;}
  body{background:var(--bg);color:var(--text);font-family:'JetBrains Mono',ui-monospace,'SF Mono',monospace;padding-block:40px;padding-inline:16px;line-height:1.5;}
  .window{max-width:980px;margin:0 auto;background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;box-shadow:var(--window-shadow);}
  .titlebar{display:flex;align-items:center;gap:14px;padding:12px 16px;background:var(--surface-2);border-bottom:1px solid var(--border);}
  .dots{display:flex;gap:7px;flex:0 0 auto;} .dots span{width:11px;height:11px;border-radius:50%;display:block;}
  .dots span:nth-child(1){background:#d97757;} .dots span:nth-child(2){background:#d9b357;} .dots span:nth-child(3){background:#7fae6f;}
  .titlebar .name{flex:1;text-align:center;font-size:12.5px;color:var(--text-dim);} .titlebar .name b{color:var(--text);font-weight:600;}
  .titlebar .spacer{width:53px;flex:0 0 auto;}
  .toolbar{padding:14px 20px;border-bottom:1px solid var(--border-soft);font-size:13px;color:var(--text-dim);display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
  .prompt{color:var(--accent);font-weight:600;} .toolbar code{color:var(--text);}
  .content{padding:24px 24px 8px;}
  .status-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border-soft);border:1px solid var(--border-soft);border-radius:8px;overflow:hidden;margin-bottom:24px;}
  .stat{background:var(--surface-2);padding:14px 16px;} .stat .k{font-family:'IBM Plex Sans',sans-serif;font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-faint);margin-bottom:6px;}
  .stat .v{font-size:19px;font-weight:600;font-variant-numeric:tabular-nums;} .stat.pass .v{color:var(--ok);} .stat.pass .v::before{content:"✓ ";}
  .stat.fail .v{color:var(--bad);} .stat.fail .v::before{content:"✗ ";}
  h2{font-family:'IBM Plex Sans',sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:.09em;color:var(--text-faint);font-weight:600;margin:0 0 12px;display:flex;align-items:center;gap:8px;}
  h2::after{content:"";flex:1;height:1px;background:var(--border-soft);} section{margin-bottom:28px;}
  .finding{display:flex;gap:12px;padding:14px 16px;background:var(--warn-soft);border:1px solid var(--border);border-left:3px solid var(--warn);border-radius:6px;font-size:13px;margin-bottom:8px;}
  .finding .ico{color:var(--warn);font-size:15px;line-height:1.4;} .finding .kind{display:inline-block;font-size:11px;background:var(--surface);color:var(--warn);padding:1px 7px;border-radius:4px;margin-bottom:6px;font-weight:600;}
  .finding .at{color:var(--text-dim);word-break:break-all;font-size:12px;margin-top:6px;} .finding .detail{color:var(--text);}
  .filter-row{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
  .filter{flex:1;background:var(--surface-2);border:1px solid var(--border);border-radius:6px;padding:8px 12px;color:var(--text);font-family:inherit;font-size:13px;}
  .filter:focus{outline:none;border-color:var(--accent);}
  .filter-count{font-family:'IBM Plex Sans',sans-serif;font-size:11px;color:var(--text-faint);white-space:nowrap;}
  .drag-hint{margin-top:8px;}
  .sources{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;} @media (max-width:640px){.sources{grid-template-columns:1fr;}}
  .card{background:var(--surface-2);border:1px solid var(--border-soft);border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:8px;min-width:0;position:relative;cursor:grab;}
  .card.dragging{opacity:0.4;cursor:grabbing;}
  .card.drag-over{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-soft) inset;}
  .card.filtered-out{display:none;}
  .drag-handle{position:absolute;top:10px;right:34px;color:var(--text-faint);font-size:13px;letter-spacing:-1px;}
  .chatbtn{position:absolute;top:7px;right:8px;width:22px;height:22px;border:1px solid var(--border);background:var(--surface-3);color:var(--text-faint);border-radius:5px;font-size:12px;cursor:pointer;font-family:inherit;line-height:1;}
  .chatbtn:hover{color:var(--accent);border-color:var(--accent);} .chatbtn.copied{color:var(--ok);border-color:var(--ok);}
  .badge{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;width:fit-content;}
  .badge.cited{background:var(--ok-soft);color:var(--ok);} .badge.missing{background:var(--bad-soft);color:var(--bad);} .badge.unaddressed{background:var(--neutral-soft);color:var(--neutral);}
  .card .ground{font-size:12px;color:var(--text-dim);word-break:break-all;line-height:1.45;} .card .ground b{color:var(--text);font-weight:500;}
  .locbtn{margin-top:2px;display:flex;align-items:center;justify-content:space-between;gap:8px;background:var(--surface-3);border:1px solid var(--border);border-radius:6px;padding:7px 10px;cursor:pointer;font-family:inherit;font-size:12px;color:var(--accent);text-align:left;transition:background .12s ease, border-color .12s ease;}
  .locbtn:hover{background:var(--accent-soft);border-color:var(--accent);} .locbtn.copied{border-color:var(--ok);} .locbtn.copied .copy-ico{color:var(--ok);}
  .locbtn .copy-ico{color:var(--text-faint);font-size:11px;flex:0 0 auto;}
  .score-row{display:flex;gap:10px;font-size:11px;color:var(--text-faint);font-family:'IBM Plex Sans',sans-serif;} .score-row b{color:var(--text-dim);font-family:inherit;}
  .guard-note{font-size:10.5px;color:var(--warn);font-family:'IBM Plex Sans',sans-serif;}
  .dim-line{color:var(--text-faint);font-size:12px;}
  .record{background:var(--record-bg);border:1px solid var(--border-soft);border-radius:8px;padding:16px 18px;font-size:12.5px;overflow-x:auto;}
  .record .rline{white-space:pre;color:var(--text-dim);} .record .rline .g{color:var(--text-faint);} .record .rline .role{color:var(--code-role);} .record .rline .rel{color:var(--accent);}
  .record .schema{color:var(--text-faint);margin-bottom:10px;font-size:11px;}
  footer{padding:16px 24px 22px;font-family:'IBM Plex Sans',sans-serif;font-size:11.5px;color:var(--text-faint);border-top:1px solid var(--border-soft);display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;}
</style>
<div class="window">
  <div class="titlebar"><div class="dots"><span></span><span></span><span></span></div><div class="name"><b>eoreader7</b> — cli/reason-surface.mjs</div><div class="spacer"></div></div>
  <div class="toolbar"><span class="prompt">$</span><code>node cli/reason-surface.mjs ${esc(path.basename(file ?? "stdin"))}</code></div>
  <div class="content">
    <div class="status-strip">
      <div class="stat"><div class="k">Claims</div><div class="v">${declared.length}</div></div>
      <div class="stat"><div class="k">Warnings</div><div class="v">${warns.length}</div></div>
      <div class="stat"><div class="k">Cited</div><div class="v">${cited.length}/${sources.length}</div></div>
      <div class="stat ${pass ? "pass" : "fail"}"><div class="k">Verdict</div><div class="v">${pass ? "OK" : `${errors.length} ERROR(S)`}</div></div>
    </div>
    <section><h2>Findings — ${allFindings.length}</h2>${findingsHtml}</section>
    <section>
      <h2>Sources — ${cited.length}/${sources.length} cited</h2>
      ${sources.length ? `<div class="filter-row"><input class="filter" id="source-filter" type="text" placeholder="filter by ground, file, or verdict…" autocomplete="off"><span class="filter-count" id="filter-count">${sources.length} shown</span></div>` : ""}
      <div class="sources" id="sources-grid" data-order-key="${esc(orderKey)}">${sourcesHtml || `<p class="dim-line">no claims declared this run</p>`}</div>
      <p class="dim-line drag-hint">drag ⠿ to reorder · ⌘ copies a chat-ready reference — all kept only in this browser, never sent anywhere</p>
    </section>
    <section><h2>Reasoning record — real GFP notation, not prose</h2><div class="record"><div class="schema">EOReasoningRecord@1 · ${new Date().toISOString()}</div>${recordHtml}</div></section>
  </div>
  <footer><span>generated live by cli/reason-surface.mjs — never hand-typed</span><span>no citation excerpt appears anywhere on this page</span></footer>
</div>
<script>
  document.querySelectorAll('.locbtn, .chatbtn').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      var val = btn.getAttribute('data-copy');
      var ico = btn.querySelector('.copy-ico');
      var reset = function(){ btn.classList.remove('copied'); if(ico) ico.textContent='⧉ copy'; };
      var mark = function(){ btn.classList.add('copied'); if(ico) ico.textContent='✓ copied'; setTimeout(reset, 1400); };
      try{ if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(val).then(mark).catch(function(){}); } }catch(e2){}
    });
  });

  // Drag-to-reorder — a per-viewer convenience only (artifact-design
  // doctrine): the order lives in localStorage, keyed to this exact claim
  // set, and is never read back by anything outside this browser tab.
  (function(){
    var grid = document.getElementById('sources-grid');
    if(!grid) return;
    var storeKey = 'reason-surface-order:' + (grid.dataset.orderKey || '');
    var dragEl = null;

    function saveOrder(){
      try{
        var order = Array.prototype.map.call(grid.querySelectorAll('.card'), function(c){ return c.dataset.idx; });
        localStorage.setItem(storeKey, JSON.stringify(order));
      }catch(e){}
    }
    function applySavedOrder(){
      try{
        var raw = localStorage.getItem(storeKey);
        if(!raw) return;
        var order = JSON.parse(raw);
        var byIdx = {};
        Array.prototype.forEach.call(grid.querySelectorAll('.card'), function(c){ byIdx[c.dataset.idx] = c; });
        order.forEach(function(idx){ if(byIdx[idx]) grid.appendChild(byIdx[idx]); });
      }catch(e){}
    }
    applySavedOrder();

    grid.addEventListener('dragstart', function(e){
      var card = e.target.closest('.card');
      if(!card) return;
      dragEl = card;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    grid.addEventListener('dragend', function(e){
      var card = e.target.closest('.card');
      if(card) card.classList.remove('dragging');
      grid.querySelectorAll('.drag-over').forEach(function(c){ c.classList.remove('drag-over'); });
      saveOrder();
    });
    grid.addEventListener('dragover', function(e){
      e.preventDefault();
      var over = e.target.closest('.card');
      if(!over || over === dragEl) return;
      grid.querySelectorAll('.drag-over').forEach(function(c){ if(c !== over) c.classList.remove('drag-over'); });
      over.classList.add('drag-over');
    });
    grid.addEventListener('drop', function(e){
      e.preventDefault();
      var target = e.target.closest('.card');
      if(!target || !dragEl || target === dragEl) return;
      var cards = Array.prototype.slice.call(grid.querySelectorAll('.card'));
      var from = cards.indexOf(dragEl), to = cards.indexOf(target);
      if(from < to) target.after(dragEl); else target.before(dragEl);
      target.classList.remove('drag-over');
    });
  })();

  // Live filter — ground, file basename, or verdict word.
  (function(){
    var input = document.getElementById('source-filter');
    var count = document.getElementById('filter-count');
    if(!input) return;
    input.addEventListener('input', function(){
      var q = input.value.trim().toLowerCase();
      var cards = document.querySelectorAll('#sources-grid .card');
      var shown = 0;
      cards.forEach(function(card){
        var hay = card.dataset.filter || '';
        var hide = q.length > 0 && hay.indexOf(q) === -1;
        card.classList.toggle('filtered-out', hide);
        if(!hide) shown++;
      });
      if(count) count.textContent = q.length ? (shown + ' of ' + cards.length + ' shown') : (cards.length + ' shown');
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
  html = renderCitationTerminal();
  note = "citation-terminal";
}

if (outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html);
  console.log(`reason-surface (${note}): wrote ${html.length} bytes to ${outPath}`);
} else {
  process.stdout.write(html);
}
