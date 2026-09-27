// exclusion-eval.mjs — kernel/identity-exclusion.js on a real family network
// (fixtures/wikidata-tolstoy-family.json, crawled by fetch-wikidata-family.mjs).
// Zero model calls. Ground truth is the QID and never reaches the judge.
//
// RECORDS. Each person's claims are split, seeded, into two overlapping
// records — two documents about one person. Where a birth or death date is
// held in BOTH Julian and Gregorian calendars, one goes to each record, so the
// calendar hazard (one Russian in two calendars) is guaranteed to arise.
// The judge sees records, never QIDs.
//
// DECLARED BEFORE THE RUN:
//   same person, two records           -> never excluded
//   different people                   -> excluded where a functional value conflicts
//   CONTROL all-functional             -> must FALSELY exclude same-person pairs
//                                          (multi-valued relations split across records)
//   CONTROL calendar-blind             -> must FALSELY exclude dual-calendar people
//   CONTROL planted conflict           -> a same-person pair given another person's
//                                          birth date must be excluded
//   BASELINE name identity             -> merges namesakes; reported, not scored as a method
//   node exclusion-eval.mjs [fixture] [out.json]
import { readFileSync, writeFileSync } from "node:fs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const { makeIdentityExclusion } = await import(`${NATIVE}/kernel/identity-exclusion.js`);
const { createSeededRng } = await import(`${NATIVE}/kernel/rng.js`);
const { BOUND, CONTRADICTED, UNBOUND, BEYOND_REACH } = await import(`${NATIVE}/interpretation/hl.js`);

const [FIX = new URL("./fixtures/wikidata-tolstoy-family.json", import.meta.url).pathname, OUT] = process.argv.slice(2);
const data = JSON.parse(readFileSync(FIX, "utf8"));
const SEED = 11;
const rng = createSeededRng({ seed: SEED, purpose: "split-records" });

// ── the received register: Wikidata's own single-value constraints ──────
const SINGLE = new Set(["Q19474404", "Q52060874"]); // single-value, single-best-value constraint
const HUMAN = "Q5";
const functionalRels = new Map();
for (const [p, c] of Object.entries(data.constraints)) {
  if (!Array.isArray(c.types)) continue; // a failed constraint fetch registers nothing (heimdall)
  const t = c.types.find((x) => SINGLE.has(x));
  if (t && p !== "P31") functionalRels.set(p, { giver: `Wikidata property constraint P2302=${t} on ${p} (${c.label})` });
}
const allRels = new Map(data.keep.filter((p) => p !== "P31").map((p) => [p, { giver: "CONTROL: every relation declared functional (no giver would say this)" }]));

// ── values: a date compares in ONE calendar, at the coarser precision ────
const JULIAN = "Q1985786";
const jdnGregorian = (y, m, d) => { const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3; return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045; };
const jdnJulian = (y, m, d) => { const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3; return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - 32083; };
const parts = (t) => { const m = /^([+-]\d+)-(\d\d)-(\d\d)/.exec(t.time); return m && { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) }; };
const makeSameValue = ({ calendarAware }) => (u, v) => {
  if (u.item || v.item) return u.item && v.item ? u.item === v.item : null;
  if (!u.time || !v.time) return null;
  const p = Math.min(u.precision, v.precision);
  if (p < 9) return null; // coarser than a year: cannot tell
  const a = parts(u), b = parts(v); if (!a || !b) return null;
  if (p === 9) return a.y === b.y ? true : Math.abs(a.y - b.y) > 1 ? false : null; // a year boundary can move with the calendar
  if (p === 10) return a.y === b.y && a.m === b.m ? true : null;
  if (!calendarAware) return a.y === b.y && a.m === b.m && a.d === b.d;
  if ((a.m === 0 || a.d === 0) || (b.m === 0 || b.d === 0)) return null;
  const ja = u.calendar === JULIAN ? jdnJulian(a.y, a.m, a.d) : jdnGregorian(a.y, a.m, a.d);
  const jb = v.calendar === JULIAN ? jdnJulian(b.y, b.m, b.d) : jdnGregorian(b.y, b.m, b.d);
  return ja === jb;
};

// ── records ───────────────────────────────────────────────────────────────
const records = []; let dualCalendar = 0;
for (const [qid, p] of Object.entries(data.people)) {
  const r1 = [], r2 = [];
  for (const [rel, vals] of Object.entries(p.claims)) {
    const live = vals.filter((v) => v.rank !== "deprecated");
    if (rel === "P31") { for (const v of live) { r1.push({ rel, value: v }); r2.push({ rel, value: v }); } continue; }
    const cals = new Set(live.filter((v) => v.time && v.precision >= 11).map((v) => v.calendar));
    if ((rel === "P569" || rel === "P570") && cals.size > 1) { // one calendar per record
      dualCalendar += 1;
      for (const v of live) (v.calendar === JULIAN ? r1 : r2).push({ rel, value: v });
      continue;
    }
    for (const v of live) { const x = rng(); if (x < 1 / 3) r1.push({ rel, value: v }); else if (x < 2 / 3) r2.push({ rel, value: v }); else { r1.push({ rel, value: v }); r2.push({ rel, value: v }); } }
  }
  const name = p.label.ru ?? p.label.en;
  records.push({ id: `${qid}/1`, qid, name, assertions: r1 }, { id: `${qid}/2`, qid, name, assertions: r2 });
}
const byId = new Map(records.map((r) => [r.id, r]));
const people = data.people;
const shareParent = (a, b) => ["P22", "P25"].some((rel) => (people[a].claims[rel] ?? []).some((x) => (people[b].claims[rel] ?? []).some((y) => x.item && x.item === y.item)));
const given = (q) => (people[q].claims.P735 ?? []).map((v) => v.item).filter(Boolean);
const sameGiven = (a, b) => given(a).some((g) => given(b).includes(g)) || (people[a].label.en ?? "").split(" ")[0] === (people[b].label.en ?? "").split(" ")[0];

function judgeWith(functional, sameValue, recs = byId, { witnessedOnly = false } = {}) {
  const ex = makeIdentityExclusion({
    kindsOf: (id) => new Set(recs.get(id).assertions.filter((x) => x.rel === "P31").map((x) => x.value.item)),
    assertionsOf: (id) => recs.get(id).assertions.map((x, i) => ({ rel: x.rel, value: x.value, id: `${id}#${i}` })),
    functional: new Map([[HUMAN, functional]]),
    sameValue,
    ...(witnessedOnly ? { witnessed: (a) => (a.value?.refs ?? 0) > 0 } : {}),
  });
  return ex.judge;
}
const arms = {
  shipped: judgeWith(functionalRels, makeSameValue({ calendarAware: true })),
  allFunctional: judgeWith(allRels, makeSameValue({ calendarAware: true })),
  calendarBlind: judgeWith(functionalRels, makeSameValue({ calendarAware: false })),
  // added after the shipped arm found Volkonsky's self-contradicting item —
  // post-hoc, reported beside the arm it amends, never in place of it.
  // NAMED FOR WHAT IT MEASURES (ranke, P182/P84): a Wikidata reference count
  // is the index's own claim that a source exists — no source was chased or
  // read. "Cited by the index, unchased", never "witnessed".
  citedByIndex: judgeWith(functionalRels, makeSameValue({ calendarAware: true }), byId, { witnessedOnly: true }),
};
const qids = Object.keys(people);
const positives = qids.map((q) => [`${q}/1`, `${q}/2`]);
const negatives = []; for (let i = 0; i < qids.length; i += 1) for (let j = i + 1; j < qids.length; j += 1) negatives.push([`${qids[i]}/1`, `${qids[j]}/1`, qids[i], qids[j]]);
const out = { fixture: FIX.split("/").pop(), seed: SEED, persons: qids.length, dualCalendar, functional: Object.fromEntries(functionalRels), arms: {} };
const tallyOf = (judge, pairs) => { const t = {}; const ex = []; for (const [a, b] of pairs) { const r = judge(a, b); t[r.verdict] = (t[r.verdict] ?? 0) + 1; if (r.verdict === CONTRADICTED) ex.push({ a, b, by: r.by, rels: (r.proof ?? []).map((p) => p.rel ?? p.kinds?.join("/")) }); } return { ...t, examples: ex.slice(0, 5) }; };
for (const [name, judge] of Object.entries(arms)) {
  out.arms[name] = {
    samePerson: tallyOf(judge, positives),
    differentPeople: tallyOf(judge, negatives.map(([a, b]) => [a, b])),
    siblings: tallyOf(judge, negatives.filter(([, , qa, qb]) => shareParent(qa, qb)).map(([a, b]) => [a, b])),
    namesakes: tallyOf(judge, negatives.filter(([, , qa, qb]) => sameGiven(qa, qb)).map(([a, b]) => [a, b])),
  };
}
// planted conflict: a same-person pair given ANOTHER person's birth date must be excluded
{
  let caught = 0, tried = 0;
  for (let i = 0; i < qids.length; i += 1) {
    const q = qids[i], donor = qids[(i + 1) % qids.length];
    const bd = (people[donor].claims.P569 ?? []).find((v) => v.precision >= 11);
    const own = (people[q].claims.P569 ?? []).find((v) => v.precision >= 11);
    if (!bd || !own || makeSameValue({ calendarAware: true })(bd, own)) continue;
    const r1 = byId.get(`${q}/1`), r2 = byId.get(`${q}/2`);
    const recs = new Map(byId);
    recs.set(`${q}/1`, { ...r1, assertions: [...r1.assertions.filter((x) => x.rel !== "P569"), { rel: "P569", value: own }] });
    recs.set(`${q}/2`, { ...r2, assertions: [...r2.assertions.filter((x) => x.rel !== "P569"), { rel: "P569", value: bd }] });
    tried += 1; if (judgeWith(functionalRels, makeSameValue({ calendarAware: true }), recs)(`${q}/1`, `${q}/2`).verdict === CONTRADICTED) caught += 1;
  }
  out.plantedConflict = { tried, caught };
}
// baseline: string identity
const nameSame = (a, b) => byId.get(a).name === byId.get(b).name;
out.baselineName = { samePersonMerged: positives.filter(([a, b]) => nameSame(a, b)).length, of: positives.length, differentPeopleMerged: negatives.filter(([a, b]) => nameSame(a, b)).length, namesakePairs: negatives.filter(([, , qa, qb]) => sameGiven(qa, qb)).length };
console.log(JSON.stringify(out, null, 1));
if (OUT) writeFileSync(OUT, JSON.stringify(out, null, 1));
