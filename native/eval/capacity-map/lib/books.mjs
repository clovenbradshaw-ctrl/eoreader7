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
import { HONORIFIC_TITLES } from "../../../adapters/text/priors.js";

/** A sentence that ends in a received honorific plus a period ("... the advent of Mr.") — where the extent was cut inside a name. */
export const endsInHonorific = (text) => {
  const m = /([\p{L}]+)\.\s*$/u.exec(text);
  return !!m && HONORIFIC_TITLES.has(m[1].toLowerCase());
};

/**
 * The extent REPAIRED: consecutive sentences merged wherever the first ends in an honorific plus a
 * period. The class is the engine's received HONORIFIC_TITLES (giver lang/en); no list is typed here.
 */
export function mergeAtHonorifics(sents) {
  const out = [];
  for (const s of sents) {
    const prev = out[out.length - 1];
    if (prev && endsInHonorific(prev.text)) out[out.length - 1] = { ...prev, text: `${prev.text} ${s.text}` };
    else out.push(s);
  }
  return out;
}

export const tokenize = (s) =>
  diaNorm(s).replace(/[^\p{L}\p{N}'’\s-]+/gu, " ").split(/\s+/).filter(Boolean).map(stripPossessive).filter(Boolean);

/**
 * The placebo: the SAME number of consecutive-sentence merges as a real repair made, at seeded random
 * positions, so a merge that is not aimed at the cut is the control (F5′).
 */
export function mergeAtRandom(sents, count, rnd) {
  const pick = new Set();
  while (pick.size < Math.min(count, sents.length - 1)) pick.add(Math.floor(rnd() * (sents.length - 1)));
  const out = [];
  let carry = false;
  sents.forEach((s, i) => {
    if (carry && out.length) out[out.length - 1] = { ...out[out.length - 1], text: `${out[out.length - 1].text} ${s.text}` };
    else out.push(s);
    carry = pick.has(i);
  });
  return out;
}

export function loadBook(path, { spans = false, repairExtent = false, placeboMerges = 0, placeboRnd = null } = {}) {
  const stripped = stripContainer(fs.readFileSync(path, "utf8"));
  const split = splitSentences(stripped.text);
  const sents = repairExtent ? mergeAtHonorifics(split) : placeboMerges ? mergeAtRandom(split, placeboMerges, placeboRnd) : split;
  const surf = extractSurfaces(sents, {});
  const refs = discoverReferents(surf);
  const admit = refs.events.filter((e) => e.type === "DEF.admit");
  const sentToks = sents.map((s) => tokenize(s.text));
  const matchSpans = spans ? sents.map(() => []) : null; // per sentence: [{ surface, start, end }] in token indices

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
            if (matchSpans) matchSpans[i].push({ surface, start: j, end: j + st.length });
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
    path, N: sents.length, sentences: sents,
    clusterOfSurface,
    surfaceBeings: beings(arrivalsOfSurface),
    referentBeings: beings(clusterArrivals),
    matchSpans,
  };
}
