import { eoOperation, deltaFold } from "../../kernel/fold.js";
import { deriveIdentityRevision } from "../../kernel/identity.js";
import { differenceMakesDifference } from "../../kernel/materiality.js";
import { obligation, openObligation } from "../../kernel/obligations.js";
import {
  descriptorOccurrence,
  directDescriptorOccurrences,
  hypothesisFromOccurrences,
} from "./individuation.js";
import {
  appositionalDescriptorBindings,
  projectDiscourseReferents,
} from "./discourse-referents.js";
import { textIdentityEvidence } from "./identity-evidence.js";

const slug = (value) => String(value ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "");
const OCCURRENCE_BINDING_SCHEMAS = new Set(["EOPronounBinding@1", "EODefiniteBinding@1"]);

function recordOccurrence(index, entry) {
  const key = entry.canonicalSurface;
  if (!index.occurrencesBySurface.has(key)) index.occurrencesBySurface.set(key, []);
  index.occurrencesBySurface.get(key).push(entry);
  index.allOccurrences.push(entry);
}

function indexOneEntry(index, entry) {
  if (!entry?.id || index.knownIds.has(entry.id)) return;
  index.knownIds.add(entry.id);
  if (entry.schema === "EOReferentOccurrence@1") recordOccurrence(index, entry);
  else if (entry.schema === "EODiscourseIdentityLink@1") index.discourseLinks.push(entry);
}

/**
 * An incremental index a caller may maintain across MANY sequential calls to
 * reviseTextFold, so each call costs O(what changed this turn) rather than
 * O(everything read so far) -- READING-POLICY's own A11 ("a reader that
 * cannot read a long book in order is not slow, it is wrong"), applied here.
 * Passing no index (the default) is exactly the prior behaviour, byte for
 * byte: a throwaway index is built fresh from `fold.graphEntries` on every
 * call. A caller wanting the speedup creates ONE index with
 * `createTextRevisionIndex()` and passes the SAME object on every turn of
 * one reader's sequential, monotonically-growing read.
 *
 * Self-healing: if `fold.graphEntries` is not a clean append of what the
 * index last scanned (a different fold, a rewind, a branch), the mismatch
 * is detected and the index rebuilds itself from scratch for that call --
 * correctness never depends on the caller using it correctly, only speed
 * does.
 */
export function createTextRevisionIndex() {
  return {
    scannedCount: 0,
    lastSeen: undefined,
    knownIds: new Set(),
    occurrencesBySurface: new Map(),
    allOccurrences: [],
    discourseLinks: [],
  };
}

function syncIndex(index, entries) {
  const n = entries.length;
  const clean = index.scannedCount <= n && (index.scannedCount === 0 || entries[index.scannedCount - 1] === index.lastSeen);
  if (!clean) {
    index.scannedCount = 0;
    index.knownIds = new Set();
    index.occurrencesBySurface = new Map();
    index.allOccurrences = [];
    index.discourseLinks = [];
  }
  for (let i = index.scannedCount; i < n; i += 1) indexOneEntry(index, entries[i]);
  index.scannedCount = n;
  if (n > 0) index.lastSeen = entries[n - 1];
  return index;
}

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

/**
 * Convert witnessed text structure into warranted EO change.
 *
 * `index`, when supplied, is a `createTextRevisionIndex()` object the caller
 * reuses across a whole sequential read (see its own docstring). Omitting it
 * is exactly today's behaviour: a throwaway index is synced fresh from
 * `fold.graphEntries` on this one call.
 */
export async function reviseTextFold({ observations = [], fold = {}, graph = null, index = null } = {}) {
  const idx = syncIndex(index ?? createTextRevisionIndex(), fold?.graphEntries ?? []);
  const known = idx.knownIds;
  const operations = [];
  const newDescriptorOccurrences = [];
  const touchedSurfaces = new Set();
  const currentGraphEntries = [];
  const currentEdgeIds = new Set();
  const identitySupports = [];
  const identityAttacks = [];

  const admitGraphObject = (value, { op = "INS", grain = "Ground", witness = null, consequence = null } = {}) => {
    if (!value?.id || known.has(value.id)) return false;
    known.add(value.id);
    if (value.schema === "EOReferentOccurrence@1") recordOccurrence(idx, value);
    else if (value.schema === "EODiscourseIdentityLink@1") idx.discourseLinks.push(value);
    currentGraphEntries.push(value);
    operations.push(eoOperation({ op, grain, witness, outputs: [value.id], consequence, payload: { action: "graph-object", value } }));
    return true;
  };

  const admitOccurrence = (occurrence, witnessRef) => {
    if (!occurrence || !admitGraphObject(occurrence, {
      // A witnessed descriptor occurrence is an instantiated Figure: an
      // occurrence in the encounter, not an existential Ground. INS/Figure
      // therefore projects Entity + Making. Void must be earned by genuine
      // absence/ground structure rather than parser side effects.
      op: "INS",
      grain: "Figure",
      witness: witnessRef,
      consequence: { kind: "referent_occurrence_witnessed", occurrence: occurrence.id },
    })) return;
    newDescriptorOccurrences.push(occurrence);
    touchedSurfaces.add(occurrence.canonicalSurface);
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

  // A hypothesis over a surface can only have changed on a turn where that
  // surface received a NEW occurrence -- every edge witnessed this turn
  // already ran its participants through admitOccurrence above (a fresh,
  // encounter-scoped occurrence id each time), so `touchedSurfaces` already
  // covers both "the phrase recurred" and "a new edge now touches it";
  // nothing else could have moved this hypothesis. Recomputing it from the
  // index's own incrementally-maintained per-surface group (not by
  // re-deriving every surface's group from the whole graph, every turn) is
  // what makes this O(surfaces touched this turn), not O(book so far).
  for (const surface of touchedSurfaces) {
    const hypothesis = hypothesisFromOccurrences(surface, idx.occurrencesBySurface.get(surface) ?? []);
    if (!hypothesis) continue;
    const alreadyAdmitted = known.has(hypothesis.id);

    // Recurrence alone NOMINATES a hypothesis; it does not make it
    // material. identityObligationFor is the same DMD
    // (differenceMakesDifference) test this file already used, one step
    // later, to decide whether resolving the ambiguity would change a live
    // relation attribution -- reused here to decide whether the HYPOTHESIS
    // ITSELF is worth admitting into the Fold at all. Measured on a full
    // Frankenstein read: 897 of 1,020 recurring descriptor hypotheses never
    // clear this bar. A distinction that makes no difference stays NUL --
    // recomputed fresh from occurrences whenever it recurs, never forgotten,
    // but never a standing Fold entry either: only a materially
    // consequential hypothesis grows the Fold, not every recurring phrase.
    const unresolved = identityObligationFor(hypothesis, fold, graph);

    if (!alreadyAdmitted) {
      if (!unresolved) continue;
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

    if (unresolved && !known.has(unresolved.id)) {
      known.add(unresolved.id);
      operations.push(openObligation(unresolved, { witness: hypothesis.occurrenceRefs, grain: "Figure", op: "DEF" }));
    }
  }

  // idx.allOccurrences/idx.discourseLinks already carry every occurrence and
  // discourse link ever admitted (synced from fold.graphEntries at the top
  // of this call, plus whatever admitGraphObject recorded THIS turn) --
  // projectDiscourseReferents only ever looks at those two schemas, so this
  // is the same input `discourseSource` used to provide, without copying
  // every other kind of graph entry (operations, hypotheses, obligations,
  // relations...) that a full `fold.graphEntries` scan would also carry.
  const discourseSource = [...idx.allOccurrences, ...idx.discourseLinks];
  for (const referent of projectDiscourseReferents(discourseSource)) {
    if (known.has(referent.id)) continue;
    admitGraphObject(referent, {
      op: "INS",
      grain: "Figure",
      consequence: { kind: "contextual_referent_admitted", ref: referent.id, defeasibleBy: ["SEG", "DEF", "REC"] },
    });
  }

  // deriveIdentityRevision produces no operations when it has neither
  // support nor attack evidence for THIS turn (both loops it runs are then
  // empty) -- but building its `fold` argument means copying every
  // graphEntries seen so far, every turn, whether or not that work is ever
  // used. Appositional identity evidence is a narrow, rare grammatical
  // shape (identity-evidence.js's own supportEvidence/attackEvidence), so
  // most turns have none; skip the copy and the call entirely when neither
  // list has anything to revise, rather than pay an O(book-so-far) copy on
  // every turn to compute an empty delta.
  if (identitySupports.length || identityAttacks.length) {
    const identityDelta = deriveIdentityRevision({
      fold: { ...fold, graphEntries: [...(fold?.graphEntries ?? []), ...currentGraphEntries] },
      supports: identitySupports,
      attacks: identityAttacks,
    });
    operations.push(...identityDelta.operations);
  }

  return deltaFold(operations);
}
