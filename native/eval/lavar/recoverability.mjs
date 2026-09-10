// recoverability.mjs — the ledger's most basic quality bar: can the exact
// original words be reconstructed from NOTHING BUT the ledger's own
// addresses? "can you reproduce the verbatim text from the holograph?
// that's the test" (user, this session).
//
// This is NOT the golden-recall metric (how much of the golden's semantic
// content the reader's arrangements matched). It is a structural property
// of the LEDGER ITSELF: every `role:"sentence"` and `role:"scene-break"`
// observation the driver emits carries an `at` address, and — because
// eot-jsonl.mjs emits one sentence observation for EVERY sentence
// splitSentences finds in the chapter's window, unconditionally, whether or
// not a proposition was ever extracted from it — those addresses SHOULD
// tile the chapter's prose with no gaps. If they do not, some byte range
// inside the chapter was never addressed by anything on the ledger at all,
// and no drilling, rereading or model witness can recover it: it was never
// heard in the first place.
//
// usage: node recoverability.mjs <ch> [bookPath]   ("all" for every inferred chapter; bookPath defaults to Alice in Wonderland)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { charToByte } from "./byte-char-index.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BOOK = process.argv[3] ?? "/Users/mlacy/Documents/3.0/live_priors/01-literature-books/gutenberg/pg11_Alice_s_Adventures_in_Wonderland.txt";
const BASENAME = path.basename(BOOK, ".txt");
const rawBuf = fs.readFileSync(BOOK);
const raw = rawBuf.toString("utf8");
// COORDINATE SPACE, DECLARED NEVER MIXED (byte-char-index.mjs's own law).
// HEAD_RE/SAME_LINE_HEAD_RE below still match against `raw` — the JS
// STRING — because that is the only space RegExp understands; `byteOf`
// converts every resulting OFFSET to real UTF-8 bytes immediately, so
// `heads[].start/.end/.headEnd` and everything downstream (WIN, tiles,
// gaps, the reconstruction) live in the SAME byte space eot-jsonl.mjs's
// own `rawAt` now writes to the ledger. Checking a now-byte-addressed
// ledger by char-slicing this file's own JS string (the shape this file
// had until this fix) is the exact bug eot-jsonl.mjs's own header names —
// found here by running it on Alice in Wonderland after that fix landed:
// small drift-sized "gaps" appeared for the first time near the book's
// own curly quotes, growing to a full missing sentence by "THE END".
const byteOf = charToByte(raw);

// Same chapter-boundary regex eot-jsonl.mjs itself uses (S95's own window),
// duplicated rather than imported — eot-jsonl.mjs is a driver script with no
// exports, and golden-tool.mjs already duplicates this same regex for the
// same reason: each caller owns its own read of the boundary convention.
// Same real-title check eot-jsonl.mjs carries (found via this very script:
// a book with no title line, e.g. The Picture of Dorian Gray, had its
// paragraph's own first physical line swallowed as a fake title) — a REAL
// title is bounded by blank lines on both sides, checked here in raw's own
// (CRLF-preserving) space since these addresses must match the ledger's.
// Same sibling conventions added to eot-jsonl.mjs's own copy of this
// regex, for the same reason: a recoverability check on a book that uses
// a different chapter-heading convention needs the SAME chapter windows
// the reader itself inferred, or it is checking the wrong boundaries
// against itself. "Chapter 1" (Frankenstein) and "CHAPTER I" with no
// period (Tom Sawyer, found via structure-rec.mjs's own sniff) both live
// here now.
const HEAD_RE = /^(?:CHAPTER (?<roman>[IVXLC]+)\.|Chapter (?<arabic>\d+)\.?|CHAPTER (?<romanBare>[IVXLC]+))\s*\n(?<titleLine>[^\n]*)\n/gmd;
// A FOURTH sibling convention — "I. A SCANDAL IN BOHEMIA", numeral and
// title sharing one line, no marker word at all — found live wiring
// eot-jsonl.mjs to structure-rec.mjs's own shared detector (S111) and
// reading the real Sherlock Holmes text for the first time: eot-jsonl.mjs
// read it correctly (that convention was already in the shared library),
// but this file's own independent regex had no branch for it at all and
// came back with zero heads. Kept as a SEPARATE regex, tried only if the
// first finds nothing, rather than folded into one alternation — the
// title lives IN the match here, not on a following line, so the
// "is there a real title" ambiguity the other three branches all share
// does not apply to this one at all: a match cannot exist without a title.
// [ \t]+ ONLY, not \s+ — found wrong by running it: \s+ happily spans a
// blank line, so a BARE "I." heading (Sherlock Holmes carries one of
// these too, a second, separate marker line before the real prose)
// greedily matched all the way past the blank line into the next
// paragraph's own opening sentence as if it were that heading's title.
const SAME_LINE_HEAD_RE = /^(?<romanSameLine>[IVXLC]+)\.[ \t]+(?<sameLineTitle>\S[^\n]*)\n/gmd;
const heads = [];
{
  let m;
  while ((m = HEAD_RE.exec(raw))) {
    const candidateEnd = m.index + m[0].length;
    const titleLine = m.groups.titleLine;
    const hasRealTitle = Boolean(titleLine.trim()) && /^\r?\n/.test(raw.slice(candidateEnd));
    // Converted to real UTF-8 bytes HERE, at construction — every other
    // field on `heads[]`/`WIN` reads as byte-space from this point on,
    // never char-space again.
    heads.push({
      start: byteOf(m.index),
      headEnd: byteOf(hasRealTitle ? candidateEnd : m.indices.groups.titleLine[0]),
      title: hasRealTitle ? titleLine.trim() : "",
    });
  }
  if (!heads.length) {
    while ((m = SAME_LINE_HEAD_RE.exec(raw))) {
      heads.push({ start: byteOf(m.index), headEnd: byteOf(m.index + m[0].length), title: m.groups.sameLineTitle.trim() });
    }
  }
}
const TOTAL_BYTES = byteOf(raw.length);
for (let i = 0; i < heads.length; i += 1) heads[i].end = i + 1 < heads.length ? heads[i + 1].start : TOTAL_BYTES;

// sliceBytes(s, e) → decoded UTF-8 text for a real byte range — the one
// place this file reads actual bytes back out, mirroring eot-jsonl.mjs's
// own P5.2 self-verification posture (an address is checked against the
// real bytes it names, never against a JS string standing in for them).
const sliceBytes = (s, e) => rawBuf.subarray(s, e).toString("utf8");

function checkChapter(ch) {
  const h = heads[ch - 1];
  if (!h) return { chapter: ch, error: "no such chapter inferred" };
  const WIN = [h.headEnd, h.end];
  const refWords = sliceBytes(WIN[0], WIN[1]).split(/\s+/).filter(Boolean);

  const ledgerPath = path.join(HERE, "results", `${BASENAME}-ch${ch}.eot.jsonl`);
  if (!fs.existsSync(ledgerPath)) return { chapter: ch, error: `no ledger at ${path.relative(process.cwd(), ledgerPath)}` };
  const lines = fs.readFileSync(ledgerPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));

  // The tiling basis: every sentence and scene-break address inside this
  // chapter's window. Paragraphs/sections are coarser projections of the
  // SAME bytes (S95's own nest-by-address rule) — including them would
  // double-count, not add coverage.
  const tiles = lines
    .filter((l) => (l.role === "sentence" || l.role === "scene-break") && Array.isArray(l.at))
    .map((l) => l.at)
    .filter(([s, e]) => s >= WIN[0] && e <= WIN[1])
    .sort((a, b) => a[0] - b[0]);

  // MERGE first. Two roles addressing the SAME bytes (measured: an
  // asterisk scene-break row is tiled by both `scene-break` and `sentence`
  // — splitSentences treats each asterisk line as its own degenerate
  // sentence) is not a defect, it is the holograph's own design: "every
  // part points at the whole," plural lenses on one span. Only a byte
  // range NOTHING addresses is a real gap; only two DIFFERENT byte ranges
  // wrongly sharing bytes with inconsistent content would be a real
  // overlap defect, which merging cannot hide (the merged span is still
  // exactly [min start, max end] of what claimed it, so a genuine
  // inconsistency would still be visible in the reconstructed text below).
  const merged = [];
  for (const [s, e] of tiles) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }

  // GAPS: byte ranges inside WIN, between consecutive merged tiles (and
  // before the first / after the last), that still contain non-whitespace
  // text — bytes nothing on the ledger ever addressed.
  const gaps = [];
  let cursor = WIN[0];
  for (const [s, e] of merged) {
    if (s > cursor && sliceBytes(cursor, s).trim()) gaps.push([cursor, s, sliceBytes(cursor, s)]);
    cursor = Math.max(cursor, e);
  }
  if (cursor < WIN[1] && sliceBytes(cursor, WIN[1]).trim()) gaps.push([cursor, WIN[1], sliceBytes(cursor, WIN[1])]);
  const overlaps = []; // kept as a field for callers; merging removes the notion of a defect here

  // RECONSTRUCTION: concatenate the MERGED tiles in address order and
  // compare word-for-word against the chapter's own reference word
  // sequence — this is the actual "reproduce the verbatim text" test.
  const reconstructed = merged.map(([s, e]) => sliceBytes(s, e)).join(" ").split(/\s+/).filter(Boolean);
  let firstMismatch = -1;
  const n = Math.min(refWords.length, reconstructed.length);
  for (let i = 0; i < n; i += 1) if (refWords[i] !== reconstructed[i]) { firstMismatch = i; break; }
  if (firstMismatch === -1 && refWords.length !== reconstructed.length) firstMismatch = n;

  return {
    chapter: ch, title: h.title,
    refWordCount: refWords.length, reconstructedWordCount: reconstructed.length,
    tileCount: merged.length, rawTileCount: tiles.length, gaps, overlaps, firstMismatch,
    recoverable: gaps.length === 0 && overlaps.length === 0 && firstMismatch === -1,
  };
}

// Found by actually running this on a book whose convention neither
// HEAD_RE nor SAME_LINE_HEAD_RE knows (a "PART ONE"/"PART TWO"/... spelled-
// out-numeral specimen, structure-rec.mjs S112): with `heads.length === 0`,
// "all" resolves to an EMPTY chapter list, the loop below runs zero times,
// `allOk` never gets set false, and the script printed "ALL CHAPTERS
// CHECKED: 100% recoverable" — a false positive over having checked
// NOTHING. Absence of a known heading convention is not evidence of
// recoverability; it is the one case this script cannot speak to at all.
if (heads.length === 0) {
  console.log("ERROR — no chapter heads found by either known convention (HEAD_RE, SAME_LINE_HEAD_RE); this book's own convention is not one of the ones this file's independent check knows. Refusing to report recoverability for zero chapters.");
  process.exit(1);
}
const arg = process.argv[2] ?? "all";
const chapters = arg === "all" ? heads.map((_, i) => i + 1) : [Number(arg)];
let allOk = true;
for (const ch of chapters) {
  const r = checkChapter(ch);
  if (r.error) { console.log(`ch${ch}: ERROR — ${r.error}`); allOk = false; continue; }
  const pct = ((r.reconstructedWordCount / r.refWordCount) * 100).toFixed(2);
  console.log(`ch${ch} "${r.title}": ${r.recoverable ? "100% RECOVERABLE" : "GAPS FOUND"} — ${r.reconstructedWordCount}/${r.refWordCount} words (${pct}%), ${r.tileCount} tiles, ${r.gaps.length} gaps, ${r.overlaps.length} overlaps${r.firstMismatch >= 0 ? `, first mismatch at word ${r.firstMismatch}` : ""}`);
  if (!r.recoverable) {
    allOk = false;
    for (const [s, e, text] of r.gaps) console.log(`   GAP [${s},${e}]: ${JSON.stringify(text.slice(0, 80))}`);
    for (const [a, b] of r.overlaps) console.log(`   OVERLAP: [${a[0]},${a[1]}] vs [${b[0]},${b[1]}]`);
  }
}
console.log(allOk ? "\nALL CHAPTERS CHECKED: 100% recoverable" : "\nNOT YET 100% recoverable — see gaps above");
process.exit(allOk ? 0 : 1);
