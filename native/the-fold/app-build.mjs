// ═══ LOVELACE · TEACH IT TO FISH ═══ THE WHOLE BUILD, END TO END, WITH THE ACCOUNT OF WHO FILLED EACH HOLE.
//
// The operator, 2026-10-01: "What about just building app, go back to the original idea." This is that: the leaves a cascade filled (app-generate.mjs --species: the cheap species first, the small
// models for what none of them could fill) are set down as an app, the app is DRIVEN in a headless browser the way a person would, and the copy check runs against everything the research saw.
// It writes one report that names, for every leaf and every slot, WHO filled it — a species, a model, or nobody — so the part of the app that is still a person's hand is on the page, not implied.
//
//   node native/the-fold/app-build.mjs --work <generate-work dir> --out <app dir> [--places "London,Paris"]
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

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const work = path.resolve(arg("work", "./generate-work")), out = path.resolve(arg("out", "./app-out")), places = arg("places", "London,Paris").split(",");
  const generated = JSON.parse(fs.readFileSync(path.join(work, "units.json"), "utf8"));
  const report = { schema: "EOAppBuild@1", at: new Date().toISOString(), work, out, generate: { ok: generated.ok, gap: generated.gap, whole: generated.whole, ms: generated.ms }, account: accountOf(generated) };
  if (!generated.ok) { report.stopped = { type: "generate_gap", gap: generated.gap }; fs.writeFileSync(path.join(work, "build-report.json"), JSON.stringify(report, null, 1)); console.log("STOPPED: the leaves did not all verify —", JSON.stringify(generated.gap)); process.exit(2); }
  const units = Object.fromEntries(Object.entries(generated.leaves).map(([n, u]) => [n, { code: u.code, model: u.model, rounds: u.rounds, calls: u.calls, cached: u.cached, declared: u.declared, resolutions: u.resolutions }]));
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
  console.log(`\nassembled ${asm.files.length} files -> ${out}; driven: ${drive.ok ? "no page errors" : "ERRORS " + JSON.stringify(drive.errors).slice(0, 200)}; likeness: ${report.likeness?.verdict ?? report.likeness?.error ?? "n/a"}`);
}
