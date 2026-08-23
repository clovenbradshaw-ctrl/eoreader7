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
const surfaces = new Set(referents.flatMap((ref) => ref.surfaces ?? []).map((x) => String(x).toLowerCase()));
const hasSurface = (needle) => [...surfaces].some((surface) => surface === needle.toLowerCase() || surface.includes(needle.toLowerCase()));
const surpriseTurns = reading.turns.filter((turn) => (turn.surprise?.operations?.length ?? 0) > 0);

const creatureTargets = ["the creature", "the monster", "the fiend", "the wretch"];
const edgesByEncounter = new Map();
for (const edge of edges) {
  const ref = edge?.meta?.encounterRef;
  if (!ref) continue;
  if (!edgesByEncounter.has(ref)) edgesByEncounter.set(ref, []);
  edgesByEncounter.get(ref).push({
    relation: edge.relation,
    participants: (edge.participants ?? []).map((p) => ({ role: p.role, standing: p.standing, surface: p.surface ?? null, ref: p.ref ?? null })),
  });
}
const creatureContexts = {};
for (const target of creatureTargets) {
  const hits = [];
  for (let i = 0; i < encounters.length && hits.length < 8; i += 1) {
    if (!encounters[i].material.toLowerCase().includes(target)) continue;
    hits.push({
      order: i,
      before: encounters[i - 1]?.material ?? null,
      sentence: encounters[i].material,
      after: encounters[i + 1]?.material ?? null,
      relations: edgesByEncounter.get(`encounter:${i}`) ?? [],
    });
  }
  creatureContexts[target] = hits;
}

const requiredCharacters = ["Frankenstein", "Elizabeth", "Clerval", "Walton"];
const targetDescriptors = [...creatureTargets, "my father", "the hut", "the chamber", "this place"];
const missingCharacters = requiredCharacters.filter((name) => !hasSurface(name));
const descriptorTargets = targetDescriptors.map((surface) => ({ surface, present: hasSurface(surface) }));
const wrapperPollution = [...surfaces].filter((surface) => /project gutenberg|gutenberg ebook|www\.gutenberg/.test(surface));

const metrics = {
  schema: "EOFrankensteinCreatureIdentityDiagnostic@1",
  encounters: encounters.length,
  referents: referents.length,
  namedReferents: namedReferents.length,
  provisionalDescriptorReferents: descriptorReferents.length,
  descriptorOccurrences: descriptorOccurrences.length,
  identityHypotheses: identityHypotheses.length,
  descriptorTargets,
  creatureContexts,
  relations: edges.length,
  transformations: reading.fold.transformationObjects?.length ?? 0,
  surpriseTurns: surpriseTurns.length,
  missingCharacters,
  wrapperPollution,
};
console.log(JSON.stringify(metrics, null, 2));
if (missingCharacters.length) throw new Error(`major Frankenstein referents missing: ${missingCharacters.join(", ")}`);
if (wrapperPollution.length) throw new Error(`container text polluted cast: ${wrapperPollution.join(", ")}`);
