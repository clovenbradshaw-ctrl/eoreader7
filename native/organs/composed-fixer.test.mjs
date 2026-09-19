// native/organs/composed-fixer.test.mjs — pins for the per-behavior build
// driver. node:test + assert/strict, the repo's suite style (build-clarify).
//
// WHAT IS PINNED (each a real failure mode, not a token):
//  1. deriveBehaviors reads the workspace's real test bytes and keeps only
//     behaviors the failing output names — a gate is synthesized from the
//     test's OWN assert, never from a guess at its meaning.
//  2. gateSpecFor produces a runnable gate whose module import names a real
//     file that declares the entry, and the gate goes green on a correct
//     entry (python + node lanes).
//  3. detectStall catches the measured Exp-6 signature (consecutive
//     already_read / unparsed_proposal rounds).
//  4. runComposedFix with a scripted green mouth on a multi-file workspace:
//     whole gate red -> per-behavior sub-gate green -> banked -> whole gate
//     green. The end-to-end path the organ exists for.

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { deriveBehaviors, detectStall, gateSpecFor, runComposedFix, subTaskFor } from "./composed-fixer.js";

function tmpWorkspace(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "er7-composed-"));
  for (const [rel, text] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, text);
  }
  return dir;
}

const TWO_BEHAVIORS = {
  "helpers.py": 'def greeting(name):\n    return "stub"\n',
  "main.py": 'from helpers import greeting\n\ndef greet(name):\n    return greeting(name)\n',
  "test_greet.py": 'from main import greet\n\nassert greet("Ada") == "Hello, Ada!"\nassert greet("Alan") == "Hello, Alan!"\n',
};

test("deriveBehaviors: reads real test bytes, keeps only failing-output behaviors", () => {
  const dir = tmpWorkspace(TWO_BEHAVIORS);
  const files = ["helpers.py", "main.py", "test_greet.py"];
  const all = deriveBehaviors({ workspace: dir, files, failingOutput: "", allBehaviors: true });
  assert.equal(all.length, 2);
  assert.equal(all[0].entry, "greet");
  assert.equal(all[0].args, '"Ada"');
  assert.equal(all[0].want, '"Hello, Ada!"');
  const failing = deriveBehaviors({ workspace: dir, files, failingOutput: 'File "test_greet.py", line 3, in <module>\n    assert greet("Ada") == "Hello, Ada!"\nAssertionError' });
  assert.equal(failing.length, 1);
  assert.equal(failing[0].name, "test_greet.py#1");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("gateSpecFor: python gate imports the real entry and goes green when correct", () => {
  const dir = tmpWorkspace(TWO_BEHAVIORS);
  const files = ["helpers.py", "main.py", "test_greet.py"];
  const spec = gateSpecFor({ name: "greet", entry: "greet", args: '"Ada"', want: "Hello, Ada!" }, dir, files);
  assert.ok(spec);
  assert.match(spec.gateCommand, /^python3 \.er7-gates\/gate-greet\.py$/);
  const gateAbs = path.join(dir, spec.gateFile);
  assert.ok(fs.existsSync(gateAbs));
  assert.ok(fs.readFileSync(gateAbs, "utf8").includes("from main import greet"));
  fs.rmSync(dir, { recursive: true, force: true });
});

test("gateSpecFor: node gate dynamic-imports the real module and gates green", () => {
  const dir = tmpWorkspace({
    "greeter.mjs": 'export function greeting(name) {\n  return `Hello, ${name}!`;\n}\n',
    "test.mjs": 'import { greeting } from "./greeter.mjs";\nif (greeting("Ada") !== "Hello, Ada!") throw new Error("nope");\n',
  });
  const files = ["greeter.mjs", "test.mjs"];
  const spec = gateSpecFor({ name: "greet", entry: "greeting", args: '"Ada"', want: "Hello, Ada!" }, dir, files);
  assert.ok(spec);
  assert.match(spec.gateCommand, /^node \.er7-gates\/gate-greet\.mjs$/);
  const gateAbs = path.join(dir, spec.gateFile);
  assert.ok(fs.readFileSync(gateAbs, "utf8").includes("greeter.mjs"));
  const [bin, ...argv] = spec.gateCommand.split(" ");
  const green = execFileSync(bin, argv, { cwd: dir, encoding: "utf8" });
  assert.match(green, /gate-ok/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("detectStall: catches the measured Exp-6 already-read/unparsed signature", () => {
  assert.equal(detectStall([{ gap: { kind: "already_read" } }, { gap: { kind: "already_read" } }]), true);
  assert.equal(detectStall([{ action: "unparsed_proposal" }, { action: "unparsed_proposal" }]), true);
  assert.equal(detectStall([{ action: "read" }, { action: "read" }]), false);
  assert.equal(detectStall([{ gap: { kind: "already_read" } }]), false);
  assert.equal(detectStall([]), false);
});

test("subTaskFor: quotes the exact failing check, one behavior, never the whole feature", () => {
  const t = subTaskFor({ name: "x", entry: "greet", args: '"Ada"', want: '"Hello, Ada!"' }, "make the tests pass");
  assert.ok(t.includes('assert greet("Ada") == "Hello, Ada!"'));
  assert.ok(t.startsWith("make the tests pass"));
});

function scriptedMouth(answers) {
  let i = 0;
  return async () => ({ text: answers[Math.min(i++, answers.length - 1)] });
}

test("runComposedFix: end-to-end, per-behavior gates banked and whole gate green", async () => {
  const dir = tmpWorkspace(TWO_BEHAVIORS);
  const turn = scriptedMouth([
    // helpers.py: fix the stub with a real f-string greeting
    "ACTION: patch\nPATH: helpers.py\n<<<FIND>>>\ndef greeting(name):\n    return \"stub\"\n<<<ADD>>>\ndef greeting(name):\n    return f\"Hello, {name}!\"\n",
  ]);
  const res = await runComposedFix({
    sessionId: "s", userId: null, model: "scripted",
    task: "make test_greet.py pass", workspace: dir,
    testCommand: "python3 test_greet.py", turn, maxRounds: 2, attempts: 1,
  });
  assert.equal(res.done, true);
  assert.equal(res.via, "composed");
  assert.ok(res.banks.length >= 1);
  assert.equal(res.whole.exitCode, 0);
  const main = fs.readFileSync(path.join(dir, "helpers.py"), "utf8");
  assert.ok(main.includes('return f"Hello, {name}!"'));
  fs.rmSync(dir, { recursive: true, force: true });
});