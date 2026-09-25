// native/docs/surprise-organs.js — the page's one script (2026-09-25): the real
// organs, imported from the kernel, run CAUSALLY over a projected constitutional
// reading. Nothing here computes a statistic of its own; drawing is drawing.
import { createHolograph, ABSENT } from "../kernel/bayes-surprise.js";
import { consequentialSurprise } from "../kernel/consequential-surprise.js";
import { settling } from "../kernel/settling.js";
import { hindsightFromLog } from "../the-fold/hindsight-log.js";
import { revisionVolatility } from "../kernel/revision-volatility.js";
import { signProvisionalKind, supersedeLesson, corroboration } from "../kernel/corroboration.js";

const $ = (id) => document.getElementById(id);
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const groupBy = (rows, key) => { const m = new Map(); for (const r of rows) { const k = key(r); if (!m.has(k)) m.set(k, []); m.get(k).push(r); } return m; };
const yieldToPaint = () => new Promise((r) => setTimeout(r, 0));

let data = null;
let R = null; // the run's results
let view = { from: 0, to: 0, selected: null };

function nameOf(id) {
  const b = data?.beingById.get(id);
  if (b?.surfaces?.length) return b.surfaces.reduce((a, s) => (s.length > a.length ? s : a), b.surfaces[0]);
  // an address with no recorded surface: shown as the address's own slug, never a guessed name
  return String(id).replace(/^ref:auto:/, "").replace(/:\d+$/, "").replace(/_/g, " ") + " (address)";
}

async function loadCorpus(key) {
  $("progress").textContent = `loading ${key}…`;
  const res = await fetch(`./data/${key}.json`);
  data = await res.json();
  data.beingById = new Map(data.beings.map((b) => [b.id, b]));
  data.sentenceIndex = new Map(data.sentences.map((s, i) => [s.seq, i]));
  $("stated").textContent = `reader: ${data.assembly ?? "?"} · record: ${data.reading} · source: ${data.source} · ${data.sentences.length} sentences, ${data.beings.length} referent addresses, ${data.mentions.length} mentions, ${data.merges.length} identity events, ${data.edges.length} relation edges · projected ${data.projectedAt}`;
  $("progress").textContent = "";
  const sel = $("merge"); sel.innerHTML = "";
  for (const m of data.merges) { const o = document.createElement("option"); o.value = m.id; o.textContent = `sentence ${m.seq}: ${nameOf(m.kept)} ← ${m.folded.map(nameOf).join(" + ")}  [${m.witness ?? ""}]`; sel.appendChild(o); }
}

function config() {
  return { pValue: Number($("pValue").value), trials: Number($("trials").value), shuffles: Number($("shuffles").value), window: Number($("window").value), gamma: Number($("gamma").value), seed: Number($("seed").value) };
}

// ── THE CAUSAL WALK ────────────────────────────────────────────────────────
async function run() {
  const cfg = config();
  const rng = mulberry32(cfg.seed);
  const holo = createHolograph({ alpha: 1, gamma: cfg.gamma });
  const index = new Map();
  const dep = (on, id) => { if (!index.has(on)) index.set(on, new Set()); index.get(on).add(id); };
  const parent = new Map();
  const find = (x) => { while (parent.has(x) && parent.get(x) !== x) x = parent.get(x); return x; };
  const store = { concepts: {} };
  const mentionsBySeq = groupBy(data.mentions, (m) => m.seq);
  const mergesBySeq = groupBy(data.merges, (m) => m.seq);
  const edgesBySeq = groupBy(data.edges, (e) => e.seq);
  const perSentence = [];
  const facts = [];
  const entries = [];
  const eventIndex = new Map();
  const applied = [];
  const t0 = performance.now();
  for (let i = 0; i < data.sentences.length; i++) {
    const s = data.sentences[i];
    for (const m of mergesBySeq.get(s.seq) ?? []) {
      const kept = find(m.kept);
      parent.set(kept, kept);
      for (const f of m.folded) {
        const ff = find(f);
        if (ff === kept) continue;
        parent.set(ff, kept);
        dep(kept, ff); // the folded address now rests on the being that kept it
        const entry = store.concepts[ff];
        if (entry) for (const o of entry.occurrences) if (!o.superseded && !o.falsified) supersedeLesson(store, ff, o.id, { text: `re-addressed to ${kept} at sentence ${s.seq}` });
      }
      dep(kept, `m:${m.id}`); for (const f of m.folded) dep(f, `m:${m.id}`);
      eventIndex.set(m.id, entries.length);
      entries.push({ schema: "EOReferentMerge@1", id: m.id, kept: m.kept, folded: m.folded, witness: m.witness, seq: s.seq });
      applied.push({ ...m, at: i });
    }
    const present = new Set();
    for (const m of mentionsBySeq.get(s.seq) ?? []) {
      const c = find(m.referent);
      present.add(c);
      entries.push({ schema: "EOMention@1", id: `mn:${s.seq}:${m.referent}`, referent: m.referent, seq: s.seq });
      signProvisionalKind(store, { name: c, source: `s:${s.seq}`, at: s.seq });
    }
    const sid = `s:${s.seq}`;
    for (const b of present) dep(b, sid);
    for (const e of edgesBySeq.get(s.seq) ?? []) dep(sid, `e:${e.id}`);
    const f = new Map([...present].map((b) => [b, "present"]));
    facts.push(f);
    const r = consequentialSurprise(holo, f, { index, seedsOf: (slot, value) => (value === "present" ? [slot] : []), pValue: cfg.pValue, trials: cfg.trials, rng, corroborationOf: (id) => corroboration(store, id) });
    let absentBits = 0; const rows = [];
    for (const row of r.rows) { if (row.value === ABSENT) absentBits += row.bayes; else rows.push({ id: row.slot, bayes: row.bayes, rank: row.rank, reached: row.reached, loadBearing: row.loadBearing, thin: row.thin, thinButLoadBearing: row.thinButLoadBearing }); }
    perSentence.push({ i, seq: s.seq, bayes: r.bayes, consequential: r.consequentialBits, local: r.localBits, absentBits, rows, thin: rows.some((x) => x.thinButLoadBearing) });
    if (i % 250 === 0) { $("progress").textContent = `reading sentence ${i + 1} of ${data.sentences.length} — ${((performance.now() - t0) / 1000).toFixed(1)} s`; await yieldToPaint(); }
  }
  // who holds the stage — one verdict per window, the organ's own
  const windows = [];
  for (let a = 0; a < facts.length; a += cfg.window) {
    const b = Math.min(facts.length, a + cfg.window);
    const v = settling(facts.slice(a, b), { pValue: cfg.pValue, shuffles: cfg.shuffles, rng });
    windows.push({ from: a, to: b, verdict: v.gap ?? v.verdict, settled: v.settled ?? [], p: v.p ?? null, runMass: v.runMass ?? 0, basis: v.basis });
    if (windows.length % 40 === 0) { $("progress").textContent = `judging window ${windows.length}…`; await yieldToPaint(); }
  }
  const vol = revisionVolatility(store, { trials: cfg.trials, rng });
  R = { cfg, perSentence, facts, windows, entries, eventIndex, applied, vol, store, find };
  $("progress").textContent = `read ${data.sentences.length} sentences in ${((performance.now() - t0) / 1000).toFixed(1)} s · declared: pValue ${cfg.pValue}, ${cfg.trials} null trials, ${cfg.shuffles} shuffles, window ${cfg.window}, γ ${cfg.gamma}, seed ${cfg.seed} · ${applied.length} identity event(s) applied as recorded`;
  view = { from: 0, to: data.sentences.length - 1, selected: null };
  $("from").max = $("to").max = String(data.sentences.length - 1); $("from").value = "0"; $("to").value = String(data.sentences.length - 1);
  drawAll(); renderVolatility(); renderHindsight();
}

// ── DRAWING (display only) ────────────────────────────────────────────────
function fit(canvas) { const dpr = window.devicePixelRatio || 1; const w = canvas.clientWidth, h = canvas.clientHeight; if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); } const ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h); return { ctx, w, h }; }
const colAt = (i, w) => ((i - view.from) / Math.max(1, view.to - view.from + 1)) * w;
const idxAt = (x, w) => Math.min(view.to, Math.max(view.from, view.from + Math.floor((x / w) * (view.to - view.from + 1))));

function drawBits() {
  const { ctx, w, h } = fit($("bits"));
  if (!R) return;
  const span = view.to - view.from + 1; const per = w / span;
  let max = 1e-9; for (let i = view.from; i <= view.to; i++) max = Math.max(max, R.perSentence[i].bayes);
  const cols = Math.min(span, Math.floor(w));
  for (let c = 0; c < cols; c++) {
    const a = view.from + Math.floor((c / cols) * span), b = view.from + Math.floor(((c + 1) / cols) * span);
    let total = 0, load = 0, thin = false;
    for (let i = a; i < Math.max(b, a + 1) && i <= view.to; i++) { const p = R.perSentence[i]; if (p.bayes > total) { total = p.bayes; load = p.consequential; thin = p.thin; } }
    const x = (c / cols) * w, bw = Math.max(1, w / cols - 0.5);
    ctx.fillStyle = css("--bits"); ctx.fillRect(x, h - (total / max) * (h - 8), bw, (total / max) * (h - 8));
    if (load > 0) { ctx.fillStyle = thin ? css("--thin") : css("--load"); ctx.fillRect(x, h - (load / max) * (h - 8), bw, (load / max) * (h - 8)); }
  }
  if (data.docs?.length > 1) { ctx.strokeStyle = "#ffffff18"; for (let i = Math.max(1, view.from); i <= view.to; i++) if (data.sentences[i].doc !== data.sentences[i - 1].doc) { ctx.beginPath(); ctx.moveTo(colAt(i, w), h - 14); ctx.lineTo(colAt(i, w), h); ctx.stroke(); } }
  for (const m of R.applied) if (m.at >= view.from && m.at <= view.to) { ctx.strokeStyle = "#ffffff55"; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(colAt(m.at, w), 0); ctx.lineTo(colAt(m.at, w), h); ctx.stroke(); ctx.setLineDash([]); }
  if (view.selected != null && view.selected >= view.from && view.selected <= view.to) { ctx.strokeStyle = css("--ink"); ctx.beginPath(); ctx.moveTo(colAt(view.selected, w) + per / 2, 0); ctx.lineTo(colAt(view.selected, w) + per / 2, h); ctx.stroke(); }
  $("rangeLabel").textContent = `sentences ${R.perSentence[view.from].seq}–${R.perSentence[view.to].seq} of ${data.sentences.length}; peak ${max.toFixed(2)} bits`;
}

function drawBands() {
  const { ctx, w, h } = fit($("bands"));
  if (!R) return;
  const color = { settles_in_sequence: css("--seq"), settled_any_order: css("--any"), never_settles: css("--never"), too_short: "#333", settled_order_untestable: "#6f6a8a" };
  for (const win of R.windows) {
    if (win.to <= view.from || win.from > view.to) continue;
    const x0 = colAt(Math.max(win.from, view.from), w), x1 = colAt(Math.min(win.to, view.to + 1), w);
    ctx.fillStyle = color[win.verdict] ?? "#333"; ctx.fillRect(x0, 4, Math.max(1, x1 - x0 - 1), h - 8);
  }
}

function drawRuns() {
  const { ctx, w, h } = fit($("runs"));
  if (!R) return;
  // the beings seen most in the visible range, each on its own row; runs are consecutive presences (display of the recorded facts)
  const count = new Map();
  for (let i = view.from; i <= view.to; i++) for (const b of R.facts[i].keys()) count.set(b, (count.get(b) ?? 0) + 1);
  const top = [...count].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([b]) => b);
  const rowH = h / Math.max(1, top.length);
  ctx.font = "11px ui-monospace, Menlo, monospace"; ctx.textBaseline = "middle";
  top.forEach((b, r) => {
    const y = r * rowH + rowH / 2;
    ctx.fillStyle = "#1d2327"; ctx.fillRect(0, r * rowH + 1, w, rowH - 2);
    let start = null;
    for (let i = view.from; i <= view.to + 1; i++) {
      const on = i <= view.to && R.facts[i].has(b);
      if (on && start == null) start = i;
      if (!on && start != null) { const len = i - start; ctx.fillStyle = len >= 2 ? css("--seq") : "#3b4a50"; ctx.fillRect(colAt(start, w), y - rowH * 0.3, Math.max(1.5, colAt(i, w) - colAt(start, w)), rowH * 0.6); start = null; }
    }
    ctx.fillStyle = css("--ink"); ctx.fillText(nameOf(b).slice(0, 28), 6, y);
  });
}

function drawAll() { drawBits(); drawBands(); drawRuns(); }

function showSentence(i) {
  view.selected = i; drawBits();
  const p = R.perSentence[i]; const s = data.sentences[i];
  const el = $("sentence"); el.hidden = false;
  const rows = p.rows.map((r) => `<tr><td>${nameOf(r.id)}${r.loadBearing ? `<span class="tag load">load-bearing</span>` : ""}${r.thinButLoadBearing ? `<span class="tag thin">seen in one sentence</span>` : ""}</td><td class="num">${r.bayes.toFixed(3)}</td><td class="num">${r.reached}</td><td class="num">${r.rank == null ? "—" : r.rank.toFixed(2)}</td></tr>`).join("");
  const merges = R.applied.filter((m) => m.at === i).map((m) => `<div class="meta">identity event recorded here: ${nameOf(m.kept)} ← ${m.folded.map(nameOf).join(" + ")} — “${m.basis ?? ""}”</div>`).join("");
  const doc = data.docs?.[s.doc]; const docLabel = doc == null ? "" : typeof doc === "string" ? doc : `${doc.name}${doc.date ? ` · created ${doc.date} (${doc.kind}: ${doc.giver})` : " · undated"}`;
  el.innerHTML = `<div class="text">${escapeHtml(s.text)}</div><div class="meta">sentence ${s.seq}${data.docs?.length > 1 && docLabel ? ` · ${escapeHtml(docLabel)}` : ""} · bytes ${s.start}–${s.end} · ${p.bayes.toFixed(3)} bits moved: ${p.consequential.toFixed(3)} on load-bearing beings, ${p.local.toFixed(3)} local (${p.absentBits.toFixed(3)} of it from who did not appear)</div>${merges}${rows ? `<table><tr><th>being named here</th><th>bits</th><th>rests on it</th><th>reach rank</th></tr>${rows}</table>` : `<div class="meta">no being the reader had established is named in this sentence</div>`}`;
}

function showWindow(x, w) {
  const i = idxAt(x, w); const win = R.windows.find((v) => i >= v.from && i < v.to); if (!win) return;
  const tag = { settles_in_sequence: "seq", settled_any_order: "any", never_settles: "never" }[win.verdict] ?? "never";
  $("windowInfo").innerHTML = `sentences ${data.sentences[win.from].seq}–${data.sentences[win.to - 1].seq} <span class="tag ${tag}">${win.verdict.replace(/_/g, " ")}</span>${win.settled.length ? ` — holds: ${win.settled.map(nameOf).join(", ")}` : ""}\n${escapeHtml(win.basis ?? "")}`;
}

function renderVolatility() {
  const rows = R.vol.entries.filter((e) => e.p != null).slice(0, 14).map((e) => `<tr><td>${nameOf(e.name)}</td><td class="num">${e.marks}</td><td class="num">${e.exposure}</td><td class="num">${e.expected.toFixed(2)}</td><td class="num">${e.p.toFixed(3)}</td><td class="num">${e.rank.toFixed(2)}</td></tr>`).join("");
  $("volatility").innerHTML = `<table><tr><th>being (as first filed)</th><th>mentions re-addressed</th><th>mentions</th><th>expected by exposure</th><th>p</th><th>rank</th></tr>${rows}</table><div class="basis">${escapeHtml(R.vol.basis)}</div>`;
}

function renderHindsight() {
  const id = $("merge").value; if (!id || !R) return;
  const at = R.eventIndex.get(id); if (at == null) { $("hindsight").innerHTML = `<div class="meta">this event was not reached in the walk</div>`; return; }
  const h = hindsightFromLog(R.entries, at, { trials: R.cfg.trials, rng: mulberry32(R.cfg.seed + 1) });
  if (h.gap) { $("hindsight").innerHTML = `<div class="basis">${escapeHtml(h.basis ?? h.gap)}</div>`; return; }
  const m = data.merges.find((x) => x.id === id);
  const seen = new Set(); const items = [];
  for (const row of h.rows) { const e = R.entries[row.index]; if (e.schema !== "EOMention@1" || seen.has(e.seq)) continue; seen.add(e.seq); const s = data.sentences[data.sentenceIndex.get(e.seq)]; items.push(`<li><span class="seq">${e.seq} · ${nameOf(e.referent)}</span>${escapeHtml(s?.text ?? "")}</li>`); if (items.length >= 40) break; }
  $("hindsight").innerHTML = `<div class="meta">at sentence ${m.seq} the reader recorded: ${nameOf(m.kept)} ← ${m.folded.map(nameOf).join(" + ")} — “${escapeHtml(m.basis ?? "")}” (witness “${escapeHtml(m.witness ?? "")}”)</div><div class="basis">${escapeHtml(h.basis)}</div><ol class="hind">${items.join("")}</ol>${h.rows.length > items.length ? `<div class="meta">${h.rows.length - items.length} more entries rest on these addresses</div>` : ""}`;
}

function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c])); }

// ── wiring ────────────────────────────────────────────────────────────────
$("run").addEventListener("click", () => run().catch((e) => { $("progress").textContent = `failed: ${e.message}`; console.error(e); }));
$("corpus").addEventListener("change", () => loadCorpus($("corpus").value));
$("from").addEventListener("input", () => { view.from = Math.min(Number($("from").value), view.to); drawAll(); });
$("to").addEventListener("input", () => { view.to = Math.max(Number($("to").value), view.from); drawAll(); });
$("bits").addEventListener("click", (ev) => { if (!R) return; const w = $("bits").clientWidth; showSentence(idxAt(ev.offsetX, w)); });
$("bands").addEventListener("click", (ev) => { if (!R) return; showWindow(ev.offsetX, $("bands").clientWidth); });
$("merge").addEventListener("change", renderHindsight);
window.addEventListener("resize", drawAll);
loadCorpus($("corpus").value);
