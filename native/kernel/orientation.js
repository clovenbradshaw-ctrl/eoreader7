// Fold-conditioned orientation toward the next encounter.
// Orientation is transient and defeasible: it conditions attention but is not witness.

import { projectTerrainState, terrainCounts } from "./terrain-state.js";
import { projectEmergentTerrains, mergeTerrainStates } from "./emergent-terrain.js";
import { projectKinds } from "./kind-induction.js";
import { projectStanceState, stanceCounts } from "./stance-state.js";

export function deriveOrientation(fold = {}, { tasks = [], terrainState = null, emergentTerrainState = null, kindState = null, stanceState = null, referentEntities = null } = {}) {
  const openExpectations = (fold.expectations ?? []).filter((e) => ["open", "strengthened", "weakened"].includes(e.state ?? "open"));
  const openObligations = (fold.obligations ?? []).filter((o) => !["resolved", "closed", "superseded"].includes(o.status));
  const activeTasks = (tasks ?? []).filter((task) => !["resolved", "closed", "superseded", "retracted"].includes(task.status));
  // Terrain is a present-tense projection. Direct cube-addressed objects are
  // merged with structures already implicit in earned Fold content. Recursive
  // reading supplies incremental snapshots. Standalone callers can still
  // derive them from a Fold snapshot here.
  const emergent = emergentTerrainState ?? projectEmergentTerrains(fold);
  const kinds = kindState ?? projectKinds(fold?.graphEntries ?? []);
  const terrains = mergeTerrainStates(terrainState ?? projectTerrainState(fold), emergent, { Kind: kinds });
  const terrainCount = terrainCounts(terrains);
  const stances = stanceState ?? projectStanceState(fold);
  const stanceCount = stanceCounts(stances);
  const hasTerrainState = Object.values(terrainCount).some((count) => count > 0);
  const hasStanceState = Object.values(stanceCount).some((count) => count > 0);
  const foldReferents = referentEntities ?? fold.activeReferents ?? [];
  const projection = {
    schema: "EOOrientation@1",
    activeReferents: Object.freeze([...foldReferents]),
    activeKinds: Object.freeze([...kinds]),
    activeLinks: Object.freeze([...(fold.activeLinks ?? [])]),
    openAlternatives: Object.freeze([...(fold.unresolvedAlternatives ?? [])]),
    unresolvedObligations: Object.freeze(openObligations),
    activeExpectations: Object.freeze(openExpectations),
    activeTasks: Object.freeze([...activeTasks]),
    taskQuestions: Object.freeze(activeTasks.map((task) => ({ taskId: task.task_id, description: task.description, targets: task.targets ?? [], strategy: task.strategy ?? "clarify", wake: task.wake ?? null }))),
    relevantPatterns: Object.freeze([...(fold.relevantPatterns ?? [])]),
    activeFrames: Object.freeze([...(fold.activeFrames ?? [])]),
    receivedPriors: Object.freeze([...(fold.receivedPriors ?? [])]),
    consequenceBearingQuestions: Object.freeze([
      ...openObligations.map((o) => ({ obligationId: o.id, distinction: o.distinction, consequences: o.consequences ?? [] })),
      ...activeTasks.map((task) => ({ taskId: task.task_id, distinction: task.description, consequences: task.consequences ?? [] })),
    ]),
  };
  if (hasTerrainState) {
    projection.terrainState = terrains;
    projection.terrainCounts = terrainCount;
  }
  if (hasStanceState) {
    projection.stanceState = stances;
    projection.stanceCounts = stanceCount;
  }
  return Object.freeze(projection);
}
