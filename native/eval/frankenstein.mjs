import fs from "fs";
import { stripContainer } from "../adapters/text/spans.js";
import { createCausalTextPerceiver, textEncounters } from "../adapters/text/recursive.js";
import { reviseTextFold } from "../adapters/text/revision.js";
import { createRecursiveReader } from "../../kernel.js";

const path = process.argv[2];
if (!path) throw new TypeError("usage: node native/eval/frankenstein.mjs <pg84.txt>");
const source = fs.readFileSync(path, "utf8");
const stripped = stripContainer(source);
if (!stripped.looks_like_material) throw new Error("Frankenstein input does not look like readable material");

const encounters = textEncounters(stripped.text, { source: "gutenberg:84", offset: stripped.offset });
const perceiver = createCausalTextPerceiver({
  minRelationSurfaces: 2,
  refreshEvery: 25,
  pronounResolution: { minActivation: 0.05, minMargin: 0.2 },
});
const reader = createRecursiveReader({
  perceivers: [perceiver],
  adapters: {
    revise: reviseTextFold,
    retrieve: (_fold, evidence) => Object.freeze({
      schema: "EORelevantFold@1",
      witnessed: Object.freeze([...evidence]),
      provisional: Object.freeze([]), expectations: Object.freeze([]), obligations: Object.freeze([]), exclusions: Object.freeze([]),
      unresolvedAlternatives: Object.freeze([]), activeFrames: Object.freeze([]), receivedPriors: Object.freeze([]),
    }),
  },
});

const reading = await reader.read(encounters);
const entries = reading.fold.graphEntries ?? [];
const referents = entries.filter((entry) => entry?.schema === "EOReferent@1");
const discourseReferents = referents.filter((entry) => entry?.provenance?.giver === "text/discourse-referents::projectDiscourseReferents");
const namedReferents = referents.filter((entry) => !entry?.provenance?.giver?.startsWith("text/discourse-referents"));
const edges = entries.filter((entry) => entry?.schema === "EOHyperedge@1");
const pronounBindings = entries.filter((entry) => entry?.schema === "EOPronounBinding@1");
const descriptorOccurrences = entries.filter((entry) => entry?.schema === "EOReferentOccurrence@1");
const taskConditionedOccurrences = entries.filter((entry) => entry?.schema === "EOTaskTargetOccurrence@1");
const identityHypotheses = entries.filter((entry) => entry?.schema === "EOIdentityHypothesis@1");
const discourseLinks = entries.filter((entry) => entry?.schema === "EODiscourseIdentityLink@1");
const withheldCompositions = entries.filter((entry) => entry?.schema === "EOWithheldComposition@1");
const licensedCompositions = entries.filter((entry) => entry?.schema === "EOLicensedComposition@1");
const identityObligations = (reading.fold.obligations ?? []).filter((entry) => entry?.id?.startsWith("obligation:identity:"));
const compositionObligations = (reading.fold.obligations ?? []).filter((entry) => entry?.id?.startsWith("obligation:composition:"));
const materialObligations = (reading.fold.obligations ?? []).filter((entry) => entry?.distinction?.materiality?.makesDifference === true);
const referentSurfaces = new Set(referents.flatMap((ref) => ref.surfaces ?? []).map((x) => String(x).toLowerCase()));
const hypothesisSurfaces = new Set(identityHypotheses.map((x) => String(x.surface ?? "").toLowerCase()));
const hasNamedSurface = (needle) => [...referentSurfaces].some((surface) => surface === needle.toLowerCase() || surface.includes(needle.toLowerCase()));
const hasHypothesis = (needle) => hypothesisSurfaces.has(needle.toLowerCase());
const surpriseTurns = reading.turns.filter((turn) => (turn.surprise?.operations?.length ?? 0) > 0);

const proposedTasks = reading.turns.flatMap((turn) => turn.proposedTasks ?? []);
const awakenedTasks = reading.turns.flatMap((turn) => turn.awakenedTasks ?? []);
const scheduledTasks = reading.turns.flatMap((turn) => turn.scheduledTasks ?? []);
const taskEvidence = reading.turns.flatMap((turn) => turn.taskEvidence ?? []);
const taskEvidenceRefs = [...new Set(taskEvidence.flatMap((entry) => entry.evidence ?? []))];
const retrievalDepths = taskEvidence.map((entry) => entry.depth).filter(Number.isFinite);
const strategyCounts = {};
for (const entry of taskEvidence) strategyCounts[entry.strategy ?? "clarify"] = (strategyCounts[entry.strategy ?? "clarify"] ?? 0) + 1;
const hlAffordances = Object.values(reading.hyperlexicon?.composition ?? {});
const hlCandidates = hlAffordances.filter((item) => item?.standing === "candidate");
const hlGiven = hlAffordances.filter((item) => item?.standing === "given");
const compositionDiagnostics = reading.compositionDiagnostics ?? {};

const requiredCharacters = ["Frankenstein", "Elizabeth", "Clerval", "Walton"];
const targetDescriptors = ["the creature", "the monster", "the fiend", "the wretch", "my father", "the hut", "the chamber", "this place"];
const missingCharacters = requiredCharacters.filter((name) => !hasNamedSurface(name));
const descriptorTargets = targetDescriptors.map((surface) => ({ surface, hypothesisPresent: hasHypothesis(surface) }));
const wretchMonsterClusters = discourseReferents.filter((ref) => {
  const s = new Set((ref.surfaces ?? []).map((x) => String(x).toLowerCase()));
  return s.has("the wretch") && s.has("the monster");
});
const creaturePulledIntoWretchMonster = wretchMonsterClusters.some((ref) => (ref.surfaces ?? []).map((x) => String(x).toLowerCase()).includes("the creature"));
const wrapperPollution = [...referentSurfaces].filter((surface) => /project gutenberg|gutenberg ebook|www\.gutenberg/.test(surface));
const topDiscourseReferents = discourseReferents.slice(0, 30).map((ref) => ({ id: ref.id, surfaces: ref.surfaces, occurrenceCount: ref.occurrenceRefs?.length ?? 0, supportCount: ref.supportRefs?.length ?? 0 }));

const metrics = {
  schema: "EOFrankensteinRecursiveReadingEval@4",
  sourceCharacters: source.length,
  bodyCharacters: stripped.text.length,
  encounters: encounters.length,
  observations: reading.fold.witnessed?.length ?? 0,
  referents: referents.length,
  namedReferents: namedReferents.length,
  discourseReferents: discourseReferents.length,
  pronounBindings: pronounBindings.length,
  descriptorOccurrences: descriptorOccurrences.length,
  descriptorHypotheses: identityHypotheses.length,
  discourseLinks: discourseLinks.length,
  descriptorTargets,
  wretchMonsterClusters: wretchMonsterClusters.length,
  creaturePulledIntoWretchMonster,
  topDiscourseReferents,
  relations: edges.length,
  transformations: reading.fold.transformationObjects?.length ?? 0,
  surpriseTurns: surpriseTurns.length,
  readingWork: {
    proposedTasks: proposedTasks.length,
    awakenedTasks: awakenedTasks.length,
    scheduledTasks: scheduledTasks.length,
    taskEvidence: taskEvidence.length,
    distinctTaskEvidenceRefs: taskEvidenceRefs.length,
    taskConditionedDescriptorOccurrences: taskConditionedOccurrences.length,
    maxRetrievalDepth: retrievalDepths.length ? Math.max(...retrievalDepths) : 0,
    averageRetrievalDepth: retrievalDepths.length ? retrievalDepths.reduce((a, b) => a + b, 0) / retrievalDepths.length : 0,
    strategyCounts,
  },
  hyperlexicon: {
    candidates: hlCandidates.length,
    given: hlGiven.length,
    withheldCompositions: withheldCompositions.length,
    licensedCompositions: licensedCompositions.length,
    relationEdges: compositionDiagnostics.relationEdges ?? 0,
    referentBindings: compositionDiagnostics.referentBindings ?? 0,
    witnessedEdges: compositionDiagnostics.witnessedEdges ?? 0,
    unresolvedEdges: compositionDiagnostics.unresolvedEdges ?? 0,
    chainSites: compositionDiagnostics.chainSites ?? 0,
    pairTypes: compositionDiagnostics.pairTypes ?? 0,
    repeatedPairTypes: compositionDiagnostics.repeatedPairTypes ?? 0,
    topRelationPairs: compositionDiagnostics.topPairs ?? [],
  },
  materiality: {
    materialObligations: materialObligations.length,
    identityObligations: identityObligations.length,
    compositionObligations: compositionObligations.length,
    dormantIdentityHypotheses: Math.max(0, identityHypotheses.length - identityObligations.length),
    dormantCompositionCandidates: Math.max(0, hlCandidates.length - compositionObligations.length),
  },
  missingCharacters,
  wrapperPollution,
  finalSequence: reading.fold.sequence,
  appendLogEntries: reading.log.length,
};
console.log(JSON.stringify(metrics, null, 2));

if (encounters.length < 1000) throw new Error(`too few encounters for Frankenstein: ${encounters.length}`);
if ((reading.fold.witnessed?.length ?? 0) < 100) throw new Error("native reading admitted too little witnessed structure");
if (namedReferents.length < 10) throw new Error(`too few named referents: ${namedReferents.length}`);
if (edges.length < 10) throw new Error(`too few witnessed relations: ${edges.length}`);
if (surpriseTurns.length < 10) throw new Error(`too few structurally revising turns: ${surpriseTurns.length}`);
if (missingCharacters.length) throw new Error(`major Frankenstein referents missing: ${missingCharacters.join(", ")}`);
if (wrapperPollution.length) throw new Error(`container text polluted cast: ${wrapperPollution.join(", ")}`);
if (targetDescriptors.some((surface) => !hasHypothesis(surface))) throw new Error("expected recurrent descriptor hypotheses are missing");
if (wretchMonsterClusters.length < 1) throw new Error("explicit wretch/monster apposition did not form a discourse referent");
if (creaturePulledIntoWretchMonster) throw new Error("surface-global collapse pulled a distinct creature occurrence into the wretch/monster cluster");
if (reading.log.length < encounters.length * 2) throw new Error("append-only reading log is unexpectedly sparse");
if (materialObligations.some((item) => item?.distinction?.materiality?.makesDifference !== true)) throw new Error("active material obligation lacks an explicit difference-that-makes-a-difference basis");
if (compositionDiagnostics.relationEdges !== edges.length) throw new Error("composition ledger did not retain all raw witnessed relations");
