// native/organs/lang-competency.js — a competency ledger per (language × model).
//
// What it measures: does a model's draw, for a small SPEC-STATED task in a
// given language, pass a test that CALLS the code (lesson 21/24)? Nothing is
// a hand-set cutoff: every rate is reported next to a measured null — the
// pass rate of a fluent-but-wrong solution (another task's reference, renamed)
// run against the same test — and a one-sided exact binomial p against it.
// A language whose toolchain is absent yields `unchecked` rows that never
// count (lang-validators.js), so absence of a witness is never a score.
//
// The tasks are ground truth held OUT of every prompt: only `spec` is shown
// to a model; `cases` and the reference solutions never are.
import { appendFileSync, existsSync, readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { canonLanguage, runWithHarness, validateLanguage, toolchainAvailable } from "./lang-validators.js";
import { NEW_TASKS as STRING_TASKS } from "./lang-tasks/strings.js";
import { NEW_TASKS as LIST_TASKS } from "./lang-tasks/lists.js";
import { NEW_TASKS as STRUCTURAL_TASKS } from "./lang-tasks/structural.js";

// Argument literals are numbers, strings and arrays only — valid, identical
// JSON in every target language, so no per-language literal translation.
const BASE_TASKS = [
  {
    id: "sum_evens", snake: "sum_evens",
    spec: "Write a function sum_evens that takes a list of integers and returns the sum of the even numbers in it. An empty list gives 0.",
    cases: [{ args: [[1, 2, 3, 4]], expect: 6 }, { args: [[]], expect: 0 }, { args: [[7, 9]], expect: 0 }, { args: [[-2, 4, 5]], expect: 2 }],
    ref: {
      javascript: "const __F__ = (xs) => xs.filter((x) => x % 2 === 0).reduce((a, b) => a + b, 0);",
      typescript: "const __F__ = (xs: number[]): number => xs.filter((x) => x % 2 === 0).reduce((a, b) => a + b, 0);",
      python: "def __F__(xs):\n    return sum(x for x in xs if x % 2 == 0)",
      ruby: "def __F__(xs)\n  xs.select(&:even?).sum\nend",
    },
  },
  {
    id: "repeat_prefix", snake: "repeat_prefix",
    spec: "Write a function repeat_prefix that takes a string s and an integer k and returns the first k characters of s repeated k times joined together. If s is empty it returns an empty string, and if k is larger than the length of s the whole of s is used as the prefix.",
    cases: [{ args: ["abc", 2], expect: "abab" }, { args: ["", 3], expect: "" }, { args: ["xy", 3], expect: "xyxyxy" }, { args: ["hello", 1], expect: "h" }],
    ref: {
      javascript: "const __F__ = (s, k) => s.slice(0, k).repeat(k);",
      typescript: "const __F__ = (s: string, k: number): string => s.slice(0, k).repeat(k);",
      python: "def __F__(s, k):\n    return s[:k] * k",
      ruby: "def __F__(s, k)\n  s[0, k] * k\nend",
    },
  },
  {
    id: "count_words", snake: "count_words",
    spec: "Write a function count_words that takes a string and returns the number of words in it, where words are separated by one or more spaces. Leading, trailing and repeated spaces do not create extra words. An empty string has 0 words.",
    cases: [{ args: ["a b c"], expect: 3 }, { args: ["  hi   there  "], expect: 2 }, { args: [""], expect: 0 }, { args: ["one"], expect: 1 }],
    ref: {
      javascript: "const __F__ = (s) => s.split(' ').filter((w) => w.length > 0).length;",
      typescript: "const __F__ = (s: string): number => s.split(' ').filter((w) => w.length > 0).length;",
      python: "def __F__(s):\n    return len([w for w in s.split(' ') if w])",
      ruby: "def __F__(s)\n  s.split(' ').length\nend",
    },
  },
  {
    id: "max_gap", snake: "max_gap",
    spec: "Write a function max_gap that takes a list of integers and returns the largest absolute difference between two neighbouring items. A list with fewer than two items gives 0.",
    cases: [{ args: [[1, 5, 2]], expect: 4 }, { args: [[3]], expect: 0 }, { args: [[]], expect: 0 }, { args: [[10, 7, 7, 20]], expect: 13 }],
    ref: {
      javascript: "const __F__ = (xs) => xs.length < 2 ? 0 : Math.max(...xs.slice(1).map((x, i) => Math.abs(x - xs[i])));",
      typescript: "const __F__ = (xs: number[]): number => xs.length < 2 ? 0 : Math.max(...xs.slice(1).map((x, i) => Math.abs(x - xs[i])));",
      python: "def __F__(xs):\n    return max((abs(b - a) for a, b in zip(xs, xs[1:])), default=0)",
      ruby: "def __F__(xs)\n  xs.each_cons(2).map { |a, b| (b - a).abs }.max || 0\nend",
    },
  },
];

// Authored in three scratch batches (strings, lists, structural), each reference verified in
// all four languages and each held-out case licensed by a spec sentence. Ids must stay unique.
export const TASKS = [...BASE_TASKS, ...STRING_TASKS, ...LIST_TASKS, ...STRUCTURAL_TASKS];
if (new Set(TASKS.map((t) => t.id)).size !== TASKS.length) throw new Error("lang-competency: duplicate task id");

// The first two cases are VISIBLE (shown as examples to the lift arms); the rest
// are HELD OUT of every prompt and every repair message. Competency is scored on
// the held-out cases only, so an arm cannot win by memorising what it was shown.
export const VISIBLE = [0, 1];
export const heldOutIdx = (task) => task.cases.map((_, i) => i).filter((i) => !VISIBLE.includes(i));
export const CALL_LANGUAGES = ["javascript", "typescript", "python", "ruby"];

// The spec STATES the snake_case name, so every language is called by it (lesson 24:
// a held-out test may check only what the spec states — a camelCase call would
// fail a correct draw and blame the model for a task bug).
const nameFor = (task) => task.snake;
const lit = (v) => JSON.stringify(v);

// The caller: one explicit call per case (no spread — a typed language checks
// each call), printing one JSON array of results for a deep-equal compare.
export function harnessFor(task, language, name = nameFor(task)) {
  const lang = canonLanguage(language);
  const calls = task.cases.map((c) => `${name}(${c.args.map(lit).join(", ")})`);
  if (lang === "javascript" || lang === "typescript") return `console.log(JSON.stringify([${calls.join(", ")}]));`;
  if (lang === "python") return `import json\nprint(json.dumps([${calls.join(", ")}]))`;
  if (lang === "ruby") return `require 'json'\nputs [${calls.join(", ")}].to_json`;
  return null;
}

// Score one drawn source against one task. Floor first, then the call.
export async function scoreDraw(task, language, source) {
  const lang = canonLanguage(language);
  if (!CALL_LANGUAGES.includes(lang)) return { unchecked: true, reason: `no call harness for ${lang}` };
  if (!(await toolchainAvailable(lang))) return { unchecked: true, reason: `toolchain for ${lang} absent` };
  const floor = await validateLanguage(lang, source);
  if (!floor.ok) return { floorOk: false, callOk: false, cases: task.cases.map(() => false), why: floor.findings[0]?.detail ?? "floor failed" };
  const r = await runWithHarness(lang, source, harnessFor(task, lang));
  if (!r.ran || r.code !== 0) return { floorOk: true, callOk: false, cases: task.cases.map(() => false), why: (r.err || "call failed").trim().slice(0, 300) };
  let got; try { got = JSON.parse(r.out.trim().split("\n").pop()); } catch { return { floorOk: true, callOk: false, cases: task.cases.map(() => false), why: "output not JSON" }; }
  const cases = task.cases.map((c, i) => JSON.stringify(got?.[i]) === JSON.stringify(c.expect));
  return { floorOk: true, callOk: cases.every(Boolean), cases, got, why: cases.every(Boolean) ? "" : "wrong output" };
}

// True iff every HELD-OUT case passed (the competency unit).
export const heldOutPass = (task, s) => !!(s.floorOk && s.cases && heldOutIdx(task).every((i) => s.cases[i]));

// Feedback a real developer would have: a runtime error, or the VISIBLE cases'
// got/want. Held-out cases never appear here.
export function feedbackFor(task, s) {
  if (!s.floorOk) return `It does not compile or parse: ${s.why}`;
  if (s.cases && s.got) {
    const bad = VISIBLE.filter((i) => !s.cases[i]);
    if (bad.length) return bad.map((i) => `${task.snake}(${task.cases[i].args.map(lit).join(", ")}) returned ${JSON.stringify(s.got[i])} but it should return ${JSON.stringify(task.cases[i].expect)}.`).join(" ");
    return "";
  }
  return `Running it failed: ${s.why}`;
}

export const examplesFor = (task) => VISIBLE.map((i) => `${task.snake}(${task.cases[i].args.map(lit).join(", ")}) returns ${JSON.stringify(task.cases[i].expect)}.`).join(" ");

export const referenceFor = (task, language, name) => (task.ref[canonLanguage(language)] ?? "").replaceAll("__F__", name ?? nameFor(task));

// The null: task B's reference, renamed to task A's function, against A's test.
// A test that such a fluent wrong answer passes cannot discriminate. With 15
// tasks the full cross product is 210 runs a language, so each task is paired
// with the NEXT `perTask` tasks' solutions in list order (a fixed, deterministic
// subsample — no random draw to hand-set), run in parallel batches.
export async function nullControl(language, { perTask = 3, batch = 6 } = {}) {
  const lang = canonLanguage(language);
  const pairs = [];
  TASKS.forEach((a, i) => { for (let d = 1; d <= Math.min(perTask, TASKS.length - 1); d++) pairs.push([a, TASKS[(i + d) % TASKS.length]]); });
  let n = 0, passes = 0;
  for (let i = 0; i < pairs.length; i += batch) {
    const results = await Promise.all(pairs.slice(i, i + batch).map(([a, b]) => scoreDraw(a, lang, referenceFor(b, lang, nameFor(a))).then((r) => ({ a, r }))));
    for (const { a, r } of results) {
      if (r.unchecked) return { unchecked: true, n: 0, passes: 0, rate: null };
      n++; if (heldOutPass(a, r)) passes++;
    }
  }
  return { n, passes, rate: n ? passes / n : null };
}

// One-sided exact binomial: P(X >= k) with n trials at success rate p0.
export function pAtLeast(k, n, p0) {
  if (k <= 0) return 1;
  let lg = 0; const lf = [0]; for (let i = 1; i <= n; i++) { lg += Math.log(i); lf[i] = lg; }
  let p = 0;
  for (let i = k; i <= n; i++) p += Math.exp(lf[n] - lf[i] - lf[n - i] + i * Math.log(p0) + (n - i) * Math.log(1 - p0));
  return Math.min(1, p);
}

// Ledger rows: { ts, language, model, task, floorOk, callOk }. Append-only.
export function appendRow(path, row) {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, JSON.stringify({ ts: new Date().toISOString(), ...row }) + "\n");
}
export function readRows(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

// The measured cell. The null uses a Laplace-smoothed rate so a null of 0/12
// still leaves a nonzero p0 — the p is then honest about small samples.
export function competency(rows, language, model, nullResult, arm = null) {
  const lang = canonLanguage(language);
  const mine = rows.filter((r) => canonLanguage(r.language) === lang && r.model === model && !r.unchecked && (arm == null || r.arm === arm));
  const n = mine.length, passes = mine.filter((r) => r.heldOut ?? r.callOk).length;
  const floorPasses = mine.filter((r) => r.floorOk).length;
  if (!nullResult || nullResult.unchecked) return { language: lang, model, n, passes, floorPasses, rate: n ? passes / n : null, nullRate: null, pAboveNull: null, note: "no null measured — rate is not a competency claim" };
  const p0 = (nullResult.passes + 1) / (nullResult.n + 2);
  return { language: lang, model, n, passes, floorPasses, rate: n ? passes / n : null, nullRate: nullResult.rate, pAboveNull: n ? pAtLeast(passes, n, p0) : null };
}
