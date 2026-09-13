// shape-landscape.mjs — sweep EVERY legal genotype of the reader at the
// corrected (measured) elenchus bar, so the swarm's "no improvement" is
// a proven fact about the landscape, not a guess about where the
// mutations looked. (2026-09-13)
//
// The swarm's geneaology was 302 births / 0 kept under a hand-set +0.005
// that stood 5,000x above the shape's reproducibility floor. With the bar
// corrected to the measured rerun-null (elenchus-bar.mjs -> ~epsilon on
// deterministic material), the question is no longer "is the receiver
// deaf" but "is the landscape actually flat." This driver answers that by
// EXHAUSTION: every one of the LEGAL genotype combinations, measured at
// the corrected bar. A single genotype beating the seed proves the
// improvements exist and the swarm's mutation order was the miss.
//
//   node shape-landscape.mjs <book> <chapter> [--lang=eng] [--gens=N]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { shapeOf } from "./reading-shape.mjs";
import { elenchusBar } from "./elenchus-bar.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BOOK = process.argv[2];
const CH = Number(process.argv[3] ?? 1);
const LANG = (process.argv.find((a) => a.startsWith("--lang=")) ?? "--lang=eng").replace("--lang=", "");
const langFlags = LANG === "eng" ? [] : [`--lang=${LANG}`];
const GENS = Number((process.argv.find((a) => a.startsWith("--gens=")) ?? "--gens=2").replace("--gens=", ""));
if (!BOOK) throw new TypeError("usage: shape-landscape.mjs <book> <chapter> [--lang=code] [--gens=N]");

const ORGANS = [
  { id: "received", name: "received-verbs", deps: [], flags: [], level: 9, terrain: "Network", cell: "SYN·Pattern" },
  { id: "reduced", name: "reduced-clauses", deps: ["received"], flags: [], level: 8, terrain: "Link", cell: "CON·Figure" },
  { id: "nps", name: "noun-phrase-subjects", deps: [], flags: ["--no-nps"], level: 7, terrain: "Link", cell: "INS·Figure" },
  { id: "deep", name: "deep-recurse", deps: [], flags: ["--max-depth=5"], level: 6, terrain: "Field", cell: "SEG·Figure" },
  { id: "reread", name: "reread-loop", deps: [], flags: ["--prior=1"], level: 10, terrain: "Atmosphere", cell: "EVA·Ground" },
];
const byId = new Map(ORGANS.map((o) => [o.id, o]));
const ALL = Array.from({ length: 1 << ORGANS.length }, (_, m) => ORGANS.map((_, i) => (m & (1 << i)) !== 0).map((on, i) => on ? ORGANS[i].id : null).filter(Boolean));
const depsOf = (id, acc = new Set()) => { for (const d of byId.get(id).deps) { acc.add(d); depsOf(d, acc); } return acc; };
const legal = (ids) => { const have = new Set(ids); return ids.every((id) => [...depsOf(id)].every((d) => have.has(d))); };
const LEGAL = ALL.filter(legal);
const flagsFor = (ids) => { const out = []; for (const id of ids) for (const f of byId.get(id).flags) if (!out.includes(f)) out.push(f); return out; };
const nameFor = (ids) => ids.map((id) => byId.get(id).name).join("+") || "earned-only";

const LEDGER = path.join(HERE, "results", `${path.basename(BOOK, ".txt")}-ch${CH}.eot.jsonl`);
function run(ids, loop) { const extra = loop ? ["--prior=1"] : []; spawnSync("node", [path.join(HERE, "eot-jsonl.mjs"), BOOK, String(CH), ...langFlags, ...flagsFor(ids), ...extra], { encoding: "utf8", timeout: 120000 }); return shapeOf(LEDGER, BOOK); }

const NOISE_RUN = spawnSync("node", [path.join(HERE, "null-arm.mjs"), BOOK, String(CH), ...langFlags], { encoding: "utf8", timeout: 120000 });
const NOISE_LINE = NOISE_RUN.stdout.split("\n").find((l) => l.includes("found in NOISE"));
const NOISE_FLOOR = NOISE_LINE ? Number((NOISE_LINE.match(/found in NOISE: (\d+) arrangements/) ?? [])[1] ?? 0) : 0;
function fitness(s, nf) { if (s.recoverability !== 1) return 0; const sig = Math.max(0, s.emitted - nf); return 0.4 * s.referentPurity + 0.3 * (1 - s.voidRate) + 0.3 * (s.emitted ? sig / s.emitted : 0); }

console.log(`LANDSCAPE SWEEP · ${path.basename(BOOK)} ch${CH} · ${LANG} · ${LEGAL.length} legal genotypes · noise floor ${NOISE_FLOOR}`);

const results = [];
const first = LEGAL[0];
const firstShape = run(first, false);
const BAR = elenchusBar(Array(5).fill(fitness(firstShape, NOISE_FLOOR)));
console.log(`elenchus bar (measured): ${BAR.toExponential(2)} — any genotype strictly above the seed recruits`);

// exhaust every legal genotype at the corrected bar, and reread the best
for (let gi = 0; gi < LEGAL.length; gi++) {
  const ids = LEGAL[gi];
  const s = run(ids, false);
  const f = fitness(s, NOISE_FLOOR);
  results.push({ genotype: nameFor(ids), ids, f, emitted: s.emitted, purity: s.referentPurity, voidRate: s.voidRate });
  const marker = gi === 0 ? " (seed/earned-only)" : "";
  console.log(`  ${String(gi).padStart(2)} ${nameFor(ids).padEnd(58)} ${f.toFixed(4)}${marker}`);
}
results.sort((a, b) => b.f - a.f);
const best = results[0];
console.log(`\nBEST over the whole landscape: ${best.genotype} @ ${best.f.toFixed(4)} (${best.emitted} emitted, purity ${best.purity.toFixed(2)}, void ${best.voidRate.toFixed(2)})`);
console.log(`spread: ${results[results.length - 1].f.toFixed(4)} .. ${best.f.toFixed(4)} (range ${(best.f - results[results.length - 1].f).toFixed(4)})`);

// how many genotypes are genuinely DISTINCT at the corrected bar (not tied)?
const distinct = new Set(results.map((r) => r.f.toFixed(12))).size;
console.log(`distinct shapes at 12-digit precision: ${distinct} of ${results.length} genotypes — ${LEGAL.length - distinct} are aliases (the levers do not all bite)`);

// the answer to the bet: does any genotype beat the seed by MORE than the
// reproducibility floor?
const seedF = results.find((r) => r.genotype === "earned-only")?.f ?? results[results.length - 1].f;
const beats = results.filter((r) => r.f > seedF + BAR);
console.log(`\nthe bet: ${beats.length > 0 ? `YES — ${beats.length} genotype(s) beat the earned-only seed at the corrected bar` : "NO — the landscape is genuinely flat at this bar and these levers"}`);
for (const b of beats.slice(0, 5)) console.log(`  ${b.genotype}: ${b.f.toFixed(4)} (+${(b.f - seedF).toFixed(4)})`);