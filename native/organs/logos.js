// native/organs/logos.js — THE ACCOUNT. Handle: Aristotle — the syllogist who
// gave reasoning its own criterion of soundness, apart from who states it or
// how it lands.
//
// LOGOS COMES AFTER ETHOS, ALONGSIDE PATHOS. Ethos (organs/ethos.js) is the
// ground a session is built on; pathos (organs/pathos.js) is the felt shape a
// reading undergoes, for a declared someone. Logos is the third leg: whether
// a step of reasoning SURVIVES EXAMINATION, never merely whether it is stated
// with confidence. It composes ONE existing organ — kernel/refutation.js's
// `refuteRelation` — into a WARRANT, and it is not a check that sits in front
// of a conclusion and can be lifted: a caller that never calls `logosWarrant`
// has no warrant to compose into its result, exactly as a caller that never
// calls `ethosClear` has no clearance and exactly as a caller that never
// calls `pathosOf` has no felt shape. Pull it and what depends on it has a
// hole where a required field used to be, not a `true` where a check used to
// run.
//
// WHAT A WARRANT IS. A conclusion drawn by composing edges (P60's chemistry,
// this repo's own standing law: composition licenses, refutation vetoes) is
// warranted only if kernel/refutation.js's own refuteRelation finds it
// UNREFUTED — no cycle, no unexcused uniqueness violation — over the material
// actually offered. A warrant with zero edges examined is not silently
// "clean"; it is typed `insufficient` (refutation.js's own posture: a scan
// below two resolved edges reports insufficient power, never "unrefuted").
// logosWarrant never invents evidence refuteRelation did not find, and it
// never phrases `insufficient` as though it were `unrefuted` — the same
// withhold-vs-convict wall the rest of this codebase already holds.

import { refuteRelation } from "../kernel/refutation.js";

export const LOGOS = Object.freeze({
  handle: "Aristotle",
  organ: "logos",
  composes: ["kernel/refutation.js (refuteRelation)"],
  law: "a conclusion is warranted only if it survives examination, never merely because it was stated",
});

export const LOGOS_VERDICTS = Object.freeze(["unrefuted", "refuted", "insufficient"]);

/**
 * logosWarrant({ edges, relation, expectUnique, cycleLimit, intervalOf })
 *   → LogosWarrant@1
 *
 * The relation to examine is DECLARED, never inferred — mirrors
 * refuteRelation's own wall (a caller that omits `relation` gets a
 * TypeError from the organ underneath, not a silent no-op).
 */
export function logosWarrant({ edges = [], relation, expectUnique = false, cycleLimit = 3, intervalOf = null } = {}) {
  // refuteRelation's own real return shape (EORelationRefutation@1): power
  // ("sufficient"/"insufficient", its own declared verdict on whether it had
  // enough resolved material to speak at all), uniqueness.violations,
  // cycles.present/.examples, refuted — read as-is, never reconstructed from
  // a guessed shape, per this codebase's own rule against a second,
  // drifting restatement of an organ's output.
  const audit = refuteRelation(edges, relation, { expectUnique, cycleLimit, intervalOf });
  const violations = audit.uniqueness?.violations ?? [];
  const cycleExamples = audit.cycles?.examples ?? [];
  const verdict = audit.power === "insufficient" ? "insufficient" : audit.refuted ? "refuted" : "unrefuted";
  return Object.freeze({
    schema: "LogosWarrant@1",
    relation,
    verdict,
    warranted: verdict === "unrefuted",
    examined: audit.examined ?? 0,
    power: audit.power ?? null,
    violations: Object.freeze(violations),
    cycles: Object.freeze(cycleExamples),
    excused: Object.freeze(audit.uniqueness?.excused ?? []),
    voidCandidates: Object.freeze(audit.voidCandidates ?? []),
    at: Date.now(),
  });
}

// ── THE BEARING WALL: a conclusion validates its warrant ────────────────────
// Mirrors ethos.js::requireClearance and experiencer.js::requireExperiencer
// exactly: a plain object that merely LOOKS like a warrant (a bare
// `{warranted: true}` a caller wrote by hand instead of composing this
// organ) is refused — the schema tag and verdict must be real, and the
// verdict must actually be a member of LOGOS_VERDICTS, because a caller
// that fabricates its own verdict string has not run the audit at all.
export function requireWarrant(warrant) {
  if (!warrant || warrant.schema !== "LogosWarrant@1" || !LOGOS_VERDICTS.includes(warrant.verdict)) {
    throw new Error(
      "logos: no valid warrant — a conclusion cannot be composed without one, and a hand-written " +
      "object cannot stand in for it. Logos is not a gate that sits in front of the answer; it is " +
      "how a step of reasoning is examined before it is allowed to be a step at all.",
    );
  }
  if (warrant.verdict === "refuted") {
    throw new Error(
      `logos: the relation "${warrant.relation}" was examined and REFUTED (${warrant.violations.length} violation(s), ` +
      `${warrant.cycles.length} cycle(s)) — a refuted conclusion cannot be composed further.`,
    );
  }
  return warrant;
}
