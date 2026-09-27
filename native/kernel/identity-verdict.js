// native/kernel/identity-verdict.js — IDENTITY AS THE PATTERN, with exclusion
// as the disambiguating tool (2026-09-27). Medium-blind, kernel-level.
// Standing: nomination.
//
// User direction: "this is a tool for disambiguating identity, but identity
// itself is the pattern — of these trajectories." The archon review
// (nagarjuna, parmenides, kelsen) settled how the two organs compose:
//
//   FOR     identity-induction.js — the positive pattern: the universes folded
//           on the two referents match, their counterfactual consequences
//           align, their trajectories cross-predict (bound; contested
//           carries a for as well)
//   AGAINST identity-induction.js when it MEASURES a difference, and
//           identity-exclusion.js when a GIVEN one-valued relation conflicts
//           on witnessed assertions (contradicted). A candidate conflict, an
//           unwitnessed conflict or "no conflict found" is NOT against.
//
// The verdict is hl.js's own table (verdictOfSupport) — one lattice, never a
// second one here. beyond-reach absorbs only when neither side could ask.
// A bound (or contested) pair is handed back as an identity.js alternative
// with its support and attack references: a revisable hypothesis, conceded
// when further reading moves either side — never a settled fact.

import { BOUND, CONTRADICTED, CONTESTED, BEYOND_REACH, verdictOfSupport } from "../interpretation/hl.js";
import { identityAlternative } from "./identity.js";

export function identityVerdict(induction, exclusion, { giver = null } = {}) {
  if (!induction || !exclusion) throw new TypeError("identity-verdict: both the induction and the exclusion readings are required");
  if (induction.a !== exclusion.a || induction.b !== exclusion.b) throw new TypeError("identity-verdict: the two readings are about different pairs");
  const forS = induction.verdict === BOUND || induction.verdict === CONTESTED;
  const againstS = induction.verdict === CONTRADICTED || induction.verdict === CONTESTED || exclusion.verdict === CONTRADICTED;
  const verdict = induction.verdict === BEYOND_REACH && exclusion.verdict === BEYOND_REACH ? BEYOND_REACH : verdictOfSupport(forS, againstS);
  const supportRefs = forS ? [`induction:${induction.a}~${induction.b}@${induction.reason ?? "pattern"}`] : [];
  const attackRefs = [
    ...(exclusion.verdict === CONTRADICTED ? (exclusion.proof ?? []).flatMap((p) => [p.a?.id, p.b?.id].filter(Boolean)) : []),
    ...(induction.verdict === CONTRADICTED || induction.verdict === CONTESTED ? [`induction:${induction.reason}`] : []),
  ];
  const hypothesis = verdict === BOUND || verdict === CONTESTED
    ? identityAlternative({ left: String(induction.a), right: String(induction.b), standing: verdict === BOUND ? "live_hypothesis" : "contested_hypothesis", supportRefs, attackRefs, giver })
    : null;
  return Object.freeze({ a: induction.a, b: induction.b, verdict, for: forS, against: againstS, induction: { verdict: induction.verdict, reason: induction.reason ?? null }, exclusion: { verdict: exclusion.verdict, reason: exclusion.reason ?? null, raised: (exclusion.raised ?? []).length }, hypothesis });
}
