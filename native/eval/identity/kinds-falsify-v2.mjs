// kinds-falsify-v2.mjs — the SECOND pre-registered attempt to kill "kinds
// induced from relation profiles are the meaningful slice" (2026-09-27).
// v1 (kinds-falsify.mjs, unchanged, results kept) failed K2 and K3. Its
// diagnosis, written before this file: (a) half-profiles starve the inducer;
// (b) a bookkeeping relation (P910, a category link) glued a 139-member
// pseudo-kind; (c) the inducer's basins covered ~half of each kind; (d) K1's
// Laplace smoothing pulled every small kind to 0.5, penalizing small kinds.
//
// WHAT CHANGED, and nothing else (declared BEFORE the first run):
//   induced   kernel/kind-functional-induction.js with kindMethod
//             "characteristic-sets" (Neumann & Moerkotte 2011; subsumption
//             merge, Pham, Passing, Erling & Boncz 2015), its search-aware
//             null at draws 99, alpha 0.05, seed SEED; IRM object-kind rounds
//             (Kemp et al. 2006) at rounds 3, referentOf = an item value in
//             the population; inProfile = NOT bookkeeping, where bookkeeping is
//             Wikidata's OWN typing: a property whose P31 class reaches, by
//             P279*, Q51118821 (Wikimedia-internal property), Q18608359
//             (property to indicate a source) or Q28100549 (property describing
//             identity, e.g. P1889 "different from"). If the class fixture is
//             absent, the filter arm is reported ABSENT, never guessed.
//   inducerV1 the v1 induced slicing, rerun beside it for reference.
//   K1        back-off smoothing toward the global rate:
//             p = (others + M * g_r) / (members - 1 + M), M = 2 pseudo-
//             observations (v1's Laplace carried 2 as well), g_r = the leave-
//             one-out rate of r among all other referents in half B.
// KILL CRITERIA unchanged from v1: K1 beats random in >= 1 - alpha of draws;
// K2 standings violated less than random's median; K3 beats global; K4 the
// oracle margin, reported. Everything the kinds were built from is half A;
// everything scored is half B. Same fixture, same seed, same halves.
//   node kinds-falsify-v2.mjs [fixture] [classes.json] [out.json]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const { induceKindsAndFunctions } = await import(`${NATIVE}/kernel/kind-functional-induction.js`);
const { createSeededRng, shuffled } = await import(`${NATIVE}/kernel/rng.js`);
const { makeSameValue } = await import("./lib-values.mjs");
const [FIX = new URL("./fixtures/wikidata-mixed-graph.json", import.meta.url).pathname, CLS = new URL("./fixtures/wikidata-property-classes.json", import.meta.url).pathname, OUT] = process.argv.slice(2);
const g = JSON.parse(readFileSync(FIX, "utf8"));
const HELD_OUT = new Set(["P31", "P279"]);
const SEED = 11, DRAWS = 40, ALPHA = 0.05, EXPOSURE_FLOOR = 2, M = 2, CS_DRAWS = 99, IRM_ROUNDS = 3;
const BOOKKEEPING_ROOTS = ["Q51118821", "Q18608359", "Q28100549"];
const sameValue = makeSameValue({ calendarAware: true });
const witnessed = (a) => (a.value?.refs ?? 0) > 0;
const year = (t) => { const m = /^([+-]\d+)-(\d\d)-(\d\d)/.exec(t ?? ""); return m ? Number(m[1]) + (Number(m[2] || 1) - 1) / 12 + (Number(m[3] || 1) - 1) / 365 : null; };
const intervalOf = (v) => { const w = v.when; if (!w) return undefined; const at = year(w.at); if (at != null) return { lo: at, hi: at }; const lo = year(w.from), hi = year(w.to); return lo == null && hi == null ? undefined : { lo: lo ?? -Infinity, hi: hi ?? Infinity }; };

// ── halves ────────────────────────────────────────────────────────────────
const rng = createSeededRng({ seed: SEED, purpose: "halves" });
const A = new Map(), B = new Map();
for (const [q, e] of Object.entries(g.entities)) {
  const a = [], b = [];
  for (const [rel, vs] of Object.entries(e.claims)) {
    if (HELD_OUT.has(rel)) continue;
    const side = rng() < 0.5 ? a : b;
    vs.forEach((v, i) => { const iv = intervalOf(v); side.push({ rel, value: v, id: `${q}:${rel}#${i}`, ...(iv ? { interval: iv } : {}) }); });
  }
  A.set(q, a); B.set(q, b);
}
const ids = [...A.keys()].filter((q) => A.get(q).length && B.get(q).length);
const relSet = (m, q) => new Set((m.get(q) ?? []).map((x) => x.rel));

// ── slicings ──────────────────────────────────────────────────────────────
// ── Wikidata's own typing of its properties ────────────────────────────────
let inProfile = null, bookkeeping = { absent: true };
if (existsSync(CLS)) {
  const pc = JSON.parse(readFileSync(CLS, "utf8"));
  const reaches = (c, seen = new Set()) => { if (BOOKKEEPING_ROOTS.includes(c)) return true; if (seen.has(c)) return false; seen.add(c); return (pc.classes[c]?.subclassOf ?? []).some((s) => reaches(s, seen)); };
  const book = new Set(Object.entries(pc.properties).filter(([, p]) => (p.classes ?? []).some((c) => reaches(c))).map(([p]) => p));
  inProfile = (rel) => !book.has(rel);
  bookkeeping = { absent: false, giver: pc.giver, retrievedAt: pc.retrievedAt, excluded: [...book].sort(), classFetchFailures: pc.failed.length };
}
const inPop = new Set(ids);
const induced = induceKindsAndFunctions(ids, { assertionsOf: (q) => A.get(q), sameValue, witnessed, exposureFloor: EXPOSURE_FLOOR, kindMethod: "characteristic-sets", kindOptions: { draws: CS_DRAWS, alpha: ALPHA, seed: SEED, population: "halfA" }, inProfile, objectKinds: { rounds: IRM_ROUNDS, referentOf: (v) => (v?.item && inPop.has(v.item) ? v.item : null) } });
const inducerV1 = induceKindsAndFunctions(ids, { assertionsOf: (q) => A.get(q), sameValue, witnessed, exposureFloor: EXPOSURE_FLOOR, kindOptions: { population: "halfA" } });
const RESIDUAL = "kind:residual";
const inducedLabel = new Map(ids.map((q) => [q, [...induced.kindsOf(q)][0] ?? RESIDUAL]));
const oracleLabel = new Map(ids.map((q) => {
  const cls = (g.entities[q].claims.P31 ?? []).map((v) => v.item);
  return [q, cls.length ? `P31:${cls[0]}` : RESIDUAL];
}));
const v1Label = new Map(ids.map((q) => [q, [...inducerV1.kindsOf(q)][0] ?? RESIDUAL]));
const globalLabel = new Map(ids.map((q) => [q, "kind:global"]));
const redeal = (labels, purpose) => { const vals = shuffled(ids.map((q) => labels.get(q)), createSeededRng({ seed: SEED, purpose })); return new Map(ids.map((q, i) => [q, vals[i]])); };

// ── K1: held-out relation prediction, leave-one-out within kind ──────────
const vocab = [...new Set(ids.flatMap((q) => [...relSet(B, q)]))];
function k1(labels) {
  const members = new Map(); for (const q of ids) { const k = labels.get(q); if (!members.has(k)) members.set(k, []); members.get(k).push(q); }
  const count = new Map(); // kind -> rel -> number of members showing rel in B
  for (const [k, ms] of members) { const c = new Map(); for (const q of ms) for (const r of relSet(B, q)) c.set(r, (c.get(r) ?? 0) + 1); count.set(k, c); }
  const total = new Map(); for (const q of ids) for (const r of relSet(B, q)) total.set(r, (total.get(r) ?? 0) + 1);
  let loss = 0, n = 0;
  for (const q of ids) {
    const k = labels.get(q), ms = members.get(k).length - 1, c = count.get(k), own = relSet(B, q), bannedA = relSet(A, q);
    for (const r of vocab) {
      if (bannedA.has(r)) continue; // a relation this referent put in half A cannot appear in its half B
      const hit = own.has(r);
      const others = (c.get(r) ?? 0) - (hit ? 1 : 0);
      const g = ((total.get(r) ?? 0) - (hit ? 1 : 0)) / (ids.length - 1); // leave-one-out global rate
      const p = Math.min(1 - 1e-6, Math.max(1e-6, (others + M * g) / (ms + M)));
      loss += -Math.log(hit ? p : 1 - p); n += 1;
    }
  }
  return loss / n;
}

// ── K2: do standings learned on A hold on B? ──────────────────────────────
function k2(labels) {
  const kinds = new Map(); for (const q of ids) { const k = labels.get(q); if (!kinds.has(k)) kinds.set(k, []); kinds.get(k).push(q); }
  const declaredKinds = [...kinds].map(([kindKey, memberRefs]) => ({ kindKey, memberRefs }));
  const learned = induceKindsAndFunctions(ids, { assertionsOf: (q) => A.get(q), sameValue, witnessed, exposureFloor: EXPOSURE_FLOOR, declaredKinds });
  let licensed = 0, tested = 0, violated = 0;
  for (const [kindKey, entries] of learned.register) {
    licensed += entries.size;
    for (const [rel, d] of entries) for (const q of kinds.get(kindKey)) {
      const vs = (B.get(q) ?? []).filter((x) => x.rel === rel); if (vs.length < 2) continue;
      tested += 1;
      let bad = false;
      for (let i = 0; i < vs.length && !bad; i += 1) for (let j = i + 1; j < vs.length && !bad; j += 1) {
        if (sameValue(vs[i].value, vs[j].value) !== false || !witnessed(vs[i]) || !witnessed(vs[j])) continue;
        if (d.temporal === "one-at-a-time") { const a = vs[i].interval, b = vs[j].interval; if (!a || !b) continue; if (Math.max(a.lo, b.lo) <= Math.min(a.hi, b.hi)) bad = true; }
        else bad = true;
      }
      if (bad) violated += 1;
    }
  }
  return { licensed, tested, violated, violationRate: tested ? violated / tested : null };
}

const out = { fixture: FIX.split("/").pop(), referents: ids.length, vocab: vocab.length, draws: DRAWS, alpha: ALPHA, inducedKinds: induced.kinds.length, inducedDiagnostics: induced.diagnostics, bookkeeping, residual: ids.filter((q) => inducedLabel.get(q) === RESIDUAL).length, slicings: {} };
const summarize = (name, labels) => ({ kinds: new Set(labels.values()).size, k1LogLoss: +k1(labels).toFixed(4), k2: k2(labels) });
out.slicings.induced = summarize("induced", inducedLabel);
out.slicings.inducerV1 = summarize("inducerV1", v1Label);
out.slicings.global = summarize("global", globalLabel);
out.slicings.oracle = summarize("oracle", oracleLabel);
for (const [base, labels] of [["random", inducedLabel], ["oracleRandom", oracleLabel]]) {
  const k1s = [], k2s = [];
  for (let d = 0; d < DRAWS; d += 1) { const r = redeal(labels, `${base}-${d}`); k1s.push(k1(r)); k2s.push(k2(r).violationRate); }
  k1s.sort((x, y) => x - y); const k2f = k2s.filter((x) => x != null).sort((x, y) => x - y);
  out.slicings[base] = { draws: DRAWS, k1LogLossMedian: +k1s[Math.floor(DRAWS / 2)].toFixed(4), k1LogLossBest: +k1s[0].toFixed(4), k2ViolationMedian: k2f.length ? +k2f[Math.floor(k2f.length / 2)].toFixed(4) : null };
  out.slicings[base].k1DrawsAtLeastAsGood = k1s.filter((x) => x <= out.slicings[base === "random" ? "induced" : "oracle"].k1LogLoss).length;
}
const ind = out.slicings.induced, rnd = out.slicings.random;
out.verdict = {
  K1_beatsRandom: rnd.k1DrawsAtLeastAsGood / DRAWS <= ALPHA,
  K2_standingsTransferBetterThanRandom: ind.k2.violationRate != null && rnd.k2ViolationMedian != null ? ind.k2.violationRate < rnd.k2ViolationMedian : null,
  K3_beatsGlobal: ind.k1LogLoss < out.slicings.global.k1LogLoss,
  K4_vsOracle: { induced: ind.k1LogLoss, oracle: out.slicings.oracle.k1LogLoss, oracleMinusInduced: +(out.slicings.oracle.k1LogLoss - ind.k1LogLoss).toFixed(4) },
};
console.log(JSON.stringify(out, null, 1));
if (OUT) writeFileSync(OUT, JSON.stringify(out));
