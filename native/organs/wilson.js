// native/organs/wilson.js — WILSON. Handle: Edward O. Wilson — the naturalist
// of eusociality and consilience: a colony's intelligence is not any one
// member's, it is the CASTES (division of labor, each specialized to one
// task) plus STIGMERGY (coordination through what each caste leaves on a
// shared record, never a command issued between them). What this organ
// composes is not one solver but a SWARM of them, and the swarm is named
// after what it is: THE HIVE.
//
// WHAT THIS IS. Wilson is the problem-solving organ: point it at a task
// (steering the Hive, the swarm of castes below) and it composes a
// Solution — steered by the EO cube (kernel/cube.js), the same
// operator·grain address every other organ in this codebase is typed
// against (THE-27-CELLS.md; capacities.js's own registry). Steering means
// the caller declares WHICH cell of the cube the search occupies (an
// operator and a grain — `wilsonSolve`'s `op`/`grain`), and the cell's own
// derived mode/domain/terrain/stance (cube.js::cellOf) shapes how the
// solution is framed, never chosen by Wilson itself.
//
// THREE CASTES, ONE SUPERORGANISM. A real eusocial colony is not one animal
// doing three things — it is three specialized castes, each unable to
// complete the colony's work alone, composed into one outcome no single
// caste could produce:
//
//   ethos  (organs/ethos.js)  — the GROUND caste. Whether the task may be
//                               undertaken at all; a colony that forages
//                               where its own charter forbids has no ground
//                               to stand a solution on.
//   logos  (organs/logos.js)  — the EXAMINING caste. Whether a conclusion
//                               drawn by composing evidence survives
//                               refutation; a colony that acts on an
//                               unexamined, contradicted signal is not
//                               reasoning, it is guessing with confidence.
//   pathos (organs/pathos.js) — the FELT-SHAPE caste, for a declared
//                               someone; a colony has no solution "for no
//                               one in particular" any more than a hive has
//                               a comb built for no bee.
//
// THIS IS NOT A GATE IN FRONT OF THE HIVE — IT IS THE ONLY WAY THE HIVE
// WORKS. A real colony cannot function with one caste subtracted — remove
// the workers and the queen starves, remove the queen and there is no
// colony to feed. The same is true here, by construction, not by
// convention: there is no code path that produces a valid Solution object
// without all three castes present, because the constructor
// (`assembleSolution` below) reads each caste's own bearing-wall function —
// `requireClearance` (ethos.js), `requireWarrant` (logos.js),
// `requireExperiencer` (experiencer.js, pathos.js's own dependency) — and
// each one THROWS on a missing or fabricated caste. Delete the ethos call:
// `clearance` is undefined, `requireClearance(undefined)` throws,
// `wilsonSolve` throws, there is no Solution. Delete the logos call: same
// shape, `requireWarrant`. Delete the pathos call: `pathosOf` itself calls
// `requireExperiencer` before it will return anything, so there is nothing
// to compose. A caller cannot hand-write a Solution shape either —
// `SOLUTION_SCHEMA` is checked, and each caste's schema tag is checked with
// it, in `requireSolution` below.
//
// STIGMERGY, NOT COMMAND. A real colony does not coordinate its castes by
// one member instructing the others — a forager does not tell the nurse
// what to do; each reads the SAME SHARED TRACE (a pheromone trail, a comb
// cell's fill level) and acts on what it finds there. This organ's own
// composition mirrors that discipline structurally: `wilsonSolve` never
// reaches INTO ethos.js, logos.js or pathos.js and mutates their state —
// it calls each caste once, on the SAME task and the same declared
// material, and reads back what that caste leaves (a clearance, a warrant,
// a felt shape), exactly the way this codebase's own standing rule already
// works for every other organ composed from an append-only record
// (CLAUDE.md: "the reality of the database should be the EOT event stream,
// the current state always projected"). The hive is the projection over
// three castes' independent traces, never a dispatcher barking orders at
// them.
//
// CONSILIENCE. Wilson's companion claim: real understanding comes from the
// JUMPING TOGETHER of independent lines of evidence, never from one
// discipline speaking alone. A Solution here is exactly that — three
// independently-earned legs (a ground that does not depend on what logos
// finds; a warrant that does not depend on who is asking; a felt shape
// that does not depend on whether the task clears the charter) composed
// into one outcome none of the three could certify by itself.
//
// STEERED BY THE EO CUBE. `wilsonSolve` takes `op`/`grain` (an operator and a
// grain, e.g. `"SYN"`/`"Pattern"`) and resolves the cell through cube.js's
// own `cellOf` — never a second, hand-rolled table. The resolved cell's
// `terrain`/`stance`/`mode`/`domain` ride the Solution as `steeredBy`, so a
// caller can see and audit which address in the 27-cell space produced this
// particular composition, and the engine — not Wilson — is what decides
// what that address means.

import { cellOf } from "../kernel/cube.js";
import { ethosClear, requireClearance } from "./ethos.js";
import { logosWarrant, requireWarrant } from "./logos.js";
import { pathosOf } from "./pathos.js";

export const HIVE = Object.freeze({
  handle: "Wilson",
  organ: "wilson",
  castes: ["ethos (ground)", "logos (warrant)", "pathos (felt shape, for a declared someone)"],
  steeredBy: "kernel/cube.js",
  law: "a solution is what three specialized castes leave on the record, composed — never one caste commanding the others, and never a caste any of the three could be subtracted from",
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
 * `edges`, `relation` — what the logos caste examines (refuteRelation's own
 *   inputs; `relation` is required by logos.js exactly as it is by
 *   refutation.js).
 * `text`, `experiencer` — what the pathos caste undergoes, and for whom
 *   (required by pathos.js's own wall; a solution "for no one in
 *   particular" is refused there before it ever reaches this organ).
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
    throw new TypeError("wilson: the task is declared, never inferred — a problem Wilson was not told about is not a problem the Hive can steer at");
  }
  if (!op || !grain) {
    throw new TypeError("wilson: op/grain are required — a solution steered at no declared cube cell is not steered, it is guessed");
  }

  // THE STEERING. The EO reader 7 engine's own cube resolves the cell; the
  // Wilson never picks a mode/domain/terrain/stance on its own.
  const cell = cellOf(op, grain);

  // CASTE 1 — ETHOS. The ground. No clearance, no solution: requireClearance
  // throws on anything that is not a real, run clearance — but a REAL
  // clearance can still honestly say `cleared: false` (the charter examined
  // the task and refused it), and requireClearance's own job is only to
  // confirm the clearance is genuine, never to re-decide its verdict. The
  // Wilson refuses to proceed on that verdict itself, exactly where ethos.js's
  // own callers (getSession) are expected to.
  //
  // FALSIFIED AND CLOSED (conformance/wilson-falsify.test.mjs): ethos.js's
  // own specRefusal reads ONLY the string it is handed — it has no notion
  // of "the declared task" vs "the actual material." The first cut of this
  // organ cleared `task` alone and let `text` (the pathos caste's own
  // material — the thing a felt shape is actually built FROM) ride straight
  // into a certified Solution unexamined: a benign task label ("summarize
  // this document") with harmful content living in `text` cleared cleanly.
  // A caller may declare a benign task for genuinely harmful material every
  // bit as easily as they could type a harmful task directly, so BOTH
  // strings a Solution is actually built from are cleared, independently —
  // clearing their concatenation would let one string's benign framing
  // launder the other's content past the charter's own shape-detection.
  const taskClearance = requireClearance(ethosClear(task, { disposition }));
  if (!taskClearance.cleared) {
    throw new Error(`wilson: refused by ethos (task) — ${taskClearance.reason}`);
  }
  let clearance = taskClearance;
  if (typeof text === "string" && text.trim()) {
    const textClearance = requireClearance(ethosClear(text, { disposition }));
    if (!textClearance.cleared) {
      throw new Error(`wilson: refused by ethos (material) — ${textClearance.reason}`);
    }
    // The solution's own recorded ethos leg is the STRICTER of the two —
    // requireSolution downstream re-validates whatever is stored here, and
    // storing only the task's clearance would let a caller who reads the
    // solution back believe the material itself was never examined.
    clearance = textClearance;
  }

  // CASTE 2 — LOGOS. The warrant. No warrant, no solution: requireWarrant
  // throws on anything that is not a real, run audit (and on a refuted one).
  const warrant = requireWarrant(logosWarrant({ edges, relation, expectUnique, cycleLimit, intervalOf }));

  // CASTE 3 — PATHOS. The felt shape, for a declared someone. pathosOf
  // itself calls requireExperiencer before it returns anything, so there is
  // no way to reach this line with an undeclared experiencer.
  const felt = pathosOf({ text, experiencer, state, fold, delta, beforeFold });

  return assembleSolution({ task, cell, clearance, warrant, felt });
}

// Separated from wilsonSolve so the assembly itself — "a Solution is what the
// three castes leave, composed" — is a named, independently testable
// function: a test can call assembleSolution directly with a caste's trace
// swapped for a forged object and watch requireSolution refuse it, without
// needing to reproduce wilsonSolve's whole call graph.
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
// all three castes' schema tags. A caller that receives a plain object
// shaped like a solution but missing (or forging) one caste's trace gets a
// thrown error naming which caste is missing — never a silent pass.
export function requireSolution(solution) {
  if (!solution || solution.schema !== SOLUTION_SCHEMA) {
    throw new Error("wilson: no valid solution — a problem is not solved by returning an object shaped like one");
  }
  // Each caste's trace is validated by REUSING that caste's own organ's
  // bearing wall, never a second, looser restatement of it here — the
  // identical discipline this codebase already holds for a received closed
  // class ("search for the organ before hand-rolling one"). A hand-written
  // ethos object that merely sets `cleared: true` without a real
  // charterSha256 fails requireClearance exactly as it would if handed
  // straight to ethos.js.
  try {
    requireClearance(solution.ethos);
  } catch (e) {
    throw new Error(`wilson: no valid ethos caste — ${e.message}`);
  }
  try {
    requireWarrant(solution.logos);
  } catch (e) {
    throw new Error(`wilson: no valid logos caste — ${e.message}`);
  }
  // requireWarrant only refuses a FORGED or REFUTED warrant — "insufficient"
  // is a real, honest warrant (refutation.js's own disclosed-gap posture,
  // P4: "gaps are results"), never a refusal. A solution needs more than an
  // honest gap to stand on, so the Wilson holds its own conclusion to a
  // stricter bar than the warrant organ holds itself to.
  if (solution.logos.warranted !== true) {
    throw new Error(`wilson: no valid logos caste — the relation "${solution.logos.relation}" was never warranted (${solution.logos.verdict})`);
  }
  if (!solution.pathos || solution.pathos.schema !== "EOPathosRead@1" || !solution.pathos.forWhom?.who) {
    throw new Error("wilson: no valid pathos caste — the solution has no felt shape for any declared someone");
  }
  return solution;
}
