// native/eval/the-fold/run-pipeline-with-lessons.mjs — RUN THE PIPELINE WITH
// THE LESSON ATOMS, and measure whether they change the artifact.
//
// Fast, decisive form: for each unsolved task, ONE bare draw and ONE draw with
// the lesson brief (the atoms selected by the task's own intent), each judged
// by the REAL test. The question: does carrying the earned lessons change the
// artifact? The selection is disclosed (why each lesson matched), so a noise
// selection is visible, not hidden.
//
//   node native/eval/the-fold/run-pipeline-with-lessons.mjs [--bench tasks-novel.jsonl] [--model M]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runTestCommand } from "../../the-fold/code-loop.js";
import { loadLessonAtoms, lessonBrief } from "../../the-fold/lesson-atoms.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RESULTS = path.join(HERE, "results");
const HARNESS = process.env.ER7_HARNESS_DIR ?? "/Users/mlacy/Documents/3.0/ai-code-harness";
const DOOR = process.env.ER7_GENERATION_DOOR ?? "http://127.0.0.1:8137/api/generate";
const arg = (f, fb) => { const i = process.argv.indexOf(f); return i > 0 ? process.argv[i + 1] : fb; };
const benchFile = arg("--bench", "tasks-novel.jsonl");
const MODEL = arg("--model", "qwen2.5-coder:1.5b");

function recordedGreens() {
  const g = new Map();
  for (const f of fs.readdirSync(RESULTS).filter((f) => f.startsWith("harness-rounds-") && f.endsWith(".json"))) {
    const base = f.slice("harness-rounds-".length, -".json".length);
    const zi = base.lastIndexOf("Z-");
    const task = zi >= 0 ? base.slice(zi + 2).replace(/-/g, "/") : base;
    let d; try { d = JSON.parse(fs.readFileSync(path.join(RESULTS, f), "utf8")); } catch { continue; }
    const rounds = Array.isArray(d) ? d : d.rounds ?? [];
    for (const r of rounds) if (r.testExitCode === 0 && r.add) g.set(task, r.add);
  }
  return g;
}
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
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "lessons-"));
  fs.writeFileSync(path.join(ws, "solution.py"), body + "\n");
  fs.writeFileSync(path.join(ws, "test_body.py"), task.test + "\n");
  fs.writeFileSync(path.join(ws, "check.py"), "exec(open('solution.py').read())\nexec(open('test_body.py').read())\nprint('TASK GREEN')\n");
  const r = runTestCommand("python3 check.py", ws, 15000);
  fs.rmSync(ws, { recursive: true, force: true });
  return r.exitCode === 0;
}

const atoms = loadLessonAtoms();
const greens = recordedGreens();
const tasks = fs.readFileSync(path.join(HARNESS, benchFile), "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
const unsolved = tasks.filter((t) => !greens.has(t.task_id));

console.log(`\n── RUN THE PIPELINE WITH THE LESSON ATOMS ──`);
console.log(`model ${MODEL} · atoms ${atoms.length} · unsolved tasks ${unsolved.length}\n`);

let barePass = 0, lessonPass = 0;
const rows = [];
for (const task of unsolved) {
  const { brief, selected } = await lessonBrief(task.prompt, atoms, { max: 5 });
  const ask = `Write a python function \`${task.entry_point}\`. Contract:\n${task.test.split("\n").map((l) => "  " + l).join("\n")}\nReturn ONLY the def, no prose.`;
  const bareBody = extractBody(await draw(ask), task.entry_point);
  const withBody = extractBody(await draw(`${brief ? brief + "\n\n" : ""}${ask}`), task.entry_point);
  const bareGreen = bareBody ? test(bareBody, task) : false;
  const withGreen = withBody ? test(withBody, task) : false;
  if (bareGreen) barePass += 1;
  if (withGreen) lessonPass += 1;
  rows.push({ task: task.task_id, bare: bareGreen, withLessons: withGreen, selected: selected.map((s) => `#${s.n}`) });
  console.log(`${task.task_id.padEnd(20)} BARE ${bareGreen ? "GREEN" : "wall"}  |  +LESSONS ${withGreen ? "GREEN" : "wall"}   [selected: ${selected.length ? selected.map((s) => `#${s.n}${s.match.exact ? "=" : "~"}`).join(",") : "none"}]`);
}

console.log(`\n── RESULT ──`);
console.log(`BARE ${barePass}/${unsolved.length}  ·  WITH LESSONS ${lessonPass}/${unsolved.length}`);
const helped = lessonPass > barePass, hurt = lessonPass < barePass;
console.log(`\nVERDICT: ${helped ? "SUPPORTED — the lesson brief improved solve-rate." : hurt ? "FALSIFIED (HARMFUL) — the lesson brief made it worse." : "NO EFFECT — the lessons changed nothing on this set; the atoms are an index, not an engine here."}`);
if (process.argv.includes("--json")) console.log(JSON.stringify(rows, null, 2));
