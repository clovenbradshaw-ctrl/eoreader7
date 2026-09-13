// shape-ascend.mjs — the Meno loop (2026-09-12).
//
// "Programs on programs... how does the slaveboy know he knows? knowledge
// has a certain feeling and shape." The slave boy recognizes by
// deidentified pattern (the SHAPE — the golden-free fitness: recoverability,
// referent purity, void rate, signal-over-noise). But recognition alone is
// not knowledge — the elenchus, the refuting probe, decides: only what
// survives the probe becomes belief. So every little program (a rational
// mutation of the reader) is PROPOSED, PROBED against the shape, and either
// KEPT (it moved the shape toward the ideal) or REJECTED (it degraded it —
// the error is corrected by restoring the previous config, and the rejection
// is recorded, not hidden).
//
// This is hill-climbing with a golden-free fitness and mandatory error
// correction. The golden is NOT consulted anywhere in the loop — it is only
// reported on the final config, as a cross-check that the "feeling" (shape)
// tracked what a careful reader agrees with.
//
// BASELINE: the §8 assembly's ledger reader (received-verbs + reduced +
// nounPhraseSubjects) — the best version measured (S112).
//
// usage: node shape-ascend.mjs [chapter] [--book <path>] [--rounds N]
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { shapeOf } from "./reading-shape.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CH = Number(process.argv[2] ?? 1);
const BOOK = (process.argv.find((a) => a.startsWith("--book=")) ?? "--book=/Users/mlacy/Documents/3.0/live_priors/01-literature-books/gutenberg/pg11_Alice_s_Adventures_in_Wonderland.txt").replace("--book=", "");
const ROUNDS = Number((process.argv.find((a) => a.startsWith("--rounds=")) ?? "--rounds=3").replace("--rounds=", ""));
const IS_AIW = BOOK.includes("Alice_s_Adventures");
const LEDGER = path.join(HERE, "results", `${path.basename(BOOK, ".txt")}-ch${CH}.eot.jsonl`);

// THE LEVERS — each mutation flips exactly one rational lever.
const LEVERS = [
  { name: "received-verbs", flags: ["--no-received-verbs"], off: "no received floor (§8)" },
  { name: "reduced-clauses", flags: ["--no-reduced"], off: "no reduced-clause reader" },
  { name: "noun-phrase-subjects", flags: ["--no-nps"], off: "no noun-phrase subjects" },
];
const BASE_FLAGS = []; // the §8 baseline is the current default

function fitness(shape, noiseFloor) {
  if (shape.recoverability !== 1) return 0;
  const signal = Math.max(0, shape.emitted - noiseFloor);
  const signalRatio = shape.emitted ? signal / shape.emitted : 0;
  return 0.4 * shape.referentPurity + 0.3 * (1 - shape.voidRate) + 0.3 * signalRatio;
}
function run(flags) {
  spawnSync("node", [path.join(HERE, "eot-jsonl.mjs"), BOOK, String(CH), ...flags], { encoding: "utf8", timeout: 120000 });
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

// Measure the shared noise floor ONCE (the Diaconis arm at baseline).
const nullRun = spawnSync("node", [path.join(HERE, "null-arm.mjs"), BOOK, String(CH)], { encoding: "utf8", timeout: 120000 });
const nullLine = nullRun.stdout.split("\n").find((l) => l.includes("found in NOISE"));
const NOISE_FLOOR = nullLine ? Number((nullLine.match(/found in NOISE: (\d+) arrangements/) ?? [])[1] ?? 0) : 0;

// ── BASELINE (the §8 best version) ──
const baseShape = run(BASE_FLAGS);
let config = [...BASE_FLAGS];
let f = fitness(baseShape, NOISE_FLOOR);
const trajectory = [{ round: 0, config: "baseline §8", shape: baseShape, fitness: f }];
const elenchus = []; // the rejected proposals, recorded
console.log(`MENO ASCENT · ch${CH} · noise floor ${NOISE_FLOOR} · fitness = golden-free shape (golden NOT consulted in the loop)`);
console.log(`round 0 baseline §8: shape=${f.toFixed(3)} (purity ${baseShape.referentPurity.toFixed(2)}, void ${(baseShape.voidRate*100).toFixed(0)}%, signal ${Math.max(0, baseShape.emitted-NOISE_FLOOR)})`);

for (let round = 1; round <= ROUNDS; round++) {
  let improved = false;
  for (const lever of LEVERS) {
    // propose the mutation (a little program): flip this lever from the
    // current config (toggle on if it's off, off if it's on).
    const hasFlag = config.includes(lever.flags[0]);
    const trial = hasFlag ? config.filter((x) => x !== lever.flags[0]) : [...config, ...lever.flags];
    const s = run(trial);
    const sf = fitness(s, NOISE_FLOOR);
    if (sf > f + 0.005) {
      // THE ELENCHUS PASSES — the mutation survived the probe; keep it.
      improved = true;
      config = trial; f = sf;
      trajectory.push({ round, config: `${hasFlag ? "re-enable" : "disable"} ${lever.name}`, shape: s, fitness: sf });
      console.log(`  round ${round} KEPT ${lever.name} (${hasFlag ? "on" : "off"}): shape ${sf.toFixed(3)} (+${(sf-f).toFixed(3)})`);
    } else {
      // THE ELENCHUS REFUSES — the mutation degraded (or did not move) the
      // shape; it is REJECTED and the error corrected by restoring config.
      elenchus.push({ round, proposal: `${hasFlag ? "re-enable" : "disable"} ${lever.name}`, shape: sf, reason: sf <= f ? "degraded or flat" : "within noise" });
      console.log(`  round ${round} REFUSED ${lever.name}: shape ${sf.toFixed(3)} (${sf > f ? "flat" : "degraded"}) — corrected, config unchanged`);
    }
  }
  if (!improved) { console.log(`\nconverged at round ${round} — no mutation improves the golden-free shape.`); break; }
}

const g = golden();
console.log(`\nfinal config: ${config.length ? config.join(" ") : "(baseline — all levers on)"}`);
console.log(`final shape ${f.toFixed(3)} | golden cross-check: ${g === null ? "no golden (the golden-free future)" : g.toFixed(1) + "%"}`);
console.log(`\nelenchus (rejected proposals, recorded not hidden): ${elenchus.length}`);
for (const e of elenchus) console.log(`  r${e.round} ${e.proposal}: ${e.reason}`);
console.log(`\nshape trajectory (the "feeling" of knowing):`);
for (const t of trajectory) console.log(`  r${t.round} ${t.config}: ${t.fitness.toFixed(3)}`);