// measure-blanking.test.mjs — the walls on `measureOf` / `blankBelowMeasure`.
//
// The organ exists because a bare length threshold is a fact about ONE
// rendering convention: measured, F1 0.769 where a paragraph is one line and
// 0.148 on the same content hard-wrapped at 72 columns, which is what a PDF's
// text layer is. Asking about the RUN instead of the line scored 0.936 there
// and beat the threshold on three real pages too.
import { test } from "node:test";
import assert from "node:assert/strict";
import { measureOf, blankBelowMeasure } from "./source.js";

const PARA = "This is a long paragraph of running prose that goes on for a while and fills the measure.";
const PARA2 = "It continues here with a second long line that also fills the measure comfortably enough.";
const doc = (...lines) => lines.join("\n");

test("every number is declared — none is defaulted", () => {
  assert.throws(() => measureOf("x"), /percentile is declared/);
  assert.throws(() => measureOf("x", { percentile: 0 }), /percentile is declared/);
  assert.throws(() => blankBelowMeasure("x", { fill: 0.8, minRun: 2 }), /measure is declared/);
  assert.throws(() => blankBelowMeasure("x", { measure: 80, minRun: 2 }), /fill is declared/);
  assert.throws(() => blankBelowMeasure("x", { measure: 80, fill: 0.8 }), /minRun is declared/);
  // One line is not a run — the same structural floor blankLabelRows holds.
  assert.throws(() => blankBelowMeasure("x", { measure: 80, fill: 0.8, minRun: 1 }), /two is the structural floor/);
});

test("LENGTH-PRESERVING, so every byte offset survives (P5.2)", () => {
  const src = doc("# Heading", PARA, PARA2, "and ends short.", "| a | b |", "| 1 | 2 |", "| 3 | 4 |");
  const out = blankBelowMeasure(src, { measure: measureOf(src, { percentile: 0.9 }), fill: 0.8, minRun: 2 });
  assert.equal(out.length, src.length, "a blanker that changes length invalidates every address downstream");
  assert.equal(out.split("\n").length, src.split("\n").length);
  out.split("\n").forEach((l, i) => assert.equal(l.length, src.split("\n")[i].length, `line ${i}`));
});

test("a paragraph survives with the short line that ends it; a table does not", () => {
  const src = doc("# Heading", PARA, PARA2, "and ends short.", "| a | b |", "| 1 | 2 |", "| 3 | 4 |");
  const kept = blankBelowMeasure(src, { measure: measureOf(src, { percentile: 0.9 }), fill: 0.8, minRun: 2 })
    .split("\n").map((l) => l.trim());
  assert.equal(kept[0], "", "a lone heading is not a run");
  assert.ok(kept[1].startsWith("This is a long"));
  assert.ok(kept[2].startsWith("It continues"));
  assert.equal(kept[3], "and ends short.", "the short line ending a paragraph travels with it — the whole reason a run is the unit");
  assert.deepEqual(kept.slice(4), ["", "", ""], "every table row blanked");
});

test("a LONE filling line is not a paragraph", () => {
  // A wide table row or a long heading fills the measure and has no neighbour.
  const wide = "Force | Infantry | Cavalry | Guns | Losses | Notes | Source | Confidence | Revised";
  const src = doc("short", wide, "short", PARA, PARA2);
  const kept = blankBelowMeasure(src, { measure: measureOf(src, { percentile: 0.9 }), fill: 0.8, minRun: 2 }).split("\n").map((l) => l.trim());
  assert.equal(kept[1], "", "one filling line with no filling neighbour is not a run");
  assert.ok(kept[3] && kept[4], "the real paragraph survives");
});

test("THE POINT: it survives hard wrapping, where a length threshold cannot", () => {
  // The same content, wrapped at 60 columns — what a PDF text layer does.
  const wrap = (s, cols) => { const out = []; let cur = "";
    for (const w of s.split(/\s+/)) { if (cur && cur.length + 1 + w.length > cols) { out.push(cur); cur = w; } else cur = cur ? `${cur} ${w}` : w; }
    if (cur) out.push(cur); return out; };
  const src = doc(...wrap(`${PARA} ${PARA2}`, 60), "| a | b |", "| 1 | 2 |", "| 3 | 4 |");
  const lines = src.split("\n");
  const kept = blankBelowMeasure(src, { measure: measureOf(src, { percentile: 0.9 }), fill: 0.8, minRun: 2 }).split("\n").map((l) => l.trim());
  const proseIdx = lines.map((_, i) => i).filter((i) => !lines[i].startsWith("|"));
  const tableIdx = lines.map((_, i) => i).filter((i) => lines[i].startsWith("|"));
  assert.ok(proseIdx.filter((i) => kept[i]).length >= proseIdx.length - 1, "wrapped prose survives");
  assert.deepEqual(tableIdx.map((i) => kept[i]), tableIdx.map(() => ""), "the table still does not");
  // And the control: a bare per-line threshold at the unwrapped measure keeps
  // essentially nothing here, which is the failure this organ exists for.
  const bare = lines.filter((l) => l.trim().length >= 72).length;
  assert.ok(bare <= 1, `a bare threshold keeps ${bare} of ${proseIdx.length} wrapped prose lines`);
});

test("an unwrapped document has no runs, and falls back to filling rather than blanking everything", () => {
  // Every paragraph one long line, no two adjacent: the run rule finds nothing
  // and the organ must not return an empty document.
  const src = doc(PARA, "| a | b |", PARA2, "| 1 | 2 |");
  const kept = blankBelowMeasure(src, { measure: measureOf(src, { percentile: 0.9 }), fill: 0.8, minRun: 2 }).split("\n").map((l) => l.trim());
  assert.ok(kept[0] && kept[2], "the paragraphs survive via the fallback");
  assert.equal(kept[1], "");
  assert.equal(kept[3], "");
});

test("an empty or measure-zero document blanks nothing rather than throwing", () => {
  assert.equal(measureOf("", { percentile: 0.9 }), 0);
  assert.equal(blankBelowMeasure("", { measure: 0, fill: 0.8, minRun: 2 }), "");
  const src = doc("a", "b", "c");
  assert.equal(blankBelowMeasure(src, { measure: 0, fill: 0.8, minRun: 2 }).length, src.length);
});
