// eval/capacity-map/f4-diagnose.mjs — EXPLORATORY and POST-HOC. Not part of the pre-registered
// procedure; it exists because THE-CAPACITY-MAP.md section 6 says a FALSIFIED-INVERSE result
// is to be met with "investigate the confound before anything else". Frankenstein's primary
// F4 result came back FALSIFIED-INVERSE on ONE non-empty stratum (the two lower terciles of lag
// events hold only tied pairs), so the questions are: (1) is the inversion volume, (2) is it
// the same being appearing under two ids in the standing group (identity unearned upstream,
// which is exactly the a -> g crossing), (3) is it a few pairs. Nothing here changes a verdict
// recorded in f4-*.json; it can only add a labelled diagnosis beside them.
//
// Usage: node f4-diagnose.mjs <book.txt> <label>
import fs from "node:fs";
import { networkStanding } from "../../kernel/network-standing.js";
import { bindLinks } from "../../legacy-ported/packages/engine/emergence/binding.js";
import { loadBook } from "./lib/books.mjs";
import { computeReliability, groupStat, stratifiedContrast, terciles } from "./lib/direction.mjs";

const CFG = { K: 80, W: 8, B: 256, R: 39, DRAWS: 199, ALPHA: 0.05, SEED: 20260812, SHUFFLE_SEED: 7, PERMS: 2000, PERM_SEED: 7 };
const [path, label] = process.argv.slice(2);
const book = loadBook(path);
const beings = book.referentBeings.slice(0, CFG.K);
const st = networkStanding(beings, { bindLinks, window: CFG.W, draws: CFG.DRAWS, seed: CFG.SEED, alpha: CFG.ALPHA });
const pairs = [...st.edges.map((e) => ({ ...e, group: "S" })), ...st.refused.map((e) => ({ ...e, group: "N" }))];
const rel = computeReliability({ beings, pairs: pairs.map((p) => [p.a, p.b]), N: book.N, B: CFG.B, R: CFG.R, seed: CFG.SHUFFLE_SEED });
const recs = pairs.map((p) => ({ ...p, ...rel.get(`${p.a}\u0000${p.b}`) }));

const surfacesOf = new Map();
for (const [s, c] of book.clusterOfSurface) surfacesOf.set(c, [...(surfacesOf.get(c) ?? []), s]);
const nameOf = (id) => (surfacesOf.get(id) ?? [id]).slice(0, 2).join("/");
const tokensOf = (id) => new Set((surfacesOf.get(id) ?? []).flatMap((s) => s.toLowerCase().split(/\s+/)));
const tokenClusters = new Map();
for (const id of surfacesOf.keys()) for (const t of tokensOf(id)) tokenClusters.set(t, (tokenClusters.get(t) ?? 0) + 1);
// a "shared rare token": a name part carried by exactly these two clusters and no third
const sharesRare = (a, b) => [...tokensOf(a)].some((t) => tokensOf(b).has(t) && tokenClusters.get(t) === 2);

const fmt = (x) => (Number.isFinite(x) ? x.toFixed(3) : "n/a");
const q = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
const contrastOf = (rs, R = CFG.R) => {
  const tc = terciles(rs.map((r) => r.L));
  const withStrata = rs.map((r) => ({ ind: r.ind, group: r.group, stratum: tc(r.L) }));
  const S = groupStat(withStrata.filter((r) => r.group === "S").map((r) => r.ind), R);
  const N = groupStat(withStrata.filter((r) => r.group === "N").map((r) => r.ind), R);
  const c = stratifiedContrast(withStrata, R, CFG.PERMS, CFG.PERM_SEED);
  return { S, N, c };
};
const show = (tag, rs) => {
  const { S, N, c } = contrastOf(rs);
  console.log(`${tag.padEnd(46)} S n=${String(S.n).padStart(4)} E=${fmt(S.E)} | N n=${String(N.n).padStart(4)} E=${fmt(N.E)} | Δ=${fmt(c.delta)} pΔ+=${fmt(c.pGreater)} pΔ-=${fmt(c.pLess)} strata=${c.strataUsed}`);
  return { tag, S, N, c };
};

console.log(`# ${label}: ${pairs.length} pairs (${recs.filter((r) => r.group === "S").length} S / ${recs.filter((r) => r.group === "N").length} N)`);
const out = { label, config: CFG, rows: [] };
out.rows.push(show("all pairs (the pre-registered set)", recs));

// (1) volume: L by group, among non-tied pairs
for (const g of ["S", "N"]) {
  const Ls = recs.filter((r) => r.group === g && r.ind[0] >= 0).map((r) => r.L);
  console.log(`  L among non-tied ${g}: n=${Ls.length} q25=${q(Ls, 0.25)} median=${q(Ls, 0.5)} q75=${q(Ls, 0.75)} max=${Math.max(...Ls)}`);
}
// (2) identity: pairs whose clusters share a rare name token are the candidate same-being pairs
const alias = recs.filter((r) => sharesRare(r.a, r.b));
console.log(`  pairs whose clusters share a rare name token: ${alias.length} (${alias.filter((r) => r.group === "S").length} S)`);
out.rows.push(show("excluding rare-token-sharing pairs", recs.filter((r) => !sharesRare(r.a, r.b))));
// (3) finer volume matching: quintiles of L instead of terciles
{
  const qs = [0.2, 0.4, 0.6, 0.8].map((p) => q(recs.map((r) => r.L), p));
  const quint = (L) => qs.filter((cut) => L >= cut).length;
  const withStrata = recs.map((r) => ({ ind: r.ind, group: r.group, stratum: quint(r.L) }));
  const S = groupStat(withStrata.filter((r) => r.group === "S").map((r) => r.ind), CFG.R);
  const N = groupStat(withStrata.filter((r) => r.group === "N").map((r) => r.ind), CFG.R);
  const c = stratifiedContrast(withStrata, CFG.R, CFG.PERMS, CFG.PERM_SEED);
  console.log(`${"quintiles of L instead of terciles".padEnd(46)} S n=${String(S.n).padStart(4)} E=${fmt(S.E)} | N n=${String(N.n).padStart(4)} E=${fmt(N.E)} | Δ=${fmt(c.delta)} pΔ+=${fmt(c.pGreater)} pΔ-=${fmt(c.pLess)} strata=${c.strataUsed}`);
  out.rows.push({ tag: "quintiles", S, N, c });
}
// (3b) exact volume matching: every distinct L (capped at 12, declared) its own stratum
{
  const CAP = 12;
  const withStrata = recs.map((r) => ({ ind: r.ind, group: r.group, stratum: Math.min(r.L, CAP) }));
  const S = groupStat(withStrata.filter((r) => r.group === "S").map((r) => r.ind), CFG.R);
  const N = groupStat(withStrata.filter((r) => r.group === "N").map((r) => r.ind), CFG.R);
  const c = stratifiedContrast(withStrata, CFG.R, CFG.PERMS, CFG.PERM_SEED);
  console.log(`${"exact L strata (L capped at 12)".padEnd(46)} S n=${String(S.n).padStart(4)} E=${fmt(S.E)} | N n=${String(N.n).padStart(4)} E=${fmt(N.E)} | Δ=${fmt(c.delta)} pΔ+=${fmt(c.pGreater)} pΔ-=${fmt(c.pLess)} strata=${c.strataUsed}`);
  out.rows.push({ tag: "exact L strata (capped at 12)", S, N, c });
}
// (4) which pairs carry it: the standing pairs with the most lag events
console.log("  top standing pairs by lag events (agreement real | order-destroyed rate):");
for (const r of recs.filter((x) => x.group === "S").sort((a, b) => b.L - a.L).slice(0, 14)) {
  const shuf = Array.from(r.ind.slice(1)).filter((v) => v >= 0);
  console.log(`    ${nameOf(r.a).slice(0, 26).padEnd(26)} — ${nameOf(r.b).slice(0, 26).padEnd(26)} L=${String(r.L).padStart(4)} coArr=${String(r.coArrivals).padStart(4)}  real=${r.ind[0]} shuf=${shuf.length ? (shuf.reduce((s, v) => s + v, 0) / shuf.length).toFixed(2) : "n/a"}${sharesRare(r.a, r.b) ? "  [shares rare token]" : ""}`);
}
fs.writeFileSync(new URL(`./results/f4-diagnose-${label}.json`, import.meta.url), JSON.stringify(out) + "\n");
