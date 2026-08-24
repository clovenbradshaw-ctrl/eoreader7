const freeze = (value) => Object.freeze(value);
const BINDINGS = new Set(["EOPronounBinding@1", "EODefiniteBinding@1"]);
const CLOSED = new Set(["refused", "retracted", "superseded", "closed"]);

function liveBinding(entry) {
  return BINDINGS.has(entry?.schema)
    && entry?.id
    && entry?.occurrence
    && entry?.referent
    && !CLOSED.has(entry.standing ?? entry.status);
}

function liveDiscourseLink(entry) {
  return entry?.schema === "EODiscourseIdentityLink@1"
    && entry?.id
    && entry?.leftOccurrence
    && entry?.rightOccurrence
    && !CLOSED.has(entry.standing ?? entry.status);
}

function stableHash(value) {
  let h = 2166136261;
  for (const ch of String(value)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function generator(id, from, to, kind, supportRefs = []) {
  return freeze({
    schema: "EOIdentityGenerator@1",
    id,
    from,
    to,
    kind,
    witnessed: false,
    invertible: true,
    supportRefs: freeze([...new Set([id, ...supportRefs].filter(Boolean))].sort()),
  });
}

export function createIdentityGroupoidIndex(entries = []) {
  const index = {
    schema: "EOIdentityGroupoidIndex@1",
    occurrences: new Map(),
    referents: new Map(),
    bindings: new Map(),
    discourseLinks: new Map(),
    removedIds: new Set(),
    dirty: true,
    snapshot: null,
  };
  indexIdentityGroupoidEntries(index, entries);
  return index;
}

function ingestOne(index, entry) {
  if (!entry) return false;
  if (entry.schema === "EOReferentOccurrence@1" && entry.id) {
    index.occurrences.set(entry.id, entry);
    return true;
  }
  if (entry.schema === "EOReferent@1" && entry.id) {
    const prior = index.referents.get(entry.id);
    index.referents.set(entry.id, entry);
    if (prior !== entry) index.dirty = true;
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
    index.removedIds.add(entry.payload.id);
    index.bindings.delete(entry.payload.id);
    index.discourseLinks.delete(entry.payload.id);
    index.dirty = true;
    return true;
  }
  return false;
}

export function indexIdentityGroupoidEntries(index, entries = []) {
  if (index?.schema !== "EOIdentityGroupoidIndex@1") throw new TypeError("indexIdentityGroupoidEntries requires EOIdentityGroupoidIndex@1");
  let changed = 0;
  for (const entry of entries ?? []) if (ingestOne(index, entry)) changed += 1;
  return changed;
}

function computeSnapshot(index) {
  const objects = new Set([...index.occurrences.keys(), ...index.referents.keys()]);
  const generators = [];

  for (const referent of index.referents.values()) {
    for (const occurrence of referent.occurrenceRefs ?? []) {
      objects.add(occurrence);
      generators.push(generator(
        `identity-generator:referent:${stableHash(`${referent.id}|${occurrence}`)}`,
        occurrence,
        referent.id,
        "referent_support",
        referent.supportRefs ?? [],
      ));
    }
  }

  for (const binding of index.bindings.values()) {
    if (index.removedIds.has(binding.id)) continue;
    objects.add(binding.occurrence);
    objects.add(binding.referent);
    generators.push(generator(binding.id, binding.occurrence, binding.referent, "occurrence_binding", binding.supportRefs ?? []));
  }

  for (const link of index.discourseLinks.values()) {
    if (index.removedIds.has(link.id)) continue;
    objects.add(link.leftOccurrence);
    objects.add(link.rightOccurrence);
    generators.push(generator(link.id, link.leftOccurrence, link.rightOccurrence, "discourse_identity", link.supportRefs ?? []));
  }

  generators.sort((a, b) => a.id.localeCompare(b.id));
  const adjacency = new Map();
  const add = (from, to, generatorRef, inverse) => {
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from).push(freeze({ to, generatorRef, inverse }));
  };
  for (const edge of generators) {
    add(edge.from, edge.to, edge.id, false);
    add(edge.to, edge.from, edge.id, true);
  }
  for (const routes of adjacency.values()) routes.sort((a, b) => a.generatorRef.localeCompare(b.generatorRef) || Number(a.inverse) - Number(b.inverse) || a.to.localeCompare(b.to));

  const seen = new Set();
  const components = [];
  const componentByObject = {};
  for (const start of [...objects].sort()) {
    if (seen.has(start)) continue;
    const queue = [start];
    seen.add(start);
    const members = [];
    const support = new Set();
    while (queue.length) {
      const node = queue.shift();
      members.push(node);
      for (const route of adjacency.get(node) ?? []) {
        support.add(route.generatorRef);
        if (!seen.has(route.to)) {
          seen.add(route.to);
          queue.push(route.to);
        }
      }
    }
    const referentRefs = members.filter((id) => index.referents.has(id)).sort();
    const occurrenceRefs = members.filter((id) => !index.referents.has(id)).sort();
    if (!referentRefs.length && occurrenceRefs.length < 2) continue;
    const id = `identity-component:${stableHash([...members].sort().join("|"))}`;
    const component = freeze({
      schema: "EOIdentityComponent@1",
      id,
      objectRefs: freeze([...members].sort()),
      referentRefs: freeze(referentRefs),
      occurrenceRefs: freeze(occurrenceRefs),
      generatorRefs: freeze([...support].sort()),
      referentCollision: referentRefs.length > 1,
      canonicalReferent: referentRefs.length === 1 ? referentRefs[0] : null,
    });
    components.push(component);
    for (const object of members) componentByObject[object] = id;
  }
  components.sort((a, b) => b.objectRefs.length - a.objectRefs.length || a.id.localeCompare(b.id));

  index.snapshot = freeze({
    schema: "EOIdentityGroupoid@1",
    terrain: "Entity",
    standing: "present_identity_groupoid",
    witnessed: false,
    objects: freeze([...objects].sort()),
    generators: freeze(generators),
    components: freeze(components),
    componentByObject: freeze(componentByObject),
    diagnostics: freeze({
      objectCount: objects.size,
      generatorCount: generators.length,
      componentCount: components.length,
      collisionComponents: components.filter((component) => component.referentCollision).length,
    }),
    basis: "proof_relevant_warranted_identity_paths",
  });
  index.dirty = false;
  return index.snapshot;
}

export function snapshotIdentityGroupoid(index) {
  if (index?.schema !== "EOIdentityGroupoidIndex@1") throw new TypeError("snapshotIdentityGroupoid requires EOIdentityGroupoidIndex@1");
  return !index.dirty && index.snapshot ? index.snapshot : computeSnapshot(index);
}

export function projectIdentityGroupoid(entries = []) {
  return snapshotIdentityGroupoid(createIdentityGroupoidIndex(entries));
}

/**
 * Return one shortest currently warranted identity proof path. The path is a
 * present-tense derivation, never new witness. Each step preserves the exact
 * generator that licensed it and whether the inverse arrow was used.
 */
export function identityProofPath(groupoid, from, to) {
  if (!groupoid || groupoid.schema !== "EOIdentityGroupoid@1" || !from || !to) return null;
  if (from === to) return freeze({ schema: "EOIdentityProofPath@1", from, to, steps: freeze([]), supportRefs: freeze([]), witnessed: false });
  const generators = new Map((groupoid.generators ?? []).map((edge) => [edge.id, edge]));
  const adjacency = new Map();
  const add = (a, b, edge, inverse) => {
    if (!adjacency.has(a)) adjacency.set(a, []);
    adjacency.get(a).push({ to: b, edge, inverse });
  };
  for (const edge of generators.values()) {
    add(edge.from, edge.to, edge, false);
    add(edge.to, edge.from, edge, true);
  }
  const queue = [from];
  const prior = new Map([[from, null]]);
  while (queue.length) {
    const node = queue.shift();
    for (const route of adjacency.get(node) ?? []) {
      if (prior.has(route.to)) continue;
      prior.set(route.to, { node, route });
      if (route.to === to) queue.length = 0;
      else queue.push(route.to);
    }
  }
  if (!prior.has(to)) return null;
  const steps = [];
  const supportRefs = new Set();
  let current = to;
  while (current !== from) {
    const item = prior.get(current);
    if (!item) return null;
    const { route, node } = item;
    for (const ref of route.edge.supportRefs ?? []) supportRefs.add(ref);
    steps.push(freeze({
      from: node,
      to: current,
      generatorRef: route.edge.id,
      inverse: route.inverse,
      kind: route.edge.kind,
    }));
    current = node;
  }
  steps.reverse();
  return freeze({
    schema: "EOIdentityProofPath@1",
    from,
    to,
    steps: freeze(steps),
    supportRefs: freeze([...supportRefs].sort()),
    witnessed: false,
    basis: "composition_of_warranted_identity_generators",
  });
}
