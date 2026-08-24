import { STANCE_BY_MODE, cellOf } from "./cube.js";

const freeze = (value) => Object.freeze(value);
export const STANCES = Object.freeze(Object.values(STANCE_BY_MODE).flatMap((row) => Object.values(row)));
const STANCE_SET = new Set(STANCES);
const CLOSED = new Set(["resolved", "closed", "superseded", "retracted", "fulfilled", "violated"]);
const live = (entry) => entry && !CLOSED.has(entry.status) && !CLOSED.has(entry.state);

export function stanceOf(entry) {
  if (!entry || typeof entry !== "object") return null;
  if (STANCE_SET.has(entry.stance)) return entry.stance;
  if (entry?.eo?.op && entry?.eo?.grain) {
    const cell = cellOf(entry.eo.op, entry.eo.grain);
    return cell?.gap ? null : cell.stance;
  }
  if (entry.schema === "EOOperation@1" && STANCE_SET.has(entry.stance)) return entry.stance;
  return null;
}

const emptyMaps = () => Object.fromEntries(STANCES.map((stance) => [stance, new Map()]));

/**
 * Incremental present-tense stance index. Stance is mode x grain, independent
 * of terrain (domain x grain). The same terrain may therefore be projected
 * under multiple stances without conflating the two cube faces.
 */
export function createStanceIndex(entries = []) {
  const index = {
    schema: "EOStanceIndex@1",
    byStance: emptyMaps(),
    stanceById: new Map(),
    producerStance: new Map(),
    snapshot: null,
    dirty: true,
  };
  indexStanceEntries(index, entries);
  return index;
}

const remove = (index, id) => {
  const prior = index.stanceById.get(id);
  if (!prior) return;
  index.byStance[prior]?.delete(id);
  index.stanceById.delete(id);
  index.dirty = true;
};

const upsert = (index, entry, stance) => {
  if (!entry?.id || !stance || !STANCE_SET.has(stance)) return false;
  const prior = index.stanceById.get(entry.id);
  if (prior && prior !== stance) index.byStance[prior]?.delete(entry.id);
  if (!live(entry)) {
    remove(index, entry.id);
    return false;
  }
  index.byStance[stance].set(entry.id, entry);
  index.stanceById.set(entry.id, stance);
  index.dirty = true;
  return true;
};

export function indexStanceEntries(index, entries = []) {
  if (!index?.byStance || !index?.stanceById || !index?.producerStance) throw new TypeError("indexStanceEntries requires EOStanceIndex@1");
  const batch = [...entries].filter(Boolean);
  const objectIds = new Set(batch.filter((entry) => entry?.schema !== "EOOperation@1" && entry?.id).map((entry) => entry.id));

  // Learn the producer stance before indexing its product so payload objects do
  // not need to repeat cube coordinates merely for projection.
  for (const operation of batch) {
    if (operation?.schema !== "EOOperation@1") continue;
    const stance = stanceOf(operation);
    if (!stance) continue;
    for (const id of operation.outputs ?? []) if (typeof id === "string") index.producerStance.set(id, stance);
  }

  for (const entry of batch) {
    if (entry?.schema === "EOOperation@1" || !entry?.id) continue;
    upsert(index, entry, stanceOf(entry) ?? index.producerStance.get(entry.id));
  }

  // As with terrain projection, an operation is itself a stance fact only when
  // no concrete product is present. This prevents double-counting generation.
  for (const operation of batch) {
    if (operation?.schema !== "EOOperation@1" || !operation?.id) continue;
    const stance = stanceOf(operation);
    if (!stance) continue;
    const hasProduct = (operation.outputs ?? []).some((id) => objectIds.has(id) || index.stanceById.has(id));
    if (hasProduct) remove(index, operation.id);
    else upsert(index, operation, stance);
  }
  return index;
}

export function snapshotStanceState(index) {
  if (!index?.byStance) throw new TypeError("snapshotStanceState requires EOStanceIndex@1");
  if (!index.dirty && index.snapshot) return index.snapshot;
  const result = {};
  for (const stance of STANCES) result[stance] = freeze([...index.byStance[stance].values()].filter(live));
  index.snapshot = freeze(result);
  index.dirty = false;
  return index.snapshot;
}

/** Standalone stance projection for callers that only have a Fold snapshot. */
export function projectStanceState(fold = {}, { ids = null } = {}) {
  const entries = [
    ...(fold?.transformationObjects ?? []),
    ...(fold?.graphEntries ?? []),
  ];
  const state = snapshotStanceState(createStanceIndex(entries));
  if (!ids) return state;
  const allowed = new Set(ids);
  const result = {};
  for (const stance of STANCES) result[stance] = freeze((state[stance] ?? []).filter((entry) => allowed.has(entry.id)));
  return freeze(result);
}

export function stanceCounts(state = {}) {
  return freeze(Object.fromEntries(STANCES.map((stance) => [stance, state?.[stance]?.length ?? 0])));
}
