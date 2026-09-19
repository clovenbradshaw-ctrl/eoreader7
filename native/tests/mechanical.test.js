import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDeclarations, keywordSetOf, loadCodeKeywordPrior } from "../adapters/text/code-structure.js";
import { importSpans } from "../adapters/code/scan.js";
import {
  callArity, callArityOf, missingImports, synthesizeStub, importAnchor,
  suggestWiderFind, suggestWholeFile, declaresKeyword, renameIn,
  arityCoverage,
} from "../adapters/code/mechanical.js";

// The mechanical proposal tier: every remedy derived from the file's own
// bytes plus received priors — no mouth. Each test pins a derived byte
// string or a typed gap, never a judgment.

const PY = keywordSetOf(loadCodeKeywordPrior("python"));
const PY_BUILTINS = loadCodeKeywordPrior("python").builtins;

test("importSpans: byte offsets for every import statement, js + py", () => {
  const text = "import os\nfrom flask import Flask\nrest = 1\n";
  const spans = importSpans(text);
  assert.equal(spans.length, 2);
  assert.ok(spans.every((s) => s.kind === "py"));
  assert.equal(text.slice(spans[0].start, spans[0].end), "import os");
  assert.equal(text.slice(spans[1].start, spans[1].end), "from flask import Flask");
  assert.deepEqual(importSpans("x = 1\n"), []);
});

test("callArity: per-site arity beside the count, strings can't fool it", () => {
  const text = "def main():\n    a = add(1, 2)\n    b = add(x)\n    c = log(\"(not, a, call)\")\n    return a\n\ndef add(a, b):\n    return a\n";
  const rows = callArity(text, parseDeclarations(text, "s.py"));
  const add = rows.filter((r) => r.callee === "add").sort((a, b) => a.arity - b.arity);
  assert.deepEqual(add.map((r) => r.arity), [1, 2]);
  assert.ok(rows.every((r) => r.caller === "main"));
  assert.equal(rows.filter((r) => r.callee === "log").length, 0); // callee undeclared → no entity, no row
});

test("callArity: unbalanced paren skips the site, never guesses", () => {
  const text = "def main():\n    x = add(1, 2\n    return x\n\ndef add(a, b):\n    return a\n";
  const rows = callArity(text, parseDeclarations(text, "s.py"));
  assert.deepEqual(rows.filter((r) => r.callee === "add"), []);
});

test("missingImports: exactly the unbound name, nothing else", () => {
  const text = "import os\nfrom flask import Flask\n\ndef main():\n    app = Flask(__name__)\n    total = add(1, 2)\n    print(total, missing_thing)\n    return app\n\ndef add(a, b):\n    return a + b\n";
  assert.deepEqual(
    missingImports(text, "app.py", { keywords: PY, builtins: PY_BUILTINS }),
    [{ name: "missing_thing", count: 1 }],
  );
});

test("missingImports: import-bound, local-bound, and dunder names are not missing", () => {
  const text = "import os\nfrom m import thing as alias\n\ndef f(a, b=1):\n    x = 1\n    for i in y:\n        with open(p) as fh:\n            x = os.path.join(a, alias, __name__)\n    return x\n";
  assert.deepEqual(missingImports(text, "s.py", { keywords: PY, builtins: PY_BUILTINS }).map((r) => r.name).sort(), ["p", "y"]);
});

test("synthesizeStub: shape derived, logic honestly absent, keywords refused", () => {
  assert.deepEqual(synthesizeStub({ name: "serve", arity: 2, language: "python", keywords: PY }),
    { ok: true, add: "def serve(arg0, arg1):\n    raise NotImplementedError" });
  assert.deepEqual(synthesizeStub({ name: "serve", arity: 0, language: "javascript", keywords: keywordSetOf(loadCodeKeywordPrior("javascript")) }),
    { ok: true, add: 'function serve() {\n  throw new Error("not implemented");\n}' });
  assert.deepEqual(synthesizeStub({ name: "Widget", kind: "class", language: "python", keywords: PY }),
    { ok: true, add: "class Widget:\n    pass" });
  const kw = synthesizeStub({ name: "class", language: "python", keywords: PY });
  assert.equal(kw.ok, false);
  assert.equal(kw.gap.kind, "keyword_declaration");
  assert.equal(synthesizeStub({ name: "f", language: "klingon" }).gap.kind, "unknown_language");
});

test("importAnchor: line after the last import, or file head", () => {
  const text = "import os\nfrom flask import Flask\n\ndef main():\n    pass\n";
  const at = importAnchor(text);
  assert.equal(text.slice(0, at.index), "import os\nfrom flask import Flask\n");
  assert.equal(at.count, 2);
  assert.deepEqual(importAnchor("x = 1\n"), { index: 0, basis: "no import block — file head", count: 0 });
});

test("suggestWiderFind: one declaration owns all occurrences → header slice; else null", () => {
  const one = "def compute(x):\n    y = x + 1\n    y = x + 1\n    return y\n";
  const got = suggestWiderFind(one, "s.py", "y = x + 1");
  assert.equal(got.find, "def compute(x):");
  assert.match(got.basis, /all 2 occurrences/);
  assert.equal(suggestWiderFind("def a():\n    return v\n\ndef b():\n    return v\n", "s.py", "return v"), null);
  assert.equal(suggestWiderFind(one, "s.py", "return y"), null);
});

test("declaresKeyword: the propose-time gate (diff of unrefused vs refused)", () => {
  assert.deepEqual(declaresKeyword("def class():\n    pass\n", "x.py", PY), ["class"]);
  assert.deepEqual(declaresKeyword("def main():\n    pass\n", "x.py", PY), []);
  assert.deepEqual(declaresKeyword("def main():\n    pass\n", "x.py", null), []);
});

test("renameIn: scoped rename with keyword guard and disclosed string touch", () => {
  const text = "def add(a, b):\n    return a + b\n\ntotal = add(1, 2)\nnote = \"add them\"\n";
  const r = renameIn(text, "s.py", "add", "total2", { keywords: PY });
  assert.equal(r.ok, true);
  assert.equal(r.touched, 3); // decl + call + the string literal (disclosed)
  assert.match(r.code, /def total2\(a, b\):/);
  assert.equal(renameIn(text, "s.py", "add", "class", { keywords: PY }).gap.kind, "keyword_declaration");
  assert.equal(renameIn(text, "s.py", "absent", "x", { keywords: PY }).gap.kind, "unlocated");
});

test("callArityOf: arity for a name nobody declared (the stub case)", () => {
  const text = "from app import serve\n\ndef t():\n    a = serve(100, 15)\n    b = serve(x)\n    return a\n";
  assert.deepEqual(callArityOf(text, "t.py", "serve"), { count: 2, arities: [1, 2] });
  assert.deepEqual(callArityOf(text, "t.py", "absent"), { count: 0, arities: [] });
});

test("callArityOf: skips the name's own def line and import lines", () => {
  const text = "from m import serve\ndef serve(a, b):\n    return serve(a)\n";
  assert.deepEqual(callArityOf(text, "s.py", "serve"), { count: 1, arities: [1] });
});

test("falsified then fixed: f-string expressions are code, literals are not", () => {
  const mi = (t) => missingImports(t, "s.py", { keywords: PY, builtins: PY_BUILTINS }).map((r) => r.name);
  assert.deepEqual(mi('def f():\n    return f"{missing_var} ok"\n'), ["missing_var"]);
  assert.deepEqual(mi('def f():\n    return f"{{literal}} {why}"\n'), ["why"]);
  assert.deepEqual(mi('def f():\n    return "missing_not"\n'), []);
  assert.deepEqual(mi('def f():\n    x = f"""val {zee} end"""\n    return x\n'), ["zee"]);
  // bound receiver + blanked nested literal: nothing missing here
  assert.deepEqual(mi('def f(d):\n    return f"{d["key"]}!\"\n'), []);
});

test("falsified then fixed: nested quotes, conversions, unbalanced spans", () => {
  const mi = (t) => missingImports(t, "s.py", { keywords: PY, builtins: PY_BUILTINS }).map((r) => r.name);
  assert.deepEqual(mi('def f():\n    return f"{dee["key"]}"\n'), ["dee"]);
  assert.deepEqual(mi('def f():\n    return f"{val!r}"\n'), ["val"]);
  assert.deepEqual(mi('def f():\n    return f"oops {exx"\n'), ["exx"]);
});

test("falsified then fixed: rename onto a live binding is collision, never a merge", () => {
  const text = "def add(a, b):\n    return a + b\n\ndef total(x):\n    return add(x, 1)\n";
  const r = renameIn(text, "s.py", "add", "total", { keywords: PY });
  assert.equal(r.ok, false);
  assert.equal(r.gap.kind, "collision");
  assert.match(r.gap.reason, /merge two bindings/);
});

test("falsified then fixed: decorator calls count, attribute calls do not", () => {
  assert.deepEqual(callArityOf("@serve(80, 443)\ndef main():\n    pass\n", "s.py", "serve"), { count: 1, arities: [2] });
  assert.deepEqual(callArityOf("def main():\n    app.route(1)\n    pass\n", "s.py", "route"), { count: 0, arities: [] });
});

test("arityCoverage: declared capacity beside max called arity (covered)", () => {
  const code = "def add(a, b):\n    return a + b\n";
  const tests = ["def t():\n    assert add(1, 2) == 3\n"];
  assert.deepEqual(
    arityCoverage({ codeText: code, fileName: "s.py", testTexts: tests }),
    [{ name: "add", declared: 2, calledMax: 2, covered: true }],
  );
});

test("arityCoverage: 0-arg stub kept against a 1-arg call is uncovered", () => {
  const code = "def serve():\n    raise NotImplementedError\n";
  const tests = ["def t():\n    serve(80)\n"];
  assert.deepEqual(
    arityCoverage({ codeText: code, fileName: "s.py", testTexts: tests }),
    [{ name: "serve", declared: 0, calledMax: 1, covered: false }],
  );
});

test("arityCoverage: vararg absorbs any called arity (exempt, never uncovered)", () => {
  const code = "def serve(*args):\n    raise NotImplementedError\n";
  const tests = ["def t():\n    serve(80, 443, 8080)\n"];
  assert.deepEqual(
    arityCoverage({ codeText: code, fileName: "s.py", testTexts: tests }),
    [{ name: "serve", declared: Infinity, calledMax: 3, covered: true }],
  );
});

test("arityCoverage: bare-star kwonly marker is varlen-exempt; silence is covered", () => {
  const kwonly = "def f(a, *, b):\n    return a\n";
  assert.deepEqual(
    arityCoverage({ codeText: kwonly, fileName: "s.py", testTexts: ["def t():\n    f(1, 2, 3)\n"] }),
    [{ name: "f", declared: Infinity, calledMax: 3, covered: true }],
  );
  const quiet = "def lonely(x):\n    return x\n";
  assert.deepEqual(
    arityCoverage({ codeText: quiet, fileName: "s.py", testTexts: ["def t():\n    pass\n"] }),
    [{ name: "lonely", declared: 1, calledMax: 0, covered: true }],
  );
});

test("arityCoverage: weird input never throws (empty → [])", () => {
  assert.deepEqual(arityCoverage({ codeText: "", fileName: "s.py", testTexts: [] }), []);
  assert.deepEqual(arityCoverage({ codeText: null, fileName: "s.py", testTexts: null }), []);
  assert.deepEqual(arityCoverage({}), []);
  assert.deepEqual(arityCoverage(), []);
  assert.deepEqual(arityCoverage({ codeText: "x = 1\n", fileName: "s.py", testTexts: [] }), []);
});

test("falsified then fixed: brackets do not inflate arity", () => {
  const of = (src, name) => callArityOf(src, "t.py", name);
  assert.deepEqual(of("assert f([1, 2, 3, 4]) == 1\n", "f"), { count: 1, arities: [1] });
  assert.deepEqual(of("r = g({1: 2}, x)\n", "g"), { count: 1, arities: [2] });
  assert.deepEqual(of("r = h((1, 2))\n", "h"), { count: 1, arities: [1] });
  // declared-callee path shares the core: full row check
  const text = "def m():\n    return f([1, 2])\n\ndef f(a):\n    return a\n";
  const rows = callArity(text, parseDeclarations(text, "s.py"));
  assert.deepEqual(rows.filter((r) => r.callee === "f").map((r) => r.arity), [1]);
});

test("suggestWholeFile: small files anchor whole, large files refuse", () => {
  const small = "def f():\n    raise NotImplementedError\n";
  const got = suggestWholeFile(small);
  assert.equal(got.find, small);
  assert.match(got.basis, /exact unique anchor/);
  assert.equal(suggestWholeFile("x".repeat(2001)), null);
  assert.equal(suggestWholeFile(""), null);
  assert.equal(suggestWholeFile(small, { maxChars: 5 }), null);
});

test("falsified then fixed: posonly slash is a marker, not a parameter", () => {
  const covered = arityCoverage({ codeText: "def f(a, /):\n    return a\n", fileName: "s.py", testTexts: ["def t():\n    f(1)\n"] });
  assert.equal(covered[0].declared, 1);
  assert.equal(covered[0].covered, true);
  const mixed = arityCoverage({ codeText: "def f(a, /, b=1, *, c):\n    return a\n", fileName: "s.py", testTexts: ["def t():\n    f(1, 2, c=3)\n"] });
  assert.equal(mixed[0].covered, true); // valid call, exempt via bare-* (capacity counts 2 real params, not the slash)
});
