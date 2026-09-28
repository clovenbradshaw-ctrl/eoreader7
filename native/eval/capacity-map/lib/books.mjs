// eval/capacity-map/lib/books.mjs — a book's beings, by the engine's own organs.
//
// splitSentences -> extractSurfaces -> discoverReferents give the admitted surfaces and the
// clusters they belong to. Mentions are then found by LONGEST-MATCH over the admitted surfaces
// (a mention of "Van Helsing" is not also a mention of "Van"), non-overlapping, on the same
// diaNorm fold and possessive strip the engine's own surface code uses. Arrivals are sentence
// indices — textEncounters' unit. Nothing is tuned: this is the assembly eval/network-standing.mjs
// already runs, minus the causal perceiver's incremental ids (identity here is the FINAL
// clustering, which that driver projects onto in any case — its header, "identity is
// retrieval-time").
import fs from "node:fs";
import { stripContainer, splitSentences } from "../../../adapters/text/spans.js";
import { extractSurfaces, discoverReferents, diaNorm, stripPossessive } from "../../../adapters/text/surfaces.js";

export const tokenize = (s) =>
  diaNorm(s).replace(/[^\p{L}\p{N}'’\s-]+/gu, " ").split(/\s+/).filter(Boolean).map(stripPossessive).filter(Boolean);

export function loadBook(path) {
  const stripped = stripContainer(fs.readFileSync(path, "utf8"));
  const sents = splitSentences(stripped.text);
  const surf = extractSurfaces(sents, {});
  const refs = discoverReferents(surf);
  const admit = refs.events.filter((e) => e.type === "DEF.admit");
  const sentToks = sents.map((s) => tokenize(s.text));

  const byFirst = new Map();
  const arrivalsOfSurface = new Map();
  const clusterOfSurface = new Map();
  for (const e of admit) {
    const st = tokenize(e.surface);
    if (!st.length) continue;
    const list = byFirst.get(st[0]) ?? [];
    list.push({ surface: e.surface, st });
    byFirst.set(st[0], list);
    arrivalsOfSurface.set(e.surface, []);
    clusterOfSurface.set(e.surface, e.referent_id);
  }
  for (const list of byFirst.values()) list.sort((a, b) => b.st.length - a.st.length);
  sentToks.forEach((ts, i) => {
    for (let j = 0; j < ts.length; ) {
      const cands = byFirst.get(ts[j]);
      let took = 0;
      if (cands) {
        for (const { surface, st } of cands) {
          if (st.every((w, k) => ts[j + k] === w)) {
            const a = arrivalsOfSurface.get(surface);
            if (a[a.length - 1] !== i) a.push(i);
            took = st.length;
            break;
          }
        }
      }
      j += took || 1;
    }
  });

  const clusterArrivals = new Map();
  for (const [s, a] of arrivalsOfSurface) {
    const c = clusterOfSurface.get(s);
    const xs = clusterArrivals.get(c) ?? [];
    xs.push(...a);
    clusterArrivals.set(c, xs);
  }
  const beings = (m, keyOf) => [...m]
    .map(([id, a]) => ({ id: keyOf ? keyOf(id) : id, arrivals: [...new Set(a)].sort((x, y) => x - y) }))
    .filter((b) => b.arrivals.length >= 2)
    .sort((a, b) => b.arrivals.length - a.arrivals.length || (a.id < b.id ? -1 : 1));
  return {
    path, N: sents.length,
    clusterOfSurface,
    surfaceBeings: beings(arrivalsOfSurface),
    referentBeings: beings(clusterArrivals),
  };
}
