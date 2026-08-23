import { MODES, DOMAINS, GRAINS, cellOf } from "./cube.js";
import { deltaFold, eoOperation } from "./fold.js";
import { buildHypergraph, relevantHypergraphNeighborhood } from "./hypergraph.js";
import { projectTerrainState, terrainCounts, TERRAINS } from "./terrain-state.js";
import { projectStanceState, stanceCounts, STANCES } from "./stance-state.js";

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

export function relevantNeighborhood(fold, observations, { select, maxHops = 3, graph = null, terrainState: suppliedTerrainState = null, stanceState: suppliedStanceState = null } = {}) {
  if (select) return select(fold, observations);
  const workingGraph = graph ?? buildHypergraph([
    ...(fold?.graphEntries ?? []), ...(fold?.expectations ?? []), ...(fold?.obligations ?? []), ...(fold?.activeFrames ?? []), ...(fold?.unresolvedAlternatives ?? []), ...(fold?.transformationObjects ?? []),
  ]);
  const graphNeighborhood = relevantHypergraphNeighborhood(workingGraph, observations, { maxHops });
  const ids = new Set(graphNeighborhood.ids);
  const pick = (key) => (fold?.[key] ?? []).filter((entry) => entry?.id && ids.has(entry.id));

  let terrainState;
  if (suppliedTerrainState) {
    const filtered = {};
    for (const terrain of TERRAINS) filtered[terrain] = Object.freeze([...(suppliedTerrainState[terrain] ?? [])].filter((entry) => ids.has(entry.id)));
    terrainState = Object.freeze(filtered);
  } else terrainState = projectTerrainState(fold, { ids });
  const terrainCount = terrainCounts(terrainState);

  let stanceState;
  if (suppliedStanceState) {
    const filtered = {};
    for (const stance of STANCES) filtered[stance] = Object.freeze([...(suppliedStanceState[stance] ?? [])].filter((entry) => ids.has(entry.id)));
    stanceState = Object.freeze(filtered);
  } else stanceState = projectStanceState(fold, { ids });
  const stanceCount = stanceCounts(stanceState);

  const result = {
    graph: graphNeighborhood,
    witnessed: pick("witnessed"), provisional: pick("provisional"), expectations: pick("expectations"), obligations: pick("obligations"), exclusions: pick("exclusions"), unresolvedAlternatives: pick("unresolvedAlternatives"), activeFrames: pick("activeFrames"), receivedPriors: pick("receivedPriors"),
  };
  if (Object.values(terrainCount).some((count) => count > 0)) { result.terrainState = terrainState; result.terrainCounts = terrainCount; }
  if (Object.values(stanceCount).some((count) => count > 0)) { result.stanceState = stanceState; result.stanceCounts = stanceCount; }
  return result;
}

export async function interrogateCube(observations, neighborhood, { ask } = {}) {
  const results = [];
  for (const address of cubeAddresses()) {
    const terrainContext = neighborhood?.terrainState?.[address.terrain] ?? [];
    const stanceContext = neighborhood?.stanceState?.[address.stance] ?? [];
    const answer = ask ? await ask({ address, terrainContext, stanceContext, observations, neighborhood }) : null;
    // Context conditions the question but is not itself copied into the public
    // interrogation result. Only returned effects/evidence can become revision.
    results.push({ schema: "EOInterrogation@1", address, changed: Boolean(answer?.changed), effects: answer?.effects ?? [], evidence: answer?.evidence ?? null });
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
      operations.push(eoOperation({ op, grain, witness: effect.witness ?? result.evidence, consequence: effect.consequence ?? null, payload: effect.payload ?? null }));
    }
  }
  return deltaFold(operations, meta);
}
