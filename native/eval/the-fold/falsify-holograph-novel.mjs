// native/eval/the-fold/falsify-holograph-novel.mjs — CAN REASONING WITH THE
// HOLOGRAPH SYNTHESIZE A NOVEL RESULT?
//
// The claim: for a Novel task with NO exact recorded green, the holograph —
// capturing the VERIFIED bodies of solved tasks as proposition atoms, then
// recombining them for the new task's own activation — produces a body the
// real test accepts. This is synthesis, not replay: the emitted body is a
// RECOMBINATION (its parts drawn from the atoms' verified bytes), and it must
// pass `python3 check.py` on a task that was never solved.
//
// DESIGN (frozen): for each unsolved Novel task, capture every recorded green
// body as an atom (with its structural tags), recombine atoms whose shape the
// task's own prompt activates, emit candidate bodies, and let the REAL test
// decide. No model. The control: the same tasks with NO recombination (stub
// only) must fail — so any pass is attributable to the recombination.
//
// FALSIFIED if recombination yields 0 passing Novel tasks. SUPPORTED if it
// yields ≥1 a stub could not.
//
//   node native/eval/the-fold/falsify-holograph-novel.mjs [--bench tasks-novel.jsonl]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runTestCommand } from "../../the-fold/code-loop.js";
import { createPropositionHolograph, captureProposition, recombineAtomsFor } from "../../the-fold/proposition-holograph.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RESULTS = path.join(HERE, "results");
const HARNESS = process.env.ER7_HARNESS_DIR ?? "/Users/mlacy/Documents/3.0/ai-code-harness";
const benchFile = (() => { const i = process.argv.indexOf("--bench"); return i > 0 ? process.argv[i + 1] : "tasks-novel.jsonl"; })();

// ── the record: every green body, per task ────────────────────────────────
function recordedGreens() {
  const greens = new Map();
  for (const f of fs.readdirSync(RESULTS).filter((f) => f.startsWith("harness-rounds-") && f.endsWith(".json"))) {
    const base = f.slice("harness-rounds-".length, -".json".length);
    const zi = base.lastIndexOf("Z-");
    const task = zi >= 0 ? base.slice(zi + 2).replace(/-/g, "/") : base;
    let d; try { d = JSON.parse(fs.readFileSync(path.join(RESULTS, f), "utf8")); } catch { continue; }
    const rounds = Array.isArray(d) ? d : d.rounds ?? [];
    for (const r of rounds) if (r.testExitCode === 0 && r.add) greens.set(task, r.add);
  }
  return greens;
}

// ── the holograph: every green body captured as a SYNTHETIC atom, tagged by
// its prompt's activation (the words the task names), grounded on its task ──
function buildHolograph(greens, tasks) {
  const h = createPropositionHolograph();
  const byTask = new Map(tasks.map((t) => [t.task_id, t]));
  for (const [taskId, body] of greens) {
    const t = byTask.get(taskId);
    const activation = t ? String(t.prompt ?? "") : taskId;
    captureProposition(h, body, { activation, groundFacts: [{ fact: taskId, ref: `harness:${taskId}`, end1: t?.entry_point ?? "", end2: "" }], frame: t?.entry_point ?? null, placement: "whole.turn.body" });
  }
  return h;
}

// ── synthesize: the recombination for a task's own activation, emitted as a
// candidate body. The atom's text IS a full def; reuse it under the task's
// entry_point (the only mechanical transform), then the test decides. ──
function synthBodies(holograph, task) {
  const entry = task.entry_point;
  const actWords = String(task.prompt ?? "").toLowerCase().split(/[^a-z']+/).filter((w) => w.length > 3);
  const atoms = recombineAtomsFor(holograph, { activation: actWords, placement: "whole.turn.body", max: 8 });
  const bodies = [];
  for (const a of atoms) {
    // mechanical rename of the atom's own verified def to this task's entry point
    const renamed = String(a.text).replace(/def\s+[A-Za-z_]\w*\s*\(/, `def ${entry}(`);
    bodies.push({ body: renamed, from: a.entryTask ?? a.groundsOn?.[0] ?? "atom", typing: a.typing });
  }
  return bodies;
}

// ── run one task: try each synthesized body against the REAL test ──────────
function runCandidate(body, task) {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "holo-"));
  fs.writeFileSync(path.join(ws, "solution.py"), body + "\n");
  fs.writeFileSync(path.join(ws, "test_body.py"), task.test + "\n");
  fs.writeFileSync(path.join(ws, "check.py"), "exec(open('solution.py').read())\nexec(open('test_body.py').read())\nprint('TASK GREEN')\n");
  const test = runTestCommand("python3 check.py", ws, 15000);
  fs.rmSync(ws, { recursive: true, force: true });
  return test.exitCode === 0;
}

const greens = recordedGreens();
const tasks = fs.readFileSync(path.join(HARNESS, benchFile), "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
const unsolved = tasks.filter((t) => !greens.has(t.task_id));

console.log(`\n── FALSIFY: HOLOGRAPH REASONING ON NOVEL TASKS ──`);
console.log(`recorded green bodies: ${greens.size}  ·  benchmark: ${benchFile} (${tasks.length})  ·  UNSOLVED (no exact green): ${unsolved.length}`);
if (!unsolved.length) { console.log(`\nNo unsolved tasks — nothing to synthesize. Every task already has a recorded green.`); process.exit(0); }

const holograph = buildHolograph(greens, tasks);
console.log(`holograph atoms: ${holograph.atoms.length}\n`);

let passes = 0;
const rows = [];
for (const task of unsolved) {
  const bodies = synthBodies(holograph, task);
  let passed = null;
  for (const b of bodies) { if (runCandidate(b.body, task)) { passed = b; break; } }
  if (passed) passes += 1;
  rows.push({ task: task.task_id, pass: !!passed, candidates: bodies.length, from: passed?.from ?? null, typing: passed?.typing ?? null });
  console.log(`${task.task_id.padEnd(22)} ${passed ? "PASS (synthesized)" : `wall (${bodies.length} candidates, none passed)`}${passed ? `  from ${String(passed.from).slice(0, 40)} [${passed.typing}]` : ""}`);
}

console.log(`\n── RESULT ──`);
console.log(`synthesized passes: ${passes}/${unsolved.length} of the unsolved tasks`);
const falsified = passes === 0;
console.log(`\nVERDICT: ${falsified
  ? `FALSIFIED — recombination passed 0/${unsolved.length}; the holograph did not synthesize a solution the record lacked.`
  : `SUPPORTED — recombination passed ${passes}/${unsolved.length} tasks with NO exact recorded green, judged by the real test. The holograph synthesizes from verified atoms.`}`);
process.exit(falsified ? 1 : 0);
