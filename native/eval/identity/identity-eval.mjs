// identity-eval.mjs — falsify kernel/identity-induction.js on a real book's
// relation graph (cached by extract-edges.mjs). Zero model calls.
//   node identity-eval.mjs <edges.json> [out.json]
// Controls, all with the answer known before the run:
//   planted split   half of label X renamed to a nonce -> must be SAME
//   planted decoy   half of label Y renamed to a nonce, judged against X -> must be DIFFERENT
//   shuffle         labels dealt at random across edges -> nothing may be SAME (II.23)
//   random pairs    every pair of frequent real labels: the merge rate is reported
//   real pairs      named near-synonyms and named non-synonyms, reported, not scored
import { readFileSync, writeFileSync } from "node:fs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const { makeIdentityInduction } = await import(`${NATIVE}/kernel/identity-induction.js`);
const { createSeededRng, shuffled } = await import(`${NATIVE}/kernel/rng.js`);
const P = await import(`${NATIVE}/adapters/text/priors.js`);
const [IN, OUT] = process.argv.slice(2);
const CFG = JSON.parse(process.env.IDCFG ?? "{}");
const OPTS = { draws: 200, alpha: 0.05, seed: 7, minOccurrences: 16, maxHop: 2, smooth: 0.5, resolution: 8, namesNode: (f) => (f.includes("2:") ? f.slice(f.indexOf("2:") + 2) : null), ...CFG.opts };
const WORDS_PER_END = CFG.wordsPerEnd ?? 3;
const HOP2_MAX_SHARE = CFG.hop2MaxShare ?? 0.002; // an end word joins hop 2 only if it is not a hub (declared)
console.log("frame", JSON.stringify({ OPTS, WORDS_PER_END, HOP2_MAX_SHARE }));

const { edges: rawEdges, book } = JSON.parse(readFileSync(IN, "utf8"));
const DROP = new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS, ...(P.POSSESSIVE_DETERMINERS ?? [])].map((w) => w.toLowerCase()));
const fold = (s) => String(s ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const words = (s) => (fold(s).match(/\p{L}+/gu) ?? []).filter((w) => !DROP.has(w)).slice(0, WORDS_PER_END);
const edges = rawEdges.map((e) => ({ label: fold(e.label), s: words(e.end1), o: words(e.end2) })).filter((e) => e.label);

function recordOf(es) {
  // hop-2 index: for an end word, which OTHER labels it keeps, by role
  const wordLabels = { s: new Map(), o: new Map() }; const wordCount = new Map();
  for (const e of es) for (const r of ["s", "o"]) for (const w of e[r]) {
    if (!wordLabels[r].has(w)) wordLabels[r].set(w, new Map());
    const m = wordLabels[r].get(w); m.set(e.label, (m.get(e.label) ?? 0) + 1);
    wordCount.set(w, (wordCount.get(w) ?? 0) + 1);
  }
  const hubCap = HOP2_MAX_SHARE * es.length;
  const rec = new Map();
  for (const e of es) {
    const occ = [];
    for (const r of ["s", "o"]) for (const w of e[r]) {
      occ.push({ f: `${r}:${w}`, hop: 1 });
      if ((wordCount.get(w) ?? 0) > hubCap) continue;
      for (const [l] of wordLabels[r].get(w)) occ.push({ f: `${r}2:${l}`, hop: 2 });
    }
    if (!rec.has(e.label)) rec.set(e.label, []);
    rec.get(e.label).push(occ);
  }
  return rec;
}

const rng = createSeededRng({ seed: OPTS.seed, purpose: "plant" });
const splitHalf = (es, label, twin) => es.map((e) => (e.label === label && rng() < 0.5 ? { ...e, label: twin } : e));
const counts = new Map(); for (const e of edges) counts.set(e.label, (counts.get(e.label) ?? 0) + 1);
const frequent = [...counts].filter(([, c]) => c >= 2 * OPTS.minOccurrences).sort((a, b) => b[1] - a[1]).map(([l]) => l);
const PLANT = (CFG.plant ?? frequent.slice(0, 30));
const results = { book, frame: { OPTS, WORDS_PER_END, HOP2_MAX_SHARE }, split: [], decoy: [], shuffle: [], random: [], real: [] };
const brief = (r) => `${r.verdict}${r.reason ? `(${r.reason})` : ""} hop${r.hop ?? "-"} w=${r.tests?.worlds.observed.toFixed(3)}/${r.tests?.worlds.floor.toFixed(3)} c=${r.tests?.consequence.observed.toFixed(3)}/${r.tests?.consequence.ceiling.toFixed(3)}`;

// planted split + planted decoy: one record per plant
for (let i = 0; i < PLANT.length; i += 1) {
  const X = PLANT[i], Y = PLANT[(i + 1) % PLANT.length];
  const es = splitHalf(splitHalf(edges, X, `${X}#twin`), Y, `${Y}#twin`);
  const id = makeIdentityInduction(recordOf(es), OPTS);
  const s = id.judge(X, `${X}#twin`), d = id.judge(X, `${Y}#twin`);
  results.split.push({ X, verdict: s.verdict, reason: s.reason, hop: s.hop });
  results.decoy.push({ X, Y, verdict: d.verdict, reason: d.reason, hop: d.hop });
  console.log(`split ${X.padEnd(12)} ${brief(s)}   decoy vs ${Y.padEnd(10)} ${brief(d)}`);
}
if (!CFG.skipControls) {
// shuffle control: labels redealt across edges, ends kept
{
  const labels = shuffled(edges.map((e) => e.label), createSeededRng({ seed: OPTS.seed, purpose: "shuffle" }));
  const es = edges.map((e, i) => ({ ...e, label: labels[i] }));
  const id = makeIdentityInduction(recordOf(es), OPTS);
  const top = frequent.slice(0, 12);
  for (let i = 0; i < top.length; i += 1) for (let j = i + 1; j < top.length; j += 1) {
    const r = id.judge(top[i], top[j]); results.shuffle.push({ a: top[i], b: top[j], verdict: r.verdict, reason: r.reason });
  }
}
}
const id = makeIdentityInduction(recordOf(edges), OPTS);
// random pairs among frequent real labels
if (!CFG.skipControls) {
  const top = frequent.slice(0, CFG.randomTop ?? 24);
  for (let i = 0; i < top.length; i += 1) for (let j = i + 1; j < top.length; j += 1) {
    const r = id.judge(top[i], top[j]); results.random.push({ a: top[i], b: top[j], verdict: r.verdict, reason: r.reason });
  }
}
const REAL = CFG.real ?? [["looked", "glanced", "near"], ["said", "replied", "near"], ["said", "asked", "near"], ["saw", "noticed", "near"], ["rode", "galloped", "near"], ["said", "cried", "near"],
  ["saw", "wrote", "far"], ["looked", "took", "far"], ["went", "came", "far"], ["sat", "rode", "far"], ["felt", "gave", "far"], ["was", "had", "far"]];
for (const [a, b, kind] of REAL) { const r = id.judge(a, b); results.real.push({ a, b, kind, verdict: r.verdict, reason: r.reason, hop: r.hop, tests: r.tests && { worlds: r.tests.worlds, consequence: r.tests.consequence } }); console.log(`real ${kind} ${a}/${b}: ${brief(r)}`); }

const tally = (xs) => xs.reduce((m, r) => ((m[r.verdict] = (m[r.verdict] ?? 0) + 1), m), {});
results.summary = { split: tally(results.split), decoy: tally(results.decoy), shuffle: tally(results.shuffle), random: tally(results.random) };
console.log("SUMMARY", JSON.stringify(results.summary));
console.log("random SAME:", results.random.filter((r) => r.verdict === "same").map((r) => `${r.a}/${r.b}`).join(" "));
if (OUT) writeFileSync(OUT, JSON.stringify(results, null, 2));
