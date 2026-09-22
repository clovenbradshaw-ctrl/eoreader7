// held-turns.mjs — A SLOW TURN IS HELD, NEVER PUNISHED (2026-09-22).
//
// The user: "Heimdall shouldn't punish us. It should just hold content as
// needed, creating a temporary cache for the requester." Before this, a turn
// that outlasted the deadline was aborted AND its model was dropped from the
// roster — measured live: one turn stuck reading 138K chars of web pages (the
// model never called) locked gemma2:2b out of a whole conversation.
//
// Now a turn runs to completion whatever the client does. Its result is held
// here, keyed by the requester and the exact request, so the same request
// again — or a poll of its receipt id — gets the finished answer instead of a
// second run. A failed turn is not held: asking again runs it again.
import crypto from "node:crypto";

export const HELD_SCHEMA = "EOHeldTurn@1";
// How long a finished answer waits for its requester. A cost (memory), not a
// judgment about the turn.
const HELD_TTL_MS = Number(process.env.ER7_HELD_TTL_MS ?? 15 * 60 * 1000);

const byKey = new Map();
const byId = new Map();

export function heldKey(requester, route, payload) {
  return crypto.createHash("sha1").update(`${requester}\n${route}\n${JSON.stringify(payload ?? null)}`).digest("hex");
}

function sweep(now = Date.now()) {
  for (const [key, e] of byKey) {
    if (e.status === "done" && now - e.doneAt > HELD_TTL_MS) { byKey.delete(key); byId.delete(e.id); }
  }
}

/** The held entry for this key, or null. A failed entry is forgotten so the
 *  next ask starts fresh. */
export function findHeld(key) {
  sweep();
  const e = byKey.get(key);
  if (e?.status === "failed") { byKey.delete(key); byId.delete(e.id); return null; }
  return e ?? null;
}

/** Start `run` under `key` and hold whatever it produces. `run` must not be
 *  tied to the client's socket: the turn finishes even if nobody is waiting. */
export function holdTurn(key, run, { requester = null } = {}) {
  const existing = findHeld(key);
  if (existing) return existing;
  const e = { id: `held-${crypto.randomUUID()}`, key, requester, status: "running", startedAt: Date.now(), doneAt: null, result: null, error: null, promise: null };
  e.promise = Promise.resolve().then(run).then(
    (result) => { e.status = "done"; e.result = result; e.doneAt = Date.now(); return result; },
    (err) => { e.status = "failed"; e.error = String(err?.message ?? err); e.doneAt = Date.now(); throw err; },
  );
  e.promise.catch(() => {}); // a held turn nobody awaits must not crash the process
  byKey.set(key, e);
  byId.set(e.id, e);
  return e;
}

export function heldById(id) {
  sweep();
  return byId.get(id) ?? null;
}

/** What a requester is told while the turn is still running. */
export function heldReceipt(e, { retryAfterS = 15 } = {}) {
  return {
    object: "er7.held",
    schema: HELD_SCHEMA,
    id: e.id,
    status: e.status,
    retry_after: retryAfterS,
    poll: `/v1/held/${e.id}`,
    elapsedS: Math.round((Date.now() - e.startedAt) / 1000),
    basis: "the turn is still running and is being held for you — send the same request again or poll this id; it will not run twice",
  };
}

/** Wait for the entry up to `ms`. Resolves { done: true, result } or
 *  { done: false }; rejects if the turn failed. */
export function awaitHeld(e, ms) {
  if (e.status === "done") return Promise.resolve({ done: true, result: e.result });
  let timer;
  return Promise.race([
    e.promise.then((result) => ({ done: true, result })),
    new Promise((resolve) => { timer = setTimeout(() => resolve({ done: false }), ms); }),
  ]).finally(() => clearTimeout(timer));
}

export const __heldTest = { reset() { byKey.clear(); byId.clear(); } };
