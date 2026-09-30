import { test } from "node:test";
import assert from "node:assert/strict";
import { popOutFindings } from "./pop-out.js";

const BLACK = [0, 0, 0];
const GIVER = { value: 0.3, giver: "test fixture", basis: "an arbitrary but declared threshold for this test" };

test("popOutFindings: refuses a threshold with no giver/basis (the practitioner-heuristic wall)", () => {
  assert.throws(() => popOutFindings({ elements: [{ id: "a", fontSizePx: 16, color: BLACK }], focalId: "a", threshold: { value: 0.3 } }), /giver/);
});

test("popOutFindings: a genuinely undifferentiated page (every element identical) is flatline", () => {
  const elements = [
    { id: "a", fontSizePx: 16, color: [50, 50, 50] },
    { id: "b", fontSizePx: 16, color: [50, 50, 50] },
    { id: "c", fontSizePx: 16, color: [50, 50, 50] },
  ];
  const r = popOutFindings({ elements, focalId: "a", threshold: GIVER });
  assert.equal(r.flatline, true);
  assert.equal(r.minDifference, 0);
});

test("CONTROL: a genuinely differentiated focal element (large, bright, on a dark field) is NOT flatline", () => {
  const elements = [
    { id: "title", fontSizePx: 48, color: [255, 255, 255] },
    { id: "body1", fontSizePx: 14, color: [40, 40, 40] },
    { id: "body2", fontSizePx: 14, color: [40, 40, 40] },
  ];
  const r = popOutFindings({ elements, focalId: "title", threshold: GIVER });
  assert.equal(r.flatline, false);
});

test("popOutFindings: throws if the declared focal id is not among the measured elements", () => {
  assert.throws(() => popOutFindings({ elements: [{ id: "a", fontSizePx: 16, color: BLACK }], focalId: "missing", threshold: GIVER }), /focal element/);
});
