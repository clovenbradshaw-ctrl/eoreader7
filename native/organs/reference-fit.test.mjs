import { test } from "node:test";
import assert from "node:assert/strict";
import { createTaskLog } from "../kernel/task-log.js";
import { cellOf } from "../kernel/cube.js";
import {
  proposeReference, signMeasurement, retractFinding, bindCorrespondence,
  synthesizeCandidate, defineCandidate, evaluateCandidate, concedeCandidate,
  fitStatus, needsReopen, latestRound, SPREAD_THRESHOLD,
} from "./reference-fit.js";

// Real measured values from this repo's own Girard evidence:
//   the-fold   --bg #0f0f12   heimdall --bg #0b0e14   Pocket Casts #303030
const THE_FOLD = "#0f0f12";
const HEIMDALL = "#0b0e14";
const POCKET_CASTS = "#303030";

test("the nine operators each land on the exact cube cell reference-fit.js's own header claims", () => {
  assert.deepEqual(cellOf("INS", "Figure"), { op: "INS", grain: "Figure", mode: "Generate", domain: "Existence", terrain: "Entity", stance: "Making" });
  assert.deepEqual(cellOf("SIG", "Figure"), { op: "SIG", grain: "Figure", mode: "Relate", domain: "Existence", terrain: "Entity", stance: "Binding" });
  assert.deepEqual(cellOf("CON", "Figure"), { op: "CON", grain: "Figure", mode: "Relate", domain: "Structure", terrain: "Link", stance: "Binding" });
  assert.deepEqual(cellOf("SYN", "Figure"), { op: "SYN", grain: "Figure", mode: "Generate", domain: "Structure", terrain: "Link", stance: "Making" });
  assert.deepEqual(cellOf("DEF", "Figure"), { op: "DEF", grain: "Figure", mode: "Differentiate", domain: "Interpretation", terrain: "Lens", stance: "Dissecting" });
  assert.deepEqual(cellOf("EVA", "Figure"), { op: "EVA", grain: "Figure", mode: "Relate", domain: "Interpretation", terrain: "Lens", stance: "Binding" });
  assert.deepEqual(cellOf("REC", "Pattern"), { op: "REC", grain: "Pattern", mode: "Generate", domain: "Interpretation", terrain: "Paradigm", stance: "Composing" });
});

test("proposeReference: INS is idempotent — proposing the same reference twice does not grow the log", () => {
  let log = createTaskLog();
  log = proposeReference(log, { name: "the-fold", giver: "organs/girard.js" });
  const after1 = log.entries.length;
  log = proposeReference(log, { name: "the-fold", giver: "organs/girard.js" });
  assert.equal(log.entries.length, after1);
});

test("retractFinding: SEG refuses a retraction with no stated reason", () => {
  let log = createTaskLog();
  log = signMeasurement(log, { property: "elevation-hue", reference: "pocket-casts", hex: "#402020" });
  assert.throws(() => retractFinding(log, { taskId: "signal:elevation-hue:pocket-casts", because: "" }), /reason/);
});

test("full cycle on background: two tightly-agreeing local references + a divergent third correctly land CONTESTED, never silently averaged", () => {
  let log = createTaskLog();
  log = proposeReference(log, { name: "the-fold", giver: "the-fold/index.html" });
  log = proposeReference(log, { name: "heimdall", giver: "heimdall/src/style.css" });
  log = proposeReference(log, { name: "pocket-casts", giver: "Wikimedia Commons, freely licensed screenshot" });
  log = signMeasurement(log, { property: "background", reference: "the-fold", hex: THE_FOLD });
  log = signMeasurement(log, { property: "background", reference: "heimdall", hex: HEIMDALL });
  log = signMeasurement(log, { property: "background", reference: "pocket-casts", hex: POCKET_CASTS });
  log = bindCorrespondence(log, { property: "background", reference: "the-fold" });
  log = bindCorrespondence(log, { property: "background", reference: "heimdall" });
  log = bindCorrespondence(log, { property: "background", reference: "pocket-casts" });

  const syn = synthesizeCandidate(log, { property: "background", round: 1 });
  log = syn.log;
  assert.equal(syn.n, 3);
  assert.ok(syn.spread >= SPREAD_THRESHOLD.value, `expected a real, large spread with Pocket Casts included, got ${syn.spread}`);
  assert.equal(syn.contested, true);

  log = defineCandidate(log, { property: "background", round: 1 });
  log = evaluateCandidate(log, { property: "background", round: 1, candidateHex: syn.candidateHex, contested: syn.contested, check: () => { throw new Error("must never run the check on a contested candidate"); } });

  const status = fitStatus(log, "background");
  assert.equal(status.status, "refused");
  assert.match(status.detail, /disagree/);
});

test("full cycle, revised: retracting the divergent reference reopens a clean round that DOES land, then a later REC concedes it — always revisable", () => {
  let log = createTaskLog();
  log = proposeReference(log, { name: "the-fold", giver: "the-fold/index.html" });
  log = proposeReference(log, { name: "heimdall", giver: "heimdall/src/style.css" });
  log = proposeReference(log, { name: "pocket-casts", giver: "Wikimedia Commons, freely licensed screenshot" });
  log = signMeasurement(log, { property: "background", reference: "the-fold", hex: THE_FOLD });
  log = signMeasurement(log, { property: "background", reference: "heimdall", hex: HEIMDALL });
  log = signMeasurement(log, { property: "background", reference: "pocket-casts", hex: POCKET_CASTS });

  // Round 1: contested and refused, exactly as the previous test shows.
  let syn = synthesizeCandidate(log, { property: "background", round: 1 });
  log = syn.log;
  log = defineCandidate(log, { property: "background", round: 1 });
  log = evaluateCandidate(log, { property: "background", round: 1, contested: syn.contested, check: () => ({ holds: true }) });
  assert.equal(fitStatus(log, "background").status, "refused");

  // SEG: retract the divergent Pocket Casts signal — a real, stated decision
  // ("this one screenshot alone isn't representative enough yet"), never a
  // silent drop.
  log = retractFinding(log, { taskId: "signal:background:pocket-casts", because: "one screenshot is not yet a corroborated convention; the two local systems agree tightly on their own" });

  // Round 2 opens fresh, reads only the LIVE (non-retracted) signals.
  syn = synthesizeCandidate(log, { property: "background", round: 2 });
  log = syn.log;
  assert.equal(syn.n, 2);
  assert.equal(syn.contested, false, `the-fold and heimdall should agree tightly, got spread ${syn.spread}`);

  log = defineCandidate(log, { property: "background", round: 2 });
  log = evaluateCandidate(log, { property: "background", round: 2, candidateHex: syn.candidateHex, contested: false, check: (hex) => ({ holds: true, detail: `${hex} clears a real WCAG check against the app's own text color` }) });

  const landed = fitStatus(log, "background");
  assert.equal(landed.status, "landed");
  assert.equal(landed.round, 2);
  assert.equal(landed.candidateHex, syn.candidateHex);

  // REC: a later, independent fourth reference disagrees — the landed
  // round-2 value is CONCEDED, never silently overwritten.
  log = concedeCandidate(log, { property: "background", round: 2, trigger: "a fourth reference (a real fetched app) measures a background far outside round 2's own agreement" });
  const conceded = fitStatus(log, "background");
  assert.equal(conceded.status, "conceded");
  assert.equal(conceded.round, 2);
});

test("evaluateCandidate: a real injected check function can refuse a NON-contested candidate too (a tight median that still fails WCAG)", () => {
  let log = createTaskLog();
  log = signMeasurement(log, { property: "background", reference: "a", hex: "#101010" });
  log = signMeasurement(log, { property: "background", reference: "b", hex: "#111111" });
  const syn = synthesizeCandidate(log, { property: "background", round: 1 });
  log = syn.log;
  assert.equal(syn.contested, false);
  log = defineCandidate(log, { property: "background", round: 1 });
  log = evaluateCandidate(log, { property: "background", round: 1, candidateHex: syn.candidateHex, contested: false, check: () => ({ holds: false, detail: "fails contrast against the app's own button text" }) });
  const status = fitStatus(log, "background");
  assert.equal(status.status, "refused");
  assert.match(status.detail, /contrast/);
});

test("needsReopen: a retraction after a refused round is detected automatically — 'always revisable' as an automatic property, not something a caller must remember to re-trigger", () => {
  let log = createTaskLog();
  log = signMeasurement(log, { property: "background", reference: "the-fold", hex: THE_FOLD });
  log = signMeasurement(log, { property: "background", reference: "heimdall", hex: HEIMDALL });
  log = signMeasurement(log, { property: "background", reference: "pocket-casts", hex: POCKET_CASTS });
  const syn = synthesizeCandidate(log, { property: "background", round: 1 });
  log = syn.log;
  log = defineCandidate(log, { property: "background", round: 1 });
  log = evaluateCandidate(log, { property: "background", round: 1, contested: syn.contested, check: () => ({ holds: true }) });
  assert.equal(fitStatus(log, "background").status, "refused");
  assert.equal(needsReopen(log, "background"), false, "the live signals still exactly match what round 1's own SYN saw");

  log = retractFinding(log, { taskId: "signal:background:pocket-casts", because: "demonstrating automatic reopen detection" });
  assert.equal(needsReopen(log, "background"), true, "the live signal set (now 2, not 3) no longer matches round 1's frozen sample set");
  assert.equal(latestRound(log, "background"), 1);
});

test("needsReopen: false when nothing has ever been synthesized — that state is 'open', not 'reopen'", () => {
  const log = createTaskLog();
  assert.equal(needsReopen(log, "background"), false);
  assert.equal(latestRound(log, "background"), 0);
});

test("fitStatus: a property with no proposed round at all is the NUL — an open question, never a fabricated default", () => {
  const log = createTaskLog();
  const status = fitStatus(log, "border-radius");
  assert.equal(status.status, "open");
});
