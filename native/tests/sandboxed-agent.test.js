// native/tests/sandboxed-agent.test.js — the mechanical action grammar and
// the JS sandbox, both real and pure (parseAction/runSandboxedJs need no
// injected engine, unlike runOpenCodingLoop which needs a live proxy — see
// eval verification for that half, driven live against the real server).
import test from "node:test";
import assert from "node:assert/strict";
import { parseAction, runSandboxedJs } from "../the-fold/sandboxed-agent.js";

test("parseAction: list", () => {
  assert.deepEqual(parseAction("ACTION: list"), { ok: true, action: "list" });
});

test("parseAction: read", () => {
  const r = parseAction("ACTION: read\nPATH: foo.js");
  assert.equal(r.ok, true);
  assert.equal(r.action, "read");
  assert.equal(r.path, "foo.js");
});

test("parseAction: write with real multi-line content", () => {
  const r = parseAction("ACTION: write\nPATH: foo.js\n<<<CONTENT>>>\nfunction f() {\n  return 1;\n}\n<<<END>>>");
  assert.equal(r.ok, true);
  assert.equal(r.path, "foo.js");
  assert.equal(r.content, "function f() {\n  return 1;\n}");
});

test("parseAction: run", () => {
  const r = parseAction("ACTION: run\n<<<CODE>>>\nconsole.log(1+1);\n<<<END>>>");
  assert.equal(r.ok, true);
  assert.equal(r.code, "console.log(1+1);");
});

test("parseAction: done", () => {
  const r = parseAction("ACTION: done\n<<<ANSWER>>>\nHere is the final answer.\n<<<END>>>");
  assert.equal(r.ok, true);
  assert.equal(r.answer, "Here is the final answer.");
});

test("parseAction: garbage is a typed gap, never a guess", () => {
  const r = parseAction("I think I'll just write some code for you!");
  assert.equal(r.ok, false);
  assert.equal(r.gap.kind, "unparsed_action");
});

test("runSandboxedJs: real execution, real console.log capture", () => {
  const r = runSandboxedJs("console.log('hello'); 1 + 1");
  assert.equal(r.ok, true);
  assert.match(r.output, /hello/);
  assert.match(r.output, /^hello\n2$|2$/); // the expression result (2) is appended after the log
});

test("runSandboxedJs: a real runtime error is caught and reported, never thrown out", () => {
  const r = runSandboxedJs("throw new Error('boom')");
  assert.equal(r.ok, false);
  assert.match(r.output, /boom/);
});

test("runSandboxedJs: no require, no process, no fs — genuinely severed, not just undeclared", () => {
  for (const probe of ["typeof require", "typeof process", "typeof globalThis.require"]) {
    const r = runSandboxedJs(probe);
    assert.equal(r.ok, true);
    assert.match(r.output, /undefined/, `expected ${probe} to be undefined in the sandbox`);
  }
});

test("runSandboxedJs: an infinite loop is bounded by the real timeout, never hangs the process", () => {
  const start = Date.now();
  const r = runSandboxedJs("while (true) {}");
  const elapsed = Date.now() - start;
  assert.equal(r.ok, false);
  assert.ok(elapsed < 5000, `expected the timeout to bound this well under 5s, took ${elapsed}ms`);
});

test("runSandboxedJs: cannot reach a real file even by trying — fs is not a global", () => {
  const r = runSandboxedJs("require('fs').readFileSync('/etc/passwd', 'utf8')");
  assert.equal(r.ok, false);
  assert.match(r.output, /require is not defined/i);
});
