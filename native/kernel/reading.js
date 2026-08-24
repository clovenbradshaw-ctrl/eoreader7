import { receivedGround, applyObservation, applyDelta, deltaFold, eoOperation } from "./fold.js";
import { deriveOrientation } from "./orientation.js";
import { perceive as defaultPerceive } from "./perception.js";
import { witness as defaultWitness } from "./witness.js";
import { relevantNeighborhood, interrogateCube, deriveEOTransformations } from "./interrogation.js";
import { deriveSurprise, deriveTension, deriveRelease } from "./dynamics.js";
import { buildHypergraph, indexHypergraphEntries } from "./hypergraph.js";
import { createTerrainIndex, indexTerrainEntries, snapshotTerrainState, snapshotTerrainReferents } from "./terrain-state.js";
import { createEmergentTerrainIndex, indexEmergentTerrainEntries, snapshotEmergentTerrainState, mergeTerrainStates } from "./emergent-terrain.js";
import { createIdentityQuotientIndex, indexIdentityQuotientEntries, snapshotIdentityQuotient } from "./identity-quotient.js";
import { createKindInductionIndex, indexKindEntries, snapshotKindState, kindDiagnostics, kindCandidates } from "./kind-induction.js";
import { createKindBasinAdmissionLedger } from "./kind-basin-admission.js";
import { conditionKindProjections, snapshotEntityKindPriorHypotheses } from "./kind-priors.js";
import { createStanceIndex, indexStanceEntries, snapshotStanceState } from "./stance-state.js";
import { normalizeHyperlexicon, admitHyperlexiconCandidates } from "./hyperlexicon.js";
import { createRelationCompositionLedger, consequentialWithheldCompositions } from "./relation-composition.js";
import { differenceMakesDifference } from "./materiality.js";
import { obligation, openObligation } from "./obligations.js";
import { createReadingTaskState, proposeObligationTasks, wakeTasks, appendTaskResult, executeClarificationTask, scheduleTasks } from "./reading-tasks.js";
import { projectTasks } from "./task-log.js";

export function encounter(value) { return Object.freeze({ schema: "Encounter@1", ...value }); }

export async function challengeCandidates(currentEncounter, orientation, candidates, { challengers = [] } = {}) {
  let frontier = [...candidates];
  const challenges = [];
  for (const challenger of challengers) {
    const result = await challenger.challenge?.({ encounter: currentEncounter, orientation, candidates: frontier });
    if (!result) continue;
    challenges.push(Object.freeze({ challenger: challenger.id ?? "anonymous", result }));
    if (Array.isArray(result.candidates)) frontier = result.candidates;
  }
  return Object.freeze({ schema: "EOChallengeFrontier@1", candidates: Object.freeze(frontier), challenges: Object.freeze(challenges) });
}

const observationGraph = (o) => [o, ...(o?.hyperedges ?? []), ...(o?.graphEntries ?? [])];
const deltaGraph = (delta, fold) => (delta?.operations ?? []).flatMap((op) => {
  const out = [op];
  if (op?.payload?.value?.id) out.push(op.payload.value);
  if (op?.payload?.action === "resolve-obligation" && op.payload.id) {
    const revised = (fold?.obligations ?? []).find((x) => x?.id === op.payload.id);
    if (revised) out.push(revised);
  }
  return out;
});

function compositionOperations(composition, fold = {}, graph = null) {
  // `graph` (the reader's incrementally-maintained hypergraph index) already
  // carries every id ever added to fold.graphEntries -- obligations
  // included, since applyPayload's "obligation" case returns the same
  // object as a graph update too. Building a fresh Set by scanning the
  // whole, ever-growing fold.graphEntries (plus fold.obligations again,
  // redundantly) on every turn was exactly the cost graph already exists to
  // avoid; a local Set only needs to hold what THIS call itself admits.
  const priorKnown = graph?.byId ?? new Map((fold?.graphEntries ?? []).map((entry) => [entry?.id, entry]).filter(([id]) => id));
  const localKnown = new Set();
  for (const item of fold?.obligations ?? []) if (item?.id && !priorKnown.has(item.id)) localKnown.add(item.id);
  const known = { has: (id) => priorKnown.has(id) || localKnown.has(id), add: (id) => localKnown.add(id) };
  const operations = [];

  for (const licensed of composition?.licensed ?? []) {
    if (known.has(licensed.id)) continue;
    known.add(licensed.id);
    operations.push(eoOperation({ op: "EVA", grain: "Pattern", witness: licensed.witnessRefs, inputs: licensed.edgeRefs, outputs: [licensed.id], consequence: { kind: "bridge_interpretation", composition: licensed.id }, payload: { action: "graph-object", value: licensed } }));
  }

  for (const withheld of consequentialWithheldCompositions(composition)) {
    const obligationId = `obligation:composition:${withheld.id}`;
    if (known.has(obligationId)) continue;
    const distinction = { composition: withheld.id, referentRefs: [...(withheld.referentRefs ?? [])], instances: [...(withheld.instances ?? [])], leftPredicate: withheld.leftPredicate, rightPredicate: withheld.rightPredicate };
    const consequences = [{ kind: "bridge_interpretation", composition: withheld.id }];
    const materiality = differenceMakesDifference({ distinction, consequences, fold, graph });
    if (!materiality.makesDifference) continue;

    if (!known.has(withheld.id)) {
      known.add(withheld.id);
      operations.push(eoOperation({ op: "DEF", grain: "Pattern", witness: withheld.witnessRefs, inputs: withheld.edgeRefs, outputs: [withheld.id], consequence: { kind: "composition_withheld", composition: withheld.id }, payload: { action: "graph-object", value: withheld } }));
    }

    known.add(obligationId);
    const unresolved = obligation({ id: obligationId, distinction: { ...distinction, materiality }, grounds: [withheld.id, ...(withheld.edgeRefs ?? [])], alternatives: [...(withheld.edgeRefs ?? [])], consequences, openedAt: (fold?.sequence ?? 0) + 1, persistence: 0 });
    operations.push(openObligation(unresolved, { witness: withheld.witnessRefs, grain: "Pattern", op: "DEF" }));
  }
  return operations;
}

function kindAdmissionOperations(projections = []) {
  return projections.map((projection) => eoOperation({
    op: "INS",
    grain: "Pattern",
    witness: projection.witnessRefs,
    inputs: projection.memberRefs,
    outputs: [projection.id],
    consequence: {
      kind: "kind_basin_admitted",
      kindKey: projection.kindKey,
      materiality: projection.materiality,
    },
    payload: { action: "graph-object", value: projection },
  }));
}

export function createRecursiveReader({ seed = {}, priors = [], perceivers = [], challengers = [], adapters = {}, hyperlexicon = null, kindInduction = {}, kindPriorConditioning = {}, taskLog = null, taskOrientationBudget = 24, taskExecutionBudget = 4 } = {}) {
  if (!Number.isInteger(taskOrientationBudget) || taskOrientationBudget < 0) throw new TypeError("taskOrientationBudget must be a non-negative integer");
  if (!Number.isInteger(taskExecutionBudget) || taskExecutionBudget < 0) throw new TypeError("taskExecutionBudget must be a non-negative integer");
  const { hyperlexicon: seedHyperlexicon = null, ...foldSeed } = seed ?? {};
  const kindPriors = Object.freeze((priors ?? []).filter((prior) => prior?.schema === "EOKindPrior@1"));
  let fold = receivedGround(foldSeed);
  let hl = normalizeHyperlexicon(hyperlexicon ?? seedHyperlexicon);
  let tasks = createReadingTaskState(taskLog);
  tasks = proposeObligationTasks(tasks, fold).log;
  const log = [];
  const graphSeed = [...(fold.graphEntries ?? []), ...(fold.expectations ?? []), ...(fold.obligations ?? []), ...(fold.activeFrames ?? []), ...(fold.unresolvedAlternatives ?? []), ...(fold.transformationObjects ?? [])];
  const graphIndex = buildHypergraph(graphSeed);
  const terrainIndex = createTerrainIndex(graphSeed);
  const emergentTerrainIndex = createEmergentTerrainIndex(graphSeed);
  const identityQuotientIndex = createIdentityQuotientIndex(graphSeed);
  const kindIndex = createKindInductionIndex(graphSeed, kindInduction);
  const kindAdmission = createKindBasinAdmissionLedger(kindInduction);
  const stanceIndex = createStanceIndex(graphSeed);
  const compositionLedger = createRelationCompositionLedger(graphSeed);
  let compositionDirty = true;
  let cachedCandidates = Object.freeze([]);
  let cachedComposition = Object.freeze({ withheld: Object.freeze([]), licensed: Object.freeze([]) });
  let cachedCompositionDiagnostics = compositionLedger.diagnostics();

  const currentKindState = () => conditionKindProjections(
    [...snapshotKindState(kindIndex), ...kindAdmission.snapshot()],
    kindPriors,
    kindPriorConditioning,
  );
  const currentEntityKindHypotheses = () => snapshotEntityKindPriorHypotheses(kindIndex, kindPriors, kindPriorConditioning);
  const currentKindDiagnostics = () => Object.freeze({ ...kindDiagnostics(kindIndex), basinAdmission: kindAdmission.diagnostics() });
  const currentIdentityQuotient = () => snapshotIdentityQuotient(identityQuotientIndex);

  const refreshComposition = () => {
    if (!compositionDirty) return;
    cachedCandidates = compositionLedger.candidates();
    hl = admitHyperlexiconCandidates(hl, cachedCandidates);
    cachedComposition = compositionLedger.evaluate(hl);
    cachedCompositionDiagnostics = compositionLedger.diagnostics();
    compositionDirty = false;
  };

  async function step(input) {
    const currentEncounter = input?.schema === "Encounter@1" ? input : encounter(input);
    const beforeFold = fold;
    const terrainStateBefore = snapshotTerrainState(terrainIndex);
    const referentEntitiesBefore = snapshotTerrainReferents(terrainIndex);
    const emergentTerrainStateBefore = snapshotEmergentTerrainState(emergentTerrainIndex);
    const identityQuotientBefore = currentIdentityQuotient();
    const kindStateBefore = currentKindState();
    const entityKindHypothesesBefore = currentEntityKindHypotheses();
    const stanceStateBefore = snapshotStanceState(stanceIndex);
    const liveTasksBefore = projectTasks(tasks);
    const orientationTasks = scheduleTasks(liveTasksBefore, beforeFold, { limit: taskOrientationBudget });
    const baseOrientation = deriveOrientation(beforeFold, { tasks: orientationTasks, terrainState: terrainStateBefore, emergentTerrainState: emergentTerrainStateBefore, kindState: kindStateBefore, stanceState: stanceStateBefore, referentEntities: referentEntitiesBefore });
    const orientation = Object.freeze({ ...baseOrientation, identityQuotient: identityQuotientBefore, entityKindHypotheses: entityKindHypothesesBefore });
    const candidates = await (adapters.perceive ?? defaultPerceive)(currentEncounter, orientation, { perceivers, priors: [...(orientation.receivedPriors ?? []), ...priors], hyperlexicon: hl });
    const challenge = adapters.challenge ? await adapters.challenge({ encounter: currentEncounter, orientation, candidates, hyperlexicon: hl }) : await challengeCandidates(currentEncounter, orientation, candidates, { challengers });
    const challengedCandidates = challenge?.candidates ?? candidates;
    const observations = await (adapters.witness ?? defaultWitness)(currentEncounter, challengedCandidates, { admit: adapters.admit });

    const observedGraph = observations.flatMap(observationGraph);
    indexHypergraphEntries(graphIndex, observedGraph);
    indexTerrainEntries(terrainIndex, observedGraph);
    indexEmergentTerrainEntries(emergentTerrainIndex, observedGraph);
    indexIdentityQuotientEntries(identityQuotientIndex, observedGraph);
    indexKindEntries(kindIndex, observedGraph);
    indexStanceEntries(stanceIndex, observedGraph);
    if (compositionLedger.ingest(observedGraph) > 0) compositionDirty = true;
    refreshComposition();
    const hlCandidates = cachedCandidates;
    const composition = cachedComposition;
    const compositionDiagnostics = cachedCompositionDiagnostics;

    const awakenedTasks = wakeTasks(orientationTasks, observations);
    const scheduledTasks = scheduleTasks(awakenedTasks, beforeFold, { limit: taskExecutionBudget });
    const taskEvidence = [];
    const executeTask = adapters.executeTask ?? executeClarificationTask;
    for (const task of scheduledTasks) {
      const result = await executeTask({ task, encounter: currentEncounter, observations, fold: beforeFold, orientation, graph: graphIndex, hyperlexicon: hl, composition });
      if (!result) continue;
      tasks = appendTaskResult(tasks, task, result);
      taskEvidence.push(Object.freeze({ schema: "TaskEvidence@1", id: `task-evidence:${task.task_id}:${currentEncounter.sequencePosition ?? log.length}`, taskId: task.task_id, obligationId: task.obligation_id ?? null, strategy: result.strategy ?? task.strategy ?? "clarify", questions: Object.freeze([...(result.questions ?? task.questions ?? [])]), disposition: result.disposition ?? "unresolved", evidence: Object.freeze([...(result.evidence ?? [])]), candidates: Object.freeze([...(result.candidates ?? [])]), depth: result.depth ?? null, detail: result.detail ?? null }));
    }

    indexHypergraphEntries(graphIndex, taskEvidence);
    indexTerrainEntries(terrainIndex, taskEvidence);
    indexEmergentTerrainEntries(emergentTerrainIndex, taskEvidence);
    indexIdentityQuotientEntries(identityQuotientIndex, taskEvidence);
    indexKindEntries(kindIndex, taskEvidence);
    indexStanceEntries(stanceIndex, taskEvidence);

    const basinAdmissions = kindAdmission.observe(
      kindCandidates(kindIndex),
      kindIndex,
      currentEncounter.sequencePosition ?? ((beforeFold.sequence ?? 0) + 1),
    );
    const basinOperations = kindAdmissionOperations(basinAdmissions);

    const neighborhood = (adapters.retrieve ?? relevantNeighborhood)(beforeFold, [...observations, ...taskEvidence], { select: adapters.selectNeighborhood, graph: graphIndex, terrainState: terrainStateBefore, emergentTerrainIndex, stanceState: stanceStateBefore });
    const interrogation = await (adapters.interrogate ?? interrogateCube)([...observations, ...taskEvidence], neighborhood, { ask: adapters.ask, hyperlexicon: hl, composition });
    const proposedDelta = adapters.revise
      // `tasks` (the log) has not changed since liveTasksBefore was projected
      // above -- re-projecting it here would replay the entire append-only
      // task log a second time for an identical result.
      ? await adapters.revise({ observations, taskEvidence, neighborhood, interrogation, fold: beforeFold, tasks: liveTasksBefore, graph: graphIndex, hyperlexicon: hl, composition })
      : deriveEOTransformations(interrogation, { id: `delta:${currentEncounter.sequencePosition ?? log.length}` });
    const baseDelta = proposedDelta?.schema === "DeltaFold@1" ? proposedDelta : deltaFold([]);
    const canonicalDelta = deltaFold([
      ...(baseDelta.operations ?? []),
      ...compositionOperations(composition, beforeFold, graphIndex),
      ...basinOperations,
    ], { id: baseDelta.id ?? `delta:${currentEncounter.sequencePosition ?? log.length}` });

    log.push(currentEncounter, ...observations, ...taskEvidence, canonicalDelta);
    let nextFold = beforeFold;
    for (const observation of observations) nextFold = applyObservation(nextFold, observation);
    nextFold = applyDelta(nextFold, canonicalDelta);
    fold = nextFold;
    const deltaEntries = deltaGraph(canonicalDelta, fold);
    indexHypergraphEntries(graphIndex, deltaEntries);
    indexTerrainEntries(terrainIndex, deltaEntries);
    indexEmergentTerrainEntries(emergentTerrainIndex, deltaEntries);
    indexIdentityQuotientEntries(identityQuotientIndex, deltaEntries);
    indexKindEntries(kindIndex, deltaEntries);
    indexStanceEntries(stanceIndex, deltaEntries);
    if (compositionLedger.ingest(deltaEntries) > 0) compositionDirty = true;
    const taskUpdate = proposeObligationTasks(tasks, fold); tasks = taskUpdate.log;
    const identityQuotient = currentIdentityQuotient();
    const kindState = currentKindState();
    const entityKindHypotheses = currentEntityKindHypotheses();

    // taskUpdate.tasks (from proposeObligationTasks, above) is already
    // Object.freeze(projectTasks(tasks)) over this exact, just-reassigned
    // log -- reuse it rather than replaying the whole task log again.
    return Object.freeze({ encounter: currentEncounter, orientation, candidates, challenge, observations, hyperlexicon: hl, hyperlexiconCandidates: hlCandidates, composition, compositionDiagnostics, identityQuotient, kindState, entityKindHypotheses, kindDiagnostics: currentKindDiagnostics(), basinAdmissions, awakenedTasks, scheduledTasks, taskEvidence, proposedTasks: taskUpdate.proposed, tasks: taskUpdate.tasks, relevantFold: neighborhood, interrogation, deltaFold: canonicalDelta, fold, surprise: deriveSurprise(canonicalDelta), tension: deriveTension(fold), release: deriveRelease(canonicalDelta, beforeFold, fold) });
  }

  async function read(encounters = []) {
    const turns = [];
    for (const item of encounters) turns.push(await step(item));
    refreshComposition();
    const terrainState = snapshotTerrainState(terrainIndex);
    const emergentTerrainState = snapshotEmergentTerrainState(emergentTerrainIndex);
    const identityQuotient = currentIdentityQuotient();
    const kindState = currentKindState();
    const entityKindHypotheses = currentEntityKindHypotheses();
    return Object.freeze({ turns, fold, hyperlexicon: hl, terrainState, referentEntities: snapshotTerrainReferents(terrainIndex), emergentTerrainState, identityQuotient, kindState, entityKindHypotheses, kindDiagnostics: currentKindDiagnostics(), effectiveTerrainState: mergeTerrainStates(terrainState, emergentTerrainState, { Kind: kindState }), stanceState: snapshotStanceState(stanceIndex), compositionDiagnostics: cachedCompositionDiagnostics, tasks: Object.freeze(projectTasks(tasks)), taskLog: tasks, log: [...log] });
  }
  return Object.freeze({
    step,
    read,
    getFold: () => fold,
    getHyperlexicon: () => hl,
    getTerrainState: () => snapshotTerrainState(terrainIndex),
    getTerrainReferents: () => snapshotTerrainReferents(terrainIndex),
    getEmergentTerrainState: () => snapshotEmergentTerrainState(emergentTerrainIndex),
    getIdentityQuotient: currentIdentityQuotient,
    getKindState: currentKindState,
    getEntityKindHypotheses: currentEntityKindHypotheses,
    getKindDiagnostics: currentKindDiagnostics,
    getEffectiveTerrainState: () => mergeTerrainStates(snapshotTerrainState(terrainIndex), snapshotEmergentTerrainState(emergentTerrainIndex), { Kind: currentKindState() }),
    getStanceState: () => snapshotStanceState(stanceIndex),
    getCompositionDiagnostics: () => { refreshComposition(); return cachedCompositionDiagnostics; },
    getTasks: () => Object.freeze(projectTasks(tasks)),
    getTaskLog: () => tasks,
    getLog: () => [...log],
  });
}
