// kernel/cascade.js — ONE shared primitive for "what rests on this,
// transitively": invert a dependency list into Map<id, Set<dependentId>>
// once, then walk a single multi-source BFS over it.
//
// organs/derivation.js's premise-withdrawal cascade (exposure/
// withdrawDerived) and this kernel's own licence-withdrawal cascade
// (reaction.js::withdraw) grew the identical shape independently, each
// hand-rolled: a frontier of ids, and at every round a full rescan of the
// live set asking "does this candidate's dependency list `.includes()` a
// frontier id" — O(rounds * liveSize) instead of O(edges). reaction.js's
// own copy was worse again: it rebuilt its whole candidate array
// (`allDerived()`) fresh on every single frontier item, not just once per
// round. Per eoreader6.1's own CLAUDE.md ("When two goldens grow the same
// tool independently, reconcile them — don't just dedupe"): both were read
// in full, neither was strictly superior — derivation.js's version already
// used a `seen` set correctly and never rescanned per item; reaction.js's
// version already carried the "seeds are taken too" shape derivation.js's
// callers don't need. This file is the union: one inversion, one walk,
// reused by both, with each caller's own seeding behaviour left to it.
//
// Neither function below knows what an "id" means — a raw testimony note,
// a derived note, or a derived hyperedge are all just ids and dependency
// lists here.

/**
 * dependentsIndex(items, dependsOn, idOf) — Map<id, Set<dependentId>>,
 * built once.
 *   items      any array of nodes
 *   dependsOn  (item) => iterable of ids this item rests on (its premises,
 *              or its derivation parents)
 *   idOf       (item) => this item's own stable id (default: `item.id` —
 *              derivation.js's notes carry it there; reaction.js's own
 *              `allDerived()` rows carry it at `.edge.id`, so that caller
 *              passes `(f) => f.edge.id`)
 */
export function dependentsIndex(items, dependsOn, idOf = (item) => item.id) {
  const index = new Map();
  for (const item of items ?? []) {
    const id = idOf(item);
    for (const dep of dependsOn(item) ?? []) {
      if (!index.has(dep)) index.set(dep, new Set());
      index.get(dep).add(id);
    }
  }
  return index;
}

/**
 * cascade(index, seeds, { seen }) — the transitive closure of DEPENDENTS
 * reachable from `seeds`, as one multi-source breadth-first walk over a
 * prebuilt `dependentsIndex`. Every id is visited at most once, so this is
 * O(edges actually touched), never O(rounds * the whole live set).
 *
 * Seeds themselves are never in the returned array — a caller that wants
 * them counted too (reaction.js's own `withdraw`, where the directly-
 * matched facts are themselves taken, at depth 0, cascadedFrom: null) adds
 * them itself; a caller whose seed is external to the dependency graph
 * (derivation.js's own `premise`, a note id that is not itself one of the
 * derived items being walked) does not.
 *
 * `seen` (optional, mutated in place) pre-populates ids to treat as
 * already reached, and accumulates every id this call visits too — a
 * caller with its own persistent "already taken" set (reaction.js's
 * `withdrawn` Map) passes its keys so a later call does not re-walk from,
 * or re-take, something a prior call already took: by construction,
 * everything transitively resting on an already-taken id is already taken
 * too, so there is nothing further to discover past it.
 *
 * Returns an array of { id, cascadedFrom, cascadeDepth }, each visited
 * exactly once, in breadth-first order — so `cascadeDepth` is the
 * SHORTEST path from any seed, and ties (an id reachable from two seeds,
 * or through two parents, at the same depth) resolve to whichever parent
 * this pass reaches it through first.
 */
export function cascade(index, seeds, { seen = new Set() } = {}) {
  const taken = [];
  const frontier0 = [];
  for (const s of seeds ?? []) { seen.add(s); frontier0.push({ id: s, depth: 0 }); }
  let frontier = frontier0;
  while (frontier.length) {
    const next = [];
    for (const { id, depth } of frontier) {
      for (const dep of index.get(id) ?? []) {
        if (seen.has(dep)) continue;
        seen.add(dep);
        taken.push({ id: dep, cascadedFrom: id, cascadeDepth: depth + 1 });
        next.push({ id: dep, depth: depth + 1 });
      }
    }
    frontier = next;
  }
  return taken;
}
