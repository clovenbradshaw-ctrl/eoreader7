// source-page-blanking.test.mjs — furniture decided with the whole page in
// view, and the readback gate that keeps that safe. Against the REAL organs.
//
// A separate file because source.js has no dedicated suite of its own and the
// two files that do exercise chunkSource (grounding, quotes) are about other
// questions entirely.
import test from "node:test";
import assert from "node:assert/strict";
import { chunkSource, blankLabelRows } from "./source.js";

// DECLARED — the same numbers every live caller injects (P4/P9).
const BLANK = { minRun: 4, maxCell: 60 };
const blank = (t) => blankLabelRows(t, BLANK);

// A navbox as a real extracted page carries one: short rows, no terminal
// punctuation, separated by blank lines — which is exactly what chunkSource
// splits on, so each row becomes its OWN chunk and no chunk can ever contain
// the run of four the blanker needs. Rows are >= 20 chars because chunkProse
// drops anything shorter than that outright.
const NAVBOX_PAGE = [
  "The council met on Tuesday and adjourned early after a short debate.",
  "- Timeline leading to the Nashville war",
  "- Bleeding Kansas and the border",
  "- Compromise of 1850 and after",
  "- Lincoln and Douglas debates",
  "- Kansas and Nebraska Act of 1854",
  "Dredging of the channel runs through March of the following year.",
].join("\n\n");

test("absent organ: chunking is byte-identical, and no chunk carries a blanked copy", () => {
  const plain = chunkSource("page", NAVBOX_PAGE);
  const same = chunkSource("page", NAVBOX_PAGE, {});
  assert.deepEqual(plain, same);
  assert.ok(plain.every((c) => c.blanked === undefined), "nothing is attached unless the organ is given");
});

test("the run spans chunks, so per-chunk blanking cannot see it and page context can", () => {
  const chunks = chunkSource("page", NAVBOX_PAGE, { blankFurniture: blank });
  const rows = chunks.filter((c) => c.text.startsWith("-"));
  assert.ok(rows.length >= 4, "each navbox row is its own chunk — the reason the run never forms");

  // Per-chunk, as shipped: a single row is one line, minRun of 4 unreachable.
  for (const row of rows) assert.equal(blank(row.text), row.text, "one row alone is not a run");

  // With the page in view, every row is furniture.
  for (const row of rows) {
    assert.equal(typeof row.blanked, "string");
    assert.equal(row.blanked.trim(), "", `the row should be blanked wholesale: ${JSON.stringify(row.text)}`);
  }
});

test("prose is untouched — the control built to fail", () => {
  const chunks = chunkSource("page", NAVBOX_PAGE, { blankFurniture: blank });
  const prose = chunks.filter((c) => !c.text.startsWith("-"));
  assert.ok(prose.length >= 2);
  for (const p of prose) assert.equal(p.blanked, p.text, "a sentence ending in terminal punctuation is never a cell");
});

test("a blanked copy may only ever turn a character into a space, never into another character", () => {
  for (const c of chunkSource("page", NAVBOX_PAGE, { blankFurniture: blank })) {
    if (typeof c.blanked !== "string") continue;
    assert.equal(c.blanked.length, c.text.length, "length preservation is the whole premise");
    for (let i = 0; i < c.text.length; i++) {
      assert.ok(c.blanked[i] === c.text[i] || c.blanked[i] === " ",
        `position ${i} changed to something other than a space`);
    }
  }
});

test("READBACK GATE: whatever it attaches on a DELIMITED source is aligned to that row's own text", () => {
  // chunkRows can reconstruct rather than slice, so its chunks are the case
  // the gate exists for. Measured: on real fixtures the gate finds the row
  // inside its own span (a trailing newline is the only difference, which is
  // why the gate LOCATES the text rather than demanding strict equality) and
  // attaches an aligned copy. The invariant is alignment, not refusal.
  const csv = "city,riders\nNashville,1200\nMemphis,900\nKnoxville,450\nJackson,275\n";
  const rows = chunkSource("flights.csv", csv, { blankFurniture: blank });
  assert.ok(rows.length > 0, "the delimited path still produces chunks");
  for (const r of rows) {
    if (typeof r.blanked !== "string") continue;
    assert.equal(r.blanked.length, r.text.length);
    for (let i = 0; i < r.text.length; i++) {
      assert.ok(r.blanked[i] === r.text[i] || r.blanked[i] === " ",
        "an attached copy is this row's own text with nothing but spaces substituted");
    }
  }
});

test("DISCLOSED, and PRE-EXISTING: a data table's rows are furniture to this blanker either way", () => {
  // Rows of a CSV are short lines without terminal punctuation, so the
  // blanker calls them furniture. It did so BEFORE this change too — the
  // whole table lands in one chunk, which already met minRun on its own — so
  // this is a property of blankLabelRows, not something page context
  // introduced. Recorded rather than silently inherited.
  const csv = "city,riders\nNashville,1200\nMemphis,900\nKnoxville,450\nJackson,275\n";
  const shipped = chunkSource("flights.csv", csv);
  assert.ok(shipped.length > 0);
  const perChunk = blank(shipped[0].text);
  assert.equal(perChunk.trim(), "", "already blanked with no page context at all");
});

test("READBACK GATE: an organ that substitutes anything but a space is refused", () => {
  // The gate's per-character check is what stops a misaligned or
  // content-altering copy from ever reaching the reader.
  const sneaky = (t) => t.replace(/Timeline/g, "TimeIine"); // same length, different character
  const chunks = chunkSource("page", NAVBOX_PAGE, { blankFurniture: sneaky });
  const touched = chunks.filter((c) => c.text.includes("Timeline"));
  assert.ok(touched.length > 0, "the fixture has the row this organ would alter");
  for (const c of touched) {
    assert.equal(c.blanked, undefined,
      "a copy that changes a character into another character is not this chunk's own text, and is refused");
  }
});

test("READBACK GATE: a trimmed chunk is aligned to its OWN text, not to its untrimmed span", () => {
  // chunkProse stores `body.trim()` while start/end span the UNTRIMMED body,
  // so a leading space inside the span would shift a naive slice by one.
  const padded = ["   The council met on Tuesday and adjourned early today.",
    "- Timeline leading to the Nashville war", "- Bleeding Kansas and the border",
    "- Compromise of 1850 and after", "- Lincoln and Douglas debates"].join("\n\n");
  for (const c of chunkSource("page", padded, { blankFurniture: blank })) {
    if (typeof c.blanked !== "string") continue;
    assert.equal(c.blanked.length, c.text.length);
    for (let i = 0; i < c.text.length; i++) {
      assert.ok(c.blanked[i] === c.text[i] || c.blanked[i] === " ",
        "a trimmed chunk's blanked copy must still line up with its own text");
    }
  }
});

test("a length-changing organ is refused outright — no offset would survive it", () => {
  const chunks = chunkSource("page", NAVBOX_PAGE, { blankFurniture: (t) => t.replace(/\s+/g, " ") });
  assert.ok(chunks.every((c) => c.blanked === undefined), "nothing is attached when the premise fails");
});

test("an organ that throws leaves the chunking exactly as it was", () => {
  const boom = chunkSource("page", NAVBOX_PAGE, { blankFurniture: () => { throw new Error("nope"); } });
  assert.deepEqual(boom, chunkSource("page", NAVBOX_PAGE));
});

test("chunk.text and every address are untouched — this only ever ADDS a parallel copy", () => {
  const plain = chunkSource("page", NAVBOX_PAGE);
  const withOrgan = chunkSource("page", NAVBOX_PAGE, { blankFurniture: blank });
  assert.equal(withOrgan.length, plain.length);
  for (let i = 0; i < plain.length; i++) {
    assert.equal(withOrgan[i].text, plain[i].text);
    assert.equal(withOrgan[i].start, plain[i].start);
    assert.equal(withOrgan[i].end, plain[i].end);
    assert.equal(withOrgan[i].ref, plain[i].ref);
    // P5.2: the address still reads back off the ORIGINAL page.
    assert.ok(NAVBOX_PAGE.slice(plain[i].start, plain[i].end).includes(plain[i].text));
  }
});

// ── the reader end: does the relation tier actually CONSUME the copy? ──
//
// Everything above proves chunkSource attaches an aligned copy. This proves
// the copy changes what the reader reads — against the REAL relation reader
// and the REAL text adapters, not a stub.
import { makeRelationReader } from "./hypergraph.js";
import { splitSentences } from "../adapters/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "../adapters/text/surfaces.js";
import { discoverRelationVocab, extractRelations } from "../adapters/text/relations.js";
import { tokenize } from "./source.js";

const readerOver = (passages) => {
  const relationsFor = makeRelationReader({
    splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
    discoverRelationVocab, extractRelations, tokenize,
  });
  return relationsFor(passages, { pool: passages });
};

// A navbox whose rows read as ordinary subject-verb-object if nothing blanks
// them. The names are NOT sentence-initial, because `extractSurfaces` skips
// a sentence's first token on purpose (it is capitalised by position and
// carries no evidence of namehood) — a row beginning with the name would
// yield no surface, no nominated verb, and so no edge to lose, which would
// make this test pass for the wrong reason.
const NAVBOX_EDGES = [
  "The council met on Tuesday and adjourned early after a short debate today.",
  "- In 1812 General Wilson commanded the northern regiment",
  "- In 1813 General Harding commanded the southern regiment",
  "- In 1814 General Fillmore commanded the eastern regiment",
  "- In 1815 General Pierce commanded the western regiment",
].join("\n\n");

const commandEdges = (passages) =>
  (readerOver(passages).edges ?? []).filter((e) => /command/i.test(e.verb ?? e.label ?? ""));

test("the reader CONSUMES the page-blanked copy: navbox rows stop becoming material edges", () => {
  // The material edges are what `relationsFor` builds from the rewritten
  // extraction copy, so they are the direct evidence that the reader read the
  // blanked text rather than the raw passage.
  const before = commandEdges(chunkSource("page", NAVBOX_EDGES));
  const after = commandEdges(chunkSource("page", NAVBOX_EDGES, { blankFurniture: blank }));
  assert.ok(before.length > 0, "as shipped, a navbox row is its own chunk and reads as an ordinary relation");
  assert.equal(before[0].subject ?? before[0].end1, "General Wilson");
  assert.equal(after.length, 0, "with the page in view the same rows are furniture and yield nothing");
});

test("real prose is read identically with and without the copy — the control built to fail", () => {
  const prose = [
    "The council met on Tuesday and adjourned early after a short debate today.",
    "In 1812 General Wilson commanded the northern regiment through the winter.",
    "In 1813 General Harding commanded the southern regiment until that spring.",
    "In 1814 General Fillmore commanded the eastern regiment for the campaign.",
  ].join("\n\n");
  const shape = (passages) => (readerOver(passages).edges ?? [])
    .map((e) => `${e.subject ?? e.end1}|${e.verb ?? e.label}|${e.object ?? e.end2}`).sort();
  // Every line ends in terminal punctuation, so none of it is ever a cell.
  assert.deepEqual(
    shape(chunkSource("p", prose, { blankFurniture: blank })),
    shape(chunkSource("p", prose)),
    "page context must be inert on material that contains no furniture");
});
