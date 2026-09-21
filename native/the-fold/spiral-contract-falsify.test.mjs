// spiral-contract-falsify.test.mjs — THE FALSIFICATION TIER for the law:
//
//   "the layers of the spiral are hyper-defined, with explicit, revisable
//    work product at each loop. Low sets possibility for high; high sets
//    probability for low."
//
// Each test attacks a consequence: a failing high gate must become a
// revision, not a verdict; a budget must end the loop; a measured strain must
// MOVE when a required beat is removed (the old one could not); inflation
// must be found without a list, in a script the list never covered.
import test from "node:test";
import assert from "node:assert/strict";
import { measureVariance, measureBondNull } from "./admission.js";
import { removalTest } from "./concrescence.js";
import {
  draftGate, foldGate, tightenGate, arriveGate, planGate, groundGate,
  runLayer, chainStrain, measuredInflation, lastSentence,
} from "./spiral-contract.js";

const GROUND = "The Cumberland River flows through the center of Nashville. It drains a basin of about eighteen thousand square miles. Steamboats carried cotton downriver every spring. The port handles barge traffic today. Locks and dams hold the channel open. Floods in 2010 put the riverfront under water.";
const V = measureVariance(GROUND);
const NUL = measureBondNull(GROUND, undefined, V);

// ── low / high are two different questions ──────────────────────────────────

test("a draft with survivors but no motion passes LOW and fails HIGH with the missing road named", () => {
  const product = { survivors: ["The port handles barge traffic today."], roads: ["matter"], refusals: [] };
  assert.equal(draftGate.low(product).pass, true);
  const high = draftGate.high(product, { isOpening: false });
  assert.equal(high.pass, false);
  assert.equal(high.missing, "motion");
  // and the opening section is exempt from motion — nothing precedes it
  assert.equal(draftGate.high(product, { isOpening: true }).pass, true);
});

test("the missing road decides what the redraw opens on", () => {
  const noMotion = draftGate.revise({}, { pass: false, missing: "motion", basis: "" });
  assert.equal(noMotion.open, "prior-landing");
  assert.equal(noMotion.drop, "window");
  const noMatter = draftGate.revise({}, { pass: false, missing: "matter", basis: "" });
  assert.equal(noMatter.open, "window");
});

// ── a failing high gate becomes a revision, bounded by budget ──────────────

test("runLayer revises until the high gate passes, and records every attempt", async () => {
  let calls = 0;
  const out = await runLayer({
    name: "draft", gate: draftGate,
    product: { survivors: ["a"], roads: ["matter"], refusals: [] },
    ctx: { isOpening: false }, budget: 3,
    revise: async (instruction) => { calls++; assert.equal(instruction.kind, "redraw"); return { survivors: ["a", "b"], roads: ["matter", "motion"], refusals: [] }; },
  });
  assert.equal(out.pass, true);
  assert.equal(calls, 1);
  assert.equal(out.record.attempts.length, 2);
  assert.equal(out.record.attempts[0].missing, "motion");
});

test("the budget ends the loop, and exhaustion is on the record — never silent", async () => {
  let calls = 0;
  const out = await runLayer({
    name: "draft", gate: draftGate,
    product: { survivors: ["a"], roads: ["matter"], refusals: [] },
    ctx: { isOpening: false }, budget: 2,
    revise: async () => { calls++; return { survivors: ["a"], roads: ["matter"], refusals: [] }; },
  });
  assert.equal(out.pass, false);
  assert.equal(calls, 2);
  assert.equal(out.record.exhausted, true);
  assert.equal(out.missing, "motion");
});

test("a product that fails LOW is not revised — the layer has nothing", async () => {
  let calls = 0;
  const out = await runLayer({ name: "draft", gate: draftGate, product: { survivors: [], roads: [], refusals: [{ kind: "meta" }] }, budget: 5, revise: async () => { calls++; return null; } });
  assert.equal(out.stage, "low");
  assert.equal(calls, 0);
});

// ── the fold's gap is the next section to draw ──────────────────────────────

test("a gap beat becomes a redraw instruction opening on the prior beat's last sentence", () => {
  const product = { beats: [
    { title: "The subject", text: "The river flows through Nashville. It drains a wide basin." },
    { title: "The tension", text: "", gap: true },
    { title: "The return", text: "The riverfront is parkland today." },
  ] };
  const high = foldGate.high(product);
  assert.equal(high.pass, false);
  assert.equal(high.gaps.length, 1);
  const rev = foldGate.revise(product, high);
  assert.equal(rev[0].section, "The tension");
  assert.equal(rev[0].priorLanding, "It drains a wide basin.");
});

// ── the measured strain MOVES; the old one could not ────────────────────────

test("THE DEAD DETECTOR: the old satisfaction never moves when a beat is removed", () => {
  const old = (t) => ({ strain: String(t).split(/\s+/).length > 25 ? 1 : 0 });
  const beats = [
    "Steamboats carried cotton downriver every spring, and the port grew on that traffic.",
    "That cotton traffic carried a cost the steamboats never paid, and the port paid it in floods.",
    "Floods in 2010 put the riverfront under water, and the port's cotton days were remembered.",
  ];
  const r = removalTest(beats.join("\n\n"), beats, old);
  assert.equal(r.passed, false, "the old detector was expected to fail vacuously");
  assert.equal(r.degrading.length, 0, "the old strain never moved for any removal");
});

test("chainStrain rises when a beat the chain needs is removed", () => {
  const beats = [
    "Steamboats carried cotton downriver every spring, and the port grew on that traffic.",
    "That cotton traffic carried a cost the steamboats never paid, and the port paid it in floods.",
    "Floods in 2010 put the riverfront under water, and the port's cotton days were remembered.",
  ];
  const sat = (t) => chainStrain(t, { variance: V, bondNull: NUL });
  const whole = sat(beats.join("\n\n")).strain;
  const withoutMiddle = sat([beats[0], beats[2]].join("\n\n")).strain;
  assert.ok(whole <= withoutMiddle, `removing the bridge should not lower strain (whole ${whole}, without ${withoutMiddle})`);
  const r = removalTest(beats.join("\n\n"), beats, sat);
  assert.ok(r.wholeStrain != null);
});

test("an unbonded list registers as broken links, not as a unity", () => {
  const list = ["The river drains a basin.", "Quarterly earnings disappointed analysts.", "Penguins huddle in winter."];
  const s = chainStrain(list, { variance: V, bondNull: NUL });
  assert.equal(s.broken.length, 2, "every link of a list is broken");
});

// ── inflation measured, in a script no list covered ─────────────────────────

test("inflation is found without a list: a word the ground never said whose removal leaves the claim intact", () => {
  const hits = measuredInflation("The vital, bustling port handles barge traffic today.", GROUND, V);
  const words = hits.map((h) => h.word);
  assert.ok(words.includes("vital") && words.includes("bustling"), `expected decoration named, got ${words.join(",")}`);
  assert.ok(!words.includes("barge"), "a grounded content word was called inflation");
});

test("inflation carries to Chinese, where the English list found nothing", () => {
  const g = "坎伯兰河流经纳什维尔市中心。它的流域面积约为一万八千平方英里。汽船每年春天沿河运送棉花。该港口今天处理驳船运输。船闸和水坝保持航道畅通。";
  const v = measureVariance(g);
  const hits = measuredInflation("该港口今天非常繁忙地处理驳船运输。", g, v);
  assert.ok(hits.length >= 1, "no decoration found in a sentence carrying an ungrounded intensifier");
});

// ── every layer's gate names the missing signal ─────────────────────────────

test("the arrive gate names which signal is missing, never a bare no", () => {
  const h = arriveGate.high({ concrescent: false, signals: { removal: false, influxStable: true, strainConstant: false, tensionHeld: false } });
  assert.equal(h.pass, false);
  assert.deepEqual(h.missingAll, ["removal", "strainConstant"]);
});

test("the plan gate declares a dark section a void rather than sending it to the mouth", () => {
  const h = planGate.high({ sections: [{ title: "a", window: "x" }, { title: "b", window: "" }] });
  assert.equal(h.pass, false);
  assert.deepEqual(h.voids, ["b"]);
});

test("the ground gate refuses to measure a null on nothing", () => {
  assert.equal(groundGate.low({ sentences: 1 }).pass, false);
  assert.equal(groundGate.high({ bondNull: { pairs: 0 } }).missing, "ground");
});

test("lastSentence is the script's own last sentence", () => {
  assert.equal(lastSentence("One here. Two there. Three."), "Three.");
  assert.equal(lastSentence("一。二。三。"), "三。");
});
