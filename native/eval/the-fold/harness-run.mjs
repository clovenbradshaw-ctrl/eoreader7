// harness-run.mjs — eoreader7 runs ai-code-harness (HumanEval-style, 20
// basic-Python tasks) through its OWN /v1/code loop. No hand-written
// solutions anywhere: each workspace starts from a synthesized stub
// (mechanical.js::synthesizeStub — the same stub that scores 0/20 as the
// control), the mouth patches it via runCodeLoop, the workspace's own
// check.py (solution + the harness's asserts) arbitrates, and the final
// solution.py lands in samples.jsonl for the harness's evaluate.py.
//
// The control this beats: stubs alone (0/20 — collected by
// harness-stub-control.mjs, same synthesizeStub, no mouth). The gap
// between control and this run IS the mouth's measured contribution.
//
// Usage:
//   node native/eval/the-fold/harness-run.mjs --task Basic/01 [--rounds 3 --model qwen3:30b-a3b]
//   node native/eval/the-fold/harness-run.mjs --all [--rounds 3 --model qwen3:30b-a3b]
// Samples go to native/eval/the-fold/results/harness-samples-<stamp>.jsonl;
// score with: python3 /Users/mlacy/Documents/3.0/ai-code-harness/evaluate.py <samples>

import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runCodeLoop } from "../../the-fold/code-loop.js";
import { callArityOf, synthesizeStub } from "../../adapters/code/mechanical.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_DIR = "/Users/mlacy/Documents/3.0/ai-code-harness";
const RESULTS_DIR = path.join(HERE, "results");

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  return i === -1 ? dflt : args[i + 1];
};
const onlyTask = opt("--task", null);
const runAll = args.includes("--all");
const maxRounds = Number(opt("--rounds", "3"));
const model = opt("--model", "qwen3:30b-a3b");
const stubArityMode = opt("--stub-arity", null);

function loadTasks() {
  return fs.readFileSync(path.join(HARNESS_DIR, "tasks.jsonl"), "utf8")
    .split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
}

async function runTask(task, stamp) {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "harness-"));
  let stubArity = 0;
  if (stubArityMode === "test") {
    const witnessed = callArityOf(task.test ?? "", "test_body.py", task.entry_point);
    // MAX witnessed arity: the stub never passes regardless (it raises),
    // so the anchor only needs to be close enough to keep — max breaks
    // fewer call shapes than min when the mouth keeps the signature, and
    // either extreme breaks some multi-arity test. Disclosed choice.
    stubArity = witnessed.count > 0 ? Math.max(...witnessed.arities) : 0;
  }
  const stub = synthesizeStub({ name: task.entry_point, arity: stubArity, kind: "function", language: "python" });
  if (!stub.ok) throw new Error(`cannot even stub ${task.entry_point}: ${stub.gap.kind}`);
  fs.writeFileSync(path.join(ws, "solution.py"), stub.add + "\n");
  fs.writeFileSync(path.join(ws, "test_body.py"), task.test + "\n");
  fs.writeFileSync(path.join(ws, "check.py"), "exec(open('solution.py').read())\nexec(open('test_body.py').read())\nprint('TASK GREEN')\n");
  const ask = `${task.prompt}\n\nThe file solution.py holds a stub. Replace the stub with a real implementation via ACTION: patch (FIND copied byte-for-byte, whole stub). Only solution.py may change; check.py runs solution.py plus the tests.`;
  const started = Date.now();
  const result = await runCodeLoop({
    sessionId: `harness-${task.task_id.replace("/", "-")}`,
    model, task: ask, workspace: ws,
    testCommand: "python3 check.py", maxRounds, testTimeoutMs: 15000,
  });
  const ms = Date.now() - started;
  const roundsPath = path.join(RESULTS_DIR, `harness-rounds-${stamp}-${task.task_id.replace(/\//g, "-")}.json`);
  fs.writeFileSync(roundsPath, JSON.stringify(result.rounds, null, 2) + "\n");
  let final = null;
  try { final = fs.readFileSync(path.join(ws, "solution.py"), "utf8"); } catch { /* workspace survives regardless */ }
  return { task_id: task.task_id, done: result.done, rounds: result.rounds.length, ms, final, workspace: ws, stubArity, roundsPath };
}

async function main() {
  const tasks = loadTasks().filter((t) => (runAll ? true : t.task_id === (onlyTask ?? "Basic/01")));
  if (!tasks.length) throw new Error("no tasks selected (use --task Basic/01 or --all)");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const samplesPath = path.join(RESULTS_DIR, `harness-samples-${stamp}.jsonl`);
  const outcomes = [];
  for (const task of tasks) {
    console.log(`--- ${task.task_id} (${task.entry_point}) ---`);
    try {
      const r = await runTask(task, stamp);
      outcomes.push(r);
      console.log(`done=${r.done} rounds=${r.rounds} ms=${r.ms}`);
      fs.appendFileSync(samplesPath, JSON.stringify({ task_id: r.task_id, completion: r.final ?? "" }) + "\n");
    } catch (err) {
      console.log(`ERROR ${task.task_id}: ${String(err?.message ?? err).slice(0, 200)}`);
      outcomes.push({ task_id: task.task_id, done: false, rounds: 0, ms: 0, final: "", error: String(err?.message ?? err).slice(0, 200) });
      fs.appendFileSync(samplesPath, JSON.stringify({ task_id: task.task_id, completion: "" }) + "\n");
    }
  }
  const green = outcomes.filter((o) => o.done).length;
  console.log(`\nloop-green: ${green}/${outcomes.length} (harness score comes from evaluate.py on ${samplesPath})`);
  console.log(`SAMPLES: ${samplesPath}`);
}

main();
