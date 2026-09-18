import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDeclarations, buildCodeIndex, loadCodeKeywordPrior, keywordSetOf } from "../adapters/text/code-structure.js";
import { isCodeHunk } from "../adapters/code/encounters.js";
import { moduleMapFrom } from "../adapters/code/scan.js";
import { detectCodeLanguage, anchorShapesFor, generationBriefFor, mismatchNoteFor } from "../adapters/code/language.js";

// eoreader7 learns Python + JavaScript the way it learned Ancient Greek
// (S83/S84): a received closed class per language (CodeKeywordPrior@1,
// built from live_priors' LanguageLawPrior@1 — engine-introspected /
// tree-sitter-derived, never hand-typed), refused as declared names with
// S83's asymmetric polarity (refuse the settled, admit the unseen), and
// served generatively — prompt scaffolding for the mouths writing patches
// plus remedy notes Thea's callers can attach. Every default is
// byte-identical to before: null prior changes nothing.

const PY = keywordSetOf(loadCodeKeywordPrior("python"));
const JS = keywordSetOf(loadCodeKeywordPrior("javascript"));

test("priors load: 35 python hard keywords, 43 javascript, nothing else refuses", () => {
  assert.equal(PY?.size, 35);
  assert.equal(JS?.size, 43);
  assert.equal(loadCodeKeywordPrior("typescript"), null); // Ant 1: its keyword list is grammar-heuristic junk
  assert.equal(loadCodeKeywordPrior("klingon"), null);
  assert.equal(keywordSetOf(null), null);
});

test("keyword refusal: `def class` declares nothing under the python prior", () => {
  const decls = parseDeclarations("def class():\n    pass\n", "x.py", { keywords: PY });
  assert.deepEqual(decls.map((d) => d.name), []);
});

test("additive default: no prior admits exactly as before", () => {
  const decls = parseDeclarations("def class():\n    pass\n", "x.py");
  assert.deepEqual(decls.map((d) => d.name), ["class"]);
});

test("soft keywords are never refused: `def match` is a legal declaration", () => {
  const decls = parseDeclarations("def match(x):\n    return x\n", "x.py", { keywords: PY });
  assert.deepEqual(decls.map((d) => d.name), ["match"]);
});

test("javascript refusal: `function class` declares nothing under the js prior", () => {
  const decls = parseDeclarations("function class() {\nreturn 1;\n}\n", "x.js", { keywords: JS });
  assert.deepEqual(decls.map((d) => d.name), []);
});

test("XID ident: `def Διαβάζω` parses (PEP 3131 — the engine accepts it, so the recipe must)", () => {
  const text = "def Διαβάζω(x):\n    return x\n";
  assert.deepEqual(parseDeclarations(text, "x.py", { keywords: PY }).map((d) => d.name), ["Διαβάζω"]);
  assert.deepEqual(parseDeclarations(text, "x.py").map((d) => d.name), ["Διαβάζω"]);
});

test("ascii declarations are byte-identical with or without the prior", () => {
  const text = "def main():\n    pass\n\nclass Reader:\n    pass\n";
  const plain = parseDeclarations(text, "x.py").map((d) => `${d.name}:${d.kind}`);
  const gated = parseDeclarations(text, "x.py", { keywords: PY }).map((d) => `${d.name}:${d.kind}`);
  assert.deepEqual(gated, plain);
  assert.deepEqual(plain, ["main:function", "Reader:class"]);
});

test("buildCodeIndex: per-file keywords refuse only on the file's own language", () => {
  const index = buildCodeIndex([
    { fileName: "a.py", text: "def match(x):\n    return x\n", keywords: PY }, // soft in python: admitted
    { fileName: "b.js", text: "function match() {\nreturn 1;\n}\n", keywords: JS }, // absent in js: admitted
  ]);
  assert.ok(index.entities.has("match"));
});

test("isCodeHunk admits pure python (measured: 65 KB Flask app with 110 decl lines was refused)", () => {
  const py = [
    "import flask",
    "from flask import Flask",
    "",
    "def create_app():",
    "    app = Flask(__name__)",
    "    return app",
    "",
    "def main():",
    "    app = create_app()",
    "    app.run()",
    "",
    "class Config:",
    "    debug = True",
    "",
    "x = (1 + 2) * (3 + 4)",
    "y = str(x) + repr(x) + str(len(str(x)))",
  ].join("\n");
  assert.equal(isCodeHunk(py), true);
  const prose = "The sea possessed the rest. The wind was cold and grey over the water.\nIt was morning again, and the birds were out along the shore.\n";
  assert.equal(isCodeHunk(prose), false);
});

test("moduleMapFrom reads python imports (measured: real Flask source yielded zero rows)", () => {
  const map = moduleMapFrom("import flask\nimport os, sys\nfrom flask import Flask\nfrom helpers import run\n", {});
  assert.ok(map.total >= 4, `expected >=4 module rows, got ${map.total}`);
  assert.match(map.basis, /python import/);
});

test("detectCodeLanguage: extension map only, strangers are null", () => {
  assert.equal(detectCodeLanguage("app.py"), "python");
  assert.equal(detectCodeLanguage("kernel.js"), "javascript");
  assert.equal(detectCodeLanguage("a.mjs"), "javascript");
  assert.equal(detectCodeLanguage("a.ts"), "typescript");
  assert.equal(detectCodeLanguage("Makefile"), null);
  assert.equal(detectCodeLanguage("noext"), null);
});

test("generationBriefFor: received keywords, illustrative shapes, provenance — null where nothing is received", () => {
  const brief = generationBriefFor("python");
  assert.match(brief, /def name\(params\):/);
  assert.match(brief, /CodeKeywordPrior@1/);
  assert.match(brief, /class, /); // the closed class is listed, not gestured at
  assert.match(brief, /illustrative/);
  assert.ok(generationBriefFor("javascript").includes("function name(params) {"));
  assert.equal(generationBriefFor("typescript"), null);
  assert.equal(generationBriefFor("klingon"), null);
  assert.deepEqual(anchorShapesFor("klingon"), null);
});

test("mismatchNoteFor: cross-language declaration shape in the find, else null", () => {
  const note = mismatchNoteFor({ fileName: "app.py", find: "function foo() {\nreturn 1;\n}" });
  assert.match(note, /JavaScript-shaped/);
  assert.match(note, /def name/);
  assert.match(
    mismatchNoteFor({ fileName: "k.js", find: "def foo():\n    return 1" }),
    /Python-shaped/,
  );
  assert.equal(mismatchNoteFor({ fileName: "app.py", find: "def foo():\n    return 1" }), null);
  assert.equal(mismatchNoteFor({ fileName: "Makefile", find: "function foo() {" }), null);
  assert.equal(mismatchNoteFor({ fileName: "a.py", find: "" }), null);
});
