// native/organs/tschichold-look.js — Tschichold's EYES (node only). The CV
// parent looks at a page ONCE; what it sees is turned into a BYTE RULE that
// reproduces the look from the bytes alone, so the next similar page is read
// without looking. organs/mnemonic.js's own pattern, for layout: "the parent
// teaches, the child remembers; next time, no CV model."
//
// THE LOOK (mechanical CV, no model): the page rendered the way a person
// sees it (the-fold/pdf-read.js renderPdfPage — pdftoppm), read by Tesseract
// in TSV mode — every word with its box, grouped into lines and blocks. Page
// layout geometry is script-independent even where recognition is not.
//
// THE FACTS the look yields, each MEASURED relative to the page itself (no
// pixel constants, no tuned ratios): columns (a gutter — an empty vertical
// band inside the text area that the words on both sides respect, with body
// lines on both sides), a running head / foot (a first or last line set apart
// by a gap larger than every interior line gap of the page — needs an
// interior to compare against, otherwise no call), centred lines (left and
// right margins equal within one character width — the unit — and narrower
// than the page's own median line width), aligned tables (against the page's
// own null, 1/T), figure-like scatter (short lines of labels and numbers,
// counted — the bench decides the share).
//
// THE LEARNING: for each fact, the byte signature that would reproduce it
// is tested on the SAME page's bytes (pdftotext -layout keeps a gutter as a
// run of spaces at a stable character column, a centred title as balanced
// leading space, a table as aligned multi-space gaps). A fact the bytes
// reproduce becomes a candidate rule carrying its look evidence; a fact the
// bytes do NOT reproduce is the finding that the look is still needed for
// that thing (a typed gap, never a guess). Candidates enter the bench only
// after falsification on other pages and other documents.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { extractPdfPages, renderPdfPage } from "../the-fold/pdf-read.js";

export const LOOK_SCHEMA = "EOTypographicLook@1";
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
/** A line's shape: digits → 9, capitals → A, lower case → a, uncased letters → o, spaces collapsed. */
export const shapeOf = (s) => String(s ?? "").trim().replace(/\p{Nd}+/gu, "9").replace(/\p{Lu}+/gu, "A").replace(/\p{Ll}+/gu, "a").replace(/[\p{Lo}\p{Lm}]+/gu, "o").replace(/\s+/g, " ");

/** Tesseract TSV → { width, height, words, lines } — every word with its box. */
export function layoutOf(imagePath, { tesseractBin = process.env.TESSERACT_BIN || "tesseract", psm = 3 } = {}) {
  const tsv = execFileSync(tesseractBin, [imagePath, "stdout", "--psm", String(psm), "tsv"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
  const rows = tsv.split("\n").slice(1).map((l) => l.split("\t")).filter((c) => c.length >= 12);
  const page = rows.find((c) => c[0] === "1");
  const words = rows.filter((c) => c[0] === "5" && c[11]?.trim()).map((c) => ({ block: +c[2], par: +c[3], line: +c[4], x: +c[6], y: +c[7], w: +c[8], h: +c[9], conf: +c[10], text: c[11] }));
  const byLine = new Map();
  for (const w of words) { const k = `${w.block}.${w.par}.${w.line}`; if (!byLine.has(k)) byLine.set(k, []); byLine.get(k).push(w); }
  const lines = [...byLine.values()].map((ws) => ({
    block: ws[0].block, text: ws.map((w) => w.text).join(" "), words: ws,
    x0: Math.min(...ws.map((w) => w.x)), y0: Math.min(...ws.map((w) => w.y)),
    x1: Math.max(...ws.map((w) => w.x + w.w)), y1: Math.max(...ws.map((w) => w.y + w.h)),
  })).sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
  return { width: +page?.[8] || 0, height: +page?.[9] || 0, words, lines };
}

/** What the look sees, measured relative to the page. */
export function layoutFacts(layout) {
  const { lines, words } = layout;
  if (lines.length < 2) return { lines: lines.length, empty: lines.length === 0 };
  const charW = median(words.map((w) => w.w / Math.max(1, w.text.length))) || 1;
  const xmin = Math.min(...lines.map((l) => l.x0)), xmax = Math.max(...lines.map((l) => l.x1));
  // head / foot: a first or last line set apart by a gap larger than every
  // interior gap between consecutive lines of the page. Structural: with no
  // interior gap there is nothing to compare against, so no call.
  const gaps = []; for (let i = 1; i < lines.length; i++) gaps.push(Math.max(0, lines[i].y0 - lines[i - 1].y1));
  const interior = gaps.slice(1, -1), maxInterior = interior.length ? Math.max(...interior) : 0;
  const separable = interior.length > 0;
  const head = separable && gaps[0] > maxInterior ? lines[0] : null;
  const foot = separable && gaps.at(-1) > maxInterior ? lines.at(-1) : null;
  // columns: an empty vertical band inside the text area, respected by the
  // body's words (coverage histogram at one-character resolution — the unit).
  // Searched edge-to-edge minus the outer bins (margins are not gutters);
  // the gutter is the widest zero-coverage run. Two columns only when body
  // lines sit wholly on BOTH sides — the structural minimum for "two sides",
  // no share threshold; the bench falsifies the rest.
  const body = lines.filter((l) => l !== head && l !== foot);
  const bins = Math.max(1, Math.ceil((xmax - xmin) / charW));
  const cover = new Array(bins).fill(0);
  for (const l of body) for (const w of l.words) for (let b = Math.floor((w.x - xmin) / charW); b <= Math.floor((w.x + w.w - xmin) / charW) && b < bins; b++) if (b >= 0) cover[b]++;
  let gutter = null;
  for (let b = 1, run = 0; b < bins - 1; b++) {
    if (cover[b] === 0) { run++; if (!gutter || run > gutter.width) gutter = { width: run, x: Math.round(xmin + (b - run / 2) * charW) }; } else run = 0;
  }
  const leftN = body.filter((l) => gutter && l.x1 <= gutter.x).length, rightN = body.filter((l) => gutter && l.x0 >= gutter.x).length;
  const columns = gutter && leftN >= 1 && rightN >= 1 ? { count: 2, gutterX: gutter.x, left: leftN, right: rightN } : { count: 1 };
  // centred lines: margins equal within one character width (the unit) and
  // narrower than the page's own median body-line width — no ratio.
  const bodyWidths = body.map((l) => l.x1 - l.x0);
  const medianWidth = median(bodyWidths);
  const centred = body.filter((l) => Math.abs((l.x0 - xmin) - (xmax - l.x1)) <= charW && (l.x1 - l.x0) < medianWidth).map((l) => l.text.slice(0, 60));
  // aligned tables — against the PAGE'S OWN NULL. Justified prose shares word
  // starts by chance (a 12-word line meets another at ~3 columns: measured on
  // NTRS prose pages, where a looser test called every page a table). An
  // adjacent pair is aligned only when its shared-start count is matched or
  // beaten by at most 1/T of the non-adjacent pairs on the same page (T = the
  // adjacent pairs tested); a table is a run of ≥2 aligned pairs.
  // The null is per pair, not a raw count (a first cut compared raw shared
  // counts and failed: two random 10-word prose lines share ~4 starts, a
  // perfectly aligned 4-column row shares 4): if B's n_B word starts fell at
  // random across the text width, each would land within one character of
  // one of A's n_A starts with p = 3·n_A / width — so the shared count is
  // Binomial(n_B, p), and a pair is aligned when P(X ≥ shared) ≤ 1/T.
  const starts = body.map((l) => l.words.map((w) => Math.round((w.x - xmin) / charW)));
  const shared = (a, b) => starts[b].filter((s) => starts[a].some((t) => Math.abs(t - s) <= 1)).length;
  const widthChars = Math.max(1, (xmax - xmin) / charW);
  const lC = (n, k) => { let v = 0; for (let i = 1; i <= k; i++) v += Math.log(n - k + i) - Math.log(i); return v; };
  const binomUpper = (n, p, k) => { if (k <= 0) return 1; if (p >= 1) return 1; let s = 0; for (let x = k; x <= n; x++) s += Math.exp(lC(n, x) + x * Math.log(p) + (n - x) * Math.log(1 - p)); return Math.min(1, s); };
  const T = Math.max(1, body.length - 1);
  const alignedPair = (i) => {
    const nA = starts[i].length, nB = starts[i + 1].length;
    if (nA < 2 || nB < 2) return false;
    const s = shared(i, i + 1);
    return binomUpper(nB, Math.min(1, (3 * nA) / widthChars), s) <= 1 / T;
  };
  const tables = []; let runStart = -1, pairs = 0;
  for (let i = 0; i + 1 < body.length; i++) {
    if (alignedPair(i)) { if (runStart < 0) runStart = i; pairs++; }
    else { if (pairs >= 2) tables.push({ lines: pairs + 1, first: body[runStart].text.slice(0, 50) }); runStart = -1; pairs = 0; }
  }
  if (pairs >= 2) tables.push({ lines: pairs + 1, first: body[runStart].text.slice(0, 50) });
  // figure-like scatter: short lines (≤ 2 words) carrying numbers, as a share of lines
  const shortNumeric = body.filter((l) => l.words.length <= 2 && /\p{Nd}/u.test(l.text)).length;
  return {
    lines: lines.length, charWidthPx: +charW.toFixed(1),
    head: head ? { text: head.text.slice(0, 80) } : null,
    foot: foot ? { text: foot.text.slice(0, 80), number: /^\p{Nd}{1,4}$/u.test(foot.text.trim()) } : null,
    columns, centred: centred.slice(0, 8), centredCount: centred.length, tables, shortNumeric, shortNumericShare: +(shortNumeric / Math.max(1, body.length)).toFixed(3),
  };
}

/**
 * learnFromLook(pageBytes, facts) → candidates: for each fact the look saw,
 * does a byte signature in the page's own text reproduce it?
 *   { rule, sawByLook, byteSignature, reproducedByBytes, evidence }
 * reproducedByBytes:false is kept — it says the look is still needed there.
 */
export function learnFromLook(pageBytes, facts) {
  const raw = String(pageBytes ?? "").replace(/\r/g, "");
  const lines = raw.split("\n");
  const text = lines.filter((l) => l.trim());
  const out = [];
  if (facts.columns?.count === 2) {
    // a stable character column that is blank inside two-sided lines.
    // Searched edge-to-edge minus the outer columns; the 3-wide blank run is
    // the byte-grid resolution unit (pdftotext -layout quantizes to whole
    // characters), not a tuned threshold. Reproduced when the best column's
    // gap count is uniquely maximal over the columns tested (T = columns
    // tested, needs 1/T = unique) and recurs on at least two lines — the
    // structural minimum for "stable", no share ratio.
    const width = Math.max(0, ...text.map((l) => l.length));
    const cols = [];
    for (let c = 1; c < width - 1; c++) cols.push(c);
    let best = null;
    for (const c of cols) {
      let two = 0, gap = 0;
      for (const l of text) { const left = l.slice(0, c).trim(), right = l.slice(c).trim(); if (left && right) { two++; if (l[c] === " " && l[c - 1] === " " && l[c + 1] === " ") gap++; } }
      if (two && (!best || gap > best.gap)) best = { col: c, gap, two };
    }
    const atBest = best ? cols.filter((c) => { let gap = 0; for (const l of text) { const left = l.slice(0, c).trim(), right = l.slice(c).trim(); if (left && right && l[c] === " " && l[c - 1] === " " && l[c + 1] === " ") gap++; } return gap >= best.gap; }).length : 0;
    // Unique maximum over the T columns tested: beats chance at 1/T.
    const ok = !!best && best.gap >= 2 && atBest === 1;
    out.push({ rule: "gutter-split", sawByLook: `two columns, gutter at x=${facts.columns.gutterX}px`, byteSignature: best ? `a blank run at character column ${best.col} in ${best.gap} of ${text.length} lines` : "no stable blank column", reproducedByBytes: ok, evidence: best });
  }
  // head / foot: generalised to a SHAPE ("(12)" → "(9)", "-5-" → "-9-") and
  // looked for among the page's first / last three byte lines — pdftotext's
  // edge order need not be the eye's.
  // What the eye tells apart at an edge: a decorated number is a page number,
  // a foot opening on a note mark is a footnote band, anything else set apart
  // is a heading — a RUNNING head/foot only when its shape recurs across
  // pages (lookAtPdf's edgeRules decide that, never one page).
  const NOTE_MARKS = new Set(["*", "†", "‡", "§", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"]);
  for (const [edge, fact, pick] of [["head", facts.head, text.slice(0, 3)], ["foot", facts.foot, text.slice(-3)]]) {
    if (!fact) continue;
    const want = shapeOf(fact.text);
    const kind = /^[\p{P}\p{S}\s]*9[\p{P}\s]*$/u.test(want) ? "page-number" : edge === "foot" && NOTE_MARKS.has([...fact.text.trim()][0]) ? "footnote-band" : `set-apart-${edge}`;
    const hit = pick.find((l) => shapeOf(l.trim()) === want || shapeOf(l.trim()).includes(want));
    out.push({ rule: kind, edge, shape: want, sawByLook: `a ${edge} line set apart: "${fact.text.slice(0, 40)}"`, byteSignature: hit ? `a byte ${edge} line of the same shape: "${hit.trim().slice(0, 40)}"` : `no ${edge} byte line of shape "${want}"`, reproducedByBytes: !!hit, evidence: { shape: want, byteLine: hit?.trim().slice(0, 80) ?? null } });
  }
  if (facts.centredCount) {
    // Balanced leading/trailing space on the byte grid (±2 chars is the
    // byte-grid resolution unit, matching the eye's ±1 charW at coarser
    // quantization); narrower than the page's own widest byte line — no
    // ratio. Reproduced when the bytes show at least one such line; the
    // tally across pages decides the rule, not a count match.
    const width = Math.max(0, ...text.map((l) => l.length));
    const centredBytes = text.filter((l) => { const lead = l.length - l.trimStart().length; const tail = width - l.trimEnd().length; return lead > 0 && Math.abs(lead - tail) <= 2 && l.trim().length < width; }).length;
    out.push({ rule: "centred-lines", sawByLook: `${facts.centredCount} centred line(s)`, byteSignature: `${centredBytes} byte line(s) with balanced leading/trailing space`, reproducedByBytes: centredBytes >= 1, evidence: { centredBytes } });
  }
  if (facts.tables?.length) {
    // At least one byte line per seen block — one witness per block, the
    // structural minimum, no constant. A multi-space gap is the byte-grid
    // resolution unit for alignment.
    const aligned = text.filter((l) => (l.trim().match(/\S\s{2,}\S/g) ?? []).length >= 2).length;
    out.push({ rule: "aligned-table", sawByLook: `${facts.tables.length} aligned block(s), ${facts.tables.reduce((a, t) => a + t.lines, 0)} line(s)`, byteSignature: `${aligned} byte line(s) with two or more multi-space gaps`, reproducedByBytes: aligned >= facts.tables.length, evidence: { aligned } });
  }
  // figure-like scatter: the look counted short numeric lines; the share is
  // reported, never gated. Propose whenever the look saw recurrence (≥2 —
  // the structural minimum for "scatter"), reproduce the same way on bytes.
  if ((facts.shortNumeric ?? 0) >= 2) {
    const shortNum = text.filter((l) => l.trim().split(/\s+/).length <= 2 && /\p{Nd}/u.test(l)).length;
    out.push({ rule: "figure-labels", sawByLook: `short numeric label lines are ${Math.round((facts.shortNumericShare ?? 0) * 100)}% of the page`, byteSignature: `${shortNum} of ${text.length} byte lines are short and numeric`, reproducedByBytes: shortNum >= 2, evidence: { shortNum } });
  }
  return out;
}

/**
 * lookAtPdf(pdfPath, { pages, dpi, tmpDir }) → EOTypographicLook@1:
 * per page { page, facts, candidates }, and per rule a within-document tally —
 * a candidate whose byte signature reproduced the look on most looked pages
 * is ready for falsification on OTHER documents.
 */
export async function lookAtPdf(pdfPath, { pages = null, dpi = 150, tmpDir = null } = {}) {
  const dir = tmpDir ?? fs.mkdtempSync(path.join(os.tmpdir(), "tschichold-look-"));
  const bytesPages = await extractPdfPages(pdfPath);
  const which = pages ?? bytesPages.map((_, i) => i + 1);
  const letters = (s) => (String(s).match(/\p{L}/gu) ?? []).length;
  const docMedian = median(bytesPages.map(letters));
  const perPage = [];
  for (const p of which) {
    if (p < 1 || p > bytesPages.length) continue;
    const png = await renderPdfPage(pdfPath, p, { tmpDir: dir, dpi });
    const layout = layoutOf(png);
    const facts = layoutFacts(layout);
    const candidates = learnFromLook(bytesPages[p - 1], facts);
    // A THIN TEXT LAYER: the eye reads more letters than the bytes carry (a
    // scan page, a figure set as an image). Proposed when both hold on the
    // page's own terms — the eye exceeds the bytes, and the bytes fall below
    // the document's own median — no multiplier. The byte-only predictor it
    // teaches is the same pair: letters below the document median while the
    // look saw more. The tally across pages, not a ratio, decides the rule.
    const eye = layout.words.reduce((a, w) => a + letters(w.text), 0), got = letters(bytesPages[p - 1]);
    if (eye > got && got < docMedian) candidates.push({ rule: "thin-text-layer", sawByLook: `the look reads ${eye} letters, the text layer carries ${got}`, byteSignature: `${got} letters against the document's median ${docMedian}`, reproducedByBytes: got < docMedian, evidence: { eyeLetters: eye, byteLetters: got, docMedian } });
    perPage.push({ page: p, facts, candidates });
  }
  const tally = {};
  for (const pg of perPage) for (const c of pg.candidates) { const t = (tally[c.rule] ??= { looked: 0, reproduced: 0 }); t.looked++; if (c.reproducedByBytes) t.reproduced++; }
  // Edge shapes that recur across looked pages are the document's own
  // running-head / page-number conventions — a byte rule stated as a table of
  // shapes, held on every page it was seen (≥2 pages is the structural minimum
  // for "recurs", not a threshold), ready to be falsified elsewhere.
  const shapes = new Map();
  for (const pg of perPage) for (const c of pg.candidates) if (c.shape) { const k = `${c.edge}\u0000${c.shape}`; const s = shapes.get(k) ?? { edge: c.edge, kind: c.rule, shape: c.shape, pages: [], reproduced: 0 }; s.pages.push(pg.page); if (c.reproducedByBytes) s.reproduced++; shapes.set(k, s); }
  const edgeRules = [...shapes.values()].filter((s) => s.pages.length >= 2).map((s) => ({ ...s, rule: s.kind === "page-number" ? "page-number" : `running-${s.edge}` })).sort((a, b) => b.pages.length - a.pages.length);
  return { schema: LOOK_SCHEMA, source: pdfPath, pagesInDocument: bytesPages.length, looked: perPage.length, perPage, tally, edgeRules, basis: "pdftoppm render + tesseract TSV layout (mechanical CV); byte signatures tested on pdftotext -layout of the same page" };
}
