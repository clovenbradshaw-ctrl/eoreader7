const freeze = (value) => Object.freeze(value);
const BINDINGS = new Set(["EOPronounBinding@1", "EODefiniteBinding@1"]);

function unionFind(ids = []) {
  const parent = new Map();
  const rank = new Map();
  const ensure = (id) => {
    if (!id || parent.has(id)) return;
    parent.set(id, id);
    rank.set(id, 0);
  };
  for (const id of ids) ensure(id);
  const find = (id) => {
    ensure(id);
    if (!id) return null;
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root);
    let current = id;
    while (parent.get(current) !== root) {
      const next = parent.get(current);
      parent.set(current, root);
      current = next;
    }
    return root;
  };
  const join = (a, b) => {
    if (!a || !b) return false;
    const ra = find(a), rb = find(b);
    if (ra === rb) return false;
    const rankA = rank.get(ra) ?? 0;
    const rankB = rank.get(rb) ?? 0;
    if (rankA < rankB) parent.set(ra, rb);
    else if (rankA > rankB) parent.set(rb, ra);
    else {
      const [keep, move] = ra < rb ? [ra, rb] : [rb, ra];
      parent.set(move, keep);
      rank.set(keep, rankA + 1);
    }
    return true;
  };
  return { ensure, find, join, parent };
}

function stableHash(value) {
  let h = 2166136261;
  for (const ch of String(value)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function liveBinding(entry) {
  return BINDINGS.has(entry?.schema)
    && entry?.id
    && entry?.occurrence
    && entry?.referent
    && !["refused", "retracted", "superseded", "closed"].includes(entry.standing ?? entry.status);
}

function liveDiscourseLink(entry) {
  return entry?.schema === "EODiscourseIdentityLink@1"
    && entry?.id
    && entry?.leftOccurrence
    && entry?.rightOccurrence
    && !["refused", "retracted", "superseded", "closed"].includes(entry.standing ?? entry.status);
}

/**
 * Existence/Figure identity is represented as a quotient over witnessed
 * occurrences under already-warranted identity links. Possible identity is not
 * an equivalence relation: unresolved EOIdentityAlternative objects therefore
 * never enter this quotient.
 *
 * The quotient is a present-tense projection only. It does not rewrite witness,
 * choose a canonical referent when multiple referent ids collide, or turn
 * transitive closure into new evidence. Transitivity is bookkeeping inside an
 * equivalence class whose generating links remain explicit in supportRefs.
 */
export function createIdentityQuotientIndex(entries = []) {
  const index = {
    schema: "EOIdentityQuotientIndex@1",
    occurrences: new Map(),
    referents: new Map(),
    bindings: new Map(),
    discourseLinks: new Map(),
    removedIds: new Set(),
    dirty: true,
    snapshot: null,
  };
  indexIdentityQuotientEntries(index, entries);
  return index;
}

function ingestOne(index, entry) {
  if (!entry) return false;
  if (entry.schema === "EOReferentOccurrence@1" && entry.id) {
    index.occurrences.set(entry.id, entry);
    index.dirty = true;
    return true;
  }
  if (entry.schema === "EOReferent@1" && entry.id) {
    index.referents.set(entry.id, entry);
    index.dirty = true;
    return true;
  }
  if (liveBinding(entry)) {
    index.bindings.set(entry.id, entry);
    index.removedIds.delete(entry.id);
    index.dirty = true;
    return true;
  }
  if (liveDiscourseLink(entry)) {
    index.discourseLinks.set(entry.id, entry);
    index.removedIds.delete(entry.id);
    index.dirty = true;
    return true;
  }
  if (entry.schema === "EOOperation@1" && entry?.payload?.action === "remove-provisional" && entry.payload.id) {
    const id = entry.payload.id;
    index.removedIds.add(id);
    index.bindings.delete(id);
    index.discourseLinks.delete(id);
    index.dirty = true;
    return true;
  }
  return false;
}

export function indexIdentityQuotientEntries(index, entries = []) {
  if (index?.schema !== "EOIdentityQuotientIndex@1") throw new TypeError("indexIdentityQuotientEntries requires EOIdentityQuotientIndex@1");
  let changed = 0;
  for (const entry of entries ?? []) if (ingestOne(index, entry)) changed += 1;
  return changed;
}

function computeSnapshot(index) {
  const uf = unionFind();
  const supportByNode = new Map();
  const support = (node, ref) => {
    if (!node || !ref) return;
    if (!supportByNode.has(node)) supportByNode.set(node, new Set());
    supportByNode.get(node).add(ref);
  };

  for (const id of index.occurrences.keys()) uf.ensure(id);
  for (const id of index.referents.keys()) uf.ensure(id);

  // An earned/projected referent explicitly carries the occurrence members that
  // generated it. This is quotient membership, not a lexical alias rule.
  for (const referent of index.referents.values()) {
    for (const occurrence of referent.occurrenceRefs ?? []) {
      uf.join(referent.id, occurrence);
      support(referent.id, ...(referent.supportRefs ?? []));
      support(occurrence, ...(referent.supportRefs ?? []));
    }
  }

  for (const binding of index.bindings.values()) {
    if (index.removedIds.has(binding.id)) continue;
    uf.join(binding.occurrence, binding.referent);
    support(binding.occurrence, binding.id);
    support(binding.referent, binding.id);
    for (const ref of binding.supportRefs ?? []) {
      support(binding.occurrence, ref);
      support(binding.referent, ref);
    }
  }

  for (const link of index.discourseLinks.values()) {
    if (index.removedIds.has(link.id)) continue;
    uf.join(link.leftOccurrence, link.rightOccurrence);
    support(link.leftOccurrence, link.id);
    support(link.rightOccurrence, link.id);
  }

  const groups = new Map();
  for (const node of uf.parent.keys()) {
    const root = uf.find(node);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(node);
  }

  const classes = [];
  const classByNode = {};
  for (const nodes of groups.values()) {
    const referentRefs = nodes.filter((id) => index.referents.has(id)).sort();
    const occurrenceRefs = nodes.filter((id) => index.occurrences.has(id) || id.startsWith("occ:") || id.startsWith("ref-occ:")).sort();
    // Ignore empty bookkeeping and naked occurrence singletons. A standalone
    // referent remains a valid singleton Entity class; an unresolved occurrence
    // remains only an occurrence until something warrants identification.
    if (!referentRefs.length && occurrenceRefs.length < 2) continue;
    const supportRefs = new Set();
    for (const node of nodes) for (const ref of supportByNode.get(node) ?? []) supportRefs.add(ref);
    const id = `identity-class:${stableHash([...nodes].sort().join("|"))}`;
    const record = freeze({
      schema: "EOIdentityClass@1",
      id,
      terrain: "Entity",
      standing: "present_identity_quotient",
      witnessed: false,
      referentRefs: freeze(referentRefs),
      occurrenceRefs: freeze(occurrenceRefs),
      supportRefs: freeze([...supportRefs].sort()),
      canonicalReferent: referentRefs.length === 1 ? referentRefs[0] : null,
      referentCollision: referentRefs.length > 1,
      cardinality: nodes.length,
      basis: "quotient_of_warranted_occurrence_identity",
    });
    classes.push(record);
    for (const node of nodes) classByNode[node] = id;
  }
  classes.sort((a, b) => b.cardinality - a.cardinality || a.id.localeCompare(b.id));

  index.snapshot = freeze({
    schema: "EOIdentityQuotient@1",
    standing: "projection",
    witnessed: false,
    classes: freeze(classes),
    classByNode: freeze(classByNode),
    diagnostics: freeze({
      occurrenceCount: index.occurrences.size,
      referentCount: index.referents.size,
      activeBindings: [...index.bindings.keys()].filter((id) => !index.removedIds.has(id)).length,
      activeDiscourseLinks: [...index.discourseLinks.keys()].filter((id) => !index.removedIds.has(id)).length,
      classCount: classes.length,
      collisionClasses: classes.filter((record) => record.referentCollision).length,
    }),
  });
  index.dirty = false;
  return index.snapshot;
}

export function snapshotIdentityQuotient(index) {
  if (index?.schema !== "EOIdentityQuotientIndex@1") throw new TypeError("snapshotIdentityQuotient requires EOIdentityQuotientIndex@1");
  return !index.dirty && index.snapshot ? index.snapshot : computeSnapshot(index);
}

export function projectIdentityQuotient(entries = []) {
  return snapshotIdentityQuotient(createIdentityQuotientIndex(entries));
}
