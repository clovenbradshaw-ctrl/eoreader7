// block-layout.mjs — THE LAYOUT RULES (Structure · Field/Ground).
//
// Fold invariant: A PAGE WHOSE SHAPE THE FLAT READER READS WRONG IS NOT READ
// FLAT. A page with columns, a table, box-drawing, or a whitespace layout
// carries structure the line reader cannot see. This block settles such a
// page with a REUSABLE RULE SET first — mechanical, no model, no CV — and
// only escalates to the visual sense (look.js / visual-rec.mjs: OpenCV +
// OCR + vision ladder) when no rule settles the shape. A settled page's
// shape is REC'd into the library (layout-conventions.json), so the next
// identical page is mechanical and a CV call is not always needed.
//
// THE RULE SET — a page shape is a SIGNATURE over the page's own bytes:
//   { name, signals: [signal ids that must fire], settle: a mechanical
//     resolution, or "cv" when the shape itself demands looking }
// A rule fires when ALL its required signals fire on the page's text. The
// first firing rule's settle is applied mechanically. If none fires, the
// page goes to CV (tier 3) — and the CV verdict is REC'd as a new rule so
// the shape is mechanical next time. Rules are append-only in
// layout-conventions.json, exactly the structure-rec.mjs discipline.
//
// MECHANICAL SETTLES (no model, no CV):
//   prose          — the page reads fine flat; no settle needed.
//   column_merge   — wide-whitespace runs / narrow columns: split each line
//                    at its whitespace bands, re-join the same column index
//                    across lines into one stream per column, and read the
//                    columns in reading order (left-to-right). This is the
//                    "page with a bunch of columns" case the user names:
//                    the columns are recovered mechanically, no CV call.
//   table_tuple    — pipe/box-delimited rows: emit each row as a tuple
//                    (cells split at the delimiters), byte-anchored, the
//                    table-rec.mjs discipline at the page grain.
//   drop_chrome    — repeated header/footer lines (page numbers, plan
//                    titles, "Continued"): marked chrome, excluded from
//                    reading, disclosed as dropped.
//   cv             — no rule settles: render the page to an image and look
//                    (visual-rec / look.js). The look's verdict is REC'd.
//
// The signals reuse weirdFormattingScore's own vocabulary (look.js) so the
// trigger and the settle speak one language: table_rows, box_drawing,
// very_short_lines, sub_sentence_lines, wide_whitespace_runs, narrow_column.
// Pure except for the library file (read/write at load/REC, like
// structure-rec.mjs's heading-conventions.json).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// The page-shape signals, inline rather than imported from organs/look.js:
// look.js's own import surface is broken on this branch (it re-exports
// MNEMONIC_STORE_PATH from mnemonic.js, which does not provide it), and
// this block needs only the pure signal function — the same discipline
// structure-rec.mjs holds: the shared detector lives once, callers do not
// re-derive it. The signals below ARE weirdFormattingScore's own (look.js
// documents them; the trigger and the settle must speak one language).
const BOX_DRAWING = /[\u2500-\u257F\u2590-\u259F]/;
const CELLISH_LINE = /^(\s*[\p{L}\p{N}][\p{L}\p{N} .\-\/'"]*\s*[|¦│]\s*){2,}[\p{L}\p{N}].*$/u;

/** weirdFormattingScore(text) — the page-shape signals, mechanically:
 * table_rows, box_drawing, very_short_lines, sub_sentence_lines,
 * wide_whitespace_runs, narrow_column. Same vocabulary as organs/look.js's
 * trigger (the settle must fire on the same signals the reader's own
 * "should I look" check fires on). Pure. */
export function weirdFormattingScore(text, { minLines = 3 } = {}) {
  if (!text || typeof text !== "string") return { score: 0, signals: [] };
  const signals = [];
  const lines = text.split("\n");
  const contentLines = lines.filter((l) => l.trim());
  if (contentLines.length < minLines) return { score: 0, signals: [] };

  const tablePipes = contentLines.filter((l) => /[|¦│]/.test(l)).length;
  if (tablePipes / contentLines.length >= 0.5) signals.push("table_rows");

  const boxDraw = contentLines.filter((l) => BOX_DRAWING.test(l)).length;
  if (boxDraw / contentLines.length >= 0.2) signals.push("box_drawing");

  const shortLines = contentLines.filter((l) => l.trim().length > 0 && l.trim().length <= 12).length;
  if (shortLines / contentLines.length >= 0.4) signals.push("very_short_lines");

  const avgWords = contentLines.reduce((a, l) => a + l.trim().split(/\s+/).filter(Boolean).length, 0) / contentLines.length;
  if (avgWords <= 2.5) signals.push("sub_sentence_lines");

  const longRuns = contentLines.filter((l) => / {4,}/.test(l)).length;
  if (longRuns / contentLines.length >= 0.3) signals.push("wide_whitespace_runs");

  const widths = contentLines.map((l) => l.trim().length);
  const avgWidth = widths.reduce((a, b) => a + b, 0) / Math.max(1, widths.length);
  if (avgWidth > 0 && avgWidth <= 20 && contentLines.length >= 8) signals.push("narrow_column");

  return { score: signals.length, signals };
}

export const LAYOUT_RULES_SCHEMA = "EOLayoutRules@1";

const HERE = dirname(fileURLToPath(import.meta.url));
const LIB_PATH = join(HERE, "layout-conventions.json");

// ── the library: received + REC'd page shapes ─────────────────────────────
const DEFAULT_LIBRARY = {
  schema: LAYOUT_RULES_SCHEMA,
  rules: [
    { name: "prose", signals: [], settle: "prose", foundVia: "received" },
    { name: "column_merge", signals: ["wide_whitespace_runs", "narrow_column"], settle: "column_merge", foundVia: "received", note: "wide whitespace runs with narrow lines — columns interleaved in the flat layer" },
    { name: "column_merge_short", signals: ["wide_whitespace_runs", "sub_sentence_lines"], settle: "column_merge", foundVia: "received", note: "wide whitespace with sub-sentence lines — a columned layout" },
    { name: "table_tuple", signals: ["table_rows"], settle: "table_tuple", foundVia: "received", note: "pipe/bar-delimited rows — a table at the page grain" },
    { name: "box_diagram", signals: ["box_drawing"], settle: "cv", foundVia: "received", note: "box-drawing marks a diagram the flat layer cannot hold — look" },
  ],
};

function loadLibrary() {
  if (!existsSync(LIB_PATH)) return JSON.parse(JSON.stringify(DEFAULT_LIBRARY));
  try {
    const lib = JSON.parse(readFileSync(LIB_PATH, "utf8"));
    if (lib.schema !== LAYOUT_RULES_SCHEMA) return JSON.parse(JSON.stringify(DEFAULT_LIBRARY));
    return lib;
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_LIBRARY));
  }
}

function saveLibrary(lib) {
  writeFileSync(LIB_PATH, JSON.stringify(lib, null, 2) + "\n");
}

/** Recompute the library's received default (idempotent — a reset door for
 * tests and for a caller that wants the received shapes back). */
export function resetLayoutLibrary() {
  saveLibrary(JSON.parse(JSON.stringify(DEFAULT_LIBRARY)));
  return loadLibrary();
}

// ── signals: the page's own bytes, mechanically ───────────────────────────
// weirdFormattingScore already names these; this block adds the two
// column-specific signals the settle needs (bands, chrome) and the raw
// per-line structure (trimmed lines + their leading-space offsets) that
// column_merge operates on. All mechanical.
const BAND_MIN_LINES = 4; // a whitespace band must recur on >= this many lines to be a real column gutter
const BAND_GAP = 2; // a band is a run of >= this many spaces

/** bandAnalysis(text) — the column gutters: leading-space offsets where many
 * lines carry a wide whitespace run. Returns { bands, columns } where
 * `columns` is the per-line split at the agreed bands. Pure. */
export function bandAnalysis(text) {
  const lines = String(text ?? "").split("\n");
  const bands = new Map(); // spaceOffset -> count of lines whose line has a run of >= BAND_GAP spaces there
  const runs = [];
  for (const line of lines) {
    const offsets = [];
    let i = 0;
    const s = line.replace(/\s+$/g, "");
    while (i < s.length) {
      if (s[i] === " ") {
        let j = i;
        while (j < s.length && s[j] === " ") j += 1;
        if (j - i >= BAND_GAP) { offsets.push(i); bands.set(i, (bands.get(i) ?? 0) + 1); }
        i = j;
      } else i += 1;
    }
    if (offsets.length) runs.push({ line, offsets });
  }
  const real = [...bands.entries()].filter(([, n]) => n >= BAND_MIN_LINES).sort((a, b) => a[0] - b[0]).map(([o]) => o);
  return { bands: real, runs };
}

/** columnMerge(text, { bands }) — split each line at the agreed gutter
 * offsets and emit one stream per column, in reading order (left to right).
 * A line that does not reach a band is left in the column it started in.
 * Pure. Returns [{ column, text }] + the per-line cells. */
export function columnMerge(text, { bands = [] } = {}) {
  if (!bands.length) return { columns: [{ column: 0, text }], cells: [] };
  const lines = String(text ?? "").split("\n");
  const cols = bands.map((_, i) => []);
  const cells = [];
  for (const line of lines) {
    let start = 0;
    const trimmed = line.replace(/\s+$/g, "");
    let assigned = null;
    for (let b = 0; b < bands.length; b += 1) {
      const band = bands[b];
      if (trimmed.length > band) {
        const cell = trimmed.slice(start, band).trim();
        cols[b].push(cell);
        cells.push({ line: line.slice(0, 40), column: b, cell });
        start = band;
        assigned = b;
      }
    }
    const tail = trimmed.slice(start).trim();
    if (assigned === null) {
      cols[0].push(tail);
      cells.push({ line: line.slice(0, 40), column: 0, cell: tail });
    } else if (tail) {
      cols[cols.length - 1].push(tail);
      cells.push({ line: line.slice(0, 40), column: cols.length - 1, cell: tail });
    }
  }
  return {
    columns: cols.map((c, i) => ({ column: i, text: c.join("\n") })).filter((c) => c.text.trim()),
    cells,
  };
}

/** chromeLines(text) — repeated header/footer noise: a line whose trimmed
 * text recurs >= 3 times across the page (page numbers, repeated plan
 * titles, "Continued"), or a bare page number. Returns [{ line, count }].
 * Pure. */
export function chromeLines(text) {
  const counts = new Map();
  for (const line of String(text ?? "").split("\n")) {
    const t = line.trim();
    if (!t || /^\d+$/.test(t) || /^p\.?\s*\d+$/i.test(t)) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
      continue;
    }
    if (t.length <= 60) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, n]) => n >= 3).map(([line, count]) => ({ line, count }));
}

/** settlePage({ text, rule }) — apply a rule's settle mechanically.
 * `rule.settle` is one of prose / column_merge / table_tuple / drop_chrome.
 * A settle returns { shape, text, note, cells?, columns?, chrome? } — the
 * page's readable text AFTER the settle, so downstream reads the settled
 * shape, never the flat bytes. */
export function settlePage({ text, rule }) {
  const name = rule?.settle ?? "prose";
  if (name === "prose") {
    return { shape: "prose", text, note: "the page reads fine flat — no settle" };
  }
  if (name === "column_merge") {
    const { bands, runs } = bandAnalysis(text);
    if (!bands.length) {
      return { shape: "prose", text, note: "column_merge requested but no recurring whitespace band found — read flat, disclosed" };
    }
    const { columns, cells } = columnMerge(text, { bands });
    return {
      shape: "column_merge",
      text: columns.map((c) => c.text).join("\n\n"),
      columns, cells, bands,
      note: `recovered ${columns.length} columns mechanically (bands at ${bands.join(", ")}) — no CV call`,
    };
  }
  if (name === "table_tuple") {
    const rows = String(text ?? "").split("\n").filter((l) => /[|¦│]/.test(l));
    const cells = rows.map((r) => r.split(/[|¦│]/).map((c) => c.trim()).filter(Boolean));
    return {
      shape: "table_tuple",
      text: cells.map((c) => c.join(" | ")).join("\n"),
      cells, rows: cells.length,
      note: "pipe-delimited rows read as tuples — no CV call",
    };
  }
  if (name === "drop_chrome") {
    const chrome = chromeLines(text);
    const chromeSet = new Set(chrome.map((c) => c.line));
    const out = String(text ?? "").split("\n").filter((l) => !chromeSet.has(l.trim())).join("\n");
    return { shape: "drop_chrome", text: out, chrome, note: `dropped ${chrome.length} repeated chrome lines` };
  }
  if (name === "cv") {
    return { shape: "cv", text, note: "this page's shape demands the visual sense — escalate" };
  }
  return { shape: "prose", text, note: `unknown settle ${name} — read flat, disclosed` };
}

/** matchLayoutRule(text, { lib = null } = {}) — the FIRST rule whose every
 * required signal fires on the page (the "prose" rule matches any page, so
 * a page with no signal settles prose). Returns { rule, signals, score }. */
export function matchLayoutRule(text, { lib = null } = {}) {
  const library = lib ?? loadLibrary();
  const { score, signals } = weirdFormattingScore(text);
  const fired = new Set(signals);
  for (const rule of library.rules) {
    if ((rule.signals ?? []).every((s) => fired.has(s))) {
      return { rule, signals, score, matched: true };
    }
  }
  return { rule: library.rules[0] ?? { name: "prose", settle: "prose" }, signals, score, matched: false };
}

/** REC: a CV verdict on a page shape becomes a new rule, so the same shape
 * is mechanical next time. `signals` are the signals that fired on the
 * page; `settle` is what the visual sense found (the shape recovered);
 * the rule is appended only if no existing rule already fires on those
 * exact signals. Append-only — never overwrites. */
export function recLayoutRule({ signals = [], settle, note, foundVia = "cv-recd" }) {
  const lib = loadLibrary();
  const key = [...signals].sort().join("+");
  const already = lib.rules.some((r) => [...(r.signals ?? [])].sort().join("+") === key);
  if (already) return { rec: false, lib };
  lib.rules.push({ name: `recd_${settle}`, signals, settle, foundVia, note: note ?? `REC'd from a visual-sense settlement on this page shape` });
  saveLibrary(lib);
  return { rec: true, lib };
}

/** layoutRead({ text, lib = null }) — the full page-settle door: match the
 * rule set, apply the settle, return the readable text + the shape +
 * whether CV was demanded. A caller that gets `demandsCV: true` renders
 * the page and looks (visual-rec.mjs / look.js), then RECs. */
export function layoutRead(text, { lib = null } = {}) {
  const { rule, signals, score } = matchLayoutRule(text, { lib });
  const settled = settlePage({ text, rule });
  return { ...settled, rule, signals, score, demandsCV: rule.settle === "cv" };
}