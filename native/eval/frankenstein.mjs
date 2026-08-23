import fs from "fs";
import { stripContainer } from "../adapters/text/spans.js";
import { createCausalTextPerceiver, textEncounters } from "../adapters/text/recursive.js";
import { reviseTextFold } from "../adapters/text/revision.js";
import { descriptorAliasAlternatives } from "../adapters/text/individuation.js";
import { createRecursiveReader } from "../../kernel.js";

const path = process.argv[2];
if (!path) throw new TypeError("usage: node native/eval/frankenstein.mjs <pg84.txt>");
const source = fs.readFileSync(path, "utf8");
const stripped = stripContainer(source);
if (!stripped.looks_like_material) throw new Error("Frankenstein input does not look like readable material");
const encounters = textEncounters(stripped.text, { source: "gutenberg:84", offset: stripped.offset });
const perceiver = createCausalTextPerceiver({ minRelationSurfaces: 2, refreshEvery: 25 });
const reader = createRecursiveReader({ perceivers: [perceiver], adapters: {
  revise: reviseTextFold,
  retrieve: (_fold, evidence) => Object.freeze({ schema: "EORelevantFold@1", witnessed: Object.freeze([...evidence]), provisional: Object.freeze([]), expectations: Object.freeze([]), obligations: Object.freeze([]), exclusions: Object.freeze([]), unresolvedAlternatives: Object.freeze([]), activeFrames: Object.freeze([]), receivedPriors: Object.freeze([]) }),
} });
const reading = await reader.read(encounters);
const entries = reading.fold.graphEntries ?? [];
const referents = entries.filter((x) => x?.schema === "EOReferent@1");
const namedReferents = referents.filter((x) => x?.standing !== "provisional");
const descriptorReferents = referents.filter((x) => x?.standing === "provisional" && x?.identityHypothesis);
const edges = entries.filter((x) => x?.schema === "EOHyperedge@1");
const descriptorOccurrences = entries.filter((x) => x?.schema === "EOReferentOccurrence@1");
const identityHypotheses = entries.filter((x) => x?.schema === "EOIdentityHypothesis@1");
const aliasFrontier = descriptorAliasAlternatives(identityHypotheses);
const surfaces = new Set(referents.flatMap((ref) => ref.surfaces ?? []).map((x) => String(x).toLowerCase()));
const hasSurface = (needle) => [...surfaces].some((surface) => surface === needle.toLowerCase() || surface.includes(needle.toLowerCase()));
const surpriseTurns = reading.turns.filter((turn) => (turn.surprise?.operations?.length ?? 0) > 0);

const requiredCharacters = ["Frankenstein", "Elizabeth", "Clerval", "Walton"];
const targetDescriptors = ["the creature", "the monster", "the fiend", "the wretch", "my father", "the hut", "the chamber", "this place"];
const creatureSurfaces = new Set(["the creature", "the monster", "the fiend", "the wretch"]);
const targetAliasPairs = aliasFrontier.alternatives
  .filter((x) => creatureSurfaces.has(x.leftSurface) && creatureSurfaces.has(x.rightSurface))
  .map((x) => ({ left: x.leftSurface, right: x.rightSurface, score: x.score, fence: x.nullFence, sharedContext: x.sharedContext }));
const topAliasAlternatives = aliasFrontier.alternatives.slice(0, 30).map((x) => ({ left: x.leftSurface, right: x.rightSurface, score: x.score, sharedContext: x.sharedContext.slice(0, 12) }));
const missingCharacters = requiredCharacters.filter((name) => !hasSurface(name));
const descriptorTargets = targetDescriptors.map((surface) => ({ surface, present: hasSurface(surface) }));
const wrapperPollution = [...surfaces].filter((surface) => /project gutenberg|gutenberg ebook|www\.gutenberg/.test(surface));

const metrics = {
  schema: "EOFrankensteinNativeEval@4",
  sourceCharacters: source.length,
  bodyCharacters: stripped.text.length,
  encounters: encounters.length,
  observations: reading.fold.witnessed?.length ?? 0,
  referents: referents.length,
  namedReferents: namedReferents.length,
  provisionalDescriptorReferents: descriptorReferents.length,
  descriptorTargets,
  descriptorOccurrences: descriptorOccurrences.length,
  identityHypotheses: identityHypotheses.length,
  aliasNullFence: aliasFrontier.fence,
  aliasPairCount: aliasFrontier.pairCount,
  aliasAlternatives: aliasFrontier.alternatives.length,
  targetAliasPairs,
  topAliasAlternatives,
  relations: edges.length,
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
