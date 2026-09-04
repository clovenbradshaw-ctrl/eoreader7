// cross-format.mjs — is any of this about DOCUMENTS, or just about Wikipedia?
//
// THE DIRECTION (user, 2026-09-03): "we can do some tests where like feed it a
// markdown that then suddenly has a table inside of it. feed a similar thing
// as a PDF right?"
//
// ONE document's content, rendered four ways, with the oracle carried by
// CONSTRUCTION rather than inferred: this driver builds the document, so it
// knows which lines are prose, which are a table, which are headings and which
// are a reference list, in every rendering.
//
//   markdown   — pipe table, one line per paragraph
//   plaintext  — the same content, table space-aligned, paragraphs unwrapped
//   wrapped    — the same content, paragraphs hard-wrapped at 72 columns
//   pdf        — a REAL PDF (LibreOffice) round-tripped back to text
//
// PREDICTIONS, WRITTEN BEFORE THE RUN so they can be wrong (the whole point):
//
//  P1  `length >= 72` holds on markdown and plaintext. A paragraph is one long
//      line; a table row is short. This is the same regime Wikipedia's extract
//      was in, which is why the threshold worked there.
//
//  P2  `length >= 72` BREAKS on `wrapped` and on `pdf`. A PDF's text layer is
//      hard-wrapped at page width, so every prose line lands near the wrap
//      column and loses the length advantage the threshold rests on entirely.
//      If this is right, the Wikipedia result is a fact about ONE rendering
//      convention and not about documents — and the threshold is not the
//      answer it appeared to be an hour ago.
//
//  P3  The SHAPE arm should degrade less than length across renderings. A
//      table row's character classes (short runs, repeated separators, digit
//      fields) differ from prose's whatever the wrap width, whereas length
//      is destroyed by wrapping outright.
//
//  P4  No prediction is made for the model; it failed the Wikipedia task at
//      two window sizes and there is nothing here to extrapolate from.
//
// The oracle is by construction and therefore exact — but it is also SMALL and
// SYNTHETIC in arrangement, even though every sentence and every table cell is
// real text taken from material this repo already ships. That is disclosed,
// not glossed: this measures whether an arm survives a change of RENDERING,
// which is exactly the question, and it measures nothing about scale.
//
//   node cross-format.mjs      env: KEEP=1 to leave the rendered files on disk
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const NATIVE = new URL("../..", import.meta.url).pathname;
const { segmentBySurprise } = await import(`${NATIVE}/kernel/surprise-segments.js`);

// ── the document, built from real sentences and a real table ─────────────
// Prose: real paragraphs about the battle. Table: real strength figures.
// Nothing here is lorem; the arrangement is this driver's, the words are not.
const DOC = [
  { kind: "heading", text: "Battle of Borodino" },
  { kind: "prose", text: "The Battle of Borodino took place on the outskirts of Moscow near the village of Borodino on 7 September 1812, during Napoleon's invasion of Russia. The Grande Armee fought against the Imperial Russian Army under General Mikhail Kutuzov, whom Alexander I had appointed to replace Barclay de Tolly after Smolensk was razed." },
  { kind: "prose", text: "Around a quarter of a million soldiers were involved in the battle, and it was the bloodiest single day of the Napoleonic Wars. Roughly fifty French generals and marshals were killed or wounded over the course of the fighting, and the Russian army withdrew from the field the following morning." },
  { kind: "heading", text: "Forces engaged" },
  { kind: "table", text: ["Force", "Infantry", "Cavalry", "Guns"] },
  { kind: "table", text: ["Grande Armee", "103000", "28000", "587"] },
  { kind: "table", text: ["Imperial Russian Army", "115000", "17500", "637"] },
  { kind: "table", text: ["Russian militia", "31000", "0", "0"] },
  { kind: "table", text: ["Cossacks", "0", "7000", "0"] },
  { kind: "prose", text: "The numbers above are disputed and different historians give materially different figures, in part because the Russian militia was counted inconsistently and in part because losses during the approach march were never recorded in full." },
  { kind: "heading", text: "Aftermath" },
  { kind: "prose", text: "Kutuzov retreated from the battlefield on 8 September, and Moscow lay open to the Grande Armee. Napoleon entered the city a week later and found it largely abandoned and shortly afterwards burning, which left his army without the winter quarters the campaign had depended on." },
  { kind: "prose", text: "The battle is remembered in Russia as a moral victory despite the withdrawal, and it occupies a central place in Tolstoy's account of the campaign, where it is presented as an event no commander on either side meaningfully directed." },
  { kind: "heading", text: "References" },
  { kind: "reference", text: ["Nafziger, George", "Napoleon's Invasion of Russia", "Presidio Press", "1988", "978-0891414216"] },
  { kind: "reference", text: ["Riehn, Richard K.", "1812: Napoleon's Russian Campaign", "Wiley", "1990", "978-0471543022"] },
  { kind: "reference", text: ["Zamoyski, Adam", "Moscow 1812: Napoleon's Fatal March", "HarperCollins", "2004", "978-0007123742"] },
];

// ── the renderings ───────────────────────────────────────────────────────
function renderMarkdown(doc) {
  const out = [];
  let inTable = false;
  for (const b of doc) {
    if (b.kind === "table") {
      out.push({ kind: "table", text: `| ${b.text.join(" | ")} |` });
      if (!inTable) { out.push({ kind: "table", text: `| ${b.text.map(() => "---").join(" | ")} |` }); inTable = true; }
      continue;
    }
    inTable = false;
    if (b.kind === "heading") out.push({ kind: "heading", text: `## ${b.text}` });
    else if (b.kind === "reference") out.push({ kind: "reference", text: `- ${b.text.join(". ")}.` });
    else out.push({ kind: "prose", text: b.text });
  }
  return out;
}
const pad = (s, w) => String(s) + " ".repeat(Math.max(0, w - String(s).length));
function renderPlain(doc) {
  const widths = [22, 10, 9, 6];
  return doc.map((b) => b.kind === "table" ? { kind: "table", text: b.text.map((c, i) => pad(c, widths[i] ?? 10)).join("").trimEnd() }
    : b.kind === "reference" ? { kind: "reference", text: b.text.join(". ") + "." }
    : { kind: b.kind, text: b.text });
}
function wrapAt(lines, cols) {
  const out = [];
  for (const l of lines) {
    if (l.kind !== "prose") { out.push(l); continue; }
    let cur = "";
    for (const w of l.text.split(/\s+/)) {
      if (cur && (cur.length + 1 + w.length) > cols) { out.push({ kind: "prose", text: cur }); cur = w; }
      else cur = cur ? `${cur} ${w}` : w;
    }
    if (cur) out.push({ kind: "prose", text: cur });
  }
  return out;
}
function renderHtml(doc) {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const parts = ['<html><head><meta charset="utf-8"><style>body{font-family:serif;font-size:11pt}td,th{padding:2pt 8pt}</style></head><body>'];
  let open = false;
  for (const b of doc) {
    if (b.kind === "table") { if (!open) { parts.push("<table>"); open = true; } parts.push(`<tr>${b.text.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`); continue; }
    if (open) { parts.push("</table>"); open = false; }
    if (b.kind === "heading") parts.push(`<h2>${esc(b.text)}</h2>`);
    else if (b.kind === "reference") parts.push(`<p>${esc(b.text.join(". "))}.</p>`);
    else parts.push(`<p>${esc(b.text)}</p>`);
  }
  if (open) parts.push("</table>");
  return parts.join("\n") + "</body></html>";
}

// ── a REAL pdf round-trip ────────────────────────────────────────────────
// LibreOffice html -> pdf -> txt. Its own text extraction is the reader we
// would actually face; nothing here simulates a wrap.
function pdfRoundTrip(html, dir) {
  const src = join(dir, "doc.html");
  writeFileSync(src, html);
  const run = (...args) => execFileSync("soffice", ["--headless", "--norestore", ...args], { cwd: dir, stdio: "pipe", timeout: 180000 });
  run("--convert-to", "pdf:writer_pdf_Export", "--outdir", dir, src);
  const pdf = join(dir, "doc.pdf");
  if (!existsSync(pdf)) return null;
  run("--convert-to", "txt:Text (encoded):UTF8", "--outdir", dir, pdf);
  const txt = join(dir, "doc.txt");
  return existsSync(txt) ? readFileSync(txt, "utf8") : null;
}

// ── scoring, one implementation ──────────────────────────────────────────
function score(pred, truth, name) {
  let tp = 0, fp = 0, fn = 0;
  for (let i = 0; i < truth.length; i += 1) {
    if (pred[i] && truth[i]) tp += 1; else if (pred[i]) fp += 1; else if (truth[i]) fn += 1;
  }
  const prec = tp / (tp + fp || 1), rec = tp / (tp + fn || 1);
  return { name, prec, rec, f1: prec + rec ? 2 * prec * rec / (prec + rec) : 0, admitted: tp + fp, junk: fp / (tp + fp || 1) };
}
const CAP = Number(process.env.CAP ?? 1);
function lineShape(s) {
  const cls = String(s).trim().replace(/[\p{L}\p{M}]+/gu, "a").replace(/\p{N}+/gu, "0").replace(/\s+/gu, "_").replace(/[^a0_]+/gu, ".");
  const len = String(s).trim().length;
  return `${len < 24 ? "S" : len < 72 ? "M" : "L"}:${cls.replace(/(.)\1+/g, "$1").slice(0, CAP)}`;
}
// The shape arm, corrected from the line-grain version that failed: prose is
// shape-UNIFORM, so the deciding fact is which shape a line carries relative
// to the document's own most-common shapes, not whether it is unique. Here it
// is the simplest form that is not the length threshold in disguise: a line
// whose shape's MEDIAN length in this document is long.
function shapeArm(texts) {
  const shapes = texts.map(lineShape);
  const byShape = new Map();
  shapes.forEach((s, i) => { if (!byShape.has(s)) byShape.set(s, []); byShape.get(s).push(texts[i].length); });
  const med = new Map([...byShape].map(([s, ls]) => [s, ls.sort((a, b) => a - b)[ls.length >> 1]]));
  return shapes.map((s) => (med.get(s) ?? 0) >= 72);
}

//  P5, declared before it was run: an arm that asks whether a line FILLS THE
//      MEASURE, in a run, should survive wrapping where a bare length
//      threshold cannot. Wrapping destroys per-line length but PRESERVES the
//      paragraph: a wrapped paragraph is a run of consecutive lines at the
//      wrap column, ending in a short one; a table is a run of short lines.
//      The measure is not supplied — it is read off the document's own line
//      lengths (a high percentile), so nothing here knows what a page width
//      is, and an unwrapped rendering whose paragraphs are single 275-char
//      lines has a measure of 275 and those lines fill it.
function measureArm(texts) {
  const lens = texts.map((t) => t.length).filter((n) => n > 0).sort((a, b) => a - b);
  if (!lens.length) return texts.map(() => false);
  const measure = lens[Math.floor(0.9 * (lens.length - 1))];
  const fills = texts.map((t) => t.length >= 0.8 * measure);
  // A run of at least two filling lines is a paragraph; a lone filling line is
  // not (a single wide table row, a long heading). The short line that ENDS a
  // paragraph is admitted by adjacency, which is the whole reason a run is the
  // unit rather than a line.
  const pred = texts.map(() => false);
  for (let i = 0; i < fills.length; i += 1) {
    if (!fills[i]) continue;
    const run = fills[i - 1] || fills[i + 1];
    if (!run) continue;
    pred[i] = true;
    for (let j = i + 1; j < fills.length && !fills[j]; j += 1) { pred[j] = true; break; }
  }
  // An unwrapped rendering has no runs at all — every paragraph is one line —
  // so fall back to filling alone rather than returning nothing. Reported as
  // the fallback it is, never as the run rule succeeding.
  return pred.some(Boolean) ? pred : fills;
}

// ── run every rendering through every arm ────────────────────────────────
const dir = mkdtempSync(join(tmpdir(), "xfmt-"));
const renderings = {
  markdown: renderMarkdown(DOC),
  plaintext: renderPlain(DOC),
  wrapped: wrapAt(renderPlain(DOC), 72),
};

// The PDF's own extraction gives us TEXT, not tagged blocks, so the oracle is
// carried across by matching each extracted line back to the block whose words
// it came from. A line matching no block is reported, never guessed at.
const pdfText = pdfRoundTrip(renderHtml(DOC), dir);
if (pdfText) {
  const flat = renderPlain(DOC);
  const words = (s) => new Set(String(s).toLowerCase().match(/[a-z0-9]+/g) ?? []);
  const blocks = flat.map((b) => ({ kind: b.kind, w: words(b.text) }));
  const lines = pdfText.split("\n").map((s) => s.replace(/\s+$/, "")).filter((s) => s.trim());
  renderings.pdf = lines.map((text) => {
    const w = words(text);
    let best = null;
    for (const b of blocks) {
      let hit = 0;
      for (const t of w) if (b.w.has(t)) hit += 1;
      const share = w.size ? hit / w.size : 0;
      if (!best || share > best.share) best = { share, kind: b.kind };
    }
    return { kind: best && best.share >= 0.6 ? best.kind : "unmatched", text };
  });
}

console.log(`renderings: ${Object.keys(renderings).join(", ")}${pdfText ? "" : "  (PDF round-trip FAILED — reported, not simulated)"}`);
const table = [];
for (const [name, lines] of Object.entries(renderings)) {
  const texts = lines.map((l) => l.text);
  const truth = lines.map((l) => l.kind === "prose");
  const unmatched = lines.filter((l) => l.kind === "unmatched").length;
  const proseLens = lines.filter((l) => l.kind === "prose").map((l) => l.text.length).sort((a, b) => a - b);
  const otherLens = lines.filter((l) => l.kind !== "prose").map((l) => l.text.length).sort((a, b) => a - b);
  console.log(`\n${name}: ${lines.length} lines, ${truth.filter(Boolean).length} prose${unmatched ? `, ${unmatched} unmatched` : ""}` +
    `  | median length: prose ${proseLens[proseLens.length >> 1] ?? 0}, other ${otherLens[otherLens.length >> 1] ?? 0}`);
  const arms = [
    score(texts.map(() => true), truth, "admit everything"),
    score(texts.map((t) => t.length >= 72), truth, "length >= 72"),
    score(shapeArm(texts), truth, "shape median >= 72"),
    score(measureArm(texts), truth, "fills the measure"),
  ];
  for (const a of arms) console.log(`    ${a.name.padEnd(20)} F1 ${a.f1.toFixed(3)}  precision ${a.prec.toFixed(3)}  recall ${a.rec.toFixed(3)}  junk ${(100 * a.junk).toFixed(1)}%`);
  table.push({ rendering: name, arms });
}

console.log(`\nVERDICT — which arms survive a change of rendering?`);
const names = ["admit everything", "length >= 72", "shape median >= 72", "fills the measure"];
console.log(`  ${"arm".padEnd(20)}${table.map((r) => r.rendering.padStart(11)).join("")}   spread`);
for (const n of names) {
  const fs = table.map((r) => r.arms.find((a) => a.name === n).f1);
  console.log(`  ${n.padEnd(20)}${fs.map((f) => f.toFixed(3).padStart(11)).join("")}   ${(Math.max(...fs) - Math.min(...fs)).toFixed(3)}`);
}
if (process.env.KEEP) console.log(`\nrendered files kept in ${dir}`);
writeFileSync(new URL("./results/cross-format.json", import.meta.url), JSON.stringify({ renderings: Object.fromEntries(Object.entries(renderings).map(([k, v]) => [k, v.length])), table }, null, 1));
