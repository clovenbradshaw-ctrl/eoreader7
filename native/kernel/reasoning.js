import { cubeAddresses } from "./interrogation.js";
import { stanceMathematicalContract } from "./stance-math.js";

const freeze = (value) => Object.freeze(value);
const MODE_MOVE = Object.freeze({
  Differentiate: "distinguish",
  Relate: "relate",
  Generate: "generate",
});

const refs = (entries = []) => freeze([...new Set(entries.map((entry) => entry?.id).filter(Boolean))]);
const validLimit = (limit) => {
  if (!Number.isInteger(limit) || limit < 0) throw new TypeError("limit must be a non-negative integer");
  return limit;
};

function experienceSupport(address, priors = []) {
  const contributions = [];
  for (const prior of priors ?? []) {
    if (prior?.schema !== "EOExperiencePrior@1") continue;
    const terrain = (prior.terrainExpectations ?? []).find((item) => item.terrain === address.terrain);
    const stance = (prior.stanceExpectations ?? []).find((item) => item.stance === address.stance);
    const operator = (prior.operatorExpectations ?? []).find((item) => item.operator === address.op);
    const rates = [terrain?.workRate, stance?.workRate, operator?.workRate].filter(Number.isFinite);
    if (!rates.length) continue;
    contributions.push(freeze({
      priorRef: prior.id,
      sourceCount: prior.sourceCount ?? 0,
      terrainRate: terrain?.workRate ?? null,
      stanceRate: stance?.workRate ?? null,
      operatorRate: operator?.workRate ?? null,
      // A weak orientation weight, not a probability and never a gate. The
      // arithmetic mean is deliberately transparent: every face contributes
      // equally where the prior actually has a measurement.
      score: rates.reduce((sum, value) => sum + value, 0) / rates.length,
    }));
  }
  if (!contributions.length) return null;
  const weightedNumerator = contributions.reduce((sum, item) => sum + item.score * Math.max(1, item.sourceCount), 0);
  const weightedDenominator = contributions.reduce((sum, item) => sum + Math.max(1, item.sourceCount), 0);
  return freeze({
    schema: "EOExperienceReasoningWeight@1",
    score: weightedNumerator / weightedDenominator,
    standing: "defeasible_orientation_weight",
    witnessed: false,
    gatesMove: false,
    contributions: freeze(contributions),
  });
}

/**
 * Derive possible reasoning moves from the present Fold orientation.
 *
 * These are affordances, not facts. They never mutate Fold, never count as
 * witness, and never become evidence merely because context made a question
 * available. A downstream reasoner must still return explicit evidence/effects
 * through interrogation before revision can occur.
 *
 * Terrain (domain x grain) says what sort of thing is presently in play and is
 * therefore the minimum context for a concrete address-level proposal. Stance
 * (mode x grain) says how that address engages it. Prior same-stance material
 * may condition/weight the move, but MUST NOT license or forbid it: recursive
 * reading always remains free to Differentiate, Relate, or Generate anew.
 *
 * Every affordance also carries the universal mathematical contract for its
 * stance. This tells a terrain-specific reasoner what family of action is legal
 * and which proof obligations must be discharged without pretending the action
 * has already succeeded.
 */
export function reasoningAffordances(orientation = {}, { limit = 81 } = {}) {
  validLimit(limit);
  if (limit === 0) return freeze([]);
  const out = [];
  for (const address of cubeAddresses()) {
    const terrainContext = orientation?.terrainState?.[address.terrain] ?? [];
    if (!terrainContext.length) continue;
    const stanceContext = orientation?.stanceState?.[address.stance] ?? [];
    const mathematicalContract = stanceMathematicalContract(address);
    const priorSupport = experienceSupport(address, orientation?.receivedPriors ?? []);
    out.push(freeze({
      schema: "EOReasoningAffordance@1",
      id: `reasoning:${address.mode}:${address.domain}:${address.grain}`,
      standing: "affordance",
      witnessed: false,
      move: MODE_MOVE[address.mode],
      address,
      terrainRefs: refs(terrainContext),
      stanceRefs: refs(stanceContext),
      stanceContinuity: stanceContext.length > 0,
      priorSupport,
      mathematicalContract,
      mathematicalFamily: mathematicalContract?.family ?? null,
      proofObligations: mathematicalContract?.proofObligations ?? freeze([]),
    }));
    if (out.length >= limit) break;
  }
  return freeze(out);
}

/**
 * Generation is a subset of reasoning affordances, not a privileged source of
 * truth. A Generate address is available whenever its terrain is live; prior
 * Generative stance supplies continuity but is never required. Novel proposals
 * remain explicitly unwitnessed until a later encounter or licensed
 * transformation supplies grounds for admission.
 */
export function novelGenerationAffordances(orientation = {}, { limit = 27 } = {}) {
  validLimit(limit);
  if (limit === 0) return freeze([]);
  return freeze(reasoningAffordances(orientation, { limit: 81 })
    .filter((proposal) => proposal.move === "generate")
    .slice(0, limit)
    .map((proposal) => freeze({
      ...proposal,
      schema: "EONovelGenerationAffordance@1",
      standing: "proposal",
      witnessed: false,
      admissible: false,
      admission: "requires_grounding",
    })));
}
