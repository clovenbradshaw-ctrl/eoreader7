import { MODES, GRAINS, STANCE_BY_MODE } from "./cube.js";

const freeze = (value) => Object.freeze(value);

const SEMANTICS = Object.freeze({
  Clearing: freeze({
    mode: "Differentiate", grain: "Ground", family: "refinement",
    mathematicalRole: "restrict_or_refine_ground",
    proofObligations: freeze(["bounded_scope", "distinction_preserved", "no_unwitnessed_exclusion"]),
  }),
  Dissecting: freeze({
    mode: "Differentiate", grain: "Figure", family: "decomposition",
    mathematicalRole: "resolve_figure_into_distinguishable_parts_or_alternatives",
    proofObligations: freeze(["figure_addressed", "distinction_supported", "reconstruction_or_separation_accounted"]),
  }),
  Unraveling: freeze({
    mode: "Differentiate", grain: "Pattern", family: "factorization",
    mathematicalRole: "factor_or_falsify_apparent_invariant",
    proofObligations: freeze(["pattern_addressed", "counterstructure_supported", "surviving_invariants_reported"]),
  }),
  Tending: freeze({
    mode: "Relate", grain: "Ground", family: "coupling_transport",
    mathematicalRole: "maintain_or_transport_dependence_across_ground",
    proofObligations: freeze(["ground_endpoints_addressed", "coupling_supported", "transport_law_named"]),
  }),
  Binding: freeze({
    mode: "Relate", grain: "Figure", family: "morphism_binding",
    mathematicalRole: "establish_a_supported_mapping_or_relation_between_figures",
    proofObligations: freeze(["figure_endpoints_addressed", "relation_supported", "identity_not_inferred_from_similarity"]),
  }),
  Tracing: freeze({
    mode: "Relate", grain: "Pattern", family: "invariant_correspondence",
    mathematicalRole: "follow_correspondence_or_transport_of_invariants",
    proofObligations: freeze(["patterns_addressed", "correspondence_supported", "preserved_or_changed_invariants_reported"]),
  }),
  Cultivating: freeze({
    mode: "Generate", grain: "Ground", family: "extension",
    mathematicalRole: "construct_or_extend_conditions_of_possibility",
    proofObligations: freeze(["ground_addressed", "extension_rule_named", "new_ground_not_promoted_to_witness"]),
  }),
  Making: freeze({
    mode: "Generate", grain: "Figure", family: "construction",
    mathematicalRole: "construct_a_candidate_figure",
    proofObligations: freeze(["construction_inputs_addressed", "construction_rule_named", "candidate_requires_grounding"]),
  }),
  Composing: freeze({
    mode: "Generate", grain: "Pattern", family: "composition_closure",
    mathematicalRole: "compose_supported_structure_into_a_candidate_higher_order_pattern",
    proofObligations: freeze(["components_addressed", "composition_law_named", "closure_or_failure_reported", "candidate_requires_prospective_grounding"]),
  }),
});

const STANCE_SET = new Set(Object.keys(SEMANTICS));

export const stanceMathematicalSemantics = (stance) => SEMANTICS[stance] ?? null;

export function stanceFor(mode, grain) {
  if (!MODES.includes(mode) || !GRAINS.includes(grain)) return null;
  return STANCE_BY_MODE[mode]?.[grain] ?? null;
}

/**
 * Universal action grammar for one EO stance.
 *
 * This is deliberately a contract, not a result. Terrain-native mathematics
 * supplies the objects and witnesses; stance mathematics specifies the family
 * of legal action and what must be proved before its result may be admitted.
 */
export function stanceMathematicalContract(address = {}) {
  const stance = address.stance ?? stanceFor(address.mode, address.grain);
  if (!stance || !STANCE_SET.has(stance)) return null;
  const semantics = SEMANTICS[stance];
  if (address.mode && address.mode !== semantics.mode) throw new TypeError(`stance ${stance} is not ${address.mode}`);
  if (address.grain && address.grain !== semantics.grain) throw new TypeError(`stance ${stance} is not ${address.grain}`);
  return freeze({
    schema: "EOStanceMathematicalContract@1",
    stance,
    mode: semantics.mode,
    grain: semantics.grain,
    family: semantics.family,
    mathematicalRole: semantics.mathematicalRole,
    proofObligations: semantics.proofObligations,
    terrain: address.terrain ?? null,
    domain: address.domain ?? null,
    operator: address.op ?? address.operator ?? null,
    witnessed: false,
    standing: "contract",
  });
}

/**
 * Instantiate a stance contract against terrain-native objects.
 *
 * `proofs` names discharged proof obligations. Missing obligations remain
 * explicit. Even a fully discharged action is only `grounded_action`; whether
 * its outputs enter Fold is decided by interrogation/admission, never here.
 */
export function stanceMathematicalAction({
  address = {}, inputRefs = [], outputRefs = [], supportRefs = [], proofs = [],
  rule = null, id = null,
} = {}) {
  const contract = stanceMathematicalContract(address);
  if (!contract) throw new TypeError("stanceMathematicalAction requires a valid EO stance address");
  const discharged = new Set(proofs);
  const missingProofs = contract.proofObligations.filter((proof) => !discharged.has(proof));
  return freeze({
    schema: "EOStanceMathematicalAction@1",
    id: id ?? `stance-action:${contract.stance}:${[...inputRefs, ...outputRefs].join(":") || "unbound"}`,
    stance: contract.stance,
    terrain: contract.terrain,
    mode: contract.mode,
    grain: contract.grain,
    family: contract.family,
    mathematicalRole: contract.mathematicalRole,
    inputRefs: freeze([...new Set(inputRefs.filter(Boolean))]),
    outputRefs: freeze([...new Set(outputRefs.filter(Boolean))]),
    supportRefs: freeze([...new Set(supportRefs.filter(Boolean))]),
    rule,
    dischargedProofs: freeze([...discharged].filter((proof) => contract.proofObligations.includes(proof))),
    missingProofs: freeze(missingProofs),
    complete: missingProofs.length === 0,
    standing: missingProofs.length === 0 ? "grounded_action" : "proposed_action",
    witnessed: false,
    admissible: false,
    admission: "requires_interrogation",
  });
}

export const STANCE_MATHEMATICS = freeze(Object.fromEntries(
  Object.keys(SEMANTICS).map((stance) => [stance, stanceMathematicalContract({ stance })]),
));
