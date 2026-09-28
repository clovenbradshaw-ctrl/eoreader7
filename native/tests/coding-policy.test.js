// coding-policy.test.js — the DEF and EVA of the coding-policy learner, with no
// model anywhere. Every control is built to fail if its rule is wrong: the
// placebo must not hold more often than the error budget allows, a planted
// effect must hold, a short battery must be abandoned, the split must never
// put one task on two sides, and a forbidden lever must be refused.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TASKS, specHash } from "../organs/lang-competency.js";
import { INCUMBENT_POLICY, POLICY_LEVERS, FORBIDDEN_LEVERS, FAILURE_SIGNATURES, policyVersion, leverDiff, stepLever, splitOf, failureSignature } from "../organs/coding-policy.js";
import { pairedSignFlipP, openTrial, settleTrial, rngFrom, alphaPerLook, MAX_LOOKS, codingTrialActive, setCodingTrialActive, heimdallTrialActive } from "../organs/coding-policy-trial.js";

const validateTasks = TASKS.filter((t) => splitOf(specHash(t)) === "validate").map((t) => ({ id: t.id, spec: specHash(t) }));
const candidateK3 = stepLever(INCUMBENT_POLICY, "k", +1).policy;

test("split: every task lands in exactly one split, deterministically, and all three splits are populated", () => {
  const seen = new Map();
  for (const t of TASKS) {
    const s = splitOf(specHash(t));
    assert.ok(["propose", "validate", "sealed"].includes(s));
    assert.equal(splitOf(specHash(t)), s, "the deal is a function of the spec hash");
    seen.set(t.id, s);
  }
  assert.equal(seen.size, TASKS.length);
  for (const s of ["propose", "validate", "sealed"]) assert.ok([...seen.values()].includes(s), `${s} is empty`);
});

test("policy: the version is a content hash, and one step moves exactly one lever one rung", () => {
  assert.equal(policyVersion(INCUMBENT_POLICY), policyVersion({ ...INCUMBENT_POLICY }), "same fields, same version");
  assert.notEqual(policyVersion(INCUMBENT_POLICY), policyVersion(candidateK3));
  assert.deepEqual(leverDiff(INCUMBENT_POLICY, candidateK3), ["k"]);
  assert.equal(candidateK3.k, POLICY_LEVERS.k.values[1]);
  assert.equal(stepLever(INCUMBENT_POLICY, "k", -1).refusal, "at_wall", "the bottom rung has no step down");
  assert.equal(stepLever(INCUMBENT_POLICY, "rounds", +1).refusal, "lever_not_on_arm", "rounds belongs to rec2, not bok");
  for (const lever of Object.keys(FORBIDDEN_LEVERS)) assert.equal(stepLever(INCUMBENT_POLICY, lever, +1).refusal, "forbidden_lever", lever);
});

test("signature: the vocabulary is closed and each class is reached by the shape it names", () => {
  const sig = (source, score) => failureSignature({ source, score });
  assert.equal(sig("", null), "no_code");
  assert.equal(sig("x", { floorOk: false }), "floor");
  assert.equal(sig("x", { floorOk: true, got: null, cases: [false, false, false] }), "call_failed");
  assert.equal(sig("x", { floorOk: true, got: [1, { __error: "boom" }, 3], cases: [true, false, true] }), "crash");
  assert.equal(sig("x", { floorOk: true, got: [1, 2, 3], cases: [true, false, true] }), "visible_wrong");
  assert.equal(sig("x", { floorOk: true, got: [1, 2, 3], cases: [true, true, false] }), "heldout_wrong");
  assert.equal(sig("x", { floorOk: true, got: [1, 2, 3], cases: [true, true, true] }), "pass");
  for (const s of ["no_code", "floor", "call_failed", "crash", "visible_wrong", "heldout_wrong", "pass"]) assert.ok(FAILURE_SIGNATURES.includes(s));
});

test("sign flip: exact p matches the enumeration (five wins of one task each is 1/32), and ties carry no sign", () => {
  assert.equal(pairedSignFlipP([1, 1, 1, 1, 1]).p, 1 / 32);
  assert.equal(pairedSignFlipP([1, 1, 1, 1, 1, 0, 0, 0]).p, 1 / 32, "zero differences are dropped, not counted as losses");
  assert.equal(pairedSignFlipP([0, 0, 0]).p, 1);
  assert.equal(pairedSignFlipP([1, -1]).p, 0.75);
  const mc = pairedSignFlipP(Array.from({ length: 30 }, (_, i) => (i < 22 ? 1 : -1)), { seed: 7 });
  assert.equal(mc.exact, false);
  assert.equal(mc.p, pairedSignFlipP(Array.from({ length: 30 }, (_, i) => (i < 22 ? 1 : -1)), { seed: 7 }).p, "a seeded run repeats");
});

test("open: a trial must differ by exactly one lever, run on validate tasks only, and respect the interlock and the look budget", () => {
  const ok = openTrial({ incumbent: INCUMBENT_POLICY, candidate: candidateK3, tasks: validateTasks, reps: 3, hypothesis: "k=3 selects better than k=1" });
  assert.equal(ok.ok, true);
  assert.equal(ok.trial.lever, "k");
  assert.equal(ok.trial.preregistration.alpha, alphaPerLook());
  const two = { ...candidateK3, temperature: 1.0 };
  assert.equal(openTrial({ incumbent: INCUMBENT_POLICY, candidate: two, tasks: validateTasks, reps: 3 }).refusal, "not_one_lever");
  const sealed = TASKS.filter((t) => splitOf(specHash(t)) === "sealed").map((t) => ({ id: t.id, spec: specHash(t) }));
  assert.equal(openTrial({ incumbent: INCUMBENT_POLICY, candidate: candidateK3, tasks: sealed, reps: 3 }).refusal, "not_validate_split", "the sealed tier never judges");
  assert.equal(openTrial({ incumbent: INCUMBENT_POLICY, candidate: candidateK3, tasks: validateTasks, reps: 3, otherTrialActive: true }).refusal, "heimdall_trial_active");
  assert.equal(openTrial({ incumbent: INCUMBENT_POLICY, candidate: candidateK3, tasks: validateTasks, reps: 3, looksSpent: MAX_LOOKS }).refusal, "validate_split_retired");
});

// A synthetic ledger: each task has a true pass rate per policy; rows are
// drawn with a seeded coin, exactly as the driver would write them.
function simulate(trial, rateOf, rnd) {
  const rows = [];
  for (const t of trial.tasks) for (let rep = 0; rep < trial.reps; rep++) for (const [version, which] of [[trial.incumbentVersion, "incumbent"], [trial.candidateVersion, "candidate"]]) {
    rows.push({ trialId: trial.trialId, policyVersion: version, task: t.id, spec: t.spec, rep: String(rep), heldOut: rnd() < rateOf(t.id, which) });
  }
  return rows;
}

test("placebo (A/A): identical true rates hold no more often than the look's alpha allows, over 300 seeded trials", () => {
  let held = 0, twinHeld = 0;
  const N = 300;
  for (let s = 1; s <= N; s++) {
    const { trial } = openTrial({ incumbent: INCUMBENT_POLICY, candidate: candidateK3, tasks: validateTasks, reps: 3, seed: s, now: s });
    const rnd = rngFrom(1000 + s);
    const rates = Object.fromEntries(validateTasks.map((t) => [t.id, rnd()]));
    const out = settleTrial(trial, simulate(trial, (id) => rates[id], rnd));
    if (out.outcome === "held") held++;
    if (out.twin.wouldHold) twinHeld++;
  }
  // the budget per look is alpha/MAX_LOOKS; allow binomial slack of three
  // standard deviations above it before calling the judge broken
  const a = alphaPerLook();
  const ceiling = N * a + 3 * Math.sqrt(N * a * (1 - a));
  assert.ok(held <= ceiling, `placebo held ${held}/${N} (ceiling ${ceiling.toFixed(1)})`);
  assert.ok(twinHeld <= ceiling, `shuffled twin held ${twinHeld}/${N}`);
});

test("placebo p-values are calibrated: under identical rates, P(p <= x) stays at or below x (the held count alone is blind to a broken statistic, because the minimum-effect gate hides it)", () => {
  const N = 400, ps = [];
  for (let s = 1; s <= N; s++) {
    const { trial } = openTrial({ incumbent: INCUMBENT_POLICY, candidate: candidateK3, tasks: validateTasks, reps: 3, seed: s, now: s });
    const rnd = rngFrom(5000 + s);
    const rates = Object.fromEntries(validateTasks.map((t) => [t.id, rnd()]));
    ps.push(settleTrial(trial, simulate(trial, (id) => rates[id], rnd)).p);
  }
  for (const x of [0.05, 0.1, 0.25, 0.5]) {
    const frac = ps.filter((p) => p <= x).length / N;
    const slack = 3 * Math.sqrt((x * (1 - x)) / N);
    assert.ok(frac <= x + slack, `P(p <= ${x}) = ${frac.toFixed(3)} under the null`);
  }
});

test("planted effect: a candidate that passes every validate task the incumbent fails is held", () => {
  const { trial } = openTrial({ incumbent: INCUMBENT_POLICY, candidate: candidateK3, tasks: validateTasks, reps: 3, seed: 5 });
  const rows = simulate(trial, (_, which) => (which === "candidate" ? 1 : 0), rngFrom(5));
  const out = settleTrial(trial, rows);
  assert.equal(out.outcome, "held", out.reason);
  assert.equal(out.gain, validateTasks.length);
  assert.ok(out.p <= alphaPerLook());
});

test("planted effect too small for the split: one extra task is conceded, never held on luck", () => {
  const { trial } = openTrial({ incumbent: INCUMBENT_POLICY, candidate: candidateK3, tasks: validateTasks, reps: 3, seed: 6 });
  const first = validateTasks[0].id;
  const rows = simulate(trial, (id, which) => (which === "candidate" && id === first ? 1 : 0), rngFrom(6));
  assert.equal(settleTrial(trial, rows).outcome, "conceded");
});

test("abandon: a battery missing one task-policy cell is abandoned, never scored", () => {
  const { trial } = openTrial({ incumbent: INCUMBENT_POLICY, candidate: candidateK3, tasks: validateTasks, reps: 2, seed: 8 });
  const rows = simulate(trial, () => 1, rngFrom(8));
  const dropped = rows.filter((r) => !(r.task === validateTasks[0].id && r.policyVersion === trial.candidateVersion && r.rep === "1"));
  const out = settleTrial(trial, dropped);
  assert.equal(out.outcome, "abandoned");
  assert.deepEqual(out.missing, [validateTasks[0].id]);
});

test("interlock: the coding trial's active file and heimdall's trial file are each read without importing the other", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "coding-trial-"));
  const active = path.join(dir, "active.json");
  assert.equal(codingTrialActive(active), false);
  setCodingTrialActive({ trialId: "t1", openedAt: "x", lever: "k" }, active);
  assert.equal(codingTrialActive(active), true);
  setCodingTrialActive(null, active);
  assert.equal(codingTrialActive(active), false);
  const hf = path.join(dir, "heimdall-trials.json");
  assert.equal(heimdallTrialActive(hf), false, "no file, no trial");
  fs.writeFileSync(hf, JSON.stringify({ active: { key: "saturated:m" }, history: [] }));
  assert.equal(heimdallTrialActive(hf), true);
  fs.writeFileSync(hf, JSON.stringify({ active: null, history: [] }));
  assert.equal(heimdallTrialActive(hf), false);
});
