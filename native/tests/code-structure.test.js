import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDeclarations, callEdges, buildCodeIndex, codeGist, genericityOf } from "../adapters/text/code-structure.js";
import { dmdCut } from "../the-fold/resolutions.js";

test("parseDeclarations: JS function/class/const-arrow, each with a real body extent", () => {
  const text = [
    "export function activateFrontalArousal(level) {",
    "  return dmdWindow(level);",
    "}",
    "",
    "class Kernel {",
    "  boot() { return true; }",
    "}",
    "",
    "const restoreState = (snapshot) => {",
    "  return snapshot;",
    "};",
  ].join("\n");
  const decls = parseDeclarations(text, "kernel.js");
  const names = decls.map((d) => d.name).sort();
  assert.deepEqual(names, ["Kernel", "activateFrontalArousal", "restoreState"].sort());
  const fn = decls.find((d) => d.name === "activateFrontalArousal");
  assert.equal(text.slice(fn.start, fn.end).includes("dmdWindow(level)"), true);
  assert.equal(text.slice(fn.start, fn.end).includes("class Kernel"), false); // extent does not overrun into the next declaration
});

test("parseDeclarations: Python def/class, extent by indentation", () => {
  const text = [
    "class Reader:",
    "    def step(self, encounter):",
    "        return self.fold(encounter)",
    "",
    "def main():",
    "    r = Reader()",
    "    return r.step(None)",
  ].join("\n");
  const decls = parseDeclarations(text, "reader.py");
  const names = decls.map((d) => d.name).sort();
  assert.deepEqual(names, ["Reader", "main", "step"].sort());
  const step = decls.find((d) => d.name === "step");
  assert.equal(text.slice(step.start, step.end).includes("self.fold(encounter)"), true);
  assert.equal(text.slice(step.start, step.end).includes("def main"), false);
});

test("parseDeclarations: a control-flow keyword is never mistaken for a C declaration", () => {
  const text = [
    "int compute(int x) {",
    "  if (x > 0) {",
    "    return x;",
    "  }",
    "  while (x < 0) {",
    "    x++;",
    "  }",
    "  return 0;",
    "}",
  ].join("\n");
  const decls = parseDeclarations(text, "compute.c");
  const names = decls.map((d) => d.name);
  assert.deepEqual(names, ["compute"]);
});

test("parseDeclarations: Go func, including a method with a receiver", () => {
  const text = [
    "func main() {",
    "  run()",
    "}",
    "",
    "func (k *Kernel) run() {",
    "  return",
    "}",
  ].join("\n");
  const decls = parseDeclarations(text, "main.go");
  const names = decls.map((d) => d.name).sort();
  assert.deepEqual(names, ["main", "run"]);
});

test("callEdges: a real call site inside a declared body is witnessed; the declaration's own header naming itself is not", () => {
  const text = [
    "function activateFrontalArousal(level) {",
    "  return dmdWindow(level) + restoreState(level);",
    "}",
    "function dmdWindow(x) { return x; }",
    "function restoreState(x) { return x; }",
  ].join("\n");
  const decls = parseDeclarations(text, "k.js");
  const edges = callEdges(text, decls);
  const byPair = new Map(edges.map((e) => [`${e.caller}->${e.callee}`, e.count]));
  assert.equal(byPair.get("activateFrontalArousal->dmdWindow"), 1);
  assert.equal(byPair.get("activateFrontalArousal->restoreState"), 1);
  assert.equal(byPair.has("dmdWindow->dmdWindow"), false);
});

test("buildCodeIndex: resolve is EXACT and case-sensitive \u2014 no fuzzy coreference, unlike prose", () => {
  const files = [{ fileName: "k.js", text: "function activateFrontalArousal(x) { return dmdWindow(x); }\nfunction dmdWindow(x) { return x; }" }];
  const index = buildCodeIndex(files);
  assert.equal(index.resolve("activateFrontalArousal").size, 1);
  assert.equal(index.resolve("ActivateFrontalArousal").size, 0); // different case, genuinely a different token
  assert.equal(index.resolve("activate").size, 0); // no partial/substring resolution
});

test("buildCodeIndex: a declaration never becomes a prose referent \u2014 the two channels stay separate (the guardrail this file exists to keep)", () => {
  // No prose-referent machinery is imported or exercised here at all; this
  // test's only job is to document that buildCodeIndex's `resolve` is the
  // ENTIRE identity mechanism for code \u2014 there is no cast, no
  // discoverReferents, no capitalised-run scan anywhere in this module.
  const files = [{ fileName: "k.js", text: "function Foo() { return 1; }" }];
  const index = buildCodeIndex(files);
  assert.equal(index.resolve("Foo").size, 1);
  // Capitalised or not makes no difference to whether something is an
  // entity here \u2014 identity comes from the declaration site, never from
  // letter-casing.
  const files2 = [{ fileName: "k.js", text: "function foo() { return 1; }" }];
  const index2 = buildCodeIndex(files2);
  assert.equal(index2.resolve("foo").size, 1);
});

test("codeGist: DMD-gated selection is NOT naive top-N \u2014 a highly-connected hub is enough to reach the whole graph without listing every edge", () => {
  const text = [
    "function dispatch(x) {",
    "  alpha(x); bravo(x); charlie(x); delta(x);",
    "}",
    "function alpha(x) { return x; }",
    "function bravo(x) { return x; }",
    "function charlie(x) { return x; }",
    "function delta(x) { return x; }",
  ].join("\n");
  const index = buildCodeIndex([{ fileName: "k.js", text }]);
  const gist = codeGist({ index, question: "what does dispatch call?", dmdCut });
  assert.ok(gist.calls.rows.length >= 1);
  assert.ok(gist.calls.rows.every((r) => r.caller === "dispatch" || r.callee === "dispatch"));
});

test("codeGist: a name attested across >= genericFloor independent repos in the prior is dropped before the cut, even if it is locally frequent", () => {
  const text = [
    "function main() {",
    "  init(); init(); init();",
    "  activateFrontalArousal();",
    "}",
    "function init() { return; }",
    "function activateFrontalArousal() { return; }",
  ].join("\n");
  const index = buildCodeIndex([{ fileName: "k.js", text }]);
  const prior = { names: { main: { repos: 5 }, init: { repos: 8 } } }; // measured-generic, per a fixture baseline
  const gist = codeGist({ index, question: "", dmdCut, prior, genericFloor: 2 });
  const declaredNames = gist.declared.rows.map((r) => r.name);
  assert.equal(declaredNames.includes("main"), false);
  assert.equal(declaredNames.includes("init"), false);
  assert.equal(declaredNames.includes("activateFrontalArousal"), true);
  assert.equal(gist.disclosure.genericDropped, 2);
  assert.equal(gist.disclosure.priorLoaded, true);
});

test("codeGist: with no prior loaded, nothing is dropped, and the gap is disclosed rather than silently skipped", () => {
  const text = "function main() { init(); }\nfunction init() { return; }";
  const index = buildCodeIndex([{ fileName: "k.js", text }]);
  const gist = codeGist({ index, question: "", dmdCut });
  assert.equal(gist.disclosure.priorLoaded, false);
  assert.equal(gist.disclosure.genericDropped, 0);
  assert.match(gist.disclosure.basis, /no CodeNamePrior/);
});

test("genericityOf: null (no signal) is kept distinct from 0 (measured absent)", () => {
  const prior = { names: { init: { repos: 8 }, obscureFn: { repos: 0 } } };
  assert.equal(genericityOf(prior, "init"), 8);
  assert.equal(genericityOf(prior, "obscureFn"), 0);
  assert.equal(genericityOf(prior, "neverSeen"), null);
  assert.equal(genericityOf(null, "init"), null);
});
