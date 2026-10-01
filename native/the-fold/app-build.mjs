// ═══ LOVELACE · TEACH IT TO FISH ═══ THE WHOLE BUILD, END TO END, WITH THE ACCOUNT OF WHO FILLED EACH HOLE.
//
// The operator, 2026-10-01: "What about just building app, go back to the original idea." This is that: the leaves a cascade filled (app-generate.mjs --species: the cheap species first, the small
// models for what none of them could fill) are set down as an app, the app is DRIVEN in a headless browser the way a person would, and the copy check runs against everything the research saw.
// It writes one report that names, for every leaf and every slot, WHO filled it — a species, a model, or nobody — so the part of the app that is still a person's hand is on the page, not implied.
//
//   node native/the-fold/app-build.mjs --work <generate-work dir> --out <app dir> [--places "London,Paris"] [--stand-in reference]
//   --stand-in reference  a leaf no mouth could make pass is filled by the hand-written REFERENCE leaf, so the rest of the build can still be driven. It is labelled `reference (steered stand-in)` in the manifest,
//                         the about page and the report, and counted apart: an app with a stand-in in it is NOT a generated app for that leaf.
//
// STEERED, said once and not hidden: the layout comps and the data sources are the ones the first run chose (ledger rows 2-4), the contracts and oracles are hand-written (rows 5-7), and the species are
// shown the reference leaves' answers as their examples (row 5). Nothing here closes a row; it measures how much of the build the system now fills itself.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compSpecOf } from "../organs/comp-read.js";
import { assembleApp } from "./app-assemble.mjs";
import { driveApp } from "./app-drive.mjs";
import { seenImages, readSeen, likenessOfApp } from "./app-likeness.mjs";
import { LEAF_CONTRACTS } from "./app-leaves.mjs";
import { generateUnits } from "./app-generate.mjs";
import { openFold, project } from "./app-fold.mjs";
import { speciesHook } from "./app-species.mjs";
import { makeMouth, openUnitCache, loadTrails, saveTrails } from "./app-units.mjs";
import { REFERENCE_LEAVES } from "./app-weather-fuel.reference.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, "fixtures", "weather-fuel");
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const spec = (f) => compSpecOf(JSON.parse(fs.readFileSync(path.join(FIX, "comps", f), "utf8")));

/** who filled each leaf, from the generate result: slots by species / by a model / not at all -> the rows the report prints */
export function accountOf(generated) {
  return Object.entries(generated.leaves).map(([name, u]) => {
    const c = LEAF_CONTRACTS.find((x) => x.name === name);
    const species = u.bySpecies ?? {};
    return { leaf: name, ok: !!u.ok, slotsBySpecies: Object.keys(species).length, species, model: u.model ?? null, calls: u.calls ?? 0, rounds: u.rounds ?? 0, whole: !c ? null : Object.keys(species).length === 0 ? (u.ok ? "model" : "failed") : (u.calls === 0 ? "species-only" : "species+model") };
  });
}

/**
 * buildApp — the whole build as ONE call, for the app door: leaves drawn species-first then by the LOCAL models only (no stand-in, no larger model), assembled, driven, copy-checked.
 * -> { ok, stage, gap?, account, out, drive?, likeness? } — a leaf that no local mouth can make pass stops the build as a typed gap; nothing half-built ships.
 */
export async function buildApp({ work, out, places = ["London"], mouths = ["qwen2.5-coder:1.5b", "gemma2:2b"], onNote: onNoteIn = null, plan = null } = {}) {
  const onNote = typeof onNoteIn === "function" ? onNoteIn : () => {};
  fs.mkdirSync(work, { recursive: true });
  const cache = openUnitCache(path.join(work, "unit-cache")), trailsFile = path.join(work, "trails.json"), ledger = path.join(work, "build-ledger.jsonl");
  const see = (event, f) => { fs.appendFileSync(ledger, JSON.stringify({ at: new Date().toISOString(), event, ...f }) + "\n"); if (event === "unit" && f.name) onNote({ move: "app_unit", note: `${f.name}: ${f.species ? "species " + f.species : f.ok === false ? "no local model passed it" : "drawn and verified"}` }); };
  // THE FOLD: every leaf that passes LANDS as an entry, one that does not is OPEN with why; the app is a projection of this log (app-view.mjs watches it and renders what has landed)
  const fold = openFold(path.join(work, "fold.jsonl"));
  if (plan) fold.append("propose", { needs: plan.needs, gaps: plan.gaps });
  const seeFold = (event, f) => { see(event, f); if (event === "unit" && f.name && /Of$/.test(f.name)) fold.append("note", { note: `${f.name}: ${f.species ? "filled by species " + f.species + ", no model call" : f.ok === false ? "no local model passed it" : "drawn by a local model and verified"}` }); };
  const onLeaf = (name, l) => {
    const mods = [...new Set(String(l.model ?? "").split("+").filter((m) => m && !m.startsWith("species:")))], nsp = Object.keys(l.bySpecies ?? {}).length;
    const by = l.ok ? [...mods, ...(nsp ? [`${nsp} species fill(s)`] : [])].join(" + ") : null;
    const cur = project(fold.entries()).landed[name];
    if (l.ok && cur && cur.code === l.code) return; // already in the fold, unchanged: nothing to append
    if (!l.ok && cur) return; // a leaf that has landed is not reopened by a failed retry
    if (l.ok) fold.append(cur ? "supersede" : "land", { leaf: name, code: l.code, by, calls: l.calls ?? 0, rounds: l.rounds ?? 0, bySpecies: l.bySpecies ?? {}, declared: l.declared ?? {}, resolutions: l.resolutions ?? [] });
    else fold.append("open", { leaf: name, failures: (l.failures ?? []).slice(0, 3), calls: l.calls ?? 0 });
  };
  const t0 = Date.now();
  const gen = await generateUnits({ mouths, trails: loadTrails(trailsFile), cache, see: seeFold, decompose: "fields", species: speciesHook(), onLeaf });
  saveTrails(trailsFile, gen.trails);
  if (gen.gap?.type === "integration_failed") fold.append("note", { note: `integration: ${gen.gap.unit} failed the whole-response oracle though every leaf passed its own checks — ${(gen.gap.failures ?? []).slice(0, 1).join("").slice(0, 140)}` });
  const generated = { ok: gen.ok, gap: gen.gap, whole: gen.whole, leaves: gen.leaves, ms: Date.now() - t0 };
  fs.writeFileSync(path.join(work, "units.json"), JSON.stringify(generated, null, 1));
  const account = accountOf(generated);
  if (!gen.ok) return { ok: false, stage: "generate", gap: gen.gap, account, out: null };
  const units = Object.fromEntries(Object.entries(gen.leaves).map(([n, u]) => [n, { code: u.code, model: u.model, rounds: u.rounds, calls: u.calls, cached: u.cached, declared: u.declared, resolutions: u.resolutions }]));
  const prov = JSON.parse(fs.readFileSync(path.join(FIX, "comps", "PROVENANCE.json"), "utf8"));
  const asm = assembleApp({ outDir: out, weatherSpec: spec("weather-comp-detect.json"), fuelSpec: spec("fuel-comp-detect.json"), units, provenance: { comps: prov, wholeOracle: gen.whole } });
  if (!asm.ok) return { ok: false, stage: "assemble", gap: asm.gap, account, out: null };
  const drive = await driveApp({ dir: out, places, shots: path.join(out, "shots") });
  let likeness = null;
  try { const seen = []; for (const f of ["weather-seen.jsonl", "fuel-seen.jsonl"]) seen.push(...readSeen(seenImages(path.join(FIX, "research", f), null)).seen); likeness = likenessOfApp({ pageTexts: drive.steps.flatMap((s) => s.texts), screenshot: drive.steps[0]?.shot ?? null, seen }); } catch (e) { likeness = { error: String(e.message).slice(0, 160) }; }
  const report = { schema: "EOAppBuild@1", at: new Date().toISOString(), account, drive: { ok: drive.ok, errors: drive.errors, steps: drive.steps.map((s) => ({ place: s.place, settled: s.settled, source: s.source, tabs: s.tabs })) }, likeness };
  fs.writeFileSync(path.join(work, "build-report.json"), JSON.stringify(report, null, 1));
  return { ok: drive.ok, stage: drive.ok ? "done" : "drive", account, out, drive: report.drive, likeness };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href && process.argv.includes("--live")) {
  // node app-build.mjs --live --work <dir> [--port 8830]: the build AND the viewer in one process — open the printed URL and watch the fold evolve
  const { startViewer } = await import("./app-view.mjs");
  const work = path.resolve(arg("work", "./generate-work")), v = startViewer({ work, port: Number(arg("port", 8830)), appPort: Number(arg("app-port", 8831)), title: arg("title", "Weather & fuel app") });
  console.log(`watch it evolve: ${v.url}`);
  const r = await buildApp({ work, out: path.join(work, "final"), places: ["London", "Paris"], onNote: (n) => console.log("·", n.note) });
  console.log(r.ok ? `\nALL CHECKS PASSING — built and driven: ${r.out}` : `\nBLOCKED at ${r.stage}: ${JSON.stringify(r.gap).slice(0, 300)}\nThe fold keeps what passed; the viewer stays up at ${v.url} (ctrl-c to stop).`);
  if (!r.ok) setInterval(() => {}, 1 << 30); else v.stop();
} else if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const work = path.resolve(arg("work", "./generate-work")), out = path.resolve(arg("out", "./app-out")), places = arg("places", "London,Paris").split(",");
  const generated = JSON.parse(fs.readFileSync(path.join(work, "units.json"), "utf8"));
  const report = { schema: "EOAppBuild@1", at: new Date().toISOString(), work, out, generate: { ok: generated.ok, gap: generated.gap, whole: generated.whole, ms: generated.ms }, account: accountOf(generated) };
  const standIn = arg("stand-in", null) === "reference", standIns = [];
  if (!generated.ok && !standIn) { report.stopped = { type: "generate_gap", gap: generated.gap }; fs.writeFileSync(path.join(work, "build-report.json"), JSON.stringify(report, null, 1)); console.log("STOPPED: the leaves did not all verify —", JSON.stringify(generated.gap), "(re-run with --stand-in reference to drive the rest)"); process.exit(2); }
  const units = Object.fromEntries(Object.entries(generated.leaves).map(([n, u]) => {
    if (u.ok && u.code) return [n, { code: u.code, model: u.model, rounds: u.rounds, calls: u.calls, cached: u.cached, declared: u.declared, resolutions: u.resolutions }];
    standIns.push(n); return [n, { code: REFERENCE_LEAVES[n], model: "reference (steered stand-in)", rounds: 0, calls: 0, cached: false, declared: {}, resolutions: [] }];
  }));
  report.standIns = standIns;
  const prov = JSON.parse(fs.readFileSync(path.join(FIX, "comps", "PROVENANCE.json"), "utf8"));
  const asm = assembleApp({ outDir: out, weatherSpec: spec("weather-comp-detect.json"), fuelSpec: spec("fuel-comp-detect.json"), units, provenance: { comps: prov, wholeOracle: generated.whole } });
  report.assemble = { ok: asm.ok, gap: asm.gap ?? null, files: asm.files?.length ?? 0 };
  if (!asm.ok) { fs.writeFileSync(path.join(work, "build-report.json"), JSON.stringify(report, null, 1)); console.log("ASSEMBLE GAP", JSON.stringify(asm.gap)); process.exit(2); }
  const drive = await driveApp({ dir: out, places, shots: path.join(out, "shots") });
  report.drive = { ok: drive.ok, errors: drive.errors, steps: drive.steps.map((s) => ({ place: s.place, settled: s.settled, source: s.source, tabs: s.tabs, dayTwoRows: s.dayTwoRows, shown: s.texts.slice(0, 40) })) };
  try {
    const seen = [];
    for (const f of ["weather-seen.jsonl", "fuel-seen.jsonl"]) seen.push(...readSeen(seenImages(path.join(FIX, "research", f), null)).seen);
    const first = drive.steps.find((s) => s.shot) ?? drive.steps[0];
    const pageTexts = drive.steps.flatMap((s) => s.texts);
    report.likeness = likenessOfApp({ pageTexts, screenshot: first?.shot ?? null, seen });
    report.likeness.disclosure = "the kept images are not on this disk, so the word-run comparison saw no seen text; the image comparison used the hashes the ledger recorded";
  } catch (e) { report.likeness = { error: String(e.message).slice(0, 200) }; }
  fs.writeFileSync(path.join(work, "build-report.json"), JSON.stringify(report, null, 1));
  const a = report.account;
  console.log(`\nleaf`.padEnd(20) + "how".padEnd(16) + "species slots  calls");
  for (const r of a) console.log(r.leaf.padEnd(19) + String(r.whole).padEnd(16) + String(r.slotsBySpecies).padStart(7) + String(r.calls).padStart(8));
  if (standIns.length) console.log(`\nSTAND-INS (not generated — the reference leaf, a person's hand): ${standIns.join(", ")}`);
  console.log(`\nassembled ${asm.files.length} files -> ${out}; driven: ${drive.ok ? "no page errors" : "ERRORS " + JSON.stringify(drive.errors).slice(0, 200)}; likeness: ${report.likeness?.verdict ?? report.likeness?.error ?? "n/a"}`);
}
