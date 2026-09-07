// The discourse projection's time term (2026-09-07): the slow branch fired on
// 42% of sentences (392 of 926 at 60 KB), not "twice in a novel"; each one
// spread a fresh array the chain view could only compute from scratch; the
// projection then walked every occurrence. These tests pin the three
// invariants that replace that, as STRUCTURE — a counted compute, an
// untouched state, and equality with the reference path — never as timing.
import test from "node:test";
import assert from "node:assert/strict";
import { receivedGround, applyObservation } from "../kernel/fold.js";
import { appositionalDescriptorBindings, projectDiscourseReferents, projectDiscourseReferentsWith, discourseStats } from "../adapters/text/discourse-referents.js";

const T = { transient: true };
const obs = (i, entries) => Object.freeze({ schema: "Observation@1", id: `obs:${i}`, witness: "w", anchor: null, distinctions: [], hyperedges: Object.freeze([]), graphEntries: Object.freeze(entries), provenance: {} });
// Real appositions, each producing two occurrences and a link — the only thing that makes a discourse referent.
const sentence = (i) => `the wretch—the miserable monster whom I had created, and the fiend—the daemon that haunted me; ${i}`;
const bindings = (i) => { const b = appositionalDescriptorBindings(sentence(i), { encounterRef: `enc:${i}`, witness: `w:${i}` }); return [...b.occurrences, ...b.links]; };
const ids = (refs) => refs.map((r) => [r.id, r.occurrenceRefs.length, r.supportRefs.length]);

test("ONE from-scratch compute across a chain where every sentence carries discourse extras", () => {
  let fold = applyObservation(receivedGround(), obs(0, bindings(0)), T);
  const before = discourseStats.computes;
  projectDiscourseReferentsWith(fold.graphEntries, []);
  const afterFirst = discourseStats.computes;
  assert.equal(afterFirst - before, 1, "the first look at a fresh chain computes once");
  for (let i = 1; i <= 60; i += 1) {
    const extras = bindings(i);
    const out = projectDiscourseReferentsWith(fold.graphEntries, extras); // the slow branch, every step
    assert.ok(out.length >= 2, `step ${i}: the layered projection sees this sentence's own appositions`);
    fold = applyObservation(fold, obs(i, extras), T);
  }
  assert.equal(discourseStats.computes, afterFirst, "sixty sentences with extras: zero further from-scratch computes — the layer, not a spread");
});

test("THE LAYER NEVER TOUCHES THE PERSISTENT STATE: projecting with extras leaves the fold's own projection exactly as it was", () => {
  let fold = applyObservation(receivedGround(), obs(0, bindings(0)), T);
  fold = applyObservation(fold, obs(1, bindings(1)), T);
  const own = projectDiscourseReferentsWith(fold.graphEntries, []);
  const layered = projectDiscourseReferentsWith(fold.graphEntries, bindings(2));
  assert.ok(layered.length > own.length || layered.some((r) => r.occurrenceRefs.length > 2), "the layer saw more than the fold holds");
  const ownAgain = projectDiscourseReferentsWith(fold.graphEntries, []);
  assert.deepEqual(ids(ownAgain), ids(own), "the persistent state was not written by the layer");
  assert.equal(ownAgain, own, "and the versioned memo still hits — nothing was mutated");
});

test("THE LAYERED PROJECTION EQUALS THE REFERENCE PATH — a from-scratch projection over the concatenation", () => {
  let fold = applyObservation(receivedGround(), obs(0, bindings(0)), T);
  for (let i = 1; i <= 12; i += 1) {
    const extras = bindings(i);
    const layered = projectDiscourseReferentsWith(fold.graphEntries, extras);
    const reference = projectDiscourseReferents([...fold.graphEntries, ...extras]); // a fresh array: the compute path, by construction
    assert.deepEqual(layered, reference, `step ${i}: byte-for-byte the reference projection`);
    fold = applyObservation(fold, obs(i, extras), T);
  }
});

test("the memo is versioned by the state, not by object identity: a delta that adds a link changes the projection the next time it is asked", () => {
  let fold = applyObservation(receivedGround(), obs(0, bindings(0)), T);
  const a = projectDiscourseReferentsWith(fold.graphEntries, []);
  fold = applyObservation(fold, obs(1, bindings(1)), T);
  const b = projectDiscourseReferentsWith(fold.graphEntries, []);
  assert.notEqual(b, a, "the same state object, folded forward, must not return the earlier projection");
  assert.deepEqual(b, projectDiscourseReferents([...fold.graphEntries]));
});

test("an occurrence UPDATE that keeps id, surface and canonicalSurface is swapped in place — no recompute — and equals the reference path", () => {
  let fold = applyObservation(receivedGround(), obs(0, bindings(0)), T);
  fold = applyObservation(fold, obs(1, bindings(1)), T);
  projectDiscourseReferentsWith(fold.graphEntries, []);
  const before = discourseStats.computes;
  const target = fold.graphEntries.find((g) => g.schema === "EOReferentOccurrence@1");
  const updated = Object.freeze({ ...target, edge: "edge:changed", relation: "changed" });
  fold = applyObservation(fold, obs(2, [updated]), T);
  const out = projectDiscourseReferentsWith(fold.graphEntries, []);
  assert.equal(discourseStats.computes, before, "swapped in place: the state was not rebuilt");
  assert.deepEqual(out, projectDiscourseReferents([...fold.graphEntries]), "and it is the reference projection");
  const afterReference = discourseStats.computes; // the reference call above is itself a from-scratch compute
  const moved = Object.freeze({ ...target, canonicalSurface: "somewhere else" });
  fold = applyObservation(fold, obs(3, [moved]), T);
  projectDiscourseReferentsWith(fold.graphEntries, []);
  assert.equal(discourseStats.computes, afterReference + 1, "a changed surface key still recomputes — exactness first");
});
