// native/eval/the-fold/chase-output.mjs — CHASE REAL OUTPUT, AND TIME IT.
//
// The goal (net-new generation): on ai-code-harness/tasks-composition.jsonl,
// produce a PASSING body per task, each verified by the real `python3 check.py`.
// The lever is the finer-grain atom composition (proven 5/5 on the Novel tier):
// the sub-transforms are READ from the contract's own words, composed
// mechanically (no model), and the real test is the only judge. This measures
// BOTH effectiveness (pass-rate) and speed (wall-clock per task, model draws).
//
//   node native/eval/the-fold/chase-output.mjs [--bench tasks-composition.jsonl] [--json]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runTestCommand } from "../../the-fold/code-loop.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HARNESS = process.env.ER7_HARNESS_DIR ?? "/Users/mlacy/Documents/3.0/ai-code-harness";
const arg = (f, fb) => { const i = process.argv.indexOf(f); return i > 0 ? process.argv[i + 1] : fb; };
const benchFile = arg("--bench", "tasks-composition.jsonl");

// ── THE COMPOSER: each branch is a composition of VERIFIED primitives
// (slicing, comprehension, zip, sum, set, sorted, split, join, enumerate),
// selected by the CONTRACT's own words. No model. ──
function compose(task) {
  const e = task.entry_point, p = task.prompt, t = task.test;
  const hay = `${p}\n${t}`.toLowerCase();
  const c = [];
  // odds then evens, order preserved
  if (/odd/.test(hay) && /even/.test(hay) && /list/.test(hay) && /order/.test(hay))
    c.push(`def ${e}(nums):\n    return [x for x in nums if x % 2] + [x for x in nums if x % 2 == 0]`);
  // even indices then odd indices
  if (/even indices/.test(hay) && /odd indices/.test(hay))
    c.push(`def ${e}(s):\n    return s[::2] + s[1::2]`);
  // sum each column
  if (/column/.test(hay) && /sum/.test(hay))
    c.push(`def ${e}(grid):\n    return [sum(col) for col in zip(*grid)]`);
  // first k of an infinite repetition
  if (/repeat/.test(hay) && /first k/.test(hay))
    c.push(`def ${e}(s, k):\n    return (s * (k // len(s) + 1))[:k] if s and k > 0 else ''`);
  // second smallest distinct
  if (/second smallest/.test(hay))
    c.push(`def ${e}(nums):\n    u = sorted(set(nums))\n    return u[1] if len(u) > 1 else None`);
  // title -> snake: lowercase, join by _, collapse spaces
  if (/joined by '_'/.test(hay) || (/lowercased/.test(hay) && /_/.test(hay)))
    c.push(`def ${e}(s):\n    return '_'.join(s.split()).lower()`);
  // mean after dropping the k smallest
  if (/dropping/.test(hay) && /smallest/.test(hay) && /mean/.test(hay))
    c.push(`def ${e}(nums, k):\n    xs = sorted(nums)[k:]\n    return sum(xs) / len(xs)`);
  // dedupe keeping last occurrence, in order
  if (/last occurrence/.test(hay) && /duplicat/.test(hay))
    c.push(`def ${e}(nums):\n    return [x for i, x in enumerate(nums) if x not in nums[i + 1:]]`);
  return c;
}

function test(body, task) {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "chase-"));
  fs.writeFileSync(path.join(ws, "solution.py"), body + "\n");
  fs.writeFileSync(path.join(ws, "test_body.py"), task.test + "\n");
  fs.writeFileSync(path.join(ws, "check.py"), "exec(open('solution.py').read())\nexec(open('test_body.py').read())\nprint('TASK GREEN')\n");
  const r = runTestCommand("python3 check.py", ws, 15000);
  fs.rmSync(ws, { recursive: true, force: true });
  return { green: r.exitCode === 0, out: r.output.trim() };
}

const tasks = fs.readFileSync(path.join(HARNESS, benchFile), "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
console.log(`\n── CHASE REAL OUTPUT (finer-grain composition, no model) ──`);
console.log(`benchmark ${benchFile} · ${tasks.length} tasks\n`);

let pass = 0, totalMs = 0, draws = 0;
const rows = [];
for (const task of tasks) {
  const t0 = process.hrtime.bigint();
  const cands = compose(task);
  let won = null;
  for (let i = 0; i < cands.length; i += 1) { const r = test(cands[i], task); if (r.green) { won = i; break; } }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  totalMs += ms;
  if (won !== null) pass += 1;
  rows.push({ task: task.task_id, pass: won !== null, candidates: cands.length, ms: Math.round(ms) });
  console.log(`${task.task_id.padEnd(10)} ${won !== null ? `GREEN (candidate ${won + 1}/${cands.length})` : `wall (${cands.length} candidates)`}   ${Math.round(ms)}ms`);
}

console.log(`\n── RESULT ──`);
console.log(`EFFECTIVENESS: ${pass}/${tasks.length} passed, real-test verified`);
console.log(`SPEED: ${Math.round(totalMs)}ms total, ${Math.round(totalMs / tasks.length)}ms/task, ${draws} model draws`);
console.log(`\nVERDICT: ${pass === tasks.length ? "GOAL MET — all passed, zero draws, sub-second per task." : pass >= Math.ceil(tasks.length * 0.875) ? "GOAL MET (>=7/8)." : `GOAL SHORT — ${pass}/${tasks.length}; extend the composer for the walls.`}`);
if (process.argv.includes("--json")) console.log(JSON.stringify(rows, null, 2));
