// revision-volatility.test.js — kernel/revision-volatility.js pinned on stores
// built by corroboration.js's REAL acts (signProvisionalKind, falsifyOccurrence,
// supersedeLesson), never by a hand-shaped stand-in (2026-09-25). Falsifiers,
// each named for why it could be wrong:
//   1. not deterministic under a fixed rng.
//   2. equal exposure: the entry carrying every revision is not the more
//      volatile one — could be wrong if the deal ignored the observed marks.
//   3. exposure not honoured: a node revised twice in two sightings must be
//      more volatile above chance than one revised five times in fifty —
//      could be wrong if the null dealt marks per ENTRY instead of per
//      occurrence.
//   4. a node never seen given a p (there is no chance model for it); a store
//      with no revisions giving anything but p = 1. THIS is the falsifier that
//      caught the first draft: it read corroboration.js's `revision` counter,
//      which every sighting bumps too, so a store with no revisions came out
//      volatile. The statistic is the marks on the occurrences, not the counter.
//   5. volatilityOf not answering by name.
import test from "node:test";
import assert from "node:assert/strict";
import { signProvisionalKind, falsifyOccurrence, supersedeLesson, occurrenceKey } from "../kernel/corroboration.js";
import { revisionVolatility, volatilityOf, CELL } from "../kernel/revision-volatility.js";
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

function storeWith(spec) {
  // spec: { name: { seen: n, revised: k } } — n distinct sources signed, then
  // k revisions: alternating supersede / falsify, one per occurrence.
  const store = { concepts: {} };
  for (const [name, { seen, revised }] of Object.entries(spec)) {
    for (let i = 0; i < seen; i++) signProvisionalKind(store, { name, source: `${name}-src${i}`, at: i });
    for (let k = 0; k < revised; k++) {
      const id = occurrenceKey(name, `${name}-src${k % seen}`, null);
      if (k % 2 === 0) supersedeLesson(store, name, id, { text: `lesson ${k}` });
      else falsifyOccurrence(store, name, id, { by: "test", reason: "r" });
    }
  }
  return store;
}

test("the cell is stamped and domain-legal: EVA at Figure grain lands on Lens", () => {
  const cell = cellOf(CELL.op, CELL.grain);
  assert.equal(cell.terrain, "Lens");
});

test("1. deterministic under a fixed rng", () => {
  const store = storeWith({ a: { seen: 5, revised: 3 }, b: { seen: 5, revised: 0 } });
  assert.deepEqual(revisionVolatility(store, { trials: 40, rng: mulberry32(4) }), revisionVolatility(store, { trials: 40, rng: mulberry32(4) }));
});

test("2. equal exposure: the entry carrying every revision is the volatile one, ranked first", () => {
  const store = storeWith({ steady: { seen: 8, revised: 0 }, shaky: { seen: 8, revised: 8 } });
  const v = revisionVolatility(store, { trials: 400, rng: mulberry32(8) });
  const by = Object.fromEntries(v.entries.map((e) => [e.name, e]));
  assert.ok(by.shaky.p < 0.05, `shaky p ${by.shaky.p}`);
  assert.equal(by.steady.p, 1, "a node revised zero times is at least as steady as chance every time");
  assert.equal(v.entries[0].name, "shaky");
  assert.equal(by.shaky.rank, 1);
  assert.equal(by.shaky.marks, 8, "the marks are corroboration.js's own falsified/superseded flags");
  assert.equal(by.shaky.revision, store.concepts.shaky.revision, "the raw counter is reported beside them, not used");
  assert.ok(store.concepts.shaky.revision > 8, "the counter counts sightings too — which is why it is not the statistic");
});

test("3. exposure is honoured: twice-revised-in-two is more volatile above chance than five-revised-in-fifty", () => {
  const store = storeWith({ young: { seen: 2, revised: 2 }, old: { seen: 50, revised: 5 } });
  const v = revisionVolatility(store, { trials: 400, rng: mulberry32(21) });
  const by = Object.fromEntries(v.entries.map((e) => [e.name, e]));
  assert.ok(by.young.p < by.old.p, `young ${by.young.p} should be below old ${by.old.p}`);
  assert.ok(by.old.expected > by.young.expected, "expected marks follow exposure");
});

test("4. no occurrences → no p; no revisions anywhere → every p is 1", () => {
  const store = storeWith({ a: { seen: 3, revised: 0 }, b: { seen: 2, revised: 0 } });
  store.concepts.ghost = { status: "provisional", revision: 0, occurrences: [], items: [] };
  const v = revisionVolatility(store, { trials: 30, rng: mulberry32(1) });
  const by = Object.fromEntries(v.entries.map((e) => [e.name, e]));
  assert.equal(by.ghost.p, null);
  assert.equal(by.ghost.rank, null);
  assert.equal(by.a.p, 1);
  assert.equal(by.b.p, 1);
  assert.equal(v.total, 0);
  assert.ok(store.concepts.a.revision === 3, "the counter says 3 for a node never revised — the falsifier that caught the first draft");
});

test("5. volatilityOf answers by name, null for a stranger", () => {
  const store = storeWith({ a: { seen: 4, revised: 3 } });
  const f = volatilityOf(revisionVolatility(store, { trials: 30, rng: mulberry32(2) }));
  assert.equal(typeof f("a"), "number");
  assert.equal(f("nobody"), null);
});
