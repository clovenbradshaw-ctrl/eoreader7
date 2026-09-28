// Handle: Deming — plan, do, check, act: the frame is changed only by what the
// check found, one step at a time, and the check is never the thing changed.
//
// coding-policy.js — the DEF of the coding-policy learner. The model is the
// mouth and is never trained; what learns is the POLICY around it, and this
// file declares what a policy is, which of its levers a learner may move and
// how far, which tasks each stage may look at, and the closed vocabulary a
// failed draw is typed with. Nothing here draws, scores or judges: the trial
// (coding-policy-trial.js) is the EVA and the driver
// (eval/coding-policy-learn.mjs) is the REC.
//
// Grounded in the archon poll of 2026-09-27 (six panels, recorded in
// CODING-LESSONS.md): the learner moves sampler levers only; mouth-facing
// wording, specs, cases and anything that shows a held-out case stay outside
// its reach (Gary's door, lessons 24 and 56.7); a task's split follows its
// specHash so no task sits on two sides (the monitor's row-parity split
// leaked, code-draw-monitor.js); and every row a policy produces carries the
// policy's content hash, so a change can always be attributed and reverted.

import { createHash } from "node:crypto";

export const CODING_POLICY_SCHEMA = "CodingPolicy@1";

/** The levers a learner may move, each with its closed value ladder. A step
 *  moves one lever to the neighbouring rung and nothing else. `arm` is not a
 *  lever: the ladder's arms differ in more than one way (prompt shape,
 *  extraction, repair), so switching arms would change several things at
 *  once and no trial could say which one mattered. */
export const POLICY_LEVERS = Object.freeze({
  k: Object.freeze({ values: Object.freeze([1, 3, 5]), arms: Object.freeze(["bok"]), what: "candidates drawn per task, picked on the visible cases" }),
  temperature: Object.freeze({ values: Object.freeze([0.4, 0.8, 1.0]), arms: Object.freeze(["bok", "samp1"]), what: "sampling temperature of the drawn candidates" }),
  rounds: Object.freeze({ values: Object.freeze([1, 2, 3]), arms: Object.freeze(["rec2"]), what: "repair rounds after the first draw" }),
});

/** Levers a learner may never move, with the reason on record. Changing any
 *  of these is a Ground-grain REC: proposed, signed by a person, never run. */
export const FORBIDDEN_LEVERS = Object.freeze({
  prompt: "mouth-facing wording: only Gary's door test may admit it (gary-doors.test.js pins four surfaces; askFor/repairFor are not among them)",
  spec: "editing a spec in response to the model tunes the test to the model (lesson 56.7); a spec gap is a task bug (lesson 24)",
  cases: "the held-out cases are the record; they judge and never enter a prompt",
  visible: "which cases are shown is part of the task contract, not the policy",
  replay: "replay is memory: it is reported as coverage and never trialled as skill",
  model: "the mouth is chosen by measurement on the box (lesson 6), not by this learner",
});

/** The policy every learner starts from. `arm` names the ladder arm the
 *  policy runs through; the other fields are that arm's levers. */
export const INCUMBENT_POLICY = Object.freeze({ schema: CODING_POLICY_SCHEMA, arm: "bok", k: 1, temperature: 0.8, rounds: 1 });

const canonical = (policy) => JSON.stringify(Object.keys(policy).sort().reduce((o, k) => ({ ...o, [k]: policy[k] }), {}));

/** The policy's content hash. Two policies with the same fields share a
 *  version; any field change is a new version. */
export function policyVersion(policy) {
  return createHash("sha1").update(canonical(policy)).digest("hex").slice(0, 12);
}

/** The fields on which two policies differ. A trial is admissible only when
 *  this is exactly one lever (Alhazen: declare the frame, and let the one
 *  thing under test be the only difference). */
export function leverDiff(a, b) {
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  return [...keys].filter((k) => JSON.stringify(a?.[k]) !== JSON.stringify(b?.[k])).sort();
}

/** Move one lever one rung. Returns { ok: true, policy } or a typed refusal:
 *  forbidden_lever, unknown_lever, lever_not_on_arm, off_ladder, at_wall. */
export function stepLever(policy, lever, dir) {
  if (FORBIDDEN_LEVERS[lever]) return { ok: false, refusal: "forbidden_lever", lever, reason: FORBIDDEN_LEVERS[lever] };
  const spec = POLICY_LEVERS[lever];
  if (!spec) return { ok: false, refusal: "unknown_lever", lever };
  if (!spec.arms.includes(policy.arm)) return { ok: false, refusal: "lever_not_on_arm", lever, arm: policy.arm };
  const i = spec.values.indexOf(policy[lever]);
  if (i < 0) return { ok: false, refusal: "off_ladder", lever, value: policy[lever] };
  const j = i + (dir > 0 ? 1 : -1);
  if (j < 0 || j >= spec.values.length) return { ok: false, refusal: "at_wall", lever, value: policy[lever] };
  return { ok: true, policy: Object.freeze({ ...policy, [lever]: spec.values[j] }) };
}

/** The declared split salt. Changing it re-deals every task and voids every
 *  trial judged under the old deal, so it is a Ground-grain change. */
export const SPLIT_SALT = "coding-policy-split@1";
export const SPLITS = Object.freeze(["propose", "validate", "sealed"]);

/** Which stage may look at a task, fixed by its specHash: `propose` feeds the
 *  learner's lever choice, `validate` judges trials, `sealed` is reported and
 *  never decides anything. A reworded spec gets a new hash and is re-dealt. */
export function splitOf(specHash) {
  const h = parseInt(createHash("sha1").update(`${SPLIT_SALT}|${specHash}`).digest("hex").slice(0, 8), 16);
  return SPLITS[h % SPLITS.length];
}

/** The closed failure vocabulary, computed mechanically from a scored draw
 *  (lang-competency.js scoreDraw) and the task's visible indices. A
 *  diagnostic only: a trial's objective is the held-out pass, never a
 *  signature count (a lever can move failures between classes without making
 *  anything pass — the worked example moved unlocated into example-echo). */
export const FAILURE_SIGNATURES = Object.freeze(["pass", "no_code", "floor", "call_failed", "crash", "visible_wrong", "heldout_wrong"]);

export function failureSignature({ source = "", score = null, visible = [0, 1] } = {}) {
  if (!String(source).trim()) return "no_code";
  if (!score || score.unchecked) return "call_failed";
  if (!score.floorOk) return "floor";
  if (!Array.isArray(score.got)) return "call_failed";
  const cases = score.cases ?? [];
  if (score.got.some((g) => g && typeof g === "object" && !Array.isArray(g) && "__error" in g)) return "crash";
  if (visible.some((i) => !cases[i])) return "visible_wrong";
  if (cases.some((ok) => !ok)) return "heldout_wrong";
  return "pass";
}
