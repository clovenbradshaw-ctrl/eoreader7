const freeze = (value) => Object.freeze(value);
const stable = (values = []) => [...new Set(values.filter(Boolean))].sort();

export function lensChannel({ id, domainRefs = [], codomainRefs = [], mapping = {}, giver = null, supportRefs = [] } = {}) {
  if (!id) throw new TypeError("lensChannel requires id");
  const domain = stable(domainRefs), codomain = stable(codomainRefs);
  const rows = {};
  let stochastic = true;
  for (const source of domain) {
    const row = mapping[source];
    if (!row || typeof row !== "object") { stochastic = false; continue; }
    const probs = codomain.map((target) => Number(row[target] ?? 0));
    const total = probs.reduce((a, b) => a + b, 0);
    if (probs.some((p) => !Number.isFinite(p) || p < 0) || Math.abs(total - 1) > 1e-9) stochastic = false;
    rows[source] = freeze(Object.fromEntries(codomain.map((target, i) => [target, probs[i]])));
  }
  return freeze({ schema: "EOLensChannel@1", id, terrain: "Lens", domainRefs: freeze(domain), codomainRefs: freeze(codomain), mapping: freeze(rows), giver, supportRefs: freeze(stable(supportRefs)), stochastic, witnessed: false, standing: stochastic ? "calibrated_channel" : "partial_channel" });
}

export function composeLensChannels(first, second, { id = null } = {}) {
  if (first?.schema !== "EOLensChannel@1" || second?.schema !== "EOLensChannel@1") throw new TypeError("composeLensChannels requires EOLensChannel@1");
  const middle = new Set(first.codomainRefs ?? []);
  if ((second.domainRefs ?? []).some((ref) => !middle.has(ref))) throw new TypeError("lens channels are not composable");
  const mapping = {};
  for (const source of first.domainRefs) {
    mapping[source] = {};
    for (const target of second.codomainRefs) {
      let p = 0;
      for (const bridge of first.codomainRefs) p += (first.mapping?.[source]?.[bridge] ?? 0) * (second.mapping?.[bridge]?.[target] ?? 0);
      mapping[source][target] = p;
    }
  }
  return lensChannel({ id: id ?? `lens-compose:${first.id}:${second.id}`, domainRefs: first.domainRefs, codomainRefs: second.codomainRefs, mapping, giver: [first.giver, second.giver].filter(Boolean).join(" + ") || null, supportRefs: [...(first.supportRefs ?? []), ...(second.supportRefs ?? []), first.id, second.id] });
}

export function lensBlackwellWitness(informative, garbled, garbling) {
  if (![informative, garbled, garbling].every((x) => x?.schema === "EOLensChannel@1")) throw new TypeError("lensBlackwellWitness requires channels");
  const composed = composeLensChannels(informative, garbling);
  const sameDomain = JSON.stringify(composed.domainRefs) === JSON.stringify(garbled.domainRefs);
  const sameCodomain = JSON.stringify(composed.codomainRefs) === JSON.stringify(garbled.codomainRefs);
  let maxError = Infinity;
  if (sameDomain && sameCodomain) {
    maxError = 0;
    for (const s of composed.domainRefs) for (const t of composed.codomainRefs) maxError = Math.max(maxError, Math.abs((composed.mapping[s]?.[t] ?? 0) - (garbled.mapping[s]?.[t] ?? 0)));
  }
  return freeze({ schema: "EOLensBlackwellWitness@1", informative: informative.id, garbled: garbled.id, garbling: garbling.id, dominates: maxError <= 1e-9, maxError, witnessed: false, basis: "garbling_factorization" });
}

export function fieldCarrier({ id, regions = [], restrictions = [] } = {}) {
  if (!id) throw new TypeError("fieldCarrier requires id");
  const regionIds = stable(regions.map((r) => typeof r === "string" ? r : r?.id));
  const valid = restrictions.every((r) => regionIds.includes(r.from) && regionIds.includes(r.to));
  return freeze({ schema: "EOFieldCarrier@1", id, terrain: "Field", regions: freeze(regionIds), restrictions: freeze(restrictions.map((r) => freeze({ ...r }))), valid, witnessed: false });
}

export function fieldSection(carrier, assignments = {}) {
  if (carrier?.schema !== "EOFieldCarrier@1") throw new TypeError("fieldSection requires EOFieldCarrier@1");
  const incompatibilities = [];
  for (const rule of carrier.restrictions ?? []) {
    const from = assignments[rule.from], to = assignments[rule.to];
    if (from === undefined || to === undefined) continue;
    const restrict = typeof rule.restrict === "function" ? rule.restrict(from) : from;
    if (JSON.stringify(restrict) !== JSON.stringify(to)) incompatibilities.push(freeze({ from: rule.from, to: rule.to, expected: restrict, actual: to }));
  }
  return freeze({ schema: "EOFieldSection@1", carrierRef: carrier.id, assignments: freeze({ ...assignments }), coherent: incompatibilities.length === 0, incompatibilities: freeze(incompatibilities), witnessed: false, basis: "local_to_global_compatibility" });
}

export function networkChainInvariants({ vertices = [], edges = [], boundary = null } = {}) {
  const V = stable(vertices), E = edges.filter((e) => e?.id);
  const components = new Map(V.map((v) => [v, v]));
  const find = (x) => { while (components.get(x) !== x) { components.set(x, components.get(components.get(x))); x = components.get(x); } return x; };
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) components.set(rb, ra); };
  for (const edge of E) { const pts = stable(edge.vertices ?? edge.participants ?? []); for (let i = 1; i < pts.length; i++) if (components.has(pts[0]) && components.has(pts[i])) union(pts[0], pts[i]); }
  const beta0 = new Set(V.map(find)).size;
  const beta1 = Math.max(0, E.length - V.length + beta0);
  const boundaryFlux = boundary ? E.reduce((sum, edge) => sum + Number(boundary(edge) ?? 0), 0) : null;
  return freeze({ schema: "EONetworkInvariants@1", terrain: "Network", vertexCount: V.length, edgeCount: E.length, beta0, beta1, eulerCharacteristic: V.length - E.length, boundaryFlux, witnessed: false, basis: "chain_complex_diagnostics" });
}

function logLoss(probability) { return -Math.log2(Math.max(Number.EPSILON, probability)); }
export function prequentialParadigmAdmission({ id, formationIndex = 0, events = [], model, baseline, minGainBits = 1 } = {}) {
  if (!id || typeof model !== "function" || typeof baseline !== "function") throw new TypeError("prequentialParadigmAdmission requires id, model, baseline");
  const future = events.filter((_, i) => i >= formationIndex);
  let modelLoss = 0, baselineLoss = 0;
  const scored = [];
  for (const event of future) {
    const pm = Number(model(event)), pb = Number(baseline(event));
    if (!(pm >= 0 && pm <= 1 && pb >= 0 && pb <= 1)) continue;
    modelLoss += logLoss(pm); baselineLoss += logLoss(pb);
    scored.push(event?.id ?? null);
  }
  const gainBits = baselineLoss - modelLoss;
  return freeze({ schema: "EOParadigmAdmission@1", id, terrain: "Paradigm", standing: gainBits >= minGainBits && scored.length ? "prospectively_supported" : "candidate", prospectiveEvents: scored.length, modelLossBits: modelLoss, baselineLossBits: baselineLoss, gainBits, admitted: gainBits >= minGainBits && scored.length > 0, witnessed: false, basis: "prequential_predictive_regret" });
}

export function conditionalResponseLaw(events = [], { contextKey = "context", actionKey = "action", outcomeKey = "outcome" } = {}) {
  const table = new Map();
  for (const event of events) {
    const context = JSON.stringify(event?.[contextKey] ?? null), action = JSON.stringify(event?.[actionKey] ?? null), outcome = JSON.stringify(event?.[outcomeKey] ?? null);
    const key = `${context}|${action}`;
    if (!table.has(key)) table.set(key, new Map());
    const row = table.get(key); row.set(outcome, (row.get(outcome) ?? 0) + 1);
  }
  const laws = {};
  for (const [key, row] of table) {
    const total = [...row.values()].reduce((a, b) => a + b, 0);
    laws[key] = Object.fromEntries([...row].map(([outcome, n]) => [outcome, n / total]));
  }
  return freeze({ schema: "EOConditionalResponseLaw@1", laws: freeze(laws), witnessed: false, basis: "context_action_conditioned_future_law" });
}

const TERRAIN_WEIGHTS = freeze({ Void: 1, Entity: 2, Kind: 3, Field: 1, Link: 2, Network: 3, Atmosphere: 1, Lens: 2, Paradigm: 3 });
const OP_WEIGHTS = freeze({ NUL: 0, SIG: 1, INS: 1, SEG: 2, CON: 2, SYN: 3, DEF: 2, EVA: 2, REC: 3 });
export function terrainNativeFoldRevisionDistance(delta) {
  const byTerrain = {};
  let total = 0;
  for (const op of delta?.operations ?? []) {
    if (op?.operator === "NUL") continue;
    const terrain = op.terrain ?? "Unknown";
    const consequence = op.consequence ? 1 : 0;
    const recanonical = op.operator === "REC" ? 1 : 0;
    const score = (TERRAIN_WEIGHTS[terrain] ?? 1) * (OP_WEIGHTS[op.operator] ?? 1) * (1 + consequence + recanonical);
    byTerrain[terrain] = (byTerrain[terrain] ?? 0) + score; total += score;
  }
  return freeze({ schema: "EOFoldRevisionDistance@1", total, byTerrain: freeze(byTerrain), witnessed: false, basis: "terrain_grain_consequence_weighted_revision" });
}
