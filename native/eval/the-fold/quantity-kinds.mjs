// quantity-kinds.mjs — ZERO model calls.
//
// User: *"remember our thing where we use the LLM to discover rules?"* — said
// after I named the defect and then proposed to fix it with a HAND-WRITTEN
// table of magnitude scales. A received table is a hand-written rule in a
// better coat. The standing pattern is the company kinds': a kind is
// DISCOVERED from the material's own signature, NAMED by that signature, and
// carries a shuffle control that dissolves it if it is not real.
//
// THE MATERIAL. The ISC Bulletin's comprehensive entry for the 2026 Sanriku
// earthquake: ONE event, 23 magnitude measurements, 15 agencies, each
// measurement carrying its own scale token. Objectively measured,
// subjectively reported, and the reports range 6.5 to 7.8 — an apparent
// disagreement of 1.3 magnitude units on one earthquake.
//
// THE RULE TO DISCOVER: what individuates a quantity here — the AGENCY that
// reported it, or the SCALE it was measured on? Nothing below knows what
// "Mww" or "mb" mean. Both candidates are induced the same way and judged by
// the same null.
//
// A FIRST ATTEMPT WAS REFUSED BY ITS OWN CONTROL and the refusal is why this
// exists: over the USGS record alone the signature was product:network:scale,
// which gave 24 kinds over 26 measurements — 23 of them holding a single
// measurement, so "one value per kind" was vacuous and 7 of 40 redeals
// individuated as well. One authority cannot teach what individuates a
// quantity. Many can.
import { readFileSync } from "node:fs";
const FIX = new URL("./fixtures/sanriku/", import.meta.url).pathname;

// ── the measurements, parsed from the ISC bulletin's own bytes ───────────
const isc = readFileSync(`${FIX}isc.csv`, "utf8");
const row = isc.split("\n").find((l) => /^\d+,\w+/.test(l.trim()));
if (!row) throw new Error("no ISC event row");
const cells = row.split(",").map((c) => c.trim());
// after the prime hypocentre's nine fields (EVENTID TYPE AUTHOR DATE TIME LAT
// LON DEPTH DEPFIX), magnitudes run in triples:
// AUTHOR, TYPE, MAG
const M = [];
for (let i = 9; i + 2 < cells.length; i += 3) {
  const [agency, scale, mag] = [cells[i], cells[i + 1], Number(cells[i + 2])];
  if (!agency || !scale || !Number.isFinite(mag)) continue;
  M.push({ agency, scale: scale.replace(/[()]/g, ""), value: mag });
}
console.log(`ISC bulletin: ${M.length} magnitude measurements of one event`);
console.log(`  agencies: ${new Set(M.map((m) => m.agency)).size}   scales: ${new Set(M.map((m) => m.scale)).size}   range ${Math.min(...M.map((m) => m.value))} – ${Math.max(...M.map((m) => m.value))}\n`);

// ── induce, by each candidate signature ─────────────────────────────────
// A signature INDIVIDUATES a quantity to the degree that measurements sharing
// it agree. Spread is the mean absolute deviation within a group, weighted by
// group size; a signature that carves the material at its joint has LOW
// within-group spread. Groups of one carry no evidence and are excluded, which
// is exactly what the refused first attempt failed to do.
function spread(list, keyOf) {
  const g = new Map();
  for (const m of list) { const k = keyOf(m); if (!g.has(k)) g.set(k, []); g.get(k).push(m.value); }
  let num = 0, den = 0, groups = 0;
  for (const vs of g.values()) {
    if (vs.length < 2) continue;
    const mean = vs.reduce((a, b) => a + b, 0) / vs.length;
    num += vs.reduce((a, b) => a + Math.abs(b - mean), 0);
    den += vs.length; groups += 1;
  }
  return { spread: den ? num / den : null, groups, covered: den };
}
const CANDIDATES = { scale: (m) => m.scale, agency: (m) => m.agency };
const overall = spread(M, () => "all");
console.log(`ungrouped spread (all 23 as one quantity): ${overall.spread.toFixed(4)}`);
console.log(`\ncandidate signature   groups  covered  within-group spread`);
const realSpread = {};
for (const [name, keyOf] of Object.entries(CANDIDATES)) {
  const s = spread(M, keyOf); realSpread[name] = s;
  console.log(`  ${name.padEnd(18)} ${String(s.groups).padStart(6)} ${String(s.covered).padStart(8)}  ${s.spread === null ? "-" : s.spread.toFixed(4)}`);
}

// ── THE CONTROL (II.23) ─────────────────────────────────────────────────
// Redeal each candidate's LABELS among the measurements — every label kept,
// every value kept, only which value carries which label destroyed. A
// signature that genuinely carves the material has spread BELOW everything
// the redeal produces. One that merely partitions has spread inside it.
const DRAWS = Number(process.env.DRAWS ?? 200);
let seed = 11;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
console.log(`\nCONTROL — labels redealt among the measurements, ${DRAWS} draws`);
for (const [name, keyOf] of Object.entries(CANDIDATES)) {
  const draws = [];
  for (let d = 0; d < DRAWS; d += 1) {
    const labels = M.map(keyOf);
    for (let i = labels.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [labels[i], labels[j]] = [labels[j], labels[i]]; }
    const sh = M.map((m, k) => ({ ...m, _l: labels[k] }));
    const s = spread(sh, (m) => m._l);
    if (s.spread !== null) draws.push(s.spread);
  }
  draws.sort((a, b) => a - b);
  const real = realSpread[name].spread;
  const below = draws.filter((x) => x <= real).length;
  console.log(`  ${name.padEnd(8)} real ${real.toFixed(4)}   redealt median ${draws[draws.length >> 1].toFixed(4)} (${draws[0].toFixed(4)}–${draws.at(-1).toFixed(4)})   ${below}/${draws.length} draws at or below real  ->  p ≈ ${((below + 1) / (draws.length + 1)).toFixed(3)}`);
}

// ── what the discovered kind then says about rivals ──────────────────────
console.log(`\nRIVALS under the discovered kind (same scale, different agency, different value):`);
const byScale = new Map();
for (const m of M) { if (!byScale.has(m.scale)) byScale.set(m.scale, []); byScale.get(m.scale).push(m); }
let rivals = 0, apart = 0;
for (let i = 0; i < M.length; i += 1) for (let j = i + 1; j < M.length; j += 1) {
  if (M[i].value === M[j].value) continue;
  if (M[i].scale === M[j].scale) rivals += 1; else apart += 1;
}
for (const [sc, ms] of [...byScale].filter(([, ms]) => new Set(ms.map((m) => m.value)).size > 1))
  console.log(`  ${sc.padEnd(7)} ${ms.map((m) => `${m.agency} ${m.value}`).join("   ")}`);
console.log(`\n  rivals (same scale, differing): ${rivals}`);
console.log(`  typed apart (different scale):  ${apart}`);
