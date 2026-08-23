// Fold-conditioned orientation toward the next encounter.
// Orientation is transient and defeasible: it conditions attention but is not witness.

import { projectTerrainState, terrainCounts } from "./terrain-state.js";

export function deriveOrientation(fold = {}, { tasks = [] } = {}) {
  const openExpectations = (fold.expectations ?? []).filter((e) => ["open", "strengthened", "weakened"].includes(e.state ?? "open"));
  const openObligations = (fold.obligations ?? []).filter((o) => !["resolved", "closed", "superseded"].includes(o.status));
  const activeTasks = (tasks ?? []).filter((task) => !["resolved", "closed", "superseded", "retracted"].includes(task.status));
  const terrains = projectTerrainState(fold);
  const counts = terrainCounts(terrains);
  const hasTerrainState = Object.values(counts).some((count) => count > 0);
  const projection = {
    schema: "EOOrientation@1",
    activeReferents: Object.freeze([...(fold.activeReferents ?? [])]),
    activeKinds: Object.freeze([...(fold.activeKinds ?? [])]),
    activeLinks: Object.freeze([...(fold.activeLinks ?? [])]),
    openAlternatives: Object.freeze([...(fold.unresolvedAlternatives ?? [])]),
    unresolvedObligations: Object.freeze(openObligations),
    activeExpectations: Object.freeze(openExpectations),
    activeTasks: Object.freeze([...activeTasks]),
    taskQuestions: Object.freeze(activeTasks.map((task) => ({
      taskId: task.task_id,
      description: task.description,
      targets: task.targets ?? [],
      strategy: task.strategy ?? "clarify",
      wake: task.wake ?? null,
    }))),
    relevantPatterns: Object.freeze([...(fold.relevantPatterns ?? [])]),
    activeFrames: Object.freeze([...(fold.activeFrames ?? [])]),
    receivedPriors: Object.freeze([...(fold.receivedPriors ?? [])]),
    consequenceBearingQuestions: Object.freeze([
      ...openObligations.map((o) => ({ obligationId: o.id, distinction: o.distinction, consequences: o.consequences ?? [] })),
      ...activeTasks.map((task) => ({ taskId: task.task_id, distinction: task.description, consequences: task.consequences ?? [] })),
    ]),
  };
  // Preserve the frozen 6.1 public shape for legacy-shaped Folds while making
  // the universal terrain projection available as soon as the Fold actually
  // contains terrain-addressed state.
  if (hasTerrainState) {
    projection.terrainState = terrains;
    projection.terrainCounts = counts;
  }
  return Object.freeze(projection);
}
