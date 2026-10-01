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
//   THE ORDER IS ONE OF FOUR, NAMED, SO THEY CAN BE COMPARED:
//     declared   the caller's own array order (fielded-swarm.mjs hand-wrote its cheap-first order)
//     derived    the canonical chain of each species' HOUSE (code-habitat.js chainRank): derived from the cube, not typed
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
// Nothing here is a number the repo has not given: no exported thresholds. `explore` defaults to 0 (determinism); the kernel's
// own EXPLORE_EPSILON is what a caller passes if it wants a scout.
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

/**
 * Send the colony at `slots`. A slot is `{ id, kind, holds(candidate) → true | false | null, redeal?(rot) }` plus whatever the species
 * read (the colony never looks inside). A species is `{ name, cell, fill(slot, env) → candidate | null }` where `env.filled` is the
 * environment so far. Returns the fills, the rows of every attempt, and the trails the run deposited.
 */
export async function colonize({ slots, species, mode = "derived", trails = {}, explore = 0, rng = Math.random, now = Date.now(), clock = () => performance.now(), online = false } = {}) {
  if (!MODES.includes(mode)) throw new TypeError(`colonize: mode ${JSON.stringify(mode)} is not one of ${MODES.join(", ")}`);
  if (new Set(species.map((s) => s.name)).size !== species.length) throw new TypeError("colonize: species names must be distinct — a trail's route IS the name");
  const byName = new Map(species.map((s) => [s.name, s]));
  const house = new Map(species.map((s) => { const c = residentCell(s.cell); return [s.name, cellKey(c.op, c.grain)]; }));
  const base = mode === "declared" ? declaredOrder(species) : mode === "reversed" ? [...derivedOrder(species)].reverse() : derivedOrder(species);
  let written = trails;
  const orderFor = (slot) => (mode === "learned" ? routeOrderFor(online ? written : trails, `slot|${slot.kind}`, { now, routes: base, explore, rng }) : base);
  const filled = new Map(), rows = [];
  let passes = 0, progress = true;
  while (progress) {
    progress = false; passes++;
    for (const slot of slots) {
      if (filled.has(slot.id)) continue;
      const order = orderFor(slot);
      for (let rank = 0; rank < order.length; rank++) {
        const sp = byName.get(order[rank]);
        if (!sp) continue;
        const t0 = clock();
        let cand = null, threw = false;
        try { cand = await sp.fill(slot, { filled }); } catch { threw = true; }
        let outcome = "no-candidate";
        if (cand) { const ok = await slot.holds(cand); outcome = ok === true ? "filled" : ok === null ? "unverifiable" : "refused"; }
        const ms = clock() - t0;
        rows.push({ pass: passes, slot: slot.id, kind: slot.kind, species: sp.name, cell: house.get(sp.name), rank, outcome, threw, ms });
        if (outcome === "filled") {
          filled.set(slot.id, { species: sp.name, cell: house.get(sp.name), candidate: cand, pass: passes });
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
    ms: rows.reduce((a, r) => a + r.ms, 0), trails: written,
  });
}

/** the fills of a run as `[{ slot, species, cell }]`, the shape code-habitat.js `occupancy` takes */
export const fillsOf = (result) => [...result.filled].map(([slot, f]) => ({ slot, species: f.species, cell: f.cell }));

/** every slot redealt (targets rotated across its examples) — the slots a gate must NOT let anything fill */
export const redealt = (slots, rots = [1, 2]) => slots.filter((s) => typeof s.redeal === "function").flatMap((s) => rots.map((r) => s.redeal(r)).filter(Boolean));

/**
 * The control built to fail. Runs the colony on redealt slots; every fill is false. `falseFills === 0` is the only passing result;
 * anything else marks the gate leaky, and the caller must not present its real fills as established.
 */
export async function nullArm({ slots, species, mode = "declared" }) {
  const r = await colonize({ slots, species, mode });
  return Object.freeze({ tried: slots.length, falseFills: r.filled.size, filled: [...r.filled.keys()], verdict: r.filled.size === 0 ? "gate_holds" : "gate_leaky" });
}
