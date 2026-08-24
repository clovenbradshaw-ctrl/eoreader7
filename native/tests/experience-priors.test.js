import test from "node:test";
import assert from "node:assert/strict";
import { deriveExperiencePrior, createPriorConditionedReader, createRecursiveReader, reasoningAffordances } from "../kernel/index.js";
import { createCausalTextPerceiver, textEncounters } from "../adapters/text/recursive.js";

const priorReading = (source, relation, networkId) => ({
  source,
  fold: {
    graphEntries: [{ schema: "EOHyperedge@1", id: `edge:${source}`, relation, meta: { compositionStanding: { eligible: true } } }],
    transformationObjects: [{ schema: "EOOperation@1", id: `op:${source}:trace`, operator: "CON", stance: "Tracing" }],
  },
  terrainState: {
    Network: [{ id: networkId, topology: { topology: "acyclic", cycleRank: 0, branchingReferents: 1, edgeCount: 2, referentCount: 1 } }],
  },
});

test("one earlier work leaves a memory while cross-work recurrence strengthens it", () => {
  const prior = deriveExperiencePrior([
    priorReading("book:a", "admired", "network:a"),
    priorReading("book:b", "admired", "network:b"),
    priorReading("book:c", "wandered", "network:c"),
  ], { giver: "reader:test" });

  assert.equal(prior.schema, "EOExperiencePrior@1");
  assert.equal(prior.sourceCount, 3);
  assert.deepEqual(prior.sourceRefs, ["book:a", "book:b", "book:c"]);
  const admired = prior.relationVocabulary.find((item) => item.relation === "admired");
  const wandered = prior.relationVocabulary.find((item) => item.relation === "wandered");
  assert.ok(admired);
  assert.ok(wandered);
  assert.equal(admired.workSupport, 2);
  assert.equal(admired.memoryStanding, "recurrent_cross_work_memory");
  assert.equal(admired.recurrent, true);
  assert.equal(wandered.workSupport, 1);
  assert.equal(wandered.memoryStanding, "single_work_memory");
  assert.equal(wandered.recurrent, false);
  assert.ok(admired.workRate > wandered.workRate);
  assert.equal(prior.networkPatterns.length, 1);
  assert.equal(prior.networkPatterns[0].workSupport, 3);
  assert.equal(prior.witnessed, false);
  assert.equal(prior.admissible, false);
});

test("an experienced reader notices a remembered relation earlier, but current text remains the witness", async () => {
  const prior = deriveExperiencePrior([
    priorReading("book:a", "admired", "network:a"),
    priorReading("book:b", "admired", "network:b"),
  ], { giver: "reader:test" });

  const sentence = "He admired Elizabeth.";
  const [encounter] = textEncounters(sentence, { source: "new-book" });

  const cold = createRecursiveReader({
    perceivers: [createCausalTextPerceiver({ minRelationSurfaces: 2, refreshEvery: 25 })],
  });
  const coldTurn = await cold.step(encounter);
  assert.equal(coldTurn.observations.length, 0);
  assert.equal(cold.getFold().graphEntries.filter((item) => item?.schema === "EOHyperedge@1").length, 0);

  const experienced = createPriorConditionedReader({
    priors: [prior],
    perceivers: [createCausalTextPerceiver({ minRelationSurfaces: 2, refreshEvery: 25 })],
  });
  const turn = await experienced.step(encounter);
  const edges = experienced.getFold().graphEntries.filter((item) => item?.schema === "EOHyperedge@1");

  assert.equal(turn.orientation.receivedPriors.length, 1);
  assert.equal(turn.orientation.receivedPriors[0].id, prior.id);
  assert.equal(edges.length, 1);
  assert.equal(edges[0].relation, "admired");
  assert.equal(edges[0].meta.attention, "experience_prior");
  assert.equal(edges[0].meta.experiencePrior.workSupport, 2);
  assert.equal(edges[0].meta.experiencePrior.memoryStanding, "recurrent_cross_work_memory");
  assert.equal(turn.observations.length, 1);
  assert.equal(turn.observations[0].witness, sentence);
  assert.ok(turn.observations[0].provenance.nominationCause.includes("experience_prior_attention"));
  assert.equal(experienced.getFold().witnessed.some((item) => item === prior || item?.id === prior.id), false);
  assert.equal(experienced.getFold().graphEntries.some((item) => item === prior || item?.id === prior.id), false);
});

test("a single prior exposure can orient attention without becoming evidence", async () => {
  const prior = deriveExperiencePrior([
    priorReading("book:a", "wandered", "network:a"),
  ], { giver: "reader:test" });
  const [encounter] = textEncounters("He wandered home.", { source: "new-book" });
  const experienced = createPriorConditionedReader({
    priors: [prior],
    perceivers: [createCausalTextPerceiver({ minRelationSurfaces: 2, refreshEvery: 25 })],
  });
  const turn = await experienced.step(encounter);
  const edge = experienced.getFold().graphEntries.find((item) => item?.schema === "EOHyperedge@1");
  assert.ok(edge);
  assert.equal(edge.meta.attention, "experience_prior");
  assert.equal(edge.meta.experiencePrior.workSupport, 1);
  assert.equal(edge.meta.experiencePrior.memoryStanding, "single_work_memory");
  assert.equal(turn.observations[0].witness, "He wandered home.");
});

test("earlier stance experience weights later cube reasoning but cannot remove alternative moves", () => {
  const prior = deriveExperiencePrior([
    priorReading("book:a", "admired", "network:a"),
    priorReading("book:b", "admired", "network:b"),
  ], { giver: "reader:test" });
  const moves = reasoningAffordances({
    receivedPriors: [prior],
    terrainState: { Network: [{ id: "network:new" }] },
  });

  assert.equal(moves.length, 3);
  const tracing = moves.find((move) => move.address.stance === "Tracing");
  const unraveling = moves.find((move) => move.address.stance === "Unraveling");
  const composing = moves.find((move) => move.address.stance === "Composing");
  assert.ok(tracing && unraveling && composing);
  assert.equal(tracing.priorSupport.gatesMove, false);
  assert.equal(tracing.priorSupport.score, 1);
  assert.ok(tracing.priorSupport.score > unraveling.priorSupport.score);
  assert.ok(tracing.priorSupport.score > composing.priorSupport.score);
  assert.deepEqual(new Set(moves.map((move) => move.move)), new Set(["distinguish", "relate", "generate"]));
  assert.ok(moves.every((move) => move.witnessed === false));
});
