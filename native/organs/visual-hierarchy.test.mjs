// visual-hierarchy.test.mjs — INTEGRATION tests only, mirroring pathos.js's
// own test file: the per-axis mechanisms have their own archon test files
// now (contrast.test.mjs, pop-out.test.mjs, grouping.test.mjs,
// design-regime.test.mjs) — this file tests only what the INTEGRATOR
// itself adds: the required experiencer, the refused-beauty-field
// construction wall, and full composition across all four axes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { visualHierarchyRead } from "./visual-hierarchy.js";

const BLACK = [0, 0, 0];
const WHITE = [255, 255, 255];
const GIVER = { value: 0.3, giver: "test fixture", basis: "an arbitrary but declared threshold for this test" };
const GROUP_GIVER = { value: 4, giver: "test fixture", basis: "declared margin for this test" };

test("visualHierarchyRead: refuses an undeclared experiencer — pathos's own wall, reused unmodified", () => {
  assert.throws(() => visualHierarchyRead({ elements: [], focalId: "a", popOutThreshold: GIVER }), /experiencer/);
});

test("visualHierarchyRead: never carries a beauty/aesthetic-rating field, by construction", () => {
  const r = visualHierarchyRead({
    experiencer: { who: "a first-time visitor on a 375px phone", read: "http://127.0.0.1:8940/#episodes" },
    elements: [{ id: "a", fontSizePx: 16, color: BLACK, backgroundColor: WHITE, rect: { top: 0, bottom: 10, left: 0, right: 100 } }],
    focalId: "a",
    popOutThreshold: GIVER,
  });
  const keys = JSON.stringify(r).toLowerCase();
  assert.ok(!keys.includes("beauty") && !keys.includes("aesthetic") && !keys.includes("pretty") && !keys.includes("looksgood"));
});

test("visualHierarchyRead: composes all four axes, each tagged with its own real evidence tier", () => {
  const r = visualHierarchyRead({
    experiencer: { who: "a returning user scanning for one episode", read: "http://127.0.0.1:8940/#episodes" },
    elements: [
      { id: "title", fontSizePx: 24, bold: true, color: WHITE, backgroundColor: BLACK, rect: { top: 0, bottom: 30, left: 0, right: 100 } },
      { id: "date", fontSizePx: 12, bold: false, color: [180, 180, 180], backgroundColor: BLACK, rect: { top: 32, bottom: 44, left: 0, right: 100 } },
    ],
    focalId: "title",
    popOutThreshold: GIVER,
    groups: [{ id: "ep1", memberIds: ["title", "date"] }],
    groupingMargin: GROUP_GIVER,
    regime: "grid-systematic",
    tokenUsage: [{ value: "black", role: "bg" }, { value: "black", role: "bg" }],
  });
  assert.equal(r.contrast.length, 2);
  assert.equal(r.popOut.tier, "well-evidenced");
  assert.equal(r.grouping[0].tier, "well-evidenced-in-principle");
  assert.equal(r.regime.tier, "practitioner-grade");
});
