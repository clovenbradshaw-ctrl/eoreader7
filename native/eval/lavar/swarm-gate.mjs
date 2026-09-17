// swarm-gate.mjs — the swarm's admission gate as PURE, testable logic
// (2026-09-16). Extracted from wilson.mjs's inline `admits` so the wiring
// can be falsified without running the whole swarm.
//
// THE WIRING DEFECT THIS REPLACES, MEASURED. wilson.mjs's inline gate was:
//   admits(improvement, delta) => improvement >= bar && bornAcceptance({ delta })
// but every call site passed the CORRECTION delta (f2-f1 from the reread)
// as `delta`, not the improvement over the best. The reread routinely
// degrades the shape (its own diff pass against a foreign ledger folded a
// clean reading into itself — the -0.365 reread in the swarm log), so
// `delta <= 0` and bornAcceptance refused EVERY candidate — even ones that
// beat the best by +0.013 (measured: noun-phrase-subjects 0.574 vs best
// 0.561, refused). 416 births, 0 kept. The bar was never the deafness; the
// wrong gauge was.
//
// The gate also carries the cube's other faces (kernel/cube.js):
//   - TERRAIN-RELATIVE selection: the swarm keeps one champion per terrain,
//     so a specialist can beat the generalist on its own ground (the
//     Differentiate face — SEG is how over-broad readers get split).
//   - STANCE: every birth carries its cell's stance (Clearing/Dissecting/
//     Unraveling · Tending/Binding/Tracing · Cultivating/Making/Composing),
//     which is the raw material of device personality.
//   - SPECIALISTS (SEG·Figure, "split an over-broad organ"): the best's
//     organs restricted to one terrain each (+ declared deps), legal-checked.
import { bornAcceptance } from "./elenchus-bar.mjs";
import { cellOf } from "../../kernel/cube.js";

/** stanceOf(op, grain) — the cell's stance: the qualitative HOW of an
 * operation at a grain. Pure; comes straight from the kernel cube. */
export const stanceOf = (op, grain) => cellOf(op, grain).stance;

/** specialistsOf(ids, {terrainOfOrgan, depsOf, legal}) — SEG·Figure: split
 * an over-broad organ set into its terrain-restricted specialists. For each
 * terrain the generalist covers, keep only the organs of that terrain and
 * their declared deps; drop proposals that are empty, identical to the
 * parent, or illegal (a DAG subset can never break legality, checked anyway).
 * Returns [{t, ids}]. Pure. */
export function specialistsOf(ids, { terrainOfOrgan, depsOf, legal }) {
  const out = [];
  const parentKey = ids.join(",");
  for (const t of [...new Set(ids.map(terrainOfOrgan))]) {
    const spec = ids.filter((id) => terrainOfOrgan(id) === t);
    const withDeps = [...new Set([...spec, ...spec.flatMap((id) => [...depsOf(id)])])];
    if (!withDeps.length) continue;
    if (withDeps.join(",") === parentKey) continue;
    if (!legal(withDeps)) continue;
    out.push({ t, ids: withDeps });
  }
  return out;
}

/** createSwarmGate({ bar }) — the elenchus as a closure over the colony's
 * own observations. `bar` is the measured rerun-null floor (elenchus-bar.mjs);
 * admission requires BOTH clearing it AND carrying born mass over the
 * population's own observed improvements (bornAcceptance). Per-terrain
 * champions let a specialist be selected against its own ground, not the
 * global best. */
export function createSwarmGate({ bar = Number.EPSILON } = {}) {
  const bestByTerrain = new Map();
  const observedImprovements = [];
  const observedDeltas = [];

  const record = (ids, terrainOf, f) => {
    for (const t of terrainOf(ids)) {
      const prev = bestByTerrain.get(t);
      if (!prev || f > prev.f) bestByTerrain.set(t, { ids, f });
    }
  };

  const championFor = (ids, terrainOf, fallback) => {
    const fs = terrainOf(ids).map((t) => bestByTerrain.get(t)?.f).filter((x) => x !== undefined);
    return fs.length ? Math.max(...fs) : fallback;
  };

  const admits = (improvement) =>
    Number.isFinite(improvement) && improvement >= bar &&
    bornAcceptance({ delta: improvement, populationDeltas: observedImprovements });

  return {
    bestByTerrain,
    observedImprovements,
    observedDeltas,
    record,
    championFor,
    recordImprovement: (imp) => observedImprovements.push(imp),
    recordDelta: (d) => observedDeltas.push(d),
    admits,
  };
}