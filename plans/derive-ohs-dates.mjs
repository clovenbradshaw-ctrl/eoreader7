#!/usr/bin/env node
// plans/derive-ohs-dates.mjs — WHEN each OHS ground document came into being,
// with the full evidence chain, so the constitutional reader can read the
// corpus in order of creation (2026-09-25; user direction: "read them in
// order of creation for the sake of proper activation … have the full evidence
// chain for all of them").
//
//   node plans/derive-ohs-dates.mjs [--custody ../ohs-custody] [--ground plans/ohs/ground] [--out plans/ohs/creation-order.json]
//
// Reads only what the custody repo retained and our own ground text; writes
// one file. For EVERY document it gathers every candidate date with its giver
// and its address, then chooses by the precedence below — declared in the
// output, never implied — and keeps every alternate beside the choice:
//
//   1. the register's own publication timeline (richtext-publication-timeline.json,
//      with its date_confidence) — the custody project's byline-verified dates
//   2. a machine-readable publication field inside the retained raw HTML
//      (bytes/<id>.bin): article:published_time, JSON-LD datePublished, a
//      meta date, the first <time datetime> — with its byte offset
//   3. the PDF's own /CreationDate, when the producer is an AUTHORING tool
//      (Word, Publisher, PDFlib…); a browser print (Skia/Chrome) or a Docs
//      renderer dates the print, not the writing, and is kept as an alternate
//   4. an explicit dateline in the document's own bytes (our ground text):
//      "Posted:", "Published", "Sent:", "Release Date:", a "By <name> | <date>"
//      byline, Legistar's "File created:" (value on the next non-empty line),
//      or a line at the top of the body that is only a date — line and offset
//   5. the register label's own date (a meeting, a letter, an email — the event)
//   6. a full or year-month date in the URL (a year alone is not a date)
//   7. a cross-reference the corpus itself supplies (declared in CROSS_REFS,
//      each with its reason): a Municode section is created by the ordinance
//      its history note names, at that ordinance's third-reading record; a
//      transcript's words came into being at the recorded meeting; a letter
//      with no date and no metadata existed by the day the Scene reported it
//   8. a LIVING page (an index, a directory, a home/about/profile page — by
//      the register label's own words) has no creation date: it EXISTED BY its
//      earliest Wayback capture in the register, and is filed under
//      `capture-only` so it is never presented as written on that day
//   9. otherwise UNDATED — listed, and read-corpus.mjs refuses to read it
//
// Nothing here is re-fetched; nothing is guessed. A document with two
// different givers disagreeing is kept with both and the precedence decides.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] != null ? args[i + 1] : d; };
const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const CUSTODY = path.resolve(ROOT, flag("custody", "../ohs-custody"));
const GROUND = path.resolve(ROOT, flag("ground", "plans/ohs/ground"));
const OUT = path.resolve(ROOT, flag("out", "plans/ohs/creation-order.json"));

const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const M = "(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)[a-z]*\\.?";
const iso = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
/** a date written in words or digits → YYYY-MM-DD (null when none) */
function textDate(s) {
  if (!s) return null; let m;
  if ((m = new RegExp(`\\b(\\d{1,2})\\s+${M},?\\s+(20\\d\\d)\\b`, "i").exec(s))) return { date: iso(m[3], MON[m[2].toLowerCase().slice(0, 3) === "sep" && m[2].toLowerCase().startsWith("sept") ? "sept" : m[2].toLowerCase().slice(0, 3)], m[1]), verbatim: m[0] };
  if ((m = new RegExp(`\\b${M}\\s+(\\d{1,2}),?\\s+(20\\d\\d)\\b`, "i").exec(s))) return { date: iso(m[3], MON[m[1].toLowerCase().slice(0, 3)], m[2]), verbatim: m[0] };
  if ((m = /\b(20\d\d)-(\d\d)-(\d\d)\b/.exec(s))) return { date: m[0], verbatim: m[0] };
  if ((m = /\b(\d{1,2})\/(\d{1,2})\/(20\d\d)\b/.exec(s))) return { date: iso(m[3], +m[1], +m[2]), verbatim: m[0] };
  return null;
}
function monthYear(s) { const m = new RegExp(`\\b${M}\\s+(20\\d\\d)\\b`, "i").exec(s ?? ""); return m ? { date: iso(m[2], MON[m[1].toLowerCase().slice(0, 3)], 1), verbatim: m[0] } : null; }
const isoDate = (s) => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null);
/** pdfinfo's "Thu Mar 30 15:22:49 2023 CDT" */
function pdfinfoDate(s) { const m = /^\w{3}\s+(\w{3})\s+(\d+)\s+[\d:]+\s+(\d{4})/.exec(s ?? ""); return m ? iso(m[3], MON[m[1].toLowerCase()], +m[2]) : null; }

// ── the record ─────────────────────────────────────────────────────────────
const register = JSON.parse(fs.readFileSync(path.join(CUSTODY, "sources.structured.json"), "utf8")).entries;
const byId = new Map(register.map((e) => [e.id, e]));
const timeline = JSON.parse(fs.readFileSync(path.join(CUSTODY, "richtext-publication-timeline.json"), "utf8"));
const ids = fs.readdirSync(GROUND).filter((f) => f.endsWith(".txt")).map((f) => f.replace(/\.txt$/, "")).sort();

// A LIVING page, by the register label's own words: an index, a directory, a home/about page, a bio page, an
// organisation's own site, a fiscal-year listing. Never a report, an article, an interview or a post.
const LIVING = /\b(home page|meetings index|reports index|directory|about the|own site|director page|director and assistant|reports by department|FY20\d\d|origin|as collaborative applicant)\b/i;
const PRINTED = /Skia|Chrome|Google Docs|Safari|Mozilla|Quartz PDFContext|Preview/i;
/** declared cross-references — the corpus dates its own members; each names its reason */
const CROSS_REFS = {
  "MUNI-263040": { kind: "enactment", via: "LEG-BL2021-971-HIST-3RD", why: "the section's own history note names the creating ordinance (Ord. BL2021-971 § 1, 2022); the ordinance's third-reading record is in this corpus and carries the day" },
  "SEPT23-MEETING-TRANSCRIPT": { kind: "recorded-event", why: "a Whisper transcript of the meeting's own recording (readings/…: derived artifact of the video); its words came into being at the meeting the register label names, and the agenda/minutes records for that meeting are in this corpus" },
  "WELSCH-AUDIT-REQUEST-LETTER": { kind: "existed-by", via: "SCN-WELSCH-FILING", why: "the letter's own text layer carries no date and its PDF no creation metadata; the latest event it cites is 25 Oct 2024; the Nashville Scene's report of the filing is the first record of the letter's existence" },
};

function htmlEvidence(id) {
  const file = path.join(CUSTODY, "bytes", `${id}.bin`);
  if (!fs.existsSync(file)) return [];
  const raw = fs.readFileSync(file, "latin1");
  const fields = [
    ["article:published_time", /property=["']article:published_time["'][^>]*content=["']([^"']+)/i],
    ["ld datePublished", /"datePublished"\s*:\s*"([^"]+)"/],
    ["meta date", /name=["'](?:date|pubdate|publish-date|parsely-pub-date|dc\.date|DC\.date\.issued)["'][^>]*content=["']([^"']+)/i],
    ["time datetime", /<time[^>]*datetime=["']([^"']+)/i],
    ["article:modified_time", /property=["']article:modified_time["'][^>]*content=["']([^"']+)/i],
    ["ld dateModified", /"dateModified"\s*:\s*"([^"]+)"/],
  ];
  const out = [];
  for (const [name, re] of fields) { const m = re.exec(raw); if (m) { const d = isoDate(m[1]) ?? textDate(m[1])?.date; if (d) out.push({ kind: name.includes("odified") ? "html-modified" : name === "time datetime" ? "html-time" : "html-published", field: name, date: d, giver: `${path.relative(ROOT, file)}`, where: `byte ${m.index}`, verbatim: m[0].slice(0, 140) }); } }
  return out;
}
function pdfEvidence(id) {
  const e = byId.get(id); if (!/pdf/i.test(e?.evidence?.content_type ?? "")) return [];
  const file = path.join(CUSTODY, "bytes", `${id}.bin`); if (!fs.existsSync(file)) return [];
  let info = ""; try { info = execFileSync("pdfinfo", [file], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch { return []; }
  const get = (k) => (new RegExp(`^${k}:\\s*(.+)$`, "m").exec(info)?.[1] ?? "").trim();
  const producer = `${get("Creator")} / ${get("Producer")}`.trim();
  const printed = PRINTED.test(producer);
  const out = [];
  const c = pdfinfoDate(get("CreationDate")); if (c) out.push({ kind: printed ? "pdf-printed" : "pdf-creation", date: c, giver: `pdfinfo ${path.relative(ROOT, file)}`, where: "/CreationDate", verbatim: `CreationDate: ${get("CreationDate")} · ${producer}` });
  const mo = pdfinfoDate(get("ModDate")); if (mo) out.push({ kind: "pdf-modified", date: mo, giver: `pdfinfo ${path.relative(ROOT, file)}`, where: "/ModDate", verbatim: `ModDate: ${get("ModDate")}` });
  return out;
}
function bodyEvidence(id) {
  const file = path.join(GROUND, `${id}.txt`);
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split("\n"); const offsets = []; let o = 0; for (const l of lines) { offsets.push(o); o += l.length + 1; }
  const at = (i) => `${path.relative(ROOT, file)} line ${i + 1}, char ${offsets[i]}`;
  const out = [];
  const nonEmpty = lines.map((l, i) => [l.trim(), i]).filter(([l]) => l);
  for (let k = 0; k < lines.length; k++) {
    const l = lines[k].trim(); if (!l) continue;
    let m;
    if ((m = /^(Posted|Published|Sent|Release Date|Date)\s*:\s*(.*)$/i.exec(l))) { const d = textDate(m[2]); if (d) out.push({ kind: "body-marker", marker: m[1], date: d.date, giver: "the document's own bytes", where: at(k), verbatim: l.slice(0, 120) }); }
    if ((m = /^By\s+[^|]{2,60}\|\s*(.+)$/i.exec(l))) { const d = textDate(m[1]); if (d) out.push({ kind: "body-byline", marker: "By … |", date: d.date, giver: "the document's own bytes", where: at(k), verbatim: l.slice(0, 120) }); }
    if (/^File created:/i.test(l)) { const nxt = nonEmpty.find(([, i]) => i > k); const d = nxt && textDate(nxt[0]); if (d) out.push({ kind: "body-marker", marker: "File created:", date: d.date, giver: "the document's own bytes", where: at(nxt[1]), verbatim: `File created: → ${nxt[0].slice(0, 40)}` }); }
    if ((m = /^Last updated:\s*(.+)$/i.exec(l))) { const d = textDate(m[1]); if (d) out.push({ kind: "body-last-updated", marker: "Last updated:", date: d.date, giver: "the document's own bytes", where: at(k), verbatim: l.slice(0, 120) }); }
    if ((m = /\(Ord\.\s+([A-Z]{2}\d{4}-\d+)\s+§\s*\d+,\s*(20\d\d)\)/.exec(l))) out.push({ kind: "body-ordinance", marker: "history note", date: null, ordinance: m[1], year: m[2], giver: "the document's own bytes", where: at(k), verbatim: m[0] });
  }
  // a top-of-body dateline: among the first 12 non-empty lines, a line that is only a date
  for (const [l, i] of nonEmpty.slice(0, 12)) { const d = textDate(l); if (d && l.replace(/[\s,.]/g, "").length <= d.verbatim.replace(/[\s,.]/g, "").length + 4) { out.push({ kind: "body-dateline", marker: "top of body", date: d.date, giver: "the document's own bytes", where: at(i), verbatim: l.slice(0, 80) }); break; } }
  return out;
}
function registerEvidence(id) {
  const e = byId.get(id); const out = [];
  if (!e) return out;
  const url = e.url ?? "";
  for (const t of timeline.entries ?? []) if (url && url.includes(`/p/${t.slug}`)) out.push({ kind: "timeline", date: t.date, giver: `richtext-publication-timeline.json (${t.date_confidence})`, where: `slug ${t.slug}`, verbatim: `${t.date} · ${t.date_confidence}${t.note ? ` · ${t.note}` : ""}` });
  const ld = textDate(e.label) ?? monthYear(e.label); if (ld) out.push({ kind: ld.verbatim.length < 9 || /^[A-Za-z]+\s+20\d\d$/.test(ld.verbatim) ? "label-month" : "label", date: ld.date, giver: "sources.structured.json label", where: `entries[id=${id}].label`, verbatim: e.label });
  let m;
  if ((m = /\/(20\d\d)\/(\d\d)\/(\d\d)\//.exec(url))) out.push({ kind: "url", date: iso(m[1], +m[2], +m[3]), giver: "the URL", where: `entries[id=${id}].url`, verbatim: m[0] });
  else if ((m = /\/(20\d\d)-(\d\d)\//.exec(url))) out.push({ kind: "url-month", date: iso(m[1], +m[2], 1), giver: "the URL (year-month)", where: `entries[id=${id}].url`, verbatim: m[0] });
  return out;
}
function captureEvidence(id) {
  const out = [];
  const pf = path.join(GROUND, `${id}.txt.provenance.json`);
  if (fs.existsSync(pf)) { const p = JSON.parse(fs.readFileSync(pf, "utf8")); if (p.wayback_timestamp) out.push({ kind: "wayback", date: `${p.wayback_timestamp.slice(0, 4)}-${p.wayback_timestamp.slice(4, 6)}-${p.wayback_timestamp.slice(6, 8)}`, giver: "provenance sidecar wayback_timestamp", where: path.relative(ROOT, pf), verbatim: p.wayback_timestamp }); if (p.retrieved_at) out.push({ kind: "retrieved", date: p.retrieved_at.slice(0, 10), giver: "provenance sidecar retrieved_at", where: path.relative(ROOT, pf), verbatim: p.retrieved_at }); }
  const hf = path.join(CUSTODY, "bytes", `${id}.headers.json`);
  if (fs.existsSync(hf)) { try { const h = JSON.parse(fs.readFileSync(hf, "utf8")); const flat = h.headers ?? h; const lm = Object.entries(flat).find(([k]) => k.toLowerCase() === "last-modified")?.[1]; const d = lm && Date.parse(lm); if (d) out.push({ kind: "http-last-modified", date: new Date(d).toISOString().slice(0, 10), giver: "HTTP Last-Modified header", where: path.relative(ROOT, hf), verbatim: String(lm) }); } catch {} }
  return out;
}

// ── gather ─────────────────────────────────────────────────────────────────
const all = {};
for (const id of ids) all[id] = { living: LIVING.test(byId.get(id)?.label ?? ""), label: byId.get(id)?.label ?? null, candidates: [...registerEvidence(id), ...htmlEvidence(id), ...pdfEvidence(id), ...bodyEvidence(id), ...captureEvidence(id)] };

// ── choose ─────────────────────────────────────────────────────────────────
const PRECEDENCE = ["cross-reference (declared, CROSS_REFS)", "timeline", "html-published (article:published_time | JSON-LD datePublished | meta date)", "pdf-creation (authoring tool only)", "body-marker (Posted/Published/Sent/Release Date/File created)", "body-byline", "html-time (first <time datetime>)", "body-dateline (top of body)", "label", "url", "url-month", "label-month", "living page: timeline | html-published | label, else existed-by (earliest Wayback capture, else Last updated, else retrieval) — capture-only"];
const pick = (c, kinds) => { for (const k of kinds) { const hit = c.find((x) => x.kind === k && x.date); if (hit) return hit; } return null; };
const chosen = {};
const chooseOne = (id, depth = 0) => {
  if (chosen[id]) return chosen[id];
  const { living, candidates: c, label } = all[id];
  let choice = null, kind = null;
  const cref = CROSS_REFS[id];
  if (cref) {
    if (cref.kind === "recorded-event") { const ld = pick(c, ["label"]); if (ld) { choice = { ...ld, kind: "recorded-event", rule: cref.why }; kind = "recorded-event"; } }
    else if (cref.via && depth < 3) { const v = chooseOne(cref.via, depth + 1); if (v?.date) { choice = { date: v.date, kind: cref.kind, giver: `${cref.via} (${v.kind}: ${v.giver})`, where: v.evidence?.where, verbatim: v.evidence?.verbatim, rule: cref.why }; kind = cref.kind; } }
  }
  if (!choice && !living) { const h = pick(c, ["timeline", "html-published", "pdf-creation", "body-marker", "body-byline", "html-time", "body-dateline", "label", "url", "url-month", "label-month"]); if (h) { choice = { ...h, rule: `precedence: ${h.kind}` }; kind = h.kind; } }
  if (!choice && living) {
    // a living page: only a strong publication field, or an event its own label dates, counts as creation; a news item's <time> on an index page does not
    const ev = pick(c, ["timeline", "html-published", "label", "label-month"]);
    if (ev) { choice = { ...ev, rule: `living page: ${ev.kind} outranks its captures` }; kind = ev.kind; }
  }
  if (!choice) {
    // EXISTED BY: the earliest evidence that the page was there — its earliest Wayback capture, else the page's own "Last updated", else the day it was retrieved
    // the earliest of every kind of existence evidence — a Wayback capture, the page's own "Last updated", the retrieval — whichever came first
    const w = c.filter((x) => ["wayback", "body-last-updated", "retrieved"].includes(x.kind) && x.date).sort((a, b) => a.date.localeCompare(b.date))[0];
    if (w) { choice = { ...w, kind: "existed-by", rule: `${living ? "a living page (index/directory/home/about by the register label) has no creation date; it" : "no creation evidence of its own;"} existed by its earliest ${w.kind === "wayback" ? "Wayback capture in the register" : w.kind === "body-last-updated" ? "'Last updated' line" : "retrieval"} — capture-only` }; kind = "existed-by"; }
  }
  chosen[id] = choice ? { date: choice.date, kind, giver: choice.giver, evidence: { where: choice.where, verbatim: choice.verbatim, rule: choice.rule, marker: choice.marker ?? choice.field ?? null }, living, label, alternates: c.filter((x) => x !== choice && x.date).map((x) => ({ date: x.date, kind: x.kind, giver: x.giver, where: x.where, verbatim: x.verbatim })) } : { date: null, kind: "undated", giver: null, evidence: null, living, label, alternates: c.filter((x) => x.date).map((x) => ({ date: x.date, kind: x.kind, giver: x.giver, where: x.where, verbatim: x.verbatim })) };
  return chosen[id];
};
for (const id of ids) chooseOne(id);

// ── findings the gathering itself surfaced ─────────────────────────────────
const findings = [];
const shaOf = (id) => byId.get(id)?.evidence?.sha256 ?? null;
const bySha = new Map(); for (const id of ids) { const s = shaOf(id); if (s) { if (!bySha.has(s)) bySha.set(s, []); bySha.get(s).push(id); } }
for (const [sha, group] of bySha) if (group.length > 1) findings.push({ kind: "duplicate-capture", ids: group, sha256: sha, note: "one capture under several register ids — the reader reads the same bytes once per id" });
for (const id of ids) { const ch = chosen[id]; const disagree = ch.alternates.filter((a) => ["timeline", "html-published", "pdf-creation", "body-marker", "body-byline", "label"].includes(a.kind) && a.date !== ch.date && Math.abs(Date.parse(a.date) - Date.parse(ch.date)) > 2 * 86400e3); if (ch.date && disagree.length) findings.push({ kind: "givers-disagree", id, chosen: `${ch.date} (${ch.kind})`, others: disagree.map((a) => `${a.date} (${a.kind})`) }); }

const dates = Object.fromEntries(ids.map((id) => [id, chosen[id]]));
const order = ids.filter((id) => chosen[id].date).sort((a, b) => chosen[a].date.localeCompare(chosen[b].date) || a.localeCompare(b));
const out = {
  schema: "OHSCreationOrder@1", generatedAt: new Date().toISOString(), ground: path.relative(ROOT, GROUND), custody: path.relative(ROOT, CUSTODY),
  precedence: PRECEDENCE, livingRule: String(LIVING), printedProducers: String(PRINTED), crossRefs: CROSS_REFS,
  dates, order,
  // bounds, not birthdays: documents whose date is only the earliest evidence they existed
  existedBy: ids.filter((id) => chosen[id].kind === "existed-by"),
  undated: ids.filter((id) => !chosen[id].date),
  findings,
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
for (const id of order) { const c = chosen[id]; console.log(`${c.date}  ${id.padEnd(32)} ${c.kind.padEnd(16)} ${String(c.evidence?.verbatim ?? "").replace(/\s+/g, " ").slice(0, 70)}`); }
for (const id of out.undated) console.log(`----------  ${id.padEnd(32)} UNDATED           ${all[id].label}`);
console.log(`\n${order.length} dated (${out.existedBy.length} existed-by bounds), ${out.undated.length} undated → ${path.relative(ROOT, OUT)}`);
for (const f of findings) console.log(`finding: ${f.kind} ${JSON.stringify(f.ids ?? f.id)} ${f.others ? `chosen ${f.chosen} vs ${f.others.join(", ")}` : f.note ?? ""}`);
