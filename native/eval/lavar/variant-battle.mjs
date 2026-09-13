// variant-battle.mjs — the evolutionary battle for the shape of a good
// reading (2026-09-12).
//
// "Create as many reasonable variant programs as possible, have them chase
// the shape of a good reading, then a meta program toggling between them,
// within the bounds of rationality."
//
// BOUNDS OF RATIONALITY (the rule the whole arena obeys):
//   - Every variant is a RATIONAL hypothesis about reading, with its
//     rationale named. No random configs, no threshold-sweeps.
//   - SELECTION is by the GOLDEN-FREE SHAPE only — because in the future
//     there will be no goldens. The golden is present NOW only as a
//     VALIDATION instrument: it tells us whether the shape-chaser is
//     actually chasing what a careful reader would agree with. If the
//     shape-selected winner is also the golden-selected winner, the shape
//     is a validated proxy for the golden-less future. If they diverge,
//     the shape needs refinement — that divergence IS the finding.
//   - A variant is never tuned against the golden. Its flags are structural.
//
// usage: node variant-battle.mjs [chapter] [--book <path>]
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { shapeOf } from "./reading-shape.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CH = Number(process.argv[2] ?? 1);
const BOOK = (process.argv.find((a) => a.startsWith("--book=")) ?? "--book=/Users/mlacy/Documents/3.0/live_priors/01-literature-books/gutenberg/pg11_Alice_s_Adventures_in_Wonderland.txt").replace("--book=", "");
const IS_AIW = BOOK.includes("Alice_s_Adventures");
const LEDGER = path.join(HERE, "results", `${path.basename(BOOK, ".txt")}-ch${CH}.eot.jsonl`);

// ── THE VARIANT REGISTRY ── every entry is a rational reading program.
const VARIANTS = [
  { name: "earned-only", flags: ["--no-received-verbs", "--no-reduced"], rationale: "a reading should claim only what the material itself earned — no received linguistic knowledge" },
  { name: "received-verbs", flags: ["--no-reduced"], rationale: "a received verb lexicon (UD_English-EWT) is a floor under a capitalisation-starved vocabulary" },
  { name: "reduced-clauses", flags: [], rationale: "a comma + participle is a clause a careful reader breaks, inheriting the noun before it" },
  { name: "no-noun-phrase-subjects", flags: ["--no-nps"], rationale: "only surface-anchored subjects — noun-phrase subjects may flood the reading" },
  { name: "verb-widened-and-thin-subjects", flags: ["--no-nps", "--no-reduced"], rationale: "the received lexicon with the strictest subject wall" },
];

// ── GOLDEN SCORES (validation only, never selection; absent for non-AIW) ──
function goldenScore() {
  const goldenPath = path.join(HERE, "goldens", `aiw-ch${CH}.json`);
  if (!IS_AIW || !fs.existsSync(goldenPath)) return null;
  const g = JSON.parse(fs.readFileSync(goldenPath, "utf8"));
  const LS = fs.readFileSync(LEDGER, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const props = LS.filter((l) => l.role === "proposition" && l.schema === "EOTObservation@1" && l.end1);
  const norm = (t) => String(t ?? "").split(/\s+/).join(" ").toLowerCase().trim();
  const ct = (t) => (norm(t).match(/[\p{L}\p{N}’']+/gu) ?? []).filter((w) => !["the","a","an","and","or","of","to","in","with","her","his","its","their","our","my","your","there","she","he","it","they","was","were","had","have","been","being","as","at","by","for","from","on","that","this","these","those"].includes(w));
  const sets = props.map((a) => ({ e1: new Set(ct(a.end1)), e2: new Set(ct(a.end2)) }));
  let covered = 0;
  for (const p of g.propositions) {
    const e1 = new Set(ct(p.end1)), pred = new Set([...ct(p.label), ...ct(p.end2)]);
    if (!e1.size && !pred.size) { covered += 1; continue; }
    if (sets.some(({ e1: A, e2: B }) => (e1.size === 0 || [...e1].some((w) => A.has(w))) && (pred.size === 0 || [...pred].some((w) => B.has(w))))) covered += 1;
  }
  return covered / g.propositions.length * 100;
}

// ── THE BATTLE ──
// Measure the null-arm floor ONCE (default reader on word-shuffled noise):
// the signal-over-noise axis is emitted-above-floor, and it is the one axis
// that actually discriminates between variants (referent purity and void
// rate do not move with these flags — the first divergence run proved it).
const nullRun = spawnSync("node", [path.join(HERE, "null-arm.mjs"), BOOK, String(CH)], { encoding: "utf8", timeout: 120000 });
const nullLine = nullRun.stdout.split("\n").find((l) => l.includes("found in NOISE"));
const NOISE_FLOOR = nullLine ? Number((nullLine.match(/found in NOISE: (\d+) arrangements/) ?? [])[1] ?? 0) : 0;
console.log(`variant battle · ch${CH} · noise floor ${NOISE_FLOOR} arrangements (word-shuffled null arm)\n`);
console.log(`the shape is the fitness (golden-free); the golden is the validation`);
console.log(`${"variant".padEnd(30)} ${"recov".padEnd(5)} ${"purity".padEnd(7)} ${"void%".padEnd(6)} ${"signal".padEnd(7)} ${"shape".padEnd(6)} ${"golden%".padEnd(7)} ${"golden OK?"}`);
const rows = [];
for (const v of VARIANTS) {
  spawnSync("node", [path.join(HERE, "eot-jsonl.mjs"), BOOK, String(CH), ...v.flags], { encoding: "utf8", timeout: 120000 });
  const s = shapeOf(LEDGER, BOOK);
  // THE SHAPE FITNESS (golden-free): recoverability is a gate; purity up,
  // void rate down, and signal-over-noise up (arrangements ABOVE the
  // null-arm floor — a reading at or below its own noise floor has no
  // signal at all).
  const signal = Math.max(0, s.emitted - NOISE_FLOOR);
  const signalRatio = s.emitted ? signal / s.emitted : 0;
  const shape = s.recoverability * (0.4 * s.referentPurity + 0.3 * (1 - s.voidRate) + 0.3 * signalRatio);
  const golden = goldenScore();
  const goldenStr = golden === null ? "—" : golden.toFixed(1);
  rows.push({ ...v, s, shape, golden, signal });
  console.log(`${v.name.padEnd(30)} ${String(s.recoverability).padEnd(5)} ${s.referentPurity.toFixed(2).padStart(6)} ${(s.voidRate * 100).toFixed(0).padStart(5)} ${String(signal).padStart(6)} ${shape.toFixed(3).padStart(6)} ${goldenStr.padStart(6)} ${golden !== null && golden >= 60 ? "✓" : ""}`);
}

// ── THE META PROGRAM (golden-free selection) ──
const bestShape = rows.slice().sort((a, b) => b.shape - a.shape)[0];
const withGolden = rows.filter((r) => r.golden !== null);
const bestGolden = withGolden.length ? withGolden.slice().sort((a, b) => b.golden - a.golden)[0] : null;
console.log(`\nmeta (golden-free): pick ${bestShape.name} (shape ${bestShape.shape.toFixed(3)})`);
console.log(bestGolden
  ? `golden (validation): pick ${bestGolden.name} (golden ${bestGolden.golden.toFixed(1)}%)`
  : `golden (validation): no golden for this book — shape-only battle (the future, when there are no goldens)`);
console.log(bestGolden
  ? (bestShape.name === bestGolden.name
    ? `AGREE — the shape chases what a careful reader agrees with. ${bestShape.name} is the one to hardwire.`
    : `DIVERGE — shape says ${bestShape.name}, golden says ${bestGolden.name}. The shape needs refinement (that is the finding).`)
  : `no golden to check against — the meta selected by shape alone (the golden-free future)`);
console.log(`\nhardwire recommendation (revisable, named giver): the winning variant's flags become the reader's default,`);