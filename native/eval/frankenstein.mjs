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
const perceiver = createCausalTextPerceiver({ minRelationSurfaces: 2, refreshEvery: 25 });
const reader = createRecursiveReader({
  perceivers: [perceiver],
  adapters: {
    revise: reviseTextFold,
    retrieve: (_fold, evidence) => Object.freeze({
      schema: "EORelevantFold@1",
      witnessed: Object.freeze([...evidence]),
      provisional: Object.freeze([]),
      expectations: Object.freeze([]),
      obligations: Object.freeze([]),
      exclusions: Object.freeze([]),
      unresolvedAlternatives: Object.freeze([]),
      activeFrames: Object.freeze([]),
      receivedPriors: Object.freeze([]),
    }),
  },
});

const reading = await reader.read(encounters);
const entries = reading.fold.graphEntries ?? [];
const referents = entries.filter((entry) => entry?.schema === "EOReferent@1");
const edges = entries.filter((entry) => entry?.schema === "EOHyperedge@1");
const descriptorOccurrences = entries.filter((entry) => entry?.schema === "EOReferentOccurrence@1");
const identityHypotheses = entries.filter((entry) => entry?.schema === "EOIdentityHypothesis@1");
const surfaces = new Set(referents.flatMap((ref) => ref.surfaces ?? []).map((x) => String(x).toLowerCase()));
const hasSurface = (needle) => [...surfaces].some((surface) => surface.includes(needle.toLowerCase()));
const surpriseTurns = reading.turns.filter((turn) => (turn.surprise?.operations?.length ?? 0) > 0);

const unresolvedCounts = new Map();
let unresolvedOccurrences = 0;
for (const edge of edges) {
  for (const participant of edge.participants ?? []) {
    if (participant?.standing !== "unresolved_surface") continue;
    unresolvedOccurrences += 1;
    const key = String(participant.surface ?? participant.surfaceKey ?? "").trim().toLowerCase();
    if (!key) continue;
    unresolvedCounts.set(key, (unresolvedCounts.get(key) ?? 0) + 1);
  }
}
const topUnresolvedSurfaces = [...unresolvedCounts.entries()]
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .slice(0, 30)
  .map(([surface, count]) => ({ surface, count }));

const topIdentityHypotheses = identityHypotheses
  .slice()
  .sort((a, b) => (b.occurrenceRefs?.length ?? 0) - (a.occurrenceRefs?.length ?? 0))
  .slice(0, 30)
  .map((hypothesis) => ({
    surface: hypothesis.surface,
    occurrences: hypothesis.occurrenceRefs?.length ?? 0,
    encounters: hypothesis.encounterRefs?.length ?? 0,
    relations: [...new Set((hypothesis.relationContexts ?? []).map((x) => x.relation).filter(Boolean))],
    roles: [...new Set((hypothesis.relationContexts ?? []).map((x) => x.role).filter(Boolean))],
  }));

const requiredCharacters = ["Frankenstein", "Elizabeth", "Clerval", "Walton"];
const missingCharacters = requiredCharacters.filter((name) => !hasSurface(name));
const wrapperPollution = [...surfaces].filter((surface) => /project gutenberg|gutenberg ebook|www\.gutenberg/.test(surface));

const metrics = {
  schema: "EOFrankensteinNativeEval@2",
  sourceCharacters: source.length,
  bodyCharacters: stripped.text.length,
  sourceOffset: stripped.offset,
  frontMatter: stripped.front,
  encounters: encounters.length,
  observations: reading.fold.witnessed?.length ?? 0,
  referents: referents.length,
  descriptorOccurrences: descriptorOccurrences.length,
  identityHypotheses: identityHypotheses.length,
  topIdentityHypotheses,
  relations: edges.length,
  unresolvedRelationParticipants: unresolvedOccurrences,
  uniqueUnresolvedSurfaces: unresolvedCounts.size,
  topUnresolvedSurfaces,
  transformations: reading.fold.transformationObjects?.length ?? 0,
  surpriseTurns: surpriseTurns.length,
  majorCharactersPresent: requiredCharacters.filter((name) => hasSurface(name)),
  missingCharacters,
  wrapperPollution,
  finalSequence: reading.fold.sequence,
  appendLogEntries: reading.log.length,
};

console.log(JSON.stringify(metrics, null, 2));

if (encounters.length < 1000) throw new Error(`too few encounters for Frankenstein: ${encounters.length}`);
if ((reading.fold.witnessed?.length ?? 0) < 100) throw new Error("native reading admitted too little witnessed structure");
if (referents.length < 10) throw new Error(`too few referents: ${referents.length}`);
if (edges.length < 10) throw new Error(`too few witnessed relations: ${edges.length}`);
if (surpriseTurns.length < 10) throw new Error(`too few structurally revising turns: ${surpriseTurns.length}`);
if (missingCharacters.length) throw new Error(`major Frankenstein referents missing: ${missingCharacters.join(", ")}`);
if (wrapperPollution.length) throw new Error(`container text polluted cast: ${wrapperPollution.join(", ")}`);
if (reading.log.length < encounters.length * 2) throw new Error("append-only reading log is unexpectedly sparse");
