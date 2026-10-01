// ═══ LOVELACE · TEACH IT TO FISH ═══ NAGARJUNA'S FOUR CORNERS, APPLIED TO ONE DRAW.
//
// A void is a real epistemic state, not an absence (organs/nagarjuna.js). The hole the model is asked to fill is defined by the examples it is
// SHOWN; one draw is then read against that definition and lands in exactly one of hl.js's own positions — never a fifth word, never "pass/fail":
//
//   bound         the draw reproduces every example the void showed            -> stands, and is disclosed as checked against THOSE examples only
//   contradicted  it runs, and at least one shown example is not reproduced    -> wrong on the evidence the prompt itself carried: caught with no oracle
//   unbound       the void showed no example, so there is nothing to bind to   -> ships disclosed UNVERIFIED, never as a pass
//   beyond-reach  it does not parse, or throws on every shown example          -> cannot be read at all: a typed gap
//   (contested    is two draws that disagree; one draw cannot be it, and this module does not pretend otherwise)
//
// The number that says whether one draw can be trusted is the FALSE-BOUND rate: draws that reproduce every example they were shown and are still
// wrong on the examples they were not. contradicted and beyond-reach are failures the system SEES; a false bound is the failure it does not.
import { BOUND, CONTRADICTED, UNBOUND, BEYOND_REACH } from "../interpretation/hl.js";

export const STATES = Object.freeze({ BOUND, CONTRADICTED, UNBOUND, BEYOND_REACH });

/** per-run results of one draw -> its position on the lattice. `results` is one boolean per example run, in order; `null` means the draw could not be read at all. */
export function drawState(results, shown) {
  if (shown <= 0) return UNBOUND;
  if (results === null) return BEYOND_REACH;
  const seen = results.slice(0, shown);
  if (seen.length === 0) return UNBOUND;
  if (seen.every((x) => x === "threw")) return BEYOND_REACH;
  return seen.every((x) => x === true) ? BOUND : CONTRADICTED;
}

/** the table a status line prints: how many draws sit at each position, and how many of the BOUND ones are wrong beyond what they were shown */
export function tally(draws) {
  const out = { [BOUND]: 0, [CONTRADICTED]: 0, [UNBOUND]: 0, [BEYOND_REACH]: 0, falseBound: 0, boundRight: 0, n: draws.length };
  for (const d of draws) {
    out[d.state]++;
    if (d.state === BOUND) { if (d.rightBeyondShown) out.boundRight++; else out.falseBound++; }
  }
  return out;
}
