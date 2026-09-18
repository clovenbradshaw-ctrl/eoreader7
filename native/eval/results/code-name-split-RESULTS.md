# Per-language name priors: genericity is a fact about a language's own codebases

Follow-up to `code-language-priors-RESULTS.md`, executing Ant 2's
recommendation (split Python first). The blended CodeNamePrior@1
collapsed C/Go/Python/TypeScript into one genericity count and misdropped
in both directions. This pass measures and wires the split.

Reproduce with:

```
node native/scripts/build-code-name-prior-split.mjs <corpusDir> <outDir>
node --test native/tests/code-name-split.test.js
```

## The split, measured on the current tree

`build-code-name-prior-split.mjs` (new, language-general: families are a
data table, never branches) runs recipes identical to the blended
builder's, over `live_priors/09-source-code` as it stands (73 code files
— the tree has grown since the blended artifact's 26 files of
2026-09-11, disclosed because "before" counts below mix both effects):

| family | files | repos | distinct names | generic at floor 2 | top |
|---|---|---|---|---|---|
| py | 3 | 3 | 310 | 5 | `__init__`(3) `__call__`(3) `__init_subclass__`(2) `run`(2) `decorator`(2) |
| c | 18 | 10 | 1786 | 0 | all hapax — C names are project-specific at this sample size |
| go | 4 | 3 | 335 | 2 | `String`(2) `init`(2) |
| js | 48 | 2 | 2377 | 2 | `error`(2) `getText`(2) |

Sum-checked at build time (the script refuses to write otherwise):
**4,819 blended attestations = 4,819 split attestations** — no recipe
drifted. Vendored to `native/priors/code-name-{py,c,go,js}.json`.

## Both misdrops fixed (fixture-blended baseline, real splits)

| specimen | blended | split |
|---|---|---|
| `app.py`: `def main / def run / def __init__` | drops 3 (main on zero py attestations — wrong) | drops 2 (`run`, `__init__` — real python generics); `main` kept |
| `k.c`: `int __init__ / int main` | drops 2 (`__init__` on three python-only attestations — wrong) | drops 1 (`main` only); `__init__` kept |

Note: the C specimen's `main` is kept under the c split on the
*current* tree (1 c-repo attestation — corpus growth since the old
blended artifact's openssh hit), which is the honest count, not a
tuning artifact. Fixture tests pin the wiring with fixed counts
(blended 2 → split 1); live values are asserted only where stable
(`__init__` py=3, `main` py=None, `String` go=2/js=None).

On the real 65 KB Flask file the old blended and the new py split drop
the same 4 of 41 — agreement where the languages agree, divergence
exactly where the ants predicted (python-only dunders, non-python
`main`). No overclaim beyond that.

## Wiring (all additive)

- `loadCodeNamePriorSplit` / `loadCodeNamePriorSplits`
  (code-structure.js, martial.js's loader discipline: read once, null
  when absent; `typescript`/`klingon` → null, falling back to blended).
- `codeGist({ languagePriors })`: each name judged against its own
  language's split via `familyOfFile` (derived from the RECIPES table —
  no second extension map to drift); absent split falls back to blended;
  without the param the behavior is byte-identical (pinned). A name
  declared in two languages is judged on its first file (disclosed).
- `whatIsThis({ languagePriors })` pass-through +
  `languagePriorsLoaded` disclosure. `martial.js`'s second gate
  untouched (named below).

## Disclosed, not attempted

- **The old blended artifact is stale** (26 files vs today's 73) — the
  fallback inherits its staleness; rebuilding it is live_priors'
  pass, not this one.
- **Go-vs-C second split** (Ant 2's follow-up): families exist in the
  files, the consumer already reads them — one measurement run, no new
  seam needed.
- **`martial.js` still reads blended only** — copy-vs-boilerplate
  verdicts keep the old asymmetry until its own pass.
- **Thin families admit everything** (c: 0 generic of 1786) — the safe
  default at this sample size, stated in each file's provenance, not a
  finding that C has no boilerplate.

## Generality

**Generality:** mechanism-universal (per-language genericity with
blended fallback is the S83/S84 shape applied to frequency priors);
specimen-scoped for every count (one corpus snapshot, two designed
specimens, one Flask file, one 6-case suite).
