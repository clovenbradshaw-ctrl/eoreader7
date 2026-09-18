# Mechanical proposal tier: remedies derived, not invented

Executes the no-LLM inventory ("see everything we already have"):
every sub-5-line wiring item is now wired; the one real build (the
tournament harness) is built. Nothing here calls a model.

Reproduce with:

```
node --test native/tests/mechanical.test.js native/tests/tournament.test.js native/the-fold/code-loop.test.mjs
```

## What was wired

| item | shape | status |
|---|---|---|
| extent exports | `braceExtent`/`indentExtent`/`bodyStartOf` exported from code-structure.js | done (additive) |
| import spans | `importSpans(text)` in scan.js (fresh regexes per call — the module consts keep shared `lastIndex` and stay private) | done |
| arity | `callArity(text, entities)` — per-(caller, callee, arity) rows on stripped text; unbalanced paren skips, strings can't fool it | done, pinned |
| missing set | `missingImports(text, fileName, {keywords, builtins})` — import spans blanked, locals/params/dunders/attributes excluded | done; Flask-shaped fixture yields exactly the unbound name |
| stub synthesis | `synthesizeStub({name, arity, kind, language, keywords})` — RECIPES' shapes, `raise NotImplementedError` bodies, `arg0…` placeholders, keyword/unknown-language refusals | done, pinned |
| import anchor | `importAnchor(text)` — line after last import span, or file head | done, pinned |
| widening | `suggestWiderFind(text, fileName, find)` — header slice iff one declaration owns every occurrence; else null; wired into the loop's `ambiguous` nudge (only when no mismatch note fires) | done + wired, pinned |
| propose-time keyword gate | `declaresKeyword(addText, fileName, keywords)` (unrefused-minus-refused diff); loop refuses pre-disk with `keyword_declaration` + names | done + wired, pinned |
| rename | `renameIn(text, fileName, old, new, {keywords})` — XID-boundaried, declared-check, keyword guard, string touch disclosed | done, pinned |
| tournament | `runTournament({code, candidates, test})` — pristine-copy trials, `{exit code, then minimal diff}`, losers as refused trials; tester injected, throwing/non-verdict testers recorded not trusted | done, pinned (5 cases) |
| loop grammar | `parseProposal` pinned (read/patch/backward-compat/empty-ADD-delete/prose-gap) — first pins on code-loop.js, which was entirely untested | done (5 cases) |

New suites: `mechanical` 10/10, `tournament` 5/5, `code-loop` 5/5. Neighbors: 77/77 across the nine code-adjacent suites.

## Two bugs the smoke found (fixed, pinned)

- `missingImports` counted attribute segments (`path`, `join` in `os.path.join`) — identifiers preceded by `.` are never bare references now.
- `missingImports` counted names inside import lines themselves (`flask` in `from flask import …`) — import spans are blanked before scanning.

## Deliberately not wired yet

- **No composed fixer driver.** `missingImports` + `importAnchor` + `synthesizeStub` are library calls; nothing yet chains failure-bytes → remedy → tournament → land. That driver is the next build, not this one.
- **Tournament not in the loop path.** The loop still tries one proposal per round (its contract with the mouth). The tournament serves the mechanical tier; merging the paths needs the driver above first.
- **Witness-cleanliness tiebreak unattempted.** Winner = exit-0 then minimal diff. A dirty-but-passing patch still lands — the loop's standing verdict, kept, named in the module header.
- **`runCodeLoop` itself stays driver-tested** (needs a live mouth); only its pure grammar is unit-pinned.
- A raw NUL separator byte slipped into `mechanical.js` mid-write (found by grep-as-binary); replaced with explicit `\u0000` escapes — check binary-cleanliness when touching that file (`grep -c $'\x00'` must stay silent).

## Generality

**Generality:** mechanism-universal (derived-proposal + injected-tester + typed-gap shapes apply to any language with recipes and a test command); specimen-scoped for every behavior (Python-led fixtures, one 10-case suite, one 5-case tournament). The remedy table's failure-pattern rows (NameError→import, IndentationError→block law) are enumerated in the design, not yet implemented as matchers.
