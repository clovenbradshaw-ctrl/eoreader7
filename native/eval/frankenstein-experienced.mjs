import fs from "fs";
import { stripContainer } from "../adapters/text/spans.js";
import { createCausalTextPerceiver, textEncounters } from "../adapters/text/recursive.js";
import { reviseTextFold } from "../adapters/text/revision.js";
import {
  createRecursiveReader,
  createPriorConditionedReader,
  deriveExperiencePrior,
  mergeExperiencePriors,
  deriveOrientation,
  executeStanceReasoning,
} from "../../kernel.js";

const [frankensteinPath, hamletPath, macbethPath, pridePath] = process.argv.slice(2);
if (!frankensteinPath || !hamletPath || !macbethPath || !pridePath) {
  throw new TypeError("usage: node native/eval/frankenstein-experienced.mjs <frankenstein> <hamlet> <macbeth> <pride-and-prejudice>");
}

const relationPosPrior = JSON.parse(fs.readFileSync(new URL("../../bin/priors/pos/en-ud-ewt.json", import.meta.url), "utf8"));
const freeze = (value) => Object.freeze(value);

function materialFrom(path) {
  const raw = fs.readFileSync(path, "utf8");
  const stripped = stripContainer(raw);
  if (stripped?.looks_like_material && stripped.text?.length > 1000) return { text: stripped.text, offset: stripped.offset ?? 0 };
  return { text: raw, offset: 0 };
}

function readerAssembly(priors = []) {
  const perceiver = createCausalTextPerceiver({
    minRelationSurfaces: 2,
    refreshEvery: 25,
    relationPosPrior,
    pronounResolution: { minActivation: 0.05, minMargin: 0.2 },
  });
  const options = {
    priors,
    perceivers: [perceiver],
    adapters: {
      revise: reviseTextFold,
      retrieve: (_fold, evidence) => freeze({
        schema: "EORelevantFold@1",
        witnessed: freeze([...evidence]),
        provisional: freeze([]), expectations: freeze([]), obligations: freeze([]), exclusions: freeze([]),
        unresolvedAlternatives: freeze([]), activeFrames: freeze([]), receivedPriors: freeze([...priors]),
      }),
    },
  };
  return priors.length ? createPriorConditionedReader(options) : createRecursiveReader(options);
}

async function readWork(path, source, priors = []) {
  const material = materialFrom(path);
  const encounters = textEncounters(material.text, { source, offset: material.offset });
  if (encounters.length < 100) throw new Error(`${source} did not produce enough encounters: ${encounters.length}`);
  const reader = readerAssembly(priors);
  const reading = await reader.read(encounters);
  return { source, encounters, reading };
}

function compactReading(reading) {
  return freeze({
    fold: reading.fold,
    terrainState: reading.terrainState,
    effectiveTerrainState: reading.effectiveTerrainState,
    emergentTerrainState: reading.emergentTerrainState,
    stanceState: reading.stanceState,
    kindState: reading.kindState,
    referentEntities: reading.referentEntities,
  });
}

function edgeSummary(reading) {
  const edges = (reading.fold?.graphEntries ?? []).filter((entry) => entry?.schema === "EOHyperedge@1");
  const priorAttended = edges.filter((edge) => edge?.meta?.attention === "experience_prior");
  return {
    edges,
    priorAttended,
    relationCount: new Set(edges.map((edge) => edge.relation)).size,
    priorRelationCount: new Set(priorAttended.map((edge) => edge.relation)).size,
  };
}

function networkCount(reading) {
  return reading?.effectiveTerrainState?.Network?.length ?? 0;
}

const historySpecs = [
  { path: hamletPath, source: "prior:folger:hamlet" },
  { path: macbethPath, source: "prior:folger:macbeth" },
  { path: pridePath, source: "prior:gutenberg:1342" },
];

// Each prior work is sedimented into a compact EOExperiencePrior@1 the
// moment its own reading finishes, then the reading itself is left to fall
// out of scope. `history` accumulates bounded per-book priors, never the
// growing set of raw Folds that produced them, so carrying N books of
// experience costs O(vocabulary), not O(sum of every book read so far).
const history = [];
const historyReport = [];
let accumulatedPrior = null;
for (let i = 0; i < historySpecs.length; i += 1) {
  const spec = historySpecs[i];
  const result = await readWork(spec.path, spec.source, accumulatedPrior ? [accumulatedPrior] : []);
  const edgeState = edgeSummary(result.reading);
  historyReport.push({
    source: spec.source,
    encounters: result.encounters.length,
    receivedPriorSources: accumulatedPrior?.sourceRefs ?? [],
    priorVocabularySize: accumulatedPrior?.relationVocabulary?.length ?? 0,
    priorNetworkPatterns: accumulatedPrior?.networkPatterns?.length ?? 0,
    relations: edgeState.edges.length,
    priorAttendedRelations: edgeState.priorAttended.length,
    networks: networkCount(result.reading),
  });

  history.push(deriveExperiencePrior([{ source: spec.source, reading: compactReading(result.reading) }], {
    id: `experience-prior:book:${spec.source}`,
    giver: "reader:sequential-literary-history",
  }));
  accumulatedPrior = mergeExperiencePriors(history, {
    id: `experience-prior:before:${i + 2}`,
    giver: "reader:sequential-literary-history",
  });
  // `result` -- and the full reading/Fold/turn history it carries -- goes
  // out of scope here. Only the compact sedimented priors in `history`
  // survive into the next iteration; the raw reading is never retained.
}

const experiencePrior = mergeExperiencePriors(history, {
  id: "experience-prior:before-frankenstein",
  giver: "reader:sequential-literary-history",
});

const target = await readWork(frankensteinPath, "target:gutenberg:84", [experiencePrior]);
const edgeState = edgeSummary(target.reading);
const entries = target.reading.fold?.graphEntries ?? [];
const priorAttentionSamples = edgeState.priorAttended.slice(0, 20).map((edge) => ({
  sequencePosition: edge.scope?.sequencePosition ?? null,
  relation: edge.relation,
  participants: (edge.participants ?? []).map((p) => ({ role: p.role, surface: p.surface, standing: p.standing, ref: p.ref })),
  priorWorkSupport: edge.meta?.experiencePrior?.workSupport ?? null,
  priorWorkRate: edge.meta?.experiencePrior?.workRate ?? null,
  priorMemoryStanding: edge.meta?.experiencePrior?.memoryStanding ?? null,
  priorOccurrences: edge.meta?.experiencePrior?.occurrences ?? null,
}));

const finalOrientation = deriveOrientation(target.reading.fold, {
  terrainState: target.reading.terrainState,
  emergentTerrainState: target.reading.emergentTerrainState,
  kindState: target.reading.kindState,
  stanceState: target.reading.stanceState,
  referentEntities: target.reading.referentEntities,
  receivedPriors: [experiencePrior],
});
const stanceRun = executeStanceReasoning(finalOrientation, { terrain: "Network", includeGeneration: true });
const networkUnravelings = stanceRun.reasoning.filter((item) => item.stance === "Unraveling");
const priorSupportedNetworks = networkUnravelings.filter((item) => item.priorEvaluation?.expected === true);
const priorStrainingNetworks = networkUnravelings.filter((item) => item.priorEvaluation?.expected === false);
const familiarGeneration = stanceRun.generation.filter((item) => item.proposal?.familiarity === "remembered_form");
const novelGeneration = stanceRun.generation.filter((item) => item.proposal?.familiarity === "prior_straining_form");
const priorVisibleTurns = target.reading.turns.filter((turn) => (turn.orientation?.receivedPriors ?? []).some((prior) => prior?.id === experiencePrior.id)).length;
const priorAsWitness = (target.reading.fold?.witnessed ?? []).some((item) => item?.id === experiencePrior.id);
const priorAsGraphObject = entries.some((item) => item?.id === experiencePrior.id);

const acceptance = {
  sourceCount: experiencePrior.sourceCount,
  sourceRefs: experiencePrior.sourceRefs,
  targetExcluded: !experiencePrior.sourceRefs.includes("target:gutenberg:84"),
  priorVocabulary: experiencePrior.relationVocabulary.length,
  recurrentPriorVocabulary: experiencePrior.relationVocabulary.filter((item) => item.recurrent).length,
  singleExposurePriorVocabulary: experiencePrior.relationVocabulary.filter((item) => !item.recurrent).length,
  priorNetworkPatterns: experiencePrior.networkPatterns.length,
  recurrentPriorNetworkPatterns: experiencePrior.networkPatterns.filter((item) => item.recurrent).length,
  priorVisibleTurns,
  targetEncounters: target.encounters.length,
  priorAttendedRelations: edgeState.priorAttended.length,
  distinctPriorAttendedRelations: edgeState.priorRelationCount,
  targetNetworks: finalOrientation.terrainState?.Network?.length ?? 0,
  stanceGeneration: stanceRun.generation.length,
  priorSupportedNetworks: priorSupportedNetworks.length,
  priorStrainingNetworks: priorStrainingNetworks.length,
  priorAsWitness,
  priorAsGraphObject,
  generatedWitnessed: stanceRun.generation.filter((item) => item.witnessed === true).length,
  generatedAdmissible: stanceRun.generation.filter((item) => item.admissible === true).length,
};

const report = {
  schema: "EOFrankensteinExperiencedReadingEval@1",
  history: historyReport,
  prior: {
    id: experiencePrior.id,
    sourceCount: experiencePrior.sourceCount,
    sourceRefs: experiencePrior.sourceRefs,
    targetExcluded: !experiencePrior.sourceRefs.includes("target:gutenberg:84"),
    relationVocabularySize: experiencePrior.relationVocabulary.length,
    recurrentRelationVocabularySize: experiencePrior.relationVocabulary.filter((item) => item.recurrent).length,
    singleExposureRelationVocabularySize: experiencePrior.relationVocabulary.filter((item) => !item.recurrent).length,
    networkPatternCount: experiencePrior.networkPatterns.length,
    recurrentNetworkPatternCount: experiencePrior.networkPatterns.filter((item) => item.recurrent).length,
    topRelations: experiencePrior.relationVocabulary.slice(0, 30),
    networkPatterns: experiencePrior.networkPatterns.slice(0, 20),
  },
  frankenstein: {
    encounters: target.encounters.length,
    receivedPriorOnTurns: priorVisibleTurns,
    relations: edgeState.edges.length,
    distinctRelations: edgeState.relationCount,
    priorAttendedRelations: edgeState.priorAttended.length,
    distinctPriorAttendedRelations: edgeState.priorRelationCount,
    priorAttentionSamples,
    networks: finalOrientation.terrainState?.Network?.length ?? 0,
    priorSupportedNetworks: priorSupportedNetworks.length,
    priorStrainingNetworks: priorStrainingNetworks.length,
    generatedRememberedForms: familiarGeneration.length,
    generatedPriorStrainingForms: novelGeneration.length,
    generatedHypotheses: stanceRun.generation.slice(0, 20).map((item) => ({
      id: item.id,
      kind: item.proposal?.kind,
      familiarity: item.proposal?.familiarity,
      signature: item.proposal?.signature,
      priorStanding: item.proposal?.priorEvaluation?.standing,
      prospectiveTest: item.proposal?.prospectiveTest,
      witnessed: item.witnessed,
      admissible: item.admissible,
    })),
  },
  epistemicBoundary: {
    priorAsWitness,
    priorAsGraphObject,
    priorWitnessedFlag: experiencePrior.witnessed,
    priorAdmissibleFlag: experiencePrior.admissible,
    stanceRunMutatesFold: stanceRun.mutatesFold,
    generatedWitnessed: stanceRun.generation.filter((item) => item.witnessed === true).length,
    generatedAdmissible: stanceRun.generation.filter((item) => item.admissible === true).length,
  },
};

console.log("EXPERIENCED_READING_REPORT_START");
console.log(JSON.stringify(report, null, 2));
console.log("EXPERIENCED_READING_REPORT_END");
console.log("EXPERIENCED_READING_ACCEPTANCE", JSON.stringify(acceptance));

const fail = (message) => { throw new Error(`${message}; acceptance=${JSON.stringify(acceptance)}`); };
if (experiencePrior.sourceCount !== 3) fail(`expected three prior works, got ${experiencePrior.sourceCount}`);
if (experiencePrior.sourceRefs.includes("target:gutenberg:84")) fail("Frankenstein leaked into its own prior");
if (experiencePrior.relationVocabulary.length === 0) fail("prior reading history learned no relation memory");
if (priorVisibleTurns !== target.encounters.length) fail(`experience prior was not present in every target orientation: ${priorVisibleTurns}/${target.encounters.length}`);
if (edgeState.priorAttended.length === 0) fail("experience prior never changed Frankenstein relation attention");
if ((finalOrientation.terrainState?.Network?.length ?? 0) === 0) fail("experienced Frankenstein read earned no Networks");
if (stanceRun.generation.length === 0) fail("experienced stance reasoner generated no hypotheses");
if (priorAsWitness || priorAsGraphObject) fail("experience prior crossed the witness/graph evidence boundary");
if (stanceRun.generation.some((item) => item.witnessed !== false || item.admissible !== false)) fail("prior-conditioned generation bypassed grounding");
