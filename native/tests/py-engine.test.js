import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pyFactsOf, pyCheckSyntax, suggestImportFix } from "../adapters/code/py-engine.js";
import { readOps, applyOps } from "../the-fold/patch.js";

// Ground truth from the running grammar (ast, never executed): exact
// arity, aliases, decorators, and syntax verdicts with line numbers.
// Null (no python3) means recipes, disclosed — untestable here (the box
// has python3), so these pin the engine-present contract plus the
// malformed-call throw.

const GOOD = `import os, sys
from flask import Flask as App

class Config(Base):
    """Server config."""

@route("/x")
async def serve(app, *args, timeout=30, **opts) -> int:
    return 1
`;

function tmpFile(name, content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pyfacts-"));
  const p = path.join(dir, name);
  fs.writeFileSync(p, content);
  return p;
}

test("pyFactsOf: exact declarations, arity, aliases, decorators", () => {
  const p = tmpFile("a.py", GOOD);
  const files = pyFactsOf([p]);
  assert.ok(files && files.length === 1);
  const f = files[0];
  assert.equal(f.ok, true);
  const serve = f.declarations.find((d) => d.qname === "serve");
  assert.equal(serve.async, true);
  assert.deepEqual(serve.args.args, ["app"]);
  assert.equal(serve.args.vararg, "args");
  assert.deepEqual(serve.args.kwonly, ["timeout"]);
  assert.equal(serve.args.kwarg, "opts");
  assert.equal(serve.returns, "int");
  assert.deepEqual(serve.decorators, ["route('/x')"]);
  assert.equal(f.declarations.find((d) => d.qname === "Config").doc_firstline, "Server config.");
  const from = f.imports.find((i) => i.kind === "from");
  assert.equal(from.module, "flask");
  assert.deepEqual(from.names, [{ name: "Flask", asname: "App" }]);
});

test("pyFactsOf: syntax failure carries line + offset, never throws", () => {
  const p = tmpFile("b.py", "def broken(:\n    pass\n");
  const f = pyFactsOf([p])[0];
  assert.equal(f.ok, false);
  assert.equal(f.error.lineno, 1);
  assert.equal(f.error.offset, 12);
  assert.deepEqual(f.declarations, []);
});

test("pyFactsOf: malformed call throws (everything else is null, never a throw)", () => {
  assert.throws(() => pyFactsOf([]));
  assert.throws(() => pyFactsOf(null));
});

test("pyCheckSyntax: stdin verdicts for unsaved bytes", () => {
  assert.deepEqual(pyCheckSyntax("def f():\n    pass\n", "x.py"), { ok: true });
  const bad = pyCheckSyntax("def broken(:\n    pass\n", "x.py");
  assert.equal(bad.ok, false);
  assert.equal(bad.error.lineno, 1);
  assert.match(bad.error.line, /def broken/);
});

test("suggestImportFix: NameError → loop-ready INS after the import block", () => {
  const code = "import os\n\ndef main():\n    print(json.dumps({}))\n";
  const fix = suggestImportFix({ failureOutput: "NameError: name 'json' is not defined", fileText: code, stdlibModules: ["json", "os"] });
  assert.equal(fix.ok, true);
  assert.equal(fix.find, "import os");
  assert.equal(fix.add, "import os\nimport json");
  const ops = readOps([{ find: fix.find, add: fix.add }]);
  assert.equal(ops[0].op, "INS");
  assert.ok(applyOps(code, ops).ok);
});

test("suggestImportFix: no block → SYN on first line; refusals typed", () => {
  const code = "def main():\n    print(json.dumps({}))\n";
  const fix = suggestImportFix({ failureOutput: "Traceback\nModuleNotFoundError: No module named 'json'", fileText: code, stdlibModules: ["json"] });
  assert.equal(fix.ok, true);
  assert.equal(fix.find, "def main():");
  assert.equal(fix.add, "import json\ndef main():");
  assert.equal(suggestImportFix({ failureOutput: "NameError: name 'flask' is not defined", fileText: code, stdlibModules: ["json"] }).gap.kind, "not_stdlib");
  assert.equal(suggestImportFix({ failureOutput: "AssertionError: 3 != 4", fileText: code, stdlibModules: ["json"] }).gap.kind, "no_match");
  assert.equal(suggestImportFix({ failureOutput: "NameError: name 'os' is not defined", fileText: "import os\n", stdlibModules: ["os"] }).gap.kind, "already_imported");
});

test("suggestImportFix: import lands after a leading docstring, never above it", () => {
  const code = '"""Tip calculator."""\n\ndef receipt(bill):\n    return json.dumps(bill)\n';
  const fix = suggestImportFix({ failureOutput: "NameError: name 'json' is not defined", fileText: code, stdlibModules: ["json"] });
  assert.equal(fix.ok, true);
  assert.ok(fix.find.startsWith('"""Tip calculator."""'));
  assert.match(fix.add, /"""Tip calculator\."""\nimport json/);
});
