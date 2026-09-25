#!/usr/bin/env node
// hunt-genre-sidecar.mjs — the sidecar goes hunting. For a query, search the
// web, fetch the tiered top results, read each through the constitutional
// reader, cut its movements at its OWN seams, and append one FortunePrior@1
// entry per source — tagged with the genre/medium the caller declares. The
// prior is not afraid of structure across genres and mediums: the movements
// are the caller's, the medium is a declared tag, and the hunt feeds it from
// anywhere.
// usage: node native/eval/the-fold/hunt-genre-sidecar.mjs "<query>" --genre=<g> --medium=<m> [--pages=2] [--chars=30000]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCausalTextPerceiver, textEncounters, surfaceIndex, surfacesIn } from "../../adapters/text/recursive.js";
import { diaNorm, namesCorefer } from "../../adapters/text/surfaces.js";
import { reviseTextFold } from "../../adapters/text/revision.js";
import { reconstruct } from "../../kernel/fold.js";
import { createRecursiveReader } from "../../kernel/reading.js";
import { readingIndexFromLog } from "../../the-fold/reading-log.js";
import { segmentBySurprise } from "../../kernel/surprise-segments.js";
import { appendFortune, classifyFortuneShape, fortuneSummary } from "../../kernel/fortune-prior.js";
import { extractReadable } from "../../organs/web.js";
import crypto from "node:crypto";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const POS = path.resolve(HERE, "../../../cli/priors/pos-prior-en.json");
const PRIOR = path.resolve(HERE, "../../../../live_priors/derived-priors/arc-priors/fortune-prior-v1.json");

const query = process.argv[2];
const genre = process.argv.find((a) => a.startsWith("--genre="))?.slice(8) ?? "unclassified";
const medium = process.argv.find((a) => a.startsWith("--medium="))?.slice(9) ?? "web";
const pages = Number(process.argv.find((a) => a.startsWith("--pages="))?.slice(8) ?? 2);
const CHARS = Number(process.argv.find((a) => a.startsWith("--chars="))?.slice(8) ?? 30000);
if (!query) { console.error("usage: hunt-genre-sidecar.mjs <query> --genre=<g> --medium=<m> [--pages=2] [--chars=30000]"); process.exit(1); }

const tierOf = (url, title = "") => {
  const t = String(title ?? "").toLowerCase(); const h = String(url ?? "").toLowerCase();
  if (/wikipedia\.org|wikisource|gutenberg|poetryfoundation|americanliterature/i.test(h)) return 0;
  if (/\.(gov|edu)\b/.test(h)) return 0;
  if (/essay|gradesfixer|bartleby|coursehero|brainly/i.test(t)) return 2;
  return 1;
};

// ── HUNT: DDG search, tiered results, fetch, extract readable ──────────────
console.error(`hunt: "${query}" · ${genre}/${medium} · up to ${pages} page(s)`);
const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, { headers: { "user-agent": "the-fold-explore/0.1 (local research instrument)" } });
const html = await res.text();
const results = [];
const seen = new Set();
const re = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
let m;
while ((m = re.exec(html)) && results.length < 8) {
  let href = m[1];
  if (/[?&]uddg=([^&]+)/.test(href)) { try { href = decodeURIComponent(href.match(/[?&]uddg=([^&]+)/)[1]); } catch { continue; } }
  if (!/^https?:\/\//i.test(href) || /duckduckgo\.com\//.test(href)) continue;
  if (seen.has(href)) continue; seen.add(href);
  results.push({ url: href, title: m[2].replace(/<[^>]+>/g, "").trim() });
}
results.sort((a, b) => tierOf(a.url, a.title) - tierOf(b.url, b.title));
console.error(`  ${results.length} result(s), top: ${results.slice(0, pages).map((r) => r.title.slice(0, 40)).join(" | ")}`);

let prior = null;
try { prior = JSON.parse(fs.readFileSync(PRIOR, "utf8")); } catch {}
const pos = JSON.parse(fs.readFileSync(POS, "utf8"));

for (const r of results.slice(0, pages)) {
  try {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 20000);
    const page = await fetch(r.url, { signal: ctrl.signal, headers: { "user-agent": "the-fold-explore/0.1" } }); clearTimeout(t);
    if (!page.ok) { console.error(`  skip ${r.title.slice(0, 30)} (${page.status})`); continue; }
    const { text, headings } = extractReadable(await page.text());
    // A GUTENBERG EBOOK LANDING PAGE IS NOT THE MATERIAL: /ebooks/NNNN is an
    // index, not prose — follow to the plain-text rendering and fetch that.
    // Hunting the landing page is how flatline contamination enters the sidecar.
    let fetchedUrl = r.url, body0 = text;
    const gid = String(fetchedUrl).match(/gutenberg\.org\/ebooks\/(\d+)/i);
    if (gid && !/\.txt$/i.test(fetchedUrl)) {
      try {
        const txt = await fetch(`https://www.gutenberg.org/cache/epub/${gid[1]}/pg${gid[1]}.txt`, { headers: { "user-agent": "the-fold-explore/0.1" } });
        if (txt.ok) { const raw = await txt.text(); body0 = raw; fetchedUrl = `https://www.gutenberg.org/cache/epub/${gid[1]}/pg${gid[1]}.txt`; console.error(`  ⤷ gutenberg: followed to plain text (${raw.length} chars)`); }
      } catch {}
    }
    const src = { text: body0, headings };
    if (!src.text || src.text.trim().length < 300) { console.error(`  skip ${r.title.slice(0, 30)} (thin)`); continue; }
    // THE SOURCE'S OWN HEADINGS ARE THE STAGING: the material's structure is
    // the stage names a reader cannot invent. HTML headings plus the plain
    // body's own chapter markers (a Gutenberg .txt has no tags — its structure
    // is the "CHAPTER" lines, often spelled-out: "CHAPTER ONE."). Nav noise is
    // dropped; the Gutenberg license preamble is cut at its own START marker.
    const STAGE_NOISE = /^(menu|home|search|sign\s*in|sign\s*up|subscribe|shop|skip|more|about|back\s*to|advertis|newsletter|privacy|terms|cookies|table\s*of\s*contents)$/i;
    const htmlStaging = (headings ?? [])
      .filter((hn) => !STAGE_NOISE.test(String(hn.text).replace(/\W+/g, " ").trim()) && hn.text.length <= 90)
      .map((hn) => String(hn.text).replace(/\s+/g, " ").trim());
    const startM = src.text.match(/\*\*\*\s*START OF (?:THE )?PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i);
    const bookBody = startM ? src.text.slice(startM.index) : src.text;
    const NUM = `(?:${["ONE","TWO","THREE","FOUR","FIVE","SIX","SEVEN","EIGHT","NINE","TEN","ELEVEN","TWELVE","THIRTEEN","FOURTEEN","FIFTEEN","SIXTEEN","SEVENTEEN","EIGHTEEN","NINETEEN","TWENTY","THIRTY","FORTY","FIFTY"].join("|")}|[IVXLCDM]+|\\d+)`;
    const CHAPTER_RE = new RegExp(`^\\s*(CHAPTER|CHAP\\.?|PART|SECTION|BOOK)\\s+${NUM}[.:]?\\s*(.*)$`, "gim");
    const chapters = [];
    { let cm; while ((cm = CHAPTER_RE.exec(bookBody))) { const label = `${cm[1]} ${cm[2]}${cm[3] ? " — " + cm[3].trim() : ""}`.trim(); if (label && !chapters.includes(label)) chapters.push(label); } }
    const staging = [...new Set([...htmlStaging, ...chapters])].slice(0, 40);
    const body = src.text.trim().slice(0, CHARS);
    const sents = body.replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[A-Z])/).map((s) => s.trim()).filter((s) => s.length > 30);

    // read it, fortune it, seam-stage it — the same pipeline, online
    const reader = createRecursiveReader({ perceivers: [createCausalTextPerceiver({ minRelationSurfaces: 2, posPrior: pos, reprojectEvery: 10 })], adapters: { revise: (a) => reviseTextFold({ ...a, canonicalizationFloor: 2 }), retrieve: () => [] } });
    for (const e of textEncounters(body, { source: `web:${fetchedUrl}`, offset: 0 })) await reader.step(e);
    const idx = readingIndexFromLog(reader.getLog(), { reconstruct, diaNorm, namesCorefer, surfaceIndex, surfacesIn });
    const ge = reader.getFold()?.graphEntries ?? [];
    const notes = (arr) => { const out = []; for (const e of arr ?? []) { const rr = e?.relation && Array.isArray(e?.participants); if (e?.schema !== "EOHyperedge@1" && !rr) continue; if (!e?.relation) continue; const end = (p) => p?.surface ?? p?.ref ?? p?.surfaceKey ?? null; const s = end(e.participants?.[0]); if (!s) continue; const o = end(e.participants?.[e.participants.length - 1]) ?? "?"; out.push({ end1: s, label: e.relation, end2: o }); } return out; };
    const props = notes(ge);
    const norm = (x) => String(x ?? "").toLowerCase().split(/\s+/).join(" ");
    const propTerms = props.map((p, i) => ({ i, terms: [norm(p.end1), norm(p.end2), norm(p.label)].filter((t) => t.length > 2) }));
    const firstCover = new Array(props.length).fill(-1);
    for (let si = 0; si < sents.length; si++) { const s = norm(sents[si]); for (const pt of propTerms) { if (firstCover[pt.i] >= 0) continue; if (pt.terms.some((x) => s.includes(x))) firstCover[pt.i] = si; } }
    const fortune = []; let cum = 0; for (let si = 0; si < sents.length; si++) { cum += firstCover.filter((c) => c === si).length; fortune.push(cum); }

    let seamBoundaries = [];
    try { const sb = segmentBySurprise(sents.map((x) => x.toLowerCase().split(/[^\p{L}\p{N}']+/u).filter((w) => w.length >= 2)).flat(), { order: 3, alpha: 0.7, draws: 64, seed: 7, minLength: 160 }); seamBoundaries = sb?.boundaries ?? []; } catch { seamBoundaries = []; }
    const starts = []; let tok = 0; for (const s of sents) { starts.push(tok); tok += s.toLowerCase().split(/[^\p{L}\p{N}']+/u).filter((w) => w.length >= 2).length; }
    const boundaries = [0];
    for (const sb of seamBoundaries) for (let i = 1; i < starts.length; i++) { if (sb >= starts[i - 1] && sb < starts[i]) { if (!boundaries.includes(i)) boundaries.push(i); break; } }
    if (boundaries[boundaries.length - 1] !== sents.length - 1) boundaries.push(sents.length - 1);
    boundaries.sort((a, b) => a - b); const uniq = [...new Set(boundaries)];

    const movements = [];
    for (let mm = 0; mm < uniq.length - 1; mm++) {
      const lo = uniq[mm], hi = uniq[mm + 1];
      const claimIdx = firstCover.map((c, i) => (c >= lo && c < hi ? i : -1)).filter((i) => i >= 0);
      const claims = claimIdx.map((i) => props[i]);
      const counts = new Map(); for (const c of claims) for (const x of [norm(c.end1), norm(c.end2)]) if (x.length > 3) counts.set(x, (counts.get(x) ?? 0) + 1);
      const focus = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k)[0] ?? "the subject";
      movements.push({ focus, from: lo, to: hi, freshClaims: claims.length, gain: claims.length });
    }
    const gains = movements.map((mm) => mm.gain);
    const shape = classifyFortuneShape(gains);
    const entry = { source: { file: fetchedUrl, title: r.title.slice(0, 80), sha: crypto.createHash("sha256").update(body).digest("hex").slice(0, 16), chars: body.length }, readAt: new Date().toISOString(), recipe: "online hunt: DDG -> fetch -> recursive reader -> fortune -> seam-staging + source headings", genre, medium, subgenre: query, staging, movements, gains, fortunePeak: fortune[fortune.length - 1] ?? 0 };
    prior = appendFortune(prior, entry);
    fs.writeFileSync(PRIOR, JSON.stringify(prior, null, 2));
    console.error(`  ⤷ ${r.title.slice(0, 44)} — ${sents.length} sents, ${props.length} props, ${movements.length} movements, ${shape}`);
  } catch (err) { console.error(`  error ${r.url.slice(0, 40)}: ${err.message.slice(0, 60)}`); }
}

console.log(`\n═══ GENRE SIDECAR after hunt "${query}" ═══`);
console.log(JSON.stringify(fortuneSummary(prior), null, 2));
console.log(`\nentries (${prior.entries.length}):`);
for (const e of prior.entries) console.log(`  ${e.genre}/${e.medium} · ${e.shape} · ${e.movements.length} movements · ${String(e.source.file).slice(0, 60)}`);
console.log(`\nprior: ${PRIOR}`);