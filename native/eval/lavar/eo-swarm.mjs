// eo-swarm.mjs — the persona-facing naming layer over Wilson's SWARM
// mechanism (wilson.mjs / chapter-swarm.mjs / evolution.mjs), per
// LAVAR.md 2026-09-17 "Wilson reconciliation". This file adds NO new
// breed/mutate/select logic: it composes swarm-gate.mjs's pure primitives
// (createSwarmGate, stanceOf, specialistsOf), the same ones wilson.mjs
// itself calls, under the vocabulary a caller outside the reading domain
// can use without reading wilson.mjs's organ-specific ORGANS table.
//
//   ant       = a single candidate genotype the mechanism breeds/mutates/
//               selects. wilson.mjs's own term for this object at the
//               call site is "candidate"/"variant"/"trial" (population
//               entries shaped { ids, s, f }); "ant" is the persona name
//               for that same shape, unchanged.
//   eoSwarm() = the dispatch event: hand it a population of ants and a
//               fitness function, and it runs ONE round of Wilson's
//               admission gate over BREED (CON·Figure — "compose two
//               agents") and DIFFERENTIATE (SEG·Figure — specialistsOf)
//               the same two faces wilson.mjs's own generation loop runs.
//               Domain-general: it knows nothing about reading organs,
//               chapters, or text — only genotype ids, a caller-supplied
//               fitness, and the cube coordinates a caller attaches to
//               its own ants for persona/stance labeling.
//   persona   = personaOf(ant) grounds an ant's ethos/logos/pathos
//               reading in the ARCHONS already registered in
//               organs/creativity-table.js (Diaconis, Holmes, Wilson,
//               ...), read off the ant's own cube cell (kernel/cube.js's
//               cellOf), never a made-up archon.
//
// Breeding is exactly wilson.mjs's CON·Figure: two ants' genotypes union
// into a child, legal-checked by the caller's own DAG (`legal`), gated by
// the SAME createSwarmGate/bornAcceptance admission wilson.mjs uses.
// specialistsOf is imported verbatim, not re-implemented.
import { createSwarmGate, stanceOf, specialistsOf } from "./swarm-gate.mjs";
import { cellOf } from "../../kernel/cube.js";
import { ARCHONS as CREATIVITY_ARCHONS } from "../../organs/creativity-table.js";

// The cube's three DOMAINS (Existence/Structure/Interpretation,
// kernel/cube.js) and creativity-table.js's three PHASES (Formation/
// Structure/Interpretation) are the same three moments under two
// vocabularies — Structure and Interpretation match verbatim, and
// Existence/Formation name the same moment (a thing coming into being).
// This alias is eoSwarm's own naming decision, declared here rather than
// asserted as pre-existing fact: it is what lets an ant's cube cell
// (op, grain -> domain) address creativity-table.js's ARCHONS registry
// (grain, phase) without inventing a parallel archon table.
const DOMAIN_TO_PHASE = Object.freeze({ Existence: "Formation", Structure: "Structure", Interpretation: "Interpretation" });

/** personaOf(ant) — the ant's persona: an archon already registered in
 * creativity-table.js's ARCHONS (grounded in the ant's own cube cell, op +
 * grain), paired with the ant's mechanical/functional role (the cell's
 * stance — the qualitative HOW, e.g. "Dissecting", "Binding", "Composing").
 * An ant with no cube coordinates (op/grain) gets no invented persona: the
 * gap is returned typed, never silently defaulted. Pure. */
export function personaOf(ant) {
  if (!ant || !ant.op || !ant.grain) return { gap: "no_cube_coordinates", reason: "persona requires the ant's op and grain (kernel/cube.js coordinates)" };
  const cube = cellOf(ant.op, ant.grain);
  if (cube.gap) return cube;
  const phase = DOMAIN_TO_PHASE[cube.domain];
  const archon = CREATIVITY_ARCHONS[`${ant.grain}|${phase}`] ?? null;
  return Object.freeze({
    archon, ethos: cube.mode, functionalRole: cube.stance, terrain: cube.terrain,
    label: archon ? `${archon} (${cube.stance})` : cube.stance,
  });
}

/** eoSwarm(problem) — dispatch ants at a problem: one round of Wilson's own
 * breed (CON·Figure, union of two ants' genotypes) and differentiate
 * (SEG·Figure, specialistsOf) over a caller-supplied population, gated by
 * the SAME admission createSwarmGate/bornAcceptance wilson.mjs itself uses.
 *
 * problem = {
 *   ants:        [{ id, ids, op, grain }]  — the seed population; op/grain
 *                are the ant's cube coordinates, used for stance/persona
 *                and (for the seed) supplied by the caller, not guessed.
 *   fitness:     (ids) => number           — REQUIRED, caller's own measure.
 *   terrainOf:   (ids) => [terrain, ...]   — REQUIRED, for per-terrain gating.
 *   legal:       (ids) => boolean          — REQUIRED, the caller's own DAG.
 *   bar:         number                    — REQUIRED, the caller's own
 *                measured elenchus bar (elenchus-bar.mjs); eoSwarm never
 *                hand-sets a threshold.
 *   depsOf, terrainOfOrgan: optional, enable the DIFFERENTIATE (SEG) face
 *                (specialistsOf) exactly as wilson.mjs wires it; omitted,
 *                that face is skipped rather than faked.
 * }
 *
 * Returns { ants, best, gate } where `ants` is every ant evaluated (seed +
 * admitted bred/differentiated children), each carrying its fitness,
 * stance, and persona. */
export function eoSwarm({ ants, fitness, terrainOf, legal, bar, depsOf, terrainOfOrgan }) {
  if (typeof fitness !== "function") throw new Error("eoSwarm: fitness(ids) is required");
  if (typeof terrainOf !== "function") throw new Error("eoSwarm: terrainOf(ids) is required");
  if (typeof legal !== "function") throw new Error("eoSwarm: legal(ids) is required");
  if (!Number.isFinite(bar)) throw new Error("eoSwarm: bar (the caller's own measured elenchus bar) is required");
  if (!Array.isArray(ants) || !ants.length) throw new Error("eoSwarm: at least one seed ant is required");

  const gate = createSwarmGate({ bar });
  const seen = new Set();
  const census = [];

  const evaluate = (ids, op, grain, kind) => {
    const key = ids.slice().sort().join(",");
    if (seen.has(key)) return null;
    seen.add(key);
    const f = fitness(ids);
    const stance = op && grain ? stanceOf(op, grain) : null;
    const ant = Object.freeze({ ids, op, grain, stance, kind, f });
    return ant;
  };

  // ── seed: the caller's own ants, each champions every terrain it covers,
  // the same role the seed population plays in wilson.mjs. ──
  let best = null;
  for (const a of ants) {
    const ant = evaluate(a.ids, a.op, a.grain, "seed");
    if (!ant) continue;
    gate.record(ant.ids, terrainOf, ant.f);
    census.push({ ...ant, persona: personaOf(ant), admitted: true });
    if (!best || ant.f > best.f) best = ant;
  }
  if (!best) throw new Error("eoSwarm: no evaluable ants (all duplicates)");

  // ── BREED (CON·Figure, "compose two agents") — every unordered pair of
  // seed ants unions into a child, legal-checked, gated on improvement over
  // its own terrain's champion, exactly wilson.mjs's admission contract. ──
  for (let i = 0; i < ants.length; i += 1) {
    for (let j = i + 1; j < ants.length; j += 1) {
      const childIds = [...new Set([...ants[i].ids, ...ants[j].ids])];
      if (!legal(childIds)) continue;
      const child = evaluate(childIds, "CON", "Figure", "bred");
      if (!child) continue;
      const improvement = child.f - gate.championFor(child.ids, terrainOf, best.f);
      gate.recordImprovement(improvement);
      const admitted = gate.admits(improvement);
      if (admitted) { gate.record(child.ids, terrainOf, child.f); if (child.f > best.f) best = child; }
      census.push({ ...child, persona: personaOf(child), admitted });
    }
  }

  // ── DIFFERENTIATE (SEG·Figure) — specialistsOf, imported verbatim from
  // swarm-gate.mjs, splits the current best into terrain-restricted ants. ──
  if (typeof depsOf === "function" && typeof terrainOfOrgan === "function") {
    for (const { t, ids: specIds } of specialistsOf(best.ids, { terrainOfOrgan, depsOf, legal })) {
      const spec = evaluate(specIds, "SEG", "Figure", "differentiated");
      if (!spec) continue;
      const improvement = spec.f - gate.championFor(spec.ids, terrainOf, best.f);
      gate.recordImprovement(improvement);
      const admitted = gate.admits(improvement);
      if (admitted) { gate.record(spec.ids, terrainOf, spec.f); if (spec.f > best.f) best = spec; }
      census.push({ ...spec, terrain: t, persona: personaOf(spec), admitted });
    }
  }

  return { ants: census, best, gate };
}
