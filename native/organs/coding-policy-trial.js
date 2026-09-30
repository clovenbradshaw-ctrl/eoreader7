// Handle: Hill — the paired, randomized trial (Bradford Hill, streptomycin,
// 1948): the same patients under both arms, the allocation declared before
// the first result, and the verdict read only from the comparison.
//
// coding-policy-trial.js — the EVA of the coding-policy learner. One trial
// compares an incumbent policy with a candidate that differs in exactly ONE
// lever, over the same validate-split tasks, the same seeded repeats, in the
// same box state (the driver interleaves them). The unit of evidence is the
// TASK: a task's held-out pass rate over its repeats is one number per
// policy, and the null is a sign flip of the per-task differences — never a
// pool of draws (draws at one temperature are near-duplicates, lesson 56.1)
// and never a before/after window (the box drifts, lessons 12-13).
//
// Why not heimdall's trial store (the loop-control panel, 2026-09-27): its
// permutationP is unpaired and unseeded, its baseline is the window that
// EARNED the rule (regression to the mean holds useless levers), and its
// settle runs every tick, so a coding trial sharing `_trials.active` would be
// judged on ledger buckets it never wrote. The two stores stay separate and
// exclude each other (see otherTrialActive / codingTrialActive).
//
// Pure except for the two store functions at the bottom, which only append
// JSONL and write one small active-trial file.

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { leverDiff, policyVersion, splitOf } from "./coding-policy.js";

export const CODING_TRIAL_SCHEMA = "CodingPolicyTrial@1";
/** The one calibration constant, shared with heimdall's TRIAL_ALPHA. It is the
 *  TOTAL error budget for a validate split, not a per-trial alpha. */
export const TRIAL_ALPHA = Number(process.env.ER7_CODING_TRIAL_ALPHA ?? 0.05);
/** Looks a validate split may take before it is retired and re-dealt. Each
 *  look spends alpha/MAX_LOOKS (Bonferroni over the split's lifetime), so
 *  more trials raise the bar and never lower it (Tungara). Eight is set by
 *  hand (2026-09-27), not measured: one look per lever rung on the current
 *  ladders, with room for a re-run. */
export const MAX_LOOKS = Number(process.env.ER7_CODING_TRIAL_LOOKS ?? 8);
export const alphaPerLook = (alpha = TRIAL_ALPHA, looks = MAX_LOOKS) => alpha / looks;

/** Seeded PRNG (mulberry32). A run nobody can repeat is not a measurement. */
export function rngFrom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One-sided paired sign-flip p for "the candidate beats the incumbent":
 *  P(sum of randomly sign-flipped per-task differences >= the observed sum).
 *  Exact enumeration over the nonzero differences up to 20 of them, seeded
 *  Monte Carlo above that. A zero difference carries no sign and is dropped. */
export function pairedSignFlipP(diffs, { draws = 20000, seed = 1 } = {}) {
  const d = diffs.filter((x) => Number.isFinite(x) && x !== 0);
  const observed = d.reduce((a, b) => a + b, 0);
  const eps = 1e-12;
  if (!d.length) return { p: 1, n: diffs.length, nonzero: 0, observed, exact: true };
  if (d.length <= 20) {
    let ge = 0;
    const total = 1 << d.length;
    for (let mask = 0; mask < total; mask++) {
      let s = 0;
      for (let i = 0; i < d.length; i++) s += (mask >> i) & 1 ? -Math.abs(d[i]) : Math.abs(d[i]);
      if (s >= observed - eps) ge++;
    }
    return { p: ge / total, n: diffs.length, nonzero: d.length, observed, exact: true };
  }
  const rnd = rngFrom(seed);
  let ge = 0;
  for (let k = 0; k < draws; k++) {
    let s = 0;
    for (const x of d) s += rnd() < 0.5 ? -Math.abs(x) : Math.abs(x);
    if (s >= observed - eps) ge++;
  }
  return { p: (ge + 1) / (draws + 1), n: diffs.length, nonzero: d.length, observed, exact: false, draws, seed };
}

/** Open a trial: the pre-registration (Bharata's expectation, opened before
 *  any draw). Returns { ok, trial } or a typed refusal. `looksSpent` is how
 *  many trials this validate deal has already judged; `otherTrialActive`
 *  is the heimdall interlock (injected; the driver reads heimdall's file). */
export function openTrial({ incumbent, candidate, tasks, reps, hypothesis, minEffect = 1, looksSpent = 0, otherTrialActive = false, now = Date.now(), seed = 1 }) {
  const diff = leverDiff(incumbent, candidate);
  if (diff.length !== 1) return { ok: false, refusal: "not_one_lever", diff };
  if (incumbent.arm !== candidate.arm) return { ok: false, refusal: "not_one_lever", diff: ["arm"] };
  if (otherTrialActive) return { ok: false, refusal: "heimdall_trial_active" };
  if (looksSpent >= MAX_LOOKS) return { ok: false, refusal: "validate_split_retired", looksSpent, maxLooks: MAX_LOOKS };
  const bad = tasks.filter((t) => splitOf(t.spec) !== "validate");
  if (bad.length) return { ok: false, refusal: "not_validate_split", tasks: bad.map((t) => t.id) };
  if (!(reps >= 1)) return { ok: false, refusal: "no_reps" };
  const inc = policyVersion(incumbent), cand = policyVersion(candidate);
  const trialId = createHash("sha1").update(`${inc}|${cand}|${now}|${seed}`).digest("hex").slice(0, 10);
  return {
    ok: true,
    trial: Object.freeze({
      schema: CODING_TRIAL_SCHEMA, trialId, openedAt: new Date(now).toISOString(),
      lever: diff[0], from: incumbent[diff[0]], to: candidate[diff[0]],
      incumbent, candidate, incumbentVersion: inc, candidateVersion: cand,
      tasks: tasks.map((t) => ({ id: t.id, spec: t.spec })), reps, seed,
      preregistration: Object.freeze({ hypothesis, direction: "candidate_greater", minEffect, alpha: alphaPerLook(), look: looksSpent + 1, maxLooks: MAX_LOOKS }),
    }),
  };
}

/** Per-task held-out pass rate for one policy version, from ledger rows
 *  tagged with the trial. Returns null for a task with fewer than `reps`
 *  rows: a missing row is never scored as a fail or a pass. */
function ratesFor(rows, trial, version) {
  const out = {};
  for (const t of trial.tasks) {
    const m = rows.filter((r) => r.trialId === trial.trialId && r.policyVersion === version && r.task === t.id && r.spec === t.spec);
    const byRep = new Map(m.map((r) => [String(r.rep), r]));
    out[t.id] = byRep.size >= trial.reps ? [...byRep.values()].filter((r) => r.heldOut).length / byRep.size : null;
  }
  return out;
}

/** Settle a trial from its ledger rows. A battery with any task-policy cell
 *  short of its repeats is ABANDONED, never judged (a dropped draw is not a
 *  fail; survivorship is not evidence). Held needs p <= the look's alpha AND
 *  the observed gain >= the registered minimum effect, in tasks. The
 *  shuffled-label twin (the adversaries' control) is the same test on the
 *  same rows with each task's labels swapped by a seeded coin; it is
 *  recorded beside the verdict so a machinery that "finds" effects in
 *  shuffled labels shows itself. */
export function settleTrial(trial, rows, { now = Date.now() } = {}) {
  const inc = ratesFor(rows, trial, trial.incumbentVersion);
  const cand = ratesFor(rows, trial, trial.candidateVersion);
  const missing = trial.tasks.filter((t) => inc[t.id] == null || cand[t.id] == null).map((t) => t.id);
  const base = { schema: CODING_TRIAL_SCHEMA, trialId: trial.trialId, lever: trial.lever, from: trial.from, to: trial.to, incumbentVersion: trial.incumbentVersion, candidateVersion: trial.candidateVersion, look: trial.preregistration.look, settledAt: new Date(now).toISOString() };
  if (missing.length) return { ...base, outcome: "abandoned", reason: "battery incomplete", missing };
  const paired = trial.tasks.map((t) => ({ task: t.id, incumbent: inc[t.id], candidate: cand[t.id], diff: cand[t.id] - inc[t.id] }));
  const diffs = paired.map((x) => x.diff);
  const test = pairedSignFlipP(diffs, { seed: trial.seed });
  const gain = diffs.reduce((a, b) => a + b, 0);
  const alpha = trial.preregistration.alpha;
  const held = test.p <= alpha && gain >= trial.preregistration.minEffect;
  const coin = rngFrom(trial.seed ^ 0x9e3779b9);
  const twinDiffs = diffs.map((x) => (coin() < 0.5 ? -x : x));
  const twin = pairedSignFlipP(twinDiffs, { seed: trial.seed + 1 });
  const twinGain = twinDiffs.reduce((a, b) => a + b, 0);
  return {
    ...base, outcome: held ? "held" : "conceded", paired, gain, p: test.p, exact: test.exact, nonzero: test.nonzero, alpha, minEffect: trial.preregistration.minEffect,
    twin: { p: twin.p, gain: twinGain, wouldHold: twin.p <= alpha && twinGain >= trial.preregistration.minEffect },
    reason: held ? `candidate gained ${gain.toFixed(2)} tasks, p=${test.p.toFixed(4)} <= ${alpha}` : `gain ${gain.toFixed(2)} tasks, p=${test.p.toFixed(4)} (alpha ${alpha}, min effect ${trial.preregistration.minEffect}) — not shown`,
  };
}

// ── the stores (append-only; the active file is the cross-process interlock) ──
const HERE = path.dirname(new URL(import.meta.url).pathname);
export const CODING_TRIALS_LOG = process.env.ER7_CODING_TRIALS_LOG ?? path.join(HERE, "..", "..", "state", "coding-policy-trials.jsonl");
export const CODING_TRIAL_ACTIVE = process.env.ER7_CODING_TRIAL_ACTIVE ?? path.join(HERE, "..", "..", "state", "coding-policy-trial-active.json");
export const HEIMDALL_TRIALS_FILE = process.env.ER7_TRIALS_FILE ?? path.join(HERE, "..", "..", "state", "heimdall-trials.json");

export function appendTrialLog(row, file = CODING_TRIALS_LOG) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(row) + "\n");
}
export function readTrialLog(file = CODING_TRIALS_LOG) {
  try { return fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; }
}
/** True while a coding trial is open. heimdall.mjs reads this before starting
 *  one of its own; neither kind starts while the other runs. */
export function codingTrialActive(file = CODING_TRIAL_ACTIVE) {
  try { return !!JSON.parse(fs.readFileSync(file, "utf8"))?.trialId; } catch { return false; }
}
export function setCodingTrialActive(trial, file = CODING_TRIAL_ACTIVE) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (trial) fs.writeFileSync(file, JSON.stringify({ trialId: trial.trialId, openedAt: trial.openedAt, lever: trial.lever }));
  else { try { fs.unlinkSync(file); } catch { /* already closed */ } }
}
/** Heimdall's active trial, read from its own file (never by importing
 *  heimdall.mjs, whose load reverts settings as a side effect). */
export function heimdallTrialActive(file = HEIMDALL_TRIALS_FILE) {
  try { return !!JSON.parse(fs.readFileSync(file, "utf8"))?.active; } catch { return false; }
}
/** How many trials the current validate deal has judged (held or conceded;
 *  an abandoned trial still spent its look — it was opened). */
export function looksSpent(log = readTrialLog()) {
  return log.filter((r) => r.kind === "open").length;
}
