// capacity-swarm.mjs — every capacity in the registry is a swarmable ant.
//
// User direction (verbatim): "any capacity the system has whatsoever should
// be swarmable, finding signal from noise" + "any increased capabilities
// needs to automatically generate a type of ant that can be swarmed on a
// problem just by pointing it with NL in a chat".
//
// Design (descends the received count, renames nothing):
//   1. AUTO-GENERATION. capacityAnts() reads the LIVE registry
//      (organs/capacities.js :: listCapacities) on every call. A new
//      registry row is a new ant type with zero code change here — the
//      whole mechanism for "increased capabilities auto-generate an ant".
//   2. NL POINTING. pointCapacities(nl) maps a raw chat string to a subset
//      of the registry by mechanical keyword match (id / terrain / content
//      words >= 4 chars against id+terrain+what). "swarm everything / try
//      all capacities / anything whatsoever" points at the whole registry.
//      No model call, no fuzzy nearest-match guess (capacities.js's own
//      refusal discipline); no match is a typed gap, never a silent empty.
//   3. SIGNAL FROM NOISE. swarmCapacities() runs the pointed ants through
//      eoSwarm VERBATIM (same BREED/DIFFERENTIATE/gate wilson.mjs breeds
//      through). Fitness is measured yield from the caller's own
//      runCapacity: referent/edge/filler counts; a reference-only capacity
//      (capacity-runner.js `not_yet_executable`) yields 0, so noise never
//      admits — only measured improvement over the caller's own bar clears
//      the elenchus (elenchus-bar.mjs) + born mass. Trying more capacities
//      raises the born-mass bar rather than lowering it (signal.js hazard
//      (a)): the gate's discipline, inherited, not reimplemented.
//   4. CHAT HOOK. detectSwarmIntent(nl) is the one predicate a chat surface
//      (proxy-runner.mjs, TUI) calls to route a turn here. Pure.
//
// This file adds NO breed/mutate/select logic and hand-sets NO threshold:
// `bar` is REQUIRED from the caller (their measured rerun floor).
import { listCapacities } from "../../organs/capacities.js";
import { eoSwarm, personaOf } from "./eo-swarm.mjs";
import { TERRAIN_BY_DOMAIN } from "../../kernel/cube.js";

// Inverse terrain -> grain, derived from the kernel's own table (never a
// second hand list to drift): Void/Field/Atmosphere=Ground,
// Entity/Link/Lens=Figure, Kind/Network/Paradigm=Pattern.
const GRAIN_OF_TERRAIN = (() => {
  const m = new Map();
  for (const [domain, grains] of Object.entries(TERRAIN_BY_DOMAIN))
    for (const [grain, terrain] of Object.entries(grains)) m.set(terrain, grain);
  return m;
})();

const KNOWN_OPS = new Set(["NUL", "SIG", "INS", "SEG", "CON", "SYN", "DEF", "EVA", "REC"]);

/** capacityAnt(cap) — one registry row -> one ant. op takes the row's
 * first known operator token ("SIG+INS" -> SIG); grain is derived from
 * the row's terrain via the kernel table. A row with no known op or no
 * known terrain still becomes an ant, but with no cube coordinates — so
 * personaOf() returns its typed `no_cube_coordinates` gap rather than an
 * invented persona. Pure. */
export function capacityAnt(cap) {
  const op = String(cap?.op ?? "").split(/[+/\s]+/).find((t) => KNOWN_OPS.has(t)) ?? null;
  const grain = GRAIN_OF_TERRAIN.get(cap?.terrain) ?? null;
  return Object.freeze({
    id: cap?.id ?? null, ids: [cap?.id ?? "unknown"],
    op, grain, terrain: cap?.terrain ?? null,
    capacity: cap?.id ?? null,
  });
}

/** capacityAnts(caps?) — the whole registry as ants. Defaults to the LIVE
 * registry, so a newly registered capability is swarmable with no change
 * here. Accepts an explicit list only for tests. Pure. */
export function capacityAnts(caps = listCapacities()) {
  return (caps ?? []).map(capacityAnt);
}

/** SWARM_INTENT_RE — the chat phrases that route a turn to the swarm.
 * Mechanical substring match over a closed list, never a model verdict. */
export const SWARM_INTENT_RE = /swarm|try\s+(everything|all|every\s+capacit)|use\s+all\s+capacit|point\s+.*ants?|dispatch\s+.*ants?|signal\s+from\s+noise|whatever\s+(it\s+takes|works)|all\s+capacities/i;

/** detectSwarmIntent(nl) — should this chat turn route to the swarm?
 * Returns { swarm: boolean, reason }. Pure. */
export function detectSwarmIntent(nl) {
  const text = String(nl ?? "");
  const swarm = SWARM_INTENT_RE.test(text);
  return { swarm, reason: swarm ? "nl names swarming/ants/every-capacity" : "no swarm phrasing" };
}

const ALL_WORDS_RE = /swarm\s+everything|try\s+everything|all\s+capacit|every\s+capacit|anything\s+whatsoever|whatever\s+(it\s+takes|works)|use\s+everything|signal\s+from\s+noise/i;

/** pointCapacities(nl, caps?) — NL string -> pointed registry subset.
 * "everything/all/anything whatsoever" points at the whole registry;
 * otherwise each content word (>= 4 chars) votes for capacities whose
 * id/terrain/what contains it; every capacity with >= 1 vote is pointed.
 * No vote is a typed gap (`no_pointing`), never a silent empty run. Pure. */
export function pointCapacities(nl, caps = listCapacities()) {
  const all = caps ?? [];
  const text = String(nl ?? "");
  if (ALL_WORDS_RE.test(text)) return { pointed: all, ants: capacityAnts(all), mode: "all" };
  const lowered = text.toLowerCase();
  // Exact-id pass first: a capacity named by its registry id is addressed,
  // never guessed — this also reaches ids below the content-word floor
  // ("web" is 3 chars; no id is a substring of another, checked
  // 2026-09-19, so containment cannot over-point).
  const exact = all.filter((c) => lowered.includes(String(c.id).toLowerCase()));
  if (exact.length) return { pointed: exact, ants: capacityAnts(exact), mode: "pointed" };
  const words = [...new Set(lowered.split(/[^a-z0-9]+/).filter((w) => w.length >= 4))];
  // Two passes: id/terrain hits first (exact addressing — "the cast ant"
  // points at cast, never at every row whose prose mentions "this"); the
  // free-text `what` match runs ONLY when nothing was addressed by name.
  const byName = all.filter((c) => {
    const hay = `${c.id} ${c.terrain}`.toLowerCase();
    return words.some((w) => hay.includes(w));
  });
  if (byName.length) return { pointed: byName, ants: capacityAnts(byName), mode: "pointed" };
  const pointed = all.filter((c) => {
    const hay = String(c.what ?? "").toLowerCase();
    return words.some((w) => hay.includes(w));
  });
  if (!pointed.length) return { gap: "no_pointing", reason: `no registry row matches "${text.slice(0, 120)}" — name a capacity, terrain, or "swarm everything"`, mode: "gap" };
  return { pointed, ants: capacityAnts(pointed), mode: "pointed" };
}

/** yieldOf(result) — measured signal from one runCapacity output:
 * referent / edge / filler / claim counts; any gap (not_yet_executable,
 * no_material, bad_query) yields 0 — noise that can never admit. Pure. */
export function yieldOf(result) {
  if (!result || typeof result !== "object" || result.gap) return 0;
  if (Array.isArray(result.referents)) return result.referents.length;
  if (Array.isArray(result.fillers)) return result.fillers.length;
  if (Array.isArray(result.edges)) return result.edges.length;
  if (Array.isArray(result.claims)) return result.claims.length;
  if (Number.isFinite(result.count)) return result.count;
  return 0;
}

/** swarmCapacities({ nl, runCapacity, material, bar, name, query, claim })
 * — point ants at a problem with NL, then run Wilson's own round.
 * runCapacity(id, { text, name, query, claim }) REQUIRED (the caller's own
 * capacity-runner.js dispatch); bar REQUIRED (caller's measured floor);
 * material = { text, name } (may be empty — empty material just yields 0
 * everywhere except through gaps, and the gate refuses it all, honestly).
 * Returns { swarm, reports, pointed, mode } where reports[] carries each
 * seed ant's yield + persona + raw result/gap. */
export function swarmCapacities({ nl, runCapacity, material = {}, bar, name, query, claim } = {}) {
  if (typeof runCapacity !== "function") throw new Error("swarmCapacities: runCapacity(id, args) is required");
  if (!Number.isFinite(bar)) throw new Error("swarmCapacities: bar (caller's measured elenchus bar) is required");
  const pointing = pointCapacities(nl);
  if (pointing.gap) return { gap: pointing.gap, reason: pointing.reason, pointed: [], mode: "gap" };
  const text = material.text ?? "";
  const groundName = name ?? material.name ?? "chat-material";
  const yields = new Map();
  const reports = [];
  for (const ant of pointing.ants) {
    let result = null;
    try {
      result = runCapacity(ant.capacity, { text, name: groundName, query, claim });
    } catch (err) {
      result = { gap: "capacity_threw", id: ant.capacity, detail: String(err?.message ?? err) };
    }
    const y = yieldOf(result);
    yields.set(ant.capacity, y);
    reports.push({ ...ant, persona: personaOf(ant), yield: y, result });
  }
  const terrainOf = (ids) => ids.map((id) => pointing.pointed.find((c) => c.id === id)?.terrain ?? "Lens");
  const terrainOfOrgan = (id) => pointing.pointed.find((c) => c.id === id)?.terrain ?? "Lens";
  const depsOf = () => [];
  const fitness = (ids) => ids.reduce((a, id) => a + (yields.get(id) ?? 0), 0);
  const swarm = eoSwarm({ ants: pointing.ants, fitness, terrainOf, legal: () => true, bar, depsOf, terrainOfOrgan });
  return { swarm, reports, pointed: pointing.pointed.map((c) => c.id), mode: pointing.mode };
}
