import { eoOperation, deltaFold } from "../../kernel/fold.js";
import {
  descriptorOccurrence,
  directDescriptorOccurrences,
  descriptorHypotheses,
  referentFromDescriptorHypothesis,
} from "./individuation.js";

const existingIds = (fold) => new Set((fold?.graphEntries ?? []).map((entry) => entry?.id).filter(Boolean));

/**
 * Convert witnessed text structure into warranted EO change.
 *
 * Names already admitted by the text organ become witnessed referents.
 * Descriptor occurrences remain occurrences; recurrence opens a defeasible
 * identity hypothesis. Only recurrent definite/possessive hypotheses project a
 * provisional current referent. Indefinite recurrence never implies sameness.
 * Every historical occurrence/hypothesis remains in the Fold so later witness
 * can SEG or DEF the projection without rewriting what was previously read.
 */
export async function reviseTextFold({ observations = [], fold = {} } = {}) {
  const known = existingIds(fold);
  const operations = [];
  const newDescriptorOccurrences = [];

  const admitOccurrence = (occurrence, witnessRef) => {
    if (!occurrence || known.has(occurrence.id)) return;
    known.add(occurrence.id);
    newDescriptorOccurrences.push(occurrence);
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

    for (const occurrence of directDescriptorOccurrences(observation?.witness, { encounterRef })) {
      admitOccurrence(occurrence, witnessRef);
    }

    for (const entry of observation?.graphEntries ?? []) {
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

  return deltaFold(operations);
}
