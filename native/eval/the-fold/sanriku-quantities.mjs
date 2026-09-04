// sanriku-quantities.mjs — ZERO model calls.
//
// quantity-overlap.mjs measured the cited-source corpus and found DISTINCT
// VALUES REPORTED BY TWO OR MORE DISTINCT SOURCES: 0 of 35. That corpus was
// one article's citation list, so every quantity was cited once. The
// falsifiable programme the user asked for -- "objectively measured but
// subjectively reported" -- needs many independent reports OF ONE EVENT with
// an authoritative measured record as oracle.
//
// THIS IS THAT CORPUS. The 2026 Sanriku earthquake (20 April 2026, off
// Miyako, Japan). The oracle is the USGS event record, fetched from the FDSN
// API as raw bytes; the reports are independent publishers.
//
// WHY THIS EVENT. Its quantities disagree in every way the kinds predict, and
// the authority itself names which kind each disagreement is:
//   * magnitude 7.4 Mww (USGS) vs 7.7 MJMA (JMA, carried by the BBC) vs 7.5
//     Mw (GCMT) -- SAME NUMBER-SLOT, DIFFERENT SCALES. Not rivals.
//   * depth 25 km (preferred origin) vs 35 km (moment tensor centroid) vs
//     10 km (Pacific Tsunami Warning Center) -- one authority, three methods,
//     three numbers, none wrong. A hypocentre is not a centroid.
//   * origin time 07:52:58.908 UTC, reported everywhere as 07:53 / 16:53 JST.
import { readFileSync, existsSync } from "node:fs";
const FIX = new URL("./fixtures/sanriku/", import.meta.url).pathname;

const claims = []; // {quantity, value, unit, scale, source, method, kind}
const push = (o) => claims.push(o);

// ── the oracle, from raw bytes ───────────────────────────────────────────
const usgs = JSON.parse(readFileSync(`${FIX}usgs-us6000sri7.json`, "utf8"));
const props = usgs.properties, geom = usgs.geometry.coordinates;
push({ quantity: "magnitude", value: props.mag, unit: null, scale: props.magType, source: "usgs:preferred", method: "preferred origin", authoritative: true });
push({ quantity: "depth", value: geom[2], unit: "km", scale: null, source: "usgs:preferred", method: "preferred origin (hypocentre)", authoritative: true });
push({ quantity: "originTime", value: new Date(props.time).toISOString(), unit: "UTC", scale: null, source: "usgs:preferred", method: "preferred origin", authoritative: true });
for (const [type, list] of Object.entries(props.products ?? {})) {
  for (const p of list) {
    const pr = p.properties ?? {};
    const src = `${p.source}:${type}`;
    if (pr.magnitude) push({ quantity: "magnitude", value: Number(pr.magnitude), unit: null, scale: pr["magnitude-type"] ?? null, source: src, method: type, authoritative: true });
    if (pr["derived-magnitude"]) push({ quantity: "magnitude", value: Number(pr["derived-magnitude"]), unit: null, scale: pr["derived-magnitude-type"] ?? null, source: `${src}:${p.code}`, method: type, authoritative: true });
    if (pr.depth) push({ quantity: "depth", value: Number(pr.depth), unit: "km", scale: null, source: src, method: type === "moment-tensor" ? "centroid" : type, authoritative: true });
    if (pr["derived-depth"]) push({ quantity: "depth", value: Number(pr["derived-depth"]), unit: "km", scale: null, source: `${src}:${p.code}`, method: "centroid", authoritative: true });
  }
}

// ── the reports, from raw bytes ──────────────────────────────────────────
// Magnitudes stated in prose. No model: a magnitude in English news is
// "magnitude N.N" or "N.N-magnitude" or "N.N magnitude".
const strip = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ");
const MAG = /(?:magnitude[- ]?(\d\.\d)|(\d\.\d)[- ]magnitude)/gi;
for (const [file, source] of [["bbc-live.html", "bbc.co.uk"]]) {
  if (!existsSync(FIX + file)) { console.log(`(absent: ${file})`); continue; }
  const text = strip(readFileSync(FIX + file, "utf8"));
  const counts = new Map();
  for (const m of text.matchAll(MAG)) { const v = Number(m[1] ?? m[2]); counts.set(v, (counts.get(v) ?? 0) + 1); }
  for (const [v, n] of counts) push({ quantity: "magnitude", value: v, unit: null, scale: null, source, method: `prose, stated ${n}×`, authoritative: false });
}

// ── the measurement ──────────────────────────────────────────────────────
const srcOf = (c) => String(c.source).split(":")[0];
console.log(`claims extracted: ${claims.length}\n`);
const byQ = new Map();
for (const c of claims) { if (!byQ.has(c.quantity)) byQ.set(c.quantity, []); byQ.get(c.quantity).push(c); }
let multiSource = 0, rivalPairs = 0, typedApart = 0;
for (const [q, list] of byQ) {
  const vals = new Map();
  for (const c of list) { const k = String(c.value); if (!vals.has(k)) vals.set(k, []); vals.get(k).push(c); }
  const sources = new Set(list.map(srcOf));
  console.log(`${q}: ${list.length} claim(s), ${vals.size} distinct value(s), ${sources.size} distinct source(s)`);
  for (const [v, cs] of [...vals].sort((a, b) => Number(a[0]) - Number(b[0]) || String(a[0]).localeCompare(String(b[0]))))
    console.log(`   ${String(v).padEnd(26)} ${[...new Set(cs.map((c) => `${srcOf(c)} (${c.method}${c.scale ? ", " + c.scale : ""})`))].join("; ")}`);
  if (sources.size > 1) multiSource += 1;
  // rival pairs: two DIFFERENT values for one quantity from DIFFERENT sources
  const arr = [...vals.entries()];
  for (let i = 0; i < arr.length; i += 1) for (let j = i + 1; j < arr.length; j += 1) {
    const a = arr[i][1][0], b = arr[j][1][0];
    if (srcOf(a) === srcOf(b) && a.method === b.method) continue;
    rivalPairs += 1;
    // TYPED APART: different scale, or different method, is not a contest.
    if ((a.scale && b.scale && a.scale !== b.scale) || a.method !== b.method) typedApart += 1;
  }
}
console.log(`\n=== the number that was 0 of 35 on the last corpus ===`);
console.log(`  quantities reported by 2+ distinct sources: ${multiSource} of ${byQ.size}`);
console.log(`  apparent rival value-pairs:                 ${rivalPairs}`);
console.log(`  typed apart (different scale or method):    ${typedApart}`);
console.log(`  left as genuine contests:                   ${rivalPairs - typedApart}`);
