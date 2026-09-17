// swarm-persona.mjs — the device's CHARACTER, derived (never declared).
// Since 2026-09-16 every swarm birth carries its cell's STANCE
// (Clearing/Dissecting/Unraveling · Tending/Binding/Tracing ·
// Cultivating/Making/Composing), and every kept variant is preserved as a
// breakthrough with its terrain. A device's persona is the fold over that
// history: which stances it exercises and KEEPS, and which terrains its
// champions occupy. Two devices diverge because their kept sets differ —
// personality is the divergence, measured.
//
// The stance registers map to the cube's modes (kernel/cube.js):
//   Clearing/Dissecting/Unraveling  -> Differentiate  (a critical-analytic character)
//   Tending/Binding/Tracing         -> Relate         (a careful, connective character)
//   Cultivating/Making/Composing    -> Generate       (a generative character)
//
// usage: node swarm-persona.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readBreakthroughs, harden } from "./swarm-things.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RESULTS = path.join(HERE, "results");
const GENEALOGY = path.join(RESULTS, "swarm-genealogy.jsonl");

const STANCE_MODE = {
  Clearing: "Differentiate", Dissecting: "Differentiate", Unraveling: "Differentiate",
  Tending: "Relate", Binding: "Relate", Tracing: "Relate",
  Cultivating: "Generate", Making: "Generate", Composing: "Generate",
};

/** readGenealogy() — births (no __fate) and fates, best-effort. */
export function readGenealogy(file = GENEALOGY) {
  if (!fs.existsSync(file)) return { births: [], fates: [] };
  const births = [];
  const fates = [];
  for (const l of fs.readFileSync(file, "utf8").split("\n").filter(Boolean)) {
    const e = JSON.parse(l);
    if (e.__fate) fates.push(e); else births.push(e);
  }
  return { births, fates };
}

/** stanceProfile(genealogy) — how the device exercises each stance, and how
 * often it KEEPS what it tries in that stance. { tried, kept, keptRate } per
 * stance, plus the dominant stance (most kept). */
export function stanceProfile({ births = [], fates = [] } = {}) {
  const tried = {};
  const kept = {};
  // Only stance-typed births carry character (pre-2026-09-16 births recorded
  // no stance). An un-stanced birth is instrument history, not personality.
  for (const b of births) { const s = b.stance; if (s && STANCE_MODE[s]) tried[s] = (tried[s] ?? 0) + 1; }
  for (const f of fates) if (f.fate === "kept" && f.stance && STANCE_MODE[f.stance]) kept[f.stance] = (kept[f.stance] ?? 0) + 1;
  const stances = [...new Set([...Object.keys(tried), ...Object.keys(kept)])];
  const profile = {};
  for (const s of stances) profile[s] = {
    stance: s, mode: STANCE_MODE[s] ?? "?", tried: tried[s] ?? 0, kept: kept[s] ?? 0,
    keptRate: Number((tried[s] ? kept[s] / tried[s] : 0).toFixed(3)),
  };
  const modeAgg = {};
  for (const p of Object.values(profile)) {
    modeAgg[p.mode] = modeAgg[p.mode] ?? { tried: 0, kept: 0 };
    modeAgg[p.mode].tried += p.tried;
    modeAgg[p.mode].kept += p.kept;
  }
  // Character is what the device KEEPS, not what it tries: most kept wins;
  // a tie goes to the stance that kept at the higher rate (efficiency), then
  // to the one tried more (commitment).
  const dominant = Object.values(profile).sort((a, b) =>
    (b.kept - a.kept) || (b.keptRate - a.keptRate) || (b.tried - a.tried))[0] ?? null;
  const modeKept = Object.entries(modeAgg).sort((a, b) => b[1].kept - a[1].kept);
  const dominantMode = modeKept[0] && modeKept[0][1].kept > 0 ? modeKept[0][0] : null;
  return { stances: profile, modes: modeAgg, dominant, dominantStance: dominant?.stance ?? null, dominantMode };
}

/** terrainEmphasis(breakthroughs) — the terrains the device's winners occupy:
 * a distribution over Link/Field/Network/Atmosphere/… — where its character
 * is expressed. */
export function terrainEmphasis(entries = readBreakthroughs()) {
  const counts = {};
  for (const e of entries) for (const t of e.terrain ?? []) counts[t] = (counts[t] ?? 0) + 1;
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  return Object.fromEntries(Object.entries(counts).map(([t, c]) => [t, c / total]).sort((a, b) => b[1] - a[1]));
}

/** modalityEmphasis(entries) — the modalities the device's winners occupy
 * (text / vision / audio / code): where its character is expressed. */
export function modalityEmphasis(entries = readBreakthroughs()) {
  const counts = {};
  for (const e of entries) counts[e.modality ?? "text"] = (counts[e.modality ?? "text"] ?? 0) + 1;
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  return Object.fromEntries(Object.entries(counts).map(([m, c]) => [m, c / total]).sort((a, b) => b[1] - a[1]));
}

/** persona() — the DevicePersona@1: device id, the stance/mode profile, the
 * terrain emphasis, the modality emphasis, and the hardened things it owns. */
export function persona({ device = null, genealogy = readGenealogy(), entries = readBreakthroughs() } = {}) {
  const profile = stanceProfile(genealogy);
  const terrain = terrainEmphasis(entries);
  const modality = modalityEmphasis(entries);
  const { things } = harden(entries);
  return {
    schema: "DevicePersona@1",
    device,
    character: {
      dominantStance: profile.dominant?.stance,
      dominantMode: profile.dominantMode,
      stanceProfile: profile.stances,
      modeEmphasis: profile.modes,
    },
    terrainEmphasis: terrain,
    modalityEmphasis: modality,
    ownsThings: things.map((t) => ({ name: t.name, label: t.label, variant: t.variant, modalities: t.modalities ?? ["text"] })),
    at: new Date().toISOString().slice(0, 10),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dev = fs.existsSync(path.join(RESULTS, ".device-id")) ? fs.readFileSync(path.join(RESULTS, ".device-id"), "utf8").trim() : null;
  console.log(JSON.stringify(persona({ device: dev }), null, 2));
}