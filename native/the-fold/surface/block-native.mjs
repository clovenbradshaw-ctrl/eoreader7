// block-native.mjs — THE NATIVE VIEW (the retained PDF, rendered, linked).
//
// Fold invariant: THE NATIVE VIEW IS A RENDERING OF THE RETAINED BYTES,
// NEVER A NEW DOCUMENT. Each page is rasterized from the pinned PDF
// (pdftoppm), and the text layer is extracted from the same PDF (pdf.js
// textContent) so every word is a real addressable token in that page's
// coordinate space. Words are linked BY STRING VALUE — a word is a door to
// the corpus search and to any being it names — never by a fabricated byte
// claim: pdftotext order and pdf.js order provably diverge, so the exact
// byte layer stays in source mode. When pdf.js or pdftoppm is unavailable,
// this block degrades to null and the surface renders the reader/source
// modes only.
import { readFileSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const PDFJS_PATHS = [
  "/Users/mlacy/Documents/3.0/eoWebLLM/node_modules/pdfjs-dist/legacy/build/pdf.js",
  "pdfjs-dist/legacy/build/pdf.js",
];
let pdfjsLib = null;
for (const p of PDFJS_PATHS) {
  try { pdfjsLib = require(p); if (pdfjsLib?.getDocument) break; pdfjsLib = null; } catch { pdfjsLib = null; }
}

// DPI/quality tuned empirically against the 5 real Nashville-plan PDFs (648
// pages total): grayscale JPEG at 55dpi/quality=35 keeps every sampled page
// (plain list text, colored-callout body text, a dense small-font data
// table with narrow cells, dense 3-column small text, and a color
// illustration page) legible at typical ~700-1000px display widths, while
// cutting the total base64 image payload from ~108.6MB to ~25MB (measured
// directly via buildNativePages() against the real PDFs, not projected).
// Color is dropped (-gray) because these are planning-doc pages — mostly
// black text on white/pale backgrounds — where color contributes
// negligible legibility value but meaningfully inflates JPEG size; the
// text/word layer (word bounding boxes) is extracted independently via
// pdf.js and is unaffected by any of this.
const DPI = 55;
const JPEG_QUALITY = 35;
const GRAYSCALE = true;
const MAX_WORDS_PER_PAGE = 1500;

export async function buildNativePages(doc) {
  if (!pdfjsLib) return null;
  let dir = null;
  try {
    dir = mkdtempSync(join(process.env.TMPDIR ?? "/tmp", "naty-"));
    const ppmArgs = ["-jpeg", "-jpegopt", `quality=${JPEG_QUALITY}`, "-r", String(DPI)];
    if (GRAYSCALE) ppmArgs.push("-gray");
    execFileSync("pdftoppm", [...ppmArgs, doc.pdfPath, join(dir, "page")], { stdio: "pipe" });
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".jpg"))
      .sort((a, b) => Number(a.match(/(\d+)\.jpg$/)?.[1] ?? 0) - Number(b.match(/(\d+)\.jpg$/)?.[1] ?? 0));
    const data = new Uint8Array(readFileSync(doc.pdfPath));
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const scale = DPI / 72;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const vp = page.getViewport({ scale });
      const file = files[i - 1];
      const img = file ? `data:image/jpeg;base64,${readFileSync(join(dir, file)).toString("base64")}` : null;
      const words = [];
      try {
        const tc = await page.getTextContent();
        for (const item of tc.items) {
          if (!item.str || item.width < 0.5) continue;
          const tx = pdfjsLib.Util.transform(vp.transform, item.transform);
          const w = item.width * Math.abs(tx[0]);
          const h = item.height * Math.abs(tx[3]);
          const x = tx[4];
          const y = tx[5] - h;
          if (w < 2 || h < 2) continue;
          const toks = item.str.split(/\s+/).filter(Boolean);
          if (toks.length > 1) {
            const avg = w / item.str.length;
            let cx = x;
            for (const tok of toks) {
              const tw = tok.length * avg;
              words.push({ t: tok, x: cx, y, w: tw, h });
              cx += tw + avg;
              if (words.length >= MAX_WORDS_PER_PAGE) break;
            }
          } else {
            words.push({ t: item.str, x, y, w, h });
          }
          if (words.length >= MAX_WORDS_PER_PAGE) break;
        }
      } catch { /* a page whose text layer fails still shows its image */ }
      pages.push({ w: Math.round(vp.width), h: Math.round(vp.height), img, words });
    }
    return pages;
  } catch (e) {
    return null;
  } finally {
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
}

export const NATIVE_AVAILABLE = Boolean(pdfjsLib);