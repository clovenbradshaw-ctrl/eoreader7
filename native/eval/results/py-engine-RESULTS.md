# Python engine as giver: ast facts + syntax gate + NameError remedy

Autogeneration before the mouth wakes: Python's own stdlib (`ast`,
`sys.stdlib_module_names`) replaces regex approximation with
engine-grade facts, and the loop burns no test round on unparseable
bytes. No third parties, no network, target never executed.

Reproduce with:

```
printf 'def f(a, *b) -> str:\n    pass\n' | python3 native/scripts/py-facts.py --stdin --name t.py
node --test native/tests/py-engine.test.js
```

## What was built

- `native/scripts/py-facts.py` (stdlib only): `{declarations[]`
  (qname, kind, async, lineno/end_lineno, exact args incl.
  posonly/defaults/kwonly/vararg/kwarg, returns + decorators as
  source text, doc firstline), `imports[]` (kind, top module, level,
  names + asnames), `error{msg,lineno,offset,line}}` per file; files
  or stdin; `ast.parse` only — the target is never imported or run.
- `native/adapters/code/py-engine.js`: `pyFactsOf` (files) +
  `pyCheckSyntax` (unsaved bytes via stdin) + `suggestImportFix`
  (NameError/ModuleNotFoundError → stdlib-confirmed → loop-ready
  find/add: INS after the import block, SYN on the first line).
  execFileSync (no shell, argv only), 15 s timeout, 4 MB cap; any
  failure mode → null (recipes, disclosed).
- Builder projection completed: `code-kw-py.json` now carries the
  engine's public `stdlibModules` (212; underscore-privates counted,
  not projected) + counts; JS carries none (tree-sitter gives no
  equivalent — absence, not zero).
- Loop wiring (`code-loop.js`): syntax pre-check on patched `.py`
  bytes (fail → `syntax_error` gap with msg + line, nothing written,
  no test burned; rounds record `syntax: checked|skipped-no-engine|
  unchecked-not-python`); NameError remedy suggestion appended to the
  failure note with exact FIND/ADD (suggested, never auto-applied —
  the mouth still proposes).
- Placement: engine in eoreader7 (`scripts/`, `adapters/code/`,
  `kernel/tournament.js` — moved out of `the-fold/`; kernel already
  imports fold-side physics per standing precedent, boundary suite
  confirms no legacy dependency). Nothing of this pass exists in the
  sibling the-fold repo (verified).

## Measured

| specimen | result |
|---|---|
| `async def serve(app, *args, timeout=30, **opts) -> int` + decorator + alias import | exact qname/async/args/returns/decorator/asname/level |
| `def broken(:` via stdin | `{ok:false, lineno 1, offset 12, line}` |
| NameError `json` + `import os` on file | INS `import os` → `import os\nimport json`, applies clean |
| third-party name / unrelated failure / already imported | `not_stdlib` / `no_match` / `already_imported` — all refused, typed |
| suites | py-engine 6/6; code-adjacent total 91/91 with agent wiring |

## Disclosed, not attempted

- JS syntax gate (`node --check`): same exec shape, one line — next.
- Engine arity not yet preferred over comma-count in `callArity`
  (both measured; the merge needs a producer tag per row).
- Test enumeration (`unittest` discovery executes imports — same trust
  as `testCommand`, but a loader deserves its own pass, not a line).
- `runCodeLoop` end-to-end stays driver-tested (needs a live mouth);
  the pre-check and remedy paths are helper-pinned only.
- Boundary suite's 4th case (root `kernel.js` CJS/ESM load) fails as
  pre-existing packaging, untouched by this pass; the 3 substantive
  cases pass.

## Generality

**Generality:** mechanism-universal (engine-as-giver + null-fallback +
pre-test syntax gate applies to any language with an introspectable
grammar and a runnable checker); specimen-scoped for every behavior
(Python 3.14 `ast`, one 6-case suite, fixture failures).
