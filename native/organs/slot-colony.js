// slot-colony.js — THE REAL COLONY, SENT AT THE SLOTS OF A CODING UNIT, LIVING IN THE 27 HOUSES.
//
// Standing: NOMINATION, built 2026-10-01 on the operator's direction ("use our real swarm … and enhance the swarm by creating
// the 27 houses for them"). It is the structure-swarm's discipline (organs/structure-swarm.js: the colony may try anything and
// is believed about nothing) pointed at a different search: not "which pipeline finds structure in a series" but "which filler
// fills this slot". Same kernel, same rules:
//
//   STIGMERGY, NOT MESSAGES. Fillers never call each other. The only channel is the environment: the map of slots already
//   filled (a later filler reads it — a categorical decision needs the numbers an earlier expression produced) and the trail
//   ledger (kernel/stigmergy.js: a success deposits, a failure deposits nothing, evaporation demotes, a scout may still try
//   the untried). A slot a filler cannot fill YET is not an error; it is retried in the next pass, after the environment has
//   changed. Passes stop when one fills nothing.
//
//   THE GATE IS NOT THE FILLER'S SAY-SO. A candidate fills a slot only if `slot.holds(candidate)` is true: the runs the slot
//   was NOT shown. `null` means there was no held-out run to test it on, which is `unverifiable` and never a fill — a pass
//   with no evidence is not a pass. (The gate is the caller's, injected, the cast.js pattern; this file knows no contract.)
//
//   THE ORDER IS ONE OF FOUR, NAMED, SO THEY CAN BE COMPARED. The default is `declared`: of the four, none has been shown to beat it
//   by more than two events in 57 held-out slots (slot-colony-RESULTS.md), and a default that implies a benefit nobody measured is a claim:
//     declared   the caller's own array order (fielded-swarm.mjs hand-wrote its cheap-first order)
//     derived    the canonical chain of each species' HOUSE (code-habitat.js chainRank). The RANK is the cube's; its INPUT is the cell the
//                caller typed for each species, so `derived` compares two caller-authored orders, not "typed" against "from the cube"
//                (found by review, 2026-10-01: typing the cells differently yields any permutation, and the measurement confirmed it —
//                the order moved under the real species with one defensible re-housing)
//     reversed   the derived order backwards — a control built to cost more (II.23: a statistic that does not move when its
//                axis moves has resolved nothing, so the order metric must be shown to move)
//     learned    the pheromone order for the slot's structural KIND (kindOfSlot), falling back to the derived order for any
//                route that has never earned a trail. `online:false` (the default) reads only the trails it was GIVEN, so a
//                test run cannot teach itself — taught-on-A, judged-on-C is a real split.
//
//   THE NULL ARM. A colony is a search, and a search finds things in noise (signal.js: trying more raises the bar). `nullArm`
//   runs the same colony on slots whose targets were redealt across their examples; every fill there is a FALSE fill. A gate
//   that lets one through is leaky and the colony says so (`gate_leaky`) instead of reporting its real fills as established.
//
// Nothing here is a number the repo has not given: no exported thresholds. `explore` defaults to 0 (no scout; the kernel's own
// EXPLORE_EPSILON is what a caller passes if it wants one). That is NOT the same as deterministic: the kernel breaks equal-strength
// trail ties by mean LATENCY, so a learned order built from deposits made on the wall clock varies from run to run (measured:
// 4 distinct attempt sequences in 15 identical runs). Inject `clock` for a reproducible run.
//
// WHAT A SPECIES IS HANDED (found by review, 2026-10-01 — the first cut handed it the colony's own live objects):
//   slot    a frozen VIEW of the slot without its gate (`holds`) and without `redeal`. A species may read the slot's data; it may not
//           rewrite the gate, rename the slot, or read the held-out answers off the gate as an oracle.
//   env     { filled: a COPY of the map of fills so far, gate(candidate): the slot's gate, COUNTED }. A species that needs the gate
//           INSIDE its search (the species in fielded-swarm.mjs do: optional, coalesce, joinPresent and compose choose among
//           candidates by the held-out runs) must say so by calling env.gate — and the call is on the row (`gateCalls`), so a gate
//           used as a search oracle is visible and a null arm can tell whether it was ever exercised. The colony's own check still
//           runs on whatever the species returns; nothing a species does to `env` reaches the colony's record.
//   A fill, a trail and a row are written ONLY by the colony, from values it captured before the species ran.
import { deposit, routeOrderFor } from "../kernel/stigmergy.js";
import { chainRank, residentCell, cellKey } from "./code-habitat.js";

export const COLONY_SCHEMA = "EOSlotColony@1";
export const MODES = Object.freeze(["declared", "derived", "reversed", "learned"]);

const prim = (v) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);

/** a slot's STRUCTURAL kind from the values its shown examples take — a type, never a meaning ("number", "string?", "array<string>") */
export function kindOfSlot(values) {
  const vs = [...values];
  if (!vs.length) return "none";
  const base = new Set(vs.map(prim)), nn = [...base].filter((k) => k !== "null");
  if (!nn.length) return "null";
  if (nn.length > 1) return "mixed";
  let kind = nn[0];
  if (kind === "array") { const el = new Set(vs.filter(Array.isArray).flat().map(prim)); kind = el.size === 0 ? "array<empty>" : el.size === 1 ? `array<${[...el][0]}>` : "array<mixed>"; }
  return base.has("null") ? `${kind}?` : kind;
}

export const declaredOrder = (species) => species.map((s) => s.name);

/** the cold-start order from the cube: species sorted by the chain rank of their house, ties by the caller's own order */
export function derivedOrder(species) {
  return species
    .map((s, i) => { const c = residentCell(s.cell); return { name: s.name, i, r: chainRank([c.op, c.grain]) }; })
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.name);
}

/** a trail ledger with the same deposits but the association between a slot kind and its route broken — the control for "the order was learned" */
export function scrambleTrails(trails, rng = Math.random) {
  const entries = Object.entries(trails).flatMap(([head, list]) => list.map((t) => ({ head, t })));
  const routes = entries.map((e) => e.t.route);
  for (let i = routes.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [routes[i], routes[j]] = [routes[j], routes[i]]; }
  const out = {};
  entries.forEach((e, i) => { (out[e.head] ??= []).push({ ...e.t, route: routes[i] }); });
  return out;
}

const present = (v) => v !== null && v !== undefined;

function checkSlots(slots) {
  if (!Array.isArray(slots)) throw new TypeError("colonize: slots must be an array");
  const seen = new Set();
  for (const s of slots) {
    if (typeof s?.id !== "string" || !s.id) throw new TypeError(`colonize: every slot needs a non-empty string id (got ${JSON.stringify(s?.id)})`);
    if (seen.has(s.id)) throw new TypeError(`colonize: duplicate slot id ${JSON.stringify(s.id)} — a slot must be unique, or an unfilled one vanishes behind its twin`);
    seen.add(s.id);
    if (typeof s.kind !== "string") throw new TypeError(`colonize: slot ${JSON.stringify(s.id)} needs a string kind (a trail head is made of it), got ${typeof s.kind}`);
    if (typeof s.holds !== "function") throw new TypeError(`colonize: slot ${JSON.stringify(s.id)} has no gate (holds) — there is nothing to believe a candidate against`);
  }
}

/**
 * Send the colony at `slots`. A slot is `{ id, kind, holds(candidate) → true | false | null, redeal?(rot) }` plus whatever the species
 * read (the colony never looks inside). A species is `{ name, cell, fill(slotView, env) → candidate | null }` where `env.filled` is a copy
 * of the environment so far and `env.gate` is the slot's gate, counted. Returns the fills, the rows of every attempt, and the trails the
 * run deposited. `skipUnchanged` retries a (slot, species) pair in a later pass only if a fill has landed since its last attempt — the
 * default re-gates every unfilled slot every pass, which is what the first measurement registered and which couples `wasted` to the
 * number of passes.
 */
export async function colonize({ slots, species, mode = "declared", trails = {}, explore = 0, rng = Math.random, now = Date.now(), clock = () => performance.now(), online = false, skipUnchanged = false } = {}) {
  if (!MODES.includes(mode)) throw new TypeError(`colonize: mode ${JSON.stringify(mode)} is not one of ${MODES.join(", ")}`);
  if (new Set(species.map((s) => s.name)).size !== species.length) throw new TypeError("colonize: species names must be distinct — a trail's route IS the name");
  checkSlots(slots);
  const byName = new Map(species.map((s) => [s.name, s]));
  const house = new Map(species.map((s) => { const c = residentCell(s.cell); return [s.name, cellKey(c.op, c.grain)]; }));
  const base = mode === "declared" ? declaredOrder(species) : mode === "reversed" ? [...derivedOrder(species)].reverse() : derivedOrder(species);
  // everything the colony will believe about a slot is captured NOW, before any species has run
  const captured = slots.map((s) => {
    const { holds, redeal, ...data } = s;
    return { id: s.id, kind: s.kind, holds, view: Object.freeze({ ...data }) };
  });
  let written = trails;
  const orderFor = (kind) => (mode === "learned" ? routeOrderFor(online ? written : trails, `slot|${kind}`, { now, routes: base, explore, rng }) : base);
  const filled = new Map(), rows = [], tried = new Map();
  let passes = 0, progress = true;
  while (progress) {
    progress = false; passes++;
    for (const slot of captured) {
      if (filled.has(slot.id)) continue;
      const order = orderFor(slot.kind);
      for (let rank = 0; rank < order.length; rank++) {
        const sp = byName.get(order[rank]);
        if (!sp) continue;
        if (skipUnchanged) { const k = `${slot.id}\u0000${sp.name}`; if (tried.get(k) === filled.size) continue; tried.set(k, filled.size); }
        let gateCalls = 0;
        const env = { filled: new Map(filled), gate: (cand) => { gateCalls++; return slot.holds(cand); } };
        const t0 = clock();
        let cand = null, threw = false;
        try { cand = await sp.fill(slot.view, env); } catch { threw = true; }
        let outcome = "no-candidate", gateThrew = false;
        if (present(cand)) {
          let ok;
          try { ok = await slot.holds(cand); } catch { ok = false; gateThrew = true; }
          outcome = ok === true ? "filled" : ok === null ? "unverifiable" : "refused";
        }
        const ms = clock() - t0;
        rows.push({ pass: passes, slot: slot.id, kind: slot.kind, species: sp.name, cell: house.get(sp.name), rank, outcome, threw, gateThrew, gateCalls, gated: gateCalls > 0 || present(cand), ms });
        if (outcome === "filled") {
          filled.set(slot.id, { species: sp.name, cell: house.get(sp.name), candidate: cand, pass: passes, gateCalls });
          written = deposit(written, { head: `slot|${slot.kind}`, route: sp.name, ok: true, ms, at: now });
          progress = true;
          break;
        }
      }
    }
  }
  return Object.freeze({
    schema: COLONY_SCHEMA, mode, filled, unfilled: slots.filter((s) => !filled.has(s.id)).map((s) => s.id), rows, passes,
    attempts: rows.length, work: rows.filter((r) => r.outcome !== "no-candidate").length, wasted: rows.filter((r) => r.outcome === "refused" || r.outcome === "unverifiable").length,
    gateCalls: rows.reduce((a, r) => a + r.gateCalls, 0),
    selection: [...filled.values()].filter((f) => f.gateCalls >= 2).length,
    ms: rows.reduce((a, r) => a + r.ms, 0), trails: written === trails ? { ...trails } : written,
  });
}

/** the fills of a run as `[{ slot, species, cell }]`, the shape code-habitat.js `occupancy` takes */
export const fillsOf = (result) => [...result.filled].map(([slot, f]) => ({ slot, species: f.species, cell: f.cell }));

/**
 * Every slot redealt (targets rotated across its examples) — the slots a gate must NOT let anything fill. A redeal that equals the real
 * target (a constant field rotates to itself) is not a false target and is EXCLUDED, not counted as a leak; one that returns nothing is
 * `dropped`. The counts ride on the returned array as `.report` so a control that tried fewer slots than were asked for says so.
 */
export function redealt(slots, rots = [1, 2]) {
  const out = [], report = { requested: 0, produced: 0, identity: 0, dropped: 0 };
  let noRedeal = 0;
  for (const s of slots) {
    if (typeof s.redeal !== "function") { noRedeal++; continue; }
    for (const r of rots) {
      report.requested++;
      const d = s.redeal(r);
      if (!d) { report.dropped++; continue; }
      if (s.wants !== undefined && d.wants !== undefined && JSON.stringify(s.wants) === JSON.stringify(d.wants)) { report.identity++; continue; }
      report.produced++; out.push(d);
    }
  }
  return Object.assign(out, { report, noRedeal });
}

/**
 * The control built to fail. Runs the colony on redealt slots; every fill is false. The verdict is one of
 *   gate_leaky          a fill landed on a slot whose target was redealt — the gate let a false answer through
 *   untested            no slot, or no slot on which the gate was EVER EVALUATED (no species offered a candidate and none called env.gate)
 *   gate_holds_partial  nothing leaked, but the gate ran on only some of the slots (`unexercised` of them never saw a candidate)
 *   gate_holds          nothing leaked and the gate ran on every slot
 * "Nothing was filled" is a pass only where something was TRIED against the gate (found by review: a null arm with no redeals, no species,
 * or species that offer nothing on a redealt slot reported `gate_holds` having exercised nothing). Fills are counted from the rows, never
 * from the final map.
 */
export async function nullArm({ slots, species, mode = "declared" }) {
  const r = await colonize({ slots, species, mode });
  const filledRows = r.rows.filter((x) => x.outcome === "filled");
  const gated = new Set(r.rows.filter((x) => x.gated).map((x) => x.slot)).size;
  const unexercised = slots.length - gated;
  const verdict = filledRows.length > 0 ? "gate_leaky" : slots.length === 0 || gated === 0 ? "untested" : unexercised > 0 ? "gate_holds_partial" : "gate_holds";
  return Object.freeze({ tried: slots.length, gated, unexercised, falseFills: filledRows.length, filled: filledRows.map((x) => x.slot), verdict });
}
