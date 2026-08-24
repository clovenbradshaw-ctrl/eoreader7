import { deriveOrientation } from "./orientation.js";
import { reasoningAffordances } from "./reasoning.js";
import { stanceMathematicalAction } from "./stance-math.js";
import { evaluateNetworkAgainstExperience } from "./experience-priors.js";

const freeze = (value) => Object.freeze(value);
const stable = (values = []) => freeze([...new Set(values.filter(Boolean))].sort());

const topologySignature = (network) => {
  const topology = network?.topology ?? {};
  return freeze({
    topology: topology.topology ?? "unknown",
    cycleRank: Number(topology.cycleRank ?? 0),
    branchingReferents: Number(topology.branchingReferents ?? 0),
    edgeCount: Number(topology.edgeCount ?? network?.edgeRefs?.length ?? 0),
    referentCount: Number(topology.referentCount ?? network?.referentRefs?.length ?? 0),
    incidenceCount: Number(topology.incidenceCount ?? 0),
  });
};

function unravelNetwork(affordance, network, priors = []) {
  const signature = topologySignature(network);
  const priorEvaluation = evaluateNetworkAgainstExperience(network, priors);
  const treeLike = signature.topology === "acyclic" && signature.cycleRank === 0;
  const action = stanceMathematicalAction({
    id: `stance-action:unravel:${network.id}`,
    address: affordance.address,
    inputRefs: [network.id, ...(network.edgeRefs ?? [])],
    supportRefs: network.edgeRefs ?? [],
    rule: "incidence_cycle_rank_factorization",
    proofs: ["pattern_addressed", "counterstructure_supported", "surviving_invariants_reported"],
  });
  const claim = treeLike
    ? freeze({
        kind: "connected_acyclic_incidence_graph",
        value: true,
        consequence: "unique_simple_incidence_path_between_any_two_vertices",
      })
    : freeze({
        kind: "independent_cycle_rank",
        value: signature.cycleRank,
        consequence: signature.cycleRank > 0 ? "multiple_incidence_routes_exist_for_at_least_one_vertex_pair" : "topology_not_classified_as_tree",
      });
  return freeze({
    schema: "EOMathematicalReasoningResult@1",
    id: `reasoning-result:network:unravel:${network.id}`,
    terrain: "Network",
    stance: "Unraveling",
    mathematicalFamily: affordance.mathematicalFamily,
    action,
    basisRefs: stable([network.id, ...(network.edgeRefs ?? []), ...(network.referentRefs ?? [])]),
    derivation: freeze({ rule: "beta1_cycle_rank_on_connected_incidence_component", premises: signature }),
    claim,
    priorEvaluation,
    standing: action.complete ? "entailed_projection" : "incomplete_derivation",
    witnessed: false,
    admissibleAsWitness: false,
  });
}

function traceNetworks(affordance, left, right) {
  const a = topologySignature(left), b = topologySignature(right);
  const preserved = freeze({
    topologyClass: a.topology === b.topology,
    cycleRank: a.cycleRank === b.cycleRank,
    branchingProfile: a.branchingReferents === b.branchingReferents,
  });
  const action = stanceMathematicalAction({
    id: `stance-action:trace:${left.id}:${right.id}`,
    address: affordance.address,
    inputRefs: [left.id, right.id],
    supportRefs: [...(left.edgeRefs ?? []), ...(right.edgeRefs ?? [])],
    rule: "incidence_invariant_correspondence",
    proofs: ["patterns_addressed", "correspondence_supported", "preserved_or_changed_invariants_reported"],
  });
  return freeze({
    schema: "EOMathematicalReasoningResult@1",
    id: `reasoning-result:network:trace:${left.id}:${right.id}`,
    terrain: "Network",
    stance: "Tracing",
    mathematicalFamily: affordance.mathematicalFamily,
    action,
    basisRefs: stable([left.id, right.id, ...(left.edgeRefs ?? []), ...(right.edgeRefs ?? [])]),
    derivation: freeze({ rule: "compare_network_invariants", left: a, right: b }),
    claim: freeze({
      kind: "network_invariant_correspondence",
      preserved,
      equivalentAtThisResolution: Object.values(preserved).every(Boolean),
    }),
    standing: action.complete ? "entailed_projection" : "incomplete_derivation",
    witnessed: false,
    admissibleAsWitness: false,
  });
}

function composeNetworkPattern(affordance, network, priors = []) {
  const signature = topologySignature(network);
  const priorEvaluation = evaluateNetworkAgainstExperience(network, priors);
  const motif = signature.topology === "acyclic" && signature.cycleRank === 0
    ? "tree_like_incidence_motif"
    : signature.cycleRank > 0
      ? "cyclic_incidence_motif"
      : "network_incidence_motif";
  const proposalId = `proposal:network-pattern:${network.id}`;
  const action = stanceMathematicalAction({
    id: `stance-action:compose:${network.id}`,
    address: affordance.address,
    inputRefs: [network.id, ...(network.edgeRefs ?? [])],
    outputRefs: [proposalId],
    supportRefs: network.edgeRefs ?? [],
    rule: "compose_pattern_from_incidence_invariants",
    proofs: ["components_addressed", "composition_law_named", "closure_or_failure_reported", "candidate_requires_prospective_grounding"],
  });
  return freeze({
    schema: "EOMathematicalGenerationProposal@1",
    id: proposalId,
    terrain: "Network",
    stance: "Composing",
    mathematicalFamily: affordance.mathematicalFamily,
    action,
    basisRefs: stable([network.id, ...(network.edgeRefs ?? []), ...(network.referentRefs ?? [])]),
    proposal: freeze({
      kind: motif,
      signature,
      familiarity: priorEvaluation.expected ? "remembered_form" : "prior_straining_form",
      priorEvaluation,
      prospectiveTest: priorEvaluation.expected
        ? "current_instance_must_preserve_the_remembered_invariants_and_current_source_must_ground_any_semantic_extension"
        : "independent_future_instances_must_preserve_the_named_topological_invariants_before_pattern_admission",
    }),
    standing: "proposal",
    witnessed: false,
    admissible: false,
    admission: "requires_prospective_grounding",
  });
}

/**
 * Execute the universal stance action grammar against terrain-native objects in
 * a present Fold orientation. This is real deterministic reasoning/generation,
 * not an affordance listing: results contain derived claims or proposals.
 *
 * v1 intentionally implements Network/Pattern first because Network already has
 * an earned incidence topology in the native reader. Unsupported cells remain
 * explicit affordances rather than being simulated with generic vector math.
 */
export function executeStanceReasoning(orientation = {}, { terrain = "Network", includeGeneration = true } = {}) {
  const affordances = reasoningAffordances(orientation).filter((item) => item.address.terrain === terrain);
  const terrainObjects = orientation?.terrainState?.[terrain] ?? [];
  const priors = orientation?.receivedPriors ?? [];
  const reasoning = [];
  const generation = [];

  if (terrain === "Network") {
    const byStance = new Map(affordances.map((item) => [item.address.stance, item]));
    const unravel = byStance.get("Unraveling");
    const trace = byStance.get("Tracing");
    const compose = byStance.get("Composing");

    if (unravel) for (const network of terrainObjects) reasoning.push(unravelNetwork(unravel, network, priors));
    if (trace) {
      for (let i = 0; i < terrainObjects.length; i += 1) {
        for (let j = i + 1; j < terrainObjects.length; j += 1) reasoning.push(traceNetworks(trace, terrainObjects[i], terrainObjects[j]));
      }
    }
    if (includeGeneration && compose) for (const network of terrainObjects) generation.push(composeNetworkPattern(compose, network, priors));
  }

  return freeze({
    schema: "EOStanceReasoningRun@1",
    terrain,
    orientation,
    affordancesConsidered: freeze(affordances),
    reasoning: freeze(reasoning),
    generation: freeze(generation),
    witnessed: false,
    mutatesFold: false,
  });
}

export function reasonFromFold(fold = {}, options = {}) {
  return executeStanceReasoning(deriveOrientation(fold), options);
}
