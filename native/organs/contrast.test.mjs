import { test } from "node:test";
import assert from "node:assert/strict";
import { relativeLuminance, contrastRatio, wcagFloorFor, contrastFindings } from "./contrast.js";

const BLACK = [0, 0, 0];
const WHITE = [255, 255, 255];

test("relativeLuminance: black is 0, white is 1 (WCAG's own defined endpoints)", () => {
  assert.equal(relativeLuminance(BLACK), 0);
  assert.equal(Math.round(relativeLuminance(WHITE) * 1000) / 1000, 1);
});

test("contrastRatio: black on white is the maximum, 21:1", () => {
  assert.equal(Math.round(contrastRatio(BLACK, WHITE)), 21);
});

test("wcagFloorFor: normal text floor is 4.5, large text (>=24px) is 3.0", () => {
  assert.equal(wcagFloorFor({ fontSizePx: 16, bold: false }), 4.5);
  assert.equal(wcagFloorFor({ fontSizePx: 24, bold: false }), 3.0);
  assert.equal(wcagFloorFor({ fontSizePx: 19, bold: true }), 3.0);
  assert.equal(wcagFloorFor({ fontSizePx: 18, bold: true }), 4.5);
});

test("contrastFindings: a real WCAG failure (light gray on white) is caught, tagged well-evidenced", () => {
  const findings = contrastFindings([{ id: "body-text", fontSizePx: 16, bold: false, color: [200, 200, 200], backgroundColor: WHITE }]);
  assert.equal(findings[0].tier, "well-evidenced");
  assert.equal(findings[0].clears, false);
  assert.ok(findings[0].ratio < 4.5);
});

test("CONTROL: a genuinely compliant pair (black on white body text) is NOT flagged", () => {
  const findings = contrastFindings([{ id: "body-text", fontSizePx: 16, bold: false, color: BLACK, backgroundColor: WHITE }]);
  assert.equal(findings[0].clears, true);
});
