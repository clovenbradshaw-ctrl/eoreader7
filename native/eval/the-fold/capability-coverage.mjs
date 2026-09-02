// eval/capability-coverage.mjs — the cube as a capability map, and the honest
// limit of reading it as one.
//
// THE HYPOTHESIS THIS TESTS, from the user directly (2026-08-29): *"we should
// have organs that can do all 9 stances, and we can use the cube to identify
// where we are missing capabilities."* Both halves are testable against
// machinery this repo already has — `moves.js` enumerates the 27 cells and
// computes coverage against `capacities.js` — and this driver runs that
// enumeration through all THREE of the cube's 9-way projections rather than
// only the one `moves.js` reports.
//
// THE GEOMETRY, verified mechanically here rather than asserted. The cube has
// THREE free axes: mode(3) x domain(3) x grain(3) = 27 cells. The three named
// 9-way faces are each a projection dropping ONE axis:
//
//     operator = (mode, domain)   — drops grain
//     stance   = (mode, grain)    — drops domain
//     terrain  = (domain, grain)  — drops mode
//
// So a stance covers exactly 3 cells, one per DOMAIN; a terrain covers exactly
// 3 cells, one per MODE. That is why no single face is a capability map on its
// own: a stance-only view reports "Binding: covered" when only one of its
// three domains has an organ, and a terrain-only view reports "Link: covered"
// when only one of its three modes does. The 27 is the map; the faces are
// three useful ways to read it. This driver asserts the projection arithmetic
// (`assertGeometry`) instead of trusting this comment.
//
// THE LIMIT, AND IT IS THE POINT OF THIS FILE. `capacities.js` says in its own
// header that it is "A DATA TABLE, NOT A RUNTIME" which "starts — deliberately
// does not finish — the library seed." So a coverage run measures THE REGISTRY,
// not the instrument. Two kinds of hole are mixed together in any empty cell,
// and the raw count cannot tell them apart:
//
//   REAL INCAPACITY   — no organ exists anywhere. CON·Pattern is the confirmed
//                       case: P58 derived a FALSIFIABLE PREDICTION from the
//                       emptiness (a Figure-grain reader on Pattern-grain
//                       material returns ZERO edges, not few), stated it before
//                       writing the file, and confirmed it on a real fetched
//                       list page. That is how an empty cell earns the strong
//                       reading.
//   REGISTRY DEBT     — the organ exists and nothing declared its cell. SEG and
//                       REC both READ AS ZERO when this driver was first
//                       written, with real, running, tested organs unregistered
//                       (see UNREGISTERED below — the debt, paid under P64, and
//                       the live output now shows them covered). Reading such
//                       zeros as incapacity would have been false.
//
// So: AN EMPTY CELL IS A LEAD, NEVER A VERDICT. It reports "no organ is
// registered here" (withhold); it may report "this instrument cannot do this"
// (convict) only where a falsifiable prediction derived from the emptiness has
// been stated and confirmed. That is this repo's own constitutional line —
// a check may withhold, or convict, but may never manufacture the second out of
// the first (CLAUDE.md's grounding ladder; P41 restates it for a different
// cell) — applied to the capability map itself.
//
// Offline, no model call, no network. Re-runnable driver (P19/P27's posture),
// not a committed regression test.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { makeMoves } from "../moves.js";
import { CAPACITIES } from "../../eoreader7/native/organs/index.js";
import * as cube from "../../eoreader7/native/kernel/cube.js";
import { OPERATOR_ORDER } from "../../eoreader7/native/kernel/task-log.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "results", "capability-coverage.json");

// `moves.js` wants the legacy operators namespace; this checkout resolves the
// native kernel instead. `operatorOf` is SYNTHESIZED FROM `cellOf` rather than
// restated as a second table — the same discipline every organ here holds, so
// the shim can never disagree with the algebra it is shimming.
const operatorOf = (op) => {
  const c = cube.cellOf(op, "Figure");
  return c?.gap ? { gap: true, reason: c.reason } : { mode: c.mode, domain: c.domain };
};
const operators = {
  GRAINS: cube.GRAINS,
  TERRAIN_BY_DOMAIN: cube.TERRAIN_BY_DOMAIN,
  OPERATOR_ORDER,
  operatorOf,
};

/**
 * The projection arithmetic, asserted rather than commented. If any of these
 * fails the geometry claim above is wrong and every reading below is void.
 */
function assertGeometry() {
  const cells = cube.algebraAddresses();
  const checks = [];
  checks.push(["27 cells", cells.length === 27]);
  // operator is exactly (mode, domain): 9 operators, 9 distinct pairs.
  const opPairs = new Set(cells.map((c) => `${c.mode}|${c.domain}`));
  checks.push(["operator = (mode,domain), 9 distinct", opPairs.size === 9]);
  // Each of the three faces partitions 27 into 9 groups of exactly 3.
  for (const [name, key] of [
    ["stance = (mode,grain)", (c) => c.stance],
    ["terrain = (domain,grain)", (c) => c.terrain],
    ["operator", (c) => c.op],
  ]) {
    const groups = new Map();
    for (const c of cells) groups.set(key(c), (groups.get(key(c)) ?? 0) + 1);
    checks.push([`${name}: 9 groups of 3`, groups.size === 9 && [...groups.values()].every((n) => n === 3)]);
  }
  // A stance's 3 cells differ by DOMAIN; a terrain's 3 differ by MODE.
  const byStance = new Map();
  for (const c of cells) byStance.set(c.stance, [...(byStance.get(c.stance) ?? []), c]);
  checks.push(["each stance spans 3 distinct domains",
    [...byStance.values()].every((g) => new Set(g.map((c) => c.domain)).size === 3)]);
  const byTerrain = new Map();
  for (const c of cells) byTerrain.set(c.terrain, [...(byTerrain.get(c.terrain) ?? []), c]);
  checks.push(["each terrain spans 3 distinct modes",
    [...byTerrain.values()].every((g) => new Set(g.map((c) => c.mode)).size === 3)]);
  const failed = checks.filter(([, ok]) => !ok).map(([n]) => n);
  if (failed.length) throw new Error(`geometry assertion failed: ${failed.join("; ")}`);
  return checks.map(([name]) => name);
}

// Organs this driver CONFIRMED exist in the tree while the registry reported
// their operator as having zero coverage — the debt as FOUND on 2026-08-29,
// kept as the historical record. THE DEBT WAS PAID THE SAME DAY (P64): these
// organs (plus network.js/hl-acquire.js/mergeTestimony/compilePriors/
// atmosphereBoundaries, found in the same pass) are now registered in
// capacities.js, so the live coverage below should show them covered and the
// `paid` field on each row says whether the registry now carries its cell.
// Each was a real exported function or a real emitted entry, located by grep
// and read — not inferred from a filename. The list stays hand-maintained: an
// automatic scan would have to guess which functions ARE organs, which is
// exactly the judgment a registry exists to record.
// Each row's GRAIN comes from the organ's OWN documented typing — build-log's
// header states its EO cells outright, declarations.js writes `grain:
// "Pattern"` on its own entries, identity.js:182 writes `grain: "Figure"`,
// P53 states REC's void-loop cell as Generate·Pattern at Paradigm — never a
// grain chosen here to make coverage look better. A row with no citable grain
// would be left grainless and excluded from the projection below.
const UNREGISTERED = Object.freeze([
  { op: "REC", grain: "Pattern", where: "eoreader7/native/kernel/reaction.js::withdraw", basis: "takes back what a refuted Pattern-grain licence produced; the licence it re-zeros is grain: Pattern (declarations.js's own entries)" },
  { op: "REC", grain: "Pattern", where: "eoreader7/native/interpretation/declarations.js::concede", basis: "the entry it appends carries grain: \"Pattern\" in its own code" },
  { op: "REC", grain: "Figure", where: "the-fold/build-log.js::rezeroBuild", basis: "its own header: 'EVIDENCE · REC · Figure · produced'" },
  { op: "REC", grain: "Figure", where: "the-fold/grid.js::concedeEvaluation", basis: "mirrors rezeroBuild exactly (P36's own wording), EVIDENCE·REC·Figure" },
  { op: "REC", grain: "Pattern", where: "the-fold/void-loop.js::reshape", basis: "P53: REC is Generate·Pattern at Paradigm — the loop's own read-off cell" },
  { op: "SEG", grain: "Figure", where: "the-fold/build-log.js PATCH_OPS", basis: "the deletion primitive cuts one find-span out of one artifact — a Figure-grain cut; build-log's own SEG · snip row" },
  { op: "SEG", grain: null, where: "the-fold/grid.js `separate` verb", basis: "grid.js:409 refuses it at Ground grain; Figure or Pattern per the act's own declared terrain — a per-act cell, so no single grain is claimed here and this row is excluded from the projection" },
  { op: "SEG", grain: "Ground", where: "the-fold/void-shape.js SEG·Ground", basis: "declared in the module itself: [\"SEG\", \"Ground\", \"extent\", ...]" },
  { op: "SEG", grain: "Figure", where: "eoreader7/native/kernel/identity.js:182", basis: "emits { op: 'SEG', grain: 'Figure' } verbatim" },
]);

// The one cell whose emptiness EARNED the strong reading, and how — kept as
// the exemplar of HOW an incapacity conviction is earned, even though the
// cell itself has since been CLOSED: the reading was earned before
// network.js existed; P58's same pass then built network.js to occupy the
// cell (tested), and the P64 connection pass registered it. So CON·Pattern
// today reads covered, and this record is the historical proof that the
// strong reading is earnable, not a current claim of emptiness.
const CONFIRMED_INCAPACITY = Object.freeze([
  {
    cell: "CON·Pattern",
    terrain: "Network",
    prediction: "a Figure-grain reader on Pattern-grain material (a list, whose meaning is carried by the RECURRENCE of an arrangement rather than by any connector) returns ZERO edges, not few",
    stated: "before moves.js was written — see its own header",
    confirmed: "a real fetched 'List of prime ministers of Queen Victoria' page, saved with line structure intact, yielded zero edges; the model was handed raw lines and read the first name out of a list of ten",
    sinceClosed: "network.js (P58, tested) was built to occupy the cell and is registered as of P64 — the conviction was correct WHEN MEASURED and the organ that answers it now exists",
    reading: "a vocabulary gap degrades; a grain mismatch floors — the same KIND of ceiling no vocabulary work touches that MINE-1's nine configurations measured on different material (analogy, not identity: those configurations never ran against the list page)",
  },
]);

const geometry = assertGeometry();
const moves = makeMoves({ operators });
const cov = moves.coverage(CAPACITIES);

const stanceOf = (m) => cube.STANCE_BY_MODE[m.mode][m.grain];

const group = (keyFn) => {
  const g = new Map();
  for (const m of cov.moves) g.set(keyFn(m), [...(g.get(keyFn(m)) ?? []), m]);
  return [...g.entries()].map(([key, cells]) => ({
    key,
    filled: cells.filter((c) => c.organs.length).length,
    of: cells.length,
    cells: cells.map((c) => ({
      cell: c.cell, domain: c.domain, mode: c.mode, grain: c.grain, terrain: c.terrain,
      organs: c.organs,
    })),
  }));
};

const byStance = group(stanceOf);
const byTerrain = group((m) => m.terrain);
const byOperator = group((m) => m.op);
const byGrain = group((m) => m.grain);
const byMode = group((m) => m.mode);

const zeroOperators = byOperator.filter((g) => g.filled === 0).map((g) => g.key);
const unregisteredOps = new Set(UNREGISTERED.map((u) => u.op));
const registryDebt = zeroOperators.filter((op) => unregisteredOps.has(op));
const trulyUnreached = zeroOperators.filter((op) => !unregisteredOps.has(op));

// Per-row: is this historically-found debt now covered in the live registry?
const liveCells = new Set(cov.covered.map((m) => m.cell));
const debtLedger = UNREGISTERED.map((u) => ({
  ...u,
  cell: u.grain ? `${u.op}·${u.grain}` : null,
  paid: u.grain ? liveCells.has(`${u.op}·${u.grain}`) : null,
}));

// The AFTER-DEBT projection: coverage as it would read once the unregistered
// organs above are registered at their own documented cells. Computed, never
// hand-tallied, and clearly labelled a projection — nothing is registered by
// running this driver.
const debtCells = new Set(UNREGISTERED.filter((u) => u.grain).map((u) => `${u.op}·${u.grain}`));
const afterDebt = cov.moves.map((m) => ({ ...m, organs: m.organs.length ? m.organs : (debtCells.has(m.cell) ? ["(unregistered)"] : []) }));
const afterByStance = new Map();
for (const m of afterDebt) {
  const s = stanceOf(m);
  afterByStance.set(s, [...(afterByStance.get(s) ?? []), m]);
}
const afterStanceRows = [...afterByStance.entries()].map(([stance, cells]) => ({
  stance, filled: cells.filter((c) => c.organs.length).length, of: cells.length,
}));
const afterCovered = afterDebt.filter((m) => m.organs.length).length;

const out = {
  schema: "EOCapabilityCoverage@1",
  geometryAsserted: geometry,
  registry: {
    source: "capacities.js",
    entries: CAPACITIES.length,
    selfDescribed: "a DATA TABLE, NOT A RUNTIME — 'starts, deliberately does not finish, the library seed' (its own header)",
  },
  counts: {
    cells: cov.moves.length,
    covered: cov.covered.length,
    empty: cov.empty.length,
    illegal: cov.illegal.length,
  },
  byStance: byStance.map((g) => ({ stance: g.key, filled: g.filled, of: g.of, cells: g.cells })),
  byTerrain: byTerrain.map((g) => ({ terrain: g.key, filled: g.filled, of: g.of })),
  byOperator: byOperator.map((g) => ({ operator: g.key, filled: g.filled, of: g.of })),
  byGrain: byGrain.map((g) => ({ grain: g.key, filled: g.filled, of: g.of })),
  byMode: byMode.map((g) => ({ mode: g.key, filled: g.filled, of: g.of })),
  leads: cov.empty.map((m) => ({
    cell: m.cell, stance: stanceOf(m), terrain: m.terrain, grain: m.grain,
    ...moves.neighbours(m.cell, cov.covered),
  })),
  interpretation: {
    rule: "AN EMPTY CELL IS A LEAD, NEVER A VERDICT — three kinds of hole share the count: REGISTRY DEBT (an organ exists, nothing declared its cell), REAL INCAPACITY (convictable only via a stated-then-confirmed falsifiable prediction), and PROBE/HARNESS ERROR reported as incapacity (P44's four wrong probe versions; a hardcoded path reporting 'organ unreachable' as a statement about the system when it is a statement about a path). The map may withhold, or convict on a confirmed prediction; it may never manufacture the second out of the first or the third.",
    confirmedIncapacity: CONFIRMED_INCAPACITY,
    registryDebt: {
      operatorsReadingZeroThatHaveRealOrgans: registryDebt,
      ledger: debtLedger,
      reading: registryDebt.length
        ? `${registryDebt.join(" and ")} read as zero coverage and are NOT incapacities: real organs exist unregistered. The registry is the gap, not the instrument.`
        : "no zero-coverage operator currently has known unregistered organs — the historical debt (see ledger `paid` flags) has been paid into the registry (P64)",
    },
    trulyUnreachedOperators: trulyUnreached,
  },
  afterDebtProjection: {
    note: "coverage AS IT WOULD READ once the unregistered organs are registered at their own documented cells — a projection, nothing is registered by this driver",
    covered: afterCovered,
    of: cov.moves.length,
    byStance: afterStanceRows,
    stillEmpty: afterDebt.filter((m) => !m.organs.length).map((m) => m.cell),
  },
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));

// ── human-readable ────────────────────────────────────────────────────────
const pad = (s, n) => String(s).padEnd(n);
console.log(`geometry asserted: ${geometry.length} checks passed`);
console.log(`registry: ${CAPACITIES.length} entries — ${cov.covered.length}/${cov.moves.length} cells, ${cov.empty.length} empty, ${cov.illegal.length} illegal\n`);

console.log("STANCE (each spans 3 cells, one per domain)");
for (const g of byStance) {
  const mark = g.filled === 3 ? "FULL " : g.filled === 0 ? "EMPTY" : "PART ";
  console.log(`  ${mark} ${pad(g.key, 12)} ${g.filled}/3   ${g.cells.map((c) => c.organs.length ? `${c.cell}✓` : `${c.cell}·`).join("  ")}`);
}
console.log("\nGRAIN                          MODE");
for (let i = 0; i < 3; i += 1) {
  const a = byGrain[i], b = byMode[i];
  console.log(`  ${pad(a.key, 10)} ${a.filled}/${a.of} cells        ${pad(b.key, 14)} ${b.filled}/${b.of} cells`);
}
console.log("\nOPERATORS AT ZERO COVERAGE");
for (const op of zeroOperators) {
  const debt = UNREGISTERED.filter((u) => u.op === op);
  console.log(`  ${op}: ${debt.length ? `REGISTRY DEBT — ${debt.length} real organs exist unregistered` : "no organ located"}`);
  for (const d of debt) console.log(`      ${d.where} [${d.op}·${d.grain}]`);
}
console.log(`\nAFTER-DEBT PROJECTION (registering the organs above at their own documented cells): ${afterCovered}/${cov.moves.length}`);
for (const g of afterStanceRows) {
  const mark = g.filled === 3 ? "FULL " : g.filled === 0 ? "EMPTY" : "PART ";
  console.log(`  ${mark} ${pad(g.stance, 12)} ${g.filled}/3`);
}
console.log(`\n→ ${OUT}`);
