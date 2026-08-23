import { eoOperation, deltaFold } from "../../kernel/fold.js";
import { deriveIdentityRevision } from "../../kernel/identity.js";
import { differenceMakesDifference } from "../../kernel/materiality.js";
import { obligation, openObligation } from "../../kernel/obligations.js";
import {
  descriptorOccurrence,
  directDescriptorOccurrences,
  descriptorHypotheses,
} from "./individuation.js";
import {
  appositionalDescriptorBindings,
  projectDiscourseReferents,
} from "./discourse-referents.js";
import { textIdentityEvidence } from "./identity-evidence.js";

const existingIds = (fold) => new Set((fold?.graphEntries ?? []).map((entry) => entry?.id).filter(Boolean));
const slug = (value) => String(value ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "");
const OCCURRENCE_BINDING_SCHEMAS = new Set(["EOPronounBinding@1", "EODefiniteBinding@1"]);

function identityObligationFor(hypothesis, fold = {}, graph = null) {
  const relationContexts = (hypothesis?.relationContexts ?? []).filter((context) => context?.edge);
  const edgeRefs = [...new Set(relationContexts.map((context) => context.edge))];
  if (!edgeRefs.length) return null;

  const surfaceKey = `surface:${slug(hypothesis.surface)}`;
  const distinction = {
    hypothesis: hypothesis.id,
    surfaceKey,
    occurrences: [...(hypothesis.occurrenceRefs ?? [])],
    addressedRelationPositions: relationContexts.map((context) => ({ edge: context.edge, relation: context.relation, role: context.role })),
  };
  const consequences = edgeRefs.map((edge) => ({ kind: "relation_attribution", edge }));
  const materiality = differenceMakesDifference({ distinction, consequences, fold, graph });
  if (!materiality.makesDifference) return null;

  return obligation({
    id: `obligation:identity:${hypothesis.id}`,
    distinction: { ...distinction, materiality },
    grounds: [...new Set([hypothesis.id, ...(hypothesis.occurrenceRefs ?? []), ...edgeRefs])],
    alternatives: [...(hypothesis.occurrenceRefs ?? [])],
    consequences,
    openedAt: (fold?.sequence ?? 0) + 1,
    persistence: 0,
  });
}

/** Convert witnessed text structure into warranted EO change. */
export async function reviseTextFold({ observations = [], fold = {}, graph = null } = {}) {
  const known = existingIds(fold);
  const operations = [];
  const newDescriptorOccurrences = [];
  const currentGraphEntries = [];
  const currentEdgeIds = new Set();
  const identitySupports = [];
  const identityAttacks = [];

  const admitGraphObject = (value, { op = "INS", grain = "Ground", witness = null, consequence = null } = {}) => {
    if (!value?.id || known.has(value.id)) return false;
    known.add(value.id);
    currentGraphEntries.push(value);
    operations.push(eoOperation({ op, grain, witness, outputs: [value.id], consequence, payload: { action: "graph-object", value } }));
    return true;
  };

  const admitOccurrence = (occurrence, witnessRef) => {
    if (!occurrence || !admitGraphObject(occurrence, {
      op: "INS",
      grain: "Ground",
      witness: witnessRef,
      consequence: { kind: "referent_occurrence_witnessed", occurrence: occurrence.id },
    })) return;
    newDescriptorOccurrences.push(occurrence);
  };

  for (const observation of observations) {
    const witnessRef = observation?.id ?? observation?.witness ?? null;
    const encounterRef = observation?.provenance?.source != null
      ? `${observation.provenance.source}:${observation.anchor?.start ?? observation.id ?? "?"}`
      : observation?.id ?? "unknown";

    const identity = textIdentityEvidence(observation?.witness, {
      alternatives: fold?.unresolvedAlternatives ?? [],
      witness: witnessRef,
    });
    identitySupports.push(...identity.supports);
    identityAttacks.push(...identity.attacks);

    // Occurrence resolution is interpretation conditioned by the prior Fold,
    // not part of the raw relation witness. Pronoun and definite-anaphora
    // mechanisms may nominate a binding, but each enters Fold explicitly as a
    // provisional CON object so later reasoning can revise it without rewriting
    // the witnessed relation edge.
    for (const distinction of observation?.distinctions ?? []) {
      const binding = distinction?.kind === "occurrence_binding" || distinction?.kind === "pronoun_binding" ? distinction.binding : null;
      if (!OCCURRENCE_BINDING_SCHEMAS.has(binding?.schema) || !binding.id || known.has(binding.id)) continue;
      known.add(binding.id);
      operations.push(eoOperation({
        op: "CON",
        grain: "Figure",
        witness: witnessRef,
        inputs: [binding.occurrence, binding.referent].filter(Boolean),
        outputs: [binding.id],
        consequence: { kind: "occurrence_binding_projected", binding: binding.id, occurrence: binding.occurrence, referent: binding.referent },
        payload: { action: "provisional", value: binding },
      }));
    }

    for (const occurrence of directDescriptorOccurrences(observation?.witness, { encounterRef })) admitOccurrence(occurrence, witnessRef);

    const discourse = appositionalDescriptorBindings(observation?.witness, { encounterRef, witness: witnessRef });
    for (const occurrence of discourse.occurrences) admitOccurrence(occurrence, witnessRef);
    for (const link of discourse.links) admitGraphObject(link, { op: "CON", grain: "Figure", witness: witnessRef, consequence: { kind: "discourse_identity_supported", link: link.id } });

    for (const entry of observation?.graphEntries ?? []) {
      currentGraphEntries.push(entry);
      if (entry?.schema !== "EOReferent@1" || !entry.id || known.has(entry.id)) continue;
      known.add(entry.id);
      operations.push(eoOperation({ op: "INS", grain: "Figure", witness: witnessRef, outputs: [entry.id], consequence: { kind: "referent_admitted", ref: entry.id }, payload: { action: "graph-object", value: entry } }));
    }

    for (const edge of observation?.hyperedges ?? []) {
      if (edge?.schema !== "EOHyperedge@1") continue;
      currentGraphEntries.push(edge);
      if (edge.id) currentEdgeIds.add(edge.id);
      for (const participant of edge.participants ?? []) {
        admitOccurrence(descriptorOccurrence(participant, { encounterRef, edge }), witnessRef);
      }
      if (!edge.id || known.has(edge.id)) continue;
      known.add(edge.id);
      operations.push(eoOperation({
        op: "CON",
        grain: "Figure",
        witness: witnessRef,
        inputs: (edge.participants ?? []).map((participant) => participant.ref).filter(Boolean),
        outputs: [edge.id],
        consequence: { kind: "relation_witnessed", edge: edge.id },
        payload: { action: "hyperedge", value: edge },
      }));
    }
  }

  const newOccurrenceIds = new Set(newDescriptorOccurrences.map((occurrence) => occurrence.id));
  const identitySource = [
    ...(fold?.graphEntries ?? []).filter((x) => x?.schema === "EOReferentOccurrence@1"),
    ...newDescriptorOccurrences,
  ];
  for (const hypothesis of descriptorHypotheses(identitySource)) {
    const isNew = !known.has(hypothesis.id);
    if (isNew) {
      known.add(hypothesis.id);
      operations.push(eoOperation({
        op: "CON",
        grain: "Figure",
        inputs: [...hypothesis.occurrenceRefs],
        outputs: [hypothesis.id],
        consequence: { kind: "identity_hypothesis_opened", hypothesis: hypothesis.id },
        payload: { action: "provisional", value: hypothesis },
      }));
    }

    const changedNow = isNew
      || (hypothesis.occurrenceRefs ?? []).some((id) => newOccurrenceIds.has(id))
      || (hypothesis.relationContexts ?? []).some((context) => currentEdgeIds.has(context?.edge));
    if (!changedNow) continue;

    const unresolved = identityObligationFor(hypothesis, fold, graph);
    if (unresolved && !known.has(unresolved.id)) {
      known.add(unresolved.id);
      operations.push(openObligation(unresolved, { witness: hypothesis.occurrenceRefs, grain: "Figure", op: "DEF" }));
    }
  }

  const discourseSource = [...(fold?.graphEntries ?? []), ...currentGraphEntries];
  for (const referent of projectDiscourseReferents(discourseSource)) {
    if (known.has(referent.id)) continue;
    admitGraphObject(referent, {
      op: "INS",
      grain: "Figure",
      consequence: { kind: "contextual_referent_admitted", ref: referent.id, defeasibleBy: ["SEG", "DEF", "REC"] },
    });
  }

  const identityDelta = deriveIdentityRevision({
    fold: { ...fold, graphEntries: [...(fold?.graphEntries ?? []), ...currentGraphEntries] },
    supports: identitySupports,
    attacks: identityAttacks,
  });
  operations.push(...identityDelta.operations);

  return deltaFold(operations);
}
