import fs from "fs";
import { stripContainer } from "../adapters/text/spans.js";
import { createCausalTextPerceiver, textEncounters } from "../adapters/text/recursive.js";
import { reviseTextFold } from "../adapters/text/revision.js";
import { createRecursiveReader, deriveOrientation, executeStanceReasoning } from "../../kernel.js";

const path = process.argv[2];
if (!path) throw new TypeError("usage: node native/eval/frankenstein-stance.mjs <pg84.txt>");
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
const orientation = deriveOrientation(reading.fold, {
  terrainState: reading.terrainState,
  emergentTerrainState: reading.emergentTerrainState,
  kindState: reading.kindState,
  stanceState: reading.stanceState,
  referentEntities: reading.referentEntities,
});
const run = executeStanceReasoning(orientation, { terrain: "Network", includeGeneration: true });

const entries = reading.fold.graphEntries ?? [];
const edgeById = new Map(entries.filter((entry) => entry?.schema === "EOHyperedge@1").map((entry) => [entry.id, entry]));
const referentById = new Map(entries.filter((entry) => entry?.schema === "EOReferent@1").map((entry) => [entry.id, entry]));
const networks = orientation.terrainState?.Network ?? [];
const networkById = new Map(networks.map((network) => [network.id, network]));

const unique = (values = []) => [...new Set(values.filter(Boolean))];
const relationTypes = (network) => unique((network.edgeRefs ?? []).map((id) => edgeById.get(id)?.relation)).sort();
const referentSurfaces = (network) => unique((network.referentRefs ?? []).flatMap((id) => referentById.get(id)?.surfaces ?? [])).sort();
const signature = (network) => {
  const t = network.topology ?? {};
  return {
    topology: t.topology ?? "unknown",
    cycleRank: Number(t.cycleRank ?? 0),
    branchingReferents: Number(t.branchingReferents ?? 0),
    edgeCount: Number(t.edgeCount ?? network.edgeRefs?.length ?? 0),
    referentCount: Number(t.referentCount ?? network.referentRefs?.length ?? 0),
    incidenceCount: Number(t.incidenceCount ?? 0),
  };
};
const exactKey = (s) => `${s.topology}|b1:${s.cycleRank}|branch:${s.branchingReferents}|e:${s.edgeCount}|r:${s.referentCount}|i:${s.incidenceCount}`;
const coarseKey = (s) => `${s.topology}|b1:${s.cycleRank}|branch:${s.branchingReferents}`;
const summarizeNetwork = (network) => ({
  id: network.id,
  signature: signature(network),
  relationTypes: relationTypes(network),
  referentSurfaces: referentSurfaces(network).slice(0, 12),
  edgeRefs: [...(network.edgeRefs ?? [])],
});

const networkSummaries = networks.map(summarizeNetwork);
const summaryById = new Map(networkSummaries.map((item) => [item.id, item]));
const groupBy = (items, keyFn) => {
  const groups = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
};
const exactGroups = groupBy(networkSummaries, (item) => exactKey(item.signature));
const coarseGroups = groupBy(networkSummaries, (item) => coarseKey(item.signature));

const invariantFamilies = [...coarseGroups.entries()]
  .map(([key, members]) => ({
    key,
    count: members.length,
    networkIds: members.map((item) => item.id),
    relationVocabularies: members.map((item) => item.relationTypes),
    referentSurfaceSamples: members.map((item) => item.referentSurfaces.slice(0, 6)),
  }))
  .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

const repeatedExactFamilies = [...exactGroups.entries()]
  .filter(([, members]) => members.length > 1)
  .map(([key, members]) => ({ key, count: members.length, members }))
  .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

const exceptionalNetworks = networkSummaries
  .filter((item) => (exactGroups.get(exactKey(item.signature))?.length ?? 0) === 1 || item.signature.cycleRank > 0 || item.signature.branchingReferents > 0)
  .sort((a, b) => b.signature.cycleRank - a.signature.cycleRank || b.signature.branchingReferents - a.signature.branchingReferents || b.signature.edgeCount - a.signature.edgeCount)
  .slice(0, 12);

const unraveling = run.reasoning.filter((result) => result.stance === "Unraveling");
const tracing = run.reasoning.filter((result) => result.stance === "Tracing");
const equivalentPairs = tracing.filter((result) => result.claim?.equivalentAtThisResolution === true);
const crossVocabularyAnalogies = equivalentPairs.flatMap((result) => {
  const [leftId, rightId] = result.action?.inputRefs ?? [];
  const left = summaryById.get(leftId);
  const right = summaryById.get(rightId);
  if (!left || !right) return [];
  const leftRelations = left.relationTypes.join("|");
  const rightRelations = right.relationTypes.join("|");
  if (leftRelations === rightRelations) return [];
  return [{
    left: { id: left.id, signature: left.signature, relationTypes: left.relationTypes, referentSurfaces: left.referentSurfaces.slice(0, 8) },
    right: { id: right.id, signature: right.signature, relationTypes: right.relationTypes, referentSurfaces: right.referentSurfaces.slice(0, 8) },
    preserved: result.claim.preserved,
  }];
}).slice(0, 20);

const generation = run.generation.map((proposal) => {
  const networkId = proposal.action?.inputRefs?.[0];
  const context = networkById.get(networkId);
  return {
    id: proposal.id,
    kind: proposal.proposal?.kind,
    signature: proposal.proposal?.signature,
    prospectiveTest: proposal.proposal?.prospectiveTest,
    sourceNetwork: networkId,
    relationTypes: context ? relationTypes(context) : [],
    referentSurfaces: context ? referentSurfaces(context).slice(0, 10) : [],
    standing: proposal.standing,
    witnessed: proposal.witnessed,
    admissible: proposal.admissible,
    admission: proposal.admission,
  };
});

const report = {
  schema: "EOFrankensteinStanceReasoningEval@1",
  encounters: encounters.length,
  networkCount: networks.length,
  reasoningResultCount: run.reasoning.length,
  unravelingCount: unraveling.length,
  tracingCount: tracing.length,
  equivalentTracePairs: equivalentPairs.length,
  generationCount: generation.length,
  invariantFamilies,
  repeatedExactFamilies,
  exceptionalNetworks,
  crossVocabularyAnalogies,
  unravelingClaims: unraveling.map((result) => ({
    networkId: result.action?.inputRefs?.[0] ?? null,
    derivation: result.derivation,
    claim: result.claim,
    standing: result.standing,
  })),
  generatedHypotheses: generation,
  epistemicBoundary: {
    runWitnessed: run.witnessed,
    mutatesFold: run.mutatesFold,
    generatedWitnessed: generation.filter((item) => item.witnessed === true).length,
    generatedAdmissible: generation.filter((item) => item.admissible === true).length,
  },
};

console.log("STANCE_REASONING_REPORT_START");
console.log(JSON.stringify(report, null, 2));
console.log("STANCE_REASONING_REPORT_END");

if (networks.length < 2) throw new Error(`too few earned Networks for stance reasoning: ${networks.length}`);
if (unraveling.length !== networks.length) throw new Error("Unraveling did not execute once per earned Network");
if (tracing.length !== (networks.length * (networks.length - 1)) / 2) throw new Error("Tracing did not compare every earned Network pair");
if (generation.length !== networks.length) throw new Error("Composing did not generate one prospective Pattern candidate per earned Network");
if (!unraveling.every((result) => result.standing === "entailed_projection" && result.witnessed === false)) throw new Error("Unraveling failed to remain a derived, unwitnessed projection");
if (generation.some((item) => item.witnessed !== false || item.admissible !== false || item.admission !== "requires_prospective_grounding")) throw new Error("generated Network Pattern bypassed prospective grounding");
if (run.mutatesFold !== false) throw new Error("stance reasoning mutated the Fold");
