import { interpretiveAtmosphereField } from "./terrain-math.js";

const OPEN = new Set([undefined, null, "open", "strengthened", "weakened"]);
const material = (obligation) => obligation?.distinction?.materiality?.makesDifference === true;

export function deriveSurprise(delta) {
  const operations = (delta?.operations ?? []).filter((operation) => operation.operator !== "NUL");
  const affectedAddresses = [...new Set(operations.map((o) => `${o.mode}/${o.domain}/${o.grain}`))];
  const touched = new Set();
  for (const operation of operations) {
    for (const id of operation.inputs ?? []) touched.add(id);
    for (const id of operation.outputs ?? []) touched.add(id);
    if (operation.payload?.value?.id) touched.add(operation.payload.value.id);
    if (operation.payload?.id) touched.add(operation.payload.id);
  }
  return Object.freeze({
    schema: "SurpriseProfile@1",
    operations,
    affectedAddresses,
    touchedGraphObjects: Object.freeze([...touched]),
    downstreamConsequences: operations.flatMap((o) => o.consequence == null ? [] : [o.consequence]),
    recanonicalizations: operations.filter((o) => o.operator === "REC"),
    expectationEffects: operations.filter((o) => o.payload?.action === "expectation"),
    obligationEffects: operations.filter((o) => ["obligation", "resolve-obligation"].includes(o.payload?.action)),
    patternEffects: operations.filter((o) => o.payload?.value?.schema === "EOPatternCandidate@1"),
  });
}

/**
 * Tension is the energetic profile of the same unresolved consequential field
 * that projects Atmosphere. It is not a second ontology built from counts.
 *
 * Only DMD-material obligations participate. Persistence increases local
 * potential; consequence reach and live alternatives increase the load; shared
 * grounds/alternatives couple obligations so mutually constraining questions
 * contribute more than the same number of independent questions.
 *
 * The legacy interactionNetwork/persistence/consequences fields remain as
 * compatibility surfaces, but are projections of the common field math.
 */
export function deriveTension(fold) {
  const obligations = (fold?.obligations ?? []).filter((o) => OPEN.has(o.status) && material(o));
  const sequence = fold?.sequence ?? 0;
  const field = interpretiveAtmosphereField(obligations, { sequence });
  const interactionNetwork = field.couplings.map((coupling) => Object.freeze({
    from: coupling.from,
    to: coupling.to,
    shared: coupling.shared,
    coupling: coupling.coupling,
    energy: coupling.energy,
  }));
  const potentialById = new Map(field.potentials.map((item) => [item.obligation, item]));

  return Object.freeze({
    schema: "TensionProfile@2",
    obligations: Object.freeze([...obligations]),
    field,
    energy: field.totalEnergy,
    localPotential: field.localPotential,
    couplingEnergy: field.couplingEnergy,
    interactionNetwork: Object.freeze(interactionNetwork),
    persistence: Object.freeze(obligations.map((o) => ({
      id: o.id,
      value: potentialById.get(o.id)?.persistence ?? 0,
    }))),
    consequences: Object.freeze(obligations.map((o) => ({ id: o.id, value: o.consequences ?? [] }))),
  });
}

export function deriveRelease(delta, beforeFold, afterFold) {
  const before = new Map((beforeFold?.obligations ?? []).map((o) => [o.id, o]));
  const releases = [];
  for (const after of afterFold?.obligations ?? []) {
    const prior = before.get(after.id);
    if (!prior || prior.status === after.status || OPEN.has(after.status)) continue;
    const transformation = (delta?.operations ?? []).filter((op) => op.payload?.id === after.id || op.payload?.value?.id === after.id);
    if (!transformation.length) continue;
    releases.push({ schema: "Release@1", obligation: after.id, before: prior, transformation, after, witness: transformation.map((op) => op.witness).filter(Boolean) });
  }
  return releases;
}
