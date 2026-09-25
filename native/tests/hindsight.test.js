// hindsight.test.js — kernel/hindsight.js and the-fold/hindsight-log.js pinned
// on a constructed log shaped exactly like recursive.js's records (2026-09-25).
// Falsifiers, each named for why it could be wrong:
//   1. an entry AFTER the event surfacing as hindsight (it was drafted knowing).
//   2. a direct hit missed, or a non-referring entry included.
//   3. a dependent derived from a direct hit not reached through the index at
//      depth 1; a dependent sitting after the event reached anyway.
//   4. the log mutated by the walk (the append-only law).
//   5. the null: touching the most-referred being not ranking near 1.0;
//      touching a being nobody referred to not ranking near 0.0.
//   6. not deterministic under a fixed rng.
//   7. the adapter: merge/reassignment fields misread; a non-event not refused.
import test from "node:test";
import assert from "node:assert/strict";
import { dependentsIndex } from "../kernel/cascade.js";
import { hindsight, CELL } from "../kernel/hindsight.js";
import { touchedByEvent, referentRefsOf, identityEvents, hindsightFromLog } from "../the-fold/hindsight-log.js";
import { cellOf } from "../kernel/cube.js";

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A log in recursive.js's own shapes: beings, mentions, one merge, then more.
const mention = (id, referent, seq) => ({ schema: "EOMention@1", id, referent, encounterRef: `encounter:${seq}`, anchor: { start: seq * 10, end: seq * 10 + 5 }, witness: `${id}|wit`, source: "cp.txt" });
function log() {
  return [
    { schema: "EOReferent@1", id: "ref:luzhin", surfaces: ["Mr Luzhin"], provenance: [] },        // 0
    { schema: "EOReferent@1", id: "ref:pyotr", surfaces: ["Pyotr Petrovitch"], provenance: [] }, // 1
    { schema: "EOReferent@1", id: "ref:sonia", surfaces: ["Sonia"], provenance: [] },            // 2
    mention("m1", "ref:pyotr", 1),                                                                  // 3
    mention("m2", "ref:sonia", 2),                                                                  // 4
    mention("m3", "ref:luzhin", 3),                                                                 // 5
    mention("m4", "ref:sonia", 4),                                                                  // 6
    { schema: "EOReferentMerge@1", id: "merge1", kept: "ref:luzhin", folded: ["ref:pyotr"], witness: "Mr Luzhin", encounterRef: "encounter:5", provenance: { giver: "surfaces/discoverReferents", tier: "engine", basis: "containment" } }, // 7
    mention("m5", "ref:luzhin", 6),                                                                 // 8 — after: drafted knowing
    { schema: "EOReferentReassignment@1", id: "re1", from: "ref:sonia", to: "ref:sofya", surface: "Sonia", encounterRef: "encounter:7", provenance: { giver: "surfaces/discoverReferents", tier: "engine", basis: "reassign" } }, // 9
  ];
}

test("the cell is stamped and domain-legal: SEG at Pattern grain lands on Network", () => {
  assert.equal(cellOf(CELL.op, CELL.grain).terrain, "Network");
});

test("1+2. direct hindsight of the merge: the mentions of the kept and folded beings before it, nothing after, nothing else", () => {
  const entries = log();
  const r = hindsightFromLog(entries, 7, { trials: 20, rng: mulberry32(1) });
  assert.deepEqual(r.touched, ["ref:luzhin", "ref:pyotr"]);
  assert.deepEqual(r.rows.map((x) => x.id), ["m3", "m1", "ref:pyotr", "ref:luzhin"], "nearest the event first at depth 0: m3 (distance 2), m1 (4), then the beings' own entries");
  assert.deepEqual(r.rows.map((x) => x.distance), [2, 4, 6, 7]);
  assert.ok(!r.rows.some((x) => x.id === "m5"), "m5 sits after the merge — drafted knowing");
  assert.ok(!r.rows.some((x) => x.id === "m2" || x.id === "m4"), "Sonia's mentions do not rest on the merged beings");
  assert.equal(r.reached, 4);
  assert.match(r.basis, /Nothing rewritten/);
});

test("3. through a dependents index, what was derived from a direct hit is reached at depth 1 — unless it sits after the event", () => {
  const entries = log();
  const derived = [{ id: "d-before", deps: ["m1"] }, { id: "d-after", deps: ["m3"] }];
  // d-before is on the log before the merge; d-after is on the log after it.
  entries.splice(6, 0, { schema: "Derived@1", id: "d-before", premises: ["m1"] }); // now index 6; the merge moves to 8
  entries.push({ schema: "Derived@1", id: "d-after", premises: ["m3"] });
  const index = dependentsIndex(derived, (d) => d.deps);
  const r = hindsightFromLog(entries, 8, { index, trials: 20, rng: mulberry32(2) });
  const row = r.rows.find((x) => x.id === "d-before");
  assert.ok(row, "the pre-event derivation is hindsight");
  assert.equal(row.depth, 1);
  assert.equal(row.cascadedFrom, "m1");
  assert.ok(!r.rows.some((x) => x.id === "d-after"), "a derivation after the event was drafted knowing");
  assert.ok(r.rows.every((x, i, a) => i === 0 || a[i - 1].depth <= x.depth), "depth ascending");
});

test("4. the log is never mutated", () => {
  const entries = log();
  const before = JSON.stringify(entries);
  hindsightFromLog(entries, 7, { trials: 30, rng: mulberry32(3) });
  hindsightFromLog(entries, 9, { trials: 30, rng: mulberry32(3) });
  assert.equal(JSON.stringify(entries), before);
});

test("5. the null: a merge touching the most-referred being ranks near 1.0; an event touching a being nobody referred to ranks near 0.0", () => {
  // many mentions of X, one each of nine others; then an event on X vs one on a stranger.
  const entries = [];
  for (let i = 0; i < 30; i++) entries.push(mention(`x${i}`, "ref:X", i));
  for (let i = 0; i < 9; i++) entries.push(mention(`o${i}`, `ref:O${i}`, 30 + i));
  const onX = hindsight(entries, entries.length, { touched: ["ref:X"], refsOf: referentRefsOf, trials: 200, rng: mulberry32(5) });
  assert.equal(onX.reached, 30);
  assert.ok(onX.rank > 0.95, `rank ${onX.rank}`);
  const stranger = hindsight(entries, entries.length, { touched: ["ref:NOBODY"], refsOf: referentRefsOf, trials: 200, rng: mulberry32(5) });
  assert.equal(stranger.reached, 0);
  assert.ok(stranger.rank < 0.05, `rank ${stranger.rank}`);
  assert.equal(hindsight(entries, 3, { touched: [], refsOf: referentRefsOf }).gap, "nothing_touched");
});

test("6. deterministic under a fixed rng", () => {
  const entries = log();
  assert.deepEqual(hindsightFromLog(entries, 7, { trials: 25, rng: mulberry32(7) }), hindsightFromLog(entries, 7, { trials: 25, rng: mulberry32(7) }));
});

test("7. the adapter reads recursive.js's own fields and refuses a non-event, typed", () => {
  const entries = log();
  assert.deepEqual(touchedByEvent(entries[7]), ["ref:luzhin", "ref:pyotr"]);
  assert.deepEqual(touchedByEvent(entries[9]), ["ref:sonia", "ref:sofya"]);
  assert.equal(touchedByEvent(entries[3]), null);
  assert.deepEqual(referentRefsOf(entries[3]), ["ref:pyotr"]);
  assert.deepEqual(referentRefsOf(entries[0]), ["ref:luzhin"]);
  assert.deepEqual(identityEvents(entries).map((e) => e.index), [7, 9]);
  assert.equal(hindsightFromLog(entries, 3).gap, "not_an_identity_event");
  const re = hindsightFromLog(entries, 9, { trials: 10, rng: mulberry32(1) });
  assert.deepEqual(re.rows.map((x) => x.id), ["m4", "m2", "ref:sonia"], "the reassignment's hindsight is Sonia's record before it, nearest first");
});
