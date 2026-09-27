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
const oracleSingle = (p) => (g.constraints[p]?.types ?? []).some((t) => SINGLE.has(t));
const EXPOSURE_FLOOR = 2, SEED = 11;
const sameValue = makeSameValue({ calendarAware: true });
const witnessed = (a) => (a.value?.refs ?? 0) > 0;

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
  recs.set(`${q}/1`, r1.map((a, i) => ({ ...a, id: `${q}/1#${i}` }))); recs.set(`${q}/2`, r2.map((a, i) => ({ ...a, id: `${q}/2#${i}` })));
}
const assertionsOf = (id) => recs.get(id) ?? [];
const kindOracle = (q) => (g.entities[q].claims.P31 ?? []).map((v) => v.item);

function induce(kindOptions, pool = [...recs.keys()]) {
  return induceKindsAndFunctions(pool, { assertionsOf, sameValue, witnessed, exposureFloor: EXPOSURE_FLOOR, kindOptions });
}
const arms = { perKind: induce({ population: "records" }) };
// CONTROL: no kind induction — every record one kind, so a relation one-valued
// for people but many-valued for places is judged across both
{
  const one = new Map(); for (const id of recs.keys()) one.set(id, new Set(["kind:global"]));
  const rels = new Map();
  for (const id of recs.keys()) { const by = new Map(); for (const a of assertionsOf(id)) { if (!by.has(a.rel)) by.set(a.rel, []); by.get(a.rel).push(a); }
    for (const [rel, vs] of by) { const r = rels.get(rel) ?? { members: 0, exposed: 0, agreed: 0, refuted: 0 }; r.members += 1;
      if (vs.length > 1) { r.exposed += 1; let bad = false, ok = true; for (let i = 0; i < vs.length; i += 1) for (let j = i + 1; j < vs.length; j += 1) { const s = sameValue(vs[i].value, vs[j].value); if (s === false) { ok = false; if (witnessed(vs[i]) && witnessed(vs[j])) bad = true; } } if (bad) r.refuted += 1; else if (ok) r.agreed += 1; }
      rels.set(rel, r); } }
  const entries = new Map(); for (const [rel, r] of rels) if (!r.refuted && r.agreed >= EXPOSURE_FLOOR) entries.set(rel, { standing: "candidate", evidence: r });
  arms.globalKind = { kinds: [{ kindKey: "kind:global", members: [...recs.keys()] }], kindsOf: (id) => one.get(id), register: new Map([["kind:global", entries]]), relations: new Map([["kind:global", Object.fromEntries([...rels].map(([k, r]) => [k, { standing: r.refuted ? "refuted" : r.agreed >= EXPOSURE_FLOOR ? "candidate" : "unexposed", ...r }]))]]), diagnostics: {} };
}
const out = { fixture: FIX.split("/").pop(), entities: Object.keys(g.entities).length, records: recs.size, exposureFloor: EXPOSURE_FLOOR, arms: {} };
for (const [name, ind] of Object.entries(arms)) {
  // kinds against the held-out oracle
  const kinds = ind.kinds.map((k) => {
    const tally = new Map(); for (const m of k.members) for (const c of kindOracle(m.split("/")[0])) tally.set(c, (tally.get(c) ?? 0) + 1);
    const [top, n] = [...tally].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
    const label = top ? (g.entities[top]?.label.en ?? top) : null;
    return { kind: k.kindKey, size: k.members.length, topOracleClass: label ?? top, purity: +(n / k.members.length).toFixed(2), signatures: (k.signatures ?? []).slice(0, 6) };
  });
  // one-valued relations against the held-out constraint oracle
  const cand = new Map(), refd = new Map();
  for (const [kk, table] of ind.relations) for (const [rel, r] of Object.entries(table)) { if (r.standing === "candidate") cand.set(rel, (cand.get(rel) ?? 0) + 1); if (r.standing === "refuted") refd.set(rel, (refd.get(rel) ?? 0) + 1); }
  const withOracle = (m) => [...m.keys()].filter((p) => g.constraints[p]);
  const cp = withOracle(cand), rp = withOracle(refd);
  // exclusion on the induced register
  const judge = makeIdentityExclusion({ kindsOf: ind.kindsOf, assertionsOf, functional: ind.register, sameValue, witnessed }).judge;
  const qs = Object.keys(g.entities);
  const tally = (pairs) => { const t = { excluded: 0, contested: 0, not_excluded: 0, gap: 0 }; for (const [a, b] of pairs) t[judge(a, b).verdict] += 1; return t; };
  const sameKind = (a, b) => [...ind.kindsOf(a)].some((k) => ind.kindsOf(b).has(k));
  const neg = []; for (let i = 0; i < qs.length; i += 1) for (let j = i + 1; j < qs.length; j += 1) if (sameKind(`${qs[i]}/1`, `${qs[j]}/1`)) neg.push([`${qs[i]}/1`, `${qs[j]}/1`]);
  out.arms[name] = {
    kinds, kindsFound: kinds.length, recordsWithKind: [...recs.keys()].filter((id) => ind.kindsOf(id).size).length,
    functionalCandidates: { relations: cp.length, oracleSingleValued: cp.filter(oracleSingle).length, precision: cp.length ? +(cp.filter(oracleSingle).length / cp.length).toFixed(2) : null, list: cp.map((p) => `${p} ${g.constraints[p].label}${oracleSingle(p) ? " ✓" : " ✗"}`) },
    refuted: { relations: rp.length, oracleSingleValued: rp.filter(oracleSingle).length, list: rp.filter(oracleSingle).map((p) => `${p} ${g.constraints[p].label}`) },
    samePerson: tally(qs.map((q) => [`${q}/1`, `${q}/2`])),
    differentSameKind: { pairs: neg.length, ...tally(neg) },
  };
}
console.log(JSON.stringify(out, null, 1));
if (OUT) writeFileSync(OUT, JSON.stringify(out, null, 1));
