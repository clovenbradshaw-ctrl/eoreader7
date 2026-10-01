// code-habitat.js — THE 27 HOUSES: where a colony of slot-fillers lives, for one coding unit.
//
// Standing: NOMINATION. Written 2026-10-01 on the operator's direction: "use our real swarm … and enhance the swarm by
// creating the 27 houses for them." The houses are the 27 cells of the cube (kernel/cube.js `algebraAddresses`: nine
// operators × three grains). For a coding unit — one function, with a signature, examples, and output fields — each cell
// is a different QUESTION about the unit, and a filler (a "species": copy, compose, decide, …) lives in the house whose
// act it performs. The wall that makes this a habitat and not a decoration is stated once and held by a test:
//
//   THE CUBE IS NOT A CONTENT CLASSIFIER (CLAUDE.md, the-fold; measured: 95.7% of cell assignments survived shuffling the
//   words inside 2,527 paragraphs). So nothing here derives a house from what a unit's code or prose SAYS. Relevance is a
//   function of the unit's STRUCTURE only (does it have output fields at all), and a species' house is declared from the
//   act it performs and checked by the engine's own `cellOf` — never read off a name.
//
// WHAT THE HOUSES BUY, in the order they are used by slot-colony.js:
//   1. A COLD-START ORDER THAT IS DERIVED, NOT HAND-SET. The canonical operator chain (kernel/cube.js OPERATOR_CHAIN —
//      domain-major: Existence before Structure before Interpretation) orders houses; a species that lives earlier in the
//      chain is tried first. fielded-swarm.mjs hand-wrote "copy, then compose, then the rest" and called it "the order the
//      stigmergy would learn"; the chain says it from the cube, and the colony measures whether the two agree.
//   2. A COVERAGE MAP. Houses with a resident, houses with none, and the houses a fill actually landed in. An empty house
//      that the unit's structure makes relevant is a LEAD for the next species — never a verdict that nothing lives there
//      (THE-27-CELLS: an empty cell is a lead, never a verdict).
//   3. A TYPED ADDRESS for every deposit: a fill lands in a named cell, so a trail names an act, not a function name.
//
// What this module is NOT: it fills nothing, calls no model, and settles nothing. A house is `settledBy` something outside
// it, or it says `unmeasured`. That list is the honest part: most houses have nothing on main that settles them yet.
//
// The 27 questions below are MY READING of what each cell asks of a coding unit (basis: declared, 2026-10-01, this file);
// each is checkable against the cell's mode, domain and grain (cellOf gives them), and every one is revisable.
import { algebraAddresses, cellOf, OPERATOR_CHAIN, GRAINS } from "../kernel/cube.js";

export const HABITAT_SCHEMA = "EOCodeHabitat@1";

/** the cell key used everywhere in this module and its callers: `CON·Figure` */
export const cellKey = (op, grain) => `${op}·${grain}`;

// One question per house. Existence asks what the unit IS; Structure how it is ARRANGED; Interpretation how it is JUDGED.
// Within a domain the three modes are Differentiate (cut/declare), Relate (bind/compare), Generate (make/compose); the three
// grains are Ground (the frame), Figure (the particulars — the output fields), Pattern (what recurs across them).
const ASKS = Object.freeze({
  // ── Existence: what is ──
  "NUL·Ground": "What may the unit not touch — effects, the clock, its own arguments?",
  "SIG·Ground": "What must resolve for the unit to exist: its name and the parameters it takes, in order?",
  "INS·Ground": "What is declared: one function by this name, nothing else?",
  "NUL·Figure": "What does an output field do with an absent value — null, a missing key, an empty list?",
  "SIG·Figure": "Which input values does each output field read?",
  "INS·Figure": "Which output fields come into being, and what value does each take in every example?",
  "NUL·Pattern": "What kind of unit is this one not?",
  "SIG·Pattern": "What shape does its answer have — a scalar, a flat object, a list?",
  "INS·Pattern": "Which shared, verified operations may it be built from?",
  // ── Structure: how it is arranged ──
  "SEG·Ground": "Over what extent of inputs must it hold — the cases it was shown, and the cases it was not?",
  "CON·Ground": "How does its argument bind to what the caller really has: the names and the order of what it receives?",
  "SYN·Ground": "How do its parameters compose into one call?",
  "SEG·Figure": "Which output fields are separable — can each be filled on its own?",
  "CON·Figure": "Which output field is a direct copy of one input path?",
  "SYN·Figure": "Which output field is an expression over the inputs?",
  "SEG·Pattern": "Where does the unit divide into a per-item part and a walk over the items?",
  "CON·Pattern": "Which operations does it call, and which does each of those call?",
  "SYN·Pattern": "How is a list-valued field produced from an input list?",
  // ── Interpretation: how it is judged ──
  "DEF·Ground": "Which conventions decide correctness — units, rounding, argument order?",
  "EVA·Ground": "What examples and runs is it judged against, and who wrote them?",
  "REC·Ground": "What in those conventions would a failure reopen?",
  "DEF·Figure": "Which output field is a categorical decision over values the unit already computed?",
  "EVA·Figure": "Which output field picks, ranks or compares the items of a list?",
  "REC·Figure": "Which field, failing alone, is drawn again alone?",
  "DEF·Pattern": "What closes the unit — every field filled and every run reproduced?",
  "EVA·Pattern": "Does the composed unit reproduce the runs it was not shown?",
  "REC·Pattern": "What forces the whole declaration to be revised?",
});

// The houses where a filler can stand are the ones about the PARTICULARS (every Figure cell) and the one about list
// production (SYN·Pattern). Those are relevant only when the unit has output fields; the rest are about the unit as a whole.
const FIELD_LEVEL = new Set([...OPERATOR_CHAIN.map((op) => cellKey(op, "Figure")), cellKey("SYN", "Pattern")]);

/** a unit's STRUCTURE — counts and shapes, never what its words mean. `contract` is `{ name, params, runs: [{ args(), want() }] }`. */
export function unitOf(contract, { shown = 3 } = {}) {
  const runs = contract?.runs ?? [];
  const wants = runs.slice(0, shown).map((r) => r.want());
  const flat = wants.length > 0 && wants.every((w) => w !== null && typeof w === "object" && !Array.isArray(w));
  const allArrays = wants.length > 0 && wants.every(Array.isArray);
  const shape = flat ? "object" : allArrays ? "list" : wants.length && wants.every((w) => ["string", "number", "boolean"].includes(typeof w) || w === null) ? "scalar" : "unknown";
  return Object.freeze({
    name: contract?.name ?? null,
    params: Object.freeze([...(contract?.params ?? [])]),
    shown: wants.length,
    held: Math.max(0, runs.length - shown),
    shape,
    keys: Object.freeze(flat ? [...new Set(wants.flatMap(Object.keys))] : []),
  });
}

/** rank of a house in the canonical chain: operator position (domain-major), then grain. Accepts "OP·Grain" or [op, grain]. */
export function chainRank(cell) {
  const [op, grain] = Array.isArray(cell) ? cell : String(cell).split("·");
  const at = OPERATOR_CHAIN.indexOf(op), g = GRAINS.indexOf(grain);
  if (at < 0 || g < 0) throw new TypeError(`chainRank: no such house ${JSON.stringify(cell)}`);
  return at * GRAINS.length + g;
}

/** a resident's house, validated by the engine's own cube. Throws a typed error for a cell that is not one of the 27. */
export function residentCell(cell) {
  const [op, grain] = Array.isArray(cell) ? cell : String(cell).split("·");
  const c = cellOf(op, grain);
  if (c?.gap) throw new TypeError(`residentCell: ${JSON.stringify(cell)} is not a house — ${c.reason ?? c.gap}`);
  return c;
}

/**
 * The 27 houses for one unit. `residents` is `[{ name, cell }]` — the species the colony can send; each is placed in the house
 * its `cell` names. A house is `not-relevant` (a per-field house of a unit with no output fields), `resident` (a species can
 * live here), or `empty` (relevant, and nothing lives here: a LEAD). `settledBy` names what could decide the house, or says
 * `unmeasured`.
 */
export function housesFor(unit, residents = []) {
  const byCell = new Map();
  for (const r of residents) { const c = residentCell(r.cell); const k = cellKey(c.op, c.grain); byCell.set(k, [...(byCell.get(k) ?? []), r.name]); }
  const houses = algebraAddresses().map((c) => {
    const key = cellKey(c.op, c.grain);
    if (!ASKS[key]) throw new TypeError(`housesFor: house ${key} has no question — the table is out of step with the cube`);
    const relevant = FIELD_LEVEL.has(key) ? unit.keys.length > 0 : true;
    const here = byCell.get(key) ?? [];
    return Object.freeze({
      cell: key, op: c.op, grain: c.grain, mode: c.mode, domain: c.domain, terrain: c.terrain, stance: c.stance,
      asks: ASKS[key], relevant, residents: Object.freeze(here), occupants: Object.freeze([]),
      settledBy: here.length ? "held-out gate" : key === "EVA·Ground" ? "the contract's own runs" : "unmeasured",
      status: !relevant ? "not-relevant" : here.length ? "resident" : "empty",
    });
  });
  return Object.freeze(houses);
}

/** land fills in the houses they name: `fills` is `[{ slot, species, cell }]`. A house is `occupied` only when a fill names its cell. */
export function occupancy(houses, fills = []) {
  const at = new Map();
  for (const f of fills) { const c = residentCell(f.cell); const k = cellKey(c.op, c.grain); at.set(k, [...(at.get(k) ?? []), `${f.slot}←${f.species}`]); }
  return Object.freeze(houses.map((h) => {
    const occ = at.get(h.cell) ?? [];
    return Object.freeze({ ...h, occupants: Object.freeze(occ), status: occ.length ? "occupied" : h.status });
  }));
}

/** relevant houses with nothing living in them — the next species to build, never a verdict that none can live there */
export const leads = (houses) => houses.filter((h) => h.relevant && h.residents.length === 0 && h.occupants.length === 0);

/** a plain-language table of the habitat, for a status line or a results file */
export function describe(houses) {
  const lines = houses.map((h) => `${h.cell.padEnd(11)} ${h.terrain.padEnd(10)} ${h.status.padEnd(12)} ${h.occupants.length ? h.occupants.join(", ") : h.residents.join(", ")}`.trimEnd());
  const counts = houses.reduce((a, h) => ({ ...a, [h.status]: (a[h.status] ?? 0) + 1 }), {});
  return `${lines.join("\n")}\n— ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(" · ")} of ${houses.length} houses`;
}
