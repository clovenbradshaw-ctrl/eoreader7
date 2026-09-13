// cross-work-lexicon.mjs — THE PROGRAM'S PROMISE, MEASURED. Reading a
// document is supposed to make reading the NEXT one easier: the earned
// verb lexicon of one book, carried as a received prior (S99) into
// another, should widen the reader's vocabulary WITHOUT weakening it.
// (2026-09-13)
//
// This is the direct test the swarm's `--lexicon=` lever was built for
// and never offered: the SAME chapter read with vs without a cross-
// document lexicon prior, scored by the SAME golden-free shape (plus, on
// Alice, the real golden). A lexicon that helps raises the shape without
// raising self-referent folds (the witness watches that); one that hurts
// is a deposit.
//
//   node cross-work-lexicon.mjs <book> <chapter> [--lexicon=<path>] [--lang=eng]
//
// The default lexicon is Alice's own earned verbs read into a DIFFERENT
// book (the conservative test: identity never crosses documents, S95).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { shapeOf } from "./reading-shape.mjs";
import { closureOf, witnessAnswer } from "../../kernel/ground-closure.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BOOK = process.argv[2];
const CH = Number(process.argv[3] ?? 1);
const LANG = (process.argv.find((a) => a.startsWith("--lang=")) ?? "--lang=eng").replace("--lang=", "");
const langFlags = LANG === "eng" ? [] : [`--lang=${LANG}`];
const LEXICON = (process.argv.find((a) => a.startsWith("--lexicon=")) ?? "--lexicon=results/aiw-earned-verbs.lexicon.json").replace("--lexicon=", "");
const GOLDEN = (process.argv.find((a) => a.startsWith("--golden=")) ?? "").replace("--golden=", "");
if (!BOOK) throw new TypeError("usage: cross-work-lexicon.mjs <book> <chapter> [--lexicon=<path>] [--lang=eng]");

const NULL_SHAPE = { selfReferentFolds: 1, contests: 0, movesHolograph: 0, typedAbsences: 62 };
const witnessOf = (s) => closureOf({ shape: s, nullShape: NULL_SHAPE });
function holographHealth(s) {
  const w = witnessOf(s);
  const p = w.verdict === "closed" ? 0.2 : w.verdict === "closing" ? 0.1 : 0;
  return -0.1 * (s.selfReferentFolds ?? 0) - 0.05 * (s.contests ?? 0) + 0.02 * (s.movesHolograph ?? 0) - p;
}
const LEDGER = path.join(HERE, "results", `${path.basename(BOOK, ".txt")}-ch${CH}.eot.jsonl`);
function run(extra = []) {
  spawnSync("node", [path.join(HERE, "eot-jsonl.mjs"), BOOK, String(CH), ...langFlags, ...extra], { encoding: "utf8", timeout: 120000 });
  return shapeOf(LEDGER, BOOK);
}
const nullRun = spawnSync("node", [path.join(HERE, "null-arm.mjs"), BOOK, String(CH), ...langFlags], { encoding: "utf8", timeout: 120000 });
const nullLine = nullRun.stdout.split("\n").find((l) => l.includes("found in NOISE"));
const NOISE_FLOOR = nullLine ? Number((nullLine.match(/found in NOISE: (\d+) arrangements/) ?? [])[1] ?? 0) : 0;
function fitness(s, nf) { if (s.recoverability !== 1) return 0; const sig = Math.max(0, s.emitted - nf); return 0.4 * s.referentPurity + 0.3 * (1 - s.voidRate) + 0.3 * (s.emitted ? sig / s.emitted : 0) + holographHealth(s); }

const lx = fs.existsSync(LEXICON) ? JSON.parse(fs.readFileSync(LEXICON, "utf8")) : null;
const lxFlag = lx ? [`--lexicon=${path.resolve(LEXICON)}`] : [];

console.log(`CROSS-WORK LEXICON · ${path.basename(BOOK)} ch${CH} · ${LANG} · noise floor ${NOISE_FLOOR}`);
console.log(`lexicon: ${lx ? `${path.basename(LEXICON)} (${(lx.verbs ?? []).length} earned verbs, giver: ${String(lx.giver).slice(0, 60)}…)` : "NONE (the control)"}`);

const plain = run([]);
const primed = run(lxFlag);
const fPlain = fitness(plain, NOISE_FLOOR);
const fPrimed = fitness(primed, NOISE_FLOOR);

console.log(`\n  unprimed: shape ${fPlain.toFixed(4)} | emitted ${plain.emitted} | purity ${plain.referentPurity.toFixed(2)} | void ${plain.voidRate.toFixed(2)} | selfFolds ${plain.selfReferentFolds}`);
console.log(`  primed:   shape ${fPrimed.toFixed(4)} | emitted ${primed.emitted} | purity ${primed.referentPurity.toFixed(2)} | void ${primed.voidRate.toFixed(2)} | selfFolds ${primed.selfReferentFolds}`);

const wp = witnessOf(primed);
const wpPlain = witnessOf(plain);
console.log(`  witness:  ${wpPlain.verdict} (${wpPlain.openness?.toFixed(3)} vs null ${wpPlain.nullOpenness?.toFixed(3)}) unprimed → ${wp.verdict} (${wp.openness?.toFixed(3)} vs null ${wp.nullOpenness?.toFixed(3)}) primed — ${witnessAnswer(wp).action}`);

let golden = null;
if (GOLDEN && fs.existsSync(GOLDEN)) {
  const g = JSON.parse(fs.readFileSync(GOLDEN, "utf8"));
  const ls = fs.readFileSync(LEDGER, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const props = ls.filter((l) => l.role === "proposition" && l.schema === "EOTObservation@1" && l.end1);
  const norm = (t) => String(t ?? "").split(/\s+/).join(" ").toLowerCase().trim();
  const ct = (t) => (norm(t).match(/[\p{L}\p{N}’']+/gu) ?? []).filter((w) => !["the","a","an","and","or","of","to","in","with","her","his","its","their","our","my","your","there","she","he","it","they","was","were","had","have","been","being","as","at","by","for","from","on","that","this","these","those"].includes(w));
  const sets = props.map((a) => ({ e1: new Set(ct(a.end1)), e2: new Set(ct(a.end2)) }));
  let cov = 0;
  for (const p of g.propositions) { const e1 = new Set(ct(p.end1)), pred = new Set([...ct(p.label), ...ct(p.end2)]); if (!e1.size && !pred.size) { cov += 1; continue; } if (sets.some(({ e1: A, e2: B }) => (e1.size === 0 || [...e1].some((w) => A.has(w))) && (pred.size === 0 || [...pred].some((w) => B.has(w))))) cov += 1; }
  golden = cov / g.propositions.length * 100;
}

const delta = fPrimed - fPlain;
const verdict = delta > 0.0005
  ? "the lexicon HELPED — a real shape gain, the received floor doing its job"
  : delta < -0.0005
    ? "the lexicon HURT — a deposit, the witness's re-ground is the honest answer"
    : "no measurable change — the lexicon is inert on this material";
console.log(`\n  Δ = ${delta >= 0 ? "+" : ""}${delta.toFixed(4)} — ${verdict}`);
if (golden !== null) console.log(`  golden coverage (read AFTER, engine never sees it): ${golden.toFixed(1)}%`);
console.log(`\n  out: ${path.relative(process.cwd(), LEDGER)} (the primed read; the unprimed one ran first)`);