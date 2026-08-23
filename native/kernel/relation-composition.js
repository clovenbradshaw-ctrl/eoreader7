import { compositionAffordance } from "./hyperlexicon.js";

const freeze = (value) => Object.freeze(value);
const stable = (value) => typeof value === "string" ? value : JSON.stringify(value);
const slug = (value) => String(value ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "");
const positionOf = (edge) => Number.isFinite(edge?.scope?.sequencePosition) ? edge.scope.sequencePosition : null;

const participant = (edge, role) => (edge?.participants ?? []).find((p) => p?.role === role && p?.standing === "referent") ?? null;
const subjectOf = (edge) => participant(edge, "subject")?.ref ?? null;
const objectOf = (edge) => participant(edge, "object")?.ref ?? null;
const witnessedEdge = (entry) => entry?.schema === "EOHyperedge@1" && entry?.witness && subjectOf(entry) && objectOf(entry);
const pair = (left, right) => `${stable(left)}\u0000${stable(right)}`;

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
 * Incremental ledger for witnessed relation-composition sites.
 *
 * The prior implementation rebuilt all chains from every graph entry on every
 * encounter. This ledger indexes incoming/outgoing referent positions once and
 * only tests a new edge against the edges that can actually join it. Historical
 * witnesses remain append-only; this is only a faster projection of them.
 */
export function createRelationCompositionLedger(entries = []) {
  const byEdge = new Map();
  const incoming = new Map();
  const outgoing = new Map();
  const chainsById = new Map();
  const pairSupport = new Map();

  const bucket = (map, key) => {
    if (!map.has(key)) map.set(key, new Set());
    return map.get(key);
  };
  const addChain = (leftEdge, rightEdge) => {
    if (!leftEdge || !rightEdge || leftEdge.id === rightEdge.id) return;
    const chain = chainOf(leftEdge, rightEdge);
    if (!chain) return;
    const id = `${leftEdge.id}\u0000${rightEdge.id}`;
    if (chainsById.has(id)) return;
    chainsById.set(id, chain);
    const key = pair(leftEdge.relation, rightEdge.relation);
    if (!pairSupport.has(key)) pairSupport.set(key, { left: leftEdge.relation, right: rightEdge.relation, chainIds: new Set() });
    pairSupport.get(key).chainIds.add(id);
  };
  const ingestOne = (edge) => {
    if (!witnessedEdge(edge) || !edge.id || byEdge.has(edge.id)) return false;
    const subject = subjectOf(edge);
    const object = objectOf(edge);

    // Existing edges ending at this new subject can be the left side.
    for (const leftId of incoming.get(subject) ?? []) addChain(byEdge.get(leftId), edge);
    // Existing edges starting at this new object can be the right side.
    for (const rightId of outgoing.get(object) ?? []) addChain(edge, byEdge.get(rightId));

    byEdge.set(edge.id, edge);
    bucket(outgoing, subject).add(edge.id);
    bucket(incoming, object).add(edge.id);
    return true;
  };
  const ingest = (next = []) => {
    let added = 0;
    for (const entry of next) if (ingestOne(entry)) added += 1;
    return added;
  };
  ingest(entries);

  return {
    ingest,
    chains: () => freeze([...chainsById.values()]),
    candidates: ({ minWitnesses = 2 } = {}) => freeze([...pairSupport.values()]
      .filter((item) => item.chainIds.size >= minWitnesses)
      .map((item) => freeze({
        left: item.left,
        right: item.right,
        standing: "candidate",
        witnesses: freeze([...item.chainIds].map((id) => {
          const chain = chainsById.get(id);
          return freeze([chain.leftEdge.id, chain.rightEdge.id]);
        })),
        provenance: freeze({ giver: null, basis: "repeated witnessed shared-referent relation adjacency" }),
        meta: freeze({ observed: true, support: item.chainIds.size }),
      }))),
    evaluate: (hyperlexicon = null) => evaluateChains([...chainsById.values()], hyperlexicon),
    diagnostics: () => {
      const pairs = [...pairSupport.values()].map((item) => freeze({ left: item.left, right: item.right, support: item.chainIds.size }))
        .sort((a, b) => b.support - a.support || String(a.left).localeCompare(String(b.left)) || String(a.right).localeCompare(String(b.right)));
      return freeze({
        witnessedEdges: byEdge.size,
        chainSites: chainsById.size,
        pairTypes: pairs.length,
        repeatedPairTypes: pairs.filter((item) => item.support >= 2).length,
        topPairs: freeze(pairs.slice(0, 20)),
      });
    },
  };
}

/** Find witnessed shared-referent relation chains in causal order. */
export function relationCompositionChains(entries = []) {
  return createRelationCompositionLedger(entries).chains();
}

/** Repeated adjacency nominates an HL candidate. It never licenses inference. */
export function acquireCompositionCandidates(entries = [], { minWitnesses = 2 } = {}) {
  return createRelationCompositionLedger(entries).candidates({ minWitnesses });
}

function evaluateChains(chains = [], hyperlexicon = null) {
  const withheld = [];
  const licensed = [];
  for (const chain of chains) {
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
        affordance: freeze({ standing: affordance.standing, giver: affordance.giver, witnesses: affordance.witnesses, provenance: affordance.provenance }),
      }));
      continue;
    }
    licensed.push(freeze({
      schema: "EOLicensedComposition@1",
      id: `composition:${idCore}`,
      ...base,
      standing: "licensed",
      relation: "occupies_bridge_between",
      provenance: freeze({ giver: affordance.giver, basis: "witnessed shared-referent adjacency plus GIVEN Hyperlexicon composition affordance" }),
      affordance: freeze({ standing: affordance.standing, giver: affordance.giver, witnesses: affordance.witnesses, provenance: affordance.provenance }),
    }));
  }
  return freeze({ withheld: freeze(withheld), licensed: freeze(licensed) });
}

export function evaluateRelationCompositions(entries = [], hyperlexicon = null) {
  return evaluateChains(relationCompositionChains(entries), hyperlexicon);
}

/**
 * Group candidate-standing withheld chains by relation pair. Candidate status
 * is still only nomination; this helper does not itself decide materiality.
 */
export function consequentialWithheldCompositions(result = {}) {
  const groups = new Map();
  for (const item of result.withheld ?? []) {
    if (item?.standing !== "candidate" || (item?.edgeRefs?.length ?? 0) < 2) continue;
    const key = pair(item.leftPredicate, item.rightPredicate);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return freeze([...groups.values()].map((items) => {
    const first = items[0];
    const edgeRefs = [...new Set(items.flatMap((item) => item.edgeRefs ?? []))];
    const witnessRefs = [...new Set(items.flatMap((item) => item.witnessRefs ?? []))];
    const referentRefs = [...new Set(items.flatMap((item) => [item.from, item.bridge, item.to]).filter(Boolean))];
    return freeze({
      schema: "EOWithheldComposition@1",
      id: `withheld-composition:${slug(first.leftPredicate)}__${slug(first.rightPredicate)}:candidate`,
      leftPredicate: first.leftPredicate,
      rightPredicate: first.rightPredicate,
      standing: "candidate",
      edgeRefs: freeze(edgeRefs),
      witnessRefs: freeze(witnessRefs),
      referentRefs: freeze(referentRefs),
      instances: freeze(items.map((item) => item.id)),
      examples: freeze(items.map((item) => freeze({ from: item.from, bridge: item.bridge, to: item.to, edgeRefs: item.edgeRefs }))),
      reason: first.reason,
      affordance: first.affordance,
    });
  }));
}
