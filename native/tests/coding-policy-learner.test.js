// coding-policy-learner.test.js — the REC cycle with a fake battery runner and
// no model. Controls: a real effect moves the pointer and a null one does not;
// the proposal never reads validate or sealed rows; a runner that dies
// mid-battery abandons the trial and leaves the policy alone; an open heimdall
// trial refuses the cycle; a REC can be reverted.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TASKS, specHash } from "../organs/lang-competency.js";
import { INCUMBENT_POLICY, policyVersion, splitOf } from "../organs/coding-policy.js";
import { rngFrom, readTrialLog, codingTrialActive } from "../organs/coding-policy-trial.js";
import { runCycle, propose, readPointer, revertTo } from "../organs/coding-policy-learner.js";

const tasks = TASKS.map((t) => ({ id: t.id, spec: specHash(t) }));
const scratch = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "coding-learner-"));
  return { pointer: path.join(dir, "policy.json"), log: path.join(dir, "trials.jsonl"), active: path.join(dir, "active.json"), heimdall: path.join(dir, "heimdall-trials.json") };
};
// propose-split rows whose failures are held-out misses: enough to earn a proposal
const proposeRows = tasks.filter((t) => splitOf(t.spec) === "propose").flatMap((t) => [0, 1].map((rep) => ({ arm: "bok", task: t.id, spec: t.spec, rep: String(rep), heldOut: false, floorOk: true, signature: "heldout_wrong" })));

// A fake runner: appends one row per task per rep for the given policy, with a
// pass probability chosen by `passOf(policy, task)`.
function fakeRunner(ledger, passOf, rnd) {
  return async ({ policy, tasks: ts, trial, repTag }) => {
    for (const t of ts) ledger.push({ arm: policy.arm, task: t.id, spec: t.spec, rep: repTag, trialId: trial.trialId, policyVersion: policyVersion(policy), heldOut: rnd() < passOf(policy, t), floorOk: true, signature: "heldout_wrong" });
  };
}

test("propose: reads only the propose split, and skips rows from validate and sealed", () => {
  const validateNoise = tasks.filter((t) => splitOf(t.spec) !== "propose").flatMap((t) => Array.from({ length: 5 }, (_, i) => ({ arm: "bok", task: t.id, spec: t.spec, rep: String(i), heldOut: false, floorOk: false, signature: "floor" })));
  const p = propose({ policy: INCUMBENT_POLICY, rows: [...proposeRows, ...validateNoise], tasks });
  assert.equal(p.ok, true);
  assert.equal(p.signature, "heldout_wrong", "the flood of floor failures on other splits is invisible to the proposer");
  assert.equal(p.lever, "k");
  assert.equal(p.rowsRead, proposeRows.length);
  assert.equal(propose({ policy: INCUMBENT_POLICY, rows: validateNoise, tasks }).refusal, "nothing_to_propose");
});

test("cycle: a candidate that truly passes more validate tasks is adopted; the pointer names its parent and can be reverted", async () => {
  const files = scratch();
  const ledger = [...proposeRows];
  const run = fakeRunner(ledger, (policy) => (policy.k === 3 ? 1 : 0), rngFrom(3));
  const out = await runCycle({ tasks, readRows: () => ledger, runBattery: run, reps: 2, sealedReps: 1, seed: 11, files, now: () => 1_000 });
  assert.equal(out.outcome, "held", out.settled?.reason);
  const ptr = readPointer(files.pointer);
  assert.equal(ptr.current.k, 3);
  assert.equal(ptr.parent, policyVersion(INCUMBENT_POLICY));
  assert.ok(out.sealed.complete, "the sealed split was run and reported");
  assert.equal(out.sealed.note, "reported, never decides");
  assert.equal(codingTrialActive(files.active), false, "the interlock is released");
  const kinds = readTrialLog(files.log).map((r) => r.kind);
  assert.deepEqual(kinds, ["propose", "open", "settle", "sealed", "rec"]);
  const back = revertTo(policyVersion(INCUMBENT_POLICY), { file: files.pointer, log: files.log });
  assert.equal(back.ok, true);
  assert.equal(readPointer(files.pointer).current.k, 1, "the REC is undone by moving the pointer back");
});

test("cycle: a null candidate (same true rates) is kept out, and the policy does not move", async () => {
  const files = scratch();
  const ledger = [...proposeRows];
  const rates = Object.fromEntries(tasks.map((t, i) => [t.id, (i % 5) / 5]));
  const out = await runCycle({ tasks, readRows: () => ledger, runBattery: fakeRunner(ledger, (_, t) => rates[t.id], rngFrom(4)), reps: 2, sealedReps: 0, seed: 12, files, now: () => 2_000 });
  assert.notEqual(out.outcome, "held");
  assert.equal(readPointer(files.pointer).current.k, 1);
});

test("cycle: a runner that dies mid-battery abandons the trial, releases the interlock, and leaves the policy alone", async () => {
  const files = scratch();
  const ledger = [...proposeRows];
  let calls = 0;
  const dying = async (args) => { if (++calls === 2) throw new Error("socket hang up"); return fakeRunner(ledger, () => 1, rngFrom(5))(args); };
  const out = await runCycle({ tasks, readRows: () => ledger, runBattery: dying, reps: 2, seed: 13, files, now: () => 3_000 });
  assert.equal(out.outcome, "abandoned");
  assert.equal(codingTrialActive(files.active), false);
  assert.equal(readPointer(files.pointer).current.k, 1);
});

test("cycle: an open heimdall trial refuses the cycle before any draw", async () => {
  const files = scratch();
  fs.writeFileSync(files.heimdall, JSON.stringify({ active: { key: "saturated:m" }, history: [] }));
  let drew = false;
  const out = await runCycle({ tasks, readRows: () => proposeRows, runBattery: async () => { drew = true; }, reps: 2, seed: 14, files });
  assert.equal(out.outcome, "refused");
  assert.equal(out.refusal, "heimdall_trial_active");
  assert.equal(drew, false);
});

test("cycle: a step already trialled against this incumbent is not proposed again on the same deal", async () => {
  const files = scratch();
  const ledger = [...proposeRows];
  await runCycle({ tasks, readRows: () => ledger, runBattery: fakeRunner(ledger, () => 0.5, rngFrom(6)), reps: 1, sealedReps: 0, seed: 15, files, now: () => 4_000 });
  const again = propose({ policy: INCUMBENT_POLICY, rows: ledger, tasks, trialLog: readTrialLog(files.log) });
  assert.ok(!again.ok || again.lever !== "k" || again.candidate.k !== 3, "k 1->3 was already opened against this incumbent");
});

test("survey: with no evidence the incumbent is observed on the propose split only, and the proposal comes from what it did", async () => {
  const files = scratch();
  const ledger = [];
  const touched = new Set();
  const run = async (args) => { for (const t of args.tasks) touched.add(splitOf(t.spec)); return fakeRunner(ledger, (policy) => (policy.k === 3 ? 1 : 0), rngFrom(9))(args); };
  const out = await runCycle({ tasks, readRows: () => ledger, runBattery: run, reps: 1, sealedReps: 0, surveyReps: 2, seed: 21, files, now: () => 5_000 });
  const log = readTrialLog(files.log);
  assert.deepEqual(log.slice(0, 2).map((r) => r.kind), ["survey", "propose"], "observe first, then propose");
  const survey = log[0];
  assert.ok(survey.tasks.every((id) => splitOf(tasks.find((t) => t.id === id).spec) === "propose"), "the survey reads no validate or sealed task");
  assert.equal(out.proposal.ok, true, "the survey's own failures earn a proposal");
  assert.equal(out.proposal.lever, "k");
  assert.ok(touched.has("validate"), "the trial then runs on validate");
  assert.ok(!touched.has("sealed"), "sealedReps 0 leaves the sealed split untouched");
});
