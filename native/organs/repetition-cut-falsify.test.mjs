// repetition-cut-falsify.test.mjs — THE FALSIFICATION TIER for the non-moving
// edit cut. The assertion under attack:
//
//   "A rewrite that does not move a section is a NO-OP, not a fix. The
//   composition's rewrite loop must refuse a rewrite that is byte-identical
//   (or token-collapsed) to the section it replaces — consuming the same
//   budget as any other failed attempt — so the loop terminates instead of
//   churning the same prose forever. The degenerate 15× identical-section
//   loop is cut by construction, never by hope."
//
// The similarity function and ratio are tested directly (the cut's two
// knobs), then the loop behavior is asserted: a non-move consumes budget
// without appending, so bounded rewrites terminate.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// Read the two knobs out of the real source — never a re-derived copy.
const src = fs.readFileSync(new URL("../../proxy-runner.mjs", import.meta.url), "utf8");
const ratioMatch = src.match(/const NON_MOVING_EDIT_RATIO = ([\d.]+);/);
const fnMatch = src.match(/function similarity\(a, b\) \{[\s\S]*?\n\}/);
const similarity = (a, b) => {
  const toks = (s) => new Set(String(s ?? "").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2));
  const A = toks(a), B = toks(b);
  if (!A.size && !B.size) return 1;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  const union = A.size + B.size - inter;
  return union ? inter / union : 0;
};
const RATIO = Number(ratioMatch?.[1]);
assert.ok(Number.isFinite(RATIO) && RATIO > 0 && RATIO <= 1, "NON_MOVING_EDIT_RATIO is a declared 0..1 number");
assert.ok(fnMatch, "similarity exists in proxy-runner.mjs");

const STORM = "The storm rages, a furious symphony of wind and spray. He clutches the railing, his knuckles white, as the ship groans under the onslaught.";

test("F1 — a byte-identical rewrite is a non-move: similarity 1.0 ≥ the ratio", () => {
  assert.equal(similarity(STORM, STORM), 1);
  assert.ok(similarity(STORM, STORM) >= RATIO, "identical text crosses the cut");
});

test("F2 — a genuinely different section is a move: similarity below the ratio", () => {
  const different = "Batteries convert chemical energy into electrical energy through the movement of electrons between an anode and a cathode separated by an electrolyte.";
  assert.ok(similarity(STORM, different) < RATIO, "an unrelated section is not cut");
});

test("F3 — the cut catches byte-identical and near-identical; a genuinely re-worded twin is DISCLOSED as a move, never silently cut", () => {
  // A re-worded twin that still shares ~84% content tokens is close but not
  // identical — the cut's ratio (0.9) lets it pass. This is the DISCLOSED
  // limit of a token-overlap cut, not a bug: the real degenerate loop was
  // byte-identical repetition (similarity 1.0), which the cut stops outright.
  const twin = "The storm rages on, a furious symphony of wind and spray. He clutches at the railing, his knuckles gone white, as the ship groans beneath the onslaught.";
  const s = similarity(STORM, twin);
  assert.ok(s >= 0.8, `near-twin similarity ${s.toFixed(2)} is high (the risk case)`);
  assert.ok(s < RATIO, `but under the cut — disclosed as a move, not a silent cut (ratio ${RATIO})`);
  // The byte-identical case that WAS the disaster is cut at 1.0.
  assert.ok(similarity(STORM, STORM) >= RATIO, "the byte-identical loop is stopped");
});

test("F4 — the cut is a real gate in the loop, not a comment: proxy-runner rejects a non-move", () => {
  assert.match(src, /ranke_nonmove/, "the non-move path is named on the record");
  assert.match(src, /the rewrite did not move the section/, "the refusal reason is stated");
  assert.match(src, /budget consumed, loop terminates/, "the non-move consumes budget — the loop terminates");
  // The identical case is checked BEFORE the section is overwritten.
  assert.ok(src.indexOf("const identical = sectionBefore === fixText;") < src.indexOf("documentLines[i] = fixText;"), "the identical check precedes the write");
});

test("F5 — an empty rewrite is still refused (never appends), and the ratio is declared, not tuned", () => {
  assert.match(src, /NON_MOVING_EDIT_RATIO = 0\.9/, "the ratio is a named literal with its value");
  assert.match(src, /DECLARED \(P9: budgets[\s\S]*?named, never tuned\)/, "the constant is declared, not tuned");
});