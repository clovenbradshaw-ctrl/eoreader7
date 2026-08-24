import test from "node:test";
import assert from "node:assert/strict";
import { receivedGround, eoOperation, deltaFold, applyDelta, applyObservation } from "../kernel/fold.js";

// upsertById/upsertManyById are not exported -- they are exercised here
// through applyDelta/applyObservation, the same way every real caller uses
// them. The concern under test: upsertById/upsertManyById cache each
// array's own id->position index and carry it forward in place across a
// sequential chain of upserts (rather than rebuilding by scanning the whole
// array on every call), which only pays off if the cache stays correct
// across BOTH pure appends AND in-place updates of an id that already
// exists, including when several updates to the SAME array happen inside
// one applyDelta call.

function obligationOp(id, extra = {}) {
  return eoOperation({ id: `op:${id}`, op: "DEF", grain: "Figure", witness: "w", payload: { action: "obligation", value: { schema: "EOObligation@1", id, status: "open", ...extra } } });
}

test("multiple obligations opened in ONE delta all land correctly, in order, none overwriting another", () => {
  let fold = receivedGround();
  const delta = deltaFold([obligationOp("o1"), obligationOp("o2"), obligationOp("o3")], { id: "delta:1" });
  fold = applyDelta(fold, delta);
  assert.deepEqual(fold.obligations.map((o) => o.id), ["o1", "o2", "o3"]);
});

test("revising an obligation already present updates it in place rather than duplicating it", () => {
  let fold = receivedGround();
  fold = applyDelta(fold, deltaFold([obligationOp("o1"), obligationOp("o2")], { id: "delta:1" }));
  const resolve = eoOperation({ id: "op:resolve", op: "DEF", grain: "Figure", witness: "w", payload: { action: "resolve-obligation", id: "o1", status: "resolved" } });
  fold = applyDelta(fold, deltaFold([resolve], { id: "delta:2" }));
  assert.equal(fold.obligations.length, 2);
  const o1 = fold.obligations.find((o) => o.id === "o1");
  const o2 = fold.obligations.find((o) => o.id === "o2");
  assert.equal(o1.status, "resolved");
  assert.equal(o2.status, "open");
});

test("a long sequential chain of appends and in-place revisions stays correct at every step", () => {
  let fold = receivedGround();
  const ids = Array.from({ length: 30 }, (_, i) => `task:${i}`);
  // Open all 30, one delta each (a fresh append every time).
  for (const id of ids) fold = applyDelta(fold, deltaFold([obligationOp(id)], { id: `open:${id}` }));
  assert.equal(fold.obligations.length, 30);
  assert.deepEqual(fold.obligations.map((o) => o.id), ids);

  // Resolve every third one (an in-place update, not an append).
  for (let i = 0; i < ids.length; i += 3) {
    const resolve = eoOperation({ id: `op:resolve:${i}`, op: "DEF", grain: "Figure", witness: "w", payload: { action: "resolve-obligation", id: ids[i], status: "resolved" } });
    fold = applyDelta(fold, deltaFold([resolve], { id: `resolve:${i}` }));
  }
  assert.equal(fold.obligations.length, 30, "resolving in place must never change the count");
  for (let i = 0; i < ids.length; i += 1) {
    const status = fold.obligations[i].status;
    assert.equal(status, i % 3 === 0 ? "resolved" : "open", `obligation ${i} (${ids[i]})`);
  }
});

test("witnessed observations upsert by id the same way across many sequential applyObservation calls", () => {
  let fold = receivedGround();
  const obs = (id) => ({ schema: "Observation@1", id, witness: `text ${id}`, anchor: { start: 0, end: 1 }, distinctions: [], hyperedges: [], graphEntries: [] });
  for (let i = 0; i < 20; i += 1) fold = applyObservation(fold, obs(`obs:${i}`));
  assert.equal(fold.witnessed.length, 20);
  // Re-applying the SAME observation id again must update in place, not append.
  fold = applyObservation(fold, obs("obs:5"));
  assert.equal(fold.witnessed.length, 20);
  assert.equal(fold.witnessed.find((o) => o.id === "obs:5").witness, "text obs:5");
});
