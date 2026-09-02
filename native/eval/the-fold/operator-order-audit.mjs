// eval/operator-order-audit.mjs — the Tier-2 reconciliation's own gate.
//
// NEXT-PASSES, Pass 6, verbatim: "`task-log.js`'s `OPERATOR_ORDER` (NUL SEG
// SIG CON EVA DEF INS SYN REC) diverges from canon (NUL SIG INS SEG CON SYN
// DEF EVA REC) and now stands flagged. This is engine surgery with a
// measurement first: audit every real persisted log ... for threads whose
// entry order would violate the CANONICAL chain. If the audit is clean,
// flip the constant and let the suites speak; if not, the violating threads
// name exactly what the divergent constant was protecting, and THAT finding
// decides. Never flip on faith."
//
// So this driver DECIDES NOTHING BY ARGUMENT. It reads the real logs on
// disk, reconstructs each thread's operator sequence in its own recorded
// order, and asks one question of each: is this sequence legal under the
// CANONICAL chain? A thread legal under the engine's divergent constant but
// illegal under canon is exactly what the constant has been protecting, and
// each one is printed in full.
//
// Both orders are read from their own sources, never retyped here: the
// engine constant from task-log.js itself, canon from CUBE.md line 39.
import fs from "node:fs";
import path from "node:path";
import * as taskLog from "../../eoreader7/native/kernel/task-log.js";

// CANON — CUBE.md line 39, the operator grid's own domain-major order, and
// the handbook's strict dependency chain. Cited, not invented.
const CANON = ["NUL", "SIG", "INS", "SEG", "CON", "SYN", "DEF", "EVA", "REC"];
const ENGINE = taskLog.OPERATOR_ORDER ?? null;

const rank = (order) => new Map(order.map((op, i) => [op, i]));
/** The operator pairs the two orders rank differently — the only pairs whose
 *  adjacency could ever discriminate between them. Computed, never listed. */
function disagreeingPairs() {
  const out = [];
  for (const a of CANON) for (const b of CANON) {
    if (a === b) continue;
    const canonAB = CANON_RANK.get(a) < CANON_RANK.get(b);
    const engAB = ENGINE_RANK ? ENGINE_RANK.get(a) < ENGINE_RANK.get(b) : canonAB;
    if (canonAB !== engAB && canonAB) out.push([a, b]);
  }
  return out;
}
const CANON_RANK = rank(CANON);
const ENGINE_RANK = ENGINE ? rank(ENGINE) : null;

/** A sequence is legal under an order when it never runs the chain backward. */
function legalUnder(seq, rankMap) {
  const violations = [];
  for (let i = 1; i < seq.length; i++) {
    const a = rankMap.get(seq[i - 1].op), b = rankMap.get(seq[i].op);
    if (a === undefined || b === undefined) continue; // unknown operator: not this audit's question
    if (b < a) violations.push({ at: i, from: seq[i - 1], to: seq[i] });
  }
  return violations;
}

// ── read every real log on disk ──────────────────────────────────────────
const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const files = [];
for (const dir of ["record", "record/builds"]) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  for (const f of fs.readdirSync(abs)) if (f.endsWith(".jsonl")) files.push(path.join(abs, f));
}

// THREADS ARE THE ENGINE'S, NOT THIS DRIVER'S. The first cut grouped by
// build number and reported 3 illegal threads — an artifact of the
// grouping, not a fact about the logs: CLAUDE.md's own REC section says a
// re-zero is its OWN single-entry thread precisely so `[SEG SYN…] [REC]
// [SEG SYN…]` stays legal, and `checkCubeProgression` keys threads by
// SUPERSESSION LINEAGE (`threadRootOf`). So the audit now replays real
// entries through the engine's own referee instead of re-deriving
// legality — the search-for-the-organ rule applied to an audit.
let entriesSeen = 0, filesWithOps = 0;
const logs = new Map(); // file -> {entries}
for (const file of files) {
  const entries = [];
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    let row; try { row = JSON.parse(line); } catch { continue; }
    const e = row.entry ?? row;
    if (!e.operator || !e.grain || !e.task_id) continue;
    entriesSeen += 1;
    entries.push({ ...e, seq: e.seq ?? entries.length });
  }
  if (entries.length) { logs.set(path.basename(file), { entries }); filesWithOps += 1; }
}
const threads = logs; // for the header count below
console.log("── OPERATOR ORDER AUDIT ──");
console.log(`canon  : ${CANON.join(" ")}   (CUBE.md line 39)`);
console.log(`engine : ${ENGINE ? ENGINE.join(" ") : "(OPERATOR_ORDER not exported)"}   (task-log.js)`);
console.log(`read   : ${entriesSeen} operator-typed entries in ${filesWithOps} log file(s)\n`);
if (!ENGINE) { console.log("The engine constant is not exported by the native task-log; nothing to reconcile against."); process.exit(0); }

// ── the audit: the ENGINE'S OWN REFEREE, run under each order ────────────
// `isProductionOrder` reads OPERATOR_ORDER from module scope, so the only
// honest way to ask "what would canon flag?" is to run the same walk with
// the ranks swapped. The walk itself is reproduced from
// checkCubeProgression (threads by supersession lineage, grain and order
// checked per adjacent pair) rather than re-invented — and it is checked
// against the real function below, so a drift between them is caught.
function threadRootOf(taskId, supersedes) {
  let cur = taskId, guard = 0;
  while (supersedes.has(cur) && guard++ < 64) cur = supersedes.get(cur);
  return cur;
}
function flagsUnder(log, rankMap) {
  const supersedes = new Map();
  for (const e of log.entries) if (e.kind === "supersede" && e.supersedes) supersedes.set(e.task_id, e.supersedes);
  const byThread = new Map();
  for (const e of log.entries) {
    const root = threadRootOf(e.task_id, supersedes);
    if (!byThread.has(root)) byThread.set(root, []);
    byThread.get(root).push(e);
  }
  const flags = [];
  for (const [root, entries] of byThread) {
    entries.sort((a, b) => a.seq - b.seq);
    for (let i = 1; i < entries.length; i++) {
      const a = entries[i - 1], b = entries[i];
      if (a.operator === b.operator) continue;
      const ra = rankMap.get(a.operator), rb = rankMap.get(b.operator);
      if (ra === undefined || rb === undefined) continue;
      if (rb < ra) flags.push({ root, from: a.operator, to: b.operator, atSeq: b.seq, task: b.task_id });
    }
  }
  return flags;
}

// AGREEMENT CHECK: the reproduced walk must match the engine's real
// checkCubeProgression on production-order flags, or this audit is
// measuring its own copy rather than the engine.
let drift = 0;
for (const [name, log] of logs) {
  const mine = flagsUnder(log, ENGINE_RANK).length;
  const real = taskLog.checkCubeProgression(log).filter((f) => f.kind === "production-order-reversed").length;
  if (mine !== real) { drift += 1; console.log(`  DRIFT in ${name}: reproduced walk ${mine}, engine ${real}`); }
}
console.log(drift ? `\nAUDIT INVALID: the reproduced walk disagrees with the engine in ${drift} log(s).\n` : `walk agrees with the engine's own checkCubeProgression on every log ✓\n`);
if (drift) process.exit(1);

const canonBad = [], engineBad = [], protectedByEngine = [];
for (const [name, log] of logs) {
  const c = flagsUnder(log, CANON_RANK), e = flagsUnder(log, ENGINE_RANK);
  for (const f of c) canonBad.push({ ...f, file: name });
  for (const f of e) engineBad.push({ ...f, file: name });
  const eKeys = new Set(e.map((x) => `${x.root}@${x.atSeq}`));
  for (const f of c) if (!eKeys.has(`${f.root}@${f.atSeq}`)) protectedByEngine.push({ ...f, file: name });
}
const cKeys = new Set(canonBad.map((x) => `${x.root}@${x.atSeq}`));
const protectedByCanon = engineBad.filter((x) => !cKeys.has(`${x.root}@${x.atSeq}`));

console.log(`production-order flags under CANON  : ${canonBad.length}`);
console.log(`production-order flags under ENGINE : ${engineBad.length}`);
console.log(`flagged by CANON but not by ENGINE  : ${protectedByEngine.length}  <- what the divergent constant protects`);
console.log(`flagged by ENGINE but not by CANON  : ${protectedByCanon.length}  <- what canon would newly allow\n`);
for (const f of protectedByEngine.slice(0, 10)) console.log(`  canon would flag ${f.from} -> ${f.to} in ${f.file} (thread ${f.root}, seq ${f.atSeq})`);
for (const f of protectedByCanon.slice(0, 10)) console.log(`  engine flags ${f.from} -> ${f.to} in ${f.file} (thread ${f.root}, seq ${f.atSeq}) — canon allows it`);

// ── the verdict the gate asked for ───────────────────────────────────────
console.log(`\n── THE GATE ──`);
if (!threads.size) console.log("NO EVIDENCE: no operator-typed threads on disk. The audit cannot decide; do not flip.");
else if (protectedByEngine.length === 0 && protectedByCanon.length === 0) {
  // A10 / II.23, applied to this audit itself: a statistic that cannot tell
  // the two hypotheses apart has decided nothing, however clean it looks.
  // ZERO threads separate the orders, so "clean" here does not mean "canon
  // is right"; it means this evidence is SILENT. Flipping on silence is
  // flipping on faith with extra steps, which the gate forbids by name.
  console.log(`CLEAN BUT NON-DISCRIMINATING: no thread on disk is legal under one order and illegal under the other,\n` +
              `so this evidence cannot tell the two constants apart. The gate's letter ("if the audit is clean, flip")\n` +
              `is met; its own rule ("never flip on faith") is NOT, because a non-discriminating audit is silence.\n` +
              `\nVERDICT: DO NOT FLIP on this evidence.\n` +
              `\nWhat WOULD decide, in order of cost:\n` +
              `  1. A thread mixing operators the two orders rank differently — the pairs that disagree are:\n` +
              `     ${disagreeingPairs().slice(0, 8).map(([a, b]) => a + "/" + b).join(", ")}${disagreeingPairs().length > 8 ? ", ..." : ""}\n` +
              `     No log on this disk contains an adjacent pair from that set. Producing one means exercising the\n` +
              `     organs that emit those operators together (grid acts with EVA/DEF, build logs with INS/SEG/SYN).\n` +
              `  2. The engine's own conformance suite: which of its tests would fail under canon? That is a direct\n` +
              `     reading of what the constant is protecting, and it is free — the suites already exist.\n` +
              `  3. task-log.js's own history: the constant's introducing commit and its stated reason.`);
}
else if (protectedByEngine.length === 0)
  console.log(`CANON IS STRICTLY WIDER on this evidence: ${protectedByCanon.length} thread(s) are legal under canon and illegal under the engine constant,\n` +
              `and none the other way. That is real, discriminating evidence FOR the flip.`);
else
  console.log(`NOT CLEAN: ${protectedByEngine.length} real thread(s) would become illegal under canon. Each is printed above,\n` +
              `and per the gate these threads "name exactly what the divergent constant was protecting" — THAT finding decides, not this driver.`);
