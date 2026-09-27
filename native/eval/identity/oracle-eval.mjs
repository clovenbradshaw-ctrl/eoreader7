// oracle-eval.mjs — score identity induction against an INDEPENDENT oracle
// (WordNet 3.0 verb synsets, built by wordnet-oracle.py, never tuned here),
// beside the dumb baseline: plain hop-1 universe cosine, cut at the SAME
// number of merges the organ made. Zero model calls.
//   node oracle-eval.mjs <edges.json> <oracle.json> [out.json]
import { readFileSync, writeFileSync } from "node:fs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const { makeIdentityInduction, profileOf, cosine } = await import(`${NATIVE}/kernel/identity-induction.js`);
const { loadEdges, recordOf, namesNode } = await import("./lib-record.mjs");
const [IN, ORACLE, OUT] = process.argv.slice(2);
const OPTS = { draws: 200, alpha: 0.05, seed: 7, minOccurrences: 16, maxHop: 2, smooth: 0.5, resolution: 8, minFeatureCount: 2, namesNode, ...JSON.parse(process.env.IDOPTS ?? "{}") };
const { edges, book } = loadEdges(IN, { wordsPerEnd: 3 });
const oracle = JSON.parse(readFileSync(ORACLE, "utf8"));
const rec = recordOf(edges, { hop2MaxShare: 0.002 });
const id = makeIdentityInduction(rec, OPTS);
const POS = new Set(["same-lemma", "synonym"]);
const rows = [];
for (const [key, truth] of Object.entries(oracle.pairs)) {
  if (truth === "unknown") continue;
  const [a, b] = key.split("|");
  const r = id.judge(a, b);
  const base = cosine(profileOf(rec.get(a), { hop: 1 }), profileOf(rec.get(b), { hop: 1 }));
  rows.push({ a, b, truth, verdict: r.verdict, reason: r.reason, base });
}
const merged = rows.filter((r) => r.verdict === "same");
const k = merged.length;
const baseTop = [...rows].sort((x, y) => y.base - x.base).slice(0, k);
const prec = (xs, set = POS) => (xs.length ? xs.filter((r) => set.has(r.truth)).length / xs.length : NaN);
const positives = rows.filter((r) => POS.has(r.truth)).length;
const summary = {
  book, oracle: oracle.giver, judged: rows.length, positives, baseRate: positives / rows.length,
  organ: { merged: k, precision: prec(merged), precisionInclHypernym: prec(merged, new Set([...POS, "hypernym"])), recall: merged.filter((r) => POS.has(r.truth)).length / positives, gaps: rows.filter((r) => r.verdict === "gap").length },
  baselineAtSameK: { merged: k, precision: prec(baseTop), precisionInclHypernym: prec(baseTop, new Set([...POS, "hypernym"])), recall: baseTop.filter((r) => POS.has(r.truth)).length / positives },
  byTruth: Object.fromEntries(["same-lemma", "synonym", "hypernym", "different"].map((t) => { const xs = rows.filter((r) => r.truth === t); return [t, { n: xs.length, same: xs.filter((r) => r.verdict === "same").length, gap: xs.filter((r) => r.verdict === "gap").length }]; })),
};
console.log(JSON.stringify(summary, null, 1));
console.log("organ merges:", merged.map((r) => `${r.a}/${r.b}[${r.truth}]`).join(" "));
if (OUT) writeFileSync(OUT, JSON.stringify({ summary, opts: { ...OPTS, namesNode: "lib-record.namesNode" }, rows }, null, 1));
