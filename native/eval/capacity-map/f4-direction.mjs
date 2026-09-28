// eval/capacity-map/f4-direction.mjs — F4 of native/docs/THE-CAPACITY-MAP.md:
// does direction (transcendental, Figure) need standing (geometric, Figure)?
//
// Usage:
//   node f4-direction.mjs power                       # the harness power check (must pass first)
//   node f4-direction.mjs novel <book.txt> <label>    # one novel, primary + robustness
//   node f4-direction.mjs plays <pg100.txt>           # the Shakespeare plays, pooled
//
// Every number below is the document's (section 5, F4), declared before any run:
//   novels  W 8 (robustness 2, 32), B = 32 W = 256 sentences, K = 80 beings
//   plays   W 2 (robustness 1, 4),  B = 32 W = 64 turns, every speaker with >= 2 turns
//   standing: bindLinks displacement null, draws 199, alpha 0.05, seed 20260812 (LINK_SPEC's
//             convention as eval/network-standing.mjs cites it)
//   controls: R = 39 order-destroyed replicates (p resolution 1/40), terciles of lag events,
//             2000 label permutations within strata, groups of at least 30 non-tied pairs.
// Robustness variants use R = 19 (declared cost cap; they are read for the SIGN and size of
// the contrast, never for the decision).
import fs from "node:fs";
import { networkStanding } from "../../kernel/network-standing.js";
import { bindLinks } from "../../legacy-ported/packages/engine/emergence/binding.js";
import { loadBook } from "./lib/books.mjs";
import { loadPlays, playBeings } from "./lib/plays.mjs";
import { computeReliability, groupStat, stratifiedContrast, terciles, decide } from "./lib/direction.mjs";
import { lcg } from "./lib/stats.mjs";

const CFG = Object.freeze({
  K: 80, DRAWS: 199, ALPHA: 0.05, STANDING_SEED: 20260812, SHUFFLE_SEED: 7, R: 39, R_ROBUST: 19,
  PERMS: 2000, PERM_SEED: 7, MIN_GROUP: 30,
  novel: { W: 8, W_ROBUST: [2, 32], mult: 32 },
  plays: { W: 2, W_ROBUST: [1, 4], mult: 32 },
});
const OUT = new URL("./results/", import.meta.url);
const stamp = (o) => ({ ...o, config: CFG, node: process.version });
const write = (name, obj) => { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(new URL(name, OUT), JSON.stringify(obj, null, 1)); };

const standingPairs = (beings, W) => {
  const r = networkStanding(beings, { bindLinks, window: W, draws: CFG.DRAWS, seed: CFG.STANDING_SEED, alpha: CFG.ALPHA });
  return [
    ...r.edges.map((e) => ({ a: e.a, b: e.b, group: "S", coArrivals: e.coArrivals, pValue: e.pValue })),
    ...r.refused.map((e) => ({ a: e.a, b: e.b, group: "N", coArrivals: e.coArrivals, pValue: e.pValue })),
  ];
};
const keyOf = (p) => `${p.a}\u0000${p.b}`;

/** One variant's verdict from pooled records (one or many readings). */
function verdictOf(recs, R) {
  const tc = terciles(recs.map((r) => r.L));
  recs.forEach((r) => { r.stratum = tc(r.L); });
  const S = groupStat(recs.filter((r) => r.group === "S").map((r) => r.ind), R);
  const N = groupStat(recs.filter((r) => r.group === "N").map((r) => r.ind), R);
  const contrast = stratifiedContrast(recs, R, CFG.PERMS, CFG.PERM_SEED);
  const byStratum = [0, 1, 2].map((k) => ({
    stratum: k,
    S: groupStat(recs.filter((r) => r.group === "S" && r.stratum === k).map((r) => r.ind), R),
    N: groupStat(recs.filter((r) => r.group === "N" && r.stratum === k).map((r) => r.ind), R),
  }));
  return { pairs: recs.length, S, N, contrast, byStratum, decision: decide({ S, N, contrast, minGroup: CFG.MIN_GROUP }) };
}

const line = (tag, v) => {
  const f = (x) => (Number.isFinite(x) ? x.toFixed(3) : "  n/a");
  console.log(`${tag.padEnd(34)} pairs ${String(v.pairs).padStart(5)} | S n=${String(v.S.n).padStart(4)} A=${f(v.S.A_real)} E=${f(v.S.E)} p=${f(v.S.p_E)} | N n=${String(v.N.n).padStart(4)} A=${f(v.N.A_real)} E=${f(v.N.E)} p=${f(v.N.p_E)} | Δ=${f(v.contrast.delta)} pΔ=${f(v.contrast.pGreater)} | ${v.decision.label}`);
};

// ── the harness power check ────────────────────────────────────────────────

/** F4 (iv): 8 beings, one planted pair (B follows A at lag 1 with probability 0.5 over a 0.05 base). */
function synth(seed, N = 9456, base = 0.05, lift = 0.5) {
  const rnd = lcg(seed);
  const P = Array.from({ length: N }, () => (rnd() < base ? 1 : 0));
  const Q = Array.from({ length: N }, (_, t) => (rnd() < (t > 0 && P[t - 1] ? lift : base) ? 1 : 0));
  const noise = Array.from({ length: 6 }, () => Array.from({ length: N }, () => (rnd() < base ? 1 : 0)));
  const arr = (x) => x.flatMap((v, t) => (v ? [t] : []));
  return { N, beings: [{ id: "P", arrivals: arr(P) }, { id: "Q", arrivals: arr(Q) }, ...noise.map((x, i) => ({ id: `n${i}`, arrivals: arr(x) }))] };
}

function power() {
  const SYN = 200; // declared: syntheses; the planted pair's agreement is a per-synthesis 0/1, so a rate needs many
  const planted = { real: [], shuf: [] };
  const indep = { real: [], shuf: [] };
  for (let s = 1; s <= SYN; s++) {
    const { N, beings } = synth(s);
    const noiseIds = beings.filter((b) => b.id.startsWith("n")).map((b) => b.id);
    const pairs = [["P", "Q"]];
    for (let i = 0; i < noiseIds.length; i++) for (let j = i + 1; j < noiseIds.length; j++) pairs.push([noiseIds[i], noiseIds[j]]);
    const rel = computeReliability({ beings, pairs, N, B: 256, R: 1, seed: CFG.SHUFFLE_SEED + s });
    for (const [a, b] of pairs) {
      const ind = rel.get(`${a}\u0000${b}`).ind;
      const bucket = a === "P" ? planted : indep;
      if (ind[0] >= 0) bucket.real.push(ind[0]);
      if (ind[1] >= 0) bucket.shuf.push(ind[1]);
    }
  }
  const rate = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN);
  const z = (x1, n1, x2, n2) => {
    const p1 = x1 / n1, p2 = x2 / n2, p = (x1 + x2) / (n1 + n2), se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
    return se ? (p1 - p2) / se : 0;
  };
  const sum = (xs) => xs.reduce((s, x) => s + x, 0);
  const zPlanted = z(sum(planted.real), planted.real.length, sum(planted.shuf), planted.shuf.length);
  const zIndep = z(sum(indep.real), indep.real.length, sum(indep.shuf), indep.shuf.length);
  const Z01 = 2.326, Z005 = 2.576; // one-sided .01 and two-sided .01 normal quantiles (textbook)
  const out = {
    syntheses: SYN,
    planted: { n_real: planted.real.length, real: rate(planted.real), n_shuf: planted.shuf.length, shuf: rate(planted.shuf), z: zPlanted },
    independent: { n_real: indep.real.length, real: rate(indep.real), n_shuf: indep.shuf.length, shuf: rate(indep.shuf), z: zIndep },
  };
  out.pass = zPlanted > Z01 && Math.abs(zIndep) < Z005;
  console.log(JSON.stringify(out, null, 1));
  console.log(out.pass ? "POWER CHECK PASSED — real-data results may be read" : "POWER CHECK FAILED — a NO-SIGNAL on real data would be uninformative");
  write("f4-power.json", stamp(out));
  return out.pass;
}

// ── a novel ────────────────────────────────────────────────────────────────

function novel(path, label) {
  const t0 = Date.now();
  const book = loadBook(path);
  const beings = book.referentBeings.slice(0, CFG.K);
  const N = book.N;
  const c = CFG.novel;
  const Ws = [c.W, ...c.W_ROBUST];
  const B = c.mult * c.W;
  console.log(`# ${label}: N=${N} sentences, ${book.referentBeings.length} referent beings (>=2 arrivals), testing top ${beings.length}; W ${Ws.join("/")}, B ${B}`);

  const standing = new Map(Ws.map((W) => [W, standingPairs(beings, W)]));
  for (const W of Ws) console.log(`  standing W=${W}: ${standing.get(W).filter((p) => p.group === "S").length} standing / ${standing.get(W).filter((p) => p.group === "N").length} not (of ${standing.get(W).length} co-arriving pairs)  [${((Date.now() - t0) / 1000).toFixed(0)}s]`);

  const union = new Map();
  for (const W of Ws) for (const p of standing.get(W)) union.set(keyOf(p), [p.a, p.b]);
  const relPrimary = computeReliability({ beings, pairs: [...union.values()], N, B, R: CFG.R, seed: CFG.SHUFFLE_SEED });
  console.log(`  reliability B=${B}: ${union.size} pairs x ${CFG.R + 1} orders  [${((Date.now() - t0) / 1000).toFixed(0)}s]`);
  const recsFor = (W, rel) => standing.get(W).map((p) => ({ ...rel.get(keyOf(p)), group: p.group }));

  const results = { label, N, beings: beings.length, variants: {} };
  results.variants[`primary W=${c.W} B=${B}`] = verdictOf(recsFor(c.W, relPrimary), CFG.R);
  line(`primary W=${c.W} B=${B}`, results.variants[`primary W=${c.W} B=${B}`]);
  for (const W of c.W_ROBUST) {
    const name = `robust W=${W} B=${B}`;
    results.variants[name] = verdictOf(recsFor(W, relPrimary), CFG.R);
    line(name, results.variants[name]);
  }
  // block-scheme robustness at the primary W (cost cap: R_ROBUST)
  const primaryPairs = standing.get(c.W).map((p) => [p.a, p.b]);
  for (const [name, opts] of [
    ["robust contiguous halves", { B, contiguous: true }],
    [`robust B=${B / 2}`, { B: B / 2 }],
  ]) {
    const rel = computeReliability({ beings, pairs: primaryPairs, N, R: CFG.R_ROBUST, seed: CFG.SHUFFLE_SEED, ...opts });
    results.variants[name] = verdictOf(recsFor(c.W, rel), CFG.R_ROBUST);
    line(`${name} (W=${c.W}, R=${CFG.R_ROBUST})`, results.variants[name]);
  }
  results.seconds = (Date.now() - t0) / 1000;
  write(`f4-${label}.json`, stamp(results));
  return results;
}

// ── the plays, pooled ──────────────────────────────────────────────────────

function plays(path) {
  const t0 = Date.now();
  const all = loadPlays(path).map((p) => ({ title: p.title, ...playBeings(p) }));
  const c = CFG.plays;
  const Ws = [c.W, ...c.W_ROBUST];
  const B = c.mult * c.W;
  console.log(`# plays: ${all.length} readings, ${all.reduce((s, p) => s + p.N, 0)} turns; W ${Ws.join("/")}, B ${B}`);
  const pooled = new Map(Ws.map((W) => [W, []]));
  const pooledContig = [];
  const pooledHalf = [];
  for (const play of all) {
    const standing = new Map(Ws.map((W) => [W, standingPairs(play.beings, W)]));
    const union = new Map();
    for (const W of Ws) for (const p of standing.get(W)) union.set(keyOf(p), [p.a, p.b]);
    if (!union.size) continue;
    const rel = computeReliability({ beings: play.beings, pairs: [...union.values()], N: play.N, B, R: CFG.R, seed: CFG.SHUFFLE_SEED });
    for (const W of Ws) for (const p of standing.get(W)) pooled.get(W).push({ ...rel.get(keyOf(p)), group: p.group });
    const primary = standing.get(c.W);
    const pp = primary.map((p) => [p.a, p.b]);
    const relC = computeReliability({ beings: play.beings, pairs: pp, N: play.N, B, contiguous: true, R: CFG.R_ROBUST, seed: CFG.SHUFFLE_SEED });
    const relH = computeReliability({ beings: play.beings, pairs: pp, N: play.N, B: B / 2, R: CFG.R_ROBUST, seed: CFG.SHUFFLE_SEED });
    for (const p of primary) {
      pooledContig.push({ ...relC.get(keyOf(p)), group: p.group });
      pooledHalf.push({ ...relH.get(keyOf(p)), group: p.group });
    }
    process.stdout.write(`  ${play.title.slice(0, 30).padEnd(30)} ${String(primary.filter((p) => p.group === "S").length).padStart(4)} S / ${String(primary.filter((p) => p.group === "N").length).padStart(4)} N  [${((Date.now() - t0) / 1000).toFixed(0)}s]\n`);
  }
  const results = { readings: all.length, variants: {} };
  const primaryName = `primary W=${c.W} B=${B}`;
  results.variants[primaryName] = verdictOf(pooled.get(c.W), CFG.R);
  line(primaryName, results.variants[primaryName]);
  for (const W of c.W_ROBUST) {
    const name = `robust W=${W} B=${B}`;
    results.variants[name] = verdictOf(pooled.get(W), CFG.R);
    line(name, results.variants[name]);
  }
  results.variants["robust contiguous halves"] = verdictOf(pooledContig, CFG.R_ROBUST);
  line(`robust contiguous (W=${c.W}, R=${CFG.R_ROBUST})`, results.variants["robust contiguous halves"]);
  results.variants[`robust B=${B / 2}`] = verdictOf(pooledHalf, CFG.R_ROBUST);
  line(`robust B=${B / 2} (W=${c.W}, R=${CFG.R_ROBUST})`, results.variants[`robust B=${B / 2}`]);
  results.seconds = (Date.now() - t0) / 1000;
  write("f4-plays.json", stamp(results));
  return results;
}

const [mode, a, b] = process.argv.slice(2);
if (mode === "power") process.exit(power() ? 0 : 3);
else if (mode === "novel") novel(a, b);
else if (mode === "plays") plays(a);
else { console.error("usage: f4-direction.mjs power | novel <book.txt> <label> | plays <pg100.txt>"); process.exit(2); }
