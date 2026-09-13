// loops-on-loops.mjs — "theres a way to get there, its about loops on
// loops. low sets possibility for high, high sets probability for low."
// (2026-09-12). The canon's own prior-state law (LAVAR EOTPriorState):
//
//   RECEIVED — brought to the text, true before it was opened (a treebank):
//       S9's "high sets probability for low" — the received distribution
//       narrows what is LIKELY.
//   EARNED   — induced from THIS material: S9's "low sets possible for
//       high" — the material's own rare/recurring facts OPEN what is
//       POSSIBLE.
//
// The way to the ideal shape is the two ALTERNATING across loops: each loop
// EARNS from the material (sets possibility — the candidate vocabulary and
// cast), and the received floor (S112) narrows the probability; the earned
// reading of loop N becomes the PRIOR of loop N+1 (the reread machinery),
// which re-earns on a widened vocabulary, which re-narrows... until the
// golden-free shape stops moving. Loops on loops, until the feeling settles.
//
// usage: node loops-on-loops.mjs [chapter] [--book <path>] [--loops N]
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { shapeOf } from "./reading-shape.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CH = Number(process.argv[2] ?? 1);
const BOOK = (process.argv.find((a) => a.startsWith("--book=")) ?? "--book=/Users/mlacy/Documents/3.0/live_priors/01-literature-books/gutenberg/pg11_Alice_s_Adventures_in_Wonderland.txt").replace("--book=", "");
const LOOPS = Number((process.argv.find((a) => a.startsWith("--loops=")) ?? "--loops=4").replace("--loops=", ""));
const IS_AIW = BOOK.includes("Alice_s_Adventures");
const BASE = path.basename(BOOK, ".txt");
const LEDGER = path.join(HERE, "results", `${BASE}-ch${CH}.eot.jsonl`);

function run(extra = []) {
  spawnSync("node", [path.join(HERE, "eot-jsonl.mjs"), BOOK, String(CH), ...extra], { encoding: "utf8", timeout: 120000 });
  return shapeOf(LEDGER, BOOK);
}
function priorVerbs() {
  try { return JSON.parse(fs.readFileSync(path.join(HERE, "results", `${BASE}-ch${CH}.prior.json`), "utf8")).verbs?.length ?? 0; } catch { return 0; }
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
function fitness(s, noiseFloor) {
  if (s.recoverability !== 1) return 0;
  const signal = Math.max(0, s.emitted - noiseFloor);
  return 0.4 * s.referentPurity + 0.3 * (1 - s.voidRate) + 0.3 * (s.emitted ? signal / s.emitted : 0);
}

const nullRun = spawnSync("node", [path.join(HERE, "null-arm.mjs"), BOOK, String(CH)], { encoding: "utf8", timeout: 120000 });
const nullLine = nullRun.stdout.split("\n").find((l) => l.includes("found in NOISE"));
const NOISE_FLOOR = nullLine ? Number((nullLine.match(/found in NOISE: (\d+) arrangements/) ?? [])[1] ?? 0) : 0;

console.log(`LOOPS ON LOOPS · ch${CH} · ${LOOPS} loops · noise floor ${NOISE_FLOOR}`);
console.log(`loop 0 (first read — EARN, received floor S112):`);
let s = run();
console.log(`  shape ${fitness(s, NOISE_FLOOR).toFixed(3)} (purity ${s.referentPurity.toFixed(2)}, void ${(s.voidRate*100).toFixed(0)}%, emitted ${s.emitted}, verbs-earned ${priorVerbs()})`);
const start = fitness(s, NOISE_FLOOR);
let prev = start;
for (let i = 1; i <= LOOPS; i++) {
  // Loop i: REREAD with the previous loop's own earned prior (--prior=1
  // loads THIS chapter's .prior.json — the vocabulary and cast the last
  // loop earned). Possibility widened by the earned; probability narrowed
  // by the received floor riding along.
  s = run(["--prior=1"]);
  const f = fitness(s, NOISE_FLOOR);
  const delta = f - prev;
  console.log(`loop ${i} (REREAD with prior — EARN again on a widened floor):`);
  console.log(`  shape ${f.toFixed(3)} (${delta >= 0 ? "+" : ""}${delta.toFixed(3)} vs prior loop) (purity ${s.referentPurity.toFixed(2)}, void ${(s.voidRate*100).toFixed(0)}%, emitted ${s.emitted}, verbs ${priorVerbs()})`);
  prev = f;
}
const g = golden();
console.log(`\nfinal shape ${prev.toFixed(3)} (start ${start.toFixed(3)}) | golden cross-check: ${g === null ? "no golden" : g.toFixed(1) + "%"}`);
console.log(g !== null && prev > start
  ? `the loops RAISED the golden-free shape AND the golden agrees the reading got better`
  : g !== null
    ? `golden cross-check: ${g.toFixed(1)}% — see whether the loops moved it`
    : `no golden — the loops moved the golden-free shape ${prev >= start ? "up" : "down"} by ${Math.abs(prev-start).toFixed(3)}`);