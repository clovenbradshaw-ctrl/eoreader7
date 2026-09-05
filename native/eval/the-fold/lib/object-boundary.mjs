// lib/object-boundary.mjs — the received object boundary (P74 lever 3),
// measured as ONE implementation shared by `eval/the-fold/object-boundary.mjs`
// (prints) and `native/tests/object-boundary.test.js` (reads it on every
// suite run). the-fold P95 / S65.
//
// WHAT THE 2026-09-05 RE-RUN FOUND. `results/object-boundary-RESULTS.md`
// (2026-09-02) reported the bounded arm moving 782 of 1,644 objects (earned
// faces +15/−48) — refuted at book scale, kept opt-in. Live, the three arms
// were BYTE-IDENTICAL (1,590 edges each, debris 0.459 in all three) and the
// driver still printed "moved by the cut: 53" — pairs its address key could
// not tell apart, not moves. The opt-in `boundedObjects` organ was removed
// from the-fold's hypergraph.js in P80 (`2214e1a`, 2026-09-03: "the-fold
// keeps only the surface it can today"); `makeRelationReader` ignores the
// unknown option, and the driver measured the same reader three times. A
// fact about the harness printed as a table about the material — P41, the
// third driver this audit found it in.
//
// So the measurement carries its own reachability check: when the material
// offers objects the boundary WOULD cut (debris > 0 in the baseline) and the
// bounded arm's objects are identical to the baseline's, the cut did not
// reach the reader, and the driver REFUSES with a typed gap instead of
// printing three identical rows.

const lcg = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

export function redealtBoundary(posPrior, boundary, seed) {
  const r = lcg(seed);
  const pool = Object.keys(posPrior.forms).filter((f) => !boundary.has(f));
  const out = new Set();
  while (out.size < boundary.size) out.add(pool[Math.floor(r() * pool.length)]);
  return out;
}

export function measureArm(rel, label, boundary) {
  const edges = rel.edges ?? [];
  const objs = edges.map((e) => String(e.end2 ?? e.object ?? ""));
  const toks = (o) => o.toLowerCase().split(/\s+/).filter(Boolean);
  const debris = objs.filter((o) => toks(o).slice(1).some((t) => boundary.has(t))).length;
  const faced = edges.filter((e) => e.end2Face).length;
  const lens = objs.map((o) => toks(o).length).sort((a, b) => a - b);
  const median = lens.length ? lens[Math.floor(lens.length / 2)] : 0;
  return { label, edges: edges.length, distinctObjects: new Set(objs.map((o) => o.toLowerCase())).size, debrisRate: edges.length ? debris / edges.length : 0, end2FaceRate: edges.length ? faced / edges.length : 0, medianObjectTokens: median, debris, objs, rows: edges };
}

/**
 * Did the cut reach the reader? A typed gap when it could not have.
 * @returns {null | {type:"organ_unreachable", organ:"boundedObjects", detail:string}}
 */
export function boundedCutGap(base, bound, boundary) {
  if (!boundary?.size) return { type: "organ_unreachable", organ: "boundedObjects", detail: "the boundary set is empty — nothing could be cut, so nothing was measured" };
  if (base.debris === 0) return null; // nothing to cut; identical arms are the honest reading
  const same = base.objs.length === bound.objs.length && base.objs.every((o, i) => o === bound.objs[i]);
  if (!same) return null;
  return {
    type: "organ_unreachable",
    organ: "boundedObjects",
    detail:
      `the baseline carries ${base.debris} object(s) the boundary would cut and the bounded arm's objects are byte-identical to the baseline's — ` +
      `the reader ignored the opt-in. (Verified: the identity of the arms. Not verified here, recorded 2026-09-05: the-fold's hypergraph.js dropped \`boundedObjects\` in P80, 2214e1a.) This is a fact about the reader, ` +
      `not the material; results/object-boundary-RESULTS.md records a run made while the organ existed.`,
  };
}

/**
 * The three arms and the marginal pairing, verbatim from the driver.
 * @param {object} p — { reader(opts) → relationsFor, passages, posPrior,
 *   objectBoundaryFrom, minShare, seed }
 */
export function measureObjectBoundary({ reader, passages, posPrior, objectBoundaryFrom, minShare, seed }) {
  const boundary = objectBoundaryFrom(posPrior, { minShare });
  const base = measureArm(reader()(passages, { pool: passages }), "baseline", boundary);
  const bound = measureArm(reader({ objectBoundaryFrom })(passages, { pool: passages }), "bounded", boundary);
  const redealt = measureArm(reader({ objectBoundaryFrom: () => redealtBoundary(posPrior, boundary, seed) })(passages, { pool: passages }), "redealt-control", boundary);
  const gap = boundedCutGap(base, bound, boundary);

  // THE MARGINAL CHANGES — paired by the edge's own ADDRESS START and verb
  // (the trim never moves a match's start; it can change how many matches a
  // per-sentence limit admits, so index pairing is not safe — found by running).
  const addr = (e) => { const a = e.spans?.[0]?.at ?? e.refs?.[0] ?? ""; const m = String(a).match(/^(.*#\d+)-\d+$/); return `${m ? m[1] : a}|${String(e.label ?? e.verb)}|${String(e.end1 ?? e.subject)}`; };
  const after = new Map(bound.rows.map((e) => [addr(e), e]));
  const moved = [];
  let paired = 0, facedGained = 0, facedLost = 0, unpaired = 0;
  for (const e of base.rows) {
    const b = after.get(addr(e));
    if (!b) { unpaired += 1; continue; }
    paired += 1;
    const before = String(e.end2 ?? e.object), afterO = String(b.end2 ?? b.object);
    if (before !== afterO) { moved.push([before, afterO]); if (!e.end2Face && b.end2Face) facedGained += 1; if (e.end2Face && !b.end2Face) facedLost += 1; }
  }
  const controlHeld = redealt.debrisRate >= base.debrisRate - 1 / Math.max(1, base.edges);
  return { boundary, base, bound, redealt, gap, paired, unpaired, moved, facedGained, facedLost, controlHeld };
}
