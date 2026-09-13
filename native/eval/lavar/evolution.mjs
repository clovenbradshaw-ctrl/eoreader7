// evolution.mjs — variants EMERGE and BREED under hard constraints
// (2026-09-12). "Loops on loops and variants emerge and breed, but they
// must follow the dependency order and reasoning system ALWAYS."
//
// A genetic population of reader configurations, where:
//   EMERGE    — a genotype (bit-vector of levers) is proposed by mutation
//   BREED     — two selected parents cross their levers (crossover)
//   CONSTRAINT — a genotype is REFUSED AT BIRTH if it violates the
//              dependency DAG (S100's order: reduced-clauses REQUIRES
//              received-verbs — the wrong-order probe that proved useless
//              is structurally impossible here, not just avoided)
//   REASONING — selection is by the GOLDEN-FREE SHAPE only; every
//              surviving genotype is a named rational hypothesis; the
//              golden is a reported cross-check, never a selection signal
//   ELENCHUS  — an offspring that degrades the best-so-far is rejected and
//              recorded, never silently dropped
//   LOOPS ON LOOPS — optional per-generation reread (the earned reading
//              becomes the next generation's prior, widening possibility)
//
// usage: node evolution.mjs [chapter] [--book <path>] [--gens N] [--loops]
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { shapeOf } from "./reading-shape.mjs";
import { elenchusBar, bornAcceptance, RERUN_NULL } from "./elenchus-bar.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CH = Number(process.argv[2] ?? 1);
const BOOK = (process.argv.find((a) => a.startsWith("--book=")) ?? "--book=/Users/mlacy/Documents/3.0/live_priors/01-literature-books/gutenberg/pg11_Alice_s_Adventures_in_Wonderland.txt").replace("--book=", "");
const GENS = Number((process.argv.find((a) => a.startsWith("--gens=")) ?? "--gens=4").replace("--gens=", ""));
const USE_LOOPS = process.argv.includes("--loops");
const IS_AIW = BOOK.includes("Alice_s_Adventures");
const LEDGER = path.join(HERE, "results", `${path.basename(BOOK, ".txt")}-ch${CH}.eot.jsonl`);

// ── THE LEVERS (the genotype's bits) ──
const LEVERS = [
  { bit: 1, name: "received-verbs", flag: null, requires: 0, rationale: "received priors are the floor (S112)" },
  { bit: 2, name: "reduced-clauses", flag: "--no-reduced", requires: 1, rationale: "a comma+participle is a clause (depends on the received floor supplying participles)" },
  { bit: 4, name: "noun-phrase-subjects", flag: "--no-nps", requires: 0, rationale: "noun phrases can head a clause (independent lever)" },
];
// dependency DAG: bit B requires bit R (reduced requires received).
const flagsFor = (genotype) => LEVERS.filter((l) => (genotype & l.bit) === 0 && l.flag).map((l) => l.flag);
const nameFor = (genotype) => LEVERS.filter((l) => (genotype & l.bit) !== 0).map((l) => l.name).join("+") || "earned-only";

// ── THE CONSTRAINT: refuse at birth ──
function legal(genotype) {
  return LEVERS.every((l) => (genotype & l.bit) === 0 || (genotype & l.requires) !== 0 || l.requires === 0);
}
const ALL = [0,1,2,3,4,5,6,7];
const LEGAL = ALL.filter(legal);
const ILLEGAL = ALL.filter((g) => !legal(g));
console.log(`illegal genotypes (refused at birth — dependency violations): ${ILLEGAL.map(nameFor).join(", ")}`);

function fitness(shape, noiseFloor) {
  if (shape.recoverability !== 1) return 0;
  const signal = Math.max(0, shape.emitted - noiseFloor);
  return 0.4 * shape.referentPurity + 0.3 * (1 - shape.voidRate) + 0.3 * (shape.emitted ? signal / shape.emitted : 0);
}
function run(genotype, loop) {
  const extra = loop ? ["--prior=1"] : [];
  spawnSync("node", [path.join(HERE, "eot-jsonl.mjs"), BOOK, String(CH), ...flagsFor(genotype), ...extra], { encoding: "utf8", timeout: 120000 });
  return shapeOf(LEDGER, BOOK);
}
function golden() {
  if (!IS_AIW) return null;
  try {
    const g = JSON.parse(fs.readFileSync(path.join(HERE, "goldens", `aiw-ch${CH}.json`), "utf8"));
    const LS = fs.readFileSync(LEDGER, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    const props = LS.filter((l) => l.role === "proposition" && l.schema === "EOTObservation@1" && l.end1);
    const norm = (t) => String(t ?? "").split(/\s+/).join(" ").toLowerCase().trim();
    const ct = (t) => (norm(t).match(/[\p{L}\p{N}’']+/gu) ?? []).filter((w) => !["the","a","an","and","or","of","to","in","with","her","his","its","their","our","my","your","there","she","he","it","they","was","were","had","have","been","being","as","at","by","for","from","on","that","this","these","those"].includes(w));
    const sets = props.map((a) => ({ e1: new Set(ct(a.end1)), e2: new Set(ct(a.end2)) }));
    let cov = 0;
    for (const p of g.propositions) {
      const e1 = new Set(ct(p.end1)), pred = new Set([...ct(p.label), ...ct(p.end2)]);
      if (!e1.size && !pred.size) { cov += 1; continue; }
      if (sets.some(({ e1: A, e2: B }) => (e1.size === 0 || [...e1].some((w) => A.has(w))) && (pred.size === 0 || [...pred].some((w) => B.has(w))))) cov += 1;
    }
    return cov / g.propositions.length * 100;
  } catch { return null; }
}

const nullRun = spawnSync("node", [path.join(HERE, "null-arm.mjs"), BOOK, String(CH)], { encoding: "utf8", timeout: 120000 });
const nullLine = nullRun.stdout.split("\n").find((l) => l.includes("found in NOISE"));
const NOISE_FLOOR = nullLine ? Number((nullLine.match(/found in NOISE: (\d+) arrangements/) ?? [])[1] ?? 0) : 0;

// ── POPULATION (seeded with the legal rational variants) ──
let pop = LEGAL.map((g) => ({ g, s: run(g, false), f: null }));
for (const p of pop) p.f = fitness(p.s, NOISE_FLOOR);
let best = [...pop].sort((a, b) => b.f - a.f)[0];
// ── THE ELENCHUS BAR, MEASURED (2026-09-13) — the hand-set `+0.005` stood
// orders of magnitude above the shape's reproducibility floor (the same
// defect wilson.mjs closed): the bar is the seed best's own RERUN-NULL,
// declared draws, seed, alpha (elenchus-bar.mjs). The population's observed
// improvements are the bornAcceptance reference distribution.
const rerunShapes = [];
for (let d = 0; d < RERUN_NULL.draws; d++) { const rs = run(best.g, false); rerunShapes.push(fitness(rs, NOISE_FLOOR)); }
const ELENCHUS_BAR = elenchusBar(rerunShapes);
const observedDeltas = [];
const admits = (improvement, delta) => improvement >= ELENCHUS_BAR && bornAcceptance({ delta, populationDeltas: observedDeltas });
const elenchus = [];
console.log(`EVOLUTION · ch${CH} · ${GENS} generations · legal genotypes ${LEGAL.join(",")} · noise floor ${NOISE_FLOOR}${USE_LOOPS ? " · with per-gen reread loops" : ""}`);
console.log(`gen 0 (seed): best=${nameFor(best.g)} (${best.g}) shape ${best.f.toFixed(3)}`);
const seen = new Map(pop.map((p) => [p.g, p]));

for (let gen = 1; gen <= GENS; gen++) {
  // BREED: crossover two parents (top 2 by fitness), mutate (flip a bit).
  const ranked = [...pop].sort((a, b) => b.f - a.f);
  const parents = ranked.slice(0, 2);
  const offspring = [];
  for (const [a, b] of [[parents[0], parents[1]], [parents[1], parents[0]]]) {
    for (let m = 0; m < 3; m++) { // three mutation points per cross
      const cross = (a.g & 2) | (b.g & 1) | (a.g & 4); // mix bits from both
      const mut = cross ^ (1 << m); // flip one lever
      if (!legal(mut) || seen.has(mut)) continue; // constraint + no repeat
      seen.set(mut, true);
      const s = run(mut, false);
      const f = fitness(s, NOISE_FLOOR);
      offspring.push({ g: mut, s, f });
      const delta = f - best.f;
      observedDeltas.push(delta);
      if (admits(f - best.f, delta)) {
        console.log(`  gen ${gen} KEPT ${nameFor(mut)} (${mut}): shape ${f.toFixed(3)} (+${delta.toFixed(3)}) — bred from ${nameFor(a.g)}×${nameFor(b.g)}`);
        best = { g: mut, s, f };
      } else {
        elenchus.push({ gen, proposal: `${nameFor(mut)} (${mut})`, f, reason: delta <= 0 ? "degraded" : "flat" });
        console.log(`  gen ${gen} REFUSED ${nameFor(mut)} (${mut}): shape ${f.toFixed(3)} (${delta <= 0 ? "degraded" : "flat"}) — elenchus`);
      }
    }
  }
  pop = [...ranked.slice(0, 2), ...offspring]; // keep the best, add the bred
  if (USE_LOOPS) {
    // LOOPS ON LOOPS: reread the best with its own earned prior (widens
    // possibility — the earned sets what may be, next gen re-earns).
    const s = run(best.g, true);
    const f = fitness(s, NOISE_FLOOR);
    console.log(`  gen ${gen} reread loop on ${nameFor(best.g)}: shape ${f.toFixed(3)} (was ${best.f.toFixed(3)})`);
    if (f > best.f) best = { g: best.g, s, f };
  }
}

const g = golden();
console.log(`\nbest: ${nameFor(best.g)} (${best.g}) shape ${best.f.toFixed(3)} | golden cross-check: ${g === null ? "no golden" : g.toFixed(1) + "%"}`);
console.log(`elenchus (rejected offspring, recorded): ${elenchus.length}`);
for (const e of elenchus.slice(0, 8)) console.log(`  gen${e.gen} ${e.proposal}: ${e.reason}`);