// entity-eval.mjs — the SAME organ, one level down the holon: nodes are the
// NAMED ENDS of a book's relations (people, places), not relation labels.
// A name's world: which relations it takes part in and in which role (hop 1),
// the words at the other end (hop 1), and the other names it meets (hop 2 —
// naming a node, masked by the kernel). Zero model calls.
//   node entity-eval.mjs <edges.json> [out.json]
// Expected answers are DECLARED HERE, before the run, from the novel:
//   same       Rostov/Nicholas (Nicholas Rostov — though "Rostov" can be the
//              count or Petya: declared impure), Princess Mary/Countess Mary
//              (one woman, before/after her marriage), Prince Andrew/Bolkonski
//              ("Bolkonski" can be the old prince: declared impure)
//   different  distinct people and places, listed in PAIRS
import { readFileSync, writeFileSync } from "node:fs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const { makeIdentityInduction } = await import(`${NATIVE}/kernel/identity-induction.js`);
const { createSeededRng, shuffled } = await import(`${NATIVE}/kernel/rng.js`);
const { fold } = await import("./lib-record.mjs");
const [IN, OUT] = process.argv.slice(2);
const OPTS = { draws: 200, alpha: 0.05, seed: 7, minOccurrences: 10, maxHop: 2, smooth: 0.5, resolution: 5, minFeatureCount: 2, namesNode: (f) => (f.startsWith("n2:") ? f.slice(3) : null), ...JSON.parse(process.env.IDOPTS ?? "{}") };
console.log("frame", JSON.stringify(OPTS));
const pos = JSON.parse(readFileSync(`${NATIVE}/eval/the-fold/fixtures/pos-prior-eng.json`, "utf8"));
const CLOSED = new Set(["PRON", "DET", "ADV", "SCONJ", "CCONJ", "ADP", "AUX", "PART", "INTJ"]);
const closedWord = (w) => { const t = pos.forms?.[w.toLowerCase()]; if (!t) return false; const [top] = Object.entries(t).sort((a, b) => b[1] - a[1]); return CLOSED.has(top[0]); };
const nameOf = (s) => { const x = fold(s).trim(); const orig = String(s ?? "").normalize("NFD").replace(/\p{M}/gu, "").trim(); if (!/^[A-Z][\p{L}-]+( [A-Z][\p{L}-]+){0,2}$/u.test(orig)) return null; if (orig.split(" ").every(closedWord)) return null; return x; };
const { edges: raw, book } = JSON.parse(readFileSync(IN, "utf8"));
const words = (s) => (fold(s).match(/\p{L}+/gu) ?? []).slice(0, 3);
const edges = raw.map((e) => ({ label: fold(e.label), n1: nameOf(e.end1), n2: nameOf(e.end2), w1: words(e.end1), w2: words(e.end2) }));
function recordOf(es) {
  const rec = new Map();
  const add = (n, occ) => { if (!rec.has(n)) rec.set(n, []); rec.get(n).push(occ); };
  for (const e of es) {
    if (e.n1) add(e.n1, [{ f: `as1:${e.label}`, hop: 1 }, ...e.w2.map((w) => ({ f: `x:${w}`, hop: 1 })), ...(e.n2 ? [{ f: `n2:${e.n2}`, hop: 2 }] : [])]);
    if (e.n2) add(e.n2, [{ f: `as2:${e.label}`, hop: 1 }, ...e.w1.map((w) => ({ f: `x:${w}`, hop: 1 })), ...(e.n1 ? [{ f: `n2:${e.n1}`, hop: 2 }] : [])]);
  }
  return rec;
}
const rec = recordOf(edges);
const names = [...rec].filter(([, o]) => o.length >= 2 * OPTS.minOccurrences).sort((a, b) => b[1].length - a[1].length).map(([n]) => n);
console.log(`${book}: ${rec.size} named ends, ${names.length} with >= ${2 * OPTS.minOccurrences} occurrences:`, names.slice(0, 30).join(", "));
const brief = (r) => `${r.verdict}${r.reason ? `(${r.reason})` : ""} hop${r.hop ?? "-"} w=${r.tests?.worlds.observed.toFixed(3)}/${r.tests?.worlds.floor.toFixed(3)} c=${r.tests?.consequence.observed.toFixed(3)}/${r.tests?.consequence.ceiling.toFixed(3)}`;
const out = { book, OPTS: { ...OPTS, namesNode: "n2:" }, split: [], shuffle: [], declared: [] };
// planted twins: half of a name's occurrences renamed — must be SAME
const rng = createSeededRng({ seed: OPTS.seed, purpose: "plant-entity" });
for (const X of names.slice(0, 20)) {
  const r2 = new Map(rec); const keep = [], moved = [];
  for (const o of rec.get(X)) (rng() < 0.5 ? moved : keep).push(o);
  r2.set(X, keep); r2.set(`${X}#twin`, moved);
  const r = makeIdentityInduction(r2, OPTS).judge(X, `${X}#twin`);
  out.split.push({ X, verdict: r.verdict, reason: r.reason }); console.log(`twin ${X.padEnd(16)} ${brief(r)}`);
}
// shuffle: names dealt at random across edge ends — nothing may be SAME
{
  const pool = shuffled(edges.flatMap((e) => [e.n1, e.n2]), createSeededRng({ seed: OPTS.seed, purpose: "shuffle-entity" }));
  let i = 0; const es = edges.map((e) => ({ ...e, n1: pool[i++], n2: pool[i++] }));
  const id = makeIdentityInduction(recordOf(es), OPTS); const top = names.slice(0, 12);
  for (let a = 0; a < top.length; a += 1) for (let b = a + 1; b < top.length; b += 1) out.shuffle.push({ a: top[a], b: top[b], verdict: id.judge(top[a], top[b]).verdict });
}
const id = makeIdentityInduction(rec, OPTS);
const PAIRS = [["rostov", "nicholas", "same"], ["princess mary", "countess mary", "same"], ["prince andrew", "bolkonski", "same"],
  ["pierre", "natasha", "different"], ["kutuzov", "napoleon", "different"], ["sonya", "natasha", "different"], ["denisov", "dolokhov", "different"],
  ["boris", "anatole", "different"], ["prince andrew", "pierre", "different"], ["princess mary", "natasha", "different"], ["moscow", "russia", "different"], ["pierre", "moscow", "different"]];
for (const [a, b, expect] of PAIRS) { const r = id.judge(a, b); out.declared.push({ a, b, expect, verdict: r.verdict, reason: r.reason }); console.log(`declared ${expect.padEnd(9)} ${a}/${b}: ${brief(r)}`); }
const tally = (xs) => xs.reduce((m, r) => ((m[r.verdict] = (m[r.verdict] ?? 0) + 1), m), {});
out.summary = { split: tally(out.split), shuffle: tally(out.shuffle) };
console.log("SUMMARY", JSON.stringify(out.summary));
if (OUT) writeFileSync(OUT, JSON.stringify(out, null, 1));
