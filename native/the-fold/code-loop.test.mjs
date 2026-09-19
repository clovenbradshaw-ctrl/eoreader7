import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseProposal, checkFenced, runCodeLoop, PROPOSAL_FORMAT as PROPOSAL_FORMAT_FOR_TESTS } from "./code-loop.js";

// First pins on the loop's proposal grammar (previously entirely
// untested): a narrow declared shape in, a typed action out — never a
// guess at what was meant. runCodeLoop itself needs a live mouth and
// stays driver-tested, not unit-tested.

test("parseProposal: read action with a real path shape", () => {
  const r = parseProposal("ACTION: read\nPATH: src/app.py\n");
  assert.deepEqual(r, { ok: true, action: "read", path: "src/app.py" });
});

test("parseProposal: patch with ACTION line", () => {
  const r = parseProposal("ACTION: patch\nPATH: app.py\n<<<FIND>>>\ndef main():\n<<<ADD>>>\ndef main():\n    run()\n<<<END>>>");
  assert.equal(r.ok, true);
  assert.equal(r.action, "patch");
  assert.equal(r.path, "app.py");
  assert.equal(r.find, "def main():");
  assert.equal(r.add, "def main():\n    run()");
});

test("parseProposal: patch without ACTION line (backward compatible)", () => {
  const r = parseProposal("PATH: k.js\n<<<FIND>>>\nfoo()\n<<<ADD>>>\nbar()\n<<<END>>>");
  assert.equal(r.ok, true);
  assert.equal(r.action, "patch");
});

test("parseProposal: empty ADD is a delete (trailing newline trimmed)", () => {
  const r = parseProposal("PATH: x.py\n<<<FIND>>>\nold_line\n<<<ADD>>>\n\n<<<END>>>");
  assert.equal(r.ok, true);
  assert.equal(r.add, "");
});

test("parseProposal: prose with no block is a typed gap, never a guess", () => {
  const r = parseProposal("I think you should rewrite the whole file, it looks wrong.");
  assert.equal(r.ok, false);
  assert.equal(r.gap.kind, "unparsed_proposal");
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
