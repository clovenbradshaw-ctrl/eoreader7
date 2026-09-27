// mixed-eval.mjs — kind induction on the fly for ARBITRARY referent types, and
// identity exclusion on the induced register (no register typed by anyone).
// Material: fixtures/wikidata-mixed-graph.json (fetch-wikidata-graph.mjs).
// HELD OUT: P31/P279 (kind oracle) never reach the inducer; P2302 constraints
// (single-value oracle) never reach the register. Zero model calls.
// Every referent is split, seeded, into two records (one calendar per record
// where a date is held in both); kinds and one-valuedness are induced from the
// RECORDS, so nothing the judge sees is computed from the unsplit entity.
// Declared: exposureFloor = 2 (the structural minimum binding.js and
// hl-acquire.js already use); kind options = the inducer's own derivations.
//   node mixed-eval.mjs [fixture] [out.json]
import { readFileSync, writeFileSync } from "node:fs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const { induceKindsAndFunctions } = await import(`${NATIVE}/kernel/kind-functional-induction.js`);
const { makeIdentityExclusion } = await import(`${NATIVE}/kernel/identity-exclusion.js`);
const { createSeededRng } = await import(`${NATIVE}/kernel/rng.js`);
const { makeSameValue, JULIAN } = await import("./lib-values.mjs");
const [FIX = new URL("./fixtures/wikidata-mixed-graph.json", import.meta.url).pathname, OUT] = process.argv.slice(2);
const g = JSON.parse(readFileSync(FIX, "utf8"));
const HELD_OUT = new Set(["P31", "P279"]);
const SINGLE = new Set(["Q19474404", "Q52060874"]);
// a constraint fetch that failed is a gap in the oracle, never 'many-valued' (heimdall)
const oracleSingle = (p) => (g.constraints[p]?.types ?? []).some((t) => SINGLE.has(t));
const oracleKnows = (p) => Array.isArray(g.constraints[p]?.types);
const EXPOSURE_FLOOR = 2, SEED = 11;
const sameValue = makeSameValue({ calendarAware: true });
const witnessed = (a) => (a.value?.refs ?? 0) > 0;
// when a value holds, as decimal years from Wikidata's start / end / point-in-time qualifiers
const year = (t) => { const m = /^([+-]\d+)-(\d\d)-(\d\d)/.exec(t ?? ""); return m ? Number(m[1]) + (Number(m[2] || 1) - 1) / 12 + (Number(m[3] || 1) - 1) / 365 : null; };
const intervalOf = (v) => { const w = v.when; if (!w) return undefined; const at = year(w.at); if (at != null) return { lo: at, hi: at }; const lo = year(w.from), hi = year(w.to); return lo == null && hi == null ? undefined : { lo: lo ?? -Infinity, hi: hi ?? Infinity }; };

// records
const rng = createSeededRng({ seed: SEED, purpose: "split-records" });
const recs = new Map();
for (const [q, e] of Object.entries(g.entities)) {
  const r1 = [], r2 = [];
  for (const [rel, vs] of Object.entries(e.claims)) {
    if (HELD_OUT.has(rel)) continue;
    const cals = new Set(vs.filter((v) => v.time && v.precision >= 11).map((v) => v.calendar));
    if (cals.size > 1) { for (const v of vs) (v.calendar === JULIAN ? r1 : r2).push({ rel, value: v }); continue; }
    for (const v of vs) { const x = rng(); if (x < 1 / 3) r1.push({ rel, value: v }); else if (x < 2 / 3) r2.push({ rel, value: v }); else { r1.push({ rel, value: v }); r2.push({ rel, value: v }); } }
  }
  const withTime = (a, i, r) => { const iv = intervalOf(a.value); return { ...a, id: `${q}/${r}#${i}`, ...(iv ? { interval: iv } : {}) }; };
  recs.set(`${q}/1`, r1.map((a, i) => withTime(a, i, 1))); recs.set(`${q}/2`, r2.map((a, i) => withTime(a, i, 2)));
}
const assertionsOf = (id) => recs.get(id) ?? [];
const kindOracle = (q) => (g.entities[q].claims.P31 ?? []).map((v) => v.item);

function induce(kindOptions, pool = [...recs.keys()]) {
  return induceKindsAndFunctions(pool, { assertionsOf, sameValue, witnessed, exposureFloor: EXPOSURE_FLOOR, kindOptions });
}
const arms = { perKind: induce({ population: "records" }) };
// CONTROL: no kind induction — every record one declared kind, so a relation
// one-valued for people but many-valued for places is judged across both
arms.globalKind = induceKindsAndFunctions([...recs.keys()], { assertionsOf, sameValue, witnessed, exposureFloor: EXPOSURE_FLOOR, declaredKinds: [{ kindKey: "kind:global", memberRefs: [...recs.keys()] }] });
const out = { fixture: FIX.split("/").pop(), entities: Object.keys(g.entities).length, records: recs.size, exposureFloor: EXPOSURE_FLOOR, arms: {} };
for (const [name, ind] of Object.entries(arms)) {
  // kinds against the held-out oracle
  const kinds = ind.kinds.map((k) => {
    const tally = new Map(); for (const m of k.members) for (const c of kindOracle(m.split("/")[0])) tally.set(c, (tally.get(c) ?? 0) + 1);
    const [top, n] = [...tally].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
    const label = top ? (g.entities[top]?.label.en ?? top) : null;
    return { kind: k.kindKey, size: k.members.length, topOracleClass: label ?? top, purity: +(n / k.members.length).toFixed(2), signatures: (k.signatures ?? []).slice(0, 6) };
  });
  // standings against the held-out constraint oracle
  const byStanding = {};
  for (const [, table] of ind.relations) for (const [rel, r] of Object.entries(table)) { (byStanding[r.standing] ??= new Set()).add(rel); }
  const standings = Object.fromEntries(Object.entries(byStanding).map(([st, set]) => { const ps = [...set].filter((p) => oracleKnows(p)); return [st, { relations: ps.length, oracleSingleValued: ps.filter(oracleSingle).length, sample: ps.slice(0, 14).map((p) => `${p} ${g.constraints[p].label}${oracleSingle(p) ? " ✓" : ""}`) }]; }));
  // exclusion on the induced register
  const judge = makeIdentityExclusion({ kindsOf: ind.kindsOf, assertionsOf, functional: ind.register, sameValue, witnessed }).judge;
  const qs = Object.keys(g.entities);
  const tally = (pairs) => { const t = {}; for (const [a, b] of pairs) { const r = judge(a, b); const k = r.reason ? `${r.verdict}:${r.reason}` : r.verdict; t[k] = (t[k] ?? 0) + 1; } return t; };
  const sameKind = (a, b) => [...ind.kindsOf(a)].some((k) => ind.kindsOf(b).has(k));
  const neg = []; for (let i = 0; i < qs.length; i += 1) for (let j = i + 1; j < qs.length; j += 1) if (sameKind(`${qs[i]}/1`, `${qs[j]}/1`)) neg.push([`${qs[i]}/1`, `${qs[j]}/1`]);
  out.arms[name] = {
    kinds, kindsFound: kinds.length, recordsWithKind: [...recs.keys()].filter((id) => ind.kindsOf(id).size).length,
    standings,
    samePerson: tally(qs.map((q) => [`${q}/1`, `${q}/2`])),
    differentSameKind: { pairs: neg.length, ...tally(neg) },
  };
}
console.log(JSON.stringify(out, null, 1));
if (OUT) writeFileSync(OUT, JSON.stringify(out, null, 1));
