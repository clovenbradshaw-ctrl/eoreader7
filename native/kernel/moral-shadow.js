// native/kernel/moral-shadow.js — the shadow trail. Handle: Bourdieu —
// habitus, the dispositions a history of acts compiles, always a frequency,
// never a fixed state.
//
// WHY THIS EXISTS (THE-MORAL-CORE.md, committed): "Every generation leaves a
// shadow keyed to the core." A generation composed under the charter's license
// leaves a `norm_compliant` shadow; one that would have required a prohibited
// act leaves a `norm_conflict` shadow (the void it opened); one that merely
// DESCRIBES a violation leaves a `descriptive` shadow. THREE TRAILS, NEVER
// MERGED — a description of torture and an endorsement of torture share
// surface words but leave different shadows. "The core then audits the
// system's OWN history" — a stream whose `norm_conflict` shadows accumulate is
// a measured regression.
//
// AND THE HELIX'S OWN LAW (committed): "cells classify moves, never persons";
// "a person uses postconventional reasoning at a RATE, never IS
// postconventional"; "a single moral act is a lucky act; corroboration
// (SYN·Figure) is what earns the rung." So this organ records MOVES, and its
// assessment is a FREQUENCY over the accumulated acts, corroborated across
// independent acts — never a verdict about a person, never a binary.
//
// THE RE-KEY (2026-09-16, from the critique — the shadow as heteronomy): the
// trail is keyed to the ACTOR whose acts are recorded — the machine's OWN
// moves under the charter — and a person enters only as the SUBJECT of a move
// (what the machine did with or for them), never as the bearer of a standing.
// A per-person RATE of norm-compliance would be heteronomy: it would make a
// person's worth an object of empirical reckoning. The assessment is over the
// actor's own act-trail; the `subject` field is what the move concerned, and
// a person may strike any row that names them.
//
// Append-only, on disk, keyed to the actor. Turning it off would require not
// recording the acts; the record is the memory.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Read lazily (not at import) so a caller — a test, a deployment — can point
// the trail at its own directory without re-importing the module.
const shadowDir = () => process.env.ER7_SHADOW_DIR ?? path.join(HERE, "..", "moral-shadows");

// The three shadows, never merged (THE-MORAL-CORE.md) — plus the fourth
// (2026-09-19, mayeroff.js): `unrealizable`, which never merges with
// `norm_conflict` either. A norm_conflict is a live option declined (the
// charter refused the license); an unrealizable never had a state to reach
// (the composition fails to typecheck against self.js at all). Different
// facts, different trails.
export const SHADOWS = Object.freeze(["norm_compliant", "norm_conflict", "descriptive", "unrealizable"]);

const safeId = (p) => String(p ?? "anonymous").replace(/[^a-z0-9._-]/gi, "_").slice(0, 120);

function trailFile(actorId) {
  return path.join(shadowDir(), `${safeId(actorId)}.jsonl`);
}

/**
 * recordShadow(actorId, entry) — append one act's norm-standing to the
 * ACTOR's trail (the machine's own move under the charter). `entry`:
 * { shadow, cell?, operator?, reason?, task?, giver?, subject? }. `subject`,
 * when present, is the person the move concerned — never the bearer of the
 * standing. One line, append-only, never edited. Never throws into a turn.
 */
export function recordShadow(actorId, entry = {}) {
  const shadow = SHADOWS.includes(entry.shadow) ? entry.shadow : "norm_compliant";
  const line = {
    at: new Date().toISOString(),
    shadow,
    cell: entry.cell ?? null,
    operator: entry.operator ?? null,
    reason: entry.reason ?? null,
    task: String(entry.task ?? "").slice(0, 240),
    giver: entry.giver ?? "reader:eoreader7-proxy",
    subject: entry.subject ?? null,
  };
  try {
    fs.mkdirSync(shadowDir(), { recursive: true });
    fs.appendFileSync(trailFile(actorId), JSON.stringify(line) + "\n", "utf8");
  } catch { /* the trail must never block a turn */ }
  return line;
}

/** trailOf(actorId) — the accumulated acts, in order. */
export function trailOf(actorId) {
  try {
    return fs.readFileSync(trailFile(actorId), "utf8").trim().split("\n").filter(Boolean)
      .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

/**
 * assessShadow(actorId) — the RATE over the ACTOR's own accumulated acts,
 * never a verdict about a person. The actor is the machine's conduct under
 * the charter; a person named as a move's subject is never the bearer of a
 * standing.
 *
 * THE DECAY (the runaway fix; THE-MORAL-HELIX.md: "a regression returns a rung
 * to checked", "a single clean text is a lucky text"). Conflict weight is
 * recency-weighted: a norm_conflict N acts ago contributes 0.5^(N/halfLife), so
 * a stretch of norm_compliant acts decays the standing back down and the actor
 * RECOVERS — the ledger keeps every act, but the ASSESSMENT is of the recent
 * pattern.
 *
 * The threshold is not hand-picked: `weight > 1.0` is the single-act boundary —
 * one fresh conflict is EXACTLY 1.0 and can never corroborate (a single act is
 * a lucky act); anything strictly more than one act's worth is a corroborated
 * pattern (two conflicts within the half-life exceed it). `halfLife` is the
 * declared recency horizon (acts), configurable, NOT tuned against a golden —
 * a proper null-derived calibration is named future work, per this codebase's
 * own rule (REC-TRIGGER-CALIBRATION-BRIEF.md).
 */
export function assessShadow(actorId, { corroborationFloor = 2, halfLife = Number(process.env.ER7_SHADOW_HALF_LIFE ?? 10) } = {}) {
  const trail = trailOf(actorId);
  const n = trail.length;
  const byShadow = { norm_compliant: 0, norm_conflict: 0, descriptive: 0, unrealizable: 0 };
  for (const e of trail) if (byShadow[e.shadow] != null) byShadow[e.shadow] += 1;

  const H = Math.max(1, halfLife);
  let conflictWeight = 0;
  for (let i = 0; i < n; i++) {
    if (trail[i].shadow === "norm_conflict") conflictWeight += Math.pow(0.5, (n - 1 - i) / H);
  }
  // unrealizable never corroborates a conflict pattern: there was no live
  // option declined, so there is no second witness to supply. It is counted,
  // never weighted.
  conflictWeight = Number(conflictWeight.toFixed(3));
  const rate = n ? byShadow.norm_conflict / n : 0;

  let standing;
  let basis;
  if (n < corroborationFloor) {
    standing = "insufficient-history";
    basis = `${n} recorded act(s) — below the corroboration floor (${corroborationFloor}); a single act is a lucky act`;
  } else if (conflictWeight > 1.0) {
    standing = "repeated-conflict";
    basis = `decayed conflict weight ${conflictWeight} > 1.0 over ${n} acts — strictly more than one act's worth, a corroborated pattern in the actor's OWN acts (a rate over moves, never a verdict about a person)`;
  } else if (conflictWeight > 0) {
    standing = "conflict-seen";
    basis = `decayed conflict weight ${conflictWeight} over ${n} acts — one act's worth or less; seen, not corroborated (recovers after ~${H} clean acts)`;
  } else {
    standing = "norm-consistent-so-far";
    basis = `0 norm-conflict acts across ${n} of the actor's own acts`;
  }
  if (byShadow.unrealizable > 0) {
    basis += `; ${byShadow.unrealizable} unrealizable act(s) — no state to reach under self.js, never a declined option, never corroborating`;
  }
  return {
    schema: "MoralShadowAssessment@1",
    actorId: safeId(actorId),
    // the legacy field name, kept so a caller that read the pre-re-key shape
    // still resolves — a correction is an addition, never a silent rewrite
    personId: safeId(actorId),
    subject: "the machine's own acts under the charter — a rate over moves, never a verdict about a person",
    total: n, byShadow, conflictWeight, halfLife: H, conflictRate: Number(rate.toFixed(3)), standing, corroborationFloor, basis,
    unrealizable: byShadow.unrealizable,
  };
}

/**
 * dispositionFrom(assessment) — how the accumulation CONDITIONS the next
 * assessment (the sequential-monitor mechanism the decomposition literature
 * calls for). The accumulated pattern is the corroborating signal a single
 * request cannot supply:
 *   repeated-conflict → a single dual-use capability now suffices to refuse
 *     (the pattern is the second, independent witness);
 *   otherwise → the ordinary bar (a capability must be corroborated).
 * It never convicts on the history alone: the standing only LOWERS the bar for
 * a real signal in THIS act.
 */
export function dispositionFrom(assessment) {
  const corroborated = assessment?.standing === "repeated-conflict";
  return { corroborated, requiresCorroboration: !corroborated, standing: assessment?.standing ?? "unknown", basis: corroborated ? "the accumulated pattern supplies the second witness; a single capability-signal in this act now suffices" : "ordinary bar — a capability needs a corroborating signal in this act" };
}
