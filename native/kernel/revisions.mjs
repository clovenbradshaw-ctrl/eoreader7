// revisions.mjs — a provisional answer's promise to become the real one
// (2026-09-22, the SERVING-POLICY.md revisable contract, scoped to what the
// channel can honestly offer).
//
// When the channel serves a caller from a substitute mouth (the small
// mouth, a phone through the bridge, an online provider) because their own
// model's wait exceeded the promise, the ORIGINAL request is remembered
// here — never the substitute's. On the same periodic cadence that
// re-warms the small mouth, every pending revision is tried again against
// the model that was ACTUALLY ASKED FOR. The moment that model can answer
// inside the promise again, the upgrade is drawn and held for collection —
// the same held-turns shape (pending/done/failed, a receipt id, a TTL),
// applied to a draw nobody re-requested yet rather than one still running.
//
// Never automatic replacement: the provisional answer already went out and
// stands as what was said. The revision is OFFERED — collected by its id —
// never pushed over it.
//
// Scope, stated once so it is never overclaimed: this covers the CHANNEL's
// own raw-passthrough substitutions. It is not the full pipeline's own
// provisional/revisable contract (runProxyTurn's own draws have no tier
// ladder wired in yet) — that is a separate, larger piece, named but not
// built here.

import crypto from "node:crypto";

export const REVISION_SCHEMA = "EOHeimdallRevision@1";
const REVISION_TTL_MS = Number(process.env.ER7_REVISION_TTL_MS ?? 30 * 60 * 1000);
// Bounded, never unbounded memory: under real pressure a promise is not a
// leak — the OLDEST still-pending revision is dropped to make room, not the
// newest, so a caller who just asked has the longest to actually get it.
const MAX_PENDING = Number(process.env.ER7_REVISION_MAX_PENDING ?? 200);

const byId = new Map();

function sweep(now = Date.now()) {
  for (const [id, e] of byId) {
    if (e.status !== "pending" && now - (e.doneAt ?? e.createdAt) > REVISION_TTL_MS) byId.delete(id);
  }
}

/** A provisional answer went out — remember the ORIGINAL ask so it can be
 *  retried later against the model actually requested. `body` must be the
 *  request as it would be sent again (the original model, not the
 *  substitute's). Returns the entry (its `id` is the collectible receipt). */
export function recordProvisional({ requester, requestedModel, servedBy, tier, pathname, body, now = Date.now() }) {
  sweep(now);
  if (byId.size >= MAX_PENDING) {
    const oldestPending = [...byId.values()].filter((e) => e.status === "pending").sort((a, b) => a.createdAt - b.createdAt)[0];
    if (oldestPending) byId.delete(oldestPending.id);
  }
  const id = crypto.randomUUID();
  const entry = { id, requester, requestedModel, servedBy, tier, pathname, body, status: "pending", createdAt: now, doneAt: null, attempts: 0, result: null, error: null };
  byId.set(id, entry);
  return entry;
}

export function pendingRevisions() {
  return [...byId.values()].filter((e) => e.status === "pending");
}

/** The revision by id — requester-scoped, exactly like a held turn's
 *  receipt, so one caller can never read another's. */
export function getRevision(id, { requester = null } = {}) {
  sweep();
  const e = byId.get(id);
  if (!e) return null;
  if (requester != null && e.requester !== requester) return null;
  return e;
}
export function markAttempted(id) { const e = byId.get(id); if (e) e.attempts += 1; }
export function markDrawn(id, result, { now = Date.now() } = {}) { const e = byId.get(id); if (e) { e.status = "done"; e.result = result; e.doneAt = now; } return e; }
export function markFailed(id, error, { now = Date.now() } = {}) { const e = byId.get(id); if (e) { e.status = "failed"; e.error = String(error?.message ?? error ?? "revision failed"); e.doneAt = now; } return e; }

/** What a caller collecting a revision id is told. */
export function revisionReceipt(e) {
  if (e.status === "pending") return { object: "er7.revision", schema: REVISION_SCHEMA, id: e.id, status: "pending", requestedModel: e.requestedModel, servedBy: e.servedBy, attempts: e.attempts, basis: `waiting for ${e.requestedModel} to answer inside the promise; ask again later or poll this id` };
  if (e.status === "failed") return { object: "er7.revision", schema: REVISION_SCHEMA, id: e.id, status: "failed", requestedModel: e.requestedModel, error: e.error };
  return { object: "er7.revision", schema: REVISION_SCHEMA, id: e.id, status: "done", requestedModel: e.requestedModel, result: e.result };
}

export const __revisionsTest = { reset() { byId.clear(); }, all() { return [...byId.values()]; } };
