# Code-language priors, Python + JavaScript — learned the way Ancient Greek was

Greek precedent: **S83/S84**. A received prior from a real corpus (UD
treebank via the language-general `build-pos-prior.mjs`), a
language-parameterized organ factory with a safe default (admit the
unseen, never refuse what no gate was built to judge), and a measured
admission gate (0 heard → 154 heard on real Matthew prose). This pass
does the same for two coding languages, with one addition the user
required: the knowledge is stored **generatively** — prompt scaffolding
a mouth writing patches can use, and remedy notes Thea's callers can
attach — not just as recognition gates.

Reproduce with:

```
node native/scripts/build-code-keyword-prior.mjs <law-prior.json> <out.json> <lang>
node --test native/tests/code-language.test.js
```

## Why this exists

`code-structure.js`'s declaration recipes were **ASCII-only and
keyword-blind**: `def class` declared a function named `class`,
`def Διαβάζω` (legal PEP 3131, accepted by the running engine) parsed
to nothing, and `isCodeHunk` on a real 65 KB Flask app returned `false`
— so `whatIsThis` refused pure Python as `not_code_hunk`. That is S84's
bug exactly: a JS-bundle-shaped gate wrongly asserting "not code" about
a foreign language instead of staying silent. And `CodeNamePrior@1`
blends C/Go/Python/TypeScript into one genericity count (measured: 26
files, 16 repos, 17 of them `.c`), so `def main()` in Python is dropped
as boilerplate on zero Python attestations.

## Structure the ants found (verified against the real files, not guessed)

Three parallel foragers (`Task` explore agents) over
`live_priors/derived-priors/code-priors/` and the code channel:

- **Keyword law.** PY∩JS = **18** shared hard keywords (never
  declarable in either); **17** python-only; **25** javascript-only.
  Python soft keywords (**4**: `_ case match type`) and builtins
  (**158**) are legally declarable — recorded, never refused. Traps:
  `case` is hard in JS but soft in Python; `type` is builtin AND soft
  keyword; `set` is a Python builtin and a JS keyword. TypeScript's 21
  "keywords" are grammar-heuristic junk (3/21 intersect JS) — refused
  as a deny-list, its loader returns null.
- **Name frequency.** 2,556 names, only **11** clear the generic floor;
  the whole top of the distribution is Python-only dunders
  (`__init__`×3, `__call__`×3) while `main`/`String`/`schedule` are
  wholly non-Python attestations wrongly dropped from Python
  workspaces. Recommendation (unattempted here): split Python first.
- **Wiring gaps.** `native/priors/` held 28 prose priors and zero code
  priors; the code channel's only prior input was the injected
  CodeNamePrior. Ranked: keyword/XID refusal first, admission+module
  map second, ASCII string gates third, `callEdges` minutiae last.

## What was built

- `native/scripts/build-code-keyword-prior.mjs` (new, language-general:
  no per-language branch) + `native/priors/code-kw-py.json` (35 hard)
  + `native/priors/code-kw-js.json` (43 hard) — CodeKeywordPrior@1 with
  provenance back to the engine/tree-sitter giver.
- Reading side (all additive, null-prior behavior byte-identical,
  pinned): XID `def`/`class` recipes for `.py`; per-recipe ident +
  optional `keywords` refusal in `parseDeclarations` (per-file via
  `buildCodeIndex`); `loadCodeKeywordPrior`/`keywordSetOf`
  (martial.js's own loader discipline); Python signal in `isCodeHunk`
  (≥3 decl lines + parens at twice that count — a ratio, not a floor);
  `.py` in `CODE_EXT` + `PY_IMPORT_RE` in `moduleMapFrom`;
  `keywords` pass-through + `keywordPriorLoaded` disclosure in
  `whatIsThis`.
- Generative face, `native/adapters/code/language.js` (new):
  `detectCodeLanguage` (extension map only; strangers null),
  `generationBriefFor` (anchor shapes + full received closed class +
  provenance, or null), `mismatchNoteFor` (mechanical cross-language
  shape check over the proposal's own bytes, else null).
- Coding loop (`native/the-fold/code-loop.js`): round 1 tags each file
  with its language and serves the briefs for languages present
  (bounded, once); failed-locate nudges gain the mismatch note only
  when the bytes warrant it. `patch.js` untouched — the physics is the
  point. `thea.js` untouched by design: its remedy vocabulary is
  closed (pace/defer/…) and a language hint is not one of them; the
  mismatch note is shaped so a Thea *caller* can attach it to a
  re-forge reason.

## Headline numbers

| specimen | before | after |
|---|---|---|
| `def class():` + py prior | declares `class` | refused (`[]`) |
| `def Διαβάζω(x):` | `[]` | `["Διαβάζω"]` |
| `isCodeHunk` real Flask app (65 KB) | `false` | `true` |
| `moduleMapFrom` Flask imports (50 KB) | 0 rows | 19 rows |
| `function class` + js prior | declares `class` | refused |
| ASCII `def main` ± prior | identical | identical (pinned) |
| `code-language` suite | — | 13/13 |
| neighbors (`code-structure`, `code-hunk`, `code-scan`, `what`) | 38/38 | 38/38 |

## Disclosed, not attempted

- **Per-language name-prior split** (Ant 2's recommendation: isolate
  Python's dunders first) — the genericity floor is still blended.
- **TypeScript/C/Go priors** — detected, never gated (loader null);
  `PY_IMPORT_RE`-equivalents for `go import(`/`#include` unwritten.
- **PyPI vendor fingerprints / stdlib-aware classification** — bare
  module rows classify `unknown`, disclosed per row.
- **`callEdges` `\b`, single-char drop, `askedTokens` ASCII** — Ant 3's
  rank-4 items, still ASCII-shaped.
- **Live-model generation eval** — scaffolding is served, not yet
  measured: a `/v1/code` A/B (briefs on/off) on real Python tasks is
  the run that would earn the generative claim.

## Generality

**Generality:** mechanism-universal (received closed class +
asymmetric polarity + safe-default loader is the S83 shape, applicable
to any language with an introspectable engine or grammar);
specimen-scoped for every number (two languages, one Flask app, one
13-case suite). Nothing here generalizes to a third language without
that language's own measured prior and eval.
