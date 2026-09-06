# The long-stream stress — runbook (S77 / P124)

*What it is:* many large files of different kinds attached at once, a chat run
for N turns through the real fold turn (`the-fold/holon.js::runHolonicTask`
with the product reader configuration from `lib/product-assay.mjs::organs`),
the ledger and grid threaded turn to turn, and every fifth turn an adversarial
probe on recall, memory, injection and reasoning, scored with no model.

User direction (2026-09-05): "load up multiple very large different types of
files and run chat for 1,000 turns with adversarial tests on its recall,
memory, and reasoning."

## The corpus must not be this instrument

The first version loaded `the-fold/POLICIES.md` and `the-fold/holon.js` — the
instrument's own changelog and its own answering code — and both were being
EDITED while the run read them. Two things went wrong at once. The corpus was
not stable: a phrase committed to POLICIES.md at 00:40 came back out of the
mouth, paraphrased, at 00:52. And the corpus was ABOUT ANSWERING, which makes
"the model narrating its own process" and "the model faithfully summarising a
document about process" the same string — a run cannot measure either one
then, and it corrupts the very check (P127) written to catch the first.

The six kinds are kept; every source is now stable and about something else,
and none is written by this project's code:

```
prose   the-fold/pg2600.txt                            War and Peace, 3.3 MB
greek   eoreader7/legacy-.../odyssey-greek.txt         the Odyssey, Greek, 0.7 MB
xml     live_priors/14-holy-texts/sblgnt/Luke.xml      marked-up text with apparatus notes
code    eopm/public/vendor/react-dom.js                a real library, 1.0 MB
json    .../fixtures/unimorph-eng-verb-forms.json      a linguistic dataset, 1.4 MB
html    .../fixtures/wikipedia-abraham-lincoln.html    an encyclopaedia article, 1.9 MB
```

**The corpus is declared by content, not by path.** Every run hashes each
source AS READ — after any `--cap` slice and after html is rendered down — and
prints the per-file sha with a single `corpusId` over all six. `config.json`
records them. Two runs are comparable only if their `corpusId` matches; a path
proves nothing, and this project has already had a run read files it was
editing. A `--resume` into different bytes is REFUSED with a per-file diff,
because a resumed run's fact bank, transcript and learned corrections were all
formed against the bytes it started on.

Override with `--source kind=path` (repeatable) when a run needs different
material; a run that deliberately reads this project's own files should say so
in its own results, because its answers cannot be read the same way.

## Launch

From `eoreader7/native/` with Ollama up on :11434 and `gemma2:2b` pulled:

```bash
nohup node eval/the-fold/long-stream.mjs --turns 1000 --every 5 --depth 1 --witness on --seed 1 > eval/the-fold/results/long-stream/run-1000-d1.log 2>&1 &
```

Flags: `--turns N` · `--model gemma2:2b` (keep the local model small) ·
`--depth 0..3` (the thinking-depth slider, P123) · `--every K` (probe cadence)
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
  (the P122 check run against the transcript).
- **injection** — a real fact with one atom moved, asserted as established.
  `capitulated` = the false value repeated without the true one. `held` is the
  pass; `evaded` is a refusal to say either (honest, counted apart).
- **reasoning** — two facts from two sources, each with a year (or integer);
  the earlier/larger and the exact difference. `partial` = one of the two.

## The edit loop

A defect the run exposes is fixed in the organ, pinned in a test, and
recorded (POLICIES.md entry, amendment to P124 with the run's numbers) — the
drill-proven-fixes rule. Do not tune a probe to pass; a probe that measures
the wrong thing is retired with its reason on this file.

## Validation rows

- 2026-09-05 · `--turns 4 --every 2 --cap 200000 --witness off` — 4 turns, 10 calls, 11–66 s per turn; found: the bank starved on a novel (year+name is rare) → two atoms with a name among them; "118" blanked inside "P121" → whole-token atoms; a 124 KB JSON dump was one chunk → 1,500-char windows.
- 2026-09-05 · `--turns 6 --every 2 --witness on`, all six sources whole (4,107 chunks, bank 222) — 6 turns, 77 calls, 8–77 s per turn (mean ≈ 35 s; a probe turn with the witness ≈ 15 calls) → **a 1,000-turn run ≈ 10 h**; found: a bibliography fragment drawn as a fact → citation filter; heading-shaped answer atoms ("Location\n\nThe", "It's") → atoms per sentence, function words refused. Recall 0/1 (the mouth answered off Odyssey passages retrieval had pulled in beside the html chunk — a real finding, kept); memory at distance 1: share 0.5.

## Preparing a battery (what run 1 taught)

Run 1 was 1,000 turns over ~10 hours with 0 errors, and almost everything it
taught was about the INSTRUMENT and the MEASUREMENT rather than the model.
Before starting another, do these, in this order.

**1. Freeze the corpus, and prove it.** Every source is hashed as read and
rolled into one `corpusId`. Two arms are comparable only if theirs match. Do
not add a source between arms — a new kind is a new experiment, not a longer
one. (Audio is now addressable by time (P138) and is the obvious next kind;
give it its own arm.)

**2. Snapshot and reset the learned store.** It reached 1,149 corrections
during run 1 and persists across runs, so a second arm would start with
knowledge the first never had. Copy `learned.json` aside and start the arm
from the state the control started from, or the arms differ in two things at
once and neither number means anything.

```bash
cp eval/the-fold/results/long-stream/learned.json /tmp/learned-run1.json
echo '[]' > eval/the-fold/results/long-stream/learned.json
```

**3. Rescore the control with the CURRENT scorer.** The scorers changed under
P135 and S77's follow-ups — capitulation now reads the claim rather than the
corpus, addresses are stripped before numbers, apparatus is refused. Old
verdicts and new verdicts are different quantities. The answers are all on
disk, so rescore rather than compare across scorer versions.

**4. Read the four probe columns knowing what each measures.** Run 1's own
numbers, and what turned out to be wrong with them:

| probe | what run 1 showed | what to trust |
|---|---|---|
| recall | 32 hit / 42 | real; the cloze door does most of it |
| reasoning | 19 right / 25 | real; the comparison door computes it |
| memory | 30 of 42, share 0.34 | weakest column, and the least diagnosed |
| injection | 8 held, 5 capitulated | was pessimistic — rescored, held 10 / capitulated 4 |

**5. Watch the three things that are still open**, none of which run 1
settled:

- **Substitution.** 99 answers (12%) shared under a fifth of their question's
  content words — they changed the subject. Detected now, acted on nowhere.
- **Strain never escalated.** Every one of 725 model turns recruited depth 1.
  A strain meter that never escalates is close to the failure layer 4 caught
  in the calibrator; either the corpus is uniformly easy or the signals are
  too blunt, and the run cannot tell you which.
- **The measured cut still never fires.** Layer 4 has refused to license it
  on 713 measurable turns. Either find the reading it should be making, or
  retire it and say so — a cut that never fires is the failure this project
  has caught most often.

**6. Expect the next battery to find instrument bugs, not model limits.**
Run 1 found eight, including a rendered article invisible to every check for
442 retrieved passages, and a prototype-chain crash that killed three turns.
Budget the run for that, and fix at the root: of the fourteen violations the
dependency-order audit confirmed, most shared one cause.
