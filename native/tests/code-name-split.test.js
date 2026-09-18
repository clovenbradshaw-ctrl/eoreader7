import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCodeIndex, codeGist, genericityOf, loadCodeNamePriorSplit, loadCodeNamePriorSplits } from "../adapters/text/code-structure.js";
import { dmdCut } from "../the-fold/resolutions.js";

// Per-language name priors: a name's genericity is a fact about its OWN
// language's codebases (Ant 2). The blended prior misdrops both ways —
// `main` dropped from Python on zero Python attestations, `__init__`
// dropped from C on three Python-only attestations. Splits
// (native/priors/code-name-*.json, recipes identical to the blended
// builder, sum-checked at build time) judge each name on its own
// language, falling back to blended where no split is loaded. Without
// `languagePriors` the behavior is byte-identical to before.

const SPLITS = loadCodeNamePriorSplits();
const BLENDED_FIXTURE = { names: { main: { repos: 2, files: 2, kinds: ["function"] }, __init__: { repos: 3, files: 3, kinds: ["function"] } } };
const PY_FIXTURE = { names: { __init__: { repos: 3, files: 3, kinds: ["function"] } } }; // main unattested in python
const C_FIXTURE = { names: { main: { repos: 2, files: 2, kinds: ["function"] } } }; // __init__ unattested in C

test("split priors load: real vendored tallies, null for strangers", () => {
  assert.equal(Object.keys(SPLITS.py.names).length, 310);
  assert.equal(Object.keys(SPLITS.c.names).length, 1786);
  assert.ok(SPLITS.go && SPLITS.js);
  assert.equal(loadCodeNamePriorSplit("klingon"), null);
  assert.equal(loadCodeNamePriorSplit("typescript"), null); // no ts split file — falls back to blended, never a wrong gate
});

test("the mechanism on real splits: main is python-distinctive, __init__ is python-generic", () => {
  assert.equal(genericityOf(SPLITS.py, "main"), null);
  assert.equal(genericityOf(SPLITS.py, "__init__"), 3);
  assert.equal(genericityOf(SPLITS.c, "__init__"), null);
  assert.equal(genericityOf(SPLITS.go, "String"), 2);
  assert.equal(genericityOf(SPLITS.js, "String"), null);
  assert.equal(genericityOf(SPLITS.py, "run"), 2);
});

test("direction A: a python `def main` is kept under splits, dropped under blended", () => {
  const index = buildCodeIndex([{ fileName: "app.py", text: "def main():\n    run()\n\ndef run():\n    pass\n\ndef __init__(self):\n    pass\n" }]);
  const blended = codeGist({ index, question: "", dmdCut, prior: BLENDED_FIXTURE });
  const split = codeGist({ index, question: "", dmdCut, prior: BLENDED_FIXTURE, languagePriors: { py: PY_FIXTURE } });
  assert.equal(blended.disclosure.genericDropped, 2); // main + __init__ look boilerplate blended (fixture has no run)
  assert.equal(split.disclosure.genericDropped, 1); // __init__ only (real python generic); main kept
  assert.deepEqual(split.disclosure.languagePriorsLoaded, ["py"]);
});

test("direction B: a C `__init__` is kept under splits, dropped under blended", () => {
  const index = buildCodeIndex([{ fileName: "k.c", text: "int __init__(int x) {\n  return x;\n}\n\nint main(int argc, char **argv) {\n  return __init__(argc);\n}\n" }]);
  const blended = codeGist({ index, question: "", dmdCut, prior: BLENDED_FIXTURE });
  const split = codeGist({ index, question: "", dmdCut, prior: BLENDED_FIXTURE, languagePriors: { c: C_FIXTURE } });
  assert.equal(blended.disclosure.genericDropped, 2);
  assert.equal(split.disclosure.genericDropped, 1); // main only; __init__ kept (unattested in C)
});

test("additive default: no languagePriors behaves exactly as before", () => {
  const index = buildCodeIndex([{ fileName: "app.py", text: "def main():\n    pass\n" }]);
  const gist = codeGist({ index, question: "", dmdCut, prior: BLENDED_FIXTURE });
  assert.equal(gist.disclosure.genericDropped, 1);
  assert.deepEqual(gist.disclosure.languagePriorsLoaded, []);
  assert.match(gist.disclosure.basis, /live_priors CodeNamePrior@1/);
});

test("absent split falls back to blended (never a refusal from a missing file)", () => {
  const index = buildCodeIndex([{ fileName: "app.py", text: "def main():\n    pass\n" }]);
  const gist = codeGist({ index, question: "", dmdCut, prior: BLENDED_FIXTURE, languagePriors: { c: C_FIXTURE } });
  assert.equal(gist.disclosure.genericDropped, 1); // no py split: blended decides, main dropped as before
});
