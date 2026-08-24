import { cellOf } from "./cube.js";

const STATES = new Set(["open", "strengthened", "weakened", "fulfilled", "violated", "reframed", "superseded"]);
const emptyClasses = () => ({
  witnessed: [],
  provisional: [],
  expectations: [],
  obligations: [],
  exclusions: [],
  unresolvedAlternatives: [],
  activeFrames: [],
  receivedPriors: [],
  graphEntries: [],
  transformationObjects: [],
  transformationHistoryRefs: [],
});

const clone = (value) => value == null ? value : structuredClone(value);
const copyFold = (fold) => ({ ...(fold ?? receivedGround()) });

export function receivedGround(seed = {}) {
  return {
    schema: "EOFold@1",
    sequence: 0,
    ...emptyClasses(),
    ...clone(seed),
  };
}

export function eoOperation({ id = null, op, grain, witness = null, consequence = null, inputs = [], outputs = [], payload = null }) {
  const cell = cellOf(op, grain);
  if (cell.gap) throw new TypeError(cell.reason);
  if (op === "NUL" && payload?.action) {
    throw new TypeError("NUL records no transformation and cannot carry a mutating payload");
  }
  return Object.freeze({
    schema: "EOOperation@1",
    id,
    mode: cell.mode,
    domain: cell.domain,
    grain: cell.grain,
    operator: cell.op,
    terrain: cell.terrain,
    stance: cell.stance,
    witness,
    consequence,
    inputs: Object.freeze([...inputs]),
    outputs: Object.freeze([...outputs]),
    payload,
  });
}

export function deltaFold(operations = [], meta = {}) {
  return Object.freeze({
    schema: "DeltaFold@1",
    operations: Object.freeze([...operations]),
    ...meta,
  });
}

// Every fold array here is copy-on-write: upsertById/upsertManyById are the
// ONLY writers, always returning a brand-new array, never mutating `list` in
// place. That makes it safe to cache each array's own id->position index as
// a hidden, non-enumerable property on the array itself, carried forward
// (and incrementally extended, never rebuilt) into whatever array replaces
// it -- the same "index maintained across an append-only lineage" shape as
// task-log.js's own projection cache, applied here to avoid rescanning the
// whole, ever-growing fold on every single upsert to find out where (or
// whether) an id already lives, when the common case is simply appending a
// fresh one.
function idIndexOf(list) {
  let idx = list?._idIndex;
  if (idx) return idx;
  idx = new Map();
  for (let i = 0; i < (list?.length ?? 0); i += 1) if (list[i]?.id != null) idx.set(list[i].id, i);
  attachIdIndex(list, idx);
  return idx;
}

function attachIdIndex(array, idx) {
  if (!array) return array;
  try { Object.defineProperty(array, "_idIndex", { value: idx, enumerable: false, configurable: true }); } catch { /* non-extensible array: caching skipped, correctness unaffected */ }
  return array;
}

// `list` is discarded the moment its successor exists -- every writer in
// this module reassigns rather than reuses a prior array (confirmed: no
// caller anywhere upserts twice from the same base to produce two divergent
// results). That makes it safe to EXTEND the prior index in place, carrying
// the same Map forward rather than copying it on every single upsert, which
// would otherwise re-introduce the exact O(list-so-far) cost per call this
// cache exists to remove -- particularly for upsertById, which applyDelta
// calls once per matching operation, sequentially, against the very same
// growing array within one delta.
function upsertById(list = [], value) {
  const idx = idIndexOf(list);
  const next = [...list];
  const id = value?.id;
  const i = id == null ? -1 : idx.get(id) ?? -1;
  if (i >= 0) { next[i] = { ...next[i], ...clone(value) }; return attachIdIndex(next, idx); }
  next.push(clone(value));
  if (id != null) idx.set(id, next.length - 1);
  return attachIdIndex(next, idx);
}

function upsertManyById(list = [], values = []) {
  if (!values.length) return list;
  const idx = idIndexOf(list);
  const next = [...list];
  for (const raw of values) {
    if (!raw) continue;
    const value = clone(raw);
    const id = value?.id;
    if (id != null && idx.has(id)) {
      const i = idx.get(id);
      next[i] = { ...next[i], ...value };
      continue;
    }
    if (id != null) idx.set(id, next.length);
    next.push(value);
  }
  return attachIdIndex(next, idx);
}

function removeById(list = [], id) {
  return id == null ? list : list.filter((item) => item?.id !== id);
}

function graphable(value) {
  return value?.id && value?.schema ? value : null;
}

export function applyObservation(fold, observation) {
  if (observation?.schema !== "Observation@1") throw new TypeError("applyObservation requires Observation@1");
  const next = copyFold(fold);
  next.witnessed = upsertById(next.witnessed ?? [], observation);
  const additions = [
    observation,
    ...(observation.hyperedges ?? []),
    ...(observation.graphEntries ?? []),
  ].filter(graphable);
  next.graphEntries = upsertManyById(next.graphEntries ?? [], additions);
  return next;
}

function applyPayload(fold, operation) {
  if (operation.operator === "NUL") return [];
  const payload = operation.payload ?? {};
  switch (payload.action) {
    case "provisional":
      fold.provisional = upsertById(fold.provisional ?? [], payload.value);
      return [payload.value].filter(graphable);
    case "expectation": {
      const value = payload.value ?? {};
      if (value.state && !STATES.has(value.state)) throw new TypeError(`unknown expectation state: ${value.state}`);
      fold.expectations = upsertById(fold.expectations ?? [], value);
      return [value].filter(graphable);
    }
    case "obligation":
      fold.obligations = upsertById(fold.obligations ?? [], payload.value);
      return [payload.value].filter(graphable);
    case "exclusion":
      fold.exclusions = upsertById(fold.exclusions ?? [], payload.value);
      return [payload.value].filter(graphable);
    case "alternative":
      fold.unresolvedAlternatives = upsertById(fold.unresolvedAlternatives ?? [], payload.value);
      return [payload.value].filter(graphable);
    case "frame":
      fold.activeFrames = upsertById(fold.activeFrames ?? [], payload.value);
      return [payload.value].filter(graphable);
    case "prior":
      fold.receivedPriors = upsertById(fold.receivedPriors ?? [], payload.value);
      return [];
    case "hyperedge":
    case "graph-object":
      return [payload.value].filter(graphable);
    case "resolve-obligation": {
      const existing = (fold.obligations ?? []).find((item) => item?.id === payload.id);
      const revised = existing ? {
        ...existing,
        status: payload.status ?? "resolved",
        resolvedAt: fold.sequence + 1,
        resolutionRefs: [...(existing.resolutionRefs ?? []), operation.id].filter(Boolean),
      } : null;
      if (!revised) return [];
      fold.obligations = upsertById(fold.obligations ?? [], revised);
      return [revised];
    }
    case "remove-provisional":
      fold.provisional = removeById(fold.provisional ?? [], payload.id);
      return [];
    default:
      return [];
  }
}

export function applyDelta(fold, delta) {
  if (delta?.schema !== "DeltaFold@1") throw new TypeError("applyDelta requires DeltaFold@1");
  const next = copyFold(fold);
  next.sequence = (next.sequence ?? 0) + 1;
  let opIndex = 0;
  const operations = [];
  const graphUpdates = [];
  for (const rawOperation of delta.operations ?? []) {
    if (rawOperation?.schema !== "EOOperation@1") throw new TypeError("DeltaFold contains a non-EO operation");
    if (rawOperation.operator === "NUL" && rawOperation.payload?.action) throw new TypeError("NUL cannot mutate Fold state");
    const operation = rawOperation.id ? rawOperation : { ...rawOperation, id: `${delta.id ?? `delta:${next.sequence}`}:op:${opIndex}` };
    opIndex += 1;
    operations.push(operation);
    graphUpdates.push(...applyPayload(next, operation));
  }
  next.transformationObjects = upsertManyById(next.transformationObjects ?? [], operations);
  next.graphEntries = upsertManyById(next.graphEntries ?? [], [...operations, ...graphUpdates].filter(graphable));
  const ref = delta.id ?? `delta:${next.sequence}`;
  next.transformationHistoryRefs = [...(next.transformationHistoryRefs ?? []), ref];
  return next;
}

export function reconstruct(entries = [], seed = {}) {
  let fold = receivedGround(seed);
  for (const entry of entries) {
    if (entry?.schema === "EOFold@1") throw new TypeError("Fold snapshots are not append-log events");
    if (entry?.schema === "Observation@1") {
      fold = applyObservation(fold, entry);
      continue;
    }
    if (entry?.schema === "EOHyperedge@1") {
      const next = copyFold(fold);
      next.graphEntries = upsertManyById(next.graphEntries ?? [], [entry]);
      fold = next;
      continue;
    }
    if (entry?.schema === "DeltaFold@1") fold = applyDelta(fold, entry);
  }
  return fold;
}
