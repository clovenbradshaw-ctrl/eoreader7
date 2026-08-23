import { compositionAffordance } from "./hyperlexicon.js";

const freeze = (value) => Object.freeze(value);
const stable = (value) => typeof value === "string" ? value : JSON.stringify(value);
const slug = (value) => String(value ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "");
const positionOf = (edge) => Number.isFinite(edge?.scope?.sequencePosition) ? edge.scope.sequencePosition : null;
const pair = (left, right) => `${stable(left)}\u0000${stable(right)}`;
const rawParticipant = (edge, role) => (edge?.participants ?? []).find((p) => p?.role === role) ?? null;
const occurrenceOf = (participant) => participant?.occurrence ?? (participant?.standing === "unresolved_surface" ? participant?.ref : null);

function endpointOf(participant, bindings) {
  if (!participant) return null;
  if (participant.standing === "referent" && participant.ref) return participant.ref;
  const occurrence = occurrenceOf(participant);
  return occurrence ? bindings.get(occurrence)?.referent ?? null : null;
}

function resolvedEdge(edge, bindings) {
  if (edge?.schema !== "EOHyperedge@1" || !edge?.witness) return null;
  const subject = endpointOf(rawParticipant(edge, "subject"), bindings);
  const object = endpointOf(rawParticipant(edge, "object"), bindings);
  if (!subject || !object) return null;
  return freeze({ edge, subject, object });
}

function chainOf(left, right) {
  if (!left || !right || left.edge.id === right.edge.id) return null;
  if (left.object !== right.subject) return null;
  if (left.subject === left.object || left.object === right.object || left.subject === right.object) return null;
  const lp = positionOf(left.edge), rp = positionOf(right.edge);
  if (lp !== null && rp !== null && lp > rp) return null;
  return freeze({
    leftEdge: left.edge,
    rightEdge: right.edge,
    from: left.subject,
    bridge: left.object,
    to: right.object,
  });
}

/**
 * Incremental ledger for present relation-composition sites.
 *
 * Raw witnessed edges stay raw. A participant that was witnessed only as an
 * occurrence becomes usable here only when the current Fold contains an
 * explicit occurrence→referent binding (for example a causal pronoun binding).
 * Thus interpretation can unlock or later revise composition without mutating
 * historical relation witnesses.
 */
export function createRelationCompositionLedger(entries = []) {
  const rawEdges = new Map();
  const bindings = new Map();
  const occurrenceEdges = new Map();
  const activeEdges = new Map();
  const incoming = new Map();
  const outgoing = new Map();
  const chainsById = new Map();
  const pairSupport = new Map();

  const bucket = (map, key) => {
    if (!map.has(key)) map.set(key, new Set());
    return map.get(key);
  };

  const addChain = (left, right) => {
    const chain = chainOf(left, right);
    if (!chain) return;
    const id = `${chain.leftEdge.id}\u0000${chain.rightEdge.id}`;
    if (chainsById.has(id)) return;
    chainsById.set(id, chain);
    const key = pair(chain.leftEdge.relation, chain.rightEdge.relation);
    if (!pairSupport.has(key)) pairSupport.set(key, { left: chain.leftEdge.relation, right: chain.rightEdge.relation, chainIds: new Set() });
    pairSupport.get(key).chainIds.add(id);
  };

  const activate = (edge) => {
    if (!edge?.id || activeEdges.has(edge.id)) return false;
    const resolved = resolvedEdge(edge, bindings);
    if (!resolved) return false;
    for (const leftId of incoming.get(resolved.subject) ?? []) addChain(activeEdges.get(leftId), resolved);
    for (const rightId of outgoing.get(resolved.object) ?? []) addChain(resolved, activeEdges.get(rightId));
    activeEdges.set(edge.id, resolved);
    bucket(outgoing, resolved.subject).add(edge.id);
    bucket(incoming, resolved.object).add(edge.id);
    return true;
  };

  const rememberEdge = (edge) => {
    if (edge?.schema !== "EOHyperedge@1" || !edge?.witness || !edge.id || rawEdges.has(edge.id)) return false;
    rawEdges.set(edge.id, edge);
    for (const participant of edge.participants ?? []) {
      const occurrence = occurrenceOf(participant);
      if (occurrence) bucket(occurrenceEdges, occurrence).add(edge.id);
    }
    activate(edge);
    return true;
  };

  const rememberBinding = (binding) => {
    if (binding?.schema !== "EOPronounBinding@1" || !binding?.occurrence || !binding?.referent) return false;
    const prior = bindings.get(binding.occurrence);
    if (prior?.id === binding.id && prior?.referent === binding.referent) return false;
    bindings.set(binding.occurrence, binding);
    for (const edgeId of occurrenceEdges.get(binding.occurrence) ?? []) activate(rawEdges.get(edgeId));
    return true;
  };

  const ingest = (next = []) => {
    let changed = 0;
    // Remember edges first so a binding in the same Delta can wake them.
    for (const entry of next) if (rememberEdge(entry)) changed += 1;
    for (const entry of next) if (rememberBinding(entry)) changed += 1;
    return changed;
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
        provenance: freeze({ giver: null, basis: "repeated witnessed relation adjacency under current explicit referent bindings" }),
        meta: freeze({ observed: true, support: item.chainIds.size }),
      }))),
    evaluate: (hyperlexicon = null) => evaluateChains([...chainsById.values()], hyperlexicon),
    diagnostics: () => {
      const pairs = [...pairSupport.values()].map((item) => freeze({ left: item.left, right: item.right, support: item.chainIds.size }))
        .sort((a, b) => b.support - a.support || String(a.left).localeCompare(String(b.left)) || String(a.right).localeCompare(String(b.right)));
      return freeze({
        relationEdges: rawEdges.size,
        referentBindings: bindings.size,
        witnessedEdges: activeEdges.size,
        unresolvedEdges: Math.max(0, rawEdges.size - activeEdges.size),
        chainSites: chainsById.size,
        pairTypes: pairs.length,
        repeatedPairTypes: pairs.filter((item) => item.support >= 2).length,
        topPairs: freeze(pairs.slice(0, 20)),
      });
    },
  };
}

/** Find composition chains under explicit bindings present in `entries`. */
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
        reason: "relation adjacency does not license composition without a GIVEN Hyperlexicon affordance",
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
      provenance: freeze({ giver: affordance.giver, basis: "witnessed relation adjacency plus GIVEN Hyperlexicon composition affordance" }),
      affordance: freeze({ standing: affordance.standing, giver: affordance.giver, witnesses: affordance.witnesses, provenance: affordance.provenance }),
    }));
  }
  return freeze({ withheld: freeze(withheld), licensed: freeze(licensed) });
}

export function evaluateRelationCompositions(entries = [], hyperlexicon = null) {
  return evaluateChains(relationCompositionChains(entries), hyperlexicon);
}

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
