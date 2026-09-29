// eval/capacity-map/f5-units.mjs — F5 of native/docs/THE-CAPACITY-MAP.md: does geometric
// standing need identity? (the a -> g crossing, at Figure)
//
// Two arms over the same sentences, the same longest-match mention extraction, the same K = 80,
// W = 8 and networkStanding declarations as F4: the SURFACE arm (each admitted surface a
// separate being — identity unearned) and the REFERENT arm (the engine's clusters). A standing
// edge in the surface arm is a SELF-EDGE if its two surfaces belong to one cluster. The referent
// arm has none by construction; that is stated, not counted as a result.
//
// Statistics: (1) share_self among the 20 standing surface-arm edges with the most co-arrivals;
// (2) enrichment — among co-arriving surface pairs, P(standing | same cluster) vs P(standing |
// different cluster), Fisher exact, one-sided. Control built to fail: the surface -> cluster
// assignment permuted among the K surfaces 1000 times (seed 7) — a labelling unrelated to
// identity must not be enriched.
// Decision (declared): CONSEQUENTIAL on a book iff share_self >= 0.20 AND Fisher p < 0.01 AND the
// observed share exceeds the 95th percentile of the permuted-label shares; consequential overall
// iff so on >= 2 of the 3 books; a HAZARD (not a prerequisite) iff share_self < 0.05 on all three.
//
// Usage: node f5-units.mjs <pg345.txt> <pg1342.txt> <pg84.txt>
import fs from "node:fs";
import { networkStanding } from "../../kernel/network-standing.js";
import { bindLinks } from "../../legacy-ported/packages/engine/emergence/binding.js";
import { loadBook } from "./lib/books.mjs";
import { fisherGreater, lcg, shuffle } from "./lib/stats.mjs";

const CFG = { K: 80, W: 8, DRAWS: 199, ALPHA: 0.05, SEED: 20260812, TOP: 20, BAR: 0.2, HAZARD: 0.05, FISHER_P: 0.01, PERMS: 1000, PERM_SEED: 7 };

function arm(beings) {
  return networkStanding(beings, { bindLinks, window: CFG.W, draws: CFG.DRAWS, seed: CFG.SEED, alpha: CFG.ALPHA });
}

function oneBook(path) {
  const book = loadBook(path);
  const surf = book.surfaceBeings.slice(0, CFG.K);
  const ref = book.referentBeings.slice(0, CFG.K);
  const sArm = arm(surf);
  const rArm = arm(ref);
  const cluster = new Map(surf.map((b) => [b.id, book.clusterOfSurface.get(b.id)]));
  const all = [...sArm.edges.map((e) => ({ ...e, standing: true })), ...sArm.refused.map((e) => ({ ...e, standing: false }))];
  const top = sArm.edges.slice(0, CFG.TOP);

  const stats = (clusterOf) => {
    const same = (e) => clusterOf.get(e.a) === clusterOf.get(e.b);
    const selfTop = top.filter(same).length;
    let a = 0, b = 0, c = 0, d = 0;
    for (const e of all) {
      if (same(e)) e.standing ? a++ : b++;
      else e.standing ? c++ : d++;
    }
    return { share: top.length ? selfTop / top.length : NaN, selfTop, table: { a, b, c, d }, fisherP: fisherGreater(a, b, c, d) };
  };
  const observed = stats(cluster);

  const rnd = lcg(CFG.PERM_SEED);
  const ids = surf.map((b) => b.id);
  const labels = ids.map((i) => cluster.get(i));
  const shares = [];
  let enriched = 0;
  for (let i = 0; i < CFG.PERMS; i++) {
    const perm = [...labels];
    shuffle(perm, rnd);
    const s = stats(new Map(ids.map((id, j) => [id, perm[j]])));
    shares.push(s.share);
    if (s.fisherP < CFG.FISHER_P) enriched++;
  }
  shares.sort((x, y) => x - y);
  const p95 = shares[Math.floor(0.95 * shares.length)];
  const topEdges = top.map((e) => `${e.a} — ${e.b} (${e.coArrivals})${cluster.get(e.a) === cluster.get(e.b) ? "  [SELF]" : ""}`);

  // disclosed limit, descriptive only: referent-arm standing edges whose clusters share a rare name token
  const tokensOfCluster = new Map();
  for (const [s, c] of book.clusterOfSurface) {
    const set = tokensOfCluster.get(c) ?? new Set();
    for (const t of s.toLowerCase().split(/\s+/)) set.add(t);
    tokensOfCluster.set(c, set);
  }
  const tokenClusters = new Map();
  for (const [c, set] of tokensOfCluster) for (const t of set) tokenClusters.set(t, (tokenClusters.get(t) ?? 0) + 1);
  const residual = rArm.edges.slice(0, CFG.TOP).filter((e) => {
    const A = tokensOfCluster.get(e.a) ?? new Set();
    const B = tokensOfCluster.get(e.b) ?? new Set();
    return [...A].some((t) => B.has(t) && tokenClusters.get(t) === 2);
  }).map((e) => `${e.a.replace("ref:auto:", "")} — ${e.b.replace("ref:auto:", "")}`);

  const consequential = observed.share >= CFG.BAR && observed.fisherP < CFG.FISHER_P && observed.share > p95;
  return {
    path, N: book.N,
    surfaceArm: { beings: surf.length, standing: sArm.edges.length, notStanding: sArm.refused.length, topEdges },
    referentArm: { beings: ref.length, standing: rArm.edges.length, notStanding: rArm.refused.length, selfEdges: 0, note: "none by construction" },
    share_self: observed.share, selfInTop: observed.selfTop, topN: top.length,
    enrichment: { table: observed.table, fisherP: observed.fisherP },
    permutedLabels: { perms: CFG.PERMS, p95share: p95, meanShare: shares.reduce((s, x) => s + x, 0) / shares.length, fractionEnriched: enriched / CFG.PERMS },
    residualReferentPairsSharingARareToken: residual,
    consequential,
  };
}

const paths = process.argv.slice(2);
if (paths.length !== 3) { console.error("usage: f5-units.mjs <book1> <book2> <book3>"); process.exit(2); }
const books = paths.map((p) => { const r = oneBook(p); console.log(JSON.stringify({ ...r, surfaceArm: { ...r.surfaceArm, topEdges: r.surfaceArm.topEdges.slice(0, 20) } }, null, 1)); return r; });
const overall = books.filter((b) => b.consequential).length >= 2 ? "CONSEQUENTIAL" : books.every((b) => b.share_self < CFG.HAZARD) ? "HAZARD-ONLY" : "MIXED";
console.log(`OVERALL: ${overall}  (share_self ${books.map((b) => b.share_self.toFixed(2)).join(" / ")}; consequential on ${books.filter((b) => b.consequential).length} of 3)`);
fs.mkdirSync(new URL("./results/", import.meta.url), { recursive: true });
fs.writeFileSync(new URL("./results/f5-units.json", import.meta.url), JSON.stringify({ config: CFG, overall, books }) + "\n");
