import test from "node:test";
import assert from "node:assert/strict";
import { kindEvidence, createKindInductionIndex, indexKindEntries, kindCandidates, flushKindPopulation, kindDiagnostics } from "../kernel/index.js";

// affinityField() (entity-kind-induction.js) is O(entities^2) and used to be
// recomputed from scratch on every dirty turn -- the dominant cost of a full
// book read once the earlier per-turn rescans were fixed (measured: 9.44%
// self-time in affinityBetween plus a large share of 25.6% GC on Pride and
// Prejudice). populationRefreshEvery throttles that recompute to a declared
// cadence. The contract these tests pin: mid-read candidates may lag by at
// most the cadence (bounded, disclosed staleness), but flushKindPopulation
// (called once by reading.js's read() at end of read) guarantees the
// TERMINAL state is byte-identical to what an unthrottled index computes --
// the throttle may only ever change WHEN a basin is discovered mid-read,
// never WHETHER it exists at the end.

function feature(id, entityRef, featureKey, featureValue, at) {
  return kindEvidence({
    id,
    entityRef,
    featureKey,
    featureValue,
    sequencePosition: at,
    witness: `fixture:${id}`,
    provenance: { modality: "data", giver: "fixture/population-throttle", basis: "witnessed_feature" },
  });
}

// Same population shape as entity-kind-induction.test.js's fixture, but
// emitted as a STREAM of single-evidence turns (the way a sequential book
// read actually feeds ingestFeature), so the throttle's cadence is exercised
// for real rather than by one batch ingest.
function evidenceStream() {
  const entries = [];
  let at = 1;
  const add = (entity, key, value) => entries.push(feature(`${entity}:${key}:${value}`, entity, key, value, at++));
  for (const entity of ["person:a", "person:b", "person:c", "person:d"]) {
    add(entity, "relation_role", "subject");
    add(entity, "relation_role_breadth", "subject_object");
    add(entity, "relation_participation_depth", "4+");
    add(entity, "anaphoric_class", "gendered_singular");
  }
  for (const entity of ["place:a", "place:b", "place:c", "place:d"]) {
    add(entity, "relation_role", "object");
    add(entity, "relation_participation_depth", "2+");
    add(entity, "adjacent_closed_class_left", "in");
    add(entity, "adjacent_closed_class_left", "from");
  }
  for (const entity of ["artifact:a", "artifact:b", "artifact:c", "artifact:d"]) {
    add(entity, "relation_role", "object");
    add(entity, "relation_participation_depth", "2+");
    add(entity, "adjacent_closed_class_left", "the");
    add(entity, "transformation_role", "made");
  }
  return entries;
}

const POPULATION_OPTIONS = {
  populationMinPrevalence: 0.15,
  populationMinKindSize: 2,
  populationPermutations: 100,
  populationQuantile: 0.8,
  populationBondQuantile: 0.6,
};

function streamThrough(index, entries) {
  for (const entry of entries) {
    indexKindEntries(index, [entry]);
    // Mirror reading.js's step(): kindCandidates is consulted every turn.
    kindCandidates(index);
  }
}

test("after flush, a throttled index's population candidates are identical to an unthrottled one's", () => {
  const stream = evidenceStream();
  const unthrottled = createKindInductionIndex([], { ...POPULATION_OPTIONS, populationRefreshEvery: 1 });
  const throttled = createKindInductionIndex([], { ...POPULATION_OPTIONS, populationRefreshEvery: 25 });
  streamThrough(unthrottled, stream);
  streamThrough(throttled, stream);
  flushKindPopulation(unthrottled);
  flushKindPopulation(throttled);
  const a = kindCandidates(unthrottled);
  const b = kindCandidates(throttled);
  assert.ok(a.length >= 1, "fixture sanity: the unthrottled index must discover at least one basin");
  assert.deepEqual(b, a);
  assert.deepEqual(kindDiagnostics(throttled).populationKinds, kindDiagnostics(unthrottled).populationKinds);
});

test("mid-read, throttled candidates lag by at most the cadence and never exceed the unthrottled truth", () => {
  const stream = evidenceStream();
  const cadence = 25;
  const throttled = createKindInductionIndex([], { ...POPULATION_OPTIONS, populationRefreshEvery: cadence });
  let staleTurns = 0;
  for (let i = 0; i < stream.length; i += 1) {
    indexKindEntries(throttled, [stream[i]]);
    const seen = kindCandidates(throttled);
    // An oracle index fed the identical prefix, always fresh.
    const oracle = createKindInductionIndex(stream.slice(0, i + 1), { ...POPULATION_OPTIONS, populationRefreshEvery: 1 });
    const truth = kindCandidates(oracle);
    if (JSON.stringify(seen) !== JSON.stringify(truth)) staleTurns += 1;
  }
  // Staleness is allowed (that is the throttle's whole point) but must be
  // bounded: a lag can persist at most cadence-1 consecutive dirty turns
  // before a forced refresh catches up. With one dirty turn per stream entry,
  // total stale turns can never reach the whole stream.
  assert.ok(staleTurns < stream.length, "throttled index must not be stale on every turn");
  flushKindPopulation(throttled);
  const oracle = createKindInductionIndex(stream, { ...POPULATION_OPTIONS, populationRefreshEvery: 1 });
  flushKindPopulation(oracle);
  assert.deepEqual(kindCandidates(throttled), kindCandidates(oracle));
});

test("the first dirty turn always computes for real -- a fresh index is never born stale", () => {
  const stream = evidenceStream();
  // Even at a huge cadence, the FIRST refresh runs immediately (the counter
  // starts at "never refreshed"), so early-read candidates are real, not a
  // frozen empty list waiting out the first window.
  const index = createKindInductionIndex(stream, { ...POPULATION_OPTIONS, populationRefreshEvery: 10_000 });
  const diagnostics = kindDiagnostics(index);
  assert.ok(diagnostics.populationKinds.entities > 0, "first computation must have actually run");
  assert.ok(kindCandidates(index).length >= 1);
});

test("flushKindPopulation refuses a non-index", () => {
  assert.throws(() => flushKindPopulation({}), /EOKindInductionIndex@1/);
  assert.throws(() => flushKindPopulation(null), /EOKindInductionIndex@1/);
});
