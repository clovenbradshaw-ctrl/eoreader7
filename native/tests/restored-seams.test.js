import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fragmentRelations, FRAGMENT_DISCLOSURE } from "../adapters/text/fragment-relations.js";
import { openFolder, readDocument } from "../adapters/sources/folder-index.js";
import { ask } from "../organs/territory.js";
import { arrowGate, arrowCycle, bodyHashOf, consecutiveReverts } from "../the-fold/arrow-gate.js";
import { runCodeLoop } from "../the-fold/code-loop.js";

test("a fragment can carry literal endpoints, but a prior cannot invent its head or absent participants", () => {
  const prior = { language: "eng", forms: { eats: { VERB: 5 }, book: { NOUN: 10 } } };
  const rows = fragmentRelations("Alice eats rice.", { prior, verbs: new Set(["eats"]) });
  assert.deepEqual(rows.map((r) => [r.end1, r.label, r.end2]), [["Alice", "eats", "rice"]]);
  assert.deepEqual(fragmentRelations("Alice eats rice.", { prior }), []);
  assert.deepEqual(fragmentRelations("Alice book rice.", { prior, verbs: new Set(["book"]) }), []);
  assert.deepEqual(fragmentRelations("eats rice.", { prior, verbs: new Set(["eats"]) }), []);
  assert.deepEqual(fragmentRelations("Alice eats rice.", { verbs: new Set(["eats"]) }), []);
  assert.ok(FRAGMENT_DISCLOSURE.stagesNotRun.includes("register-learned-construction@2"));
});

test("workspace location reads actual UTF-8 bytes, reports absences and excludes external symlinks and binaries", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "er7-territory-"));
  try {
    fs.writeFileSync(path.join(dir, "math.py"), "def special_sum(a, b):\n    return a + b\n");
    fs.writeFileSync(path.join(dir, "image.bin"), Buffer.from([0, 1, 2]));
    fs.symlinkSync("/etc/passwd", path.join(dir, "outside"));
    const handle = await openFolder(dir);
    const result = ask(handle.index, "special_sum absent_word");
    assert.equal(result.hits[0].name, "math.py");
    assert.deepEqual(result.absent, ["absent_word"]);
    const doc = readDocument(handle, result.hits[0].n);
    assert.equal(doc.text, fs.readFileSync(path.join(dir, doc.name), "utf8"));
    assert.equal(handle.files.found, 1);
    assert.equal(handle.gaps.length, 2);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("failure selection uses real traceback frames, exact failed bodies and consecutive real reverts", () => {
  const units = [{ name: "earlier", isStub: true }, { name: "later", isStub: true }];
  const history = [{ round: 1, target: "later", applied: true, reverted: true, testExitCode: 1,
    testOutput: 'File "solution.py", line 2, in later\n earlier appears elsewhere', bodyHash: bodyHashOf("return 0") }];
  assert.equal(arrowGate({ units, history }).target.name, "later");
  assert.equal(arrowGate({ units, history, skip: new Set(["later"]) }).target.name, "earlier");
  assert.equal(arrowCycle({ history, target: "later", bodyHash: bodyHashOf("return 0") }), 1);
  assert.equal(arrowCycle({ history, target: "later", bodyHash: bodyHashOf("return 1") }), null);
  assert.equal(consecutiveReverts(history, "later"), 1);
  assert.equal(consecutiveReverts([...history, { target: "later", applied: true, reverted: false, testExitCode: 0 }], "later"), 0);
});

test("the restored void loop fills a real stub and proves it through the caller's command", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "er7-chase-"));
  try {
    fs.writeFileSync(path.join(dir, "solution.py"), "def shifted_square(x):\n    raise NotImplementedError\n");
    fs.writeFileSync(path.join(dir, "check.py"), "from solution import shifted_square\nassert shifted_square(3) == 10\nassert shifted_square(-2) == 5\n");
    const result = await runCodeLoop({ workspace: dir, task: "fill shifted_square", model: "scripted",
      sessionId: "restore-void", testCommand: "python3 check.py", maxRounds: 2,
      turn: async () => ({ text: "return x * x + 1" }) });
    assert.equal(result.done, true, JSON.stringify(result));
    assert.match(fs.readFileSync(path.join(dir, "solution.py"), "utf8"), /return x \* x \+ 1/);
    assert.equal(result.rounds.at(-1).testExitCode, 0);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("an empty logged workspace with a failing real test never reports done", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "er7-empty-"));
  try {
    const result = await runCodeLoop({ workspace: dir, task: "repair", model: "scripted", sessionId: "restore-empty",
      testCommand: 'node -e "process.exit(1)"', maxRounds: 1, logFile: path.join(dir, "LOG.jsonl"),
      turn: async () => { throw new Error("no model call is justified"); } });
    assert.equal(result.done, false);
    assert.equal(result.gap.kind, "no_stubs");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
