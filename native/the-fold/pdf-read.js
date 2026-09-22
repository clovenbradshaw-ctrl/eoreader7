// pdf-read.js — ingest a PDF as a source (2026-09-22).
//
// The user: "it should be able to ingest it as a PDF and to use the
// computer vision to understand any formatting that doesn't pull out
// cleanly." Two senses, the same discipline organs/look.js already holds
// for everything else this engine reads:
//   1. MECHANICAL: `pdftotext -layout` (poppler, a real installed binary —
//      refused loudly if it is not on PATH, never a silent empty read),
//      one page at a time (pdftotext separates pages with a form-feed byte,
//      \f, by default — that IS the page boundary, not counted or guessed).
//   2. VISION: a page whose extracted text reads wrong — organs/look.js's
//      own `weirdFormattingScore` (table rows, box-drawing, sub-sentence
//      lines: multi-column papers, tables, equations, figures with captions
//      all trip it) OR whose extraction came back near-empty (a figure-only
//      page) — is rendered to a real PNG (`pdftoppm`) and read by
//      `lookAtImage`, the SAME local vision-model ladder + OpenCV/OCR
//      cross-check organs/look.js already runs for everything else this
//      engine looks at. Bounded to MAX_VISION_PAGES so one 60-page PDF
//      cannot spend an unbounded number of vision calls; which pages were
//      flagged vs. which were actually looked at is reported honestly.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { WEB_UA, WEB_FETCH_TIMEOUT_MS } from "../organs/web.js";
import { weirdFormattingScore } from "../organs/look.js";

const execFileP = promisify(execFile);
export const PDF_MAX_BYTES = 40 * 1024 * 1024; // 40MB — a paper, not a book scan
export const MAX_VISION_PAGES = 3;

function which(bin) {
  try { execFileSync("which", [bin], { stdio: ["ignore", "pipe", "ignore"] }); return true; } catch { return false; }
}

/** A raw-bytes fetch (liveWeb's own fetch decodes as text — wrong for a
 *  binary PDF). Injectable for tests; production callers omit `fetchImpl`. */
export async function fetchPdfBytes(url, { fetchImpl = globalThis.fetch, timeoutMs = WEB_FETCH_TIMEOUT_MS } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { headers: { "user-agent": WEB_UA, accept: "application/pdf" }, signal: ctl.signal, redirect: "follow" });
    if (res.status >= 400) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > PDF_MAX_BYTES) throw new Error(`PDF too large: ${buf.length} bytes > ${PDF_MAX_BYTES}`);
    return buf;
  } finally { clearTimeout(t); }
}

/** pdftotext's own page boundary is a form-feed byte between pages — never
 *  re-derived or guessed. */
export async function extractPdfPages(pdfPath) {
  if (!which("pdftotext")) throw new Error("pdftotext (poppler-utils) is not on PATH — PDF text extraction is not available, refused rather than silently skipped");
  // A real hang was measured live (2026-09-22): the swarm hunted an
  // untrusted PDF from a search result and pdftotext never returned,
  // taking the whole server down with it (near-zero CPU, no progress, no
  // error — the silent-hang failure mode, worse than a crash). `timeout`
  // sends SIGTERM after WEB_FETCH_TIMEOUT_MS, the SAME bound the web
  // fetcher already holds itself to for exactly this reason.
  const { stdout } = await execFileP("pdftotext", ["-layout", pdfPath, "-"], { maxBuffer: 64 * 1024 * 1024, timeout: WEB_FETCH_TIMEOUT_MS });
  const pages = stdout.split("\f");
  if (pages.length && pages.at(-1).trim() === "") pages.pop();
  return pages;
}

/** One page rendered to a real PNG (pdftoppm) — the way a person would see
 *  it, not the flat text dump the mechanical reader misread. */
export async function renderPdfPage(pdfPath, pageNum, { tmpDir = os.tmpdir(), dpi = 150 } = {}) {
  if (!which("pdftoppm")) throw new Error("pdftoppm (poppler-utils) is not on PATH — PDF page rendering is not available, refused rather than silently skipped");
  const prefix = path.join(tmpDir, `er7-pdf-p${pageNum}-${Date.now()}`);
  await execFileP("pdftoppm", ["-png", "-r", String(dpi), "-f", String(pageNum), "-l", String(pageNum), pdfPath, prefix], { timeout: WEB_FETCH_TIMEOUT_MS });
  const dir = path.dirname(prefix), base = path.basename(prefix);
  const found = fs.readdirSync(dir).filter((f) => f.startsWith(base) && f.endsWith(".png"));
  if (!found.length) throw new Error(`pdftoppm produced no image for page ${pageNum}`);
  return path.join(dir, found[0]);
}

/** A page is worth looking at when its extracted text reads wrong (the SAME
 *  weirdFormattingScore trigger organs/look.js already uses) or extracted
 *  to almost nothing on a page with real content elsewhere (a figure/table
 *  page with only a caption's worth of text). */
export function pageNeedsVision(pageText, { minChars = 40 } = {}) {
  const trimmed = String(pageText ?? "").trim();
  if (trimmed.length < minChars) return { needs: true, reason: "near_empty_extraction" };
  const s = weirdFormattingScore(trimmed);
  if (s.score > 0) return { needs: true, reason: `weird_formatting:${s.signals.join(",")}` };
  return { needs: false, reason: null };
}

/**
 * readPdf({ url, bytes, web, lookAtImage, onPage }) →
 *   { url, title, text, chars, pages, flaggedPages, visionPages, sources }
 * `lookAtImage` is injected (defaults to organs/look.js's real one) so this
 * is testable without a real OpenCV/tesseract/ollama stack.
 */
export async function readPdf({ url, bytes = null, fetchImpl = undefined, lookAtImage = null, onPage = () => {} } = {}) {
  if (!bytes) bytes = await fetchPdfBytes(url, fetchImpl ? { fetchImpl } : {});
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "er7-pdf-"));
  const pdfPath = path.join(tmpDir, "source.pdf");
  fs.writeFileSync(pdfPath, bytes);
  const pages = await extractPdfPages(pdfPath);
  const flagged = pages.map((t, i) => ({ page: i + 1, ...pageNeedsVision(t) })).filter((p) => p.needs);
  const toLook = flagged.slice(0, MAX_VISION_PAGES);
  const look = lookAtImage ?? (await import("../organs/look.js")).lookAtImage;
  const visionPages = [];
  for (const f of toLook) {
    onPage({ phase: "vision", page: f.page, reason: f.reason });
    try {
      const img = await renderPdfPage(pdfPath, f.page, { tmpDir });
      const read = await look(img, { name: `${url ?? "pdf"} page ${f.page}` });
      visionPages.push({ page: f.page, reason: f.reason, text: read.text, standing: read.standing ?? null });
    } catch (e) {
      visionPages.push({ page: f.page, reason: f.reason, error: String(e?.message ?? e).slice(0, 300) });
    }
  }
  const byPage = new Map(visionPages.map((v) => [v.page, v]));
  const merged = pages.map((t, i) => {
    const v = byPage.get(i + 1);
    return v && v.text ? `${t}\n[page ${i + 1}, vision-read (${v.reason}): ${v.text}]` : t;
  }).join("\n\n");
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  return {
    url, title: path.basename(url ?? "document.pdf"),
    text: merged, chars: merged.length,
    pages: pages.length,
    flaggedPages: flagged.map((f) => ({ page: f.page, reason: f.reason })),
    visionPages,
    basis: `${pages.length} page(s) extracted (pdftotext -layout); ${flagged.length} page(s) flagged for vision, ${visionPages.length} actually looked at (bounded to ${MAX_VISION_PAGES})`,
  };
}

export function isPdfUrl(url) {
  return /\.pdf(\?|#|$)/i.test(String(url ?? ""));
}
