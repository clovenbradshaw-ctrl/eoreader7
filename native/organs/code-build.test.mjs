// ═══ LOVELACE ═══ the build door reads a draw as a SUGGESTION: what it means is resolved against what exists, recorded, and only then assembled.
// The model is a stand-in (drawFn) that hands back the mistakes small coders were MEASURED to make (2026-09-30): an operation re-named (`cToF`),
// a `const` assigned twice, a helper called but never written. The assembled file is then RUN, and judged by values written down independently.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { buildCodeTask, taskLanguage, unitPrompt, planUnits } from "./code-build.js";
import { readAnchorLog, settledContent } from "../adapters/build/code-anchor-log.js";

const TASK = "Write a JavaScript module with these functions: describeTemp(celsius) returns the temperature in Fahrenheit rounded to one decimal, like 72.5F; tally(numbers) returns the sum of an array of numbers.";
const run = (code, expr) => { const ctx = vm.createContext(Object.create(null)); return vm.runInContext(`${code}\n${expr}`, ctx); };
const stand = (byName) => async (model, prompt) => { const m = /named `(\w+)`/.exec(prompt); return { text: byName[m[1]] ?? "", tokens: 10, prompt }; };
const tmp = () => path.join(os.tmpdir(), `er7-build-test-${process.pid}-${Math.random().toString(36).slice(2)}.js`);

test("the language comes from the task's own words: a JavaScript task is offered the operations it names, a Python or unstated one is offered none", () => {
  assert.equal(taskLanguage("Write a JavaScript module with functions a(x), b(y)"), "js");
  assert.equal(taskLanguage("Write a Python file with functions a(x), b(y)"), "py");
  assert.equal(taskLanguage("Write a file with functions a(x), b(y)"), null);
  assert.equal(taskLanguage("Write a script in node named: a, b, c"), "js");
  assert.match(unitPrompt(TASK, "describeTemp", ["celsiusToFahrenheit"]), /already exist[\s\S]*celsiusToFahrenheit/);
  assert.doesNotMatch(unitPrompt(TASK, "describeTemp", []), /already exist/);
});

test("a suggestion is READ: `cToF` is the card celsiusToFahrenheit, the file carries that card once, and the assembled file gives the right answer", async () => {
  const out = tmp();
  const r = await buildCodeTask({ task: TASK, model: "stand-in", out, drawFn: stand({
    describeTemp: "function describeTemp(celsius) { return roundTo(cToF(celsius), 1) + \"F\"; }",
    tally: "function tally(numbers) { const total = 0; for (const n of numbers) total += n; return total; }",
  }) });
  assert.equal(r.ok, true);
  assert.equal(r.verified, "syntax_only", "a parse is all a task with no test can claim");
  assert.deepEqual(r.canonical.cards.sort(), ["celsiusToFahrenheit", "roundTo"], "only the cards the units call are in the file");
  assert.deepEqual(r.canonical.transformations.map((t) => `${t.unit}:${t.kind}`).sort(), ["describeTemp:call_resolved", "tally:const_to_let"]);
  assert.equal(run(r.code, "describeTemp(22.5)"), "72.5F", "22.5C is 72.5F — the value is independent of this file");
  assert.equal(run(r.code, "tally([1, 2, 3.5])"), 6.5, "the const that would have thrown is a let");
  assert.deepEqual(r.canonical.unresolved, []);
  fs.rmSync(out, { force: true });
});

test("what nothing declares is FINDING, never a guess and never passed off as verified: the helper a unit calls but never wrote", async () => {
  const out = tmp();
  const r = await buildCodeTask({ task: TASK, model: "stand-in", out, drawFn: stand({
    describeTemp: "function describeTemp(celsius) { return formatTemp(celsius * 1.8 + 32); }",
    tally: "function tally(numbers) { return numbers.reduce((a, b) => a + b, 0); }",
  }) });
  assert.deepEqual(r.canonical.unresolved.map((f) => [f.unit, f.name]), [["describeTemp", "formatTemp"]]);
  assert.equal(r.verified, "syntax_only", "the parse passes; the finding is what says it would throw");
  assert.throws(() => run(r.code, "describeTemp(1)"), /formatTemp is not defined/);
  fs.rmSync(out, { force: true });
});

test("a sibling unit is not a free call: a unit that calls another unit of the same file is neither rewritten to a card that resembles it nor a finding", async () => {
  const task = "Write a JavaScript file with functions: toFahrenheit(celsius) which converts, and report(celsius) which prints it.";
  const out = tmp();
  const r = await buildCodeTask({ task, model: "stand-in", out, drawFn: stand({
    toFahrenheit: "function toFahrenheit(celsius) { return celsius * 1.8 + 32; }",
    report: "function report(celsius) { return toFahrenheit(celsius) + \"F\"; }",
  }) });
  assert.deepEqual(r.canonical.transformations, []); assert.deepEqual(r.canonical.unresolved, []); assert.deepEqual(r.canonical.cards, []);
  assert.equal(run(r.code, "report(100)"), "212F");
  fs.rmSync(out, { force: true });
});

test("the platform's own calls are not findings (require, fetch, setTimeout), and a Python draw is left exactly as said", async () => {
  const out = tmp();
  const r = await buildCodeTask({ task: TASK, model: "stand-in", out, drawFn: stand({
    describeTemp: "function describeTemp(celsius) { return require(\"util\").format(\"%s\", celsius); }",
    tally: "function tally(numbers) { return numbers.length; }",
  }) });
  assert.deepEqual(r.canonical.unresolved, []);
  fs.rmSync(out, { force: true });
  const py = await buildCodeTask({ task: "Write a Python file with functions: tally(numbers), describeTemp(celsius).", model: "stand-in", out: out.replace(/\.js$/, ".py"), drawFn: stand({
    tally: "def tally(numbers):\n    return sum(numbers)", describeTemp: "def describeTemp(celsius):\n    return celsius * 1.8 + 32",
  }) });
  assert.deepEqual(py.canonical.transformations, []); assert.deepEqual(py.canonical.unresolved, []);
  assert.match(py.code, /def tally/); fs.rmSync(out.replace(/\.js$/, ".py"), { force: true });
});

test("a rewrite that would break the parse is refused: the suggestion stands as said", async () => {
  // a unit whose text parses only as written (a stray word makes the rewritten form unparseable is not reachable by these transformations, so the
  // guard is pinned directly: adoptIf(1, 0) is false)
  const { adoptIf } = await import("./code-canonical.js");
  assert.equal(adoptIf(1, 0), false); assert.equal(adoptIf(1, 1), true); assert.equal(adoptIf(0, 1), true);
});

test("the record outlives the run: each draw lands as a suggestion and a canonical entry, and the fold settles on the canonical one", async () => {
  const out = tmp(), dir = fs.mkdtempSync(path.join(os.tmpdir(), "er7-anchors-"));
  await buildCodeTask({ task: TASK, model: "stand-in", out, anchorDir: dir, drawFn: stand({
    describeTemp: "function describeTemp(celsius) { return cToF(celsius); }",
    tally: "function tally(numbers) { return numbers.length; }",
  }) });
  const log = readAnchorLog(path.join(dir, "describeTemp.jsonl"));
  assert.ok(log.entries.some((e) => e.operator === "SIG" && /cToF/.test(e.suggestion)), "the raw suggestion is on the record, exactly as said");
  assert.ok(log.entries.some((e) => e.operator === "CON" && e.transformation?.kind === "call_resolved"));
  assert.match(settledContent(log, "describeTemp").content, /celsiusToFahrenheit\(celsius\)/, "the fold is computed from the canonical entry, not the suggestion");
  fs.rmSync(out, { force: true }); fs.rmSync(dir, { recursive: true, force: true });
});

test("planUnits is unchanged: only call-shaped names are units", () => {
  assert.deepEqual(planUnits(TASK).map((u) => u.name), ["describeTemp", "tally"]);
});
