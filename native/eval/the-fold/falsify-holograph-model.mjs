// native/eval/the-fold/falsify-holograph-model.mjs — MODEL-ASSISTED HOLOGRAPH:
// can a small call SYNTHESIZE net-new logic the record lacks?
//
// The prior result (falsify-holograph-novel.mjs): pure recombination of whole
// verified bodies solved 0/5 unsolved Novel tasks — it can re-project known
// logic but cannot invent a transformation no atom encodes (formal_initials
// needs title/suffix stripping, comma handling, X.Y. joining, '' when empty).
//
// THIS EXPERIMENT lets a small local call do exactly the part the record lacks,
// under the fold's own law (the model proposes, the material checks):
//
//   1. MECHANICAL: recombine verified atoms for the task's activation; build
//      an ANCHORED prompt — the atom bodies as scaffolding + the task's own
//      test asserts (the contract is IN the test, mechanically).
//   2. MODEL: one small draw composes a candidate body from the anchor.
//   3. MATERIAL: the real test judges. A pass is kept; a fail is a disclosed
//      miss. The model never grounds itself.
//
// The win condition is NOT zero draws — a small call is allowed. It is: does
// the artifact pass on a task with NO exact recorded green, at a bounded call
// cost? Counted: calls spent, passes earned, passes-per-call.
//
//   node native/eval/the-fold/falsify-holograph-model.mjs [--max-calls N] [--model M]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runTestCommand } from "../../the-fold/code-loop.js";
import { createPropositionHolograph, captureProposition, recombineAtomsFor } from "../../the-fold/proposition-holograph.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RESULTS = path.join(HERE, "results");
const HARNESS = process.env.ER7_HARNESS_DIR ?? "/Users/mlacy/Documents/3.0/ai-code-harness";
const DOOR = process.env.ER7_GENERATION_DOOR ?? "http://127.0.0.1:8137/api/generate";
const arg = (f, fb) => { const i = process.argv.indexOf(f); return i > 0 ? process.argv[i + 1] : fb; };
const MODEL = arg("--model", "qwen2.5-coder:1.5b");
const MAX_CALLS = Number(arg("--max-calls", "3"));
const benchFile = arg("--bench", "tasks-novel.jsonl");

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

// one small draw through the door (the shared mouth); the door routes to the
// bridge/heimdall. Returns the raw text, never trusted.
async function drawDoor(prompt) {
  const r = await fetch(DOOR, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt, model: MODEL, kind: "code", maxTokens: 400, temperature: 0.1, priority: "batch", hop: 1 }), signal: AbortSignal.timeout(120000) });
  const j = await r.json().catch(() => null);
  if (j?.ok && typeof j.text === "string") return { text: j.text, served: j.winner ?? "mouth" };
  return { text: "", refused: String(j?.error ?? `HTTP ${r.status}`).slice(0, 120) };
}

// extract the def block from a raw draw, mechanically (no model)
function extractBody(text, entry) {
  const t = String(text ?? "").replace(/```[a-z]*\n?/gi, "");
  const m = new RegExp(`def\\s+${entry}\\s*\\([^)]*\\)\\s*:\\n([\\s\\S]*?)(?=\\ndef |\\nclass |\\Z)`, "m").exec(t);
  return m && m[0].trim() ? m[0].trim() : null;
}

function runCandidate(body, task) {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "holom-"));
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
const byTask = new Map(tasks.map((t) => [t.task_id, t]));

const holograph = createPropositionHolograph();
for (const [taskId, body] of greens) {
  const t = byTask.get(taskId);
  captureProposition(holograph, body, { activation: t?.prompt ?? taskId, groundFacts: [{ fact: taskId, ref: `harness:${taskId}` }], frame: t?.entry_point ?? null, placement: "whole.turn.body" });
}

console.log(`\n── FALSIFY: MODEL-ASSISTED HOLOGRAPH (small call allowed) ──`);
console.log(`model ${MODEL} · max calls/task ${MAX_CALLS} · atoms ${holograph.atoms.length} · unsolved ${unsolved.length}\n`);

let passes = 0, calls = 0;
const rows = [];
for (const task of unsolved) {
  const actWords = String(task.prompt ?? "").toLowerCase().split(/[^a-z']+/).filter((w) => w.length > 3);
  const atoms = recombineAtomsFor(holograph, { activation: actWords, placement: "whole.turn.body", max: 6 });
  let passed = false, lastRefused = null;
  for (let c = 0; c < MAX_CALLS; c += 1) {
    const anchor = [
      `Write a python function \`${task.entry_point}\`.`,
      "",
      "The exact required behavior is stated by these asserts (they are the contract):",
      task.test.split("\n").map((l) => "  " + l).join("\n"),
      "",
      atoms.length ? "Verified reference bodies (real, tested — use their idioms):" : "",
      ...atoms.map((a, i) => `  [${i + 1}] ${String(a.text).replace(/\n/g, "\n      ")}`),
      "",
      `Return ONLY the complete def ${task.entry_point}(...) with its body. No prose, no fences.`,
    ].filter(Boolean).join("\n");
    calls += 1;
    const { text, refused } = await drawDoor(anchor);
    if (refused) { lastRefused = refused; break; }
    const body = extractBody(text, task.entry_point);
    if (body && runCandidate(body, task)) { passed = true; break; }
  }
  if (passed) passes += 1;
  rows.push({ task: task.task_id, pass: passed, atoms: atoms.length, refused: lastRefused });
  console.log(`${task.task_id.padEnd(22)} ${passed ? "PASS (model+atoms, test-verified)" : `wall${lastRefused ? ` (door: ${lastRefused.slice(0, 40)})` : " (no candidate passed)"}`}`);
}

console.log(`\n── RESULT ──`);
console.log(`passes: ${passes}/${unsolved.length} unsolved tasks · calls spent: ${calls} · passes/call: ${calls ? (passes / calls).toFixed(2) : "n/a"}`);
const falsified = passes === 0;
console.log(`\nVERDICT: ${falsified
  ? `FALSIFIED — model-assisted composition passed 0/${unsolved.length} with a bounded small call; the small model + verified atoms did not synthesize the missing logic either.`
  : `SUPPORTED — model-assisted composition passed ${passes}/${unsolved.length} net-new-logic tasks (${calls} calls, ${(passes / calls).toFixed(2)} passes/call), every pass judged by the real test, the model never grounding itself.`}`);
process.exit(falsified ? 1 : 0);
