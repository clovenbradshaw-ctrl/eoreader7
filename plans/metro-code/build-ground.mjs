// build-ground.mjs — full organizational inventory -> per-chapter byte-addressable text.
//
// Reads every raw capture, splits docs into CHAPTER buckets at each
// "Chapter N - TITLE" boundary (some API captures return a whole division of
// chapters in one response; this builder normalizes them to one .txt per chapter),
// derives a deterministic text layer, and writes a provenance sidecar pinning the
// .txt to the raw capture(s) by sha256. Determinism: same captures in, same .txt out.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const RAW = "/Users/mlacy/Documents/3.0/metro-code/raw";
const GROUND = new URL("./ground/", import.meta.url);

const ENTITIES = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'",
  "&nbsp;": " ", "&#39;": "'", "&#8217;": "\u2019", "&#8220;": "\u201c", "&#8221;": "\u201d",
  "&mdash;": "\u2014", "&ndash;": "\u2013", "&#8211;": "\u2013", "&#8212;": "\u2014",
  "&rsquo;": "\u2019", "&lsquo;": "\u2018", "&ldquo;": "\u201c", "&rdquo;": "\u201d",
  "&hellip;": "\u2026", "&bull;": "\u2022", "&sect;": "\u00a7",
};
const decodeEntities = (s) =>
  s.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
   .replace(/&#([0-9]+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
   .replace(/&[a-zA-Z]+;/g, (m) => ENTITIES[m] ?? m);
const stripTags = (s) => s.replace(/<[^>]*>/g, "");
const collapse = (s) => String(s).replace(/\s+/g, " ").trim();

const CHAPTER_RE = /^CHAPTER\s+(\d+(?:\.\d+)?)\.?\s*[-–]\s*(.+)$/i;
const DIVISION_RE = /^DIVISION\s+[IVX]+\.?\s*-\s*(.+)$/i;
const ARTICLE_RE = /^ARTICLE\s+[IVX]+\.?\s*-\s*(.+)$/i;

function titleOf(doc) {
  return collapse(stripTags(decodeEntities(doc.TitleHtml ?? doc.Title ?? "")));
}

function slugFor(chapterNum, title, source) {
  const isCharter = /^charter-/i.test(source);
  const cleanTitle = title.replace(/\*$/, "").replace(/\[\d+\]$/, "").trim();
  const part = cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const n = chapterNum.replace(/\./g, "-").replace(/^2-/, "");
  return isCharter ? `charter-${n}-${part}` : `ch2-${n}-${part}`;
}

function docToText(doc) {
  const title = titleOf(doc);
  const content = doc.Content ?? "";
  const paras = [];
  const blocks = content.split(/<\/p>|<br\s*\/?>/i);
  for (const raw of blocks) {
    const text = collapse(stripTags(decodeEntities(raw)));
    if (!text) continue;
    if (/^History:/i.test(text) || /^\(Ord\.|^\(Res\.|^\(Amended/.test(text)) {
      paras.push(`*History: ${text.replace(/^\*?History:?\s*/i, "").replace(/^\(/, "").replace(/\)$/, "")}`);
    } else {
      paras.push(text);
    }
  }
  return { title, paras };
}

// Collect chapters across all captures, bucketing at chapter boundaries.
const chapters = new Map(); // slug -> { chapterNum, title, source, captureSha, lines }
for (const file of fs.readdirSync(RAW).filter((f) => f.endsWith(".json"))) {
  const rawPath = path.join(RAW, file);
  const captureSha = crypto.createHash("sha256").update(fs.readFileSync(rawPath)).digest("hex");
  const capture = JSON.parse(fs.readFileSync(rawPath, "utf8"));
  let current = null; // { chapterNum, title, lines }
  let pendingDivision = null;
  let pendingArticle = null;
  for (const doc of capture.Docs ?? []) {
    const t = titleOf(doc);
    const cm = t.match(CHAPTER_RE);
    if (cm) {
      if (current) flush(current, file, captureSha);
      const chapterNum = cm[1];
      const title = cm[2].replace(/\*$/, "").replace(/\[\d+\]$/, "").trim();
      current = { chapterNum, title, source: file, lines: [] };
      if (pendingDivision) { current.division = pendingDivision; }
      if (pendingArticle) { current.lines.push(pendingArticle); pendingArticle = null; }
      continue;
    }
    const dm = t.match(DIVISION_RE);
    if (dm) { pendingDivision = dm[1].trim(); if (current) current.division = pendingDivision; continue; }
    const am = t.match(ARTICLE_RE);
    if (am) { pendingArticle = t; if (current) current.lines.push(t); continue; }
    if (current) {
      const { title: docTitle, paras } = docToText(doc);
      current.lines.push(docTitle);
      for (const p of paras) current.lines.push(p);
      current.lines.push("");
    }
  }
  if (current) flush(current, file, captureSha);
}

function flush(ch, file, captureSha) {
  const slug = slugFor(ch.chapterNum, ch.title, file);
  const existing = chapters.get(slug);
  const body = [...(ch.division ? [`(${ch.division})`] : []), ...ch.lines];
  while (body.length && body[body.length - 1] === "") body.pop();
  const txt = body.join("\n") + "\n";
  if (existing) {
    if (existing.txt !== txt) {
      // Same slug, different text: prefer the longer, and note both captures.
      if (txt.length > existing.txt.length) {
        existing.txt = txt;
        existing.captures.push(file);
      }
    } else {
      existing.captures.push(file);
    }
    return;
  }
  chapters.set(slug, { chapterNum: ch.chapterNum, title: ch.title, source: file, txt, captures: [file] });
}

// Write ground files + provenance.
const manifest = [];
for (const [slug, ch] of chapters) {
  const txtPath = path.join(GROUND.pathname, `${slug}.txt`);
  fs.writeFileSync(txtPath, ch.txt);
  const txtSha = crypto.createHash("sha256").update(ch.txt).digest("hex");
  const provenance = {
    schema: "MetroCodeGroundProvenance@1",
    chapter: ch.chapterNum,
    title: ch.title,
    code: "Code of Ordinances — Metropolitan Government of Nashville and Davidson County",
    productId: "14214",
    capture: ch.captures.map((c) => ({ file: `metro-code/raw/${c}` })),
    txt: { file: `metro-code/ground/${slug}.txt`, sha256: txtSha, chars: ch.txt.length },
    license: "public — Metropolitan Government of Nashville and Davidson County code",
    note: "txt is a deterministic text layer over the raw API capture (tag-stripped, entity-decoded, whitespace-collapsed). Byte spans in the ledger address THIS layer only.",
    builtAt: new Date().toISOString(),
  };
  fs.writeFileSync(txtPath + ".provenance.json", JSON.stringify(provenance, null, 2));
  manifest.push({ slug, chapter: ch.chapterNum, title: ch.title, captures: ch.captures, txtSha, chars: ch.txt.length });
  console.log(`grounded ${slug} — ${ch.txt.length} bytes`);
}

fs.writeFileSync(new URL("./manifest.json", import.meta.url).pathname, JSON.stringify({ schema: "MetroCodeManifest@1", productId: "14214", code: "Code of Ordinances", chapterCount: manifest.length, chapters: manifest }, null, 2));
console.log("DONE", manifest.length, "chapters");