import fs from "fs";
import { stripContainer } from "../adapters/text/spans.js";
import { createCausalTextPerceiver, textEncounters } from "../adapters/text/recursive.js";
import { reviseTextFold, createTextRevisionIndex } from "../adapters/text/revision.js";
import { createRecursiveReader, kindEvidence, projectKinds } from "../../kernel.js";

const path = process.argv[2];
if (!path) throw new TypeError("usage: node native/eval/frankenstein-kind-probe.mjs <pg84.txt>");
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
const refs = entries.filter((entry) => entry?.schema === "EOReferent@1");
const edges = entries.filter((entry) => entry?.schema === "EOHyperedge@1").slice().sort((a, b) => (a.scope?.sequencePosition ?? 0) - (b.scope?.sequencePosition ?? 0));
const bindings = entries.filter((entry) => entry?.schema === "EOPronounBinding@1" || entry?.schema === "EODefiniteBinding@1");
const explicitStructural = entries.filter((entry) => entry?.schema === "EOKindEvidence@1" && entry.evidenceType === "structural_feature");

const bindingByOccurrence = new Map();
for (const binding of bindings) {
  const occurrence = binding.occurrence ?? binding.occurrenceRef ?? binding.from ?? null;
  const referent = binding.referent ?? binding.referentId ?? binding.to ?? null;
  if (occurrence && referent) bindingByOccurrence.set(occurrence, referent);
}
const canonicalRef = (participant) => {
  if (!participant?.ref) return null;
  if (participant.standing === "referent") return participant.ref;
  return bindingByOccurrence.get(participant.ref) ?? null;
};

const evidence = [...explicitStructural];
const seenEvidence = new Set(evidence.map((entry) => entry.id));
const participationCount = new Map();
const rolesByEntity = new Map();
const predicatesByEntity = new Map();
const thresholds = [2, 4, 8, 16];

function add(entry) {
  if (!entry || seenEvidence.has(entry.id)) return;
  seenEvidence.add(entry.id);
  evidence.push(entry);
}

for (const edge of edges) {
  const at = edge.scope?.sequencePosition;
  if (!Number.isFinite(at)) continue;
  for (let i = 0; i < (edge.participants ?? []).length; i += 1) {
    const participant = edge.participants[i];
    const entityRef = canonicalRef(participant);
    if (!entityRef) continue;
    const role = participant.role ?? "participant";
    add(kindEvidence({
      id: `probe:role:${edge.id}:${i}`,
      entityRef,
      featureKey: "relation_role",
      featureValue: role,
      sequencePosition: at,
      witness: edge.witness,
      provenance: { modality: "text", giver: "eval/frankenstein-kind-probe", basis: "canonicalized_hyperedge_role", sourceRef: edge.id },
    }));

    const nextCount = (participationCount.get(entityRef) ?? 0) + 1;
    participationCount.set(entityRef, nextCount);
    if (thresholds.includes(nextCount)) add(kindEvidence({
      id: `probe:participation-depth:${entityRef}:${nextCount}`,
      entityRef,
      featureKey: "relation_participation_depth",
      featureValue: `${nextCount}+`,
      sequencePosition: at,
      witness: edge.witness,
      provenance: { modality: "text", giver: "eval/frankenstein-kind-probe", basis: "witnessed_relation_recurrence_threshold", sourceRef: edge.id },
    }));

    if (!rolesByEntity.has(entityRef)) rolesByEntity.set(entityRef, new Set());
    const roles = rolesByEntity.get(entityRef);
    const roleSizeBefore = roles.size;
    roles.add(role);
    if (roles.size > roleSizeBefore && roles.has("subject") && roles.has("object")) add(kindEvidence({
      id: `probe:role-breadth:${entityRef}:subject-object`,
      entityRef,
      featureKey: "relation_role_breadth",
      featureValue: "subject_object",
      sequencePosition: at,
      witness: edge.witness,
      provenance: { modality: "text", giver: "eval/frankenstein-kind-probe", basis: "witnessed_role_breadth", sourceRef: edge.id },
    }));

    if (!predicatesByEntity.has(entityRef)) predicatesByEntity.set(entityRef, new Set());
    const predicates = predicatesByEntity.get(entityRef);
    const predicateSizeBefore = predicates.size;
    predicates.add(edge.relation);
    if (predicates.size > predicateSizeBefore && thresholds.includes(predicates.size)) add(kindEvidence({
      id: `probe:predicate-diversity:${entityRef}:${predicates.size}`,
      entityRef,
      featureKey: "relation_diversity_depth",
      featureValue: `${predicates.size}+`,
      sequencePosition: at,
      witness: edge.witness,
      provenance: { modality: "text", giver: "eval/frankenstein-kind-probe", basis: "witnessed_relation_diversity_threshold", sourceRef: edge.id },
    }));
  }
}

// This probe intentionally exercises the pre-basin single-selector control.
// Ordinary EOReader7 reading leaves this admission path disabled. Keeping the
// diagnostic lets us compare the historical statistic without mistaking it for
// canonical Kind ontology.
const kinds = projectKinds(evidence, { legacySelectorAdmission: true });
const earned = kinds.filter((kind) => kind.standing === "earned_invariant");
const refById = new Map(refs.map((ref) => [ref.id, ref]));
const describe = (id) => ({ id, surfaces: refById.get(id)?.surfaces ?? [] });
const samples = earned.map((kind) => ({
  kindKey: kind.kindKey,
  selector: kind.selector,
  consequence: kind.consequence,
  memberCount: kind.memberRefs?.length ?? 0,
  fitMembers: (kind.fitMemberRefs ?? []).map(describe),
  holdoutMembers: (kind.holdoutMemberRefs ?? []).map(describe),
  validation: kind.validation,
  members: (kind.memberRefs ?? []).slice(0, 20).map(describe),
}));

console.log(JSON.stringify({
  schema: "EOFrankensteinLegacySelectorDiagnostic@1",
  canonicalKindMechanism: "interaction_affinity_basin_with_prospective_admission",
  legacySelectorAdmission: true,
  encounters: encounters.length,
  graphRelations: edges.length,
  bindings: bindings.length,
  canonicalizedEntitiesWithRelations: participationCount.size,
  structuralEvidence: evidence.length,
  entitiesAtDepth2: [...participationCount.values()].filter((count) => count >= 2).length,
  entitiesAtDepth4: [...participationCount.values()].filter((count) => count >= 4).length,
  entitiesAtDepth8: [...participationCount.values()].filter((count) => count >= 8).length,
  diagnosticKinds: earned.length,
  samples,
}, null, 2));