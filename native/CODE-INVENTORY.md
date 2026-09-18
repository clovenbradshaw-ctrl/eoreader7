# Code Inventory — everything eoreader7 holds for reading and writing code

Standing map, not a run record. Legend: **HAVE** (built, tested) ·
**GAP** (named, unwired — each with its seam) · **WALL** (will not be
built here; the design says so and where instead). Assembled 2026-09-18
from three parallel forages over the worktree plus direct reads; every
`file:line` verified. Update rule: a row changes state only with the
test or measurement that moved it, cited inline.

## A. Doorways (two coding surfaces, one learned, one not)

- HAVE `/v1/code` (proxy.mjs:682) — real workspace, caller-declared
  `testCommand`, `maxRounds` clamped 1–10 (default 3), 10-min loop
  deadline, 5-min turn backstop, Heimdall-admitted, abort on
  disconnect. Serves language briefs (round 1), keyword refusal
  pre-disk, widen + mismatch nudges. Physics: exact bytes, real exit
  code, revert-on-red, full audit trail.
- HAVE `/v1/agent` briefs + write gate (`sandboxed-agent.js`:
  `languageBlockFor` serves turn-1 scaffolding for detected virtual-file
  languages; `checkWriteContent` refuses whole-file writes binding a hard
  keyword pre-store with `keyword_declaration` + names — pinned in
  `tests/sandboxed-agent.test.js`, 14/14). Execution stays JS-only
  (`ACTION: run` is JavaScript in a severed vm; Python files are
  writable text the sandbox cannot execute — disclosed in the module
  header). Tournament + mismatch/widen notes still not in this path
  (no FIND to anchor a whole-file write against); fixer driver still
  the next build.
- HAVE CLI reading (`cli/eoreader7.mjs`, `cli/tui.mjs`) — uses
  `isCodeHunk`/`codeEncounters` for admission; edits go through the
  proxy doorways above, never local application.

## B. Perception (bytes → tuples, no model anywhere)

- HAVE declaration recipes + XID twins (code-structure.js:86-100) —
  c/go/python-def/class/js-function/class/const-arrow, ASCII + PEP 3131
  Unicode; `parseDeclarations` returns `{name,kind,start,end,bodyStart}`
  with optional keyword refusal.
- HAVE extents (`braceExtent`/`indentExtent`/`bodyStartOf`, exported) —
  brace-matched vs indent-delimited bodies; the loop's widening draws on
  these.
- HAVE call graph + arity (`callEdges`, `callArity` in
  code-structure.js / mechanical.js) — body-scoped, word-bounded,
  recursion-counted; arity skips unbalanced parens, strings can't fool
  the counter.
- HAVE imports (`PY_IMPORT_RE` + `IMPORT_PATH_RE`, `moduleMapFrom`,
  `importSpans` in scan.js) — JS quoted paths + Python import/from
  (comma-split, dotted→top); spans carry byte offsets, map rows carry
  vendor/feature/asset/infra classification with per-row basis.
- HAVE keyword priors (`code-kw-py/js.json`, CodeKeywordPrior@1: 35/43
  hard; soft + builtins recorded-never-refused) + loaders
  (`loadCodeKeywordPrior`/`keywordSetOf`, martial.js discipline).
- HAVE name priors, blended + split (`code-name-prior-v1.json` in
  live_priors; `code-name-{py,c,go,js}.json` vendored: 310/1786/335/
  2377 names, 5/0/2/2 generic at floor 2; sum-checked 4819=4819) +
  loaders (`loadCodeNamePrior`, `loadCodeNamePriorSplit(s)`).
- HAVE admission + scan + account (`isCodeHunk` with Python ratio
  signal; `scanHunk` bounded with skipped-byte disclosure; `whatIsThis`
  with `prior`/`keywords`/`languagePriors` pass-through and loaded-flags
  disclosure).
- GAP PyPI/vendor knowledge for Python (bare modules classify
  `unknown`), TS/C/Go keyword gates (loader null → safe admission),
  `go import(` / `#include` span patterns, ASCII leftovers (`\b` in
  `callEdges`, single-char drop, `askedTokens`).
- WALL prose identity (`resolve` exact case-sensitive; camelCase grants
  nothing — negative control `source-code__flask-app-py-RAW.json`);
  product naming (libraries/bundlers only, never the application).

## C. Proposal (derived bytes, typed gaps)

- HAVE patch primitive (`the-fold/patch.js`: `deriveOp`/`readOps`/
  `applyOps`, 3-op closed vocabulary, atomic, `unlocated`/`ambiguous`
  with count, `within` spans, counted `every`).
- HAVE mechanical remedies (`adapters/code/mechanical.js`):
  `missingImports` (spans blanked, locals/dunders/attributes excluded),
  `synthesizeStub` (RECIPES' shapes, honest NotImplemented bodies,
  keyword/unknown-language refusals), `importAnchor`,
  `suggestWiderFind` (one-owner rule, else null), `declaresKeyword`
  (unrefused-minus-refused diff), `renameIn` (XID-boundaried,
  declared-check, keyword guard, string touch disclosed).
- HAVE tournament (`kernel/tournament.js` — engine side by placement,
  physics imported from the-fold per standing kernel precedent):
  injected tester, `{exit code, then minimal diff}`, losers as refused
  trials; throwing/non-verdict testers recorded, never trusted.
- GAP composed fixer driver (failure-bytes → remedy → tournament →
  land exists only as library calls); tournament not in the mouth's
  path; witness-cleanliness tiebreak named, unattempted; builtin
  syntax check (`py_compile`/`node --check`) nowhere — only
  caller-declared strings reach `execSync`.
- WALL novel logic bodies, ambiguous-failure diagnosis, green-but-rotten
  veto (the three mouth doorways); reference/predication/paraphrase
  (WHERE-WE-ARE — no mechanical organ decides these, model load-bearing).

## D. Arbitration (selection without judgment)

- HAVE loop verdict (exit-0 keep / nonzero exact-byte revert), round
  bounds (budgets table in code-loop.js:43-49), typed proposal grammar
  (`parseProposal`, first pins in code-loop.test.mjs), workspace
  confinement (`realpath` inside root; doorway checks non-empty only).
- HAVE homeostatic bounds (Heimdall: family cap 4, ration 40/600 per
  15 min, 120 s SLA, queue/zipper/claims; Apollo: 5 channels, k=3σ,
  runaway at >4×mean — applicable as candidate-search tripwire,
  unwired; Thea: 7 closed actions, deterministic, never executes).
- HAVE measured carriage, no model (longform-code: 200 turns → 56 KB
  artifact, 887-byte max emission, 200/200 cursors; iterate-eval P16:
  12/12 landings live, with the STRESS-EVAL counter-record that it does
  not extrapolate to multi-turn).
- HAVE forecast (`the-fold/forecast.js`, pinned in
  `the-fold/forecast.test.mjs`): Laplace P(green) per (op, language,
  syntax), predict→record→observe in the loop's tested rounds,
  surprise threshold, tournament `rank` seam. Session-scoped;
  cross-run persistence named unattempted.
- HAVE model-free build driver (`eval/the-fold/create-learn.mjs`,
  recorded in `eval/results/create-learn-RESULTS.md`): 3/4-green tip
  calculator from failing tests, zero model calls, typed residual at
  the novel-logic wall. Eval-side, not production path.
- HAVE parallel arbitrators (`precision-race` first-settled-wins;
  `runSandboxedJs` severed execution; `witnessRegressed` tiebreak
  exists but is NOT called by the loop — exit code alone decides).
- GAP `runCodeLoop` end-to-end (needs a live mouth; driver-tested
  only); per-behavior gates in the production path (lesson, not
  mechanism — the tournament + failing-test-as-subtask is the designed
  shape, unbuilt).

## E. Generation aids (scaffolding, never law)

- HAVE `generationBriefFor` (anchor shapes + full closed class +
  provenance, ~10 lines, null where nothing received),
  `mismatchNoteFor` (py↔js foreign-shape check, else null), widen
  note — all served by `/v1/code`, none by `/v1/agent`.
- WALL Thea's vocabulary stays closed (pace/defer/…) — notes attach at
  her callers, never inside her; `martial.js` nominates, never verdicts.

## F. Open gaps, ranked (the work order from here)

1. Composed fixer driver + failing-test-as-subtask loop (per-behavior
   gates, banked partial wins) — serving BOTH mouth paths once built.
   (`/v1/agent` now shares the priors; the driver is the remaining
   gap, not the knowledge.)
2. Composed fixer driver + failing-test-as-subtask loop (per-behavior
   gates, banked partial wins).
3. Builtin syntax gate (parse-fail vs test-fail separated).
4. Go-vs-C second split; `martial.js` off blended-only; stale blended
   rebuild (26 vs 73 files); TS/C/Go gates; ASCII leftovers.
5. Competency battery per language (the number all of the above moves;
   carries the briefs on/off A/B for free).

Sections B–E cite the row that proves each HAVE (test file or RESULTS
doc); anything here without a citation is the next edit's job.
