// The hypothesis list, maintained (2026-09-07): the incremental path and the
// fresh-array compute path are pinned equal; the memo is versioned by group
// length, not array identity; the frozen output is the same array while
// nothing changed.
import test from "node:test";
import assert from "node:assert/strict";
import { receivedGround, applyObservation } from "../kernel/fold.js";
import { descriptorHypotheses, descriptorHypothesesWith } from "../adapters/text/individuation.js";

const T = { transient: true };
const occ = (i, surface, enc, det = "definite") => ({ schema: "EOReferentOccurrence@1", id: `ref-occ:${enc}:${i}:${surface.replace(/\s/g, "_")}`, surface, canonicalSurface: surface, exactSurface: surface, determination: det, role: null, encounterRef: `encounter:${enc}`, edge: null, relation: null, standing: "unresolved_identity" });
const obs = (i, entries) => Object.freeze({ schema: "Observation@1", id: `obs:${i}`, witness: "w", anchor: null, distinctions: [], hyperedges: Object.freeze([]), graphEntries: Object.freeze(entries), provenance: {} });
const SURFACES = ["the prince", "the count", "the door", "the old man", "the room", "the letter", "the servant", "the sun"];
// A deterministic stream: each sentence carries one or two descriptors, some recurring across encounters, some new.
const stream = (n) => Array.from({ length: n }, (_, i) => [occ(i, SURFACES[i % SURFACES.length], i), ...(i % 3 === 0 ? [occ(i + 1000, SURFACES[(i * 7) % SURFACES.length], i)] : [])]);
const ids = (hs) => hs.map((h) => [h.id, h.occurrenceRefs.length, h.encounterRefs.length]);

test("INCREMENTAL == FRESH COMPUTE at every step, with and without this sentence's extras", () => {
  let fold = receivedGround();
  const all = [];
  for (const [i, entries] of stream(40).entries()) {
    const incremental = descriptorHypothesesWith(fold.graphEntries, entries);
    const reference = descriptorHypothesesWith([...fold.graphEntries, ...entries], []); // a fresh array: the compute path
    assert.deepEqual(ids(incremental), ids(reference), `step ${i} with extras`);
    fold = applyObservation(fold, obs(i, entries), T);
    all.push(...entries);
    assert.deepEqual(ids(descriptorHypotheses(fold.graphEntries)), ids(descriptorHypotheses([...all])), `step ${i} fold-only`);
  }
});

test("the memo is versioned by group LENGTH: a group grown in place by a delta yields a hypothesis with the new occurrence, not the old array's answer", () => {
  let fold = applyObservation(receivedGround(), obs(0, [occ(0, "the prince", 0)]), T);
  fold = applyObservation(fold, obs(1, [occ(1, "the prince", 1)]), T);
  const a = descriptorHypotheses(fold.graphEntries).find((h) => h.surface === "the prince");
  assert.equal(a.occurrenceRefs.length, 2);
  fold = applyObservation(fold, obs(2, [occ(2, "the prince", 2)]), T);
  const b = descriptorHypotheses(fold.graphEntries).find((h) => h.surface === "the prince");
  assert.equal(b.occurrenceRefs.length, 3, "the same group array, one longer — a memo keyed on identity alone would have answered 2");
});

test("the frozen output is the SAME array while nothing changed, and a new array when something did", () => {
  let fold = applyObservation(receivedGround(), obs(0, [occ(0, "the prince", 0), occ(1, "the prince", 1)]), T);
  const a = descriptorHypotheses(fold.graphEntries);
  const b = descriptorHypotheses(fold.graphEntries);
  assert.equal(a, b);
  fold = applyObservation(fold, obs(1, [occ(2, "the door", 2)]), T); // a singleton: no new hypothesis, but the state changed
  const c = descriptorHypotheses(fold.graphEntries);
  assert.deepEqual(ids(c), ids(a));
  fold = applyObservation(fold, obs(2, [occ(3, "the door", 3)]), T); // now a hypothesis
  const d = descriptorHypotheses(fold.graphEntries);
  assert.notEqual(d, c);
  assert.deepEqual(d.map((h) => h.surface), ["the prince", "the door"], "first-occurrence order");
});

test("ORDER: fold-known surfaces in first-occurrence order, new-only surfaces appended in arrival order — a touched fold-known surface takes its own position, not the end", () => {
  let fold = receivedGround();
  fold = applyObservation(fold, obs(0, [occ(0, "the room", 0), occ(1, "the sun", 0), occ(2, "the door", 0)]), T);
  fold = applyObservation(fold, obs(1, [occ(3, "the sun", 1)]), T); // the sun qualifies first
  fold = applyObservation(fold, obs(2, [occ(4, "the door", 2)]), T); // then the door
  const extras = [occ(5, "the letter", 3), occ(6, "the room", 3), occ(7, "the letter", 4)];
  const out = descriptorHypothesesWith(fold.graphEntries, extras);
  // the room was first in the fold (order 0), so it leads; the letter is new-only and comes last
  assert.deepEqual(out.map((h) => h.surface), ["the room", "the sun", "the door", "the letter"]);
  assert.deepEqual(descriptorHypothesesWith([...fold.graphEntries, ...extras], []).map((h) => h.surface), ["the room", "the sun", "the door", "the letter"], "and the fresh-array path agrees");
});

test("an occurrence UPDATE is replaced in place and its group's hypothesis recomputed — the memo is bypassed for that group", () => {
  let fold = applyObservation(receivedGround(), obs(0, [occ(0, "the prince", 0), occ(1, "the prince", 1)]), T);
  const a = descriptorHypotheses(fold.graphEntries).find((h) => h.surface === "the prince");
  assert.equal(a.relationContexts[0].edge, null);
  const target = fold.graphEntries.find((g) => g.id === "ref-occ:0:0:the_prince");
  fold = applyObservation(fold, obs(1, [{ ...target, edge: "edge:1", relation: "carried", role: "actor" }]), T);
  const b = descriptorHypotheses(fold.graphEntries).find((h) => h.surface === "the prince");
  assert.equal(b.relationContexts[0].edge, "edge:1", "the update reached the hypothesis — a memo keyed on the same-length group alone would have answered null");
  assert.deepEqual(ids(descriptorHypotheses(fold.graphEntries)), ids(descriptorHypotheses([...fold.graphEntries])), "and equals the fresh compute");
});

test("changedOnly ADMITS EXACTLY WHAT THE FULL LIST WOULD, in the same order, at every step — including a seeded state that was never offered", () => {
  // Simulate revision.js: admit hypotheses whose ids are not yet known, in the order returned.
  const admitFrom = (list, known) => { const out = []; for (const h of list) { if (known.has(h.id)) continue; known.add(h.id); out.push(h.id); } return out; };
  // A seeded fold: groups that already qualify but were never offered to anyone.
  let fold = receivedGround({ graphEntries: [occ(900, "the sun", 900), occ(901, "the sun", 901), occ(902, "the room", 902)] });
  const knownFull = new Set(), knownChanged = new Set();
  let foldFull = fold; // the same chain read two ways: the full list is computed on a fresh array (the compute path, no state shared)
  for (const [i, entries] of stream(60).entries()) {
    const full = descriptorHypothesesWith([...fold.graphEntries], entries);
    const changed = descriptorHypothesesWith(fold.graphEntries, entries, { changedOnly: true });
    assert.deepEqual(admitFrom(changed, knownChanged), admitFrom(full, knownFull), `step ${i}: the same admissions, in the same order`);
    fold = applyObservation(fold, obs(i, entries), T);
  }
  assert.ok(knownChanged.has("identity:descriptor:the_sun"), "the seeded, never-offered hypothesis was admitted at the first ask");
  assert.ok(knownChanged.size >= 6, `the stream produced hypotheses to admit (${knownChanged.size})`);
});

test("changedOnly OFFERS WHAT A DELTA GREW without extras — an occurrence that entered through the observation's own entries, never as an extra (the hole the 60 KB gate found)", () => {
  const admitFrom = (list, known) => { const out = []; for (const h of list) { if (known.has(h.id)) continue; known.add(h.id); out.push(h.id); } return out; };
  let fold = applyObservation(receivedGround(), obs(0, [occ(0, "the door", 0)]), T);
  const known = new Set();
  assert.deepEqual(admitFrom(descriptorHypothesesWith(fold.graphEntries, [], { changedOnly: true }), known), [], "a singleton: nothing yet");
  // The second occurrence arrives in an observation's graphEntries and is folded by a delta — never offered as an extra.
  fold = applyObservation(fold, obs(1, [occ(1, "the door", 1)]), T);
  assert.deepEqual(admitFrom(descriptorHypothesesWith(fold.graphEntries, [], { changedOnly: true }), known), ["identity:descriptor:the_door"], "offered at the next ask, from `pending`");
  assert.deepEqual(descriptorHypothesesWith(fold.graphEntries, [], { changedOnly: true }), [], "and not again");
});
