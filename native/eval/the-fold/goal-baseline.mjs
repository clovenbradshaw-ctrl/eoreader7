// native/eval/the-fold/goal-baseline.mjs — THE OUTPUT GOAL, AND THE STANDING.
//
// GOAL (net-new generation): on ai-code-harness/tasks-composition.jsonl — 8
// net-new tasks whose logic is a composition of primitive operations, invented
// identifiers — reach >= 7/8 passing, each verified by the real `python3
// check.py`, at <= 1 small model draw per task (mechanical composition first;
// the draw only for irreducible residue).
//
// This measures the BASELINE the goal must beat: model-alone, one draw per
// task, no composition. The lever (finer-grain atom composition) is measured
// separately; this is the floor.
//
//   node native/eval/the-fold/goal-baseline.mjs [--bench tasks-composition.jsonl]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runTestCommand } from "../../the-fold/code-loop.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HARNESS = process.env.ER7_HARNESS_DIR ?? "/Users/mlacy/Documents/3.0/ai-code-harness";
const DOOR = process.env.ER7_GENERATION_DOOR ?? "http://127.0.0.1:8137/api/generate";
const arg = (f, fb) => { const i = process.argv.indexOf(f); return i > 0 ? process.argv[i + 1] : fb; };
const benchFile = arg("--bench", "tasks-composition.jsonl");
const MODEL = arg("--model", "qwen2.5-coder:1.5b");

async function draw(prompt) {
  const r = await fetch(DOOR, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt, model: MODEL, kind: "code", maxTokens: 400, temperature: 0.1, priority: "batch", hop: 1 }), signal: AbortSignal.timeout(120000) });
  const j = await r.json().catch(() => null);
  return (j?.ok && typeof j.text === "string") ? j.text : "";
}
function extractBody(text, entry) {
  const t = String(text ?? "").replace(/```[a-z]*\n?/gi, "");
  const m = new RegExp(`def\\s+${entry}\\s*\\([^)]*\\)\\s*:\\n([\\s\\S]*?)(?=\\ndef |\\nclass |\\Z)`, "m").exec(t);
  return m && m[0].trim() ? m[0].trim() : null;
}
function test(body, task) {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "goal-"));
  fs.writeFileSync(path.join(ws, "solution.py"), body + "\n");
  fs.writeFileSync(path.join(ws, "test_body.py"), task.test + "\n");
  fs.writeFileSync(path.join(ws, "check.py"), "exec(open('solution.py').read())\nexec(open('test_body.py').read())\nprint('TASK GREEN')\n");
  const r = runTestCommand("python3 check.py", ws, 15000);
  fs.rmSync(ws, { recursive: true, force: true });
  return r.exitCode === 0;
}

const tasks = fs.readFileSync(path.join(HARNESS, benchFile), "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
console.log(`\n── GOAL BASELINE (model-alone) ──`);
console.log(`benchmark ${benchFile} · ${tasks.length} tasks · model ${MODEL}\n`);

let pass = 0;
for (const task of tasks) {
  const ask = `Write a python function \`${task.entry_point}\`. Contract:\n${task.test.split("\n").map((l) => "  " + l).join("\n")}\nReturn ONLY the def, no prose.`;
  const body = extractBody(await draw(ask), task.entry_point);
  const green = body ? test(body, task) : false;
  if (green) pass += 1;
  console.log(`${task.task_id.padEnd(10)} ${green ? "GREEN" : "wall"}`);
}
console.log(`\nBASELINE (model-alone, 1 draw): ${pass}/${tasks.length}`);
console.log(`GOAL: >= 7/8 with mechanical composition at <= 1 draw. Gap to close: ${Math.max(0, 7 - pass)} more.`);
