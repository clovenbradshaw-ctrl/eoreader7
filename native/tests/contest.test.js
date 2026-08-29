// native/tests/contest.test.js — the kernel adjudicator, tested on its own
// terms and then, deliberately, on a medium that is not text. If the second
// half of this file needed a single line of text-specific setup, the organ
// would not be medium-general and the claim in its header would be false.
import test from "node:test";
import assert from "node:assert/strict";
import { adjudicate, CONTEST_VERDICTS } from "../kernel/contest.js";

const BARS = { minActivation: 0.05, minMargin: 0.2, contestedMargin: 0.5 };

test("every bar is declared — none is ever defaulted", () => {
  assert.throws(() => adjudicate({ scores: [] }), /minActivation/);
  assert.throws(() => adjudicate({ scores: [], minActivation: 0.05 }), /minMargin/);
  assert.throws(() => adjudicate({ scores: [], minActivation: 0.05, minMargin: 0.2 }), /contestedMargin/);
});

test("a contested frame is never the easier case", () => {
  assert.throws(
    () => adjudicate({ scores: [], minActivation: 0.05, minMargin: 0.5, contestedMargin: 0.2 }),
    /never the easier case/,
  );
});

test("uncontested: the ordinary margin decides", () => {
  const v = adjudicate({ scores: [["a", 1.0], ["b", 0.5]], coPresent: [], ...BARS });
  assert.equal(v.verdict, CONTEST_VERDICTS.BOUND);
  assert.equal(v.id, "a");
  assert.equal(v.barApplied, 0.2);
  assert.deepEqual(v.contested, []);
});

test("contested: the SAME scores that bind uncontested are refused", () => {
  const scores = [["a", 1.0], ["b", 0.5]]; // margin 0.5 — clears 0.2, and exactly meets 0.5
  const loose = adjudicate({ scores, coPresent: [], ...BARS });
  const tight = adjudicate({ scores: [["a", 1.0], ["b", 0.7]], coPresent: ["b"], ...BARS });
  assert.equal(loose.verdict, CONTEST_VERDICTS.BOUND);
  assert.equal(tight.verdict, CONTEST_VERDICTS.CONTESTED_NO_MARGIN);
  assert.equal(tight.barApplied, 0.5);
  assert.deepEqual(tight.contested, ["b"]);
});

test("CO-PRESENCE RAISES THE BAR AND NEVER RAISES A SCORE — no nearest-name binding", () => {
  // "b" is the only candidate present in the frame, and has NEVER been
  // activated. Under nearest-name binding it would win outright. Here it
  // does not appear in the ranking at all; it only makes the frame harder.
  const v = adjudicate({ scores: [["a", 1.0]], coPresent: ["b"], ...BARS });
  assert.equal(v.id, "a", "the co-present-but-unactivated candidate must not win");
  assert.equal(v.verdict, CONTEST_VERDICTS.BOUND);
  assert.equal(v.barApplied, 0.5, "but its presence must still have cost something");
  const runnerUpIsNotB = v.runnerUp !== "b";
  assert.ok(runnerUpIsNotB, "an unactivated co-present candidate is not a runner-up either");
});

test("a co-present competitor the caller's hard filter excluded is not a competitor", () => {
  // Charging the reading for an ambiguity it does not face is the mirror
  // error of ignoring one it does.
  const v = adjudicate({
    scores: [["a", 1.0], ["b", 0.9]],
    coPresent: ["b"],
    admissible: (id) => id !== "b",
    ...BARS,
  });
  assert.equal(v.verdict, CONTEST_VERDICTS.BOUND);
  assert.equal(v.barApplied, 0.2, "the excluded competitor must not raise the bar");
  assert.deepEqual(v.contested, []);
});

test("the floor still precedes the margin — a weak winner is below_floor, not no_margin", () => {
  const v = adjudicate({ scores: [["a", 0.01]], coPresent: ["z"], ...BARS });
  assert.equal(v.verdict, CONTEST_VERDICTS.BELOW_FLOOR);
});

test("nothing activated is a typed gap, never a guess", () => {
  const v = adjudicate({ scores: [], coPresent: ["x", "y"], ...BARS });
  assert.equal(v.verdict, CONTEST_VERDICTS.NO_CANDIDATE);
  assert.equal(v.id, null);
});

// ── the medium-generality claim, tested on a medium that is not text ──────
//
// A film shot. Two faces are visible in the frame (co-present); an
// unlabelled gaze must be attributed. Scores come from whatever the video
// adapter's own recall produced across prior shots. No string is parsed, no
// sentence exists, no pronoun is found — and the kernel is called unchanged.

test("OMNIMODAL: the same adjudicator resolves an unlabelled gaze in a film shot", () => {
  const priorShotRecall = new Map([
    ["face:mother", 0.81],
    ["face:child", 0.12],
    ["face:stranger", 0.09],
  ]);
  const facesInThisShot = ["face:mother", "face:stranger"];

  const v = adjudicate({ scores: priorShotRecall, coPresent: facesInThisShot, ...BARS });
  assert.equal(v.verdict, CONTEST_VERDICTS.BOUND);
  assert.equal(v.id, "face:mother");
  assert.equal(v.barApplied, 0.5, "two faces in frame is a contested shot");
  assert.equal(v.contested.length, 2);
});

test("OMNIMODAL: the same adjudicator refuses an unattributable motif in a bar of music", () => {
  const priorBarRecall = new Map([
    ["instrument:cello", 0.44],
    ["instrument:viola", 0.41],
  ]);
  const soundingInThisBar = ["instrument:cello", "instrument:viola"];

  const v = adjudicate({ scores: priorBarRecall, coPresent: soundingInThisBar, ...BARS });
  assert.equal(v.verdict, CONTEST_VERDICTS.CONTESTED_NO_MARGIN);
  assert.ok(v.margin < 0.5, "two instruments this close is exactly the case to refuse");
  assert.match(v.detail, /co-present competitor/);
});

test("OMNIMODAL: no branch of the kernel mentions any medium", () => {
  // Read the organ's own source and assert the claim its header makes.
  const src = readFileSync(new URL("../kernel/contest.js", import.meta.url), "utf8");
  const body = src.slice(src.indexOf("export const CONTEST_VERDICTS"));
  for (const word of ["sentence", "pronoun", "surface", "token", "word", "text"]) {
    assert.ok(
      !new RegExp(`\\b${word}\\b`, "i").test(body),
      `kernel/contest.js's executable body must not mention "${word}" — it would not be medium-general`,
    );
  }
});

import { readFileSync } from "node:fs";

// ── nullAdjudicate — the criterion fix, tested on its own claims ──────────
import { nullAdjudicate } from "../kernel/contest.js";

const NULLBARS = { minActivation: 0.05, draws: 199, seed: 20260829, alpha: 0.05 };

test("nullAdjudicate: every dial is declared, never defaulted", () => {
  const m = new Map();
  assert.throws(() => nullAdjudicate({ activation: m, frameMembers: m }), /minActivation/);
  assert.throws(() => nullAdjudicate({ activation: m, frameMembers: m, minActivation: 0.05 }), /draws/);
  assert.throws(() => nullAdjudicate({ activation: m, frameMembers: m, minActivation: 0.05, draws: 99 }), /seed/);
  assert.throws(() => nullAdjudicate({ activation: m, frameMembers: m, minActivation: 0.05, draws: 99, seed: 1 }), /alpha/);
});

test("nullAdjudicate: recall that keeps pointing at the same member clears its null", () => {
  // Ten frames; member "a" owns the three hottest recalled frames; many
  // other members exist in the pool, so a random reassignment scatters.
  const frameMembers = new Map();
  for (let f = 0; f < 30; f++) frameMembers.set(f, [`m${f % 10}`]);
  frameMembers.set(101, ["a"]); frameMembers.set(102, ["a"]); frameMembers.set(103, ["a"]);
  const activation = new Map([[101, 9], [102, 8], [103, 7], [4, 1]]);
  const v = nullAdjudicate({ activation, frameMembers, ...NULLBARS });
  assert.equal(v.verdict, CONTEST_VERDICTS.BOUND);
  assert.equal(v.id, "a");
  assert.ok(v.p <= 0.05, `p=${v.p}`);
});

test("nullAdjudicate: a lonely winner — the sparse field that fooled the constant bar — is refused", () => {
  // One hot frame, one member on it, everything else scattered: margin is
  // huge (what shuffling produces), but any random draw reproduces it.
  const frameMembers = new Map();
  for (let f = 0; f < 30; f++) frameMembers.set(f, [`m${f % 10}`]);
  const activation = new Map([[7, 9]]); // single hop, single frame
  const v = nullAdjudicate({ activation, frameMembers, ...NULLBARS });
  assert.equal(v.verdict, CONTEST_VERDICTS.NULL_NOT_CLEARED, `got ${v.verdict} p=${v.p}`);
  assert.ok(v.margin === 1, "the constant bar would have bound this at margin 1.0");
});

test("nullAdjudicate: a one-member world refuses — identity that cannot differ was not read", () => {
  const frameMembers = new Map([[0, ["only"]], [1, ["only"]], [2, ["only"]]]);
  const activation = new Map([[0, 5], [1, 4]]);
  const v = nullAdjudicate({ activation, frameMembers, ...NULLBARS });
  assert.equal(v.verdict, CONTEST_VERDICTS.NULL_NOT_CLEARED);
  assert.equal(v.p, 1, "every draw ties — ties count toward the null");
});

test("nullAdjudicate: same seed, same verdict — a verdict is reproducible", () => {
  const frameMembers = new Map();
  for (let f = 0; f < 20; f++) frameMembers.set(f, [`m${f % 6}`]);
  frameMembers.set(50, ["a"]); frameMembers.set(51, ["a"]);
  const activation = new Map([[50, 9], [51, 8], [3, 2]]);
  const a = nullAdjudicate({ activation, frameMembers, ...NULLBARS });
  const b = nullAdjudicate({ activation, frameMembers, ...NULLBARS });
  assert.deepEqual(a, b);
});

test("OMNIMODAL: the null-adjudicator attributes a motif across bars of an ensemble score, unchanged", () => {
  // Bars of a score; which instrument does an unattributed motif belong to?
  // Eight instruments rotate through the bars, so concentration on one is
  // genuinely rare under random reassignment.
  const SECTION = ["oboe", "viola", "horn", "flute", "bass", "harp", "clarinet", "timpani"];
  const barMembers = new Map();
  for (let bar = 0; bar < 40; bar++) barMembers.set(bar, [`instrument:${SECTION[bar % 8]}`]);
  barMembers.set(50, ["instrument:cello"]); barMembers.set(51, ["instrument:cello"]); barMembers.set(52, ["instrument:cello"]);
  const motifRecall = new Map([[50, 7], [51, 6], [52, 6], [5, 1]]);
  const v = nullAdjudicate({ activation: motifRecall, frameMembers: barMembers, ...NULLBARS });
  assert.equal(v.verdict, CONTEST_VERDICTS.BOUND);
  assert.equal(v.id, "instrument:cello");
});

test("OMNIMODAL: a trio is refused where an ensemble binds — pool size is part of the evidence", () => {
  // The SAME concentration in a three-member world: random reassignment
  // concentrates often, so the null correctly declines. This is the
  // statistic knowing that surprise depends on how many ways the world
  // could have been — a constant bar cannot represent that at all.
  const barMembers = new Map();
  for (let bar = 0; bar < 24; bar++) barMembers.set(bar, [bar % 2 ? "instrument:viola" : "instrument:oboe"]);
  barMembers.set(30, ["instrument:cello"]); barMembers.set(31, ["instrument:cello"]); barMembers.set(32, ["instrument:cello"]);
  const motifRecall = new Map([[30, 7], [31, 6], [32, 6], [5, 1]]);
  const v = nullAdjudicate({ activation: motifRecall, frameMembers: barMembers, ...NULLBARS });
  assert.equal(v.verdict, CONTEST_VERDICTS.NULL_NOT_CLEARED);
  assert.ok(v.margin > 0.8, "the constant bar would have bound this trio case without hesitation");
});
