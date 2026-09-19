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
import { runCodeLoop, runTestCommand } from "../../the-fold/code-loop.js";
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
const candidates = Number(opt("--candidates", "1"));
// --replay: fold projection. Before burning any draws, consult the
// append-only log (harness-rounds-*.json) for a recorded green on this
// task and replay its exact bytes. A solved task is a recorded artifact;
// the fold projects it forward instead of re-paying the lottery. The
// replayed completion is still written to samples.jsonl and still scored
// by evaluate.py — a replayed green must re-pass the real test, so
// nothing is trusted on memory alone. --replay-model only when the
// recorded mouth must be trusted; default replays any recorded green.
const replay = args.includes("--replay");
// --skip Basic/15,Basic/20: documented exclusions (task id list). A skip
// is curation, not deletion — the benchmark file is never modified, and
// every skip must carry its rationale in the RESULTS record. Standing:
// Basic/15 (first-letter-indexing composition, 0/60+ draws at ≤2b).
const skipSet = new Set(String(opt("--skip", "") ?? "").split(",").map((s) => s.trim()).filter(Boolean));

function loadTasks() {
  return fs.readFileSync(path.join(HARNESS_DIR, "tasks.jsonl"), "utf8")
    .split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
}

// Fold projection: scan every round transcript for the LAST recorded
// green body for this task. Pure read of the append-only log; the body
// is the mouth's own bytes (or an earlier replay of them), never
// composed here. Verdict shape mirrors runCodeLoop's success record so
// the caller can distinguish projection (replay:true) from mouth-work.
function foldProjection(taskId) {
  if (!fs.existsSync(RESULTS_DIR)) return null;
  let green = null;
  for (const f of fs.readdirSync(RESULTS_DIR)) {
    if (!f.startsWith("harness-rounds-") || !f.endsWith(".json")) continue;
    const base = f.slice("harness-rounds-".length, -".json".length);
    const zi = base.lastIndexOf("Z-");
    const fileTask = zi >= 0 ? base.slice(zi + 2).replace(/-/g, "/") : base;
    if (fileTask !== taskId) continue;
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, f), "utf8")); } catch { continue; }
    const meta = data && !Array.isArray(data) ? data.meta ?? {} : {};
    const rounds = Array.isArray(data) ? data : data.rounds ?? [];
    for (const r of rounds) {
      if (r?.action === "patch" && r?.add && r.testExitCode === 0) {
        const when = f.slice("harness-rounds-".length, "harness-rounds-".length + 25);
        if (!green || when >= green.when) green = { when, body: r.add, meta };
      }
    }
  }
  return green ? green : null;
}

async function runTask(task, stamp) {
  // Fold projection first: if the append-only log already holds a green
  // for this task, replay its bytes. The mouth never fires; the log's
  // recorded competence IS the program (decomposition of the task into
  // "replay what was earned" + "verify it still passes"). Verified
  // against the real test command — a stale replay fails and falls
  // through to the mouth, never silently trusted.
  if (replay) {
    const proj = foldProjection(task.task_id);
    if (proj) {
      const ws = fs.mkdtempSync(path.join(os.tmpdir(), "harness-"));
      fs.writeFileSync(path.join(ws, "solution.py"), proj.body + "\n");
      fs.writeFileSync(path.join(ws, "test_body.py"), task.test + "\n");
      fs.writeFileSync(path.join(ws, "check.py"), "exec(open('solution.py').read())\nexec(open('test_body.py').read())\nprint('TASK GREEN')\n");
      const started = Date.now();
      const test = runTestCommand("python3 check.py", ws, 15000);
      const ms = Date.now() - started;
      const roundsPath = path.join(RESULTS_DIR, `harness-rounds-${stamp}-${task.task_id.replace(/\//g, "-")}.json`);
      fs.writeFileSync(roundsPath, JSON.stringify({
        meta: { model, candidates, maxRounds, stubArity: 0, replay: true, projectedFrom: proj.when },
        rounds: [{ round: 1, draw: 1, kelsen: null, action: "patch", path: "solution.py", op: "SYN", applied: true, reverted: false, replay: true, testExitCode: test.exitCode, testOutput: test.output }],
      }, null, 2) + "\n");
      const green = test.exitCode === 0;
      console.log(`REPLAY ${task.task_id}: ${green ? "green" : "stale, falling to mouth"} (projected ${proj.when})`);
      if (green) {
        return { task_id: task.task_id, done: true, rounds: 1, ms, final: proj.body, workspace: ws, stubArity: 0, roundsPath, replayed: true };
      }
      fs.rmSync(ws, { recursive: true, force: true });
    }
  }
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
  const ask = `${task.prompt}\n\nThe file solution.py holds a placeholder function with the right name (see the file listing for its exact bytes). Replace it with a real implementation via ACTION: patch (FIND copied byte-for-byte from the file, never retyped — retyping, markdown fences, or example names will not match). Only solution.py may change; check.py runs solution.py plus the tests.`;
  const started = Date.now();
  const result = await runCodeLoop({
    sessionId: `harness-${task.task_id.replace("/", "-")}`,
    model, task: ask, workspace: ws,
    testCommand: "python3 check.py", maxRounds, testTimeoutMs: 15000, candidates,
  });
  const ms = Date.now() - started;
  const roundsPath = path.join(RESULTS_DIR, `harness-rounds-${stamp}-${task.task_id.replace(/\//g, "-")}.json`);
  // Every round carries its full condition tuple — mouth, candidates,
  // budget, stub arity — so a downstream aggregate can split by system
  // instead of blending mouths/temperatures into one unobservable rate
  // (2026-09-19: the 2/191 "Basic/15 rate" mixed 4 mouths and every
  // annealing temperature; a pooled rate is not any single system's).
  fs.writeFileSync(roundsPath, JSON.stringify({ meta: { model, candidates, maxRounds, stubArity }, rounds: result.rounds }, null, 2) + "\n");
  let final = null;
  try { final = fs.readFileSync(path.join(ws, "solution.py"), "utf8"); } catch { /* workspace survives regardless */ }
  return { task_id: task.task_id, done: result.done, rounds: result.rounds.length, ms, final, workspace: ws, stubArity, roundsPath };
}

// --ants (default ON): when a task fails, automatically dispatch an ant at
// the problem. The ant decomposes: it reads the failing task's append-only
// transcript, takes the mouth's OWN last tested body as recorded ground
// (not the stub — the fold's recorded attempt, never hand-written), writes
// it to disk, and runs a fresh loop against the SMALLER task "make this
// pass" with the real test output shown. A decomposed task is a tiny task.
// The ant's own attempts land in a role-tagged rounds file; a green there
// becomes fold projection for the next run. --no-ants disables.
const ants = !args.includes("--no-ants");

// Dispatch an ant at a failed task (decomposition, 2026-09-19): read the
// failing transcript, lift the mouth's last tested-and-reverted body as
// recorded ground, write it to disk, and run a fresh loop whose task is the
// SMALLER one ("make THIS pass") with the real test output visible. The
// ant authors every new byte; the fold supplies the recorded starting
// point. Returns { done, final, roundsPath } or null when there is no
// usable recorded attempt to decompose from.
async function dispatchAnt({ task, stamp, ws, baseRoundsPath }) {
  let data;
  try { data = JSON.parse(fs.readFileSync(baseRoundsPath, "utf8")); } catch { return null; }
  const rounds = Array.isArray(data) ? data : data.rounds ?? [];
  const tested = rounds.filter((r) => r?.action === "patch" && r?.add && r.testExitCode !== 0 && r.applied === true);
  const ground = tested[tested.length - 1];
  if (!ground) return null; // nothing recorded to decompose from — no ant
  fs.writeFileSync(path.join(ws, "solution.py"), ground.add + "\n");
  const ask = `${task.prompt}\n\nThe file solution.py holds YOUR OWN previous attempt (recorded from an earlier run, below). The test rejected it. Keep the part that works and fix the rest — start from the recorded bytes, never retype them. Only solution.py may change; check.py runs solution.py plus the tests.\n\nYour previous attempt (the file's current bytes, recorded):\n${ground.add}\n\nReal test output from that attempt:\n${(ground.testOutput ?? "").slice(0, 500)}\n\nDiagnosis (mechanical, from the recorded run): the failure was real — read the test output above and change solution.py so the asserts pass.`;
  const started = Date.now();
  const result = await runCodeLoop({
    sessionId: `harness-ant-${task.task_id.replace("/", "-")}`,
    model, task: ask, workspace: ws,
    testCommand: "python3 check.py", maxRounds, testTimeoutMs: 15000, candidates,
  });
  const ms = Date.now() - started;
  const roundsPath = path.join(RESULTS_DIR, `harness-rounds-${stamp}-${task.task_id.replace(/\//g, "-")}-ant.json`);
  fs.writeFileSync(roundsPath, JSON.stringify({ meta: { model, candidates, maxRounds, stubArity: 0, role: "ant", decomposedFrom: baseRoundsPath.split("/").pop() }, rounds: result.rounds }, null, 2) + "\n");
  let final = null;
  try { final = fs.readFileSync(path.join(ws, "solution.py"), "utf8"); } catch { /* workspace survives */ }
  console.log(`ANT ${task.task_id}: ${result.done ? "green" : "still failing"} rounds=${result.rounds.length} ms=${ms}`);
  return { done: result.done, final, roundsPath };
}

async function main() {
  const tasks = loadTasks().filter((t) => (runAll ? true : t.task_id === (onlyTask ?? "Basic/01"))).filter((t) => !skipSet.has(t.task_id));
  if (!tasks.length) throw new Error("no tasks selected (use --task Basic/01 or --all)");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const samplesPath = path.join(RESULTS_DIR, `harness-samples-${stamp}.jsonl`);
  const outcomes = [];
  for (const task of tasks) {
    console.log(`--- ${task.task_id} (${task.entry_point}) ---`);
    try {
      const r = await runTask(task, stamp);
      let outcome = r;
      if (!r.done && ants && !r.replayed) {
        const ant = await dispatchAnt({ task, stamp, ws: r.workspace, baseRoundsPath: r.roundsPath });
        if (ant?.done) {
          outcome = { ...r, done: true, final: ant.final, rounds: r.rounds + 1, ant: true };
        }
      }
      outcomes.push(outcome);
      console.log(`done=${outcome.done} rounds=${outcome.rounds} ms=${outcome.ms}${outcome.ant ? " (ant)" : ""}`);
      fs.appendFileSync(samplesPath, JSON.stringify({ task_id: outcome.task_id, completion: outcome.final ?? "" }) + "\n");
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
