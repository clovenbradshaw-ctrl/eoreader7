// Handle: Deming (the act step of coding-policy.js's cycle; registered there).
//
// coding-policy-learner.js — the REC of the coding-policy learner: one cycle
// reads the PROPOSE split's failures, proposes one bounded lever step, opens a
// pre-registered trial, runs the paired battery on the VALIDATE split through
// an injected runner, settles it, and moves the policy pointer only on a held
// verdict. The SEALED split is run beside it and reported, never used to
// decide (the adversaries' guard against learning the validate set).
//
// Every cycle writes append-only rows (kind: propose/open/settle/sealed/rec)
// to the trial log; the policy pointer keeps its full history, so every REC
// names its parent version and can be reverted by moving the pointer back.
// The runner is injected so the whole cycle is testable with no model; the
// CLI (eval/coding-policy-learn.mjs) injects the real lang-competency runner.

import fs from "node:fs";
import path from "node:path";
import { INCUMBENT_POLICY, policyVersion, stepLever, splitOf } from "./coding-policy.js";
import { openTrial, settleTrial, appendTrialLog, readTrialLog, looksSpent, codingTrialActive, setCodingTrialActive, heimdallTrialActive, pairedSignFlipP, CODING_TRIALS_LOG, CODING_TRIAL_ACTIVE, HEIMDALL_TRIALS_FILE } from "./coding-policy-trial.js";

const HERE = path.dirname(new URL(import.meta.url).pathname);
export const POLICY_POINTER = process.env.ER7_CODING_POLICY_FILE ?? path.join(HERE, "..", "..", "state", "coding-policy.json");

/** Which lever steps a recurring failure class suggests, in order of
 *  preference. A declared prior, not a learned one: the trial decides whether
 *  a suggestion holds. `pass` suggests nothing. */
export const SIGNATURE_LEVERS = Object.freeze({
  heldout_wrong: Object.freeze([["k", +1], ["temperature", -1]]),
  visible_wrong: Object.freeze([["k", +1], ["temperature", +1]]),
  crash: Object.freeze([["k", +1]]),
  floor: Object.freeze([["temperature", -1], ["k", +1]]),
  no_code: Object.freeze([["temperature", -1]]),
  call_failed: Object.freeze([["temperature", -1]]),
});
/** A failure class must recur at least this often on the propose split before
 *  it earns a proposal (heimdall's DERIVED_FLOOR posture: one event is a
 *  fact, not a pattern). Set by hand 2026-09-27 to mirror that floor, not
 *  measured: the propose split held 7 bok rows when it was chosen. */
export const PROPOSE_FLOOR = 3;

export function readPointer(file = POLICY_POINTER) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return { current: INCUMBENT_POLICY, version: policyVersion(INCUMBENT_POLICY), parent: null, history: [] }; }
}
function writePointer(ptr, file = POLICY_POINTER) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(ptr, null, 2));
}
/** Move the pointer back to a named earlier version (a REC undone). */
export function revertTo(version, { file = POLICY_POINTER, log = CODING_TRIALS_LOG, now = Date.now() } = {}) {
  const ptr = readPointer(file);
  const entry = ptr.history.find((h) => h.version === version);
  if (!entry?.policy) return { ok: false, refusal: "unknown_version", version };
  const next = { current: entry.policy, version, parent: ptr.version, history: [...ptr.history, { version, policy: entry.policy, at: new Date(now).toISOString(), via: "revert", from: ptr.version }] };
  writePointer(next, file);
  appendTrialLog({ kind: "rec", action: "revert", from: ptr.version, to: version, at: new Date(now).toISOString() }, log);
  return { ok: true, pointer: next };
}

/** Coarse signature for ledger rows written before signatures were stamped. */
const signatureOf = (r) => r.signature ?? (r.heldOut ? "pass" : r.floorOk === false ? "floor" : "heldout_wrong");

/** Propose one lever step from the PROPOSE split only. Rows from the
 *  validate or sealed splits are never read here, so the learner cannot
 *  steer toward the tasks that will judge it. Skips any step already opened
 *  against this incumbent (a conceded step is not retried on the same deal). */
export function propose({ policy, rows, tasks, trialLog = [], floor = PROPOSE_FLOOR }) {
  const proposeSpecs = new Set(tasks.filter((t) => splitOf(t.spec) === "propose").map((t) => t.spec));
  const inc = policyVersion(policy);
  // the incumbent's own rows when it has any; rows that only share its arm
  // (written before rows carried a policy version) otherwise
  const onSplit = rows.filter((r) => proposeSpecs.has(r.spec) && r.arm === policy.arm);
  const own = onSplit.filter((r) => r.policyVersion === inc);
  const mine = own.length ? own : onSplit.filter((r) => !r.policyVersion);
  const counts = {};
  for (const r of mine) { const s = signatureOf(r); if (s !== "pass") counts[s] = (counts[s] ?? 0) + 1; }
  const ranked = Object.entries(counts).filter(([, n]) => n >= floor).sort((a, b) => b[1] - a[1]);
  const tried = new Set(trialLog.filter((r) => r.kind === "open" && r.incumbentVersion === inc).map((r) => `${r.lever}:${r.to}`));
  for (const [signature, n] of ranked) {
    for (const [lever, dir] of SIGNATURE_LEVERS[signature] ?? []) {
      const step = stepLever(policy, lever, dir);
      if (!step.ok) continue;
      if (tried.has(`${lever}:${step.policy[lever]}`)) continue;
      return { ok: true, signature, count: n, rowsRead: mine.length, lever, dir, candidate: step.policy };
    }
  }
  return { ok: false, refusal: "nothing_to_propose", counts, rowsRead: mine.length };
}

/** One full cycle. `runBattery({ policy, tasks, reps, trial, repTag })` must
 *  append ledger rows (tagged with trial.trialId and policyVersion) and
 *  resolve, or throw; `readRows()` returns the ledger. Returns the cycle's
 *  record. Nothing here calls a model. */
export async function runCycle({ tasks, readRows, runBattery, reps = 3, sealedReps = reps, surveyReps = reps, minEffect = 1, override = null, now = Date.now, seed = Date.now() % 2147483647,
  files = { pointer: POLICY_POINTER, log: CODING_TRIALS_LOG, active: CODING_TRIAL_ACTIVE, heimdall: HEIMDALL_TRIALS_FILE }, standDown = () => false }) {
  const log = (row) => appendTrialLog({ ...row, at: new Date(now()).toISOString() }, files.log);
  if (codingTrialActive(files.active)) return { outcome: "refused", refusal: "coding_trial_active" };
  const ptr = readPointer(files.pointer);
  const incumbent = ptr.current;
  const trialLog = readTrialLog(files.log);

  let prop = override
    ? (() => { const s = stepLever(incumbent, override.lever, override.dir); return s.ok ? { ok: true, signature: "override", lever: override.lever, dir: override.dir, candidate: s.policy } : s; })()
    : propose({ policy: incumbent, rows: readRows(), tasks, trialLog });
  // NUL/SIG before DEF: with too little evidence on the propose split, observe
  // the incumbent there first (a survey, tagged apart from any trial), then
  // propose from what it actually did. Survey rows never touch validate/sealed.
  if (!prop.ok && prop.refusal === "nothing_to_propose" && surveyReps > 0) {
    const proposeTasks = tasks.filter((t) => splitOf(t.spec) === "propose");
    const survey = { trialId: `survey-${seed}`, seed };
    log({ kind: "survey", incumbentVersion: policyVersion(incumbent), tasks: proposeTasks.map((t) => t.id), reps: surveyReps, trialId: survey.trialId });
    try {
      for (let rep = 0; rep < surveyReps; rep++) {
        if (standDown()) throw new Error("stand-down requested mid-survey");
        await runBattery({ policy: incumbent, tasks: proposeTasks, reps: surveyReps, trial: survey, repTag: `${seed}-p-${rep}` });
      }
    } catch (err) {
      log({ kind: "survey_abandoned", reason: String(err?.message ?? err) });
      return { outcome: "abandoned", refusal: "survey_failed", proposal: prop };
    }
    prop = propose({ policy: incumbent, rows: readRows(), tasks, trialLog });
  }
  log({ kind: "propose", incumbentVersion: policyVersion(incumbent), ...prop });
  if (!prop.ok) return { outcome: "no_proposal", proposal: prop };

  const validate = tasks.filter((t) => splitOf(t.spec) === "validate");
  const opened = openTrial({ incumbent, candidate: prop.candidate, tasks: validate, reps, minEffect, seed,
    hypothesis: `moving ${prop.lever} ${incumbent[prop.lever]} -> ${prop.candidate[prop.lever]} raises held-out passes (suggested by ${prop.signature}${prop.count ? ` x${prop.count}` : ""})`,
    looksSpent: looksSpent(trialLog), otherTrialActive: heimdallTrialActive(files.heimdall), now: now() });
  if (!opened.ok) { log({ kind: "refused", ...opened }); return { outcome: "refused", refusal: opened.refusal, proposal: prop }; }
  const trial = opened.trial;
  log({ kind: "open", ...trial });
  setCodingTrialActive(trial, files.active);

  const runPaired = async (taskSet, nReps, label) => {
    for (let rep = 0; rep < nReps; rep++) {
      // interleave: the two policies alternate who goes first, so a box that
      // drifts during the battery loads both sides alike
      const order = rep % 2 === 0 ? [trial.incumbent, trial.candidate] : [trial.candidate, trial.incumbent];
      for (const policy of order) {
        if (standDown()) throw new Error("stand-down requested mid-battery");
        await runBattery({ policy, tasks: taskSet, reps: nReps, trial, repTag: `${trial.seed}-${label}-${rep}` });
      }
    }
  };

  let settled;
  try {
    await runPaired(validate, reps, "v");
    settled = settleTrial(trial, readRows(), { now: now() });
  } catch (err) {
    settled = { trialId: trial.trialId, outcome: "abandoned", reason: String(err?.message ?? err) };
  }
  log({ kind: "settle", ...settled });

  // The sealed report: the same pair on the sealed split, never a decision.
  let sealed = null;
  if (settled.outcome !== "abandoned" && sealedReps > 0) {
    const sealedTasks = tasks.filter((t) => splitOf(t.spec) === "sealed");
    try {
      await runPaired(sealedTasks, sealedReps, "s");
      const rows = readRows().filter((r) => r.trialId === trial.trialId && String(r.rep).includes("-s-"));
      const rate = (version, id) => { const m = rows.filter((r) => r.policyVersion === version && r.task === id); return m.length ? m.filter((r) => r.heldOut).length / m.length : null; };
      const paired = sealedTasks.map((t) => ({ task: t.id, incumbent: rate(trial.incumbentVersion, t.id), candidate: rate(trial.candidateVersion, t.id) }));
      const complete = paired.every((x) => x.incumbent != null && x.candidate != null);
      const diffs = complete ? paired.map((x) => x.candidate - x.incumbent) : [];
      const test = complete ? pairedSignFlipP(diffs, { seed: trial.seed + 2 }) : null;
      sealed = { complete, paired, gain: diffs.reduce((a, b) => a + b, 0), p: test?.p ?? null, note: "reported, never decides" };
    } catch (err) {
      sealed = { complete: false, reason: String(err?.message ?? err), note: "reported, never decides" };
    }
    log({ kind: "sealed", trialId: trial.trialId, ...sealed });
  }

  setCodingTrialActive(null, files.active);
  if (settled.outcome === "held") {
    const version = policyVersion(trial.candidate);
    const next = { current: trial.candidate, version, parent: ptr.version, trialId: trial.trialId, history: [...(ptr.history.length ? ptr.history : [{ version: ptr.version, policy: incumbent, at: null, via: "initial" }]), { version, policy: trial.candidate, at: new Date(now()).toISOString(), via: "held", trialId: trial.trialId, parent: ptr.version }] };
    writePointer(next, files.pointer);
    log({ kind: "rec", action: "adopt", from: ptr.version, to: version, trialId: trial.trialId, lever: trial.lever, fromValue: trial.from, toValue: trial.to });
  } else {
    log({ kind: "rec", action: "keep", version: ptr.version, trialId: trial.trialId, outcome: settled.outcome });
  }
  return { outcome: settled.outcome, proposal: prop, trial, settled, sealed };
}
