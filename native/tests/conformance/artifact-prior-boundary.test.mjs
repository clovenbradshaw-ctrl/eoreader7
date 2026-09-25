// native/conformance/artifact-prior-boundary.test.mjs — spec test 3
// (ASSEMBLIES-AND-ARTIFACTS.md §7.3): a consumer given a sealed cast over
// material that does not attest a referent must not admit it (A4.1). The
// fixture is an artifact that "knows" a being the text lacks. Also pins
// step 3's round-trip at fixture scale: the entity assembly's referent
// output reproduces from log → artifact → regenerate, byte-identical
// (§9's P-b), through the REAL recursive reader and text perceiver.

import test from "node:test";
import assert from "node:assert/strict";
import { perceive } from "../kernel/perception.js";
import { witness } from "../kernel/witness.js";
import { reconstruct } from "../kernel/fold.js";
import { createRecursiveReader, encounter } from "../kernel/reading.js";
import { deriveCastLedger, castLedgerConformance, sealCastLedger } from "../kernel/cast-ledger.js";
import { castLedgerPrior, attestedReferents } from "../adapters/text/cast-prior.js";
import { createCausalTextPerceiver, textEncounters } from "../adapters/text/recursive.js";
import { ENTITY } from "../assemblies.js";

const PRODUCER = { assembly: "assembly:entity", version: 1 };
const MATERIAL = { source: "fixture:prior-read", hash: "fixture-hash", extent: 3, unit: "encounters" };

// The sealed cast from an EARLIER read: it knows Walton AND Victor.
function sealedCast() {
  const entries = [
    { schema: "EOReferent@1", id: "ref:auto:walton", surfaces: ["Walton", "Robert Walton"] },
    { schema: "EOReferent@1", id: "ref:auto:victor_frankenstein", surfaces: ["Victor Frankenstein", "Victor"] },
    { schema: "EOMention@1", id: "mention:0:walton", referent: "ref:auto:walton", witness: "text:0" },
    { schema: "EOMention@1", id: "mention:1:victor", referent: "ref:auto:victor_frankenstein", witness: "text:1" },
  ];
  return sealCastLedger({ foldOrEntries: entries, producer: PRODUCER, material: MATERIAL, regime: ENTITY.regimes, sealedAtSequence: 3 });
}

const textEncounter = (material, pos = 0) => encounter({ source: "fixture:new-read", modality: "text", material, anchor: { start: 0, end: material.length }, sequencePosition: pos });

test("A4.1, upward: the prior nominates ONLY referents this material attests — the being the text lacks is offered nowhere", () => {
  const prior = castLedgerPrior(sealedCast());
  const attested = attestedReferents(sealedCast(), "Victor spoke quietly to the crew.");
  assert.deepEqual(attested.map((r) => r.id), ["ref:auto:victor_frankenstein"]);
  assert.deepEqual([...attested[0].surfaces], ["Victor"], "only the surface the text shows, never the artifact's whole list");
  const none = attestedReferents(sealedCast(), "The storm held for a third day.");
  assert.equal(none.length, 0, "an artifact that knows a being the text lacks nominates nothing");
  assert.equal(prior.applicability({ modality: "audio", material: "x" }), false, "a text cast prior does not speak for other media (S6)");
});

test("A4.1, end to end through perceive → witness: the unattested being is not admitted; the attested one arrives with the encounter's own evidence", async () => {
  const prior = castLedgerPrior(sealedCast());
  const enc = textEncounter("Victor spoke quietly to the crew.");
  const candidates = await perceive(enc, {}, { perceivers: [], priors: [prior] });
  assert.equal(candidates.length, 1);
  assert.ok(candidates[0].nominationCause.includes("received_prior"));
  const observations = await witness(enc, candidates, {});
  assert.equal(observations.length, 1);
  const admitted = observations[0].graphEntries.map((g) => g.id);
  assert.deepEqual(admitted, ["ref:auto:victor_frankenstein"]);
  assert.equal(observations[0].witness, enc.material, "admission stands on the new material's own bytes — fresh witness, never the artifact's word");
  // and the fixture the spec names: material with NO attested surface
  const bare = textEncounter("The storm held for a third day.");
  const bareCandidates = await perceive(bare, {}, { perceivers: [], priors: [prior] });
  const bareObservations = await witness(bare, bareCandidates, {});
  assert.equal(bareObservations.length, 0, "the artifact 'knows' Walton; the text lacks him; nothing is admitted (A4.1)");
});

test("A4.1 at reader scale: a full read conditioned on the sealed cast never grows the being its material lacks", async () => {
  const prior = castLedgerPrior(sealedCast());
  const reader = createRecursiveReader({ priors: [prior] });
  const materials = ["Victor spoke quietly to the crew.", "The storm held for a third day.", "Victor Frankenstein kept his notes."];
  for (let i = 0; i < materials.length; i += 1) await reader.step(textEncounter(materials[i], i));
  const ids = new Set((reader.getFold().graphEntries ?? []).map((g) => g?.id).filter(Boolean));
  assert.ok(ids.has("ref:auto:victor_frankenstein"), "the attested referent is heard");
  assert.ok(!ids.has("ref:auto:walton"), "the unattested referent never enters the fold — nomination is not admission");
});

test("A3.2: a consumer expecting a different producer version refuses the prior at construction — regenerate, never adapt", () => {
  const artifact = sealedCast();
  assert.doesNotThrow(() => castLedgerPrior(artifact, { expectedProducer: { id: "assembly:entity", version: 1 } }));
  assert.throws(() => castLedgerPrior(artifact, { expectedProducer: { id: "assembly:entity", version: 2 } }), /regenerate/i);
});

test("step 3's round-trip (P-b): the entity output reproduces from log → artifact → regenerate, byte-identical, through the real reader", async () => {
  const text = [
    "Victor Frankenstein worked through the night.",
    "Henry Clerval arrived in the morning.",
    "Victor Frankenstein barely noticed Henry Clerval.",
    "Henry Clerval waited by the door.",
    "Victor Frankenstein finally spoke.",
    "Henry Clerval listened without a word.",
    "Victor Frankenstein returned to the bench.",
    "Henry Clerval left before dusk.",
    "Victor Frankenstein slept at last.",
    "Henry Clerval came back the next day.",
    "Victor Frankenstein thanked Henry Clerval.",
    "Henry Clerval smiled at Victor Frankenstein.",
  ].join(" ");
  const reader = createRecursiveReader({
    perceivers: [createCausalTextPerceiver({ minRelationSurfaces: 2, refreshEvery: 4 })],
  });
  for (const enc of textEncounters(text, { source: "fixture:roundtrip" })) await reader.step(enc);

  const live = deriveCastLedger(reader.getFold());
  assert.ok(live.referents.length >= 1, "the fixture actually grows a cast — an empty round-trip proves nothing");
  const regenerated = deriveCastLedger(reconstruct(reader.getLog()));
  assert.equal(JSON.stringify(regenerated), JSON.stringify(live), "log → regenerate is byte-identical to the live fold's projection");

  const conformance = castLedgerConformance(live, reader.getFold());
  assert.equal(conformance.passed, true, conformance.failures.join("; "));
  const seal = { producer: PRODUCER, material: { source: "fixture:roundtrip", hash: "fixture-hash", extent: 12, unit: "encounters" }, regime: ENTITY.regimes, sealedAtSequence: reader.getFold().sequence };
  const sealedLive = sealCastLedger({ foldOrEntries: reader.getFold(), ...seal });
  const sealedRegen = sealCastLedger({ foldOrEntries: reconstruct(reader.getLog()), ...seal });
  assert.equal(JSON.stringify(sealedRegen), JSON.stringify(sealedLive), "the sealed artifact regenerates byte-identical (A3.2)");
});
