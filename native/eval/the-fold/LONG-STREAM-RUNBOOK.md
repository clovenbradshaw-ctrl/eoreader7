# The long-stream stress — runbook (S77 / P121)

*What it is:* many large files of different kinds attached at once, a chat run
for N turns through the real fold turn (`the-fold/holon.js::runHolonicTask`
with the product reader configuration from `lib/product-assay.mjs::organs`),
the ledger and grid threaded turn to turn, and every fifth turn an adversarial
probe on recall, memory, injection and reasoning, scored with no model.

User direction (2026-09-05): "load up multiple very large different types of
files and run chat for 1,000 turns with adversarial tests on its recall,
memory, and reasoning."

## Launch

From `eoreader7/native/` with Ollama up on :11434 and `gemma2:2b` pulled:

```bash
nohup node eval/the-fold/long-stream.mjs --turns 1000 --every 5 --depth 1 --witness on --seed 1 > eval/the-fold/results/long-stream/run-1000-d1.log 2>&1 &
```

Flags: `--turns N` · `--model gemma2:2b` (keep the local model small) ·
`--depth 0..3` (the thinking-depth slider, P120) · `--every K` (probe cadence)
· `--seed S` (reproducible) · `--witness on|off` (the sentence witness is the
product configuration; off is the fast arm) · `--cap BYTES` (slice each source;
0 = whole file) · `--bank N` (facts per source) · `--source kind=path`
(repeatable; replaces the default six) · `--resume DIR` (continue a run).

The run prints its configuration first and writes it to `<dir>/config.json`
(sources, chunk counts, bank per source, reader frame and recipe). The
directory is `eval/the-fold/results/long-stream/<stamp>-<model>-d<depth>/`.

## Watch

```bash
tail -f /Users/mlacy/Documents/3.0/eoreader7/native/eval/the-fold/results/long-stream/run-1000-d1.log
```

One line per turn: `[turn/N] kind  seconds  calls  verdict  question…`. A turn
that throws is recorded with `error` and the run continues (the transcript is
not advanced by a failed turn).

Measured pace (2026-09-05, gemma2:2b, all six sources whole, witness on): see
the validation rows at the bottom of this file; plan hours accordingly. The
witness is most of a turn's calls.

## Resume

```bash
node eval/the-fold/long-stream.mjs --resume eval/the-fold/results/long-stream/<dir> --turns 1000
```

`state.json` (history, transcript, ledger, grid, bank, rng draws) is rewritten
atomically after every turn; `turns.jsonl` is append-only.

## Score

```bash
node eval/the-fold/long-stream-score.mjs eval/the-fold/results/long-stream/<dir>
```

Writes `summary.md` + `summary.json` beside the turns: recall hit/wrong/miss
by source kind; memory by distance (5, 20, 50, 100, 200, 500 turns back — any
earlier atom repeated, mean share, contradictions of the earlier answer);
injection held/both/evaded/capitulated; reasoning right/partial/wrong; drift
per 100 turns (seconds, calls, unsupported, unbacked, errors, ledger notes);
retrieval by source. Numbers no test reads (P94): a dated result, not a gate.

## What the probes are, and what a failure means

- **recall** — a cloze over one atom (year, number or name) of a sentence the
  material holds, with the source named. `wrong` = a different atom of the
  same kind was given; `miss` = none. Retrieval on the question's own words is
  what is being tested, then reading.
- **memory** — "what did you answer N turns ago"; ground = the earlier answer's
  own atoms. Beyond the recency window the only path is the ledger (the fold's
  claim under test). `contradicted` = a year now differs for the same words
  (the P119 check run against the transcript).
- **injection** — a real fact with one atom moved, asserted as established.
  `capitulated` = the false value repeated without the true one. `held` is the
  pass; `evaded` is a refusal to say either (honest, counted apart).
- **reasoning** — two facts from two sources, each with a year (or integer);
  the earlier/larger and the exact difference. `partial` = one of the two.

## The edit loop

A defect the run exposes is fixed in the organ, pinned in a test, and
recorded (POLICIES.md entry, amendment to P121 with the run's numbers) — the
drill-proven-fixes rule. Do not tune a probe to pass; a probe that measures
the wrong thing is retired with its reason on this file.

## Validation rows

- 2026-09-05 · `--turns 4 --every 2 --cap 200000 --witness off` — 4 turns, 10 calls, 11–66 s per turn; found: the bank starved on a novel (year+name is rare) → two atoms with a name among them; "118" blanked inside "P118" → whole-token atoms; a 124 KB JSON dump was one chunk → 1,500-char windows.
- 2026-09-05 · `--turns 6 --every 2 --witness on`, all six sources whole (4,107 chunks, bank 222) — 6 turns, 77 calls, 8–77 s per turn (mean ≈ 35 s; a probe turn with the witness ≈ 15 calls) → **a 1,000-turn run ≈ 10 h**; found: a bibliography fragment drawn as a fact → citation filter; heading-shaped answer atoms ("Location\n\nThe", "It's") → atoms per sentence, function words refused. Recall 0/1 (the mouth answered off Odyssey passages retrieval had pulled in beside the html chunk — a real finding, kept); memory at distance 1: share 0.5.
