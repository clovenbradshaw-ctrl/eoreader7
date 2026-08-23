import { eoOperation, deltaFold } from "../../kernel/fold.js";
import { deriveIdentityRevision } from "../../kernel/identity.js";
import {
  descriptorOccurrence,
  directDescriptorOccurrences,
  descriptorHypotheses,
} from "./individuation.js";
import {
  appositionalDescriptorBindings,
  demonstrativeSuccessionBindings,
  projectDiscourseReferents,
} from "./discourse-referents.js";
import { textIdentityEvidence } from "./identity-evidence.js";

const existingIds = (fold) => new Set((fold?.graphEntries ?? []).map((entry) => entry?.id).filter(Boolean));
const encounterRefOf = (observation) => observation?.provenance?.source != null
  ? `${observation.provenance.source}:${observation.anchor?.start ?? observation.id ?? "?"}`
  : observation?.id ?? "unknown";

export async function reviseTextFold({ observations = [], fold = {} } = {}) {
  const known = existingIds(fold);
  const operations = [];
  const newDescriptorOccurrences = [];
  const currentGraphEntries = [];
  const identitySupports = [];
  const identityAttacks = [];
  let previousObservation = (fold?.witnessed ?? []).at(-1) ?? null;

  const admitGraphObject = (value, { op = "INS", grain = "Ground", witness = null, consequence = null } = {}) => {
    if (!value?.id || known.has(value.id)) return false;
    known.add(value.id);
    currentGraphEntries.push(value);
    operations.push(eoOperation({ op, grain, witness, outputs: [value.id], consequence, payload: { action: "graph-object", value } }));
    return true;
  };

  const admitOccurrence = (occurrence, witnessRef) => {
    if (!occurrence || !admitGraphObject(occurrence, {
      op: "INS", grain: "Ground", witness: witnessRef,
      consequence: { kind: "referent_occurrence_witnessed", occurrence: occurrence.id },
    })) return;
    newDescriptorOccurrences.push(occurrence);
  };

  const admitDiscourseLink = (link, witnessRef) => {
    admitGraphObject(link, {
      op: "CON", grain: "Figure", witness: witnessRef,
      consequence: { kind: "discourse_identity_supported", link: link.id, mode: link.kind },
    });
  };

  for (const observation of observations) {
    const witnessRef = observation?.id ?? observation?.witness ?? null;
    const encounterRef = encounterRefOf(observation);

    const identity = textIdentityEvidence(observation?.witness, {
      alternatives: fold?.unresolvedAlternatives ?? [], witness: witnessRef,
    });
    identitySupports.push(...identity.supports);
    identityAttacks.push(...identity.attacks);

    const directCurrent = directDescriptorOccurrences(observation?.witness, { encounterRef });
    for (const occurrence of directCurrent) admitOccurrence(occurrence, witnessRef);

    const apposition = appositionalDescriptorBindings(observation?.witness, { encounterRef, witness: witnessRef });
    for (const occurrence of apposition.occurrences) admitOccurrence(occurrence, witnessRef);
    for (const link of apposition.links) admitDiscourseLink(link, witnessRef);

    if (previousObservation) {
      const priorRef = encounterRefOf(previousObservation);
      const priorOccurrences = [
        ...(fold?.graphEntries ?? []),
        ...newDescriptorOccurrences,
      ].filter((x) => x?.schema === "EOReferentOccurrence@1" && x.encounterRef === priorRef);
      const succession = demonstrativeSuccessionBindings({
        priorOccurrences,
        currentOccurrences: directCurrent,
        witness: witnessRef,
      });
      for (const link of succession.links) admitDiscourseLink(link, witnessRef);
    }

    for (const entry of observation?.graphEntries ?? []) {
      currentGraphEntries.push(entry);
      if (entry?.schema !== "EOReferent@1" || !entry.id || known.has(entry.id)) continue;
      known.add(entry.id);
      operations.push(eoOperation({
        op: "INS", grain: "Figure", witness: witnessRef, outputs: [entry.id],
        consequence: { kind: "referent_admitted", ref: entry.id },
        payload: { action: "graph-object", value: entry },
      }));
    }

    for (const edge of observation?.hyperedges ?? []) {
      if (edge?.schema !== "EOHyperedge@1") continue;
      currentGraphEntries.push(edge);
      for (const participant of edge.participants ?? []) {
        admitOccurrence(descriptorOccurrence(participant, {
          encounterRef: edge.meta?.encounterRef ?? encounterRef, edge,
        }), witnessRef);
      }
      if (!edge.id || known.has(edge.id)) continue;
      known.add(edge.id);
      operations.push(eoOperation({
        op: "CON", grain: "Figure", witness: witnessRef,
        inputs: (edge.participants ?? []).map((participant) => participant.ref).filter(Boolean),
        outputs: [edge.id], consequence: { kind: "relation_witnessed", edge: edge.id },
        payload: { action: "hyperedge", value: edge },
      }));
    }
    previousObservation = observation;
  }

  const identitySource = [
    ...(fold?.graphEntries ?? []).filter((x) => x?.schema === "EOReferentOccurrence@1"),
    ...newDescriptorOccurrences,
  ];
  for (const hypothesis of descriptorHypotheses(identitySource)) {
    if (known.has(hypothesis.id)) continue;
    known.add(hypothesis.id);
    operations.push(eoOperation({
      op: "CON", grain: "Figure", inputs: [...hypothesis.occurrenceRefs], outputs: [hypothesis.id],
      consequence: { kind: "identity_hypothesis_opened", hypothesis: hypothesis.id },
      payload: { action: "provisional", value: hypothesis },
    }));
  }

  const discourseSource = [...(fold?.graphEntries ?? []), ...currentGraphEntries];
  for (const referent of projectDiscourseReferents(discourseSource)) {
    if (known.has(referent.id)) continue;
    admitGraphObject(referent, {
      op: "INS", grain: "Figure",
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
