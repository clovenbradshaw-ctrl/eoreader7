// visual-pathos.test.mjs — proving THE-THEORY-OF-PATHOS.md transfers, not
// merely resembles: these tests import `reGroundCondition`/`strainOf` from
// the SAME organs/pathos.js text uses, and check they produce the correct
// verdict when fed a genuinely visual read.
import { test } from "node:test";
import assert from "node:assert/strict";
import { reGroundCondition } from "./pathos.js";
import { visualStrainState, visualPathosOf } from "./visual-pathos.js";

const BLACK = [0, 0, 0];
const WHITE = [255, 255, 255];
const POP_GIVER = { value: 0.3, giver: "test fixture", basis: "an arbitrary but declared threshold for this test" };
const GROUP_GIVER = { value: 4, giver: "test fixture", basis: "declared margin for this test" };
const WHO = { who: "a first-time visitor scanning for one episode", read: "http://127.0.0.1:8940/#episodes" };

test("visualStrainState: a real grouping violation lands as a contradiction, never a cycle", () => {
  const elements = [
    { id: "title", rect: { top: 0, bottom: 10, left: 0, right: 100 } },
    { id: "date", rect: { top: 40, bottom: 50, left: 0, right: 100 } }, // 30px from title — spread out
    { id: "other", rect: { top: 15, bottom: 25, left: 0, right: 100 } }, // closer to title than date is
  ];
  const s = visualStrainState({ elements, groups: [{ id: "ep1", memberIds: ["title", "date"] }], groupingMargin: GROUP_GIVER });
  assert.equal(s.contradictions.length, 1);
  assert.equal(s.contradictions[0].kind, "grouping");
  assert.equal(s.cycles, 0);
});

test("visualStrainState: a real regime violation lands as a contradiction too", () => {
  const s = visualStrainState({ elements: [], regime: "grid-systematic", tokenUsage: [{ value: "#121212", role: "bg" }, { value: "#131313", role: "bg" }] });
  assert.equal(s.contradictions.length, 1);
  assert.equal(s.contradictions[0].kind, "regime");
});

test("CONTROL: clean grouping and a consistent regime produce zero contradictions", () => {
  const elements = [
    { id: "title", rect: { top: 0, bottom: 10, left: 0, right: 100 } },
    { id: "date", rect: { top: 12, bottom: 20, left: 0, right: 100 } },
    { id: "other", rect: { top: 100, bottom: 110, left: 0, right: 100 } },
  ];
  const s = visualStrainState({
    elements, groups: [{ id: "ep1", memberIds: ["title", "date"] }], groupingMargin: GROUP_GIVER,
    regime: "grid-systematic", tokenUsage: [{ value: "#121212", role: "bg" }, { value: "#121212", role: "bg" }],
  });
  assert.equal(s.contradictions.length, 0);
});

test("visualPathosOf: refuses an undeclared experiencer — the same anti-kitsch wall, unmodified", () => {
  assert.throws(() => visualPathosOf({ elements: [], focalId: "a", popOutThreshold: POP_GIVER }), /experiencer/);
});

test("visualPathosOf: a genuinely flatline pop-out (no differentiation at all) reads STALE — rhythm's own reading, via the REAL reGroundCondition", () => {
  const elements = [
    { id: "a", fontSizePx: 16, color: [50, 50, 50], backgroundColor: WHITE, rect: { top: 0, bottom: 10, left: 0, right: 100 } },
    { id: "b", fontSizePx: 16, color: [50, 50, 50], backgroundColor: WHITE, rect: { top: 20, bottom: 30, left: 0, right: 100 } },
  ];
  const r = visualPathosOf({ experiencer: WHO, elements, focalId: "a", popOutThreshold: POP_GIVER });
  assert.equal(r.read.rhythm.flatline, true);
  assert.equal(r.condition.kind, "stale");
});

test("visualPathosOf: a real grouping contradiction lands strain at STANDARD, not STRICT — never inflated to look worse than it is", () => {
  // A genuine flatline (identical focal/neighbor style) AND a real
  // grouping contradiction are both present here. strainOf's own rungs
  // only reach "strict" from a real graph cycle or an unlicensed turn — a
  // single contradiction correctly lands "standard," so the ladder's next
  // check (rhythm.flatline) is the one that actually decides the verdict
  // here, proven by reading BOTH fields off the same composed read object.
  const elements = [
    { id: "title", fontSizePx: 16, color: BLACK, backgroundColor: WHITE, rect: { top: 0, bottom: 10, left: 0, right: 100 } },
    { id: "date", fontSizePx: 16, color: BLACK, backgroundColor: WHITE, rect: { top: 40, bottom: 50, left: 0, right: 100 } },
    { id: "other", fontSizePx: 16, color: BLACK, backgroundColor: WHITE, rect: { top: 15, bottom: 25, left: 0, right: 100 } },
  ];
  const r = visualPathosOf({
    experiencer: WHO, elements, focalId: "title", popOutThreshold: POP_GIVER,
    groups: [{ id: "ep1", memberIds: ["title", "date"] }], groupingMargin: GROUP_GIVER,
  });
  assert.equal(r.read.strain, "standard"); // a real contradiction, not a cycle — never "strict" from this alone
  assert.equal(r.read.rhythm.flatline, true); // also flatline (identical style)
  // reGroundCondition checks strain==="strict" first, then flatline — a
  // "standard" strain does not preempt the flatline check, so this still
  // reads "stale," proving the composition runs the REAL function, not a
  // hand-rolled stand-in that would need to be told the answer.
  assert.equal(r.condition.kind, "stale");
});

test("THE PRIORITY LADDER: strict strain (a real cycle) outranks a flatline rhythm — checked directly against the REAL reGroundCondition, on a read shaped exactly like a visual one", () => {
  // No extractor in this file ever produces cycles>0 (documented,
  // disclosed in visualStrainState's own header — grouping/regime findings
  // are contradictions, never a literal graph cycle). This test proves the
  // COMPOSITION LAW itself — not this file's own extractors — by handing
  // reGroundCondition a read where BOTH a cycle-level strain AND a
  // flatline rhythm are true, and checking strain wins, exactly as
  // THE-THEORY-OF-PATHOS.md's composition-law section states.
  const bothFire = Object.freeze({
    schema: "EOPathosRead@1",
    forWhom: { who: "test", read: "test" },
    rhythm: Object.freeze({ flatline: true, ratio: 0, mean: 0, blinks: 0, n: 2 }),
    curve: Object.freeze({ schema: "EOPathosCurve@1", measured: false, surprise: null, tension: null, release: null, unmeasured: "test" }),
    strain: "strict",
  });
  assert.equal(reGroundCondition(bothFire).kind, "contested");
});

test("visualPathosOf: curve is an honest, named gap — never silently defaulted toward ground_holds", () => {
  const elements = [{ id: "a", fontSizePx: 48, color: WHITE, backgroundColor: BLACK, rect: { top: 0, bottom: 10, left: 0, right: 100 } }, { id: "b", fontSizePx: 12, color: [40, 40, 40], backgroundColor: BLACK, rect: { top: 20, bottom: 30, left: 0, right: 100 } }];
  const r = visualPathosOf({ experiencer: WHO, elements, focalId: "a", popOutThreshold: POP_GIVER });
  assert.equal(r.read.curve.measured, false);
  assert.ok(r.read.curve.unmeasured.includes("no incremental visual reader"));
});

test("visualPathosOf: a genuinely clean reading (real differentiation, no contradictions) reads GROUND_HOLDS", () => {
  const elements = [
    { id: "title", fontSizePx: 48, color: WHITE, backgroundColor: BLACK, rect: { top: 0, bottom: 40, left: 0, right: 100 } },
    { id: "date", fontSizePx: 12, color: [180, 180, 180], backgroundColor: BLACK, rect: { top: 42, bottom: 54, left: 0, right: 100 } },
    { id: "other", fontSizePx: 12, color: [180, 180, 180], backgroundColor: BLACK, rect: { top: 200, bottom: 212, left: 0, right: 100 } },
  ];
  const r = visualPathosOf({
    experiencer: WHO, elements, focalId: "title", popOutThreshold: POP_GIVER,
    groups: [{ id: "ep1", memberIds: ["title", "date"] }], groupingMargin: GROUP_GIVER,
    regime: "grid-systematic", tokenUsage: [{ value: "black", role: "bg" }, { value: "black", role: "bg" }],
  });
  assert.equal(r.read.rhythm.flatline, false);
  assert.equal(r.read.strain, "report");
  assert.equal(r.condition.kind, "ground_holds");
});

test("visualPathosOf: contrast rides alongside, disclosed, but never changes the composed verdict — it is ethos-shaped, not pathos-shaped", () => {
  // A real WCAG failure (white text on the Spotify-green button) sits next
  // to an otherwise clean, differentiated, contradiction-free reading. The
  // theory says contrast must never be folded into rhythm/strain/curve —
  // this proves it: the failure is VISIBLE on `.contrast` and the verdict
  // is STILL ground_holds, because a perception-access gate is a different
  // KIND of check than a felt-shape/re-ground one.
  const elements = [
    { id: "title", fontSizePx: 48, color: WHITE, backgroundColor: BLACK, rect: { top: 0, bottom: 40, left: 0, right: 100 } },
    { id: "button", fontSizePx: 16, color: WHITE, backgroundColor: [29, 185, 84], rect: { top: 200, bottom: 220, left: 0, right: 100 } },
  ];
  const r = visualPathosOf({ experiencer: WHO, elements, focalId: "title", popOutThreshold: POP_GIVER });
  const buttonFinding = r.contrast.find((c) => c.id === "button");
  assert.equal(buttonFinding.clears, false); // the real, uncorrected WCAG failure
  assert.equal(r.condition.kind, "ground_holds"); // never dragged into the ladder
});
