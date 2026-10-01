// ═══ UNRAVELING — a stance, not a domain (Unraveling = Differentiate · Pattern: NUL·P, SEG·P, DEF·P) ═══
//
// What the stance does: find where a tangled whole comes apart into parts that do not need each other, and cut
// there — at a SEAM, a connection whose removal separates the whole. It cuts only where the structure already
// has a joint, and where there is none it says so (`no_seam`) instead of cutting somewhere for the look of
// having cut. Domain-blind: nodes are ids, and adjacency is whatever the caller's adapter says is joined.
//
// The seam is a bridge in the graph (an edge on no cycle), found with edge ids so that two parallel edges between
// the same pair — a doubled connection — are a cycle and not a seam (a textbook parent-skip ships a false seam
// there; the control below plants exactly that).
//
// The control built to fail (II.23): a request whose parts are all joined to each other (a cycle) must return
// `no_seam`; cutting it would invent an independence the structure does not have.

export const UNRAVELING_SCHEMA = "EOUnraveling@1";

/** the bridges of an undirected multigraph: nodes [id], edges [[a,b]] -> indexes of the edges that are seams */
export function bridgesOf(nodes, edges) {
  const adj = new Map(nodes.map((n) => [n, []]));
  edges.forEach(([a, b], i) => { if (a === b || !adj.has(a) || !adj.has(b)) return; adj.get(a).push([b, i]); adj.get(b).push([a, i]); });
  const disc = new Map(), low = new Map(), seams = []; let t = 0;
  const visit = (u, viaEdge) => {
    disc.set(u, ++t); low.set(u, disc.get(u));
    for (const [v, ei] of adj.get(u)) {
      if (ei === viaEdge) continue;
      if (disc.has(v)) low.set(u, Math.min(low.get(u), disc.get(v)));
      else { visit(v, ei); low.set(u, Math.min(low.get(u), low.get(v))); if (low.get(v) > disc.get(u)) seams.push(ei); }
    }
  };
  for (const n of nodes) if (!disc.has(n)) visit(n, -1);
  return seams.sort((x, y) => x - y);
}

/** unravel(nodes, edges) -> { status:"split", parts:[[id]], seams:[edge] } | { status:"no_seam", parts:[[all]] } | { status:"empty" } */
export function unravel(nodes, edges) {
  if (!nodes.length) return { schema: UNRAVELING_SCHEMA, status: "empty", parts: [], seams: [] };
  const seamIdx = new Set(bridgesOf(nodes, edges)), parent = new Map(nodes.map((n) => [n, n]));
  const find = (x) => (parent.get(x) === x ? x : (parent.set(x, find(parent.get(x))), parent.get(x)));
  edges.forEach(([a, b], i) => { if (!seamIdx.has(i) && parent.has(a) && parent.has(b)) parent.set(find(a), find(b)); });
  const groups = new Map(); for (const n of nodes) { const r = find(n); (groups.get(r) ?? groups.set(r, []).get(r)).push(n); }
  const parts = [...groups.values()], seams = [...seamIdx].map((i) => edges[i]);
  // components of the whole that were never joined at all are parts too, with no seam between them
  return { schema: UNRAVELING_SCHEMA, status: parts.length > 1 ? "split" : "no_seam", parts, seams };
}

/**
 * partsOfRequest — the adapter for a request: its phrases are the nodes, and two phrases are joined when they share a content word.
 * phrases: [string]; stop: Set of words that join nothing (the caller's closed class, never a list typed here)
 */
export function partsOfRequest(phrases, stop = new Set()) {
  const words = phrases.map((p) => new Set((p.toLowerCase().match(/[a-z]{3,}/g) ?? []).filter((w) => !stop.has(w)))), edges = [];
  for (let i = 0; i < phrases.length; i++) for (let j = i + 1; j < phrases.length; j++) if ([...words[i]].some((w) => words[j].has(w))) edges.push([phrases[i], phrases[j]]);
  return unravel(phrases, edges);
}
