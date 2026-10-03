import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseProposal, checkFenced, runCodeLoop, figureOpFor, locateMissingUnit, PROPOSAL_FORMAT as PROPOSAL_FORMAT_FOR_TESTS } from "./code-loop.js";
import { openFolder } from "../adapters/sources/folder-index.js";

// First pins on the loop's proposal grammar (previously entirely
// untested): a narrow declared shape in, a typed action out — never a
// guess at what was meant. runCodeLoop itself needs a live mouth and
// stays driver-tested, not unit-tested.

test("parseProposal: a plain read maps to SIG · scout in the round record (Gary: the mouth never names the operator)", () => {
  const r = parseProposal("ACTION: read\nPATH: src/app.py\n");
  assert.deepEqual(r, { ok: true, action: "SIG", path: "src/app.py" });
});

test("parseProposal: patch with ACTION line maps to INS · admit", () => {
  const r = parseProposal("ACTION: patch\nPATH: app.py\n<<<FIND>>>\ndef main():\n<<<ADD>>>\ndef main():\n    run()\n<<<END>>>");
  assert.equal(r.ok, true);
  assert.equal(r.action, "INS");
  assert.equal(r.path, "app.py");
  assert.equal(r.find, "def main():");
  assert.equal(r.add, "def main():\n    run()");
});

test("parseProposal: patch without ACTION line (backward compatible)", () => {
  const r = parseProposal("PATH: k.js\n<<<FIND>>>\nfoo()\n<<<ADD>>>\nbar()\n<<<END>>>");
  assert.equal(r.ok, true);
  assert.equal(r.action, "INS");
});

test("parseProposal: empty ADD is a delete (trailing newline trimmed)", () => {
  const r = parseProposal("PATH: x.py\n<<<FIND>>>\nold_line\n<<<ADD>>>\n\n<<<END>>>");
  assert.equal(r.ok, true);
  assert.equal(r.add, "");
});

test("parseProposal: a fenced read block is absorbed (the frontier mouth's natural shape, 2026-10-03)", () => {
  const r = parseProposal("I need to see the actual content before I propose anything.\n\n```read\nsrc/route.js\n```\n");
  assert.equal(r.ok, true);
  assert.equal(r.action, "SIG");
  assert.equal(r.path, "src/route.js");
  assert.equal(r.absorbed, "fenced-read");
});

test("parseProposal: several fenced reads in one answer are all honored (one round, not N)", () => {
  const r = parseProposal("```read\nsrc/a.js\nsrc/b.js\n```\n");
  assert.equal(r.ok, true);
  assert.equal(r.action, "SIG");
  assert.deepEqual(r.paths, ["src/a.js", "src/b.js"]);
});

test("parseProposal: a fenced read in located mode is still the typed unexpected_read, never a silent path", () => {
  const r = parseProposal("```read\nsrc/route.js\n```\n", { impliedPath: "src/route.js" });
  assert.equal(r.ok, false);
  assert.equal(r.gap.kind, "unexpected_read");
});

test("parseProposal: prose with no block is a typed gap, never a guess", () => {
  const r = parseProposal("I think you should rewrite the whole file, it looks wrong.");
  assert.equal(r.ok, false);
  assert.equal(r.gap.kind, "unparsed_proposal");
});

test("parseProposal: a PATH-less patch resolves to the machine-located file (the solution.py lesson, 2026-10-01)", () => {
  const r = parseProposal("<<<FIND>>>\ndef f():\n    return 1\n<<<ADD>>>\ndef f():\n    return 2\n<<<END>>>", { impliedPath: "app.py" });
  assert.equal(r.ok, true);
  assert.equal(r.action, "INS");
  assert.equal(r.path, "app.py");
  assert.equal(r.pathless, true);
  assert.equal(r.find, "def f():\n    return 1");
  assert.equal(r.add, "def f():\n    return 2");
});

test("parseProposal: an explicit PATH to the located file is accepted (harmless, the same file)", () => {
  const r = parseProposal("PATH: app.py\n<<<FIND>>>\nx\n<<<ADD>>>\ny\n<<<END>>>", { impliedPath: "app.py" });
  assert.equal(r.ok, true);
  assert.equal(r.path, "app.py");
  assert.equal(r.pathless, undefined);
});

test("parseProposal: an explicit PATH to ANY other file is a typed gap in located mode — the attractor is structurally closed, never hunted (2026-10-01)", () => {
  const r = parseProposal("PATH: solution.py\n<<<FIND>>>\nx\n<<<ADD>>>\ny\n<<<END>>>", { impliedPath: "app.py" });
  assert.equal(r.ok, false);
  assert.equal(r.gap.kind, "unexpected_path");
  assert.match(r.gap.reason, /you are editing app\.py/);
});

test("parseProposal: PATH-less with no impliedPath is still a typed gap", () => {
  const r = parseProposal("<<<FIND>>>\nx\n<<<ADD>>>\ny\n<<<END>>>");
  assert.equal(r.ok, false);
  assert.equal(r.gap.kind, "unparsed_proposal");
});

test("parseProposal: a read is a typed gap in located mode — the located file's bytes are already shown (2026-10-01)", () => {
  const r = parseProposal("ACTION: read\nPATH: other.js\n", { impliedPath: "app.js" });
  assert.equal(r.ok, false);
  assert.equal(r.gap.kind, "unexpected_read");
});

test("checkFenced: fenced FIND/ADD on code files refused with the fix named", () => {
  const r = checkFenced("app.py", "```python\ndef f():\n```", "def f():\n    pass\n");
  assert.equal(r.ok, false);
  assert.equal(r.gap.kind, "fenced_proposal");
  assert.match(r.gap.reason, /drop the ``` fences/);
  const r2 = checkFenced("app.py", "def f():\n    pass\n", "```python\ndef f():\n```");
  assert.equal(r2.ok, false);
});

test("checkFenced: markdown and strangers admitted (their bytes may hold fences)", () => {
  assert.deepEqual(checkFenced("notes.md", "```python\ndef f():\n```", "x"), { ok: true });
  assert.deepEqual(checkFenced("Makefile", "```\nfoo\n```", "x"), { ok: true });
  assert.deepEqual(checkFenced("app.py", "def f():\n    pass\n", "def f():\n    return 1\n"), { ok: true });
});

test("PROPOSAL_FORMAT carries a worked example with fake names (falsified both ways: no example collapses the shape at 2b — fences, trailing newlines, directory-as-path; real names echo)", () => {
  const format = PROPOSAL_FORMAT_FOR_TESTS;
  assert.match(format, /Worked example/);
  assert.match(format, /every name below is fake/);
  assert.doesNotMatch(format, /def stub\(\)/);
});

// figureOpFor — the slot-level (Figure-grain) operator, derived from the
// declaration diff in the bare-metal fold's own semantics. The fixed-DEF
// attribution is falsified here: only a slot-redefinition is DEF; a born
// declaration is INS, a removed one is SEG, a multi-change is SYN.
test("figureOpFor: a patch that redefines an existing slot is DEF (set a value within the current frame)", () => {
  const before = "function add(a, b) {\n  return a + b;\n}\n";
  const after = "function add(a, b) {\n  return a * b;\n}\n";
  assert.equal(figureOpFor(before, after, "math.js"), "DEF");
});

test("figureOpFor: python body redefinition is DEF — the loop's own fix-the-failing-test case", () => {
  const before = "def get_initials(arg0):\n    return 'x'\n";
  const after = "def get_initials(arg0):\n    return 'A.L.'\n";
  assert.equal(figureOpFor(before, after, "solution.py"), "DEF");
});

test("figureOpFor: a born declaration is INS, never DEF (falsifies the fixed-DEF reading)", () => {
  const before = "function add(a, b) {\n  return a + b;\n}\n";
  const after = "function add(a, b) {\n  return a + b;\n}\nfunction mul(a, b) {\n  return a * b;\n}\n";
  assert.equal(figureOpFor(before, after, "math.js"), "INS");
});

test("figureOpFor: a removed declaration is SEG (moved across the partition boundary)", () => {
  const before = "function add(a, b) {\n  return a + b;\n}\nfunction mul(a, b) {\n  return a * b;\n}\n";
  const after = "function add(a, b) {\n  return a + b;\n}\n";
  assert.equal(figureOpFor(before, after, "math.js"), "SEG");
});

test("figureOpFor: a slot redefined AND a slot born in one patch is SYN (recomposition)", () => {
  const before = "function add(a, b) {\n  return a + b;\n}\nfunction mul(a, b) {\n  return a * b;\n}\n";
  const after = "function add(a, b) {\n  return a + b;\n}\nfunction mul(a, b) {\n  return a / b;\n}\nfunction div(a, b) {\n  return a - b;\n}\n";
  assert.equal(figureOpFor(before, after, "math.js"), "SYN");
});

test("figureOpFor: an edit that touches no declaration is null (prose/whitespace — only the byte op exists)", () => {
  assert.equal(figureOpFor("some prose\n", "some prose\n\n", "notes.txt"), null);
  assert.equal(figureOpFor("x", "x", "math.js"), null);
});

test("runCodeLoop: the territory ground aims round 1 at the task's own files — whole-workspace SEG before the model (2026-10-01)", async () => {
  // The 2026-09-30 live failure was a small mouth inventing `solution.py`
  // when no file was located for it. With a territory handle, round 1 must
  // already name the real file the task's words resolve to and show its
  // real bytes — the model never has to guess a path.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "loopground-"));
  fs.writeFileSync(path.join(dir, "math.js"), "export function add(a, b) {\n  return a + b;\n}\n");
  fs.writeFileSync(path.join(dir, "notes.txt"), "unrelated prose about the weather\n");
  const handle = await openFolder(dir, { workers: 2 });
  let round1Content = "";
  const mouth = async ({ chatHistory }) => {
    round1Content = chatHistory?.[0]?.content ?? "";
    return { text: "ACTION: read\nPATH: math.js\n" };
  };
  await runCodeLoop({
    sessionId: "test-ground", userId: null, model: "fake",
    task: "make the add function return a * b instead of a + b",
    workspace: dir, testCommand: "node -e \"process.exit(1)\"", maxRounds: 1, testTimeoutMs: 15000,
    candidates: 1, turn: mouth, territory: handle,
  });
  assert.match(round1Content, /whole workspace was read and indexed/);
  assert.match(round1Content, /math\.js/);
  assert.match(round1Content, /real bytes/);
  assert.match(round1Content, /You are editing: math\.js/);
});

test("runCodeLoop: a PATH-less patch edits the machine-located file and passes the real test (2026-10-01)", async () => {
  // The live failure (2026-09-30 / 2026-10-01) was the mouth naming a
  // non-existent path. With the territory ground locating the file, the
  // mouth proposes FIND/ADD with NO PATH and the loop resolves it to the
  // located file; the real declared test decides. The model cannot
  // hallucinate a path it never emits.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "looppathless-"));
  fs.writeFileSync(path.join(dir, "solution.py"), "def f():\n    return 1\n");
  fs.writeFileSync(path.join(dir, "check.py"), "exec(open('solution.py').read())\nassert f() == 2\nprint('TASK GREEN')\n");
  const handle = await openFolder(dir, { workers: 2 });
  const mouth = async () => ({ text: "<<<FIND>>>\ndef f():\n    return 1\n<<<ADD>>>\ndef f():\n    return 2\n<<<END>>>" });
  const result = await runCodeLoop({
    sessionId: "test-pathless", userId: null, model: "fake",
    task: "fix f to return 2",
    workspace: dir, testCommand: "python3 check.py", maxRounds: 2, testTimeoutMs: 15000,
    candidates: 1, turn: mouth, territory: handle,
  });
  assert.equal(result.done, true, `expected the path-less patch on the located file to pass; rounds: ${JSON.stringify(result.rounds)}`);
  assert.equal(result.rounds[0].action, "INS");
  assert.equal(result.rounds[0].path, "solution.py");
  assert.equal(result.rounds[0].applied, true);
  assert.equal(result.rounds[0].figureOp, "DEF");
});

test("runCodeLoop: identical failing body gets a repeat witness, not silence (2026-09-19)", async () => {
  // The mouth (injected fake) re-sends the SAME code every draw. It can
  // never pass — the loop must tell it, at least once, that these exact
  // bytes already ran the real test and failed. A repeat is a fact, not
  // a prohibition: retry stays possible, the silence ends.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "looprep-"));
  const badBody = "def get_initials(arg0):\n    return 'x'\n";
  fs.writeFileSync(path.join(dir, "solution.py"), badBody);
  fs.writeFileSync(path.join(dir, "test_body.py"), 'assert get_initials("Ada Lovelace") == "A.L."\n');
  fs.writeFileSync(path.join(dir, "check.py"), "exec(open('solution.py').read())\nexec(open('test_body.py').read())\nprint('TASK GREEN')\n");
  const taskTexts = [];
  const mouth = async ({ task }) => {
    taskTexts.push(task);
    return { text: `PATH: solution.py\n<<<FIND>>>\ndef get_initials(arg0):\n    return 'x'\n<<<ADD>>>\n${badBody}<<<END>>>` };
  };
  const result = await runCodeLoop({
    sessionId: "test-rep", userId: null, model: "fake", task: "implement get_initials",
    workspace: dir, testCommand: "python3 check.py", maxRounds: 4, testTimeoutMs: 15000,
    candidates: 1, turn: mouth,
  });
  assert.equal(result.done, false);
  // The first task text is the sighting; the repeat note lands on the
  // third turn at the latest (draw 1 = first test, draw 2 = repeat).
  const withRepeat = taskTexts.findIndex((t) => /exact code was already tested/.test(t));
  assert.ok(withRepeat >= 0, "repeat note never reached the mouth — cycle stayed silent");
  assert.ok(withRepeat >= 1, "repeat note fired before the body was tested twice");
});

test("runCodeLoop: a repeated already-refused READ stops the loop early with a stuck verdict (2026-09-29, measured live)", async () => {
  // Measured live (2026-09-29): a real run burned its ENTIRE round budget
  // re-issuing one already-refused ACTION: read for the same path before
  // giving up with a generic rounds-exhausted disclosure. The loop must now
  // stop as soon as the refusal repeats, not after spending every round on it.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "loopstuck-"));
  fs.writeFileSync(path.join(dir, "solution.py"), "def f():\n    return 1\n");
  fs.writeFileSync(path.join(dir, "check.py"), "raise SystemExit(1)\n");
  let calls = 0;
  const mouth = async () => {
    calls += 1;
    return { text: "ACTION: read\nPATH: solution.py\n" };
  };
  const result = await runCodeLoop({
    sessionId: "test-stuck", userId: null, model: "fake", task: "implement f",
    workspace: dir, testCommand: "python3 check.py", maxRounds: 5, testTimeoutMs: 15000,
    candidates: 1, turn: mouth,
  });
  assert.equal(result.done, false);
  assert.equal(result.stuck?.kind, "already_read");
  assert.equal(calls, 3, "expected exactly 3 draws (first read, first refusal, second refusal triggers the stuck return) — not the full maxRounds=5 budget");
});

test("runCodeLoop: requireReasoning:true lets a normal patch through, via the REAL cli/reason.mjs (2026-09-29)", async () => {
  // No mock, no stub: this really shells out to the real reason.mjs, the
  // same one every edit in this session went through by hand. The claim
  // requireReasoning builds is mechanical (force:"default" testimony), so
  // this proves the wiring is genuine — the gate is actually consulted,
  // not merely present in the source.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "loopreason-"));
  fs.writeFileSync(path.join(dir, "solution.py"), "def f():\n    return 1\n");
  fs.writeFileSync(path.join(dir, "check.py"), "exec(open('solution.py').read())\nassert f() == 2\nprint('TASK GREEN')\n");
  const mouth = async () => ({ text: "PATH: solution.py\n<<<FIND>>>\ndef f():\n    return 1\n<<<ADD>>>\ndef f():\n    return 2\n<<<END>>>" });
  const result = await runCodeLoop({
    sessionId: "test-reasoning", userId: null, model: "fake", task: "fix f to return 2",
    workspace: dir, testCommand: "python3 check.py", maxRounds: 2, testTimeoutMs: 15000,
    candidates: 1, turn: mouth, requireReasoning: true,
  });
  assert.equal(result.done, true, `expected the reasoning-gated patch to apply and pass; rounds: ${JSON.stringify(result.rounds)}`);
  assert.equal(result.rounds[0].gap, undefined, "a mechanical, force:default claim about a normal patch should never be refused by the real reasoning gate");
});

// ── THE MECHANICAL LOCATES (2026-10-03) ──────────────────────────────────
// Measured live: a frontier mouth on a JS task whose test imported a missing
// export (a) burned its whole budget on the wrong file (no stub exists, so
// the void loop chased `bridge-server.mjs`), and (b) had its natural fenced
// read shape refused. Both are now mechanical: the missing unit is located
// from the test's own failure output (pure text, no model), and the fenced
// read is absorbed. These tests pin both, with falsifying controls.

test("locateMissingUnit: Node ESM 'does not provide an export named' resolves the module relative to the importing test file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "looplocate-"));
  fs.mkdirSync(path.join(dir, "src"));
  fs.writeFileSync(path.join(dir, "src", "route.js"), "export function pickGiver() {\n  return null;\n}\n");
  fs.writeFileSync(path.join(dir, "src", "token-test.stub.mjs"), 'import { routeDecision } from "./route.js";\n');
  const output = [
    `file://${path.join(dir, "src", "token-test.stub.mjs")}:1`,
    'import { routeDecision } from "./route.js";',
    "         ^^^^^^^^^^^^^",
    "SyntaxError: The requested module './route.js' does not provide an export named 'routeDecision'",
    "    at #_instantiate (node:internal/modules/esm/module_job:254:21)",
  ].join("\n");
  const r = locateMissingUnit(output, { root: dir, files: ["src/route.js", "src/token-test.stub.mjs"] });
  assert.equal(r?.file, "src/route.js");
  assert.equal(r?.unit, "routeDecision");
  assert.equal(r?.kind, "missing_export");
});

test("locateMissingUnit: Python 'cannot import name' resolves the module relative to the failing file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "looplocate-py-"));
  fs.writeFileSync(path.join(dir, "solution.py"), "def f():\n    return 1\n");
  const output = [
    "Traceback (most recent call last):",
    `  File "${path.join(dir, "check.py")}", line 1, in <module>`,
    "    from solution import routeDecision",
    "ImportError: cannot import name 'routeDecision' from 'solution'",
  ].join("\n");
  const r = locateMissingUnit(output, { root: dir, files: ["solution.py", "check.py"] });
  assert.equal(r?.file, "solution.py");
  assert.equal(r?.unit, "routeDecision");
  assert.equal(r?.kind, "missing_import");
});

test("locateMissingUnit: falsifying control — a target that ALREADY declares the unit is not located (this is some other failure)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "looplocate-ctl-"));
  fs.writeFileSync(path.join(dir, "route.js"), "export function routeDecision() {\n  return 1;\n}\n");
  const output = [
    `file://${path.join(dir, "test.mjs")}:1`,
    "SyntaxError: The requested module './route.js' does not provide an export named 'routeDecision'",
  ].join("\n");
  assert.equal(locateMissingUnit(output, { root: dir, files: ["route.js", "test.mjs"] }), null);
});

test("locateMissingUnit: no importer frame and no workspace root is a typed null, never a guess", () => {
  assert.equal(locateMissingUnit("SyntaxError: The requested module './x.js' does not provide an export named 'y'", {}), null);
});

test("runCodeLoop: a missing export is located mechanically and the mouth patches the named file path-less (the frontier-task fix, 2026-10-03)", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "loopmissing-"));
  fs.mkdirSync(path.join(dir, "src"));
  fs.writeFileSync(path.join(dir, "src", "route.js"), "export function pickGiver(workers) {\n  return workers[0] ?? null;\n}\n");
  fs.writeFileSync(path.join(dir, "src", "token-test.stub.mjs"), [
    'import { test } from "node:test";',
    'import assert from "node:assert/strict";',
    'import { routeDecision } from "./route.js";',
    'test("routeDecision picks the first worker", () => { assert.equal(routeDecision(["a"]), "a"); });',
  ].join("\n") + "\n");
  let sawLocated = null;
  const mouth = async ({ task }) => {
    sawLocated = task;
    return { text: "<<<FIND>>>\nexport function pickGiver(workers) {\n  return workers[0] ?? null;\n}\n<<<ADD>>>\nexport function pickGiver(workers) {\n  return workers[0] ?? null;\n}\n\nexport function routeDecision(workers) {\n  return workers[0] ?? null;\n}\n<<<END>>>" };
  };
  const result = await runCodeLoop({
    sessionId: "test-missing", userId: null, model: "fake", task: "implement routeDecision so the test passes",
    workspace: dir, testCommand: "node src/token-test.stub.mjs", maxRounds: 2, testTimeoutMs: 30000,
    candidates: 1, turn: mouth,
  });
  assert.equal(result.done, true, `expected the located path-less patch to pass; rounds: ${JSON.stringify(result.rounds)}`);
  assert.equal(result.rounds[0].path, "src/route.js", "the machine must aim at the file the test's import names, never the test file");
  assert.match(sawLocated ?? "", /routeDecision/, "the missing unit must be named to the mouth");
  assert.doesNotMatch(sawLocated ?? "", /ACTION: read/, "the located file's bytes are shown; no read round is spent");
});

test("runCodeLoop: a preflight-green test is done with zero draws (a passing test is not a prompt)", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "loopgreen-"));
  fs.writeFileSync(path.join(dir, "check.py"), "print('TASK GREEN')\n");
  let draws = 0;
  const mouth = async () => { draws += 1; return { text: "ACTION: read\nPATH: check.py\n" }; };
  const result = await runCodeLoop({
    sessionId: "test-green", userId: null, model: "fake", task: "nothing to do",
    workspace: dir, testCommand: "python3 check.py", maxRounds: 2, testTimeoutMs: 15000,
    candidates: 1, turn: mouth,
  });
  assert.equal(result.done, true);
  assert.equal(draws, 0, "a green preflight must spend zero model draws");
  assert.equal(result.rounds[0].by, "preflight");
});
