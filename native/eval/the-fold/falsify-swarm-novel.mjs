// native/eval/the-fold/falsify-swarm-novel.mjs — DOES SWARM DIVERSITY REACH
// NET-NEW LOGIC A SINGLE DRAW MISSES?
//
// Prior results: pure recombination 0/5; single-shot small draw 0/5 on the
// unsolved Novel tier (the 1.5B understands the SHAPE but misses the CONTRACT
// — formal_initials checked `part.istitle()` instead of stripping a title set
// and joining "X.Y.").
//
// THE SWARM HYPOTHESIS: the answer exists in the candidate SPACE; diversity
// reaches it where one draw cannot. So draw K COMPETING candidates per task at
// different framings/temperatures, and let the REAL TEST pick the survivor —
// the repo's own multiple-framings law (hunt.js::swarmProbe), no model verdict.
//
// THE HONEST METRIC: passes vs calls. A swarm that burns 3× the calls for the
// same 0 passes is falsified; a swarm that finds even one net-new pass a single
// draw never did is a real win, disclosed with its cost.
//
//   node native/eval/the-fold/falsify-swarm-novel.mjs [--ants K] [--model M]
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
const ANTS = Number(arg("--ants", "3"));
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
async function drawDoor(prompt, temperature) {
  const r = await fetch(DOOR, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt, model: MODEL, kind: "code", maxTokens: 400, temperature, priority: "batch", hop: 1 }), signal: AbortSignal.timeout(120000) });
  const j = await r.json().catch(() => null);
  return (j?.ok && typeof j.text === "string") ? { text: j.text } : { text: "", refused: String(j?.error ?? r.status).slice(0, 100) };
}
function extractBody(text, entry) {
  const t = String(text ?? "").replace(/```[a-z]*\n?/gi, "");
  const m = new RegExp(`def\\s+${entry}\\s*\\([^)]*\\)\\s*:\\n([\\s\\S]*?)(?=\\ndef |\\nclass |\\Z)`, "m").exec(t);
  return m && m[0].trim() ? m[0].trim() : null;
}
function runCandidate(body, task) {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "swarm-"));
  fs.writeFileSync(path.join(ws, "solution.py"), body + "\n");
  fs.writeFileSync(path.join(ws, "test_body.py"), task.test + "\n");
  fs.writeFileSync(path.join(ws, "check.py"), "exec(open('solution.py').read())\nexec(open('test_body.py').read())\nprint('TASK GREEN')\n");
  const test = runTestCommand("python3 check.py", ws, 15000);
  fs.rmSync(ws, { recursive: true, force: true });
  return test.exitCode === 0;
}

// THE ANT FRAMINGS — each a different way to ask, so the swarm explores the
// space rather than resampling one distribution.
const FRAMINGS = [
  (t) => `Write a python function \`${t.entry_point}\`. The contract is these asserts:\n${t.test.split("\n").map((l) => "  " + l).join("\n")}\nReturn ONLY the def, no prose.`,
  (t) => `Here are the exact asserts your function must pass:\n${t.test.split("\n").map((l) => "  " + l).join("\n")}\nWrite the shortest python def \`${t.entry_point}\` that passes them. Think about what each assert reveals about the algorithm. Return ONLY the def.`,
  (t) => `Reverse-engineer the algorithm from these examples and implement \`${t.entry_point}\`:\n${t.test.split("\n").map((l) => "  " + l).join("\n")}\nReturn ONLY the def, no commentary, no markdown.`,
];

const greens = recordedGreens();
const tasks = fs.readFileSync(path.join(HARNESS, benchFile), "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
const unsolved = tasks.filter((t) => !greens.has(t.task_id));

console.log(`\n── FALSIFY: SWARM ON NET-NEW LOGIC ──`);
console.log(`model ${MODEL} · ants/task ${ANTS} · unsolved ${unsolved.length}\n`);

let passes = 0, calls = 0;
const rows = [];
for (const task of unsolved) {
  let passed = false, lastRefused = null, tried = 0;
  for (let a = 0; a < ANTS && !passed; a += 1) {
    const framing = FRAMINGS[a % FRAMINGS.length];
    const temp = 0.1 + (a / Math.max(1, ANTS - 1)) * 0.7; // explore across the swarm
    calls += 1; tried += 1;
    const { text, refused } = await drawDoor(framing(task), temp);
    if (refused) { lastRefused = refused; continue; }
    const body = extractBody(text, task.entry_point);
    if (body && runCandidate(body, task)) passed = true;
  }
  if (passed) passes += 1;
  rows.push({ task: task.task_id, pass: passed, tried, refused: lastRefused });
  console.log(`${task.task_id.padEnd(22)} ${passed ? `PASS on ant ${tried}` : `wall (${tried} ants)${lastRefused ? " door:" + lastRefused.slice(0, 30) : ""}`}`);
}

console.log(`\n── RESULT ──`);
console.log(`passes: ${passes}/${unsolved.length} · calls: ${calls} · passes/call: ${calls ? (passes / calls).toFixed(2) : "n/a"}`);
const falsified = passes === 0;
console.log(`\nVERDICT: ${falsified
  ? `FALSIFIED — the swarm passed 0/${unsolved.length} with ${calls} calls; competing framings did not reach net-new logic the single draw missed. At this model, diversity does not close the capability gap.`
  : `SUPPORTED — the swarm passed ${passes}/${unsolved.length} (${calls} calls, ${(passes / calls).toFixed(2)}/call), each verified by the real test. Diversity reached logic a single framing missed.`}`);
if (process.argv.includes("--json")) console.log(JSON.stringify(rows, null, 2));
process.exit(falsified ? 1 : 0);
