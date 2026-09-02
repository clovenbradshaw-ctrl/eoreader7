# Can a real local LLM improve real eoreader6.1 code? — measured, not assumed

Ask: load a real local model (not Ollama — `ollama.com`'s installer is
outside this session's GitHub repo scope, so this ran `llama-cpp-python` +
a real downloaded `qwen2.5-coder-1.5b-instruct-q4_k_m.gguf` behind a thin
Ollama-wire-shape shim) and test it against real complex code
(`eoreader6.1/nul/index.js`, the flagship statistical engine
CLAUDE.md's "measuring door" section describes), using the-fold's OWN
already-proven build-iteration ladder — `build-log.js` + `widget.js::scoutSpan`
+ `witness.js` — never a lighter reimplementation. Two things were measured
in sequence, because the second only makes sense once the first is known.

## 1. Does `scoutSpan` correctly locate the target function?

**No.** `eval/_scratch-scout-investigate.mjs` ran `scoutSpan` for real
against three natural asks ("fix the validation in ground", "improve the
difference function", "the witness function needs better error handling")
plus a not-found control ("fix the frobnicate function").

`scoutSpan` never anchored on the target identifier itself. `ground`,
`difference`, and `witness` recur too often in the file as
cross-referenced vocabulary (113x / 27x / 12x) to ever be scoutSpan's "most
selective" shared term, so it fell back to rarer, incidental co-occurring
words instead — `"fixed"` (7x), `"function"` (4x), `"error"` (2x). For
`ground` and `difference` the resulting huge fallback span (up to 62% of
the file) happened, by luck, to still bracket the real definition. For
`witness` the luck ran out: the returned span `[48496,59522]` does **not**
contain the real definition at offset 65758. The not-found control did not
return `null` either — `"frobnicate"` is absent, but `"function"` still
co-occurs, so it silently returned the *same wrong span* as the difference
case rather than refusing.

This is the same failure shape a separate investigation this session found
in `packages/host/surfer.js::executePrompt`'s CONTENT rung on this same
file (`eval/surf-fold-local-llm.mjs`): a name that recurs constantly as
prose cross-reference dilutes any coverage-style selection signal past
usefulness. `scoutSpan` does not avoid it.

Numbers and full transcript: `eval/_scratch-scout-investigate.mjs` (run
with `node eval/_scratch-scout-investigate.mjs` from the repo root).

## 2. Given a correct arena, can the model propose a genuine improvement?

Because part 1 shows `scoutSpan` cannot be trusted on this file for these
identifiers, `eval/local-llm-patch-nul-index.mjs` still **calls scoutSpan
for real on every case and logs its raw output** (for comparability), but
works from a manually-bounded arena (unique signature marker +
brace-balancing) so the model is at least shown the right function. Four
independent cases, each on its own fresh build over the pristine file (no
cross-case contamination):

| case | landed | witness |
|---|---|---|
| `ground`: validate `seed` like `draws`/`window` | yes | **dirty** — does not compile |
| `difference`: move `censoredAt` into the branches that use it | yes | **dirty** — does not compile |
| `witness`: pass a real upstream gap through via `isGap(p)` | yes | **clean** — but a real runtime regression |
| negative control: `"make it better"` (no target named) | yes | not run (landed inside an unrelated comment) |

**3/4 mechanically landed, 0/4 are a genuine, safe improvement.**

- **`ground`** — the model chose `find: "seed"`, a 4-character identifier
  occurring 3× in the arena with three different meanings (the parameter
  itself, an arithmetic use, an object-shorthand property). Strict apply
  correctly refused as ambiguous; the `every:true` ambiguous-rescue (a
  real, deliberately-designed feature of this pipeline) then replaced all
  three, splicing an `if` statement into the function's own parameter
  default-value position. Syntax error — witness caught it.
- **`difference`** — `find: "censoredAt"` matches the identifier's own
  declaration too, so `every:true` mangled the original line into
  `const const censoredAt = 1 / s.length;  = 1 / s.length;` and spliced a
  `const` statement into two object-literal property positions. Syntax
  error — witness caught it. It also never actually performed the
  requested move.
- **`witness`** — the *only* case that mechanically landed clean. The
  model's `find` string was the entire original guard line (unique,
  applied strict, no rescue needed) and its `add` correctly implements
  `isGap(p)` passthrough. But it **replaced** the line rather than adding
  to it, silently dropping the original `!p` (missing/falsy pattern)
  fallback. `isGap(undefined)` is `false`, so a caller that omits
  `pattern` (a real, unguarded call shape — `pattern: p` has no default in
  the destructuring) now falls through to `!p.moved` and throws
  `TypeError: Cannot read properties of undefined (reading 'moved')` at
  runtime — a regression the syntax-only witness structurally cannot see,
  because the crashing path is never exercised at compile time. **The one
  case that "succeeded" cleanest is the most dangerous of the four.**
- **Negative control** — `"make it better"` did not refuse. `scoutSpan`
  matched the incidental instruction-word `"make"` inside an unrelated
  JSDoc comment for `volume()` and the model landed a real edit there,
  replacing a substantive technical caveat ("...which would make the vital
  sign partly a measure of how many times we sampled") with content-free
  filler ("...more vital"). Harmless to code behavior, real information
  loss in the docs, on a function the instruction never named.

Full transcript, before/after diffs for all four cases, and the two real
harness bugs found and fixed while building this (a brace-search restart
bug that mis-scoped the `ground`/`witness` arenas; a shared-build staleness
bug where case 1's landed patch silently shifted case 2's precomputed
offsets) are in `eval/local-llm-patch-nul-index.mjs`'s own header and
console output (`node eval/local-llm-patch-nul-index.mjs`, requires the
local model server on `127.0.0.1:11434`).

## The witness-code gotcha, confirmed live

`witness.js::witnessCode("js", ...)` compiles via `new Function(body)` — a
plain script-mode parse with no ES-module support. `nul/index.js` is an ES
module (`export const` throughout), so a whole-file or leading-`export`
witness call throws `Unexpected token 'export'` regardless of patch
correctness. This is a real methodological trap for testing this pipeline
against any file shaped like `nul/index.js` — the fix here (not landed
anywhere in production) was scoping the witness call to just the patched
function's own re-extracted slice, with the leading `export ` token
stripped **only** for that compile check, recovered by offset arithmetic
(never by re-searching for the function's marker text, since an
`every:true` rescue can mangle the marker itself — confirmed live in the
`ground` case).

## What this measures, and what it doesn't

This is **not** a claim that the-fold's iteration pipeline is broken — it
was built and proven (`eval/iterate-eval.mjs`, 12/12 landings, 11/12 clean
turn-one, 12/12 after one repair turn) against small, self-contained HTML
widgets, where `scoutSpan`'s token-frequency selection has few enough
candidate terms that it usually lands on something sane, and where a
`find`/`add` collision has a small enough blast radius that `every:true`
rarely corrupts unrelated code. `nul/index.js` is a different regime: a
66KB file with heavily cross-referenced internal vocabulary, where the
exact same identifier-selection heuristic and the exact same
ambiguity-rescue feature — both correct by their own design contracts —
compose into landed, witness-passed damage.

The honest finding, stated the way this repo states its other negative
results: **arena-finding by raw token-frequency selection (`scoutSpan`,
and separately `surfer.js`'s CONTENT rung) is the load-bearing gap for
applying this pipeline to real, densely cross-referenced source files.**
Neither organ has a code-aware "locate this identifier's own definition"
rung — both fall back to incidental co-occurring words once the named
identifier itself is too common to be "most selective." A real fix needs
that rung (e.g., a definition-site index keyed on declared names, checked
before falling back to token-frequency selection), not a bigger or
different local model — every failure mode measured here (the `seed`
splice, the `censoredAt` self-collision, the dropped `!p` guard, the
comment hijack) is a consequence of the *arena and edit-anchoring* being
wrong or under-specified, not of the model failing to understand the
instruction it was actually given.
