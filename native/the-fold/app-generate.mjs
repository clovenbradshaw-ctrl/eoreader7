// ═══ LOVELACE · TEACH IT TO FISH ═══ Owner: Lovelace (archon-holocracy role:lovelace, Coding Capability Circle).
// STEERED BUILD: a person hand-built this so the system could do what the prompt asked. It is ledger row 5, 7 in
// TEACH-IT-TO-FISH.md, not the goal. Close the row (the prompt alone produces this); do not add more of it.
// app-generate.mjs — draw the leaves, then hold the composed whole to the whole-response oracles.
//
//   generateUnits({ mouths, mouth, trails, cache, see })
//     1. every LEAF contract goes to makeUnit: the stigmergy's learned mouth order, a bounded
//        repair loop fed the oracle's own failures, a verified leaf cached under its contract hash
//     2. when every leaf passes, each FULL unit is composed (app-compose.mjs, hand-written) from the
//        drawn leaves and run against the whole-response oracles — an integration failure is reported
//        as that, never as a model failure, and nothing ships
//
// CLI:  node app-generate.mjs --work <dir> [--mouths a,b,c] [--only leafName,leafName] [--repair edit|fresh] [--decompose whole|fields] [--carry] [--species] [--anchors <dir>]  (repair: edit | fresh | fold)
//   <dir>/unit-cache/  verified leaves by contract hash   <dir>/trails.json  the stigmergy's trails
//   <dir>/build-ledger.jsonl  every order, draw, verdict (append-only)   <dir>/units.json  the result for the assembler
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { LEAF_CONTRACTS } from "./app-leaves.mjs";
import { UNIT_CONTRACTS } from "./app-weather-fuel.mjs";
import { COMPOSE, LEAVES_OF } from "./app-compose.mjs";
import { speciesHook } from "./app-species.mjs";
import { makeUnit, makeFieldedUnit, makeMouth, openUnitCache, loadTrails, saveTrails, testFunction, loadUnit } from "./app-units.mjs";

/** The structural default order of mouths, cheapest first — small local models only (operator direction 2026-09-30: no larger coder). The learned order (stigmergy) reorders it. */
export const DEFAULT_MOUTHS = ["qwen2.5-coder:1.5b", "gemma2:2b"];

export async function generateUnits({ mouths = DEFAULT_MOUTHS, mouth = makeMouth(), trails = {}, cache = null, see = () => {}, only = null, now = Date.now(), rng = Math.random, repair = "edit", decompose = "whole", carry = false, anchorDir = null, species = null } = {}) {
  const leaves = {}; let gap = null;
  for (const c of LEAF_CONTRACTS) {
    if (only && !only.includes(c.name)) continue;
    const r = await (decompose === "fields" ? makeFieldedUnit : makeUnit)(c, { mouths, mouth, trails, cache, see, now, rng, repair, carry, anchorDir, species });
    trails = r.trails;
    leaves[c.name] = { ok: r.ok, code: r.code, model: r.model, calls: r.calls, rounds: r.rounds, cached: r.cached, ms: r.ms, hash: null, failures: r.failures, declared: r.declared ?? {}, resolutions: r.resolutions ?? [], bySpecies: r.bySpecies ?? {} };
    if (!r.ok) gap ??= { type: "leaf_failed", leaf: c.name, failures: r.failures.slice(0, 3) };
  }
  const whole = {};
  if (!gap && !only) {
    for (const full of UNIT_CONTRACTS) {
      try {
        const fns = Object.fromEntries(LEAVES_OF[full.name].map((n) => [n, loadUnit(leaves[n].code, n, { resolve: { declared: leaves[n].declared ?? {} } })]));
        const r = testFunction(COMPOSE[full.name](fns), full);
        whole[full.name] = { ok: r.ok, failures: r.failures.slice(0, 4) };
        if (!r.ok) gap ??= { type: "integration_failed", unit: full.name, failures: r.failures.slice(0, 3), detail: "every leaf passed its own oracle but the composition failed the whole-response oracle" };
      } catch (e) { whole[full.name] = { ok: false, failures: [String(e.message).slice(0, 200)] }; gap ??= { type: "integration_failed", unit: full.name, failures: [String(e.message).slice(0, 200)] }; }
    }
    see("whole-oracle", { results: Object.fromEntries(Object.entries(whole).map(([k, v]) => [k, v.ok])) });
  }
  return { ok: !gap && !only, leaves, whole, gap, trails };
}

// ---- CLI ----
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
  const work = path.resolve(arg("work", "./generate-work"));
  fs.mkdirSync(work, { recursive: true });
  const mouths = arg("mouths", DEFAULT_MOUTHS.join(",")).split(",");
  const only = arg("only", null)?.split(",") ?? null;
  const cache = openUnitCache(path.join(work, "unit-cache"));
  const trailsFile = path.join(work, "trails.json");
  const ledger = path.join(work, "build-ledger.jsonl");
  const see = (event, f) => { fs.appendFileSync(ledger, JSON.stringify({ at: new Date().toISOString(), event, ...f }) + "\n"); if (["unit", "unit-draw"].includes(event)) console.log(event, JSON.stringify({ ...f, code: undefined, failures: f.failures?.slice?.(0, 2) }).slice(0, 300)); };
  const t0 = Date.now();
  const r = await generateUnits({ mouths, trails: loadTrails(trailsFile), cache, see, only, repair: arg("repair", "edit"), decompose: arg("decompose", "whole"), carry: process.argv.includes("--carry"), anchorDir: arg("anchors", null), species: process.argv.includes("--species") ? speciesHook() : null });
  saveTrails(trailsFile, r.trails);
  fs.writeFileSync(path.join(work, "units.json"), JSON.stringify({ ok: r.ok, gap: r.gap, leaves: r.leaves, whole: r.whole, ms: Date.now() - t0 }, null, 1));
  console.log("\n" + "leaf".padEnd(14) + "mouth".padEnd(22) + "calls rounds   ms  how");
  for (const [n, u] of Object.entries(r.leaves)) console.log(n.padEnd(14) + String(u.model ?? "—").padEnd(22) + String(u.calls).padStart(5) + String(u.rounds).padStart(7) + String(u.ms).padStart(7) + "  " + (u.ok ? (u.cached ? "cache hit (re-tested)" : "drawn, verified") : "FAILED"));
  console.log(r.ok ? `\nALL VERIFIED in ${((Date.now() - t0) / 1000).toFixed(0)}s; whole-response oracles: ${JSON.stringify(Object.fromEntries(Object.entries(r.whole).map(([k, v]) => [k, v.ok])))}` : `\nGAP: ${JSON.stringify(r.gap)}`);
}
