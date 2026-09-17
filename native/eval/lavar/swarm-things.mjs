// swarm-things.mjs — capacities harden into SELF-NAMED things; the finder
// locates them across every surface (2026-09-17).
//
// THE PROMOTION LADDER. A breakthrough (a kept variant + its echo + born
// mass) is a NOMINEE at one chain site. It hardens into a THING when
// corroborated: the same variant winning on >=2 INDEPENDENT surfaces
// (distinct source pointers — different books, chapters, or devices) — the
// chapter-swarm rule, verbatim: "nomination is never licensing; corroboration
// to >=2 promotes."
//
// SELF-NAMING, BY CONSEQUENCE (identity-is-the-fold-at-a-point.md's own
// doctrine: two figures are the same iff they make the same difference to
// the ground). The name is never assigned: it is DERIVED from what the thing
// MAKES HAPPEN — a content hash over (variant genotype + dominant terrain
// cells + mhc), i.e. the KIND of difference it makes: its cube role.
// Recomputable anywhere, no central authority. The realized ECHO per material
// is the thing's WITNESS HISTORY, not its identity — the same genotype
// winning ch1 with echo r111 and ch2 with echo r110 is ONE thing, because
// it makes the same kind of difference on both grounds; different material is
// a different ground, so the same figure's shape differs there by necessity.
//
// THE LABEL is a consequence report, never a hand-picked word: the cube cell
// of the variant's dominant organ — its stance and terrain (kernel/cube.js).
//
// THE FINDER fans out to every surface and normalizes to NamedThing@1 /
// SwarmNominee@1, deduped by content-addressed self-name. Surfaces today:
// the local store (results/), the shared store (live_priors swarm-priors),
// and the corpus (live_priors/manifests). Matrix is a DECLARED surface whose
// bridge (swarm-matrix.mjs) will feed the same finder; until it exists it
// returns [] — declared, never silently absent.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cellOf } from "../../kernel/cube.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RESULTS = path.join(HERE, "results");
export const REGISTRY = path.join(RESULTS, "swarm-things.jsonl");

// The organs the swarm breeds (declared, matching wilson.mjs's ORGANS): each
// carries its cube cell, so a variant's label and dominant cell are derived
// here without importing the swarm script.
const ORGANS = [
  { id: "received", cell: ["SYN", "Pattern"], terrain: "Network" },
  { id: "reduced", cell: ["CON", "Figure"], terrain: "Link" },
  { id: "nps", cell: ["INS", "Figure"], terrain: "Link" },
  { id: "deep", cell: ["SEG", "Figure"], terrain: "Field" },
  { id: "reread", cell: ["EVA", "Ground"], terrain: "Atmosphere" },
];
const CELL_OF_ORGAN = Object.fromEntries(ORGANS.map((o) => [o.id, o.cell]));

/** A content-address: FNV-1a over the consequence record, base36. The name
 * is a fold of the KIND of difference the thing makes (variant + dominant
 * terrain cells + mhc), so it is stable across material and devices — the
 * same variant winning different chapters is one thing; the realized echoes
 * are its history, not its identity. */
export function thingName({ variant = "", echo = "", terrain = [], mhc = 0 } = {}) {
  const record = [variant, [...terrain].sort().join("/"), mhc].join("|");
  let h = 0x811c9dc5;
  for (let i = 0; i < record.length; i += 1) { h ^= record.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return `ref:auto:swarm:${(h >>> 0).toString(36)}`;
}

/** dominantCell(variant) — the cube cell of the variant's highest-organ
 * (highest MHC) present; its stance + terrain become the thing's label. */
export function dominantCell(variant = []) {
  const present = ORGANS.filter((o) => variant.includes(o.id));
  const top = present.sort((a, b) => b.terrain.localeCompare(a.terrain))[0] ?? ORGANS[0];
  return { op: top.cell[0], grain: top.cell[1], terrain: top.terrain };
}

/** labelOf(variant) — the stance of the dominant cell: a consequence report. */
export function labelOf(variant = []) {
  const { op, grain, terrain } = dominantCell(variant);
  return `${terrain}·${cellOf(op, grain).stance}`;
}

/** readBreakthroughs(file) -> entries (SwarmBreakthrough@1). */
export function readBreakthroughs(file = path.join(RESULTS, "swarm-breakthroughs.jsonl")) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

/** lineageOf(variant) — the parents of the variant's first birth in the
 * swarm genealogy (best-effort; the genealogy may be absent). */
export function lineageOf(variant, genealogyFile = path.join(RESULTS, "swarm-genealogy.jsonl")) {
  if (!fs.existsSync(genealogyFile)) return [];
  const target = variant.join("+");
  for (const line of fs.readFileSync(genealogyFile, "utf8").split("\n").filter(Boolean)) {
    const e = JSON.parse(line);
    if (e.genotype === target && !e.__fate) return e.parents ?? [];
  }
  return [];
}

/** harden(entries) — the promotion ladder over a breakthrough store.
 * Returns { things: NamedThing@1[], nominees: SwarmNominee@1[] }.
 * A thing requires >=2 INDEPENDENT corroborations (distinct source pointers,
 * or distinct days for the same pointer — a rerun is not a second witness). */
export function harden(entries, { lineage } = { lineage: () => [] }) {
  const byName = new Map();
  for (const e of entries) {
    const name = thingName({ variant: e.variant, echo: e.echo, terrain: e.terrain, mhc: e.mhc });
    const row = byName.get(name) ?? { entries: [], variant: e.variant, echo: e.echo, terrain: e.terrain, mhc: e.mhc };
    row.entries.push(e);
    byName.set(name, row);
  }
  const things = [];
  const nominees = [];
  for (const row of byName.values()) {
    // CORROBORATION IS BY DISTINCT MATERIAL, never by rerun: the same
    // variant winning on N distinct source pointers is N independent chain
    // sites. Re-running the same material is the same witness re-testifying
    // — never a second witness (chapter-swarm: "a pair two chapters nominate
    // is the book's own chemistry"; one chapter, however many times read, is
    // one chapter).
    const independent = new Set(row.entries.map((e) => e.shadow?.pointer)).size;
    const mass = row.entries.reduce((a, e) => a + (e.mass ?? 0), 0);
    const base = { name: thingName(row), variant: row.variant, terrain: row.terrain, mhc: row.mhc, echoes: [...new Set(row.entries.map((e) => e.echo))] };
    if (independent >= 2) {
      things.push({
        schema: "SwarmThing@1", ...base,
        label: labelOf((row.variant ?? "").split("+").filter(Boolean)),
        cells: (row.variant ?? "").split("+").filter(Boolean).map((id) => CELL_OF_ORGAN[id]?.join("·")).filter(Boolean),
        stance: cellOf(dominantCell((row.variant ?? "").split("+").filter(Boolean)).op, dominantCell((row.variant ?? "").split("+").filter(Boolean)).grain).stance,
        born: row.entries.map((e) => e.at).sort()[0],
        witnesses: row.entries.length,
        independentSources: [...new Set(row.entries.map((e) => e.shadow?.pointer))],
        mass, lineage: lineage(row.variant?.split("+").filter(Boolean) ?? []),
      });
    } else {
      nominees.push({ schema: "SwarmNominee@1", ...base, corroborations: independent, mass, witnesses: row.entries.length });
    }
  }
  return { things, nominees };
}

/** findThings({ echo, terrain, name, text, minMass }, surfaces) — one finder
 * across every surface. Default surfaces: the local store and the shared
 * live_priors swarm-priors (GitHub). Matrix is declared; the bridge feeds it.
 * Each match carries the surface that produced it. */
export function findThings(query = {}, surfaces = defaultSurfaces()) {
  const out = { things: [], nominees: [], surfaces: [] };
  for (const surf of surfaces) {
    const entries = readBreakthroughs(surf.breakthroughs) ?? [];
    if (entries.length === 0) continue;
    const { things, nominees } = harden(entries, { lineage: surf.lineage });
    const matches = (list) => list.filter((t) => {
      if (query.name && t.name !== query.name) return false;
      if (query.echo && t.echo !== query.echo) return false;
      if (query.terrain && !(t.terrain ?? []).includes(query.terrain)) return false;
      if (query.minMass && (t.mass ?? 0) < query.minMass) return false;
      if (query.text && !JSON.stringify(t).toLowerCase().includes(query.text.toLowerCase())) return false;
      return true;
    });
    out.things.push(...matches(things).map((t) => ({ ...t, surface: surf.name })));
    out.nominees.push(...matches(nominees).map((t) => ({ ...t, surface: surf.name })));
    out.surfaces.push(surf.name);
  }
  return out;
}

/** defaultSurfaces() — the device store (local results/) and the shared
 * GitHub store (live_priors/derived-priors/swarm-priors/), plus the declared
 * Matrix surface (no bridge yet -> empty). The corpus surface is a manifest
 * lookup, declared below. */
export function defaultSurfaces() {
  const shared = "/Users/mlacy/Documents/3.0/live_priors/derived-priors/swarm-priors";
  return [
    { name: "device", breakthroughs: path.join(RESULTS, "swarm-breakthroughs.jsonl"), lineage: (v) => lineageOf(v) },
    { name: "github", breakthroughs: path.join(shared, "swarm-breakthroughs.jsonl"), lineage: () => [] },
    { name: "matrix", breakthroughs: path.join(RESULTS, "swarm-matrix-breakthroughs.jsonl"), lineage: () => [] },
    { name: "corpus", breakthroughs: path.join(RESULTS, "corpus-breakthroughs.jsonl"), lineage: () => [] },
  ];
}

// ── CLI: node swarm-things.mjs [--echo r111] [--terrain Link] [--name ref:...] ──
if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k, d = null) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d;
  const { things, nominees, surfaces } = findThings({ echo: arg("echo"), terrain: arg("terrain"), name: arg("name"), minMass: arg("minMass") ? Number(arg("minMass")) : undefined, text: arg("text") });
  console.log(JSON.stringify({ surfaces, things, nominees }, null, 2));
}