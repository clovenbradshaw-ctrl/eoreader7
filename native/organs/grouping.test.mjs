import { test } from "node:test";
import assert from "node:assert/strict";
import { groupingFindings } from "./grouping.js";

const GROUP_GIVER = { value: 4, giver: "test fixture", basis: "declared margin for this test" };

test("groupingFindings: a real violation — a group's own members are farther apart than a neighbor outside it", () => {
  const elements = [
    { id: "title", rect: { top: 0, bottom: 10, left: 0, right: 100 } },
    { id: "date", rect: { top: 40, bottom: 50, left: 0, right: 100 } }, // 30px from title — the "group" is spread out
    { id: "other", rect: { top: 15, bottom: 25, left: 0, right: 100 } }, // sits CLOSER to title than date does
  ];
  const r = groupingFindings({ elements, groups: [{ id: "episode1", memberIds: ["title", "date"] }], threshold: GROUP_GIVER });
  assert.equal(r[0].clears, false);
});

test("CONTROL: a genuinely well-grouped pair (tight within, loose to its nearest outsider) clears", () => {
  const elements = [
    { id: "title", rect: { top: 0, bottom: 10, left: 0, right: 100 } },
    { id: "date", rect: { top: 12, bottom: 20, left: 0, right: 100 } }, // 2px gap — tight
    { id: "other", rect: { top: 100, bottom: 110, left: 0, right: 100 } }, // 80px away — loose
  ];
  const r = groupingFindings({ elements, groups: [{ id: "episode1", memberIds: ["title", "date"] }], threshold: GROUP_GIVER });
  assert.equal(r[0].clears, true);
});

test("groupingFindings: a group with no measurable outsider reports a genuine gap, never a guessed pass", () => {
  const elements = [
    { id: "title", rect: { top: 0, bottom: 10, left: 0, right: 100 } },
    { id: "date", rect: { top: 12, bottom: 20, left: 0, right: 100 } },
  ];
  const r = groupingFindings({ elements, groups: [{ id: "episode1", memberIds: ["title", "date"] }], threshold: GROUP_GIVER });
  assert.equal(r[0].clears, null);
});

test("groupingFindings: a real 2D row layout (title and date side by side, same vertical band) is measured on the axis they actually differ on — the bug this organ's own first cut had", () => {
  // FOUND LIVE against the real anchor-log app: title and date sit in the
  // SAME vertical band (overlapping top/bottom) but are separated
  // horizontally — the original vertical-only gapBetween reported a
  // fabricated NEGATIVE "gap" here. The fix must read this as a real,
  // measurable horizontal gap, not overlap.
  const elements = [
    { id: "title", rect: { top: 100, bottom: 130, left: 0, right: 150 } },
    { id: "date", rect: { top: 100, bottom: 130, left: 170, right: 300 } }, // 20px horizontal gap, same vertical band
    { id: "audio", rect: { top: 100, bottom: 130, left: 800, right: 1000 } }, // far away, same band
  ];
  const r = groupingFindings({ elements, groups: [{ id: "episode1", memberIds: ["title", "date"] }], threshold: GROUP_GIVER });
  assert.equal(r[0].overlap, false);
  assert.equal(r[0].maxWithinGap, 20);
  assert.equal(r[0].nearestOutsideGap, 500);
  assert.equal(r[0].clears, true);
});

test("groupingFindings: two group members that literally overlap is a named defect, never rewarded as maximal tightness", () => {
  const elements = [
    { id: "title", rect: { top: 0, bottom: 30, left: 0, right: 200 } },
    { id: "badge", rect: { top: 10, bottom: 20, left: 50, right: 60 } }, // sits INSIDE title's own box
    { id: "other", rect: { top: 200, bottom: 210, left: 0, right: 100 } },
  ];
  const r = groupingFindings({ elements, groups: [{ id: "episode1", memberIds: ["title", "badge"] }], threshold: GROUP_GIVER });
  assert.equal(r[0].overlap, true);
  assert.equal(r[0].clears, null);
});
