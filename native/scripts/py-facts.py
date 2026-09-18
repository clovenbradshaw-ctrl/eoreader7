#!/usr/bin/env python3
"""py-facts.py — ground-truth code facts from the language's own engine.

Reads Python source (files, or stdin with --stdin) and reports what the
*running grammar* says: declarations with exact arity/defaults/returns,
imports with bound names, byte-anchored extents, and a syntax verdict —
via `ast` only. NEVER executes the target (ast.parse, no import, no
exec): safe to run on untrusted bytes. Stdlib only, no third parties.

This is the "received giver" discipline applied to Python itself: the
regex recipes (code-structure.js) approximate declarations from shapes;
this reports them from the authority that defines the shapes. The JS
consumer (adapters/code/py-engine.js) prefers engine facts when python3
exists and falls back to recipes otherwise — every fact carries its
producer ("ast" vs "recipe"), so staleness and absence stay visible.

Usage:
  py-facts.py [--stdin --name app.py] [file ...]   # JSON to stdout
  echo 'def f():' | py-facts.py --stdin --name x.py

Output: {"engine": {"python": ..., "producer": "ast"},
         "files": [{path, ok, error?, declarations[], imports[]}]}
  declaration: {qname, name, kind (function|class), async, lineno,
    end_lineno, col, args {posonly, args, vararg, kwonly, kwarg,
    defaults, kw_defaults}, returns (source text or null),
    decorators[] (source text), doc_firstline or null}
  import: {kind (import|from), module (top, or null), level,
    names [{name, asname}], lineno}
  syntax failure: {ok: false, error: {msg, lineno, offset, line}}
Caller bounds input size and wall time; this script does not.
"""

import ast
import json
import sys


def unparse(node):
    if node is None:
        return None
    try:
        return ast.unparse(node)
    except Exception:
        return None


def args_of(fn):
    a = fn.args
    return {
        "posonly": [x.arg for x in a.posonlyargs],
        "args": [x.arg for x in a.args],
        "vararg": a.vararg.arg if a.vararg else None,
        "kwonly": [x.arg for x in a.kwonlyargs],
        "kwarg": a.kwarg.arg if a.kwarg else None,
        "defaults": len(a.defaults),
        "kw_defaults": sum(1 for d in a.kw_defaults if d is not None),
    }


def doc_firstline(node):
    try:
        doc = ast.get_docstring(node, clean=False)
    except Exception:
        return None
    if not doc:
        return None
    return doc.split("\n", 1)[0][:200]


class Visitor(ast.NodeVisitor):
    def __init__(self):
        self.stack = []
        self.declarations = []
        self.imports = []

    def visit_FunctionDef(self, node):
        self._decl(node, "function", False)
        self.stack.append(node.name)
        self.generic_visit(node)
        self.stack.pop()

    def visit_AsyncFunctionDef(self, node):
        self._decl(node, "function", True)
        self.stack.append(node.name)
        self.generic_visit(node)
        self.stack.pop()

    def visit_ClassDef(self, node):
        self._decl(node, "class", False)
        self.stack.append(node.name)
        self.generic_visit(node)
        self.stack.pop()

    def _decl(self, node, kind, is_async):
        qname = ".".join(self.stack + [node.name])
        self.declarations.append({
            "qname": qname,
            "name": node.name,
            "kind": kind,
            "async": is_async,
            "lineno": node.lineno,
            "end_lineno": node.end_lineno,
            "col": node.col_offset,
            "args": args_of(node) if kind == "function" else None,
            "returns": unparse(getattr(node, "returns", None)),
            "decorators": [unparse(d) for d in getattr(node, "decorator_list", [])],
            "doc_firstline": doc_firstline(node),
        })

    def visit_Import(self, node):
        self.imports.append({
            "kind": "import",
            "module": None,
            "level": 0,
            "names": [{"name": a.name, "asname": a.asname} for a in node.names],
            "lineno": node.lineno,
        })

    def visit_ImportFrom(self, node):
        self.imports.append({
            "kind": "from",
            "module": (node.module or "").split(".")[0] or None,
            "level": node.level,
            "names": [{"name": a.name, "asname": a.asname} for a in node.names],
            "lineno": node.lineno,
        })


def analyze(path, text):
    try:
        tree = ast.parse(text, filename=path)
    except SyntaxError as e:
        line = ""
        try:
            line = (e.text or "").strip()[:200]
        except Exception:
            pass
        return {"path": path, "ok": False,
                "error": {"msg": e.msg, "lineno": e.lineno, "offset": e.offset, "line": line},
                "declarations": [], "imports": []}
    except ValueError as e:
        return {"path": path, "ok": False,
                "error": {"msg": str(e)[:200], "lineno": None, "offset": None, "line": ""},
                "declarations": [], "imports": []}
    v = Visitor()
    v.visit(tree)
    return {"path": path, "ok": True, "declarations": v.declarations, "imports": v.imports}


def main(argv):
    use_stdin = "--stdin" in argv
    name = "stdin.py"
    if "--name" in argv:
        name = argv[argv.index("--name") + 1]
    results = []
    if use_stdin:
        data = sys.stdin.buffer.read()
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError as e:
            results.append({"path": name, "ok": False,
                            "error": {"msg": "not utf-8: %s" % str(e)[:120], "lineno": None, "offset": None, "line": ""},
                            "declarations": [], "imports": []})
            print(json.dumps({"engine": {"python": sys.version.split()[0], "producer": "ast"}, "files": results}))
            return
        results.append(analyze(name, text))
    else:
        paths = [a for a in argv[1:] if not a.startswith("--") and a != name]
        for path in paths:
            try:
                with open(path, "rb") as f:
                    data = f.read()
                text = data.decode("utf-8")
            except (OSError, UnicodeDecodeError) as e:
                results.append({"path": path, "ok": False,
                                "error": {"msg": str(e)[:200], "lineno": None, "offset": None, "line": ""},
                                "declarations": [], "imports": []})
                continue
            results.append(analyze(path, text))
    print(json.dumps({"engine": {"python": sys.version.split()[0], "producer": "ast"}, "files": results}))


main(sys.argv)
