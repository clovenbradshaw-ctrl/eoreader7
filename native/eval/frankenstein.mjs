import fs from "fs";
import { stripContainer } from "../adapters/text/spans.js";
import { createCausalTextPerceiver, textEncounters } from "../adapters/text/recursive.js";
import { reviseTextFold, createTextRevisionIndex } from "../adapters/text/revision.js";
import { createRecursiveReader, deriveOrientation, reasoningAffordances, novelGenerationAffordances } from "../../kernel.js";

const path = process.argv[2];
if (!path) throw new TypeError("usage: node native/eval/frankenstein.mjs <pg84.txt>");
const source = fs.readFileSync(path, "utf8");
const stripped = stripContainer(source);
if (!stripped.looks_like_material) throw new Error("Frankenstein input does not look like readable material");
const relationPosPrior = JSON.parse(fs.readFileSync(new URL("../../bin/priors/pos/en-ud-ewt.json", import.meta.url), "utf8"));

const encounters = textEncounters(stripped.text, { source: "gutenberg:84", offset: stripped.offset });
const perceiver = createCausalTextPerceiver({
  minRelationSurfaces: 2,
  refreshEvery: 25,
  relationPosPrior,
  pronounResolution: { minActivation: 0.05, minMargin: 0.2 },
});
const revisionIndex = createTextRevisionIndex();
const reader = createRecursiveReader({
  perceivers: [perceiver],
  adapters: {
    // One persistent index across this whole sequential, single-book read:
    // each turn costs O(what changed this turn), not O(book read so far).
    revise: (args) => reviseTextFold({ ...args, index: revisionIndex }),
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
const definiteBindings = entries.filter((entry) => entry?.schema === "EODefiniteBinding@1");
const occurrenceBindings = [...pronounBindings, ...definiteBindings];
const descriptorOccurrences = entries.filter((entry) => entry?.schema === "EOReferentOccurrence@1");
const taskConditionedOccurrences = entries.filter((entry) => entry?.schema === "EOTaskTargetOccurrence@1");
const identityHypotheses = entries.filter((entry) => entry?.schema === "EOIdentityHypothesis@1");
const discourseLinks = entries.filter((entry) => entry?.schema === "EODiscourseIdentityLink@1");
const kindEvidence = entries.filter((entry) => entry?.schema === "EOKindEvidence@1");
const explicitKindEvidence = kindEvidence.filter((entry) => entry?.evidenceType === "explicit_classification");
const structuralKindEvidence = kindEvidence.filter((entry) => entry?.evidenceType === "structural_feature");
const receivedKinds = (reading.kindState ?? []).filter((entry) => entry?.standing === "received_explicit_classification");
const earnedKinds = (reading.kindState ?? []).filter((entry) => entry?.standing === "earned_invariant");
const existentialGrounds = entries.filter((entry) => entry?.schema === "EOExistentialGround@1");
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
const countsOf = (state = {}) => Object.fromEntries(Object.entries(state).map(([key, values]) => [key, values?.length ?? 0]));
const directTerrainCounts = countsOf(reading.terrainState);
const emergentTerrainCounts = countsOf(reading.emergentTerrainState);
const effectiveTerrainCounts = countsOf(reading.effectiveTerrainState);
const liveStanceCounts = countsOf(reading.stanceState);
const finalOrientation = deriveOrientation(reading.fold, {
  terrainState: reading.terrainState,
  emergentTerrainState: reading.emergentTerrainState,
  kindState: reading.kindState,
  stanceState: reading.stanceState,
});
const reasoningMoves = reasoningAffordances(finalOrientation);
const novelMoves = novelGenerationAffordances(finalOrientation);
const reasoningByMove = {};
const reasoningByTerrain = {};
for (const move of reasoningMoves) {
  reasoningByMove[move.move] = (reasoningByMove[move.move] ?? 0) + 1;
  reasoningByTerrain[move.address.terrain] = (reasoningByTerrain[move.address.terrain] ?? 0) + 1;
}
const novelByTerrain = {};
for (const move of novelMoves) novelByTerrain[move.address.terrain] = (novelByTerrain[move.address.terrain] ?? 0) + 1;

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
const kindSamples = (reading.kindState ?? []).slice(0, 30).map((kind) => ({
  id: kind.id,
  standing: kind.standing,
  kindKey: kind.kindKey,
  kindSurface: kind.kindSurface ?? null,
  basis: kind.basis,
  memberCount: kind.memberRefs?.length ?? 0,
  selector: kind.selector ?? null,
  consequence: kind.consequence ?? null,
  modalities: kind.modalities ?? [],
}));

const occurrenceById = new Map(descriptorOccurrences.map((entry) => [entry.id, entry]));
const continuationDiagnostics = wretchMonsterClusters.map((ref) => {
  const supportingOccurrences = (ref.occurrenceRefs ?? []).map((id) => occurrenceById.get(id)).filter(Boolean);
  const supportOffsets = supportingOccurrences.map((occ) => Number(String(occ.encounterRef ?? "").match(/:(\d+)$/)?.[1])).filter(Number.isFinite);
  const supportOffset = supportOffsets.length ? Math.min(...supportOffsets) : null;
  const supportEncounter = supportOffset == null ? null : encounters.find((item) => item.anchor?.start <= supportOffset && item.anchor?.end >= supportOffset);
  const supportSequence = supportEncounter?.sequencePosition ?? null;
  const surfaces = (ref.surfaces ?? []).map((surface) => String(surface).toLowerCase());
  const laterEncounters = supportSequence == null ? [] : encounters.filter((item) => item.sequencePosition > supportSequence && surfaces.some((surface) => String(item.material ?? "").toLowerCase().includes(surface)));
  const relationHits = supportSequence == null ? [] : edges.flatMap((edge) => {
    if ((edge.scope?.sequencePosition ?? -1) <= supportSequence) return [];
    return (edge.participants ?? []).filter((participant) => surfaces.some((surface) => String(participant.surface ?? "").toLowerCase().includes(surface))).map((participant) => ({
      edge: edge.id,
      sequencePosition: edge.scope?.sequencePosition ?? null,
      relation: edge.relation,
      role: participant.role,
      surface: participant.surface,
      standing: participant.standing,
    }));
  });
  return {
    referent: ref.id,
    surfaces,
    supportOffset,
    supportSequence,
    laterEncounterHits: laterEncounters.length,
    laterEncounterSamples: laterEncounters.slice(0, 8).map((item) => ({ sequencePosition: item.sequencePosition, material: item.material })),
    laterRelationParticipantHits: relationHits.length,
    laterRelationParticipantSamples: relationHits.slice(0, 12),
  };
});

const metrics = {
  schema: "EOFrankensteinRecursiveReadingEval@11",
  sourceCharacters: source.length,
  bodyCharacters: stripped.text.length,
  encounters: encounters.length,
  observations: reading.fold.witnessed?.length ?? 0,
  referents: referents.length,
  namedReferents: namedReferents.length,
  discourseReferents: discourseReferents.length,
  occurrenceBindings: occurrenceBindings.length,
  pronounBindings: pronounBindings.length,
  definiteBindings: definiteBindings.length,
  descriptorOccurrences: descriptorOccurrences.length,
  descriptorHypotheses: identityHypotheses.length,
  discourseLinks: discourseLinks.length,
  kindEvidence: kindEvidence.length,
  explicitKindEvidence: explicitKindEvidence.length,
  structuralKindEvidence: structuralKindEvidence.length,
  receivedKinds: receivedKinds.length,
  earnedKinds: earnedKinds.length,
  kindDiagnostics: reading.kindDiagnostics ?? {},
  kindSamples,
  existentialGrounds: existentialGrounds.length,
  descriptorTargets,
  wretchMonsterClusters: wretchMonsterClusters.length,
  creaturePulledIntoWretchMonster,
  topDiscourseReferents,
  continuationDiagnostics,
  relations: edges.length,
  transformations: reading.fold.transformationObjects?.length ?? 0,
  surpriseTurns: surpriseTurns.length,
  directTerrainState: directTerrainCounts,
  emergentTerrainState: emergentTerrainCounts,
  terrainState: effectiveTerrainCounts,
  stanceState: liveStanceCounts,
  reasoning: {
    affordances: reasoningMoves.length,
    byMove: reasoningByMove,
    byTerrain: reasoningByTerrain,
    withStanceContinuity: reasoningMoves.filter((move) => move.stanceContinuity).length,
    addresses: reasoningMoves.map((move) => ({ move: move.move, terrain: move.address.terrain, stance: move.address.stance, continuity: move.stanceContinuity })),
  },
  novelGeneration: {
    affordances: novelMoves.length,
    byTerrain: novelByTerrain,
    withStanceContinuity: novelMoves.filter((move) => move.stanceContinuity).length,
    addresses: novelMoves.map((move) => ({ terrain: move.address.terrain, stance: move.address.stance, continuity: move.stanceContinuity, admission: move.admission })),
  },
  relationPrior: {
    schema: relationPosPrior.schema,
    language: relationPosPrior.language,
    source: relationPosPrior.provenance?.source ?? null,
    tokensRead: relationPosPrior.provenance?.tokens_read ?? null,
    formsKept: relationPosPrior.provenance?.forms_kept ?? null,
  },
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
    withheldCompositionsInFold: withheldCompositions.length,
    licensedCompositions: licensedCompositions.length,
    relationEdges: compositionDiagnostics.relationEdges ?? 0,
    referentBindings: compositionDiagnostics.referentBindings ?? 0,
    indexedEdges: compositionDiagnostics.indexedEdges ?? 0,
    bridgeEligibleEdges: compositionDiagnostics.bridgeEligibleEdges ?? 0,
    compositionEligibleEdges: compositionDiagnostics.compositionEligibleEdges ?? 0,
    fullyReferentResolvedEdges: compositionDiagnostics.fullyReferentResolvedEdges ?? 0,
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
if (withheldCompositions.length !== compositionObligations.length) throw new Error("dormant composition candidates leaked into Fold");
if (explicitKindEvidence.length < 1) throw new Error("Frankenstein exposed no explicit Kind evidence");
if ((reading.kindState?.length ?? 0) < 1) throw new Error("Frankenstein exposed no present-tense Kind projection");
for (const terrain of ["Void", "Entity", "Kind", "Field", "Link", "Network", "Atmosphere", "Lens", "Paradigm"]) {
  if ((effectiveTerrainCounts[terrain] ?? 0) < 1) throw new Error(`effective ${terrain} terrain disappeared from the real reading path`);
  if ((reasoningByTerrain[terrain] ?? 0) !== 3) throw new Error(`${terrain} does not expose all three reasoning modes`);
  if ((novelByTerrain[terrain] ?? 0) !== 1) throw new Error(`${terrain} does not expose its grounded-required generation affordance`);
}
if (novelMoves.some((move) => move.witnessed !== false || move.admissible !== false || move.admission !== "requires_grounding")) throw new Error("novel generation proposal bypassed grounding/admission boundary");
