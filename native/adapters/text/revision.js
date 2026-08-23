import { eoOperation, deltaFold } from "../../kernel/fold.js";
import { deriveIdentityRevision } from "../../kernel/identity.js";
import {
  descriptorOccurrence,
  directDescriptorOccurrences,
  descriptorHypotheses,
  referentFromDescriptorHypothesis,
} from "./individuation.js";
import { textIdentityEvidence } from "./identity-evidence.js";

const existingIds = (fold) => new Set((fold?.graphEntries ?? []).map((entry) => entry?.id).filter(Boolean));

/**
 * Convert witnessed text structure into warranted EO change.
 *
 * Names and recurrent descriptions build the referential frontier. Separately,
 * witnessed grammatical identity evidence may support or attack live identity
 * alternatives. Identity revision runs after the current encounter's raw graph
 * material is assembled, so affected relations can be recanonicalized in the
 * same DeltaFold without altering their historical witnesses.
 */
export async function reviseTextFold({ observations = [], fold = {} } = {}) {
  const known = existingIds(fold);
  const operations = [];
  const newDescriptorOccurrences = [];
  const currentGraphEntries = [];
  const identitySupports = [];
  const identityAttacks = [];

  const admitOccurrence = (occurrence, witnessRef) => {
    if (!occurrence || known.has(occurrence.id)) return;
    known.add(occurrence.id);
    newDescriptorOccurrences.push(occurrence);
    currentGraphEntries.push(occurrence);
    operations.push(eoOperation({
      op: "INS",
      grain: "Ground",
      witness: witnessRef,
      outputs: [occurrence.id],
      consequence: { kind: "referent_occurrence_witnessed", occurrence: occurrence.id },
      payload: { action: "graph-object", value: occurrence },
    }));
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

    for (const occurrence of directDescriptorOccurrences(observation?.witness, { encounterRef })) {
      admitOccurrence(occurrence, witnessRef);
    }

    for (const entry of observation?.graphEntries ?? []) {
      currentGraphEntries.push(entry);
      if (entry?.schema !== "EOReferent@1" || !entry.id || known.has(entry.id)) continue;
      known.add(entry.id);
      operations.push(eoOperation({
        op: "INS",
        grain: "Figure",
        witness: witnessRef,
        outputs: [entry.id],
        consequence: { kind: "referent_admitted", ref: entry.id },
        payload: { action: "graph-object", value: entry },
      }));
    }

    for (const edge of observation?.hyperedges ?? []) {
      if (edge?.schema !== "EOHyperedge@1") continue;
      currentGraphEntries.push(edge);
      for (const participant of edge.participants ?? []) {
        admitOccurrence(descriptorOccurrence(participant, {
          encounterRef: edge.meta?.encounterRef ?? encounterRef,
          edge,
        }), witnessRef);
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

  const identitySource = [
    ...(fold?.graphEntries ?? []).filter((x) => x?.schema === "EOReferentOccurrence@1"),
    ...newDescriptorOccurrences,
  ];
  for (const hypothesis of descriptorHypotheses(identitySource)) {
    const hypothesisAlreadyKnown = known.has(hypothesis.id);
    if (!hypothesisAlreadyKnown) {
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

    const referent = referentFromDescriptorHypothesis(hypothesis);
    if (!referent || known.has(referent.id)) continue;
    known.add(referent.id);
    currentGraphEntries.push(referent);
    operations.push(eoOperation({
      op: "INS",
      grain: "Figure",
      inputs: [hypothesis.id],
      outputs: [referent.id],
      consequence: {
        kind: "provisional_referent_admitted",
        ref: referent.id,
        defeasibleBy: ["SEG", "DEF", "REC"],
      },
      payload: { action: "graph-object", value: referent },
    }));
  }

  const identityDelta = deriveIdentityRevision({
    fold: {
      ...fold,
      graphEntries: [...(fold?.graphEntries ?? []), ...currentGraphEntries],
    },
    supports: identitySupports,
    attacks: identityAttacks,
  });
  operations.push(...identityDelta.operations);

  return deltaFold(operations);
}
