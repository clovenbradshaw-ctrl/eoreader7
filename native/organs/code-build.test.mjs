// ═══ LOVELACE ═══ the build door reads a draw as a SUGGESTION: what it means is resolved against what exists, recorded, and only then assembled.
// The model is a stand-in (drawFn) that hands back the mistakes small coders were MEASURED to make (2026-09-30): an operation re-named (`cToF`),
// a `const` assigned twice, a helper called but never written. The assembled file is then RUN, and judged by values written down independently.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { buildCodeTask, taskLanguage, unitPrompt, planUnits, extractUnit, clauseOf, describeBuild } from "./code-build.js";
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

test("extractUnit keeps the WHOLE unit: a body is full of lines that start with const/let (the cut that shipped every JavaScript unit with a local variable as a bare signature)", () => {
  const text = "```js\nfunction windLabel(ms) {\n  const mph = ms * 2.2369362920544;\n  let s = Math.round(mph);\n  return `${s} mph`;\n}\n\nfunction other(x) {\n  const y = 1;\n  return y;\n}\n```";
  const got = extractUnit(text, "windLabel");
  assert.match(got, /^function windLabel\(ms\) \{/); assert.match(got, /const mph/); assert.match(got, /return `\$\{s\} mph`;\n\}$/); assert.doesNotMatch(got, /other/);
  assert.equal(run(got, "windLabel(10)"), "22 mph");
});

test("extractUnit ends a unit at ITS closing brace: strings, template literals and comments that hold braces do not fool it; an arrow and a const function are units too", () => {
  const tricky = "function f(a) {\n  // a } in a comment\n  const s = \"}\" + `{${a}}`; /* } */\n  if (a) { return s; }\n  return '{';\n}\nfunction g() { return 1; }";
  assert.match(extractUnit(tricky, "f"), /return '\{';\n\}$/); assert.doesNotMatch(extractUnit(tricky, "f"), /function g/);
  assert.equal(extractUnit("const sq = (x) => x * x;\nconst cube = (x) => x * x * x;", "sq"), "const sq = (x) => x * x;");
  assert.equal(extractUnit("const add = (a, b) => {\n  const t = a + b;\n  return t;\n};\nconst z = 1;", "add"), "const add = (a, b) => {\n  const t = a + b;\n  return t;\n};");
  assert.equal(extractUnit("function nope() {}", "missing"), "");
});

test("extractUnit for Python ends at the first line indented no deeper than the def: a nested def stays, the next top-level function does not", () => {
  const text = "def tally(numbers):\n    def add(a, b):\n        return a + b\n    total = 0\n    for n in numbers:\n        total = add(total, n)\n    return total\n\ndef other():\n    return 1\n";
  const got = extractUnit(text, "tally");
  assert.match(got, /def add/); assert.match(got, /return total$/); assert.doesNotMatch(got, /other/);
});

test("a unit is offered the operations ITS OWN clause names, not the whole file's", async () => {
  const task = "Write a JavaScript module with these functions: toFahrenheit(celsius) converts degrees Celsius to degrees Fahrenheit; windLabel(ms) converts a wind speed in metres per second to a string like \"22 mph\"; legMiles(lat1, lon1, lat2, lon2) returns the great-circle distance in statute miles, rounded to one decimal.";
  const units = planUnits(task);
  assert.match(clauseOf(task, units, 0), /^toFahrenheit\(celsius\) converts degrees Celsius[^]*Fahrenheit;\s*$/); assert.doesNotMatch(clauseOf(task, units, 0), /windLabel/);
  assert.match(clauseOf(task, units, 2), /^legMiles\([^]*decimal\.$/);
  const seen = {};
  await buildCodeTask({ task, model: "stand-in", out: tmp(), drawFn: async (m, prompt) => { const name = /named `(\w+)`/.exec(prompt)[1]; seen[name] = prompt; return { text: `function ${name}() { return 1; }`, tokens: 1 }; } });
  assert.match(seen.toFahrenheit, /celsiusToFahrenheit/); assert.doesNotMatch(seen.toFahrenheit, /haversineKm|msToMph/);
  assert.match(seen.windLabel, /msToMph/); assert.doesNotMatch(seen.windLabel, /celsiusToFahrenheit|haversineKm/);
  assert.match(seen.legMiles, /haversineKm/); assert.doesNotMatch(seen.legMiles, /celsiusToFahrenheit|msToMph/);
});

test("a draw the server cut off at its token cap is asked AGAIN once with more room, and named if it is cut twice (a half-written function is not an answer)", async () => {
  const full = "function tally(numbers) {\n  let t = 0;\n  for (const n of numbers) { t += n; }\n  return t;\n}";
  const calls = [];
  const out = tmp();
  const r = await buildCodeTask({ task: "Write a JavaScript file with functions: tally(numbers), count(items).", model: "stand-in", out, drawFn: async (m, prompt, opts) => {
    const name = /named `(\w+)`/.exec(prompt)[1]; calls.push([name, opts?.maxTokens ?? null]);
    if (name === "tally") return opts?.maxTokens ? { text: full, tokens: 40 } : { text: full.slice(0, 40), tokens: 20, truncated: true };
    return { text: "function count(items) {\n  const n = items", tokens: 20, truncated: true };
  } });
  assert.deepEqual(calls.filter(([n]) => n === "tally"), [["tally", null], ["tally", 440]], "cut once: asked again with more room");
  assert.equal(run(r.code.split("\n\n")[0], "tally([1, 2, 3])"), 6);
  assert.deepEqual(r.canonical.unresolved.map((f) => [f.unit, f.kind]), [["count", "truncated"]], "cut twice: the unit is NAMED, not shipped as if it were whole");
  assert.equal(r.verified, false, "and the file does not parse, which is what the check says");
  fs.rmSync(out, { force: true });
});

test("a unit that does not parse is a finding naming the unit", async () => {
  const out = tmp();
  const r = await buildCodeTask({ task: TASK, model: "stand-in", out, drawFn: stand({ describeTemp: "function describeTemp(c) { return c +; }", tally: "function tally(n) { return n.length; }" }) });
  assert.deepEqual(r.canonical.unresolved.map((f) => [f.unit, f.kind]), [["describeTemp", "does_not_parse"]]);
  fs.rmSync(out, { force: true });
});

test("describeBuild says what happened in plain words: how it was built, whether anything ran it, what the reading did, what is unsettled — and carries the code", async () => {
  const out = tmp();
  const r = await buildCodeTask({ task: TASK, model: "stand-in", out, drawFn: stand({
    describeTemp: "function describeTemp(celsius) { const t = cToF(celsius); return formatTemp(t); }",
    tally: "function tally(numbers) { const total = 0; for (const n of numbers) total += n; return total; }",
  }) });
  const said = describeBuild(r);
  assert.match(said, /^Built 2 unit\(s\) — describeTemp, tally — drawn independently/);
  assert.match(said, /it parses; no test was given, so nothing has run it/, "a parse is not a run, and it says so");
  assert.match(said, /`cToF` is `celsiusToFahrenheit`/); assert.match(said, /`total` is assigned again, so it is a `let`/);
  assert.match(said, /describeTemp calls `formatTemp`, which nothing in the file declares/);
  assert.match(said, /```js\n[\s\S]*function describeTemp[\s\S]*```$/);
  assert.doesNotMatch(said, /canonical|suggestion|apparatus|transformation/i, "the person reads plain words, not the machinery's names");
  fs.rmSync(out, { force: true });
});

test("a card a unit uses as a CALLBACK is carried into the file: .map(parseMoney) is a use, not only parseMoney(x)", async () => {
  const out = tmp();
  const r = await buildCodeTask({ task: "Write a JavaScript module with these functions: total(prices) returns the sum of prices written like \"$1,234.50\", count(items) returns how many.", model: "stand-in", out, drawFn: stand({
    total: "function total(prices) { return prices.map(parseMoney).reduce((a, b) => a + b, 0); }",
    count: "function count(items) { return items.length; }",
  }) });
  assert.deepEqual(r.canonical.cards, ["parseMoney"]);
  assert.equal(run(r.code, "total([\"$1,234.50\", \"5\"])"), 1239.5);
  fs.rmSync(out, { force: true });
});
