// eval/capacity-map/f5c-bare-titles.mjs — EXPLORATORY and POST-HOC (changes no verdict in
// results/f5-units.json). F5's own top-edge lists contain "Mr — Bennet", "Mrs — Gardiner",
// "Harker — Mrs": a bare honorific admitted as a BEING, standing with everyone it precedes. F5b
// tested one mechanism for that (the title and its name as neighbours of one mention) and it was
// REFUTED — the matches are never adjacent; the bare title stands for many different men, which
// is a unit failure of a different kind. This counts it directly, with the engine's own received
// closed class: HONORIFIC_TITLES (adapters/text/priors.js, giver lang/en), no hand-made list.
// A BARE-TITLE BEING is one whose every admitted surface is a single token in that class.
// For each arm, the share of the 20 standing edges with the most co-arrivals that have at least
// one bare-title endpoint. Nothing is tuned; the count is the result.
//
// Usage: node f5c-bare-titles.mjs <book1> <book2> <book3>
import fs from "node:fs";
import { networkStanding } from "../../kernel/network-standing.js";
import { bindLinks } from "../../legacy-ported/packages/engine/emergence/binding.js";
import { HONORIFIC_TITLES, HONORIFIC_TITLES_META } from "../../adapters/text/priors.js";
import { loadBook, tokenize } from "./lib/books.mjs";

const CFG = { K: 80, W: 8, DRAWS: 199, ALPHA: 0.05, SEED: 20260812, TOP: 20, TITLE_GIVER: HONORIFIC_TITLES_META.giver };
const isBareTitle = (surfaces) => surfaces.length > 0 && surfaces.every((s) => { const t = tokenize(s); return t.length === 1 && HONORIFIC_TITLES.has(t[0]); });

const results = process.argv.slice(2).map((path) => {
  const book = loadBook(path);
  const surfacesOfCluster = new Map();
  for (const [s, c] of book.clusterOfSurface) surfacesOfCluster.set(c, [...(surfacesOfCluster.get(c) ?? []), s]);
  const arms = {
    surface: { beings: book.surfaceBeings.slice(0, CFG.K), surfacesOf: (id) => [id] },
    referent: { beings: book.referentBeings.slice(0, CFG.K), surfacesOf: (id) => surfacesOfCluster.get(id) ?? [] },
  };
  const row = { book: path.split("/").pop(), arms: {} };
  for (const [name, arm] of Object.entries(arms)) {
    const st = networkStanding(arm.beings, { bindLinks, window: CFG.W, draws: CFG.DRAWS, seed: CFG.SEED, alpha: CFG.ALPHA });
    const top = st.edges.slice(0, CFG.TOP);
    const flagged = top.filter((e) => isBareTitle(arm.surfacesOf(e.a)) || isBareTitle(arm.surfacesOf(e.b)));
    const beingsBare = arm.beings.filter((b) => isBareTitle(arm.surfacesOf(b.id))).map((b) => `${b.id.replace("ref:auto:", "")}:${b.arrivals.length}`);
    row.arms[name] = {
      topN: top.length, withBareTitleEndpoint: flagged.length, share: top.length ? flagged.length / top.length : NaN,
      bareTitleBeingsAmongTop80: beingsBare, examples: flagged.slice(0, 8).map((e) => `${e.a.replace("ref:auto:", "")} — ${e.b.replace("ref:auto:", "")} (${e.coArrivals})`),
      standingEdgesWithBareTitle: st.edges.filter((e) => isBareTitle(arm.surfacesOf(e.a)) || isBareTitle(arm.surfacesOf(e.b))).length, standingEdges: st.edges.length,
    };
  }
  return row;
});
for (const r of results) {
  console.log(`\n# ${r.book}`);
  for (const [name, a] of Object.entries(r.arms)) console.log(`  ${name} arm: ${a.withBareTitleEndpoint}/${a.topN} of the top edges have a bare-title endpoint (${(a.share * 100).toFixed(0)}%); over ALL standing edges ${a.standingEdgesWithBareTitle}/${a.standingEdges}; bare-title beings in the top 80: ${a.bareTitleBeingsAmongTop80.join(", ") || "none"}\n     e.g. ${a.examples.join(" | ")}`);
}
fs.mkdirSync(new URL("./results/", import.meta.url), { recursive: true });
fs.writeFileSync(new URL("./results/f5c-bare-titles.json", import.meta.url), JSON.stringify({ config: CFG, results }, null, 1));
