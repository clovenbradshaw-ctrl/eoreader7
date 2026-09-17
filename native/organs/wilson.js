// native/organs/wilson.js — THE SOLVER. Handle: Wilson — after E. O. Wilson,
// the consilience naturalist: a problem is solved by bringing independent
// lines of evidence to bear on it together, never by one alone.
//
// WHAT THIS IS. Wilson is the problem-solving organ: point it at a task and
// it composes a Solution — steered by the EO cube (kernel/cube.js), the
// same operator·grain address every other organ in this codebase is typed
// against (THE-27-CELLS.md; capacities.js's own registry). Steering means
// the caller declares WHICH cell of the cube the search occupies (an
// operator and a grain — `wilsonSolve`'s `op`/`grain`), and the cell's own
// derived mode/domain/terrain/stance (cube.js::cellOf) shapes how the
// solution is framed, never chosen by Wilson itself.
//
// THIS IS NOT A GATE IN FRONT OF THE SOLVER — IT IS THE ONLY WAY THE SOLVER
// WORKS. Ethos, logos and pathos are not three checks a Solution passes
// through and could be built without; a Solution IS the three of them,
// composed. There is no code path that constructs a valid Solution object
// without all three legs present, because the constructor (`assembleSolution`
// below) reads each leg's own bearing-wall function — `requireClearance`
// (ethos.js), `requireWarrant` (logos.js), `requireExperiencer`
// (experiencer.js, pathos.js's own dependency) — and each one THROWS on a
// missing or fabricated leg. Delete the ethos call: `clearance` is undefined,
// `requireClearance(undefined)` throws, `wilsonSolve` throws, there is no
// Solution. Delete the logos call: same shape, `requireWarrant`. Delete the
// pathos call: `pathosOf` itself calls `requireExperiencer` before it will
// return anything, so there is nothing to compose. A caller cannot hand-
// write a Solution shape either — `SOLUTION_SCHEMA` is checked, and each
// leg's schema tag is checked with it, in `requireSolution` below, which is
// how a DOWNSTREAM caller (steered by the EO cube, or anything else) can
// depend on a Solution having actually been built this way rather than
// forged. This is the ethos.js pattern (a bearing wall, not a governor that
// can be turned off) generalized to all three legs at once, because a
// problem "solved" without a stated ground (ethos), without an examined
// warrant for what it concludes (logos), or without a declared someone it is
// for (pathos) is not solved — it is merely asserted.
//
// STEERED BY THE EO CUBE. `wilsonSolve` takes `op`/`grain` (an operator and a
// grain, e.g. `"SYN"`/`"Pattern"`) and resolves the cell through cube.js's
// own `cellOf` — never a second, hand-rolled table. The resolved cell's
// `terrain`/`stance`/`mode`/`domain` ride the Solution as `steeredBy`, so a
// caller can see and audit which address in the 27-cell space produced this
// particular composition, and the engine — not Wilson — is what decides what
// that address means.

import { cellOf } from "../kernel/cube.js";
import { ethosClear, requireClearance } from "./ethos.js";
import { logosWarrant, requireWarrant } from "./logos.js";
import { pathosOf } from "./pathos.js";

export const WILSON = Object.freeze({
  handle: "Wilson",
  organ: "wilson",
  composes: ["ethos (ground)", "logos (warrant)", "pathos (felt shape, for a declared someone)", "kernel/cube.js (steering)"],
  law: "a solution is the composition of a ground, an examined warrant, and a felt shape for someone — never one alone, and never a gate any of the three could be lifted from",
});

export const SOLUTION_SCHEMA = "WilsonSolution@1";

/**
 * wilsonSolve({ task, op, grain, edges, relation, text, experiencer,
 *   expectUnique, cycleLimit, intervalOf, disposition, state, fold, delta,
 *   beforeFold }) → WilsonSolution@1
 *
 * `task` — the problem, in the caller's own words (handed to ethos, exactly
 *   as any other clearance-seeking act is).
 * `op`, `grain` — the EO-cube address this search is steered to occupy
 *   (kernel/cube.js's own operator·grain pair; REQUIRED — there is no
 *   default cell, because a problem "solved" at no declared address is not
 *   steered, it is guessed).
 * `edges`, `relation` — what logos examines (refuteRelation's own inputs;
 *   `relation` is required by logos.js exactly as it is by refutation.js).
 * `text`, `experiencer` — what pathos undergoes, and for whom (required by
 *   pathos.js's own wall; a solution "for no one in particular" is refused
 *   there before it ever reaches this organ).
 */
export function wilsonSolve({
  task,
  op,
  grain,
  edges = [],
  relation,
  text,
  experiencer,
  expectUnique = false,
  cycleLimit = 3,
  intervalOf = null,
  disposition = null,
  state = {},
  fold = null,
  delta = null,
  beforeFold = null,
} = {}) {
  if (typeof task !== "string" || !task.trim()) {
    throw new TypeError("wilson: the task is declared, never inferred — a problem Wilson was not told about is not a problem Wilson can steer at");
  }
  if (!op || !grain) {
    throw new TypeError("wilson: op/grain are required — a solution steered at no declared cube cell is not steered, it is guessed");
  }

  // THE STEERING. The EO reader 7 engine's own cube resolves the cell; Wilson
  // never picks a mode/domain/terrain/stance on its own.
  const cell = cellOf(op, grain);

  // LEG 1 — ETHOS. The ground. No clearance, no solution: requireClearance
  // throws on anything that is not a real, run clearance — but a REAL
  // clearance can still honestly say `cleared: false` (the charter examined
  // the task and refused it), and requireClearance's own job is only to
  // confirm the clearance is genuine, never to re-decide its verdict. Wilson
  // refuses to proceed on that verdict itself, exactly where ethos.js's own
  // callers (getSession) are expected to.
  const clearance = requireClearance(ethosClear(task, { disposition }));
  if (!clearance.cleared) {
    throw new Error(`wilson: refused by ethos — ${clearance.reason}`);
  }

  // LEG 2 — LOGOS. The warrant. No warrant, no solution: requireWarrant
  // throws on anything that is not a real, run audit (and on a refuted one).
  const warrant = requireWarrant(logosWarrant({ edges, relation, expectUnique, cycleLimit, intervalOf }));

  // LEG 3 — PATHOS. The felt shape, for a declared someone. pathosOf itself
  // calls requireExperiencer before it returns anything, so there is no way
  // to reach this line with an undeclared experiencer.
  const felt = pathosOf({ text, experiencer, state, fold, delta, beforeFold });

  return assembleSolution({ task, cell, clearance, warrant, felt });
}

// Separated from wilsonSolve so the assembly itself — "a Solution IS the
// three legs, composed" — is a named, independently testable function: a
// test can call assembleSolution directly with a leg swapped for a forged
// object and watch requireSolution refuse it, without needing to reproduce
// wilsonSolve's whole call graph.
function assembleSolution({ task, cell, clearance, warrant, felt }) {
  return Object.freeze({
    schema: SOLUTION_SCHEMA,
    task,
    steeredBy: Object.freeze({ op: cell.op, grain: cell.grain, mode: cell.mode, domain: cell.domain, terrain: cell.terrain, stance: cell.stance }),
    ethos: clearance,
    logos: warrant,
    pathos: felt,
    at: Date.now(),
  });
}

// ── THE BEARING WALL: a downstream caller validates the whole solution ──────
// Mirrors requireClearance/requireWarrant/requireExperiencer exactly, one
// level up: refuses anything that is not a real WilsonSolution@1 carrying
// all three of ITS OWN legs' schema tags. A caller that receives a plain
// object shaped like a solution but missing (or forging) one leg gets a
// thrown error naming which leg is missing — never a silent pass.
export function requireSolution(solution) {
  if (!solution || solution.schema !== SOLUTION_SCHEMA) {
    throw new Error("wilson: no valid solution — a problem is not solved by returning an object shaped like one");
  }
  // Each leg is validated by REUSING its own organ's bearing wall, never a
  // second, looser restatement of it here — the identical discipline this
  // codebase already holds for a received closed class ("search for the
  // organ before hand-rolling one"). A hand-written ethos object that merely
  // sets `cleared: true` without a real charterSha256 fails requireClearance
  // exactly as it would if handed straight to ethos.js.
  try {
    requireClearance(solution.ethos);
  } catch (e) {
    throw new Error(`wilson: no valid ethos leg — ${e.message}`);
  }
  try {
    requireWarrant(solution.logos);
  } catch (e) {
    throw new Error(`wilson: no valid logos leg — ${e.message}`);
  }
  // requireWarrant only refuses a FORGED or REFUTED warrant — "insufficient"
  // is a real, honest warrant (refutation.js's own disclosed-gap posture,
  // P4: "gaps are results"), never a refusal. A solution needs more than an
  // honest gap to stand on, so Wilson holds its own conclusion to a
  // stricter bar than the warrant organ holds itself to.
  if (solution.logos.warranted !== true) {
    throw new Error(`wilson: no valid logos leg — the relation "${solution.logos.relation}" was never warranted (${solution.logos.verdict})`);
  }
  if (!solution.pathos || solution.pathos.schema !== "EOPathosRead@1" || !solution.pathos.forWhom?.who) {
    throw new Error("wilson: no valid pathos leg — the solution has no felt shape for any declared someone");
  }
  return solution;
}
