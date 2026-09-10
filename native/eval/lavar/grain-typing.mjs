// grain-typing.mjs — the connector-typing logic eot-jsonl.mjs's main pass
// uses, pulled into its own pure module so a SECOND caller (field-lens-
// boost.mjs) can type its own finds identically without importing
// eot-jsonl.mjs itself, which is a script with top-level side effects
// (argv parsing, file reads tied to its own CLI contract) — importing it
// as a module would run that script's own top-level body against
// whatever process.argv the CALLER happened to be invoked with.
//
// Pure factory: makeGrainTyper(posPrior) closes over one received POS
// prior (the caller's own choice — --lang=eng's pos-eng.json for
// eot-jsonl.mjs, the same file by default here) and returns {thraxOf,
// grainOf} bound to it. Nothing here decides WHICH prior; every caller
// states its own.
//
// GRAIN, NOT ERROR — the correction this typing exists to encode. A
// connector's settled part of speech types the observation's grain
// instead of gating its admission:
//   verb / participle  -> CON · Figure   (Link, Binding)   a discrete act
//   preposition        -> CON · Ground   (Field, Tending)  a state, a co-presence
//   conjunction        -> SEG · Figure   (Link, Dissecting) a distinction drawn
//   anything else, or unsettled -> grain gap, kept, never discarded
import { classifyWord, dominantClass } from "../../adapters/text/wordclass.js";
import * as cube from "../../kernel/cube.js";

const GRAMMAR_MIN_SHARE = 0.5; // the production sidecar recipe's own value, matched not chosen

export const GRAIN_BY_THRAX = Object.freeze({
  verb: { op: "CON", grain: "Figure" },
  participle: { op: "CON", grain: "Figure" },
  preposition: { op: "CON", grain: "Ground" },
  conjunction: { op: "SEG", grain: "Figure" },
});

export function makeGrainTyper(posPrior) {
  const thraxOf = (label) => {
    const head = String(label ?? "").trim().split(/\s+/).pop()?.toLowerCase();
    if (!head) return null;
    return dominantClass(classifyWord(head, { posPrior }), { minShare: GRAMMAR_MIN_SHARE })?.thraxClass ?? null;
  };
  const grainOf = (label) => {
    const thrax = thraxOf(label);
    const spec = thrax ? GRAIN_BY_THRAX[thrax] : null;
    if (!spec) {
      if (thrax) return { refused: true, settledAs: thrax };
      return {
        grain_gap: `connector does not settle in the received prior (Universal Dependencies has no Thrax-tradition category for it, e.g. the infinitive marker "to" is PART) — kept, not discarded`,
        settledAs: null,
      };
    }
    const cell = cube.cellOf(spec.op, spec.grain);
    return { operator: spec.op, grain: spec.grain, terrain: cell.terrain, stance: cell.stance, settledAs: thrax };
  };
  return { thraxOf, grainOf };
}
