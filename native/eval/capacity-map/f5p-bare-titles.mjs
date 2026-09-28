// eval/capacity-map/f5p-bare-titles.mjs — F5′ of native/docs/THE-CAPACITY-MAP.md section 8,
// exactly as registered there (the registration was committed before this file was run on any
// held-out book): does repairing the extent remove standing edges that rest on a title that is
// not a being?
//
// Held-out (decide): pg768 Sherlock Holmes, pg2701 Moby-Dick, pg1661 Tom Sawyer.
// Development (exploratory replication only, not counted): pg345, pg1342, pg84.
// Referent arm; K 80, W 8, networkStanding draws 199 / alpha 0.05 / seed 20260812. Three extents:
// as-split; repaired (sentences merged where the first ends in a HONORIFIC_TITLES token plus a
// period); placebo (the same NUMBER of merges at seeded random positions, seed 7).
// share(extent) = fraction of the 20 standing edges with the most co-arrivals that have a
// bare-title endpoint (a cluster all of whose surfaces are one HONORIFIC_TITLES token).
// Δ = share(as-split) − share(repaired); Δ_placebo = share(as-split) − share(placebo).
// Consequential on a book iff Δ >= 0.20 AND Δ_placebo <= Δ/2; overall iff on >= 2 of 3 held-out.
//
// Usage: node f5p-bare-titles.mjs <heldout|development> <book1> <book2> <book3>
import fs from "node:fs";
import { networkStanding } from "../../kernel/network-standing.js";
import { bindLinks } from "../../legacy-ported/packages/engine/emergence/binding.js";
import { HONORIFIC_TITLES } from "../../adapters/text/priors.js";
import { loadBook, tokenize, endsInHonorific } from "./lib/books.mjs";
import { lcg } from "./lib/stats.mjs";

const CFG = { K: 80, W: 8, DRAWS: 199, ALPHA: 0.05, SEED: 20260812, TOP: 20, BAR: 0.2, PLACEBO_SEED: 7 };
const isBareTitle = (surfaces) => surfaces.length > 0 && surfaces.every((s) => { const t = tokenize(s); return t.length === 1 && HONORIFIC_TITLES.has(t[0]); });
const containsHonorificDot = (text) => [...text.matchAll(/([\p{L}]+)\./gu)].some((m) => HONORIFIC_TITLES.has(m[1].toLowerCase()));

function arm(path, opts) {
  const book = loadBook(path, opts);
  const surfacesOf = new Map();
  for (const [s, c] of book.clusterOfSurface) surfacesOf.set(c, [...(surfacesOf.get(c) ?? []), s]);
  const beings = book.referentBeings.slice(0, CFG.K);
  const bare = new Map(beings.map((b) => [b.id, isBareTitle(surfacesOf.get(b.id) ?? [])]));
  const st = networkStanding(beings, { bindLinks, window: CFG.W, draws: CFG.DRAWS, seed: CFG.SEED, alpha: CFG.ALPHA });
  const top = st.edges.slice(0, CFG.TOP);
  const flagged = top.filter((e) => bare.get(e.a) || bare.get(e.b));
  let containing = 0, ending = 0;
  for (const s of book.sentences) if (containsHonorificDot(s.text)) { containing++; if (endsInHonorific(s.text)) ending++; }
  return {
    N: book.N, share: top.length ? flagged.length / top.length : NaN,
    bareTitleBeings: beings.filter((b) => bare.get(b.id)).map((b) => `${b.id.replace("ref:auto:", "")}:${b.arrivals.length}`),
    allEdgesWithBare: st.edges.filter((e) => bare.get(e.a) || bare.get(e.b)).length, standingEdges: st.edges.length,
    examples: flagged.slice(0, 6).map((e) => `${e.a.replace("ref:auto:", "")} — ${e.b.replace("ref:auto:", "")} (${e.coArrivals})`),
    audit: { sentencesWithHonorificDot: containing, endingInIt: ending },
  };
}

const [role, ...paths] = process.argv.slice(2);
if (!["heldout", "development"].includes(role) || paths.length !== 3) { console.error("usage: f5p-bare-titles.mjs <heldout|development> <book1> <book2> <book3>"); process.exit(2); }
const books = paths.map((path) => {
  const asSplit = arm(path, {});
  const repaired = arm(path, { repairExtent: true });
  const merges = asSplit.N - repaired.N; // the number of merges the repair made — the placebo makes as many
  const placebo = arm(path, { placeboMerges: merges, placeboRnd: lcg(CFG.PLACEBO_SEED) });
  const delta = asSplit.share - repaired.share;
  const deltaPlacebo = asSplit.share - placebo.share;
  const consequential = delta >= CFG.BAR && deltaPlacebo <= delta / 2;
  const row = { book: path.split("/").pop(), merges, asSplit, repaired, placebo, delta, deltaPlacebo, consequential };
  console.log(`\n# ${row.book}  (${role}); the repair made ${merges} merges`);
  for (const [name, a] of [["as-split", asSplit], ["repaired", repaired], ["placebo", placebo]]) console.log(`  ${name.padEnd(9)} N=${String(a.N).padStart(5)} share=${a.share.toFixed(2)} | all standing edges with a bare title ${a.allEdgesWithBare}/${a.standingEdges} | bare-title beings ${a.bareTitleBeings.join(", ") || "none"} | honorific-dot sentences ${a.audit.sentencesWithHonorificDot}, ending in it ${a.audit.endingInIt}\n     e.g. ${a.examples.join(" | ")}`);
  console.log(`  Δ = ${delta.toFixed(2)}   Δ_placebo = ${deltaPlacebo.toFixed(2)}   consequential: ${consequential}`);
  return row;
});
const hits = books.filter((b) => b.consequential).length;
const overall = role === "heldout" ? { consequentialOverall: hits >= 2, on: `${hits} of 3` } : { note: "exploratory replication — not counted in the decision", consequentialOn: `${hits} of 3` };
console.log(`\nOVERALL (${role}):`, JSON.stringify(overall));
fs.mkdirSync(new URL("./results/", import.meta.url), { recursive: true });
fs.writeFileSync(new URL(`./results/f5p-${role}.json`, import.meta.url), JSON.stringify({ config: CFG, role, overall, books }, null, 1));
