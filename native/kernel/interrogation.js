import { MODES, DOMAINS, GRAINS, cellOf } from "./cube.js";
import { deltaFold, eoOperation } from "./fold.js";
import { buildHypergraph, relevantHypergraphNeighborhood } from "./hypergraph.js";
import { projectTerrainState, terrainCounts } from "./terrain-state.js";

const OP_BY_ADDRESS = Object.freeze({
  Differentiate: Object.freeze({ Existence: "NUL", Structure: "SEG", Interpretation: "DEF" }),
  Relate: Object.freeze({ Existence: "SIG", Structure: "CON", Interpretation: "EVA" }),
  Generate: Object.freeze({ Existence: "INS", Structure: "SYN", Interpretation: "REC" }),
});

export function addressOf(mode, domain, grain) {
  const op = OP_BY_ADDRESS?.[mode]?.[domain];
  if (!op) throw new TypeError(`unknown EO address: ${mode}/${domain}/${grain}`);
  return cellOf(op, grain);
}

export function cubeAddresses() {
  return MODES.flatMap((mode) => DOMAINS.flatMap((domain) => GRAINS.map((grain) => addressOf(mode, domain, grain))));
}

export function relevantNeighborhood(fold, observations, { select, maxHops = 3, graph = null } = {}) {
  if (select) return select(fold, observations);
  const workingGraph = graph ?? buildHypergraph([
    ...(fold?.graphEntries ?? []),
    ...(fold?.expectations ?? []),
    ...(fold?.obligations ?? []),
    ...(fold?.activeFrames ?? []),
    ...(fold?.unresolvedAlternatives ?? []),
    ...(fold?.transformationObjects ?? []),
  ]);
  const graphNeighborhood = relevantHypergraphNeighborhood(workingGraph, observations, { maxHops });
  const ids = new Set(graphNeighborhood.ids);
  const pick = (key) => (fold?.[key] ?? []).filter((entry) => entry?.id && ids.has(entry.id));
  const terrainState = projectTerrainState(fold, { ids });
  const counts = terrainCounts(terrainState);
  const result = {
    graph: graphNeighborhood,
    witnessed: pick("witnessed"),
    provisional: pick("provisional"),
    expectations: pick("expectations"),
    obligations: pick("obligations"),
    exclusions: pick("exclusions"),
    unresolvedAlternatives: pick("unresolvedAlternatives"),
    activeFrames: pick("activeFrames"),
    receivedPriors: pick("receivedPriors"),
  };
  if (Object.values(counts).some((count) => count > 0)) {
    result.terrainState = terrainState;
    result.terrainCounts = counts;
  }
  return result;
}

export async function interrogateCube(observations, neighborhood, { ask } = {}) {
  const results = [];
  for (const address of cubeAddresses()) {
    const terrainContext = neighborhood?.terrainState?.[address.terrain] ?? [];
    const answer = ask ? await ask({ address, terrainContext, observations, neighborhood }) : null;
    // terrainContext conditions interrogation but is not duplicated into the
    // public interrogation record. This preserves the canonical 6.1 result
    // shape and, more importantly, avoids turning context into evidence.
    results.push({
      schema: "EOInterrogation@1",
      address,
      changed: Boolean(answer?.changed),
      effects: answer?.effects ?? [],
      evidence: answer?.evidence ?? null,
    });
  }
  return results;
}

export function deriveEOTransformations(interrogation = [], meta = {}) {
  const operations = [];
  for (const result of interrogation) {
    if (!result.changed) continue;
    for (const effect of result.effects ?? []) {
      const op = effect.op ?? result.address.op;
      const grain = effect.grain ?? result.address.grain;
      operations.push(eoOperation({
        op,
        grain,
        witness: effect.witness ?? result.evidence,
        consequence: effect.consequence ?? null,
        payload: effect.payload ?? null,
      }));
    }
  }
  return deltaFold(operations, meta);
}
