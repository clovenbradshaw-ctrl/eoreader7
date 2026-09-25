// native/conformance/artifact-tier.test.mjs — spec test 2
// (ASSEMBLIES-AND-ARTIFACTS.md §7.2): sealed artifact bodies carry no
// decay-tier quantities (A1.1/A1.3); every artifact carries `dropped` (S12)
// and `regime` (S7); sealing is a checkpoint (A3.1); and the two
// grandfathered priors reproduce byte-identical through the sealed path
// (step 2's set-down, at fixture scale — the full rhythm-transfer eval
// needs the book texts, which the fixture-scale pin does not).

import test from "node:test";
import assert from "node:assert/strict";
import { sealArtifact, artifactTierViolations, sealExperiencePrior, sealRhythmPrior, producerMismatch, sameBody, materialHash } from "../kernel/artifact.js";
import { deriveExperiencePrior } from "../kernel/experience-priors.js";
import { deriveRhythmPrior, scoreRhythmExpectations } from "../kernel/rhythm-priors.js";
import { ATMOSPHERE } from "../assemblies.js";

// A completed reading, in the shape both prior modules consume —
// rhythm-priors.test.js's own fixture, reused.
const mention = (pos, ref) => ({ schema: "EOMention@1", id: `mention:${pos}:${ref}`, referent: `ref:${ref}`, witness: `text:${pos}` });
const reading = (source, positionsByRef, relation = "admired") => ({
  source,
  fold: {
    graphEntries: [
      { schema: "EOHyperedge@1", id: `edge:${source}`, relation, meta: { compositionStanding: { eligible: true } } },
      ...Object.entries(positionsByRef).flatMap(([ref, positions]) => positions.map((p) => mention(p, ref))),
    ],
    transformationObjects: [{ schema: "EOOperation@1", id: `op:${source}`, operator: "CON", stance: "Tracing" }],
  },
});

const PRODUCER = { assembly: "assembly:atmosphere", version: 1 };
const MATERIAL = { source: "book:a", hash: "fixture-hash", extent: 12, unit: "encounters" };
const sealable = (over = {}) => ({
  kind: "Fixture@1",
  producer: PRODUCER,
  material: MATERIAL,
  regime: {},
  dropped: ["nothing — the body carries the fixture whole, said out loud"],
  body: { counts: { alice: 3 } },
  sealedAtSequence: 4,
  conformance: { passed: true, checks: ["fixture conformance"] },
  ...over,
});

test("A1.1/A1.3: a body carrying a decay-tier quantity is refused at the seal, with the offending path named", () => {
  const body = { referents: [{ id: "ref:a", activation: 0.4 }] };
  const violations = artifactTierViolations(body);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].path, "body.referents[0].activation");
  assert.throws(() => sealArtifact(sealable({ body })), /decay-tier/);
  assert.throws(() => sealArtifact(sealable({ body: { nested: { deep: { gamma: 0.75 } } } })), /decay-tier/);
  assert.throws(() => sealArtifact(sealable({ body: { presence: [] } })), /decay-tier/);
});

test("S12/S7: dropped and regime are refused when absent — what was cut is declared at seal time, and 'no priors' is said, never omitted", () => {
  assert.throws(() => sealArtifact(sealable({ dropped: undefined })), /dropped/);
  assert.throws(() => sealArtifact(sealable({ dropped: [] })), /dropped/);
  assert.throws(() => sealArtifact(sealable({ regime: undefined })), /regime/);
});

test("A3.1: sealing is a checkpoint — a failed or absent conformance refuses the seal; an unsealed projection is scratch", () => {
  assert.throws(() => sealArtifact(sealable({ conformance: undefined })), /checkpoint|conformance/);
  assert.throws(() => sealArtifact(sealable({ conformance: { passed: false, checks: ["x"] } })), /checkpoint|conformance/);
  assert.throws(() => sealArtifact(sealable({ conformance: { passed: true, checks: [] } })), /checks named|checkpoint/);
});

test("A3.3: the experience prior is grandfathered — the body IS the derived prior, unchanged, and the artifact carries dropped + regime", () => {
  const prior = deriveExperiencePrior([reading("book:a", { alice: [0, 2, 4] })], { giver: "reader:test" });
  const artifact = sealExperiencePrior(prior, { producer: PRODUCER, material: MATERIAL, regime: ATMOSPHERE.regimes, sealedAtSequence: 3 });
  assert.equal(artifact.schema, "EOArtifact@1");
  assert.equal(artifact.kind, "ExperiencePrior@1");
  assert.equal(artifact.body, prior, "not rebuilt — the same object, by reference");
  assert.ok(artifact.dropped.length >= 3, "what the build dropped is declared (S12)");
  assert.ok(artifact.regime.minRelationWorkSupport.giver, "the regime rides verbatim, dials with givers (S7/S16)");
  assert.equal(artifactTierViolations(artifact.body).length, 0);
  // the grep the spec names: no decay-tier key anywhere in the sealed body
  assert.doesNotMatch(JSON.stringify(artifact.body), /"(activation|presence|gamma|decay|margin)s?":/i);
});

test("A3.3 + step 2's set-down: the rhythm prior reproduces byte-identical through the sealed path", () => {
  const readings = [reading("book:a", { alice: [0, 2, 5], carol: [1, 9] }), reading("book:b", { bob: [0, 1, 2, 8] })];
  const prior = deriveRhythmPrior(readings, { giver: "reader:test" });
  const artifact = sealRhythmPrior(prior, { producer: PRODUCER, material: MATERIAL, regime: { minWorkSupport: ATMOSPHERE.regimes.minWorkSupport }, sealedAtSequence: 7 });
  // regenerate from the same log (A3.2) and re-seal: byte-identical, which
  // the deterministic, clockless seal is what makes checkable.
  const regenerated = sealRhythmPrior(deriveRhythmPrior(readings, { giver: "reader:test" }), { producer: PRODUCER, material: MATERIAL, regime: { minWorkSupport: ATMOSPHERE.regimes.minWorkSupport }, sealedAtSequence: 7 });
  assert.equal(JSON.stringify(artifact), JSON.stringify(regenerated), "seal carries no clock; regeneration is exact");
  // a consumer reading through the artifact gets the same answer as one
  // handed the raw prior — the sealed path adds a boundary, not a change.
  const target = reading("book:c", { dave: [0, 2, 9] });
  assert.equal(
    JSON.stringify(scoreRhythmExpectations(target, artifact.body)),
    JSON.stringify(scoreRhythmExpectations(target, prior)),
  );
});

test("A3.1: a prior that violates its own contract line cannot be sealed — memory dressed as witness is refused", () => {
  const prior = deriveRhythmPrior([reading("book:a", { alice: [0, 2] })], { giver: "reader:test" });
  const dressed = { ...prior, witnessed: true };
  assert.throws(() => sealRhythmPrior(dressed, { producer: PRODUCER, material: MATERIAL, regime: {}, sealedAtSequence: 1 }), /never witness/);
});

test("A3.2: a consumer finding a producer-version mismatch gets a typed regenerate-never-adapt row", () => {
  const prior = deriveRhythmPrior([reading("book:a", { alice: [0, 2] })], { giver: "reader:test" });
  const artifact = sealRhythmPrior(prior, { producer: PRODUCER, material: MATERIAL, regime: {}, sealedAtSequence: 1 });
  assert.equal(producerMismatch(artifact, { id: "assembly:atmosphere", version: 1 }), null);
  const row = producerMismatch(artifact, { id: "assembly:atmosphere", version: 2 });
  assert.equal(row.reason, "producer_version_mismatch");
  assert.match(row.rule, /regenerate/i);
  assert.ok(sameBody(artifact.body, prior));
});

test("materialHash is the platform's own sha-256, stable across calls", async () => {
  const a = await materialHash("the received bytes");
  const b = await materialHash("the received bytes");
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{64}$/);
});
