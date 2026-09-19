# Harness baseline: eoreader7 runs ai-code-harness (20 basic Python tasks)

First exogenous competency number: the engine's own `/v1/code` loop
(driven by `eval/the-fold/harness-run.mjs`, no hand-written solutions)
on the sibling `ai-code-harness` battery (HumanEval-style: prompt +
entry_point + asserts, 2 s/task timeout, isolated namespace).

Reproduce with:

```
node native/eval/the-fold/harness-run.mjs --all --rounds 3 --model gemma2:2b
python3 evaluate.py <samples>   # from /Users/mlacy/Documents/3.0/ai-code-harness/
```

Setup per task: fresh tmp workspace; `solution.py` starts as a
synthesized 0-arg stub (mechanical.js — the control below);
`test_body.py` = the harness asserts verbatim; `check.py` execs both
(the loop's testCommand is `python3 check.py`, 15 s cap against hangs).
Mouth: gemma2:2b resident on GPU. Two full runs + one control.

## Numbers

| run | loop-green | harness score | identical completions |
|---|---|---|---|
| stub control (no mouth) | — | **0/20** | — |
| run 1 (gemma2:2b, 3 rounds) | 15/20 | **15/20 = 75.0%** | — |
| run 2 (same) | 15/20 | **15/20 = 75.0%** | 10/20 vs run 1 |
| run 3 (+ `--stub-arity test`) | 16/20 | **16/20 = 80.0%** | bracket-blindness fixed 11+19 live |
| run 4 (same flags) | 11/20 | **11/20 = 55.0%** | contention, see below — NOT a regression |

Loop-green == harness score in every run (check.py faithfully
reproduces the asserts — no leakage, no inflation). Healthy runs take
~2 min; 14–16 tasks land round 1 at ~3–5 s/round; failures burn all 3
rounds (~9–15 s each).

## Failure analysis (runs 1–2: all 10 failures one shape; run 3 splits it)

Both runs fail exactly Basic/05, 09, 10, 15, 20 — every one with
`<name>() takes 0 positional arguments but 1 was given`, and every
final sample an **untouched stub**. Not wrong bodies: unlanded
patches. Three rounds of unlocated/ambiguous/unparsed gaps against a
2-line file, then exhaustion. (Attribution limit, named: the driver
keeps done/rounds/ms but not round transcripts — final samples plus
fail messages, not gap sequences. Persisting rounds per task is the
instrumentation fix.)

Why those five is unexplained — names are ordinary, prompts are
ordinary (05's "Do not use max()" is the only standout). Two
candidate theories, both untested: sampling variance that happened to
repeat (a third run discriminates), vs a systematic trigger in those
prompts. The single-task re-probe of 05 passed round 1, but with a
shorter hand-written prompt — evidence about prompts, not variance.
Noted, not claimed.

## Model notes (lesson #6, live)

qwen3:30b-a3b cold: two consecutive ~5-min timeouts, aborted, 0
attempts recorded. gemma2:2b resident: 4 s/round, 15/20 twice. The
resident/warm model wins — measured again, same box, same week.
Proxy default (olmo2:7b) untested. smollm2:1.7b excluded per lesson
#7 (hangs on system role).

## What would move the number (predictions, not claims)

- **Stub with test-derived arity.** DONE (run 3): `--stub-arity test`
  fixed 05 round-1 on first contact; exposed bracket-blindness in
  `arityAt` (fixed live: 11+19 recovered in run 3 → 16/20); added the
  whole-file anchor for stub-sized unlocateds (mechanism built +
  pinned, never got a fair live run — see contention note).
- **Arity gate pre-test.** BUILT (Ant 2: `arityCoverage`, NOTE-only,
  pinned) but not yet measured live against the residual.
- **Round transcripts persisted.** DONE (Ant 1) — run 4's diagnosis
  below came from records, the first attribution in this doc that
  isn't inference.

## Contention note (run 4: 55% is load, not regression)

Run 4 scored 11/20 with SIX empty-crash failures (untouched stubs)
including Basic/01 and 08 — green in all three prior runs, twice in
round 1. Round times ran 2–4× healthy (23–54 s vs 3–15 s); Gemma stayed
resident throughout, so this is shared-box contention starving a small
model into round-1 `unlocated`s, not a mechanism failure: the
whole-file note cannot be blamed (it only fires AFTER a first
unlocated), and immediate single-task retries of 01 and 08 passed
round 1. Lesson, stated plainly: **small-model loop scores on a shared
box are load-sensitive** — publish draws with round-time medians, rerun
outliers before reading them, and never compare runs across different
box states. The whole-file anchor therefore stands built+pinned but
unevaluated live.

## What this number is not

20 basic single-function greenfield tasks, no imports, no multi-file,
no debugging, no intent ambiguity. 75% here says the loop-plus-small-
mouth writes trivial functions fast; it says nothing about
Claude-Code-level work. The harder battery (imports, multi-file,
repair) is the next instrument, not the next tweak.

## Generality

**Generality:** setup-universal (driver runs any tasks.jsonl-shaped
battery through any Ollama model); specimen-scoped for every figure
(20 basic tasks, gemma2:2b warm, 4 draws + 1 control, September box —
run 4 shows draws are only comparable under equal box load).
