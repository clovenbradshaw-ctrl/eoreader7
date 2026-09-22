// pdf-read-falsify.test.mjs — real poppler binaries (pdftotext/pdftoppm) on
// a real, hand-built minimal PDF; the vision model is stubbed (no ollama
// dependency for this falsifier), but the page IS actually rendered to a
// real PNG file on disk first, and the stub is handed that real path.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { readPdf, extractPdfPages, renderPdfPage, pageNeedsVision, isPdfUrl } from "./pdf-read.js";

// A minimal, hand-written, valid-enough PDF (no xref table — poppler
// reconstructs one; verified live against pdftotext before this was
// written). Page 1 has plain, cleanly-extractable prose LONG ENOUGH to
// clear pageNeedsVision's real minChars floor (a one-word page would
// correctly be flagged near_empty_extraction too — that is the pipeline
// working, not a bug to route around). Page 2 is left with no text stream
// at all — a stand-in for a figure/table page that extracts to almost
// nothing, the near_empty_extraction trigger.
function twoPagePdf() {
  const prose = "This paper presents a real paragraph of ordinary readable prose so the mechanical extractor has clearly enough text on this page.";
  return Buffer.from(`%PDF-1.1
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R 6 0 R] /Count 2 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj
4 0 obj<< /Length ${prose.length + 20} >>
stream
BT /F1 10 Tf 10 100 Td (${prose}) Tj ET
endstream
endobj
5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj
6 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << >> >>endobj
trailer<< /Size 7 /Root 1 0 R >>
%%EOF
`, "utf8");
}

test("extractPdfPages: a real PDF, real pdftotext, split on the form-feed page boundary — never re-derived", async () => {
  const bytes = twoPagePdf();
  const dir = fs.mkdtempSync("/tmp/er7-pdf-test-");
  const p = `${dir}/x.pdf`;
  fs.writeFileSync(p, bytes);
  const pages = await extractPdfPages(p);
  assert.equal(pages.length, 2);
  assert.match(pages[0], /ordinary readable prose/);
  assert.equal(pages[1].trim(), "", "the empty page really has no text");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("pageNeedsVision: a near-empty page is flagged near_empty_extraction; clean prose is not flagged", () => {
  assert.equal(pageNeedsVision("").needs, true);
  assert.equal(pageNeedsVision("  \n ").needs, true);
  const clean = "This is a perfectly ordinary paragraph of prose with real sentences and enough words to not look like a table or a column of short lines at all.";
  assert.equal(pageNeedsVision(clean).needs, false);
});

test("readPdf end-to-end on a REAL PDF with real pdftotext + real pdftoppm rendering, a STUBBED vision model", async () => {
  const bytes = twoPagePdf();
  const seenImages = [];
  const stubLook = async (imagePath, { name }) => {
    assert.ok(fs.existsSync(imagePath), "the image handed to the vision stub must be a real file pdftoppm actually rendered");
    seenImages.push(imagePath);
    return { text: `[stub vision read of ${name}]`, standing: "stub standing" };
  };
  const r = await readPdf({ url: "https://example.com/paper.pdf", bytes, lookAtImage: stubLook });
  assert.equal(r.pages, 2);
  assert.deepEqual(r.flaggedPages.map((f) => f.page), [2], "only the empty page 2 is flagged — page 1 extracted cleanly");
  assert.equal(r.visionPages.length, 1);
  assert.equal(seenImages.length, 1, "the vision stub was actually called with a real rendered page image");
  assert.match(r.text, /ordinary readable prose/, "the cleanly-extracted page's real text is kept");
  assert.match(r.text, /\[stub vision read of/, "the vision-read supplement for the flagged page is merged in");
  assert.match(r.basis, /2 page\(s\) extracted/);
  assert.match(r.basis, /1 page\(s\) flagged for vision, 1 actually looked at/);
});

test("readPdf bounds vision calls to MAX_VISION_PAGES even when more pages are flagged", async () => {
  // Five near-empty pages — all flagged, but only the bounded number are
  // actually looked at; the rest are disclosed as flagged-but-not-looked.
  const kids = [3, 6, 9, 12, 15];
  const pdf = `%PDF-1.1
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count 5 >>endobj
${kids.map((k) => `${k} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << >> >>endobj`).join("\n")}
trailer<< /Size 20 /Root 1 0 R >>
%%EOF
`;
  let calls = 0;
  const stubLook = async () => { calls++; return { text: "[vision]", standing: null }; };
  const r = await readPdf({ url: "https://example.com/five.pdf", bytes: Buffer.from(pdf, "utf8"), lookAtImage: stubLook });
  assert.equal(r.pages, 5);
  assert.equal(r.flaggedPages.length, 5);
  assert.equal(r.visionPages.length, 3, "bounded to MAX_VISION_PAGES");
  assert.equal(calls, 3);
});

test("isPdfUrl reads the extension mechanically — no content sniffing", () => {
  assert.equal(isPdfUrl("https://papers.neurips.cc/paper/7181-attention-is-all-you-need.pdf"), true);
  assert.equal(isPdfUrl("https://example.com/paper.pdf?download=1"), true);
  assert.equal(isPdfUrl("https://example.com/paper.html"), false);
});
