import { GRAINS, cellOf } from "./cube.js";

export const ENTRY_KINDS = Object.freeze({ PROPOSE: "propose", SUPERSEDE: "supersede", EVIDENCE: "evidence", RESULT: "result", RETRACT: "retract" });
export const OPERATOR_BASIS = Object.freeze({ PRODUCED: "produced", DERIVED: "derived", DECLARED: "declared", CONTESTED: "contested", ABSENT: "absent" });
export const OPERATOR_ORDER = Object.freeze(["NUL", "SEG", "SIG", "CON", "EVA", "DEF", "INS", "SYN", "REC"]);

export function createTaskLog({ admits = OPERATOR_ORDER } = {}) {
  if (!Array.isArray(admits) || !admits.length) throw new TypeError("createTaskLog: admits must be a non-empty array of operator codes");
  return Object.freeze({ entries: Object.freeze([]), nextSeq: 0, admits: Object.freeze([...admits]), _cache: freshProjectionCache() });
}

export function append(log, entry) {
  if (!entry || typeof entry !== "object") throw new TypeError("append requires an entry object");
  if (!Object.values(ENTRY_KINDS).includes(entry.kind)) throw new TypeError(`append: unknown entry kind ${JSON.stringify(entry.kind)}`);
  if (typeof entry.task_id !== "string" || !entry.task_id) throw new TypeError("append: every entry needs a task_id");
  const admits = log.admits ?? OPERATOR_ORDER;
  if (entry.operator != null && !admits.includes(entry.operator)) throw new TypeError(`append: ${JSON.stringify(entry.operator)} is not admitted by this log`);
  if (entry.operator != null && !Object.values(OPERATOR_BASIS).includes(entry.operator_basis)) throw new TypeError("append: an entry carrying an operator must state its operator_basis");
  if (entry.grain != null && !GRAINS.includes(entry.grain)) throw new TypeError(`append: invalid grain ${entry.grain}`);
  if (entry.grain != null && entry.operator == null) throw new TypeError("append: a grain was supplied without the operator that shares its cell");
  const sealed = Object.freeze({ ...entry, seq: log.nextSeq, depends_on: Object.freeze([...(entry.depends_on ?? [])]), evidence: Object.freeze([...(entry.evidence ?? [])]) });
  // The projection cache is a mutable side-structure, not part of the log's
  // own immutable snapshot -- Object.freeze is shallow, so sharing this one
  // reference forward across every append in a lineage is safe: it lets
  // projectTasks catch up from where it last left off instead of replaying
  // the whole log, for the ordinary case of one log appended to in sequence.
  // A log built by hand (no `_cache`) or two logs branching from a common
  // ancestor both still project correctly -- see projectTasks' own guard.
  return Object.freeze({ entries: Object.freeze([...log.entries, sealed]), nextSeq: log.nextSeq + 1, admits, _cache: log._cache ?? null });
}

function freshProjectionCache() {
  return { byId: new Map(), superseded: new Set(), retracted: new Set(), scannedCount: 0, lastSeen: undefined };
}

const RESERVED_TASK_KEYS = new Set(["kind", "task_id", "seq", "supersedes", "operator", "operator_basis", "grain", "description", "depends_on", "evidence", "result"]);

function foldEntryIntoCache(cache, e) {
  if (e.kind === ENTRY_KINDS.RETRACT) { cache.retracted.add(e.task_id); return; }
  if (e.supersedes) cache.superseded.add(e.supersedes);
  const prior = cache.byId.get(e.task_id) ?? { task_id: e.task_id, operator: null, operator_basis: OPERATOR_BASIS.ABSENT, operator_gap: "no structural act has been earned for this task yet", grain: null, grain_gap: "no grain has been earned for this task's operator yet", cell: null, description: null, depends_on: [], evidence: [], result: null, first_seq: e.seq };
  const payload = {}; for (const [key, value] of Object.entries(e)) if (!RESERVED_TASK_KEYS.has(key)) payload[key] = value;
  const nextOperator = e.operator ?? prior.operator;
  const nextGrain = e.grain ?? (e.operator != null ? null : prior.grain);
  cache.byId.set(e.task_id, { ...prior, ...payload, evidence: e.evidence?.length ? [...new Set([...prior.evidence, ...e.evidence])] : prior.evidence, result: e.kind === ENTRY_KINDS.RESULT ? e.result : prior.result, description: e.description ?? prior.description, depends_on: e.depends_on.length ? [...e.depends_on] : prior.depends_on, operator: nextOperator, operator_basis: e.operator != null ? e.operator_basis : prior.operator_basis, operator_gap: e.operator != null ? null : prior.operator_gap, grain: nextGrain, grain_gap: e.grain != null ? null : e.operator != null ? "no grain has been earned for this task's operator yet" : prior.grain_gap, cell: nextOperator != null && nextGrain != null ? cellOf(nextOperator, nextGrain) : null, last_seq: e.seq });
}

/**
 * Bring `log`'s shared cache up to date with `log.entries`, replaying only
 * the entries the cache has not seen yet. READING-POLICY's own A11 entry
 * names the general mistake this avoids: a reader that re-derives its whole
 * state from the complete history on every turn, instead of maintaining it
 * incrementally, is not slow, it is wrong. Self-healing: a log with no
 * cache, or one whose cache does not match a genuine append-only prefix of
 * THIS log's own entries (a hand-built log, or two logs that branched from
 * a shared ancestor), rebuilds from scratch rather than trusting stale or
 * foreign state -- correctness never depends on the cache being valid, only
 * speed does.
 */
function syncedCache(log) {
  const entries = log.entries ?? [];
  let cache = log._cache;
  const clean = cache && cache.scannedCount <= entries.length
    && (cache.scannedCount === 0 || entries[cache.scannedCount - 1] === cache.lastSeen);
  if (!clean) cache = freshProjectionCache();
  for (let i = cache.scannedCount; i < entries.length; i += 1) foldEntryIntoCache(cache, entries[i]);
  cache.scannedCount = entries.length;
  if (entries.length > 0) cache.lastSeen = entries[entries.length - 1];
  return cache;
}

export function projectTasks(log) {
  const cache = syncedCache(log);
  return [...cache.byId.values()].filter((t) => !cache.retracted.has(t.task_id) && !cache.superseded.has(t.task_id)).sort((a, b) => a.first_seq - b.first_seq);
}
