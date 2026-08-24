import { projectIdentityGroupoid } from "./identity-groupoid.js";

const freeze = (value) => Object.freeze(value);
const BINDINGS = new Set(["EOPronounBinding@1", "EODefiniteBinding@1"]);
const CLOSED = new Set(["refused", "retracted", "superseded", "closed"]);

function liveBinding(entry) {
  return BINDINGS.has(entry?.schema) && entry?.id && entry?.occurrence && entry?.referent && !CLOSED.has(entry.standing ?? entry.status);
}
function liveDiscourseLink(entry) {
  return entry?.schema === "EODiscourseIdentityLink@1" && entry?.id && entry?.leftOccurrence && entry?.rightOccurrence && !CLOSED.has(entry.standing ?? entry.status);
}
function liveRetraction(entry) {
  return entry?.schema === "EOIdentityGeneratorRetraction@1" && entry?.id && entry?.targetGenerator && !CLOSED.has(entry.standing ?? entry.status);
}

export function createIdentityQuotientIndex(entries = []) {
  const index = { schema: "EOIdentityQuotientIndex@1", occurrences: new Map(), referents: new Map(), bindings: new Map(), discourseLinks: new Map(), retractions: new Map(), removedIds: new Set(), dirty: true, snapshot: null };
  indexIdentityQuotientEntries(index, entries);
  return index;
}

function ingestOne(index, entry) {
  if (!entry) return false;
  if (entry.schema === "EOReferentOccurrence@1" && entry.id) { index.occurrences.set(entry.id, entry); return true; }
  if (entry.schema === "EOReferent@1" && entry.id) { const prior = index.referents.get(entry.id); index.referents.set(entry.id, entry); if (prior !== entry) index.dirty = true; return true; }
  if (liveBinding(entry)) { index.bindings.set(entry.id, entry); index.removedIds.delete(entry.id); index.dirty = true; return true; }
  if (liveDiscourseLink(entry)) { index.discourseLinks.set(entry.id, entry); index.removedIds.delete(entry.id); index.dirty = true; return true; }
  if (liveRetraction(entry)) { index.retractions.set(entry.id, entry); index.dirty = true; return true; }
  if (entry.schema === "EOOperation@1" && entry?.payload?.action === "remove-provisional" && entry.payload.id) {
    const id = entry.payload.id; index.removedIds.add(id); index.bindings.delete(id); index.discourseLinks.delete(id); index.dirty = true; return true;
  }
  return false;
}

export function indexIdentityQuotientEntries(index, entries = []) {
  if (index?.schema !== "EOIdentityQuotientIndex@1") throw new TypeError("indexIdentityQuotientEntries requires EOIdentityQuotientIndex@1");
  let changed = 0; for (const entry of entries ?? []) if (ingestOne(index, entry)) changed += 1; return changed;
}

function liveEntries(index) {
  return [...index.occurrences.values(), ...index.referents.values(), ...[...index.bindings.values()].filter((entry) => !index.removedIds.has(entry.id)), ...[...index.discourseLinks.values()].filter((entry) => !index.removedIds.has(entry.id)), ...index.retractions.values()];
}

function computeSnapshot(index) {
  const groupoid = projectIdentityGroupoid(liveEntries(index));
  const classes = []; const classByNode = {};
  for (const component of groupoid.components) {
    const record = freeze({ schema: "EOIdentityClass@1", id: component.id.replace("identity-component:", "identity-class:"), terrain: "Entity", standing: "present_identity_quotient", witnessed: false, referentRefs: component.referentRefs, occurrenceRefs: component.occurrenceRefs, supportRefs: component.generatorRefs, canonicalReferent: component.canonicalReferent, referentCollision: component.referentCollision, cardinality: component.objectRefs.length, basis: "pi0_of_warranted_identity_groupoid" });
    classes.push(record); for (const node of component.objectRefs) classByNode[node] = record.id;
  }
  classes.sort((a, b) => b.cardinality - a.cardinality || a.id.localeCompare(b.id));
  index.snapshot = freeze({ schema: "EOIdentityQuotient@1", standing: "projection", witnessed: false, classes: freeze(classes), classByNode: freeze(classByNode), groupoid, diagnostics: freeze({ occurrenceCount: index.occurrences.size, referentCount: index.referents.size, activeBindings: [...index.bindings.keys()].filter((id) => !index.removedIds.has(id)).length, activeDiscourseLinks: [...index.discourseLinks.keys()].filter((id) => !index.removedIds.has(id)).length, activeRetractions: index.retractions.size, identityGenerators: groupoid.diagnostics.generatorCount, classCount: classes.length, collisionClasses: classes.filter((record) => record.referentCollision).length }), basis: "connected_components_pi0_of_proof_relevant_identity_groupoid" });
  index.dirty = false; return index.snapshot;
}

export function snapshotIdentityQuotient(index) { if (index?.schema !== "EOIdentityQuotientIndex@1") throw new TypeError("snapshotIdentityQuotient requires EOIdentityQuotientIndex@1"); return !index.dirty && index.snapshot ? index.snapshot : computeSnapshot(index); }
export function projectIdentityQuotient(entries = []) { return snapshotIdentityQuotient(createIdentityQuotientIndex(entries)); }
