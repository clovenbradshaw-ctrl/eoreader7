// cited-source-independence.mjs — the independence measure pointed at the one
// corpus that is NOT different pages of one publisher.
//
// WHY THIS EXISTS. `source-independence.mjs` found that the three-page
// Wikipedia fixture was never three independent sources: 22 corroborated notes
// went to 0 under the admission door and independence together, and it closed
// by naming what was missing — "a genuinely independent corpus: different
// publishers, not different pages of one." The Ranke-backwards corpus is an
// article measured against THE SOURCES IT CITES, over 34 distinct hosts. That
// claim has never been checked. This checks it.
//
// ZERO model calls.  env: DRAWS - MIN_LEN - MIN_SHARED - SEED - FROM
import { readFileSync, existsSync } from "node:fs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const HERE = new URL("./", import.meta.url).pathname;
const MIN_LEN = Number(process.env.MIN_LEN ?? 40);
// THE FLOOR IS READ OFF THE NULL, NEVER INHERITED. `source-independence.mjs`
// declares minShared 2, which separated on THREE sources. This corpus has 106,
// so 5,565 pairs, and a floor of 2 is reached by chance in every redeal — the
// null collapses MORE than the real corpus (27 vs 18) and the measure decides
// nothing. Unset, the floor is swept upward and the smallest value at which
// zero of DRAWS redeals reach the real collapse is used; MIN_SHARED overrides.
const MIN_SHARED = process.env.MIN_SHARED ? Number(process.env.MIN_SHARED) : null;
const DRAWS = Number(process.env.DRAWS ?? 40);
const SEED = Number(process.env.SEED ?? 0);

const { sharedTextGroups } = await import(`${NATIVE}/organs/corroboration.js`);
const { measureOf, blankBelowMeasure } = await import(`${NATIVE}/organs/source.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);

const walk = JSON.parse(readFileSync(`${HERE}results/${process.env.FROM ?? "ranke-backwards.json"}`, "utf8"));
// one entry per FACE actually cited by a note, carrying the host that cited it
const byFace = new Map();
for (const r of walk.real.rows) {
  if (!r.facePath || !existsSync(FIX + r.facePath)) continue;
  if (!byFace.has(r.facePath)) byFace.set(r.facePath, { ref: r.facePath, host: r.host ?? "(unknown)", notes: 0 });
  byFace.get(r.facePath).notes += 1;
}
const faces = [...byFace.values()];
const hosts = new Set(faces.map((f) => f.host));
console.log(`cited faces referenced by at least one note: ${faces.length}`);
console.log(`distinct hosts among them: ${hosts.size}`);
console.log(`declared: minSentenceLength ${MIN_LEN}, draws ${DRAWS}\n`);

let seed0 = SEED >>> 0;
const rnd0 = () => ((seed0 = (seed0 * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const doorText0 = (t) => blankBelowMeasure(t, { measure: measureOf(t, { percentile: 0.9 }), fill: 0.8, minRun: 2 });
const pre = faces.map((f) => ({ ref: f.ref, text: doorText0(readFileSync(FIX + f.ref, "utf8")) }));
const pre_pools = pre.map((p) => splitSentences(p.text).map((x) => x?.text ?? x));
const pre_flat = pre_pools.flat(), pre_counts = pre_pools.map((p) => p.length);
function collapsedAt(ms, draws) {
  const D = { minSentenceLength: MIN_LEN, minShared: ms, splitSentences };
  const r = sharedTextGroups(pre, D).collapsed;
  let reach = 0;
  for (let d = 0; d < draws; d += 1) {
    const bag = pre_flat.slice();
    for (let i = bag.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd0() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
    let at = 0;
    if (sharedTextGroups(pre_counts.map((n, i) => ({ ref: `n${i}`, text: bag.slice(at, at += n).join(" ") })), D).collapsed >= r) reach += 1;
  }
  return { real: r, reach };
}
let FLOOR = MIN_SHARED;
if (FLOOR === null) {
  console.log("deriving the floor from the null (smallest value no redeal reaches):");
  for (let ms = 2; ms <= 12; ms += 1) {
    const { real: r, reach } = collapsedAt(ms, 10);
    console.log(`  minShared ${String(ms).padStart(2)}: real collapsed ${String(r).padStart(3)}, ${reach}/10 redeals reach it`);
    if (reach === 0) { FLOOR = ms; break; }
  }
  if (FLOOR === null) { console.log("  no floor up to 12 separates — refusing to report a number."); process.exit(1); }
  console.log(`  -> floor ${FLOOR}, derived\n`);
}
const DECL = { minSentenceLength: MIN_LEN, minShared: FLOOR, splitSentences };
const doorText = (t) => blankBelowMeasure(t, { measure: measureOf(t, { percentile: 0.9 }), fill: 0.8, minRun: 2 });
const raw = faces.map((f) => ({ ref: f.ref, text: readFileSync(FIX + f.ref, "utf8") }));
const filtered = raw.map((p) => ({ ref: p.ref, text: doorText(p.text) }));

const rawGroups = sharedTextGroups(raw, DECL);
const real = sharedTextGroups(filtered, DECL);
console.log(`on RAW text: ${rawGroups.groups.length} independent text(s) among ${faces.length} faces (${rawGroups.collapsed} collapsed)`);
console.log(`DOOR-FILTERED: ${real.groups.length} independent text(s) among ${faces.length} faces (${real.collapsed} collapsed)\n`);

const hostOf = new Map(faces.map((f) => [f.ref, f.host]));
const multi = real.groups.filter((g) => g.length > 1);
console.log(`groups holding more than one face: ${multi.length}`);
for (const g of multi.slice(0, 20)) {
  const hs = [...new Set(g.map((r) => hostOf.get(r)))];
  console.log(`  ${g.length} faces, ${hs.length} host(s): ${hs.slice(0, 4).join(", ")}${hs.length > 4 ? " …" : ""}`);
}
// the hosts question: how many INDEPENDENT TEXTS, and how many distinct hosts survive
const survivingHosts = new Set();
for (const g of real.groups) survivingHosts.add(hostOf.get(g[0]));
console.log(`\nindependent texts ${real.groups.length}; distinct hosts represented among group representatives ${survivingHosts.size}`);

// ── the control (II.23): redeal sentences among the faces ────────────────
let seed = SEED >>> 0;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pools = filtered.map((p) => splitSentences(p.text).map((x) => x?.text ?? x));
const flat = pools.flat();
const counts = pools.map((p) => p.length);
const nulls = [];
for (let d = 0; d < DRAWS; d += 1) {
  const bag = flat.slice();
  for (let i = bag.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
  let at = 0;
  const redealt = counts.map((n, i) => ({ ref: `null-${i}`, text: bag.slice(at, at += n).join(" ") }));
  const g = sharedTextGroups(redealt, DECL);
  nulls.push({ collapsed: g.collapsed, maxShared: Math.max(0, ...g.overlaps.map((o) => o.shared)) });
}
const col = nulls.map((n) => n.collapsed).sort((a, b) => a - b);
const mx = nulls.map((n) => n.maxShared).sort((a, b) => a - b);
const realMax = Math.max(0, ...real.overlaps.map((o) => o.shared));
console.log(`\nCONTROL — sentences redealt among the faces, ${DRAWS} draws`);
console.log(`  collapsed:        real ${real.collapsed}, redealt median ${col[DRAWS >> 1]} (${col[0]}-${col.at(-1)})`);
console.log(`  largest shared:   real ${realMax}, redealt median ${mx[DRAWS >> 1]} (${mx[0]}-${mx.at(-1)})`);
const above = col.filter((n) => n >= real.collapsed).length;
console.log(above === 0
  ? `  -> the real collapse sits outside every redeal: where these faces share, they share a TEXT.`
  : `  -> ${above} of ${DRAWS} redeals reach it: the measure decides nothing here.`);
