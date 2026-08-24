const WORD = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;
const norm = (x) => (String(x ?? "").toLowerCase().match(WORD) ?? []).join(" ");
const slug = (x) => norm(x).replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "");

const descriptor = ({ encounterRef, offset, exactSurface, canonicalSurface, determination = "definite", basis }) => Object.freeze({
  schema: "EOReferentOccurrence@1",
  id: `ref-occ:${encounterRef}:discourse:${offset}:${slug(exactSurface)}`,
  surface: exactSurface,
  canonicalSurface: canonicalSurface ?? norm(exactSurface),
  exactSurface,
  determination,
  role: null,
  encounterRef,
  edge: null,
  relation: null,
  standing: "unresolved_identity",
  provenance: Object.freeze({ giver: "text/discourse-referents", basis }),
});

const bind = ({ left, right, witness, kind, basis }) => Object.freeze({
  schema: "EODiscourseIdentityLink@1",
  id: `discourse-link:${left.id}:${right.id}`,
  leftOccurrence: left.id,
  rightOccurrence: right.id,
  witness,
  kind,
  standing: "supported",
  provenance: Object.freeze({ giver: "text/discourse-referents", basis }),
});

/**
 * Explicit English apposition between TWO descriptor occurrences.
 *
 * Example: "the wretch—the miserable monster whom I had created".
 * The right-hand phrase is preserved exactly, while its conservative head
 * projection is `the monster`; this is a text-adapter grammatical projection,
 * not a synonym assertion. The identity link concerns these two occurrences
 * only. It says nothing about every future use of either surface.
 */
export function appositionalDescriptorBindings(text, { encounterRef = "unknown", witness = null } = {}) {
  const source = String(text ?? "");
  const outOccurrences = [];
  const links = [];
  // Narrow shape: definite descriptor, dash/comma, definite descriptor of one
  // or two lexical words, then a relative/comma boundary. This intentionally
  // does not attempt a general NP grammar.
  const re = /\b(the\s+[\p{L}][\p{L}\p{M}'’]*)\s*(?:—|–|-)\s*(the\s+([\p{L}][\p{L}\p{M}'’]*)(?:\s+([\p{L}][\p{L}\p{M}'’]*))?)(?=\s+(?:who|whom|that)\b|\s*[,;:])/giu;
  let m;
  while ((m = re.exec(source))) {
    const leftExact = m[1];
    const rightExact = m[2];
    const rightHead = `the ${m[4] ?? m[3]}`;
    const left = descriptor({
      encounterRef,
      offset: m.index,
      exactSurface: leftExact,
      canonicalSurface: norm(leftExact),
      basis: "left side of explicit descriptor apposition",
    });
    const right = descriptor({
      encounterRef,
      offset: m.index + m[0].indexOf(rightExact),
      exactSurface: rightExact,
      canonicalSurface: norm(rightHead),
      basis: "right side of explicit descriptor apposition; final lexical item projected as head",
    });
    outOccurrences.push(left, right);
    links.push(bind({
      left,
      right,
      witness,
      kind: "apposition",
      basis: "explicit appositional construction supports occurrence-level co-reference",
    }));
  }
  return Object.freeze({
    schema: "EOTextDiscourseBindings@1",
    occurrences: Object.freeze(outOccurrences),
    links: Object.freeze(links),
  });
}

const unionFind = (ids) => {
  const parent = new Map(ids.map((id) => [id, id]));
  const find = (x) => {
    let p = parent.get(x);
    if (p == null) return null;
    while (p !== parent.get(p)) p = parent.get(p);
    let y = x;
    while (parent.get(y) !== p) {
      const next = parent.get(y);
      parent.set(y, p);
      y = next;
    }
    return p;
  };
  const join = (a, b) => {
    const ra = find(a), rb = find(b);
    if (ra == null || rb == null || ra === rb) return;
    // Stable by lexical id; this is only component bookkeeping, not salience.
    if (ra < rb) parent.set(rb, ra); else parent.set(ra, rb);
  };
  return { find, join };
};

/**
 * Current discourse-referent projection from immutable occurrence/link history.
 * Only linked occurrence components of size >=2 become referents. Same surface
 * recurrence alone is deliberately insufficient.
 */
export function projectDiscourseReferents(graphEntries = []) {
  const occurrences = graphEntries.filter((x) => x?.schema === "EOReferentOccurrence@1");
  const byId = new Map(occurrences.map((x) => [x.id, x]));
  const links = graphEntries.filter((x) => x?.schema === "EODiscourseIdentityLink@1" && x.standing !== "refused");
  const uf = unionFind([...byId.keys()]);
  for (const link of links) uf.join(link.leftOccurrence, link.rightOccurrence);

  const components = new Map();
  for (const occ of occurrences) {
    const root = uf.find(occ.id);
    if (!root) continue;
    if (!components.has(root)) components.set(root, []);
    components.get(root).push(occ);
  }

  const referents = [];
  for (const [root, group] of components) {
    if (group.length < 2) continue;
    const linkedIds = new Set();
    for (const link of links) {
      if (group.some((x) => x.id === link.leftOccurrence) && group.some((x) => x.id === link.rightOccurrence)) {
        linkedIds.add(link.id);
      }
    }
    if (!linkedIds.size) continue;
    const surfaces = [...new Set(group.map((x) => x.canonicalSurface).filter(Boolean))];
    referents.push(Object.freeze({
      schema: "EOReferent@1",
      id: `ref:discourse:${slug(root)}`,
      display: group[0].surface,
      surfaces: Object.freeze(surfaces),
      occurrenceRefs: Object.freeze(group.map((x) => x.id)),
      supportRefs: Object.freeze([...linkedIds]),
      standing: "provisional",
      revisable: true,
      provenance: Object.freeze({
        giver: "text/discourse-referents::projectDiscourseReferents",
        basis: "connected component of explicitly supported occurrence-level identity links",
      }),
    }));
  }
  return Object.freeze(referents);
}

/**
 * Incremental counterpart to projectDiscourseReferents: a persistent index a
 * caller (revision.js's own text-revision index) maintains and updates one
 * admission at a time, instead of re-deriving the whole union-find and every
 * component's referent from a growing flat list on every turn. Each
 * admission touches only the ~O(1) component(s) it actually affects; the
 * caller then asks for a referent only for the roots that changed
 * (index.touchedRoots), never re-deriving one for every earlier component
 * that did not change this turn.
 */
export function createDiscourseIndex() {
  return { parent: new Map(), components: new Map(), linksByRoot: new Map() };
}

function discourseFind(index, x) {
  let p = index.parent.get(x);
  if (p == null) return null;
  while (p !== index.parent.get(p)) p = index.parent.get(p);
  let y = x;
  while (index.parent.get(y) !== p) {
    const next = index.parent.get(y);
    index.parent.set(y, p);
    y = next;
  }
  return p;
}

export function admitDiscourseOccurrence(index, occurrence, touchedRoots) {
  if (!occurrence?.id || index.parent.has(occurrence.id)) return;
  index.parent.set(occurrence.id, occurrence.id);
  index.components.set(occurrence.id, [occurrence]);
  index.linksByRoot.set(occurrence.id, []);
  touchedRoots?.add(occurrence.id);
}

export function admitDiscourseLink(index, link, touchedRoots) {
  if (!link || link.standing === "refused") return;
  const ra = discourseFind(index, link.leftOccurrence);
  const rb = discourseFind(index, link.rightOccurrence);
  if (ra == null || rb == null) return;
  if (ra === rb) {
    index.linksByRoot.get(ra).push(link);
    touchedRoots?.add(ra);
    return;
  }
  // Stable by lexical id, matching unionFind's own tie-break above -- this
  // is component bookkeeping, not salience.
  const [winner, loser] = ra < rb ? [ra, rb] : [rb, ra];
  index.parent.set(loser, winner);
  index.components.set(winner, [...index.components.get(winner), ...index.components.get(loser)]);
  index.components.delete(loser);
  index.linksByRoot.set(winner, [...index.linksByRoot.get(winner), ...index.linksByRoot.get(loser), link]);
  index.linksByRoot.delete(loser);
  touchedRoots?.add(winner);
}

export function discourseReferentForRoot(index, root) {
  const group = index.components.get(root);
  if (!group || group.length < 2) return null;
  const links = index.linksByRoot.get(root) ?? [];
  if (!links.length) return null;
  const surfaces = [...new Set(group.map((x) => x.canonicalSurface).filter(Boolean))];
  return Object.freeze({
    schema: "EOReferent@1",
    id: `ref:discourse:${slug(root)}`,
    display: group[0].surface,
    surfaces: Object.freeze(surfaces),
    occurrenceRefs: Object.freeze(group.map((x) => x.id)),
    supportRefs: Object.freeze([...new Set(links.map((l) => l.id))]),
    standing: "provisional",
    revisable: true,
    provenance: Object.freeze({
      giver: "text/discourse-referents::projectDiscourseReferents",
      basis: "connected component of explicitly supported occurrence-level identity links",
    }),
  });
}
