// P166 — the tip is extended in place; the log is what is immutable.
//
// `upsertManyById` copied the whole array on every call (~20.5M slots on a
// 240 KB read) and the delta record pointed backward, so the tip held every
// intermediate array alive: O(n²) resident, not only O(n²) copied. On the
// full book the old code died at an 8 GB heap after 300 s. These tests pin
// the invariant that replaces the copy, and pin it STRUCTURALLY — array
// identity, not timing — because a performance regression is invisible to
// every correctness check in this tree (a chain view once hit 0 of 3,392).
import test from "node:test";
import assert from "node:assert/strict";
import { receivedGround, applyObservation, applyDelta, deltaFold, eoOperation, reconstruct, isOwned, idSetOf, entriesBySchema, chainView } from "../kernel/fold.js";
import { createRecursiveReader, encounter } from "../kernel/reading.js";

const mention = (i, k = 0) => ({ schema: "EOMention@1", id: `m:${i}:${k}`, surface: `s${i}` });
const obs = (i, n = 3) => Object.freeze({ schema: "Observation@1", id: `obs:${i}`, witness: "w", anchor: null, distinctions: [], hyperedges: Object.freeze([]), graphEntries: Object.freeze(Array.from({ length: n }, (_, k) => mention(i, k))), provenance: {} });
const ids = (list) => list.map((e) => e.id);
const T = { transient: true };
const delta = (seq) => deltaFold([eoOperation({ id: `op:${seq}`, op: "SIG", grain: "Figure", witness: "w", payload: { action: "expectation", value: { id: `exp:${seq}`, schema: "EOExpectation@1" } } })], { id: `delta:${seq}` });

test("a seed's own array is never mutated — a foreign array is copied once, and the copy is what the fold owns", () => {
  const seed = { graphEntries: [mention("seed")] };
  const f0 = receivedGround(seed);
  const f1 = applyObservation(f0, obs(1), T);
  assert.equal(seed.graphEntries.length, 1, "the caller's array is untouched");
  assert.notEqual(f1.graphEntries, seed.graphEntries, "copied, not shared with the caller");
  assert.equal(isOwned(seed.graphEntries), false);
  assert.equal(isOwned(f1.graphEntries), true, "the copy is owned from then on");
  assert.deepEqual(ids(f1.graphEntries), ["m:seed:0", "m:1:0", "m:1:1", "m:1:2"]);
});

test("BY DEFAULT THE FUNCTIONS ARE PURE — the earlier fold still remembers the earlier reading (identity-revision's own requirement)", () => {
  const f0 = applyObservation(receivedGround(), obs(0));
  const f1 = applyObservation(f0, obs(1));
  assert.notEqual(f1.graphEntries, f0.graphEntries, "a pure call copies");
  assert.equal(isOwned(f1.graphEntries), false, "and the copy is not owned — no later transient call may mutate it");
  const revised = Object.freeze({ schema: "Observation@1", id: "obs:r", witness: "w", anchor: null, distinctions: [], hyperedges: Object.freeze([]), graphEntries: Object.freeze([{ ...mention(0, 0), surface: "REVISED" }]), provenance: {} });
  const f2 = applyObservation(f1, revised);
  assert.equal(f1.graphEntries[0].surface, "s0", "the earlier fold is exactly as it was");
  assert.equal(f2.graphEntries[0].surface, "REVISED");
  // A transient step on a pure result copies once and owns the copy — the pure result itself is never touched.
  const f3 = applyObservation(f2, obs(3), T);
  assert.notEqual(f3.graphEntries, f2.graphEntries);
  assert.equal(f2.graphEntries.length, 6);
  assert.equal(isOwned(f3.graphEntries), true);
  const f4 = applyObservation(f3, obs(4), T);
  assert.equal(f4.graphEntries, f3.graphEntries, "from then on, the tip");
});

test("THE TIP IS EXTENDED IN PLACE: along the reader's linear chain the array identity never changes", () => {
  let fold = applyObservation(receivedGround(), obs(0), T);
  const tip = fold.graphEntries;
  for (let i = 1; i <= 500; i += 1) {
    fold = applyObservation(fold, obs(i), T);
    fold = applyDelta(fold, delta(fold.sequence), T);
    assert.equal(fold.graphEntries, tip, `step ${i}: same array — zero copies is a structural fact, not a timing`);
  }
  assert.equal(fold.graphEntries.length, 501 * 3 + 500, "3 mentions per observation + 1 expectation per delta");
  assert.equal(fold.transformationHistoryRefs.length, 500);
  assert.equal(fold.transformationObjects.length, 500);
  assert.equal(isOwned(fold.transformationHistoryRefs), true, "the refs list stopped being copied whole per step too");
});

test("a frozen owned array falls back to the copy — the invariant is 'may extend', never 'must'", () => {
  let fold = applyObservation(receivedGround(), obs(0), T);
  fold = applyObservation(fold, obs(1), T);
  const frozen = fold.graphEntries;
  Object.freeze(frozen);
  const before = frozen.length;
  const next = applyObservation(fold, obs(2), T);
  assert.notEqual(next.graphEntries, frozen);
  assert.equal(frozen.length, before, "the frozen array is exactly as it was");
  assert.equal(isOwned(frozen), false);
  assert.equal(isOwned(next.graphEntries), true);
  assert.deepEqual(ids(next.graphEntries), [...ids(frozen), "m:2:0", "m:2:1", "m:2:2"]);
});

test("an UPDATE replaces in place at its position and the id index does not shift", () => {
  let fold = applyObservation(receivedGround(), obs(0), T);
  fold = applyObservation(fold, obs(1), T);
  const at = fold.graphEntries.findIndex((e) => e.id === "m:0:1");
  const revised = Object.freeze({ schema: "Observation@1", id: "obs:r", witness: "w", anchor: null, distinctions: [], hyperedges: Object.freeze([]), graphEntries: Object.freeze([{ ...mention(0, 1), surface: "REVISED" }]), provenance: {} });
  const next = applyObservation(fold, revised, T);
  assert.equal(next.graphEntries, fold.graphEntries, "still the tip");
  assert.equal(next.graphEntries[at].surface, "REVISED");
  assert.equal(next.graphEntries.length, 6, "an update appends nothing");
});

test("chainView is EXACT along the chain — and the fold path is the one taken, not a recompute wearing a hit", () => {
  const S = "EOMention@1";
  let fold = applyObservation(receivedGround(), obs(0), T);
  let view = entriesBySchema(fold.graphEntries, S);
  for (let i = 1; i <= 200; i += 1) {
    fold = applyObservation(fold, obs(i), T);
    fold = applyDelta(fold, delta(fold.sequence), T);
    const next = entriesBySchema(fold.graphEntries, S);
    assert.equal(next, view, `step ${i}: folded in place — a from-scratch compute would be a NEW array (the measured hit)`);
    assert.deepEqual(ids(next), ids(fold.graphEntries.filter((e) => e.schema === S)), `step ${i}: exact`);
    assert.deepEqual([...idSetOf(fold.graphEntries)].sort(), ids(fold.graphEntries).sort(), `step ${i}: the id set is exact`);
    view = next;
  }
  // An update touching the view's schema demands the recompute path — exactness first.
  const revised = Object.freeze({ schema: "Observation@1", id: "obs:r", witness: "w", anchor: null, distinctions: [], hyperedges: Object.freeze([]), graphEntries: Object.freeze([{ ...mention(7, 0), surface: "REVISED" }]), provenance: {} });
  fold = applyObservation(fold, revised, T);
  const after = entriesBySchema(fold.graphEntries, S);
  assert.notEqual(after, view, "an update to the schema forced a recompute");
  assert.deepEqual(after, fold.graphEntries.filter((e) => e.schema === S));
  assert.equal(after.find((e) => e.id === "m:7:0").surface, "REVISED");
});

test("chainView across a COPY recomputes from scratch and is exact; a view over a foreign array is memoized", () => {
  const count = { compute: 0 };
  const view = chainView((xs) => { count.compute += 1; return xs.filter((e) => e.schema === "EOMention@1").length; }, (n, d) => n + d.appended.filter((e) => e.schema === "EOMention@1").length);
  let fold = applyObservation(receivedGround(), obs(0), T);
  assert.equal(view(fold.graphEntries), 3); assert.equal(count.compute, 1);
  fold = applyObservation(fold, obs(1), T);
  assert.equal(view(fold.graphEntries), 6); assert.equal(count.compute, 1, "folded forward, not recomputed");
  Object.freeze(fold.graphEntries);
  const branched = applyObservation(fold, obs(2), T);
  assert.equal(view(branched.graphEntries), 9); assert.equal(count.compute, 2, "a copy is a new array: from scratch, once");
  assert.equal(view(branched.graphEntries), 9); assert.equal(count.compute, 2, "then memoized");
  const foreign = [mention("f")];
  assert.equal(view(foreign), 1); assert.equal(view(foreign), 1); assert.equal(count.compute, 3, "a foreign array is computed once and memoized — it is assumed immutable, as before");
});

test("A SUPERSEDED TURN'S FOLD IS THAT TURN'S FOLD — the log's projection at its seq, not the tip's arrays", async () => {
  const reader = createRecursiveReader({
    adapters: {
      perceive: async (enc) => [{ id: `cand:${enc.i}`, evidence: "e", graphEntries: [mention(enc.i)], hyperedges: [] }],
      witness: async (enc, cands) => cands.map((c) => Object.freeze({ schema: "Observation@1", id: `obs:${enc.i}`, witness: "w", anchor: null, distinctions: [], hyperedges: Object.freeze([]), graphEntries: Object.freeze([...c.graphEntries]), provenance: {} })),
      revise: async ({ fold }) => delta(fold.sequence + 1),
      retrieve: (_f, ev) => Object.freeze({ schema: "EORelevantFold@1", witnessed: Object.freeze([...ev]), provisional: Object.freeze([]), expectations: Object.freeze([]), obligations: Object.freeze([]), exclusions: Object.freeze([]), unresolvedAlternatives: Object.freeze([]), activeFrames: Object.freeze([]), receivedPriors: Object.freeze([]) }),
    },
  });
  const turns = [], snap = [];
  for (let i = 0; i < 12; i += 1) {
    const turn = await reader.step(encounter({ i, sequencePosition: i, source: "t", modality: "text", anchor: null }));
    turns.push(turn);
    snap.push(ids(turn.fold.graphEntries)); // read NOW, while it is the tip
  }
  const live = reader.getFold();
  assert.equal(turns[11].fold, live, "the last turn's fold IS the tip — no reconstruction for the live fold");
  for (let i = 0; i < 11; i += 1) {
    const later = turns[i].fold; // read AFTER eleven more steps
    assert.deepEqual(ids(later.graphEntries), snap[i], `turn ${i}: what it showed then is what it shows now`);
    assert.notDeepEqual(ids(later.graphEntries), ids(live.graphEntries), `turn ${i}: and it is not the tip's arrays`);
    assert.equal(later.transformationHistoryRefs.length, i + 1);
    assert.equal(later.sequence, turns[i].deltaFold ? i + 1 : i);
  }
  // The projection is byte-identical to the live fold's state, and is its own array.
  const rebuilt = reconstruct(reader.getLog());
  assert.deepEqual(rebuilt.graphEntries, live.graphEntries);
  assert.notEqual(rebuilt.graphEntries, live.graphEntries, "a reconstruction owns its own arrays");
});
