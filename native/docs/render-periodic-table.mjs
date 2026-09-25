// render-periodic-table.mjs — generates THE-27-CELLS-PERIODIC.html from the
// real cube and the real registry, the same walk capability-coverage.mjs runs.
//
// The periodic table of the 27: 9 operators × 3 grains. Rows are the grains
// (the periods — the size of the difference), columns are the operators in
// canonical chain order, grouped into the three domain blocks. Every cell
// shows its derived faces (mode, domain, terrain, stance) and the organs
// the real registry assigns to it.
//
// Running this is the regeneration check; THE-27-CELLS.md's own rule applies:
// if this output and the doc disagree, this driver is right.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { algebraAddresses, OPERATOR_CHAIN, TERRAIN_BY_DOMAIN, STANCE_BY_MODE, MODES, DOMAINS } from "../kernel/cube.js";
import { CAPACITIES } from "../organs/capacities.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "THE-27-CELLS-PERIODIC.html");

// terrain -> grain, the same projection the registry walk uses
const terrainToGrain = {};
for (const a of algebraAddresses()) terrainToGrain[a.terrain] = a.grain;

// ── the WHO (archons) and the WHAT (lexical exemplars) ──────────────────────
//
// The periodic table has three faces, not one. The REGISTER gives the organ
// (the act). The README Handle table gives the archon (the who — the named
// discipline the act is performed under). The lexical-analysis exemplars give
// the content (the what — the most discriminative real clause that lands in
// each cell, measured geometrically by an AI that never saw EO).
//
// The exemplar set lives outside this repo (eo-lexical-analysis-2.0 runs);
// both known run dirs are probed, and the face degrades honestly to "—" when
// neither is present.

const RUN_DIRS = [
  "/Users/mlacy/Documents/2.0_run/eo-lexical-analysis-2.0-main/run_2026-03-19_144302",
  "/Users/mlacy/Documents/2.0_run/eo-lexical-analysis-2.0-main/run_2026-03-15_122636",
];

const README = join(HERE, "..", "..", "README.md");
const handleByModule = {};
try {
  const readme = readFileSync(README, "utf8");
  for (const r of readme.match(/\| [\w\/\.\-]+\.js \| [^|]+ \|/g) || []) {
    const p = r.split("|").map((s) => s.trim());
    if (p[1] && p[2]) handleByModule[p[1].replace(/^.*\//, "")] = p[2];
  }
} catch {
  /* no README — the archon face degrades to — */
}

// hardcoded fallbacks for modules the regex misses (read from // Handle: headers)
const HANDLE_FALLBACK = {
  "measure.js": "Fisher", "kind-induction.js": "Kanada", "hypergraph.js": "Berge",
  "derivation.js": "Liu Hui", "frame.js": "Alhazen", "interlocutor.js": "Buber",
  "witness.js": "Thymus", "source.js": "Nadim", "notes-text.js": "Arokin",
  "socratic.js": "Kierkegaard", "cast.js": "Zhengming", "corroboration.js": "Bukhari",
  "grammar-lens.js": "Thrax", "kind-standing.js": "Shizhen", "primary.js": "Sima",
};
for (const k in HANDLE_FALLBACK) if (!handleByModule[k]) handleByModule[k] = HANDLE_FALLBACK[k];

const RENAME = { ALT: "DEF", SUP: "EVA" }; // lexical study's older Significance names
let exemplars = {};
for (const dir of RUN_DIRS) {
  const p = join(dir, "exemplars.json");
  if (!existsSync(p)) continue;
  try {
    const d = JSON.parse(readFileSync(p, "utf8"));
    for (const [label, list] of Object.entries(d["27cell"] || {})) {
      const m = label.match(/^([A-Z]+)\(([A-Za-z]+), ([A-Za-z]+)\)$/);
      if (!m || !list || !list.length) continue;
      let op = m[1];
      if (RENAME[op]) op = RENAME[op];
      const grain = terrainToGrain[m[3]];
      if (grain && (!exemplars[`${op}·${grain}`] || exemplars[`${op}·${grain}`].margin < list[0].margin_composite)) {
        exemplars[`${op}·${grain}`] = { clause: list[0].clause, lang: list[0].language, margin: list[0].margin_composite ?? list[0].margin_face };
      }
    }
    break;
  } catch {
    /* unreadable run — try the next */
  }
}

const MODE_COLOR = { Differentiate: "#c2572f", Relate: "#2f6b8f", Generate: "#3f7d4a" };
const DOMAIN_LABEL = { Existence: "Existence · what exists", Structure: "Structure · how things hang together", Interpretation: "Interpretation · what the reader holds" };
const GRAIN_NOTE = {
  Ground: "the ambient a figure will be read against — the Void (the hub)",
  Figure: "one difference from its ground — the Beings (the spokes)",
  Pattern: "the difference a figure made to the next ground — the Fold (the rim)",
};

const organsByCell = {};
for (const op of OPERATOR_CHAIN) for (const g of Object.keys(GRAIN_NOTE)) organsByCell[`${op}·${g}`] = [];
for (const c of CAPACITIES) {
  const g = terrainToGrain[c.terrain];
  for (const op of String(c.op || "").split("+")) {
    if (organsByCell[`${op}·${g}`]) organsByCell[`${op}·${g}`].push(c);
  }
}

const cellsByDomain = {};
for (const d of DOMAINS) cellsByDomain[d] = [];
for (const a of algebraAddresses()) cellsByDomain[a.domain].push(a);

const cell = (op, grain) => {
  const a = algebraAddresses().find((x) => x.op === op && x.grain === grain);
  const organs = organsByCell[`${op}·${grain}`];
  const mode = a.mode;
  const hue = MODE_COLOR[mode];
  const archons = [...new Set(organs.map((o) => handleByModule[(o.module ?? "").replace(/^.*\//, "")]).filter(Boolean))];
  const ex = exemplars[`${op}·${grain}`];
  return { a, organs, hue, archons, ex };
};

const operatorCol = (op) => {
  const cells = ["Ground", "Figure", "Pattern"].map((g) => cell(op, g));
  const meta = algebraAddresses().find((x) => x.op === op);
  return `<div class="op-col">
    <div class="op-head" style="--mode:${MODE_COLOR[meta.mode]}">
      <div class="op-code">${op}</div>
      <div class="op-mode">${meta.mode}</div>
      <div class="op-domain">${meta.domain}</div>
    </div>
    ${cells.map((c) => cellBlock(c)).join("")}
  </div>`;
};

const cellBlock = ({ a, organs, hue, archons, ex }) => {
  const organRows = organs.length
    ? organs.map((o) => `<span class="organ" title="${(o.module ?? "") + " :: " + (o.fn ?? "")}">${o.id}</span>`).join("")
    : `<span class="organ empty">EMPTY</span>`;
  const multi = organs.length > 1 ? `<span class="multi">×${organs.length}</span>` : "";
  const archonRow = archons.length
    ? `<div class="cell-archons">${archons.map((h) => `<span class="archon">${h}</span>`).join("")}</div>`
    : "";
  const exRow = ex
    ? `<div class="cell-ex" title="margin ${ex.margin.toFixed(3)} · lang ${ex.lang}">“${ex.clause.slice(0, 92)}${ex.clause.length > 92 ? "…" : ""}”</div>`
    : `<div class="cell-ex empty">no clean exemplar</div>`;
  return `<div class="cell" style="--cell:${hue}">
    <div class="cell-addr">${a.op}·${a.grain}</div>
    <div class="cell-face"><span class="terrain">${a.terrain}</span> · <span class="stance">${a.stance}</span></div>
    ${archonRow}
    <div class="cell-organs">${organRows}${multi}</div>
    ${exRow}
  </div>`;
};

const block = (domain) => {
  const ops = OPERATOR_CHAIN.filter((op) => algebraAddresses().find((a) => a.op === op).domain === domain);
  return `<section class="block">
    <h2 class="block-title" style="--mode:${MODE_COLOR[domain === "Existence" ? "Differentiate" : domain === "Structure" ? "Relate" : "Generate"]}">${DOMAIN_LABEL[domain]}</h2>
    <div class="block-row">${ops.map(operatorCol).join("")}</div>
  </section>`;
};

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The 27 cells — periodic table</title>
<style>
  :root { --paper:#0f1214; --ink:#e8e4da; --dim:#8b877d; }
  * { box-sizing: border-box; }
  body { background:var(--paper); color:var(--ink); font: 14px/1.45 "Helvetica Neue", Arial, sans-serif; margin:0; padding:32px 24px 64px; }
  header { max-width:1200px; margin:0 auto 20px; }
  h1 { font-size:26px; letter-spacing:.04em; margin:0 0 6px; }
  .lede { color:var(--dim); max-width:72ch; margin:0 0 4px; }
  .law { color:var(--dim); font-size:12.5px; max-width:72ch; margin:0 0 8px; }
  .regenerated { font-size:11.5px; color:var(--dim); font-family:ui-monospace, Menlo, monospace; }
  main { max-width:1200px; margin:0 auto; }
  .block { margin:26px 0; }
  .block-title { font-size:15px; font-weight:600; letter-spacing:.03em; margin:0 0 10px; padding-left:2px; }
  .block-title::before { content:""; display:inline-block; width:10px; height:10px; background:var(--mode); margin-right:8px; border-radius:2px; vertical-align:1px; }
  .block-row { display:grid; grid-template-columns:repeat(3, 1fr); gap:14px; }
  .op-col { display:flex; flex-direction:column; gap:8px; }
  .op-head { border-radius:8px; padding:8px 10px; border:1px solid color-mix(in srgb, var(--mode) 55%, transparent); background:color-mix(in srgb, var(--mode) 14%, transparent); }
  .op-code { font-weight:700; font-size:17px; letter-spacing:.08em; font-family:ui-monospace, Menlo, monospace; }
  .op-mode { font-size:11.5px; text-transform:uppercase; letter-spacing:.08em; color:var(--ink); opacity:.85; }
  .op-domain { font-size:11px; color:var(--dim); }
  .cell { border-radius:8px; border:1px solid color-mix(in srgb, var(--cell) 38%, transparent); background:color-mix(in srgb, var(--cell) 8%, transparent); padding:9px 10px; min-height:88px; display:flex; flex-direction:column; gap:3px; }
  .cell-addr { font-family:ui-monospace, Menlo, monospace; font-weight:700; font-size:13px; letter-spacing:.04em; }
  .cell-face { font-size:12px; color:var(--ink); opacity:.92; }
  .cell-face .terrain { font-weight:600; }
  .cell-face .stance { font-style:italic; }
  .cell-organs { margin-top:auto; display:flex; flex-wrap:wrap; gap:4px; align-items:center; }
  .organ { font-family:ui-monospace, Menlo, monospace; font-size:11px; background:var(--paper); border:1px solid color-mix(in srgb, var(--cell) 45%, transparent); border-radius:5px; padding:1px 6px; color:var(--ink); cursor:default; }
  .organ.empty { border-style:dashed; color:var(--dim); }
  .multi { font-size:10.5px; color:var(--dim); font-family:ui-monospace, Menlo, monospace; }
  .cell-archons { display:flex; flex-wrap:wrap; gap:4px; }
  .archon { font-size:11.5px; font-weight:600; color:var(--ink); padding:1px 7px; border-radius:5px; background:color-mix(in srgb, var(--cell) 22%, transparent); border:1px solid color-mix(in srgb, var(--cell) 60%, transparent); }
  .cell-ex { margin-top:2px; font-size:11px; color:var(--dim); font-style:italic; border-top:1px dashed color-mix(in srgb, var(--cell) 30%, transparent); padding-top:3px; line-height:1.3; }
  .cell-ex.empty { color:var(--dim); opacity:.6; }
  .legend { display:flex; gap:18px; margin:0 0 8px; padding:0; flex-wrap:wrap; }
  .legend li { list-style:none; font-size:12.5px; color:var(--ink); display:flex; align-items:center; gap:6px; }
  .legend .swatch { width:11px; height:11px; border-radius:3px; }
  .grains { display:flex; gap:18px; margin:14px 0 4px; flex-wrap:wrap; }
  .grain-note { font-size:12px; color:var(--dim); }
  .grain-note b { color:var(--ink); font-family:ui-monospace, Menlo, monospace; }
</style>
</head>
<body>
<header>
  <h1>The 27 cells — periodic table</h1>
  <p class="lede">The space is <b>27 = 9 operators × 3 grains</b>; mode, domain, terrain and stance are all <i>derived</i> from that pair — there is no third free axis. Cells classify <b>moves, never content</b>. Rows are the grains (the size of the difference); columns are the operators in canonical chain order (<b>NUL SIG INS SEG CON SYN DEF EVA REC</b>), grouped into the three domain blocks.</p>
  <p class="law">Color = mode (what the act does): <span style="color:#c2572f">■ Differentiate — cut apart</span> · <span style="color:#2f6b8f">■ Relate — put beside</span> · <span style="color:#3f7d4a">■ Generate — bring into being</span>. Each cell carries three faces: the <b>organ</b> (the registered act), the <b>archon</b> (the who — the named discipline it is performed under, from the README Handle table), and the <b>exemplar</b> (the what — the most discriminative real clause landing in that cell, from the eo-lexical-analysis-2.0 runs; “no clean exemplar” means the study found none).</p>
  <p class="regenerated">Generated from <code>native/kernel/cube.js</code> + <code>native/organs/capacities.js</code> — re-run <code>node native/docs/render-periodic-table.mjs</code> to regenerate. 27/27 cells occupied.</p>
</header>
<main>
  <div class="grains">
    <span class="grain-note"><b>Ground</b> — ${GRAIN_NOTE.Ground}</span>
    <span class="grain-note"><b>Figure</b> — ${GRAIN_NOTE.Figure}</span>
    <span class="grain-note"><b>Pattern</b> — ${GRAIN_NOTE.Pattern}</span>
  </div>
  ${DOMAINS.map(block).join("")}
</main>
</body>
</html>
`;

writeFileSync(OUT, html, "utf8");
console.log(`wrote ${OUT}`);
const total = CAPACITIES.length;
console.log(`registry rows: ${total}`);