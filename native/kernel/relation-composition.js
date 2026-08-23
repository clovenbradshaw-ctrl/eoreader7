import { compositionAffordance } from "./hyperlexicon.js";

const freeze = (value) => Object.freeze(value);
const stable = (value) => typeof value === "string" ? value : JSON.stringify(value);
const slug = (value) => String(value ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "");
const positionOf = (edge) => Number.isFinite(edge?.scope?.sequencePosition) ? edge.scope.sequencePosition : null;

const participant = (edge, role) => (edge?.participants ?? []).find((p) => p?.role === role && p?.standing === "referent") ?? null;
const subjectOf = (edge) => participant(edge, "subject")?.ref ?? null;
const objectOf = (edge) => participant(edge, "object")?.ref ?? null;

const witnessedEdges = (entries = []) => entries.filter((entry) => entry?.schema === "EOHyperedge@1" && entry?.witness && subjectOf(entry) && objectOf(entry));

function chainOf(leftEdge, rightEdge) {
  const bridge = objectOf(leftEdge);
  if (!bridge || bridge !== subjectOf(rightEdge)) return null;
  const from = subjectOf(leftEdge);
  const to = objectOf(rightEdge);
  if (!from || !to || from === bridge || bridge === to || from === to) return null;
  const lp = positionOf(leftEdge), rp = positionOf(rightEdge);
  if (lp !== null && rp !== null && lp > rp) return null;
  return freeze({ leftEdge, rightEdge, from, bridge, to });
}

/**
 * Find witnessed shared-referent relation chains in causal order. This only
 * exposes possible composition sites; it does not grant permission to compose.
 */
export function relationCompositionChains(entries = []) {
  const edges = witnessedEdges(entries);
  const outgoing = new Map();
  for (const edge of edges) {
    const subject = subjectOf(edge);
    if (!outgoing.has(subject)) outgoing.set(subject, []);
    outgoing.get(subject).push(edge);
  }
  const chains = [];
  const seen = new Set();
  for (const leftEdge of edges) {
    for (const rightEdge of outgoing.get(objectOf(leftEdge)) ?? []) {
      if (leftEdge.id === rightEdge.id) continue;
      const chain = chainOf(leftEdge, rightEdge);
      if (!chain) continue;
      const key = `${leftEdge.id}\u0000${rightEdge.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      chains.push(chain);
    }
  }
  return freeze(chains);
}

/** Repeated adjacency nominates an HL candidate. It never licenses inference. */
export function acquireCompositionCandidates(entries = [], { minWitnesses = 2 } = {}) {
  const counts = new Map();
  for (const chain of relationCompositionChains(entries)) {
    const left = chain.leftEdge.relation;
    const right = chain.rightEdge.relation;
    const key = `${stable(left)}\u0000${stable(right)}`;
    if (!counts.has(key)) counts.set(key, { left, right, witnesses: [] });
    counts.get(key).witnesses.push(freeze([chain.leftEdge.id, chain.rightEdge.id]));
  }
  return freeze([...counts.values()]
    .filter((item) => item.witnesses.length >= minWitnesses)
    .map((item) => freeze({
      left: item.left,
      right: item.right,
      standing: "candidate",
      witnesses: freeze(item.witnesses),
      provenance: freeze({ giver: null, basis: "repeated witnessed shared-referent relation adjacency" }),
      meta: freeze({ observed: true, support: item.witnesses.length }),
    })));
}

/**
 * Evaluate composition sites against HL. Non-GIVEN pairs remain explicitly
 * withheld. GIVEN pairs license a structural bridge projection, not a claim
 * that the two predicates are synonyms or globally transitive.
 */
export function evaluateRelationCompositions(entries = [], hyperlexicon = null) {
  const withheld = [];
  const licensed = [];
  for (const chain of relationCompositionChains(entries)) {
    const affordance = compositionAffordance(hyperlexicon, chain.leftEdge.relation, chain.rightEdge.relation);
    const base = {
      from: chain.from,
      bridge: chain.bridge,
      to: chain.to,
      leftPredicate: chain.leftEdge.relation,
      rightPredicate: chain.rightEdge.relation,
      edgeRefs: freeze([chain.leftEdge.id, chain.rightEdge.id]),
      witnessRefs: freeze([chain.leftEdge.witness, chain.rightEdge.witness].filter(Boolean)),
      standing: affordance.standing,
    };
    const idCore = `${slug(chain.leftEdge.relation)}__${slug(chain.rightEdge.relation)}:${slug(chain.from)}:${slug(chain.bridge)}:${slug(chain.to)}`;
    if (affordance.standing !== "given") {
      withheld.push(freeze({
        schema: "EOWithheldComposition@1",
        id: `withheld-composition:${idCore}`,
        ...base,
        reason: "shared-referent adjacency does not license composition without a GIVEN Hyperlexicon affordance",
        affordance: freeze({
          standing: affordance.standing,
          giver: affordance.giver,
          witnesses: affordance.witnesses,
          provenance: affordance.provenance,
        }),
      }));
      continue;
    }
    licensed.push(freeze({
      schema: "EOLicensedComposition@1",
      id: `composition:${idCore}`,
      ...base,
      standing: "licensed",
      relation: "occupies_bridge_between",
      provenance: freeze({
        giver: affordance.giver,
        basis: "witnessed shared-referent adjacency plus GIVEN Hyperlexicon composition affordance",
      }),
      affordance: freeze({
        standing: affordance.standing,
        giver: affordance.giver,
        witnesses: affordance.witnesses,
        provenance: affordance.provenance,
      }),
    }));
  }
  return freeze({ withheld: freeze(withheld), licensed: freeze(licensed) });
}

/**
 * Only repeated, candidate-standing withheld compositions are consequential
 * enough by default to deserve active reading. One-off unknowns remain explicit
 * unknowns without creating an attention burden.
 */
export function consequentialWithheldCompositions(result = {}) {
  return freeze((result.withheld ?? []).filter((item) => item?.standing === "candidate" && (item?.edgeRefs?.length ?? 0) >= 2));
}
