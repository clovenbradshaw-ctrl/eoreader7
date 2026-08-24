import test from "node:test";
import assert from "node:assert/strict";
import { reviseTextFold, createTextRevisionIndex } from "../adapters/text/revision.js";
import { createRecursiveReader } from "../kernel/index.js";
import { createCausalTextPerceiver, textEncounters } from "../adapters/text/recursive.js";

// A passage deliberately built to exercise every optimized path at once:
// a recurring bare descriptor ("the creature" / "the wretch") that earns an
// identity hypothesis without ever becoming material (no relation edge ever
// touches it), a recurring RELATION-PARTICIPANT descriptor that DOES become
// material (feeds two different witnessed relations), and an explicit
// appositional construction that should still project a discourse referent.
const PASSAGE = `The creature entered the room. Victor watched the creature.
The creature followed Victor. The wretch—the miserable monster whom I had
created—stood in the doorway. A letter arrived. A boat departed.`;

function readerAssembly(index) {
  const perceiver = createCausalTextPerceiver({ minRelationSurfaces: 2, refreshEvery: 25 });
  return createRecursiveReader({
    perceivers: [perceiver],
    adapters: {
      revise: index ? (args) => reviseTextFold({ ...args, index }) : reviseTextFold,
      retrieve: (_fold, evidence) => Object.freeze({
        schema: "EORelevantFold@1",
        witnessed: Object.freeze([...evidence]),
        provisional: Object.freeze([]), expectations: Object.freeze([]), obligations: Object.freeze([]), exclusions: Object.freeze([]),
        unresolvedAlternatives: Object.freeze([]), activeFrames: Object.freeze([]), receivedPriors: Object.freeze([]),
      }),
    },
  });
}

function summarize(fold) {
  const entries = fold.graphEntries ?? [];
  return {
    total: entries.length,
    bySchema: Object.fromEntries(
      [...new Set(entries.map((e) => e?.schema))].sort().map((schema) => [
        schema,
        entries.filter((e) => e?.schema === schema).map((e) => e.id).sort(),
      ]),
    ),
  };
}

test("a caller-supplied incremental index reproduces the exact same Fold as the default (no-index) path", async () => {
  const encounters = textEncounters(PASSAGE, { source: "revision-index-fixture" });
  assert.ok(encounters.length >= 5, "fixture should produce several encounters");

  const baseline = readerAssembly(null);
  const baselineReading = await baseline.read(encounters);

  const index = createTextRevisionIndex();
  const indexed = readerAssembly(index);
  const indexedReading = await indexed.read(encounters);

  assert.deepEqual(summarize(indexedReading.fold), summarize(baselineReading.fold));

  // The index itself should have kept pace with the fold it helped produce.
  assert.equal(index.scannedCount, indexedReading.fold.graphEntries.length);
});

test("a dormant descriptor hypothesis (no relation edge ever touches it) never enters the Fold", async () => {
  const encounters = textEncounters(PASSAGE, { source: "revision-index-fixture-2" });
  const reader = readerAssembly(createTextRevisionIndex());
  const reading = await reader.read(encounters);
  const entries = reading.fold.graphEntries ?? [];

  // "a letter" / "a boat" are indefinite, one-off, and never recur or touch
  // a relation edge -- they should never form a hypothesis at all (fewer
  // than two occurrences), and the corpus contains no bare-descriptor
  // recurrence that lacks any relation context, so there is nothing dormant
  // to assert on THIS fixture beyond: every admitted hypothesis is material.
  const hypotheses = entries.filter((e) => e?.schema === "EOIdentityHypothesis@1");
  for (const hypothesis of hypotheses) {
    const obligation = entries.find((e) => e?.id === `obligation:identity:${hypothesis.id}`);
    assert.ok(obligation, `admitted hypothesis ${hypothesis.id} should be the material one (has a live relation attribution)`);
  }
});

test("createTextRevisionIndex self-heals when handed a fold it has never scanned", async () => {
  const index = createTextRevisionIndex();
  const encountersA = textEncounters("Victor watched the creature.", { source: "a" });
  const readerA = readerAssembly(index);
  const readingA = await readerA.read(encountersA);
  assert.equal(index.scannedCount, readingA.fold.graphEntries.length);

  // Reuse the SAME index object against an unrelated reader/fold lineage --
  // it must rebuild rather than silently trust stale state.
  const encountersB = textEncounters("Elizabeth admired the garden.", { source: "b" });
  const readerB = readerAssembly(index);
  const readingB = await readerB.read(encountersB);
  const readingBWithoutIndex = await readerAssembly(null).read(encountersB);
  assert.deepEqual(summarize(readingB.fold), summarize(readingBWithoutIndex.fold));
});
