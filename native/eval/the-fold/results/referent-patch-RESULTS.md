# Referents and physics: the patch pipeline rebuilt, and a real improvement landed in the engine

Direction, near-verbatim: **"make it work — remember that words point to
referents which are defined contextually"**, then **"tool calling should use
physics not json"**, then **"wire up the snipping."** The prior run
(`eval/results/local-llm-nul-index-improve-RESULTS.md`, same day) had
measured 4/4 landed, 0/4 genuine: every failure was model-authored
positional metadata (a JSON `{find}` naming an ambiguous referent, corrupted
by the `every:true` rescue) or an arena chosen by raw token frequency
(`scoutSpan` anchoring on incidental words). This pass replaced both halves
and reran the same three instructions, verbatim, against the same real local
model (qwen2.5-coder-1.5b-instruct, llama-cpp-python + real GGUF).

## What was built

**`code-scout.js`** (+ 12-case `code-scout.test.mjs`, against the real
`nul/index.js`):

- `declaredReferents` — a file's top-level declarations, each with its
  whole-statement span: the referent's *contextual definition*. A cheap
  string/comment-aware walk, not a parser (the store-sql posture).
- `scoutDefinition` — resolves an instruction's words to the ONE declared
  referent it is about. Nothing declared named → typed
  `no_referent_named`, **zero model calls** (the hole scoutSpan had:
  "frobnicate" and "make it better" both used to get arenas; both now
  refuse). Several named → **quotation disambiguation**: the longest
  verbatim run shared between the instruction and each candidate's own
  definition decides — a quote can only come from the referent that holds
  those bytes. Two scorers were tried and refuted on the real witness case
  first (distinct-word containment: `pattern` 28 vs `witness` 11, pure
  span-length bias; exclusive-word voting: 14 vs 3, comment-prose bias) —
  both kept in the module header so they are not retried. The quotation
  run wins it 112 vs 21: the instruction carries a ~112-char verbatim
  quote of witness's own guard line.
- `deltaOps` — **the physics half.** The model only ever emits code in its
  native medium (the complete corrected function in a fence — no JSON, no
  grammar constraint, no model-authored `find`); the edit is *derived* from
  the bytes: common prefix/suffix trim, anchor grown until unique **by
  construction**, so `applyOps`'s strict wall always lands and the
  `every:true` rescue — the corrupter in both of the prior run's
  syntax-broken cases — is never reached. The same law `deriveOp` already
  encoded one register down ("both small models say INS while supplying a
  replacement" — labels lie, bytes don't), generalized to the whole edit.
- `extractDeclaration` — fence-tolerant extraction of the named
  declaration, with one disclosed normalization (a dropped `export`
  prefix restored, flagged `exportRestored`, never silent).

**The snip wired** (`eval/referent-patch-eval.mjs`): the arena is snipped
through the engine's own `host/corpus.js::snipRange` — byte-accurate,
provenance-registered, the same organ the surf's address ladder uses — with
the char→byte conversion self-verified against the scout's slice (P5.2).
Load-bearing, not ceremony: `nul/index.js` is not ASCII (char 31923 = byte
32049), so an unconverted span would have been silently wrong by 126 bytes.

**Four witness tiers**, all mechanical, all evidence for a bounded repair
loop (3 attempts/case, fresh build each, evidence accumulating; the model
is only ever shown the *measured miss*, never a probe's code):

1. **syntax** — `witnessCode` on the export-stripped patched slice.
2. **differential no-throw** — the patched module must not throw on any of
   19 probe inputs the original returns values for (gaps are results —
   nul's own law; the probe set includes the no-pattern call shape the
   prior run's one "clean" patch crashed on).
3. **intent** — the case's own declared expectation, measured over the
   original/patched pair. Added mid-session because run 1 of this driver
   proved tiers 1-2-4 are structurally blind to it: all three patches
   landed with every harm tier clean, and TWO had not done the asked-for
   thing (an `isGap` check placed after the guard that fires first — dead
   code; a comment *claiming* a move that never happened). Harmlessness is
   not intent.
4. **the engine's own conformance suite** — 1187 tests over a tree with the
   patched file in place; only failures new against the pristine baseline
   (10 pre-existing environment failures) convict.

## Measured (run 2, the shipped configuration)

| case | outcome | attempts |
|---|---|---|
| `ground`: validate `seed` like `draws`/`window` | landed, all four tiers clean | 1 |
| `difference`: move `censoredAt` into its branches | **failed, honestly, typed** | 3 |
| `witness`: pass an upstream gap through via `isGap` | landed, all four tiers clean | 2 |
| control: "make it better" | refused `no_referent_named`, **0 model calls** | — |
| control: "fix the frobnicate function" | refused `no_referent_named`, **0 model calls** | — |

The `witness` case is the repair loop working exactly as designed: attempt
1 reproduced the dead-code placement, the intent tier measured the miss
("calling witness with pattern set to a real upstream gap still returns
made_no_difference"), and attempt 2 — shown only that sentence — produced
a correctly restructured guard. The `difference` case is the honest
negative: all three attempts dropped `censoredAt` from the gap objects and
the intent tier caught each one; a 1.5B cannot yet do this move-refactor,
and the pipeline says so with the evidence trail instead of shipping it.

**Zero harm anywhere in the run** — no syntax corruption, no crash
regression, no unrelated-byte edits. The prior run's entire failure class
is gone, mechanically, not by the model getting better.

## Adversarial verification (8 independent agents, refutation-framed)

**`witness` patch: 3/3 lenses pass.** One judge ran a 650-combination
differential against the real module (5 grounds × 5 figures × 26 pattern
shapes including forged gap-symbol objects): exactly the intended
divergences, zero throws, every other line byte-identical in behavior.
Another verified the defect against the file's own semantics
(`made_no_difference` is a substantive verdict, "perceived, and therefore
not testimony"; the swallowed gaps are methodological refusals) and its own
adjacent idiom (`isGap(figure)` passthrough one line up — pattern was the
sole asymmetry). Nits, none disqualifying: the nested `if/else` where house
style would write a flat one-liner; a redundant `else` after `return`.

**Landed in the real engine — locally; the push needs one scope grant.**
The model's exact verified bytes are committed in the
`eoreader7/legacy-eoreader6.1` submodule checkout (`c164686`), pinned by a
new conformance case in `confabulation.test.js` (built from a *real*
`pattern()` gap — the incomparable-specs `unknown_spec` the file's own
neighboring test already produces — asserting `Object.is` identity through
witness, and that a merely-missing pattern still gets
`made_no_difference`). Full suite in that tree after landing: 1188 tests /
1175 pass / the same 10 pre-existing environment failures / zero
regressions. The push was refused 403 by the git proxy —
`clovenbradshaw-ctrl/eoreader6.1` is not in this session's authorized
repository set — so the commit ships here as
`eval/results/eoreader6.1-witness-gap-passthrough.patch` (git
format-patch, `git am`-able as-is, authorship and evidence in its own
message). eoreader7's submodule pointer was deliberately NOT bumped: a
parent commit pointing at an unpushed submodule commit would break every
other checkout.

**`ground` patch: passes correctness and safety, FAILS
genuine-improvement — for a reason upstream of the model.** The judge
found `rng()` begins `seed | 0`: a fractional seed already truncates, so
the instruction's own premise ("used arithmetically… hazard") was
empirically false; the residual defect is declaration hygiene only (spec
records `seed: 1.5` while the effective identity is `seed: 1` — real, but
not what the instruction claimed), the guard is unreachable from every
live path (`measure.js` already gates), the second clause is provably dead
code, and fixing `ground` alone leaves `extremeGround`'s duplicated guard
block inconsistent (n=1 refuses what n≥2 accepts — the reconcile-don't-
dedupe rule). **The model compiled a flawed ask faithfully.** Not landed
upstream. The lesson, P5.5 aimed at instruction authoring: the pipeline's
"verified" ceiling is compliance-with-instruction; the instruction's own
premise is a claim about the material and needs its own check before the
model is ever asked.

**`difference` failure audit: attribution confirmed.** The intent probe is
the right observable (necessary-not-sufficient, and failing a necessary
condition is conclusive for FAILED); the instruction was not ambiguous
(the field it asks to move is the only use it cites); the measured
`undefined` implies the model dropped the property from the regenerated
literals across all three attempts. One mechanical improvement adopted as
future evidence-wording: report the key-set diff ("the gap object no
longer carries the key censoredAt") rather than "was undefined", which
steers a small model toward the actual failure (a dropped property, not
wrong arithmetic).

**Completeness critic: 11 ranked gaps**, the top one being this pipeline's
honest ceiling: tiers 2 and 3 are hand-declared per referent, and before
this pass's fix an unprobed referent got a *vacuously clean* differential
tier — the "absence of a refusal is not a check" shape P41 just named
elsewhere in this repo. Fixed the cheap half (an unprobed referent now
lands a typed UNEXAMINED disclosure, and an HTTP failure from the model
server now throws as infrastructure instead of masquerading as a model
refusal); the deep half — probe synthesis, or a standing "intent
unverified" disclosure on every probe-less landing in a live app — is
named, real, unbuilt. The remaining ranked findings (delta-scope explosion
under model reformatting; quoteless disambiguation with no declared
run-length floor; regex-literal lexing in the statement walkers; DECL_RE's
modern-syntax coverage; multi-referent instructions; the unconditional
export restoration) are disclosed in `code-scout.js`'s own header at the
point of use.

## The scoreboard against the baseline

| | prior run (scoutSpan + JSON find/add) | this run (referent scout + physics) |
|---|---|---|
| genuine, adversarially-verified improvements | 0/4 | **1** (landed in the engine) |
| harmless-but-honest typed failures | 0 | 1 (with evidence trail) |
| instruction-premise failures exposed | 0 | 1 (`ground` — the ask was wrong, not the model) |
| syntax corruption / crash regressions | 2 + 1 | **0** |
| underspecified control landing on unrelated bytes | yes (comment hijack) | **refused, 0 model calls** |

Files: `code-scout.js`, `code-scout.test.mjs` (12/12),
`eval/referent-patch-eval.mjs`, `eval/results/referent-patch-eval-run.json`
(run 2) and `…-run1-preintent.json` (run 1, kept — it is the intent tier's
own evidence). the-fold suite: 1005/984/21 with these files, 993/972/21
without (git stash comparison) — the 21 are this checkout's pre-existing
environment failures, zero regressions. Engine tree: the landed fix + pin,
full conformance suite rerun there.
