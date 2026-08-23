import { eoOperation, deltaFold } from "../../kernel/fold.js";
import { descriptorOccurrence, descriptorHypotheses } from "./individuation.js";

const existingIds = (fold) => new Set((fold?.graphEntries ?? []).map((entry) => entry?.id).filter(Boolean));

/**
 * Convert witnessed text structure into warranted EO change.
 *
 * The perceiver may nominate many things. Witness admits evidence. This adapter
 * is deliberately narrower still: newly witnessed referents change Existence
 * (INS · Entity); relation occurrences change Structure (CON · Link).
 *
 * Unresolved relation participants now also enter an explicit identity
 * frontier. A descriptor occurrence is instantiated as the occurrence it is,
 * never as the underlying being. Only recurrence across encounters earns an
 * EOIdentityHypothesis, and that hypothesis remains provisional until later
 * challenge warrants SYN/SEG/DEF and eventual referent admission.
 */
export async function reviseTextFold({ observations = [], fold = {} } = {}) {
  const known = existingIds(fold);
  const operations = [];
  const newDescriptorOccurrences = [];

  for (const observation of observations) {
    const witnessRef = observation?.id ?? observation?.witness ?? null;

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
        const occurrence = descriptorOccurrence(participant, {
          encounterRef: edge.meta?.encounterRef ?? null,
          edge,
        });
        if (!occurrence || known.has(occurrence.id)) continue;
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
    if (known.has(hypothesis.id)) continue;
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

  return deltaFold(operations);
}
