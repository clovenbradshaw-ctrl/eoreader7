import { cubeAddresses } from "./interrogation.js";

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

/**
 * Derive possible reasoning moves from the present Fold orientation.
 *
 * These are affordances, not facts. They never mutate Fold, never count as
 * witness, and never become evidence merely because terrain/stance context
 * made a question available. A downstream reasoner must still return explicit
 * evidence/effects through interrogation before revision can occur.
 *
 * Terrain (domain x grain) answers what sort of thing is in play. Stance
 * (mode x grain) answers what kind of operation is presently afforded. Both
 * must have live context for a concrete cube-address move to be proposed.
 */
export function reasoningAffordances(orientation = {}, { limit = 81 } = {}) {
  validLimit(limit);
  if (limit === 0) return freeze([]);
  const out = [];
  for (const address of cubeAddresses()) {
    const terrainContext = orientation?.terrainState?.[address.terrain] ?? [];
    const stanceContext = orientation?.stanceState?.[address.stance] ?? [];
    if (!terrainContext.length || !stanceContext.length) continue;
    out.push(freeze({
      schema: "EOReasoningAffordance@1",
      id: `reasoning:${address.mode}:${address.domain}:${address.grain}`,
      standing: "affordance",
      witnessed: false,
      move: MODE_MOVE[address.mode],
      address,
      terrainRefs: refs(terrainContext),
      stanceRefs: refs(stanceContext),
    }));
    if (out.length >= limit) break;
  }
  return freeze(out);
}

/**
 * Generation is a subset of reasoning affordances, not a privileged source of
 * truth. Novel proposals remain explicitly unwitnessed until an encounter or
 * a licensed transformation supplies grounds for admission.
 */
export function novelGenerationAffordances(orientation = {}, { limit = 27 } = {}) {
  validLimit(limit);
  if (limit === 0) return freeze([]);
  return freeze(reasoningAffordances(orientation, { limit: Math.max(limit * 3, limit) })
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
