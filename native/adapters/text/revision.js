import { eoOperation, deltaFold } from "../../kernel/fold.js";

const existingIds = (fold) => new Set((fold?.graphEntries ?? []).map((entry) => entry?.id).filter(Boolean));

/**
 * Convert witnessed text structure into warranted EO change.
 *
 * The perceiver may nominate many things. Witness admits evidence. This adapter
 * is deliberately narrower still: only a newly witnessed referent changes
 * Existence (INS · Entity), and each witnessed relation occurrence changes
 * Structure (CON · Link). Mentions, lexical occurrences, task targets and gaps
 * remain evidence in the Fold but do not become transformations by fiat.
 */
export async function reviseTextFold({ observations = [], fold = {} } = {}) {
  const known = existingIds(fold);
  const operations = [];

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
      if (edge?.schema !== "EOHyperedge@1" || !edge.id || known.has(edge.id)) continue;
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

  return deltaFold(operations);
}
