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
- HAVE the child's memory (`kernel/shadow-echo.js` + `kernel/kind-universe.js`
  + `organs/mnemonic.js`): the SHADOW and ECHO of the raw bytes, quantized to
  144 bytes per image (28 for a series, 48 for text) — the size rule: a
  memory larger than its source is not a memory. The CV parent teaches
  (OpenCV/OCR + vision, `organs/look.js`), the child recognizes without any
  CV model: byte-derived figure/ground proposal (frame's own mean/std,
  connected components), tight-box crops, per-kind DMD frameworks with the
  leave-one-out nearest bound as the verdict floor, every reading against a
  VOID (the nearest other kind), falsifiable (DEF refutes a lesson), splits
  when a kind's members stop being mutually reachable (SEG), novelty signed
  as provisional kinds and corroborated to confirmed ones (SIG→CON), holonic
  parts (a recognized region's interior figures are its parts), omnimodal
  (image grid / audio+video series / text motif windows — one store, one
  framework). Every item carries its de-lossy handle: source path + sha256 +
  pixel region + memory/source byte ratio. Proven on real files
  (`organs/mnemonic-e2e.test.mjs`: PNG + WAV written by the test, ffmpeg
  decoded, recognized where it is in pixel coordinates; 22 unit + 5 e2e
  green).

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
- HAVE per-behavior build driver (`organs/composed-fixer.js`,
  `organs/composed-fixer.test.mjs`): derives one gate per failing assert
  from the workspace's own test bytes (`deriveBehaviors`), synthesizes a
  runnable per-behavior gate against the real entry (`gateSpecFor`,
  python + node lanes), runs `runCodeLoop` per sub-task so each green
  sub-win is BANKED and only the whole gate decides the whole
  (`runComposedFix`), and stops stalled sub-loops early (`detectStall`).
  6 tests pin it, incl. the end-to-end banked path. Eval + production
  path both usable; declared gates (`gates:`) pass through verbatim.
- HAVE `runCodeLoop` end-to-end (needs a live mouth; driver-tested
  only).

## E. Generation aids (scaffolding, never law)

- HAVE `generationBriefFor` (anchor shapes + full closed class +
  provenance, ~10 lines, null where nothing received),
  `mismatchNoteFor` (py↔js foreign-shape check, else null), widen
  note — all served by `/v1/code`, none by `/v1/agent`.
- WALL Thea's vocabulary stays closed (pace/defer/…) — notes attach at
  her callers, never inside her; `martial.js` nominates, never verdicts.

## F. Open gaps, ranked (the work order from here)

1. Composed fixer driver + failing-test-as-subtask loop (per-behavior
   gates, banked partial wins) — built (`organs/composed-fixer.js`),
   driver-tested only; needs a live-mouth run (qwen2.5-coder or the
   gemma2 agent lane) on a real multi-file task to falsify banked wins
   against the box's actual mouth. The driver is the remaining gap, not
   the knowledge.
2. ASK-SHAPE review routing — built (`verdict` shape in `detectAnswerShape`,
   pinned by `native/conformance/verdict-shape.test.mjs`). Control B
   (2026-09-19): a verdict-shaped review ask ("does the patch make the test
   pass? answer YES or NO") was classified composition — the artifact
   language fed the register's code signal and the ask entered the
   code-generation pipeline, surfacing the mouth's one-word verdict as if it
   were a generated artifact. Now a review act + artifact + outcome (or an
   explicit binary-answer instruction) routes to a brief chat judgment,
   excluded from long-extend. Plain questions and named-genre compositions
   are pinned unchanged.
3. Builtin syntax gate (parse-fail vs test-fail separated).
4. Go-vs-C second split; `martial.js` off blended-only; stale blended
   rebuild (26 vs 73 files); TS/C/Go gates; ASCII leftovers.
5. Competency battery per language (the number all of the above moves;
   carries the briefs on/off A/B for free).
6. The child (mnemonic) on the real CV-sample dataset (`organs/mnemonic*.mjs`
   + `kernel/shadow-echo.js` + `kernel/kind-universe.js`) — built and tested
   on synthetic shapes + self-written PNGs/WAVs (22 unit + 5 e2e tests, all
   green); the next falsification is the Kaggle
   `benai9916/computer-vision-sample-images` corpus, teaching "dog" from
   actual dog photographs and recognizing them from the 144-byte shadow/echo
   alone.

Sections B–E cite the row that proves each HAVE (test file or RESULTS
doc); anything here without a citation is the next edit's job.
