# Continuing Bach mid-stream from a prior, taught no music (2026-09-02)

**Driver:** `eval/the-fold/midi-continuation.mjs` (re-runnable; `SPLIT=`,
`ORDER=`, `CONTINUE=`, `SEED=`). **Material:** two real public-domain files
(`fixtures/midi/SOURCES.md`): the C-major Prelude, WTC I (549 notes) and the
Goldberg Aria (418 notes). **Floor 0:** `adapters/midi/midi.js` — note events
with tick addresses, writer round-trips byte-exact. **Kernel:**
`kernel/continuation.js` — medium-blind; its code names no medium
(pinned by a source scan). **Outputs:** `results/midi/*.mid` — the original,
the heard part followed by each continuation, and the shuffled control, so a
person can listen.

Every event is only what the file says — MIDI pitch number, duration in
ticks, gap to the next onset in ticks. No scale, key, chord or meter is named
anywhere. The one received convention is note NAMING (c4 = 60), used for
display and as the kind organ's vocabulary.

## 1. Does a hearing predict its own continuation? (prequential, bits per note; lower is better)

The first 60% of each piece is heard; a prior is sedimented from it; the
held-out 40% arrives one note at a time and the prior is charged its
surprise BEFORE seeing each note. One declared floor (the piece's whole
alphabet) applies to every scorer, single and mixture alike — the first run
had two different floors and its columns were not comparable; corrected.

| source | prelude (220 held out) | aria (168 held out) |
|---|---|---|
| own hearing, order 1 | **3.39** · top-1 28% | 7.09 · top-1 6.5% |
| own hearing, order 3 (backoff to longest) | 3.68 · top-1 34% | 7.08 |
| SHUFFLED hearing — the control built to fail | 5.44 · top-1 2% | 7.63 · top-1 0% |
| own + the other piece's symbols (cross-work) | 3.74 | **6.98** |

The hearing predicts the rest far better than its own shuffle — 2.0 bits
per note better on the prelude, 0.55 on the aria — and on the prelude a
third of the next notes are exactly the prior's most expected. The control
fails as it must. Cross-work SYMBOLS hurt the prelude and slightly HELP
the sparse aria (254 distinct events in 418 notes): the mixture below
reads exactly that off each stream.

Order 1 beat order 3 on the prelude: backing off to the longest context
ever heard is overconfident on a piece whose figure recurs with variation.

## 1b. Melody as intervals — the file's own arithmetic, key-independent

Same experiment with each note's pitch replaced by its DIFFERENCE from the
previous pitch (duration and gap unchanged). No theory: a subtraction on
the file's own numbers. `ALPHABET=interval`.

| source | prelude | aria |
|---|---|---|
| own hearing, order 3 | **3.55** (exact: 3.68) | 7.27 |
| own hearing, order 1 | 3.90 (exact: 3.39) | 7.28 |
| SHUFFLED hearing (control) | 4.76 | 7.57 |
| own + the other piece's symbols | 3.71 | **7.24** |
| hearing × record-log shapes | 3.56 | 7.27 |

Intervals help the LONG context on the prelude (3.68 → 3.55) and hurt the
short one (3.39 → 3.90): a recurring figure is an interval pattern, a
recurring note is not. The mixture split its weight 0.60 / 0.40 between
`hearing@3` and `hearing × record shapes` — the instrument's own
operational log, as a prior over moves, tied the hearing on Bach at this
alphabet. Kept as measured; not a claim beyond it.

## 2. Structural analogy — the shape of a stream's moves, from anything

Symbols cannot cross media; the SHAPE of a step can: at every event the next
one repeats what stood d back (`r1, r2, …`), returns to something older
(`old`), or is new. A shape prior sedimented from a novel (Dracula, 40,000
words), from the instrument's own operational record (3,172 events), or
from the other piece, bears on the hearing's own symbol prior as a product
of experts.

| shape prior on the hearing (exact alphabet) | prelude | aria |
|---|---|---|
| none (hearing alone, order 3) | 3.68 | 7.08 |
| shapes of the novel | 3.92 | 7.11 |
| shapes of the record log | 3.73 | 7.11 |
| shapes of the other piece | 3.88 | 7.11 |
| everything merged | 3.88 | 7.11 |

**An honest negative at the exact-token grain:** no structural analog
reduced the surprise on Bach; on the interval alphabet the record log's
shapes tie the hearing. Whether a coarser token or a longer window lets
structure cross remains a measurement, not a claim.

## 3. What actually happens decides — the prequential mixture

Eight sources kept as experts (the hearing at orders 1, 2, 3; the other
piece's symbols; the hearing under the novel's / the record's / the other
piece's shapes; the shuffled control). Each real note charges each expert
its surprise; weights are 2^(−cumulative bits), renormalised; the mixture
predicts and generates. Nothing chosen by hand.

- **Prelude (exact):** mixture 3.41 — within log2(8)/220 of its best
  expert (3.39, `hearing@1`, weight 1.000). The lead changed hands
  `hearing@1 → hearing@3 (note 4) → hearing@1 (note 78)` and stayed. The
  shuffled control ended at weight 0.000 (surprise 5.44).
- **Aria (exact):** mixture 7.00; the weight went to the CROSS-WORK expert
  (6.98) — on this sparse piece the prelude's counts on the shared tokens
  were, note by note, less surprising than the aria's own. A different
  answer per piece, read off the stream.
- **Prelude (intervals):** the weight SPLIT, 0.60 `hearing@3` / 0.40
  `hearing × record shapes`; the lead changed hands eight times.

**A defect this measurement found and fixed:** the first mixture scored
10.32 on the prelude — worse than every expert, which a mixture cannot be.
A near-zero mixture mass was charged at its true value (~30 bits) while a
single expert's exact zero was charged at the declared floor. One floor now
applies to every scorer, and the pinned bound holds: mixture ≤ best expert
+ log2(N)/n (+ the floor's own declared slack).

## 4. The continuations, judged by the organs that read the original

| continuation of the prelude (64 notes) | reproduces the original's recurrent pitch pairs (103 at ≥2) | novelty (3-grams the hearing never contained) |
|---|---|---|
| order-3 prior, longest context | 7% | **0%** — pure replay |
| with analogy (all shapes merged) | 17% | 0% |
| **the mixture** (the stream chose order 1) | 15% | 25% |
| shuffled control | 3% | 100% |
| the real rest of the piece | 47% | 83% |

The order-3 continuation replays — every note drawn at grain 3, the prior
having heard that exact context before — which the numbers above already
predicted (order 3 was overconfident). The mixture's choice of order 1
gives a continuation that is a quarter new and reproduces twice the
arrangements the replay does. The real rest of the piece is 83% new: Bach
moves on far more than any of these. Kinds the organ discovered in the
whole prelude (9, e.g. `kind:before=c4 = {e4, f4}`): 56% recovered on heard
+ continuation — and 56% on heard + shuffled, because the heard part alone
carries them; the kind organ cannot separate the continuations at this
length. The aria yielded no kinds at all (alphabet too sparse for the
declared floors) — a disclosed absence.

## What this establishes, and what it does not

- A prior sedimented from what was heard, teaching nothing, predicts a
  real piece's continuation far better than chance and better than its own
  shuffle — the control fails as it must, on both pieces.
- Generation from that prior is real and listenable; at longest-context it
  is replay, and the stream itself (the mixture) prefers the shorter
  context that generates something new.
- Structural analogy from other media is BUILT and MEASURED and, at this
  token grain and window, does not reduce surprise on Bach. Kept as a
  negative result with its control, not as a feature.
- The mixture is the right instrument for "which source is most
  predictive": it read a different answer off each piece, and one of them
  (the aria) contradicted the hand-chosen table.
- Nothing here is correspondence: "predicts Bach's next note" is coherence
  with one file. Whether a continuation is *good music* is a question for
  a listener, and the .mid files are there for that.
