import { TERRAIN_BY_DOMAIN, cellOf } from "./cube.js";

const freeze = (value) => Object.freeze(value);
export const TERRAINS = Object.freeze(Object.values(TERRAIN_BY_DOMAIN).flatMap((row) => Object.values(row)));
const TERRAIN_SET = new Set(TERRAINS);
const CLOSED = new Set(["resolved", "closed", "superseded", "retracted", "fulfilled", "violated"]);
const live = (entry) => entry && !CLOSED.has(entry.status) && !CLOSED.has(entry.state);

export function terrainOf(entry) {
  if (!entry || typeof entry !== "object") return null;
  if (TERRAIN_SET.has(entry.terrain)) return entry.terrain;
  if (entry?.eo?.op && entry?.eo?.grain) {
    const cell = cellOf(entry.eo.op, entry.eo.grain);
    return cell?.gap ? null : cell.terrain;
  }
  if (entry.schema === "EOOperation@1" && TERRAIN_SET.has(entry.terrain)) return entry.terrain;
  return null;
}

const emptyMaps = () => Object.fromEntries(TERRAINS.map((terrain) => [terrain, new Map()]));

/**
 * Incremental present-tense terrain index. Reading updates this only with the
 * new observation/Delta entries from a turn; it never rescans the accumulated
 * Fold merely to orient toward the next encounter.
 */
export function createTerrainIndex(entries = []) {
  const index = {
    schema: "EOTerrainIndex@1",
    byTerrain: emptyMaps(),
    terrainById: new Map(),
    producerTerrain: new Map(),
    snapshot: null,
    dirty: true,
  };
  indexTerrainEntries(index, entries);
  return index;
}

const remove = (index, id) => {
  const prior = index.terrainById.get(id);
  if (!prior) return;
  index.byTerrain[prior]?.delete(id);
  index.terrainById.delete(id);
  index.dirty = true;
};

const upsert = (index, entry, terrain) => {
  if (!entry?.id || !terrain || !TERRAIN_SET.has(terrain)) return false;
  const prior = index.terrainById.get(entry.id);
  if (prior && prior !== terrain) index.byTerrain[prior]?.delete(entry.id);
  if (!live(entry)) {
    remove(index, entry.id);
    return false;
  }
  index.byTerrain[terrain].set(entry.id, entry);
  index.terrainById.set(entry.id, terrain);
  index.dirty = true;
  return true;
};

export function indexTerrainEntries(index, entries = []) {
  if (!index?.byTerrain || !index?.terrainById || !index?.producerTerrain) throw new TypeError("indexTerrainEntries requires EOTerrainIndex@1");
  const batch = [...entries].filter(Boolean);
  const objectIds = new Set(batch.filter((entry) => entry?.schema !== "EOOperation@1" && entry?.id).map((entry) => entry.id));

  // Producer cells are learned before products are indexed, so a payload value
  // need not carry a redundant terrain label.
  for (const operation of batch) {
    if (operation?.schema !== "EOOperation@1") continue;
    const terrain = terrainOf(operation);
    if (!terrain) continue;
    for (const id of operation.outputs ?? []) if (typeof id === "string") index.producerTerrain.set(id, terrain);
  }

  for (const entry of batch) {
    if (entry?.schema === "EOOperation@1" || !entry?.id) continue;
    upsert(index, entry, terrainOf(entry) ?? index.producerTerrain.get(entry.id));
  }

  // Operations are fallback terrain facts only when no concrete output object
  // is available now or already projected. They therefore never double-count
  // the product they generated.
  for (const operation of batch) {
    if (operation?.schema !== "EOOperation@1" || !operation?.id) continue;
    const terrain = terrainOf(operation);
    if (!terrain) continue;
    const hasProduct = (operation.outputs ?? []).some((id) => objectIds.has(id) || index.terrainById.has(id));
    if (hasProduct) remove(index, operation.id);
    else upsert(index, operation, terrain);
  }
  return index;
}

export function snapshotTerrainState(index) {
  if (!index?.byTerrain) throw new TypeError("snapshotTerrainState requires EOTerrainIndex@1");
  if (!index.dirty && index.snapshot) return index.snapshot;
  const result = {};
  for (const terrain of TERRAINS) result[terrain] = freeze([...index.byTerrain[terrain].values()].filter(live));
  index.snapshot = freeze(result);
  index.dirty = false;
  return index.snapshot;
}

/**
 * Standalone projection for callers that only have a Fold snapshot. Recursive
 * reading itself uses the incremental index above.
 */
export function projectTerrainState(fold = {}, { ids = null } = {}) {
  const entries = [
    ...(fold?.transformationObjects ?? []),
    ...(fold?.graphEntries ?? []),
  ];
  const state = snapshotTerrainState(createTerrainIndex(entries));
  if (!ids) return state;
  const allowed = new Set(ids);
  const result = {};
  for (const terrain of TERRAINS) result[terrain] = freeze((state[terrain] ?? []).filter((entry) => allowed.has(entry.id)));
  return freeze(result);
}

export function terrainCounts(state = {}) {
  return freeze(Object.fromEntries(TERRAINS.map((terrain) => [terrain, state?.[terrain]?.length ?? 0])));
}
