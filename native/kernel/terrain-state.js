import { TERRAIN_BY_DOMAIN, cellOf } from "./cube.js";

const freeze = (value) => Object.freeze(value);
export const TERRAINS = Object.freeze(Object.values(TERRAIN_BY_DOMAIN).flatMap((row) => Object.values(row)));
const TERRAIN_SET = new Set(TERRAINS);

const empty = () => Object.fromEntries(TERRAINS.map((terrain) => [terrain, []]));
const live = (entry) => entry && !["resolved", "closed", "superseded", "retracted"].includes(entry.status) && !["fulfilled", "violated", "superseded"].includes(entry.state);

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

/**
 * Project the present Fold through the terrain face without creating a second
 * store. Terrain membership comes from the EO cell carried by an object or by
 * the operation that currently projects that object. Witness history remains
 * untouched; later REC/SEG/DEF operations may therefore change present terrain
 * projection without rewriting the historical object.
 */
export function projectTerrainState(fold = {}, { ids = null } = {}) {
  const allowed = ids ? new Set(ids) : null;
  const buckets = empty();
  const byId = new Map((fold?.graphEntries ?? []).filter((entry) => entry?.id).map((entry) => [entry.id, entry]));
  const producerTerrain = new Map();

  for (const operation of fold?.transformationObjects ?? []) {
    if (!live(operation)) continue;
    const terrain = terrainOf(operation);
    if (!terrain) continue;
    for (const id of operation.outputs ?? []) if (typeof id === "string") producerTerrain.set(id, terrain);
  }

  const seen = new Set();
  const admit = (entry, terrain) => {
    if (!entry?.id || !terrain || !TERRAIN_SET.has(terrain) || !live(entry)) return;
    if (allowed && !allowed.has(entry.id)) return;
    const key = `${terrain}\u0000${entry.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    buckets[terrain].push(entry);
  };

  for (const entry of byId.values()) admit(entry, terrainOf(entry) ?? producerTerrain.get(entry.id));

  // A transformation is itself a live EO-addressed fact about how the Fold is
  // being changed. Include it when no output object is available, so every cell
  // remains inspectable even for operations such as a pure boundary/refusal.
  for (const operation of fold?.transformationObjects ?? []) {
    const terrain = terrainOf(operation);
    if (!terrain || !live(operation)) continue;
    const hasProjectedOutput = (operation.outputs ?? []).some((id) => {
      const entry = byId.get(id);
      return entry && (!allowed || allowed.has(id));
    });
    if (!hasProjectedOutput) admit(operation, terrain);
  }

  const result = {};
  for (const terrain of TERRAINS) result[terrain] = freeze(buckets[terrain]);
  return freeze(result);
}

export function terrainCounts(state = {}) {
  return freeze(Object.fromEntries(TERRAINS.map((terrain) => [terrain, state?.[terrain]?.length ?? 0])));
}
