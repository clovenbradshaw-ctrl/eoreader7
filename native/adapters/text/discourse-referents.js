const WORD = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;
const norm = (x) => (String(x ?? "").toLowerCase().match(WORD) ?? []).join(" ");
const slug = (x) => norm(x).replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "");
const DEMONSTRATIVES = new Set(["this", "that", "these", "those"]);

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

export function appositionalDescriptorBindings(text, { encounterRef = "unknown", witness = null } = {}) {
  const source = String(text ?? "");
  const outOccurrences = [];
  const links = [];
  const re = /\b(the\s+[\p{L}][\p{L}\p{M}'’]*)\s*(?:—|–|-)\s*(the\s+([\p{L}][\p{L}\p{M}'’]*)(?:\s+([\p{L}][\p{L}\p{M}'’]*))?)(?=\s+(?:who|whom|that)\b|\s*[,;:])/giu;
  let m;
  while ((m = re.exec(source))) {
    const leftExact = m[1];
    const rightExact = m[2];
    const rightHead = `the ${m[4] ?? m[3]}`;
    const left = descriptor({ encounterRef, offset: m.index, exactSurface: leftExact, canonicalSurface: norm(leftExact), basis: "left side of explicit descriptor apposition" });
    const right = descriptor({ encounterRef, offset: m.index + m[0].indexOf(rightExact), exactSurface: rightExact, canonicalSurface: norm(rightHead), basis: "right side of explicit descriptor apposition; final lexical item projected as head" });
    outOccurrences.push(left, right);
    links.push(bind({ left, right, witness, kind: "apposition", basis: "explicit appositional construction supports occurrence-level co-reference" }));
  }
  return Object.freeze({ schema: "EOTextDiscourseBindings@1", occurrences: Object.freeze(outOccurrences), links: Object.freeze(links) });
}

/**
 * Bind an immediately successive demonstrative description only when the prior
 * encounter offers exactly one definite descriptor candidate.
 *
 * `the creature ...` -> `this monster ...` can therefore be supported when
 * other prior mentions are merely possessive (`my apartment`). If two prior
 * definite candidates are live, the mechanism abstains. The link concerns the
 * two witnessed occurrences only; it never aliases their surface strings.
 */
export function demonstrativeSuccessionBindings({ priorOccurrences = [], currentOccurrences = [], witness = null } = {}) {
  const priorDefinite = priorOccurrences.filter((x) =>
    x?.schema === "EOReferentOccurrence@1" &&
    x.determination === "definite" &&
    norm(x.canonicalSurface).startsWith("the ")
  );
  const currentDemonstratives = currentOccurrences.filter((x) => {
    if (x?.schema !== "EOReferentOccurrence@1") return false;
    const first = norm(x.canonicalSurface).split(/\s+/)[0];
    return DEMONSTRATIVES.has(first);
  });
  if (priorDefinite.length !== 1 || currentDemonstratives.length !== 1) {
    return Object.freeze({ schema: "EOTextDiscourseBindings@1", occurrences: Object.freeze([]), links: Object.freeze([]) });
  }
  const left = priorDefinite[0];
  const right = currentDemonstratives[0];
  return Object.freeze({
    schema: "EOTextDiscourseBindings@1",
    occurrences: Object.freeze([]),
    links: Object.freeze([bind({
      left,
      right,
      witness,
      kind: "demonstrative_succession",
      basis: "immediate demonstrative anaphor with exactly one prior definite descriptor candidate",
    })]),
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
    if (ra < rb) parent.set(rb, ra); else parent.set(ra, rb);
  };
  return { find, join };
};

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
    const groupIds = new Set(group.map((x) => x.id));
    const linkedIds = new Set(links.filter((link) => groupIds.has(link.leftOccurrence) && groupIds.has(link.rightOccurrence)).map((x) => x.id));
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
      provenance: Object.freeze({ giver: "text/discourse-referents::projectDiscourseReferents", basis: "connected component of explicitly supported occurrence-level identity links" }),
    }));
  }
  return Object.freeze(referents);
}
