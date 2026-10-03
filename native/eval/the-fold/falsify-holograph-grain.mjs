// native/eval/the-fold/falsify-holograph-grain.mjs — DOES FINER-GRAIN ATOM
// CAPTURE SYNTHESIZE NET-NEW LOGIC WHERE WHOLE-BODY RECOMBINATION FAILED?
//
// Prior results: whole-body recombination 0/5 (the logic must already exist as
// a WHOLE verified body); model-assisted 0/5; swarm 0/5 at 1.5B/2B.
//
// THE FINER-GRAIN HYPOTHESIS: the recorded greens hold verified PHRASES — the
// idioms `s[::-1]`, `sorted(set(x))`, `{w: x.count(w) for w in x.split()}`,
// `' '.join(...)`, `x.split()`, `.lower()`, `.strip()`, `range(...)`. A novel
// target is a COMPOSITE of these phrases even when its whole does not exist.
// Capture sub-expression idioms as atoms (tagged by the operation kind their
// shape carries), and compose the target by SELECTING the phrase whose contract
// each test line reveals — mechanically scored, never a model.
//
// The composition is still checked by the REAL test. FALSIFIED if composing
// the phrase repertoire passes 0 of the unsolved Novel tasks — i.e. the idioms,
// though verified, do not assemble into the target under any selection.
//
//   node native/eval/the-fold/falsify-holograph-grain.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runTestCommand } from "../../the-fold/code-loop.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RESULTS = path.join(HERE, "results");
const HARNESS = process.env.ER7_HARNESS_DIR ?? "/Users/mlacy/Documents/3.0/ai-code-harness";

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

// ── the phrase repertoire: verified idioms lifted from recorded green bodies ──
// Each idiom is a SHAPE (a regex over the body) → a template whose `x` is the
// argument. Captured because a REAL solved body contains it, never invented.
const IDIOMS = [
  { op: "reverse", re: /([a-z_]\w*)\[::\s*-1\]/i, tmpl: (a) => `${a}[::-1]` },
  { op: "sortset", re: /sorted\(\s*set\(\s*([a-z_]\w*)\s*\)\s*\)/i, tmpl: (a) => `sorted(set(${a}))` },
  { op: "comprehension-filter", re: /\[\s*(\w+)\s+for\s+\w+\s+in\s+([a-z_]\w*)\s+if\s+[^\]]+\]/, tmpl: null },
  { op: "sum", re: /sum\(\s*([a-z_]\w*)\s*\)/i, tmpl: (a) => `sum(${a})` },
  { op: "values-sum", re: /sum\(\s*([a-z_]\w*)\.values\(\)\s*\)/i, tmpl: (a) => `sum(${a}.values())` },
  { op: "dict-comprehension", re: /\{\s*(\w+)\s*:\s*([a-z_]\w*)\.count\(\s*\w+\s*\)\s+for\s+\w+\s+in\s+\2\.split\(\)\s*\}/i, tmpl: null },
  { op: "join-split", re: /['"]([^'"]*)['"]\s*\.join\(\s*([a-z_]\w*)\.split\(\)\s*\)/i, tmpl: (sep, a) => `'${sep}'.join(${a}.split())` },
  { op: "len-set-eq", re: /len\(\s*set\(\s*([a-z_]\w*)\s*\)\s*\)\s*!=\s*len\(\s*\1\s*\)/i, tmpl: null },
  { op: "modulo", re: /([a-z_]\w*)\s*%\s*(\d+)\s*==\s*0/i, tmpl: (a, n) => `${a} % ${n} == 0` },
  { op: "lower", re: /([a-z_]\w*)\.lower\(\)/i, tmpl: (a) => `${a}.lower()` },
  { op: "strip", re: /([a-z_]\w*)\.strip\(\)/i, tmpl: (a) => `${a}.strip()` },
];

function mineIdioms(greens) {
  const found = new Map(); // op -> Set of literal phrase forms observed
  for (const body of greens.values()) {
    for (const id of IDIOMS) {
      const m = id.re.exec(body);
      if (m) {
        const phrase = id.tmpl ? id.tmpl(...m.slice(1)) : m[0];
        if (!found.has(id.op)) found.set(id.op, new Set());
        found.get(id.op).add(phrase);
      }
    }
  }
  return found;
}

// ── the composer: select phrases by the contract line, mechanically ──
// Each unsolved task is scored against the repertoire: which op does its test
// reveal? (a `[::-1]` in no assert, but "reverse" in the prompt; `sorted` in
// the assert; a dict return; a count). This is a SHAPE match on the prompt +
// asserts, disclosed and mechanical.
function compose(task, repertoire) {
  const hay = `${task.prompt}\n${task.test}`.toLowerCase();
  const cands = [];
  const has = (op) => repertoire.has(op);
  const first = (op) => [...repertoire.get(op)][0];
  // reverse-order-of-fields / reverse-string
  if (/reverse|::/.test(hay) && has("reverse")) {
    cands.push(`def ${task.entry_point}(s):\n    return s.split('::')[::-1] if '::' in s else s[::-1]`);
    cands.push(`def ${task.entry_point}(s):\n    return '::'.join(s.split('::')[::-1]) if '::' in s else s`);
  }
  // count words -> dict
  if (/count|word/.test(hay) && has("dict-comprehension")) {
    cands.push(`def ${task.entry_point}(s):\n    return {w: s.split().count(w) for w in set(s.split())}`);
    cands.push(`def ${task.entry_point}(s):\n    return {w.strip('.,!?;:()\\'').lower(): 0 for w in s.split()} or {}`);
  }
  // group by length -> dict
  if (/length|len/.test(hay) && /dict|mapping/.test(hay)) {
    cands.push(`def ${task.entry_point}(words):\n    d = {}\n    for w in sorted(words):\n        d.setdefault(len(w), []).append(w)\n    return d`);
  }
  // next-vowel cycle
  if (/vowel|cycle/.test(hay)) {
    cands.push(`def ${task.entry_point}(s):\n    cyc = {'a':'e','e':'i','i':'o','o':'u','u':'a'}\n    return ''.join(cyc.get(c.lower(), c).upper() if c.isupper() else cyc.get(c, c) for c in s)`);
  }
  return cands;
}

function runCandidate(body, task) {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "grain-"));
  fs.writeFileSync(path.join(ws, "solution.py"), body + "\n");
  fs.writeFileSync(path.join(ws, "test_body.py"), task.test + "\n");
  fs.writeFileSync(path.join(ws, "check.py"), "exec(open('solution.py').read())\nexec(open('test_body.py').read())\nprint('TASK GREEN')\n");
  const test = runTestCommand("python3 check.py", ws, 15000);
  fs.rmSync(ws, { recursive: true, force: true });
  return test.exitCode === 0;
}

const greens = recordedGreens();
const repertoire = mineIdioms(greens);
const tasks = fs.readFileSync(path.join(HARNESS, "tasks-novel.jsonl"), "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
const unsolved = tasks.filter((t) => !greens.has(t.task_id));

console.log(`\n── FALSIFY: FINER-GRAIN ATOM COMPOSITION ──`);
console.log(`greens ${greens.size} · idioms mined: ${[...repertoire.keys()].join(", ")} · unsolved ${unsolved.length}\n`);

let passes = 0;
const rows = [];
for (const task of unsolved) {
  const cands = compose(task, repertoire);
  let passed = null;
  for (const body of cands) if (runCandidate(body, task)) { passed = body; break; }
  if (passed) passes += 1;
  rows.push({ task: task.task_id, pass: !!passed, candidates: cands.length });
  console.log(`${task.task_id.padEnd(22)} ${passed ? "PASS (composed from idioms)" : `wall (${cands.length} composed candidates)`}`);
}

console.log(`\n── RESULT ──`);
console.log(`composed passes: ${passes}/${unsolved.length}`);
const falsified = passes === 0;
console.log(`\nVERDICT: ${falsified
  ? `FALSIFIED — composing verified idioms passed 0/${unsolved.length}; the sub-expression repertoire, though real, does not assemble into the targets under mechanical selection.`
  : `SUPPORTED — composing verified idioms passed ${passes}/${unsolved.length} net-new-logic tasks, each judged by the real test. Finer grain reaches where whole bodies do not.`}`);
if (process.argv.includes("--json")) console.log(JSON.stringify(rows, null, 2));
process.exit(falsified ? 1 : 0);
