// witness-refusals.test.js — witness.js's own admission gate silently
// `continue`s past a refused candidate; nothing recorded what was refused or
// why. `witnessVerbose()` is the new, additive export (witness()'s existing
// return shape is untouched — other code depends on it): `{observations,
// refused}`, where `refused` is `[{candidate, reason}]` for everything
// witness() would have dropped. reading.js's step() folds each refusal into
// `fold.exclusions` via a real eoOperation at Void terrain (SIG·Ground —
// see reading.js's own `exclusionOperationFor` header for why SIG, not DEF
// or NUL). lexicon.js already documents Void as "refusals and typed gaps
// (exclusions, unresolved alternatives)" — this is what finally writes there.
import test from "node:test";
import assert from "node:assert/strict";
import { witness, witnessVerbose } from "../kernel/witness.js";
import { createRecursiveReader } from "../kernel/reading.js";

const enc = Object.freeze({ schema: "Encounter@1", source: "fixture", modality: "text", sequencePosition: 0, anchor: { start: 0, end: 9 } });

test("witnessVerbose admits exactly what witness() admits — same observations, byte for byte", async () => {
  const candidates = [
    { candidate: { id: "a" }, evidence: "e-a", anchor: enc.anchor },
    { candidate: { id: "b" }, anchor: enc.anchor }, // no evidence: witness()'s default gate refuses this
    { candidate: { id: "c" }, evidence: "e-c", anchor: { start: 99, end: 100 } }, // anchor mismatch
  ];
  const plain = await witness(enc, candidates);
  const verbose = await witnessVerbose(enc, candidates);
  assert.deepEqual(verbose.observations, plain, "witness()'s existing return shape is unchanged");
  assert.equal(plain.length, 1);
  assert.equal(plain[0].distinctions[0].id, "a");
});

test("witnessVerbose names what witness() silently dropped, and why", async () => {
  const candidates = [
    { candidate: { id: "a" }, evidence: "e-a", anchor: enc.anchor },
    { candidate: { id: "b" }, anchor: enc.anchor },
    { candidate: { id: "c" }, evidence: "e-c", anchor: { start: 99, end: 100 } },
  ];
  const { observations, refused } = await witnessVerbose(enc, candidates);
  assert.equal(observations.length, 1);
  assert.equal(refused.length, 2);
  assert.deepEqual(refused.map((r) => r.candidate.candidate.id), ["b", "c"]);
  assert.equal(refused.find((r) => r.candidate.candidate.id === "b").reason, "no evidence");
  assert.equal(refused.find((r) => r.candidate.candidate.id === "c").reason, "anchor mismatch");
});

test("a caller-supplied admit() that refuses with no reason is named 'refused by admit'; refusing WITH a reason keeps it", async () => {
  const candidates = [
    { candidate: { id: "silent" }, evidence: "e" },
    { candidate: { id: "explained" }, evidence: "e" },
  ];
  const admit = async (_e, candidate) =>
    candidate.candidate.id === "explained" ? { admitted: false, reason: "not_established" } : false;
  const { observations, refused } = await witnessVerbose(enc, candidates, { admit });
  assert.equal(observations.length, 0);
  assert.equal(refused.find((r) => r.candidate.candidate.id === "silent").reason, "refused by admit");
  assert.equal(refused.find((r) => r.candidate.candidate.id === "explained").reason, "not_established");
});

test("admitted but no warrant to record: refused as 'no warrant', never silently admitted", async () => {
  const candidates = [{ candidate: { id: "hollow" } }];
  const admit = async () => ({ admitted: true }); // no witness/evidence anywhere
  const { observations, refused } = await witnessVerbose(enc, candidates, { admit });
  assert.equal(observations.length, 0);
  assert.equal(refused[0].reason, "no warrant");
});

// ---- reading.js's step(): refusals folded into fold.exclusions ----

function readerWithCandidates(candidatesByEncounter) {
  return createRecursiveReader({
    adapters: {
      perceive: async (encounter) => candidatesByEncounter[encounter.sequencePosition] ?? [],
      // no adapters.witness: the default path (witnessVerbose) is exercised.
    },
  });
}

test("a refused candidate appears in the resulting fold's exclusions array with its reason", async () => {
  const reader = readerWithCandidates({
    0: [
      { candidate: { id: "admitted-one" }, evidence: "e", anchor: { start: 0, end: 1 } },
      { candidate: { id: "refused-one" }, anchor: { start: 0, end: 1 } }, // no evidence
    ],
  });
  const turn = await reader.step({ source: "fixture", modality: "text", sequencePosition: 0, anchor: { start: 0, end: 1 } });
  assert.equal(turn.observations.length, 1);
  assert.equal(turn.refused.length, 1);
  assert.equal(turn.refused[0].reason, "no evidence");

  const exclusions = turn.fold.exclusions ?? [];
  assert.equal(exclusions.length, 1, "exactly one exclusion — the refused candidate, not the admitted one");
  const exclusion = exclusions[0];
  assert.equal(exclusion.schema, "EOExclusion@1");
  assert.equal(exclusion.reason, "no evidence");
  assert.equal(exclusion.target, "refused-one");
  assert.ok(!exclusions.some((x) => x.target === "admitted-one"), "an admitted candidate does not appear in exclusions");
});

test("the exclusion is a real eoOperation at Existence·Ground — the Void terrain lexicon.js names for refusals", async () => {
  const reader = readerWithCandidates({
    0: [{ candidate: { id: "refused-two" }, anchor: { start: 0, end: 1 } }],
  });
  const turn = await reader.step({ source: "fixture", modality: "text", sequencePosition: 0, anchor: { start: 0, end: 1 } });
  const op = turn.fold.transformationObjects.find((o) => o.payload?.action === "exclusion");
  assert.ok(op, "the exclusion was recorded as a transformation, not only as a bare object");
  assert.equal(op.operator, "SIG");
  assert.equal(op.grain, "Ground");
  assert.equal(op.domain, "Existence");
  assert.equal(op.terrain, "Void");
  assert.equal(op.payload.value.target, "refused-two");
});

test("no refusals: fold.exclusions stays empty and the turn is unaffected (backward compatible)", async () => {
  const reader = readerWithCandidates({
    0: [{ candidate: { id: "clean" }, evidence: "e", anchor: { start: 0, end: 1 } }],
  });
  const turn = await reader.step({ source: "fixture", modality: "text", sequencePosition: 0, anchor: { start: 0, end: 1 } });
  assert.equal(turn.refused.length, 0);
  assert.deepEqual(turn.fold.exclusions ?? [], []);
});

test("a caller-supplied adapters.witness returning a bare array (witness()'s existing contract) is unaffected — no refused list, no exclusions", async () => {
  const reader = createRecursiveReader({
    adapters: {
      perceive: async () => [{ candidate: { id: "x" } }], // would be refused by the default gate (no evidence)
      witness: async (_enc, cands) => cands.map((c, i) => Object.freeze({
        schema: "Observation@1", id: `obs:${i}`, witness: "w", anchor: null, distinctions: [c.candidate], hyperedges: Object.freeze([]), graphEntries: Object.freeze([]), provenance: {},
      })),
    },
  });
  const turn = await reader.step({ source: "fixture", modality: "text", sequencePosition: 0 });
  assert.equal(turn.observations.length, 1, "the custom witness adapter's own array contract still works, unmodified");
  assert.deepEqual(turn.refused, []);
  assert.deepEqual(turn.fold.exclusions ?? [], []);
});
