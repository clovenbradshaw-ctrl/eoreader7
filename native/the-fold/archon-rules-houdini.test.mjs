// archon-rules-houdini.test.mjs -- Houdini, the exclusivity archon (2026-09-26).
// Gebser checks completeness (nothing licensed is missing); Houdini checks
// exclusivity (nothing unlicensed got in) -- the fold-and-cut theorem's own
// two conditions. Built as a second, whole-piece pass over the same
// isMetaSentence already used pre-admission, specifically because a real
// leak observed live this session bonded to its prior landing as a "turn"
// and slipped past admission.js's own turn exemption at drafting time.
import test from "node:test";
import assert from "node:assert/strict";
import { houdiniExclusivity, gebserArrival } from "./archon-rules.js";

const LEAK = "* **Embedded Information:** The fact about the river's length is woven into the sentence, making it more natural and informative.";

test("a clean piece with no apparatus talk produces zero findings", () => {
  const ctx = { piece: [{ id: "a0", pieces: [{ text: "The river flows south past the old warehouses." }, { text: "Steamboats once lined this stretch of the bank." }] }] };
  const findings = houdiniExclusivity("", ctx);
  assert.deepEqual(findings, []);
});

test("the exact verbatim leak observed live this session is caught, on the assembled piece, after admission -- regardless of how it was admitted", () => {
  const ctx = { piece: [{ id: "a1", pieces: [{ text: "The river shaped the city's growth for a century." }, { text: LEAK }] }] };
  const findings = houdiniExclusivity("", ctx);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].kind, "apparatus_leak");
  assert.equal(findings[0].licenses, "fold", "an apparatus leak has no job in the piece and must be folded, the same action Clark/Caro's own findings already trigger");
  assert.equal(findings[0].part, "a1");
  assert.equal(findings[0].sentence, LEAK);
});

test("findings carry no cell -- Houdini sits outside the 3x3 grid, exactly like Gebser", () => {
  const ctx = { piece: [{ id: "a0", pieces: [{ text: LEAK }] }] };
  const findings = houdiniExclusivity("", ctx);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].cell, undefined, "a grid-cell finding always carries its cell; Houdini's must not, so it groups under its own line in the re-read loop rather than a false grid cell");
});

test("the bare-text path (no ctx.piece) also catches a meta sentence, matching every other archon's dual contract", () => {
  const findings = houdiniExclusivity(`The river flows south. ${LEAK}`);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].sentence, LEAK);
});

test("a Houdini finding alone blocks arrival through gebserArrival's own stillObjecting gate, not just in prose", () => {
  const piece = [{ id: "a0", pieces: [{ text: "The river shaped the city's growth for a century.", carries: ["p1"] }] }];
  const findings = [{ editor: "Harry Houdini", kind: "apparatus_leak", licenses: "fold" }];
  const g = gebserArrival({ piece, findings });
  assert.equal(g.arrived, false);
  assert.ok(g.missing.some((m) => m.includes("Harry Houdini")), `expected 'still objecting: Harry Houdini' in missing, got: ${JSON.stringify(g.missing)}`);
});
