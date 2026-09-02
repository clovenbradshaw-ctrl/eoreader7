// eval/spatial-pipeline.mjs — a SPATIAL medium through signal.js
//
// The fifth medium, chosen to be structurally unlike the first four. Text,
// music, video and turbulence are all ORDERED 1-D STREAMS: the mechanism's
// `before=` company is native to them. A 2-D lattice has no before and no
// after — every cell has four neighbours and no canonical order — so this
// is the first medium where the instrument must IMPOSE the order the
// mechanism reads. That makes it the sharpest available test of the
// scorecard question: does a new medium find anything new, or does the
// pipeline hold?
//
// It also runs entirely through `signal.js` rather than hand-rolling the
// five steps, so it tests the general organ on material it was not built
// against.
//
// THE DECLARED GRAMMAR (fixed before the run): on a 2-D lattice, a MARKER
// cell always sits immediately WEST of a TARGET cell. Nothing else is
// planted; the rest is noise from a declared alphabet. So:
//   - a raster (row-major) instrument reads west->east and MUST see it
//   - a column-major instrument reads north->south and MUST NOT: it never
//     puts a marker before a target, and the grammar is invisible to it
//   - a reversed-raster instrument reads east->west, so it sees the
//     MIRROR of the grammar (target before marker) and not the grammar
// An instrument's scope is a fact about the instrument — the turbulence
// run's own lesson, here made a prediction stated BEFORE the run rather
// than a finding explained after it.
import { findSignal, phrase } from "../../eoreader7/native/organs/index.js";
import { discoverCompanyKinds } from "../../eoreader7/native/organs/index.js";

const ALPHABET = ["ash", "bramble", "cinder", "dune", "marker", "target"];
const W = 48, H = 48;

function lattice(seed) {
  let s = seed >>> 0;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const g = Array.from({ length: H }, () => Array.from({ length: W }, () => ALPHABET[Math.floor(r() * 4)]));
  // plant: marker immediately WEST of target, scattered, never at an edge
  for (let k = 0; k < 90; k++) {
    const y = 1 + Math.floor(r() * (H - 2));
    const x = 1 + Math.floor(r() * (W - 3));
    g[y][x] = "marker";
    g[y][x + 1] = "target";
  }
  return g;
}

// ── the instruments: three ways to impose an order on a lattice ──────────
const rows = (g) => g.map((row) => ({ text: row.join(" ") }));
const cols = (g) => Array.from({ length: W }, (_, x) => ({ text: g.map((row) => row[x]).join(" ") }));
const rowsReversed = (g) => g.map((row) => ({ text: [...row].reverse().join(" ") }));
// a fourth, deliberately structure-free: same cells, order destroyed by a
// declared seed. It must find nothing, and it is in the search so the
// search-aware ceiling has to absorb it.
const scatter = (g) => {
  let s = 99; const r = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  return g.map((row) => { const c = [...row]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return { text: c.join(" ") }; });
};

// A FIFTH instrument of the SAME SCOPE but a DIFFERENT RULE: it also reads
// west->east, but segments the lattice into 2-row bands rather than single
// rows (so a row boundary is not a phrase boundary for it). This is the
// distinction the first run made visible: instrument independence needs
// instruments that CAN see the same thing. Two instruments of DIFFERENT
// SCOPE (row-major vs column-major) are not redundant checks — one is
// simply blind — so "one instrument only" is the correct permanent verdict
// for a directional grammar until a same-scope, different-rule instrument
// exists. Turbulence's hole-vs-peak pair was same-scope by luck; here it is
// by design.
const bands = (g) => {
  const out = [];
  for (let y = 0; y < H; y += 2) out.push({ text: [...g[y], ...(g[y + 1] ?? [])].join(" ") });
  return out;
};

const instruments = [
  { recipe: "raster-row-major@west-to-east", discretize: rows },
  { recipe: "raster-row-bands@west-to-east-2row", discretize: bands },
  { recipe: "raster-column-major@north-to-south", discretize: cols },
  { recipe: "raster-row-major-reversed@east-to-west", discretize: rowsReversed },
  { recipe: "scatter@seed99", discretize: scatter },
];
const sources = [
  { ref: "lattice-a", material: lattice(7) },
  { ref: "lattice-b", material: lattice(4242) },
];

const result = await findSignal(sources, {
  instruments,
  vocabulary: ALPHABET,
  discoverKinds: discoverCompanyKinds,
  clean: (t) => t,          // these are lattice cells, not text
  draws: 120, seed: 0, alpha: 0.05,
  minMentions: 20, minShare: 0.25, minMembers: 1,
});

console.log("── SPATIAL (2-D lattice, order imposed by the instrument) ──");
console.log(phrase(result));
if (result.refused) { console.log(JSON.stringify(result, null, 1).slice(0, 600)); process.exit(0); }
console.log(`\nfindings:`);
for (const f of result.findings)
  console.log(`  ${f.subject} -> ${f.kind}  share ${f.share.toFixed(3)} (ceiling ${f.searchCeiling.toFixed(3)})` +
    `  sources ${f.sources.length} · instruments ${f.instruments.join(", ")}` + (f.note ? `  [${f.note}]` : "  [CORROBORATED]"));

// ── SCORED against the predictions fixed before the run ──────────────────
const hit = result.findings.find((f) => f.subject === "target" && f.kind === "kind:before=marker");
const mirror = result.findings.find((f) => f.subject === "marker" && f.kind === "kind:before=target");
const byColumn = result.findings.some((f) => f.instruments.includes("raster-column-major@north-to-south"));
const byScatter = result.findings.some((f) => f.instruments.includes("scatter@seed99"));
console.log(`\nPREDICTIONS, fixed before the run:`);
console.log(`  1. row-major finds target-after-marker ................ ${hit && hit.instruments.includes("raster-row-major@west-to-east") ? "YES ✓" : "no ✗"}`);
console.log(`  1b. and a SAME-SCOPE, different-rule instrument corroborates it ... ${hit?.corroborated ? "YES ✓" : "no ✗"}`);
console.log(`  2. the mirror instrument finds the MIRROR, not the grammar ... ${mirror ? "YES ✓" : "no ✗"}`);
console.log(`  3. column-major is BLIND to a west-east grammar ....... ${byColumn ? "saw something ✗" : "blind ✓"}`);
console.log(`  4. the scatter instrument finds nothing .............. ${byScatter ? "found something ✗" : "nothing ✓"}`);
console.log(`\ncontrol: ${result.control.passed ? "passed (kinds dissolve on scrambled company)" : "SURVIVED — unlicensed"}`);
console.log(`gaps: ${result.gaps.length ? JSON.stringify(result.gaps) : "none"}`);
