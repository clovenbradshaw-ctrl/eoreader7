// F3 (Run all twice gives identical outputs) failed in the Holodeck run on a cell with a syntax error: the traceback named the runner's
// random temp directory. The same code must record the same output, failing or not.
import test from "node:test"; import assert from "node:assert/strict";
import { runPython } from "../the-fold/surface/notebook-run.mjs";
test("a failing cell records the same output on every run (no temp path leaks into the record)", () => {
  const a = runPython("import matplotlib.pyplot as pltplt.plot([1])"), b = runPython("import matplotlib.pyplot as pltplt.plot([1])");
  assert.equal(a.ok, false); assert.match(a.output, /SyntaxError/); assert.equal(a.output, b.output); assert.doesNotMatch(a.output, /\/nb-[A-Za-z0-9]{6}/);
  const c = runPython("raise ValueError('x')"), d = runPython("raise ValueError('x')"); assert.equal(c.output, d.output); assert.match(c.output, /<run dir>|user\.py/);
});
