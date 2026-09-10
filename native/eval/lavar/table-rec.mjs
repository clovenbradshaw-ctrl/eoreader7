// table-rec.mjs — detect a table embedded in prose, mechanically, no model
// needed at all.
//
// User direction, verbatim: "now do it on document with a table embedded
// inside of prose" — the same "detect structure and identify it" mandate
// `structure-rec.mjs` already answers for chapter headings, aimed at a
// different structural class. Checked first, honestly, before building
// anything: does the EXISTING pipeline crash or fabricate content when it
// meets a real table? Real specimen — Paradigms of Artificial Intelligence
// Programming, chapter 3 (`05-academic-papers/open-access-books/paip/
// chapter-03.txt`), a genuine Lisp textbook with 22 real Markdown tables
// embedded directly in expository prose. Tested directly against the
// actual adapters `eot-jsonl.mjs` itself uses:
//   - `splitSentences` (adapters/text/spans.js) treats an entire multi-row
//     table as ONE "sentence" — no internal sentence-ending punctuation to
//     split on — which is honest (it doesn't chop a table row into
//     nonsense fragments) but wrong in a different way: a table is not a
//     sentence, and this hides real, extractable structure.
//   - `extractRelations` (adapters/text/relations.js), run directly on a
//     table's own text, correctly returns []. It does not fabricate a
//     subject/verb/object triple from pipe-delimited cells — a real,
//     confirmed negative result, checked rather than assumed. The
//     reader's own "a sentence that yielded nothing says so, and says
//     why" discipline (eot-jsonl.mjs) would disclose this honestly as
//     `no_earned_verb_in_this_sentence` for the whole table, not silently.
// So the existing pipeline is SAFE on a table (no crash, no garbage) but
// BLIND to it (a table becomes an inert, unlabeled non-finding). This file
// closes the blindness, not the safety — a table is recognized as its own
// structural unit, on the record, before anything downstream has to guess
// what kind of "sentence" produced no verb.
//
// UNLIKE chapter headings, this is not a REC-escalation problem. A GFM
// (GitHub-Flavored Markdown) table has one canonical, unambiguous
// signature — a header row of pipe-delimited cells immediately followed
// by a SEPARATOR row of only pipes, dashes, colons and whitespace — and
// that signature does not vary across documents the way a chapter heading
// does. No known-conventions library, no skeleton recurrence, no model
// tier: this is tier 1 and tier 1 only, checked mechanically, because
// there is nothing here that legitimately varies enough to need REC'ing.
//
// usage: node table-rec.mjs <path-to-document.txt>
import fs from "node:fs";

const PIPE_LINE = /^[ \t]*\|.*\|[ \t]*$/;
const SEPARATOR_ROW = /^[ \t]*\|[ \t:|-]+\|[ \t]*$/;

function countColumns(line) {
  // Cells between pipes; leading/trailing pipe does not itself start a
  // cell. A line "| a | b | c |" has 3 cells, not 4.
  return line.trim().split("|").filter((_, i, arr) => i > 0 && i < arr.length - 1).length;
}

export function detectTables(raw) {
  const lines = raw.split(/\r?\n/);
  const starts = [];
  { let offset = 0; for (const l of lines) { starts.push(offset); offset += l.length + 1; } }
  const tables = [];
  let i = 0;
  while (i < lines.length) {
    if (SEPARATOR_ROW.test(lines[i]) && i > 0 && PIPE_LINE.test(lines[i - 1])) {
      const headerIdx = i - 1;
      let end = i + 1;
      while (end < lines.length && PIPE_LINE.test(lines[end])) end += 1;
      const tableStart = starts[headerIdx];
      const lastLine = lines[end - 1];
      const tableEnd = starts[end - 1] + lastLine.length;
      tables.push({
        start: tableStart, end: tableEnd,
        headerRow: lines[headerIdx].trim(),
        columns: countColumns(lines[headerIdx]),
        rows: end - headerIdx, // header + separator + data rows, inclusive
      });
      i = end;
    } else {
      i += 1;
    }
  }
  return tables;
}

// ── standalone report ─────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const bookPath = process.argv[2];
  if (!bookPath) { console.error("usage: node table-rec.mjs <path-to-document.txt>"); process.exit(1); }
  const raw = fs.readFileSync(bookPath, "utf8");
  const tables = detectTables(raw);
  if (!tables.length) {
    console.log("No Markdown-style table (header row + pipe/dash separator row) found.");
  } else {
    console.log(`${tables.length} table(s) found:`);
    for (const t of tables) console.log(`  [${t.start}, ${t.end}] ${t.rows} rows x ${t.columns} cols — header: ${t.headerRow.slice(0, 60)}`);
  }
}
