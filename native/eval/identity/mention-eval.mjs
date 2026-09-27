// mention-eval.mjs — identity induction over people and places, each name's
// universe built from every sentence it is mentioned in (mention-record.mjs).
// Expected answers DECLARED before the run, from the novel:
//   same       Pierre/Bezukhov, Prince Andrew/Andrew, Napoleon/Bonaparte,
//              Princess Mary/Countess Mary (one woman, before/after marriage),
//              Nicholas/Rostov (impure: "Rostov" is also the count, Petya),
//              Prince Andrew/Bolkonski (impure: also the old prince)
//   different  distinct people and places in PAIRS
//   node mention-eval.mjs <book.txt> [out.json]
import { writeFileSync } from "node:fs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const { makeIdentityInduction } = await import(`${NATIVE}/kernel/identity-induction.js`);
const { createSeededRng, shuffled } = await import(`${NATIVE}/kernel/rng.js`);
const { mentionRecord } = await import("./mention-record.mjs");
const [BOOK, OUT, SPEC] = process.argv.slice(2);
const spec = SPEC ? JSON.parse((await import("node:fs")).readFileSync(SPEC, "utf8")) : null;
const OPTS = { draws: 200, alpha: 0.05, seed: 7, minOccurrences: 20, maxHop: 2, smooth: 0.5, resolution: 10, minFeatureCount: 2, namesNode: (f) => (f.startsWith("n2:") ? f.slice(3) : null), trajectory: { windows: 40, basis: 24, draws: 60 }, ...JSON.parse(process.env.IDOPTS ?? "{}") };
const NAMES = ["Pierre", "Bezukhov", "Natasha", "Prince Andrew", "Andrew", "Bolkonski", "Princess Mary", "Countess Mary", "Nicholas", "Rostov", "Napoleon", "Bonaparte", "Kutuzov", "Sonya", "Denisov", "Dolokhov", "Boris", "Anatole", "Petya", "Prince Vasili", "Helene", "Moscow", "Russia", "Petersburg", "Bagration", "Alpatych", "Tikhon", "Berg", "Julie", "Speranski"];
const PAIRS = [["Pierre", "Bezukhov", "same"], ["Prince Andrew", "Andrew", "same"], ["Napoleon", "Bonaparte", "same"], ["Princess Mary", "Countess Mary", "same"], ["Nicholas", "Rostov", "same"], ["Prince Andrew", "Bolkonski", "same"],
  ["Pierre", "Natasha", "different"], ["Kutuzov", "Napoleon", "different"], ["Sonya", "Natasha", "different"], ["Denisov", "Dolokhov", "different"], ["Boris", "Anatole", "different"], ["Prince Andrew", "Pierre", "different"],
  ["Princess Mary", "Natasha", "different"], ["Moscow", "Russia", "different"], ["Moscow", "Petersburg", "different"], ["Pierre", "Moscow", "different"], ["Bagration", "Kutuzov", "different"], ["Helene", "Natasha", "different"]];
if (spec) { NAMES.length = 0; NAMES.push(...spec.names); PAIRS.length = 0; PAIRS.push(...spec.pairs); }
console.log("frame", JSON.stringify(OPTS), spec ? `spec ${SPEC}` : "");
const rec = mentionRecord(BOOK, NAMES, spec?.record ?? {});
console.log("mentions:", NAMES.map((n) => `${n}:${rec.get(n).length}`).join(" "));
const f3 = (x) => (Number.isFinite(x) ? x.toFixed(3) : String(x));
const brief = (r) => { const d = r.tests?.dynamics; return `${r.verdict}${r.reason ? `(${r.reason})` : ""} c=${f3(r.tests?.consequence.observed)}/${f3(r.tests?.consequence.ceiling)} dmd=${d ? `${d.verdict}${d.reason ? `(${d.reason})` : ""} r=${d.ranks?.a}/${d.ranks?.b} err=${f3(d.error?.ab)}/${f3(d.floor?.ab)},${f3(d.error?.ba)}/${f3(d.floor?.ba)}` : "-"}`; };
const out = { book: BOOK.split("/").pop(), OPTS: { ...OPTS, namesNode: "n2:" }, split: [], shuffle: [], declared: [] };
const rng = createSeededRng({ seed: OPTS.seed, purpose: "plant-mention" });
for (const X of NAMES.filter((n) => rec.get(n).length >= 2 * OPTS.minOccurrences).slice(0, 16)) {
  const r2 = new Map(rec); const keep = [], moved = [];
  for (const o of rec.get(X)) (rng() < 0.5 ? moved : keep).push(o);
  r2.set(X, keep); r2.set(`${X}#twin`, moved);
  const r = makeIdentityInduction(r2, OPTS).judge(X, `${X}#twin`);
  out.split.push({ X, verdict: r.verdict, reason: r.reason, dynamics: r.tests?.dynamics?.verdict ?? null }); console.log(`twin ${X.padEnd(14)} ${brief(r)}`);
}
{ // shuffle: which name a mention belongs to is redealt — nothing may be SAME
  const owners = [], occs = []; for (const [n, os] of rec) for (const o of os) { owners.push(n); occs.push(o); }
  const dealt = shuffled(owners, createSeededRng({ seed: OPTS.seed, purpose: "shuffle-mention" }));
  const r2 = new Map(NAMES.map((n) => [n, []])); dealt.forEach((n, i) => r2.get(n).push(occs[i]));
  const id = makeIdentityInduction(r2, OPTS); const top = NAMES.filter((n) => r2.get(n).length >= OPTS.minOccurrences).slice(0, 12);
  for (let a = 0; a < top.length; a += 1) for (let b = a + 1; b < top.length; b += 1) out.shuffle.push({ a: top[a], b: top[b], verdict: id.judge(top[a], top[b]).verdict });
}
const id = makeIdentityInduction(rec, OPTS);
for (const [a, b, expect] of PAIRS) { const r = id.judge(a, b); out.declared.push({ a, b, expect, verdict: r.verdict, reason: r.reason, dynamics: r.tests?.dynamics?.verdict ?? null }); console.log(`declared ${expect.padEnd(9)} ${a}/${b}: ${brief(r)}`); }
const tally = (xs, k = "verdict") => xs.reduce((m, r) => ((m[r[k]] = (m[r[k]] ?? 0) + 1), m), {});
out.summary = { split: tally(out.split), shuffle: tally(out.shuffle), declaredSame: tally(out.declared.filter((r) => r.expect === "same")), declaredDifferent: tally(out.declared.filter((r) => r.expect === "different")), dynamicsAlone: { split: tally(out.split, "dynamics"), declaredSame: tally(out.declared.filter((r) => r.expect === "same"), "dynamics"), declaredDifferent: tally(out.declared.filter((r) => r.expect === "different"), "dynamics") } };
console.log("SUMMARY", JSON.stringify(out.summary));
if (OUT) writeFileSync(OUT, JSON.stringify(out, null, 1));
