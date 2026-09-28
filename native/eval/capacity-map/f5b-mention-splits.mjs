// eval/capacity-map/f5b-mention-splits.mjs — EXPLORATORY and POST-HOC (labelled as such; it
// changes no verdict in results/f5-units.json).
//
// Why it exists. F5 as pre-registered called the engine's own clusters "identity" and counted a
// self-edge only when two surfaces shared a cluster. The top standing edges it printed contain
// pairs like "Mr — Bennet" and "Mrs — Bennet" (Pride and Prejudice) and "Harker — Mrs"
// (Dracula): a title token admitted as a being, standing with the name it stands beside. Those
// are not same-cluster pairs, so F5 was blind to them — and they are exactly the failure the
// a -> g crossing is about (a unit that is not a being, given standing).
//
// The detector is mechanical and hand-labels nothing. For an edge (A, B): among the sentences in
// which both occur, the share in which a match of A and a match of B are TOKEN-ADJACENT (one ends
// where the other begins) — i.e. the two "beings" are pieces of one mention. Two real
// characters co-arrive by chance or by company, and are adjacent rarely; a title and its name are
// adjacent nearly always. The bar (adjShare >= 0.5, "most of what they share is being neighbours
// in one mention") is declared here before the run, by hand, and is only used to count.
// The same detector is run on the SURFACE arm and the REFERENT arm, on the same top edges.
//
// Usage: node f5b-mention-splits.mjs <book1> <book2> <book3>
import fs from "node:fs";
import { networkStanding } from "../../kernel/network-standing.js";
import { bindLinks } from "../../legacy-ported/packages/engine/emergence/binding.js";
import { loadBook } from "./lib/books.mjs";

const CFG = { K: 80, W: 8, DRAWS: 199, ALPHA: 0.05, SEED: 20260812, TOP: 20, BAR: 0.5 };

function analyse(path) {
  const book = loadBook(path, { spans: true });
  const cl = book.clusterOfSurface;
  const arms = {
    surface: { beings: book.surfaceBeings.slice(0, CFG.K), of: (m) => m.surface },
    referent: { beings: book.referentBeings.slice(0, CFG.K), of: (m) => cl.get(m.surface) },
  };
  const out = { book: path.split("/").pop(), arms: {} };
  for (const [name, arm] of Object.entries(arms)) {
    const st = networkStanding(arm.beings, { bindLinks, window: CFG.W, draws: CFG.DRAWS, seed: CFG.SEED, alpha: CFG.ALPHA });
    const top = st.edges.slice(0, CFG.TOP);
    const rows = top.map((e) => {
      let both = 0, adj = 0;
      for (const ms of book.matchSpans) {
        const A = ms.filter((m) => arm.of(m) === e.a);
        const B = ms.filter((m) => arm.of(m) === e.b);
        if (!A.length || !B.length) continue;
        both++;
        if (A.some((a) => B.some((b) => b.start === a.end || a.start === b.end))) adj++;
      }
      return { a: e.a.replace("ref:auto:", ""), b: e.b.replace("ref:auto:", ""), coArrivals: e.coArrivals, sentencesWithBoth: both, adjacent: adj, adjShare: both ? adj / both : NaN };
    });
    out.arms[name] = { topN: rows.length, splitLike: rows.filter((r) => r.adjShare >= CFG.BAR).length, rows };
  }
  return out;
}

const paths = process.argv.slice(2);
const results = paths.map(analyse);
for (const r of results) {
  console.log(`\n# ${r.book}`);
  for (const [name, arm] of Object.entries(r.arms)) {
    console.log(`  ${name} arm: ${arm.splitLike} of the top ${arm.topN} standing edges have adjShare >= ${CFG.BAR}`);
    for (const row of arm.rows) console.log(`    ${row.a.slice(0, 22).padEnd(22)} — ${row.b.slice(0, 22).padEnd(22)} coArr=${String(row.coArrivals).padStart(4)} both=${String(row.sentencesWithBoth).padStart(4)} adj=${String(row.adjacent).padStart(4)} share=${Number.isFinite(row.adjShare) ? row.adjShare.toFixed(2) : "n/a"}${row.adjShare >= CFG.BAR ? "  <- one mention split in two" : ""}`);
  }
}
fs.mkdirSync(new URL("./results/", import.meta.url), { recursive: true });
fs.writeFileSync(new URL("./results/f5b-mention-splits.json", import.meta.url), JSON.stringify({ config: CFG, results }, null, 1));
