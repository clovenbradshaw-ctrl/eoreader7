import { receivedGround, applyObservation, applyDelta, deltaFold, eoOperation } from "./fold.js";
import { deriveOrientation } from "./orientation.js";
import { perceive as defaultPerceive } from "./perception.js";
import { witness as defaultWitness } from "./witness.js";
import { relevantNeighborhood, interrogateCube, deriveEOTransformations } from "./interrogation.js";
import { deriveSurprise, deriveTension, deriveRelease } from "./dynamics.js";
import { buildHypergraph, indexHypergraphEntries } from "./hypergraph.js";
import { normalizeHyperlexicon, admitHyperlexiconCandidates } from "./hyperlexicon.js";
import { createRelationCompositionLedger, consequentialWithheldCompositions } from "./relation-composition.js";
import { differenceMakesDifference } from "./materiality.js";
import { obligation, openObligation } from "./obligations.js";
import { createReadingTaskState, proposeObligationTasks, wakeTasks, appendTaskResult, executeClarificationTask, scheduleTasks } from "./reading-tasks.js";
import { projectTasks } from "./task-log.js";

export function encounter(value) { return Object.freeze({ schema: "Encounter@1", ...value }); }

/** Constitutive perturbation: every nominated candidate passes through this stage before witness. */
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
  const known = new Set((fold?.graphEntries ?? []).map((entry) => entry?.id).filter(Boolean));
  for (const item of fold?.obligations ?? []) if (item?.id) known.add(item.id);
  const operations = [];

  for (const licensed of composition?.licensed ?? []) {
    if (known.has(licensed.id)) continue;
    known.add(licensed.id);
    operations.push(eoOperation({
      op: "EVA",
      grain: "Pattern",
      witness: licensed.witnessRefs,
      inputs: licensed.edgeRefs,
      outputs: [licensed.id],
      consequence: { kind: "bridge_interpretation", composition: licensed.id },
      payload: { action: "graph-object", value: licensed },
    }));
  }

  for (const withheld of consequentialWithheldCompositions(composition)) {
    if (!known.has(withheld.id)) {
      known.add(withheld.id);
      operations.push(eoOperation({
        op: "DEF",
        grain: "Pattern",
        witness: withheld.witnessRefs,
        inputs: withheld.edgeRefs,
        outputs: [withheld.id],
        consequence: { kind: "composition_withheld", composition: withheld.id },
        payload: { action: "graph-object", value: withheld },
      }));
    }

    const obligationId = `obligation:composition:${withheld.id}`;
    if (known.has(obligationId)) continue;
    const distinction = {
      composition: withheld.id,
      referentRefs: [...(withheld.referentRefs ?? [])],
      instances: [...(withheld.instances ?? [])],
      leftPredicate: withheld.leftPredicate,
      rightPredicate: withheld.rightPredicate,
    };
    // Source edges nominate a possible bridge; they cannot prove their own
    // consequence. Active work requires a downstream Fold dependency.
    const consequences = [{ kind: "bridge_interpretation", composition: withheld.id }];
    const materiality = differenceMakesDifference({ distinction, consequences, fold, graph });
    if (!materiality.makesDifference) continue;

    known.add(obligationId);
    const unresolved = obligation({
      id: obligationId,
      distinction: { ...distinction, materiality },
      grounds: [withheld.id, ...(withheld.edgeRefs ?? [])],
      alternatives: [...(withheld.edgeRefs ?? [])],
      consequences,
      openedAt: (fold?.sequence ?? 0) + 1,
      persistence: 0,
    });
    operations.push(openObligation(unresolved, {
      witness: withheld.witnessRefs,
      grain: "Pattern",
      op: "DEF",
    }));
  }
  return operations;
}

export function createRecursiveReader({ seed = {}, priors = [], perceivers = [], challengers = [], adapters = {}, hyperlexicon = null, taskLog = null, taskOrientationBudget = 24, taskExecutionBudget = 4 } = {}) {
  if (!Number.isInteger(taskOrientationBudget) || taskOrientationBudget < 0) throw new TypeError("taskOrientationBudget must be a non-negative integer");
  if (!Number.isInteger(taskExecutionBudget) || taskExecutionBudget < 0) throw new TypeError("taskExecutionBudget must be a non-negative integer");
  const { hyperlexicon: seedHyperlexicon = null, ...foldSeed } = seed ?? {};
  let fold = receivedGround(foldSeed);
  let hl = normalizeHyperlexicon(hyperlexicon ?? seedHyperlexicon);
  let tasks = createReadingTaskState(taskLog);
  tasks = proposeObligationTasks(tasks, fold).log;
  const log = [];
  const graphSeed = [...(fold.graphEntries ?? []), ...(fold.expectations ?? []), ...(fold.obligations ?? []), ...(fold.activeFrames ?? []), ...(fold.unresolvedAlternatives ?? []), ...(fold.transformationObjects ?? [])];
  const graphIndex = buildHypergraph(graphSeed);
  const compositionLedger = createRelationCompositionLedger(graphSeed);

  async function step(input) {
    const currentEncounter = input?.schema === "Encounter@1" ? input : encounter(input);
    const beforeFold = fold;
    const liveTasksBefore = projectTasks(tasks);
    const orientationTasks = scheduleTasks(liveTasksBefore, beforeFold, { limit: taskOrientationBudget });
    const orientation = deriveOrientation(beforeFold, { tasks: orientationTasks });
    const candidates = await (adapters.perceive ?? defaultPerceive)(currentEncounter, orientation, { perceivers, priors: [...(orientation.receivedPriors ?? []), ...priors], hyperlexicon: hl });
    const challenge = adapters.challenge ? await adapters.challenge({ encounter: currentEncounter, orientation, candidates, hyperlexicon: hl }) : await challengeCandidates(currentEncounter, orientation, candidates, { challengers });
    const challengedCandidates = challenge?.candidates ?? candidates;
    const observations = await (adapters.witness ?? defaultWitness)(currentEncounter, challengedCandidates, { admit: adapters.admit });

    const observedGraph = observations.flatMap(observationGraph);
    indexHypergraphEntries(graphIndex, observedGraph);
    compositionLedger.ingest(observedGraph);
    const hlCandidates = compositionLedger.candidates();
    hl = admitHyperlexiconCandidates(hl, hlCandidates);
    const composition = compositionLedger.evaluate(hl);
    const compositionDiagnostics = compositionLedger.diagnostics();

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
    const neighborhood = (adapters.retrieve ?? relevantNeighborhood)(beforeFold, [...observations, ...taskEvidence], { select: adapters.selectNeighborhood, graph: graphIndex });
    const interrogation = await (adapters.interrogate ?? interrogateCube)([...observations, ...taskEvidence], neighborhood, { ask: adapters.ask, hyperlexicon: hl, composition });
    const proposedDelta = adapters.revise
      ? await adapters.revise({ observations, taskEvidence, neighborhood, interrogation, fold: beforeFold, tasks: projectTasks(tasks), graph: graphIndex, hyperlexicon: hl, composition })
      : deriveEOTransformations(interrogation, { id: `delta:${currentEncounter.sequencePosition ?? log.length}` });
    const baseDelta = proposedDelta?.schema === "DeltaFold@1" ? proposedDelta : deltaFold([]);
    const canonicalDelta = deltaFold([
      ...(baseDelta.operations ?? []),
      ...compositionOperations(composition, beforeFold, graphIndex),
    ], { id: baseDelta.id ?? `delta:${currentEncounter.sequencePosition ?? log.length}` });

    log.push(currentEncounter, ...observations, ...taskEvidence, canonicalDelta);
    let nextFold = beforeFold;
    for (const observation of observations) nextFold = applyObservation(nextFold, observation);
    nextFold = applyDelta(nextFold, canonicalDelta);
    fold = nextFold;
    indexHypergraphEntries(graphIndex, deltaGraph(canonicalDelta, fold));
    const taskUpdate = proposeObligationTasks(tasks, fold); tasks = taskUpdate.log;

    return Object.freeze({ encounter: currentEncounter, orientation, candidates, challenge, observations, hyperlexicon: hl, hyperlexiconCandidates: hlCandidates, composition, compositionDiagnostics, awakenedTasks, scheduledTasks, taskEvidence, proposedTasks: taskUpdate.proposed, tasks: Object.freeze(projectTasks(tasks)), relevantFold: neighborhood, interrogation, deltaFold: canonicalDelta, fold, surprise: deriveSurprise(canonicalDelta), tension: deriveTension(fold), release: deriveRelease(canonicalDelta, beforeFold, fold) });
  }

  async function read(encounters = []) {
    const turns = [];
    for (const item of encounters) turns.push(await step(item));
    return Object.freeze({ turns, fold, hyperlexicon: hl, compositionDiagnostics: compositionLedger.diagnostics(), tasks: Object.freeze(projectTasks(tasks)), taskLog: tasks, log: [...log] });
  }
  return Object.freeze({ step, read, getFold: () => fold, getHyperlexicon: () => hl, getCompositionDiagnostics: () => compositionLedger.diagnostics(), getTasks: () => Object.freeze(projectTasks(tasks)), getTaskLog: () => tasks, getLog: () => [...log] });
}
